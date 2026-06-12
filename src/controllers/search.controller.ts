import { Request, Response } from 'express';
import { generateEmbedding } from '../services/embedding.service';
import { getPineconeIndex } from '../config/pinecone';
import DocumentChunk from '../models/DocumentChunk';
import LegalDocument from '../models/LegalDocument';

export async function semanticSearch(req: Request, res: Response): Promise<void> {
  const { q, category, limit = '8' } = req.query as Record<string, string>;
  if (!q || q.trim().length < 3) {
    res.status(400).json({ message: 'Query must be at least 3 characters' });
    return;
  }

  const embedding = await generateEmbedding(q);
  const index = getPineconeIndex();

  const queryResult = await index.query({
    vector: embedding,
    topK: parseInt(limit) * 2,
    includeMetadata: true,
  });

  if (!queryResult.matches?.length) {
    res.json({ results: [] });
    return;
  }

  const chunkIds = queryResult.matches.map((m) => m.id);
  const chunks = await DocumentChunk.find({ pineconeId: { $in: chunkIds } });
  const chunkMap = new Map(chunks.map((c) => [c.pineconeId, c]));

  const docIds = [...new Set(chunks.map((c) => c.documentId.toString()))];
  const docQuery: Record<string, any> = { _id: { $in: docIds } };
  if (category) docQuery.category = category;

  const documents = await LegalDocument.find(docQuery);
  const docMap = new Map(documents.map((d) => [d._id.toString(), d]));

  const seen = new Set<string>();
  const results = [];

  for (const match of queryResult.matches) {
    const chunk = chunkMap.get(match.id);
    if (!chunk) continue;
    const doc = docMap.get(chunk.documentId.toString());
    if (!doc) continue;

    const docKey = doc._id.toString();
    if (seen.has(docKey)) continue;
    seen.add(docKey);

    results.push({
      documentId: doc._id,
      title: doc.title,
      category: doc.category,
      cloudinaryUrl: doc.cloudinaryUrl,
      excerpt: chunk.text.slice(0, 400) + (chunk.text.length > 400 ? '...' : ''),
      score: match.score,
    });

    if (results.length >= parseInt(limit)) break;
  }

  res.json({ results });
}
