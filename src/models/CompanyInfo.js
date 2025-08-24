import mongoose from 'mongoose';

const CompanyInfoSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    business_name: { type: String, required: true },
    company_email: { type: String, required: true },
    phone: { type: String, required: true },
    website: String,
    logo: String,
    address_line_1: { type: String, required: true },
    address_line_2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip_code: { type: String, required: true },
    country: { type: String, required: true },
    custom_email_domain: String,
    email_signature: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('CompanyInfo', CompanyInfoSchema);