import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { uploadPDF } from '../middleware/upload';
import { uploadDocument, getDocuments, getDocument, deleteDocument } from '../controllers/document.controller';

const router = Router();

router.get('/', getDocuments);
router.get('/:id', getDocument);
router.post('/', authenticate, requireAdmin, uploadPDF.single('file'), uploadDocument);
router.delete('/:id', authenticate, requireAdmin, deleteDocument);

export default router;
