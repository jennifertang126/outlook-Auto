<div align="center">

<img src="resources/mail.png" width="110" alt="Outlook-Auto logo" />

# Outlook-Auto

**Outlook 批量个性化邮件自动化 —— 原生桌面应用。**

上传 Excel 收件人表，选择邮件模板，Outlook-Auto 会为每个收件人渲染邮件、
保存到你真实的 Outlook 草稿箱，然后通过真实的 Outlook 网页客户端批量发送 ——
效果和你亲手写好每一封、逐封点击"发送"完全一致。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/jennifertang126/outlook-Auto/actions/workflows/ci.yml/badge.svg)](https://github.com/jennifertang126/outlook-Auto/actions/workflows/ci.yml)
[![Release](https://github.com/jennifertang126/outlook-Auto/actions/workflows/release.yml/badge.svg)](https://github.com/jennifertang126/outlook-Auto/actions/workflows/release.yml)
[![Electron](https://img.shields.io/badge/Electron-33-9feaf9?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## ✨ 功能特性

- **零 Azure 配置的微软账号登录** —— 无需应用注册、无需管理员同意、无需客户端密钥。在内嵌浏览器窗口中用普通微软账号登录即可。
- **Excel 驱动的收件人导入** —— 上传 `.xlsx`/`.xls`，任意列名自动成为模板占位符。
- **`{{占位符}}` 模板** —— 内置富文本编辑器（粗体/斜体/下划线，⌘B/⌘I/⌘U 快捷键），自动识别纯文本与 HTML 格式。
- **收件人去重** —— 通过 IMAP 自动检查"已发送邮件"文件夹，标记并默认排除曾经发过邮件的收件人。
- **草稿存进真实邮箱** —— 邮件以 OAuth2 方式通过 IMAP `APPEND` 到 Outlook 草稿文件夹（含附件），全设备实时同步。
- **拟人化批量发送** —— 打开可见的浏览器窗口操作 Outlook 网页版，逐封打开草稿并点击"发送"。多语言按钮匹配（English / 中文 / Deutsch / Français / Español），个人版与企业版账号均支持。
- **自愈式身份认证** —— 访问令牌自动刷新；刷新令牌过期时自动弹出重新登录，而不是静默失败。
- **连接诊断** —— 仪表盘实时显示 Token / IMAP 连接状态，并可自动恢复。
- **完整任务历史** —— 基于 SQLite 的任务、逐收件人记录、状态、错误信息，一键删除。

## 🧠 技术亮点

这个项目把若干不那么常见的工程技巧整合成了一个完整产品：

### 1. 无需 Azure 应用注册的 OAuth2

微软身份平台接受少量**公开的第一方客户端 ID**。Outlook-Auto 使用其中之一，
对 `login.microsoftonline.com` 走标准授权码流程，只为**登录用户自己的邮箱**
申请 IMAP/SMTP 范围的委托。公开客户端不涉及任何密钥，因此无需任何配置或隐藏：

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant A as AuthService（主进程）
    participant W as 内嵌 BrowserWindow
    participant MS as 微软身份平台

    A->>W: 加载授权 URL（公开客户端，IMAP/SMTP + offline_access 范围）
    U->>W: 使用微软账号登录
    MS-->>W: 302 重定向到 https://localhost?code=...
    Note over W,A: 通过 will-redirect / did-navigate 拦截重定向
    A->>MS: POST /token（authorization_code，邮件范围）
    MS-->>A: access_token + refresh_token
    A->>MS: POST /token（refresh_token 授权，openid/email/profile 范围）
    MS-->>A: id_token（JWT）
    Note over A: 解码 JWT 载荷 → 用户邮箱 + 姓名
    A->>A: 令牌缓存持久化到 SQLite（auth_state 表）
```

令牌只保存在本地 SQLite 数据库中，绝不外传。登出时会同时清除令牌缓存与浏览器会话数据。

### 2. 通过 IMAP `APPEND` 建草稿（而非 Graph API）

邮件以原始 MIME 格式组装（借助 nodemailer 的 `MailComposer`，附件内联），
然后使用 XOAUTH2 SASL 认证追加到 `Drafts` 文件夹并打上 `\Draft \Seen` 标记。
因为走的是标准 IMAP 通道，草稿会即时出现在 Outlook 网页版/桌面版/移动端，
发送前可任意编辑。

### 3. 有意为之：通过 Outlook 网页自动化发送

Outlook-Auto 刻意**不**通过 SMTP 直发邮件，而是打开一个可见的
BrowserWindow 访问 `outlook.office.com/mail/drafts`（个人账号为
`outlook.live.com`），定位每条草稿、打开、点击*发送*、返回列表 —— 全部在
真实网页客户端内完成：

- 邮件走的路径与手工发送完全一致（相同的邮件头、相同的已发送行为，无 SMTP 客户端指纹）；
- 窗口标题实时显示进度（`Sending 3/12…`）；
- 若网页会话过期，窗口会等待用户登录（标题提示应使用的账号），登录后自动继续。

```mermaid
flowchart LR
    A["Excel 文件"] --> B["解析收件人<br/>（任意列名 → 占位符）"]
    B --> C{"去重检查<br/>IMAP 搜索已发送文件夹"}
    C -->|"曾发过"| D["自动排除<br/>（可逐行重新勾选）"]
    C -->|"新收件人"| E["逐收件人渲染{{模板}}"]
    E --> F["MIME + IMAP APPEND<br/>→ Outlook 草稿箱"]
    F --> G["Outlook 网页自动化<br/>打开草稿 → 点击发送"]
    G --> H["📬 已发送"]
```

### 4. 带重试与实时进度的任务引擎

草稿创建在后台执行，逐条记录指数退避重试；渲染进程通过 `job:progress`
IPC 事件接收实时进度条。发送结果**按下标**回写（而非脆弱的主题文本匹配
—— 这个 bug 曾经存在过，见 CHANGELOG 的 v1.1.0）。

```mermaid
stateDiagram-v2
    [*] --> draft_creating : 创建任务
    draft_creating --> drafts_ready : 全部草稿已写入
    draft_creating --> failed : 出错 / 取消
    drafts_ready --> sending : 用户点击"全部发送"
    sending --> completed : 全部发送完成
    sending --> failed : 出错
    completed --> [*]
    failed --> [*]
```

## 🏗️ 架构

```mermaid
graph TB
    subgraph R["渲染进程 — React 18 + Tailwind + shadcn/ui"]
        UI["仪表盘 · 编写向导（5 步）· 草稿 · 模板 · 历史"]
        BR["window.electronAPI"]
    end
    subgraph PR["Preload"]
        CB["contextBridge — 类型化 IPC 接口"]
    end
    subgraph M["主进程 — Node.js"]
        IPC["ipc-handlers<br/>23 个通道 + 进度事件"]
        AUTH["AuthService<br/>OAuth2 · 令牌生命周期 · 自动重登"]
        GS["GraphService<br/>IMAP 写入 / 搜索 · SMTP · MIME"]
        OWA["OutlookWebService<br/>BrowserWindow 自动化"]
        JOB["JobService<br/>任务编排 · 重试 · 进度"]
        TPL["TemplateService<br/>模板渲染引擎"]
        XLS["ExcelService<br/>xlsx 解析"]
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

更深入的技术剖析 —— IPC 接口清单、数据库结构、令牌自愈机制、自动化
启发式策略（如何找到*发送*按钮、SPA 导航、多语言匹配）—— 见
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

<details>
<summary><b>📊 数据模型</b></summary>

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

## 📸 截图

> 待补充 —— 可在此处添加编写向导、去重表格、草稿页面和 Outlook 网页
> 发送窗口的截图。（下方 DMG 开箱即用，欢迎自行体验。）

## 🚀 快速开始

### 前置条件

- Node.js ≥ 20 与 npm
- 带有 Outlook 邮箱的微软账号（个人版或企业版）
- 打包需要 macOS（`dmg` 目标构建 arm64）；`npm run dev` 可在 Electron
  支持的任意桌面平台运行

### 开发运行

```bash
git clone https://github.com/jennifertang126/outlook-Auto.git
cd outlook-Auto
npm install
npm run dev
```

登录窗口出现后用微软账号登录 —— 这就是全部的配置工作。

### 构建发布版

```bash
npm run build:mac     # 产出 dist/outlook-auto-<版本号>-arm64.dmg
```

也可以直接从 [Releases](https://github.com/jennifertang126/outlook-Auto/releases)
页面下载预构建的 DMG —— 每次打 tag 都会由 GitHub Actions 自动构建并发布。

## 📁 项目结构

```
src/
├── main/                      # Electron 主进程
│   ├── index.ts               # 窗口生命周期、应用引导
│   ├── ipc-handlers.ts        # 23 个 IPC 通道 + 进度事件
│   ├── database/              # SQLite 结构、连接、迁移
│   └── services/
│       ├── auth.service.ts        # OAuth2 流程、令牌缓存、自愈
│       ├── graph.service.ts       # IMAP（草稿、去重）+ SMTP + MIME
│       ├── outlook-web.service.ts # Outlook 网页自动化（发送器）
│       ├── job.service.ts         # 任务编排、重试、进度
│       ├── template.service.ts    # {{占位符}} 渲染
│       └── excel.service.ts       # 收件人导入
├── preload/index.ts           # contextBridge —— 类型化 API 接口
└── renderer/                  # React 应用
    ├── pages/                 # 登录、仪表盘、编写、草稿、模板、历史
    ├── components/            # RichTextEditor、Layout、shadcn/ui 基础组件
    └── lib/                   # 共享类型、API 客户端
```

## 🕰️ 版本演进

一个月内发布十二个版本，全部由真实使用驱动：

```mermaid
timeline
    title Outlook-Auto 版本历史
    section 2026-06-01
        v1.0.0 : 首个版本 —— 登录、模板、Excel 导入、IMAP 草稿、网页自动化发送、DMG 打包
        v1.1.0 : 登出清除会话、标题栏修复、按下标回写发送结果
        v1.2.0 : 企业账号支持、会话过期等待登录
        v1.2.1 : 单窗口批量发送、标题实时进度
    section 2026-06-02
        v1.2.2 : 草稿收件人字段显示纯邮箱地址
    section 2026-06-18
        v1.3.0 : 富文本模板、邮件签名
        v1.3.1 : 编辑器对话框溢出修复、签名移至模板页
        v1.3.2 : 编辑器重新打开修复
    section 2026-07-02
        v1.4.0 : 基于已发送文件夹的收件人去重
    section 2026-07-04
        v1.4.1 : 令牌过期自动重登
        v1.5.0 : 任务删除
        v1.5.1 : 连接诊断仪表盘
```

完整细节见 [CHANGELOG](CHANGELOG.md)。

## 🛠️ 技术栈

| 层 | 选型 |
|---|---|
| 外壳 | Electron 33、electron-vite、electron-builder（arm64 DMG） |
| 界面 | React 18、TypeScript、Tailwind CSS、shadcn/ui (Radix)、react-router |
| 邮件 | imapflow（IMAP XOAUTH2）、nodemailer（MIME 组装）、SMTP OAuth2 |
| 数据 | better-sqlite3（WAL）、xlsx |
| CI/CD | GitHub Actions —— 每次推送构建、每次打 tag 发布 DMG |

## ⚠️ 免责声明

- **非官方项目。** 与 Microsoft 无关联、未被其认可或赞助。"Outlook" 是
  Microsoft Corporation 的商标。
- **身份认证**依赖一个公开的第一方 OAuth2 客户端 ID（Thunderbird 所使用的
  同一个），以避免要求每个用户注册 Azure 应用。令牌范围仅限登录用户自己的
  邮箱（IMAP/SMTP 委托），且只保存在本地 SQLite 数据库中。这在微软服务条款
  下属于灰色地带 —— 请自行评估风险。
- **负责任地使用。** 批量邮件受反垃圾邮件法律与服务商政策约束。本工具面向
  有正当理由进行的个性化沟通。
- `xlsx` 依赖为 npm 上发布的最后一个版本（0.18.5）；SheetJS 更新的版本在
  npm 之外分发。

## 📄 许可证

[MIT](LICENSE) © 2026 jennifertang126
