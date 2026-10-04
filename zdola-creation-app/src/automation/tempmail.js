// TempMail service supporting Temp-Mail.io and Guerrilla Mail fallback
const https = require('https');
const http = require('http');

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

class TempMailService {
  constructor(provider = 'tempmail_io') {
    this.provider = provider;
  }

  async getEmail() {
    if (this.provider === 'guerrilla') {
      try {
        const res = await fetchJson('https://api.guerrillamail.com/ajax.php?f=get_email_address');
        if (res && res.email_addr) {
          return {
            email: res.email_addr,
            token: res.sid_token,
            provider: 'guerrilla'
          };
        }
      } catch (err) {
        // Fall back to temp-mail.io
      }
    }

    // Default: temp-mail.io
    try {
      const res = await fetchJson('https://api.internal.temp-mail.io/api/v3/email/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { min_name_length: 10, max_name_length: 10 }
      });
      if (res && res.email) {
        return {
          email: res.email,
          token: res.token,
          provider: 'tempmail_io'
        };
      }
    } catch (e) {
      // Fallback to guerrilla
      const res = await fetchJson('https://api.guerrillamail.com/ajax.php?f=get_email_address');
      if (res && res.email_addr) {
        return {
          email: res.email_addr,
          token: res.sid_token,
          provider: 'guerrilla'
        };
      }
    }
    throw new Error('Failed to generate temporary email address');
  }

  async checkInbox(emailInfo) {
    if (emailInfo.provider === 'guerrilla') {
      const url = `https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${emailInfo.token}`;
      const res = await fetchJson(url);
      if (res && Array.isArray(res.list)) {
        return res.list.map(m => ({
          subject: m.mail_subject || '',
          body: m.mail_excerpt || '',
          from: m.mail_from || '',
          id: m.mail_id
        }));
      }
      return [];
    }

    // temp-mail.io
    const url = `https://api.internal.temp-mail.io/api/v3/email/${emailInfo.email}/messages`;
    const res = await fetchJson(url);
    if (Array.isArray(res)) {
      return res.map(m => ({
        subject: m.subject || '',
        body: (m.body_text || '') + ' ' + (m.body_html || ''),
        from: m.from || '',
        id: m.id
      }));
    }
    return [];
  }

  extractOtp(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

    const patterns = [
      /(?:one-time\s*)?verification\s*code\s*is:?\s*([A-Za-z0-9]{6})\b/i,
      /(?:verification\s*code|verify|your\s*code|enter\s*code|security\s*code)[^\w]{1,40}([A-Za-z0-9]{6})\b/i,
      /G-(\d{6})\b/i,
      /(?:code|verify|verification)[^\d]{1,25}(\d{3})\s+(\d{3})\b/i
    ];

    for (const pat of patterns) {
      const match = clean.match(pat);
      if (match) {
        if (match[2]) {
          return match[1] + match[2];
        }
        return match[1];
      }
    }

    // Fallback: 6-char alphanumeric code excluding email words and years
    const words = clean.match(/\b([A-Z0-9]{6})\b/g);
    if (words) {
      for (const w of words) {
        if (!w.startsWith('202') && !w.startsWith('201') && !w.startsWith('203')) {
          return w;
        }
      }
    }

    return null;
  }

  async waitForOtp(emailInfo, timeoutSec = 120, onProgress = null) {
    const start = Date.now();
    let attempt = 0;
    while ((Date.now() - start) < timeoutSec * 1000) {
      attempt++;
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (onProgress) {
        onProgress(`Waiting for OTP email... (${elapsed}s / ${timeoutSec}s)`);
      }
      try {
        const messages = await this.checkInbox(emailInfo);
        for (const msg of messages) {
          const combined = `${msg.subject} ${msg.body}`;
          const otp = this.extractOtp(combined);
          if (otp) {
            return otp;
          }
        }
      } catch (err) {
        // network hiccup, retry
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error(`OTP timeout after ${timeoutSec}s`);
  }
}

module.exports = {
  TempMailService
};
