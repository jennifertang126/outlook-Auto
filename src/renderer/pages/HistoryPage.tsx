import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, History, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { api } from '../lib/electron-api'
import { useToast } from '../components/ui/use-toast'
import type { Job } from '../lib/types'

export function HistoryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])

  const loadJobs = () => api.jobs.list().then(setJobs)

  useEffect(() => {
    loadJobs()
  }, [])

  const handleDelete = async (id: number) => {
    await api.jobs.delete(id)
    toast({ title: 'Job deleted' })
    await loadJobs()
  }

  const completedJobs = jobs.filter((j) => ['completed', 'failed'].includes(j.status))

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Send History</h2>
        <p className="text-sm text-muted-foreground mt-1">Past email sending jobs</p>
      </div>

      {completedJobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm">No history yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {completedJobs.map((job) => (
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
                      <Badge
                        variant={job.status === 'completed' ? 'success' : 'destructive'}
                      >
                        {job.status === 'completed' ? 'Completed' : 'Failed'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {job.source_filename} &middot; {job.total_recipients} recipients
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-3 text-xs">
                        {job.sent_count !== undefined && job.sent_count > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {job.sent_count} sent
                          </span>
                        )}
                        {job.failed_count !== undefined && job.failed_count > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-3 w-3" />
                            {job.failed_count} failed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {job.completed_at
                          ? new Date(job.completed_at).toLocaleString()
                          : new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(job.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
