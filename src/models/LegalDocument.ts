import mongoose, { Document, Schema } from 'mongoose';

export interface ILegalDocument extends Document {
  title: string;
  category: string;
  source: string;
  description: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  uploadedBy: mongoose.Types.ObjectId;
  chunksCount: number;
  status: 'processing' | 'ready' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const LegalDocumentSchema = new Schema<ILegalDocument>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Constitutional', 'Criminal', 'Commercial', 'Labour', 'Land', 'Family', 'Evidence', 'Other'],
    },
    source: { type: String, default: '' },
    description: { type: String, default: '' },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    chunksCount: { type: Number, default: 0 },
    status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
  },
  { timestamps: true }
);

export default mongoose.model<ILegalDocument>('LegalDocument', LegalDocumentSchema);
