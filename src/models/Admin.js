import mongoose from 'mongoose';

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

export default mongoose.model('Admin', AdminSchema);