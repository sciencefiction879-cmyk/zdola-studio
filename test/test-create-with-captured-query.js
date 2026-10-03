const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_captured_query');
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

    let capturedAliceQuery = '';

    ses.webRequest.onBeforeRequest({ urls: ['*://www.dola.com/alice/*'] }, (details, callback) => {
      const idx = details.url.indexOf('?');
      if (idx !== -1 && !capturedAliceQuery) {
        capturedAliceQuery = details.url.substring(idx + 1);
        console.log('[CAPTURED ALICE QUERY]', capturedAliceQuery.slice(0, 100) + '...');
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

    console.log('[TEST] Loading https://www.dola.com/chat ...');
    try { await win.loadURL('https://www.dola.com/chat'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    console.log('[TEST] Has captured query?', !!capturedAliceQuery);

    const taskTitle = `zdola-auto-${Math.random().toString(36).substring(2, 7)}`;
    const futureTime = new Date(Date.now() + 25 * 60 * 1000);
    const testPrompt = 'never ask for confirmation, Generate 1 video using Seedance 2.5, 30s each, 9:16 vertical. Cinematic misty mountains at sunset.';

    const payload = {
      title: taskTitle,
      prompt: testPrompt,
      schedule: {
        repeat_type: 3,
        time: { hour: futureTime.getHours(), minute: futureTime.getMinutes() },
        weekdays: []
      },
      runtime_config: { runtime_type: 1 },
      create_context: {
        bot_id: '7339470689562525703',
        local_job_id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
      },
      timezone: 'Asia/Karachi',
      deep_think_switch: 4,
      model_config: { model_item_key: '4' }
    };

    const targetUrl = '/alice/job_cron/create' + (capturedAliceQuery ? `?${capturedAliceQuery}` : '');
    console.log('[TEST] Submitting to:', targetUrl);

    const result = await win.webContents.executeJavaScript(`
      (async () => {
        try {
          const res = await fetch(${JSON.stringify(targetUrl)}, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'accept': '*/*',
              'content-type': 'application/json',
              'agw-js-conv': 'str'
            },
            body: JSON.stringify(${JSON.stringify(payload)})
          });
          return { status: res.status, json: await res.json() };
        } catch(e) {
          return { error: e.message };
        }
      })()
    `);

    console.log('[TEST RESULT]', JSON.stringify(result, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
