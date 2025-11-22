import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { percentages } = await req.json();
    
    if (!percentages) {
      return new Response(
        JSON.stringify({ error: 'Percentages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured in backend secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format percentages for the prompt
    const formattedPercentages = Object.entries(percentages)
      .filter(([_, value]) => (value as number) > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([category, percentage]) => 
        `${category.charAt(0).toUpperCase() + category.slice(1)}: ${percentage}%`
      )
      .join('\n');

    const systemInstruction = 'You are Cleany, a calm and confident inbox personality guide. Speak like a founder to another founder - be emotionally intelligent, motivational without clichés, and focus on clarity and direction. You can add a little positive humor to keep things friendly and encouraging. Keep responses concise and under 3 sentences.';

    const userPrompt = `Given this inbox personality profile:
${formattedPercentages}

Write a friendly, encouraging 2-sentence summary of what this reveals about the user's email habits and priorities. Be insightful and positive, with a light touch of warmth.`;

    console.log('Calling Lovable AI gateway with prompt:', userPrompt);
    console.log('Function version: v4.0 - Lovable AI gateway');

    const apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please check your workspace credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate personality summary' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return new Response(
        JSON.stringify({ error: 'No summary generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generated summary:', summary);

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-personality-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
