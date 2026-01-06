# Secrets and Configuration Reference

> Last Updated: 2026-01-06
> Project: Email Campaign Management System

## Overview

This document lists all secrets, environment variables, and configuration settings required for the application.

---

## Environment Variables (Frontend)

These are automatically managed and available in the frontend:

| Variable | Description | Auto-Provided |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | ✅ Yes |
| `VITE_SUPABASE_PROJECT_ID` | Project ID: `tmzljbqiigltcspwsehj` | ✅ Yes |

**Note:** Never edit `.env` directly - it's auto-generated.

---

## Supabase Secrets (Backend)

These secrets are stored in Supabase and available to edge functions:

### Auto-Provided Secrets
| Secret Name | Description | How to Access |
|-------------|-------------|---------------|
| `SUPABASE_URL` | Project URL | `Deno.env.get('SUPABASE_URL')` |
| `SUPABASE_ANON_KEY` | Anonymous key | `Deno.env.get('SUPABASE_ANON_KEY')` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access) | `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` |
| `SUPABASE_DB_URL` | Database connection URL | `Deno.env.get('SUPABASE_DB_URL')` |
| `SUPABASE_PUBLISHABLE_KEY` | Same as anon key | `Deno.env.get('SUPABASE_PUBLISHABLE_KEY')` |

### User-Configured Secrets
| Secret Name | Description | Required By | How to Set |
|-------------|-------------|-------------|------------|
| `ANTHROPIC_API_KEY` | Claude AI API key | `generate-drafts` | Lovable Cloud UI |
| `OUTLOOK_CLIENT_ID` | Azure AD app client ID | `send-email` | Lovable Cloud UI |
| `OUTLOOK_CLIENT_SECRET` | Azure AD app client secret | `send-email` | Lovable Cloud UI |
| `OUTLOOK_TENANT_ID` | Azure AD tenant ID | `send-email` | Lovable Cloud UI |

---

## Secret Configuration Details

### Anthropic API Key

**Purpose:** Used to call Claude AI for generating personalized email drafts.

**How to obtain:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Copy and store securely

**Used in:** `supabase/functions/generate-drafts/index.ts`

**Rate limits:** Check Anthropic's current tier limits

---

### Microsoft Azure AD Configuration

**Purpose:** Used to send emails via Microsoft Graph API (Outlook/Microsoft 365).

#### Prerequisites
- Microsoft 365 Business account
- Azure AD admin access

#### Setup Steps

1. **Register an Application in Azure AD**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to Azure Active Directory → App registrations
   - Click "New registration"
   - Name: "Email Campaign Sender" (or your choice)
   - Supported account types: Single tenant
   - Click Register

2. **Get Application (Client) ID**
   - After registration, copy the "Application (client) ID"
   - This is your `OUTLOOK_CLIENT_ID`

3. **Get Tenant ID**
   - Copy the "Directory (tenant) ID"
   - This is your `OUTLOOK_TENANT_ID`

4. **Create Client Secret**
   - Go to Certificates & secrets
   - Click "New client secret"
   - Add description and expiry
   - Copy the secret value immediately (shown only once)
   - This is your `OUTLOOK_CLIENT_SECRET`

5. **Configure API Permissions**
   - Go to API permissions
   - Click "Add a permission"
   - Select "Microsoft Graph"
   - Choose "Application permissions"
   - Add these permissions:
     - `Mail.Send` - Send mail as any user
     - `User.Read.All` - Read all users (optional, for validation)
   - Click "Grant admin consent"

6. **Allow Application Access to Mailboxes**
   - In Exchange Admin Center or PowerShell:
   ```powershell
   New-ApplicationAccessPolicy -AppId <CLIENT_ID> -PolicyScopeGroupId <SECURITY_GROUP> -AccessRight RestrictAccess
   ```

---

## Edge Function Configuration

Located in `supabase/config.toml`:

```toml
project_id = "tmzljbqiigltcspwsehj"

[functions.generate-drafts]
verify_jwt = false

[functions.send-email]
verify_jwt = false
```

### Configuration Options

| Option | Value | Description |
|--------|-------|-------------|
| `project_id` | `tmzljbqiigltcspwsehj` | Supabase project identifier |
| `verify_jwt` | `false` | JWT verification disabled (dev mode) |

### Production Recommendations

```toml
# For production, enable JWT verification:
[functions.generate-drafts]
verify_jwt = true

[functions.send-email]
verify_jwt = true
```

---

## API Endpoints

### Supabase REST API
```
Base URL: https://tmzljbqiigltcspwsehj.supabase.co
```

### Edge Functions
```
generate-drafts: https://tmzljbqiigltcspwsehj.supabase.co/functions/v1/generate-drafts
send-email: https://tmzljbqiigltcspwsehj.supabase.co/functions/v1/send-email
```

### External APIs
```
Anthropic: https://api.anthropic.com/v1/messages
Microsoft Token: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Microsoft Graph: https://graph.microsoft.com/v1.0/
```

---

## Troubleshooting

### "ANTHROPIC_API_KEY is not configured"
- Verify secret is set in Lovable Cloud
- Check secret name matches exactly
- Redeploy edge function after adding secret

### "Missing Microsoft Graph API credentials"
- Verify all three secrets are set:
  - OUTLOOK_CLIENT_ID
  - OUTLOOK_CLIENT_SECRET
  - OUTLOOK_TENANT_ID
- Check Azure AD app has correct permissions
- Verify admin consent was granted

### "Failed to get Microsoft access token"
- Check client secret hasn't expired
- Verify tenant ID is correct
- Confirm app registration is in correct tenant

### "Failed to send email via Microsoft Graph"
- Verify sender email exists in tenant
- Check Mail.Send permission is granted
- Confirm application access policy allows the mailbox

---

## Security Best Practices

1. **Rotate secrets regularly**
   - Anthropic API key: Every 90 days
   - Azure client secret: Before expiry (max 24 months)

2. **Use separate keys for environments**
   - Development
   - Staging
   - Production

3. **Monitor API usage**
   - Set up billing alerts for Anthropic
   - Monitor Azure AD sign-in logs

4. **Principle of least privilege**
   - Only grant necessary permissions
   - Use application access policies for email
