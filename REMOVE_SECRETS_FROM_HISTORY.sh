#!/bin/bash

# Script to remove secrets from git history
# Run this in Git Bash

echo "⚠️  WARNING: This will rewrite git history!"
echo "Make sure you've backed up your work."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Step 1: Start interactive rebase from before the commit with secrets
echo ""
echo "Starting interactive rebase..."
git rebase -i 56fe8e8

# Instructions will appear in editor:
# - Change 'pick' to 'edit' for commit 070a823
# - Save and close the editor

echo ""
echo "After the editor opens:"
echo "1. Find the line with '070a823 Updated the Investor Bot'"
echo "2. Change 'pick' to 'edit'"
echo "3. Save and close (in vim: press 'i', make change, press Esc, type ':wq', press Enter)"
echo ""
read -p "Press Enter after you've edited the rebase file..."

# Step 2: The commit will be checked out, now remove secrets
echo ""
echo "Removing secrets from files in commit 070a823..."

# Remove secrets from VERIFY_SETUP.md if it exists in this commit
if git show 070a823:VERIFY_SETUP.md > /dev/null 2>&1; then
    git show 070a823:VERIFY_SETUP.md | \
    sed 's/e3b6344b-d7b1-4e8a-9a2c-0c5415a2a01e/[Your Azure AD Client ID]/g' | \
    sed 's/OE-8Q~JqgembOeKZ2F9\.KS2El8Vzj0Yl--BBybWe/[Your Azure AD Client Secret]/g' | \
    sed 's/861a4c68-f42f-4190-893c-4861b695ec5c/[Your Azure AD Tenant ID]/g' > VERIFY_SETUP.md
fi

# Remove secrets from setup-env.js if it exists in this commit
if git show 070a823:setup-env.js > /dev/null 2>&1; then
    git show 070a823:setup-env.js | \
    sed 's/e3b6344b-d7b1-4e8a-9a2c-0c5415a2a01e/your-azure-ad-client-id-here/g' | \
    sed 's/OE-8Q~JqgembOeKZ2F9\.KS2El8Vzj0Yl--BBybWe/your-azure-ad-client-secret-here/g' | \
    sed 's/861a4c68-f42f-4190-893c-4861b695ec5c/your-azure-ad-tenant-id-here/g' > setup-env.js
fi

# Step 3: Stage the changes
git add VERIFY_SETUP.md setup-env.js 2>/dev/null || true

# Step 4: Amend the commit
echo ""
echo "Amending commit..."
git commit --amend --no-edit

# Step 5: Continue rebase
echo ""
echo "Continuing rebase..."
git rebase --continue

echo ""
echo "✅ History rewritten! Now force push:"
echo "git push --force-with-lease origin main"

