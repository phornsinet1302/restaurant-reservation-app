// utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    console.log(`Attempting to send email to: ${to}...`); // LOG 1

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId); // LOG 2
    return info;
  } catch (error) {
    console.error("❌ NODEMAILER ERROR:", error.message); // LOG 3
    throw error;
  }
};

module.exports = sendEmail;