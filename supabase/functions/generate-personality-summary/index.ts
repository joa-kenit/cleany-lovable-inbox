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

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_API_KEY or GEMINI_API_KEY is not configured. Please set it in Supabase Edge Function secrets.' }),
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

    const systemInstruction = 'You are Cleany, a calm and confident inbox personality guide. Speak like a founder to another founder - be emotionally intelligent, motivational without clichés, and focus on clarity and direction. CRITICAL: Absolutely NO jokes, humor, wordplay, or witty remarks. Be direct, professional, and insightful. Keep responses under 3 sentences.';

    const userPrompt = `Given this inbox personality profile:
${formattedPercentages}

Write a direct, professional 2-sentence summary of what this reveals about the user's email habits and priorities. Be factual and insightful. NO jokes, NO humor, NO wordplay.`;

    console.log('Calling Google Gemini API with prompt:', userPrompt);
    console.log('Function version: v3.0 - Direct Gemini API (no Lovable dependency)');

    // Use Gemini 2.0 Flash model
    const model = 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: userPrompt }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            { text: systemInstruction }
          ]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 150,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 400) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key or request. Please check your GOOGLE_API_KEY configuration.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate personality summary' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Parse Gemini API response format
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

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
