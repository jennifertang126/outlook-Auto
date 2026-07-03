# Changelog

## v1.5.1 (2026-07-04)

### Features
- **Connection diagnostics**: Dashboard shows real-time Token and IMAP connection status with green/red indicators
- Auto-diagnoses on dashboard load — if token expired, auto-triggers re-login
- "Test Connection" button for manual diagnostics at any time
- Shows specific error messages when token or IMAP fails

## v1.5.0 (2026-07-04)

### Features
- Delete button on each job in Drafts list and History list (trash icon, click to remove)
- Delete button in job detail view header
- Deleting a job removes all associated records and attachments from database

## v1.4.1 (2026-07-04)

### Bug Fixes
- Fixed "Dedup check failed" and draft creation failure after days of inactivity — token refresh now auto-triggers re-login when refresh token expires
- Fixed preview step showing all recipients including excluded ones — now only shows active (checked) recipients
- Preview navigation count matches active recipient count

### Improvements
- Auto re-login: when token expires (even after weeks), the app automatically pops up the Microsoft login window instead of failing silently
- No need to manually logout and re-login — just use the app normally

## v1.4.0 (2026-07-02)

### Features
- **Email deduplication**: After uploading Excel, automatically checks "Sent Items" folder via IMAP to find previously emailed recipients
- Duplicates are marked with "Sent before" badge and auto-excluded (unchecked)
- New recipients show "New" badge
- Checkbox per recipient to manually include/exclude anyone
- Select-all checkbox in header
- Confirm step shows active recipient count with excluded count
- Supports both personal and enterprise Outlook accounts (auto-detects "Sent Items" folder via IMAP SPECIAL-USE)

## v1.3.2 (2026-06-18)

### Bug Fixes
- Fixed template editor showing empty body when re-opening an existing template for editing

## v1.3.1 (2026-06-18)

### Bug Fixes
- Fixed template editor dialog overflow: body area now scrolls independently, buttons always visible
- Moved signature to Templates page as a one-time setup card with clear instructions

### Notes
- Email signature is a one-time setup: copy from Outlook Web → Settings → Mail → Compose → Email signature, paste once, saved permanently

## v1.3.0 (2026-06-18)

### Features
- **Rich text formatting**: template editor now supports bold, italic, underline via toolbar or ⌘B/⌘I/⌘U shortcuts
- **Email signature**: add a signature in the Compose step that auto-appends to every email; supports HTML formatting
- Templates auto-detect format: plain text stays as text, formatted ones save as HTML

## v1.2.2 (2026-06-02)

### Bug Fixes
- Fixed draft recipient field showing `"Name" <email>` format — now shows pure email address only, easier to verify in Outlook drafts folder

## v1.2.1 (2026-06-01)

### Bug Fixes
- Fixed Outlook Web window reopening for each email — now opens once, sends all drafts, then closes
- Fixed extra blank window appearing after all emails are sent
- Fixed second email failing due to drafts folder navigation not completing properly
- Improved sidebar "Drafts" folder click reliability with better selector matching

### Improvements
- Window title shows real-time progress: "Sending 1/5...", "Sending 2/5...", "Done! 5/5 sent"

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
