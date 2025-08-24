import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  hours: {
    type: Number,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  order_index: {
    type: Number,
    default: 0
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

// Index for efficient querying by invoice
invoiceItemSchema.index({ invoice_id: 1, order_index: 1 });

export default mongoose.model('InvoiceItem', invoiceItemSchema);