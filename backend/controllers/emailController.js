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

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code in memory with 10-minute expiry
    const expiryTime = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(email, {
      code: verificationCode,
      expiry: expiryTime
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Restaurant Reservation App - Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email</h2>
          <p>Thank you for signing up! Your verification code is:</p>
          <h3 style="font-size: 32px; color: #D4A574; letter-spacing: 5px;">
            ${verificationCode}
          </h3>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't sign up for this account, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Restaurant Reservation App</p>
        </div>
      `,
    };

    console.log('Sending verification email to:', email);
    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "Verification code sent to email",
      verificationCode: verificationCode // In production, don't send this back
    });
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

    // Generate password reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // In production, store this in database with expiry
    // For now, we'll send it directly
    const resetUrl = `your-app://password-reset?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Restaurant Reservation App - Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="
              background-color: #D4A574;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              display: inline-block;
            ">Reset Password</a>
          </p>
          <p>Or copy this link: ${resetUrl}</p>
          <p style="color: #666;">This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Restaurant Reservation App</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "Password reset email sent successfully"
    });
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

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in memory with 10-minute expiry
    const expiryTime = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(email, {
      code: verificationCode,
      expiry: expiryTime
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Restaurant Reservation App - Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your New Verification Code</h2>
          <p>Your new verification code is:</p>
          <h3 style="font-size: 32px; color: #D4A574; letter-spacing: 5px;">
            ${verificationCode}
          </h3>
          <p>This code will expire in 10 minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Restaurant Reservation App</p>
        </div>
      `,
    };

    console.log('Resending verification email to:', email);
    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: "Verification code resent",
      verificationCode: verificationCode // In production, don't send this back
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: "Failed to resend verification code." });
  }
};

// Export verificationCodes for use in other controllers
exports.verificationCodes = verificationCodes;
