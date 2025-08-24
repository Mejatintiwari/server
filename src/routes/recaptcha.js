import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) return res.status(500).json({ error: 'reCAPTCHA secret not configured' });

    const rsp = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token })
    });
    const data = await rsp.json();
    if (!data.success || (typeof data.score === 'number' && data.score < 0.5)) {
      return res.status(400).json({ error: 'captcha failed', data });
    }
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;