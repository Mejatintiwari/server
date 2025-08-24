import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Simple file-based user storage for demo
const USERS_FILE = path.join(process.cwd(), 'src', 'data', 'demo-users.json');

// Ensure users file exists
if (!fs.existsSync(USERS_FILE)) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

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

// Sign in with email/password validation
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Password not set for this account. Please sign up or reset password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign up: create user with hashed password
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'email, name and password required' });

    const users = getUsers();
    let user = users.find(u => u.email === email);
    
    if (user && user.password_hash) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();

    if (!user) {
      user = { 
        id: userId, 
        email, 
        name, 
        password_hash,
        created_at: new Date().toISOString(),
        plan: 'free',
        default_currency: 'USD'
      };
      users.push(user);
    } else {
      user.name = name;
      user.password_hash = password_hash;
    }

    saveUsers(users);

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign out
router.post('/signout', (req, res) => {
  res.json({ message: 'Signed out successfully' });
});

// Google OAuth (mock)
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Google token required' });

    // Mock Google user for demo
    const mockGoogleUser = {
      id: 'google-demo-user',
      email: 'demo@gmail.com',
      name: 'Demo User',
      created_at: new Date().toISOString(),
      plan: 'free',
      default_currency: 'USD'
    };

    const users = getUsers();
    let user = users.find(u => u.email === mockGoogleUser.email);
    
    if (!user) {
      users.push(mockGoogleUser);
      saveUsers(users);
      user = mockGoogleUser;
    }

    const jwtToken = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token: jwtToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;