const { app, BrowserWindow, session } = require('electron');
const { parseCookieFile } = require('../src/dola-service');

app.whenReady().then(async () => {
  try {
    const cookies = parseCookieFile('/Users/shaddo/Documents/cookies/dola cookies/www.dola.com_cookies.txt');
    const ses = session.fromPartition('persist:test_dola_chat');

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        partition: 'persist:test_dola_chat',
        contextIsolation: false,
        nodeIntegration: false
      }
    });

    await win.loadURL('https://www.dola.com/chat/38418026620342801');
    await new Promise(r => setTimeout(r, 6000));

    const domInfo = await win.webContents.executeJavaScript(`
      (() => {
        // Look for video elements, links, cards, iframes, and lynx cards
        const allVideos = [...document.querySelectorAll('video')].map(v => ({
          src: v.src,
          currentSrc: v.currentSrc,
          poster: v.poster,
          className: v.className
        }));

        const downloadLinks = [...document.querySelectorAll('a[download], a[href*="mp4"], a[href*="video"], a[href*="byteintl"], a[href*="tiktokcdn"]')].map(a => ({
          href: a.href,
          text: a.innerText
        }));

        const cards = [...document.querySelectorAll('[data-testid*="video"], [class*="video-card"], [class*="media-card"], [class*="player"]')].map(c => ({
          tag: c.tagName,
          className: c.className,
          text: c.innerText.slice(0, 100)
        }));

        // Search router data or global variables for video URLs
        const routerStr = JSON.stringify(window._ROUTER_DATA || {});
        const mp4Matches = routerStr.match(/https?:[^"']+\\.mp4[^"']*/g) || [];
        const fallbackMatches = routerStr.match(/fallback_api[^"']+:[^"']+(https?:[^"']+)/g) || [];

        return {
          allVideos,
          downloadLinks,
          cards,
          mp4MatchesCount: mp4Matches.length,
          sampleMp4: mp4Matches.slice(0, 3),
          fallbackMatches: fallbackMatches.slice(0, 3)
        };
      })()
    `);
    console.log('[TEST] Video DOM & Router info:', JSON.stringify(domInfo, null, 2));

    win.close();
  } catch(e) {
    console.error(e);
  } finally {
    app.quit();
  }
});
