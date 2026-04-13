// Simple in-memory rate limiter — no Redis needed for dev
const rateLimitMap = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.start > 60 * 60 * 1000) rateLimitMap.delete(key);
  }
}, 10 * 60 * 1000);

export const rateLimit = (maxRequests, windowMs, message) => (req, res, next) => {
  const key = `${req.ip || 'unknown'}_${req.path}`;
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, start: now });
    return next();
  }

  const record = rateLimitMap.get(key);

  // Reset window if expired
  if (now - record.start > windowMs) {
    rateLimitMap.set(key, { count: 1, start: now });
    return next();
  }

  record.count++;

  if (record.count > maxRequests) {
    const retryAfter = Math.ceil((record.start + windowMs - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      success: false,
      error: message || `Too many requests. Please wait ${retryAfter}s before trying again.`,
      retryAfter
    });
  }

  next();
};

// Pre-configured limiters
// NOTE: Higher limits for development — reduce for production
export const tripGenerationLimiter = rateLimit(
  50, 15 * 60 * 1000,
  'Too many trip generation requests. Please wait before trying again.'
);

export const generalLimiter = rateLimit(
  500, 15 * 60 * 1000,
  'Too many requests. Please slow down.'
);

export const authLimiter = rateLimit(
  10, 15 * 60 * 1000,
  'Too many authentication attempts. Please wait 15 minutes.'
);