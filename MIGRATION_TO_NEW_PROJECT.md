# Migration to New Supabase Project

This guide will help you migrate your application to the new Supabase project.

## New Project Details

- **Project URL**: https://tmzljbqiigltcspwsehj.supabase.co
- **Project ID**: tmzljbqiigltcspwsehj
- **Anon Key**: (configured in .env file)

## Step 1: Create Environment Variables File

Create a `.env` file in the root directory with the following content:

```env
VITE_SUPABASE_URL=https://tmzljbqiigltcspwsehj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key-here
VITE_SUPABASE_PROJECT_ID=tmzljbqiigltcspwsehj
```

## Step 2: Run Database Migrations

You need to run the migration files on your new Supabase project. There are two ways to do this:

### Option A: Using Supabase CLI (Recommended)

1. **Link to your new project:**
   ```bash
   supabase link --project-ref tmzljbqiigltcspwsehj
   ```

2. **Run migrations:**
   ```bash
   supabase db push
   ```

### Option B: Using Supabase Dashboard (Recommended if CLI fails)

1. Go to your new Supabase project dashboard: https://supabase.com/dashboard/project/tmzljbqiigltcspwsehj
2. Navigate to **SQL Editor**
3. **If you get errors about existing objects**, use the safe migration script:
   - Copy and paste the contents of `safe-migration.sql` into the SQL Editor
   - This script will drop existing objects first, then recreate everything cleanly
4. **If starting fresh**, you can use `complete-migration.sql` instead

## Step 3: Configure Edge Functions Secrets

If you're using edge functions, you'll need to configure the secrets in your new Supabase project:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets (if needed):
   - `ANTHROPIC_API_KEY` - For generate-drafts function
   - `OUTLOOK_CLIENT_ID` - For send-email function
   - `OUTLOOK_CLIENT_SECRET` - For send-email function
   - `OUTLOOK_TENANT_ID` - For send-email function

## Step 4: Deploy Edge Functions (if applicable)

If you have edge functions, deploy them to the new project:

```bash
supabase functions deploy generate-drafts
supabase functions deploy send-email
```

## Step 5: Verify Configuration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Check that the application connects to the new Supabase project
3. Verify that tables are created correctly by checking the Supabase dashboard

## Step 6: Update Documentation

The following files have been updated:
- ✅ `supabase/config.toml` - Updated project ID
- ✅ `docs/SECRETS_AND_CONFIG.md` - Will be updated with new project details

## Troubleshooting

### Connection Issues
- Verify the `.env` file is in the root directory
- Check that environment variables are loaded (restart dev server)
- Verify the anon key is correct

### Migration Errors

**Error: "type already exists" or "relation already exists"**
- This means some objects were already created in your new project
- Solution: Use `safe-migration.sql` instead, which drops existing objects first
- Run the entire `safe-migration.sql` script in the Supabase SQL Editor

**Error: "Your account does not have the necessary privileges"**
- This happens when using `supabase link` without proper access
- Solution: Use the Supabase Dashboard SQL Editor instead (Option B)
- The SQL Editor doesn't require CLI linking

### Edge Function Issues
- Verify secrets are configured correctly
- Check function logs in Supabase dashboard
- Ensure `verify_jwt` settings match your requirements

## Next Steps

After migration:
1. Test all application features
2. Verify data integrity (if you migrated data)
3. Update any external integrations that reference the old project
4. Update team documentation with new project details

