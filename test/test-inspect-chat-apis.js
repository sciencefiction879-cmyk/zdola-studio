const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_dola_chat');

    const apiCalls = [];

    ses.webRequest.onCompleted({ urls: ['*://www.dola.com/*'] }, (details) => {
      if (!details.url.endsWith('.js') && !details.url.endsWith('.css') && !details.url.endsWith('.png')) {
        apiCalls.push({ method: details.method, url: details.url, status: details.statusCode });
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

    console.log('[TEST] API calls on chat load:', JSON.stringify(apiCalls, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
