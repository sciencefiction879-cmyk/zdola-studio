# ZDola Studio for macOS (.dmg)

> **ZDola Studio & ZBot** — Unlimited 30-Second Seedance 2.5 Videos on Autopilot  
> Created by Zakariya Studio ([zakariyastudio.com](https://zakariyastudio.com/))  
> Native macOS Desktop Application (`.dmg`)

---

## 🌟 Overview

**ZDola Studio** automates the entire workflow of generating cinematic 30-second AI videos with **ByteDance Seedance 2.5** via **Dola AI**:

1. **Add Accounts**: Drop your exported cookie files (`.txt` Netscape format or `.json` Cookie-Editor format).
2. **Account Validation & Skill Checking**: ZDola tests whether accounts are live and ensures the **`dola-seedance-2-5-30s`** skill is installed and active on each account.
3. **Smart Rotation & Cooldowns**: Accounts take turns automatically (`longest ago goes first`). Each account rests for 5 minutes between generations while other accounts continue.
4. **Single & Multi-Prompt Generation**:
   - **Single Prompt**: 1 prompt duplicated across $N$ videos.
   - **Multiple Prompts**: 1 prompt per line or imported CSV/txt with duplicate removal.
5. **Decryption & Unwatermarked Download**: Captures the rendering stream and uses the Seedance 2.5 QAAB token decryption algorithm to save crisp, unwatermarked MP4 files into dated batch folders (`YYYY-MM-DD HH-MM - N videos`).

---

## 🖥️ User Interface

The UI matches the official ZDola Studio design:
- **Theme**: Dark Mode & Light Mode toggle
- **Sidebar**:
  - `Accounts` view: Account cards with live status badges (`Live ✓`, `No skill`, `Expired`, `Resting 4:59`), `Chrome ↗` direct link, batch selection, and live account filtering.
  - `Settings` view: Single cookie path, custom skill upload, account maintenance (task clearance), parallel account checks, parallel threads (1–10), and video check intervals (5 min, 7 min, 10 min).
- **Main Stage**:
  - Prompt text area with mode toggle (`Single prompt` / `Multiple prompts`)
  - Stepper controls (`Videos - [ 5 ] +`)
  - Destination folder picker with `Browse` and `Open folder`
  - Generation action bar (`X videos queued`, `Start generation →`, `Stop queue`)
  - **Live Activity Panel**:
    - Counters: `▶ X started · Y rendering · ↓ Z downloaded of Total`
    - Progress track with smooth glow
    - Real-time timestamped activity logs (`Simple` / `Details` / `Copy log`)

---

## 📦 Installation on macOS

1. Open the generated DMG file:
   ```bash
   open dist/ZDola\ Studio-1.2.9-arm64.dmg
   ```
2. Drag **ZDola Studio** into your **Applications** folder.
3. Open **ZDola Studio** from Applications or Spotlight.
4. If macOS shows a Gatekeeper note:
   - Go to **System Settings > Privacy & Security** and click **Open Anyway**.

---

## 🔑 Activation

- License type: **Lifetime Community Access**
- Default Key: `ZS-LIFETIME-COMMUNITY-VIP` (pre-activated)
- Support: WhatsApp & Facebook buttons available directly in the top header.
