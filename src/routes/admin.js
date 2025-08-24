import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import AdminLog from '../models/AdminLog.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import EmailLog from '../models/EmailLog.js';
import Feedback from '../models/Feedback.js';
import SupportTicket from '../models/SupportTicket.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find the user and verify they have admin role
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid or inactive admin' });
    }

    if (user.is_banned) {
      return res.status(401).json({ error: 'Admin account is suspended' });
    }

    req.admin = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Log admin action
const logAction = async (adminId, action, targetType = null, targetId = null, details = null, req = null) => {
  try {
    await AdminLog.create({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: req?.ip || req?.connection?.remoteAddress,
      user_agent: req?.headers['user-agent']
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// Admin login using unified User model
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user with admin role
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Password not set for this admin account' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { 
        id: user._id.toString(), 
        email: user.email, 
        name: user.name, 
        role: user.role,
        permissions: user.permissions
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      admin: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      },
      token
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Create default admin user (one-time setup)
router.post('/setup', async (req, res) => {
  try {
    const mongoConnected = mongoose.connection?.readyState === 1; // 1 = connected
    if (!mongoConnected) {
      return res.status(200).json({
        message: 'Demo mode: MongoDB not connected. Using default admin credentials.',
        credentials: {
          email: 'admin@fuzzpay.com',
          password: 'SuperAdmin123!'
        }
      });
    }

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(200).json({ 
        message: 'Admin user already exists',
        credentials: {
          email: existingAdmin.email,
          password: 'Use existing password'
        }
      });
    }

    const password_hash = await bcrypt.hash('SuperAdmin123!', 10);
    await User.create({
      email: 'admin@fuzzpay.com',
      name: 'Super Administrator',
      password_hash,
      role: 'admin',
      plan: 'agency',
      permissions: {
        user_management: true,
        invoice_monitoring: true,
        analytics: true,
        email_logs: true,
        system_settings: true,
        security_audit: true,
        data_exports: true,
        admin_management: true
      }
    });

    res.json({
      message: 'Admin user created successfully',
      credentials: {
        email: 'admin@fuzzpay.com',
        password: 'SuperAdmin123!'
      }
    });
  } catch (error) {
    console.error('Admin setup route error:', error);
    // Provide demo fallback instead of failing with 500
    return res.status(200).json({
      message: 'Demo fallback due to setup error',
      credentials: {
        email: 'admin@fuzzpay.com',
        password: 'SuperAdmin123!'
      }
    });
  }
});

// Dashboard analytics (live data)
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalUsers, totalInvoices, paidInvoices, overdueInvoices, todaySignups, planAgg, recentActivity] = await Promise.all([
      User.countDocuments({}),
      Invoice.countDocuments({}),
      Invoice.countDocuments({ status: 'paid' }),
      Invoice.countDocuments({ status: 'overdue' }),
      User.countDocuments({ created_at: { $gte: startOfToday } }),
      User.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      AdminLog.find({}).populate('admin_id', 'name email').sort({ created_at: -1 }).limit(10)
    ]);

    const stats = {
      totalUsers,
      activeUsers: totalUsers, // until last_login tracking is added
      totalInvoices,
      paidInvoices,
      unpaidInvoices: Math.max(0, totalInvoices - paidInvoices),
      overdueInvoices,
      todaySignups
    };

    res.json({
      stats,
      planDistribution: planAgg,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Purchases for admin view
router.get('/purchases', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.analytics && !req.admin.permissions.user_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const PlanPurchase = (await import('../models/PlanPurchase.js')).default;
    const { page = 1, limit = 50, status, plan, user } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (plan && plan !== 'all') query.plan = plan;
    if (user) query.user_id = user;

    const purchases = await PlanPurchase.find(query)
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({ purchases });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User management
router.get('/users', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.user_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { page = 1, limit = 20, search, plan, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    if (plan) query.plan = plan;
    if (status === 'banned') query.is_banned = true;
    if (status === 'active') query.is_banned = false;

    // Fetch users page
    const users = await User.find(query)
      .select('-password_hash')
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);

    // Aggregate invoice stats for these users
    const userIds = users.map(u => u._id);
    const invoiceStats = await Invoice.aggregate([
      { $match: { user_id: { $in: userIds } } },
      { $group: { _id: '$user_id', invoice_count: { $sum: 1 }, total_revenue: { $sum: { $ifNull: ['$total', 0] } } } }
    ]);
    const statsMap = new Map(invoiceStats.map(s => [String(s._id), { invoice_count: s.invoice_count || 0, total_revenue: s.total_revenue || 0 }]));

    // Shape users to match admin UI expectations
    const shaped = users.map(u => {
      const s = statsMap.get(String(u._id)) || { invoice_count: 0, total_revenue: 0 };
      return {
        ...u.toObject(),
        is_active: !u.is_banned,
        invoice_count: s.invoice_count,
        total_revenue: s.total_revenue,
        last_login: u.last_login || null,
        login_count: u.login_count || 0,
      };
    });

    res.json({
      users: shaped,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user plan
router.patch('/users/:id/plan', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.user_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { plan } = req.body || {};
    if (!['free', 'pro', 'agency'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { plan },
      { new: true }
    ).select('-password_hash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    await logAction(req.admin._id, 'user_plan_update', 'user', user._id.toString(), { plan }, req);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Feedback listing
router.get('/feedback', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, type, email } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (email) query.email = { $regex: email, $options: 'i' };

    const items = await Feedback.find(query)
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Feedback.countDocuments(query);

    res.json({
      feedback: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update feedback status
router.patch('/feedback/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['new', 'reviewing', 'resolved'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const doc = await Feedback.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    await logAction(req.admin._id, 'feedback_status_update', 'feedback', doc._id.toString(), { status }, req);
    res.json({ feedback: doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Support tickets listing
router.get('/support', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, priority, email } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (email) query.email = { $regex: email, $options: 'i' };

    const items = await SupportTicket.find(query)
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await SupportTicket.countDocuments(query);

    res.json({
      tickets: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update support status
router.patch('/support/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['open', 'in_progress', 'resolved', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const doc = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    await logAction(req.admin._id, 'support_status_update', 'support', doc._id.toString(), { status }, req);
    res.json({ ticket: doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset user password
router.post('/users/:id/reset-password', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.user_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const newPassword = Math.random().toString(36).slice(-8);
    const password_hash = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password_hash },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAction(
      req.admin._id,
      'user_password_reset',
      'user',
      user._id.toString(),
      { email: user.email },
      req
    );

    res.json({ 
      message: 'Password reset successfully',
      newPassword // In production, send via email instead
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invoice monitoring
router.get('/invoices', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.invoice_monitoring) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { page = 1, limit = 20, search, status, user_id } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { invoice_number: { $regex: search, $options: 'i' } },
        { client_name: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (user_id) query.user_id = user_id;

    const invoices = await Invoice.find(query)
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(query);

    res.json({
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete invoice
router.delete('/invoices/:id', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.invoice_monitoring) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await logAction(
      req.admin._id,
      'invoice_delete',
      'invoice',
      invoice._id.toString(),
      { invoice_number: invoice.invoice_number, user_id: invoice.user_id },
      req
    );

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin logs
router.get('/logs', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.security_audit) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { page = 1, limit = 50, action, admin_id } = req.query;
    const query = {};

    if (action) query.action = action;
    if (admin_id) query.admin_id = admin_id;

    const logs = await AdminLog.find(query)
      .populate('admin_id', 'name email')
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await AdminLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Data export
router.get('/export/:type', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.data_exports) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { type } = req.params;
    let data;

    switch (type) {
      case 'users':
        data = await User.find().select('-password_hash');
        break;
      case 'invoices':
        data = await Invoice.find().populate('user_id', 'name email');
        break;
      case 'logs':
        data = await AdminLog.find().populate('admin_id', 'name email');
        break;
      case 'emails':
        data = await EmailLog.find().sort({ created_at: -1 });
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    await logAction(
      req.admin._id,
      'data_export',
      'system',
      null,
      { export_type: type, record_count: data.length },
      req
    );

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email logs listing (with filters/pagination)
router.get('/emails', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.email_logs) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { page = 1, limit = 50, to, status, subject } = req.query;
    const query = {};
    if (to) query.to = { $regex: to, $options: 'i' };
    if (subject) query.subject = { $regex: subject, $options: 'i' };
    if (status && status !== 'all') query.status = status;

    const logs = await EmailLog.find(query)
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await EmailLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admins management
router.get('/admins', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.admin_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const admins = await User.find({ role: 'admin' }).select('-password_hash').sort({ created_at: -1 });
    res.json({ admins });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admins', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.admin_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { email, name, password, permissions = {} } = req.body || {};
    if (!email || !name || !password) return res.status(400).json({ error: 'email, name, password required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const password_hash = await bcrypt.hash(password, 10);
    const admin = await User.create({ email, name, role: 'admin', permissions, password_hash, plan: 'agency' });
    await logAction(req.admin._id, 'admin_create', 'admin', admin._id.toString(), { email }, req);
    res.status(201).json({ admin: { ...admin.toObject(), password_hash: undefined } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/admins/:id', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.admin_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { name, permissions, is_banned } = req.body || {};
    const admin = await User.findByIdAndUpdate(req.params.id, { name, permissions, is_banned }, { new: true });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    await logAction(req.admin._id, 'admin_update', 'admin', admin._id.toString(), {}, req);
    res.json({ admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admins/:id', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.admin_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const admin = await User.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    await logAction(req.admin._id, 'admin_delete', 'admin', req.params.id, { email: admin.email }, req);
    res.json({ message: 'Admin deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users (admin only) - live data with filters/pagination to match UI
router.get('/users', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.user_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { page = 1, limit = 50, search, plan, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    if (plan && plan !== 'all') query.plan = plan;
    if (status === 'suspended') query.is_banned = true;
    if (status === 'active') query.is_banned = false;

    const users = await User.find(query)
      .select('-password_hash')
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Enrich with counts (optional; keep simple for now)
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoices (admin only) - live data with filters/pagination
router.get('/invoices', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.invoice_monitoring) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { page = 1, limit = 50, search, status, currency, flagged } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (currency && currency !== 'all') query.currency = currency;
    if (flagged === 'true') query.is_flagged = true;

    if (search) {
      query.$or = [
        { invoice_number: { $regex: search, $options: 'i' } },
        { client_name: { $regex: search, $options: 'i' } },
        { client_email: { $regex: search, $options: 'i' } }
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({ invoices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend/unsuspend user (write real field is_banned)
router.post('/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.user_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.params;
    const { suspend = true } = req.body || {};

    const user = await User.findByIdAndUpdate(id, { is_banned: !!suspend }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await logAction(
      req.admin._id,
      suspend ? 'user_suspend' : 'user_unsuspend',
      'user',
      id,
      { email: user.email },
      req
    );

    res.json({ message: `User ${suspend ? 'suspended' : 'unsuspended'} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (real)
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.user_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await logAction(req.admin._id, 'user_delete', 'user', id, { email: user.email }, req);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset user password (real)
router.post('/users/:id/reset-password', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.user_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.params;
    const newPassword = 'TempPass' + Math.random().toString(36).slice(-6);
    const password_hash = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(id, { password_hash }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await logAction(req.admin._id, 'user_password_reset', 'user', id, { email: user.email }, req);

    res.json({ message: 'Password reset successfully', newPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user activity - pull from AdminLog where available
router.get('/users/:id/activity', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.security_audit && !req.admin.permissions.user_management) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.params;

    const activity = await AdminLog.find({
      $or: [
        { target_type: 'user', target_id: id },
        { action: { $in: ['login', 'user_suspend', 'user_unsuspend', 'user_password_reset'] } }
      ]
    })
    .sort({ created_at: -1 })
    .limit(50);

    res.json({ activity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Flag invoice (real)
router.post('/invoices/:id/flag', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.invoice_monitoring) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.params;
    const { reason } = req.body || {};

    const invoice = await Invoice.findByIdAndUpdate(id, { is_flagged: true, flag_reason: reason || 'Flagged by admin' }, { new: true });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await logAction(req.admin._id, 'invoice_flag', 'invoice', id, { reason }, req);
    res.json({ message: 'Invoice flagged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete invoice (real)
router.delete('/invoices/:id', adminAuth, async (req, res) => {
  try {
    if (!req.admin.permissions.invoice_monitoring) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.params;
    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await logAction(req.admin._id, 'invoice_delete', 'invoice', id, { invoice_number: invoice.invoice_number }, req);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;