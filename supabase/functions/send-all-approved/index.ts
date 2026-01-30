import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parsePipeRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const isMarkdownTableSeparator = (line: string) =>
  /^(\|?\s*:?-+:?\s*)+\|?$/.test(line.trim());

const isMarkdownTableRow = (line: string) =>
  line.includes('|') && !isMarkdownTableSeparator(line);

const isAsciiBorder = (line: string) => /^\+[-+]+\+$/.test(line.trim());

const isAsciiRow = (line: string) => /^\|.*\|$/.test(line.trim());

const convertTablesToHtml = (body: string) => {
  const lines = body.split('\n');
  const output: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (isMarkdownTableRow(line) && isMarkdownTableSeparator(lines[i + 1] || '')) {
      const header = parsePipeRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isMarkdownTableRow(lines[i])) {
        rows.push(parsePipeRow(lines[i]));
        i += 1;
      }
      i -= 1;

      const thead = `<thead><tr>${header
        .map((cell) => `<th>${escapeHtml(cell)}</th>`)
        .join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
        )
        .join('')}</tbody>`;
      output.push(`<table border="1" cellpadding="6" cellspacing="0">${thead}${tbody}</table>`);
      continue;
    }

    if (isAsciiBorder(line) && isAsciiRow(lines[i + 1] || '')) {
      const rows: string[][] = [];
      let header: string[] | null = null;

      i += 1;
      while (i < lines.length) {
        if (isAsciiRow(lines[i])) {
          const cells = parsePipeRow(lines[i]);
          if (!header) {
            header = cells;
          } else {
            rows.push(cells);
          }
          i += 1;
          continue;
        }
        if (isAsciiBorder(lines[i])) {
          i += 1;
          continue;
        }
        break;
      }
      i -= 1;

      const thead = header
        ? `<thead><tr>${header
            .map((cell) => `<th>${escapeHtml(cell)}</th>`)
            .join('')}</tr></thead>`
        : '';
      const tbody = `<tbody>${rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
        )
        .join('')}</tbody>`;
      output.push(`<table border="1" cellpadding="6" cellspacing="0">${thead}${tbody}</table>`);
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
};

const convertMarkdownBold = (value: string) =>
  value.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const styleTableHtml = (html: string) => {
  let styled = html;
  styled = styled.replace(/<table\b[^>]*>/i, (match) => {
    const tableStyle = 'width:100%; border-collapse:collapse; border:1px solid #d1d5db;';
    if (/style=/.test(match)) {
      return match.replace(/style="([^"]*)"/i, (_, styles) => `style="${styles}; ${tableStyle}"`);
    }
    return match.replace('<table', `<table style="${tableStyle}"`);
  });
  styled = styled.replace(/<th\b[^>]*>/gi, (match) => {
    const thStyle = 'background:#6b7280; color:#ffffff; text-align:left; padding:8px; border:1px solid #d1d5db;';
    if (/style=/.test(match)) {
      return match.replace(/style="([^"]*)"/i, (_, styles) => `style="${styles}; ${thStyle}"`);
    }
    return match.replace('<th', `<th style="${thStyle}"`);
  });
  styled = styled.replace(/<td\b[^>]*>/gi, (match) => {
    const tdStyle = 'background:#ffffff; color:#111827; padding:8px; border:1px solid #e5e7eb;';
    if (/style=/.test(match)) {
      return match.replace(/style="([^"]*)"/i, (_, styles) => `style="${styles}; ${tdStyle}"`);
    }
    return match.replace('<td', `<td style="${tdStyle}"`);
  });
  return styled;
};

const convertTabTablesToHtml = (body: string) => {
  const lines = body.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const isTabRow = line.includes('\t');
    const nextIsTabRow = (lines[i + 1] || '').includes('\t');

    if (isTabRow && nextIsTabRow) {
      const header = line.split('\t').map((cell) => cell.trim());
      const rows: string[][] = [];
      i += 1;
      while (i < lines.length && lines[i].includes('\t')) {
        rows.push(lines[i].split('\t').map((cell) => cell.trim()));
        i += 1;
      }

      const thead = `<thead><tr>${header
        .map((cell) => `<th>${escapeHtml(cell)}</th>`)
        .join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
        )
        .join('')}</tbody>`;
      output.push(`<table border="1" cellpadding="6" cellspacing="0">${thead}${tbody}</table>`);
      continue;
    }

    output.push(line);
    i += 1;
  }

  return output.join('\n');
};

const ensureEmailSpacing = (value: string) => {
  if (!value) return value;
  let text = value.replace(/\r\n/g, '\n').trim();
  text = text.replace(/•\s+/g, '- ');
  text = text.replace(/\n?<table/g, '\n\n<table');
  text = text.replace(/<\/table>\n?/g, '</table>\n\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/([^\n])\n((?:Deal Snapshot|Exit Reason|V3 Synergies|Financial Highlights|Stage|Next Steps|Why Exit|Why [A-Z][A-Za-z]+|Score Breakdown):)/g, '$1\n\n$2');
  text = text.replace(/([^\n])\n([*-]\s+)/g, '$1\n\n$2');
  text = text.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
};

const formatEmailHtml = (body: string) => {
  const spaced = ensureEmailSpacing(body || '');
  const withoutNotDisclosed = spaced.replace(/not disclosed/gi, '');
  const withTables = convertTablesToHtml(convertTabTablesToHtml(withoutNotDisclosed || ''));
  const withBold = convertMarkdownBold(withTables);
  const tablePlaceholders: string[] = [];
  const withStyledTables = withBold.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    const key = `__TABLE_${tablePlaceholders.length}__`;
    tablePlaceholders.push(styleTableHtml(tableHtml));
    return key;
  });
  const blocks = withStyledTables.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  const htmlBlocks = blocks.map((block) => {
    if (/__TABLE_\d+__/.test(block)) {
      const resolved = block.replace(/__TABLE_(\d+)__/g, (_, index) => tablePlaceholders[Number(index)] || '');
      return `<div style="margin:16px 0;">${resolved}</div>`;
    }

    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));
    const allBullets = bulletLines.length === lines.length && lines.length > 0;

    if (allBullets) {
      const items = lines
        .map((line) => line.replace(/^[-*]\s+/, ''))
        .map((item) => `<li style="margin:0 0 6px;">${item}</li>`)
        .join('');
      return `<ul style="margin:8px 0 12px 18px; padding:0;">${items}</ul>`;
    }

    if (lines.length === 1 && /:$/.test(lines[0])) {
      return `<p style="margin:0 0 10px;"><strong>${lines[0]}</strong></p>`;
    }

    return `<p style="margin:0 0 12px;">${lines.join('<br>')}</p>`;
  });

  return `<div style="font-family:inherit; font-size:14px; line-height:1.55;">${htmlBlocks.join('')}</div>`;
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
        const emailHtml = formatEmailHtml(emailContent);
        const emailBody = {
          message: {
            subject: draft.edited_subject || draft.subject,
            body: {
              contentType: 'HTML',
              content: `${emailHtml}<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`,
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

