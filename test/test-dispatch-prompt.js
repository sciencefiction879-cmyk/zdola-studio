const { app } = require('electron');
const { parseCookieFile } = require('../src/dola-service');
const { dispatchDolaPrompt } = require('../src/dola-automation');

app.whenReady().then(async () => {
  try {
    const cookiePath = '/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt';
    const cookies = parseCookieFile(cookiePath);
    console.log(`[TEST] Loaded ${cookies.length} cookies.`);

    const account = {
      id: 'acc_test_real',
      name: 'Account 1',
      cookies
    };

    console.log('[TEST] Calling dispatchDolaPrompt...');
    const res = await dispatchDolaPrompt({
      account,
      promptIndex: 1,
      promptText: 'A cute small red panda walking in misty autumn forest, falling golden leaves, cinematic lighting',
      logFn: (msg, type) => console.log(`[LOG ${type || 'info'}] ${msg}`)
    });

    console.log('[TEST RESULT]', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('[ERROR]', err);
  } finally {
    app.quit();
  }
});
