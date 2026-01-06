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
    const { draftId, senderAccountId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('OUTLOOK_CLIENT_ID');
    const clientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET');
    const tenantId = Deno.env.get('OUTLOOK_TENANT_ID');

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Missing Microsoft Graph API credentials. Please set OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and OUTLOOK_TENANT_ID secrets.');
    }

    console.log('Fetching draft and sender account...');

    // Fetch draft with contact info
    const draftRes = await fetch(`${supabaseUrl}/rest/v1/email_drafts?id=eq.${draftId}&select=*,contact:contacts(*)`, {
      headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! },
    });
    const drafts = await draftRes.json();
    const draft = drafts[0];

    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    // Fetch sender account
    const senderRes = await fetch(`${supabaseUrl}/rest/v1/sender_accounts?id=eq.${senderAccountId}`, {
      headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! },
    });
    const senders = await senderRes.json();
    const sender = senders[0];

    if (!sender) {
      throw new Error(`Sender account not found: ${senderAccountId}`);
    }

    console.log(`Getting Microsoft access token for tenant: ${tenantId}...`);

    // Get Microsoft access token using tenant-specific endpoint
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Token error:', errText);
      let errorMessage = 'Failed to get Microsoft access token';
      try {
        const errorData = JSON.parse(errText);
        errorMessage = `Token error: ${errorData.error_description || errorData.error || errText}`;
      } catch {
        errorMessage = `Token error: ${errText}`;
      }
      throw new Error(errorMessage);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Send email via Microsoft Graph
    const emailBody = {
      message: {
        subject: draft.edited_subject || draft.subject,
        body: {
          contentType: 'Text',
          content: draft.edited_body || draft.body,
        },
        toRecipients: [{ emailAddress: { address: draft.contact.email } }],
      },
      saveToSentItems: true,
    };

    const sendRes = await fetch(`https://graph.microsoft.com/v1.0/users/${sender.email}/sendMail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error('Send error:', errText);
      let errorMessage = 'Failed to send email via Microsoft Graph';
      try {
        const errorData = JSON.parse(errText);
        errorMessage = `Graph API error: ${errorData.error?.message || errorData.error?.code || errorData.message || errText}`;
      } catch {
        errorMessage = `Graph API error: ${errText}`;
      }
      throw new Error(errorMessage);
    }

    // Record sent email
    await fetch(`${supabaseUrl}/rest/v1/sent_emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey!,
      },
      body: JSON.stringify({
        draft_id: draft.id,
        contact_id: draft.contact_id,
        sender_account_id: senderAccountId,
        draft_type: draft.draft_type,
        subject: draft.edited_subject || draft.subject,
        body: draft.edited_body || draft.body,
        recipient_email: draft.contact.email,
      }),
    });

    // Update draft status
    await fetch(`${supabaseUrl}/rest/v1/email_drafts?id=eq.${draftId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey!,
      },
      body: JSON.stringify({ status: 'sent' }),
    });

    // Schedule follow-ups if this is first outreach
    if (draft.draft_type === 'first_outreach') {
      const now = new Date();
      
      // Check if contact has already replied (stop automation if replied)
      const repliesRes = await fetch(
        `${supabaseUrl}/rest/v1/email_replies?contact_id=eq.${draft.contact_id}`,
        { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! } }
      );
      const replies = await repliesRes.json();
      
      if (replies && replies.length > 0) {
        console.log(`Contact ${draft.contact_id} has already replied. Skipping follow-up scheduling.`);
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Email sent. Follow-ups skipped - contact has already replied.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Get other drafts for this contact
      const otherDraftsRes = await fetch(
        `${supabaseUrl}/rest/v1/email_drafts?contact_id=eq.${draft.contact_id}&status=eq.approved&draft_type=neq.first_outreach`,
        { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! } }
      );
      const otherDrafts = await otherDraftsRes.json();

      for (const followDraft of otherDrafts) {
        // Updated timing: 1st follow-up after 4 days, final follow-up after 7 days (from first outreach)
        const daysDelay = followDraft.draft_type === 'second_followup' ? 4 : 7;
        const scheduledFor = new Date(now.getTime() + daysDelay * 24 * 60 * 60 * 1000);

        await fetch(`${supabaseUrl}/rest/v1/scheduled_emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey!,
          },
          body: JSON.stringify({
            draft_id: followDraft.id,
            contact_id: draft.contact_id,
            sender_account_id: senderAccountId,
            scheduled_for: scheduledFor.toISOString(),
            status: 'pending',
          }),
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Full error details:', {
      message: errorMessage,
      error: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
