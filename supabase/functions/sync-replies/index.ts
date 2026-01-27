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

const getOrCreateReplyBatch = async (supabaseUrl: string, supabaseKey: string) => {
  const batchRes = await fetch(
    `${supabaseUrl}/rest/v1/upload_batches?file_name=eq.${encodeURIComponent('reply-tracking')}&select=id&limit=1`,
    { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
  );
  const batches = await batchRes.json();
  let batchId = batches?.[0]?.id;

  if (!batchId) {
    const createBatchRes = await fetch(`${supabaseUrl}/rest/v1/upload_batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        file_name: 'reply-tracking',
        column_mapping: null,
        total_contacts: 0,
        processed_contacts: 0,
        status: 'system',
      }),
    });
    const createdBatches = await createBatchRes.json();
    batchId = createdBatches?.[0]?.id;
  }

  return batchId as string | null;
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
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

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

    const batchId = await getOrCreateReplyBatch(supabaseUrl, supabaseKey);
    let inserted = 0;
    let skipped = 0;

    for (const sender of senders) {
      const messagesRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${sender.email}/mailFolders('inbox')/messages?$select=id,subject,from,receivedDateTime,bodyPreview,internetMessageId&$orderby=receivedDateTime desc&$filter=receivedDateTime ge ${since}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!messagesRes.ok) {
        console.error('Failed to fetch messages for sender', sender.email, await messagesRes.text());
        continue;
      }

      const messagesData = await messagesRes.json();
      const messages = messagesData?.value || [];

      for (const message of messages) {
        const fromEmail = message?.from?.emailAddress?.address?.toLowerCase();
        if (!fromEmail) continue;

        const messageId = message?.internetMessageId || message?.id;
        if (!messageId) continue;

        // Skip if already recorded
        const existingReplyRes = await fetch(
          `${supabaseUrl}/rest/v1/email_replies?message_id=eq.${encodeURIComponent(messageId)}&select=id&limit=1`,
          { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
        );
        const existingReplies = await existingReplyRes.json();
        if (existingReplies?.length) {
          skipped++;
          continue;
        }

        // Find or create contact
        const contactRes = await fetch(
          `${supabaseUrl}/rest/v1/contacts?email=ilike.${encodeURIComponent(fromEmail)}&select=id,email,name`,
          { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
        );
        const contacts = await contactRes.json();
        let contact = contacts?.[0];

        if (!contact && batchId) {
          const fromName = message?.from?.emailAddress?.name || null;
          const createContactRes = await fetch(`${supabaseUrl}/rest/v1/contacts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              upload_batch_id: batchId,
              raw_data: {},
              name: fromName,
              email: fromEmail,
              company: null,
            }),
          });
          const createdContacts = await createContactRes.json();
          contact = createdContacts?.[0];
        }

        if (!contact) continue;

        // Find the most recent sent email to this contact
        const sentRes = await fetch(
          `${supabaseUrl}/rest/v1/sent_emails?recipient_email=ilike.${encodeURIComponent(fromEmail)}&order=sent_at.desc&limit=1`,
          { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
        );
        const sentEmails = await sentRes.json();
        const sentEmail = sentEmails?.[0] || null;

        if (!sentEmail) {
          skipped++;
          continue;
        }

        await fetch(`${supabaseUrl}/rest/v1/email_replies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
          body: JSON.stringify({
            sent_email_id: sentEmail?.id || null,
            contact_id: contact.id,
            message_id: messageId,
            received_at: message?.receivedDateTime || new Date().toISOString(),
            subject: message?.subject || null,
            snippet: message?.bodyPreview || null,
          }),
        });

        inserted++;
      }
    }

    return new Response(JSON.stringify({ success: true, inserted, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync replies error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
