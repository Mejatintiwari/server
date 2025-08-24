import mongoose from 'mongoose';

const SupportTicketSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    subject: { type: String, required: true },
    category: { type: String, enum: ['billing', 'technical', 'feature', 'account', 'general'], required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'low' },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('SupportTicket', SupportTicketSchema);