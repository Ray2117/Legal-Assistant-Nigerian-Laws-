import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import searchRoutes from './routes/search.routes';
import summarizeRoutes from './routes/summarize.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

/* ── CORS — manual middleware, works reliably with Express 5 ── */
const ALLOWED_ORIGINS = [
  'https://legal-assistant-three-xi.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string | undefined;

  /* if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } */

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
  res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight 24h

  // End OPTIONS preflight immediately — no further middleware needed
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many requests, slow down' });

app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/summarize', chatLimiter, summarizeRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;
