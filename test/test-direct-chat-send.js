const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_chat_direct_run');
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
        partition: 'persist:test_chat_direct_run',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    console.log('[TEST] Navigating to https://www.dola.com/chat ...');
    try { await win.loadURL('https://www.dola.com/chat'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    const testPrompt = 'never ask for confirmation, Generate 1 video using Seedance 2.5, 30s each, 9:16 vertical. A glowing emerald butterfly flying through dark neon forest with soft rain. Render in FULL HD 1080p (1080x1920), highest quality, maximum detail.';

    console.log('[TEST] Injecting prompt into ProseMirror editor...');
    const sendResult = await win.webContents.executeJavaScript(`
      (() => {
        const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
        if (!editor) return { ok: false, error: 'Editor not found' };

        editor.focus();
        // Set text content in ProseMirror paragraph
        editor.innerHTML = '<p>' + ${JSON.stringify(testPrompt)} + '</p>';
        editor.dispatchEvent(new Event('input', { bubbles: true }));

        const sendBtn = document.querySelector('[data-testid="chat_input_send_button"]');
        if (!sendBtn) return { ok: false, error: 'Send button not found' };

        // Wait a tick for button to enable
        setTimeout(() => {
          sendBtn.click();
        }, 500);

        return { ok: true, editorHtml: editor.innerHTML };
      })()
    `);
    console.log('[TEST] Send result:', sendResult);

    await new Promise(r => setTimeout(r, 5000));

    const afterSend = await win.webContents.executeJavaScript(`
      (() => {
        const msgs = [...document.querySelectorAll('[data-testid*="message"], [class*="message"], [data-role]')];
        return {
          url: window.location.href,
          messagesCount: msgs.length,
          latestText: document.body.innerText.slice(0, 1000).replace(/\\s+/g, ' ')
        };
      })()
    `);
    console.log('[TEST] After send state:', JSON.stringify(afterSend, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
