-- مسار — Supabase schema for new tables
-- Run these in your Supabase Dashboard > SQL Editor

-- Mandatory daily task completion log
create table if not exists mandatory_log (
  id          text primary key default gen_random_uuid()::text,
  owner       text not null default 'solo',
  date        text not null,
  task_key    text not null,
  done        boolean not null default false,
  updated_at  timestamptz default now(),
  unique (owner, date, task_key)
);

-- Morning/evening azkar completion log
create table if not exists azkar_log (
  id          text primary key default gen_random_uuid()::text,
  owner       text not null default 'solo',
  date        text not null,
  session     text not null,  -- 'morning' or 'evening'
  done        boolean not null default false,
  updated_at  timestamptz default now(),
  unique (owner, date, session)
);

-- Quran juz progress (30 ajza)
create table if not exists quran_progress (
  juz_num     integer not null,
  owner       text not null default 'solo',
  done        boolean not null default false,
  updated_at  timestamptz default now(),
  primary key (owner, juz_num)
);

-- Points log (earned and deducted events)
create table if not exists points_log (
  id          text primary key,
  owner       text not null default 'solo',
  date        text not null,
  amount      integer not null,
  reason      text not null,
  created_at  timestamptz default now()
);
create index if not exists points_log_owner_date on points_log (owner, date desc);

-- Istighfar tracker (daily countdown + cumulative total)
create table if not exists istighfar (
  owner       text primary key default 'solo',
  daily       jsonb not null default '{}',
  total       integer not null default 0,
  updated_at  timestamptz default now()
);
