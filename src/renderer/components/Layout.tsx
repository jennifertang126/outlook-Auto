import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  PenSquare,
  FileText,
  Mail,
  History,
  LogOut,
  User
} from 'lucide-react'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { useAuth } from '../App'
import { api } from '../lib/electron-api'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/compose', icon: PenSquare, label: 'Compose' },
  { to: '/drafts', icon: Mail, label: 'Drafts' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/history', icon: History, label: 'History' }
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { auth, refreshAuth } = useAuth()
  const location = useLocation()

  const handleLogout = async () => {
    await api.auth.logout()
    await refreshAuth()
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-muted/30 flex flex-col">
        {/* Title bar drag area — leave space for macOS traffic lights */}
        <div className="titlebar-drag h-14 flex items-end pl-20 pr-5 pb-2">
          <h1 className="text-base font-semibold text-foreground titlebar-no-drag">
            Outlook-Auto
          </h1>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        <Separator />

        {/* User info */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate flex-1">
              {auth.userEmail || 'Not connected'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Drag area for title bar */}
        <div className="titlebar-drag h-12 shrink-0" />
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-8 py-6">{children}</div>
        </div>
      </main>
    </div>
  )
}
