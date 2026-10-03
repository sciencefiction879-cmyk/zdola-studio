const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_chat_direct');
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
        partition: 'persist:test_chat_direct',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    console.log('[TEST] Navigating to https://www.dola.com/chat ...');
    try { await win.loadURL('https://www.dola.com/chat'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    const inputData = await win.webContents.executeJavaScript(`
      (() => {
        const textareas = [...document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"]')].map(el => ({
          tag: el.tagName,
          id: el.id,
          placeholder: el.placeholder,
          className: el.className,
          contenteditable: el.getAttribute('contenteditable')
        }));

        const sendBtns = [...document.querySelectorAll('button, div[role="button"]')].filter(b => {
          const t = (b.innerText || '').toLowerCase();
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const testid = (b.getAttribute('data-testid') || '').toLowerCase();
          return t.includes('send') || aria.includes('send') || testid.includes('send');
        }).map(b => ({
          tag: b.tagName,
          text: b.innerText,
          aria: b.getAttribute('aria-label'),
          testid: b.getAttribute('data-testid'),
          className: b.className
        }));

        return { textareas, sendBtns };
      })()
    `);
    console.log('[TEST] Chat Input & Send elements:', JSON.stringify(inputData, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
