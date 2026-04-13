// Allowed values
const VALID_BUDGETS    = ['cheap', 'budget', 'moderate', 'luxury'];
const VALID_COMPANIONS = ['single', 'couple', 'family', 'friends'];

// Sanitize a string — strip HTML, dangerous chars, trim, limit length
export const sanitizeString = (val, maxLen = 500) => {
  if (typeof val !== 'string') return val;
  return val
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`;\\]/g, '')
    .trim()
    .substring(0, maxLen);
};

// Fields that should NOT be sanitized/truncated (large content)
const SKIP_SANITIZE = ['tripPlan', 'mlRecommendations', 'trip_plan', 'ml_recommendations'];

// Sanitize entire request body — skip large content fields
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string' && !SKIP_SANITIZE.includes(key)) {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }
  next();
};

// Validate generate-trip request
export const validateTripInput = (req, res, next) => {
  const { destination, duration, budget, companions, country } = req.body;

  const errors = [];

  if (!destination || destination.length < 2 || destination.length > 100)
    errors.push('Destination must be between 2 and 100 characters.');

  if (!country || country.length < 2 || country.length > 100)
    errors.push('Country must be between 2 and 100 characters.');

  const parsedDuration = parseInt(duration);
  if (isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > 30)
    errors.push('Duration must be between 1 and 30 days.');

  if (!budget || !VALID_BUDGETS.includes(budget.toLowerCase()))
    errors.push(`Budget must be one of: ${VALID_BUDGETS.join(', ')}.`);

  if (!companions || !VALID_COMPANIONS.includes(companions.toLowerCase()))
    errors.push(`Companions must be one of: ${VALID_COMPANIONS.join(', ')}.`);

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  // Attach parsed duration to body
  req.body.duration = parsedDuration;
  next();
};

// Validate save-trip request
export const validateSaveTripInput = (req, res, next) => {
  const { destination, duration, budget, companions, tripPlan, country } = req.body;
  const errors = [];

  if (!destination) errors.push('Destination is required.');
  if (!duration)    errors.push('Duration is required.');
  if (!budget)      errors.push('Budget is required.');
  if (!companions)  errors.push('Companions is required.');
  if (!country)     errors.push('Country is required.');
  if (!tripPlan)    errors.push('Trip plan is required.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }
  next();
};

// Validate trip ID param
export const validateTripId = (req, res, next) => {
  const { tripId } = req.params;
  if (!tripId || typeof tripId !== 'string' || tripId.length > 100) {
    return res.status(400).json({ success: false, error: 'Invalid trip ID.' });
  }
  next();
};