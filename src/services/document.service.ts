// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import { chunkText } from './chunking.service';
import { generateBatchEmbeddings } from './embedding.service';
import { getPineconeIndex } from '../config/pinecone';
import DocumentChunk from '../models/DocumentChunk';
import LegalDocument from '../models/LegalDocument';
import mongoose from 'mongoose';

const BATCH_SIZE = 5; // smaller batches to stay within Gemini free-tier rate limits

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function processAndIndexDocument(
  documentId: string,
  text: string
): Promise<number> {
  const chunks = chunkText(text);
  const index = getPineconeIndex();
  let totalIndexed = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await generateBatchEmbeddings(batch);

    const pineconeVectors = batch.map((chunkText, j) => ({
      id: `${documentId}_chunk_${i + j}`,
      values: embeddings[j],
      metadata: { documentId, chunkIndex: i + j, text: chunkText.slice(0, 1000) },
    }));

    await index.upsert({ records: pineconeVectors });

    const dbChunks = batch.map((chunkText, j) =>
      new DocumentChunk({
        documentId: new mongoose.Types.ObjectId(documentId),
        chunkIndex: i + j,
        text: chunkText,
        pineconeId: `${documentId}_chunk_${i + j}`,
      })
    );

    await DocumentChunk.insertMany(dbChunks);
    totalIndexed += batch.length;
    console.log(`  Indexed batch ${Math.floor(i / BATCH_SIZE) + 1} — ${totalIndexed}/${chunks.length} chunks`);

    // Respect Gemini free-tier rate limit (15 RPM = ~1 per 4s for embeddings)
    if (i + BATCH_SIZE < chunks.length) await sleep(4000);
  }

  await LegalDocument.findByIdAndUpdate(documentId, {
    chunksCount: totalIndexed,
    status: 'ready',
  });

  return totalIndexed;
}

export async function deleteDocumentVectors(documentId: string): Promise<void> {
  const chunks = await DocumentChunk.find({ documentId });
  if (chunks.length === 0) return;

  const index = getPineconeIndex();
  const ids = chunks.map((c) => c.pineconeId);

  for (let i = 0; i < ids.length; i += 100) {
    await index.deleteMany(ids.slice(i, i + 100));
  }

  await DocumentChunk.deleteMany({ documentId });
}
