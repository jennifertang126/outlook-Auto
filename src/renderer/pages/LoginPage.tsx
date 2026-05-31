import { useState, useEffect } from 'react'
import { Mail, Loader2, User } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Separator } from '../components/ui/separator'
import { useAuth } from '../App'
import { api } from '../lib/electron-api'
import { useToast } from '../components/ui/use-toast'

export function LoginPage() {
  const { refreshAuth } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [lastEmail, setLastEmail] = useState<string | null>(null)

  useEffect(() => {
    api.settings.get('last_login_email').then(setLastEmail)
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    try {
      await api.auth.login()
      const status = await api.auth.getStatus()
      if (status.userEmail) {
        await api.settings.set('last_login_email', status.userEmail)
      }
      await refreshAuth()
    } catch (err: any) {
      if (err.message !== 'Login window was closed') {
        toast({
          title: 'Login failed',
          description: err.message || 'Failed to authenticate',
          variant: 'destructive'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="titlebar-drag absolute top-0 left-0 right-0 h-12" />

      <div className="w-full max-w-sm px-6 text-center">
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-5">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">OutlookAuto</h1>
          <p className="text-muted-foreground mt-2">Batch email automation for Outlook</p>
        </div>

        {lastEmail ? (
          <Card className="mb-4 overflow-hidden">
            <CardContent className="p-0">
              {/* Quick login with last account */}
              <button
                className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
                onClick={handleLogin}
                disabled={loading}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lastEmail}</p>
                  <p className="text-xs text-muted-foreground">Click to sign in</p>
                </div>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </button>

              <Separator />

              {/* Switch account */}
              <button
                className="w-full flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                onClick={handleLogin}
                disabled={loading}
              >
                <svg className="h-4 w-4" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Use another account
              </button>
            </CardContent>
          </Card>
        ) : (
          <Button className="w-full h-12 text-base" onClick={handleLogin} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2.5 h-5 w-5" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Sign in with Microsoft
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
