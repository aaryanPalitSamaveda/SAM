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

    // Microsoft Graph webhook validation
    const url = new URL(req.url);
    const validationToken = url.searchParams.get('validationToken');
    if (validationToken) {
      return new Response(validationToken, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const notifications = payload?.value || [];
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getGraphToken();

    for (const notification of notifications) {
      const resource = notification.resource || '';
      const resourceData = notification.resourceData || {};
      const messageId = resourceData.id;
      let userId = resourceData.userId;
      console.log('Webhook notification:', { resource, messageId, userId });

      if (!userId && resource) {
        const match = resource.match(/\/users\/([^/]+)\//i);
        if (match && match[1]) {
          userId = decodeURIComponent(match[1]);
        }
      }

      if (!messageId || !userId) {
        console.log('Skipping notification: missing messageId or userId');
        continue;
      }

      // Fetch message details from Graph
      const messageRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${userId}/messages/${messageId}?$select=subject,from,receivedDateTime,bodyPreview,internetMessageId,inReplyTo,conversationId`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!messageRes.ok) {
        console.error('Failed to fetch message', await messageRes.text());
        continue;
      }

      const message = await messageRes.json();
      const fromEmail = message?.from?.emailAddress?.address?.toLowerCase();
      if (!fromEmail) {
        console.log('Skipping message: missing from email', { messageId, userId });
        continue;
      }
      console.log('Reply message:', { fromEmail, subject: message?.subject, inReplyTo: message?.inReplyTo });

      // Find contact by email
      const contactRes = await fetch(
        `${supabaseUrl}/rest/v1/contacts?email=ilike.${encodeURIComponent(fromEmail)}&select=id,email,name`,
        { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
      );
      const contacts = await contactRes.json();
      let contact = contacts?.[0];

      if (!contact) {
        // Ensure a system upload batch exists for reply tracking
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
          if (!createBatchRes.ok) {
            console.error('Failed to create reply-tracking batch', createdBatches);
          }
          batchId = createdBatches?.[0]?.id;
        }

        if (batchId) {
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
          if (!createContactRes.ok) {
            console.error('Failed to create contact for reply', createdContacts);
          }
          contact = createdContacts?.[0];
        }
      }

      if (!contact) {
        console.log('Skipping reply: contact not found/created', { fromEmail });
        continue;
      }

      // Find the most recent sent email to this contact
      const sentRes = await fetch(
        `${supabaseUrl}/rest/v1/sent_emails?recipient_email=ilike.${encodeURIComponent(fromEmail)}&order=sent_at.desc&limit=1`,
        { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
      );
      const sentEmails = await sentRes.json();
      const sentEmail = sentEmails?.[0] || null;

      // Insert reply record
      const replyRes = await fetch(`${supabaseUrl}/rest/v1/email_replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          sent_email_id: sentEmail?.id || null,
          contact_id: contact.id,
          message_id: message?.internetMessageId || messageId,
          received_at: message?.receivedDateTime || new Date().toISOString(),
          subject: message?.subject || null,
          snippet: message?.bodyPreview || null,
        }),
      });
      if (!replyRes.ok) {
        console.error('Failed to insert email_replies', await replyRes.text());
      } else {
        console.log('Inserted reply for contact', { contactId: contact.id, fromEmail });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Graph webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
