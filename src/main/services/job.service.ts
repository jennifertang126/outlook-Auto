import { BrowserWindow } from 'electron'
import { getDb } from '../database/connection'
import { getAuthService } from '../ipc-handlers'
import { GraphService } from './graph.service'
import { OutlookWebService } from './outlook-web.service'
import { TemplateService } from './template.service'
import { basename } from 'path'
import { statSync } from 'fs'
import { lookup } from 'mime-types'

const BATCH_DELAY_MS = 1500
const SEND_DELAY_MS = 1000
const MAX_RETRIES = 3

interface CreateJobData {
  template_id: number
  recipients: Record<string, string>[]
  source_filename: string
  attachment_paths?: string[]
}

interface RecordRow {
  id: number
  job_id: number
  recipient_email: string
  recipient_name: string
  recipient_data: string
  rendered_subject: string
  rendered_body: string
  draft_message_id: string | null
  status: string
  error_message: string | null
  created_at: string
  sent_at: string | null
}

const graphService = new GraphService()
const outlookWebService = new OutlookWebService()
const templateService = new TemplateService()

export class JobService {
  list(): any[] {
    return getDb()
      .prepare(
        `SELECT j.*, t.name as template_name,
         (SELECT COUNT(*) FROM send_record WHERE job_id = j.id AND status = 'draft_created') as draft_created_count,
         (SELECT COUNT(*) FROM send_record WHERE job_id = j.id AND status = 'sent') as sent_count,
         (SELECT COUNT(*) FROM send_record WHERE job_id = j.id AND status = 'failed') as failed_count
         FROM send_job j
         LEFT JOIN email_template t ON j.template_id = t.id
         ORDER BY j.created_at DESC`
      )
      .all()
  }

  getDetail(id: number): any {
    const job = getDb()
      .prepare(
        `SELECT j.*, t.name as template_name
         FROM send_job j
         LEFT JOIN email_template t ON j.template_id = t.id
         WHERE j.id = ?`
      )
      .get(id) as any

    if (!job) throw new Error('Job not found')

    const records = getDb()
      .prepare('SELECT * FROM send_record WHERE job_id = ? ORDER BY id')
      .all(id) as RecordRow[]

    return {
      ...job,
      records: records.map((r) => ({ ...r, recipient_data: JSON.parse(r.recipient_data) }))
    }
  }

  private async prepareGraphService(): Promise<void> {
    const authService = getAuthService()
    const accessToken = await authService.getAccessToken()
    const userEmail = authService.getUserEmail()
    graphService.setAccessToken(accessToken)
    graphService.setUserEmail(userEmail)
  }

  private getAttachmentPaths(jobId: number): string[] {
    const attachments = getDb()
      .prepare('SELECT file_path FROM attachment WHERE job_id = ?')
      .all(jobId) as { file_path: string }[]
    return attachments.map((a) => a.file_path)
  }

  async create(data: CreateJobData): Promise<any> {
    const template = templateService.getById(data.template_id)
    if (!template) throw new Error('Template not found')

    const db = getDb()

    const jobResult = db
      .prepare(
        `INSERT INTO send_job (template_id, source_filename, total_recipients, status)
         VALUES (?, ?, ?, 'draft_creating')`
      )
      .run(data.template_id, data.source_filename, data.recipients.length)

    const jobId = jobResult.lastInsertRowid as number

    const insertRecord = db.prepare(
      `INSERT INTO send_record (job_id, recipient_email, recipient_name, recipient_data, rendered_subject, rendered_body, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`
    )

    const insertMany = db.transaction((recipients: Record<string, string>[]) => {
      for (const recipient of recipients) {
        const renderedSubject = templateService.renderTemplate(
          template.subject_template,
          recipient
        )
        const renderedBody = templateService.renderTemplate(template.body_template, recipient)
        const emailKey =
          Object.keys(recipient).find((k) => k.toLowerCase() === 'email') || 'email'
        const nameKey =
          Object.keys(recipient).find((k) => k.toLowerCase() === 'name') || 'name'

        insertRecord.run(
          jobId,
          recipient[emailKey] || '',
          recipient[nameKey] || '',
          JSON.stringify(recipient),
          renderedSubject,
          renderedBody
        )
      }
    })

    insertMany(data.recipients)

    if (data.attachment_paths && data.attachment_paths.length > 0) {
      const insertAttachment = db.prepare(
        `INSERT INTO attachment (job_id, filename, file_path, content_type, file_size)
         VALUES (?, ?, ?, ?, ?)`
      )
      for (const filePath of data.attachment_paths) {
        const name = basename(filePath)
        const stat = statSync(filePath)
        const mime = lookup(name) || 'application/octet-stream'
        insertAttachment.run(jobId, name, filePath, mime, stat.size)
      }
    }

    // Save drafts to Outlook via IMAP in background
    this.createDraftsInBackground(jobId)

    return this.getDetail(jobId)
  }

  private async createDraftsInBackground(jobId: number): Promise<void> {
    try {
      await this.prepareGraphService()

      const records = getDb()
        .prepare("SELECT * FROM send_record WHERE job_id = ? AND status = 'pending' ORDER BY id")
        .all(jobId) as RecordRow[]

      const attachmentPaths = this.getAttachmentPaths(jobId)

      for (let i = 0; i < records.length; i++) {
        await this.createSingleDraft(records[i], attachmentPaths)
        this.emitProgress(jobId, i + 1, records.length, 'creating_drafts')

        if (i < records.length - 1) {
          await this.sleep(BATCH_DELAY_MS)
        }
      }

      getDb()
        .prepare(
          `UPDATE send_job SET status = 'drafts_ready', completed_at = datetime('now') WHERE id = ?`
        )
        .run(jobId)

      this.emitProgress(jobId, records.length, records.length, 'creating_drafts', 'completed')
    } catch (err: any) {
      getDb().prepare("UPDATE send_job SET status = 'failed' WHERE id = ?").run(jobId)
      this.emitProgress(jobId, 0, 0, 'creating_drafts', 'failed', err.message)
    }
  }

  private async createSingleDraft(
    record: RecordRow,
    attachmentPaths: string[],
    retries = 0
  ): Promise<void> {
    try {
      const result = await graphService.saveDraft({
        subject: record.rendered_subject,
        body: record.rendered_body,
        bodyType: 'Text',
        toRecipients: [{ email: record.recipient_email, name: record.recipient_name }],
        attachmentPaths
      })

      getDb()
        .prepare(
          "UPDATE send_record SET draft_message_id = ?, status = 'draft_created' WHERE id = ?"
        )
        .run(result.uid, record.id)
    } catch (err: any) {
      if (retries < MAX_RETRIES) {
        await this.sleep(Math.pow(2, retries) * 1000)
        return this.createSingleDraft(record, attachmentPaths, retries + 1)
      }
      getDb()
        .prepare("UPDATE send_record SET status = 'failed', error_message = ? WHERE id = ?")
        .run(err.message, record.id)
    }
  }

  async sendAll(jobId: number): Promise<void> {
    getDb().prepare("UPDATE send_job SET status = 'sending' WHERE id = ?").run(jobId)
    this.sendInBackground(jobId)
  }

  private async sendInBackground(jobId: number): Promise<void> {
    try {
      const records = getDb()
        .prepare(
          "SELECT * FROM send_record WHERE job_id = ? AND status = 'draft_created' ORDER BY id"
        )
        .all(jobId) as RecordRow[]

      const subjects = records.map((r) => r.rendered_subject)

      const results = await outlookWebService.sendAllDrafts(subjects, (current, total) => {
        this.emitProgress(jobId, current, total, 'sending')
      })

      // Update each record by matching subject text
      let failCount = 0
      for (const result of results) {
        const record = records.find((r) => r.rendered_subject === result.subject)
        if (!record) continue
        if (result.success) {
          getDb()
            .prepare("UPDATE send_record SET status = 'sent', sent_at = datetime('now') WHERE id = ?")
            .run(record.id)
        } else {
          failCount++
          getDb()
            .prepare("UPDATE send_record SET status = 'failed', error_message = ? WHERE id = ?")
            .run(result.error || 'Send failed', record.id)
        }
      }

      const finalStatus = failCount === records.length ? 'failed' : 'completed'
      getDb()
        .prepare(
          `UPDATE send_job SET status = ?, completed_at = datetime('now') WHERE id = ?`
        )
        .run(finalStatus, jobId)

      this.emitProgress(jobId, records.length, records.length, 'sending', finalStatus === 'completed' ? 'completed' : 'failed')
    } catch (err: any) {
      getDb().prepare("UPDATE send_job SET status = 'failed' WHERE id = ?").run(jobId)
      this.emitProgress(jobId, 0, 0, 'sending', 'failed', err.message)
    }
  }

  async sendOne(_jobId: number, recordId: number): Promise<void> {
    const record = getDb()
      .prepare('SELECT * FROM send_record WHERE id = ?')
      .get(recordId) as RecordRow | undefined

    if (!record) throw new Error('Record not found')
    if (record.status !== 'draft_created') throw new Error('Record is not a draft')

    const results = await outlookWebService.sendAllDrafts(
      [record.rendered_subject],
      () => {}
    )

    if (results[0]?.success) {
      getDb()
        .prepare("UPDATE send_record SET status = 'sent', sent_at = datetime('now') WHERE id = ?")
        .run(record.id)
    } else {
      throw new Error(results[0]?.error || 'Send failed')
    }
  }

  async cancel(jobId: number): Promise<void> {
    getDb().prepare("UPDATE send_job SET status = 'failed' WHERE id = ?").run(jobId)
    getDb()
      .prepare(
        "UPDATE send_record SET status = 'failed', error_message = 'Cancelled' WHERE job_id = ? AND status IN ('pending', 'draft_created')"
      )
      .run(jobId)
  }

  private emitProgress(
    jobId: number,
    current: number,
    total: number,
    phase: string,
    status: string = 'progress',
    error?: string
  ): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('job:progress', { jobId, current, total, phase, status, error })
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
