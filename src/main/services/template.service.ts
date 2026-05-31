import { getDb } from '../database/connection'

interface CreateTemplateData {
  name: string
  subject_template: string
  body_template: string
  body_format?: string
}

interface TemplateRow {
  id: number
  name: string
  subject_template: string
  body_template: string
  body_format: string
  created_at: string
  updated_at: string
}

export class TemplateService {
  list(): TemplateRow[] {
    return getDb()
      .prepare('SELECT * FROM email_template ORDER BY updated_at DESC')
      .all() as TemplateRow[]
  }

  getById(id: number): TemplateRow | undefined {
    return getDb().prepare('SELECT * FROM email_template WHERE id = ?').get(id) as
      | TemplateRow
      | undefined
  }

  create(data: CreateTemplateData): TemplateRow {
    const result = getDb()
      .prepare(
        `INSERT INTO email_template (name, subject_template, body_template, body_format)
         VALUES (?, ?, ?, ?)`
      )
      .run(data.name, data.subject_template, data.body_template, data.body_format || 'text')

    return this.getById(result.lastInsertRowid as number)!
  }

  update(id: number, data: Partial<CreateTemplateData>): TemplateRow {
    const fields: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.subject_template !== undefined) {
      fields.push('subject_template = ?')
      values.push(data.subject_template)
    }
    if (data.body_template !== undefined) {
      fields.push('body_template = ?')
      values.push(data.body_template)
    }
    if (data.body_format !== undefined) {
      fields.push('body_format = ?')
      values.push(data.body_format)
    }

    fields.push("updated_at = datetime('now')")
    values.push(id)

    getDb()
      .prepare(`UPDATE email_template SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values)

    return this.getById(id)!
  }

  remove(id: number): void {
    getDb().prepare('DELETE FROM email_template WHERE id = ?').run(id)
  }

  preview(
    templateId: number,
    sampleData: Record<string, string>
  ): { subject: string; body: string } {
    const template = this.getById(templateId)
    if (!template) throw new Error('Template not found')

    return {
      subject: this.renderTemplate(template.subject_template, sampleData),
      body: this.renderTemplate(template.body_template, sampleData)
    }
  }

  renderTemplate(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match
    })
  }
}
