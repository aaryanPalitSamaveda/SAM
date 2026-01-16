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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('OUTLOOK_CLIENT_ID');
    const clientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET');
    const tenantId = Deno.env.get('OUTLOOK_TENANT_ID');

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Missing Microsoft Graph API credentials');
    }

    const now = new Date().toISOString();

    // Get scheduled emails that are due to be sent
    const scheduledRes = await fetch(
      `${supabaseUrl}/rest/v1/scheduled_emails?status=eq.pending&scheduled_for=lte.${now}&select=*,draft:email_drafts(*,contact:contacts(*)),sender_account:sender_accounts(*)`,
      { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! } }
    );
    const scheduledEmails = await scheduledRes.json();

    if (!scheduledEmails || scheduledEmails.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0,
        message: 'No scheduled emails to process' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Microsoft access token
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
      throw new Error('Failed to get Microsoft access token');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const scheduled of scheduledEmails) {
      try {
        // Check if contact has replied (stop automation)
        const repliesRes = await fetch(
          `${supabaseUrl}/rest/v1/email_replies?contact_id=eq.${scheduled.contact_id}`,
          { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! } }
        );
        const replies = await repliesRes.json();

        if (replies && replies.length > 0) {
          console.log(`Skipping scheduled email for contact ${scheduled.contact_id} - contact has replied`);
          // Cancel this scheduled email
          await fetch(`${supabaseUrl}/rest/v1/scheduled_emails?id=eq.${scheduled.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey!,
            },
            body: JSON.stringify({ status: 'cancelled' }),
          });
          skipped++;
          continue;
        }

        const draft = scheduled.draft;
        const contact = draft.contact;
        const sender = scheduled.sender_account;

        if (!draft || !contact || !sender) {
          errors.push(`Missing data for scheduled email ${scheduled.id}`);
          continue;
        }

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
            toRecipients: [{ emailAddress: { address: contact.email } }],
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
          errors.push(`Failed to send email ${scheduled.id}: ${errText}`);
          // Mark as failed
          await fetch(`${supabaseUrl}/rest/v1/scheduled_emails?id=eq.${scheduled.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey!,
            },
            body: JSON.stringify({ status: 'failed' }),
          });
          continue;
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
            contact_id: scheduled.contact_id,
            sender_account_id: scheduled.sender_account_id,
            draft_type: draft.draft_type,
            subject: draft.edited_subject || draft.subject,
            body: emailContent,
            recipient_email: contact.email,
            signature_id: signatureId,
          }),
        });

        // Update draft status
        await fetch(`${supabaseUrl}/rest/v1/email_drafts?id=eq.${draft.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey!,
          },
          body: JSON.stringify({ status: 'sent' }),
        });

        // Mark scheduled email as sent
        await fetch(`${supabaseUrl}/rest/v1/scheduled_emails?id=eq.${scheduled.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey!,
          },
          body: JSON.stringify({ status: 'sent' }),
        });

        processed++;

        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error processing scheduled email ${scheduled.id}:`, error);
        errors.push(`Error processing ${scheduled.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Processed ${processed} emails, skipped ${skipped} (replied contacts)` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing scheduled emails:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

