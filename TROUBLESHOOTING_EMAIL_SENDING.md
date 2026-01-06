# Troubleshooting Email Sending Issues

## Common Error Messages & Solutions

### 1. "Missing Microsoft Graph API credentials"

**Error:** `Missing Microsoft Graph API credentials. Please set OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and OUTLOOK_TENANT_ID secrets.`

**Solution:**
1. Go to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Verify these secrets are set:
   - `OUTLOOK_CLIENT_ID`
   - `OUTLOOK_CLIENT_SECRET`
   - `OUTLOOK_TENANT_ID`
3. Ensure secret names match exactly (case-sensitive)
4. Redeploy the edge function after adding secrets

---

### 2. "Failed to get Microsoft access token"

**Error:** `Token error: [error details]`

**Possible Causes:**

#### A. Invalid Client Secret
- Client secret may have expired
- Secret value might be incorrect

**Solution:**
1. Go to Azure Portal → Your App Registration → Certificates & secrets
2. Check if client secret has expired
3. Create a new client secret if expired
4. Update `OUTLOOK_CLIENT_SECRET` in Supabase secrets

#### B. Wrong Tenant ID
- Tenant ID doesn't match the app registration

**Solution:**
1. Verify Tenant ID in Azure Portal → App Registration → Overview
2. Copy the "Directory (tenant) ID"
3. Update `OUTLOOK_TENANT_ID` in Supabase secrets

#### C. Wrong Client ID
- Client ID doesn't match the app registration

**Solution:**
1. Verify Client ID in Azure Portal → App Registration → Overview
2. Copy the "Application (client) ID"
3. Update `OUTLOOK_CLIENT_ID` in Supabase secrets

---

### 3. "Failed to send email via Microsoft Graph"

**Error:** `Graph API error: [error details]`

**Possible Causes:**

#### A. Mail.Send Permission Not Granted
**Error:** `Insufficient privileges to complete the operation`

**Solution:**
1. Go to Azure Portal → Your App Registration → API permissions
2. Verify `Mail.Send` permission is added
3. Click "Grant admin consent" (IMPORTANT!)
4. Wait a few minutes for permissions to propagate

#### B. Sender Email Doesn't Exist
**Error:** `Resource not found` or `User not found`

**Solution:**
1. Verify sender email exists in your Microsoft 365 tenant
2. Check sender email in `sender_accounts` table matches exactly
3. Ensure email is a valid mailbox in your organization

#### C. Application Access Policy Restriction
**Error:** `Access denied` or `Application access policy`

**Solution:**
1. In Exchange Admin Center, check Application Access Policies
2. Ensure your app has access to the sender mailbox
3. Or remove restrictive policies for testing

#### D. Mailbox Not Enabled
**Error:** `Mailbox not found` or `Mailbox disabled`

**Solution:**
1. Verify mailbox is active in Exchange Admin Center
2. Check mailbox is not disabled or on hold
3. Ensure mailbox has a valid license

---

### 4. "Draft not found" or "Sender account not found"

**Error:** `Draft not found: [draft-id]` or `Sender account not found: [sender-id]`

**Solution:**
1. Verify draft exists in database
2. Verify sender account exists and is active
3. Check IDs are correct UUIDs
4. Refresh the page and try again

---

## Step-by-Step Debugging

### Step 1: Check Supabase Secrets

1. Go to: https://supabase.com/dashboard/project/tmzljbqiigltcspwsehj/settings/functions
2. Navigate to **Secrets** tab
3. Verify all three Outlook secrets are present:
   - ✅ `OUTLOOK_CLIENT_ID`
   - ✅ `OUTLOOK_CLIENT_SECRET`
   - ✅ `OUTLOOK_TENANT_ID`

### Step 2: Check Azure AD App Registration

1. Go to: https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app registration
4. Verify:
   - **Overview**: Client ID and Tenant ID match Supabase secrets
   - **Certificates & secrets**: Client secret exists and hasn't expired
   - **API permissions**: `Mail.Send` is added and admin consent is granted

### Step 3: Check Edge Function Logs

1. Go to: https://supabase.com/dashboard/project/tmzljbqiigltcspwsehj/functions
2. Click on `send-email` function
3. View **Logs** tab
4. Look for detailed error messages

### Step 4: Test Token Generation

Test if you can get an access token:

```bash
curl -X POST \
  "https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials"
```

**Expected Response:**
```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "..."
}
```

**If this fails:** Your credentials are incorrect or expired.

### Step 5: Test Graph API Call

If token generation works, test sending an email:

```bash
curl -X POST \
  "https://graph.microsoft.com/v1.0/users/SENDER_EMAIL/sendMail" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "subject": "Test Email",
      "body": {
        "contentType": "Text",
        "content": "This is a test email"
      },
      "toRecipients": [{
        "emailAddress": {
          "address": "recipient@example.com"
        }
      }]
    },
    "saveToSentItems": true
  }'
```

**If this fails:** Check permissions and mailbox access.

---

## Quick Checklist

- [ ] All three Outlook secrets set in Supabase
- [ ] Client secret hasn't expired
- [ ] Tenant ID matches Azure AD tenant
- [ ] Client ID matches app registration
- [ ] `Mail.Send` permission added in Azure AD
- [ ] Admin consent granted for permissions
- [ ] Sender email exists in Microsoft 365 tenant
- [ ] Sender email matches exactly in `sender_accounts` table
- [ ] Mailbox is active and enabled
- [ ] Application access policy allows mailbox access (if configured)

---

## Common Error Codes

### AADSTS70011
**Meaning:** Invalid scope
**Solution:** Ensure scope is `https://graph.microsoft.com/.default`

### AADSTS7000215
**Meaning:** Invalid client secret
**Solution:** Generate new client secret and update Supabase

### 403 Forbidden
**Meaning:** Permission denied
**Solution:** Grant admin consent for `Mail.Send` permission

### 404 Not Found
**Meaning:** User/mailbox not found
**Solution:** Verify sender email exists in tenant

### 401 Unauthorized
**Meaning:** Invalid or expired token
**Solution:** Check credentials and regenerate token

---

## Getting More Details

After updating the error handling, you'll now see detailed error messages in:
1. **Browser Console** - Check Developer Tools → Console
2. **Toast Notifications** - Error messages will show specific details
3. **Edge Function Logs** - Supabase Dashboard → Functions → Logs

The improved error handling will show:
- Exact error message from Microsoft Graph API
- Token error details
- Permission errors
- Mailbox access errors

---

## Still Having Issues?

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for detailed error messages
   - Check Network tab for API responses

2. **Check Edge Function Logs**
   - Go to Supabase Dashboard → Functions → send-email → Logs
   - Look for `console.error` messages
   - Check for detailed error information

3. **Verify Database**
   - Check `sender_accounts` table has correct email
   - Verify `email_drafts` table has valid drafts
   - Ensure `contacts` table has valid contact emails

4. **Test Manually**
   - Use the curl commands above to test each step
   - Isolate where the failure occurs

---

**Last Updated:** 2026-01-06

