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

    // Generate password reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // In production, store this in database with expiry
    // For now, we'll send it directly
    const resetUrl = `your-app://password-reset?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // ✓ Sends to USER'S email, not admin email
      subject: 'Restaurant Reservation App - Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="color: #D4A574;">Reset Your Password</h2>
          <p style="font-size: 16px;">We received a request to reset your password. Click the button below to proceed:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="
              background-color: #D4A574;
              color: white;
              padding: 14px 35px;
              text-decoration: none;
              border-radius: 5px;
              display: inline-block;
              font-size: 16px;
              font-weight: bold;
            ">Reset Password</a>
          </p>
          <p style="font-size: 12px; color: #666;">Or copy this link: <code style="background-color: #f0f0f0; padding: 5px;">${resetUrl}</code></p>
          <p style="font-size: 12px; color: #999;">⏱️ This link will expire in 1 hour.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">If you didn't request a password reset, please ignore this email and your account will remain secure.</p>
          <p style="color: #999; font-size: 11px; text-align: center;">Restaurant Reservation App</p>
        </div>
      `,
    };

    console.log('📧 Sending password reset email to:', email);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully! Message ID:', info.messageId);
      
      res.status(200).json({ 
        message: "Password reset email sent successfully",
        success: true,
        email: email // Confirm which email it was sent to
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      res.status(500).json({ error: "Failed to send password reset email. Please check your email address and try again." });
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
