<div align="center">

<img src="resources/mail.png" width="110" alt="Outlook-Auto logo" />

# Outlook-Auto

**Batch personalized email automation for Outlook — as a native desktop app.**

Upload an Excel sheet, pick a template, and Outlook-Auto renders every email,
saves it as a draft in your real Outlook drafts folder, and then batch-sends
them through the actual Outlook Web client — exactly as if you had written and
clicked "Send" yourself.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/jennifertang126/outlook-Auto/actions/workflows/ci.yml/badge.svg)](https://github.com/jennifertang126/outlook-Auto/actions/workflows/ci.yml)
[![Release](https://github.com/jennifertang126/outlook-Auto/actions/workflows/release.yml/badge.svg)](https://github.com/jennifertang126/outlook-Auto/actions/workflows/release.yml)
[![Electron](https://img.shields.io/badge/Electron-33-9feaf9?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## ✨ Features

- **Microsoft account login with zero Azure setup** — no app registration, no admin consent, no client secret. Sign in with your normal Microsoft account in an embedded browser window.
- **Excel-driven recipients** — upload `.xlsx`/`.xls`, any columns become template placeholders.
- **`{{placeholder}}` templates** with a built-in rich text editor (bold / italic / underline, ⌘B/⌘I/⌘U), auto-detecting text vs HTML.
- **Recipient deduplication** — automatically checks your *Sent Items* via IMAP and marks/excludes people you have already emailed before.
- **Real drafts in your real mailbox** — emails are APPENDed to the Outlook drafts folder over IMAP with OAuth2, attachments included, so they sync to every device.
- **Human-like batch sending** — a visible browser window opens Outlook Web, walks through each draft and clicks *Send*. Multi-language button matching (English / 中文 / Deutsch / Français / Español), personal and enterprise accounts both supported.
- **Self-healing authentication** — access tokens auto-refresh; expired refresh tokens transparently trigger a re-login prompt instead of failing silently.
- **Connection diagnostics** — dashboard shows live Token / IMAP status and can auto-recover.
- **Full job history** — SQLite-backed jobs, per-recipient records, statuses, error messages, one-click delete.

## 🧠 The interesting parts

This project is a showcase of several less-common techniques glued into one product:

### 1. OAuth2 without an Azure app registration

Microsoft's identity platform accepts a handful of **public first-party client IDs**.
Outlook-Auto performs the standard authorization-code flow against
`login.microsoftonline.com` using one of them, requesting only IMAP/SMTP-scoped
delegation for *the signed-in user's own mailbox*. No secret is involved (public
client), so nothing needs to be configured or hidden:

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant A as AuthService (main process)
    participant W as Embedded BrowserWindow
    participant MS as Microsoft identity platform

    A->>W: load authorize URL (public client, IMAP/SMTP + offline_access scopes)
    U->>W: signs in with Microsoft account
    MS-->>W: 302 redirect to https://localhost?code=...
    Note over W,A: redirect intercepted via will-redirect / did-navigate
    A->>MS: POST /token (authorization_code, mail scopes)
    MS-->>A: access_token + refresh_token
    A->>MS: POST /token (refresh_token grant, openid/email/profile scopes)
    MS-->>A: id_token (JWT)
    Note over A: decode JWT payload → user email + name
    A->>A: persist token cache to SQLite (auth_state)
```

Tokens never leave the local SQLite database. Logout wipes both the token cache
and the browser session storage.

### 2. Drafts over IMAP `APPEND` (not Graph API)

Emails are composed as raw MIME (via nodemailer's `MailComposer`, attachments
inlined), then appended to the `Drafts` folder with the `\Draft \Seen` flags
using XOAUTH2 SASL auth. Because it's the standard IMAP path, drafts appear
instantly in Outlook Web / desktop / mobile and remain fully editable before
sending.

### 3. Sending via Outlook Web automation — on purpose

Outlook-Auto deliberately does **not** fire emails over SMTP. Instead it opens a
visible BrowserWindow on `outlook.office.com/mail/drafts` (or
`outlook.live.com` for personal accounts), locates each draft row, opens it,
clicks *Send*, and navigates back — all inside the real web client:

- messages leave through the exact same path as hand-sent mail (same headers,
  same sent-items behavior, no SMTP client fingerprint),
- the window title shows live progress (`Sending 3/12…`),
- if the web session expired, the window simply waits for the user to sign in
  (title shows which account to use), then continues.

```mermaid
flowchart LR
    A["Excel file"] --> B["Parse recipients<br/>(any columns → placeholders)"]
    B --> C{"Dedup check<br/>IMAP search Sent Items"}
    C -->|"sent before"| D["Auto-excluded<br/>(re-enable per row)"]
    C -->|"new"| E["Render {{template}}<br/>per recipient"]
    E --> F["MIME + IMAP APPEND<br/>→ Outlook Drafts"]
    F --> G["Outlook Web automation<br/>open draft → click Send"]
    G --> H["📬 Sent"]
```

### 4. A job engine with retries and live progress

Draft creation runs in the background with exponential-backoff retries per
record; the renderer receives `job:progress` IPC events and renders live
progress bars. Sending maps results back **by index** (not by fragile subject
matching — that bug existed once, see v1.1.0 in the changelog).

```mermaid
stateDiagram-v2
    [*] --> draft_creating : job created
    draft_creating --> drafts_ready : all records appended
    draft_creating --> failed : error / cancelled
    drafts_ready --> sending : "user clicks Send All"
    sending --> completed : all drafts sent
    sending --> failed : error
    completed --> [*]
    failed --> [*]
```

## 🏗️ Architecture

```mermaid
graph TB
    subgraph R["Renderer — React 18 + Tailwind + shadcn/ui"]
        UI["Dashboard · Compose wizard (5 steps) · Drafts · Templates · History"]
        BR["window.electronAPI"]
    end
    subgraph PR["Preload"]
        CB["contextBridge — typed IPC surface"]
    end
    subgraph M["Main — Node.js"]
        IPC["ipc-handlers<br/>23 channels + progress events"]
        AUTH["AuthService<br/>OAuth2 · token lifecycle · auto re-login"]
        GS["GraphService<br/>IMAP append / search · SMTP · MIME"]
        OWA["OutlookWebService<br/>BrowserWindow automation"]
        JOB["JobService<br/>orchestration · retries · progress"]
        TPL["TemplateService<br/>rendering engine"]
        XLS["ExcelService<br/>xlsx parsing"]
        DB[("SQLite<br/>better-sqlite3 · WAL")]
    end

    UI --> BR
    BR --> CB
    CB --> IPC
    IPC --> AUTH
    IPC --> TPL
    IPC --> XLS
    IPC --> JOB
    JOB --> GS
    JOB --> OWA
    JOB --> DB
    AUTH --> DB
    TPL --> DB
```

A deeper write-up — IPC surface, database schema, token self-healing, the
automation heuristics (how the *Send* button is found, SPA navigation, i18n
matching) — lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

<details>
<summary><b>📊 Data model</b></summary>

```mermaid
erDiagram
    email_template ||--o{ send_job : "template_id"
    send_job ||--o{ send_record : "job_id"
    send_job ||--o{ attachment : "job_id"
    email_template {
        integer id PK
        text name
        text subject_template
        text body_template
        text body_format
    }
    send_job {
        integer id PK
        integer template_id FK
        text source_filename
        text status
    }
    send_record {
        integer id PK
        integer job_id FK
        text recipient_email
        text rendered_subject
        text status
    }
    attachment {
        integer id PK
        integer job_id FK
        text filename
        text file_path
    }
```

</details>

## 📸 Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/login.png" alt="Sign in with Microsoft — zero Azure setup" /></td>
    <td width="50%"><img src="docs/screenshots/dashboard.png" alt="Dashboard with live Token/IMAP diagnostics" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/compose-upload.png" alt="Recipient table with Sent-before dedup badges" /></td>
    <td width="50%"><img src="docs/screenshots/compose-preview.png" alt="Per-recipient template preview" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/job-detail.png" alt="Job detail with per-recipient statuses" /></td>
    <td width="50%"><img src="docs/screenshots/template-editor.png" alt="Rich text template editor" /></td>
  </tr>
</table>

Full walkthrough in [docs/screenshots](docs/screenshots/) — every step of the
Compose wizard (Upload → Template → Preview → Attachments → Confirm), the
Drafts list, Templates and History pages.

## 🚀 Getting started

### Prerequisites

- Node.js ≥ 20 and npm
- A Microsoft account with an Outlook mailbox (personal or enterprise)
- macOS for packaging (the `dmg` target builds arm64); `npm run dev` works on
  any desktop platform Electron supports

### Run in development

```bash
git clone https://github.com/jennifertang126/outlook-Auto.git
cd outlook-Auto
npm install
npm run dev
```

Sign in with your Microsoft account when the login window appears — that's the
whole setup.

### Build a release

```bash
npm run build:mac     # produces dist/outlook-auto-<version>-arm64.dmg
```

Or grab a prebuilt DMG from the [Releases](https://github.com/jennifertang126/outlook-Auto/releases)
page — every tag is built and published automatically by GitHub Actions.

## 📁 Project structure

```
src/
├── main/                      # Electron main process
│   ├── index.ts               # window lifecycle, app bootstrap
│   ├── ipc-handlers.ts        # 23 IPC channels + progress events
│   ├── database/              # SQLite schema, connection, migrations
│   └── services/
│       ├── auth.service.ts        # OAuth2 flow, token cache, self-healing
│       ├── graph.service.ts       # IMAP (drafts, dedup) + SMTP + MIME
│       ├── outlook-web.service.ts # Outlook Web automation (the sender)
│       ├── job.service.ts         # job orchestration, retries, progress
│       ├── template.service.ts    # {{placeholder}} rendering
│       └── excel.service.ts       # recipient import
├── preload/index.ts           # contextBridge — typed API surface
└── renderer/                  # React app
    ├── pages/                 # Login, Dashboard, Compose, Drafts, Templates, History
    ├── components/            # RichTextEditor, Layout, shadcn/ui primitives
    └── lib/                   # shared types, API client
```

## 🕰️ Version evolution

Twelve shipped versions in roughly a month, driven by real usage:

```mermaid
timeline
    title Outlook-Auto version history
    section 2026-06-01
        v1.0.0 : Initial release — login, templates, Excel import, IMAP drafts, web-automated sending, DMG packaging
        v1.1.0 : Session clearing on logout, titlebar fix, index-based send tracking
        v1.2.0 : Enterprise account support, login-wait for expired sessions
        v1.2.1 : Single-window batch sending, live progress in title
    section 2026-06-02
        v1.2.2 : Pure email address in draft recipient field
    section 2026-06-18
        v1.3.0 : Rich text templates, email signatures
        v1.3.1 : Editor dialog overflow fix, signature moved to Templates page
        v1.3.2 : Editor re-open fix
    section 2026-07-02
        v1.4.0 : Recipient deduplication against Sent Items
    section 2026-07-04
        v1.4.1 : Auto re-login on token expiry
        v1.5.0 : Job deletion
        v1.5.1 : Connection diagnostics dashboard
```

Full details in the [CHANGELOG](CHANGELOG.md).

## 🛠️ Tech stack

| Layer | Choice |
|---|---|
| Shell | Electron 33, electron-vite, electron-builder (arm64 DMG) |
| UI | React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix), react-router |
| Mail | imapflow (IMAP XOAUTH2), nodemailer (MIME composer), SMTP OAuth2 |
| Data | better-sqlite3 (WAL), xlsx |
| CI/CD | GitHub Actions — build on every push, release DMG on every tag |

## ⚠️ Disclaimers

- **Unofficial project.** Not affiliated with, endorsed by, or sponsored by
  Microsoft. "Outlook" is a trademark of Microsoft Corporation.
- **Authentication** relies on a public first-party OAuth2 client ID (the same
  one Thunderbird uses) to avoid requiring every user to register an Azure
  app. Tokens are scoped to the signed-in user's own mailbox via IMAP/SMTP
  delegation and are stored only in the local SQLite database. This is a
  gray area under Microsoft's terms of service — use at your own risk.
- **Use responsibly.** Bulk email is subject to anti-spam law and your
  provider's policies. This tool is built for legitimate personalized
  communication with people you have a reason to email.
- The `xlsx` dependency is the last npm-published version (0.18.5); newer
  SheetJS releases are distributed outside npm.

## 📄 License

[MIT](LICENSE) © 2026 jennifertang126
