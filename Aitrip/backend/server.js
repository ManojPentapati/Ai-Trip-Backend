import express        from 'express';
import cors           from 'cors';
import helmet         from 'helmet';
import compression    from 'compression';
import path           from 'path';
import { fileURLToPath } from 'url';
import dotenv         from 'dotenv';
import axios          from 'axios';

dotenv.config();

import { requestLogger, logger } from './middleware/logger.js';
import { sanitizeBody }          from './middleware/validate.js';
import { generalLimiter }        from './middleware/rateLimit.js';
import { generalTimeout } from './middleware/timeout.js';
import tripPlannerRoutes         from './routes/tripPlannerRoutes.js';
import tripHistoryRoutes         from './routes/tripHistoryRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const allowedOrigins = [
  process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  'http://localhost:5174', 'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(requestLogger);
app.use(sanitizeBody);
app.use('/api', generalLimiter);
app.use('/api', generalTimeout);

app.use('/api/v1', tripPlannerRoutes);
app.use('/api/v1', tripHistoryRoutes);
app.use('/api', tripPlannerRoutes);
app.use('/api', tripHistoryRoutes);

app.get('/health', async (req, res) => {
  let mlStatus = 'unknown'; let mlLatency = null;
  try {
    const start = Date.now();
    await axios.get('http://localhost:5000/health', { timeout: 3000 });
    mlLatency = Date.now() - start; mlStatus = 'healthy';
  } catch { mlStatus = 'unavailable'; }
  const status = {
    status: 'OK', timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    services: {
      express: { status: 'healthy' },
      ml_api:  { status: mlStatus, latency: mlLatency ? `${mlLatency}ms` : null },
    },
    environment: process.env.NODE_ENV || 'development',
  };
  res.status(mlStatus === 'healthy' ? 200 : 207).json(status);
});

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, url: req.originalUrl });
  if (err.message?.includes('CORS')) return res.status(403).json({ success: false, error: 'CORS policy violation.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ success: false, error: 'Request body too large.' });
  res.status(500).json({ success: false, error: 'Internal server error. Please try again.' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health\n`);
});