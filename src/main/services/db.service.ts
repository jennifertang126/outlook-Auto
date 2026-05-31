import { getDb } from '../database/connection'

export class DbService {
  getSetting(key: string): string | null {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? null
  }

  setSetting(key: string, value: string): void {
    getDb()
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(key, value)
  }

  deleteSetting(key: string): void {
    getDb().prepare('DELETE FROM settings WHERE key = ?').run(key)
  }
}
