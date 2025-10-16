import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LearnRequest {
  actions: Array<{
    sender: string;
    subject: string;
    action: 'keep' | 'delete' | 'unsubscribe';
  }>;
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

    const { actions }: LearnRequest = await req.json();
    console.log(`Learning from ${actions.length} user actions`);

    // Store each action
    const { error: insertError } = await supabase
      .from('email_actions')
      .insert(
        actions.map(action => ({
          user_id: user.id,
          email_sender: action.sender,
          email_subject: action.subject,
          action: action.action,
        }))
      );

    if (insertError) {
      console.error('Error storing actions:', insertError);
      throw insertError;
    }

    // Extract sender patterns and update preferences
    for (const action of actions) {
      const domain = action.sender.split('@')[1] || action.sender;
      
      // Check if preference exists
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('sender_pattern', domain)
        .single();

      if (existing) {
        // Update existing preference
        const newCount = existing.action_count + 1;
        const sameAction = existing.preferred_action === action.action;
        
        // Increase confidence if same action, decrease if different
        let newConfidence = existing.confidence_score;
        if (sameAction) {
          newConfidence = Math.min(1.0, newConfidence + 0.1);
        } else {
          newConfidence = Math.max(0.3, newConfidence - 0.15);
        }

        await supabase
          .from('user_preferences')
          .update({
            preferred_action: sameAction ? existing.preferred_action : action.action,
            confidence_score: newConfidence,
            action_count: newCount,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new preference
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            sender_pattern: domain,
            preferred_action: action.action,
            confidence_score: 0.6,
            action_count: 1,
          });
      }
    }

    // Update weekly summary
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const { data: summary } = await supabase
      .from('weekly_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart.toISOString().split('T')[0])
      .single();

    const keepCount = actions.filter(a => a.action === 'keep').length;
    const deleteCount = actions.filter(a => a.action === 'delete').length;
    const unsubscribeCount = actions.filter(a => a.action === 'unsubscribe').length;

    if (summary) {
      await supabase
        .from('weekly_summaries')
        .update({
          emails_processed: summary.emails_processed + actions.length,
          emails_kept: summary.emails_kept + keepCount,
          emails_deleted: summary.emails_deleted + deleteCount,
          emails_unsubscribed: summary.emails_unsubscribed + unsubscribeCount,
        })
        .eq('id', summary.id);
    } else {
      await supabase
        .from('weekly_summaries')
        .insert({
          user_id: user.id,
          week_start: weekStart.toISOString().split('T')[0],
          emails_processed: actions.length,
          emails_kept: keepCount,
          emails_deleted: deleteCount,
          emails_unsubscribed: unsubscribeCount,
          auto_actions_applied: 0,
        });
    }

    console.log('Successfully learned from user actions');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in learn-preferences function:', error);
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
