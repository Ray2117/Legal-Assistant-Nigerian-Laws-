import mongoose, { Document, Schema } from 'mongoose';

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New Conversation' },
  },
  { timestamps: true }
);

export default mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
