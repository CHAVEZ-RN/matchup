-- MatchUp database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor to create all tables.

create table coaches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport text not null default 'Tennis',
  working_hours text not null default '6:00 AM - 9:00 PM',
  info text not null default '',            -- rates, venue, policies (what Machi may share)
  telegram_chat_id bigint,                   -- coach's own Telegram, for "new pending" pings
  max_weeks_ahead int not null default 4,
  max_session_hours int not null default 3,
  max_pending_per_client int not null default 2,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  client_name text not null,
  telegram_user_id bigint not null,          -- which Telegram client made it
  date date not null,
  time time not null,
  duration_hours int not null default 1,
  status text not null default 'pending'     -- pending | upcoming | active | completed | declined
    check (status in ('pending','upcoming','active','completed','declined')),
  note text default '',
  via text not null default 'Machi',         -- Machi | Manual
  notified boolean not null default false,   -- has client been told the approve/decline result
  created_at timestamptz not null default now()
);

create table blocked_slots (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  date date not null,
  hour time not null,
  unique (coach_id, date, hour)
);

create table messages (
  id bigint generated always as identity primary key,
  coach_id uuid not null references coaches(id) on delete cascade,
  telegram_user_id bigint not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_bookings_coach_date on bookings (coach_id, date);
create index idx_messages_convo on messages (coach_id, telegram_user_id, created_at);

-- Seed your first coach (EDIT THESE VALUES):
insert into coaches (name, sport, working_hours, info)
values ('Coach Rio', 'Tennis', '6:00 AM - 9:00 PM',
        'Rate: P800/hr. Venue: Marikina Sports Center. Bring your own racket if you have one.');

-- NOTE for production: enable Row Level Security (RLS) on all tables and add
-- policies so coaches only see their own data. The bot server uses the
-- service_role key (bypasses RLS); the web app uses the anon key + auth.
