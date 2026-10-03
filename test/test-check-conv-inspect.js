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

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_captured_query',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    console.log('[1] Loading chat page...');
    try {
      await Promise.race([
        win.loadURL('https://www.dola.com/chat/38417979442924049'),
        new Promise(r => setTimeout(r, 6000))
      ]);
    } catch (_) {}
    try { win.webContents.stop(); } catch (_) {}

    await new Promise(r => setTimeout(r, 1500));
    console.log('[2] Loaded URL:', win.webContents.getURL());

    const result = await win.webContents.executeJavaScript(`
      (() => {
        const text = (document.body.innerText || '').trim();
        const vids = [...document.querySelectorAll('video')].map(v => v.src || v.currentSrc).filter(Boolean);
        const router = JSON.stringify(window._ROUTER_DATA || {});
        const match = router.match(/fallback_api[\\\\\"\\\\\\\\]*:[\\\\\"\\\\\\\\]*(https?:[^\\\\s\"'\\\\\\\\]+)/);
        return {
          vids,
          hasFallbackApi: Boolean(match),
          bodySnippet: text.slice(0, 1200)
        };
      })()
    `);

    console.log('[CONVERSATION LINKS]:', JSON.stringify(result, null, 2));

    win.close();
  } catch (err) {
    console.error('[INSPECT ERROR]', err);
  } finally {
    app.quit();
  }
});
