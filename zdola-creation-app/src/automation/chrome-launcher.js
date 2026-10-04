const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

function findChromeBinary() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}

function calculateWindowBounds(index, totalThreads) {
  const screenW = 1440;
  const screenH = 900;
  const margin = 20;

  if (totalThreads <= 1) {
    return { x: 80, y: 60, width: 850, height: 650 };
  } else if (totalThreads === 2) {
    const w = Math.floor((screenW - 60) / 2);
    const h = screenH - 120;
    return { x: 30 + index * (w + 20), y: 50, width: w, height: h };
  } else if (totalThreads <= 4) {
    const cols = 2;
    const rows = 2;
    const w = Math.floor((screenW - 60) / cols);
    const h = Math.floor((screenH - 100) / rows);
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { x: 20 + col * (w + 10), y: 40 + row * (h + 10), width: w, height: h };
  } else {
    // 5 to 8 threads: 4 cols x 2 rows
    const cols = 4;
    const rows = 2;
    const w = Math.floor((screenW - 80) / cols);
    const h = Math.floor((screenH - 100) / rows);
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { x: 10 + col * (w + 10), y: 30 + row * (h + 10), width: w, height: h };
  }
}

async function launchBrowser({ chromePath, profileDir, index = 0, totalThreads = 1 }) {
  const binary = chromePath || findChromeBinary();
  const bounds = calculateWindowBounds(index, totalThreads);

  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: binary,
    headless: false,
    userDataDir: profileDir,
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      `--window-position=${bounds.x},${bounds.y}`,
      `--window-size=${bounds.width},${bounds.height}`
    ]
  });

  return browser;
}

module.exports = {
  findChromeBinary,
  calculateWindowBounds,
  launchBrowser
};
