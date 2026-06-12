import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getStats, getUsers } from '../controllers/admin.controller';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);

export default router;
