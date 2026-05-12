import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/brevo'
import { mergePlaceholders, injectTracking } from '@/lib/merge'
import type { Contact, CampaignAttachment } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { scheduledAt } = await req.json().catch(() => ({}))

  const { data: campaign, error: cErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()
  if (cErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const { data: contacts, error: lErr } = await supabase
    .from('contacts')
    .select('*')
    .eq('list_id', campaign.list_id)
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })
  if (!contacts?.length) return NextResponse.json({ error: 'No contacts in list' }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  let sent = 0
  const errors: string[] = []

  await supabase.from('campaigns').update({ status: scheduledAt ? 'scheduled' : 'sending' }).eq('id', id)

  for (const contact of contacts as Contact[]) {
    const fields: Record<string, string | null> = {
      email: contact.email,
      first_name: contact.first_name,
      last_name: contact.last_name,
      company: contact.company,
      ...(contact.custom_fields ?? {}),
    }

    // Insert recipient row first to get its ID for tracking
    const { data: recipient } = await supabase
      .from('campaign_recipients')
      .insert({ campaign_id: id, contact_id: contact.id, email: contact.email, status: 'sent' })
      .select()
      .single()

    const mergedHtml = mergePlaceholders(campaign.html_content, fields)
    const trackedHtml = recipient ? injectTracking(mergedHtml, recipient.id, baseUrl) : mergedHtml
    const subject = mergePlaceholders(campaign.subject, fields)
    const toName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || undefined

    const attachments = (campaign.attachments as CampaignAttachment[] | null)
      ?.map(a => ({ name: a.name, url: a.url }))

    try {
      await sendEmail({
        sender: { name: campaign.from_name, email: campaign.from_email },
        to: [{ email: contact.email, name: toName }],
        subject,
        htmlContent: trackedHtml,
        scheduledAt: scheduledAt ?? undefined,
        attachment: attachments?.length ? attachments : undefined,
        bcc: campaign.bcc_email ? [{ email: campaign.bcc_email }] : undefined,
      })
      sent++
    } catch (e) {
      errors.push(`${contact.email}: ${e instanceof Error ? e.message : String(e)}`)
      if (recipient) {
        await supabase.from('campaign_recipients').update({ status: 'failed' }).eq('id', recipient.id)
      }
    }
  }

  const status = errors.length === 0 ? (scheduledAt ? 'scheduled' : 'sent') : sent > 0 ? 'sent' : 'failed'
  await supabase.from('campaigns').update({
    status,
    sent_at: scheduledAt ? null : new Date().toISOString(),
    total_sent: sent,
  }).eq('id', id)

  return NextResponse.json({ sent, errors, status })
}
