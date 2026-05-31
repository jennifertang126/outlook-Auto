import { useState, useEffect, createContext, useContext } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { api } from './lib/electron-api'
import type { AuthStatus } from './lib/types'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ComposePage } from './pages/ComposePage'
import { DraftsPage } from './pages/DraftsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { HistoryPage } from './pages/HistoryPage'
import { Toaster } from './components/ui/toaster'

interface AuthContextType {
  auth: AuthStatus
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  auth: { authenticated: false },
  refreshAuth: async () => {}
})

export function useAuth() {
  return useContext(AuthContext)
}

export function App() {
  const [auth, setAuth] = useState<AuthStatus>({ authenticated: false })
  const [loading, setLoading] = useState(true)

  const refreshAuth = async () => {
    try {
      const status = await api.auth.getStatus()
      setAuth(status)
    } catch {
      setAuth({ authenticated: false })
    }
  }

  useEffect(() => {
    refreshAuth().finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ auth, refreshAuth }}>
      <HashRouter>
        {!auth.authenticated ? (
          <Routes>
            <Route path="*" element={<LoginPage />} />
          </Routes>
        ) : (
          <Layout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/compose" element={<ComposePage />} />
              <Route path="/drafts" element={<DraftsPage />} />
              <Route path="/drafts/:jobId" element={<DraftsPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        )}
      </HashRouter>
      <Toaster />
    </AuthContext.Provider>
  )
}
