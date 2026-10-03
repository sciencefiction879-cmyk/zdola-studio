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
    await new Promise(r => setTimeout(r, 2000));

    // Inspect elements inside Manage tab
    const items = await win.webContents.executeJavaScript(`
      (() => {
        const elements = [...document.querySelectorAll('a, button, div[role="button"], [class*="card"], [class*="item"]')];
        const skillCards = elements.filter(el => (el.innerText || '').includes('Seedance'));
        return skillCards.map(c => ({
          tagName: c.tagName,
          className: c.className,
          text: (c.innerText || '').slice(0, 300),
          href: c.href || c.getAttribute('href'),
          id: c.id || c.getAttribute('data-id')
        }));
      })()
    `);

    console.log('[SKILL CARDS]:', JSON.stringify(items, null, 2));
    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
