# Changelog

## v1.2.0 (2026-06-01)

### Bug Fixes
- Fixed enterprise/work Outlook accounts: auto-detect account type and use `outlook.office.com` for enterprise or `outlook.live.com` for personal accounts
- Fixed send failure after switching accounts: Outlook Web window now waits for user to complete login if session expired
- Fixed window closing prematurely when Outlook Web redirects to login page

### Improvements
- Outlook Web send window title shows which account to sign in with when login is required
- Increased login wait timeout to 3 minutes for slow connections
- Fallback to full page reload only when SPA draft folder navigation fails

## v1.1.0 (2026-06-01)

### Bug Fixes
- Fixed account switching: logout now clears browser session data, so Outlook Web send window uses the correct account after switching
- Fixed title bar overlapping with macOS traffic light buttons (close/minimize/maximize)
- Fixed send result tracking: each email's send status now maps correctly by index instead of subject text matching
- Fixed draft matching: use exact subject match to avoid sending the wrong draft when subjects are substrings of each other

### Improvements
- Outlook Web send window stays open for all drafts instead of reopening per email
- Navigate back to drafts folder via SPA link click instead of full page reload
- App name changed to "Outlook-Auto" with custom icon

## v1.0.0 (2026-06-01)

### Features
- Microsoft account login via embedded browser (no Azure App Registration needed)
- Email template management with `{{placeholder}}` syntax
- Excel file upload and recipient parsing
- Batch draft creation via IMAP to Outlook drafts folder
- Drafts sync to Outlook Web — visible in real drafts folder
- One-click batch send via Outlook Web automation
- Multi-step compose workflow: Upload → Template → Preview → Attachments → Create Drafts
- Dashboard with job stats and history
- SQLite database for templates, jobs, and send records
- macOS DMG packaging
