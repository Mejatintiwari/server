import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Sign in with email/password validation
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Password not set for this account. Please sign up or reset password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ 
      id: user._id.toString(), 
      email: user.email, 
      name: user.name, 
      role: user.role || 'user',
      permissions: user.permissions || {}
    }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ 
      user: { 
        id: user._id.toString(), 
        email: user.email, 
        name: user.name, 
        role: user.role || 'user',
        permissions: user.permissions || {}
      }, 
      token 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign up: create user with hashed password
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'email, name and password required' });

    let user = await User.findOne({ email });
    if (user && user.password_hash) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    if (!user) {
      user = await User.create({ email, name, password_hash });
    } else {
      user.name = name;
      user.password_hash = password_hash;
      await user.save();
    }

    const token = jwt.sign({ 
      id: user._id.toString(), 
      email: user.email, 
      name: user.name, 
      role: user.role || 'user',
      permissions: user.permissions || {}
    }, JWT_SECRET, { expiresIn: '30d' });
    
    res.status(201).json({ 
      user: { 
        id: user._id.toString(), 
        email: user.email, 
        name: user.name, 
        role: user.role || 'user',
        permissions: user.permissions || {}
      }, 
      token 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign out (stateless)
router.post('/signout', (req, res) => {
  res.json({ ok: true });
});

// Forgot password - request reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });

    const user = await User.findOne({ email });
    if (!user) return res.json({ ok: true }); // do not leak

    const token = jwt.sign({ id: user._id.toString(), email: user.email, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    const resetUrl = `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(token)}`;

    // Send email via email router
    const fetch = (await import('node-fetch')).default;
    await fetch(`${process.env.SERVER_BASE_URL || 'http://localhost:4000'}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: 'Reset your password',
        html: `<p>Click the link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
        meta: { type: 'password_reset', user_id: user._id.toString() }
      })
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password - set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'reset') return res.status(400).json({ error: 'invalid token' });

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'user not found' });

    const hash = await (await import('bcryptjs')).hash(newPassword, 10);
    user.password_hash = hash;
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get user from token (you'd need to implement auth middleware)
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = newPasswordHash;
    await user.save();

    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;