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
    const { senderAccountId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('OUTLOOK_CLIENT_ID');
    const clientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET');
    const tenantId = Deno.env.get('OUTLOOK_TENANT_ID');

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Missing Microsoft Graph API credentials');
    }

    if (!senderAccountId) {
      throw new Error('senderAccountId is required');
    }

    // Get all approved first outreach drafts
    const draftsRes = await fetch(
      `${supabaseUrl}/rest/v1/email_drafts?status=eq.approved&draft_type=eq.first_outreach&select=*,contact:contacts(*)`,
      { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! } }
    );
    const drafts = await draftsRes.json();

    if (!drafts || drafts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        sent: 0,
        message: 'No approved first outreach drafts to send' 
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

    // Get sender account
    const senderRes = await fetch(`${supabaseUrl}/rest/v1/sender_accounts?id=eq.${senderAccountId}`, {
      headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! },
    });
    const senders = await senderRes.json();
    const sender = senders[0];

    if (!sender) {
      throw new Error(`Sender account not found: ${senderAccountId}`);
    }

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Send each approved first outreach email
    for (const draft of drafts) {
      try {
        // Check if contact has already replied
        const repliesRes = await fetch(
          `${supabaseUrl}/rest/v1/email_replies?contact_id=eq.${draft.contact_id}`,
          { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! } }
        );
        const replies = await repliesRes.json();

        if (replies && replies.length > 0) {
          console.log(`Skipping contact ${draft.contact_id} - already replied`);
          skipped++;
          continue;
        }

        // Get signature if enabled
        let emailContent = draft.edited_body || draft.body;
        let signatureId = null;
        
        if (draft.include_signature !== false && draft.signature_id) {
          const sigRes = await fetch(`${supabaseUrl}/rest/v1/email_signatures?id=eq.${draft.signature_id}`, {
            headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! },
          });
          const signatures = await sigRes.json();
          if (signatures && signatures.length > 0) {
            const signature = signatures[0];
            // Build signature: content first, then image at bottom
            let sigContent = signature.content;
            // Add image at bottom if it exists
            if (signature.image_url) {
              sigContent = `${sigContent}<br><br><img src="${signature.image_url}" alt="Logo" style="max-height: 60px;" />`;
            }
            emailContent = `${emailContent}\n\n---\n${sigContent}`;
            signatureId = signature.id;
          }
        } else if (draft.include_signature !== false) {
          // Try to get default signature
          const defaultSigRes = await fetch(`${supabaseUrl}/rest/v1/email_signatures?is_default=eq.true&limit=1`, {
            headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! },
          });
          const defaultSigs = await defaultSigRes.json();
          if (defaultSigs && defaultSigs.length > 0) {
            const signature = defaultSigs[0];
            // Build signature: content first, then image at bottom
            let sigContent = signature.content;
            // Add image at bottom if it exists
            if (signature.image_url) {
              sigContent = `${sigContent}<br><br><img src="${signature.image_url}" alt="Logo" style="max-height: 60px;" />`;
            }
            emailContent = `${emailContent}\n\n---\n${sigContent}`;
            signatureId = signature.id;
          }
        }

        // Send email via Microsoft Graph
        const emailBody = {
          message: {
            subject: draft.edited_subject || draft.subject,
            body: {
              contentType: 'HTML',
              content: emailContent.replace(/\n/g, '<br>'),
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
          errors.push(`Failed to send email for draft ${draft.id}: ${errText}`);
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
        await fetch(`${supabaseUrl}/rest/v1/email_drafts?id=eq.${draft.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey!,
          },
          body: JSON.stringify({ status: 'sent' }),
        });

        // Schedule follow-ups
        const now = new Date();
        const otherDraftsRes = await fetch(
          `${supabaseUrl}/rest/v1/email_drafts?contact_id=eq.${draft.contact_id}&status=eq.approved&draft_type=neq.first_outreach`,
          { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey! } }
        );
        const otherDrafts = await otherDraftsRes.json();

        for (const followDraft of otherDrafts) {
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

        sent++;

        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error sending email for draft ${draft.id}:`, error);
        errors.push(`Error sending draft ${draft.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sent ${sent} emails, skipped ${skipped} (replied contacts). Follow-ups scheduled automatically.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending all approved emails:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

