# Email Authentication Setup Guide

This guide covers the allauth-like email authentication system implementation with Nodemailer integration.

## Environment Variables Required

Add these environment variables to your `.env` file based on your email provider:

### Common Variables
```env
# Email Configuration
EMAIL_PROVIDER=gmail  # Options: gmail, outlook, yahoo, smtp, sendgrid, mailgun
FROM_EMAIL=noreply@yourdomain.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Existing variables you should already have
JWT_SECRET=your_jwt_secret_here
MONGODB_URI=your_mongodb_connection_string
```

### Provider-Specific Configuration

#### Gmail (Recommended for Development)
```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password  # Generate App Password in Google Account settings
FROM_EMAIL=your-gmail@gmail.com
```

**Setup Steps for Gmail:**
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account Settings > Security > App Passwords
3. Generate an App Password for "Mail"
4. Use this App Password (not your regular password) in `EMAIL_PASSWORD`

#### Outlook/Hotmail
```env
EMAIL_PROVIDER=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
FROM_EMAIL=your-email@outlook.com
```

#### Yahoo
```env
EMAIL_PROVIDER=yahoo
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password  # Generate App Password in Yahoo settings
FROM_EMAIL=your-email@yahoo.com
```

#### SendGrid (Recommended for Production)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

#### Mailgun SMTP
```env
EMAIL_PROVIDER=mailgun
MAILGUN_SMTP_USER=postmaster@your-domain.mailgun.org
MAILGUN_SMTP_PASSWORD=your-mailgun-smtp-password
FROM_EMAIL=noreply@yourdomain.com
```

#### Custom SMTP Server
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false  # true for port 465, false for other ports
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
FROM_EMAIL=noreply@yourdomain.com
```

## Email Provider Setup Instructions

### Gmail Setup (Development)
1. **Enable 2FA**: Go to [Google Account Security](https://myaccount.google.com/security)
2. **Generate App Password**: 
   - Click "App passwords"
   - Select "Mail" and generate password
   - Use this 16-character code as `EMAIL_PASSWORD`
3. **Less secure app access**: Not needed with App Passwords

### SendGrid Setup (Production)
1. **Create Account**: Sign up at [sendgrid.com](https://sendgrid.com)
2. **Verify Domain**: Add and verify your sending domain
3. **Create API Key**: Go to Settings > API Keys > Create API Key
4. **Set Permissions**: Choose "Restricted Access" and enable Mail Send
5. **Configure DNS**: Add SPF, DKIM records for better deliverability

### Outlook Setup
1. **Enable 2FA**: Go to Microsoft Account Security settings
2. **Generate App Password**: Create app-specific password
3. **Use App Password**: Use this instead of your regular password

### Custom SMTP Setup
1. **Get SMTP Details**: Contact your hosting provider or email service
2. **Common Ports**: 
   - 587 (TLS/STARTTLS) - Most common
   - 465 (SSL) - Legacy
   - 25 (Plain) - Often blocked
3. **Security**: Always use TLS/SSL in production

## New API Endpoints

### Public Endpoints

#### POST `/api/auth/register`
- **Description**: Register a new user and send verification email
- **Body**: 
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "Password123",
    "role": "viewer" // optional
  }
  ```
- **Response**: User object without token (email verification required)

#### POST `/api/auth/login`
- **Description**: Login user (requires verified email)
- **Body**: 
  ```json
  {
    "login": "john@example.com", // email or username
    "password": "Password123"
  }
  ```
- **Response**: JWT token and user object

#### GET `/api/auth/verify-email?token=verification_token`
- **Description**: Verify user's email address
- **Query**: `token` - Email verification token from email
- **Response**: Success message

#### POST `/api/auth/resend-verification`
- **Description**: Resend verification email
- **Body**: 
  ```json
  {
    "email": "john@example.com"
  }
  ```
- **Response**: Success message

#### POST `/api/auth/forgot-password`
- **Description**: Send password reset email
- **Body**: 
  ```json
  {
    "email": "john@example.com"
  }
  ```
- **Response**: Success message (always, for security)

#### POST `/api/auth/reset-password`
- **Description**: Reset password with token from email
- **Body**: 
  ```json
  {
    "token": "reset_token_from_email",
    "newPassword": "NewPassword123"
  }
  ```
- **Response**: Success message

### Protected Endpoints (No Changes)

- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

## User Model Updates

New fields added to User model:

```typescript
{
  emailVerified: boolean, // default: false
  emailVerificationToken?: string,
  emailVerificationExpires?: Date, // 24 hours
  passwordResetToken?: string,
  passwordResetExpires?: Date // 1 hour
}
```

## Authentication Flow

### Registration Flow
1. User submits registration form
2. User record created with `emailVerified: false`
3. Verification email sent with token
4. User clicks link in email
5. Email verified, welcome email sent
6. User can now login

### Login Flow
1. User submits login credentials
2. System checks email verification status
3. If not verified, login denied with message
4. If verified, JWT token issued

### Password Reset Flow
1. User requests password reset
2. Reset email sent with token (1-hour expiry)
3. User clicks link and submits new password
4. Password updated, tokens cleared

## Email Templates

Three responsive HTML email templates are included:

1. **Verification Email**: Modern design with clear call-to-action
2. **Password Reset Email**: Security-focused with expiration warnings
3. **Welcome Email**: Friendly onboarding with feature highlights

All templates include:
- Mobile-responsive design
- Fallback text content
- Modern styling with gradients
- Security warnings and tips
- Professional branding

## Security Features

- **Token Expiration**: 
  - Email verification: 24 hours
  - Password reset: 1 hour
- **Secure Token Generation**: Using crypto.randomBytes and SHA256 hashing
- **Rate Limiting**: Applied to all auth endpoints
- **Input Validation**: Comprehensive validation on all inputs
- **No Information Disclosure**: Password reset doesn't reveal if email exists
- **Email Security**: Proper HTML escaping and text fallbacks

## Middleware Updates

### Authentication Middleware Options

1. **`authenticate`**: Requires valid JWT + email verification
2. **`authenticateWithoutEmailVerification`**: Requires valid JWT only
3. **`requireEmailVerification`**: Check email verification after auth
4. **`optionalAuth`**: Optional authentication (for public endpoints)

### Usage Examples

```typescript
// Requires authenticated + verified user
router.get('/protected', authenticate, handler);

// Requires authenticated user (verification not required)
router.get('/resend-verification', authenticateWithoutEmailVerification, handler);

// Chain middlewares for specific requirements
router.get('/special', authenticateWithoutEmailVerification, requireEmailVerification, handler);
```

## Testing Email Service

You can test the email connection with:

```typescript
import emailService from './src/utils/emailService';

// Test connection
emailService.verifyConnection().then(success => {
  console.log('Email service working:', success);
});
```

## Database Indexes

New indexes added for performance:

```typescript
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });
```

## Error Handling

Common error responses:

- **401**: Authentication required or email not verified
- **400**: Invalid/expired tokens, validation errors
- **404**: User not found (for resend verification)
- **500**: Server errors (email sending failures, etc.)

## Production Considerations

### Email Deliverability
- **Use SendGrid or similar service** for production
- **Configure SPF records**: Add to your DNS
- **Set up DKIM**: Domain authentication
- **Monitor bounce rates** and spam complaints
- **Use verified sending domains**

### Security
- **Use HTTPS** for all email links
- **Set secure cookies** in production
- **Use environment-specific URLs**
- **Monitor failed login attempts**
- **Set up proper error logging**

### Performance
- **Queue email sending** for high-volume applications
- **Use Redis** for rate limiting
- **Monitor email sending quotas**
- **Set up email retry logic**

## Frontend Integration

Update your frontend to handle:

- Email verification status in login responses
- Redirect to verification page after registration
- Email verification confirmation page
- Password reset form with token from URL
- Resend verification functionality
- Loading states for email operations

## Troubleshooting

### Common Issues

1. **Gmail "Less secure app" error**:
   - Solution: Use App Passwords instead of regular password

2. **SMTP connection timeout**:
   - Check firewall settings
   - Verify SMTP port (587 vs 465)
   - Ensure SMTP_SECURE setting matches port

3. **Emails going to spam**:
   - Set up SPF, DKIM records
   - Use verified sending domain
   - Avoid spam trigger words

4. **SendGrid API errors**:
   - Check API key permissions
   - Verify sender identity
   - Monitor SendGrid dashboard

### Testing Checklist

- [ ] Register new user
- [ ] Check email for verification link
- [ ] Verify email successfully
- [ ] Login with verified account
- [ ] Test password reset flow
- [ ] Test resend verification
- [ ] Check email templates rendering
- [ ] Test rate limiting
- [ ] Verify error handling

## Development vs Production

### Development (Gmail)
```env
EMAIL_PROVIDER=gmail
EMAIL_USER=yourdev@gmail.com
EMAIL_PASSWORD=your-app-password
FROM_EMAIL=yourdev@gmail.com
FRONTEND_URL=http://localhost:3000
```

### Production (SendGrid)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-production-api-key
FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

This setup provides a robust, scalable email authentication system that works across different email providers and environments.