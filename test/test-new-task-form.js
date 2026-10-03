const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_cron_nav');

    ses.webRequest.onBeforeRequest({ urls: ['*://*.dola.com/*'] }, (details, callback) => {
      if (!details.url.endsWith('.js') && !details.url.endsWith('.css') && !details.url.endsWith('.png')) {
        console.log('[REQ]', details.method, details.url);
      }
      callback({});
    });

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_cron_nav',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    try { await win.loadURL('https://www.dola.com/chat/cron-jobs'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    const clicked = await win.webContents.executeJavaScript(`
      (() => {
        const btns = [...document.querySelectorAll('button, div, span')];
        const btn = btns.find(b => b.innerText && b.innerText.trim() === 'New Task');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('[TEST] Clicked New Task:', clicked);

    await new Promise(r => setTimeout(r, 3000));

    const modalInfo = await win.webContents.executeJavaScript(`
      (() => {
        const inputs = [...document.querySelectorAll('input, textarea')].map(i => ({
          tag: i.tagName,
          placeholder: i.placeholder,
          value: i.value,
          className: i.className
        }));
        return {
          inputs,
          text: document.body.innerText.slice(0, 1000).replace(/\\s+/g, ' ')
        };
      })()
    `);
    console.log('[TEST] Dialog info after clicking New Task:', JSON.stringify(modalInfo, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
