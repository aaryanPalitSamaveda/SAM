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
    const { accountEmail, folder = 'inbox', top = 50 } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('OUTLOOK_CLIENT_ID');
    const clientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET');
    const tenantId = Deno.env.get('OUTLOOK_TENANT_ID');

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Missing Microsoft Graph API credentials');
    }

    if (!accountEmail) {
      throw new Error('accountEmail is required');
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
      const errText = await tokenRes.text();
      console.error('Token error:', errText);
      let errorMessage = 'Failed to get Microsoft access token';
      try {
        const errorData = JSON.parse(errText);
        errorMessage = errorData.error_description || errorData.error || errorMessage;
      } catch {
        errorMessage = errText;
      }
      throw new Error(errorMessage);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch emails from Microsoft Graph API
    // For inbox: /messages, for sent: /sentItems
    const endpoint = folder === 'sent' 
      ? `https://graph.microsoft.com/v1.0/users/${accountEmail}/mailFolders/sentItems/messages`
      : `https://graph.microsoft.com/v1.0/users/${accountEmail}/mailFolders/inbox/messages`;
    
    const emailsRes = await fetch(`${endpoint}?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,conversationId`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!emailsRes.ok) {
      const errText = await emailsRes.text();
      console.error('Graph API error:', errText);
      let errorMessage = 'Failed to fetch emails';
      try {
        const errorData = JSON.parse(errText);
        errorMessage = errorData.error?.message || errorData.error?.code || errorMessage;
        // Check for permission errors
        if (errorData.error?.code === 'Forbidden' || errorData.error?.code === 'ErrorAccessDenied') {
          errorMessage = 'Missing Mail.Read permission. Please grant Mail.Read application permission in Azure AD.';
        }
      } catch {
        errorMessage = errText;
      }
      throw new Error(errorMessage);
    }

    const emailsData = await emailsRes.json();
    const emails = emailsData.value || [];

    console.log(`Fetched ${emails.length} emails from ${folder} for ${accountEmail}`);

    return new Response(JSON.stringify({ 
      success: true, 
      emails,
      folder 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching Outlook emails:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
