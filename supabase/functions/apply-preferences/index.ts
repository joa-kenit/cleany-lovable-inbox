import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplyRequest {
  emails: Array<{
    id: string;
    sender: string;
    subject: string;
  }>;
  minConfidence?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { emails, minConfidence = 0.7 }: ApplyRequest = await req.json();
    console.log(`Applying preferences to ${emails.length} emails (min confidence: ${minConfidence})`);

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .gte('confidence_score', minConfidence);

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
      throw prefError;
    }

    // Build a map of domain to action
    const preferenceMap = new Map(
      preferences.map(pref => [pref.sender_pattern, {
        action: pref.preferred_action,
        confidence: pref.confidence_score,
      }])
    );

    // Apply preferences to emails
    const suggestions = emails.map(email => {
      const domain = email.sender.split('@')[1] || email.sender;
      const preference = preferenceMap.get(domain);

      if (preference) {
        return {
          id: email.id,
          suggestedAction: preference.action,
          confidence: preference.confidence,
          reason: `Based on your past actions with ${domain} (${Math.round(preference.confidence * 100)}% confidence)`,
        };
      }

      return {
        id: email.id,
        suggestedAction: null,
        confidence: 0,
        reason: 'No learned preference for this sender',
      };
    });

    const appliedCount = suggestions.filter(s => s.suggestedAction !== null).length;
    console.log(`Applied ${appliedCount} automatic suggestions`);

    return new Response(
      JSON.stringify({ suggestions }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in apply-preferences function:', error);
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
