import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import Database from 'better-sqlite3'
import { SCHEMA } from './schema'

let db: Database.Database | null = null

function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  const dataDir = join(userDataPath, 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  return join(dataDir, 'outlook_auto.db')
}

export function initDatabase(): void {
  const dbPath = getDbPath()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  for (const statement of SCHEMA) {
    db.exec(statement)
  }
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}
