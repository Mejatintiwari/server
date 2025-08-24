import mongoose from 'mongoose';

const emailSettingsSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  smtp_host: {
    type: String,
    required: true
  },
  smtp_port: {
    type: Number,
    required: true,
    default: 587
  },
  smtp_secure: {
    type: Boolean,
    default: false
  },
  smtp_username: {
    type: String,
    required: true
  },
  smtp_password: {
    type: String,
    required: true
  },
  from_email: {
    type: String,
    required: true
  },
  from_name: {
    type: String,
    required: true
  },
  reply_to: {
    type: String
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: false
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

export default mongoose.model('EmailSettings', emailSettingsSchema);