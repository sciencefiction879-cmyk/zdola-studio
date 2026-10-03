const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_cron_nav');
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

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_cron_nav',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    console.log('[TEST] Navigating to https://www.dola.com/chat ...');
    try { await win.loadURL('https://www.dola.com/chat'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    // Find the Scheduled Tasks link/button
    const linkInfo = await win.webContents.executeJavaScript(`
      (() => {
        const els = [...document.querySelectorAll('a, button, div, span')];
        const match = els.find(e => e.innerText && e.innerText.includes('Scheduled Tasks'));
        if (match) {
          const a = match.closest('a') || match;
          return {
            text: match.innerText,
            href: a.href || null,
            className: match.className
          };
        }
        return null;
      })()
    `);
    console.log('[TEST] Scheduled Tasks element:', JSON.stringify(linkInfo, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
