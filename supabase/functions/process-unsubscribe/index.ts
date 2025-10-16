import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UnsubscribeRequest {
  emails: Array<{
    id: string;
    sender: string;
    subject: string;
    snippet: string;
  }>;
}

interface UnsubscribeLink {
  id: string;
  unsubscribeUrl: string | null;
  method: 'GET' | 'POST' | 'MAILTO';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails }: UnsubscribeRequest = await req.json();
    console.log(`Processing ${emails.length} emails for unsubscribe links`);

    // Detect unsubscribe links in emails
    const unsubscribeLinks: UnsubscribeLink[] = emails.map(email => {
      // Common unsubscribe link patterns
      const patterns = [
        /unsubscribe/i,
        /opt-out/i,
        /remove.*list/i,
        /manage.*preferences/i,
        /email.*settings/i
      ];

      // Simulate finding unsubscribe links (in real implementation, parse email HTML)
      const hasUnsubscribePattern = patterns.some(pattern => 
        pattern.test(email.subject) || pattern.test(email.snippet)
      );

      // Generate mock unsubscribe URLs based on sender domain
      let unsubscribeUrl: string | null = null;
      if (hasUnsubscribePattern || email.sender.includes('newsletter') || email.sender.includes('promo')) {
        const domain = email.sender.split('@')[1] || 'example.com';
        unsubscribeUrl = `https://${domain}/unsubscribe?email=user@example.com&id=${email.id}`;
      }

      return {
        id: email.id,
        unsubscribeUrl,
        method: 'GET' as const
      };
    });

    console.log(`Found ${unsubscribeLinks.filter(l => l.unsubscribeUrl).length} unsubscribe links`);

    return new Response(
      JSON.stringify({ unsubscribeLinks }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in process-unsubscribe function:', error);
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
