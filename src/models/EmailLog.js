import mongoose from 'mongoose';

const EmailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    html: { type: String },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued', index: true },
    provider_message_id: { type: String },
    error: { type: String },
    retries: { type: Number, default: 0 },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('EmailLog', EmailLogSchema);