import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Copy, FileText } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
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

  const loadTemplates = async () => {
    const list = await api.templates.list()
    setTemplates(list)
  }

  useEffect(() => {
    loadTemplates()
  }, [])

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
                <pre className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 whitespace-pre-wrap max-h-32 overflow-hidden">
                  {template.body_template}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              Use <code className="bg-muted px-1 rounded">{'{{column_name}}'}</code> as
              placeholders. They will be replaced with data from your Excel file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
              <Textarea
                placeholder="e.g., Hi {{name}}, ..."
                value={form.body_template}
                onChange={(e) => setForm({ ...form, body_template: e.target.value })}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{'{{column_name}}'}</code> for placeholders.
              </p>
            </div>
          </div>

          <DialogFooter>
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
