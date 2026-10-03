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

    await Promise.race([
      win.loadURL('https://www.dola.com/chat/38418049478951953'),
      new Promise(r => setTimeout(r, 7000))
    ]);
    await new Promise(r => setTimeout(r, 3000));

    const details = await win.webContents.executeJavaScript(`
      (() => {
        const assistantMsgs = [...document.querySelectorAll('[data-testid="receive_message"], [data-testid="receive-message"], [data-role="assistant"], [data-message-author-role="assistant"]')];
        const allMsgs = [...document.querySelectorAll('[data-testid*="message"], [class*="message"]')];
        
        return {
          assistantCount: assistantMsgs.length,
          assistantHtml: assistantMsgs.map(m => m.innerHTML.slice(0, 500)),
          assistantText: assistantMsgs.map(m => m.innerText),
          videoTags: [...document.querySelectorAll('video')].map(v => ({
            src: v.src,
            currentSrc: v.currentSrc,
            paused: v.paused,
            duration: v.duration
          }))
        };
      })()
    `);

    console.log('[DOM DETAILS]:', JSON.stringify(details, null, 2));
    win.close();
  } catch (err) {
    console.error(err);
  } finally {
    app.quit();
  }
});
