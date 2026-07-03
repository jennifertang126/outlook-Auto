import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  auth: {
    getStatus: () => ipcRenderer.invoke('auth:getStatus'),
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    create: (data: any) => ipcRenderer.invoke('templates:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('templates:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('templates:delete', id),
    preview: (id: number, sampleData: Record<string, string>) =>
      ipcRenderer.invoke('templates:preview', id, sampleData)
  },
  recipients: {
    openFileDialog: () => ipcRenderer.invoke('recipients:openFileDialog'),
    parseExcel: (filePath: string) => ipcRenderer.invoke('recipients:parseExcel', filePath),
    checkSent: (emails: string[]) => ipcRenderer.invoke('recipients:checkSent', emails)
  },
  jobs: {
    create: (data: any) => ipcRenderer.invoke('jobs:create', data),
    list: () => ipcRenderer.invoke('jobs:list'),
    getDetail: (id: number) => ipcRenderer.invoke('jobs:getDetail', id),
    sendAll: (id: number) => ipcRenderer.invoke('jobs:sendAll', id),
    sendOne: (jobId: number, recordId: number) =>
      ipcRenderer.invoke('jobs:sendOne', jobId, recordId),
    cancel: (id: number) => ipcRenderer.invoke('jobs:cancel', id),
    delete: (id: number) => ipcRenderer.invoke('jobs:delete', id)
  },
  attachments: {
    openFileDialog: () => ipcRenderer.invoke('attachments:openFileDialog')
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  },
  onJobProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('job:progress', handler)
    return () => ipcRenderer.removeListener('job:progress', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
