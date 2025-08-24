import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    business_name: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Client', ClientSchema);