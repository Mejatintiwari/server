import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

// List current user's profile by id (mimics supabase .from('users').select().eq('id', userId).single())
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId; if invalid, return 400 to avoid 500 crashes
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upsert by id (mimic .upsert with onConflict: 'id')
router.post('/upsert', async (req, res) => {
  try {
    const { id, ...rest } = req.body;
    let user;
    if (id) {
      user = await User.findByIdAndUpdate(id, rest, { new: true, upsert: true, setDefaultsOnInsert: true });
    } else {
      user = await User.create(rest);
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update by id
router.patch('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { ...req.body, updated_at: new Date().toISOString() }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;