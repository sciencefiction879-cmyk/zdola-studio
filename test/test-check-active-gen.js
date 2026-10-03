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

    console.log('[TEST] Checking conversation local_2054518979192111 ...');
    try { await win.loadURL('https://www.dola.com/chat/local_2054518979192111'); } catch(e) {}
    await new Promise(r => setTimeout(r, 6000));

    const responseData = await win.webContents.executeJavaScript(`
      (() => {
        const msgs = [...document.querySelectorAll('[data-testid="receive_message"], [data-role="assistant"], [class*="message-item"]')].map(m => m.innerText);
        const videos = [...document.querySelectorAll('video')].map(v => v.src || v.currentSrc);
        const players = [...document.querySelectorAll('[class*="video-player"]')].length;
        const bodySnippet = document.body.innerText.slice(0, 1500).replace(/\\s+/g, ' ');
        return {
          url: window.location.href,
          assistantMsgs: msgs,
          videos,
          videoPlayersCount: players,
          bodySnippet
        };
      })()
    `);
    console.log('[TEST] Conversation Progress:', JSON.stringify(responseData, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
