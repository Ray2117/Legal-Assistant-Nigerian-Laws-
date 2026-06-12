import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createSession, getSessions, getSession, sendMessage, deleteSession } from '../controllers/chat.controller';

const router = Router();

router.use(authenticate);

router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);
router.delete('/sessions/:id', deleteSession);
router.post('/message', sendMessage);

export default router;
