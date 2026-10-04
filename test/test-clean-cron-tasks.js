const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_captured_query');
    ses.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    for (const c of cookies) {
      try {
        await ses.cookies.set({
          url: 'https://www.dola.com',
          name: c.name,
          value: c.value,
          domain: c.domain || '.dola.com',
          path: c.path || '/',
          secure: c.secure !== false,
          httpOnly: c.httpOnly || false,
          sameSite: 'lax'
        });
      } catch (e) {}
    }

    let capturedAliceQuery = '';
    ses.webRequest.onBeforeRequest({ urls: ['*://www.dola.com/alice/*'] }, (details, callback) => {
      const idx = details.url.indexOf('?');
      if (idx !== -1 && !capturedAliceQuery) {
        capturedAliceQuery = details.url.substring(idx + 1);
      }
      callback({});
    });

    const win = new BrowserWindow({ show: false, webPreferences: { partition: 'persist:test_captured_query' } });
    try { await Promise.race([ win.loadURL('https://www.dola.com/chat'), new Promise(r => setTimeout(r, 6000)) ]); } catch (_) {}
    try { win.webContents.stop(); } catch (_) {}
    await new Promise(r => setTimeout(r, 2000));

    const queryStr = capturedAliceQuery ? '?' + capturedAliceQuery : '';
    const listUrl = '/alice/job_cron/list' + queryStr;
    const deleteUrl = '/alice/job_cron/delete' + queryStr;

    const listRes = await win.webContents.executeJavaScript(`
      (async () => {
        try {
          const resp = await fetch(${JSON.stringify(listUrl)}, {
            method: 'POST',
            credentials: 'include',
            headers: { 'accept': '*/*', 'content-type': 'application/json', 'agw-js-conv': 'str' },
            body: JSON.stringify({ size: 50, sort_order: 1 })
          });
          return await resp.json();
        } catch(e) {
          return { error: e.message };
        }
      })()
    `);

    const jobs = listRes?.data?.jobs || [];
    console.log('[CURRENT JOBS COUNT]:', jobs.length);
    console.log('[JOBS LIST]:', JSON.stringify(jobs.map(j => ({ id: j.job_id, title: j.content?.cron_job?.title || j.title })), null, 2));

    // Delete all existing jobs to free the quota
    let deletedCount = 0;
    for (const j of jobs) {
      if (!j.job_id) continue;
      const delRes = await win.webContents.executeJavaScript(`
        (async () => {
          try {
            const resp = await fetch(${JSON.stringify(deleteUrl)}, {
              method: 'POST',
              credentials: 'include',
              headers: { 'accept': '*/*', 'content-type': 'application/json', 'agw-js-conv': 'str' },
              body: JSON.stringify({ job_id: "${j.job_id}" })
            });
            return await resp.json();
          } catch(e) {
            return { error: e.message };
          }
        })()
      `);
      console.log(`[DELETED JOB ${j.job_id}]:`, delRes?.code === 0 ? 'SUCCESS' : JSON.stringify(delRes));
      deletedCount++;
    }

    console.log(`[FINISHED] Cleared ${deletedCount} scheduled tasks.`);
    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
