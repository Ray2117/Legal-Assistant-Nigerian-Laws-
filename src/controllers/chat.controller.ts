import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ChatSession from '../models/ChatSession';
import ChatMessage from '../models/ChatMessage';
import { queryRAG } from '../services/rag.service';

export async function createSession(req: AuthRequest, res: Response): Promise<void> {
  const session = await ChatSession.create({
    userId: req.user!.id,
    title: req.body.title || 'New Conversation',
  });
  res.status(201).json(session);
}

export async function getSessions(req: AuthRequest, res: Response): Promise<void> {
  const sessions = await ChatSession.find({ userId: req.user!.id }).sort({ updatedAt: -1 }).limit(50);
  res.json(sessions);
}

export async function getSession(req: AuthRequest, res: Response): Promise<void> {
  const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user!.id });
  if (!session) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }
  const messages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 });
  res.json({ session, messages });
}

export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  const { sessionId, content } = req.body;
  if (!sessionId || !content) {
    res.status(400).json({ message: 'sessionId and content are required' });
    return;
  }

  const session = await ChatSession.findOne({ _id: sessionId, userId: req.user!.id });
  if (!session) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }

  await ChatMessage.create({ sessionId, role: 'user', content });

  try {

  const timeoutMs = 45_000;
  const result = await Promise.race([
    queryRAG(content),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('RAG_TIMEOUT')), timeoutMs)
    ),
  ]);

  const assistantMessage = await ChatMessage.create({
    sessionId,
    role: 'assistant',
    content: result.answer,
    sources: result.sources,
  });

  if (session.title === 'New Conversation') {
    session.title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
    await session.save();
  } else {
    session.set('updatedAt', new Date());
    await session.save();
  }

    res.json({ message: assistantMessage, sources: result.sources });
  } catch (err: any) {
    console.error('sendMessage error:', err.message);
    const friendly =
      err.message === 'RAG_TIMEOUT'
        ? 'The AI took too long to respond. Please try again.'
        : 'An error occurred while processing your question. Please try again.';
    // Save the error as an assistant message so it shows in chat
    const errMsg = await ChatMessage.create({ sessionId, role: 'assistant', content: friendly, sources: [] });
    res.json({ message: errMsg, sources: [] });
  }
}

export async function deleteSession(req: AuthRequest, res: Response): Promise<void> {
  const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user!.id });
  if (!session) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }
  await ChatMessage.deleteMany({ sessionId: session._id });
  await session.deleteOne();
  res.json({ message: 'Session deleted' });
}
