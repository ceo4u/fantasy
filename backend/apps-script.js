// ============================================================
// FANTASY IPL DASHBOARD - COMPLETE PRODUCTION SCRIPT
// Spreadsheet ID: 1VbkAdMPIj4nd-a9VaQVIr1E5s_DSq8hJmujGBSVhnqA
// Actions: updatePoints, updateMatchPoints, markCaptainVC
// ============================================================

const SPREADSHEET_ID = '1VbkAdMPIj4nd-a9VaQVIr1E5s_DSq8hJmujGBSVhnqA';

// ============================================================
// HEALTH CHECK - doGet
// ============================================================

function doGet(e) {
  try {
    return createResponse({
      success: true,
      status: "ok",
      timestamp: new Date().toISOString(),
      message: "Fantasy IPL API is running"
    });
  } catch (err) {
    return createErrorResponse(err.message);
  }
}

// ============================================================
// MAIN POST HANDLER
// ============================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'updatePoints') {
      return handleUpdatePoints(body);
    }

    if (action === 'updateMatchPoints') {
      return handleUpdateMatchPoints(body);
    }

    if (action === 'markCaptainVC') {
      return handleMarkCaptainVC(body);
    }

    if (action === 'replacePlayer') {
      return handleReplacePlayer(body);
    }

    if (action === 'addMatch') {
      return handleAddMatch(body);
    }

    if (action === 'updateMatchResult') {
      return handleUpdateMatchResult(body);
    }

    if (action === 'getMatches') {
      return handleGetMatches(body);
    }

    if (action === 'getAvailablePlayers') {
      return handleGetAvailablePlayers(body);
    }

    if (action === 'searchPlayers') {
      return handleSearchPlayers(body);
    }

    if (action === 'getPlayerMatchHistory') {
      return handleGetPlayerMatchHistory(body);
    }

    return createErrorResponse(`Unknown action: ${action}`);

  } catch (err) {
    return createErrorResponse(err.message);
  }
}

// ============================================================
// SHARED HELPER: recalcRow
// ============================================================
// Recounts all match cols (G–X), applies C/VC multiplier,
// writes to Col F, syncs to Players tab.
// Returns { leaguePoints, multiplier }

function recalcRow(sheet, rowNumber, cellName, ss) {
  // Get all 18 match columns (G to X = col 7 to col 24)
  const matchRange = sheet.getRange(rowNumber, 7, 1, 18);
  const matchValues = matchRange.getValues()[0];

  // Calculate base total from all matches
  let baseTotal = 0;
  for (let i = 0; i < matchValues.length; i++) {
    baseTotal += (Number(matchValues[i]) || 0);
  }

  // Detect multiplier from cellName
  const hasC = cellName.includes('(C)') && !cellName.includes('(VC)');
  const hasVC = cellName.includes('(VC)');
  let multiplier = 1;
  if (hasC) multiplier = 2;
  else if (hasVC) multiplier = 1.5;

  // Calculate league points (rounded to 1 decimal)
  const leaguePoints = Math.round(baseTotal * multiplier * 10) / 10;

  // Write to Col F
  sheet.getRange(rowNumber, 6).setValue(leaguePoints);

  // Sync to Players tab
  const cleanName = cellName.replace(/\s*\(C\)|\s*\(VC\)/gi, '').trim();
  syncToPlayersTab(ss, cleanName, leaguePoints);

  return { leaguePoints: leaguePoints, multiplier: multiplier };
}

// ============================================================
// HELPER: Sync player points to Players tab
// ============================================================

function syncToPlayersTab(ss, playerName, leaguePoints) {
  const playersSheet = ss.getSheetByName('Players');
  if (!playersSheet) return;

  const data = playersSheet.getDataRange().getValues();
  const targetName = playerName.trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    const rowName = row[1].toString().trim().toUpperCase();
    if (rowName === targetName) {
      playersSheet.getRange(i + 1, 7).setValue(leaguePoints); // Col G = TOTAL_POINTS
      break;
    }
  }
}

// ============================================================
// HELPER: Normalize name (trim, uppercase, collapse spaces)
// ============================================================

function normalizeName(name) {
  if (!name) return '';
  return name.toString().trim().toUpperCase().replace(/\s+/g, ' ');
}

// ============================================================
// HELPER: Get clean name without C/VC suffix
// ============================================================

function getCleanName(nameWithSuffix) {
  if (!nameWithSuffix) return '';
  return nameWithSuffix.replace(/\s*\(C\)|\s*\(VC\)/gi, '').trim();
}

// ============================================================
// ACTION 1: updatePoints - Direct override in Players tab
// ============================================================

function handleUpdatePoints(body) {
  const { name, points } = body;

  if (!name) return createErrorResponse('Missing player name');
  if (typeof points !== 'number' || isNaN(points)) {
    return createErrorResponse('Points must be a number');
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Players');
  if (!sheet) return createErrorResponse('Players sheet not found');

  const data = sheet.getDataRange().getValues();
  const targetName = normalizeName(name);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    const rowName = normalizeName(row[1]);
    if (rowName === targetName) {
      sheet.getRange(i + 1, 7).setValue(points); // Col G = TOTAL_POINTS
      return createResponse({
        success: true,
        updated: name,
        points: points
      });
    }
  }

  return createErrorResponse(`Player not found: ${name}`);
}

// ============================================================
// ACTION 2: updateMatchPoints - Update single match, auto-recalc
// ============================================================

function handleUpdateMatchPoints(body) {
  const { teamName, rawName, matchIndex, points } = body;

  if (!teamName) return createErrorResponse('Missing teamName');
  if (!rawName)  return createErrorResponse('Missing rawName');
  if (typeof matchIndex !== 'number' || matchIndex < 0 || matchIndex > 17) {
    return createErrorResponse('matchIndex must be 0-17');
  }
  if (typeof points !== 'number' || isNaN(points)) {
    return createErrorResponse('points must be a number');
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const teamSheet = ss.getSheetByName(teamName);
  if (!teamSheet) return createErrorResponse(`Sheet not found: ${teamName}`);

  const data = teamSheet.getDataRange().getValues();
  const targetName = normalizeName(rawName);
  const matchCol = 7 + matchIndex; // Col G=7 (matchIndex 0), Col H=8 (matchIndex 1), ...

  let playerRow = -1;
  let playerColB = '';

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    const cellName = row[1].toString().trim();
    if (normalizeName(cellName) === targetName) {
      playerRow = i + 1; // 1-indexed
      playerColB = cellName;
      break;
    }
  }

  if (playerRow === -1) {
    return createErrorResponse(`Player not found: ${rawName}`);
  }

  // Update the match points cell
  teamSheet.getRange(playerRow, matchCol).setValue(points);

  // Recalculate the row
  const { leaguePoints, multiplier } = recalcRow(teamSheet, playerRow, playerColB, ss);

  return createResponse({
    success: true,
    leaguePoints: leaguePoints,
    matchPoints: points,
    multiplier: multiplier,
    playerName: playerColB
  });
}

// ============================================================
// ACTION 3: markCaptainVC - Mark player as C/VC, auto-clear previous
// ============================================================

function handleMarkCaptainVC(body) {
  const { teamName, playerName, role } = body;

  if (!teamName)   return createErrorResponse('Missing teamName');
  if (!playerName) return createErrorResponse('Missing playerName');
  if (role !== 'C' && role !== 'VC' && role !== '') {
    return createErrorResponse('role must be "C", "VC", or ""');
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const teamSheet = ss.getSheetByName(teamName);
  if (!teamSheet) return createErrorResponse(`Sheet not found: ${teamName}`);

  const data = teamSheet.getDataRange().getValues();
  const targetCleanName = normalizeName(playerName);

  // Step A: Clear previous holder of the same role
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;

    const currentName = row[1].toString().trim();
    const cleanCurrent = getCleanName(currentName);

    let hasRole = false;
    if (role === 'C'  && currentName.includes('(C)') && !currentName.includes('(VC)')) hasRole = true;
    if (role === 'VC' && currentName.includes('(VC)')) hasRole = true;

    if (hasRole) {
      teamSheet.getRange(i + 1, 2).setValue(cleanCurrent);
      recalcRow(teamSheet, i + 1, cleanCurrent, ss); // multiplier → 1
    }
  }

  // Step B: Re-read and find target player
  const updatedData = teamSheet.getDataRange().getValues();
  let targetRow = -1;
  let currentName = '';

  for (let i = 1; i < updatedData.length; i++) {
    const row = updatedData[i];
    if (!row[1]) continue;
    const cleanCurrent = getCleanName(row[1].toString().trim());
    if (normalizeName(cleanCurrent) === targetCleanName) {
      targetRow = i + 1;
      currentName = cleanCurrent;
      break;
    }
  }

  if (targetRow === -1) return createErrorResponse(`Player not found: ${playerName}`);

  // Build new name with suffix
  let newName = currentName;
  if (role === 'C')  newName = currentName + ' (C)';
  if (role === 'VC') newName = currentName + ' (VC)';

  teamSheet.getRange(targetRow, 2).setValue(newName);

  // Step C: Recalculate with new multiplier
  const { leaguePoints, multiplier } = recalcRow(teamSheet, targetRow, newName, ss);

  return createResponse({
    success: true,
    teamName: teamName,
    player: newName,
    role: role === 'C' ? 'Captain' : (role === 'VC' ? 'Vice-Captain' : 'None'),
    leaguePoints: leaguePoints,
    multiplier: multiplier
  });
}

// ============================================================
// ACTION 4: replacePlayer - Replace an injured player
// ============================================================
function handleReplacePlayer(body) {
  const { teamName, oldPlayerName, newPlayerName, newPlayerIPLTeam, newPlayerSkill, newPlayerPrice } = body;
  
  if (!teamName || !oldPlayerName || !newPlayerName) {
    return createErrorResponse('Missing required fields for replacement');
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const teamSheet = ss.getSheetByName(teamName);
  const playersSheet = ss.getSheetByName('Players');
  const transferLogSheet = ss.getSheetByName('Transfer_Log');
  
  if (!teamSheet || !playersSheet) {
    return createErrorResponse('Required sheets not found');
  }

  const teamData = teamSheet.getDataRange().getValues();
  const targetOldName = normalizeName(oldPlayerName);
  let oldRowIdx = -1;

  for (let i = 1; i < teamData.length; i++) {
    if (!teamData[i][1]) continue;
    if (normalizeName(getCleanName(teamData[i][1].toString())) === targetOldName) {
      oldRowIdx = i + 1;
      break;
    }
  }

  if (oldRowIdx === -1) {
    return createErrorResponse(`Old player not found in team: ${oldPlayerName}`);
  }

  // Mark old player as replaced
  teamSheet.getRange(oldRowIdx, 2).setValue(oldPlayerName + ' 🔴 REPLACED');

  // Find next empty row in team sheet
  let newRowIdx = teamSheet.getLastRow() + 1;
  const newSno = teamSheet.getRange(oldRowIdx, 1).getValue(); // keep same serial or append new
  
  // Create empty array for new row (Sno, Name, IPL, Skill, Price, League Pts, M1..M18)
  const newRowData = new Array(24).fill('');
  newRowData[0] = newRowIdx - 1; // Auto increment sno
  newRowData[1] = newPlayerName;
  newRowData[2] = newPlayerIPLTeam || '';
  newRowData[3] = newPlayerSkill || '';
  newRowData[4] = newPlayerPrice || 0;
  newRowData[5] = 0; // Initial league points
  for (let i = 6; i < 24; i++) newRowData[i] = 0; // Initialize match points to 0

  teamSheet.getRange(newRowIdx, 1, 1, 24).setValues([newRowData]);

  // Log to Transfer_Log
  if (transferLogSheet) {
    transferLogSheet.appendRow([
      new Date().toISOString(),
      teamName,
      oldPlayerName,
      newPlayerName,
      "Manual Replacement",
      "Admin"
    ]);
  }

  // Ensure new player in Players sheet is marked as picked
  // (Assuming Players sheet has columns where team is stored, for now skip complex sync)
  
  return createResponse({
    success: true,
    teamName,
    oldPlayer: oldPlayerName,
    newPlayer: newPlayerName
  });
}

// ============================================================
// ACTION 5: addMatch - Schedule a match
// ============================================================
function handleAddMatch(body) {
  const { teamA, teamB, date, venue, status } = body;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let matchesSheet = ss.getSheetByName('Matches');
  
  if (!matchesSheet) {
    // Create sheet if doesn't exist
    matchesSheet = ss.insertSheet('Matches');
    matchesSheet.appendRow(['Match ID', 'Team A', 'Team B', 'Date', 'Venue', 'Status', 'Winner', 'Margin']);
  }
  
  const matchId = new Date().getTime();
  matchesSheet.appendRow([
    matchId, teamA, teamB, date, venue, status || 'upcoming', '', ''
  ]);
  
  return createResponse({ success: true, matchId, teamA, teamB, date });
}

// ============================================================
// ACTION 6: updateMatchResult - Set scores and mark completed
// ============================================================
function handleUpdateMatchResult(body) {
  const { matchId, winner, margin, matchPoints } = body;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const matchesSheet = ss.getSheetByName('Matches');
  
  if (!matchesSheet) return createErrorResponse('Matches sheet not found');
  
  const data = matchesSheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == matchId || data[i][3] == matchId) { // matchId or Date fallback
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > -1) {
    matchesSheet.getRange(rowIndex, 6).setValue('completed');
    matchesSheet.getRange(rowIndex, 7).setValue(winner || '');
    matchesSheet.getRange(rowIndex, 8).setValue(margin || '');
  }

  // Update player points if provided
  // (In a real scenario, this would loop through all teams and update specific match cols, but for now we rely on the manual entry feature or extended logic)
  
  return createResponse({ success: true, matchId, winner });
}

// ============================================================
// ACTION 7: getMatches - Return all matches
// ============================================================
function handleGetMatches(body) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const matchesSheet = ss.getSheetByName('Matches');
  if (!matchesSheet) return createResponse({ matches: [] });
  
  const data = matchesSheet.getDataRange().getValues();
  const matches = [];
  
  for (let i = 1; i < data.length; i++) {
    matches.push({
      matchId: data[i][0],
      teamA: data[i][1],
      teamB: data[i][2],
      date: data[i][3],
      venue: data[i][4],
      status: data[i][5],
      winner: data[i][6],
      margin: data[i][7]
    });
  }
  
  return createResponse({ matches });
}

// ============================================================
// ACTION 8: getAvailablePlayers - Return non-team players
// ============================================================
function handleGetAvailablePlayers(body) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const playersSheet = ss.getSheetByName('Players');
  if (!playersSheet) return createErrorResponse('Players sheet not found');
  
  const data = playersSheet.getDataRange().getValues();
  const available = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    // Assuming Column C is "Team" and empty means available
    const team = row[2] ? row[2].toString().trim() : '';
    if (team === '' || team.toLowerCase() === 'unsold') {
      available.push({
        name: row[1],
        iplTeam: row[3] || '',
        skill: row[4] || '',
        price: row[5] || 0
      });
    }
  }
  
  return createResponse({ players: available });
}

// ============================================================
// EXTERNAL API INTEGRATION & PLAYER SEARCH
// ============================================================

// Cache for external API responses (prevents rate limiting)
let scheduleCache = null;
let lastScheduleFetch = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fantasy Team to Real IPL Team Mapping
const FANTASY_TO_IPL = {
  "Finisherz": { code: "dc", name: "Delhi Capitals" },
  "AB's": { code: "srh", name: "Sunrisers Hyderabad" },
  "Master Blasters": { code: "rr", name: "Rajasthan Royals" },
  "Firestorm Fury": { code: "srh", name: "Sunrisers Hyderabad" },
  "Drinking Buds": { code: "gt", name: "Gujarat Titans" },
  "Knights1126": { code: "rcb", name: "Royal Challengers Bangalore" },
  "Thunder Blasters": { code: "mi", name: "Mumbai Indians" },
  "Old Monk": { code: "csk", name: "Chennai Super Kings" },
  "Dynamos": { code: "csk", name: "Chennai Super Kings" },
  "Cultureless Brutes": { code: "kkr", name: "Kolkata Knight Riders" }
};

// Real IPL Team Name to Fantasy Team Mapping (Reverse)
const IPL_TO_FANTASY = {
  "Delhi Capitals": "Finisherz",
  "Sunrisers Hyderabad": "AB's",
  "Rajasthan Royals": "Master Blasters",
  "Gujarat Titans": "Drinking Buds",
  "Royal Challengers Bangalore": "Knights1126",
  "Mumbai Indians": "Thunder Blasters",
  "Chennai Super Kings": "Old Monk",
  "Kolkata Knight Riders": "Cultureless Brutes"
};

// Helper: Fetch schedule from external API with caching
function fetchIPLSchedule() {
  return null;
}

// Helper: Get match info for a fantasy team and match number
function getMatchInfoByTeamAndMatchNumber(fantasyTeam, matchNumber) {
  return null;
}

// ACTION 9: getPlayerMatchHistory
function handleGetPlayerMatchHistory(body) {
  const { playerName, teamName } = body;
  
  if (!playerName) return createErrorResponse('Missing playerName');
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Find which team the player belongs to
  let targetTeam = teamName;
  if (!targetTeam) {
    const allTeams = Object.keys(FANTASY_TO_IPL);
    for (const team of allTeams) {
      const teamSheet = ss.getSheetByName(team);
      if (teamSheet) {
        const data = teamSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][1]) {
            const cleanName = getCleanName(data[i][1].toString());
            if (normalizeName(cleanName) === normalizeName(playerName)) {
              targetTeam = team;
              break;
            }
          }
        }
      }
      if (targetTeam) break;
    }
  }
  
  if (!targetTeam) return createErrorResponse(`Player not found: ${playerName}`);
  
  // Get player's data from team sheet
  const teamSheet = ss.getSheetByName(targetTeam);
  const teamData = teamSheet.getDataRange().getValues();
  
  let playerRow = null;
  let playerFullName = null;
  for (let i = 1; i < teamData.length; i++) {
    if (teamData[i][1]) {
      const cleanName = getCleanName(teamData[i][1].toString());
      if (normalizeName(cleanName) === normalizeName(playerName)) {
        playerRow = teamData[i];
        playerFullName = teamData[i][1].toString();
        break;
      }
    }
  }
  
  if (!playerRow) return createErrorResponse(`Player data not found`);
  
  // Get live scores for current match status
  let liveScores = null;
  
  // Build match history with opponent info
  const matchHistory = [];
  const isCaptain = playerFullName.includes('(C)') && !playerFullName.includes('(VC)');
  const isViceCaptain = playerFullName.includes('(VC)');
  
  for (let matchIdx = 0; matchIdx < 18; matchIdx++) {
    const matchPoints = playerRow[6 + matchIdx] || 0;
    const matchNumber = matchIdx + 1;
    
    // Get opponent info from schedule
    const matchInfo = getMatchInfoByTeamAndMatchNumber(targetTeam, matchNumber);
    
    // Check if this match is currently live
    let isLive = false;
    let liveStatus = null;
    if (liveScores && matchInfo) {
      // Compare match IDs or teams to determine if this is the live match
      // This logic depends on the live API response structure
      isLive = liveScores.status === 'live' && 
               (liveScores.team1?.toLowerCase().includes(matchInfo.opponentIPL?.toLowerCase()) ||
                liveScores.team2?.toLowerCase().includes(matchInfo.opponentIPL?.toLowerCase()));
      if (isLive) {
        liveStatus = liveScores;
      }
    }
    
    const multiplier = isCaptain ? 2 : (isViceCaptain ? 1.5 : 1);
    const leaguePoints = Math.round(matchPoints * multiplier * 10) / 10;
    
    matchHistory.push({
      matchNumber: matchNumber,
      matchIndex: matchIdx,
      opponent: matchInfo?.opponentFantasy || 'TBD',
      opponentIPL: matchInfo?.opponentIPL || 'TBD',
      date: matchInfo?.date || 'TBD',
      venue: matchInfo?.venue || 'TBD',
      matchPoints: matchPoints,
      multiplier: multiplier,
      leaguePoints: leaguePoints,
      status: isLive ? 'live' : (matchInfo?.status || (matchPoints > 0 ? 'completed' : 'upcoming')),
      isLive: isLive,
      liveUpdate: liveStatus
    });
  }
  
  // Calculate statistics
  const completedMatches = matchHistory.filter(m => m.status === 'completed' && m.matchPoints > 0);
  const totalPoints = matchHistory.reduce((sum, m) => sum + m.leaguePoints, 0);
  const averagePoints = completedMatches.length > 0 ? totalPoints / completedMatches.length : 0;
  
  return createResponse({
    success: true,
    player: {
      name: playerName,
      cleanName: getCleanName(playerName),
      fantasyTeam: targetTeam,
      iplTeam: playerRow[2] || '',
      skill: playerRow[3] || '',
      price: playerRow[4] || 0,
      totalPoints: totalPoints,
      averagePoints: Math.round(averagePoints * 10) / 10,
      isCaptain: isCaptain,
      isViceCaptain: isViceCaptain,
      matchHistory: matchHistory,
      matchesPlayed: completedMatches.length
    }
  });
}

// ACTION 10: searchPlayers
function handleSearchPlayers(body) {
  const { searchTerm, minPoints, maxPoints, fantasyTeam, iplTeam, skill } = body;
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const allTeams = Object.keys(FANTASY_TO_IPL);
  
  const results = [];
  
  for (const team of allTeams) {
    const teamSheet = ss.getSheetByName(team);
    if (!teamSheet) continue;
    
    const data = teamSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[1]) continue;
      
      const playerName = row[1].toString();
      const cleanName = getCleanName(playerName);
      const playerPoints = row[5] || 0;
      const playerIPLTeam = row[2] || '';
      const playerSkill = row[3] || '';
      
      // Apply filters
      let matches = true;
      if (fantasyTeam && fantasyTeam !== team) matches = false;
      if (iplTeam && iplTeam !== playerIPLTeam) matches = false;
      if (skill && skill !== playerSkill) matches = false;
      if (minPoints && playerPoints < minPoints) matches = false;
      if (maxPoints && playerPoints > maxPoints) matches = false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameLower = cleanName.toLowerCase();
        if (!nameLower.includes(searchLower)) matches = false;
      }
      
      if (matches) {
        results.push({
          name: cleanName,
          fullName: playerName,
          fantasyTeam: team,
          iplTeam: playerIPLTeam,
          skill: playerSkill,
          price: row[4] || 0,
          points: playerPoints,
          isCaptain: playerName.includes('(C)'),
          isViceCaptain: playerName.includes('(VC)')
        });
      }
    }
  }
  
  return createResponse({
    success: true,
    players: results,
    total: results.length
  });
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

function createResponse(data) {
  data.success = true;
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(error) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: error }))
    .setMimeType(ContentService.MimeType.JSON);
}
