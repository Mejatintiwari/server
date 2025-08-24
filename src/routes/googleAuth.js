import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:4000';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${SERVER_BASE_URL}/api/google/callback`);

router.get('/login', (req, res) => {
  const redirectUri = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
    ],
    redirect_uri: `${SERVER_BASE_URL}/api/google/callback`,
  });
  res.redirect(redirectUri);
});

router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await client.getToken({ code, redirect_uri: `${SERVER_BASE_URL}/api/google/callback` });
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    const email = payload.email;
    const name = payload.name || email.split('@')[0];

    // find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name });
    }

    // issue a simple JWT to pass back to frontend
    const token = jwt.sign({ id: user._id.toString(), email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    // Redirect back to frontend with token
    const url = new URL(FRONTEND_BASE_URL + '/auth/callback');
    url.searchParams.set('token', token);
    url.searchParams.set('userId', user._id.toString());
    url.searchParams.set('email', user.email);
    url.searchParams.set('name', user.name);
    res.redirect(url.toString());
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.status(500).send('Authentication failed');
  }
});

export default router;