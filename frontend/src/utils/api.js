import axios from 'axios';

// In production on Vercel experimentalServices, backend is at /_/backend/api
// Locally the Vite proxy maps /api → localhost:4000
// VITE_API_URL env var overrides both (set in Vercel dashboard)
const isVercel = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');
const API_BASE  = import.meta.env.VITE_API_URL
  || (isVercel ? '/_/backend/api' : '/api');


const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // Increased to 60s to allow free Render servers to wake up
});

// Attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

// Fetch all players from the Google Sheet via backend proxy
export async function fetchSheet() {
  const { data } = await api.get('/sheet/players');
  return data;
}

// Fetch team rankings from the League Points tab via backend proxy
export async function fetchRankings() {
  const { data } = await api.get('/sheet/rankings');
  return data;
}

// Fetch match-wise squad data for a team tab
export async function fetchSquad(teamName) {
  const { data } = await api.get(`/sheet/squad/${encodeURIComponent(teamName)}`);
  return data;
}

// Admin: update a player's points (total override)
export async function updatePoints(name, points) {
  const { data } = await api.post('/sheet/update-points', { name, points });
  return data;
}

// Admin: update match-specific points for a player in their team tab
export async function updateMatchPoints(teamName, rawName, matchIndex, points) {
  const { data } = await api.post('/sheet/update-match-points', { teamName, rawName, matchIndex, points });
  return data;
}

// Admin: mark a player as Captain (C), Vice-Captain (VC), or remove role ("")
// Also triggers recalculation of their total with correct multiplier
export async function markCaptainVC(teamName, playerName, role) {
  const { data } = await api.post('/sheet/mark-captain-vc', { teamName, playerName, role });
  return data;
}

export async function replacePlayer(teamName, oldPlayerName, newPlayerName, newPlayerIPLTeam, newPlayerSkill, newPlayerPrice) {
  const { data } = await api.post('/sheet/replace-player', { teamName, oldPlayerName, newPlayerName, newPlayerIPLTeam, newPlayerSkill, newPlayerPrice });
  return data;
}

export async function undoReplace(teamName, currentName, originalName) {
  const { data } = await api.post('/sheet/undo-replace', { teamName, currentName, originalName });
  return data;
}

export async function addMatch(teamA, teamB, date, venue, status) {
  const { data } = await api.post('/sheet/add-match', { teamA, teamB, date, venue, status });
  return data;
}

export async function updateMatchResult(matchId, winner, margin, matchPoints) {
  const { data } = await api.post('/sheet/update-match-result', { matchId, winner, margin, matchPoints });
  return data;
}

export async function getMatches() {
  const { data } = await api.get('/sheet/matches');
  return data;
}

export async function getAvailablePlayers() {
  const { data } = await api.get('/sheet/available-players');
  return data;
}

export async function searchPlayers(params) {
  const { data } = await api.post('/sheet/search-players', params);
  return data;
}

export async function getPlayerMatchHistory(playerName, teamName) {
  const { data } = await api.post('/sheet/player-match-history', { playerName, teamName });
  return data;
}

export default api;
