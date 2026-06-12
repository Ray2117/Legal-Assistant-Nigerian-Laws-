import { Request, Response } from 'express';
import LegalDocument from '../models/LegalDocument';
import DocumentChunk from '../models/DocumentChunk';
import { summarizeDocument, simplifyText } from '../services/rag.service';
import { extractTextFromBuffer } from '../services/document.service';

export async function summarizeByDocumentId(req: Request, res: Response): Promise<void> {
  const { documentId } = req.body;
  if (!documentId) {
    res.status(400).json({ message: 'documentId is required' });
    return;
  }

  const document = await LegalDocument.findById(documentId);
  if (!document || document.status !== 'ready') {
    res.status(404).json({ message: 'Document not found or not ready' });
    return;
  }

  const chunks = await DocumentChunk.find({ documentId }).sort({ chunkIndex: 1 }).limit(30);
  const fullText = chunks.map((c) => c.text).join('\n\n');

  const result = await summarizeDocument(fullText);
  res.json({ documentTitle: document.title, ...result });
}

export async function summarizeUploadedText(req: Request, res: Response): Promise<void> {
  const { text } = req.body;
  if (!text || text.trim().length < 100) {
    res.status(400).json({ message: 'Text must be at least 100 characters' });
    return;
  }

  const result = await summarizeDocument(text);
  res.json(result);
}

export async function summarizeUploadedPDF(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ message: 'No PDF file uploaded' });
    return;
  }
  const text = await extractTextFromBuffer(req.file.buffer);
  if (!text || text.trim().length < 50) {
    res.status(422).json({ message: 'Could not extract readable text from this PDF' });
    return;
  }
  const result = await summarizeDocument(text);
  res.json(result);
}

export async function simplify(req: Request, res: Response): Promise<void> {
  const { text } = req.body;
  if (!text || text.trim().length < 10) {
    res.status(400).json({ message: 'Text is required' });
    return;
  }

  const simplified = await simplifyText(text);
  res.json({ simplified });
}
