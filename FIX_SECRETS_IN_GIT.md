# Fix Secrets in Git History

## Problem
GitHub detected secrets in commit history and blocked the push.

## Solution Options

### Option 1: Use GitHub Unblock URL (Easiest)

GitHub provided this URL to allow the secret:
https://github.com/aaryanPalitSamaveda/SAM/security/secret-scanning/unblock-secret/37sLvR6jKzWdVoRCy5hIlYkXpC9

1. Click the URL above
2. Review and confirm you want to allow this secret
3. Push again: `git push -u origin main`

**Note:** This allows the secret in this specific commit, but it's still in your git history.

---

### Option 2: Remove Secret from History (Recommended for Security)

Since the secret is already exposed, you should:

1. **Rotate the Secret** (IMPORTANT!)
   - Go to Azure Portal → Your App Registration → Certificates & secrets
   - Delete the old secret
   - Create a new client secret
   - Update Supabase secrets with the new value

2. **Remove from Git History**

```bash
# Interactive rebase to remove the commit with secrets
git rebase -i HEAD~3

# In the editor, change 'pick' to 'edit' for the commit with secrets
# Save and close

# Remove the secret from files
# (Already done - files are updated)

# Amend the commit
git add VERIFY_SETUP.md setup-env.js
git commit --amend --no-edit

# Continue rebase
git rebase --continue

# Force push (WARNING: This rewrites history)
git push --force-with-lease origin main
```

---

### Option 3: Create New Commit (Current Status)

I've already:
- ✅ Removed secrets from `VERIFY_SETUP.md`
- ✅ Removed secrets from `setup-env.js`
- ✅ Committed the changes

**Next Steps:**

1. **Rotate the Azure AD Secret** (CRITICAL!)
   - The secret is now exposed in git history
   - Generate a new client secret in Azure AD
   - Update Supabase secrets with new value

2. **Push the new commit:**
```bash
git push -u origin main
```

If GitHub still blocks, use Option 1 (unblock URL) or Option 2 (rewrite history).

---

## Important Security Note

**The Azure AD Client Secret is now exposed in your git history!**

You MUST:
1. ✅ Rotate the secret (create new one in Azure AD)
2. ✅ Update Supabase secrets with new value
3. ✅ Update your local .env file with new value

The old secret should be considered compromised.

---

## After Fixing

1. Update Supabase secrets with new values
2. Update local .env file
3. Test email sending again
4. Deploy edge functions

