# AI Trip Planner — Full Project Walkthrough

> **Vignan University · Final Year Project · B.Tech CSE Data Science**
> A hybrid AI-powered travel planner using real-world tourism datasets and Gemini AI.

---

## 🗺️ What Makes This Project Unique

This project uses a **hybrid approach** combining:
1. **Real Data** from 6 Kaggle datasets (1M+ records) for authentic recommendations
2. **Gemini AI** for generating personalized itineraries
3. **User Ratings** for continuous improvement

### Data Sources (1M+ Records)
| Source | Records | Purpose |
|--------|---------|---------|
| 🏨 TBO Hotels | 1,010,033 | Hotel recommendations |
| 🍽️ Zomato | 123,657 | Restaurant data |
| 🎯 Tourist Places | 325 | Attractions |
| 📊 Cultural Tourism | 5,000 | Satisfaction data |
| 🚂 Indian Railways | 9,000 | Transport info |

---

## Tech Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + Vite 7 | SPA with JSX components |
| **Styling** | Vanilla CSS (per-component) | Dark-themed, glassmorphism UI |
| **Backend** | Express.js (Node 20) | REST API on port 3001 |
| **ML API** | Flask (Python) | Recommendations on port 5000 |
| **AI Generation** | Google Gemini (`gemini-2.5-flash-lite`) | Day-by-day itinerary generation |
| **Auth & DB** | Supabase (PostgreSQL + Auth) | User auth, profiles, trip storage |
| **Auth Provider** | Google OAuth + Email/Password | Via Supabase Auth |

---

## Architecture Diagram

```mermaid
graph TB
    subgraph User ["User (Browser :5173)"]
        Form[Trip Planner Form]
        Results[AI Insights + Itinerary]
    end

    subgraph Express ["Express Backend (:3001)"]
        Route["POST /generate-trip"]
        Middleware[Rate Limit · Validate]
    end

    subgraph Flask ["ML API (:5000)"]
        ML[trip_recommendation_model.pkl]
        Hotels[Hotel Lookup]
        Restaurants[Restaurant Lookup]
        Attractions[Attraction Lookup]
    end

    subgraph Gemini ["Gemini AI"]
        Gen[2.5 Flash Lite]
    end

    subgraph Data ["Kaggle Datasets (1M+ records)"]
        TBO[TBO Hotels 1M+]
        Zomato[Zomato 123K]
        Places[Tourist Places 325]
    end

    subgraph Supabase ["Supabase"]
        Auth[Auth]
        DB[(PostgreSQL)]
    end

    Form --> Route
    Route --> ML
    ML --> Hotels
    ML --> Restaurants  
    ML --> Attractions
    Hotels -.-> TBO
    Restaurants -.-> Zomato
    Attractions -.-> Places
    Route --> Gen
    Results <- Route
    Form -->|Save| Auth
    Auth --> DB
```

### Request Flow
1. User submits form (destination, duration, budget, companions)
2. Express routes to ML API for real recommendations
3. ML returns hotels, restaurants, attractions from datasets
4. Gemini receives real data + generates itinerary
5. User sees complete trip plan + recommendations

---

## Database Schema (Supabase)

### `profiles` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | References `auth.users(id)` |
| `email` | VARCHAR(255) | |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `avatar_url` | TEXT | |
| `avatar_color` | TEXT | Hex color for UI avatar |
| `default_budget` | TEXT | User preference |
| `default_companions` | TEXT | User preference |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `trips` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK) | References `auth.users(id)` |
| `destination` | TEXT | e.g. "Goa" |
| `duration` | TEXT | Number of days |
| `budget` | TEXT | cheap/moderate/luxury |
| `companions` | TEXT | single/couple/family/friends |
| `country` | TEXT | e.g. "India" |
| `trip_plan` | TEXT | Full AI-generated itinerary |
| `ml_recommendations` | JSONB | Hotels, restaurants, attractions |
| `is_favorite` | BOOLEAN | Default: false |
| `created_at` | TIMESTAMPTZ | |

> [!IMPORTANT]
> Row Level Security (RLS) is enabled on both tables — users can only access their own data.

---

## Frontend Components

### Routing ([App.jsx](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/App.jsx))
- `/login` → Login (redirects to dashboard if authenticated)
- `/signup` → Signup
- `/dashboard` → Dashboard (protected)
- `/forgot-password` → ForgotPassword
- `/reset-password` → ResetPassword
- `/terms`, `/privacy` → TermsAndPrivacy
- `*` → Redirects based on auth state

### Component Breakdown

| Component | File | Purpose |
|-----------|------|---------|
| [Login](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/components/Login.jsx) | `Login.jsx` (226 lines) | Email/password + Google OAuth login |
| [Signup](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/components/Signup.jsx) | `Signup.jsx` (315 lines) | Registration with password strength indicator |
| [Dashboard](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/components/Dashboard.jsx) | `Dashboard.jsx` (668 lines) | Main hub — stats, recent/favorite trips, quick actions |
| [TripPlannerModal](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/components/TripPlannerModal.jsx) | `TripPlannerModal.jsx` (322 lines) | Trip input form with progress indicator |
| [TripResultsWindow](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/components/TripResultsWindow.jsx) | `TripResultsWindow.jsx` (498 lines) | Day-by-day itinerary viewer with tabs (Itinerary/Recommendations/Tips) |
| [TripHistory](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/components/TripHistory.jsx) | `TripHistory.jsx` (351 lines) | All past trips with search, filter, pagination |
| [Profile](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/components/Profile.jsx) | `Profile.jsx` (184 lines) | Edit name, avatar color, email |
| [Settings](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/components/Settings.jsx) | `Settings.jsx` (333 lines) | Appearance (dark/light), Security, Preferences, Danger Zone |
| [TermsAndPrivacy](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/src/components/TermsAndPrivacy.jsx) | `TermsAndPrivacy.jsx` (154 lines) | Legal pages |

---

## Backend API Endpoints

### Trip Generation
| Method | Endpoint | Middleware | Handler |
|--------|----------|-----------|---------|
| `POST` | `/api/generate-trip` | Rate limit (50/15min) · 60s timeout · Input validation | `generateTripPlan()` |

**Flow:** Receives `{destination, duration, budget, companions, country}` → calls ML API for satisfaction score → builds enriched prompt with ML data → calls Gemini AI → returns full itinerary + ML metadata.

### Trip History (all require JWT auth)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/save-trip` | Save a generated trip |
| `GET` | `/api/trip-history` | Get all user trips |
| `GET` | `/api/trip-history/:tripId` | Get specific trip |
| `DELETE` | `/api/trip-history/:tripId` | Delete a trip |
| `POST` | `/api/trip-history/:tripId/favorite` | Add to favorites |
| `DELETE` | `/api/trip-history/:tripId/favorite` | Remove from favorites |
| `GET` | `/api/dashboard-stats` | Aggregate stats |
| `GET` | `/api/recent-trips` | Recent trips list |
| `GET` | `/api/favorite-trips` | Favorite trips list |
| `GET` | `/health` | Health check (includes ML status) |

### Authentication
JWT tokens are decoded locally from the `Authorization: Bearer <token>` header. The backend decodes the Supabase JWT payload to extract `user.id` and checks expiry — no network call to Supabase for auth verification.

---

## ML Model Details

### [TripRecommendationModel](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/backend/models/trip_recommendation_model.py)

- **Purpose:** Provides real-world recommendations from 6 Kaggle datasets
- **Model file:** `trip_recommendation_model.pkl` (~1.5 MB in backend/models/)
- **Loaded via:** `joblib`

### What it provides (Real Data):
1. **Hotels:** From TBO Hotels dataset (1M+ hotels)
2. **Restaurants:** From Zomato dataset (123K+ restaurants)
3. **Attractions:** From Tourist Places dataset (325 verified places)
4. **Cuisines:** Local cuisine recommendations
5. **Transport:** Transport info by state

### Knowledge Base:
- **City → State mapping:** 50+ Indian cities
- **Lookups:** Hotels by city+budget, restaurants by city+budget, attractions by state+companion type

### Flask Endpoints (port 5000):
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Model status |
| `POST` | `/predict-trip-satisfaction` | Recommendations + prediction |

---

## Backend Middleware

| Middleware | File | Purpose |
|-----------|------|---------|
| [Rate Limiter](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/backend/middleware/Ratelimit.js) | `Ratelimit.js` | In-memory rate limiting (no Redis) |
| [Timeout](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/backend/middleware/Timeout.js) | `Timeout.js` | 30s general, 60s for trip generation |
| [Logger](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/backend/middleware/logger.js) | `logger.js` | File-based logging (`logs/app.log`, `logs/error.log`) |
| [Validate](file:///c:/Users/Dell/Downloads/Ai-Based%20Trip%20Planning/Aitrip/backend/middleware/validate.js) | `validate.js` | Input sanitization + validation |

---

## Key Features

- ✅ **AI Itinerary Generation** — Gemini 2.5 Flash Lite generates day-by-day plans
- ✅ **Real Recommendations** — Hotels, restaurants, attractions from real datasets
- ✅ **User Ratings** — Users rate trips 1-5 stars (feedback collection)
- ✅ **Google OAuth + Email Auth** — Via Supabase
- ✅ **Trip History** — Save, search, filter, paginate, delete trips
- ✅ **Favorites System** — Star trips for quick access
- ✅ **PDF Export** — Download trip plans as PDF (jsPDF)
- ✅ **Copy to Clipboard** — One-click copy of itinerary text
- ✅ **Dark/Light Mode** — Persisted in localStorage
- ✅ **Profile Management** — Name, avatar color, email updates
- ✅ **Trip Preferences** — Default budget & companions saved to profile
- ✅ **Weather Widget** — Weather forecast for destination
- ✅ **Cost Estimator** — Trip expense calculator
- ✅ **Responsive Design** — Mobile-friendly with breakpoints
- ✅ **Security** — Helmet, CORS, RLS, JWT auth, input sanitization, rate limiting

---

## How to Run

```bash
# Terminal 1: Frontend (Vite dev server)
cd Aitrip
npm run dev          # → http://localhost:5173

# Terminal 2: Backend (Express API)
npm run backend      # → http://localhost:3001

# Terminal 3: ML API (Flask)
npm run ml-api       # → http://localhost:5000

# Or run all three at once:
npm run dev:fullstack
```

---

## File Statistics

| Category | Files | ~Lines |
|----------|-------|--------|
| React Components (JSX) | 10 | ~3,100 |
| Component CSS | 10 | ~1,400+ (by size) |
| Backend JS | 9 | ~1,050 |
| Python (ML) | 2 | ~470 |
| Config | 6 | ~120 |
| **Total source** | **~37** | **~6,100+** |
