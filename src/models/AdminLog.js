import mongoose from 'mongoose';

const AdminLogSchema = new mongoose.Schema(
  {
    // Store admin reference from the unified User collection
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // 'login', 'user_suspend', 'invoice_delete', etc.
    target_type: { type: String }, // 'user', 'invoice', 'system', etc.
    target_id: { type: String }, // ID of the affected resource
    details: { type: mongoose.Schema.Types.Mixed }, // Additional context
    ip_address: String,
    user_agent: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('AdminLog', AdminLogSchema);