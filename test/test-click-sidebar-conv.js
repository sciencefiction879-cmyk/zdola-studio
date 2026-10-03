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

    try { await Promise.race([ win.loadURL('https://www.dola.com/chat'), new Promise(r => setTimeout(r, 6000)) ]); } catch (_) {}
    try { win.webContents.stop(); } catch (_) {}
    await new Promise(r => setTimeout(r, 2000));

    // Find and click "Seedance Video Generation"
    const clicked = await win.webContents.executeJavaScript(`
      (() => {
        const links = [...document.querySelectorAll('a, div, span')];
        const item = links.find(el => (el.innerText || '').trim() === 'Seedance Video Generation');
        if (item) {
          item.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('[CLICKED LINK]:', clicked);

    await new Promise(r => setTimeout(r, 4000));

    const state = await win.webContents.executeJavaScript(`
      (() => {
        const text = document.body.innerText;
        const vids = [...document.querySelectorAll('video')].map(v => v.src || v.currentSrc);
        const router = JSON.stringify(window._ROUTER_DATA || {});
        const match = router.match(/fallback_api[\\\\\"\\\\\\\\]*:[\\\\\"\\\\\\\\]*(https?:[^\\\\s\"'\\\\\\\\]+)/);
        return {
          url: window.location.href,
          textSlice: text.slice(0, 1500),
          vids,
          hasFallbackApi: Boolean(match)
        };
      })()
    `);

    console.log('[CONVERSATION DATA]:', JSON.stringify(state, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
