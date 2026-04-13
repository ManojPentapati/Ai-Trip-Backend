const weatherCache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000;

const getCacheKey = (destination) => destination.toLowerCase().trim();

export const getCachedWeather = (destination) => {
  const key = getCacheKey(destination);
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

export const setCachedWeather = (destination, data) => {
  const key = getCacheKey(destination);
  weatherCache.set(key, { data, timestamp: Date.now() });
};

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of weatherCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      weatherCache.delete(key);
    }
  }
}, 60 * 60 * 1000);