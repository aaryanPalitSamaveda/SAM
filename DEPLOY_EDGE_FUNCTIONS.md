# Deploy Edge Functions Guide

## Issue: 404 Error on Edge Function

The `send-email` function is not deployed yet. You need to deploy it to Supabase.

---

## Option 1: Deploy via Supabase CLI (Recommended)

### Prerequisites
1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Login to Supabase: `supabase login`
3. Link your project: `supabase link --project-ref tmzljbqiigltcspwsehj`

### Deploy Functions

```bash
# Deploy send-email function
supabase functions deploy send-email

# Deploy other functions
supabase functions deploy generate-drafts
supabase functions deploy send-all-approved
supabase functions deploy process-scheduled-emails
```

---

## Option 2: Deploy via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/tmzljbqiigltcspwsehj/functions
2. Click "Create a new function"
3. Name: `send-email`
4. Copy the code from `supabase/functions/send-email/index.ts`
5. Paste into the editor
6. Click "Deploy"

Repeat for other functions:
- `generate-drafts`
- `send-all-approved`
- `process-scheduled-emails`

---

## Option 3: Quick Deploy Script

Create a deploy script:

```bash
# deploy-functions.sh
#!/bin/bash

echo "Deploying edge functions..."

supabase functions deploy send-email
supabase functions deploy generate-drafts
supabase functions deploy send-all-approved
supabase functions deploy process-scheduled-emails

echo "Deployment complete!"
```

---

## Verify Deployment

After deploying, verify:

1. **Check Functions List**
   - Go to: https://supabase.com/dashboard/project/tmzljbqiigltcspwsehj/functions
   - You should see all 4 functions listed

2. **Test Function**
   - Click on `send-email`
   - Go to "Logs" tab
   - Try invoking it from your app

3. **Check Function URL**
   - Function URL should be: `https://tmzljbqiigltcspwsehj.supabase.co/functions/v1/send-email`
   - Test with curl:
   ```bash
   curl -X POST \
     'https://tmzljbqiigltcspwsehj.supabase.co/functions/v1/send-email' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"draftId":"test","senderAccountId":"test"}'
   ```

---

## After Deployment

1. **Set Secrets** (if not already set):
   - Go to Settings → Edge Functions → Secrets
   - Add: `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_TENANT_ID`

2. **Test Sending Email**:
   - Go to Drafts page
   - Approve a draft
   - Click "Send"
   - Should work now!

---

## Troubleshooting

### "Function not found" after deployment
- Wait 1-2 minutes for deployment to propagate
- Refresh the page
- Check function exists in dashboard

### "Unauthorized" error
- Check you're using the correct anon key
- Verify function has `verify_jwt = false` in config.toml

### CORS errors persist
- Ensure CORS headers are in the function code
- Check function is deployed correctly
- Verify function URL is correct

---

**Next Step:** Deploy the `send-email` function and try again!

