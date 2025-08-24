import mongoose from 'mongoose';

const recurringInvoiceSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    index: true
  },
  template_name: {
    type: String,
    required: true
  },
  client_name: {
    type: String,
    required: true
  },
  client_email: {
    type: String,
    required: true
  },
  client_business_name: String,
  client_address: String,
  client_phone: String,
  frequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  next_invoice_date: {
    type: Date,
    required: true
  },
  end_date: Date,
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  tax_enabled: {
    type: Boolean,
    default: false
  },
  tax_rate: {
    type: Number,
    default: 0
  },
  tax_amount: {
    type: Number,
    default: 0
  },
  discount_enabled: {
    type: Boolean,
    default: false
  },
  discount_amount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  invoices_generated: {
    type: Number,
    default: 0
  },
  max_invoices: Number,
  items: [{
    title: { type: String, required: true },
    description: String,
    hours: Number,
    rate: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  notes: String,
  terms: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('RecurringInvoice', recurringInvoiceSchema);