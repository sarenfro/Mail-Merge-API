export interface CampaignAttachment {
  name: string
  url: string
  content_type: string
  size: number
}

export interface ContactList {
  id: string
  name: string
  created_at: string
  contact_count?: number
}

export interface Contact {
  id: string
  list_id: string
  email: string
  first_name: string | null
  last_name: string | null
  company: string | null
  custom_fields: Record<string, string> | null
  created_at: string
}

export interface Campaign {
  id: string
  name: string
  subject: string
  html_content: string
  from_name: string
  from_email: string
  list_id: string | null
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduled_at: string | null
  sent_at: string | null
  total_sent: number
  attachments: CampaignAttachment[] | null
  bcc_email: string | null
  created_at: string
}

export interface CampaignRecipient {
  id: string
  campaign_id: string
  contact_id: string | null
  email: string
  status: 'sent' | 'failed' | 'bounced'
  sent_at: string
}

export interface EmailEvent {
  id: string
  campaign_id: string
  recipient_id: string
  email: string
  event_type: 'open' | 'click'
  url: string | null
  occurred_at: string
}

export interface CampaignStats {
  total_sent: number
  opens: number
  unique_opens: number
  clicks: number
  unique_clicks: number
  failed: number
}
