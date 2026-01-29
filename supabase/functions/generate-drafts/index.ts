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

    const MAX_DEAL_CHARS = 8000;
    const dealContextSnippet = dealContext
      ? dealContext.slice(0, MAX_DEAL_CHARS)
      : 'No deal/mandate document uploaded.';

    for (const contact of contacts as Contact[]) {
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

If you need a table, output a real HTML <table> with <thead>/<tbody>. Never use ASCII art or Markdown tables.

Return your response in this exact JSON format:
{
  "first_outreach": {"subject": "...", "body": "..."},
  "second_followup": {"subject": "...", "body": "..."},
  "final_followup": {"subject": "...", "body": "..."}
}`;

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
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        console.error('Claude API error:', await response.text());
        continue;
      }

      const data = await response.json();
      const content = data.content[0].text;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const emailDrafts = JSON.parse(jsonMatch[0]);

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

      // Insert drafts into database
      for (const [type, draft] of Object.entries(emailDrafts) as [string, { subject: string; body: string }][]) {
        const normalizedBody = convertMarkdownBold(convertTablesToHtml(draft.body || ''));
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
            subject: draft.subject,
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
    }

    return new Response(JSON.stringify({ success: true, drafts_created: drafts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating drafts:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
