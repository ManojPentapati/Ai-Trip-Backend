// Request timeout middleware
// Sends a 408 if the route handler takes longer than the specified ms

export const timeout = (ms = 30000) => (req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: `Request timed out after ${ms / 1000}s. Please try again.`
      });
    }
  }, ms);

  // Clear timer once response is sent
  res.on('finish',  () => clearTimeout(timer));
  res.on('close',   () => clearTimeout(timer));

  next();
};

// Specific timeout for GPT trip generation — 60 seconds
export const tripGenerationTimeout = timeout(60000);

// General API timeout — 30 seconds
export const generalTimeout = timeout(30000);