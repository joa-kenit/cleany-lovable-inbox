import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper for small batch delay (prevents Gmail 429 errors)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { providerToken, sender, maxResults = 5, pageToken = null, countOnly = false } =
      await req.json();

    if (!providerToken || !sender) {
      return new Response(
        JSON.stringify({ error: "Missing providerToken or sender" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------------------------------------------
    // MODE 1 — COUNT ONLY (get REAL totalCount)
    // ---------------------------------------------------
    if (countOnly) {
      let nextPage = null;
      let total = 0;

      do {
        const params = new URLSearchParams({
          q: `in:inbox from:${sender}`,
          maxResults: "500"
        });
        if (nextPage) params.append("pageToken", nextPage);

        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${providerToken}` }
        });

        const data = await res.json();

        total += data.messages?.length || 0;
        nextPage = data.nextPageToken || null;

        // prevent Gmail quota throttling
        await delay(120);
      } while (nextPage);

      return new Response(
        JSON.stringify({ totalCount: total }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------------------------------------------
    // MODE 2 — NORMAL (load X message IDs)
    // ---------------------------------------------------
    const params = new URLSearchParams({
      q: `in:inbox from:${sender}`,
      maxResults: maxResults.toString(),
    });
    if (pageToken) params.append("pageToken", pageToken);

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    const listData = await listResponse.json();

    return new Response(
      JSON.stringify({
        totalCount: listData.resultSizeEstimate || 0, // UI will replace this with countOnly result
        messages: listData.messages || [],
        nextPageToken: listData.nextPageToken || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in fetch-sender-emails:", err);
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
