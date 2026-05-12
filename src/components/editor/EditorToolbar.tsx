'use client'

import type { Editor } from '@tiptap/react'
import { Bold, Italic, Underline, Strikethrough, Link2, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Undo, Redo, Highlighter, ImageIcon, Loader2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useRef, useState } from 'react'

const FONTS = ['Default', 'Arial', 'Georgia', 'Verdana', 'Times New Roman', 'Courier New']
const SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px']
const MERGE_FIELDS = ['first_name', 'last_name', 'email', 'company']

function Btn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded text-sm transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  const textColorRef = useRef<HTMLInputElement>(null)
  const highlightRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  if (!editor) return null

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingImage(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    setUploadingImage(false)
    if (!res.ok) return
    const { url } = await res.json()
    editor?.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
      <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="h-3.5 w-3.5" /></Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="h-3.5 w-3.5" /></Btn>
      <Separator orientation="vertical" className="mx-1 h-5" />

      <select className="h-7 rounded border bg-background px-1.5 text-xs" onChange={e => e.target.value === 'Default' ? editor.chain().focus().unsetFontFamily().run() : editor.chain().focus().setFontFamily(e.target.value).run()}>
        {FONTS.map(f => <option key={f}>{f}</option>)}
      </select>
      <select className="h-7 w-18 rounded border bg-background px-1.5 text-xs" onChange={e => editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run()}>
        {SIZES.map(s => <option key={s}>{s}</option>)}
      </select>
      <Separator orientation="vertical" className="mx-1 h-5" />

      <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-3.5 w-3.5" /></Btn>
      <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-3.5 w-3.5" /></Btn>
      <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><Underline className="h-3.5 w-3.5" /></Btn>
      <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></Btn>
      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Text color */}
      <div className="relative h-7 w-7 flex items-center justify-center cursor-pointer" title="Text color" onClick={() => textColorRef.current?.click()}>
        <input ref={textColorRef} type="color" className="sr-only" onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold leading-none">A</span>
          <div className="h-1 w-4 rounded-sm mt-0.5" style={{ backgroundColor: editor.getAttributes('textStyle').color ?? '#000' }} />
        </div>
      </div>
      <div className="relative h-7 w-7 flex items-center justify-center cursor-pointer" title="Highlight" onClick={() => highlightRef.current?.click()}>
        <input ref={highlightRef} type="color" className="sr-only" defaultValue="#FFFF00" onChange={e => editor.chain().focus().setHighlight({ color: e.target.value }).run()} />
        <Highlighter className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <Separator orientation="vertical" className="mx-1 h-5" />

      <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="h-3.5 w-3.5" /></Btn>
      <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></Btn>
      <Separator orientation="vertical" className="mx-1 h-5" />

      <Btn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left"><AlignLeft className="h-3.5 w-3.5" /></Btn>
      <Btn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center"><AlignCenter className="h-3.5 w-3.5" /></Btn>
      <Btn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right"><AlignRight className="h-3.5 w-3.5" /></Btn>
      <Separator orientation="vertical" className="mx-1 h-5" />

      <Btn active={editor.isActive('link')} onClick={() => { if (editor.isActive('link')) { editor.chain().focus().unsetLink().run() } else { const url = window.prompt('URL:'); if (url) editor.chain().focus().setLink({ href: url }).run() } }} title="Link"><Link2 className="h-3.5 w-3.5" /></Btn>
      <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" onChange={handleImageUpload} />
      <Btn onClick={() => imageRef.current?.click()} title="Insert image" active={false}>
        {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
      </Btn>
      <Separator orientation="vertical" className="mx-1 h-5" />

      <select
        className="h-7 rounded border bg-background px-1.5 text-xs text-muted-foreground"
        value=""
        onChange={e => { if (e.target.value) { editor.chain().focus().insertContent(`{{${e.target.value}}}`).run(); e.target.value = '' } }}
      >
        <option value="" disabled>Insert field…</option>
        {MERGE_FIELDS.map(f => <option key={f} value={f}>{`{{${f}}}`}</option>)}
      </select>
    </div>
  )
}
