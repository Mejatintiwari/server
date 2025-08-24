import express from 'express';
import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import SupportTicket from '../models/SupportTicket.js';

const router = express.Router();

// Health for this router
router.get('/health', (req, res) => res.json({ ok: true }));

// Submit feedback (public)
router.post('/feedback', async (req, res) => {
  try {
    const { user_id, name, email, type, rating, message } = req.body || {};
    if (!name || !email || !type || !rating || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const doc = await Feedback.create({
      user_id: user_id && mongoose.Types.ObjectId.isValid(user_id) ? user_id : undefined,
      name,
      email,
      type,
      rating,
      message,
      status: 'new',
    });

    res.status(201).json({ feedback: doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit support ticket (public)
router.post('/support', async (req, res) => {
  try {
    const { user_id, name, email, phone, subject, category, priority, message } = req.body || {};
    if (!name || !email || !subject || !category || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const doc = await SupportTicket.create({
      user_id: user_id && mongoose.Types.ObjectId.isValid(user_id) ? user_id : undefined,
      name,
      email,
      phone: phone || undefined,
      subject,
      category,
      priority: priority || 'low',
      message,
      status: 'open',
    });

    res.status(201).json({ ticket: doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;