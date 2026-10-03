const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_dola_chat');

    const interceptedApis = [];

    ses.webRequest.onCompleted({ urls: ['*://*/*'] }, (details) => {
      const u = details.url;
      if (u.includes('fallback') || u.includes('video') || u.includes('play') || u.includes('message') || u.includes('history')) {
        interceptedApis.push({ method: details.method, url: u, status: details.statusCode });
      }
    });

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_dola_chat',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    await win.loadURL('https://www.dola.com/chat/38418026620342801');
    await new Promise(r => setTimeout(r, 6000));

    console.log('[TEST] Intercepted APIs count:', interceptedApis.length);
    console.log('[TEST] Sample Intercepted APIs:', JSON.stringify(interceptedApis.slice(0, 15), null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
