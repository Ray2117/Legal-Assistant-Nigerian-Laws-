import { Router } from 'express';
import { semanticSearch } from '../controllers/search.controller';

const router = Router();

router.get('/', semanticSearch);

export default router;
