const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_cron_nav');

    ses.webRequest.onBeforeRequest({ urls: ['*://*.dola.com/alice/job_cron/*'] }, (details, callback) => {
      console.log('[REAL JOB CRON CALL]', details.method, details.url);
      if (details.uploadData && details.uploadData.length > 0) {
        for (const data of details.uploadData) {
          if (data.bytes) {
            console.log('[PAYLOAD BYTES]', data.bytes.toString('utf8'));
          }
        }
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

    // Click New Task
    await win.webContents.executeJavaScript(`
      (() => {
        const btns = [...document.querySelectorAll('button, div, span')];
        const btn = btns.find(b => b.innerText && b.innerText.trim() === 'New Task');
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));

    // Fill inputs and click save
    const submitResult = await win.webContents.executeJavaScript(`
      (() => {
        const titleInput = document.querySelector('input[placeholder="Enter task name"]');
        const promptInput = document.querySelector('textarea[placeholder="Enter your task instruction"]');
        if (titleInput) {
          titleInput.value = 'zdola-test-task';
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (promptInput) {
          promptInput.value = 'never ask for confirmation, Generate 1 video using Seedance 2.5, 30s each, 9:16 vertical. Test video.';
          promptInput.dispatchEvent(new Event('input', { bubbles: true }));
          promptInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Find save/create button
        const btns = [...document.querySelectorAll('button, div[role="button"]')];
        const saveBtn = btns.find(b => {
          const t = (b.innerText || '').toLowerCase().trim();
          return t === 'create' || t === 'save' || t === 'confirm' || t === 'submit';
        });
        
        if (saveBtn) {
          saveBtn.click();
          return { clicked: true, text: saveBtn.innerText };
        }
        return { clicked: false, availableButtons: btns.map(b => b.innerText).filter(Boolean).slice(0, 10) };
      })()
    `);
    console.log('[TEST] Submit result:', JSON.stringify(submitResult, null, 2));

    await new Promise(r => setTimeout(r, 4000));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
