import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password_hash: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['superadmin', 'admin', 'support', 'finance'], 
      default: 'admin' 
    },
    permissions: {
      user_management: { type: Boolean, default: true },
      invoice_monitoring: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
      email_logs: { type: Boolean, default: true },
      system_settings: { type: Boolean, default: false },
      security_audit: { type: Boolean, default: false },
      data_exports: { type: Boolean, default: false },
      admin_management: { type: Boolean, default: false }
    },
    is_active: { type: Boolean, default: true },
    last_login: Date,
    login_count: { type: Number, default: 0 },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const Admin = mongoose.model('Admin', AdminSchema);

async function setupAdmin() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://getallscripts:gKh3dlRaJti5ZpHF@otpbuy.za1wzth.mongodb.net/?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create superadmin
    const password_hash = await bcrypt.hash('SuperAdmin123!', 10);
    const admin = await Admin.create({
      email: 'admin@fuzzpay.com',
      name: 'Super Administrator',
      password_hash,
      role: 'superadmin',
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

    console.log('✅ Superadmin created successfully!');
    console.log('📧 Email: admin@fuzzpay.com');
    console.log('🔑 Password: SuperAdmin123!');
    console.log('🌐 Admin URL: http://localhost:5173/admin/login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
    process.exit(1);
  }
}

setupAdmin();