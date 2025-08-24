import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password_hash: { type: String }, // hashed password stored here
    phone: String,
    address: String,
    default_currency: { type: String, default: 'USD' },
    default_tax_rate: { type: Number, default: 0 },
    default_discount: { type: Number, default: 0 },
    plan: { type: String, enum: ['free', 'pro', 'agency'], default: 'free' },
    plan_expires_at: String,
    is_banned: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    permissions: {
      user_management: { type: Boolean, default: false },
      invoice_monitoring: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      email_logs: { type: Boolean, default: false },
      system_settings: { type: Boolean, default: false },
      security_audit: { type: Boolean, default: false },
      data_exports: { type: Boolean, default: false },
      admin_management: { type: Boolean, default: false }
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('User', UserSchema);