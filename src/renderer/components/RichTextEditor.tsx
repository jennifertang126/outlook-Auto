import { useRef, useCallback, useEffect } from 'react'
import { Bold, Italic, Underline } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  className,
  minHeight = '200px'
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  // Set initial content on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    onChange(html)
  }, [onChange])

  const execCommand = useCallback(
    (command: string) => {
      document.execCommand(command)
      editorRef.current?.focus()
      handleInput()
    },
    [handleInput]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'b') {
          e.preventDefault()
          execCommand('bold')
        } else if (e.key === 'i') {
          e.preventDefault()
          execCommand('italic')
        } else if (e.key === 'u') {
          e.preventDefault()
          execCommand('underline')
        }
      }
    },
    [execCommand]
  )

  // Handle paste to keep formatting clean
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      const html = e.clipboardData.getData('text/html')
      if (html) {
        document.execCommand('insertHTML', false, html)
      } else {
        document.execCommand('insertText', false, text)
      }
      handleInput()
    },
    [handleInput]
  )

  return (
    <div className={cn('rich-text-editor', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border border-input rounded-t-md bg-muted/30 px-1.5 py-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => execCommand('bold')}
          title="Bold (⌘B)"
          type="button"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => execCommand('italic')}
          title="Italic (⌘I)"
          type="button"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => execCommand('underline')}
          title="Underline (⌘U)"
          type="button"
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="w-full rounded-b-md border border-t-0 border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
    </div>
  )
}