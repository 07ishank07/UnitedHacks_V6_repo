# Parallel - Decision Making Social Platform

A modern, responsive PWA where users post binary choices, vote on others' decisions, and compete on AI-powered leaderboards.

## Features

- **Decision Posting**: Users can post their dilemmas and get AI predictions
- **Social Voting**: Community votes on decisions (Do It vs Don't Do It)
- **AI Predictions**: Gemini AI provides good, bad, and weird outcomes for each decision
- **Personality Analysis**: AI analyzes user patterns to provide personality insights
- **Leaderboard**: Compete based on decision activity
- **PWA**: Installable progressive web app with offline capabilities

## Tech Stack

- **Backend**: FastAPI, SQLModel, PostgreSQL/SQLite, Google Gemini AI
- **Frontend**: React, Vite, PWA
- **Deployment**: Railway.app

## Local Development

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
# Copy env.example to .env and add your GEMINI_API_KEY
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Deployment

### Full-Stack Deployment on Railway.app

1. **Connect Repository**: Connect your GitHub repo to Railway

2. **Add PostgreSQL Database**:
   - In Railway dashboard, click "Add Service" → "Database" → "PostgreSQL"
   - Note the connection URL provided by Railway

3. **Set Environment Variables** in Railway dashboard:
   ```
   DATABASE_URL=postgresql://postgres:password@containers-us-west-1.railway.app:PORT/railway
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```

4. **Deploy**: Railway will automatically:
   - Install dependencies using Nixpacks
   - Build the frontend (`npm run build`)
   - Start the backend server
   - Serve both frontend (static files) and API

5. **Database Migration**: The app automatically creates tables and runs migrations on startup

### Alternative: Separate Deployments

**Backend Only (Railway)**:
- Use the configuration as above
- API will be available at `your-railway-url.com/api`

**Frontend Only (Vercel/Netlify)**:
```bash
cd frontend
npm run build
# Deploy dist/ folder to your hosting service
```

### Environment Variables Reference

**Required**:
- `DATABASE_URL`: PostgreSQL connection string (Railway provides this automatically when you add a PostgreSQL database)
- `GEMINI_API_KEY`: Your Google Gemini API key

**Optional**:
- `PORT`: Railway sets this automatically (default: 8000)

**Note**: For Railway deployment, set `GEMINI_API_KEY` in your Railway service environment variables. The `DATABASE_URL` is provided automatically by Railway's PostgreSQL service.

## API Endpoints

- `POST /api/users/` - Create user
- `POST /api/decisions/` - Create decision
- `GET /api/decisions/` - Get decisions feed
- `POST /api/votes/` - Vote on decision
- `GET /api/votes/{decision_id}` - Get vote counts
- `GET /api/leaderboard/` - Get leaderboard
- `GET /api/users/{user_id}/personality` - Get personality analysis

## Design System

- **Primary**: Coral gradient (#FF6B6B to #FF8E72)
- **Background**: Pure black (#000000)
- **Typography**: Clean, modern sans-serif

## PWA Features

- Installable on mobile and desktop
- Offline caching
- Native app-like experience
- Push notifications ready
