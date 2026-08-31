const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

async function sendCodeEmail(toEmail, code, purpose) {
  const subject =
    purpose === "signup verification"
      ? "Your SUNNA STORE verification code"
      : "Your SUNNA STORE password reset code";

  await transporter.sendMail({
    from: `"SUNNA STORE" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto">
        <h2 style="color:#111827">SUNNA STORE</h2>
        <p>Your code is:</p>
        <p style="font-size:32px;font-weight:900;letter-spacing:4px">${code}</p>
        <p style="color:#6b7280;font-size:13px">This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
      </div>
    `
  });
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = { sendCodeEmail, generateCode };
