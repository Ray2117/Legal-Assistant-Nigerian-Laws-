import { Request, Response } from 'express';
import { cloudinary } from '../config/cloudinary';
import LegalDocument from '../models/LegalDocument';
import { extractTextFromBuffer, processAndIndexDocument, deleteDocumentVectors } from '../services/document.service';
import { AuthRequest } from '../middleware/auth';

export async function uploadDocument(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  const { title, category, source, description } = req.body;
  if (!title || !category) {
    res.status(400).json({ message: 'Title and category are required' });
    return;
  }

  const uploadResult = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: `legal-assistant/${category.toLowerCase()}`,
        public_id: `${Date.now()}-${title.replace(/\s+/g, '-').toLowerCase()}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(req.file!.buffer);
  });

  const document = await LegalDocument.create({
    title,
    category,
    source: source || '',
    description: description || '',
    cloudinaryUrl: uploadResult.secure_url,
    cloudinaryPublicId: uploadResult.public_id,
    uploadedBy: req.user!.id,
    status: 'processing',
  });

  res.status(201).json({ message: 'Document uploaded, processing started', document });

  try {
    const text = await extractTextFromBuffer(req.file.buffer);
    await processAndIndexDocument(document._id.toString(), text);
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('❌ Indexing error:', msg);
    await LegalDocument.findByIdAndUpdate(document._id, { status: 'failed', description: msg.slice(0, 500) });
  }
}

export async function getDocuments(req: Request, res: Response): Promise<void> {
  const { category, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const query: Record<string, any> = {};

  if (category) query.category = category;
  if (search) query.title = { $regex: search, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [documents, total] = await Promise.all([
    LegalDocument.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    LegalDocument.countDocuments(query),
  ]);

  res.json({ documents, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  const document = await LegalDocument.findById(req.params.id).populate('uploadedBy', 'name');
  if (!document) {
    res.status(404).json({ message: 'Document not found' });
    return;
  }
  res.json(document);
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  const document = await LegalDocument.findById(req.params.id);
  if (!document) {
    res.status(404).json({ message: 'Document not found' });
    return;
  }

  await cloudinary.uploader.destroy(document.cloudinaryPublicId, { resource_type: 'raw' });
  await deleteDocumentVectors(document._id.toString());
  await document.deleteOne();

  res.json({ message: 'Document deleted' });
}
