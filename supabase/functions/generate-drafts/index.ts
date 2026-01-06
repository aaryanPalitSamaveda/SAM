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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts, template } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const drafts: any[] = [];

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

Template to follow:
${template}

Generate professional, personalized emails that feel authentic and not AI-generated. Each email should have a subject line and body.

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

      // Insert drafts into database
      for (const [type, draft] of Object.entries(emailDrafts) as [string, { subject: string; body: string }][]) {
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
            body: draft.body,
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
