import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getGraphToken = async () => {
  const clientId = Deno.env.get('OUTLOOK_CLIENT_ID');
  const clientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET');
  const tenantId = Deno.env.get('OUTLOOK_TENANT_ID');

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing Microsoft Graph API credentials');
  }

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get Microsoft access token: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token as string;
};

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

    const accessToken = await getGraphToken();

    // Get active sender accounts
    const sendersRes = await fetch(
      `${supabaseUrl}/rest/v1/sender_accounts?is_active=eq.true&select=id,email`,
      { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
    );
    const senders = await sendersRes.json();

    if (!Array.isArray(senders) || senders.length === 0) {
      return new Response(JSON.stringify({ error: 'No active sender accounts found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notificationUrl = `${supabaseUrl}/functions/v1/graph-webhook`;
    const results: Array<{ email: string; subscriptionId?: string; error?: string }> = [];

    for (const sender of senders) {
      try {
        // Create subscription for inbox message creation (replies)
        const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        const subRes = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            changeType: 'created',
            notificationUrl,
            resource: `/users/${sender.email}/mailFolders('inbox')/messages`,
            expirationDateTime: expiresAt,
            clientState: 'samareach-reply-tracking',
          }),
        });

        if (!subRes.ok) {
          const errText = await subRes.text();
          results.push({ email: sender.email, error: errText });
          continue;
        }

        const subscription = await subRes.json();

        // Store subscription for renewal tracking
        await fetch(`${supabaseUrl}/rest/v1/graph_subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
          body: JSON.stringify({
            sender_account_id: sender.id,
            subscription_id: subscription.id,
            resource: subscription.resource,
            expires_at: subscription.expirationDateTime,
          }),
        });

        results.push({ email: sender.email, subscriptionId: subscription.id });
      } catch (error) {
        results.push({ email: sender.email, error: (error as Error).message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Setup subscriptions error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
