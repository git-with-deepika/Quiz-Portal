// routes/contact.js
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// POST /api/contact — sends the message to the configured admin inbox
// (or just logs it if no SMTP credentials are configured, so the form
// still "works" in dev/demo environments).
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email and message are required' });
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, CONTACT_TO } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log('CONTACT_FORM (no SMTP configured):', { name, email, message });
      return res.json({ message: 'Message received. We will get back to you soon.' });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: CONTACT_TO || SMTP_FROM || SMTP_USER,
      replyTo: email,
      subject: `QuizApp contact form: ${name}`,
      html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message.replace(/\n/g, '<br>')}</p>`
    });

    res.json({ message: 'Message sent. We will get back to you soon.' });
  } catch (err) {
    console.error('CONTACT_ERROR:', err?.message || err);
    res.status(500).json({ error: 'Could not send message' });
  }
});

module.exports = router;
