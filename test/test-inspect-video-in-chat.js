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
        win.loadURL('https://www.dola.com/chat/38417979442924049'),
        new Promise(r => setTimeout(r, 6000))
      ]);
    } catch (_) {}
    try { win.webContents.stop(); } catch (_) {}
    await new Promise(r => setTimeout(r, 3000));

    const videoInspection = await win.webContents.executeJavaScript(`
      (() => {
        try {
          const vids = [...document.querySelectorAll('video')].map(v => v.src || v.currentSrc);
          const iframes = [...document.querySelectorAll('iframe')].map(f => f.src);
          const links = [...document.querySelectorAll('a')].map(a => ({ href: a.href, text: (a.innerText || '').trim() })).filter(a => a.href.includes('video') || a.href.includes('.mp4') || a.text.includes('Download'));
          
          let routerSnippet = '';
          try {
            const routerStr = JSON.stringify(window._ROUTER_DATA || {});
            const idx = routerStr.indexOf('fallback_api');
            if (idx !== -1) {
              routerSnippet = routerStr.slice(idx, idx + 400);
            }
          } catch(e) {}

          return {
            vids,
            iframes,
            links,
            routerSnippet,
            textLen: document.body.innerText.length
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log('[VIDEO INSPECTION RESULT]:', JSON.stringify(videoInspection, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
