const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const partition = 'persist:test_create_job_variants';
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

    try { await win.loadURL('https://www.dola.com/chat'); } catch(e) {}
    await new Promise(r => setTimeout(r, 4000));

    const futureTime = new Date(Date.now() + 25 * 60 * 1000);
    const testPrompt = 'never ask for confirmation, Generate 1 video using Seedance 2.5, 30s each, 9:16 vertical. Beautiful cinematic ocean waves.';

    const base = {
      title: 'zdola-test-' + Date.now(),
      prompt: testPrompt,
      schedule: {
        repeat_type: 3,
        time: { hour: futureTime.getHours(), minute: futureTime.getMinutes() },
        weekdays: []
      },
      runtime_config: { runtime_type: 1 },
      timezone: 'Asia/Karachi',
      deep_think_switch: 4,
      model_config: { model_item_key: '4' }
    };

    // Test different payload structures
    const variants = [
      // 1. runtime_context at root with string ids
      {
        ...base,
        runtime_context: { app_id: '495671', bot_id: '7339470689562525703' },
        create_context: { bot_id: '7339470689562525703', local_job_id: 'job_' + Date.now() }
      },
      // 2. runtime_context inside create_context
      {
        ...base,
        create_context: {
          bot_id: '7339470689562525703',
          local_job_id: 'job_' + Date.now(),
          runtime_context: { app_id: '495671', bot_id: '7339470689562525703' }
        }
      },
      // 3. runtime_context inside runtime_config
      {
        ...base,
        runtime_config: {
          runtime_type: 1,
          runtime_context: { app_id: '495671', bot_id: '7339470689562525703' }
        },
        create_context: { bot_id: '7339470689562525703', local_job_id: 'job_' + Date.now() }
      },
      // 4. app_id & bot_id directly in create_context
      {
        ...base,
        create_context: {
          app_id: '495671',
          bot_id: '7339470689562525703',
          local_job_id: 'job_' + Date.now()
        }
      }
    ];

    const results = await win.webContents.executeJavaScript(`
      (async () => {
        const tests = ${JSON.stringify(variants)};
        const out = [];
        for (let i = 0; i < tests.length; i++) {
          try {
            const res = await fetch('/alice/job_cron/create', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'accept': '*/*',
                'content-type': 'application/json',
                'agw-js-conv': 'str'
              },
              body: JSON.stringify(tests[i])
            });
            const j = await res.json();
            out.push({ index: i, code: j.code, msg: j.message || j.msg, data: j.data });
          } catch(e) {
            out.push({ index: i, error: e.message });
          }
        }
        return out;
      })()
    `);

    console.log('[VARIANTS RESULTS]', JSON.stringify(results, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
