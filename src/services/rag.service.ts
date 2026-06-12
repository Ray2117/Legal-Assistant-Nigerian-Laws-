import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding } from './embedding.service';
import { getPineconeIndex } from '../config/pinecone';
import DocumentChunk from '../models/DocumentChunk';
import LegalDocument from '../models/LegalDocument';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

export interface RAGSource {
  documentId: string;
  documentTitle: string;
  category: string;
  excerpt: string;
  chunkId: string;
}

export interface RAGResult {
  answer: string;
  sources: RAGSource[];
}

const SYSTEM_PROMPT = `You are a helpful Nigerian legal assistant. Your job is to explain Nigerian laws clearly to ordinary people using the legal document excerpts provided to you.

Instructions:
- You MUST answer the question using the provided context excerpts. The excerpts are real Nigerian legal documents.
- Always cite the specific law, section, or chapter your answer is based on.
- Explain in plain, simple English that non-lawyers can understand.
- Use bullet points and headings to structure longer answers.
- You are allowed to synthesize and explain information from the excerpts — do not refuse to answer if the excerpts contain relevant information.
- Only say you cannot answer if the excerpts contain absolutely no relevant information about the topic.
- Always end with: "This is for educational purposes only. Please consult a qualified Nigerian lawyer for specific legal advice."`;

export async function queryRAG(question: string, topK = 8): Promise<RAGResult> {
  const queryEmbedding = await generateEmbedding(question);

  const index = getPineconeIndex();
  const queryResult = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  if (!queryResult.matches || queryResult.matches.length === 0) {
    return {
      answer:
        "I don't have enough information in my legal database to answer this question accurately. Please consult a qualified Nigerian lawyer.",
      sources: [],
    };
  }

  const chunkIds = queryResult.matches.map((m) => m.id);
  const chunks = await DocumentChunk.find({ pineconeId: { $in: chunkIds } });
  const chunkMap = new Map(chunks.map((c) => [c.pineconeId, c]));

  const docIds = [...new Set(chunks.map((c) => c.documentId.toString()))];
  const documents = await LegalDocument.find({ _id: { $in: docIds } });
  const docMap = new Map(documents.map((d) => [d._id.toString(), d]));

  const sources: RAGSource[] = [];
  const contextParts: string[] = [];

  for (const match of queryResult.matches) {
    const chunk = chunkMap.get(match.id);
    if (!chunk) continue;
    const doc = docMap.get(chunk.documentId.toString());
    if (!doc) continue;

    contextParts.push(`[Source: ${doc.title} (${doc.category})]\n${chunk.text}`);
    sources.push({
      documentId: doc._id.toString(),
      documentTitle: doc.title,
      category: doc.category,
      excerpt: chunk.text.slice(0, 300) + (chunk.text.length > 300 ? '...' : ''),
      chunkId: chunk._id.toString(),
    });
  }

  const context = contextParts.join('\n\n---\n\n');
  const userMessage = `Here are excerpts from Nigerian legal documents that are relevant to the question below. Use these excerpts to answer the question.

=== LEGAL DOCUMENT EXCERPTS ===
${context}
=== END OF EXCERPTS ===

Question: ${question}

Answer based on the excerpts above:`;

  const model = getGenAI().getGenerativeModel({
    model: 'gemini-flash-latest',
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(userMessage);
  const answer = result.response.text();

  return { answer, sources };
}

export async function summarizeDocument(text: string): Promise<{
  summary: string;
  keyPoints: string[];
  rights: string[];
  obligations: string[];
}> {
  const MAX_CHARS = 12000;
  const truncated =
    text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '\n\n[Document truncated for processing]' : text;

  const model = getGenAI().getGenerativeModel({
    model: 'gemini-flash-latest',
    systemInstruction:
      'You are a Nigerian legal document analyst. Summarize legal documents clearly for non-lawyers. Always respond with valid JSON only — no markdown, no code fences.',
  });

  const result = await model.generateContent(
    `Analyze this Nigerian legal document and respond with JSON in this exact format:
{
  "summary": "2-3 paragraph plain English summary",
  "keyPoints": ["key point 1", "key point 2", ...],
  "rights": ["right 1", "right 2", ...],
  "obligations": ["obligation 1", "obligation 2", ...]
}

Document:
${truncated}`,
  );

  const raw = result.response.text();
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { summary: raw, keyPoints: [], rights: [], obligations: [] };
  } catch {
    return { summary: raw, keyPoints: [], rights: [], obligations: [] };
  }
}

export async function simplifyText(legalText: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-flash-latest',
    systemInstruction:
      'You simplify complex Nigerian legal language into plain, easy-to-understand English. Keep the meaning accurate.',
  });

  const result = await model.generateContent(`Simplify this legal text into plain English:\n\n${legalText}`);
  return result.response.text();
}
