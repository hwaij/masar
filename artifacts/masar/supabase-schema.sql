-- مسار — Supabase schema (complete)
-- شغّل هذا الملف كاملاً في: Supabase Dashboard > SQL Editor > New query > Run
-- آمن لإعادة التشغيل (يستخدم create table if not exists).

-- التصنيفات
-- للجدول القديم (مفتاح id فقط): ترقية للمفتاح المركّب (owner, id) تتم في قسم ترقيات المفاتيح أدناه.
create table if not exists categories (
  id          text not null,
  owner       text not null default 'solo',
  name        text not null,
  color       text,
  created_at  timestamptz default now(),
  primary key (owner, id)
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

-- سجل الصحة اليومي (إدخال يدوي: خطوات، نوم، ماء، وزن، طاقة)
create table if not exists health_log (
  id          text primary key,
  owner       text not null default 'solo',
  date        text not null,
  steps       integer default 0,
  sleep_hours numeric default 0,
  water_cups  integer default 0,
  weight      numeric,
  energy      text,
  note        text default '',
  updated_at  timestamptz default now(),
  unique (owner, date)
);

-- ============================================================
-- ترقية المفاتيح لتكون مخصّصة لكل مستخدم (تمنع تصادم بيانات حسابين)
-- categories: المفتاح صار (owner, id) لأن التصنيفات الافتراضية تشترك بنفس id.
-- health_log: نزيل مفتاح id العام ونعتمد على فرادة (owner, date) للحفظ.
-- آمن لإعادة التشغيل (يستخدم drop ... if exists).
-- ============================================================
alter table categories drop constraint if exists categories_pkey;
alter table categories add primary key (owner, id);

alter table health_log drop constraint if exists health_log_pkey;

-- ============================================================
-- أمان الصفوف (RLS): عزل بيانات كل مستخدم على مستوى الخادم
-- المستخدم المسجّل بـ Google يرى بياناته فقط (owner = معرّفه).
-- الزوار غير المسجّلين (anon) ممنوعون تماماً من الوصول لأي صف عبر
-- Supabase — التطبيق يخزّن بياناتهم محلياً فقط (localStorage) ولا
-- يرسلها للسحابة إطلاقاً. لا توجد أي سياسة لدور anon هنا عمداً؛
-- بدون سياسة مطابقة، RLS يرفض الوصول افتراضياً (deny by default).
-- شغّل هذا في Supabase SQL Editor لتفعيل الحماية الكاملة.
-- إذا كانت لديك سياسات anon قديمة من نسخة سابقة من هذا الملف، هذا
-- التحديث يحذفها صراحةً (drop policy if exists) قبل ما يوقف عندها.
-- ============================================================

alter table categories enable row level security;
drop policy if exists categories_anon_solo on categories;
drop policy if exists categories_user_own on categories;
create policy categories_user_own on categories for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table entries enable row level security;
drop policy if exists entries_anon_solo on entries;
drop policy if exists entries_user_own on entries;
create policy entries_user_own on entries for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table tasks enable row level security;
drop policy if exists tasks_anon_solo on tasks;
drop policy if exists tasks_user_own on tasks;
create policy tasks_user_own on tasks for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table reports enable row level security;
drop policy if exists reports_anon_solo on reports;
drop policy if exists reports_user_own on reports;
create policy reports_user_own on reports for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table profile enable row level security;
drop policy if exists profile_anon_solo on profile;
drop policy if exists profile_user_own on profile;
create policy profile_user_own on profile for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table achieve enable row level security;
drop policy if exists achieve_anon_solo on achieve;
drop policy if exists achieve_user_own on achieve;
create policy achieve_user_own on achieve for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table focus_sessions enable row level security;
drop policy if exists focus_sessions_anon_solo on focus_sessions;
drop policy if exists focus_sessions_user_own on focus_sessions;
create policy focus_sessions_user_own on focus_sessions for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table commitments enable row level security;
drop policy if exists commitments_anon_solo on commitments;
drop policy if exists commitments_user_own on commitments;
create policy commitments_user_own on commitments for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table prayer_log enable row level security;
drop policy if exists prayer_log_anon_solo on prayer_log;
drop policy if exists prayer_log_user_own on prayer_log;
create policy prayer_log_user_own on prayer_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table religious_tasks enable row level security;
drop policy if exists religious_tasks_anon_solo on religious_tasks;
drop policy if exists religious_tasks_user_own on religious_tasks;
create policy religious_tasks_user_own on religious_tasks for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table gamify enable row level security;
drop policy if exists gamify_anon_solo on gamify;
drop policy if exists gamify_user_own on gamify;
create policy gamify_user_own on gamify for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table mandatory_log enable row level security;
drop policy if exists mandatory_log_anon_solo on mandatory_log;
drop policy if exists mandatory_log_user_own on mandatory_log;
create policy mandatory_log_user_own on mandatory_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table azkar_log enable row level security;
drop policy if exists azkar_log_anon_solo on azkar_log;
drop policy if exists azkar_log_user_own on azkar_log;
create policy azkar_log_user_own on azkar_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table quran_progress enable row level security;
drop policy if exists quran_progress_anon_solo on quran_progress;
drop policy if exists quran_progress_user_own on quran_progress;
create policy quran_progress_user_own on quran_progress for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table points_log enable row level security;
drop policy if exists points_log_anon_solo on points_log;
drop policy if exists points_log_user_own on points_log;
create policy points_log_user_own on points_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table istighfar enable row level security;
drop policy if exists istighfar_anon_solo on istighfar;
drop policy if exists istighfar_user_own on istighfar;
create policy istighfar_user_own on istighfar for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table health_log enable row level security;
drop policy if exists health_log_anon_solo on health_log;
drop policy if exists health_log_user_own on health_log;
create policy health_log_user_own on health_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);
