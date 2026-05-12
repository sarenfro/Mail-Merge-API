export function mergePlaceholders(html: string, fields: Record<string, string | null>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => fields[key] ?? `{{${key}}}`)
}

export function injectTracking(html: string, recipientId: string, baseUrl: string): string {
  baseUrl = baseUrl.replace(/\/$/, '')
  // Rewrite links for click tracking
  const withClicks = html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, encodedUrl) => {
      const url = encodedUrl.replace(/&amp;/gi, '&').trim().replace(/[\x00-\x1F\x7F]/g, '')
      // clicktracking="off" tells Brevo not to double-wrap this link with their own tracker
      return `href="${baseUrl}/api/track/click?rid=${recipientId}&url=${encodeURIComponent(url)}" clicktracking="off"`
    }
  )
  // Append open tracking pixel
  return withClicks + `<img src="${baseUrl}/api/track/open?rid=${recipientId}" width="1" height="1" style="display:none" alt="">`
}
