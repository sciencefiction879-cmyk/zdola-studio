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

    console.log('[TEST] Navigating to https://www.dola.com/chat ...');
    try { await win.loadURL('https://www.dola.com/chat'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    // Click on "Seedance 2.5 Video" in sidebar
    const clickedItem = await win.webContents.executeJavaScript(`
      (() => {
        const items = [...document.querySelectorAll('a, button, div, span')];
        const match = items.find(el => el.innerText && el.innerText.trim() === 'Seedance 2.5 Video');
        if (match) {
          const a = match.closest('a') || match;
          const href = a.href || match.getAttribute('data-url') || null;
          match.click();
          return { clicked: true, text: match.innerText, href };
        }
        return { clicked: false };
      })()
    `);
    console.log('[TEST] Clicked conversation item:', clickedItem);

    await new Promise(r => setTimeout(r, 6000));

    const chatContent = await win.webContents.executeJavaScript(`
      (() => {
        return {
          url: window.location.href,
          title: document.title,
          text: document.body.innerText.slice(0, 1500).replace(/\\s+/g, ' ')
        };
      })()
    `);
    console.log('[TEST] Conversation Content:', JSON.stringify(chatContent, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
