import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 1x1 transparent gif
const pixelGif = Uint8Array.from([
  71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255,
  33, 249, 4, 1, 0, 0, 1, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68,
  1, 0, 59,
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const url = new URL(req.url);
    const sentEmailId = url.searchParams.get('sent_email_id');

    if (!sentEmailId) {
      return new Response(pixelGif, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Fetch sent email to get contact_id
    const sentEmailRes = await fetch(`${supabaseUrl}/rest/v1/sent_emails?id=eq.${sentEmailId}&select=id,contact_id`, {
      headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
    });
    const sentEmails = await sentEmailRes.json();
    const sentEmail = sentEmails[0];

    if (sentEmail) {
      const userAgent = req.headers.get('user-agent') || null;
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;

      await fetch(`${supabaseUrl}/rest/v1/email_opens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          sent_email_id: sentEmailId,
          contact_id: sentEmail.contact_id,
          user_agent: userAgent,
          ip_address: ipAddress,
        }),
      });
    }
  } catch (error) {
    console.error('Track open error:', error);
  }

  return new Response(pixelGif, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});
