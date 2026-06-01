import { BrowserWindow } from 'electron'
import { getDb } from '../database/connection'

const CLIENT_ID = '9e5f94bc-e8a4-4e73-b8be-63364c29d753'
const REDIRECT_URI = 'https://localhost'

const MAIL_SCOPES = [
  'https://outlook.office.com/IMAP.AccessAsUser.All',
  'https://outlook.office.com/SMTP.Send',
  'offline_access'
]
const IDENTITY_SCOPES = ['openid', 'email', 'profile', 'offline_access']
const AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

interface TokenData {
  access_token: string
  refresh_token: string
  expires_in: number
  obtained_at: number
  user_email: string
  user_name: string
}

export class AuthService {
  private tokenData: TokenData | null = null
  private loaded = false

  private ensureLoaded(): void {
    if (!this.loaded) {
      this.loadTokenFromDb()
      this.loaded = true
    }
  }

  private loadTokenFromDb(): void {
    const row = getDb().prepare('SELECT token_cache FROM auth_state WHERE id = 1').get() as
      | { token_cache: string | null }
      | undefined
    if (row?.token_cache) {
      try { this.tokenData = JSON.parse(row.token_cache) } catch { this.tokenData = null }
    }
  }

  private saveTokenToDb(data: TokenData | null): void {
    const json = data ? JSON.stringify(data) : null
    getDb()
      .prepare(
        `INSERT INTO auth_state (id, token_cache, updated_at) VALUES (1, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET token_cache = ?, updated_at = datetime('now')`
      )
      .run(json, json)
  }

  private isTokenExpired(): boolean {
    if (!this.tokenData) return true
    return Math.floor(Date.now() / 1000) >= this.tokenData.obtained_at + this.tokenData.expires_in - 60
  }

  private decodeJwt(jwt: string): Record<string, any> {
    try {
      const parts = jwt.split('.')
      if (parts.length !== 3) return {}
      let p = parts[1]
      p += '='.repeat((4 - (p.length % 4)) % 4)
      return JSON.parse(Buffer.from(p, 'base64').toString('utf-8'))
    } catch { return {} }
  }

  private async tokenRequest(params: Record<string, string>): Promise<any> {
    const body = new URLSearchParams({ client_id: CLIENT_ID, ...params })
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    if (!res.ok) throw new Error(`Token request failed: ${await res.text()}`)
    return res.json()
  }

  async getStatus(): Promise<{ authenticated: boolean; userEmail?: string; userName?: string }> {
    this.ensureLoaded()
    if (!this.tokenData) return { authenticated: false }
    if (this.isTokenExpired()) {
      try {
        await this.refreshAccessToken()
      } catch {
        // Don't auto-login from getStatus — just report unauthenticated
        // The next action (checkSent, createDraft) will trigger auto re-login
        return { authenticated: false }
      }
    }
    return {
      authenticated: true,
      userEmail: this.tokenData.user_email,
      userName: this.tokenData.user_name || this.tokenData.user_email
    }
  }

  async login(): Promise<void> {
    const authCode = await this.openLoginWindow()

    // Step 1: Get mail access token
    const mailData = await this.tokenRequest({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: REDIRECT_URI,
      scope: MAIL_SCOPES.join(' ')
    })
    if (!mailData.refresh_token) throw new Error('No refresh token received')

    // Step 2: Use refresh token to get identity info (separate resource, can't mix)
    const idData = await this.tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: mailData.refresh_token,
      scope: IDENTITY_SCOPES.join(' ')
    })

    let email = '', name = ''
    for (const token of [idData.id_token, idData.access_token]) {
      if (!token || email) continue
      const c = this.decodeJwt(token)
      email = c.preferred_username || c.email || c.upn || c.unique_name || ''
      name = c.name || name
    }
    if (!email) throw new Error('Could not determine user email from login')

    this.tokenData = {
      access_token: mailData.access_token,
      refresh_token: mailData.refresh_token,
      expires_in: mailData.expires_in,
      obtained_at: Math.floor(Date.now() / 1000),
      user_email: email,
      user_name: name
    }
    this.saveTokenToDb(this.tokenData)
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.tokenData?.refresh_token) {
      this.tokenData = null
      this.saveTokenToDb(null)
      throw new Error('Session expired. Please login again.')
    }
    try {
      const data = await this.tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: this.tokenData.refresh_token,
        scope: MAIL_SCOPES.join(' ')
      })
      this.tokenData = {
        ...this.tokenData,
        access_token: data.access_token,
        refresh_token: data.refresh_token || this.tokenData.refresh_token,
        expires_in: data.expires_in,
        obtained_at: Math.floor(Date.now() / 1000)
      }
      this.saveTokenToDb(this.tokenData)
    } catch {
      // Refresh token expired or revoked — clear everything
      this.tokenData = null
      this.saveTokenToDb(null)
      throw new Error('Session expired. Please login again.')
    }
  }

  private openLoginWindow(): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: MAIL_SCOPES.join(' '),
        response_mode: 'query',
        prompt: 'select_account'
      })

      const win = new BrowserWindow({
        width: 500, height: 700, show: false, center: true,
        minimizable: false, maximizable: false, resizable: false,
        title: 'Sign in - Microsoft',
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      })

      const handle = (url: string): boolean => {
        if (!url.startsWith(REDIRECT_URI) || settled) return url.startsWith(REDIRECT_URI)
        settled = true
        const p = new URL(url)
        const code = p.searchParams.get('code')
        const err = p.searchParams.get('error_description') || p.searchParams.get('error')
        win.removeAllListeners('closed')
        setImmediate(() => win.close())
        if (err) reject(new Error(err))
        else if (code) resolve(code)
        else reject(new Error('No auth code'))
        return true
      }

      win.webContents.on('will-redirect', (e, u) => { if (handle(u)) e.preventDefault() })
      win.webContents.on('will-navigate', (e, u) => { if (handle(u)) e.preventDefault() })
      win.webContents.on('did-navigate', (_e, u) => handle(u))
      win.webContents.on('did-fail-load', (_e, _c, _d, u) => { if (u?.startsWith(REDIRECT_URI)) handle(u) })
      win.once('ready-to-show', () => win.show())
      win.on('closed', () => { if (!settled) { settled = true; reject(new Error('Login window was closed')) } })
      win.loadURL(`${AUTH_URL}?${params.toString()}`)
    })
  }

  async getAccessToken(): Promise<string> {
    this.ensureLoaded()
    if (!this.tokenData) throw new Error('Not authenticated')
    if (this.isTokenExpired()) {
      await this.refreshAccessToken()
    }
    return this.tokenData.access_token
  }

  getUserEmail(): string {
    this.ensureLoaded()
    return this.tokenData?.user_email || ''
  }

  async logout(): Promise<void> {
    this.tokenData = null
    this.loaded = false
    getDb().prepare("UPDATE auth_state SET token_cache = NULL, updated_at = datetime('now') WHERE id = 1").run()

    // Clear all browser session data so the next login/send uses fresh cookies
    const { session } = await import('electron')
    await session.defaultSession.clearStorageData()
    await session.defaultSession.clearCache()
  }
}
