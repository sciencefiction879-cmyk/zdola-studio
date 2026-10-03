const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_captured_query');
    ses.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    let capturedPost = null;
    ses.webRequest.onBeforeRequest({ urls: ['*://www.dola.com/alice/office/skills/manage/*'] }, (details, callback) => {
      if (details.uploadData && details.uploadData.length) {
        const buf = details.uploadData[0].bytes;
        if (buf) {
          capturedPost = {
            url: details.url,
            body: buf.toString('utf8')
          };
          console.log('[CAPTURED SKILL MANAGE REQUEST]', capturedPost);
        }
      }
      callback({});
    });

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_captured_query',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    try { await Promise.race([ win.loadURL('https://www.dola.com/chat/skills'), new Promise(r => setTimeout(r, 6000)) ]); } catch (_) {}
    try { win.webContents.stop(); } catch (_) {}
    await new Promise(r => setTimeout(r, 2000));

    // Click "Manage"
    await win.webContents.executeJavaScript(`
      (() => {
        const btns = [...document.querySelectorAll('button, div, span, a')];
        const manageTab = btns.find(b => b.innerText && b.innerText.trim() === 'Manage');
        if (manageTab) manageTab.click();
      })()
    `);

    await new Promise(r => setTimeout(r, 4000));
    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
