"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@example.com';
        this.transporter = this.createTransporter();
    }
    createTransporter() {
        const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';
        switch (emailProvider.toLowerCase()) {
            case 'gmail':
                return nodemailer_1.default.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD,
                    },
                });
            case 'outlook':
                return nodemailer_1.default.createTransport({
                    service: 'hotmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD,
                    },
                });
            case 'yahoo':
                return nodemailer_1.default.createTransport({
                    service: 'yahoo',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD,
                    },
                });
            case 'sendgrid':
                return nodemailer_1.default.createTransport({
                    host: 'smtp.sendgrid.net',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'apikey',
                        pass: process.env.SENDGRID_API_KEY,
                    },
                });
            case 'mailgun':
                return nodemailer_1.default.createTransport({
                    host: 'smtp.mailgun.org',
                    port: 587,
                    secure: false,
                    auth: {
                        user: process.env.MAILGUN_SMTP_USER,
                        pass: process.env.MAILGUN_SMTP_PASSWORD,
                    },
                });
            case 'smtp':
            default:
                return nodemailer_1.default.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASSWORD,
                    },
                });
        }
    }
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: this.fromEmail,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || this.stripHtml(options.html),
            };
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to ${options.to}. Message ID: ${result.messageId}`);
        }
        catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send email');
        }
    }
    async sendVerificationEmail(email, username, token) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
        const subject = 'Verify Your Email Address';
        const html = this.getVerificationEmailTemplate(username, verificationUrl);
        await this.sendEmail({
            to: email,
            subject,
            html,
        });
    }
    async sendPasswordResetEmail(email, username, token) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        const subject = 'Reset Your Password';
        const html = this.getPasswordResetEmailTemplate(username, resetUrl);
        await this.sendEmail({
            to: email,
            subject,
            html,
        });
    }
    async sendAccountCreatedEmail(options) {
        const subject = options.needsApproval
            ? 'Account Created - Approval Required'
            : 'Account Created - Welcome!';
        const html = this.getAccountCreatedEmailTemplate(options);
        await this.sendEmail({
            to: options.to,
            subject,
            html,
        });
    }
    async sendApprovalNotificationEmail(options) {
        const subject = options.selfApproval
            ? `New ${options.newUserRole} Account Created`
            : `New ${options.newUserRole} Account Requires Your Approval`;
        const html = this.getApprovalNotificationEmailTemplate(options);
        await this.sendEmail({
            to: options.to,
            subject,
            html,
        });
    }
    async sendWelcomeEmail(options) {
        const subject = 'Welcome to Our Platform!';
        const html = this.getWelcomeEmailTemplate(options);
        await this.sendEmail({
            to: options.to,
            subject,
            html,
        });
    }
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('Email service connection verified successfully');
            return true;
        }
        catch (error) {
            console.error('Email service connection failed:', error);
            return false;
        }
    }
    getVerificationEmailTemplate(username, verificationUrl) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #007bff, #0056b3); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .content h2 { 
            color: #333; 
            margin-bottom: 20px; 
            font-size: 24px; 
          }
          .content p { 
            margin-bottom: 20px; 
            color: #666; 
            font-size: 16px; 
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #007bff, #0056b3); 
            color: white; 
            padding: 16px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: 600; 
            font-size: 16px; 
            transition: transform 0.2s; 
          }
          .button:hover { 
            transform: translateY(-2px); 
          }
          .link-fallback { 
            word-break: break-all; 
            color: #007bff; 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 20px 0; 
            font-family: monospace; 
            font-size: 14px; 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #e9ecef; 
          }
          .warning { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            color: #856404; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 20px 0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${username}!</h2>
            <p>Thank you for registering with us. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <div class="link-fallback">${verificationUrl}</div>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This link will expire in 24 hours for security reasons.
            </div>
            
            <p>If you didn't create an account with us, please ignore this email and no account will be created.</p>
            
            <p>Need help? Contact our support team - we're here to help!</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    getPasswordResetEmailTemplate(username, resetUrl) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #dc3545, #c82333); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .content h2 { 
            color: #333; 
            margin-bottom: 20px; 
            font-size: 24px; 
          }
          .content p { 
            margin-bottom: 20px; 
            color: #666; 
            font-size: 16px; 
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #dc3545, #c82333); 
            color: white; 
            padding: 16px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: 600; 
            font-size: 16px; 
            transition: transform 0.2s; 
          }
          .button:hover { 
            transform: translateY(-2px); 
          }
          .link-fallback { 
            word-break: break-all; 
            color: #dc3545; 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 20px 0; 
            font-family: monospace; 
            font-size: 14px; 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #e9ecef; 
          }
          .warning { 
            background: #f8d7da; 
            border: 1px solid #f5c6cb; 
            color: #721c24; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 20px 0; 
          }
          .security-note { 
            background: #d1ecf1; 
            border: 1px solid #bee5eb; 
            color: #0c5460; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 20px 0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${username}!</h2>
            <p>We received a request to reset your password. If you made this request, click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <div class="link-fallback">${resetUrl}</div>
            
            <div class="warning">
              <strong>⚠️ Security Alert:</strong> This link will expire in 1 hour for your security.
            </div>
            
            <div class="security-note">
              <strong>🛡️ Security Tips:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Never share your password with anyone</li>
                <li>Use a strong, unique password</li>
                <li>Consider using a password manager</li>
              </ul>
            </div>
            
            <p><strong>Didn't request this?</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    getAccountCreatedEmailTemplate(options) {
        const verificationUrl = options.verificationToken
            ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${options.verificationToken}`
            : null;
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Created</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #6f42c1, #e83e8c); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .content h2 { 
            color: #333; 
            margin-bottom: 20px; 
            font-size: 24px; 
          }
          .content p { 
            margin-bottom: 20px; 
            color: #666; 
            font-size: 16px; 
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #6f42c1, #e83e8c); 
            color: white; 
            padding: 16px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: 600; 
            font-size: 16px; 
            transition: transform 0.2s; 
          }
          .button:hover { 
            transform: translateY(-2px); 
          }
          .info-box { 
            background: #e3f2fd; 
            border: 1px solid #bbdefb; 
            color: #1565c0; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .warning-box { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            color: #856404; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .role-badge {
            display: inline-block;
            background: #6f42c1;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #e9ecef; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👤 Account Created</h1>
          </div>
          <div class="content">
            <h2>Hello ${options.firstName}!</h2>
            <p>Great news! Your account has been created by <strong>${options.createdBy}</strong> with the role of <span class="role-badge">${options.role}</span>.</p>
            
            ${options.needsApproval ? `
              <div class="warning-box">
                <h3>⏳ Approval Required</h3>
                <p>Your account is currently pending approval from a <strong>${options.approvalRequired}</strong>. You will receive another email once your account has been approved and activated.</p>
              </div>
              
              ${verificationUrl ? `
                <p>In the meantime, you can verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
              ` : ''}
            ` : `
              <div class="info-box">
                <h3>🎉 Account Active</h3>
                <p>Your account is now active and ready to use! You can log in with your provided credentials.</p>
              </div>
              
              <p>Ready to get started? Click the button below to access your dashboard:</p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Go to Login</a>
              </div>
            `}
            
            <div class="info-box">
              <h3>📋 Account Details</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Username:</strong> ${options.username}</li>
                <li><strong>Role:</strong> ${options.role}</li>
                <li><strong>Created by:</strong> ${options.createdBy}</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    getApprovalNotificationEmailTemplate(options) {
        const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/users?tab=pending`;
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>User Approval Required</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #fd7e14, #ffc107); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .content h2 { 
            color: #333; 
            margin-bottom: 20px; 
            font-size: 24px; 
          }
          .content p { 
            margin-bottom: 20px; 
            color: #666; 
            font-size: 16px; 
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #fd7e14, #ffc107); 
            color: white; 
            padding: 16px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: 600; 
            font-size: 16px; 
            transition: transform 0.2s; 
          }
          .button:hover { 
            transform: translateY(-2px); 
          }
          .user-details { 
            background: #f8f9fa; 
            border: 1px solid #dee2e6; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .role-badge {
            display: inline-block;
            background: #6f42c1;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #e9ecef; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${options.selfApproval ? '✅' : '⚡'} ${options.selfApproval ? 'User Created' : 'Approval Required'}</h1>
          </div>
          <div class="content">
            <h2>Hello ${options.approverName}!</h2>
            
            ${options.selfApproval ? `
              <p>This is a confirmation that you have successfully created a new <span class="role-badge">${options.newUserRole}</span> account.</p>
            ` : `
              <p>A new <span class="role-badge">${options.newUserRole}</span> account has been created and requires your approval before the user can access the system.</p>
            `}
            
            <div class="user-details">
              <h3>👤 User Details</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Name:</strong> ${options.newUserName}</li>
                <li><strong>Email:</strong> ${options.newUserEmail}</li>
                <li><strong>Role:</strong> ${options.newUserRole}</li>
                <li><strong>Created by:</strong> ${options.createdByName} (${options.createdByRole})</li>
              </ul>
            </div>
            
            ${!options.selfApproval ? `
              <p>Please review this request and take appropriate action. You can approve or reject this user from your admin dashboard.</p>
              
              <div style="text-align: center;">
                <a href="${approvalUrl}" class="button">Review Pending Users</a>
              </div>
              
              <p><strong>Note:</strong> The user will not be able to access the system until approved.</p>
            ` : `
              <p>The account has been activated and the user has been notified via email.</p>
            `}
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    getWelcomeEmailTemplate(options) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome!</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #28a745, #20c997); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .content h2 { 
            color: #333; 
            margin-bottom: 20px; 
            font-size: 24px; 
          }
          .content p { 
            margin-bottom: 20px; 
            color: #666; 
            font-size: 16px; 
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #28a745, #20c997); 
            color: white; 
            padding: 16px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: 600; 
            font-size: 16px; 
            transition: transform 0.2s; 
          }
          .button:hover { 
            transform: translateY(-2px); 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #e9ecef; 
          }
          .features { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
          .features h3 { 
            color: #28a745; 
            margin-bottom: 15px; 
          }
          .features ul { 
            margin: 0; 
            padding-left: 20px; 
          }
          .features li { 
            margin-bottom: 8px; 
          }
          .role-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .credentials-box {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
            color: #1565c0;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Our Platform!</h1>
          </div>
          <div class="content">
            <h2>Hello ${options.firstName}!</h2>
            <p><strong>Congratulations!</strong> Your account has been created by <strong>${options.createdBy}</strong> and is now active. Welcome to our platform!</p>
            
            <p>You have been assigned the role of <span class="role-badge">${options.role}</span>.</p>
            
            ${options.temporaryPassword ? `
              <div class="credentials-box">
                <h3>🔐 Your Login Credentials</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Username:</strong> ${options.username}</li>
                  <li><strong>Temporary Password:</strong> ${options.temporaryPassword}</li>
                </ul>
                <p><strong>Important:</strong> Please change your password after your first login for security.</p>
              </div>
            ` : ''}
            
            <div class="features">
              <h3>🚀 What's Next?</h3>
              <ul>
                <li>Log in to your account</li>
                <li>Complete your profile setup</li>
                <li>Explore your dashboard</li>
                <li>Discover available features for your role</li>
              </ul>
            </div>
            
            <p>Ready to get started? Click the button below to access your dashboard:</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Go to Login</a>
            </div>
            
            <p>If you have any questions or need help getting started, don't hesitate to contact our support team. We're here to help you make the most of your experience!</p>
            
            <p>Thank you for joining us, and welcome aboard!</p>
            
            <p>Best regards,<br>The Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>Need help? Contact us at support@yourcompany.com</p>
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    }
}
exports.default = new EmailService();
//# sourceMappingURL=emailService.js.map