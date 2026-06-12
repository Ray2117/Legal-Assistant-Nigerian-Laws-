import mongoose, { Document, Schema } from 'mongoose';

export interface ISource {
  documentId: string;
  documentTitle: string;
  category: string;
  excerpt: string;
  chunkId: string;
}

export interface IChatMessage extends Document {
  sessionId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  sources: ISource[];
  createdAt: Date;
}

const SourceSchema = new Schema<ISource>({
  documentId: String,
  documentTitle: String,
  category: String,
  excerpt: String,
  chunkId: String,
});

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: { type: [SourceSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
