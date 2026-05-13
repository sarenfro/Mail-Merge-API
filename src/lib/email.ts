const API = 'https://api.sendgrid.com/v3/mail/send'

export async function sendEmail(payload: {
  sender: { name: string; email: string }
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
  scheduledAt?: string
  attachment?: { name: string; url: string }[]
  bcc?: { email: string }[]
}) {
  const attachments = payload.attachment?.length
    ? await Promise.all(
        payload.attachment.map(async a => {
          const res = await fetch(a.url)
          const buf = await res.arrayBuffer()
          return {
            content: Buffer.from(buf).toString('base64'),
            filename: a.name,
            type: res.headers.get('content-type') ?? 'application/octet-stream',
            disposition: 'attachment',
          }
        })
      )
    : undefined

  const body: Record<string, unknown> = {
    personalizations: [
      {
        to: payload.to,
        ...(payload.bcc?.length ? { bcc: payload.bcc } : {}),
      },
    ],
    from: payload.sender,
    subject: payload.subject,
    content: [{ type: 'text/html', value: payload.htmlContent }],
    tracking_settings: {
      click_tracking: { enable: false },
      open_tracking: { enable: false },
    },
  }

  if (attachments?.length) body.attachments = attachments
  if (payload.scheduledAt) body.send_at = Math.floor(new Date(payload.scheduledAt).getTime() / 1000)

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`SendGrid ${res.status}: ${await res.text()}`)
  return { messageId: res.headers.get('x-message-id') }
}
