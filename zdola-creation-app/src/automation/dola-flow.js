const fs = require('fs');
const path = require('path');
const { TempMailService } = require('./tempmail');
const { launchBrowser } = require('./chrome-launcher');
const { ProfileStore } = require('./profile-store');

function generateName() {
  const firstNames = ['Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas', 'Benjamin', 'Theodore', 'Mateo', 'Levi', 'Sebastian', 'Daniel', 'Jack', 'Alexander', 'Owen', 'Asher', 'Samuel', 'Ethan'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { first, last, full: `${first} ${last}` };
}

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < 14; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass + 'Aa1!';
}

class ThreadTask {
  constructor(threadId, index, totalThreads, config, emitter) {
    this.threadId = threadId;
    this.index = index;
    this.totalThreads = totalThreads;
    this.config = config;
    this.emitter = emitter;
    this.browser = null;
    this.page = null;
    this.paused = false;
    this.stopped = false;
    this.waitingTerms = false;
    this.proceedResolver = null;
    this.profileMeta = null;
    this.status = 'Ready';
    this.stage = 1; // 1: Start, 2: Email+OTP, 3: Terms(you), 4: Dola login, 5: Confirmed
  }

  log(msg) {
    this.emitter.emit('log', `[T${this.threadId}] ${msg}`);
  }

  updateStatus(status, state = 'running', stage = null) {
    this.status = status;
    if (stage !== null) this.stage = stage;
    this.emitter.emit('thread-update', {
      threadId: this.threadId,
      status: this.status,
      state: state,
      stage: this.stage,
      waitingTerms: this.waitingTerms,
      profileMeta: this.profileMeta
    });
  }

  async checkPause() {
    while (this.paused && !this.stopped) {
      this.updateStatus('Paused', 'paused');
      await new Promise(r => setTimeout(r, 500));
    }
    if (this.stopped) throw new Error('Task stopped by user');
  }

  pause() {
    this.paused = true;
    this.updateStatus('Paused', 'paused');
    this.log('Thread paused.');
  }

  resume() {
    this.paused = false;
    this.updateStatus('Resumed', 'running');
    this.log('Thread resumed.');
  }

  proceed() {
    if (this.waitingTerms && this.proceedResolver) {
      this.waitingTerms = false;
      this.proceedResolver();
      this.proceedResolver = null;
      this.log('Manual terms accepted / Proceed triggered by user.');
    }
  }

  async run() {
    try {
      this.log('Starting account creation workflow...');
      this.updateStatus('Step 1/7: Initializing profile...', 'running', 1);

      // 1. Generate identity & profile directory
      const name = generateName();
      const password = generatePassword();
      const profileId = ProfileStore.getNextProfileId();
      const profileDir = path.join(ProfileStore.getProfilesDir(), profileId);

      this.profileMeta = {
        id: profileId,
        name: name.full,
        password: password,
        profilePath: profileDir,
        createdAt: new Date().toISOString(),
        hasCookies: false,
        cookieFile: null
      };

      this.log(`Profile initialized: ${profileId} (${name.full})`);
      await this.checkPause();

      // 2. Launch Chrome
      this.updateStatus('Step 2/7: Launching Chrome...', 'running', 1);
      this.browser = await launchBrowser({
        chromePath: this.config.chromePath,
        profileDir: profileDir,
        index: this.index,
        totalThreads: this.totalThreads
      });

      const pages = await this.browser.pages();
      this.page = pages[0] || (await this.browser.newPage());
      this.log('Chrome launched in dedicated grid slot.');
      await this.checkPause();

      // 3. Generate Email
      this.updateStatus('Step 3/7: Generating temporary email...', 'running', 2);
      const mailService = new TempMailService(this.config.emailProvider || 'tempmail_io');
      const emailInfo = await mailService.getEmail();
      this.profileMeta.email = emailInfo.email;
      this.profileMeta.emailProvider = emailInfo.provider;
      ProfileStore.saveProfile(this.profileMeta);
      this.log(`Email generated: ${emailInfo.email}`);
      await this.checkPause();

      // 4. Google Cloud Signup - enter email
      this.updateStatus('Step 4/7: Google Cloud signup — entering email...', 'running', 2);
      this.log('Navigating to Google Cloud signup...');
      await this.page.goto('https://accounts.cloud.google.com/signup/email', {
        waitUntil: 'networkidle2',
        timeout: 45000
      }).catch(() => {});

      await this.checkPause();

      // Enter email
      const emailEntered = await this.page.evaluate((email) => {
        const inputs = Array.from(document.querySelectorAll('input'));
        for (const input of inputs) {
          const type = (input.getAttribute('type') || '').toLowerCase();
          const name = (input.getAttribute('name') || '').toLowerCase();
          const id = (input.id || '').toLowerCase();
          if (type === 'email' || name.includes('identifier') || id.includes('identifier') || type === 'text') {
            input.focus();
            input.value = email;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, emailInfo.email);

      if (emailEntered) {
        this.log(`Email entered into form: ${emailInfo.email}`);
        await this.page.keyboard.press('Enter');
      } else {
        this.log('Note: Please check email input on Google page.');
      }

      await this.checkPause();

      // 5. Poll for OTP
      this.updateStatus('Step 5/7: Waiting for verification OTP...', 'running', 2);
      this.log('Polling inbox for Google verification code...');
      const otp = await mailService.waitForOtp(emailInfo, this.config.otpTimeout || 120, (prog) => {
        this.updateStatus(`Step 5/7: ${prog}`, 'running', 2);
      });
      this.log(`OTP Received: ${otp}`);
      await this.checkPause();

      // Enter OTP
      this.updateStatus(`Step 5/7: Submitting OTP (${otp})...`, 'running', 2);
      await this.page.evaluate((code) => {
        const inputs = Array.from(document.querySelectorAll('input')).filter(el => el.offsetParent !== null);
        if (inputs.length >= 6) {
          for (let i = 0; i < 6; i++) {
            inputs[i].value = code[i];
            inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (inputs.length >= 1) {
          inputs[0].value = code;
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, otp);

      await this.page.keyboard.press('Enter');
      this.log('OTP submitted.');
      await new Promise(r => setTimeout(r, 2500));
      await this.checkPause();

      // 6. Terms (Manual - You)
      this.waitingTerms = true;
      this.updateStatus('Step 6/7: Accept Terms in Chrome, then press Proceed...', 'waiting_terms', 3);
      this.log('Waiting for you to accept Terms or click "Proceed to Dola"...');

      // Wait for either Proceed button clicked OR console.cloud.google.com reached
      await new Promise((resolve) => {
        this.proceedResolver = resolve;
        const interval = setInterval(async () => {
          if (!this.waitingTerms || this.stopped) {
            clearInterval(interval);
            resolve();
            return;
          }
          try {
            const currentUrl = this.page ? this.page.url() : '';
            if (currentUrl.includes('console.cloud.google.com') || currentUrl.includes('welcome')) {
              this.log('Detected Google Cloud console! Proceeding automatically...');
              clearInterval(interval);
              this.waitingTerms = false;
              resolve();
            }
          } catch (e) {}
        }, 1500);
      });

      this.waitingTerms = false;
      this.log('Proceeding to Dola.com Google login...');
      await this.checkPause();

      // 7. Dola.com Login via Google OAuth
      this.updateStatus('Step 6b/7: Dola.com Google OAuth login...', 'running', 4);
      await this.dolaLoginWorkflow();
      await this.checkPause();

      // 8. Extract Cookies
      this.updateStatus('Step 7/7: Extracting Dola cookies...', 'running', 5);
      const cookiesSaved = await this.saveCookies();

      if (cookiesSaved) {
        this.profileMeta.hasCookies = true;
        ProfileStore.saveProfile(this.profileMeta);
        this.updateStatus(`SUCCESS - ${this.profileMeta.email}`, 'success', 5);
        this.log(`SUCCESS! Account ready & cookies saved: ${this.profileMeta.email}`);
      } else {
        this.updateStatus(`Ready - Click Get Cookies (${this.profileMeta.email})`, 'warning', 5);
        this.log('Account completed. Use "Get Cookies" to refresh session.');
      }

    } catch (err) {
      if (this.stopped) {
        this.updateStatus('Stopped', 'stopped');
        this.log('Thread stopped.');
      } else {
        this.updateStatus(`Error: ${err.message}`, 'error');
        this.log(`Error: ${err.message}`);
      }
    }
  }

  async dolaLoginWorkflow() {
    this.log('Navigating to https://www.dola.com/chat/...');
    await this.page.goto('https://www.dola.com/chat/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    }).catch(() => {});

    await new Promise(r => setTimeout(r, 2000));

    // Listen for OAuth popup target
    let popupPage = null;
    const targetListener = async (target) => {
      if (target.type() === 'page' && target.url().includes('accounts.google.com')) {
        popupPage = await target.page();
      }
    };
    this.browser.on('targetcreated', targetListener);

    // Click Log In or Continue with Google
    await this.page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
      const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const txt = el => (el.innerText || '').toLowerCase().trim();

      // Look for Google button first
      for (const el of els) {
        if (!vis(el)) continue;
        const t = txt(el);
        if (t.includes('continue with google') || t.includes('sign in with google') || t.includes('log in with google') || t === 'google') {
          (el.closest('button, a, div[role="button"]') || el).click();
          return 'google_btn';
        }
      }
      // Look for Login / Sign In button
      for (const el of els) {
        if (!vis(el)) continue;
        const t = txt(el);
        if (t === 'log in' || t === 'login' || t === 'sign in') {
          (el.closest('button, a, div[role="button"]') || el).click();
          return 'login_btn';
        }
      }
      return null;
    });

    await new Promise(r => setTimeout(r, 2000));

    // If modal appeared with Continue with Google, click it
    await this.page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
      for (const el of els) {
        const t = (el.innerText || '').toLowerCase().trim();
        if (t.includes('continue with google') || t.includes('google')) {
          (el.closest('button, a, div[role="button"]') || el).click();
          break;
        }
      }
    });

    // Wait for Google OAuth popup
    let waitPopupCount = 0;
    while (!popupPage && waitPopupCount < 8) {
      await new Promise(r => setTimeout(r, 1000));
      waitPopupCount++;
      const allPages = await this.browser.pages();
      for (const p of allPages) {
        if (p !== this.page && p.url().includes('accounts.google.com')) {
          popupPage = p;
          break;
        }
      }
    }

    if (popupPage) {
      this.log('Google OAuth popup opened. Selecting account...');
      try {
        await popupPage.waitForSelector('[data-identifier], .JDAKTe, div[data-email], li[data-identifier]', { timeout: 10000 });
        await popupPage.evaluate(() => {
          const selectors = ['[data-identifier]', '.JDAKTe', 'div[data-email]', 'li[data-identifier]', 'div[data-profileidentifier]'];
          for (const s of selectors) {
            const el = document.querySelector(s);
            if (el && el.offsetParent !== null) {
              el.click();
              return true;
            }
          }
          return false;
        });

        await new Promise(r => setTimeout(r, 2000));

        // Click Continue / Allow / I understand
        await popupPage.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, div[role="button"], input[type="submit"], a, span'));
          for (const b of btns) {
            if (b.offsetParent === null) continue;
            const t = (b.innerText || b.value || '').toLowerCase().trim();
            if (t === 'continue' || t === 'allow' || t.includes('understand') || t === 'next' || t.includes('agree') || t.includes('accept')) {
              (b.closest('button, div[role="button"], input[type="submit"]') || b).click();
              return true;
            }
          }
          return false;
        });
      } catch (e) {}
    }

    // Wait for redirect back to dola.com
    await new Promise(r => setTimeout(r, 4000));

    // Handle Dola onboarding modals (Confirm age / 18+ / Understand)
    await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"], span, a'));
      for (const b of btns) {
        const t = (b.innerText || '').toLowerCase().trim();
        if (t.includes('confirm') || t.includes('18') || t.includes('understand') || t === 'ok' || t === 'i agree' || t === 'get started') {
          (b.closest('button, div[role="button"]') || b).click();
        }
      }
    });

    this.log('Dola login cycle completed. Verifying session...');
    this.browser.off('targetcreated', targetListener);
  }

  async saveCookies() {
    try {
      this.log('Extracting dola.com cookies via Chrome DevTools...');
      const client = await this.page.target().createCDPSession();
      const { cookies } = await client.send('Network.getCookies');

      const dolaCookies = cookies.filter(c => c.domain.includes('dola.com'));
      if (dolaCookies.length === 0) {
        this.log('Warning: No cookies found for dola.com yet.');
        return false;
      }

      // Convert to Netscape HTTP Cookie format
      let netscapeContent = '# Netscape HTTP Cookie File\n# https://curl.haxx.se/rfc/cookie_spec.html\n# This file was generated by ZDola Creation\n\n';
      for (const c of dolaCookies) {
        const domain = c.domain;
        const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
        const path = c.path || '/';
        const secure = c.secure ? 'TRUE' : 'FALSE';
        const expiry = Math.floor(c.expires > 0 ? c.expires : (Date.now() / 1000 + 31536000));
        const name = c.name;
        const val = c.value;
        netscapeContent += `${domain}\t${flag}\t${path}\t${secure}\t${expiry}\t${name}\t${val}\n`;
      }

      // Target file 1: Desktop/cookies/www.dola.com_cookies_Profile_XXX.txt
      const cookiesDir = ProfileStore.getCookiesDir();
      const fileName = `www.dola.com_cookies_${this.profileMeta.id}.txt`;
      const filePath = path.join(cookiesDir, fileName);
      fs.writeFileSync(filePath, netscapeContent, 'utf8');

      // Target file 2: Profile directory
      if (this.profileMeta.profilePath && fs.existsSync(this.profileMeta.profilePath)) {
        fs.writeFileSync(path.join(this.profileMeta.profilePath, 'cookies.txt'), netscapeContent, 'utf8');
      }

      this.profileMeta.cookieFile = filePath;
      this.log(`Cookies successfully saved to ${filePath} (${dolaCookies.length} cookies)`);
      return true;
    } catch (e) {
      this.log(`Cookie extraction error: ${e.message}`);
      return false;
    }
  }

  async refreshDola() {
    if (this.page) {
      this.log('Reloading https://www.dola.com/chat/...');
      await this.page.goto('https://www.dola.com/chat/', { waitUntil: 'networkidle2' }).catch(() => {});
    }
  }

  async stop() {
    this.stopped = true;
    this.waitingTerms = false;
    if (this.proceedResolver) {
      this.proceedResolver();
      this.proceedResolver = null;
    }
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {}
      this.browser = null;
    }
    this.updateStatus('Stopped', 'stopped');
  }

  async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {}
      this.browser = null;
      this.log('Chrome closed.');
    }
  }
}

module.exports = {
  ThreadTask,
  generateName,
  generatePassword
};
