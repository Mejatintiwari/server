import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
  owner_id: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member'
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'inactive'],
    default: 'pending'
  },
  permissions: {
    create_invoices: { type: Boolean, default: true },
    edit_invoices: { type: Boolean, default: true },
    delete_invoices: { type: Boolean, default: false },
    manage_clients: { type: Boolean, default: true },
    view_reports: { type: Boolean, default: true },
    manage_settings: { type: Boolean, default: false }
  },
  invited_at: {
    type: Date,
    default: Date.now
  },
  last_active: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index for owner and email
teamMemberSchema.index({ owner_id: 1, email: 1 }, { unique: true });

export default mongoose.model('TeamMember', teamMemberSchema);