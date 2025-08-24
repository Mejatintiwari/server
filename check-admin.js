import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

// Load environment variables from project root
try { dotenv.config({ path: '../.env' }); } catch {}
try { dotenv.config(); } catch {}

async function checkAdminUser() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://getallscripts:gKh3dlRaJti5ZpHF@otpbuy.za1wzth.mongodb.net/?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all users with admin role
    const adminUsers = await User.find({ role: 'admin' });
    console.log('\n=== ADMIN USERS FOUND ===');
    console.log(`Total admin users: ${adminUsers.length}`);
    
    adminUsers.forEach((user, index) => {
      console.log(`\n--- Admin User ${index + 1} ---`);
      console.log(`ID: ${user._id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Plan: ${user.plan}`);
      console.log(`Has Password: ${!!user.password_hash}`);
      console.log(`Is Banned: ${user.is_banned}`);
      console.log(`Created: ${user.created_at}`);
      console.log(`Permissions:`, JSON.stringify(user.permissions, null, 2));
    });

    // Also check if the specific admin@fuzzpay.com exists
    const specificAdmin = await User.findOne({ email: 'admin@fuzzpay.com' });
    console.log('\n=== SPECIFIC ADMIN CHECK ===');
    if (specificAdmin) {
      console.log('✅ admin@fuzzpay.com found in database');
      console.log(`Role: ${specificAdmin.role}`);
      console.log(`Has Password: ${!!specificAdmin.password_hash}`);
      console.log(`Password Hash (first 20 chars): ${specificAdmin.password_hash?.substring(0, 20)}...`);
    } else {
      console.log('❌ admin@fuzzpay.com NOT found in database');
    }

    // Show all users for reference
    const allUsers = await User.find({}).select('email name role created_at');
    console.log('\n=== ALL USERS IN DATABASE ===');
    console.log(`Total users: ${allUsers.length}`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name}) - Role: ${user.role || 'user'} - Created: ${user.created_at}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking admin user:', error);
    process.exit(1);
  }
}

checkAdminUser();