# Outlook View Setup Guide

## Issue: "No emails in inbox" in Outlook View

The Outlook view requires additional Microsoft Graph API permissions to read emails from user mailboxes.

## Required Permissions

To read emails from Outlook mailboxes, you need to add the following **Application Permission** (not Delegated) in Azure AD:

### Required Permission:
- **Mail.Read** (Application permission)

## Setup Steps

1. **Go to Azure Portal** → Your App Registration → API permissions

2. **Add Application Permission:**
   - Click "Add a permission"
   - Select "Microsoft Graph"
   - Choose "Application permissions"
   - Search for and add: **Mail.Read**
   - Click "Add permissions"

3. **Grant Admin Consent:**
   - Click "Grant admin consent for [Your Organization]"
   - Confirm the consent

4. **Verify Permissions:**
   Your app should now have:
   - Mail.Send (Application) - for sending emails
   - Mail.Read (Application) - for reading emails
   - User.Read (Application) - for user info

5. **Redeploy Edge Function:**
   - The `fetch-outlook-emails` edge function should work after permissions are granted
   - No code changes needed

## Troubleshooting

### Check Browser Console
Open browser developer tools (F12) and check the Console tab for error messages when loading the Outlook view.

### Common Errors:

1. **"Forbidden" or "ErrorAccessDenied"**
   - Solution: Grant Mail.Read application permission and admin consent

2. **"Failed to get Microsoft access token"**
   - Solution: Check that OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, and OUTLOOK_TENANT_ID are correctly set in Supabase secrets

3. **"Failed to fetch emails"**
   - Solution: Verify the email account exists and is accessible
   - Check that the account email matches exactly (case-sensitive)

### Testing

After granting permissions:
1. Refresh the Outlook View page
2. Select a sender account
3. Check both Inbox and Sent tabs
4. Check browser console for any errors

## Alternative: Using Delegated Permissions

If you prefer user-specific access (each user signs in), you would need to:
1. Use delegated permissions instead of application permissions
2. Implement OAuth2 user authentication flow
3. Store user access tokens

However, application permissions are recommended for this use case as they allow the app to read emails without user interaction.
