import express from 'express';
import {
  saveTripToHistory,
  getUserTripHistory,
  deleteTripFromHistory,
  getTripById,
  addTripToFavorites,
  removeTripFromFavorites,
  getUserFavoriteTrips,
  getUserRecentTrips,
  getDashboardStats
} from '../tripHistory.js';
import { supabase }              from '../supabaseClient.backend.js';
import { validateSaveTripInput, validateTripId } from '../middleware/validate.js';
import { logger }                from '../middleware/logger.js';

const router = express.Router();

// ── Helper: extract token from request ──
const getToken = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
};

// ── Auth middleware — decode JWT locally (no network call) ──
const authenticateToken = (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  try {
    // Decode JWT payload without verifying signature (Supabase already verified it)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ success: false, error: 'Invalid token format.' });
    }

    // Base64 decode the payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    // Check expiry
    if (!payload.sub || !payload.exp) {
      return res.status(401).json({ success: false, error: 'Invalid token payload.' });
    }

    if (Date.now() / 1000 > payload.exp) {
      return res.status(401).json({ success: false, error: 'Token has expired. Please sign in again.' });
    }

    req.user  = { userId: payload.sub };
    req.token = token;
    next();
  } catch (err) {
    logger.error('Auth error', { message: err.message });
    return res.status(401).json({ success: false, error: 'Authentication failed.' });
  }
};

// ── Routes ──

// Save trip to history
router.post('/save-trip', authenticateToken, validateSaveTripInput, async (req, res) => {
  try {
    const { destination, duration, budget, companions, tripPlan, country, mlPrediction, mlRecommendations } = req.body;
    const result = await saveTripToHistory(req.user.userId, {
      destination, duration, budget, companions, country, tripPlan,
      mlPrediction: mlPrediction || null,
      mlRecommendations: mlRecommendations || null,
    }, req.token);
    res.json(result);
  } catch (err) {
    logger.error('save-trip error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to save trip. Please try again.' });
  }
});

// Get trip history
router.get('/trip-history', authenticateToken, async (req, res) => {
  try {
    const result = await getUserTripHistory(req.user.userId, req.token);
    res.json(result);
  } catch (err) {
    logger.error('trip-history error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch trip history.' });
  }
});

// Get specific trip
router.get('/trip-history/:tripId', authenticateToken, validateTripId, async (req, res) => {
  try {
    const result = await getTripById(req.user.userId, req.params.tripId, req.token);
    res.json(result);
  } catch (err) {
    logger.error('get-trip error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch trip.' });
  }
});

// Delete trip
router.delete('/trip-history/:tripId', authenticateToken, validateTripId, async (req, res) => {
  try {
    const result = await deleteTripFromHistory(req.user.userId, req.params.tripId, req.token);
    res.json(result);
  } catch (err) {
    logger.error('delete-trip error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to delete trip.' });
  }
});

// Add to favourites
router.post('/trip-history/:tripId/favorite', authenticateToken, validateTripId, async (req, res) => {
  try {
    const result = await addTripToFavorites(req.user.userId, req.params.tripId, req.token);
    res.json(result);
  } catch (err) {
    logger.error('add-favourite error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to add to favourites.' });
  }
});

// Remove from favourites
router.delete('/trip-history/:tripId/favorite', authenticateToken, validateTripId, async (req, res) => {
  try {
    const result = await removeTripFromFavorites(req.user.userId, req.params.tripId, req.token);
    res.json(result);
  } catch (err) {
    logger.error('remove-favourite error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to remove from favourites.' });
  }
});

// Dashboard stats
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const result = await getDashboardStats(req.user.userId, req.token);
    res.json(result);
  } catch (err) {
    logger.error('dashboard-stats error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats.' });
  }
});

// Recent trips
router.get('/recent-trips', authenticateToken, async (req, res) => {
  try {
    const result = await getUserRecentTrips(req.user.userId, req.token);
    res.json(result);
  } catch (err) {
    logger.error('recent-trips error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch recent trips.' });
  }
});

// Favourite trips
router.get('/favorite-trips', authenticateToken, async (req, res) => {
  try {
    const result = await getUserFavoriteTrips(req.user.userId, req.token);
    res.json(result);
  } catch (err) {
    logger.error('favorite-trips error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch favourite trips.' });
  }
});

// Generate shareable link (public, no auth required)
router.get('/share/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    if (!tripId || tripId.length > 100) {
      return res.status(400).json({ success: false, error: 'Invalid trip ID.' });
    }
    const result = await getTripById(null, tripId, null, true);
    res.json(result);
  } catch (err) {
    logger.error('share-trip error', { message: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch shared trip.' });
  }
});

export default router;