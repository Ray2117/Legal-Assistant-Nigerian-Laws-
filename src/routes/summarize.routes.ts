import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadPDF } from '../middleware/upload';
import { summarizeByDocumentId, summarizeUploadedText, summarizeUploadedPDF, simplify } from '../controllers/summarize.controller';

const router = Router();

router.post('/document', authenticate, summarizeByDocumentId);
router.post('/text', authenticate, summarizeUploadedText);
router.post('/pdf', authenticate, uploadPDF.single('file'), summarizeUploadedPDF);
router.post('/simplify', authenticate, simplify);

export default router;
