const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zdolaAPI', {
  // Account operations
  selectCookieFiles: () => ipcRenderer.invoke('select-cookie-files'),
  addRawCookies: (name, rawText) => ipcRenderer.invoke('add-raw-cookies', { name, rawText }),
  checkAccounts: (accountIds, parallelCount) => ipcRenderer.invoke('check-accounts', { accountIds, parallelCount }),
  deleteAccounts: (accountIds) => ipcRenderer.invoke('delete-accounts', accountIds),
  deleteDeadAccounts: () => ipcRenderer.invoke('delete-dead-accounts'),
  openInChrome: (accountId) => ipcRenderer.invoke('open-in-chrome', accountId),
  clearAccountTasks: (accountId) => ipcRenderer.invoke('clear-account-tasks', accountId),

  // Skills
  selectSkillFile: () => ipcRenderer.invoke('select-skill-file'),
  uploadSkillToAccounts: (accountIds, skillPath) => ipcRenderer.invoke('upload-skill', { accountIds, skillPath }),

  // Folders & paths
  browseSaveDirectory: () => ipcRenderer.invoke('browse-save-directory'),
  getDefaultSaveDirectory: () => ipcRenderer.invoke('get-default-save-directory'),
  openFolder: (dirPath) => ipcRenderer.invoke('open-folder', dirPath),
  importPromptsFile: () => ipcRenderer.invoke('import-prompts-file'),

  // Generation queue & batches
  startGeneration: (payload) => ipcRenderer.invoke('start-generation', payload),
  stopGeneration: () => ipcRenderer.invoke('stop-generation'),
  checkPreviousVideos: () => ipcRenderer.invoke('check-previous-videos'),
  getBatchHistory: () => ipcRenderer.invoke('get-batch-history'),
  openVideoFile: (filePath) => ipcRenderer.invoke('open-video-file', filePath),
  openBatchFolder: (folderPath) => ipcRenderer.invoke('open-batch-folder', folderPath),

  // Settings & state
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getInitialState: () => ipcRenderer.invoke('get-initial-state'),
  activateLicense: (key) => ipcRenderer.invoke('activate-license', key),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // IPC Event Listeners
  onLog: (callback) => {
    const sub = (event, val) => callback(val);
    ipcRenderer.on('log', sub);
    return () => ipcRenderer.removeListener('log', sub);
  },
  onAccountUpdated: (callback) => {
    const sub = (event, val) => callback(val);
    ipcRenderer.on('account-updated', sub);
    return () => ipcRenderer.removeListener('account-updated', sub);
  },
  onProgressUpdated: (callback) => {
    const sub = (event, val) => callback(val);
    ipcRenderer.on('progress-updated', sub);
    return () => ipcRenderer.removeListener('progress-updated', sub);
  },
  onQueueFinished: (callback) => {
    const sub = (event, val) => callback(val);
    ipcRenderer.on('queue-finished', sub);
    return () => ipcRenderer.removeListener('queue-finished', sub);
  }
});
