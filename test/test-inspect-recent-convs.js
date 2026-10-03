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

    try {
      await Promise.race([ win.loadURL('https://www.dola.com/chat'), new Promise(r => setTimeout(r, 6000)) ]);
    } catch (_) {}
    try { win.webContents.stop(); } catch (_) {}
    await new Promise(r => setTimeout(r, 1500));

    const convs = await win.webContents.executeJavaScript(`
      (() => {
        const layoutData = window._ROUTER_DATA?.loaderData?.['chat_layout']?.data;
        const list = layoutData?.recentConversations?.conversations || [];
        return list.slice(0, 10).map(c => ({
          id: c.conversation_id,
          name: c.name,
          created_at: c.create_time,
          is_pinned: c.is_pinned
        }));
      })()
    `);

    console.log('[RECENT CONVERSATIONS]:', JSON.stringify(convs, null, 2));

    win.close();
  } catch (err) {
    console.error(err);
  } finally {
    app.quit();
  }
});
