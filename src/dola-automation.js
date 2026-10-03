// ZDola Automation Engine - Real Browser Automation for Dola AI via Electron
// Replicates the complete workflow from DolaStudio: Job creation, conversation lookup,
// chat monitoring, confirmation handling, QAAB unwatermarked stream decryption, and file download.

const { BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { decryptSeedanceUrl, downloadFile, sanitizeFilename } = require('./dola-service');

const DEFAULT_TZ = 'Asia/Karachi';
const BOT_ID = '7339470689562525703';

// JavaScript to execute inside Dola page to send API requests with cookies & session
const DOLA_API_REQUEST_JS = `
async function(args) {
    try {
        const response = await fetch(args.url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'accept': '*/*',
                'content-type': 'application/json',
                'agw-js-conv': 'str'
            },
            body: JSON.stringify(args.body || {}),
            signal: AbortSignal.timeout(20000)
        });
        const status = response.status;
        let payload;
        try { payload = await response.json(); }
        catch (_) { return { ok: false, _http_status: status, error: 'Dola returned a non-JSON response.' }; }
        return { ok: response.ok, data: payload, _http_status: status };
    } catch (error) {
        return { ok: false, error: 'Request did not finish: ' + error.message };
    }
}
`;

// Quality enhancement matching ZDola's quality_lagao
function applyQualityLagao(prompt) {
  let out = prompt.trim();
  if (!/\b30\s*(sec|second)/i.test(out)) {
    out = 'Create exactly 30 seconds of video. ' + out;
  }
  if (!/9\s*:\s*16/.test(out)) {
    out = 'Vertical 9:16 aspect ratio. ' + out;
  }
  if (!/1080p|1080x1920|full\s*hd/i.test(out)) {
    out = out.replace(/\.+$/, '') + '. Render in FULL HD 1080p (1080x1920), highest quality, maximum detail.';
  }
  return out;
}

// Skill Markdown Link matching ZDola's skill_link
function getSkillLink(skillName = 'dola-seedance-2-5-30s', skillId = '302656690961') {
  const label = skillName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `[${label}](skill://${skillName}?type=1&id=${skillId})`;
}

/**
 * Creates an isolated browser instance with the account's cookies
 */
async function createAccountBrowser(account) {
  const partition = `persist:dola_${account.id}`;
  const ses = session.fromPartition(partition);

  // Set User-Agent to standard Chrome
  ses.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  // Load cookies into session
  if (Array.isArray(account.cookies)) {
    for (const c of account.cookies) {
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
      } catch (err) {
        // ignore individual cookie set warnings
      }
    }
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // background automation
    webPreferences: {
      partition,
      contextIsolation: false,
      nodeIntegration: false
    }
  });

  return { win, ses };
}

/**
 * Dispatches a prompt to Dola AI and runs the task
 */
async function dispatchDolaPrompt({ account, promptIndex, promptText, logFn }) {
  const { win } = await createAccountBrowser(account);

  try {
    logFn(`Connecting ${account.name} to Dola...`, 'info');
    await win.loadURL('https://www.dola.com/chat');

    // Wait 2 seconds for initial page scripts
    await new Promise(r => setTimeout(r, 2000));

    // Check login state
    const currentUrl = win.webContents.getURL();
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      win.close();
      return { ok: false, error: 'Login expired on Dola. Please export fresh cookies.' };
    }

    const taskTitle = `tigger-p${promptIndex}-${Math.random().toString(36).substring(2, 8)}`;
    const formattedPrompt = `${getSkillLink()} ${applyQualityLagao(promptText)}`;

    // Set schedule for 20 minutes in future (Dola scheduled task requirement)
    const futureTime = new Date(Date.now() + 20 * 60 * 1000);

    const createPayload = {
      title: taskTitle,
      prompt: formattedPrompt,
      schedule: {
        repeat_type: 3,
        time: {
          hour: futureTime.getHours(),
          minute: futureTime.getMinutes()
        },
        weekdays: []
      },
      runtime_config: {
        runtime_type: 1
      },
      create_context: {
        bot_id: BOT_ID,
        local_job_id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
      },
      timezone: DEFAULT_TZ,
      deep_think_switch: 4,
      model_config: {
        model_item_key: '4'
      }
    };

    logFn(`Submitting scheduled job "${taskTitle}" to Dola...`, 'info');

    // Execute create job request
    const createResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
      url: '/alice/job_cron/create',
      body: ${JSON.stringify(createPayload)}
    })`);

    let jobId = createResp?.data?.job?.job_id || createResp?.data?.data?.job_id;

    if (!jobId) {
      // If creation returned no ID, query job list
      const listResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
        url: '/alice/job_cron/list',
        body: { size: 20, sort_order: 1 }
      })`);
      const jobs = listResp?.data?.jobs || listResp?.data?.data?.jobs || [];
      const matchingJob = jobs.find(j => j.title === taskTitle || j.content?.cron_job?.title === taskTitle);
      if (matchingJob) {
        jobId = matchingJob.job_id;
      }
    }

    if (!jobId) {
      win.close();
      return {
        ok: false,
        error: createResp?.error || 'No task ID returned from Dola server. Check cookies or daily limits.'
      };
    }

    logFn(`Created Job ID: ${jobId}. Triggering run via API...`, 'highlight');

    // Run the job immediately
    await new Promise(r => setTimeout(r, 1000));
    const runResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
      url: '/alice/job_cron/run',
      body: { job_id: "${jobId}" }
    })`);

    // Poll to find the created conversation
    let conversationId = null;
    for (let poll = 0; poll < 10; poll++) {
      await new Promise(r => setTimeout(r, 1500));
      const listResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
        url: '/alice/job_cron/list',
        body: { size: 20, sort_order: 1 }
      })`);
      const jobs = listResp?.data?.jobs || listResp?.data?.data?.jobs || [];
      const found = jobs.find(j => String(j.job_id) === String(jobId));
      if (found) {
        conversationId = found.conversation_id || found.content?.cron_job?.conversation_id;
        if (conversationId) break;
      }
    }

    // Free the scheduled slot by deleting the cron job
    try {
      await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
        url: '/alice/job_cron/delete',
        body: { job_id: "${jobId}" }
      })`);
      logFn(`Scheduled slot freed for Job ${jobId}.`, 'info');
    } catch (_) {}

    win.close();

    return {
      ok: true,
      jobId,
      conversationId: conversationId || jobId,
      taskTitle
    };
  } catch (err) {
    try { win.close(); } catch (_) {}
    return { ok: false, error: err.message };
  }
}

/**
 * Monitors the Dola chat conversation for video rendering progress and downloads the result
 */
async function monitorAndDownloadVideo({
  account,
  conversationId,
  promptIndex,
  promptText,
  outputPath,
  checkAfterMinutes,
  logFn,
  progressFn
}) {
  const { win } = await createAccountBrowser(account);

  try {
    const chatUrl = `https://www.dola.com/chat/${conversationId}`;
    logFn(`Opening ${chatUrl} to monitor video...`, 'info');
    await win.loadURL(chatUrl);

    // Initial wait for messages
    await new Promise(r => setTimeout(r, 3000));

    // Monitor loop
    let videoUrl = null;
    const maxChecks = (checkAfterMinutes * 60) / 10 + 30; // check every 10 seconds

    for (let check = 0; check < maxChecks; check++) {
      // 1. Check if Dola is asking for confirmation and click the confirm button
      const confirmState = await win.webContents.executeJavaScript(`
        (() => {
          const userSelector = '[data-testid="send_message"], [data-role="user"]';
          const assistantSelector = '[data-testid="receive_message"], [data-role="assistant"]';
          const msgs = [...document.querySelectorAll(assistantSelector)];
          const latest = msgs[msgs.length - 1];
          if (!latest) return { clicked: false, text: '' };
          const text = (latest.innerText || '').trim();
          
          const labels = ['confirm', 'confirm and generate', 'generate video', 'yes, generate', 'proceed with generation'];
          const btn = [...latest.querySelectorAll('button')].find(b => {
            const l = (b.innerText || '').toLowerCase().trim();
            return labels.some(expected => l.includes(expected));
          });
          
          if (btn && !btn.disabled) {
            btn.click();
            return { clicked: true, text: btn.innerText };
          }
          return { clicked: false, text };
        })()
      `);

      if (confirmState.clicked) {
        logFn(`Dola requested confirmation. Clicked "${confirmState.text}" automatically.`, 'highlight');
      }

      // 2. Check router data or DOM video for stream URL
      const videoData = await win.webContents.executeJavaScript(`
        (() => {
          // Check video elements
          const vids = [...document.querySelectorAll('video')];
          for (const v of vids) {
            if (v.src && v.src.startsWith('http')) return { url: v.src, type: 'video_tag' };
          }

          // Check router data / fallback API
          const router = window._ROUTER_DATA || {};
          const routerStr = JSON.stringify(router);
          const match = routerStr.match(/fallback_api[\\\\"]*:[\\\\"]*(https?:[^\\\\s"']+)/);
          if (match) return { url: match[1], type: 'fallback_api' };

          // Check if still rendering
          const text = document.body.innerText || '';
          const isRendering = /generating|rendering|creating your video/i.test(text);

          return { url: null, isRendering };
        })()
      `);

      if (videoData.url) {
        logFn(`Found video stream on Dola! Decrypting unwatermarked stream...`, 'highlight');
        videoUrl = videoData.url;

        // If it's a fallback API, decrypt with QAAB salt
        if (videoData.type === 'fallback_api') {
          const decrypted = decryptSeedanceUrl(videoData.url, '');
          if (decrypted) videoUrl = decrypted;
        }
        break;
      }

      if (videoData.isRendering) {
        progressFn({
          statusText: `Video #${promptIndex} is rendering on Dola servers... (${check * 10}s elapsed)`
        });
      }

      await new Promise(r => setTimeout(r, 10000));
    }

    // Close browser page to save memory while waiting or when done
    win.close();

    if (videoUrl) {
      logFn(`Downloading unwatermarked Seedance 2.5 video to ${path.basename(outputPath)}...`, 'success');
      await downloadFile(videoUrl, outputPath);
      return { ok: true, path: outputPath };
    } else {
      return { ok: false, error: 'Video generation timed out or was not found in chat.' };
    }
  } catch (err) {
    try { win.close(); } catch (_) {}
    return { ok: false, error: err.message };
  }
}

module.exports = {
  dispatchDolaPrompt,
  monitorAndDownloadVideo,
  createAccountBrowser,
  applyQualityLagao,
  getSkillLink
};
