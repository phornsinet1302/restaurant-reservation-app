const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// In-memory storage for verification codes (in production, use Redis or database)
const verificationCodes = new Map();

// Send email verification code
exports.sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code in memory with 10-minute expiry
    const expiryTime = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(email, {
      code: verificationCode.trim(), // Ensure stored as trimmed string
      expiry: expiryTime
    });
    
    console.log('✓ Verification code generated and stored for', email, '- Code:', verificationCode);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // ✓ Sends to USER'S email, not admin email
      subject: 'Restaurant Reservation App - Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="color: #D4A574;">Verify Your Email</h2>
          <p style="font-size: 16px;">Thank you for signing up! Your verification code is:</p>
          <h3 style="font-size: 40px; color: #D4A574; letter-spacing: 8px; text-align: center; margin: 30px 0; font-weight: bold;">
            ${verificationCode}
          </h3>
          <p style="font-size: 14px; color: #666;">Enter this code in the verification screen.</p>
          <p style="font-size: 12px; color: #999;">⏱️ This code will expire in 10 minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">If you didn't sign up for this account, please ignore this email.</p>
          <p style="color: #999; font-size: 11px; text-align: center;">Restaurant Reservation App</p>
        </div>
      `,
    };

    console.log('📧 Sending verification email to:', email);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully! Message ID:', info.messageId);
      
      res.status(200).json({ 
        message: "Verification code sent to your email",
        success: true,
        email: email // Confirm which email it was sent to
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      res.status(500).json({ error: "Failed to send verification email. Please check your email address and try again." });
    }
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: "Failed to send verification email." });
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user exists
    const supabase = require('../config/supabase');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Don't reveal if email exists or not (security best practice)
      return res.status(200).json({ 
        message: "If an account exists with this email, a password reset link has been sent.",
        success: true,
        email: email
      });
    }

    // Generate a simple reset code (6 digits like verification)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeData = {
      code: resetCode.trim(),
      expiry: Date.now() + 60 * 60 * 1000  // 1 hour
    };

    // Store reset code in memory (in production, use Redis or database)
    const emailController = require('./emailController');
    if (!emailController.resetCodes) {
      emailController.resetCodes = new Map();
    }
    emailController.resetCodes.set(email, resetCodeData);

    console.log('✅ Password reset code generated for', email, '- Code:', resetCode);

    // Send email with the reset code
    const transporter = require('nodemailer').createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Restaurant Reservation App - Password Reset Code',
      text: `
RESTAURANT RESERVATION APP - PASSWORD RESET CODE
===================================================

Your 6-Digit Reset Code:

    ${resetCode}

How to Use:
1. Open the Restaurant Reservation App
2. Click "Forgot Password"
3. Enter your email
4. You'll see the verify code screen
5. Enter the code above: ${resetCode}
6. Create your new password
7. Confirm the password
8. Click "Save New Password"

This code expires in 1 hour.

If you didn't request this, ignore this email.

---
Restaurant Reservation App
      `,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { text-align: center; margin-bottom: 30px; }
            .code-box { 
              background-color: #fff;
              border: 3px solid #D4A574;
              border-radius: 8px;
              padding: 30px;
              text-align: center;
              margin: 30px 0;
            }
            .code { 
              font-size: 48px;
              font-weight: bold;
              color: #D4A574;
              font-family: 'Courier New', monospace;
              letter-spacing: 8px;
              margin: 0;
              padding: 20px;
              background-color: #f0f0f0;
              border-radius: 4px;
            }
            .instructions { 
              background-color: #fff;
              padding: 20px;
              border-radius: 4px;
              margin: 20px 0;
            }
            .warning { 
              background-color: #fffbea;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer { 
              text-align: center;
              font-size: 12px;
              color: #999;
              margin-top: 30px;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="color: #D4A574; margin: 0;">Password Reset Code</h2>
              <p style="color: #666; margin: 10px 0;">Restaurant Reservation App</p>
            </div>
            
            <p style="font-size: 16px; color: #333;">Your password reset code is:</p>
            
            <div class="code-box">
              <p class="code">${resetCode}</p>
            </div>
            
            <div class="warning">
              <strong>📌 Important:</strong> This code expires in 1 hour. Use it immediately if possible.
            </div>
            
            <div class="instructions">
              <h3 style="color: #D4A574; margin-top: 0;">How to reset your password:</h3>
              <ol style="margin: 10px 0;">
                <li>Open the Restaurant Reservation App</li>
                <li>Click on "Forgot Password"</li>
                <li>Enter your email address (${email})</li>
                <li>You'll see a "Verify Code" screen</li>
                <li><strong>Enter this code: ${resetCode}</strong></li>
                <li>Create your new password</li>
                <li>Confirm your new password</li>
                <li>Click "Save New Password"</li>
              </ol>
            </div>
            
            <p style="color: #999; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your account will remain secure.</p>
            
            <div class="footer">
              <p style="margin: 0;">© 2026 Restaurant Reservation App. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    console.log('📧 Sending password reset code to:', email);
    console.log('📊 Reset Code Details:');
    console.log('   Code:', resetCode);
    console.log('   Length:', resetCode.length);
    console.log('   Type:', typeof resetCode);
    console.log('   Email To:', email);
    
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent! Message ID:', info.messageId);
      console.log('📌 Code sent in email:', resetCode);
      
      res.status(200).json({ 
        message: "Password reset code sent to your email",
        success: true,
        email: email,
        // Always show code in development (local environment)
        devCode: resetCode,
        devMessage: "📌 Development Mode: Use this code to test password reset."
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      
      // In development, still send code even if email fails
      console.log('📌 Development mode: Email failed but code stored. Use code:', resetCode);
      res.status(200).json({ 
        message: "Password reset code generated (email service unavailable in dev)",
        success: true,
        email: email,
        devCode: resetCode,
        devMessage: "⚠️ Email service failed. Use this code for testing."
      });
    }
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: "Failed to send password reset email." });
  }
};

// Resend verification code
exports.resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in memory with 10-minute expiry
    const expiryTime = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(email, {
      code: verificationCode.trim(), // Ensure stored as trimmed string
      expiry: expiryTime
    });
    
    console.log('✓ New verification code generated for', email, '- Code:', verificationCode);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // ✓ Sends to USER'S email, not admin email
      subject: 'Restaurant Reservation App - Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="color: #D4A574;">Your New Verification Code</h2>
          <p style="font-size: 16px;">Your new verification code is:</p>
          <h3 style="font-size: 40px; color: #D4A574; letter-spacing: 8px; text-align: center; margin: 30px 0; font-weight: bold;">
            ${verificationCode}
          </h3>
          <p style="font-size: 14px; color: #666;">Enter this code in the verification screen.</p>
          <p style="font-size: 12px; color: #999;">⏱️ This code will expire in 10 minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 11px; text-align: center;">Restaurant Reservation App</p>
        </div>
      `,
    };

    console.log('📧 Resending verification email to:', email);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email resent successfully! Message ID:', info.messageId);
      
      res.status(200).json({ 
        message: "Verification code resent to your email",
        success: true,
        email: email // Confirm which email it was sent to
      });
    } catch (emailError) {
      console.error('❌ Email resending failed:', emailError.message);
      res.status(500).json({ error: "Failed to resend verification code. Please try again." });
    }
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: "Failed to resend verification code." });
  }
};

// Export verificationCodes for use in other controllers
exports.verificationCodes = verificationCodes;
