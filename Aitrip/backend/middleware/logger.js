import { createWriteStream, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure logs directory exists
const logsDir = join(__dirname, '../logs');
try { mkdirSync(logsDir, { recursive: true }); } catch {}

// Simple log levels
const LEVELS = { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO', HTTP: 'HTTP' };

const logStream = createWriteStream(join(logsDir, 'app.log'), { flags: 'a' });
const errorStream = createWriteStream(join(logsDir, 'error.log'), { flags: 'a' });

const formatLog = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  return JSON.stringify(entry);
};

export const logger = {
  info:  (msg, meta) => { const l = formatLog(LEVELS.INFO,  msg, meta); console.log(`[INFO]  ${msg}`);  logStream.write(l + '\n'); },
  warn:  (msg, meta) => { const l = formatLog(LEVELS.WARN,  msg, meta); console.warn(`[WARN]  ${msg}`); logStream.write(l + '\n'); },
  error: (msg, meta) => { const l = formatLog(LEVELS.ERROR, msg, meta); console.error(`[ERROR] ${msg}`); errorStream.write(l + '\n'); logStream.write(l + '\n'); },
  http:  (msg, meta) => { const l = formatLog(LEVELS.HTTP,  msg, meta); logStream.write(l + '\n'); },
};

// HTTP request logger middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method:     req.method,
      url:        req.originalUrl,
      status:     res.statusCode,
      duration:   `${duration}ms`,
      ip:         req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent:  req.headers['user-agent']?.substring(0, 80),
    };

    const msg = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (res.statusCode >= 500) logger.error(msg, log);
    else if (res.statusCode >= 400) logger.warn(msg, log);
    else logger.http(msg, log);

    // Also log to console in dev
    const color = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}${msg}\x1b[0m`);
  });

  next();
};