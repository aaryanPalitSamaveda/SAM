# Complete List of Required Secrets

> Quick reference for all secrets needed to run the application

---

## 📋 Summary

**Total Secrets Required: 7**

- **Frontend (.env file):** 3 secrets
- **Edge Functions (Supabase Dashboard):** 4 secrets (1 for AI, 3 for email)

---

## 🖥️ Frontend Secrets (`.env` file)

**Location:** Create `.env` file in project root

**Required for:** Frontend application to connect to Supabase

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `VITE_SUPABASE_URL` | `https://tmzljbqiigltcspwsehj.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase Dashboard → Settings → API → anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | `tmzljbqiigltcspwsehj` | Your Supabase project ID |

**How to get:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/tmzljbqiigltcspwsehj
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Project ID** → `VITE_SUPABASE_PROJECT_ID`

**Example `.env` file:**
```env
VITE_SUPABASE_URL=https://tmzljbqiigltcspwsehj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key-here
VITE_SUPABASE_PROJECT_ID=tmzljbqiigltcspwsehj
```

---

## ⚙️ Edge Function Secrets (Supabase Dashboard)

**Location:** Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Required for:** Edge functions to work (AI generation and email sending)

### 1. ANTHROPIC_API_KEY

**Required by:** `generate-drafts` edge function

**Purpose:** API key for Claude AI to generate personalized email drafts

**How to get:**
1. Go to https://console.anthropic.com
2. Sign in or create account
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the API key (starts with `sk-ant-...`)

**Where to set:**
- Supabase Dashboard → Settings → Edge Functions → Secrets
- Add new secret: `ANTHROPIC_API_KEY`
- Paste your API key

**Cost:** Pay-per-use (check Anthropic pricing)

---

### 2. OUTLOOK_CLIENT_ID

**Required by:** `send-email` edge function

**Purpose:** Azure AD Application Client ID for Microsoft Graph API

**How to get:**
1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name: "Email Campaign Sender" (or your choice)
5. Supported account types: **Single tenant**
6. Click **Register**
7. Copy the **Application (client) ID** from the Overview page

**Where to set:**
- Supabase Dashboard → Settings → Edge Functions → Secrets
- Add new secret: `OUTLOOK_CLIENT_ID`
- Paste your Client ID (UUID format)

---

### 3. OUTLOOK_CLIENT_SECRET

**Required by:** `send-email` edge function

**Purpose:** Azure AD Application Client Secret for authentication

**How to get:**
1. In your Azure AD App Registration (from step above)
2. Go to **Certificates & secrets**
3. Click **New client secret**
4. Add description: "Email Campaign Sender Secret"
5. Choose expiry (recommend 24 months)
6. Click **Add**
7. **IMPORTANT:** Copy the **Value** immediately (shown only once!)
   - The secret value, NOT the Secret ID

**Where to set:**
- Supabase Dashboard → Settings → Edge Functions → Secrets
- Add new secret: `OUTLOOK_CLIENT_SECRET`
- Paste the secret value

**Note:** Secret expires based on your setting. Set a reminder to rotate before expiry.

---

### 4. OUTLOOK_TENANT_ID

**Required by:** `send-email` edge function

**Purpose:** Azure AD Tenant ID for Microsoft authentication

**How to get:**
1. In your Azure AD App Registration (same as above)
2. From the **Overview** page
3. Copy the **Directory (tenant) ID**

**Where to set:**
- Supabase Dashboard → Settings → Edge Functions → Secrets
- Add new secret: `OUTLOOK_TENANT_ID`
- Paste your Tenant ID (UUID format)

---

## 🔧 Additional Azure AD Configuration (Required for Email)

After creating the Azure AD app, you must configure permissions:

### Step 1: Add API Permissions

1. In Azure Portal → Your App Registration
2. Go to **API permissions**
3. Click **Add a permission**
4. Select **Microsoft Graph**
5. Choose **Application permissions** (not Delegated)
6. Add these permissions:
   - ✅ `Mail.Send` - Send mail as any user
   - ✅ `User.Read.All` - Read all users (optional but recommended)
7. Click **Grant admin consent** (IMPORTANT!)

### Step 2: Configure Mailbox Access

Allow the app to access specific mailboxes:

**Option A: Exchange Admin Center (EAC)**
1. Go to Exchange Admin Center
2. Navigate to **Permissions** → **Application Access Policy**
3. Create new policy allowing your app to access mailboxes

**Option B: PowerShell**
```powershell
New-ApplicationAccessPolicy -AppId <YOUR_CLIENT_ID> -PolicyScopeGroupId <SECURITY_GROUP> -AccessRight RestrictAccess
```

---

## ✅ Auto-Provided Secrets (No Action Needed)

These are automatically available to edge functions:

| Secret Name | Description | Used By |
|-------------|-------------|---------|
| `SUPABASE_URL` | Project URL | Both functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Full database access | Both functions |
| `SUPABASE_ANON_KEY` | Anonymous key | Both functions |
| `SUPABASE_DB_URL` | Database connection URL | Both functions |

**No configuration needed** - Supabase provides these automatically.

---

## 📝 Quick Setup Checklist

### Frontend Setup
- [ ] Create `.env` file in project root
- [ ] Add `VITE_SUPABASE_URL`
- [ ] Add `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Add `VITE_SUPABASE_PROJECT_ID`
- [ ] Restart dev server (`npm run dev`)

### Edge Function Setup (If Using AI/Email Features)
- [ ] Get Anthropic API key → Set `ANTHROPIC_API_KEY`
- [ ] Create Azure AD App → Get `OUTLOOK_CLIENT_ID`
- [ ] Create Client Secret → Set `OUTLOOK_CLIENT_SECRET`
- [ ] Get Tenant ID → Set `OUTLOOK_TENANT_ID`
- [ ] Configure Azure AD API permissions
- [ ] Grant admin consent
- [ ] Configure mailbox access policy

---

## 🎯 Minimum Required Secrets

**To run the app WITHOUT AI/Email features:**
- ✅ Only frontend secrets (3) are required
- ❌ Edge function secrets not needed
- ⚠️ You can use the app but won't be able to:
  - Generate AI drafts
  - Send emails via Outlook

**To run the FULL application:**
- ✅ All 7 secrets required

---

## 🔍 Verification

### Check Frontend Secrets
```bash
# In your terminal, verify .env is loaded
npm run dev
# Check browser console for connection errors
```

### Check Edge Function Secrets
1. Go to Supabase Dashboard → Edge Functions → Logs
2. Try calling a function
3. Check logs for "not configured" errors

### Test Secrets

**Test Anthropic API Key:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

**Test Azure AD Credentials:**
- Try sending a test email from your app
- Check edge function logs for authentication errors

---

## 🚨 Troubleshooting

### "ANTHROPIC_API_KEY is not configured"
- ✅ Verify secret name is exactly `ANTHROPIC_API_KEY` (case-sensitive)
- ✅ Check secret is set in Supabase Dashboard
- ✅ Redeploy edge function after adding secret

### "Missing Microsoft Graph API credentials"
- ✅ Verify all 3 Outlook secrets are set:
  - `OUTLOOK_CLIENT_ID`
  - `OUTLOOK_CLIENT_SECRET`
  - `OUTLOOK_TENANT_ID`
- ✅ Check secret names match exactly (case-sensitive)
- ✅ Verify Azure AD app has correct permissions
- ✅ Ensure admin consent was granted

### "Failed to get Microsoft access token"
- ✅ Check client secret hasn't expired
- ✅ Verify tenant ID is correct
- ✅ Confirm app registration is in correct Azure tenant

### "Failed to send email via Microsoft Graph"
- ✅ Verify sender email exists in Azure tenant
- ✅ Check `Mail.Send` permission is granted
- ✅ Confirm application access policy allows the mailbox

---

## 🔐 Security Best Practices

1. **Never commit secrets to Git**
   - `.env` should be in `.gitignore`
   - Use environment variables, not hardcoded values

2. **Rotate secrets regularly**
   - Anthropic API key: Every 90 days
   - Azure client secret: Before expiry (max 24 months)

3. **Use separate keys for environments**
   - Development
   - Staging
   - Production

4. **Monitor API usage**
   - Set up billing alerts for Anthropic
   - Monitor Azure AD sign-in logs

5. **Principle of least privilege**
   - Only grant necessary Azure AD permissions
   - Use application access policies to restrict mailbox access

---

## 📚 Related Documentation

- **SECRETS_AND_CONFIG.md** - Detailed configuration guide
- **EDGE_FUNCTIONS.md** - Edge function documentation
- **BUILD_DATABASE_GUIDE.md** - Database setup guide

---

**All secrets configured?** Your application is ready to use! 🎉

