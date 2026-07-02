import { createTransport } from 'nodemailer'
import { ImapFlow } from 'imapflow'
import { readFileSync } from 'fs'
import { basename } from 'path'
import { lookup } from 'mime-types'
import MailComposer from 'nodemailer/lib/mail-composer'

interface EmailOptions {
  subject: string
  body: string
  bodyType: 'Text' | 'HTML'
  toRecipients: { email: string; name: string }[]
  attachmentPaths?: string[]
}

export class GraphService {
  private accessToken: string = ''
  private userEmail: string = ''

  setAccessToken(token: string): void {
    this.accessToken = token
  }

  setUserEmail(email: string): void {
    this.userEmail = email
  }

  private buildAttachments(paths?: string[]) {
    return (paths || []).map((filePath) => {
      const filename = basename(filePath)
      const contentType = lookup(filename) || 'application/octet-stream'
      return { filename, content: readFileSync(filePath), contentType }
    })
  }

  private async buildRawEmail(options: EmailOptions): Promise<Buffer> {
    const mail = new MailComposer({
      from: this.userEmail,
      to: options.toRecipients.map((r) => r.email),
      subject: options.subject,
      ...(options.bodyType === 'HTML' ? { html: options.body } : { text: options.body }),
      attachments: this.buildAttachments(options.attachmentPaths)
    })
    return mail.compile().build()
  }

  async saveDraft(options: EmailOptions): Promise<{ uid: string }> {
    const rawEmail = await this.buildRawEmail(options)
    const client = new ImapFlow({
      host: 'outlook.office365.com',
      port: 993,
      secure: true,
      auth: { user: this.userEmail, accessToken: this.accessToken },
      logger: false
    })
    try {
      await client.connect()
      const result = await client.append('Drafts', rawEmail, ['\\Draft', '\\Seen'])
      return { uid: result.uid?.toString() || result.uidValidity?.toString() || 'unknown' }
    } finally {
      await client.logout().catch(() => {})
    }
  }

  async checkSentEmails(emails: string[]): Promise<string[]> {
    const client = new ImapFlow({
      host: 'outlook.office365.com',
      port: 993,
      secure: true,
      auth: { user: this.userEmail, accessToken: this.accessToken },
      logger: false
    })

    const found = new Set<string>()

    try {
      await client.connect()

      // Outlook uses "Sent Items" (English) or localized names
      // Try common folder names; IMAP SPECIAL-USE \Sent is the reliable way
      let sentFolder = 'Sent Items'
      const folders = await client.list()
      for (const folder of folders) {
        if (folder.specialUse === '\\Sent') {
          sentFolder = folder.path
          break
        }
      }

      const lock = await client.getMailboxLock(sentFolder)
      try {
        for (const email of emails) {
          const searchResults = await client.search({ to: email })
          if (searchResults.length > 0) {
            found.add(email.toLowerCase())
          }
        }
      } finally {
        lock.release()
      }
    } finally {
      await client.logout().catch(() => {})
    }

    return Array.from(found)
  }

  async sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
    const transport = createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        type: 'OAuth2',
        user: this.userEmail,
        accessToken: this.accessToken
      }
    })

    const result = await transport.sendMail({
      from: this.userEmail,
      to: options.toRecipients.map((r) => r.email),
      subject: options.subject,
      ...(options.bodyType === 'HTML' ? { html: options.body } : { text: options.body }),
      attachments: this.buildAttachments(options.attachmentPaths)
    })

    transport.close()
    return { messageId: result.messageId }
  }
}
