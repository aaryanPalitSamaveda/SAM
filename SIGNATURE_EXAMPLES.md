# Email Signature HTML Examples

## Basic Signature with Website Link

```html
Best Regards,<br>
Samaveda Capital,<br>
<a href="https://samavedacapital.com/">🌐 samavedacapital.com</a>
```

This will display as:
- Best Regards,
- Samaveda Capital,
- 🌐 samavedacapital.com (clickable link that goes to https://samavedacapital.com/)

## Signature with Logo and Website

```html
<img src="{image_url}" alt="Samaveda Capital Logo" style="max-height: 60px; margin-bottom: 10px;" /><br>
Best Regards,<br>
Samaveda Capital,<br>
<a href="https://samavedacapital.com/">https://samavedacapital.com/</a>
```

## Signature with Multiple Links

```html
Best Regards,<br>
<strong>Samaveda Capital</strong><br>
🌐 <a href="https://samavedacapital.com/">Website</a> | 
📧 <a href="mailto:info@samavedacapital.com">Email Us</a> | 
📱 <a href="tel:+1234567890">Call Us</a>
```

## Styled Signature with Link

```html
<div style="border-top: 2px solid #d4af37; padding-top: 10px; margin-top: 20px;">
  <img src="{image_url}" alt="Logo" style="max-height: 50px; margin-bottom: 10px;" /><br>
  <strong>Samaveda Capital</strong><br>
  Best Regards,<br>
  <a href="https://samavedacapital.com/" style="color: #d4af37; text-decoration: none;">Visit our website</a>
</div>
```

## Complete Professional Signature

```html
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <img src="{image_url}" alt="Samaveda Capital" style="max-height: 60px; margin-bottom: 15px;" /><br>
  <strong>Samaveda Capital</strong><br>
  Investment Management<br><br>
  Best Regards,<br>
  <a href="https://samavedacapital.com/" style="color: #d4af37; text-decoration: none;">https://samavedacapital.com/</a><br>
  📧 info@samavedacapital.com
</div>
```

## HTML Link Syntax

### Basic Link:
```html
<a href="https://samavedacapital.com/">Click here</a>
```

### Link with Custom Text:
```html
<a href="https://samavedacapital.com/">Visit Samaveda Capital</a>
```

### Link with Styling:
```html
<a href="https://samavedacapital.com/" style="color: #d4af37; text-decoration: underline;">Our Website</a>
```

### Email Link:
```html
<a href="mailto:info@samavedacapital.com">info@samavedacapital.com</a>
```

### Phone Link:
```html
<a href="tel:+1234567890">+1 (234) 567-890</a>
```

## Tips

1. **Always use `<br>` for line breaks** - Don't use Enter/Return, use `<br>` tag
2. **Links must include `http://` or `https://`** - Otherwise they won't be clickable
3. **Use `{image_url}` placeholder** - This will be replaced with your uploaded logo
4. **Test in preview** - Always check the preview before saving
5. **Keep it simple** - Too much styling might not render well in all email clients

## Common HTML Tags for Signatures

- `<br>` - Line break
- `<strong>` - Bold text
- `<em>` - Italic text
- `<a href="URL">Text</a>` - Clickable link
- `<img src="{image_url}" />` - Image (use {image_url} placeholder)
- `<div style="...">` - Container with styling
- `<p>` - Paragraph
