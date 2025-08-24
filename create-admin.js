import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';

// Load environment variables from project root
try { dotenv.config({ path: '../.env' }); } catch {}
try { dotenv.config(); } catch {}

async function createAdminUser() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://getallscripts:gKh3dlRaJti5ZpHF@otpbuy.za1wzth.mongodb.net/?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    let existingUser = await User.findOne({ email: 'admin@fuzzpay.com' });
    
    if (existingUser) {
      // Update existing user to have admin role and permissions
      const password_hash = await bcrypt.hash('SuperAdmin123!', 10);
      existingUser.role = 'admin';
      existingUser.password_hash = password_hash;
      existingUser.plan = 'agency';
      existingUser.permissions = {
        user_management: true,
        invoice_monitoring: true,
        analytics: true,
        email_logs: true,
        system_settings: true,
        security_audit: true,
        data_exports: true,
        admin_management: true
      };
      await existingUser.save();
      
      console.log('✅ Existing user updated to admin role!');
      console.log('📧 Email: admin@fuzzpay.com');
      console.log('🔑 Password: SuperAdmin123!');
    } else {
      // Create new admin user
      const password_hash = await bcrypt.hash('SuperAdmin123!', 10);
      const adminUser = await User.create({
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
      
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@fuzzpay.com');
      console.log('🔑 Password: SuperAdmin123!');
    }

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@fuzzpay.com');
    console.log('🔑 Password: SuperAdmin123!');
    console.log('🌐 Admin URL: http://localhost:5174/admin/login');
    console.log('🌐 Regular Login URL: http://localhost:5174/login');
    console.log('');
    console.log('You can now login with these credentials on either:');
    console.log('- Regular login page (will have admin features if role is admin)');
    console.log('- Admin login page (dedicated admin interface)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();