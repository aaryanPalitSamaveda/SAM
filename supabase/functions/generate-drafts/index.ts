import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Contact {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  raw_data: Record<string, any>;
}

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

    // Markdown table
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

    // ASCII grid table
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

  // Normalize bullet symbol to list items
  text = text.replace(/•\s+/g, '- ');

  // Add spacing around HTML tables if present
  text = text.replace(/\n?<table/g, '\n\n<table');
  text = text.replace(/<\/table>\n?/g, '</table>\n\n');

  // Normalize multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Add spacing before common section headers
  text = text.replace(/([^\n])\n((?:Deal Snapshot|Exit Reason|V3 Synergies|Financial Highlights|Stage|Next Steps|Why Exit|Why [A-Z][A-Za-z]+|Score Breakdown):)/g, '$1\n\n$2');

  // Add a blank line before bullet lists
  text = text.replace(/([^\n])\n([*-]\s+)/g, '$1\n\n$2');

  // Add a blank line between paragraphs (single newline -> double)
  text = text.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');

  // Final cleanup
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
};

const extractNumbers = (value: string) => {
  const matches = value.match(/-?\d[\d,]*\.?\d*/g) || [];
  return matches.map((token) => token.replace(/,/g, ''));
};

const buildAllowedNumbers = (sources: string[]) => {
  const allowed = new Set<string>();
  sources.forEach((source) => {
    extractNumbers(source).forEach((num) => allowed.add(num));
  });
  return allowed;
};

const sanitizeUnauthorizedNumbers = (text: string, allowed: Set<string>) => {
  return text.replace(/-?\d[\d,]*\.?\d*/g, (match) => {
    const normalized = match.replace(/,/g, '');
    return allowed.has(normalized) ? match : '';
  });
};

const removeNotDisclosedLines = (value: string) => {
  if (!value) return value;
  return value.replace(/not disclosed/gi, '');
};

const isSubjectPersonalized = (subject: string, contact: Contact) => {
  const lower = (subject || '').toLowerCase();
  const name = (contact.name || '').toLowerCase();
  const company = (contact.company || '').toLowerCase();
  return (name && lower.includes(name)) || (company && lower.includes(company));
};

const hasRequiredTable = (body: string) => /<table/i.test(body || '');

const hasMatchScore = (body: string) => /match score/i.test(body || '');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts, template, force } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const drafts: any[] = [];
    let dealContext = '';

    if (supabaseUrl && supabaseKey) {
      const dealRes = await fetch(
        `${supabaseUrl}/rest/v1/deal_documents?select=content_text,created_at,file_name&order=created_at.desc&limit=1`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
        }
      );

      if (dealRes.ok) {
        const dealData = await dealRes.json();
        if (dealData?.[0]?.content_text) {
          dealContext = dealData[0].content_text;
        }
      }
    }

    const MAX_DEAL_CHARS = 20000;
    const dealContextSnippet = dealContext
      ? dealContext.slice(0, MAX_DEAL_CHARS)
      : 'No deal/mandate document uploaded.';

    const warnings: Array<{ contact_id: string; reason: string }> = [];
    const errors: Array<{ contact_id: string; reason: string }> = [];

    for (const contact of contacts as Contact[]) {
      try {
        const allowedNumbers = buildAllowedNumbers([
          dealContextSnippet,
          JSON.stringify(contact.raw_data || {}),
          template,
        ]);
        const prompt = `You are an expert investor relations email writer. Based on the template and contact information, generate 3 personalized email drafts:
1. First outreach email
2. First follow-up (to be sent 4 days after first outreach, should reference the first email)
3. Final follow-up (to be sent 7 days after first outreach, should create urgency)

Contact Information:
- Name: ${contact.name || 'Investor'}
- Email: ${contact.email}
- Company: ${contact.company || 'Unknown'}
- Additional Data: ${JSON.stringify(contact.raw_data)}

Deal/Mandate Details (use this for buyer matching and relevance):
${dealContextSnippet}

Template to follow:
${template}

Generate professional, personalized emails that feel authentic and not AI-generated. Each email should have a subject line and body.

Rules you MUST follow:
- First line after greeting must be a personalized intro tied to the contact/company or their known investments.
- Subject line must be personalized (reference their firm, focus, or synergy angle). Avoid generic branding-only subjects.
- From the Deal/Mandate Details, include the top 2 deals that best fit the recipient and show a "Match Score: X%" for each.
- Explain 2-3 concrete reasons for each match score using only deal + contact data.
- Include at least one HTML table that shows deal details and match score (top 2 deals).
- Optionally add a second HTML table for fit reasons or score drivers (short rows).
- Use ONLY numbers and facts explicitly present in the Deal/Mandate Details. Never invent or guess.
- Do NOT convert units (e.g., don't turn INR into Cr unless it appears that way in the deal doc).
- If a specific metric is missing, omit that line entirely. Do not show "Not disclosed".
- Include a "Match Score: X%" line for each of the top 2 deals; if no score is available, omit the score line.
- Personalization must be grounded in Contact Information or Deal/Mandate Details only.
- Use a clean structure with clear section headings, short paragraphs, and bullet points.
- Add blank lines between sections so the email is easy to scan.
- If you need a table, output a real HTML <table> with <thead>/<tbody>. Never use ASCII art or Markdown tables.

Return your response in this exact JSON format:
{
  "first_outreach": {"subject": "...", "body": "..."},
  "second_followup": {"subject": "...", "body": "..."},
  "final_followup": {"subject": "...", "body": "..."}
}`;

        const requestClaude = async (promptText: string) => {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2000,
              messages: [{ role: 'user', content: promptText }],
            }),
          });

          if (!response.ok) {
            console.error('Claude API error:', await response.text());
            return null;
          }

          const data = await response.json();
          const content = data.content?.[0]?.text || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return null;

          try {
            return JSON.parse(jsonMatch[0]) as Record<string, { subject: string; body: string }>;
          } catch (err) {
            console.error('Failed to parse JSON:', err);
            return null;
          }
        };

        let emailDrafts = await requestClaude(prompt);
        if (!emailDrafts) {
          errors.push({ contact_id: contact.id, reason: 'Invalid response from model' });
          continue;
        }

        const invalidDrafts = Object.values(emailDrafts).some((draft) => {
          const subject = draft?.subject || '';
          const body = draft?.body || '';
          return !isSubjectPersonalized(subject, contact) || !hasRequiredTable(body) || !hasMatchScore(body);
        });

        if (invalidDrafts) {
          const retryPrompt = `${prompt}\n\nYour previous output failed validation: missing required HTML table or match score, or subject not personalized. Return corrected JSON only.`;
          const retryDrafts = await requestClaude(retryPrompt);
          if (retryDrafts) {
            emailDrafts = retryDrafts;
          } else {
            warnings.push({
              contact_id: contact.id,
              reason: 'Drafts may be missing required table/match score or personalized subject.',
            });
          }
        }

        if (force) {
          await fetch(`${supabaseUrl}/rest/v1/email_drafts?contact_id=eq.${contact.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey!,
            },
          });
        }

        // Validate and insert drafts into database
        for (const [type, draft] of Object.entries(emailDrafts) as [string, { subject: string; body: string }][]) {
          const combinedText = `${draft.subject || ''}\n${draft.body || ''}`;
        const sanitizedSubject = sanitizeUnauthorizedNumbers(draft.subject || '', allowedNumbers);
        const sanitizedBody = sanitizeUnauthorizedNumbers(draft.body || '', allowedNumbers);
        const cleanedBody = removeNotDisclosedLines(sanitizedBody || '');
        const spacedBody = ensureEmailSpacing(cleanedBody || '');
          if (combinedText !== `${sanitizedSubject}\n${sanitizedBody}`) {
            warnings.push({
              contact_id: contact.id,
              reason: `Adjusted ${type}: replaced numbers not present in deal/contact data.`,
            });
          }

          const normalizedBody = convertMarkdownBold(
            convertTablesToHtml(convertTabTablesToHtml(spacedBody || ''))
          );
          const insertRes = await fetch(`${supabaseUrl}/rest/v1/email_drafts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey!,
            },
            body: JSON.stringify({
              contact_id: contact.id,
              draft_type: type,
              subject: sanitizedSubject,
              body: normalizedBody,
              status: 'draft',
            }),
          });

          if (insertRes.ok) {
            drafts.push({ contact_id: contact.id, type, subject: draft.subject });
          }
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error('Error generating drafts for contact:', contact.id, err);
        errors.push({ contact_id: contact.id, reason: 'Unexpected error during generation' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        drafts_created: drafts.length,
        drafts_adjusted: warnings.length,
        warnings,
        drafts_failed: errors.length,
        errors,
      }),
      {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating drafts:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
