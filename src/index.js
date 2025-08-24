import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import usersRouter from './routes/users.js';
import usersDemoRouter from './routes/users-demo.js';
import authRouter from './routes/auth.js';
import authDemoRouter from './routes/auth-demo.js';
import googleRouter from './routes/googleAuth.js';
import emailRouter from './routes/email.js';
import teamRouter from './routes/team.js';
import recurringInvoicesRouter from './routes/recurringInvoices.js';
import emailSettingsRouter from './routes/emailSettings.js';
import billingRouter from './routes/billing.js';
import adminRouter from './routes/admin.js';
import publicRouter from './routes/public.js';
import recaptchaRouter from './routes/recaptcha.js';
import crudRouter from './routes/crud.js';

// Load env from project root first, then server folder as fallback
try { dotenv.config({ path: '../../.env' }); } catch {}
try { dotenv.config({ path: '../.env' }); } catch {}
try { dotenv.config(); } catch {}

const app = express();

// CORS setup - allow frontend origin explicitly
const dev = process.env.NODE_ENV !== 'production';
console.log('Environment mode:', process.env.NODE_ENV || 'development');
console.log('Running in development mode:', dev);

const envOrigins = (process.env.FRONTEND_BASE_URL || '').split(',').filter(Boolean);
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5174', // Vite sometimes uses this port
  'http://127.0.0.1:5174'
];
const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

console.log('Allowed origins:', allowedOrigins);

const corsOptions = {
  // Always use function-based origin to handle various scenarios
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow any origin for easier debugging
    if (dev) {
      console.log('Allowing origin in dev mode:', origin);
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Authorization', 'Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

// Debug middleware to log CORS requests with more details
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'} - Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Add CORS headers manually as a fallback
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (dev || allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }
  next();
});

app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://getallscripts:gKh3dlRaJti5ZpHF@otpbuy.za1wzth.mongodb.net/?retryWrites=true&w=majority';

async function start() {
  try {
    // Try to connect to MongoDB, but don't fail if it's not available
    let mongoConnected = false;
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('MongoDB connected');
      mongoConnected = true;
    } catch (mongoError) {
      console.warn('MongoDB not available, running in demo mode:', mongoError.message);
    }

    app.get('/health', (req, res) => res.json({ ok: true, timestamp: new Date().toISOString(), mongoConnected }));

    // Use demo routes if MongoDB is not available
    if (mongoConnected) {
      app.use('/api/auth', authRouter);
      app.use('/api/users', usersRouter);
    } else {
      app.use('/api/auth', authDemoRouter);
      app.use('/api/users', usersDemoRouter);
      console.log('Using demo authentication and user management (file-based)');
    }
    app.use('/api/google', googleRouter);
    app.use('/api/email', emailRouter);
    app.use('/api/team', teamRouter);
    app.use('/api/recurring-invoices', recurringInvoicesRouter);
    app.use('/api/email-settings', emailSettingsRouter);
    app.use('/api/billing', billingRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/public', publicRouter);
    app.use('/api/recaptcha', recaptchaRouter);
    app.use('/api', crudRouter);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API listening on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Admin login: http://localhost:5173/admin/login`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();