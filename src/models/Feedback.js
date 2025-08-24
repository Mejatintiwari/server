import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    name: { type: String, required: true },
    email: { type: String, required: true },
    type: { type: String, enum: ['general', 'feature', 'bug', 'improvement', 'compliment'], required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'reviewing', 'resolved'], default: 'new' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Feedback', FeedbackSchema);