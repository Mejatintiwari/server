import express from 'express';
import TeamMember from '../models/TeamMember.js';

const router = express.Router();

// Get all team members for a user
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const teamMembers = await TeamMember.find({ owner_id: user_id }).sort({ created_at: -1 });
    res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new team member (invite)
router.post('/', async (req, res) => {
  try {
    const {
      owner_id,
      email,
      name,
      role,
      status,
      permissions,
      invited_at
    } = req.body;

    if (!owner_id || !email || !name) {
      return res.status(400).json({ error: 'owner_id, email, and name are required' });
    }

    // Check if team member already exists
    const existingMember = await TeamMember.findOne({ owner_id, email });
    if (existingMember) {
      return res.status(400).json({ error: 'Team member with this email already exists' });
    }

    const teamMember = new TeamMember({
      owner_id,
      email,
      name,
      role: role || 'member',
      status: status || 'pending',
      permissions: permissions || {
        create_invoices: true,
        edit_invoices: true,
        delete_invoices: false,
        manage_clients: true,
        view_reports: true,
        manage_settings: false
      },
      invited_at: invited_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await teamMember.save();
    res.status(201).json(teamMember);
  } catch (error) {
    console.error('Error creating team member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a team member
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const teamMember = await TeamMember.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date().toISOString() },
      { new: true }
    );

    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json(teamMember);
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a team member
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const teamMember = await TeamMember.findByIdAndDelete(id);
    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json({ message: 'Team member deleted successfully' });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;