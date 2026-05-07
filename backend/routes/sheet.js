const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const authMiddleware = require('../middleware/auth');

const SHEET_ID = '1VbkAdMPIj4nd-a9VaQVIr1E5s_DSq8hJmujGBSVhnqA';
const MATCH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','Q1','EL','Q2','F'];

async function fetchGvizRaw(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  try {
    return JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')')));
  } catch { return null; }
}

// Try exact → UPPERCASE → TITLE CASE for sheet tab names
async function fetchGvizTab(tabName) {
  const variants = [
    tabName,
    tabName.toUpperCase(),
    tabName.charAt(0).toUpperCase() + tabName.slice(1),
    tabName.replace(/\s+/g, '').toUpperCase(),
  ].filter((v, i, a) => a.indexOf(v) === i); // unique

  for (const v of variants) {
    const json = await fetchGvizRaw(v);
    if (json && json.table?.rows?.length > 0) return json;
  }
  // last resort — return whatever the exact name gives
  const fallback = await fetchGvizRaw(tabName);
  if (fallback) return fallback;
  throw new Error(`Sheet tab not found: ${tabName}`);
}


async function callScript(payload) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) throw new Error('GOOGLE_SCRIPT_URL not configured');
  const { data } = await axios.post(scriptUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    maxRedirects: 5, timeout: 25000,
  });
  return data;
}

// GET /api/sheet/players
router.get('/players', async (req, res, next) => {
  try {
    const parsed = await fetchGvizTab('Players');
    const players = parsed.table.rows
      .filter(r => r.c[1]?.v)
      .map(r => ({
        id: Math.round(r.c[0]?.v ?? 0),
        name: String(r.c[1].v).trim(),
        team: String(r.c[2]?.v || '').trim(),
        iplTeam: String(r.c[3]?.v || '').trim(),
        skill: String(r.c[4]?.v || '').trim(),
        price: r.c[5]?.v ?? 0,
        points: r.c[6]?.v ?? 0,
      }));
    res.json(players);
  } catch (err) { next(err); }
});

// GET /api/sheet/rankings
// Computes totalPoints live from each team's squad tab (Col F sum) for accuracy
router.get('/rankings', async (req, res, next) => {
  try {
    const parsed = await fetchGvizTab('Rankings');
    const baseRankings = parsed.table.rows
      .filter(r => r.c[0]?.v && r.c[1]?.v)
      .map(r => ({
        rank: Math.round(r.c[0].v),
        team: String(r.c[1].v).trim(),
        owner: String(r.c[2]?.v || '').trim(),
        totalPoints: r.c[3]?.v ?? 0,
        status: r.c[4]?.v || '',
        capVc: r.c[5]?.v || '',
      }));

    // Compute live totals from each team tab (sum of Col F = leaguePoints with multipliers)
    const withLiveTotals = await Promise.all(baseRankings.map(async (entry) => {
      try {
        const teamParsed = await fetchGvizTab(entry.team);
        const rows = teamParsed.table.rows;
        let liveTotal = 0;
        rows
          .filter(r => r.c[1]?.v && typeof r.c[0]?.v === 'number')
          .forEach(r => {
            const rawName = String(r.c[1].v).trim();
            const isC  = /\(C\)/.test(rawName) && !/\(VC\)/.test(rawName);
            const isVC = /\(VC\)/.test(rawName);
            const multiplier = isC ? 2 : isVC ? 1.5 : 1;
            const matchPoints = MATCH_LABELS.map((_, i) => {
              const v = r.c[6 + i]?.v;
              return (v != null && typeof v === 'number') ? v : 0;
            });
            const baseTotal = matchPoints.reduce((s, v) => s + v, 0);
            liveTotal += parseFloat((baseTotal * multiplier).toFixed(1));
          });
        return { ...entry, totalPoints: parseFloat(liveTotal.toFixed(1)) };
      } catch {
        return entry; // fallback to Rankings tab value if team tab unavailable
      }
    }));

    // Re-sort by live totalPoints descending and re-rank
    withLiveTotals.sort((a, b) => b.totalPoints - a.totalPoints);
    withLiveTotals.forEach((entry, i) => { entry.rank = i + 1; });

    res.json(withLiveTotals);
  } catch (err) { next(err); }
});

// GET /api/sheet/squad/:teamName
// Fetches individual team tab: A=SNO, B=PLAYER(C/VC), C=IPL, D=SKILL, E=PRICE, F=LEAGUE_PTS, G-X=M1..F
router.get('/squad/:teamName', async (req, res, next) => {
  try {
    const teamName = decodeURIComponent(req.params.teamName);
    const parsed = await fetchGvizTab(teamName);
    const rows = parsed.table.rows;

    const players = rows
      .filter(r => r.c[1]?.v && typeof r.c[0]?.v === 'number')
      .map(r => {
        const rawName   = String(r.c[1].v).trim();
        const isC       = /\(C\)/.test(rawName) && !/\(VC\)/.test(rawName);
        const isVC      = /\(VC\)/.test(rawName);
        const name      = rawName.replace(/\s*\(C\)|\s*\(VC\)/gi, '').trim();
        const multiplier = isC ? 2 : isVC ? 1.5 : 1;
        const matchPoints = MATCH_LABELS.map((_, i) => {
          const v = r.c[6 + i]?.v;
          return (v != null && typeof v === 'number') ? v : 0;
        });
        const baseTotal = matchPoints.reduce((s, v) => s + v, 0);
        return {
          sno: Math.round(r.c[0].v),
          rawName, name, isC, isVC, multiplier,
          iplTeam: String(r.c[2]?.v || '').trim(),
          skill:   String(r.c[3]?.v || '').trim(),
          price:   r.c[4]?.v ?? 0,
          leaguePoints: r.c[5]?.v ?? 0,
          matchPoints,
          calculatedTotal: parseFloat((baseTotal * multiplier).toFixed(1)),
        };
      });

    const matchTotals = MATCH_LABELS.map((_, mi) =>
      players.reduce((s, p) => s + (p.matchPoints[mi] || 0), 0));

    res.json({ players, matchTotals, matchLabels: MATCH_LABELS });
  } catch (err) { next(err); }
});

// POST /api/sheet/update-match-points  (admin only)
router.post('/update-match-points', authMiddleware, async (req, res, next) => {
  try {
    const { teamName, rawName, matchIndex, points } = req.body;
    if (!teamName?.trim()) return res.status(400).json({ error: 'teamName required' });
    if (!rawName?.trim())  return res.status(400).json({ error: 'rawName required' });
    if (matchIndex == null || matchIndex < 0 || matchIndex >= MATCH_LABELS.length)
      return res.status(400).json({ error: 'invalid matchIndex' });
    const pts = Number(points);
    if (isNaN(pts)) return res.status(400).json({ error: 'points must be a number' });

    const result = await callScript({ action: 'updateMatchPoints', teamName: teamName.trim(), rawName: rawName.trim(), matchIndex, points: pts });
    if (!result.success) return res.status(400).json({ error: result.error || 'Apps Script error' });
    res.json({ success: true, leaguePoints: result.leaguePoints });
  } catch (err) { next(err); }
});

// POST /api/sheet/update-points  (admin only)
router.post('/update-points', authMiddleware, async (req, res, next) => {
  try {
    const { name, points } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Player name required' });
    const val = parseInt(points, 10);
    if (isNaN(val) || val < 0) return res.status(400).json({ error: 'Points must be >= 0' });
    const result = await callScript({ action: 'updatePoints', name: name.trim(), points: val });
    if (!result.success) return res.status(400).json({ error: result.error || 'Apps Script failure' });
    res.json({ success: true, name: name.trim(), points: val });
  } catch (err) { next(err); }
});

// POST /api/sheet/mark-captain-vc  (admin only)
// body: { teamName, playerName, role }  role = "C" | "VC" | ""
router.post('/mark-captain-vc', authMiddleware, async (req, res, next) => {
  try {
    const { teamName, playerName, role } = req.body;
    if (!teamName?.trim())   return res.status(400).json({ error: 'teamName required' });
    if (!playerName?.trim()) return res.status(400).json({ error: 'playerName required' });
    if (!['C','VC',''].includes(role)) return res.status(400).json({ error: 'role must be C, VC, or empty string' });
    const result = await callScript({ action: 'markCaptainVC', teamName: teamName.trim(), playerName: playerName.trim(), role });
    if (!result.success) return res.status(400).json({ error: result.error || 'Apps Script error' });
    res.json({ success: true, teamName: teamName.trim(), player: playerName.trim(), role });
  } catch (err) { next(err); }
});

module.exports = router;

