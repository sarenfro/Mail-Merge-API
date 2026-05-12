'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, Save, Eye, ArrowLeft, MousePointer, Mail, AlertCircle, Clock, Paperclip, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { mergePlaceholders } from '@/lib/merge'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Campaign, CampaignAttachment, CampaignRecipient, EmailEvent, ContactList } from '@/types'

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([])
  const [events, setEvents] = useState<EmailEvent[]>([])
  const [lists, setLists] = useState<ContactList[]>([])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const attachRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${id}`).then(r => r.json()),
      fetch('/api/contacts/lists').then(r => r.json()),
    ]).then(([detail, ls]) => {
      setCampaign(detail.campaign)
      setRecipients(detail.recipients ?? [])
      setEvents(detail.events ?? [])
      setLists(Array.isArray(ls) ? ls : [])
      if (detail.campaign?.scheduled_at) {
        setScheduledAt(detail.campaign.scheduled_at.slice(0, 16))
        setShowSchedule(true)
      }
      if (detail.campaign?.bcc_email) {
        setShowBcc(true)
      }
    })
  }, [id])

  function update(k: string, v: string) { setCampaign(c => c ? { ...c, [k]: v } : c) }

  async function handleAttachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingFile(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    setUploadingFile(false)
    if (!res.ok) { toast.error('Upload failed'); return }
    const attachment: CampaignAttachment = await res.json()
    setCampaign(c => c ? { ...c, attachments: [...(c.attachments ?? []), attachment] } : c)
  }

  function removeAttachment(i: number) {
    setCampaign(c => c ? { ...c, attachments: (c.attachments ?? []).filter((_, j) => j !== i) } : c)
  }

  async function save() {
    if (!campaign) return
    setSaving(true)
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    })
    setSaving(false)
    if (res.ok) toast.success('Saved')
    else toast.error('Failed to save')
  }

  async function send() {
    if (!campaign?.list_id || !campaign?.from_email) {
      toast.error('Set a contact list and from email first'); return
    }
    setSending(true)
    await fetch(`/api/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    })
    const res = await fetch(`/api/campaigns/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: scheduledAt || undefined }),
    })
    const result = await res.json()
    setSending(false)
    if (result.errors?.length) toast.warning(`Sent ${result.sent}, ${result.errors.length} failed`)
    else if (scheduledAt) toast.success('Scheduled')
    else toast.success(`Sent to ${result.sent} recipients`)
    router.refresh()
    fetch(`/api/campaigns/${id}`).then(r => r.json()).then(d => { setCampaign(d.campaign); setRecipients(d.recipients ?? []); setEvents(d.events ?? []) })
  }

  if (!campaign) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>

  const opens = new Set(events.filter(e => e.event_type === 'open').map(e => e.email)).size
  const clicks = new Set(events.filter(e => e.event_type === 'click').map(e => e.email)).size
  const openRate = campaign.total_sent ? Math.round((opens / campaign.total_sent) * 100) : 0
  const clickRate = campaign.total_sent ? Math.round((clicks / campaign.total_sent) * 100) : 0
  const isDraft = campaign.status === 'draft'

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold flex-1">{campaign.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving…' : 'Save'}
          </Button>
          {isDraft && (
            <Button onClick={send} disabled={sending}>
              {showSchedule ? <Clock className="h-4 w-4 mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
              {sending ? 'Sending…' : showSchedule ? 'Schedule' : 'Send'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!isDraft && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Sent', value: campaign.total_sent, icon: Mail },
            { label: 'Unique Opens', value: `${opens} (${openRate}%)`, icon: Mail },
            { label: 'Unique Clicks', value: `${clicks} (${clickRate}%)`, icon: MousePointer },
            { label: 'Failed', value: recipients.filter(r => r.status === 'failed').length, icon: AlertCircle },
          ].map(s => (
            <div key={s.label} className="border rounded-xl p-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Campaign name</Label>
            <Input value={campaign.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div>
            <Label>From name</Label>
            <Input value={campaign.from_name} onChange={e => update('from_name', e.target.value)} />
          </div>
          <div>
            <Label>From email</Label>
            <Input type="email" value={campaign.from_email} onChange={e => update('from_email', e.target.value)} />
          </div>
          <div>
            <Label>Contact list</Label>
            <select
              className="w-full h-8 rounded-lg border bg-background px-2.5 text-sm"
              value={campaign.list_id ?? ''}
              onChange={e => update('list_id', e.target.value)}
            >
              <option value="">Select a list…</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.contact_count ?? 0})</option>)}
            </select>
          </div>
          {isDraft && (
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={showSchedule} onChange={e => setShowSchedule(e.target.checked)} />
                Schedule for later
              </label>
              {showSchedule && <Input type="datetime-local" className="mt-2" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />}
            </div>
          )}
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showBcc}
                onChange={e => {
                  setShowBcc(e.target.checked)
                  if (!e.target.checked) update('bcc_email', '')
                }}
              />
              BCC an email address
            </label>
            {showBcc && (
              <Input
                type="email"
                className="mt-2"
                placeholder="bcc@example.com"
                value={campaign.bcc_email ?? ''}
                onChange={e => update('bcc_email', e.target.value)}
              />
            )}
          </div>

          {/* Attachments */}
          <div>
            <Label>Attachments</Label>
            <input ref={attachRef} type="file" className="sr-only" onChange={handleAttachFile} />
            <button
              type="button"
              onClick={() => attachRef.current?.click()}
              disabled={uploadingFile}
              className="mt-1 w-full flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
            >
              {uploadingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              {uploadingFile ? 'Uploading…' : 'Attach a file'}
            </button>
            {(campaign.attachments ?? []).length > 0 && (
              <ul className="mt-2 space-y-1">
                {(campaign.attachments ?? []).map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs rounded-md bg-muted/40 px-2.5 py-1.5">
                    <span className="truncate">{a.name}</span>
                    <button type="button" onClick={() => removeAttachment(i)}>
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="col-span-2 space-y-3">
          <div>
            <Label>Subject line</Label>
            <Input value={campaign.subject} onChange={e => update('subject', e.target.value)} />
          </div>
          <Tabs defaultValue={isDraft ? 'edit' : 'recipients'}>
            <TabsList>
              {isDraft && <TabsTrigger value="edit">Compose</TabsTrigger>}
              <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5 mr-1" />Preview</TabsTrigger>
              {!isDraft && <TabsTrigger value="recipients">Recipients ({recipients.length})</TabsTrigger>}
              {!isDraft && <TabsTrigger value="activity">Activity ({events.length})</TabsTrigger>}
            </TabsList>
            {isDraft && (
              <TabsContent value="edit" className="mt-2">
                <RichTextEditor content={campaign.html_content} onChange={v => update('html_content', v)} />
              </TabsContent>
            )}
            <TabsContent value="preview" className="mt-2">
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-muted/40 border-b text-xs text-muted-foreground">
                  <span className="font-medium">Subject:</span>{' '}
                  {mergePlaceholders(campaign.subject, { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', company: 'Acme' })}
                </div>
                <div className="p-6 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: mergePlaceholders(campaign.html_content, { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', company: 'Acme' }) }} />
              </div>
            </TabsContent>
            {!isDraft && (
              <TabsContent value="recipients" className="mt-2">
                <div className="border rounded-lg overflow-hidden text-sm">
                  <table className="w-full">
                    <thead className="bg-muted/40 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map(r => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="px-3 py-2">{r.email}</td>
                          <td className="px-3 py-2 capitalize">{r.status}</td>
                          <td className="px-3 py-2 text-muted-foreground">{new Date(r.sent_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            )}
            {!isDraft && (
              <TabsContent value="activity" className="mt-2">
                <div className="border rounded-lg overflow-hidden text-sm">
                  <table className="w-full">
                    <thead className="bg-muted/40 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Event</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.length === 0 ? (
                        <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">No activity yet</td></tr>
                      ) : events.map(e => (
                        <tr key={e.id} className="border-b last:border-0">
                          <td className="px-3 py-2">{e.email}</td>
                          <td className="px-3 py-2 capitalize">{e.event_type}</td>
                          <td className="px-3 py-2 text-muted-foreground">{new Date(e.occurred_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
