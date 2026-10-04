const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { BatchManager } = require('./automation/batch-manager');
const { ProfileStore } = require('./automation/profile-store');
const { findChromeBinary } = require('./automation/chrome-launcher');

let mainWindow = null;
const settingsPath = path.join(app.getPath('userData'), 'zdola_creation_settings.json');

function loadSettings() {
  const defaults = {
    emailProvider: 'tempmail_io',
    cookiesFolder: ProfileStore.getCookiesDir(),
    profilesFolder: ProfileStore.getProfilesDir(),
    chromePath: findChromeBinary(),
    cookieFormat: 'text',
    autoSaveCookies: true,
    otpTimeout: 120,
    theme: 'dark'
  };
  try {
    if (fs.existsSync(settingsPath)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
    }
  } catch (e) {}
  return defaults;
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 780,
    minWidth: 980,
    minHeight: 650,
    title: 'ZDola Creation',
    backgroundColor: '#1c1b1f',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Forward BatchManager events to renderer
BatchManager.on('log', (msg) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-log', msg);
  }
});

BatchManager.on('thread-update', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('thread-update', data);
  }
});

BatchManager.on('batch-start', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('batch-start', data);
  }
});

BatchManager.on('batch-progress', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('batch-progress', data);
  }
});

BatchManager.on('batch-complete', (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('batch-complete', data);
  }
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  await BatchManager.closeAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-settings', () => loadSettings());

ipcMain.handle('save-settings', (event, newSettings) => {
  const merged = { ...loadSettings(), ...newSettings };
  saveSettings(merged);
  if (merged.profilesFolder) ProfileStore.setProfilesDir(merged.profilesFolder);
  if (merged.cookiesFolder) ProfileStore.setCookiesDir(merged.cookiesFolder);
  return merged;
});

ipcMain.handle('select-directory', async (event, currentPath) => {
  const res = await dialog.showOpenDialog(mainWindow, {
    defaultPath: currentPath || os.homedir(),
    properties: ['openDirectory', 'createDirectory']
  });
  if (!res.canceled && res.filePaths.length > 0) {
    return res.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-chrome-binary', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    defaultPath: '/Applications',
    properties: ['openFile'],
    filters: [{ name: 'Applications', extensions: ['app'] }]
  });
  if (!res.canceled && res.filePaths.length > 0) {
    let p = res.filePaths[0];
    if (p.endsWith('.app')) {
      p = path.join(p, 'Contents', 'MacOS', path.basename(p, '.app'));
    }
    return p;
  }
  return null;
});

ipcMain.handle('start-creation', async (event, { accountsCount, threadCount }) => {
  const settings = loadSettings();
  BatchManager.start({
    accountsCount,
    threadCount,
    config: settings
  });
  return { success: true };
});

ipcMain.handle('stop-creation', async () => {
  await BatchManager.stop();
  return { success: true };
});

ipcMain.handle('close-all', async () => {
  await BatchManager.closeAll();
  return { success: true };
});

ipcMain.handle('proceed-thread', (event, threadId) => {
  BatchManager.proceedThread(threadId);
  return { success: true };
});

ipcMain.handle('proceed-all', () => {
  BatchManager.proceedAll();
  return { success: true };
});

ipcMain.handle('refresh-dola', async (event, threadId) => {
  await BatchManager.refreshDola(threadId);
  return { success: true };
});

ipcMain.handle('refresh-all-dola', async () => {
  await BatchManager.refreshAllDola();
  return { success: true };
});

ipcMain.handle('get-cookies', async (event, threadId) => {
  return await BatchManager.getCookies(threadId);
});

ipcMain.handle('get-all-cookies', async () => {
  return await BatchManager.getAllCookies();
});

ipcMain.handle('pause-thread', (event, threadId) => {
  BatchManager.pauseThread(threadId);
  return { success: true };
});

ipcMain.handle('resume-thread', (event, threadId) => {
  BatchManager.resumeThread(threadId);
  return { success: true };
});

ipcMain.handle('pause-all', () => {
  BatchManager.pauseAll();
  return { success: true };
});

ipcMain.handle('resume-all', () => {
  BatchManager.resumeAll();
  return { success: true };
});

ipcMain.handle('list-profiles', () => {
  return ProfileStore.listProfiles();
});

ipcMain.handle('open-profile', (event, profilePath) => {
  const chromeBinary = loadSettings().chromePath || findChromeBinary();
  spawn(chromeBinary, [
    `--user-data-dir=${profilePath}`,
    'https://www.dola.com/chat/'
  ], { detached: true });
  return { success: true };
});

ipcMain.handle('open-cookie-file', (event, cookieFile) => {
  if (cookieFile && fs.existsSync(cookieFile)) {
    shell.showItemInFolder(cookieFile);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('open-folder', (event, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('delete-profile', (event, profileId) => {
  return ProfileStore.deleteProfile(profileId);
});

ipcMain.handle('open-external-url', (event, url) => {
  shell.openExternal(url);
  return { success: true };
});
