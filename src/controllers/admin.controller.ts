import { Request, Response } from 'express';
import User from '../models/User';
import LegalDocument from '../models/LegalDocument';
import ChatSession from '../models/ChatSession';
import ChatMessage from '../models/ChatMessage';

export async function getStats(_req: Request, res: Response): Promise<void> {
  const [totalDocuments, totalUsers, totalSessions, totalMessages] = await Promise.all([
    LegalDocument.countDocuments(),
    User.countDocuments(),
    ChatSession.countDocuments(),
    ChatMessage.countDocuments({ role: 'user' }),
  ]);

  const documentsByCategory = await LegalDocument.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  res.json({ totalDocuments, totalUsers, totalSessions, totalMessages, documentsByCategory });
}

export async function getUsers(_req: Request, res: Response): Promise<void> {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(100);
  res.json(users);
}
