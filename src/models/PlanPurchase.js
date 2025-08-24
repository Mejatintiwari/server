import mongoose from 'mongoose';

const PlanPurchaseSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    plan: { type: String, enum: ['free', 'pro', 'agency'], required: true },
    billing_cycle: { type: String, enum: ['monthly', 'yearly'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    gateway: { type: String, default: 'oxapay' },
    order_id: { type: String, required: true, index: true },
    track_id: { type: String },
    status: { type: String, enum: ['initiated', 'pending', 'paid', 'expired', 'failed', 'cancelled'], default: 'pending', index: true },
    paid_at: { type: Date },
    expires_at: { type: Date },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('PlanPurchase', PlanPurchaseSchema);