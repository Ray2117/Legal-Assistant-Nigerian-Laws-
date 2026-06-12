import { GoogleGenerativeAI } from '@google/generative-ai';

// 768 dims — fits Pinecone free tier (max 2048) while keeping quality
const OUTPUT_DIMENSIONS = 768;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-embedding-2' });
  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text: text.trim() }] },
    taskType: 'RETRIEVAL_QUERY',
    // @ts-ignore — outputDimensionality is supported but not yet in the TS types
    outputDimensionality: OUTPUT_DIMENSIONS,
  } as any);
  return result.embedding.values;
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-embedding-2' });
  const embeddings: number[][] = [];
  for (const text of texts) {
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text: text.trim() }] },
      taskType: 'RETRIEVAL_DOCUMENT',
      // @ts-ignore — outputDimensionality is supported but not yet in the TS types
      outputDimensionality: OUTPUT_DIMENSIONS,
    } as any);
    embeddings.push(result.embedding.values);
  }
  return embeddings;
}
