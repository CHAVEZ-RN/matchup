-- MatchUp database schema (Supabase / Postgres)
-- Run this ONCE in the Supabase SQL editor (SQL Editor → New query → paste → Run).

create table if not exists coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,                 -- used in the booking link: t.me/YourBot?start=<slug>
  sport text not null default 'Tennis',
  working_hours text not null default '6:00 AM - 9:00 PM',
  info text not null default '',             -- rates, venue, policies (what Machi may share)
  telegram_chat_id bigint,                   -- coach's own Telegram, set automatically via the setup link
  max_weeks_ahead int not null default 4,
  max_session_hours int not null default 3,
  max_pending_per_client int not null default 2,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  client_name text not null,
  telegram_user_id bigint not null,
  date date not null,
  time time not null,
  duration_hours int not null default 1,
  status text not null default 'pending'
    check (status in ('pending','upcoming','active','completed','declined')),
  note text default '',
  via text not null default 'Machi',
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists blocked_slots (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  date date not null,
  hour time not null,
  unique (coach_id, date, hour)
);

create table if not exists messages (
  id bigint generated always as identity primary key,
  coach_id uuid not null references coaches(id) on delete cascade,
  telegram_user_id bigint not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Remembers which coach each Telegram user is currently booking with
-- (set when they open a coach's booking link).
create table if not exists chat_sessions (
  telegram_user_id bigint primary key,
  coach_id uuid not null references coaches(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_coach_date on bookings (coach_id, date);
create index if not exists idx_messages_convo on messages (coach_id, telegram_user_id, created_at);

-- ============================================================
-- Add your REAL coaches here (one row each). The slug must be
-- lowercase, no spaces. It becomes their booking link.
-- ============================================================
insert into coaches (name, slug, sport, working_hours, info) values
  ('Coach Rio', 'rio', 'Tennis', '6:00 AM - 9:00 PM',
   'Rate: P800/hr. Venue: Marikina Sports Center. Bring your own racket if you have one.')
on conflict (slug) do nothing;

-- Example of a second coach (uncomment & edit, or add more):
-- insert into coaches (name, slug, sport, working_hours, info) values
--   ('Coach Maya', 'maya', 'Badminton', '7:00 AM - 8:00 PM',
--    'Rate: P600/hr. Venue: QC Sports Club.')
-- on conflict (slug) do nothing;
