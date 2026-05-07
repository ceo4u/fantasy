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
