import express from 'express';
import EmailSettings from '../models/EmailSettings.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Get email settings for a user
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const emailSettings = await EmailSettings.findOne({ user_id });
    res.json(emailSettings);
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create email settings
router.post('/', async (req, res) => {
  try {
    const emailSettingsData = {
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const emailSettings = new EmailSettings(emailSettingsData);
    await emailSettings.save();
    
    res.status(201).json(emailSettings);
  } catch (error) {
    console.error('Error creating email settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update email settings
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const emailSettings = await EmailSettings.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date().toISOString() },
      { new: true }
    );

    if (!emailSettings) {
      return res.status(404).json({ error: 'Email settings not found' });
    }

    res.json(emailSettings);
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test email connection
router.post('/test', async (req, res) => {
  try {
    const {
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_username,
      smtp_password,
      from_email,
      from_name,
      test_email
    } = req.body;

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_secure,
      auth: {
        user: smtp_username,
        pass: smtp_password,
      },
    });

    // Verify connection
    await transporter.verify();

    // Send test email
    const mailOptions = {
      from: `${from_name} <${from_email}>`,
      to: test_email,
      subject: 'FuzzPay - Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Email Configuration Successful!</h2>
          <p>Congratulations! Your branded email settings have been configured successfully.</p>
          <p>Your invoices will now be sent from <strong>${from_email}</strong> with the name <strong>${from_name}</strong>.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="color: #6B7280; font-size: 14px;">
            This is a test email from FuzzPay to verify your SMTP configuration.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'Test email sent successfully' 
    });
  } catch (error) {
    console.error('Error testing email:', error);
    res.status(400).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

export default router;