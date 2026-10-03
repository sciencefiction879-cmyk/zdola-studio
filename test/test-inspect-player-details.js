const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_dola_chat');

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

    const playerDetails = await win.webContents.executeJavaScript(`
      (() => {
        const wrappers = [...document.querySelectorAll('[class*="video-player"]')];
        return wrappers.map(w => {
          const v = w.querySelector('video');
          const btns = [...w.querySelectorAll('button, svg, a')].map(b => ({
            tag: b.tagName,
            aria: b.getAttribute('aria-label'),
            text: b.innerText,
            href: b.href
          }));
          return {
            htmlSnippet: w.innerHTML.slice(0, 400),
            videoSrc: v ? (v.src || v.currentSrc) : null,
            buttons: btns
          };
        });
      })()
    `);
    console.log('[TEST] Player details:', JSON.stringify(playerDetails, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
