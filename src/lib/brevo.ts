const API = 'https://api.brevo.com/v3/smtp/email'

export async function sendEmail(payload: {
  sender: { name: string; email: string }
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
  scheduledAt?: string
  attachment?: { name: string; url: string }[]
  bcc?: { email: string }[]
}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
  return res.json()
}
