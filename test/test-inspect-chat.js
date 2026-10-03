const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_dola_chat');
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
        partition: 'persist:test_dola_chat',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    console.log('[TEST] Navigating to conversation 38418026620342801 ...');
    await win.loadURL('https://www.dola.com/chat/38418026620342801');
    await new Promise(r => setTimeout(r, 6000));

    const chatData = await win.webContents.executeJavaScript(`
      (() => {
        const msgs = [...document.querySelectorAll('[data-testid*="message"], [class*="message"], [data-role]')];
        const videos = [...document.querySelectorAll('video')].map(v => ({ src: v.src, poster: v.poster }));
        const text = document.body.innerText.slice(0, 2000).replace(/\\n+/g, ' \\n ');
        return {
          url: window.location.href,
          messagesCount: msgs.length,
          videos,
          textSnippet: text
        };
      })()
    `);
    console.log('[TEST] Chat Data:', JSON.stringify(chatData, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
