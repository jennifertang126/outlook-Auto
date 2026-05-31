import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PenSquare,
  FileText,
  Mail,
  History,
  Send,
  ArrowRight
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../App'
import { api } from '../lib/electron-api'
import type { Job, Template } from '../lib/types'

export function DashboardPage() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    api.jobs.list().then(setJobs)
    api.templates.list().then(setTemplates)
  }, [])

  const recentJobs = jobs.slice(0, 5)
  const totalSent = jobs
    .filter((j) => j.status === 'completed')
    .reduce((sum, j) => sum + (j.sent_count || j.total_recipients), 0)
  const activeJobs = jobs.filter((j) =>
    ['draft_creating', 'drafts_ready', 'sending'].includes(j.status)
  )

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold">
          Welcome{auth.userName ? `, ${auth.userName}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{auth.userEmail}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-primary/20 hover:border-primary/40"
          onClick={() => navigate('/compose')}
        >
          <CardContent className="py-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <PenSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Compose Emails</p>
              <p className="text-xs text-muted-foreground">Upload Excel & create drafts</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/templates')}
        >
          <CardContent className="py-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Templates</p>
              <p className="text-xs text-muted-foreground">{templates.length} templates</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-bold text-primary">{totalSent}</p>
            <p className="text-xs text-muted-foreground mt-1">Emails Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-bold">{jobs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-bold text-yellow-600">{activeJobs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Jobs</CardTitle>
            {jobs.length > 5 && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
                View All
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No jobs yet. Start by composing emails!
            </p>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/drafts/${job.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      {job.status === 'completed' ? (
                        <Send className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {job.template_name || `Job #${job.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {job.total_recipients} recipients
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      job.status === 'completed'
                        ? 'success'
                        : job.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="text-xs"
                  >
                    {job.status === 'draft_creating'
                      ? 'Creating'
                      : job.status === 'drafts_ready'
                        ? 'Ready'
                        : job.status === 'sending'
                          ? 'Sending'
                          : job.status === 'completed'
                            ? 'Done'
                            : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
