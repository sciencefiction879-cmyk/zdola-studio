const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_captured_query');
    ses.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_captured_query',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    try {
      await Promise.race([
        win.loadURL('https://www.dola.com/chat/38418026620342801'),
        new Promise(r => setTimeout(r, 6000))
      ]);
    } catch (_) {}
    try { win.webContents.stop(); } catch (_) {}
    await new Promise(r => setTimeout(r, 2000));

    const data = await win.webContents.executeJavaScript(`
      (() => {
        const text = (document.body.innerText || '').trim();
        const router = JSON.stringify(window._ROUTER_DATA || {});
        const match = router.match(/fallback_api[\\\\\"\\\\\\\\]*:[\\\\\"\\\\\\\\]*(https?:[^\\\\s\"'\\\\\\\\]+)/);
        const fbUrl = match ? match[1].replace(/\\\\\\\\u0026/g, '&').replace(/\\\\\\\\\\//g, '/') : null;
        
        return {
          fbUrl,
          fullText: text
        };
      })()
    `);

    console.log('[FB URL]:', data.fbUrl);
    console.log('[FULL CHAT TEXT]:\n', data.fullText);

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
