# 🏏 Fantasy IPL Dashboard

> Production-grade full-stack IPL fantasy league platform — React + Node.js + Google Sheets

---

## 📁 Project Structure

```
fantasy-ipl/
├── frontend/          # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/   # Navbar, Sidebar, SearchBar, LoginModal, Skeleton
│   │   ├── context/      # AuthContext (JWT)
│   │   ├── hooks/        # usePlayers, useRankings
│   │   ├── pages/        # Dashboard, Rankings, AdminPanel
│   │   └── utils/        # api.js (axios instance)
│   └── ...
└── backend/           # Node.js + Express
    ├── routes/        # auth.js, players.js
    ├── middleware/    # auth.js (JWT guard)
    ├── services/      # sheets.js (Google Sheets API)
    └── server.js
```

---

## ⚙️ Google Sheets Setup

### Step 1 — Create your sheet

Your Google Sheet must have this column structure (Row 1 = headers):

| A: Name | B: Team | C: IPL Team | D: Points |
|---------|---------|-------------|-----------|
| Virat Kohli | Team Alpha | RCB | 245 |
| Rohit Sharma | Team Beta | MI | 210 |

### Step 2 — Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts**
5. Create a service account, download the JSON key
6. Save as `backend/service-account.json`

### Step 3 — Share your Sheet

1. Open your Google Sheet
2. Click **Share**
3. Add the service account email (found in the JSON: `client_email`)
4. Give it **Editor** access

### Step 4 — Get Spreadsheet ID

From the sheet URL:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
```

---

## 🚀 Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
# Runs on http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
# For local dev with Vite proxy, no .env needed
npm run dev
# Runs on http://localhost:3000
```

---

## 🌐 Production Deployment

### Backend → Render

1. Push `backend/` to a GitHub repo
2. Go to [render.com](https://render.com), create a new **Web Service**
3. Point to your backend repo
4. Set environment variables (from `.env.example`)
5. Add `service-account.json` contents as `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` env var
   - Update `sheets.js` to read from `process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` if using env var instead of file

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. Go to [vercel.com](https://vercel.com), import project
3. Set environment variable:
   ```
   VITE_API_URL=https://your-render-service.onrender.com/api
   ```
4. Deploy

---

## 🔐 Auth

- Single admin: `username: admin`, `password: 1234`
- Change via `.env` variables: `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- JWT token expires in 8 hours
- Token stored in `localStorage`

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | — | Health check |
| GET | `/api/players` | — | All players (supports `?search=`) |
| GET | `/api/players/rankings` | — | Teams sorted by total points |
| POST | `/api/auth/login` | — | Get JWT token |
| POST | `/api/auth/verify` | — | Verify JWT token |
| POST | `/api/players/update-points` | ✅ Admin | Update player points |

### POST `/api/players/update-points`

```json
{
  "name": "Virat Kohli",
  "points": 275
}
```

---

## ✨ Features

- **Real-time search** — filter players instantly, no API call
- **Team rankings** — auto-grouped, sorted by total points
- **Top 3 teams** — highlighted with gold/silver/bronze styling
- **Expandable team cards** — click to see individual players
- **Admin panel** — inline points editing with live sync to Google Sheets
- **JWT auth** — secure, stateless, 8-hour sessions
- **Loading skeletons** — smooth UX while data loads
- **Toast notifications** — success/error feedback on save
- **Responsive** — mobile sidebar + desktop layout
- **Dark theme** — purple + yellow SaaS aesthetic
