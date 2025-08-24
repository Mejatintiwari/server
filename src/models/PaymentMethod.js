import mongoose from 'mongoose';

const PaymentMethodSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    type: { type: String, enum: ['upi', 'bank', 'crypto', 'payment_link', 'custom'], required: true },
    name: { type: String, required: true },
    details: { type: Object, default: {} },
    is_active: { type: Boolean, default: true },
    order_index: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at' } }
);

export default mongoose.model('PaymentMethod', PaymentMethodSchema);