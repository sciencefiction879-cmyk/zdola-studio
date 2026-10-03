const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_dola_skills');
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

    ses.webRequest.onBeforeRequest({ urls: ['*://*.dola.com/*'] }, (details, callback) => {
      if (details.url.includes('skill') || details.url.includes('manage') || details.url.includes('office') || details.url.includes('list')) {
        console.log('[NETWORK REQUEST]', details.method, details.url);
      }
      callback({});
    });

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_dola_skills',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    console.log('[TEST] Navigating to https://www.dola.com/chat/skills ...');
    await win.loadURL('https://www.dola.com/chat/skills');
    await new Promise(r => setTimeout(r, 4000));

    // Click "Manage"
    const clickedManage = await win.webContents.executeJavaScript(`
      (() => {
        const btns = [...document.querySelectorAll('button, div, span, a')];
        const manageTab = btns.find(b => b.innerText && b.innerText.trim() === 'Manage');
        if (manageTab) {
          manageTab.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('[TEST] Clicked Manage tab:', clickedManage);

    await new Promise(r => setTimeout(r, 4000));

    const managePageData = await win.webContents.executeJavaScript(`
      (() => {
        const text = document.body.innerText;
        return {
          url: window.location.href,
          text: text.slice(0, 1500).replace(/\\s+/g, ' ')
        };
      })()
    `);
    console.log('[TEST] Manage page data:', JSON.stringify(managePageData, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
