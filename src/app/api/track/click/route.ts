import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rid = searchParams.get('rid')
  const url = searchParams.get('url')

  if (!url || !/^https?:\/\//i.test(url)) {
    return new NextResponse('Invalid redirect', { status: 400 })
  }

  if (rid) {
    const { data: recipient } = await supabase
      .from('campaign_recipients')
      .select('campaign_id, email')
      .eq('id', rid)
      .single()

    if (recipient) {
      await supabase.from('email_events').insert({
        campaign_id: recipient.campaign_id,
        recipient_id: rid,
        email: recipient.email,
        event_type: 'click',
        url,
      })
    }
  }

  return NextResponse.redirect(url, { status: 302 })
}
