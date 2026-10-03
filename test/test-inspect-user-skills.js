const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_captured_query');
    ses.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

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

    try { await Promise.race([ win.loadURL('https://www.dola.com/chat/skills'), new Promise(r => setTimeout(r, 6000)) ]); } catch (_) {}
    try { win.webContents.stop(); } catch (_) {}
    await new Promise(r => setTimeout(r, 2000));

    const listUrl = '/alice/office/skills/manage/list_by_user' + (capturedAliceQuery ? `?${capturedAliceQuery}` : '');
    const res = await win.webContents.executeJavaScript(`
      (async () => {
        try {
          const resp = await fetch(${JSON.stringify(listUrl)}, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'agw-js-conv': 'str'
            },
            body: JSON.stringify({ page_size: 20, page_num: 1 })
          });
          return await resp.json();
        } catch(e) {
          return { error: e.message };
        }
      })()
    `);

    console.log('[USER SKILLS LIST]:', JSON.stringify(res, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
