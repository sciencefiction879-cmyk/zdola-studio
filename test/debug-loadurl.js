const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const partition = 'persist:debug_partition_1';
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
      } catch (e) {}
    }

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition,
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.log('[FAIL LOAD EVENT]', { errorCode, errorDescription, validatedURL });
    });

    console.log('Starting win.loadURL...');
    await win.loadURL('https://www.dola.com/chat');
    console.log('SUCCESS LOAD:', win.webContents.getURL());
    win.close();
  } catch (err) {
    console.error('[CATCH LOAD ERROR]', err);
  } finally {
    app.quit();
  }
});
