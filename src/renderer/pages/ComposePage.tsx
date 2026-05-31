import { useState, useEffect } from 'react'
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Eye,
  Paperclip,
  Send,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Label } from '../components/ui/label'
import { Separator } from '../components/ui/separator'
import { api } from '../lib/electron-api'
import { useToast } from '../components/ui/use-toast'
import type { Template, ParsedExcel } from '../lib/types'

const STEPS = [
  { id: 'upload', label: 'Upload Excel', icon: Upload },
  { id: 'template', label: 'Select Template', icon: FileText },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
  { id: 'confirm', label: 'Create Drafts', icon: Send }
]

export function ComposePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState(0)

  // Step 1: Upload
  const [excelPath, setExcelPath] = useState<string | null>(null)
  const [excelData, setExcelData] = useState<ParsedExcel | null>(null)

  // Step 2: Template
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)

  // Step 3: Preview
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewResult, setPreviewResult] = useState<{ subject: string; body: string } | null>(
    null
  )

  // Step 4: Attachments
  const [attachmentPaths, setAttachmentPaths] = useState<string[]>([])

  // Step 5: Submit
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.templates.list().then(setTemplates)
  }, [])

  // Auto-preview when navigating to preview step
  useEffect(() => {
    if (step === 2 && selectedTemplateId) {
      if (excelData && excelData.rows.length > 0) {
        setPreviewIndex(0)
        loadPreview(0)
      }
    }
  }, [step])

  const handleUpload = async () => {
    const path = await api.recipients.openFileDialog()
    if (!path) return
    try {
      const data = await api.recipients.parseExcel(path)
      setExcelPath(path)
      setExcelData(data)
      toast({ title: `Loaded ${data.rowCount} recipients from Excel` })
    } catch (err: any) {
      toast({ title: 'Failed to parse Excel', description: err.message, variant: 'destructive' })
    }
  }

  const loadPreview = async (index: number) => {
    if (!selectedTemplateId || !excelData) return
    if (index >= excelData.rows.length) return
    try {
      const result = await api.templates.preview(selectedTemplateId, excelData.rows[index])
      setPreviewResult(result)
    } catch (err: any) {
      toast({ title: 'Preview failed', description: err.message, variant: 'destructive' })
    }
  }

  const handlePreviewNav = (dir: number) => {
    if (!excelData || excelData.rows.length === 0) return
    const newIndex = Math.max(0, Math.min(excelData.rows.length - 1, previewIndex + dir))
    setPreviewIndex(newIndex)
    loadPreview(newIndex)
  }

  const handleAddAttachments = async () => {
    const paths = await api.attachments.openFileDialog()
    if (paths) {
      setAttachmentPaths((prev) => [...prev, ...paths])
    }
  }

  const handleSubmit = async () => {
    if (!selectedTemplateId || !excelData || !excelPath) return

    const recipients = excelData.rows

    setSubmitting(true)
    try {
      const fileName = excelPath.split('/').pop() || 'unknown.xlsx'
      const job = await api.jobs.create({
        template_id: selectedTemplateId,
        recipients,
        source_filename: fileName,
        attachment_paths: attachmentPaths.length > 0 ? attachmentPaths : undefined
      })
      toast({ title: 'Drafts are being created!', description: `Job #${job.id} started` })
      navigate(`/drafts/${job.id}`)
    } catch (err: any) {
      toast({ title: 'Failed to create job', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return !!excelData && excelData.rowCount > 0
      case 1:
        return !!selectedTemplateId
      case 2:
        return true
      case 3:
        return true
      case 4:
        return true
      default:
        return false
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Compose Emails</h2>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                    ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                    : 'text-muted-foreground'
              }`}
            >
              {i < step ? (
                <Check className="h-4 w-4" />
              ) : (
                <s.icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {/* Step 1: Upload Excel */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Recipient List</CardTitle>
              <CardDescription>
                Upload an Excel file (.xlsx) with recipient data. It should have columns like{' '}
                <code className="bg-muted px-1 rounded">email</code>,{' '}
                <code className="bg-muted px-1 rounded">name</code>, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!excelData ? (
                <button
                  onClick={handleUpload}
                  className="w-full border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 hover:bg-accent/50 transition-colors"
                >
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Click to select Excel file</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .xlsx and .xls</p>
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium">
                        {excelPath?.split('/').pop()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {excelData.rowCount} recipients, {excelData.columns.length} columns
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleUpload}>
                      Replace
                    </Button>
                  </div>

                  <div className="flex gap-2 mb-3">
                    {excelData.columns.map((col) => (
                      <Badge key={col} variant="secondary">
                        {col}
                      </Badge>
                    ))}
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">
                            #
                          </th>
                          {excelData.columns.map((col) => (
                            <th
                              key={col}
                              className="px-3 py-2 text-left font-medium text-muted-foreground"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {excelData.rows.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                            {excelData.columns.map((col) => (
                              <td key={col} className="px-3 py-2 truncate max-w-[200px]">
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Template */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Template</CardTitle>
              <CardDescription>
                Choose an email template. Placeholders will be filled with data from your Excel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No templates found</p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigate('/templates')}
                  >
                    Create a Template
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedTemplateId === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-muted/30 hover:bg-muted/60'
                      }`}
                    >
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                        Subject: {template.subject_template}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {excelData && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-xs text-muted-foreground">
                    Available placeholders from your Excel:
                  </Label>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {excelData.columns.map((col) => (
                      <code key={col} className="bg-muted px-2 py-0.5 rounded text-xs">
                        {`{{${col}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preview */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>
                    Review how emails will look for each recipient
                  </CardDescription>
                </div>
                {(() => {
                  const active = excelData?.rows || []
                  return active.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePreviewNav(-1)}
                        disabled={previewIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                        {previewIndex + 1} / {active.length}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePreviewNav(1)}
                        disabled={previewIndex >= active.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null
                })()}
              </div>
            </CardHeader>
            <CardContent>
              {previewResult ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <p className="text-sm mt-1">
                      {excelData?.rows[previewIndex]?.name || ''}{' '}
                      &lt;{excelData?.rows[previewIndex]?.email || ''}&gt;
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <p className="text-sm font-medium mt-1">{previewResult.subject}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Body</Label>
                    {selectedTemplate?.body_format === 'html' ? (
                      <div
                        className="text-sm mt-2 bg-muted/30 rounded-lg p-4 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: previewResult.body }}
                      />
                    ) : (
                      <pre className="text-sm mt-2 whitespace-pre-wrap bg-muted/30 rounded-lg p-4 leading-relaxed">
                        {previewResult.body}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Loading preview...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Attachments */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attachments (Optional)</CardTitle>
              <CardDescription>
                Add files that will be attached to every email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleAddAttachments}>
                <Paperclip className="mr-2 h-4 w-4" />
                Add Files
              </Button>

              {attachmentPaths.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachmentPaths.map((path, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm truncate flex-1">{path.split('/').pop()}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() =>
                          setAttachmentPaths((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {attachmentPaths.length === 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  No attachments added. You can skip this step.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 5: Confirm */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confirm & Create Drafts</CardTitle>
              <CardDescription>
                Emails will be saved as drafts in your Outlook account. You can review them before
                sending.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Template</span>
                  <span className="font-medium">{selectedTemplate?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Recipients</span>
                  <span className="font-medium">{excelData?.rowCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Attachments</span>
                  <span className="font-medium">
                    {attachmentPaths.length === 0 ? 'None' : `${attachmentPaths.length} files`}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Source File</span>
                  <span className="font-medium">{excelPath?.split('/').pop()}</span>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Drafts...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create {excelData?.rowCount} Drafts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
