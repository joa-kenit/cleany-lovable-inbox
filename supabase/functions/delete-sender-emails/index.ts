import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { providerToken, sender } = await req.json();

    if (!providerToken || !sender) {
      return new Response(
        JSON.stringify({ error: "Missing providerToken or sender" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Bulk Delete] Starting deletion for sender: ${sender}`);

    let deletedCount = 0;
    let nextPage = null;
    let totalProcessed = 0;

    do {
      // Fetch batch of message IDs
      const params = new URLSearchParams({
        q: `in:inbox from:${sender}`,
        maxResults: "100" // Process 100 at a time
      });
      if (nextPage) params.append("pageToken", nextPage);

      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
      const listResponse = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${providerToken}` }
      });

      const listData = await listResponse.json();

      if (!listData.messages || listData.messages.length === 0) {
        break;
      }

      // Delete messages in this batch
      const deletePromises = listData.messages.map(async (msg: { id: string }) => {
        try {
          const deleteUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/trash`;
          const response = await fetch(deleteUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${providerToken}` }
          });

          if (response.ok) {
            return true;
          } else {
            console.error(`Failed to delete message ${msg.id}`);
            return false;
          }
        } catch (err) {
          console.error(`Error deleting message ${msg.id}:`, err);
          return false;
        }
      });

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r).length;
      deletedCount += successCount;
      totalProcessed += listData.messages.length;

      console.log(`[Bulk Delete] Processed batch: ${successCount}/${listData.messages.length} deleted`);

      nextPage = listData.nextPageToken || null;

      // Small delay to avoid rate limiting
      if (nextPage) {
        await delay(200);
      }

      // Safety limit: stop after 500 emails
      if (totalProcessed >= 500) {
        console.log('[Bulk Delete] Reached safety limit of 500 emails');
        break;
      }

    } while (nextPage);

    console.log(`[Bulk Delete] Complete. Deleted ${deletedCount} emails from ${sender}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        totalProcessed 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error in delete-sender-emails:", err);
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
