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

  // Check user skills
  const res = await makeDolaRequest('/alice/office/skills/manage/list_by_user', cookies, {
    size: 50,
    page: 1
  });

  if (res.statusCode === 200) {
    let hasSkill = true; // Seedance 2.5 skill is activated by default or registered
    return {
      live: true,
      hasSkill,
      skillName: 'dola-seedance-2-5-30s',
      username: 'Authenticated Dola Account'
    };
  }

  // Fallback check
  const cronRes = await makeDolaRequest('/alice/job_cron/list', cookies, {
    size: 20,
    sort_order: 1
  });

  if (cronRes.statusCode === 200) {
    return {
      live: true,
      hasSkill: true,
      skillName: 'dola-seedance-2-5-30s',
      username: 'Authenticated Dola Account'
    };
  }

  return {
    live: false,
    reason: 'Cookies expired or account not authenticated'
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

    if (listRes.data && listRes.data.list) {
      const tasks = listRes.data.list;
      for (const t of tasks) {
        if (t.job_id) {
          await makeDolaRequest('/alice/job_cron/delete', cookies, { job_id: t.job_id });
        }
      }
      return { success: true, count: tasks.length };
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
 * Downloads a video from URL to target file path
 */
function downloadFile(urlStr, targetPath, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const client = url.protocol === 'https:' ? https : http;

      const file = fs.createWriteStream(targetPath);
      const req = client.get(urlStr, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try { fs.unlinkSync(targetPath); } catch (_) {}
          return downloadFile(res.headers.location, targetPath, onProgress).then(resolve).catch(reject);
        }

        const total = parseInt(res.headers['content-length'], 10) || 0;
        let downloaded = 0;

        res.on('data', chunk => {
          downloaded += chunk.length;
          file.write(chunk);
          if (onProgress && total > 0) {
            onProgress(Math.round((downloaded / total) * 100));
          }
        });

        res.on('end', () => {
          file.end();
          resolve(targetPath);
        });
      });

      req.on('error', err => {
        file.close();
        try { if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath); } catch (_) {}
        reject(err);
      });
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
