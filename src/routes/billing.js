import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import PlanPurchase from '../models/PlanPurchase.js';

const router = express.Router();

// Record an initiated purchase (called when user clicks buy on pricing page)
router.post('/purchase/initiate', async (req, res) => {
  try {
    const { userId, plan, billingCycle, amount, currency = 'USD', orderId, trackId } = req.body || {};
    if (!userId || !plan || !billingCycle || !amount || !orderId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Allow non-ObjectId user ids by storing as meta when not Mongo id
    const userRef = mongoose.Types.ObjectId.isValid(userId) ? userId : undefined;

    const purchase = await PlanPurchase.create({
      user_id: userRef,
      meta: { raw_user_id: userId }, 
      plan,
      billing_cycle: billingCycle,
      amount,
      currency,
      order_id: orderId,
      track_id: trackId,
      status: 'pending'
    });

    res.json({ ok: true, purchase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OxaPay callback to mark payment status
router.post('/oxapay/callback', async (req, res) => {
  try {
    // Expecting OxaPay to call with at least order_id and status
    const { order_id, status } = req.body || {};
    if (!order_id || !status) return res.status(400).json({ error: 'Invalid callback payload' });

    const purchase = await PlanPurchase.findOne({ order_id });
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    let update = { status };
    if (status === 'paid') {
      update.paid_at = new Date();

      // Calculate plan expiry based on billing_cycle
      const expires = new Date();
      expires.setDate(expires.getDate() + (purchase.billing_cycle === 'yearly' ? 365 : 30));
      update.expires_at = expires;

      // Apply plan to user
      const user = await User.findByIdAndUpdate(purchase.user_id, { plan: purchase.plan, plan_expires_at: expires.toISOString() }, { new: true });

      // Send welcome/plan email
      try {
        const fetch = (await import('node-fetch')).default;
        const features = purchase.plan === 'agency'
          ? ['Unlimited team members', 'White-label emailing', 'Advanced analytics', 'Priority support']
          : purchase.plan === 'pro'
          ? ['Unlimited invoices', 'Branded emails', 'Recurring billing', 'Basic analytics']
          : ['Core invoicing', 'Email delivery', 'Client portal'];
        const html = `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h2>Thanks for your purchase!</h2>
            <p>Hi ${user?.name || ''}, your <b>${purchase.plan.toUpperCase()}</b> plan is now active.</p>
            <p>Key features included:</p>
            <ul>${features.map(f => `<li>${f}</li>`).join('')}</ul>
            <p>Plan expires on <b>${expires.toDateString()}</b>.</p>
          </div>`;
        await fetch(`${process.env.SERVER_BASE_URL || 'http://localhost:4000'}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user?.email || 'noreply@example.com',
            subject: `Welcome to ${purchase.plan.toUpperCase()} plan` ,
            html,
            meta: { type: 'plan_welcome', plan: purchase.plan, user_id: user?._id?.toString() }
          })
        });
      } catch (e) {
        console.warn('Welcome email failed:', e);
      }
    } else if (status === 'expired') {
      // leave as pending/expired for admin review
    } else if (status === 'failed' || status === 'cancelled') {
      // mark as failed/cancelled
    }

    await PlanPurchase.updateOne({ _id: purchase._id }, update);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;