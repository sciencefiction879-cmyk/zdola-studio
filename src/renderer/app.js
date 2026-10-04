// ZDola Studio - Renderer Application Logic

document.addEventListener('DOMContentLoaded', async () => {
  // State
  let state = {
    accounts: [],
    selectedAccountIds: new Set(),
    activeFilter: 'all',
    activeTab: 'accounts',
    promptMode: 'single',
    videoCount: 5,
    savePath: '',
    isGenerating: false,
    parallelThreads: 5,
    checkAfterMinutes: 5,
    parallelChecks: 5,
    runLiveOnly: true,
    videoSkillOption: 'default',
    customSkillPath: '',
    allTimeVideosSaved: 0,
    currentQueueTotal: 0,
    currentQueueStarted: 0,
    currentQueueRendering: 0,
    currentQueueDownloaded: 0,
    logs: []
  };

  // DOM Elements
  const el = {
    // Header
    themeLight: document.getElementById('themeLight'),
    themeDark: document.getElementById('themeDark'),
    btnWhatsApp: document.getElementById('btnWhatsApp'),
    btnFacebook: document.getElementById('btnFacebook'),
    btnSupport: document.getElementById('btnSupport'),

    // Left Panel Tabs
    tabAccounts: document.getElementById('tabAccounts'),
    tabSettings: document.getElementById('tabSettings'),
    accountsView: document.getElementById('accountsView'),
    settingsView: document.getElementById('settingsView'),

    // Accounts Actions
    btnAddCookies: document.getElementById('btnAddCookies'),
    btnSelectAll: document.getElementById('btnSelectAll'),
    btnDeselectAll: document.getElementById('btnDeselectAll'),
    btnSelectLive: document.getElementById('btnSelectLive'),
    filterPills: document.querySelectorAll('.filter-pills .pill'),
    accountsList: document.getElementById('accountsList'),
    emptyAccounts: document.getElementById('emptyAccounts'),
    btnDeleteSelected: document.getElementById('btnDeleteSelected'),
    btnDeleteDead: document.getElementById('btnDeleteDead'),
    btnCheckAll: document.getElementById('btnCheckAll'),
    btnCheckSelected: document.getElementById('btnCheckSelected'),
    summarySelected: document.getElementById('summarySelected'),
    summaryStats: document.getElementById('summaryStats'),
    summarySkills: document.getElementById('summarySkills'),
    chkRunLiveOnly: document.getElementById('chkRunLiveOnly'),
    stat24h: document.getElementById('stat24h'),

    // Settings
    settingSingleCookiePath: document.getElementById('settingSingleCookiePath'),
    btnBrowseSingleCookie: document.getElementById('btnBrowseSingleCookie'),
    videoSkillRadios: document.querySelectorAll('input[name="videoSkillOption"]'),
    customSkillWrap: document.getElementById('customSkillWrap'),
    settingCustomSkillPath: document.getElementById('settingCustomSkillPath'),
    btnChooseSkillFile: document.getElementById('btnChooseSkillFile'),
    btnUploadSkills: document.getElementById('btnUploadSkills'),
    btnClearTasks: document.getElementById('btnClearTasks'),
    settingParallelChecks: document.getElementById('settingParallelChecks'),
    settingParallelThreads: document.getElementById('settingParallelThreads'),
    pillsCheckTime: document.querySelectorAll('#pillsCheckTime .pill'),
    btnActivateKey: document.getElementById('btnActivateKey'),
    btnCheckUpdates: document.getElementById('btnCheckUpdates'),

    // Right Panel - Prompt Cards
    tabSinglePrompt: document.getElementById('tabSinglePrompt'),
    tabMultiplePrompts: document.getElementById('tabMultiplePrompts'),
    singlePromptWrap: document.getElementById('singlePromptWrap'),
    multiplePromptsWrap: document.getElementById('multiplePromptsWrap'),
    txtSinglePrompt: document.getElementById('txtSinglePrompt'),
    txtMultiplePrompts: document.getElementById('txtMultiplePrompts'),
    btnVideoMinus: document.getElementById('btnVideoMinus'),
    btnVideoPlus: document.getElementById('btnVideoPlus'),
    inputVideoCount: document.getElementById('inputVideoCount'),
    btnImportPrompts: document.getElementById('btnImportPrompts'),
    btnRemoveDuplicates: document.getElementById('btnRemoveDuplicates'),
    multiPromptCounter: document.getElementById('multiPromptCounter'),

    // Destination & Queue
    inputSavePath: document.getElementById('inputSavePath'),
    btnBrowseFolder: document.getElementById('btnBrowseFolder'),
    btnOpenFolder: document.getElementById('btnOpenFolder'),
    settingSavePath: document.getElementById('settingSavePath'),
    btnBrowseSavePath: document.getElementById('btnBrowseSavePath'),
    btnOpenSavePath: document.getElementById('btnOpenSavePath'),
    chkAutoOpenFolder: document.getElementById('chkAutoOpenFolder'),
    chkOrganizeBatch: document.getElementById('chkOrganizeBatch'),
    chkUnwatermarked1080p: document.getElementById('chkUnwatermarked1080p'),
    queueCountText: document.getElementById('queueCountText'),
    btnStopQueue: document.getElementById('btnStopQueue'),
    btnStartGeneration: document.getElementById('btnStartGeneration'),

    // Activity
    activityCounters: document.getElementById('activityCounters'),
    countStarted: document.getElementById('countStarted'),
    countRendering: document.getElementById('countRendering'),
    countDownloaded: document.getElementById('countDownloaded'),
    countTotal: document.getElementById('countTotal'),
    activitySub: document.getElementById('activitySub'),
    badgeActivityState: document.getElementById('badgeActivityState'),
    btnPreviousVideos: document.getElementById('btnPreviousVideos'),
    progressFill: document.getElementById('progressFill'),
    savedAllTime: document.getElementById('savedAllTime'),
    logTabSimple: document.getElementById('logTabSimple'),
    logTabDetails: document.getElementById('logTabDetails'),
    btnCopyLog: document.getElementById('btnCopyLog'),
    logConsole: document.getElementById('logConsole'),

    // Modal Key
    modalKey: document.getElementById('modalKey'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancelKey: document.getElementById('btnCancelKey'),
    btnConfirmKey: document.getElementById('btnConfirmKey'),
    inputLicenseKey: document.getElementById('inputLicenseKey'),
    linkZakariya: document.getElementById('linkZakariya'),

    // Modal Paste Cookies
    btnPasteCookies: document.getElementById('btnPasteCookies'),
    modalPasteCookies: document.getElementById('modalPasteCookies'),
    btnClosePasteCookies: document.getElementById('btnClosePasteCookies'),
    btnCancelPasteCookies: document.getElementById('btnCancelPasteCookies'),
    btnConfirmPasteCookies: document.getElementById('btnConfirmPasteCookies'),
    inputAccountName: document.getElementById('inputAccountName'),
    txtPasteCookies: document.getElementById('txtPasteCookies'),

    // Modal Previous Videos
    modalPreviousVideos: document.getElementById('modalPreviousVideos'),
    btnClosePreviousVideos: document.getElementById('btnClosePreviousVideos'),
    batchListContainer: document.getElementById('batchListContainer'),
    batchEmptyState: document.getElementById('batchEmptyState'),
    batchDetailsHeader: document.getElementById('batchDetailsHeader'),
    selectedBatchTitle: document.getElementById('selectedBatchTitle'),
    selectedBatchBadge: document.getElementById('selectedBatchBadge'),
    selectedBatchPath: document.getElementById('selectedBatchPath'),
    batchVideosContainer: document.getElementById('batchVideosContainer'),
    btnOpenSelectedBatchFolder: document.getElementById('btnOpenSelectedBatchFolder'),
    btnCheckAndDownloadBatch: document.getElementById('btnCheckAndDownloadBatch')
  };

  // --- THEME HANDLING ---
  function initTheme() {
    const saved = localStorage.getItem('zdola_theme') || 'dark';
    setTheme(saved);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('zdola_theme', theme);
    if (theme === 'light') {
      el.themeLight.classList.add('active');
      el.themeDark.classList.remove('active');
    } else {
      el.themeDark.classList.add('active');
      el.themeLight.classList.remove('active');
    }
  }

  el.themeLight.addEventListener('click', () => setTheme('light'));
  el.themeDark.addEventListener('click', () => setTheme('dark'));

  // --- TAB SWITCHING (Left Panel) ---
  el.tabAccounts.addEventListener('click', () => switchLeftTab('accounts'));
  el.tabSettings.addEventListener('click', () => switchLeftTab('settings'));

  function switchLeftTab(tab) {
    state.activeTab = tab;
    if (tab === 'accounts') {
      el.tabAccounts.classList.add('active');
      el.tabSettings.classList.remove('active');
      el.accountsView.style.display = 'block';
      el.settingsView.style.display = 'none';
    } else {
      el.tabSettings.classList.add('active');
      el.tabAccounts.classList.remove('active');
      el.settingsView.style.display = 'block';
      el.accountsView.style.display = 'none';
    }
  }

  // --- PROMPT MODE SWITCHING (Right Panel) ---
  el.tabSinglePrompt.addEventListener('click', () => switchPromptMode('single'));
  el.tabMultiplePrompts.addEventListener('click', () => switchPromptMode('multiple'));

  function switchPromptMode(mode) {
    state.promptMode = mode;
    if (mode === 'single') {
      el.tabSinglePrompt.classList.add('active');
      el.tabMultiplePrompts.classList.remove('active');
      el.singlePromptWrap.style.display = 'block';
      el.multiplePromptsWrap.style.display = 'none';
      updateQueueCount();
    } else {
      el.tabMultiplePrompts.classList.add('active');
      el.tabSinglePrompt.classList.remove('active');
      el.multiplePromptsWrap.style.display = 'block';
      el.singlePromptWrap.style.display = 'none';
      updateMultiPromptCounter();
    }
  }

  // --- STEPPER FOR VIDEOS ---
  el.btnVideoMinus.addEventListener('click', () => {
    let v = parseInt(el.inputVideoCount.value, 10) || 1;
    if (v > 1) {
      el.inputVideoCount.value = v - 1;
      state.videoCount = v - 1;
      updateQueueCount();
    }
  });

  el.btnVideoPlus.addEventListener('click', () => {
    let v = parseInt(el.inputVideoCount.value, 10) || 1;
    el.inputVideoCount.value = v + 1;
    state.videoCount = v + 1;
    updateQueueCount();
  });

  el.inputVideoCount.addEventListener('input', () => {
    let v = parseInt(el.inputVideoCount.value, 10);
    if (!v || v < 1) v = 1;
    state.videoCount = v;
    updateQueueCount();
  });

  function updateQueueCount() {
    if (state.promptMode === 'single') {
      const cnt = state.videoCount || 1;
      el.queueCountText.textContent = `${cnt} video${cnt === 1 ? '' : 's'} queued`;
    } else {
      const prompts = getMultiPrompts();
      el.queueCountText.textContent = `${prompts.length} video${prompts.length === 1 ? '' : 's'} queued`;
    }
  }

  function getMultiPrompts() {
    const raw = el.txtMultiplePrompts.value;
    if (!raw.trim()) return [];
    if (raw.includes('\n---\n')) {
      return raw.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
    }
    return raw.split('\n').map(s => s.trim()).filter(Boolean);
  }

  function updateMultiPromptCounter() {
    const prompts = getMultiPrompts();
    el.multiPromptCounter.textContent = `${prompts.length} prompt${prompts.length === 1 ? '' : 's'} detected (${prompts.length} videos)`;
    updateQueueCount();
  }

  el.txtMultiplePrompts.addEventListener('input', updateMultiPromptCounter);

  el.btnRemoveDuplicates.addEventListener('click', () => {
    const prompts = getMultiPrompts();
    const unique = [...new Set(prompts)];
    el.txtMultiplePrompts.value = unique.join('\n');
    updateMultiPromptCounter();
    addLog(`Duplicates removed. ${unique.length} unique prompts remaining.`, 'info');
  });

  el.btnImportPrompts.addEventListener('click', async () => {
    if (!window.zdolaAPI) return;
    const content = await window.zdolaAPI.importPromptsFile();
    if (content) {
      el.txtMultiplePrompts.value = content;
      updateMultiPromptCounter();
      addLog(`Prompts imported from file.`, 'info');
    }
  });

  // --- ACCOUNTS FILTERING ---
  el.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      el.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.dataset.filter;
      renderAccountsList();
    });
  });

  // --- ACCOUNTS LIST RENDERING ---
  function renderAccountsList() {
    el.accountsList.innerHTML = '';

    const filtered = state.accounts.filter(acc => {
      if (state.activeFilter === 'all') return true;
      if (state.activeFilter === 'live') return acc.status === 'live';
      if (state.activeFilter === 'noskill') return acc.status === 'noskill';
      if (state.activeFilter === 'other') return acc.status !== 'live' && acc.status !== 'noskill';
      return true;
    });

    if (filtered.length === 0) {
      el.accountsList.appendChild(el.emptyAccounts);
      el.emptyAccounts.style.display = 'flex';
    } else {
      el.emptyAccounts.style.display = 'none';

      filtered.forEach(acc => {
        const card = document.createElement('div');
        card.className = 'account-card';
        card.dataset.id = acc.id;

        const isChecked = state.selectedAccountIds.has(acc.id);

        let badgeClass = 'badge-ready';
        let badgeText = acc.statusText || 'Ready';
        if (acc.status === 'live') {
          badgeClass = 'live';
          badgeText = 'Live ✓';
        } else if (acc.status === 'noskill') {
          badgeClass = 'noskill';
          badgeText = 'No skill';
        } else if (acc.status === 'dead' || acc.status === 'expired') {
          badgeClass = 'dead';
          badgeText = 'Expired';
        } else if (acc.status === 'resting') {
          badgeClass = 'resting';
          badgeText = acc.cooldownText || 'Resting';
        } else if (acc.status === 'checking') {
          badgeClass = 'noskill';
          badgeText = 'Checking…';
        }

        card.innerHTML = `
          <div class="account-info-left">
            <input type="checkbox" class="account-checkbox" ${isChecked ? 'checked' : ''}>
            <div class="account-meta">
              <span class="account-title" title="${acc.filename || acc.name}">${acc.name}</span>
              <span class="account-sub">${acc.videoCount || 0} videos</span>
            </div>
          </div>
          <div class="account-status-right">
            <span class="account-badge ${badgeClass}">${badgeText}</span>
            <button class="btn-chrome" title="Open in browser">Chrome ↗</button>
          </div>
        `;

        // Checkbox event
        const chk = card.querySelector('.account-checkbox');
        chk.addEventListener('change', (e) => {
          if (e.target.checked) {
            state.selectedAccountIds.add(acc.id);
          } else {
            state.selectedAccountIds.delete(acc.id);
          }
          updateAccountsSummary();
        });

        // Chrome button event
        const btnChr = card.querySelector('.btn-chrome');
        btnChr.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.zdolaAPI) {
            window.zdolaAPI.openInChrome(acc.id);
            addLog(`Opening Dola for ${acc.name} in Chrome...`, 'info');
          }
        });

        el.accountsList.appendChild(card);
      });
    }

    updateAccountsSummary();
  }

  function updateAccountsSummary() {
    const total = state.accounts.length;
    const selected = state.selectedAccountIds.size;
    const liveAccounts = state.accounts.filter(a => a.status === 'live');
    const liveCount = liveAccounts.length;
    const readyCount = state.accounts.filter(a => state.selectedAccountIds.has(a.id) && a.status === 'live').length;
    const skillReady = state.accounts.filter(a => a.hasSkill).length;
    const skillMissing = total - skillReady;

    el.summarySelected.textContent = `${selected} of ${total} selected · ${readyCount} live ready to run`;
    el.summaryStats.textContent = `${liveCount} live`;
    el.summarySkills.textContent = `${skillReady} skill ready · ${skillMissing} skill missing`;

    el.stat24h.textContent = `Used in the last 24 hours: ${state.accounts.filter(a => a.usedRecently).length} of ${total}.`;
  }

  // Selection Buttons
  el.btnSelectAll.addEventListener('click', () => {
    state.accounts.forEach(a => state.selectedAccountIds.add(a.id));
    renderAccountsList();
  });

  el.btnDeselectAll.addEventListener('click', () => {
    state.selectedAccountIds.clear();
    renderAccountsList();
  });

  el.btnSelectLive.addEventListener('click', () => {
    state.selectedAccountIds.clear();
    state.accounts.forEach(a => {
      if (a.status === 'live') state.selectedAccountIds.add(a.id);
    });
    renderAccountsList();
  });

  // Add Cookie Files
  el.btnAddCookies.addEventListener('click', async () => {
    if (!window.zdolaAPI) return;
    addLog('Opening file dialog for cookie files...', 'info');
    const newAccounts = await window.zdolaAPI.selectCookieFiles();
    if (newAccounts && newAccounts.length > 0) {
      newAccounts.forEach(acc => {
        if (!state.accounts.find(a => a.id === acc.id)) {
          state.accounts.push(acc);
          state.selectedAccountIds.add(acc.id);
        }
      });
      renderAccountsList();
      addLog(`Added ${newAccounts.length} account cookie files.`, 'success');
      // Automatically prompt to check
      addLog('Click "Check all" to verify accounts and Seedance 2.5 skill.', 'highlight');
    }
  });

  // Delete Accounts
  el.btnDeleteSelected.addEventListener('click', async () => {
    if (state.selectedAccountIds.size === 0) return;
    const ids = Array.from(state.selectedAccountIds);
    state.accounts = state.accounts.filter(a => !state.selectedAccountIds.has(a.id));
    state.selectedAccountIds.clear();
    renderAccountsList();
    if (window.zdolaAPI) await window.zdolaAPI.deleteAccounts(ids);
    addLog(`Deleted selected accounts.`, 'info');
  });

  el.btnDeleteDead.addEventListener('click', async () => {
    const deadIds = state.accounts.filter(a => a.status === 'dead' || a.status === 'expired').map(a => a.id);
    if (deadIds.length === 0) {
      addLog('No dead or expired accounts to delete.', 'info');
      return;
    }
    state.accounts = state.accounts.filter(a => a.status !== 'dead' && a.status !== 'expired');
    deadIds.forEach(id => state.selectedAccountIds.delete(id));
    renderAccountsList();
    if (window.zdolaAPI) await window.zdolaAPI.deleteAccounts(deadIds);
    addLog(`Deleted ${deadIds.length} dead accounts.`, 'info');
  });

  // Check Accounts
  el.btnCheckAll.addEventListener('click', async () => {
    if (state.accounts.length === 0) {
      addLog('No accounts to check. Please add cookie files first.', 'warn');
      return;
    }
    addLog('Starting cookie check for all accounts...', 'highlight');
    el.badgeActivityState.textContent = 'Checking…';
    el.badgeActivityState.className = 'activity-badge badge-active';

    state.accounts.forEach(a => {
      a.status = 'checking';
      a.statusText = 'Checking…';
    });
    renderAccountsList();

    if (window.zdolaAPI) {
      const allIds = state.accounts.map(a => a.id);
      const parallel = parseInt(el.settingParallelChecks.value, 10) || 5;
      await window.zdolaAPI.checkAccounts(allIds, parallel);
    }
  });

  el.btnCheckSelected.addEventListener('click', async () => {
    if (state.selectedAccountIds.size === 0) {
      addLog('No accounts selected to check.', 'warn');
      return;
    }
    const ids = Array.from(state.selectedAccountIds);
    addLog(`Checking ${ids.length} selected accounts...`, 'highlight');
    state.accounts.forEach(a => {
      if (state.selectedAccountIds.has(a.id)) {
        a.status = 'checking';
        a.statusText = 'Checking…';
      }
    });
    renderAccountsList();

    if (window.zdolaAPI) {
      const parallel = parseInt(el.settingParallelChecks.value, 10) || 5;
      await window.zdolaAPI.checkAccounts(ids, parallel);
    }
  });

  // Skill radio switch
  el.videoSkillRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'custom') {
        el.customSkillWrap.style.display = 'flex';
      } else {
        el.customSkillWrap.style.display = 'none';
      }
      state.videoSkillOption = radio.value;
    });
  });

  el.btnChooseSkillFile.addEventListener('click', async () => {
    if (!window.zdolaAPI) return;
    const file = await window.zdolaAPI.selectSkillFile();
    if (file) {
      el.settingCustomSkillPath.value = file;
      state.customSkillPath = file;
      addLog(`Selected custom skill: ${file}`, 'info');
    }
  });

  el.btnUploadSkills.addEventListener('click', async () => {
    const ids = state.selectedAccountIds.size > 0 
      ? Array.from(state.selectedAccountIds) 
      : state.accounts.map(a => a.id);
    if (ids.length === 0) {
      addLog('No accounts selected to upload skill to.', 'warn');
      return;
    }
    addLog(`Uploading video skill to ${ids.length} accounts...`, 'highlight');
    el.badgeActivityState.textContent = 'Uploading…';
    el.btnUploadSkills.disabled = true;

    if (window.zdolaAPI) {
      const skill = state.videoSkillOption === 'custom' ? state.customSkillPath : 'default-30s';
      await window.zdolaAPI.uploadSkillToAccounts(ids, skill);
    }
    el.btnUploadSkills.disabled = false;
  });

  el.btnClearTasks.addEventListener('click', async () => {
    const firstId = state.selectedAccountIds.values().next().value;
    if (!firstId) {
      addLog('Select an account first to clear tasks.', 'warn');
      return;
    }
    if (window.zdolaAPI) {
      await window.zdolaAPI.clearAccountTasks(firstId);
      addLog(`Cleared tasks on account.`, 'success');
    }
  });

  // Performance settings
  el.pillsCheckTime.forEach(pill => {
    pill.addEventListener('click', () => {
      el.pillsCheckTime.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.checkAfterMinutes = parseInt(pill.dataset.time, 10);
      addLog(`Video check interval set to ${state.checkAfterMinutes} minutes.`, 'info');
    });
  });

  // Save Path & Open Folder
  el.btnBrowseFolder.addEventListener('click', async () => {
    if (!window.zdolaAPI) return;
    const dir = await window.zdolaAPI.browseSaveDirectory();
    if (dir) {
      el.inputSavePath.value = dir;
      if (el.settingSavePath) el.settingSavePath.value = dir;
      state.savePath = dir;
      addLog(`Save destination set to: ${dir}`, 'info');
    }
  });

  el.btnOpenFolder.addEventListener('click', () => {
    if (window.zdolaAPI && (el.inputSavePath.value || state.savePath)) {
      window.zdolaAPI.openFolder(el.inputSavePath.value || state.savePath);
    }
  });

  // Settings Video Download Controls
  if (el.btnBrowseSavePath) {
    el.btnBrowseSavePath.addEventListener('click', async () => {
      if (!window.zdolaAPI) return;
      const dir = await window.zdolaAPI.browseSaveDirectory();
      if (dir) {
        el.inputSavePath.value = dir;
        el.settingSavePath.value = dir;
        state.savePath = dir;
        addLog(`Video download location set to: ${dir}`, 'info');
      }
    });
  }

  if (el.btnOpenSavePath) {
    el.btnOpenSavePath.addEventListener('click', () => {
      if (window.zdolaAPI && (el.inputSavePath.value || state.savePath)) {
        window.zdolaAPI.openFolder(el.inputSavePath.value || state.savePath);
      }
    });
  }

  if (el.chkAutoOpenFolder) {
    el.chkAutoOpenFolder.addEventListener('change', () => {
      if (window.zdolaAPI) {
        window.zdolaAPI.saveSettings({ openFolderOnComplete: el.chkAutoOpenFolder.checked });
        addLog(`Auto-open download folder: ${el.chkAutoOpenFolder.checked ? 'Enabled' : 'Disabled'}`, 'info');
      }
    });
  }

  if (el.chkOrganizeBatch) {
    el.chkOrganizeBatch.addEventListener('change', () => {
      if (window.zdolaAPI) {
        window.zdolaAPI.saveSettings({ organizeSubfolders: el.chkOrganizeBatch.checked });
        addLog(`Organize into batch subfolders: ${el.chkOrganizeBatch.checked ? 'Enabled' : 'Disabled'}`, 'info');
      }
    });
  }

  if (el.chkUnwatermarked1080p) {
    el.chkUnwatermarked1080p.addEventListener('change', () => {
      if (window.zdolaAPI) {
        window.zdolaAPI.saveSettings({ unwatermarked1080p: el.chkUnwatermarked1080p.checked });
        addLog(`1080P Unwatermarked quality: ${el.chkUnwatermarked1080p.checked ? 'Enforced' : 'Default'}`, 'info');
      }
    });
  }

  // Start Generation
  el.btnStartGeneration.addEventListener('click', async () => {
    if (state.isGenerating) return;

    let prompts = [];
    if (state.promptMode === 'single') {
      const p = el.txtSinglePrompt.value.trim();
      if (!p) {
        addLog('Please enter a prompt first.', 'warn');
        el.txtSinglePrompt.focus();
        return;
      }
      const count = parseInt(el.inputVideoCount.value, 10) || 1;
      for (let i = 0; i < count; i++) prompts.push(p);
    } else {
      prompts = getMultiPrompts();
      if (prompts.length === 0) {
        addLog('Please enter or import prompts first.', 'warn');
        el.txtMultiplePrompts.focus();
        return;
      }
    }

    // Check accounts
    let activeAccounts = state.accounts.filter(a => state.selectedAccountIds.has(a.id));
    if (activeAccounts.length === 0) {
      activeAccounts = state.accounts;
    }
    if (el.chkRunLiveOnly.checked) {
      activeAccounts = activeAccounts.filter(a => a.status === 'live');
    }
    if (activeAccounts.length === 0) {
      addLog('No live accounts available for generation. Please check accounts or add cookies.', 'error');
      return;
    }

    state.isGenerating = true;
    state.currentQueueTotal = prompts.length;
    state.currentQueueStarted = 0;
    state.currentQueueRendering = 0;
    state.currentQueueDownloaded = 0;

    el.btnStartGeneration.disabled = true;
    el.btnStartGeneration.textContent = 'Generating...';
    el.btnStopQueue.disabled = false;
    el.activityCounters.style.display = 'inline';
    updateActivityCounters();

    el.badgeActivityState.textContent = 'Running';
    el.badgeActivityState.className = 'activity-badge badge-active';
    el.activitySub.textContent = `Starting generation of ${prompts.length} videos across ${activeAccounts.length} accounts...`;

    addLog(`=== Starting batch of ${prompts.length} videos ===`, 'highlight');
    addLog(`Accounts in rotation: ${activeAccounts.map(a => a.name).join(', ')}`, 'info');

    if (window.zdolaAPI) {
      await window.zdolaAPI.startGeneration({
        prompts,
        accountIds: activeAccounts.map(a => a.id),
        saveFolder: el.inputSavePath.value,
        parallelThreads: parseInt(el.settingParallelThreads.value, 10) || 5,
        checkAfterMinutes: state.checkAfterMinutes,
        runLiveOnly: el.chkRunLiveOnly.checked
      });
    }
  });

  el.btnStopQueue.addEventListener('click', async () => {
    if (!state.isGenerating) return;
    addLog('Stopping generation queue...', 'warn');
    if (window.zdolaAPI) {
      await window.zdolaAPI.stopGeneration();
    }
    state.isGenerating = false;
    el.btnStartGeneration.disabled = false;
    el.btnStartGeneration.textContent = 'Start generation →';
    el.btnStopQueue.disabled = true;
    el.badgeActivityState.textContent = 'Stopped';
    el.badgeActivityState.className = 'activity-badge badge-resting';
    el.activitySub.textContent = 'Generation stopped by user.';
  });

  // --- PASTE COOKIES MODAL ---
  el.btnPasteCookies.addEventListener('click', () => {
    el.inputAccountName.value = `Account ${state.accounts.length + 1}`;
    el.txtPasteCookies.value = '';
    el.modalPasteCookies.style.display = 'flex';
  });

  el.btnClosePasteCookies.addEventListener('click', () => {
    el.modalPasteCookies.style.display = 'none';
  });

  el.btnCancelPasteCookies.addEventListener('click', () => {
    el.modalPasteCookies.style.display = 'none';
  });

  el.btnConfirmPasteCookies.addEventListener('click', async () => {
    const rawText = el.txtPasteCookies.value.trim();
    if (!rawText) return;
    const name = el.inputAccountName.value.trim() || `Account ${state.accounts.length + 1}`;
    if (window.zdolaAPI) {
      const res = await window.zdolaAPI.addRawCookies(name, rawText);
      if (res && res.success) {
        state.accounts.push(res.account);
        state.selectedAccountIds.add(res.account.id);
        renderAccountsList();
        addLog(`Added ${res.account.name} with ${res.account.cookies?.length || 0} cookies.`, 'success');
        el.modalPasteCookies.style.display = 'none';
      } else {
        alert(res?.error || 'Failed to parse cookies. Ensure cookies are in valid format.');
      }
    }
  });

  // --- PREVIOUS VIDEOS / BATCH HISTORY MODAL ---
  let selectedBatch = null;

  el.btnPreviousVideos.addEventListener('click', async () => {
    await openBatchHistoryModal();
  });

  el.btnClosePreviousVideos.addEventListener('click', () => {
    el.modalPreviousVideos.style.display = 'none';
  });

  async function openBatchHistoryModal() {
    el.modalPreviousVideos.style.display = 'flex';
    if (!window.zdolaAPI) return;
    const batches = await window.zdolaAPI.getBatchHistory();
    renderBatchList(batches || []);
  }

  function renderBatchList(batches) {
    el.batchListContainer.innerHTML = '';
    if (!batches || !batches.length) {
      el.batchEmptyState.style.display = 'block';
      el.batchDetailsHeader.style.display = 'none';
      el.batchVideosContainer.innerHTML = '<div class="empty-state" style="padding: 40px 0; text-align: center; color: var(--text-muted);">No saved batches yet.</div>';
      el.btnOpenSelectedBatchFolder.disabled = true;
      return;
    }

    el.batchEmptyState.style.display = 'none';

    batches.forEach((batch, index) => {
      const card = document.createElement('div');
      card.className = `batch-item-card ${selectedBatch?.batch_id === batch.batch_id || (!selectedBatch && index === 0) ? 'active' : ''}`;
      
      const date = new Date(batch.created_at);
      const dateStr = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const completedCount = (batch.jobs || []).filter(j => j.status === 'completed').length;
      const totalCount = batch.target_count || (batch.jobs || []).length;
      
      card.innerHTML = `
        <div class="batch-item-title">
          <span>${dateStr}</span>
          <span style="font-size: 11px; color: ${completedCount === totalCount ? '#4caf50' : 'var(--text-muted)'}">${completedCount}/${totalCount}</span>
        </div>
        <div class="batch-item-meta">${totalCount} videos · ${completedCount} saved</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.batch-item-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectBatch(batch);
      });

      el.batchListContainer.appendChild(card);
    });

    if (!selectedBatch && batches.length) {
      selectBatch(batches[0]);
    } else if (selectedBatch) {
      const current = batches.find(b => b.batch_id === selectedBatch.batch_id);
      if (current) selectBatch(current);
    }
  }

  function selectBatch(batch) {
    selectedBatch = batch;
    el.batchDetailsHeader.style.display = 'block';
    
    const date = new Date(batch.created_at);
    el.selectedBatchTitle.textContent = `Batch: ${date.toLocaleString()}`;
    
    const completedCount = (batch.jobs || []).filter(j => j.status === 'completed').length;
    const totalCount = batch.target_count || (batch.jobs || []).length;
    el.selectedBatchBadge.textContent = `${completedCount} of ${totalCount} saved`;
    el.selectedBatchPath.textContent = batch.output_folder || '';
    el.btnOpenSelectedBatchFolder.disabled = !batch.output_folder;

    el.batchVideosContainer.innerHTML = '';
    const jobs = batch.jobs || [];
    if (!jobs.length) {
      el.batchVideosContainer.innerHTML = '<div class="empty-state" style="padding: 20px 0; text-align: center; color: var(--text-muted);">No videos recorded in this batch.</div>';
      return;
    }

    jobs.forEach(job => {
      const row = document.createElement('div');
      row.className = 'batch-video-row';
      
      const sizeStr = job.video_size ? `${(job.video_size / (1024 * 1024)).toFixed(1)} MB` : '';
      const statusLabel = job.status === 'completed' ? 'Saved ✓' : (job.status === 'rendering' ? 'Rendering ⏳' : (job.status === 'failed' ? 'Failed ✕' : 'Pending'));

      const actionButtons = job.video_path ? `
        <button class="btn-subtle btn-xs btn-play-video" title="Play video" style="padding: 2px 6px; font-size: 11px;">▶ Play</button>
        <button class="btn-subtle btn-xs btn-show-finder" title="Show in Finder" style="padding: 2px 6px; font-size: 11px;">📂 Finder</button>
      ` : '';

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1;">
          <span style="font-size: 11px; color: var(--text-muted); min-width: 20px;">#${job.prompt_idx}</span>
          <span class="batch-video-title" title="${job.video_filename || job.prompt}">${job.video_filename || job.prompt}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; color: var(--text-muted);">${sizeStr}</span>
          <span class="batch-video-status ${job.status}">${statusLabel}</span>
          ${actionButtons}
        </div>
      `;

      const playBtn = row.querySelector('.btn-play-video');
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.zdolaAPI?.openVideoFile(job.video_path);
        });
      }

      const finderBtn = row.querySelector('.btn-show-finder');
      if (finderBtn) {
        finderBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.zdolaAPI?.showInFolder(job.video_path);
        });
      }

      row.addEventListener('dblclick', async () => {
        if (job.video_path && window.zdolaAPI) {
          await window.zdolaAPI.openVideoFile(job.video_path);
        }
      });

      el.batchVideosContainer.appendChild(row);
    });
  }

  el.btnOpenSelectedBatchFolder.addEventListener('click', async () => {
    if (selectedBatch?.output_folder && window.zdolaAPI) {
      await window.zdolaAPI.openBatchFolder(selectedBatch.output_folder);
    }
  });

  el.btnCheckAndDownloadBatch.addEventListener('click', async () => {
    addLog('Checking Dola conversations for ready videos...', 'info');
    if (window.zdolaAPI) {
      await window.zdolaAPI.checkPreviousVideos();
    }
    const batches = await window.zdolaAPI.getBatchHistory();
    renderBatchList(batches || []);
  });

  function updateActivityCounters() {
    el.countStarted.textContent = state.currentQueueStarted;
    el.countRendering.textContent = state.currentQueueRendering;
    el.countDownloaded.textContent = state.currentQueueDownloaded;
    el.countTotal.textContent = state.currentQueueTotal;

    const pct = state.currentQueueTotal > 0
      ? Math.round((state.currentQueueDownloaded / state.currentQueueTotal) * 100)
      : 0;
    el.progressFill.style.width = `${pct}%`;
  }

  // --- LOGGING ---
  function addLog(msg, type = 'info') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.textContent = `[${time}] ${msg}`;
    el.logConsole.appendChild(div);
    el.logConsole.scrollTop = el.logConsole.scrollHeight;
    state.logs.push(`[${time}] ${msg}`);
  }

  el.btnCopyLog.addEventListener('click', () => {
    const text = state.logs.join('\n');
    navigator.clipboard.writeText(text);
    addLog('Activity log copied to clipboard.', 'success');
  });

  // External Links
  el.btnWhatsApp.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.zdolaAPI) window.zdolaAPI.openExternal('https://wa.me/923146483323?text=Hi%20Zakariya%20Studio%2C%20I%20need%20support.');
  });

  el.btnFacebook.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.zdolaAPI) window.zdolaAPI.openExternal('https://www.facebook.com/profile.php?id=61571207221556');
  });

  el.btnSupport.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.zdolaAPI) window.zdolaAPI.openExternal('https://zakariyastudio.com/');
  });

  el.linkZakariya.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.zdolaAPI) window.zdolaAPI.openExternal('https://zakariyastudio.com/');
  });

  // Modal
  el.btnActivateKey.addEventListener('click', () => {
    el.modalKey.style.display = 'flex';
  });

  el.btnCloseModal.addEventListener('click', () => {
    el.modalKey.style.display = 'none';
  });

  el.btnCancelKey.addEventListener('click', () => {
    el.modalKey.style.display = 'none';
  });

  el.btnConfirmKey.addEventListener('click', async () => {
    const key = el.inputLicenseKey.value.trim();
    if (!key) return;
    if (window.zdolaAPI) {
      const res = await window.zdolaAPI.activateLicense(key);
      if (res && res.ok) {
        addLog(`License activated successfully: ${key}`, 'success');
        el.modalKey.style.display = 'none';
      } else {
        alert(res?.message || 'Invalid license key.');
      }
    }
  });

  // --- IPC LISTENERS ---
  if (window.zdolaAPI) {
    window.zdolaAPI.onLog((data) => {
      addLog(data.message, data.type || 'info');
    });

    window.zdolaAPI.onAccountUpdated((acc) => {
      const idx = state.accounts.findIndex(a => a.id === acc.id);
      if (idx !== -1) {
        state.accounts[idx] = { ...state.accounts[idx], ...acc };
      } else {
        state.accounts.push(acc);
      }
      renderAccountsList();
    });

    window.zdolaAPI.onProgressUpdated((prog) => {
      if (prog.started !== undefined) state.currentQueueStarted = prog.started;
      if (prog.rendering !== undefined) state.currentQueueRendering = prog.rendering;
      if (prog.downloaded !== undefined) {
        state.currentQueueDownloaded = prog.downloaded;
        state.allTimeVideosSaved += 1;
        el.savedAllTime.textContent = `All-time: ${state.allTimeVideosSaved} videos saved`;
      }
      if (prog.total !== undefined) state.currentQueueTotal = prog.total;
      if (prog.statusText) el.activitySub.textContent = prog.statusText;
      if (prog.badgeState) {
        el.badgeActivityState.textContent = prog.badgeState;
        el.badgeActivityState.className = `activity-badge badge-${prog.badgeState.toLowerCase()}`;
      }
      updateActivityCounters();
    });

    window.zdolaAPI.onQueueFinished(() => {
      state.isGenerating = false;
      el.btnStartGeneration.disabled = false;
      el.btnStartGeneration.textContent = 'Start generation →';
      el.btnStopQueue.disabled = true;
      el.badgeActivityState.textContent = 'Skill done';
      el.badgeActivityState.className = 'activity-badge badge-done';
      el.activitySub.textContent = 'Batch completed. All rendered videos have been downloaded.';
      addLog('Batch generation completed successfully.', 'success');
    });

    // Load initial state
    try {
      const init = await window.zdolaAPI.getInitialState();
      if (init) {
        state.accounts = init.accounts || [];
        state.savePath = init.savePath || '';
        el.inputSavePath.value = state.savePath;
        if (el.settingSavePath) el.settingSavePath.value = state.savePath;
        const s = init.settings || {};
        if (el.chkAutoOpenFolder) el.chkAutoOpenFolder.checked = s.openFolderOnComplete !== false;
        if (el.chkOrganizeBatch) el.chkOrganizeBatch.checked = s.organizeSubfolders !== false;
        if (el.chkUnwatermarked1080p) el.chkUnwatermarked1080p.checked = s.unwatermarked1080p !== false;
        state.allTimeVideosSaved = init.allTimeVideosSaved || 0;
        el.savedAllTime.textContent = `All-time: ${state.allTimeVideosSaved} videos saved`;
        state.accounts.forEach(a => state.selectedAccountIds.add(a.id));
        renderAccountsList();
      }
    } catch (e) {
      console.error('Error getting initial state:', e);
    }
  }

  // ==========================================================================
  // ZDOLA CREATION VIEW LOGIC (Competitor Reference Suite)
  // ==========================================================================
  function initCreationView() {
    const cEl = {
      btnSwitchStudio: document.getElementById('btnSwitchStudio'),
      btnSwitchCreation: document.getElementById('btnSwitchCreation'),
      studioView: document.getElementById('studioView'),
      creationView: document.getElementById('creationView'),
      badgeAppMode: document.getElementById('badgeAppMode'),

      // Tabs
      cTabCreate: document.getElementById('cTabCreate'),
      cTabProfiles: document.getElementById('cTabProfiles'),
      cTabSettings: document.getElementById('cTabSettings'),
      pageCreate: document.getElementById('pageCreate'),
      pageProfiles: document.getElementById('pageProfiles'),
      pageCreationSettings: document.getElementById('pageCreationSettings'),

      // Create Actions
      btnStartCreation: document.getElementById('btnStartCreation'),
      btnStopCreation: document.getElementById('btnStopCreation'),
      btnAccMinus: document.getElementById('btnAccMinus'),
      btnAccPlus: document.getElementById('btnAccPlus'),
      inputAccountsToCreate: document.getElementById('inputAccountsToCreate'),
      accQuickPills: document.querySelectorAll('#accQuickPills .pill'),
      lblAccountsReady: document.getElementById('lblAccountsReady'),

      btnThreadMinus: document.getElementById('btnThreadMinus'),
      btnThreadPlus: document.getElementById('btnThreadPlus'),
      inputThreadsCount: document.getElementById('inputThreadsCount'),
      threadQuickPills: document.querySelectorAll('#threadQuickPills .pill'),
      lblThreadMode: document.getElementById('lblThreadMode'),

      // Stats
      cStatCpu: document.getElementById('cStatCpu'),
      cStatRam: document.getElementById('cStatRam'),
      cStatRamUsed: document.getElementById('cStatRamUsed'),
      cStatRamTotal: document.getElementById('cStatRamTotal'),
      cStatThreadsActive: document.getElementById('cStatThreadsActive'),
      cStatRamAvail: document.getElementById('cStatRamAvail'),

      // Monitor
      btnPauseAllThreads: document.getElementById('btnPauseAllThreads'),
      btnResumeAllThreads: document.getElementById('btnResumeAllThreads'),
      threadListContainer: document.getElementById('threadListContainer'),

      // Log
      btnClearCreationLog: document.getElementById('btnClearCreationLog'),
      creationLogBox: document.getElementById('creationLogBox'),
      cBottomStatus: document.getElementById('cBottomStatus'),
      cBottomStep: document.getElementById('cBottomStep'),

      // Profiles
      btnRefreshProfiles: document.getElementById('btnRefreshProfiles'),
      btnExportAllToStudio: document.getElementById('btnExportAllToStudio'),
      profilesGridContainer: document.getElementById('profilesGridContainer'),

      // Settings
      cSettingProfilesDir: document.getElementById('cSettingProfilesDir'),
      btnBrowseProfilesDir: document.getElementById('btnBrowseProfilesDir'),
      cSettingChromeExe: document.getElementById('cSettingChromeExe'),
      btnLocateChromeExe: document.getElementById('btnLocateChromeExe'),
      cBrowserRadios: document.querySelectorAll('input[name="cBrowserChoice"]'),
      cSettingOtpTimeout: document.getElementById('cSettingOtpTimeout'),
      cSettingResumeDelay: document.getElementById('cSettingResumeDelay'),
      cSettingIncognito: document.getElementById('cSettingIncognito'),
      cSettingEmailProvider: document.getElementById('cSettingEmailProvider'),
      cSettingRelayToken: document.getElementById('cSettingRelayToken'),
      cSettingGmailForward: document.getElementById('cSettingGmailForward'),
      btnSaveCreationSettings: document.getElementById('btnSaveCreationSettings'),
      driveBtns: document.querySelectorAll('.drive-btn')
    };

    let creationState = {
      accountsToCreate: 2,
      parallelThreads: 2,
      isCreating: false,
      threads: new Map(),
      profiles: [],
      settings: {}
    };

    function addCLog(msg, type = 'info') {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timeStr = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
      const div = document.createElement('div');
      div.className = `c-log-line ${type}`;
      div.textContent = `${timeStr} ${msg}`;
      cEl.creationLogBox.appendChild(div);
      cEl.creationLogBox.scrollTop = cEl.creationLogBox.scrollHeight;
    }

    // Switch between Studio & Creation
    function switchMode(mode) {
      if (mode === 'creation') {
        cEl.btnSwitchStudio?.classList.remove('active');
        cEl.btnSwitchCreation?.classList.add('active');
        if (cEl.studioView) cEl.studioView.style.display = 'none';
        if (cEl.creationView) cEl.creationView.style.display = 'flex';
        loadCreationState();
      } else {
        cEl.btnSwitchCreation?.classList.remove('active');
        cEl.btnSwitchStudio?.classList.add('active');
        if (cEl.creationView) cEl.creationView.style.display = 'none';
        if (cEl.studioView) cEl.studioView.style.display = 'grid';
        if (cEl.badgeAppMode) cEl.badgeAppMode.textContent = 'Lifetime';
      }
    }

    cEl.btnSwitchStudio?.addEventListener('click', () => switchMode('studio'));
    cEl.btnSwitchCreation?.addEventListener('click', () => switchMode('creation'));

    // Sub-Tabs
    function switchCreationTab(tab) {
      cEl.cTabCreate?.classList.toggle('active', tab === 'create');
      cEl.cTabProfiles?.classList.toggle('active', tab === 'profiles');
      cEl.cTabSettings?.classList.toggle('active', tab === 'settings');

      if (cEl.pageCreate) cEl.pageCreate.style.display = tab === 'create' ? 'flex' : 'none';
      if (cEl.pageProfiles) cEl.pageProfiles.style.display = tab === 'profiles' ? 'flex' : 'none';
      if (cEl.pageCreationSettings) cEl.pageCreationSettings.style.display = tab === 'settings' ? 'flex' : 'none';

      if (tab === 'profiles') renderProfilesGrid();
    }

    cEl.cTabCreate?.addEventListener('click', () => switchCreationTab('create'));
    cEl.cTabProfiles?.addEventListener('click', () => switchCreationTab('profiles'));
    cEl.cTabSettings?.addEventListener('click', () => switchCreationTab('settings'));

    // Steppers & Pills
    function updateAccountsCount(count) {
      creationState.accountsToCreate = Math.max(1, count);
      if (cEl.inputAccountsToCreate) cEl.inputAccountsToCreate.value = creationState.accountsToCreate;
      if (cEl.lblAccountsReady) cEl.lblAccountsReady.textContent = `Ready to start · ${creationState.accountsToCreate} accounts selected`;
      cEl.accQuickPills.forEach(p => p.classList.toggle('active', Number(p.dataset.val) === creationState.accountsToCreate));
    }

    cEl.btnAccMinus?.addEventListener('click', () => updateAccountsCount(creationState.accountsToCreate - 1));
    cEl.btnAccPlus?.addEventListener('click', () => updateAccountsCount(creationState.accountsToCreate + 1));
    cEl.inputAccountsToCreate?.addEventListener('change', (e) => updateAccountsCount(parseInt(e.target.value, 10) || 1));
    cEl.accQuickPills.forEach(p => {
      p.addEventListener('click', () => updateAccountsCount(Number(p.dataset.val)));
    });

    function updateThreadsCount(count) {
      creationState.parallelThreads = Math.max(1, count);
      if (cEl.inputThreadsCount) cEl.inputThreadsCount.value = creationState.parallelThreads;
      if (cEl.lblThreadMode) cEl.lblThreadMode.textContent = `Mode: ${creationState.parallelThreads} Chrome browsers parallel | ~${creationState.parallelThreads * 350}MB RAM estimated`;
      cEl.threadQuickPills.forEach(p => p.classList.toggle('active', Number(p.dataset.val) === creationState.parallelThreads));
    }

    cEl.btnThreadMinus?.addEventListener('click', () => updateThreadsCount(creationState.parallelThreads - 1));
    cEl.btnThreadPlus?.addEventListener('click', () => updateThreadsCount(creationState.parallelThreads + 1));
    cEl.inputThreadsCount?.addEventListener('change', (e) => updateThreadsCount(parseInt(e.target.value, 10) || 1));
    cEl.threadQuickPills.forEach(p => {
      p.addEventListener('click', () => updateThreadsCount(Number(p.dataset.val)));
    });

    // Start / Stop Creation
    cEl.btnStartCreation?.addEventListener('click', async () => {
      if (creationState.isCreating) return;
      creationState.isCreating = true;
      cEl.btnStartCreation.disabled = true;
      cEl.btnStartCreation.textContent = '⏳ Creating Accounts...';
      cEl.btnStopCreation.disabled = false;
      cEl.cBottomStatus.textContent = 'Running account creation batch...';

      cEl.threadListContainer.innerHTML = '';

      try {
        await window.zdolaAPI.creationStart({
          totalAccounts: creationState.accountsToCreate,
          parallelThreads: creationState.parallelThreads
        });
      } catch (err) {
        addCLog(`Error starting batch: ${err.message}`, 'error');
      }
    });

    cEl.btnStopCreation?.addEventListener('click', async () => {
      await window.zdolaAPI.creationStop();
      creationState.isCreating = false;
      cEl.btnStartCreation.disabled = false;
      cEl.btnStartCreation.textContent = '▶ Start Account Creation';
      cEl.btnStopCreation.disabled = true;
      cEl.cBottomStatus.textContent = 'Stopped.';
    });

    cEl.btnPauseAllThreads?.addEventListener('click', () => window.zdolaAPI.creationPauseAll());
    cEl.btnResumeAllThreads?.addEventListener('click', () => window.zdolaAPI.creationResumeAll());
    cEl.btnClearCreationLog?.addEventListener('click', () => { cEl.creationLogBox.innerHTML = ''; });

    const btnCloseAll = document.getElementById('btnCloseAllChrome');
    if (btnCloseAll) {
      btnCloseAll.addEventListener('click', async () => {
        await window.zdolaAPI.creationCloseAll();
        creationState.isCreating = false;
        cEl.btnStartCreation.disabled = false;
        cEl.btnStartCreation.textContent = '▶ Start Account Creation';
        cEl.btnStopCreation.disabled = true;
        cEl.cBottomStatus.textContent = 'Closed all Chrome windows.';
        addCLog('Closed all Chrome creation windows.', 'info');
      });
    }

    const btnProceedAll = document.getElementById('btnProceedAllDola');
    if (btnProceedAll) {
      btnProceedAll.addEventListener('click', async () => {
        await window.zdolaAPI.creationProceedAll();
        addCLog('Sent command: Proceed all threads to Dola.com', 'highlight');
      });
    }

    const btnRefreshAll = document.getElementById('btnRefreshAllDola');
    if (btnRefreshAll) {
      btnRefreshAll.addEventListener('click', async () => {
        await window.zdolaAPI.creationRefreshAll();
        addCLog('Sent command: Refresh Dola in open Chrome windows', 'info');
      });
    }

    const btnGetAllCookies = document.getElementById('btnGetAllCookies');
    if (btnGetAllCookies) {
      btnGetAllCookies.addEventListener('click', async () => {
        btnGetAllCookies.textContent = '⏳ Saving cookies...';
        const res = await window.zdolaAPI.creationGetAllCookies();
        btnGetAllCookies.textContent = '🍪 Get all cookies';
        addCLog(`Captured cookies from active profiles.`, 'success');
      });
    }

    const btnNotice = document.getElementById('btnNoticeGetZdola');
    if (btnNotice) {
      btnNotice.addEventListener('click', () => {
        window.zdolaAPI?.openExternal('http://zakariyastudio.com/');
      });
    }

    // Thread Updates
    window.zdolaAPI.onCreationThreadUpdated((data) => {
      const { threadKey } = data;
      creationState.threads.set(threadKey, data);
      renderThreadItem(threadKey, data);
    });

    function renderThreadItem(threadKey, data) {
      let item = document.getElementById(`thread_${threadKey}`);
      if (!item) {
        const empty = cEl.threadListContainer.querySelector('.thread-empty');
        if (empty) empty.remove();

        item = document.createElement('div');
        item.id = `thread_${threadKey}`;
        item.className = 'thread-item';
        cEl.threadListContainer.appendChild(item);
      }

      const isSuccess = data.badge === 'success';
      const isPaused = data.badge === 'paused';
      const statusIcon = isSuccess ? '✅' : (isPaused ? '⏸' : '🟠');

      item.innerHTML = `
        <div class="thread-item-left">
          <span class="thread-tag">${threadKey}</span>
          <span class="thread-desc">${statusIcon} ${data.statusText || 'Working...'}</span>
        </div>
        <div class="thread-item-right" style="display: flex; gap: 6px;">
          ${data.canProceed ? `
            <button class="btn-subtle btn-xs btn-proceed-thread" data-thread="${threadKey}" style="background: var(--a); color: #fff;">Proceed to Dola</button>
          ` : ''}
          ${data.canGetCookies ? `
            <button class="btn-get-cookies" data-thread="${threadKey}">🍪 Get Cookies</button>
          ` : `
            <button class="btn-subtle btn-xs btn-pause-thread" data-thread="${threadKey}">${isPaused ? '▶ Resume' : '⏸ Pause'}</button>
          `}
        </div>
      `;

      const btnProceed = item.querySelector('.btn-proceed-thread');
      if (btnProceed) {
        btnProceed.addEventListener('click', async () => {
          btnProceed.textContent = 'Proceeding...';
          await window.zdolaAPI.creationProceedThread(threadKey);
        });
      }

      const btnCookies = item.querySelector('.btn-get-cookies');
      if (btnCookies) {
        btnCookies.addEventListener('click', async () => {
          btnCookies.textContent = 'Extracting...';
          const res = await window.zdolaAPI.creationGetCookies(threadKey);
          btnCookies.textContent = res.ok ? '✓ Cookies Saved' : 'Failed';
        });
      }

      const btnPause = item.querySelector('.btn-pause-thread');
      if (btnPause) {
        btnPause.addEventListener('click', () => {
          if (isPaused) {
            window.zdolaAPI.creationResumeThread(threadKey);
          } else {
            window.zdolaAPI.creationPauseThread(threadKey);
          }
        });
      }
    }

    window.zdolaAPI.onCreationLog(({ message, type }) => {
      addCLog(message, type);
      if (message.includes('CONCURRENT BATCH COMPLETE')) {
        creationState.isCreating = false;
        cEl.btnStartCreation.disabled = false;
        cEl.btnStartCreation.textContent = '▶ Start Account Creation';
        cEl.btnStopCreation.disabled = true;
        cEl.cBottomStatus.textContent = 'Batch completed!';
        loadCreationState();
      }
    });

    // Profiles Rendering
    function renderProfilesGrid() {
      if (!creationState.profiles.length) {
        cEl.profilesGridContainer.innerHTML = `
          <div class="empty-state" style="padding: 40px 0; text-align: center; color: var(--text-muted); width: 100%;">
            No profiles created yet. Use the "Create" tab to generate accounts automatically.
          </div>
        `;
        return;
      }

      cEl.profilesGridContainer.innerHTML = '';
      creationState.profiles.forEach(p => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.innerHTML = `
          <div class="profile-card-top">
            <div>
              <div class="profile-title">${p.folderName}</div>
              <div class="profile-email">✉ ${p.email} (${p.name || 'User'})</div>
            </div>
            <span class="activity-badge badge-live" style="font-size: 11px;">${p.cookiesCount || 0} cookies</span>
          </div>
          <div style="font-size: 11px; color: var(--mute);">Created: ${new Date(p.createdAt).toLocaleDateString()} ${new Date(p.createdAt).toLocaleTimeString()}</div>
          <div class="profile-actions">
            <button class="btn-subtle btn-xs btn-open-profile-chrome" data-id="${p.id}">Open Chrome</button>
            <button class="btn-get-cookies btn-xs btn-sync-studio" data-id="${p.id}">+ Add to Studio</button>
            <button class="btn-subtle btn-xs btn-delete-profile" data-id="${p.id}" style="color: var(--err);">Delete</button>
          </div>
        `;

        card.querySelector('.btn-open-profile-chrome')?.addEventListener('click', () => {
          window.zdolaAPI.creationOpenProfileBrowser(p.id);
        });

        card.querySelector('.btn-sync-studio')?.addEventListener('click', async (e) => {
          e.target.textContent = 'Importing...';
          const res = await window.zdolaAPI.creationSyncToStudio(p.id);
          e.target.textContent = res.ok ? '✓ In Studio' : 'Failed';
        });

        card.querySelector('.btn-delete-profile')?.addEventListener('click', async () => {
          await window.zdolaAPI.creationDeleteProfile(p.id);
          loadCreationState();
        });

        cEl.profilesGridContainer.appendChild(card);
      });
    }

    cEl.btnRefreshProfiles?.addEventListener('click', () => loadCreationState());
    cEl.btnExportAllToStudio?.addEventListener('click', async () => {
      let count = 0;
      for (const p of creationState.profiles) {
        const res = await window.zdolaAPI.creationSyncToStudio(p.id);
        if (res.ok) count++;
      }
      alert(`Imported ${count} profiles into ZDola Studio!`);
    });

    // Settings actions
    cEl.btnBrowseProfilesDir?.addEventListener('click', async () => {
      const chosen = await window.zdolaAPI.creationBrowseProfilesDir();
      if (chosen) cEl.cSettingProfilesDir.value = chosen;
    });

    cEl.btnLocateChromeExe?.addEventListener('click', async () => {
      const chosen = await window.zdolaAPI.creationLocateChrome();
      if (chosen) cEl.cSettingChromeExe.value = chosen;
    });

    cEl.driveBtns?.forEach(btn => {
      btn.addEventListener('click', async () => {
        const shortcut = btn.dataset.shortcut;
        const targetPath = shortcut === 'Documents' ? '~/Documents/Dola_Chrome_Profiles'
          : shortcut === 'Movies' ? '~/Movies/Dola_Chrome_Profiles'
          : '~/Downloads/Dola_Chrome_Profiles';
        cEl.cSettingProfilesDir.value = targetPath;
      });
    });

    cEl.btnSaveCreationSettings?.addEventListener('click', async () => {
      const selectedBrowser = [...cEl.cBrowserRadios].find(r => r.checked)?.value || 'chrome';
      const settings = {
        profilesDir: cEl.cSettingProfilesDir.value,
        chromeExecutable: cEl.cSettingChromeExe.value,
        browserType: selectedBrowser,
        otpTimeout: parseInt(cEl.cSettingOtpTimeout.value, 10) || 120,
        resumeDelay: parseInt(cEl.cSettingResumeDelay.value, 10) || 20,
        incognito: cEl.cSettingIncognito.checked,
        emailProvider: cEl.cSettingEmailProvider.value,
        firefoxRelayToken: cEl.cSettingRelayToken.value.trim(),
        gmailForwardAddress: cEl.cSettingGmailForward.value.trim()
      };
      await window.zdolaAPI.creationSaveSettings(settings);
      addCLog('ZDola Creation settings saved successfully.', 'success');
      alert('Creation settings saved!');
    });

    async function loadCreationState() {
      try {
        const data = await window.zdolaAPI.creationGetState();
        if (data) {
          creationState.settings = data.settings || {};
          creationState.profiles = data.profiles || [];

          if (cEl.badgeAppMode) cEl.badgeAppMode.textContent = `Profiles: ${creationState.profiles.length}`;

          if (cEl.cSettingProfilesDir) cEl.cSettingProfilesDir.value = data.settings.profilesDir || '';
          if (cEl.cSettingChromeExe) cEl.cSettingChromeExe.value = data.settings.chromeExecutable || '';
          if (cEl.cSettingOtpTimeout) cEl.cSettingOtpTimeout.value = data.settings.otpTimeout || 120;
          if (cEl.cSettingResumeDelay) cEl.cSettingResumeDelay.value = data.settings.resumeDelay || 20;
          if (cEl.cSettingIncognito) cEl.cSettingIncognito.checked = Boolean(data.settings.incognito);
          if (cEl.cSettingEmailProvider) cEl.cSettingEmailProvider.value = data.settings.emailProvider || 'tempmail_io';
          if (cEl.cSettingRelayToken) cEl.cSettingRelayToken.value = data.settings.firefoxRelayToken || '';
          if (cEl.cSettingGmailForward) cEl.cSettingGmailForward.value = data.settings.gmailForwardAddress || '';

          if (data.stats) {
            if (cEl.cStatCpu) cEl.cStatCpu.textContent = `${data.stats.cpuPct}%`;
            if (cEl.cStatRam) cEl.cStatRam.textContent = `${data.stats.ramPct}%`;
            if (cEl.cStatRamUsed) cEl.cStatRamUsed.textContent = `${data.stats.usedMem}MB`;
            if (cEl.cStatRamTotal) cEl.cStatRamTotal.textContent = `${data.stats.totalMem}MB`;
            if (cEl.cStatRamAvail) cEl.cStatRamAvail.textContent = `${data.stats.freeMem}MB`;
            if (cEl.cStatThreadsActive) cEl.cStatThreadsActive.textContent = `${data.stats.threadsActive}/${creationState.parallelThreads}`;
          }

          renderProfilesGrid();
        }
      } catch (e) {
        console.error('Error loading creation state:', e);
      }
    }

    loadCreationState();
  }

  initTheme();
  updateQueueCount();
  initCreationView();
});
