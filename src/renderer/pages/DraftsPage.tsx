import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ArrowLeft,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { api } from '../lib/electron-api'
import { useToast } from '../components/ui/use-toast'
import type { Job, JobDetail, JobProgress } from '../lib/types'

const statusConfig = {
  draft_creating: { label: 'Creating Drafts', color: 'warning' as const, icon: Loader2 },
  drafts_ready: { label: 'Drafts Ready', color: 'success' as const, icon: CheckCircle2 },
  sending: { label: 'Sending', color: 'warning' as const, icon: Loader2 },
  completed: { label: 'Completed', color: 'success' as const, icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'destructive' as const, icon: XCircle }
}

export function DraftsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [detail, setDetail] = useState<JobDetail | null>(null)
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [sending, setSending] = useState(false)

  const selectedJobId = jobId ? parseInt(jobId) : null

  const loadJobs = useCallback(async () => {
    const list = await api.jobs.list()
    setJobs(list)
  }, [])

  const loadDetail = useCallback(
    async (id: number) => {
      const d = await api.jobs.getDetail(id)
      setDetail(d)
    },
    []
  )

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  useEffect(() => {
    if (selectedJobId) {
      loadDetail(selectedJobId)
    }
  }, [selectedJobId, loadDetail])

  useEffect(() => {
    const cleanup = api.onJobProgress((p: JobProgress) => {
      setProgress(p)
      if (p.status === 'completed' || p.status === 'failed') {
        loadJobs()
        if (selectedJobId) loadDetail(selectedJobId)
      }
    })
    return cleanup
  }, [selectedJobId, loadJobs, loadDetail])

  const handleSendAll = async (id: number) => {
    setSending(true)
    try {
      await api.jobs.sendAll(id)
      toast({ title: 'Sending started' })
    } catch (err: any) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' })
    }
    setSending(false)
  }

  const handleRefresh = async () => {
    await loadJobs()
    if (selectedJobId) await loadDetail(selectedJobId)
  }

  const activeJobs = jobs.filter((j) =>
    ['draft_creating', 'drafts_ready', 'sending'].includes(j.status)
  )

  // Job detail view
  if (selectedJobId && detail) {
    const config = statusConfig[detail.status as keyof typeof statusConfig]
    const StatusIcon = config?.icon || Clock
    const draftCount = detail.records.filter((r) => r.status === 'draft_created').length
    const sentCount = detail.records.filter((r) => r.status === 'sent').length
    const failedCount = detail.records.filter((r) => r.status === 'failed').length

    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/drafts')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Jobs
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Job #{detail.id}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {detail.template_name || 'Unknown template'} &middot; {detail.source_filename}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={config?.color}>{config?.label}</Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress bar for active jobs */}
        {progress && progress.jobId === selectedJobId && progress.status === 'progress' && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {progress.phase === 'creating_drafts' ? 'Creating drafts' : 'Sending emails'}
                </span>
                <span className="font-medium">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-semibold">{detail.total_recipients}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-semibold text-blue-600">{draftCount}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-semibold text-green-600">{sentCount}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-semibold text-red-600">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Send button */}
        {detail.status === 'drafts_ready' && (
          <Button
            className="w-full mb-6"
            size="lg"
            onClick={() => handleSendAll(detail.id)}
            disabled={sending}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send All {draftCount} Drafts
              </>
            )}
          </Button>
        )}

        {/* Records table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Recipient
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Subject
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detail.records.map((record) => (
                    <tr key={record.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{record.recipient_name}</p>
                        <p className="text-xs text-muted-foreground">{record.recipient_email}</p>
                      </td>
                      <td className="px-4 py-2.5 truncate max-w-[300px]">
                        {record.rendered_subject}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={
                            record.status === 'sent'
                              ? 'success'
                              : record.status === 'failed'
                                ? 'destructive'
                                : record.status === 'draft_created'
                                  ? 'default'
                                  : 'secondary'
                          }
                        >
                          {record.status === 'draft_created'
                            ? 'Draft'
                            : record.status === 'sent'
                              ? 'Sent'
                              : record.status === 'failed'
                                ? 'Failed'
                                : 'Pending'}
                        </Badge>
                        {record.error_message && (
                          <p className="text-xs text-destructive mt-1">{record.error_message}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Jobs list view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Drafts & Jobs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your email draft creation jobs
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {activeJobs.length === 0 && jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm">No jobs yet</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/compose')}>
              Compose Emails
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const config = statusConfig[job.status as keyof typeof statusConfig]
            return (
              <Card
                key={job.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/drafts/${job.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {job.template_name || `Job #${job.id}`}
                        </p>
                        <Badge variant={config?.color} className="text-xs">
                          {config?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {job.source_filename} &middot; {job.total_recipients} recipients &middot;{' '}
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
