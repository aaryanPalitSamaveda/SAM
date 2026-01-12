# Email Signature Guide

## How Email Signatures Work

### Important: This is NOT Outlook Signatures

The email signature feature in this app creates **NEW signatures** stored in the app's database. These are **separate** from any signatures you may have configured in Outlook.

### How It Works:

1. **Create Signatures** → Go to `/signatures` page (or Settings → Manage Signatures)
   - Upload your logo/image
   - Write your signature content in HTML
   - Set one as default (optional)

2. **Use in Emails** → When editing a draft in the Drafts page:
   - Toggle "Include Email Signature" ON/OFF
   - Select which signature to use
   - Preview how it will look

3. **When Sending** → The signature is automatically appended to the email body when sent

## Step-by-Step Instructions

### Step 1: Create a Signature

1. Go to **Settings** page
2. Click **"Manage"** button in the Email Signatures section
   - OR navigate directly to `/signatures` in the URL
3. Click **"New Signature"** button
4. Fill in:
   - **Signature Name**: e.g., "Samaveda Capital Signature"
   - **Logo/Image** (Optional): Upload your company logo
   - **Signature Content**: Write your signature in HTML format
     - Example:
       ```html
       Best regards,<br>
       John Doe<br>
       Samaveda Capital<br>
       <img src="{image_url}" alt="Logo" style="max-height: 50px;" />
       ```
   - **Set as default**: Check this if you want it used automatically
5. Click **"Create Signature"**

### Step 2: Use Signature in Emails

1. Go to **Drafts** page
2. Click **"Edit"** on any draft
3. Scroll down to the **"Include Email Signature"** section
4. Toggle the switch **ON**
5. Select your signature from the dropdown
6. Preview will show how it looks
7. Click **"Save Changes"**

### Step 3: Send Email

When you send the email, the signature will be automatically appended at the bottom of the email body.

## HTML Signature Examples

### Simple Text Signature:
```html
Best regards,<br>
John Doe<br>
Samaveda Capital<br>
Email: john@samavedacapital.com
```

### Signature with Logo:
```html
<img src="{image_url}" alt="Samaveda Capital" style="max-height: 60px; margin-bottom: 10px;" /><br>
Best regards,<br>
<strong>John Doe</strong><br>
Samaveda Capital<br>
Email: john@samavedacapital.com
```

### Styled Signature:
```html
<div style="border-top: 2px solid #d4af37; padding-top: 10px; margin-top: 20px;">
  <img src="{image_url}" alt="Logo" style="max-height: 50px;" /><br>
  <strong>John Doe</strong><br>
  <em>Investment Manager</em><br>
  Samaveda Capital<br>
  📧 john@samavedacapital.com | 🌐 www.samavedacapital.com
</div>
```

## Tips

- Use `{image_url}` placeholder to insert your uploaded logo
- HTML formatting is supported (bold, italic, links, etc.)
- Keep signatures concise and professional
- Test the preview before saving
- Set a default signature to use it automatically

## Troubleshooting

**Q: I don't see where to upload/create signatures?**
A: Go to Settings page → Click "Manage" button in Email Signatures section, or navigate to `/signatures`

**Q: Does this use my Outlook signature?**
A: No, this creates separate signatures in the app. Outlook signatures are not used.

**Q: Can I use multiple signatures?**
A: Yes! Create multiple signatures and select which one to use for each email draft.

**Q: Will the signature appear in Outlook?**
A: The signature is added to the email body when sent, so it will appear in the sent email, but it won't modify your Outlook signature settings.
