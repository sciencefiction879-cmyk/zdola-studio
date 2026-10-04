// ZDola Automation Engine - Real Browser Automation for Dola AI via Electron
// Replicates the complete verified workflow from ZDola Studio:
// 1. Session creation with cookie injection
// 2. Query param capture (aid, a_bogus, device_id)
// 3. Job creation via /alice/job_cron/create with captured query string
// 4. Instant execution via /alice/job_cron/run
// 5. Conversation lookup & scheduled slot cleanup via /alice/job_cron/delete
// 6. Real-time chat monitoring, auto-confirmation, fallback_api extraction
// 7. QAAB watermark-free stream decryption & MP4 download

const { BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { downloadFile, sanitizeFilename } = require('./dola-service');

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

// Script to decrypt QAAB tokens and fetch unwatermarked video stream URL inside page
const DECRYPT_FALLBACK_API_JS = `
async function(fbUrl) {
    const QAAB_SALT_HEX = '4dd4c2e6b83162090e52b3c7a6733ba4'
        + '1cb2462b829ab58a196b39db57177524'
        + 'f49baf7f08e8d68d26a72e37c1a95a2f'
        + '1f05a51892aef2949732b62a38aadd58';

    function hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        return bytes;
    }
    function concatBytes(first, second) {
        const bytes = new Uint8Array(first.length + second.length);
        bytes.set(first, 0); bytes.set(second, first.length);
        return bytes;
    }
    function padBase64(text) {
        const pad = (4 - (text.length % 4)) % 4;
        return text + '='.repeat(pad);
    }
    function base64DecodeLoose(text) {
        const input = String(text || '').trim();
        const variants = [
            input,
            input.replace(/[$@#]/g, char => ({ '$': '_', '@': '/', '#': '.' }[char])),
            input.replace(/[$@#]/g, char => ({ '$': '+', '@': '/', '#': '=' }[char])),
        ];
        for (const candidate of variants) {
            try {
                const normalized = padBase64(candidate).replace(/-/g, '+').replace(/_/g, '/');
                const binary = atob(normalized);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                return bytes;
            } catch {}
        }
        return null;
    }
    function asciiUrlFromBytes(bytes) {
        if (!bytes || !bytes.length) return '';
        for (const byte of bytes) {
            if (byte !== 9 && byte !== 10 && byte !== 13 && (byte < 32 || byte > 126)) return '';
        }
        return new TextDecoder().decode(bytes);
    }
    function stripPkcs7(bytes) {
        if (!bytes || !bytes.length) return new Uint8Array();
        const pad = bytes[bytes.length - 1];
        if (pad < 1 || pad > 16 || pad > bytes.length) return bytes;
        for (let i = bytes.length - pad; i < bytes.length; i++) {
            if (bytes[i] !== pad) return bytes;
        }
        return bytes.slice(0, bytes.length - pad);
    }
    async function decryptAesCbcUrl(payload, keyBytes, ivBytes) {
        if (!payload.length || payload.length % 16 !== 0) return '';
        try {
            const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['decrypt']);
            const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBytes }, key, payload));
            const direct = asciiUrlFromBytes(plain);
            if (/^https?:\\/\\//i.test(direct)) return direct;
            const stripped = stripPkcs7(plain);
            const url = asciiUrlFromBytes(stripped);
            return /^https?:\\/\\//i.test(url) ? url : '';
        } catch { return ''; }
    }
    async function decodeQaabToken(token, keySeed) {
        const data = base64DecodeLoose(token);
        const seed = base64DecodeLoose(keySeed);
        if (!data || !seed) return '';
        const digest1 = await crypto.subtle.digest('SHA-512', seed.slice(0, 32));
        const salt = hexToBytes(QAAB_SALT_HEX);
        const digest2Input = concatBytes(new Uint8Array(digest1), salt);
        const digest2 = new Uint8Array(await crypto.subtle.digest('SHA-512', digest2Input));
        const key = digest2.slice(0, 16);
        const iv = digest2.slice(16, 32);
        const attempts = [];
        if (data.length >= 4 && data[0] === 0xa8 && data[1] === 0x00 && data[2] === 0x01 && data[3] === 0x00) {
            attempts.push({ payload: data.slice(4), key, iv });
            attempts.push({ payload: data.slice(4), key: iv, iv: key });
            if (data.length > 36) {
                attempts.push({ payload: data.slice(36), key, iv: data.slice(20, 36) });
                attempts.push({ payload: data.slice(36), key, iv });
            }
        } else {
            attempts.push({ payload: data, key, iv });
        }
        for (const attempt of attempts) {
            const url = await decryptAesCbcUrl(attempt.payload, attempt.key, attempt.iv);
            if (url) return url;
        }
        return '';
    }

    try {
        const u = new URL(fbUrl);
        u.searchParams.set('channel', 'no');
        u.searchParams.set('codec_type', '8');
        u.searchParams.set('logo_type', 'unwatermarked');
        const resp = await fetch(u.toString());
        const json = await resp.json();
        const data = json.video_info ? json.video_info.data : (json.data || {});
        
        let token = '';
        if (data.video_list) {
            for (const v of Object.values(data.video_list)) {
                if (v.main_url) { token = v.main_url; break; }
            }
        }
        if (!token && data.main_url) token = data.main_url;
        const keySeed = u.searchParams.get('key_seed') || '';
        const streamUrl = await decodeQaabToken(token, keySeed);
        return {
            ok: Boolean(streamUrl),
            url: streamUrl,
            duration: data.video_duration || 0,
            status: data.status || 0
        };
    } catch(e) {
        return { ok: false, error: e.message };
    }
}
`;

// Quality enhancement matching ZDola's quality_lagao
function applyQualityLagao(prompt) {
  let out = prompt.trim();
  if (!/never ask for confirmation/i.test(out)) {
    out = 'never ask for confirmation, ' + out;
  }
  if (!/\bseedance\b/i.test(out)) {
    out = out + ' using Seedance 2.5';
  }
  if (!/\b30\s*(sec|second)/i.test(out)) {
    out = out + ', 30s each';
  }
  if (!/9\s*:\s*16/.test(out)) {
    out = out + ', 9:16 vertical';
  }
  if (!/1080p|1080x1920|full\s*hd/i.test(out)) {
    out = out.replace(/\.+$/, '') + '. Render in FULL HD 1080p (1080x1920), highest quality, maximum detail.';
  }
  return out;
}

// Skill Markdown Link matching ZDola's skill_link
function getSkillLink(skillName = 'dola-seedance-2-5-30s', skillId = null) {
  if (!skillId) return '';
  const label = skillName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `[${label}](skill://${skillName}?type=1&id=${skillId}) `;
}

async function safeLoadURL(win, url, timeoutMs = 8000) {
  try {
    await Promise.race([
      win.loadURL(url),
      new Promise(r => setTimeout(r, timeoutMs))
    ]);
  } catch (_) {}
  try { win.webContents.stop(); } catch (_) {}
}

/**
 * Creates an isolated browser instance with the account's cookies
 * and captures Dola's internal query string for API authentication.
 */
async function createAccountBrowser(account) {
  const partition = `persist:dola_${account.id}`;
  const ses = session.fromPartition(partition);

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
      } catch (err) {}
    }
  }

  let capturedAliceQuery = '';
  ses.webRequest.onBeforeRequest({ urls: ['*://www.dola.com/alice/*'] }, (details, callback) => {
    const idx = details.url.indexOf('?');
    if (idx !== -1 && !capturedAliceQuery) {
      capturedAliceQuery = details.url.substring(idx + 1);
    }
    callback({});
  });

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      partition,
      contextIsolation: false,
      nodeIntegration: false
    }
  });

  return {
    win,
    ses,
    getAliceQuery: () => capturedAliceQuery
  };
}

/**
 * Dispatches a prompt to Dola AI and runs the task
 */
async function dispatchDolaPrompt({ account, promptIndex, promptText, logFn }) {
  const { win, getAliceQuery } = await createAccountBrowser(account);

  try {
    logFn(`Connecting ${account.name} to Dola...`, 'info');
    await safeLoadURL(win, 'https://www.dola.com/chat');

    // Wait for page load and alice query capture
    for (let w = 0; w < 6; w++) {
      if (getAliceQuery()) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    // Check login state
    const currentUrl = win.webContents.getURL();
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      win.close();
      return { ok: false, error: 'Login expired on Dola. Please export fresh cookies.' };
    }

    const taskTitle = `zdola-p${promptIndex}-${Math.random().toString(36).substring(2, 7)}`;
    const skillPrefix = account.skillId ? getSkillLink(account.skillName, account.skillId) : '';
    const formattedPrompt = skillPrefix + applyQualityLagao(promptText);

    // Set schedule for 25 minutes in future (Dola scheduled task requirement)
    const futureTime = new Date(Date.now() + 25 * 60 * 1000);

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
        local_job_id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
      },
      timezone: DEFAULT_TZ,
      deep_think_switch: 4,
      model_config: {
        model_item_key: '4'
      }
    };

    logFn(`Submitting Seedance 2.5 task "${taskTitle}" to Dola AI...`, 'info');

    const queryStr = getAliceQuery() ? `?${getAliceQuery()}` : '';

    // 0. Proactively free stale task slots so we never hit "max task count reached"
    try {
      const listResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
        url: '/alice/job_cron/list${queryStr}',
        body: { size: 50, sort_order: 1 }
      })`);
      const existingJobs = listResp?.data?.data?.jobs || listResp?.data?.jobs || [];
      if (Array.isArray(existingJobs) && existingJobs.length >= 2) {
        logFn(`Freeing ${existingJobs.length} task slot(s) on ${account.name}...`, 'info');
        for (const j of existingJobs) {
          const jId = j.job_id || j.id;
          if (jId) {
            await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
              url: '/alice/job_cron/delete${queryStr}',
              body: { job_id: "${jId}" }
            })`);
          }
        }
      }
    } catch (_) {}

    // 1. Create job
    let createResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
      url: '/alice/job_cron/create${queryStr}',
      body: ${JSON.stringify(createPayload)}
    })`);

    // If create returns "max task count reached", automatically purge all jobs and retry once!
    if (createResp?.data?.code === 671010006 || /max task count reached/i.test(createResp?.data?.message || '')) {
      logFn(`Task limit reached on Dola. Purging scheduled task slots on ${account.name} and retrying...`, 'warn');
      try {
        const listResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
          url: '/alice/job_cron/list${queryStr}',
          body: { size: 50, sort_order: 1 }
        })`);
        const jobs = listResp?.data?.data?.jobs || listResp?.data?.jobs || [];
        for (const j of jobs) {
          const jId = j.job_id || j.id;
          if (jId) {
            await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
              url: '/alice/job_cron/delete${queryStr}',
              body: { job_id: "${jId}" }
            })`);
          }
        }
        await new Promise(r => setTimeout(r, 1200));
        createResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
          url: '/alice/job_cron/create${queryStr}',
          body: ${JSON.stringify(createPayload)}
        })`);
      } catch (_) {}
    }

    let jobId = createResp?.data?.data?.job?.job_id || createResp?.data?.job?.job_id || createResp?.data?.job_id;

    if (!jobId) {
      // Query job list as fallback
      const listResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
        url: '/alice/job_cron/list${queryStr}',
        body: { size: 20, sort_order: 1 }
      })`);
      const jobs = listResp?.data?.data?.jobs || listResp?.data?.jobs || [];
      const match = jobs.find(j => j.content?.cron_job?.title === taskTitle || j.title === taskTitle);
      if (match) jobId = match.job_id;
    }

    if (!jobId) {
      win.close();
      const errMsg = createResp?.data?.message || createResp?.error || 'No task ID returned from Dola. Check cookies or daily limits.';
      return { ok: false, error: errMsg };
    }

    logFn(`Created Dola Job: ${jobId}. Triggering immediate execution...`, 'highlight');

    // 2. Run the job immediately
    await new Promise(r => setTimeout(r, 1000));
    const runResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
      url: '/alice/job_cron/run${queryStr}',
      body: { job_id: "${jobId}" }
    })`);

    let conversationId = runResp?.data?.data?.job?.conversation_id || runResp?.data?.job?.conversation_id;

    // 3. Poll to find the created conversation if not in run response
    if (!conversationId) {
      for (let poll = 0; poll < 8; poll++) {
        await new Promise(r => setTimeout(r, 1500));
        const listResp = await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
          url: '/alice/job_cron/list${queryStr}',
          body: { size: 20, sort_order: 1 }
        })`);
        const jobs = listResp?.data?.data?.jobs || listResp?.data?.jobs || [];
        const found = jobs.find(j => String(j.job_id) === String(jobId));
        if (found && found.conversation_id) {
          conversationId = found.conversation_id;
          break;
        }
      }
    }

    // 4. Free the scheduled slot by deleting the cron job
    try {
      await win.webContents.executeJavaScript(`(${DOLA_API_REQUEST_JS})({
        url: '/alice/job_cron/delete${queryStr}',
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
    logFn(`Opening ${chatUrl} to monitor video rendering...`, 'info');
    await safeLoadURL(win, chatUrl, 8000);

    await new Promise(r => setTimeout(r, 3000));

    let videoUrl = null;
    const maxChecks = Math.max(30, Math.round((checkAfterMinutes * 60) / 10));

    for (let check = 0; check < maxChecks; check++) {
      // 1. Auto-confirm if Dola asks
      const confirmState = await win.webContents.executeJavaScript(`
        (() => {
          const userSelector = '[data-testid="send_message"], [data-testid="send-message"], [data-role="user"]';
          const assistantSelector = '[data-testid="receive_message"], [data-testid="receive-message"], [data-role="assistant"]';
          const msgs = [...document.querySelectorAll(assistantSelector)];
          const latest = msgs[msgs.length - 1];
          if (!latest) return { clicked: false, text: '' };
          
          const labels = ['confirm', 'confirm and generate', 'confirm & generate', 'confirm video generation', 'generate video', 'generate now', 'yes, generate', 'yes, proceed', 'proceed with generation'];
          const btn = [...latest.querySelectorAll('button, [role="button"]')].find(b => {
            const l = (b.innerText || '').toLowerCase().trim();
            return labels.some(expected => l.includes(expected));
          });
          
          if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
            btn.click();
            return { clicked: true, text: btn.innerText.trim() };
          }
          return { clicked: false, text: latest.innerText || '' };
        })()
      `);

      if (confirmState.clicked) {
        logFn(`Dola requested confirmation. Auto-confirmed: "${confirmState.text}"`, 'highlight');
      }

      // 2. Check for video stream (direct link, video element, or fallback_api)
      const videoResult = await win.webContents.executeJavaScript(`
        (async () => {
          // Check video tags
          const vids = [...document.querySelectorAll('video')];
          for (const v of vids) {
            const src = v.src || v.currentSrc;
            if (src && src.startsWith('http') && !src.includes('blob:')) {
              return { type: 'direct_url', url: src };
            }
          }

          // Check direct download links (Watch / download the video)
          const links = [...document.querySelectorAll('a')];
          for (const a of links) {
            const href = a.href || '';
            const text = (a.innerText || '').toLowerCase();
            if (
              href.includes('mime_type=video_mp4') ||
              href.includes('.mp4') ||
              href.includes('tos-mya-ve') ||
              text.includes('watch / download') ||
              text.includes('download the video')
            ) {
              return { type: 'direct_url', url: href };
            }
          }

          // Check router data for fallback_api
          const router = window._ROUTER_DATA || {};
          const routerStr = JSON.stringify(router);
          const match = routerStr.match(/fallback_api[\\\\"]*:[\\\\"]*(https?:[^\\\\s"']+)/);
          if (match) {
            const rawApi = match[1].replace(/\\\\u0026/g, '&').replace(/\\\\\\//g, '/');
            return { type: 'fallback_api', url: rawApi };
          }

          // Check for errors or refusal in chat
          const text = document.body.innerText || '';
          if (/(?:temporarily unable to generate|system error|daily limit|not available in this country)/i.test(text)) {
            return { type: 'error', error: text.slice(0, 160) };
          }

          const isRendering = /(?:generating|rendering|creating your video|video generation started)/i.test(text);
          return { type: null, isRendering };
        })()
      `);

      if (videoResult && videoResult.url) {
        if (videoResult.type === 'fallback_api') {
          logFn(`Found video stream fallback API. Decrypting unwatermarked stream...`, 'highlight');
          const decryptRes = await win.webContents.executeJavaScript(`(${DECRYPT_FALLBACK_API_JS})(${JSON.stringify(videoResult.url)})`);
          if (decryptRes && decryptRes.ok && decryptRes.url) {
            videoUrl = decryptRes.url;
            logFn(`Successfully decrypted unwatermarked 1080P stream!`, 'success');
            break;
          }
        } else if (videoResult.type === 'direct_url') {
          videoUrl = videoResult.url;
          logFn(`Found direct Seedance video stream on Dola!`, 'success');
          break;
        }
      }

      if (videoResult && videoResult.type === 'error') {
        logFn(`⚠️ Dola Notice: ${videoResult.error}`, 'warn');
      }

      if (videoResult?.isRendering) {
        progressFn({
          statusText: `Video #${promptIndex} is rendering on Dola servers... (${(check + 1) * 10}s elapsed)`
        });
      }

      await new Promise(r => setTimeout(r, 10000));
    }

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
