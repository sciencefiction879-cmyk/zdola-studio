const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_cron_nav');

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_cron_nav',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    console.log('[TEST] Navigating to https://www.dola.com/chat/cron-jobs ...');
    try { await win.loadURL('https://www.dola.com/chat/cron-jobs'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    const pageInfo = await win.webContents.executeJavaScript(`
      (() => {
        const btns = [...document.querySelectorAll('button, a, div[role="button"]')].map(b => ({
          text: b.innerText,
          aria: b.getAttribute('aria-label'),
          className: b.className
        }));
        return {
          title: document.title,
          url: window.location.href,
          buttons: btns.filter(b => b.text && b.text.trim().length > 0 && b.text.trim().length < 30)
        };
      })()
    `);
    console.log('[TEST] Cron jobs page buttons:', JSON.stringify(pageInfo, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
