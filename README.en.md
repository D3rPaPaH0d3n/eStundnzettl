<p align="center">
  <a href="./README.md"><img src="https://img.shields.io/badge/🇩🇪_Deutsch-→-64748b?style=for-the-badge" alt="Auf Deutsch wechseln" /></a>
  <img src="https://img.shields.io/badge/🇬🇧_English-active-1e40af?style=for-the-badge" alt="Active language: English" />
</p>

<p align="center">
  <img src="./docs/readme-banner-2026-05-15.png" alt="eStundnzettl — Smart time tracking from Styria" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/D3rPaPaH0d3n/eStundnzettl/releases/latest">
    <img src="https://img.shields.io/github/v/release/D3rPaPaH0d3n/eStundnzettl?label=Version&color=10b981&style=for-the-badge&logo=github&logoColor=white" alt="Latest version" />
  </a>
  <a href="https://github.com/D3rPaPaH0d3n/eStundnzettl/releases">
    <img src="https://img.shields.io/github/downloads/D3rPaPaH0d3n/eStundnzettl/total?label=Downloads&color=8b5cf6&style=for-the-badge&logo=github&logoColor=white" alt="GitHub downloads" />
  </a>
  <a href="https://github.com/D3rPaPaH0d3n/eStundnzettl/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="License MIT" />
  </a>
  <a href="https://github.com/D3rPaPaH0d3n/eStundnzettl/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/D3rPaPaH0d3n/eStundnzettl/ci.yml?branch=main&label=CI&color=2ea44f&style=for-the-badge&logo=githubactions&logoColor=white" alt="CI Status" />
  </a>
  <a href="https://github.com/D3rPaPaH0d3n/eStundnzettl/actions/workflows/codeql.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/D3rPaPaH0d3n/eStundnzettl/codeql.yml?branch=main&label=CodeQL&color=2563eb&style=for-the-badge&logo=github&logoColor=white" alt="CodeQL Security Analysis" />
  </a>
  <a href="https://github.com/D3rPaPaH0d3n/eStundnzettl/actions/workflows/coverage-badge.yml">
    <img src="./badges/coverage.svg" alt="Test Coverage" />
  </a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/D3rPaPaH0d3n/eStundnzettl/main/native/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp" width="120" alt="eStundnzettl logo" />
</p>

<h1 align="center">eStundnzettl</h1>

<p align="center">
  <strong>🏔️ Smart time tracking from Styria, Austria.</strong><br />
  No more paper slips — log hours, drives and vacation straight from your phone.<br />
  At the end of the month: one clean PDF. Done. ✅
</p>

<p align="center">
  <a href="https://play.google.com/store/apps/details?id=com.estundnzettl.app">
    <img src="https://img.shields.io/badge/Google_Play-Get_it_now-3DDC84?style=for-the-badge&logo=google-play&logoColor=white" alt="Google Play" />
  </a>
  <a href="https://github.com/D3rPaPaH0d3n/eStundnzettl/releases/latest">
    <img src="https://img.shields.io/badge/GitHub_Release-Download_APK-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Release Download" />
  </a>
</p>

---

## 🌲 Rebuilt for 5.0.0: fully native Android

For version 5, eStundnzettl was rebuilt as a **native Kotlin Android app**. **Jetpack Compose, Material 3 and Room** now work directly with Android instead of running the UI inside a WebView. The result is faster, more robust and still unmistakably Styrian. This native generation is currently being tested in the **Google Play beta track**.

The `main` branch contains the current Kotlin app. Capacitor 4.5.x remains available for emergency fixes and as a traceable migration reference in [`legacy/capacitor-4.5.x`](https://github.com/D3rPaPaH0d3n/eStundnzettl/tree/legacy/capacitor-4.5.x).

### What the rebuild adds

- 📱 **A truly native UI** — Jetpack Compose and Material You without a Capacitor WebView
- 🧳 **Safe in-place migration** — existing entries and settings are imported while the old database remains untouched as a fallback
- 🛡️ **Stronger recovery** — verified backups, conflict checks and protection against damaged snapshots
- ☁️ **Backup health feedback** — Google Drive, Nextcloud and local backups with quiet but visible warnings when a target stays unavailable
- 📄 **Native PDF reports** — fast preview, monthly or weekly reports, local archiving and direct sharing
- ✉️ **Smarter PDF delivery** — configurable default recipient, subject, message and preferred sharing app
- ✅ **Friendly hand-off feedback** — a small “All set, handed over!” confirmation after successful sharing
- 🧹 **Cleaner settings** — compact expandable cards with clear status indicators
- 🎯 **Flexible monthly targets** — target hours matching the user's work schedule

> During the transition, the beta and the public Play Store release may be on different versions. Merging into `main` does not publish the app automatically; releases are deliberately promoted through Google Play tracks.

---

## 📸 Screenshots

<p align="center">
  <img src="docs/screenshots/dashboard_detail.png" width="150" alt="Weekly details" style="transform: rotate(-3deg);" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/onboarding.png" width="170" alt="Welcome" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/bericht.png" width="150" alt="PDF report" style="transform: rotate(2deg);" />
</p>

<p align="center">
  <img src="docs/screenshots/neuer_eintrag.png" width="140" alt="New entry" style="transform: rotate(2deg);" />
  &nbsp;
  <img src="docs/screenshots/dashboard.png" width="180" alt="Monthly overview" />
  &nbsp;
  <img src="docs/screenshots/einstellungen.png" width="140" alt="Settings" style="transform: rotate(-2deg);" />
</p>

<p align="center">
  <img src="docs/screenshots/arbeitszeitmodell.png" width="150" alt="Work schedule" style="transform: rotate(-2deg);" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/backup_setup.png" width="170" alt="Backup setup" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/hilfe.png" width="150" alt="Guide & help" style="transform: rotate(3deg);" />
</p>

---

## ✨ Highlights

| | Feature | Description |
|---|---------|--------------|
| 🌲 | **Native Kotlin app** | Fluid Compose UI without a WebView and with Material You support |
| 🧳 | **Smooth 5.0 update** | Existing Capacitor data is imported automatically on first launch |
| 🎯 | **Flexible work schedules** | 38.5h, 40h, 4-day week or fully custom |
| ⏱️ | **Live timer** | Long-press, swipe up — timer running |
| 📊 | **Real-time balance** | Overtime, extra hours and flex-time always in view |
| 🇦🇹 | **Regional holidays** | Austria, 16 German states and 26 Swiss cantons |
| 📄 | **PDF export** | Professional timesheet by month or week |
| ☁️ | **Automatic backups** | Google Drive, Nextcloud or local — daily |
| 📎 | **Attach documents** | Delivery notes, photos and receipts straight on the entry |
| 📴 | **Offline-capable** | Works fully without internet — cloud is optional |
| 🚫 | **No tracking** | No ads, no analytics, no data collection |
| 🌍 | **Bilingual** | German & English UI — language switchable in Settings |
| 🧭 | **Onboarding & tour** | Guided setup + interactive in-app tour on first launch |
| 🌙 | **Dark mode** | Easy on the eyes when it's dark outside |
| 🔧 | **Power-user mode** | Advanced settings for pros — opt-in |

---

## 🚀 Quick start

### 1️⃣ Set up — ready in 2 minutes

On first launch the **setup wizard** walks you through everything:

- 👤 Enter **name & company**
- 📅 Pick your **work schedule** (full-time, part-time, 4-day week, …)
- 💾 Configure **backup** (optional — Google Drive, local or Nextcloud)

> 🧪 Or just tap **"Just take a look"** and start with demo data!

### 2️⃣ Log hours

Hit the **+** button in the bottom right — or use the **live timer**:

| Method | How |
|---------|-----------|
| ▶️ **Live timer** | Long-press the **+** button and swipe up. Timer runs until you stop it. |
| ✏️ **Manual** | Tap **+**, set times, pick activity, save. |
| 🪄 **Same as last** | Copies start, end and break from the previous day — one tap. |

### 3️⃣ Drive times

Pick the **"Drive"** type when creating the entry:

- 🟢 **Arrival / Departure** — paid work time, counts towards the daily target
- 🟠 **Drive time** — unpaid travel, reported separately

### 4️⃣ Vacation, sick leave & time off

🏖️ Just pick the right type — the app automatically credits the correct target hours for the day. No manual math needed.

### 5️⃣ Attach documents

📎 You can attach photos or files to any entry — delivery notes, receipts, work reports. Attachments are included automatically when you export the PDF.

### 6️⃣ Month close — create the PDF

1. Tap the **📊 report icon** in the top right
2. Pick a month or calendar week
3. **📤 Share PDF** — via email, WhatsApp or save locally

---

## 💾 Backup & data safety

| Target | Description |
|------|-------------|
| ☁️ **Google Drive** | Daily auto-backup + monthly PDF archive to your cloud |
| 📁 **Local** | Backup + PDF to a folder of your choice on the device |
| 🖥️ **Nextcloud** | Full data sovereignty on your own cloud |

> 💡 Everything is optional — the app works fully offline and without backups.

---

## 🔧 Power-user mode

For pros who want more! Enable **power-user mode** in settings to unlock extra features:

- 🖥️ **Nextcloud integration** — back up to your own cloud
- 📦 **JSON import / export** — back up and move data manually
- 📄 **Automatic PDF archive** — monthly PDF backups to every target
- 🎛️ **PDF layout toggles** — choose which fields appear in the exported PDF
- 🏷️ **Activity codes** — industry presets or your own codes
- 🌍 **Locale picker** — state/canton for correct holidays & calculation
- ⏸️ **Auto-break rules** — configurable break logic per work type and locale
- 📋 **Record only** — hour tracking without target/actual calculation

---

## 🌐 Language

The app UI ships with full **German and English** translations. Settings → **Language** lets you switch any time; the device language is auto-detected on first launch.

---

## 📲 Install

1. Open the [**Google Play Store**](https://play.google.com/store/apps/details?id=com.estundnzettl.app) on your Android device
2. Tap **Install**
3. **Done!** 🎉

> 💡 The app updates automatically via the Play Store — you always have the latest version.

> 🧪 The native Kotlin 5.0.0 app is currently in beta. Until production promotion, the regular store listing may still deliver the stable Capacitor 4.5.x release.

---

## 🛡️ Data security

- 🔒 **Local first:** All data stays on your device
- 💾 **Backups:** Optional — local, Google Drive or Nextcloud
- 🔐 **Secure passwords:** Nextcloud credentials are encrypted in Android Keystore-backed storage
- 🚫 **No tracking:** No ads, no analytics, no data collection
- 📖 **Open source:** Full source code available, MIT-licensed
- ✅ **Full control:** You decide where your data goes

---

## ☕ Buy me a coffee

The app is **completely free** and stays that way — **no ads, no subscription, nothing**.
If you find it useful and feel like saying thanks, a small tip via Revolut is always appreciated. No obligation, but a little "cheers!" never hurt anyone. 😄

<p align="center">
  <a href="https://revolut.me/mkainer/pocket/QAt1Q0Ntsb">
    <img src="https://img.shields.io/badge/Revolut-Buy_me_a_coffee-0075EB?style=for-the-badge&logo=revolut&logoColor=white" alt="Buy me a coffee via Revolut" />
  </a>
</p>

<p align="center">
  <em>🏔️ Thanks a lot and take care! 🏔️</em>
</p>

---

## ⚙️ Tech stack

| | Technology |
|---|-------------|
| 📱 App | Kotlin, Android SDK 36, Coroutines |
| 🎨 UI | Jetpack Compose, Material 3, Material You |
| 🧠 Logic | Standalone Kotlin/JVM `core` module |
| 🗄️ Database | Room on SQLite with compatible Capacitor database migration |
| 📄 PDF | `PdfDocument` for vector PDFs and `PdfRenderer` for native previews |
| ☁️ Cloud | Google Drive REST API, Nextcloud WebDAV, Storage Access Framework |
| 🔐 Secrets | AndroidX Security Crypto and Android Keystore |
| 🌐 Languages | Native German/English resources from a shared JSON source |
| 🧪 Tests | JUnit, Kotlin Test, AndroidX instrumentation and Vitest parity tests |

### Repository layout

| Path | Purpose |
|------|---------|
| `native/` | Current Kotlin app and primary Android build |
| `src/` and `android/` | Previous Capacitor app, retained temporarily for migration and parity tests |
| `fastlane/metadata/` | Google Play release notes |
| `.github/workflows/` | Native CI, APK, GitHub Release and Play Store builds |

For a local debug build on Windows:

```powershell
cd native
.\gradlew.bat :core:test :app:testDebugUnitTest :app:assembleDebug
```

`main` is the development base for the Kotlin app. The frozen Capacitor release is available in `legacy/capacitor-4.5.x`.

---

## 📝 Changelog

The full version history is available in the app under **Settings → Changelog** or in the [GitHub Releases](https://github.com/D3rPaPaH0d3n/eStundnzettl/releases).

---

## 📄 License

The source code of this project is licensed under the **[MIT License](./LICENSE)**.

You may use, copy, modify and redistribute the code — as long as the copyright notice `Copyright (c) 2024-2026 Markus Kainer` and the license text remain included. In short: **whoever uses the code must credit me.** ✌️

---

## ™️ Name & logo

The MIT license covers **only the source code**. The name **"eStundnzettl"**, the app logo, the visual identity and the screenshots are **not** part of the open-source license and remain protected.

👉 Details in [**TRADEMARK.md**](./TRADEMARK.md).

Short version: forks are welcome — but under your own name and with your own logo. 🙏

---

## 📬 Contact

Questions, licensing requests, trademark topics or bug reports?

**[project@kainer.co.at](mailto:project@kainer.co.at)**

---

<p align="center">
  <strong>Crafted 💭 by Markus 👨 — built with heart ❤️, brain 🧠 and AI agents 🤖.</strong><br />
  <br />
  <em>🏔️ "So that no hour gets lost!" 🏔️</em>
</p>
