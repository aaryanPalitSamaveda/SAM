# Setup Verification Checklist

## ✅ Azure AD Permissions - VERIFIED

Your permissions are correctly configured:
- ✅ `Mail.Send` (Application) - Granted
- ✅ `Mail.ReadWrite` (Application) - Granted  
- ✅ Admin consent granted for all permissions

---

## Next Steps to Verify

### 1. Verify Supabase Secrets Are Set

Go to: https://supabase.com/dashboard/project/tmzljbqiigltcspwsehj/settings/functions

**Check Secrets tab:**
- [ ] `OUTLOOK_CLIENT_ID` = `[Your Azure AD Client ID]`
- [ ] `OUTLOOK_CLIENT_SECRET` = `[Your Azure AD Client Secret]`
- [ ] `OUTLOOK_TENANT_ID` = `[Your Azure AD Tenant ID]`

**If secrets are missing:**
1. Click "Add new secret"
2. Add each secret with exact name (case-sensitive)
3. Save

---

### 2. Verify Sender Account Email

**Check your `sender_accounts` table:**

The sender email must:
- ✅ Exist in your Microsoft 365 tenant
- ✅ Match exactly (case-sensitive)
- ✅ Be a valid mailbox (not a distribution list)

**Default sender accounts in database:**
- `aaryan@samavedacapital.com`
- `vineeth@samavedacapital.com`
- `ops@samavedacapital.com`

**Verify in Azure AD:**
1. Go to Azure Portal → Azure Active Directory → Users
2. Search for each sender email
3. Confirm they exist and are active

---

### 3. Check Application Access Policy (If Configured)

If you have Exchange Application Access Policies set up:

**Option A: Remove Restriction (for testing)**
```powershell
# In Exchange Online PowerShell
Get-ApplicationAccessPolicy | Remove-ApplicationAccessPolicy
```

**Option B: Allow Your App**
```powershell
# Allow your app to access specific mailboxes
New-ApplicationAccessPolicy -AppId "[Your Azure AD Client ID]" -PolicyScopeGroupId "All" -AccessRight RestrictAccess -Description "Allow email sending"
```

---

### 4. Test Edge Function Directly

**Test the send-email function:**

1. Go to Supabase Dashboard → Functions → `send-email`
2. Click "Invoke" or use the API
3. Use this test payload:

```json
{
  "draftId": "your-draft-id",
  "senderAccountId": "your-sender-account-id"
}
```

**Or test via curl:**
```bash
curl -X POST \
  'https://tmzljbqiigltcspwsehj.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "draftId": "draft-uuid",
    "senderAccountId": "sender-uuid"
  }'
```

---

### 5. Check Edge Function Logs

1. Go to: https://supabase.com/dashboard/project/tmzljbqiigltcspwsehj/functions
2. Click on `send-email`
3. Go to **Logs** tab
4. Try sending an email
5. Check logs for detailed error messages

**Look for:**
- Token generation errors
- Graph API errors
- Permission errors
- Mailbox access errors

---

### 6. Verify Draft and Contact Data

**Check in Supabase SQL Editor:**

```sql
-- Check if draft exists
SELECT * FROM email_drafts WHERE id = 'your-draft-id';

-- Check if contact exists
SELECT * FROM contacts WHERE id = 'your-contact-id';

-- Check if sender account exists
SELECT * FROM sender_accounts WHERE id = 'your-sender-id';
```

**Verify:**
- Draft status is `approved`
- Contact email is valid
- Sender account email matches Azure AD user

---

## Common Issues After Permissions Are Set

### Issue 1: "User not found"
**Cause:** Sender email doesn't exist in tenant
**Solution:** Verify sender email in Azure AD Users

### Issue 2: "Access denied"
**Cause:** Application Access Policy blocking
**Solution:** Remove or modify Exchange policies

### Issue 3: "Insufficient privileges"
**Cause:** Permissions not propagated (wait 5-10 minutes)
**Solution:** Wait and retry, or re-grant admin consent

### Issue 4: "Invalid client secret"
**Cause:** Secret expired or incorrect
**Solution:** Generate new secret in Azure AD and update Supabase

---

## Quick Test Script

Run this in Supabase SQL Editor to verify your setup:

```sql
-- 1. Check sender accounts
SELECT id, email, display_name, is_active FROM sender_accounts;

-- 2. Check approved drafts ready to send
SELECT 
  ed.id as draft_id,
  ed.draft_type,
  ed.status,
  ed.subject,
  c.email as contact_email,
  c.name as contact_name
FROM email_drafts ed
JOIN contacts c ON ed.contact_id = c.id
WHERE ed.status = 'approved' 
  AND ed.draft_type = 'first_outreach'
LIMIT 5;

-- 3. Check if you have any sent emails
SELECT COUNT(*) as total_sent FROM sent_emails;
```

---

## Next Action Items

1. **Verify Supabase secrets are set** (most common issue)
2. **Check sender account emails exist in Azure AD**
3. **Try sending an email and check browser console for detailed error**
4. **Check edge function logs for specific error messages**

---

**Your permissions are correct!** The issue is likely:
- Secrets not set in Supabase, OR
- Sender email doesn't exist in tenant, OR
- Application Access Policy blocking access

Check these and try again!

