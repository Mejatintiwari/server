import express from 'express';
import RecurringInvoice from '../models/RecurringInvoice.js';
import Invoice from '../models/Invoice.js';
import InvoiceItem from '../models/InvoiceItem.js';

const router = express.Router();

// Get all recurring invoices for a user
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const recurringInvoices = await RecurringInvoice.find({ user_id }).sort({ created_at: -1 });
    res.json(recurringInvoices);
  } catch (error) {
    console.error('Error fetching recurring invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new recurring invoice
router.post('/', async (req, res) => {
  try {
    const recurringInvoiceData = {
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const recurringInvoice = new RecurringInvoice(recurringInvoiceData);
    await recurringInvoice.save();
    
    res.status(201).json(recurringInvoice);
  } catch (error) {
    console.error('Error creating recurring invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a recurring invoice
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const recurringInvoice = await RecurringInvoice.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date().toISOString() },
      { new: true }
    );

    if (!recurringInvoice) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    res.json(recurringInvoice);
  } catch (error) {
    console.error('Error updating recurring invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a recurring invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const recurringInvoice = await RecurringInvoice.findByIdAndDelete(id);
    if (!recurringInvoice) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    res.json({ message: 'Recurring invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate next invoice from recurring template
router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params;

    const recurringInvoice = await RecurringInvoice.findById(id);
    if (!recurringInvoice) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    if (recurringInvoice.status !== 'active') {
      return res.status(400).json({ error: 'Recurring invoice is not active' });
    }

    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments({ user_id: recurringInvoice.user_id });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, '0')}`;

    // Create the invoice
    const invoice = new Invoice({
      user_id: recurringInvoice.user_id,
      invoice_number: invoiceNumber,
      client_name: recurringInvoice.client_name,
      client_email: recurringInvoice.client_email,
      client_business_name: recurringInvoice.client_business_name,
      client_address: recurringInvoice.client_address,
      client_phone: recurringInvoice.client_phone,
      currency: recurringInvoice.currency,
      subtotal: recurringInvoice.subtotal,
      tax_enabled: recurringInvoice.tax_enabled,
      tax_rate: recurringInvoice.tax_rate,
      tax_amount: recurringInvoice.tax_amount,
      discount_enabled: recurringInvoice.discount_enabled,
      discount_amount: recurringInvoice.discount_amount,
      total: recurringInvoice.total,
      status: 'draft',
      notes: recurringInvoice.notes,
      terms: recurringInvoice.terms,
      recurring_invoice_id: recurringInvoice._id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await invoice.save();

    // Create invoice items
    const invoiceItems = recurringInvoice.items.map((item, index) => ({
      invoice_id: invoice._id,
      title: item.title,
      description: item.description,
      hours: item.hours,
      rate: item.rate,
      subtotal: item.subtotal,
      order_index: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    await InvoiceItem.insertMany(invoiceItems);

    // Update recurring invoice
    const nextDate = calculateNextInvoiceDate(
      recurringInvoice.next_invoice_date,
      recurringInvoice.frequency
    );

    await RecurringInvoice.findByIdAndUpdate(id, {
      invoices_generated: recurringInvoice.invoices_generated + 1,
      next_invoice_date: nextDate,
      updated_at: new Date().toISOString()
    });

    res.json({ 
      message: 'Invoice generated successfully',
      invoice_id: invoice._id,
      invoice_number: invoiceNumber
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate next invoice date
function calculateNextInvoiceDate(currentDate, frequency) {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  
  return date.toISOString();
}

export default router;