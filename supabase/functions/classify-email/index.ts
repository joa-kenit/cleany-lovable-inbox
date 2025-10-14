import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailData {
  sender: string;
  subject: string;
  snippet: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails }: { emails: EmailData[] } = await req.json();
    console.log(`Classifying ${emails.length} emails`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert email classifier. Analyze emails and suggest one of three actions: "keep", "delete", or "unsubscribe".

Classification rules:
- KEEP: Personal emails, important work emails, transactional emails (receipts, confirmations), time-sensitive information
- DELETE: Spam, low-value notifications, old promotional emails, irrelevant content
- UNSUBSCRIBE: Marketing emails, newsletters you don't read, promotional emails from retailers, social media notifications

Consider:
- Sender authenticity and importance
- Subject relevance and urgency
- Content value and personalization
- Promotional language and spam indicators`;

    const userPrompt = `Classify these emails:\n\n${emails.map((email, idx) => 
      `Email ${idx + 1}:\nFrom: ${email.sender}\nSubject: ${email.subject}\nSnippet: ${email.snippet}`
    ).join("\n\n")}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_emails",
              description: "Return classification suggestions for emails",
              parameters: {
                type: "object",
                properties: {
                  classifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Email index (0-based)" },
                        action: { type: "string", enum: ["keep", "delete", "unsubscribe"] },
                        reason: { type: "string", description: "Brief reason for suggestion" }
                      },
                      required: ["index", "action", "reason"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["classifications"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_emails" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const classifications = JSON.parse(toolCall.function.arguments).classifications;
    console.log("Classifications:", classifications);

    return new Response(
      JSON.stringify({ classifications }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in classify-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Classification failed" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
