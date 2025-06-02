# Kpege Email Templates for Postmark

This directory contains professionally designed, responsive email templates for Kpege's transactional emails using Postmark as the email service provider.

## 📧 Available Templates

### 1. **Signup Confirmation** (`confirm-signup.html`)
- **Purpose**: Welcome new users and confirm their email address
- **Features**: 
  - Welcome message with Kpege branding
  - Feature highlights to engage new users
  - Security notes and expiration information
  - Mobile-responsive design

### 2. **Password Reset** (`reset-password.html`)
- **Purpose**: Secure password reset functionality
- **Features**: 
  - Clear security information and warnings
  - Troubleshooting tips for users
  - Account security recommendations
  - Fallback link for button issues

### 3. **Magic Link Login** (`magic-link.html`)
- **Purpose**: Passwordless authentication
- **Features**: 
  - Streamlined one-click access
  - Feature preview to re-engage users
  - Security expiration notices
  - Alternative login options

### 4. **User Invitation** (`invite-user.html`)
- **Purpose**: Invite new users to join Kpege
- **Features**: 
  - Compelling benefits overview
  - Social proof with testimonials
  - Clear value proposition
  - Privacy and security assurances

### 5. **Email Change Confirmation** (`change-email.html`)
- **Purpose**: Confirm email address updates
- **Features**: 
  - Clear before/after email display
  - Impact explanation
  - Security warnings
  - Emergency contact information

### 6. **Reauthentication** (`reauthentication.html`)
- **Purpose**: Verify identity for sensitive actions
- **Features**: 
  - Verification code display
  - Security alerts and tips
  - Action context information
  - Emergency security contacts

## 🎨 Design Features

### Branding
- **Colors**: Kpege green theme (#15803d, #166534)
- **Typography**: System fonts for optimal rendering
- **Logo**: Text-based "Kpege" with tagline
- **Style**: Clean, modern, financial-focused

### Responsive Design
- Mobile-first approach
- Optimized for all email clients
- Flexible layouts that scale
- Touch-friendly buttons

### Security Focus
- Clear security messaging
- Expiration times prominently displayed
- Emergency contact information
- Best practice security tips

## 🔧 Setting Up with Postmark

### 1. Upload Templates to Postmark

1. Log into your Postmark account
2. Go to **Templates** → **Create Template**
3. Choose **HTML** template type
4. Copy and paste the HTML from each template file
5. Configure the template settings:
   - **Name**: Use descriptive names (e.g., "Kpege - Signup Confirmation")
   - **Subject**: Set appropriate subjects for each template
   - **From Email**: Use your verified sender address (e.g., noreply@kpege.com)

### 2. Template Variables

Each template uses these Postmark variables:

| Variable | Description | Used In |
|----------|-------------|---------|
| `{{ConfirmationURL}}` | The action link for user to click | All templates |
| `{{.SiteURL}}` | Your site URL for branding | Invite template |
| `{{.Email}}` | Current email address | Email change template |
| `{{.NewEmail}}` | New email address | Email change template |
| `{{.Token}}` | Verification code | Reauthentication template |

### 3. Suggested Email Subjects

```
Confirm Signup: "Welcome to Kpege! Confirm your account"
Password Reset: "Reset your Kpege password"
Magic Link: "Your secure login link for Kpege"
User Invitation: "You've been invited to join Kpege"
Email Change: "Confirm your new email address"
Reauthentication: "Security verification required"
```

### 4. Integration Example

```javascript
// Example: Sending signup confirmation with Postmark
const postmark = require('postmark');
const client = new postmark.ServerClient('your-server-token');

await client.sendEmailWithTemplate({
  TemplateAlias: 'kpege-signup-confirmation',
  To: user.email,
  TemplateModel: {
    ConfirmationURL: `https://kpege.com/confirm?token=${confirmationToken}`
  }
});
```

## 🔐 Security Considerations

### Email Security
- All templates include security warnings
- Expiration times are clearly stated
- Links use HTTPS only
- Emergency contact information provided

### Template Security
- No sensitive data in templates
- Secure token handling
- Clear action descriptions
- User education on email security

## 📱 Email Client Compatibility

These templates are tested and optimized for:

- **Webmail**: Gmail, Outlook.com, Yahoo Mail
- **Desktop**: Outlook 2016+, Apple Mail, Thunderbird
- **Mobile**: iPhone Mail, Gmail Mobile, Outlook Mobile
- **Features**: Dark mode support, high DPI displays

## 🎯 Best Practices

### Content
- Keep subject lines under 50 characters
- Use clear, action-oriented CTAs
- Include fallback text for images
- Provide alternative contact methods

### Technical
- Inline CSS for maximum compatibility
- Table-based layouts for email clients
- Alt text for all images
- Preheader text optimization

### Security
- Always use HTTPS for links
- Include expiration times
- Provide clear security warnings
- Offer alternative verification methods

## 🔄 Customization

To customize these templates for your needs:

1. **Colors**: Update the CSS color variables
2. **Branding**: Replace "Kpege" with your brand name
3. **Links**: Update all kpege.com links to your domain
4. **Content**: Modify text to match your brand voice
5. **Features**: Update feature lists to match your product

## 📞 Support

For questions about these templates:
- Email: support@kpege.com
- Documentation: https://kpege.com/docs/email-templates
- Postmark Support: https://postmarkapp.com/support

---

*These templates are optimized for Postmark's email delivery service and follow email marketing best practices for transactional emails.* 