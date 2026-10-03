const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_cron_nav');

    ses.webRequest.onBeforeRequest({ urls: ['*://*.dola.com/*'] }, (details, callback) => {
      if (details.url.includes('cron') || details.url.includes('task') || details.url.includes('schedule')) {
        console.log('[NETWORK CRON]', details.method, details.url);
      }
      callback({});
    });

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_cron_nav',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    try { await win.loadURL('https://www.dola.com/chat'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    const clicked = await win.webContents.executeJavaScript(`
      (() => {
        const els = [...document.querySelectorAll('div, span, button, a')];
        const match = els.find(e => e.children.length === 0 && e.innerText && e.innerText.trim() === 'Scheduled Tasks');
        if (match) {
          match.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('[TEST] Clicked Scheduled Tasks:', clicked);

    await new Promise(r => setTimeout(r, 4000));
    console.log('[TEST] Current URL:', win.webContents.getURL());

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
