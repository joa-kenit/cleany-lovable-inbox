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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Edge Function] fetch-gmail-emails invoked');
    
    const { providerToken, maxResults = 20 } = await req.json();

    console.log('[Edge Function] Request params:', { 
      hasProviderToken: !!providerToken,
      tokenLength: providerToken?.length || 0,
      maxResults 
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

    // Fetch message list from Gmail API
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
      {
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

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
      resultSizeEstimate: listData.resultSizeEstimate
    });

    // Validate list data structure
    if (!listData || !Array.isArray(listData.messages)) {
      console.log('[Edge Function] No messages found or invalid response structure');
      return new Response(
        JSON.stringify({ emails: [] }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[Edge Function] Found ${listData.messages.length} messages, fetching details...`);

    // Fetch details for each message
    const emailPromises = listData.messages.map(async (message: GmailMessage) => {
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
            snippet = atob(detail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          } catch (e) {
            console.error('Error decoding body:', e);
          }
        } else if (detail?.payload?.parts && Array.isArray(detail.payload.parts)) {
          const textPart = detail.payload.parts.find(part => part.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            try {
              snippet = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            } catch (e) {
              console.error('Error decoding part body:', e);
            }
          }
        }

        // Truncate snippet to reasonable length
        snippet = snippet.substring(0, 200);

        return {
          id: detail.id,
          sender: sender || 'Unknown Sender',
          subject: subject || '(No Subject)',
          snippet: snippet || '',
          action: null,
        };
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        return null;
      }
    });

    const emails = (await Promise.all(emailPromises)).filter(email => email !== null);

    console.log(`[Edge Function] Successfully processed ${emails.length} emails out of ${listData.messages.length} fetched`);

    return new Response(
      JSON.stringify({ emails }),
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
