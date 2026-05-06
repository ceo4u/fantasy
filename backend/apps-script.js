// ============================================================
// GOOGLE APPS SCRIPT — Fantasy IPL
// Paste into Apps Script editor
// Redeploy as Web App: Execute as Me, Access: Anyone
// ============================================================

var SS_ID = '1VbkAdMPIj4nd-a9VaQVIr1E5s_DSq8hJmujGBSVhnqA';

function doGet(e) {
  return ok({ status: 'ok', timestamp: new Date().toISOString() });
}

function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action || 'updatePoints';
    var ss     = SpreadsheetApp.openById(SS_ID);

    // ── 1. updatePoints ───────────────────────────────────────────────────────
    if (action === 'updatePoints') {
      var sheet = ss.getSheetByName('Players');
      if (!sheet) return fail('Players sheet not found');
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][1] && normName(data[i][1]) === normName(body.name)) {
          sheet.getRange(i + 1, 7).setValue(Number(body.points));
          return ok({ updated: body.name, points: body.points });
        }
      }
      return fail('Player not found: ' + body.name);
    }

    // ── 2. updateMatchPoints ──────────────────────────────────────────────────
    if (action === 'updateMatchPoints') {
      var teamSheet = ss.getSheetByName(body.teamName);
      if (!teamSheet) return fail('Team sheet not found: ' + body.teamName);

      var data     = teamSheet.getDataRange().getValues();
      var matchCol = 7 + Number(body.matchIndex); // G=col7, 0-indexed

      for (var i = 1; i < data.length; i++) {
        var cellName = data[i][1] ? data[i][1].toString().trim() : '';
        if (!cellName) continue;
        if (normName(cellName) === normName(body.rawName)) {
          teamSheet.getRange(i + 1, matchCol).setValue(Number(body.points));

          var result = recalcRow(teamSheet, i + 1, cellName, ss);
          return ok({ leaguePoints: result.leaguePoints, matchPoints: Number(body.points), multiplier: result.mult });
        }
      }
      return fail('Player not found: ' + body.rawName);
    }

    // ── 3. markCaptainVC ─────────────────────────────────────────────────────
    // payload: { action, teamName, playerName, role }  role = "C" | "VC" | ""
    if (action === 'markCaptainVC') {
      var teamSheet = ss.getSheetByName(body.teamName);
      if (!teamSheet) return fail('Team sheet not found: ' + body.teamName);

      var data = teamSheet.getDataRange().getValues();

      // Step 1: Remove existing C/VC from ALL players in this team first
      // (only one C and one VC allowed per team)
      for (var i = 1; i < data.length; i++) {
        var cell = data[i][1] ? data[i][1].toString().trim() : '';
        if (!cell) continue;
        var clean = cell.replace(/\s*\(C\)|\s*\(VC\)/gi, '').trim();
        // Only clear if this is the same role being reassigned
        var wasC  = /\(C\)/i.test(cell) && !/\(VC\)/i.test(cell);
        var wasVC = /\(VC\)/i.test(cell);
        if ((body.role === 'C' && wasC) || (body.role === 'VC' && wasVC)) {
          // Clear previous captain/vc
          teamSheet.getRange(i + 1, 2).setValue(clean);
          // Recalculate with multiplier=1
          recalcRow(teamSheet, i + 1, clean, ss);
        }
      }

      // Step 2: Re-read data after potential changes
      data = teamSheet.getDataRange().getValues();
      var found = false;

      for (var i = 1; i < data.length; i++) {
        var cell  = data[i][1] ? data[i][1].toString().trim() : '';
        if (!cell) continue;
        var clean = cell.replace(/\s*\(C\)|\s*\(VC\)/gi, '').trim();

        if (normName(clean) === normName(body.playerName)) {
          var newName = clean;
          if (body.role === 'C')  newName = clean + ' (C)';
          if (body.role === 'VC') newName = clean + ' (VC)';

          // Update the name in col B
          teamSheet.getRange(i + 1, 2).setValue(newName);

          // Recalculate total with new multiplier
          var result = recalcRow(teamSheet, i + 1, newName, ss);

          found = true;
          return ok({
            teamName:     body.teamName,
            player:       newName,
            role:         body.role,
            leaguePoints: result.leaguePoints,
            multiplier:   result.mult
          });
        }
      }

      if (!found) return fail('Player not found: ' + body.playerName);
    }

    return fail('Unknown action: ' + action);

  } catch(err) {
    return fail(err.toString());
  }
}

// ── Shared: recalculate a player's league points after any change ────────────
function recalcRow(teamSheet, rowNum, cellName, ss) {
  var rowVals   = teamSheet.getRange(rowNum, 7, 1, 18).getValues()[0];
  var baseTotal = rowVals.reduce(function(s, v) { return s + (Number(v) || 0); }, 0);

  var isC  = /\(C\)/i.test(cellName) && !/\(VC\)/i.test(cellName);
  var isVC = /\(VC\)/i.test(cellName);
  var mult = isC ? 2 : isVC ? 1.5 : 1;
  var leaguePoints = Math.round(baseTotal * mult * 10) / 10;

  // Write to col F
  teamSheet.getRange(rowNum, 6).setValue(leaguePoints);

  // Sync to Players tab
  var cleanName = cellName.replace(/\s*\(C\)|\s*\(VC\)/gi, '').trim();
  var pSheet    = ss.getSheetByName('Players');
  if (pSheet) {
    var pData = pSheet.getDataRange().getValues();
    for (var j = 1; j < pData.length; j++) {
      if (pData[j][1] && normName(pData[j][1]) === normName(cleanName)) {
        pSheet.getRange(j + 1, 7).setValue(leaguePoints);
        break;
      }
    }
  }
  return { leaguePoints: leaguePoints, mult: mult };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function normName(s) {
  return s.toString().trim().toUpperCase().replace(/\s+/g, ' ');
}
function ok(d) {
  d.success = true;
  return ContentService
    .createTextOutput(JSON.stringify(d))
    .setMimeType(ContentService.MimeType.JSON);
}
function fail(m) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: m }))
    .setMimeType(ContentService.MimeType.JSON);
}
