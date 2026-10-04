const fs = require('fs');
const path = require('path');
const os = require('os');

class ProfileStore {
  constructor() {
    this.baseDir = path.join(os.homedir(), 'Documents', 'ZDola_Profiles');
    this.cookiesDir = path.join(os.homedir(), 'Desktop', 'cookies');
    this.metaFile = path.join(this.baseDir, 'profiles.json');
    this.ensureDirs();
  }

  ensureDirs() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.cookiesDir)) {
      fs.mkdirSync(this.cookiesDir, { recursive: true });
    }
  }

  setProfilesDir(dir) {
    if (dir && fs.existsSync(dir)) {
      this.baseDir = dir;
      this.metaFile = path.join(this.baseDir, 'profiles.json');
    }
  }

  setCookiesDir(dir) {
    if (dir) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.cookiesDir = dir;
    }
  }

  getProfilesDir() {
    return this.baseDir;
  }

  getCookiesDir() {
    return this.cookiesDir;
  }

  readMeta() {
    try {
      if (fs.existsSync(this.metaFile)) {
        const raw = fs.readFileSync(this.metaFile, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading profiles.json:', e);
    }
    return [];
  }

  writeMeta(list) {
    try {
      fs.writeFileSync(this.metaFile, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing profiles.json:', e);
    }
  }

  getNextProfileId() {
    const list = this.readMeta();
    let maxNum = 0;
    for (const p of list) {
      const match = (p.id || '').match(/Profile_(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const nextNum = maxNum + 1;
    return `Profile_${String(nextNum).padStart(3, '0')}`;
  }

  saveProfile(meta) {
    const list = this.readMeta();
    const idx = list.findIndex(p => p.id === meta.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...meta };
    } else {
      list.push(meta);
    }
    this.writeMeta(list);
    return meta;
  }

  deleteProfile(id) {
    let list = this.readMeta();
    const target = list.find(p => p.id === id);
    if (target && target.profilePath && fs.existsSync(target.profilePath)) {
      try {
        fs.rmSync(target.profilePath, { recursive: true, force: true });
      } catch (e) {}
    }
    list = list.filter(p => p.id !== id);
    this.writeMeta(list);
    return true;
  }

  listProfiles() {
    const list = this.readMeta();
    // Validate each profile has cookie file on disk
    return list.map(p => {
      const hasCookieFile = p.cookieFile && fs.existsSync(p.cookieFile);
      return {
        ...p,
        hasCookies: hasCookieFile || Boolean(p.hasCookies)
      };
    });
  }
}

module.exports = {
  ProfileStore: new ProfileStore()
};
