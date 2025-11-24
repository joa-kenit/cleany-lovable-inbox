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

    console.log(`[Keep Latest] Starting process for sender: ${sender}`);

    // Step 1: Fetch ALL emails from sender with dates
    const allMessages: Array<{ id: string; internalDate: string }> = [];
    let nextPage = null;
    let totalFetched = 0;

    do {
      const params = new URLSearchParams({
        q: `in:inbox from:${sender}`,
        maxResults: "100"
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

      // Fetch full metadata for each message to get internalDate
      for (const msg of listData.messages) {
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=minimal`;
        const detailResponse = await fetch(detailUrl, {
          headers: { Authorization: `Bearer ${providerToken}` }
        });
        const detailData = await detailResponse.json();
        
        allMessages.push({
          id: msg.id,
          internalDate: detailData.internalDate || "0"
        });
      }

      totalFetched += listData.messages.length;
      nextPage = listData.nextPageToken || null;

      // Safety limit
      if (totalFetched >= 500) {
        console.log('[Keep Latest] Reached safety limit of 500 emails');
        break;
      }

      if (nextPage) {
        await delay(200);
      }
    } while (nextPage);

    console.log(`[Keep Latest] Found ${allMessages.length} total emails from ${sender}`);

    // Step 2: Sort by date (newest first)
    allMessages.sort((a, b) => parseInt(b.internalDate) - parseInt(a.internalDate));

    // Step 3: Identify which to keep (first 5) and which to delete (rest)
    const keepIds = allMessages.slice(0, 5).map(m => m.id);
    const deleteIds = allMessages.slice(5).map(m => m.id);

    if (deleteIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          deletedCount: 0,
          keptCount: allMessages.length,
          message: "No emails to delete - sender has 5 or fewer emails"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Keep Latest] Will keep ${keepIds.length} emails and delete ${deleteIds.length} emails`);

    // Step 4: Delete the older emails
    let deletedCount = 0;

    for (let i = 0; i < deleteIds.length; i++) {
      try {
        const deleteUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${deleteIds[i]}/trash`;
        const response = await fetch(deleteUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${providerToken}` }
        });

        if (response.ok) {
          deletedCount++;
        } else {
          console.error(`Failed to delete message ${deleteIds[i]}`);
        }

        // Rate limiting: delay every 20 deletions
        if (i > 0 && i % 20 === 0) {
          await delay(200);
        }
      } catch (err) {
        console.error(`Error deleting message ${deleteIds[i]}:`, err);
      }
    }

    console.log(`[Keep Latest] Complete. Kept ${keepIds.length} emails, deleted ${deletedCount}/${deleteIds.length} emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        keptCount: keepIds.length,
        totalProcessed: allMessages.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error in delete-sender-emails-keep-latest:", err);
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

