import express from 'express';
import Client from '../models/Client.js';
import PaymentMethod from '../models/PaymentMethod.js';
import CompanyInfo from '../models/CompanyInfo.js';
import Invoice from '../models/Invoice.js';

const router = express.Router();

// Helpers
const ok = (res, data) => res.json(data);
const fail = (res, err) => res.status(500).json({ error: err.message });

// Clients
router.get('/clients', async (req, res) => {
  try {
    const { user_id } = req.query;
    const out = await Client.find(user_id ? { user_id } : {});
    ok(res, out);
  } catch (err) { fail(res, err); }
});
router.post('/clients', async (req, res) => {
  try { ok(res, await Client.create(req.body)); } catch (err) { fail(res, err); }
});
router.patch('/clients/:id', async (req, res) => {
  try { ok(res, await Client.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { fail(res, err); }
});
router.delete('/clients/:id', async (req, res) => {
  try { ok(res, await Client.findByIdAndDelete(req.params.id)); } catch (err) { fail(res, err); }
});

// Payment methods
router.get('/payment_methods', async (req, res) => {
  try {
    const { user_id } = req.query;
    ok(res, await PaymentMethod.find(user_id ? { user_id } : {}));
  } catch (err) { fail(res, err); }
});
router.post('/payment_methods', async (req, res) => {
  try { ok(res, await PaymentMethod.create(req.body)); } catch (err) { fail(res, err); }
});
router.patch('/payment_methods/:id', async (req, res) => {
  try { ok(res, await PaymentMethod.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { fail(res, err); }
});

// Company info
router.get('/company_info', async (req, res) => {
  try {
    const { user_id } = req.query;
    ok(res, await CompanyInfo.find(user_id ? { user_id } : {}));
  } catch (err) { fail(res, err); }
});
router.post('/company_info', async (req, res) => {
  try { ok(res, await CompanyInfo.create(req.body)); } catch (err) { fail(res, err); }
});
router.patch('/company_info/:id', async (req, res) => {
  try { ok(res, await CompanyInfo.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { fail(res, err); }
});

// Invoices
router.get('/invoices', async (req, res) => {
  try {
    const { user_id } = req.query;
    ok(res, await Invoice.find(user_id ? { user_id } : {}));
  } catch (err) { fail(res, err); }
});
router.post('/invoices', async (req, res) => {
  try { ok(res, await Invoice.create(req.body)); } catch (err) { fail(res, err); }
});
router.patch('/invoices/:id', async (req, res) => {
  try { ok(res, await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { fail(res, err); }
});
router.delete('/invoices/:id', async (req, res) => {
  try { ok(res, await Invoice.findByIdAndDelete(req.params.id)); } catch (err) { fail(res, err); }
});

export default router;