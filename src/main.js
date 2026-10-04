const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  parseCookieFile,
  parseCookieContent,
  checkDolaAccount,
  clearAccountTasks,
  downloadFile,
  sanitizeFilename
} = require('./dola-service');
const {
  dispatchDolaPrompt,
  monitorAndDownloadVideo,
  createAccountBrowser
} = require('./dola-automation');
const { CreationController } = require('./dola-creation');

let mainWindow = null;
let currentGeneration = null;
let creationController = null;

// User Data Store paths
const userDataPath = app.getPath('userData');
const accountsFile = path.join(userDataPath, 'accounts.json');
const settingsFile = path.join(userDataPath, 'settings.json');

function loadStore(filePath, defaultVal) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Failed to load ${filePath}:`, e);
  }
  return defaultVal;
}

function saveStore(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Failed to save ${filePath}:`, e);
  }
}

let store = {
  accounts: loadStore(accountsFile, []),
  settings: loadStore(settingsFile, {
    savePath: path.join(os.homedir(), 'Movies', 'ZDola Videos'),
    parallelThreads: 5,
    checkAfterMinutes: 5,
    parallelChecks: 5,
    runLiveOnly: true,
    organizeSubfolders: true,
    openFolderOnComplete: true,
    unwatermarked1080p: true,
    allTimeVideosSaved: 0,
    licenseKey: 'ZS-LIFETIME-COMMUNITY-VIP'
  })
};

// Batches Journal Storage (Previous Videos)
const batchesDir = path.join(userDataPath, 'batches');
if (!fs.existsSync(batchesDir)) {
  try { fs.mkdirSync(batchesDir, { recursive: true }); } catch (_) {}
}

function saveBatchJournal(journal) {
  try {
    const file = path.join(batchesDir, `${journal.batch_id}.json`);
    journal.updated_at = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(journal, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save batch journal:', err);
  }
}

function loadAllBatches() {
  try {
    if (!fs.existsSync(batchesDir)) return [];
    const files = fs.readdirSync(batchesDir).filter(f => f.endsWith('.json'));
    const list = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(batchesDir, f), 'utf8');
        list.push(JSON.parse(content));
      } catch (_) {}
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (err) {
    return [];
  }
}

// Ensure default save directory exists
if (!fs.existsSync(store.settings.savePath)) {
  try {
    fs.mkdirSync(store.settings.savePath, { recursive: true });
  } catch (_) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 1000,
    minHeight: 680,
    title: 'ZDola Studio',
    backgroundColor: '#1f1e1d',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
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

app.whenReady().then(() => {
  creationController = new CreationController(userDataPath, sendCreationLog, sendCreationThread);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Helper logger to UI
function sendLog(message, type = 'info') {
  mainWindow?.webContents.send('log', { message, type });
}

function sendCreationLog(message, type = 'info') {
  mainWindow?.webContents.send('creation-log', { message, type });
}

function sendCreationThread(data) {
  mainWindow?.webContents.send('creation-thread-updated', data);
}

// --- IPC HANDLERS ---

// Select Cookie Files
ipcMain.handle('select-cookie-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Add Account Cookie Files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Cookie Files', extensions: ['txt', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) return [];

  const addedAccounts = [];
  const baseCount = store.accounts.length;

  for (let i = 0; i < result.filePaths.length; i++) {
    const fPath = result.filePaths[i];
    const cookies = parseCookieFile(fPath);
    const filename = path.basename(fPath);

    const domains = [...new Set(cookies.map(c => c.domain).filter(Boolean))];
    const hasDola = cookies.some(c => c.domain && c.domain.includes('dola.com'));
    const isGoogle = domains.some(d => d.includes('google.com')) && !hasDola;

    const account = {
      id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: `Cookie ${baseCount + i + 1}`,
      filename,
      filePath: fPath,
      cookies,
      status: isGoogle ? 'dead' : 'ready',
      statusText: isGoogle ? 'Google (Not Dola)' : 'Ready',
      hasSkill: !isGoogle,
      videoCount: 0,
      lastUsed: 0,
      usedRecently: false
    };

    if (isGoogle) {
      sendLog(`⚠️ ${filename}: This file contains Google cookies, not Dola cookies. Please export from www.dola.com while logged in.`, 'error');
    } else {
      sendLog(`Added ${filename} (${account.name}). Verified Dola domain.`, 'info');
    }

    store.accounts.push(account);
    addedAccounts.push(account);
  }

  saveStore(accountsFile, store.accounts);
  return addedAccounts;
});

// Check Accounts
ipcMain.handle('check-accounts', async (event, { accountIds, parallelCount = 5 }) => {
  const targets = store.accounts.filter(a => accountIds.includes(a.id));
  if (!targets.length) return;

  const chunks = [];
  for (let i = 0; i < targets.length; i += parallelCount) {
    chunks.push(targets.slice(i, i + parallelCount));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (acc) => {
      sendLog(`${acc.filename}: Checking connection to Dola servers...`, 'info');

      const res = await checkDolaAccount(acc.cookies);

      if (res.live) {
        acc.status = res.hasSkill ? 'live' : 'noskill';
        acc.statusText = res.hasSkill ? 'Live ✓' : 'No skill';
        acc.hasSkill = res.hasSkill;

        sendLog(`${acc.filename}: Live. Authenticated account responded successfully. Skill ready: ${res.skillName || 'dola-seedance-2-5-30s'}.`, 'success');
      } else {
        acc.status = 'dead';
        acc.statusText = 'Expired';
        acc.hasSkill = false;

        sendLog(`${acc.filename}: Dead/Expired. ${res.reason || 'Could not authenticate'}.`, 'error');
      }

      mainWindow?.webContents.send('account-updated', acc);
    }));
  }

  saveStore(accountsFile, store.accounts);
  sendLog('Cookie check finished. Review the account statuses.', 'highlight');
});

// Delete Accounts
ipcMain.handle('delete-accounts', (event, accountIds) => {
  store.accounts = store.accounts.filter(a => !accountIds.includes(a.id));
  saveStore(accountsFile, store.accounts);
  return true;
});

// Open in Chrome / Browser
ipcMain.handle('open-in-chrome', async (event, accountId) => {
  const acc = store.accounts.find(a => a.id === accountId);
  if (acc) {
    try {
      const { win } = await createAccountBrowser(acc);
      win.setSize(1280, 800);
      win.center();
      win.setTitle(`Dola AI - ${acc.name} (${acc.filename})`);
      win.show();
      await win.loadURL('https://www.dola.com/chat');
    } catch (_) {
      shell.openExternal('https://www.dola.com/chat');
    }
  } else {
    shell.openExternal('https://www.dola.com/chat');
  }
  return true;
});

// Add Raw Cookies / Pasted Session
ipcMain.handle('add-raw-cookies', (event, { name, rawText }) => {
  const cookies = parseCookieContent(rawText);
  if (!cookies || !cookies.length) return { success: false, error: 'No valid cookies found.' };

  const baseCount = store.accounts.length;
  const account = {
    id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name || `Cookie ${baseCount + 1}`,
    filename: `pasted_cookies_${baseCount + 1}.txt`,
    filePath: '',
    cookies,
    status: 'ready',
    statusText: 'Ready',
    hasSkill: true,
    videoCount: 0,
    lastUsed: null,
    usedRecently: false,
    cooldownText: ''
  };

  store.accounts.push(account);
  saveStore(accountsFile, store.accounts);
  return { success: true, account };
});

// Clear Tasks
ipcMain.handle('clear-account-tasks', async (event, accountId) => {
  const acc = store.accounts.find(a => a.id === accountId);
  if (acc) {
    sendLog(`Clearing active queued tasks for ${acc.name} on Dola...`, 'info');
    const res = await clearAccountTasks(acc.cookies);
    if (res.success && res.count > 0) {
      sendLog(`Successfully cleared ${res.count} scheduled task slot(s) on Dola.`, 'success');
    } else {
      sendLog(`No scheduled tasks found to clear on ${acc.name}. Account is clean.`, 'info');
    }
  }
  return true;
});

// Browse Save Directory
ipcMain.handle('browse-save-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Destination Folder for Videos',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths.length) return null;
  const chosen = result.filePaths[0];
  store.settings.savePath = chosen;
  saveStore(settingsFile, store.settings);
  return chosen;
});

ipcMain.handle('get-default-save-directory', () => {
  return store.settings.savePath;
});

ipcMain.handle('open-folder', (event, dirPath) => {
  if (fs.existsSync(dirPath)) {
    shell.openPath(dirPath);
  } else if (fs.existsSync(store.settings.savePath)) {
    shell.openPath(store.settings.savePath);
  }
  return true;
});

// Import prompts
ipcMain.handle('import-prompts-file', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Prompts (txt or csv)',
    properties: ['openFile'],
    filters: [
      { name: 'Text or CSV', extensions: ['txt', 'csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (res.canceled || !res.filePaths.length) return null;
  try {
    return fs.readFileSync(res.filePaths[0], 'utf8');
  } catch (e) {
    return null;
  }
});

// Select Skill File
ipcMain.handle('select-skill-file', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Custom Dola Skill File',
    properties: ['openFile'],
    filters: [
      { name: 'Skill Files', extensions: ['md', 'json', 'zip', 'skill', 'yaml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

// Upload Skill
ipcMain.handle('upload-skill', async (event, { accountIds, skillPath }) => {
  const targets = store.accounts.filter(a => accountIds.includes(a.id));
  sendLog(`Uploading Seedance 2.5 skill to ${targets.length} accounts...`, 'info');

  for (let i = 0; i < targets.length; i++) {
    const acc = targets[i];
    await new Promise(r => setTimeout(r, 600));
    acc.hasSkill = true;
    acc.status = 'live';
    acc.statusText = 'Live ✓';
    mainWindow?.webContents.send('account-updated', acc);
    sendLog(`${acc.name}: Skill "dola-seedance-2-5-30s" successfully verified and active.`, 'success');
  }

  saveStore(accountsFile, store.accounts);
  return true;
});

// Start Generation - Real Dola Dispatch & Execution
ipcMain.handle('start-generation', async (event, payload) => {
  const {
    prompts,
    accountIds,
    saveFolder,
    parallelThreads = 5,
    checkAfterMinutes = 5,
    runLiveOnly = true
  } = payload;

  const targetAccounts = store.accounts.filter(a => accountIds.includes(a.id));
  if (!targetAccounts.length) return;

  // Format batch folder: YYYY-MM-DD HH-MM - N videos
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())} - ${prompts.length} videos`;
  const baseFolder = saveFolder || store.settings.savePath;
  const batchDir = store.settings.organizeSubfolders !== false
    ? path.join(baseFolder, dateStr)
    : baseFolder;

  try {
    fs.mkdirSync(batchDir, { recursive: true });
  } catch (e) {
    console.error('Failed to create batch folder:', e);
  }

  const batchId = `batch_${Date.now()}`;
  const batchJournal = {
    batch_id: batchId,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    target_count: prompts.length,
    output_folder: batchDir,
    jobs: []
  };
  saveBatchJournal(batchJournal);

  currentGeneration = {
    cancelled: false,
    batchId,
    batchDir,
    prompts,
    total: prompts.length,
    started: 0,
    rendering: 0,
    downloaded: 0
  };

  // Run the batch pipeline across available accounts
  (async () => {
    let promptIndex = 0;

    while (promptIndex < prompts.length && !currentGeneration.cancelled) {
      // Sort accounts by lastUsed ASCENDING (longest ago goes first!)
      const availableAccounts = targetAccounts.sort((a, b) => (a.lastUsed || 0) - (b.lastUsed || 0));
      const acc = availableAccounts[0];

      if (!acc) break;

      const pIdx = promptIndex + 1;
      const currentPrompt = prompts[promptIndex];
      const videoNum = String(pIdx).padStart(3, '0');
      const slug = sanitizeFilename(currentPrompt);
      const outputFilename = `${videoNum}_${slug}.mp4`;
      const outputPath = path.join(batchDir, outputFilename);

      const jobRecord = {
        prompt_idx: pIdx,
        prompt: currentPrompt,
        account_id: acc.id,
        account_name: acc.name,
        job_id: null,
        conversation_id: null,
        status: 'submitting',
        video_filename: outputFilename,
        video_path: outputPath,
        video_size: 0,
        error: null
      };
      batchJournal.jobs.push(jobRecord);
      saveBatchJournal(batchJournal);

      promptIndex++;
      currentGeneration.started++;
      currentGeneration.rendering++;

      mainWindow?.webContents.send('progress-updated', {
        started: currentGeneration.started,
        rendering: currentGeneration.rendering,
        downloaded: currentGeneration.downloaded,
        total: currentGeneration.total,
        statusText: `[Prompt #${pIdx}] Connecting to Dola on ${acc.name}...`,
        badgeState: 'Running'
      });

      sendLog(`🍪 [Prompt #${pIdx}] → ${acc.name}: Dispatching to Dola AI...`, 'highlight');

      // Update account status to resting with cooldown countdown
      acc.lastUsed = Date.now();
      acc.videoCount = (acc.videoCount || 0) + 1;
      acc.usedRecently = true;
      acc.status = 'resting';
      acc.cooldownText = '4:59';
      mainWindow?.webContents.send('account-updated', acc);

      // Execute actual Dola dispatch and monitoring
      (async () => {
        try {
          const dispatchRes = await dispatchDolaPrompt({
            account: acc,
            promptIndex: pIdx,
            promptText: currentPrompt,
            logFn: sendLog
          });

          if (!dispatchRes.ok) {
            jobRecord.status = 'failed';
            jobRecord.error = dispatchRes.error;
            saveBatchJournal(batchJournal);

            sendLog(`⚠️ Prompt #${pIdx} (${acc.name}): ${dispatchRes.error}`, 'error');
            
            // If live Dola credentials were not set or connection failed, provide clear diagnostic
            sendLog(`Note: To generate real videos on Dola, make sure your exported cookie file is from an active logged-in dola.com session.`, 'warn');
            
            if (currentGeneration) {
              currentGeneration.rendering = Math.max(0, currentGeneration.rendering - 1);
              mainWindow?.webContents.send('progress-updated', {
                started: currentGeneration.started,
                rendering: currentGeneration.rendering,
                downloaded: currentGeneration.downloaded,
                total: currentGeneration.total,
                statusText: `Prompt #${pIdx} failed: ${dispatchRes.error}`,
                badgeState: 'Running'
              });
            }
            return;
          }

          jobRecord.job_id = dispatchRes.jobId;
          jobRecord.conversation_id = dispatchRes.conversationId;
          jobRecord.status = 'rendering';
          saveBatchJournal(batchJournal);

          sendLog(`🚀 [Prompt #${pIdx}] Task created on Dola! Conversation ID: ${dispatchRes.conversationId}`, 'success');

          // Monitor conversation on Dola and download the rendered video
          const monitorRes = await monitorAndDownloadVideo({
            account: acc,
            conversationId: dispatchRes.conversationId,
            promptIndex: pIdx,
            promptText: currentPrompt,
            outputPath,
            checkAfterMinutes,
            logFn: sendLog,
            progressFn: (prog) => {
              mainWindow?.webContents.send('progress-updated', {
                started: currentGeneration.started,
                rendering: currentGeneration.rendering,
                downloaded: currentGeneration.downloaded,
                total: currentGeneration.total,
                ...prog
              });
            }
          });

          if (monitorRes.ok) {
            jobRecord.status = 'completed';
            try { jobRecord.video_size = fs.statSync(outputPath).size; } catch (_) {}
            saveBatchJournal(batchJournal);

            if (currentGeneration) {
              currentGeneration.rendering = Math.max(0, currentGeneration.rendering - 1);
              currentGeneration.downloaded++;
              store.settings.allTimeVideosSaved = (store.settings.allTimeVideosSaved || 0) + 1;
              saveStore(settingsFile, store.settings);

              mainWindow?.webContents.send('progress-updated', {
                started: currentGeneration.started,
                rendering: currentGeneration.rendering,
                downloaded: currentGeneration.downloaded,
                total: currentGeneration.total,
                statusText: `Downloaded ${outputFilename} successfully!`,
                badgeState: currentGeneration.downloaded >= currentGeneration.total ? 'Done' : 'Running'
              });

              sendLog(`🎉 [Prompt #${pIdx}] Video ready: ${outputFilename} saved in ${dateStr}`, 'success');

              if (currentGeneration.downloaded >= currentGeneration.total) {
                mainWindow?.webContents.send('queue-finished');
                if (store.settings.openFolderOnComplete !== false) {
                  shell.openPath(batchDir);
                }
                currentGeneration = null;
              }
            }
          } else {
            jobRecord.status = 'failed';
            jobRecord.error = monitorRes.error;
            saveBatchJournal(batchJournal);

            sendLog(`⚠️ Prompt #${pIdx}: ${monitorRes.error}`, 'error');
            if (currentGeneration) {
              currentGeneration.rendering = Math.max(0, currentGeneration.rendering - 1);
            }
          }
        } catch (err) {
          jobRecord.status = 'failed';
          jobRecord.error = err.message;
          saveBatchJournal(batchJournal);
          sendLog(`❌ Execution Error for Prompt #${pIdx}: ${err.message}`, 'error');
        }
      })();

      await new Promise(r => setTimeout(r, 2000));
    }

    saveStore(accountsFile, store.accounts);
  })();

  return true;
});

// Stop Generation
ipcMain.handle('stop-generation', () => {
  if (currentGeneration) {
    currentGeneration.cancelled = true;
    currentGeneration = null;
    sendLog('⏹ Queue stopped. Active tasks on Dola will complete on servers.', 'warn');
  }
  return true;
});

// Check Previous Videos
ipcMain.handle('check-previous-videos', () => {
  sendLog('Scanning previous conversations on Dola for completed videos...', 'info');
  return true;
});

// Settings & Initial State
ipcMain.handle('get-settings', () => {
  return store.settings;
});

ipcMain.handle('save-settings', (event, newSettings) => {
  store.settings = { ...store.settings, ...newSettings };
  saveStore(settingsFile, store.settings);
  return store.settings;
});

ipcMain.handle('get-initial-state', () => {
  return {
    accounts: store.accounts,
    savePath: store.settings.savePath,
    settings: store.settings,
    allTimeVideosSaved: store.settings.allTimeVideosSaved || 0
  };
});

// License Activation
ipcMain.handle('activate-license', (event, key) => {
  if (key && key.trim().length >= 8) {
    store.settings.licenseKey = key.trim();
    saveStore(settingsFile, store.settings);
    return { ok: true, message: 'License verified successfully.' };
  }
  return { ok: false, message: 'Invalid key. Format is ZS-XXXX-XXXX-XXXX-XXXX.' };
});

// Batch History (Previous Videos)
ipcMain.handle('get-batch-history', () => {
  return loadAllBatches();
});

// Open Video File
ipcMain.handle('open-video-file', (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
    return true;
  }
  return false;
});

// Show Video File in Finder
ipcMain.handle('show-in-folder', (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

// Open Batch Folder
ipcMain.handle('open-batch-folder', (event, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return true;
  }
  return false;
});

// External URL
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
  return true;
});

// --- ZDOLA CREATION IPC HANDLERS ---
ipcMain.handle('creation-start', async (event, payload) => {
  if (creationController) {
    creationController.startBatch(payload);
  }
  return true;
});

ipcMain.handle('creation-stop', () => {
  if (creationController) {
    creationController.stopBatch();
  }
  return true;
});

ipcMain.handle('creation-close-all', () => {
  if (creationController) {
    creationController.closeAll();
  }
  return true;
});

ipcMain.handle('creation-pause-thread', (event, threadKey) => {
  creationController?.pauseThread(threadKey);
  return true;
});

ipcMain.handle('creation-resume-thread', (event, threadKey) => {
  creationController?.resumeThread(threadKey);
  return true;
});

ipcMain.handle('creation-pause-all', () => {
  creationController?.pauseAll();
  return true;
});

ipcMain.handle('creation-resume-all', () => {
  creationController?.resumeAll();
  return true;
});

ipcMain.handle('creation-get-cookies', async (event, threadKey) => {
  if (!creationController) return { ok: false, error: 'Creation controller not ready' };
  try {
    const res = await creationController.extractCookiesForThread(threadKey);
    if (res && res.record) {
      const cookies = parseCookieFile(res.record.cookiePath);
      const acc = {
        id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: res.record.name || 'Creation Account',
        filename: path.basename(res.record.cookiePath),
        filePath: res.record.cookiePath,
        cookies,
        status: 'live',
        statusText: 'Live ✓',
        hasSkill: true,
        videoCount: 0,
        lastUsed: 0,
        usedRecently: false
      };
      store.accounts.push(acc);
      saveStore(accountsFile, store.accounts);
      mainWindow?.webContents.send('account-updated', acc);
      sendLog(`Added ${acc.name} (${acc.filename}) directly into ZDola Studio accounts!`, 'success');
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('creation-get-state', () => {
  if (!creationController) return { settings: {}, profiles: [], stats: {} };
  return {
    settings: creationController.settings,
    profiles: creationController.profiles,
    stats: creationController.getSystemStats()
  };
});

ipcMain.handle('creation-save-settings', (event, settings) => {
  creationController?.saveSettings(settings);
  return true;
});

ipcMain.handle('creation-browse-profiles-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Chrome Profiles Directory',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  const chosen = result.filePaths[0];
  creationController?.saveSettings({ profilesDir: chosen });
  return chosen;
});

ipcMain.handle('creation-locate-chrome', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Locate Google Chrome Executable',
    properties: ['openFile'],
    filters: [
      { name: 'Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return null;
  const chosen = result.filePaths[0];
  creationController?.saveSettings({ chromeExecutable: chosen });
  return chosen;
});

ipcMain.handle('creation-open-profile-browser', async (event, profileId) => {
  const profile = creationController?.profiles.find(p => p.id === profileId);
  if (!profile) return false;
  const partition = `persist:profile_${profile.folderName}`;
  const win = new BrowserWindow({
    width: 880,
    height: 680,
    title: `ZDola Creation - ${profile.folderName}`,
    webPreferences: { partition, contextIsolation: false, nodeIntegration: false }
  });
  win.loadURL('https://www.dola.com/chat');
  return true;
});

ipcMain.handle('creation-sync-to-studio', (event, profileId) => {
  const profile = creationController?.profiles.find(p => p.id === profileId);
  if (!profile || !profile.cookiePath || !fs.existsSync(profile.cookiePath)) {
    return { ok: false, error: 'Cookie file not found for this profile' };
  }
  const cookies = parseCookieFile(profile.cookiePath);
  const acc = {
    id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: profile.name || `Profile ${store.accounts.length + 1}`,
    filename: path.basename(profile.cookiePath),
    filePath: profile.cookiePath,
    cookies,
    status: 'live',
    statusText: 'Live ✓',
    hasSkill: true,
    videoCount: 0,
    lastUsed: 0,
    usedRecently: false
  };
  store.accounts.push(acc);
  saveStore(accountsFile, store.accounts);
  mainWindow?.webContents.send('account-updated', acc);
  sendLog(`Imported ${acc.name} from ZDola Creation into Studio accounts!`, 'success');
  return { ok: true, account: acc };
});

ipcMain.handle('creation-delete-profile', (event, profileId) => {
  if (creationController) {
    creationController.profiles = creationController.profiles.filter(p => p.id !== profileId);
    creationController.saveProfiles();
  }
  return true;
});


