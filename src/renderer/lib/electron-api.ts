import type {
  AuthStatus,
  Template,
  CreateTemplate,
  UpdateTemplate,
  RenderedEmail,
  ParsedExcel,
  Job,
  JobDetail,
  CreateJob,
  JobProgress
} from './types'

interface ElectronAPI {
  auth: {
    getStatus(): Promise<AuthStatus>
    login(): Promise<void>
    logout(): Promise<void>
  }
  templates: {
    list(): Promise<Template[]>
    create(data: CreateTemplate): Promise<Template>
    update(id: number, data: UpdateTemplate): Promise<Template>
    delete(id: number): Promise<void>
    preview(id: number, sampleData: Record<string, string>): Promise<RenderedEmail>
  }
  recipients: {
    openFileDialog(): Promise<string | null>
    parseExcel(filePath: string): Promise<ParsedExcel>
    checkSent(emails: string[]): Promise<string[]>
  }
  jobs: {
    create(data: CreateJob): Promise<Job>
    list(): Promise<Job[]>
    getDetail(id: number): Promise<JobDetail>
    sendAll(id: number): Promise<void>
    sendOne(jobId: number, recordId: number): Promise<void>
    cancel(id: number): Promise<void>
  }
  attachments: {
    openFileDialog(): Promise<string[] | null>
  }
  settings: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
  }
  onJobProgress(callback: (progress: JobProgress) => void): () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export const api = window.electronAPI
