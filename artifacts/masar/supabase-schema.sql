-- مسار — Supabase schema (complete)
-- شغّل هذا الملف كاملاً في: Supabase Dashboard > SQL Editor > New query > Run
-- آمن لإعادة التشغيل (يستخدم create table if not exists).

-- التصنيفات
create table if not exists categories (
  id          text primary key,
  owner       text not null default 'solo',
  name        text not null,
  color       text,
  created_at  timestamptz default now()
);

-- سجلات الوقت
create table if not exists entries (
  id          text primary key,
  owner       text not null default 'solo',
  date        text not null,
  cat_id      text,
  start_time  text,
  end_time    text,
  note        text default '',
  created_at  timestamptz default now()
);

-- المهام
create table if not exists tasks (
  id          text primary key,
  owner       text not null default 'solo',
  title       text not null,
  cat_id      text,
  due         text,
  done        boolean not null default false,
  created_at  timestamptz default now()
);

-- التقارير
create table if not exists reports (
  id          text primary key,
  owner       text not null default 'solo',
  kind        text,
  date        text,
  payload     jsonb,
  gist        text,
  created_at  timestamptz default now()
);

-- الملف الشخصي
create table if not exists profile (
  owner       text primary key default 'solo',
  about       text default '',
  hobbies     text default '',
  field       text default '',
  updated_at  timestamptz default now()
);

-- الإنجازات والأهداف
create table if not exists achieve (
  id          text primary key,
  owner       text not null default 'solo',
  kind        text,
  title       text,
  detail      text,
  steps       jsonb default '[]',
  topic       text,
  done        boolean not null default false,
  created_at  timestamptz default now()
);

-- جلسات التركيز
create table if not exists focus_sessions (
  id          text primary key,
  owner       text not null default 'solo',
  date        text not null,
  minutes     integer not null default 0,
  label       text default '',
  is_study    boolean not null default false,
  created_at  timestamptz default now()
);

-- الالتزامات
create table if not exists commitments (
  id            text primary key,
  owner         text not null default 'solo',
  title         text not null,
  target_minutes integer,
  cat_id        text,
  log           jsonb default '{}',
  created_at    timestamptz default now()
);

-- سجل الصلوات
create table if not exists prayer_log (
  id          text primary key,
  owner       text not null default 'solo',
  date        text not null,
  prayer_id   text not null,
  done_at     timestamptz default now(),
  unique (owner, date, prayer_id)
);

-- المهام الدينية
create table if not exists religious_tasks (
  id            text primary key,
  owner         text not null default 'solo',
  date          text not null,
  task_key      text,
  title         text,
  target_count  integer,
  target_minutes integer,
  minutes_spent integer default 0,
  done          boolean not null default false,
  done_at       timestamptz,
  created_at    timestamptz default now()
);

-- النقاط والشارات
create table if not exists gamify (
  owner       text primary key default 'solo',
  points      integer not null default 0,
  badges      jsonb default '[]',
  updated_at  timestamptz default now()
);

-- سجل المهام الأساسية اليومية
create table if not exists mandatory_log (
  id          text primary key default gen_random_uuid()::text,
  owner       text not null default 'solo',
  date        text not null,
  task_key    text not null,
  done        boolean not null default false,
  updated_at  timestamptz default now(),
  unique (owner, date, task_key)
);

-- سجل أذكار الصباح والمساء
create table if not exists azkar_log (
  id          text primary key default gen_random_uuid()::text,
  owner       text not null default 'solo',
  date        text not null,
  session     text not null,  -- 'morning' or 'evening'
  done        boolean not null default false,
  updated_at  timestamptz default now(),
  unique (owner, date, session)
);

-- تقدّم ختم القرآن (30 جزءاً)
create table if not exists quran_progress (
  juz_num     integer not null,
  owner       text not null default 'solo',
  done        boolean not null default false,
  updated_at  timestamptz default now(),
  primary key (owner, juz_num)
);

-- سجل النقاط (المكتسبة والمخصومة)
create table if not exists points_log (
  id          text primary key,
  owner       text not null default 'solo',
  date        text not null,
  amount      integer not null,
  reason      text not null,
  created_at  timestamptz default now()
);
create index if not exists points_log_owner_date on points_log (owner, date desc);

-- عدّاد الاستغفار (تنازلي يومي + المجموع التراكمي)
create table if not exists istighfar (
  owner       text primary key default 'solo',
  daily       jsonb not null default '{}',
  total       integer not null default 0,
  updated_at  timestamptz default now()
);
