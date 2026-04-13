import express from 'express';
import { generateTripPlan }    from '../tripPlanner.js';
import { validateTripInput }   from '../middleware/validate.js';
import { tripGenerationLimiter } from '../middleware/Ratelimit.js';
import { tripGenerationTimeout } from '../middleware/Timeout.js';

const router = express.Router();

// POST /api/generate-trip
// Rate limited to 5 per 15 min, 60s timeout, input validated
router.post(
  '/generate-trip',
  tripGenerationLimiter,
  tripGenerationTimeout,
  validateTripInput,
  generateTripPlan
);

export default router;