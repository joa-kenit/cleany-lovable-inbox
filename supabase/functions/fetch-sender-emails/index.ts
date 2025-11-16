import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { providerToken, sender, maxResults = 5, pageToken = null } = await req.json();

    if (!providerToken || !sender) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: providerToken and sender' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching emails from sender: ${sender}, maxResults: ${maxResults}, pageToken: ${pageToken}`);

    // Build Gmail API query parameters
    const params = new URLSearchParams({
      q: `in:inbox from:${sender}`,
      maxResults: maxResults.toString(),
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    // Fetch message IDs from Gmail API
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('Gmail API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails from Gmail API', details: errorText }),
        { status: listResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const listData = await listResponse.json();
    
    // Return the response with message IDs only
    const response = {
      totalCount: listData.resultSizeEstimate || 0,
      messages: listData.messages || [],
      nextPageToken: listData.nextPageToken || null,
    };

    console.log(`Found ${response.totalCount} emails from ${sender}, returned ${response.messages.length} message IDs`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-sender-emails:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
