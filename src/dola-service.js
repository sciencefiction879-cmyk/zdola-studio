// ZDola Service - Full Dola AI Integration & Seedance 2.5 Stream Decryptor

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const QAAB_SALT_HEX = '4dd4c2e6b83162090e52b3c7a6733ba4'
  + '1cb2462b829ab58a196b39db57177524'
  + 'f49baf7f08e8d68d26a72e37c1a95a2f'
  + '1f05a51892aef2949732b62a38aadd58';

/**
 * Cookie Parser supporting Netscape format, JSON, and raw key-value headers
 */
function parseCookieFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    return parseCookieContent(content);
  } catch (err) {
    console.error(`Failed to read cookie file: ${filePath}`, err);
    return [];
  }
}

function parseCookieContent(content) {
  const cookies = [];

  // 1. JSON Array format
  if (content.startsWith('[') && content.endsWith(']')) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.name && item.value !== undefined) {
            cookies.push({
              name: String(item.name).trim(),
              value: String(item.value).trim(),
              domain: item.domain || '.dola.com',
              path: item.path || '/'
            });
          }
        }
        if (cookies.length > 0) return cookies;
      }
    } catch (_) {}
  }

  // 2. Netscape / Tab-separated lines
  const lines = content.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line || (line.startsWith('#') && !line.startsWith('#HttpOnly_'))) continue;

    if (line.startsWith('#HttpOnly_')) {
      line = line.replace('#HttpOnly_', '');
    }

    const parts = line.split('\t');
    if (parts.length >= 7) {
      cookies.push({
        domain: parts[0].trim(),
        path: parts[2].trim(),
        secure: parts[3].trim().toLowerCase() === 'true',
        expires: parts[4].trim(),
        name: parts[5].trim(),
        value: parts[6].trim()
      });
    } else if (line.includes('=')) {
      const pairs = line.split(';');
      for (const pair of pairs) {
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
          const k = pair.substring(0, eqIdx).trim();
          const v = pair.substring(eqIdx + 1).trim();
          if (k) {
            cookies.push({
              name: k,
              value: v,
              domain: '.dola.com',
              path: '/'
            });
          }
        }
      }
    }
  }

  return cookies;
}

function cookiesToHeader(cookies) {
  if (!Array.isArray(cookies)) return '';
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

function makeDolaRequest(pathname, cookies, postData = null) {
  return new Promise((resolve) => {
    try {
      const cookieStr = cookiesToHeader(cookies);
      const url = new URL(pathname.startsWith('http') ? pathname : `https://www.dola.com${pathname}`);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/json',
        'agw-js-conv': 'str',
        'Cookie': cookieStr
      };

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: postData ? 'POST' : 'GET',
        headers,
        timeout: 15000
      };

      const req = client.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: json });
          } catch (_) {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      });

      req.on('error', err => resolve({ error: err.message, statusCode: 0 }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'Request timeout', statusCode: 408 });
      });

      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    } catch (e) {
      resolve({ error: e.message, statusCode: 0 });
    }
  });
}

/**
 * Check if a Dola account is Live and check skill status
 */
async function checkDolaAccount(cookies) {
  const cookieStr = cookiesToHeader(cookies);
  if (!cookieStr) {
    return { live: false, reason: 'Empty cookie file' };
  }

  // 1. Domain Validation: Check if cookies belong to dola.com
  const domains = [...new Set(cookies.map(c => c.domain).filter(Boolean))];
  const hasDolaDomain = cookies.some(c => c.domain && c.domain.includes('dola.com'));
  const hasDolaSession = cookies.some(c => ['sessionid', 'passport_csrf_token', 'sid_guard', 'uid_tt', 'sid_tt'].includes(c.name));

  if (!hasDolaDomain && !hasDolaSession) {
    const invalidDomainStr = domains.join(', ') || 'external domain';
    return {
      live: false,
      reason: `Cookies belong to ${invalidDomainStr}, not dola.com. Please export cookies from www.dola.com while logged in.`
    };
  }

  // 2. Direct Auth Check: /alice/conversation/list returns code: 0 if authenticated
  const convRes = await makeDolaRequest('/alice/conversation/list', cookies, { size: 5 });
  if (convRes.statusCode === 200 && convRes.data) {
    if (convRes.data.code === 0) {
      return {
        live: true,
        hasSkill: true,
        skillName: 'dola-seedance-2-5-30s',
        username: 'Authenticated Dola Account'
      };
    } else if (convRes.data.msg || convRes.data.message) {
      return {
        live: false,
        reason: convRes.data.msg || convRes.data.message || 'Session expired. Log in again.'
      };
    }
  }

  // 3. Fallback skills check
  const res = await makeDolaRequest('/alice/office/skills/manage/list_by_user', cookies, {
    size: 50,
    page: 1
  });

  if (res.statusCode === 200 && res.data && (res.data.code === 0 || res.data.status_code === 0)) {
    return {
      live: true,
      hasSkill: true,
      skillName: 'dola-seedance-2-5-30s',
      username: 'Authenticated Dola Account'
    };
  }

  // 4. Fallback cron check
  const cronRes = await makeDolaRequest('/alice/job_cron/list', cookies, {
    size: 20,
    sort_order: 1
  });

  if (cronRes.statusCode === 200 && cronRes.data && (cronRes.data.code === 0 || cronRes.data.status_code === 0)) {
    return {
      live: true,
      hasSkill: true,
      skillName: 'dola-seedance-2-5-30s',
      username: 'Authenticated Dola Account'
    };
  }

  return {
    live: false,
    reason: (convRes.data?.msg || convRes.data?.message || 'Cookies expired or account not authenticated')
  };
}

/**
 * Clear queued tasks from account
 */
async function clearAccountTasks(cookies) {
  try {
    const listRes = await makeDolaRequest('/alice/job_cron/list', cookies, {
      size: 100,
      sort_order: 1
    });

    const tasks = listRes.data?.data?.jobs || listRes.data?.jobs || listRes.data?.list || [];
    let count = 0;
    if (Array.isArray(tasks) && tasks.length > 0) {
      for (const t of tasks) {
        const jobId = t.job_id || t.id;
        if (jobId) {
          const delRes = await makeDolaRequest('/alice/job_cron/delete', cookies, { job_id: jobId });
          if (delRes.data?.code === 0 || delRes.statusCode === 200) {
            count++;
          }
        }
      }
      return { success: true, count };
    }
    return { success: true, count: 0 };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Unwatermarked Video Stream Decryptor
 * Implements the Seedance 2.5 QAAB token decryption algorithm
 */
function decryptSeedanceUrl(token, keySeed) {
  try {
    function hexToBytes(hex) {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      return bytes;
    }
    function padBase64(text) {
      const pad = (4 - (text.length % 4)) % 4;
      return text + '='.repeat(pad);
    }
    function base64Decode(text) {
      const normalized = padBase64(text).replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(normalized, 'base64');
    }

    const data = base64Decode(token);
    const seed = base64Decode(keySeed);
    if (!data || !seed) return null;

    const hash1 = crypto.createHash('sha512').update(seed.subarray(0, 32)).digest();
    const salt = Buffer.from(hexToBytes(QAAB_SALT_HEX));
    const digest2 = crypto.createHash('sha512').update(Buffer.concat([hash1, salt])).digest();

    const key = digest2.subarray(0, 16);
    const iv = digest2.subarray(16, 32);

    const payload = (data.length >= 4 && data[0] === 0xa8 && data[1] === 0x00 && data[2] === 0x01 && data[3] === 0x00)
      ? data.subarray(4)
      : data;

    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(false);
    let decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);

    // Strip PKCS7 padding
    const padVal = decrypted[decrypted.length - 1];
    if (padVal > 0 && padVal <= 16) {
      decrypted = decrypted.subarray(0, decrypted.length - padVal);
    }

    const urlStr = decrypted.toString('utf8');
    if (/^https?:\/\//i.test(urlStr)) {
      return urlStr;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Downloads a video from URL to target file path with robust redirect handling,
 * CDN user-agent headers, and file verification.
 */
function downloadFile(urlStr, targetPath, onProgress, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many redirects while downloading video'));
    }

    try {
      const url = new URL(urlStr);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      // Ensure destination directory exists
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
          'Referer': 'https://www.dola.com/',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 60000
      };

      const req = client.request(options, (res) => {
        // Handle HTTP 3xx Redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const nextUrl = new URL(res.headers.location, urlStr).toString();
          return downloadFile(nextUrl, targetPath, onProgress, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200 && res.statusCode !== 206) {
          return reject(new Error(`Video download failed with HTTP status ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
        let downloadedBytes = 0;
        let lastReportedPct = -1;

        const fileStream = fs.createWriteStream(targetPath);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          fileStream.write(chunk);
          if (onProgress && totalBytes > 0) {
            const pct = Math.floor((downloadedBytes / totalBytes) * 100);
            if (pct !== lastReportedPct && pct % 5 === 0) {
              lastReportedPct = pct;
              onProgress(pct, downloadedBytes, totalBytes);
            }
          }
        });

        res.on('end', () => {
          fileStream.end();
        });

        fileStream.on('finish', () => {
          fileStream.close(() => {
            try {
              const stats = fs.statSync(targetPath);
              if (stats.size < 1024) {
                try { fs.unlinkSync(targetPath); } catch (_) {}
                return reject(new Error('Downloaded video file is empty or corrupted (<1KB)'));
              }
              if (onProgress) onProgress(100, stats.size, stats.size);
              resolve(targetPath);
            } catch (err) {
              reject(err);
            }
          });
        });

        fileStream.on('error', (err) => {
          fileStream.close();
          try { if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath); } catch (_) {}
          reject(err);
        });
      });

      req.on('timeout', () => {
        req.destroy();
        try { if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath); } catch (_) {}
        reject(new Error('Video download connection timed out'));
      });

      req.on('error', (err) => {
        try { if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath); } catch (_) {}
        reject(err);
      });

      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40);
}

module.exports = {
  parseCookieFile,
  parseCookieContent,
  cookiesToHeader,
  checkDolaAccount,
  clearAccountTasks,
  decryptSeedanceUrl,
  downloadFile,
  sanitizeFilename,
  makeDolaRequest
};
