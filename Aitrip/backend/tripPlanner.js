import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const key = process.env.GEMINI_API_KEY;
if (!key) console.error('[ERROR] GEMINI_API_KEY not found in backend/.env');

const genAI = new GoogleGenerativeAI(key);
const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// ── Helpers ───────────────────────────────────────────────────────────────────
const budgetLabel = (b) => {
  if (!b) return b;
  if (b.startsWith('custom')) return b.replace('custom', 'a custom budget');
  return ({
    cheap:    'very low budget (under \u20b92,000/day)',
    budget:   'budget-friendly (\u20b92,000\u2013\u20b94,000/day)',
    moderate: 'moderate budget (\u20b94,000\u2013\u20b98,000/day)',
    luxury:   'luxury budget (\u20b98,000+/day)',
  })[b?.toLowerCase()] || b;
};

const companionLabel = (c) => ({
  single:  'a solo traveller',
  couple:  'a couple',
  family:  'a family with children',
  friends: 'a group of friends',
})[c?.toLowerCase()] || c;

export const generateTripPlan = async (req, res) => {
  try {
    const { destination, duration, budget, companions, country, interests, specificPlaces } = req.body;

    if (!destination || !duration || !budget || !companions || !country) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // ── Step 1: Get ML prediction ─────────────────────────────────────────────
    let mlPrediction      = null;
    let mlRecommendations = null;

    try {
      const mlResponse = await axios.post(
        'http://localhost:5000/predict-trip-satisfaction',
        { destination, duration: parseInt(duration), budget, companions, country },
        { timeout: 5000 }
      );
      if (mlResponse.data.success) {
        mlPrediction      = mlResponse.data.predicted_satisfaction;
        mlRecommendations = mlResponse.data.recommendations;
      }
    } catch (mlError) {
      console.warn('ML API unavailable:', mlError.message);
    }

    // ── Step 2: Build ML context ──────────────────────────────────────────────
    let mlContext = '';
    if (mlRecommendations) {
      mlContext += '\n\n--- ML MODEL DATA (incorporate these real recommendations) ---\n';

      const hotels = (mlRecommendations.accommodations || []).filter(
        h => !h.toLowerCase().includes('check tripadvisor')
      );
      if (hotels.length) mlContext += `HOTELS: ${hotels.slice(0,3).join(', ')}\n`;

      const restaurants = (mlRecommendations.restaurants || mlRecommendations.dining || []).filter(
        r => !r.toLowerCase().includes('try local')
      );
      if (restaurants.length) mlContext += `RESTAURANTS: ${restaurants.slice(0,3).join(', ')}\n`;

      const attractions = (mlRecommendations.attractions || []).filter(
        a => !a.toLowerCase().includes('visit local heritage')
      );
      if (attractions.length) mlContext += `ATTRACTIONS: ${attractions.slice(0,5).join(', ')}\n`;

      if (mlRecommendations.cuisines?.length)
        mlContext += `LOCAL CUISINES: ${mlRecommendations.cuisines.slice(0,4).join(', ')}\n`;

      const transport = mlRecommendations.transportation;
      if (transport) {
        const tInfo = typeof transport === 'string' ? transport : transport.info || '';
        if (tInfo && !tInfo.toLowerCase().includes('check local'))
          mlContext += `TRANSPORT: ${tInfo}\n`;
      }

      if (mlRecommendations.season_note)
        mlContext += `SEASON: ${mlRecommendations.season_note}\n`;

      if (mlPrediction)
        mlContext += `ML SCORE: ${mlPrediction}/10 — ${mlRecommendations.verdict || 'Recommended'}\n`;

      mlContext += '--- END ML DATA ---\n';
    }

    // ── Step 3: Build prompt ──────────────────────────────────────────────────
    const prompt = `You are an expert Indian travel planner with deep knowledge of local culture, food, transport and hidden gems.

Generate a detailed ${duration}-day trip itinerary for ${destination}, ${country}.
This trip is for ${companionLabel(companions)} with a ${budgetLabel(budget)}.
${specificPlaces && specificPlaces.length > 0 ? `
SPECIFIC PLACES TO VISIT — VERY IMPORTANT:
The traveller wants to visit ONLY these specific locations within ${destination}: ${specificPlaces.join(', ')}
- You MUST cover ALL of these places: ${specificPlaces.join(', ')}
- Plan the ${duration} days covering them in this exact order: ${specificPlaces.join(' → ')}
- Distribute days proportionally (roughly ${Math.ceil(parseInt(duration)/specificPlaces.length)} day(s) per location)
- Start each new city with a clear Day heading mentioning the city name
- Do NOT suggest other cities or regions outside this list
` : ''}
${mlContext}

STRICT FORMATTING RULES — follow exactly:
1. Start each day with: ## Day N: [Catchy Day Title]
2. Under each day use these sections with ### prefix:
   ### Morning
   ### Afternoon
   ### Evening
   ### Accommodation
   ### Transportation
3. Under each section use bullet points starting with -
4. Every bullet must be specific — include real place names, costs in INR, timing
5. Do NOT use vague phrases like "explore the city" or "visit local attractions"
6. End with a ## Local Tips section with 5 practical tips
7. After Local Tips, add a ## Alternative Places section with 8-10 extra places/activities that match the traveller's preferences. Format each as:
   - **[Place Name]** — [1-line description with entry fee/cost]. Category: [Food/Adventure/Nature/Culture/Shopping/Nightlife/Wellness]
   These are backup options the traveller can swap into the itinerary if they don't like certain suggestions.

CONTENT REQUIREMENTS:
- Morning: breakfast spot (dish name + cost) + 1-2 attractions with entry fees
- Afternoon: lunch recommendation (cuisine type + cost) + 1-2 activities
- Evening: dinner (specialty dish + cost) + evening activity
- Accommodation: specific hotel name with approximate cost per night in INR
- Transportation: specific mode with estimated cost in INR

PERSONALIZATION for ${companionLabel(companions)}:
${companions === 'couple'  ? '- Include romantic spots, sunset viewpoints, couple-friendly restaurants and mention couple packages at hotels' : ''}
${companions === 'family'  ? '- Include child-friendly activities, family restaurants, safe areas and mention family ticket prices' : ''}
${companions === 'friends' ? '- Include adventure activities, group-friendly restaurants, nightlife options and group discounts' : ''}
${companions === 'single'  ? '- Include solo-friendly hostels, group tour options, safe areas and solo traveller tips' : ''}

BUDGET GUIDANCE:
${budget === 'luxury'  ? '- Recommend 5-star hotels, fine dining, private transfers, premium experiences' : ''}
${budget === 'moderate' ? '- Recommend 3-4 star hotels, good restaurants, Ola/Uber, mix of paid and free attractions' : ''}
${budget === 'budget' || budget === 'cheap' ? '- Recommend budget hotels/hostels, local dhabas, public transport, free attractions' : ''}
${budget?.startsWith('custom') ? `- Strictly stay within the specified budget range throughout the itinerary\n- Suggest options that fit the exact budget - mix accommodation, food and activities accordingly` : ''}

${interests && interests.length > 0 ? `TRAVEL INTERESTS (focus the itinerary on these):
- The traveller is specifically interested in: ${interests.join(', ')}
- Prioritise activities and places that match these interests
${!interests.includes('religious') ? '- IMPORTANT: The traveller has NOT selected religious/spiritual interests. Do NOT include temples, churches, mosques, gurudwaras or any religious sites in the itinerary. Replace them with other attractions matching their interests.' : '- Include notable temples, spiritual sites and religious landmarks'}
${interests.includes('food') ? '- Include extra food recommendations, street food tours, and cooking experiences' : ''}
${interests.includes('adventure') ? '- Include adventure sports, trekking, water sports and adrenaline activities' : ''}
${interests.includes('nightlife') ? '- Include bars, clubs, live music venues and night markets' : ''}
${interests.includes('photography') ? '- Mention photogenic spots, golden hour timings and scenic viewpoints' : ''}
${interests.includes('wellness') ? '- Include spa treatments, yoga sessions and wellness retreats' : ''}
${interests.includes('shopping') ? '- Include local markets, shopping streets and souvenir recommendations' : ''}
` : ''}
Write the complete ${duration}-day itinerary now followed by Local Tips and Alternative Places. Be specific, practical and engaging.`;

    // ── Step 4: Call Gemini ───────────────────────────────────────────────────
    const result = await model.generateContent(prompt);
    let tripPlan = result.response.text();

    if (!tripPlan || typeof tripPlan !== 'string' || tripPlan.trim().length < 100) {
      tripPlan = 'Trip plan could not be generated. Please try again.';
    }

    const dayCount = tripPlan.split('\n').filter(l => /^##\s*Day\s+\d+/i.test(l)).length;

    if (res.headersSent) return;

    res.json({
      success:         true,
      tripPlan:        tripPlan,
      mlPrediction:    mlPrediction,
      recommendations: mlRecommendations,
      metadata:        { destination, duration, budget, companions, country, interests: interests || [] }
    });

  } catch (error) {
    console.error('Error generating trip plan:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate trip plan. Please try again.' });
    }
  }
};