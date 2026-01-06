# Git Commands to Remove Secrets from History

## ⚠️ IMPORTANT: Rotate Your Azure AD Secret First!

**Before running these commands, you MUST:**
1. Go to Azure Portal → Your App Registration → Certificates & secrets
2. Delete the old secret (`OE-8Q~...`)
3. Create a new client secret
4. Update Supabase secrets with the new value

**The old secret is compromised and must be rotated!**

---

## Option 1: Interactive Rebase (Recommended)

Run these commands **one by one** in Git Bash:

### Step 1: Start Interactive Rebase
```bash
git rebase -i 56fe8e8
```

**In the editor that opens:**
- Find the line: `pick 070a823 Updated the Investor Bot`
- Change `pick` to `edit`
- Save and close:
  - If using **vim**: Press `i`, change `pick` to `edit`, Press `Esc`, type `:wq`, Press `Enter`
  - If using **nano**: Make change, Press `Ctrl+X`, Press `Y`, Press `Enter`

### Step 2: Remove Secrets from Files
```bash
# Checkout the commit files
git checkout 070a823 -- VERIFY_SETUP.md setup-env.js 2>/dev/null || true

# Remove secrets using sed (if files exist)
sed -i 's/e3b6344b-d7b1-4e8a-9a2c-0c5415a2a01e/[Your Azure AD Client ID]/g' VERIFY_SETUP.md 2>/dev/null || true
sed -i 's/OE-8Q~JqgembOeKZ2F9\.KS2El8Vzj0Yl--BBybWe/[Your Azure AD Client Secret]/g' VERIFY_SETUP.md 2>/dev/null || true
sed -i 's/861a4c68-f42f-4190-893c-4861b695ec5c/[Your Azure AD Tenant ID]/g' VERIFY_SETUP.md 2>/dev/null || true

sed -i 's/e3b6344b-d7b1-4e8a-9a2c-0c5415a2a01e/your-azure-ad-client-id-here/g' setup-env.js 2>/dev/null || true
sed -i 's/OE-8Q~JqgembOeKZ2F9\.KS2El8Vzj0Yl--BBybWe/your-azure-ad-client-secret-here/g' setup-env.js 2>/dev/null || true
sed -i 's/861a4c68-f42f-4190-893c-4861b695ec5c/your-azure-ad-tenant-id-here/g' setup-env.js 2>/dev/null || true
```

### Step 3: Stage and Amend
```bash
git add VERIFY_SETUP.md setup-env.js
git commit --amend --no-edit
```

### Step 4: Continue Rebase
```bash
git rebase --continue
```

### Step 5: Force Push
```bash
git push --force-with-lease origin main
```

---

## Option 2: Use GitHub Unblock URL (Easier, but secret stays in history)

If you've already rotated the secret, you can just allow it:

1. Visit: https://github.com/aaryanPalitSamaveda/SAM/security/secret-scanning/unblock-secret/37sLvR6jKzWdVoRCy5hIlYkXpC9
2. Click "Allow secret"
3. Push again: `git push origin main`

**Note:** This allows the secret in history, but since you've rotated it, it's safe.

---

## Option 3: Create New Branch (Safest)

If rebase is too complex:

```bash
# Create new branch from before the secret commit
git checkout 56fe8e8
git checkout -b main-clean

# Cherry-pick commits after the secret commit (skip 070a823)
git cherry-pick e4739e1
git cherry-pick 2adbc57
git cherry-pick 8c327da

# Force push new branch
git push --force origin main-clean:main
```

---

## Quick One-Liner (If files exist in that commit)

```bash
# Start rebase
git rebase -i 56fe8e8
# (Change pick to edit for 070a823, save)

# Remove secrets
git checkout 070a823 -- VERIFY_SETUP.md setup-env.js 2>/dev/null; \
sed -i 's/OE-8Q~JqgembOeKZ2F9\.KS2El8Vzj0Yl--BBybWe/PLACEHOLDER/g' VERIFY_SETUP.md setup-env.js 2>/dev/null; \
sed -i 's/e3b6344b-d7b1-4e8a-9a2c-0c5415a2a01e/PLACEHOLDER/g' VERIFY_SETUP.md setup-env.js 2>/dev/null; \
sed -i 's/861a4c68-f42f-4190-893c-4861b695ec5c/PLACEHOLDER/g' VERIFY_SETUP.md setup-env.js 2>/dev/null; \
git add VERIFY_SETUP.md setup-env.js; \
git commit --amend --no-edit; \
git rebase --continue; \
git push --force-with-lease origin main
```

---

## Recommended Approach

**If you've rotated the secret:** Use Option 2 (GitHub unblock URL) - it's the easiest.

**If you want clean history:** Use Option 1 (Interactive rebase) - more work but cleaner.

---

## After Pushing

1. ✅ Verify push succeeded
2. ✅ Update Supabase secrets with new rotated secret
3. ✅ Update local .env file
4. ✅ Test email sending

