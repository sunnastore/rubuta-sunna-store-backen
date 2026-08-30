const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendCodeEmail, generateCode } = require("../utils/mailer");
const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password || password.length < 6) {
      return res.status(400).json({ error: "Please fill all fields. Password must be at least 6 characters." });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.isVerified) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    let user = existing || new User({ name, email: email.toLowerCase(), phone });
    user.name = name;
    user.phone = phone;
    await user.setPassword(password);
    user.verificationCode = code;
    user.verificationExpires = expires;
    user.isVerified = false;
    await user.save();

    await sendCodeEmail(user.email, code, "signup verification");
    res.json({ message: "Verification code sent to your email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.post("/verify-signup", async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !user.verificationCode) return res.status(400).json({ error: "No pending signup found." });
    if (user.verificationExpires < new Date()) return res.status(400).json({ error: "Code expired. Please sign up again." });
    if (user.verificationCode !== code) return res.status(400).json({ error: "Incorrect code." });

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();

    const token = signToken(user);
    res.json({ token, user: { name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase(), isVerified: false });
    if (!user) return res.status(400).json({ error: "No pending signup found for this email." });
    const code = generateCode();
    user.verificationCode = code;
    user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendCodeEmail(user.email, code, "signup verification");
    res.json({ message: "A new code has been sent." });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !user.isVerified) return res.status(400).json({ error: "Incorrect email or password." });
    const ok = await user.checkPassword(password || "");
    if (!ok) return res.status(400).json({ error: "Incorrect email or password." });

    const token = signToken(user);
    res.json({ token, user: { name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase(), isVerified: true });
    if (!user) return res.status(400).json({ error: "No account found with this email." });

    const code = generateCode();
    user.resetCode = code;
    user.resetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendCodeEmail(user.email, code, "password reset");
    res.json({ message: "Reset code sent to your email." });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !user.resetCode) return res.status(400).json({ error: "No reset request found." });
    if (user.resetExpires < new Date()) return res.status(400).json({ error: "Code expired. Please request a new one." });
    if (user.resetCode !== code) return res.status(400).json({ error: "Incorrect code." });

    await user.setPassword(newPassword);
    user.resetCode = undefined;
    user.resetExpires = undefined;
    await user.save();
    res.json({ message: "Password reset successfully. Please log in." });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong." });
  }
});

module.exports = router;
