// Updated to fetch real email counts v2
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessageDetail {
  id: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ body?: { data?: string }; mimeType?: string }>;
  };
}

// Helper function to get real email count for a sender
async function getEmailCountForSender(providerToken: string, sender: string): Promise<number> {
  try {
    const emailMatch = sender.match(/<(.+)>/);
    const email = emailMatch ? emailMatch[1] : sender;
    
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', '1');
    url.searchParams.set('q', `from:${email}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) return 0;
    
    const data = await response.json();
    return data.resultSizeEstimate || 0;
  } catch (error) {
    console.error(`Error getting count for ${sender}:`, error);
    return 0;
  }
}
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Edge Function] fetch-gmail-emails invoked');
    
    const { providerToken, maxResults = 25, maxPages = 1, senderFilter } = await req.json();

    console.log('[Edge Function] Request params:', { 
      hasProviderToken: !!providerToken,
      tokenLength: providerToken?.length || 0,
      maxResults,
      maxPages,
      senderFilter
    });

    // Validate provider token exists
    if (!providerToken) {
      console.error('[Edge Function] No provider token provided in request');
      return new Response(
        JSON.stringify({ 
          error: 'No Gmail access token available. Please sign in with Google again and grant Gmail permissions.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[Edge Function] Fetching Gmail messages list...');

    // Build Gmail search query
    let query = 'in:inbox';
    if (senderFilter) {
      // Extract email from sender string (e.g., "Name <email@domain.com>" -> "email@domain.com")
      const emailMatch = senderFilter.match(/<(.+)>/);
      const email = emailMatch ? emailMatch[1] : senderFilter;
      query += ` from:${email}`;
      console.log('[Edge Function] Filtering by sender:', email);
    }

    // Collect all messages across multiple pages
    const allMessages: GmailMessage[] = [];
    let pageToken: string | undefined;
    let currentPage = 0;
    
    // When filtering by sender, fetch ALL pages; otherwise respect maxPages limit
    const shouldFetchAllPages = !!senderFilter;
    const pageLimit = shouldFetchAllPages ? 999 : maxPages;

    while (currentPage < pageLimit) {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.set('maxResults', maxResults.toString());
      url.searchParams.set('q', query);
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      console.log(`[Edge Function] Fetching page ${currentPage + 1}${shouldFetchAllPages ? '' : `/${pageLimit}`}...`);

      // Fetch message list from Gmail API
      const listResponse = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Edge Function] Gmail API list response status:', listResponse.status);

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error('[Edge Function] Gmail API list error:', {
          status: listResponse.status,
          statusText: listResponse.statusText,
          error: errorText
        });
        
        let userMessage = 'Gmail API error. Your access token may have expired.';
        if (listResponse.status === 401) {
          userMessage = 'Gmail access token expired. Please sign out and sign in again.';
        } else if (listResponse.status === 403) {
          userMessage = 'Gmail access denied. Please grant Gmail permissions when signing in.';
        }
        
        return new Response(
          JSON.stringify({ 
            error: userMessage,
            details: `Status: ${listResponse.status} - ${errorText}`
          }),
          { 
            status: listResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const listData = await listResponse.json();
      
      console.log('[Edge Function] Gmail API list response received:', {
        hasMessages: !!listData.messages,
        messageCount: listData.messages?.length || 0,
        resultSizeEstimate: listData.resultSizeEstimate,
        hasNextPage: !!listData.nextPageToken
      });

      if (!listData.messages || listData.messages.length === 0) {
        console.log('[Edge Function] No messages found on this page');
        break;
      }

      allMessages.push(...listData.messages);
      pageToken = listData.nextPageToken;
      currentPage++;

      if (!pageToken) {
        console.log('[Edge Function] No more pages available');
        break;
      }
    }

    console.log(`[Edge Function] Total messages collected: ${allMessages.length} from ${currentPage} pages`);

    // Validate messages
    if (!allMessages || allMessages.length === 0) {
      console.log('[Edge Function] No messages found');
      return new Response(
        JSON.stringify({ emails: [] }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[Edge Function] Found ${allMessages.length} messages, fetching details...`);

    // Helper function to add delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Fetch details in batches to avoid rate limits
    const batchSize = 10;
    const allEmails: any[] = [];

    for (let i = 0; i < allMessages.length; i += batchSize) {
      const batch = allMessages.slice(i, i + batchSize);
      console.log(`[Edge Function] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allMessages.length / batchSize)} (${batch.length} messages)`);

      const batchPromises = batch.map(async (message: GmailMessage) => {
      try {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${providerToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!detailResponse.ok) {
          console.error(`Error fetching message ${message.id}:`, await detailResponse.text());
          return null;
        }

        const detail: GmailMessageDetail = await detailResponse.json();
        
        // Safely extract headers with null checks
        const headers = detail?.payload?.headers || [];
        const getHeader = (name: string) => {
          const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
          return header?.value || '';
        };

        const sender = getHeader('From');
        const subject = getHeader('Subject');
        
// Extract snippet/body safely
let snippet = '';
if (detail?.payload?.body?.data) {
  try {
    const decoded = atob(detail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    // Properly decode UTF-8
    const utf8decoder = new TextDecoder('utf-8');
    const bytes = new Uint8Array(decoded.split('').map(char => char.charCodeAt(0)));
    snippet = utf8decoder.decode(bytes);
  } catch (e) {
    console.error('Error decoding body:', e);
  }
} else if (detail?.payload?.parts && Array.isArray(detail.payload.parts)) {
  const textPart = detail.payload.parts.find(part => part.mimeType === 'text/plain');
  if (textPart?.body?.data) {
    try {
      const decoded = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      const utf8decoder = new TextDecoder('utf-8');
      const bytes = new Uint8Array(decoded.split('').map(char => char.charCodeAt(0)));
      snippet = utf8decoder.decode(bytes);
    } catch (e) {
      console.error('Error decoding part body:', e);
    }
  }
}

// Keep full body text for newsletter detection before trimming
const fullBodyText = snippet;

// Clean up the snippet
snippet = snippet
  .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
  .replace(/\s+/g, ' ') // Clean whitespace
  .trim()
  .substring(0, 200);

        
        // Clean up encoding artifacts and URLs
snippet = snippet
  .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
  .replace(/â/g, '') // Remove encoding artifacts
  .replace(/â¢/g, '•')
  .replace(/â/g, '"')
  .replace(/â/g, '"')
  .replace(/â/g, "'")
  .replace(/â¦/g, '...')
  .replace(/\s+/g, ' ') // Clean whitespace
  .trim()
  .substring(0, 200);

        // Newsletter detection
        const newsletterPlatforms = [
          'substack.com',
          'beehiiv.com',
          'convertkit',
          'mailchimp',
          'sendgrid',
          'kajabi',
          'ck.page',
          'medium.com',
          'skool.com',
          'buttondown.email',
          'ghost.io',
          'getrevue.co',
          'tinyletter.com',
          'campaignmonitor.com',
          'activecampaign.com',
          'constantcontact.com',
        ];

        const newsletterSubjectKeywords = [
          'newsletter',
          'digest',
          'weekly',
          'update',
          'edition',
          'roundup',
          'briefing',
        ];

        const bodyLower = fullBodyText.toLowerCase();
        const subjectLower = subject.toLowerCase();
        const senderLower = sender.toLowerCase();

        const hasPlatformInBody = newsletterPlatforms.some(platform => 
          bodyLower.includes(platform)
        );
        const hasPlatformInSender = newsletterPlatforms.some(platform => 
          senderLower.includes(platform)
        );
        const hasNewsletterKeywordInSubject = newsletterSubjectKeywords.some(keyword => 
          subjectLower.includes(keyword)
        );

        const isNewsletter = hasPlatformInBody || hasPlatformInSender || hasNewsletterKeywordInSubject;

        return {
          id: detail.id,
          sender: sender || 'Unknown Sender',
          subject: subject || '(No Subject)',
          snippet: snippet || '',
          action: null,
          isNewsletter,
        };
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        return null;
      }
    });

      const batchResults = await Promise.all(batchPromises);
      allEmails.push(...batchResults.filter((email): email is any => email !== null));

      // Add delay between batches to avoid rate limits (except for last batch)
      if (i + batchSize < allMessages.length) {
        await delay(100); // 100ms delay between batches
      }
    }

console.log(`[Edge Function] Successfully processed ${allEmails.length} emails out of ${allMessages.length} fetched`);

// Group emails by sender
const emailsBySender = new Map<string, any>();
allEmails.forEach((email: any) => {
  if (!emailsBySender.has(email.sender)) {
    emailsBySender.set(email.sender, email);
  }
});

const uniqueEmails = Array.from(emailsBySender.values());
console.log(`[Edge Function] Grouped into ${uniqueEmails.length} unique senders`);

// Fetch real counts for each unique sender
console.log('[Edge Function] Fetching real email counts...');
const emailsWithRealCounts = await Promise.all(
  uniqueEmails.map(async (email) => {
    const realCount = await getEmailCountForSender(providerToken, email.sender);
    return {
      ...email,
      emailCount: realCount
    };
  })
);

console.log('[Edge Function] Real counts fetched');

return new Response(
  JSON.stringify({ emails: emailsWithRealCounts }),
  { 
    status: 200, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  }
);
  } catch (error) {
    console.error('[Edge Function] Unexpected error in fetch-gmail-emails:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Check edge function logs for more information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
