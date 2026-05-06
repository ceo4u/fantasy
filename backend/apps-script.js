// ============================================================
// UPDATED GOOGLE APPS SCRIPT — paste into Apps Script editor
// Redeploy as Web App: Execute as Me, Access: Anyone
// ============================================================

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'updatePoints';
    var ss = SpreadsheetApp.openById('1VbkAdMPIj4nd-a9VaQVIr1E5s_DSq8hJmujGBSVhnqA');

    if (action === 'updatePoints') {
      var sheet = ss.getSheetByName('Players');
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][1] && data[i][1].toString().trim() === body.name.toString().trim()) {
          sheet.getRange(i + 1, 7).setValue(body.points);
          return ok({ updated: body.name, points: body.points });
        }
      }
      return fail('Player not found: ' + body.name);
    }

    if (action === 'updateMatchPoints') {
      var teamSheet = ss.getSheetByName(body.teamName);
      if (!teamSheet) return fail('Team sheet not found: ' + body.teamName);

      var data = teamSheet.getDataRange().getValues();
      var matchCol = 7 + body.matchIndex; // G=7, 0-indexed matchIndex

      for (var i = 1; i < data.length; i++) {
        var cellName = data[i][1] ? data[i][1].toString().trim() : '';
        if (cellName === body.rawName.toString().trim()) {
          teamSheet.getRange(i + 1, matchCol).setValue(Number(body.points));

          // Re-read row to get accurate sum
          var rowVals = teamSheet.getRange(i + 1, 7, 1, 18).getValues()[0];
          var baseTotal = rowVals.reduce(function(s, v) { return s + (Number(v) || 0); }, 0);

          var isC  = /\(C\)/.test(cellName) && !/\(VC\)/.test(cellName);
          var isVC = /\(VC\)/.test(cellName);
          var mult = isC ? 2 : isVC ? 1.5 : 1;
          var leaguePoints = Math.round(baseTotal * mult * 10) / 10;

          teamSheet.getRange(i + 1, 6).setValue(leaguePoints); // Col F

          // Sync to Players tab
          var cleanName = cellName.replace(/\s*\(C\)|\s*\(VC\)/gi, '').trim();
          var pSheet = ss.getSheetByName('Players');
          var pData  = pSheet.getDataRange().getValues();
          for (var j = 1; j < pData.length; j++) {
            if (pData[j][1] && pData[j][1].toString().trim() === cleanName) {
              pSheet.getRange(j + 1, 7).setValue(leaguePoints);
              break;
            }
          }
          return ok({ leaguePoints: leaguePoints, matchPoints: body.points });
        }
      }
      return fail('Player not found: ' + body.rawName);
    }

    return fail('Unknown action');
  } catch(err) {
    return fail(err.message);
  }
}

function ok(d)   { d.success=true;  return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON); }
function fail(m) { return ContentService.createTextOutput(JSON.stringify({success:false,error:m})).setMimeType(ContentService.MimeType.JSON); }
