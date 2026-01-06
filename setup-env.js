#!/usr/bin/env node

/**
 * Setup script to create .env file with all required secrets
 * Run: node setup-env.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = `# Frontend Environment Variables (Vite)
VITE_SUPABASE_URL=https://tmzljbqiigltcspwsehj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtemxqYnFpaWdsdGNzcHdzZWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzU3ODIsImV4cCI6MjA4MzI1MTc4Mn0.0q7ekS4MPKywJjRlK7ruMB5yUVG6za5QX4raQOzjtzE
VITE_SUPABASE_PROJECT_ID=tmzljbqiigltcspwsehj

# Edge Function Secrets (Note: These also need to be set in Supabase Dashboard → Edge Functions → Secrets)
# These are here for reference, but edge functions access them from Supabase Dashboard secrets
OUTLOOK_CLIENT_ID=[Your Azure AD Client ID]
OUTLOOK_CLIENT_SECRET=[Your Azure AD Client Secret]
OUTLOOK_TENANT_ID=[Your Azure AD Tenant ID]

# Anthropic API Key (Required for generate-drafts function)
# Get from: https://console.anthropic.com
# ANTHROPIC_API_KEY=your-anthropic-api-key-here
`;

const envPath = path.join(__dirname, '.env');

try {
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists!');
    console.log('📝 Please manually add the following secrets to your .env file:');
    console.log('\n---');
    console.log(envContent);
    console.log('---\n');
  } else {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('\n⚠️  IMPORTANT:');
    console.log('1. Edge function secrets (OUTLOOK_*) must ALSO be set in:');
    console.log('   Supabase Dashboard → Settings → Edge Functions → Secrets');
    console.log('2. Restart your dev server after creating .env file');
    console.log('3. .env file is gitignored and will not be committed\n');
  }
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  console.log('\n📝 Please manually create .env file with this content:\n');
  console.log(envContent);
}

