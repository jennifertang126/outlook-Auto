import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Copy, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { RichTextEditor } from '../components/RichTextEditor'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../components/ui/dialog'
import { api } from '../lib/electron-api'
import { useToast } from '../components/ui/use-toast'
import type { Template, CreateTemplate } from '../lib/types'

const emptyTemplate: CreateTemplate = {
  name: '',
  subject_template: '',
  body_template: ''
}

export function TemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CreateTemplate>(emptyTemplate)

  // Signature
  const [signature, setSignature] = useState('')
  const [showSignature, setShowSignature] = useState(false)

  const loadTemplates = async () => {
    const list = await api.templates.list()
    setTemplates(list)
  }

  useEffect(() => {
    loadTemplates()
    api.settings.get('email_signature').then((s) => {
      if (s) setSignature(s)
    })
  }, [])

  const handleSaveSignature = async () => {
    await api.settings.set('email_signature', signature)
    toast({ title: 'Signature saved' })
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyTemplate)
    setDialogOpen(true)
  }

  const openEdit = (template: Template) => {
    setEditingId(template.id)
    setForm({
      name: template.name,
      subject_template: template.subject_template,
      body_template: template.body_template
    })
    setDialogOpen(true)
  }

  const handleDuplicate = async (template: Template) => {
    await api.templates.create({
      name: `${template.name} (Copy)`,
      subject_template: template.subject_template,
      body_template: template.body_template
    })
    await loadTemplates()
    toast({ title: 'Template duplicated' })
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject_template.trim() || !form.body_template.trim()) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' })
      return
    }

    if (editingId) {
      await api.templates.update(editingId, form)
      toast({ title: 'Template updated' })
    } else {
      await api.templates.create(form)
      toast({ title: 'Template created' })
    }

    setDialogOpen(false)
    await loadTemplates()
  }

  const handleDelete = async (id: number) => {
    await api.templates.delete(id)
    await loadTemplates()
    toast({ title: 'Template deleted' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your email templates with placeholders like{' '}
            <code className="bg-muted px-1 rounded">{'{{name}}'}</code>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm">No templates yet</p>
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs truncate">
                      Subject: {template.subject_template}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {template.body_format === 'html' ? (
                  <div
                    className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 max-h-32 overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: template.body_template }}
                  />
                ) : (
                  <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 whitespace-pre-wrap max-h-32 overflow-hidden">
                    {template.body_template}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Signature - one-time setup */}
      <Card className="mt-6">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowSignature(!showSignature)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Email Signature</CardTitle>
              <CardDescription>
                Set once, auto-appended to every email draft. Copy your signature from Outlook.
              </CardDescription>
            </div>
            {showSignature ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showSignature && (
          <CardContent className="space-y-3">
            <RichTextEditor
              value={signature}
              onChange={setSignature}
              placeholder="Paste your email signature here (e.g., company name, title, contact info)..."
              minHeight="100px"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Tip: Copy your signature from Outlook Web → Settings → Mail → Compose and reply → Email signature.
              </p>
              <Button variant="outline" size="sm" onClick={handleSaveSignature}>
                Save Signature
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingId ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              Use <code className="bg-muted px-1 rounded">{'{{column_name}}'}</code> as
              placeholders. They will be replaced with data from your Excel file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                placeholder="e.g., Invoice Reminder"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Template</Label>
              <Input
                placeholder="e.g., Invoice for {{name}} - {{month}}"
                value={form.subject_template}
                onChange={(e) => setForm({ ...form, subject_template: e.target.value })}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Body Template</Label>
              <RichTextEditor
                key={editingId ? `edit-${editingId}` : 'new'}
                value={form.body_template}
                onChange={(html) => {
                  const hasFormatting = /<\/?(b|strong|i|em|u|span\s)/i.test(html)
                  setForm({
                    ...form,
                    body_template: html,
                    body_format: hasFormatting ? 'html' : 'text'
                  })
                }}
                placeholder="e.g., Hi {{name}},{{month}}..."
                minHeight="180px"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{'{{column_name}}'}</code> for placeholders. Select text and use the toolbar or ⌘B/⌘I/⌘U to format.
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingId ? 'Save Changes' : 'Create Template'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
