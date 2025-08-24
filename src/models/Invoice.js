import mongoose from 'mongoose';

const InvoiceItemSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    hours: Number,
    rate: Number,
    subtotal: Number,
    order_index: Number,
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    // Link to User collection for populate in admin views
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invoice_number: { type: String, required: true, index: true },
    client_name: { type: String, required: true, index: true },
    client_email: { type: String, required: true },
    client_address: String,
    client_phone: String,
    client_business_name: String,
    status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue'], default: 'draft', index: true },
    currency: { type: String, default: 'USD' },
    subtotal: Number,
    tax_enabled: { type: Boolean, default: false },
    tax_rate: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    discount_enabled: { type: Boolean, default: false },
    discount_type: { type: String, enum: ['flat', 'percentage'], default: 'flat' },
    discount_value: { type: Number, default: 0 },
    discount_amount: { type: Number, default: 0 },
    total: Number,
    notes: String,
    terms: String,
    estimated_completion: String,
    due_date: String,
    payment_gateway_url: String,
    is_recurring: { type: Boolean, default: false },
    recurring_frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'] },
    recurring_end_date: String,
    parent_recurring_id: String,
    items: [InvoiceItemSchema],
    // Admin flags
    is_flagged: { type: Boolean, default: false },
    flag_reason: { type: String },
    paid_at: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Invoice', InvoiceSchema);