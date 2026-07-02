import { ipcMain, dialog, BrowserWindow } from 'electron'
import { AuthService } from './services/auth.service'
import { TemplateService } from './services/template.service'
import { ExcelService } from './services/excel.service'
import { JobService } from './services/job.service'
import { DbService } from './services/db.service'
import { GraphService } from './services/graph.service'

const authService = new AuthService()
const templateService = new TemplateService()
const excelService = new ExcelService()
const jobService = new JobService()
const dbService = new DbService()
const graphService = new GraphService()

export function registerIpcHandlers(): void {
  // Auth
  ipcMain.handle('auth:getStatus', () => authService.getStatus())
  ipcMain.handle('auth:login', () => authService.login())
  ipcMain.handle('auth:logout', () => authService.logout())

  // Templates
  ipcMain.handle('templates:list', () => templateService.list())
  ipcMain.handle('templates:create', (_e, data) => templateService.create(data))
  ipcMain.handle('templates:update', (_e, id: number, data) => templateService.update(id, data))
  ipcMain.handle('templates:delete', (_e, id: number) => templateService.remove(id))
  ipcMain.handle('templates:preview', (_e, templateId: number, sampleData) =>
    templateService.preview(templateId, sampleData)
  )

  // Recipients / Excel
  ipcMain.handle('recipients:openFileDialog', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
  ipcMain.handle('recipients:parseExcel', (_e, filePath: string) =>
    excelService.parseExcel(filePath)
  )

  // Dedup — check which emails have been sent before
  ipcMain.handle('recipients:checkSent', async (_e, emails: string[]) => {
    const accessToken = await authService.getAccessToken()
    const userEmail = authService.getUserEmail()
    graphService.setAccessToken(accessToken)
    graphService.setUserEmail(userEmail)
    return graphService.checkSentEmails(emails)
  })

  // Jobs
  ipcMain.handle('jobs:create', (_e, data) => jobService.create(data))
  ipcMain.handle('jobs:list', () => jobService.list())
  ipcMain.handle('jobs:getDetail', (_e, id: number) => jobService.getDetail(id))
  ipcMain.handle('jobs:sendAll', (_e, id: number) => jobService.sendAll(id))
  ipcMain.handle('jobs:sendOne', (_e, jobId: number, recordId: number) =>
    jobService.sendOne(jobId, recordId)
  )
  ipcMain.handle('jobs:cancel', (_e, id: number) => jobService.cancel(id))

  // Attachments
  ipcMain.handle('attachments:openFileDialog', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths
  })

  // Settings
  ipcMain.handle('settings:get', (_e, key: string) => dbService.getSetting(key))
  ipcMain.handle('settings:set', (_e, key: string, value: string) =>
    dbService.setSetting(key, value)
  )
}

export function getAuthService(): AuthService {
  return authService
}
