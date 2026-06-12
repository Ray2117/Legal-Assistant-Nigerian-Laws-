import mongoose, { Document, Schema } from 'mongoose';

export interface IDocumentChunk extends Document {
  documentId: mongoose.Types.ObjectId;
  chunkIndex: number;
  text: string;
  pineconeId: string;
  createdAt: Date;
}

const DocumentChunkSchema = new Schema<IDocumentChunk>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'LegalDocument', required: true, index: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    pineconeId: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema);
