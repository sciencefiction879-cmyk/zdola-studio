const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookiePath = '/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt';
    const cookies = parseCookieFile(cookiePath);
    console.log(`[TEST] Loaded ${cookies.length} cookies from file.`);

    const partition = 'persist:test_dola_session';
    const ses = session.fromPartition(partition);
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
      } catch (e) {
        // ignore
      }
    }

    console.log('[TEST] Cookies set in session. Creating hidden window...');
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition,
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    console.log('[TEST] Navigating to https://www.dola.com/chat ...');
    await win.loadURL('https://www.dola.com/chat');

    await new Promise(r => setTimeout(r, 4000));

    const finalUrl = win.webContents.getURL();
    const title = win.webContents.getTitle();
    console.log(`[TEST] Loaded URL: ${finalUrl}`);
    console.log(`[TEST] Page Title: ${title}`);

    // Check if logged in
    const pageState = await win.webContents.executeJavaScript(`
      (() => {
        return {
          pathname: window.location.pathname,
          isLogin: window.location.pathname.includes('/login') || window.location.pathname.includes('/auth'),
          hasUserAvatar: !!document.querySelector('[data-testid="user-avatar"], [class*="avatar"], [class*="user-profile"]'),
          bodyTextSnippet: document.body.innerText.slice(0, 300).replace(/\\n+/g, ' ')
        };
      })()
    `);
    console.log('[TEST] Page State:', JSON.stringify(pageState, null, 2));

    // Try job_cron/list
    const cronResp = await win.webContents.executeJavaScript(`
      (async () => {
        try {
          const res = await fetch('/alice/job_cron/list', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'agw-js-conv': 'str'
            },
            body: JSON.stringify({ size: 10, sort_order: 1 })
          });
          return { status: res.status, data: await res.json() };
        } catch(e) {
          return { error: e.message };
        }
      })()
    `);
    console.log('[TEST] Job Cron List Response:', JSON.stringify(cronResp, null, 2));

    // Try skills list
    const skillsResp = await win.webContents.executeJavaScript(`
      (async () => {
        try {
          const res = await fetch('/alice/office/skills/manage/list_by_user', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'agw-js-conv': 'str'
            },
            body: JSON.stringify({ page_size: 20, page_token: '', keyword: '', skill_type_filters: [1] })
          });
          return { status: res.status, data: await res.json() };
        } catch(e) {
          return { error: e.message };
        }
      })()
    `);
    console.log('[TEST] Skills List Response:', JSON.stringify(skillsResp, null, 2));

    win.close();
  } catch (err) {
    console.error('[TEST ERROR]', err);
  } finally {
    app.quit();
  }
});
