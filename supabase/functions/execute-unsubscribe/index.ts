import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecuteRequest {
  unsubscribes: Array<{
    id: string;
    url: string;
    method: 'GET' | 'POST' | 'MAILTO';
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { unsubscribes }: ExecuteRequest = await req.json();
    console.log(`Executing ${unsubscribes.length} unsubscribe requests`);

    const results = await Promise.allSettled(
      unsubscribes.map(async (unsub) => {
        try {
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

          if (unsub.method === 'GET') {
            const response = await fetch(unsub.url, {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
              redirect: 'follow',
            });

            console.log(`Unsubscribe ${unsub.id}: ${response.status}`);

            return {
              id: unsub.id,
              success: response.ok,
              status: response.status,
            };
          } else if (unsub.method === 'POST') {
            const response = await fetch(unsub.url, {
              method: 'POST',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              redirect: 'follow',
            });

            console.log(`Unsubscribe ${unsub.id}: ${response.status}`);

            return {
              id: unsub.id,
              success: response.ok,
              status: response.status,
            };
          } else {
            // MAILTO not executed automatically for security
            return {
              id: unsub.id,
              success: false,
              status: 0,
              error: 'MAILTO links must be handled manually',
            };
          }
        } catch (error: any) {
          console.error(`Error unsubscribing ${unsub.id}:`, error.message);
          return {
            id: unsub.id,
            success: false,
            status: 0,
            error: error.message,
          };
        }
      })
    );

    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          id: unsubscribes[index].id,
          success: false,
          status: 0,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    const successCount = processedResults.filter(r => r.success).length;
    console.log(`Successfully unsubscribed from ${successCount}/${unsubscribes.length} emails`);

    return new Response(
      JSON.stringify({ results: processedResults }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in execute-unsubscribe function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
