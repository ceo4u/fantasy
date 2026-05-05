const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const authMiddleware = require('../middleware/auth');

const SHEET_ID = '1VbkAdMPIj4nd-a9VaQVIr1E5s_DSq8hJmujGBSVhnqA';

// ─── Helper: fetch & parse gviz tab ──────────────────────────────────────────
async function fetchGvizTab(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch tab: ${tabName} (${res.status})`);
  const text = await res.text();
  const start = text.indexOf('(') + 1;
  const end = text.lastIndexOf(')');
  return JSON.parse(text.slice(start, end));
}

// ─── GET /api/sheet/players ───────────────────────────────────────────────────
// Columns: A=SNO, B=PLAYER NAME, C=FANTASY TEAM, D=IPL TEAM, E=SKILL, F=PRICE, G=POINTS, H=LAST UPDATED
router.get('/players', async (req, res, next) => {
  try {
    const parsed = await fetchGvizTab('Players');
    const rows = parsed.table.rows;

    const players = rows
      .filter(row => row.c[1]?.v) // must have player name
      .map(row => ({
        id: Math.round(row.c[0]?.v ?? 0),
        name: String(row.c[1].v).trim(),
        team: String(row.c[2]?.v || '').trim(),
        iplTeam: String(row.c[3]?.v || '').trim(),
        skill: String(row.c[4]?.v || '').trim(),
        price: row.c[5]?.v ?? 0,
        points: row.c[6]?.v ?? 0,
        lastUpdated: row.c[7]?.v || '',
      }));

    res.json(players);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/sheet/rankings ──────────────────────────────────────────────────
// Columns: A=RANK, B=TEAM, C=OWNERS, D=POINTS, E=STATUS, F=CAP/VC
router.get('/rankings', async (req, res, next) => {
  try {
    const parsed = await fetchGvizTab('Rankings');
    const rows = parsed.table.rows;

    const rankings = rows
      .filter(row => row.c[0]?.v && row.c[1]?.v)
      .map(row => ({
        rank: Math.round(row.c[0].v),
        team: String(row.c[1].v).trim(),
        owner: String(row.c[2]?.v || '').trim(),
        totalPoints: row.c[3]?.v ?? 0,
        status: row.c[4]?.v || '',
        capVc: row.c[5]?.v || '',
        players: [],
      }));

    res.json(rankings);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/sheet/update-points ───────────────────────────────────────────
// Admin only — forward update request to Google Apps Script which writes to sheet
router.post('/update-points', authMiddleware, async (req, res, next) => {
  try {
    const { name, points } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    const val = parseInt(points, 10);
    if (isNaN(val) || val < 0) {
      return res.status(400).json({ error: 'Points must be a non-negative integer' });
    }

    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      return res.status(503).json({ error: 'GOOGLE_SCRIPT_URL not configured in server .env' });
    }

    const payload = { action: 'updatePoints', name: name.trim(), points: val };

    // axios follows redirects correctly (unlike native fetch on POST)
    const { data: result } = await axios.post(scriptUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 5,
      timeout: 20000,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Apps Script returned failure' });
    }

    res.json({ success: true, name: name.trim(), points: val, result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
