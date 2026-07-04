const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// Helpers
function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET missing');
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
}
async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}
function bearer(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  return h.split(' ')[1];
}

// Sends mail if SMTP_* env vars are configured; otherwise just logs the
// link to the console so the flow still works in dev/demo environments
// without real email credentials.
async function sendResetEmail(toEmail, resetLink) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`PASSWORD_RESET_LINK (no SMTP configured) for ${toEmail}: ${resetLink}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: toEmail,
    subject: 'Reset your QuizApp password',
    html: `<p>You requested a password reset.</p>
           <p><a href="${resetLink}">Click here to reset your password</a></p>
           <p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`
  });
}

// Health
router.get('/ping', (_req, res) => res.json({ ok: true }));

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user' // role is never taken from the request body — see security note above
    });

    const token = signToken(user);
    res.status(201).json({
      message: 'Registered',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('REGISTER_ERROR:', err?.message || err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ***** LOGIN (robust; never compares with undefined) *****
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const stored = (user.passwordHash ?? user.password ?? '');
    if (!stored) {
      console.error('LOGIN_WARN: user missing password/passwordHash', user._id?.toString());
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let valid = false;
    if (typeof stored === 'string' && (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$'))) {
      valid = await bcrypt.compare(password, stored);
    } else {
      valid = password === stored; // legacy/plaintext
      if (valid) {
        try {
          user.passwordHash = await hashPassword(password);
          if (user.password) user.password = undefined; // drop legacy field
          await user.save();
          console.log('LOGIN_UPGRADE: plaintext -> bcrypt for', user.email);
        } catch (e) {
          console.error('LOGIN_UPGRADE_ERROR:', e?.message || e);
        }
      }
    }

    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' }
    });
  } catch (err) {
    console.error('LOGIN_CATCH:', err?.message || err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Forgot password — generates a reset token, emails (or logs) the link.
// Always responds the same way whether or not the email exists, so we
// don't leak which emails are registered.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const genericMsg = { message: 'If that email exists, a reset link has been sent' };
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(genericMsg); // do not reveal existence

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await user.save();

    const base = process.env.FRONTEND_URL || '';
    const resetLink = `${base}/reset-password.html?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    await sendResetEmail(user.email, resetLink);
    res.json(genericMsg);
  } catch (err) {
    console.error('FORGOT_PASSWORD_ERROR:', err?.message || err);
    res.status(500).json({ error: 'Could not process request' });
  }
});

// Reset password — verifies token + expiry, sets new passwordHash.
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body || {};
    if (!email || !token || !password) {
      return res.status(400).json({ error: 'Email, token and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetTokenHash || !user.resetTokenExpires) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    if (user.resetTokenExpires < new Date()) {
      return res.status(400).json({ error: 'Reset link has expired' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== user.resetTokenHash) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    user.passwordHash = await hashPassword(password);
    user.password = undefined; // drop any legacy plaintext field
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await user.save();

    res.json({ message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    console.error('RESET_PASSWORD_ERROR:', err?.message || err);
    res.status(500).json({ error: 'Could not reset password' });
  }
});

// Change password (while logged in) — used by the Settings page.
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stored = user.passwordHash ?? user.password ?? '';
    const valid = stored && (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$'))
      ? await bcrypt.compare(currentPassword, stored)
      : currentPassword === stored;

    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    user.passwordHash = await hashPassword(newPassword);
    user.password = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('CHANGE_PASSWORD_ERROR:', err?.message || err);
    res.status(500).json({ error: 'Could not change password' });
  }
});

// Session check
router.get('/me', async (req, res) => {
  try {
    const token = bearer(req);
    if (!token) return res.status(401).json({ authenticated: false });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('name email role');
    if (!user) return res.status(401).json({ authenticated: false });
    res.json({
      authenticated: true,
      role: user.role,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch {
    res.status(401).json({ authenticated: false });
  }
});

// Logout (stateless)
router.post('/logout', (_req, res) => res.json({ ok: true }));

module.exports = router;
