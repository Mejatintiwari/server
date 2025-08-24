import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Simple file-based user storage for demo
const USERS_FILE = path.join(process.cwd(), 'src', 'data', 'demo-users.json');

const getUsers = () => {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Auth middleware
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user profile
router.get('/:id', auth, (req, res) => {
  try {
    const users = getUsers();
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const { password_hash, ...userProfile } = user;
    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.post('/upsert', auth, (req, res) => {
  try {
    const { id, email, name, default_currency, plan } = req.body;
    const users = getUsers();
    
    let userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      // Create new user profile
      const newUser = {
        id,
        email,
        name,
        default_currency: default_currency || 'USD',
        plan: plan || 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      users.push(newUser);
    } else {
      // Update existing user
      users[userIndex] = {
        ...users[userIndex],
        name,
        default_currency: default_currency || users[userIndex].default_currency,
        plan: plan || users[userIndex].plan,
        updated_at: new Date().toISOString()
      };
    }

    saveUsers(users);
    
    const user = users.find(u => u.id === id);
    const { password_hash, ...userProfile } = user;
    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;