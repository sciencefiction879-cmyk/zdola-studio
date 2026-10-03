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
      state.savePath = dir;
      addLog(`Save destination set to: ${dir}`, 'info');
    }
  });

  el.btnOpenFolder.addEventListener('click', () => {
    if (window.zdolaAPI && el.inputSavePath.value) {
      window.zdolaAPI.openFolder(el.inputSavePath.value);
    }
  });

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

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
          <span style="font-size: 11px; color: var(--text-muted); min-width: 20px;">#${job.prompt_idx}</span>
          <span class="batch-video-title" title="${job.video_filename || job.prompt}">${job.video_filename || job.prompt}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 11px; color: var(--text-muted);">${sizeStr}</span>
          <span class="batch-video-status ${job.status}">${statusLabel}</span>
        </div>
      `;

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
        state.allTimeVideosSaved = init.allTimeVideosSaved || 0;
        el.savedAllTime.textContent = `All-time: ${state.allTimeVideosSaved} videos saved`;
        state.accounts.forEach(a => state.selectedAccountIds.add(a.id));
        renderAccountsList();
      }
    } catch (e) {
      console.error('Error getting initial state:', e);
    }
  }

  initTheme();
  updateQueueCount();
});
