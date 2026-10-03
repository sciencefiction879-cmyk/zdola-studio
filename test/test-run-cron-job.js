const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_captured_query');

    let capturedAliceQuery = '';
    ses.webRequest.onBeforeRequest({ urls: ['*://www.dola.com/alice/*'] }, (details, callback) => {
      const idx = details.url.indexOf('?');
      if (idx !== -1 && !capturedAliceQuery) {
        capturedAliceQuery = details.url.substring(idx + 1);
      }
      callback({});
    });

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_captured_query',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    try { await win.loadURL('https://www.dola.com/chat'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    console.log('[TEST] Triggering /alice/job_cron/run for job 2976799658769...');
    const runUrl = '/alice/job_cron/run' + (capturedAliceQuery ? `?${capturedAliceQuery}` : '');
    const runResp = await win.webContents.executeJavaScript(`
      (async () => {
        try {
          const res = await fetch(${JSON.stringify(runUrl)}, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'agw-js-conv': 'str'
            },
            body: JSON.stringify({ job_id: "2976799658769" })
          });
          return { status: res.status, json: await res.json() };
        } catch(e) {
          return { error: e.message };
        }
      })()
    `);
    console.log('[RUN RESULT]', JSON.stringify(runResp, null, 2));

    await new Promise(r => setTimeout(r, 2000));

    // Poll job list to find conversation
    const listUrl = '/alice/job_cron/list' + (capturedAliceQuery ? `?${capturedAliceQuery}` : '');
    const listResp = await win.webContents.executeJavaScript(`
      (async () => {
        try {
          const res = await fetch(${JSON.stringify(listUrl)}, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'agw-js-conv': 'str'
            },
            body: JSON.stringify({ size: 10, sort_order: 1 })
          });
          return { status: res.status, json: await res.json() };
        } catch(e) {
          return { error: e.message };
        }
      })()
    `);
    const jobs = listResp?.json?.data?.jobs || [];
    const thisJob = jobs.find(j => String(j.job_id) === '2976799658769');
    console.log('[JOB IN LIST]', JSON.stringify(thisJob, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
