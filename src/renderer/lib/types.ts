export interface AuthStatus {
  authenticated: boolean
  userEmail?: string
  userName?: string
}

export interface Template {
  id: number
  name: string
  subject_template: string
  body_template: string
  body_format: 'text' | 'html'
  created_at: string
  updated_at: string
}

export interface CreateTemplate {
  name: string
  subject_template: string
  body_template: string
  body_format?: 'text' | 'html'
}

export type UpdateTemplate = Partial<CreateTemplate>

export interface RenderedEmail {
  subject: string
  body: string
}

export interface ParsedExcel {
  columns: string[]
  rows: Record<string, string>[]
  rowCount: number
}

export interface Job {
  id: number
  template_id: number
  template_name?: string
  source_filename: string
  total_recipients: number
  status: 'draft_creating' | 'drafts_ready' | 'sending' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  draft_created_count?: number
  sent_count?: number
  failed_count?: number
}

export interface SendRecord {
  id: number
  job_id: number
  recipient_email: string
  recipient_name: string
  recipient_data: Record<string, string>
  rendered_subject: string
  rendered_body: string
  draft_message_id?: string
  status: 'pending' | 'draft_created' | 'sent' | 'failed'
  error_message?: string
  created_at: string
  sent_at?: string
}

export interface JobDetail extends Job {
  records: SendRecord[]
}

export interface CreateJob {
  template_id: number
  recipients: Record<string, string>[]
  source_filename: string
  attachment_paths?: string[]
}

export interface JobProgress {
  jobId: number
  current: number
  total: number
  phase: 'creating_drafts' | 'sending'
  status: 'progress' | 'completed' | 'failed'
  error?: string
}

export interface AttachmentInfo {
  path: string
  name: string
  size: number
}
