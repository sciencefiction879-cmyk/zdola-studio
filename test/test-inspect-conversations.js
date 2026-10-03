const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_chat_direct_run');

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_chat_direct_run',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    try { await win.loadURL('https://www.dola.com/chat'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    const conversations = await win.webContents.executeJavaScript(`
      (() => {
        // Query recent conversations API
        const links = [...document.querySelectorAll('a[href*="/chat/"]')].map(a => a.href);
        const dataKeys = Object.keys(window).filter(k => k.startsWith('_') || k.includes('ROUTER') || k.includes('STORE'));
        return {
          links,
          dataKeys,
          router: window._ROUTER_DATA || null
        };
      })()
    `);
    console.log('[TEST] Conversations in page:', JSON.stringify(conversations, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
