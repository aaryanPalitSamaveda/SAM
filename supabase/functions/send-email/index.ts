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

    const sentEmailId = crypto.randomUUID();
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-open?sent_email_id=${encodeURIComponent(sentEmailId)}`;

    // Get signature if enabled
    let emailContent = draft.edited_body || draft.body;
    let signatureId = null;
    let inlineAttachment: any = null;

    const buildSignatureContent = (signature: any) => {
      let sigContent = signature.content;
      let attachment: Record<string, unknown> | null = null;

      if (signature.image_url) {
        const dataUrlMatch = signature.image_url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
        if (dataUrlMatch) {
          const contentType = dataUrlMatch[1];
          const contentBytes = dataUrlMatch[2];
          const contentId = `signature-logo-${signature.id}`;
          attachment = {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: "signature-logo",
            contentType,
            contentBytes,
            isInline: true,
            contentId,
          };
          sigContent = `${sigContent}<br><br><img src="cid:${contentId}" alt="Logo" style="max-height: 60px;" />`;
        } else {
          sigContent = `${sigContent}<br><br><img src="${signature.image_url}" alt="Logo" style="max-height: 60px;" />`;
        }
      }

      return { sigContent, attachment };
    };
    
    if (draft.include_signature !== false && draft.signature_id) {
      const sigRes = await fetch(`${supabaseUrl}/rest/v1/email_signatures?id=eq.${draft.signature_id}`, {
        headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! },
      });
      const signatures = await sigRes.json();
      if (signatures && signatures.length > 0) {
        const signature = signatures[0];
        const { sigContent, attachment } = buildSignatureContent(signature);
        emailContent = `${emailContent}\n\n---\n${sigContent}`;
        signatureId = signature.id;
        inlineAttachment = attachment;
      }
    } else if (draft.include_signature !== false) {
      // Try to get default signature
      const defaultSigRes = await fetch(`${supabaseUrl}/rest/v1/email_signatures?is_default=eq.true&limit=1`, {
        headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! },
      });
      const defaultSigs = await defaultSigRes.json();
      if (defaultSigs && defaultSigs.length > 0) {
        const signature = defaultSigs[0];
        const { sigContent, attachment } = buildSignatureContent(signature);
        emailContent = `${emailContent}\n\n---\n${sigContent}`;
        signatureId = signature.id;
        inlineAttachment = attachment;
      }
    }

    // Send email via Microsoft Graph
    const emailBody = {
      message: {
        subject: draft.edited_subject || draft.subject,
        body: {
          contentType: 'HTML',
          content: `${emailContent.replace(/\n/g, '<br>')}<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`,
        },
        toRecipients: [{ emailAddress: { address: draft.contact.email } }],
        ...(inlineAttachment ? { attachments: [inlineAttachment] } : {}),
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
        id: sentEmailId,
        draft_id: draft.id,
        contact_id: draft.contact_id,
        sender_account_id: senderAccountId,
        draft_type: draft.draft_type,
        subject: draft.edited_subject || draft.subject,
        body: emailContent,
        recipient_email: draft.contact.email,
        signature_id: signatureId,
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
        // Updated timing: 2nd follow-up after 2 days, final follow-up after 7 days (from first outreach)
        const daysDelay = followDraft.draft_type === 'second_followup' ? 2 : 7;
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
