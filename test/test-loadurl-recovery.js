const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const partition = 'persist:dola_acc_test_real';
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

    try {
      console.log('Loading https://www.dola.com/chat ...');
      await win.loadURL('https://www.dola.com/chat');
      console.log('Direct load success!');
    } catch (err) {
      console.log('loadURL threw:', err.message);
      console.log('Current URL after throw:', win.webContents.getURL());
    }

    // Wait 2 seconds
    await new Promise(r => setTimeout(r, 2000));
    console.log('URL after wait:', win.webContents.getURL());
    console.log('Title after wait:', win.webContents.getTitle());

    win.close();
  } catch (err) {
    console.error(err);
  } finally {
    app.quit();
  }
});
