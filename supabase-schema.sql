-- Run this in Supabase SQL Editor
-- Also create a public Storage bucket named "email-assets" in Supabase Dashboard → Storage

create table contact_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references contact_lists(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  company text,
  custom_fields jsonb default '{}',
  created_at timestamptz default now(),
  unique(list_id, email)
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  html_content text not null default '',
  from_name text not null default 'Mail Merge',
  from_email text not null default '',
  list_id uuid references contact_lists(id) on delete set null,
  status text check (status in ('draft','scheduled','sending','sent','failed')) default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_sent int default 0,
  attachments jsonb default '[]',
  bcc_email text,
  created_at timestamptz default now()
);

-- If upgrading an existing database, run these instead:
-- alter table campaigns add column if not exists attachments jsonb default '[]';
-- alter table campaigns add column if not exists bcc_email text;

create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  email text not null,
  status text check (status in ('sent','failed','bounced')) default 'sent',
  sent_at timestamptz default now()
);

create table email_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  recipient_id uuid references campaign_recipients(id) on delete cascade,
  email text not null,
  event_type text check (event_type in ('open','click')) not null,
  url text,
  occurred_at timestamptz default now()
);
