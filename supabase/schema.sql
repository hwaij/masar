-- ============================================================
-- مسار · مخطط قاعدة بيانات Supabase
-- شغّل هذا الملف كاملاً في: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ملاحظة: هذه نسخة لمستخدم واحد بدون نظام مصادقة.
-- كل الصفوف تستخدم معرّف ثابت 'solo' في عمود owner.
-- عند إضافة Auth لاحقاً، استبدل 'solo' بـ auth.uid().

-- ---------- جدول الفئات ----------
create table if not exists categories (
  id text primary key,
  owner text not null default 'solo',
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

-- ---------- جدول الأنشطة (تتبع الوقت) ----------
create table if not exists entries (
  id text primary key,
  owner text not null default 'solo',
  date date not null,
  cat_id text,
  start_time text not null,   -- صيغة HH:MM
  end_time text not null,     -- صيغة HH:MM
  note text default '',
  created_at timestamptz not null default now()
);
create index if not exists entries_date_idx on entries (owner, date);

-- ---------- جدول المهام ----------
create table if not exists tasks (
  id text primary key,
  owner text not null default 'solo',
  title text not null,
  cat_id text,
  due date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_owner_idx on tasks (owner);

-- ---------- جدول التقارير وسجل التحليل ----------
create table if not exists reports (
  id text primary key,
  owner text not null default 'solo',
  kind text not null,         -- daily | deep
  date date not null,
  payload jsonb not null,     -- محتوى التقرير
  gist text,                  -- ملخص قصير يُستخدم في التحليل التالي
  created_at timestamptz not null default now()
);
create index if not exists reports_owner_idx on reports (owner, created_at desc);

-- ---------- جدول حالة التحفيز (نقاط وشارات) ----------
create table if not exists gamify (
  owner text primary key default 'solo',
  points integer not null default 0,
  badges jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- سياسات الأمان (RLS)
-- ============================================================
-- بما أنه لا يوجد Auth الآن، نفعّل RLS ونسمح بالوصول العام
-- عبر مفتاح anon. هذا مقبول لاستخدام شخصي فردي.
-- مهم: إذا أردت خصوصية أعلى، أضف Auth لاحقاً وعدل السياسات.

alter table categories enable row level security;
alter table entries enable row level security;
alter table tasks enable row level security;
alter table reports enable row level security;
alter table gamify enable row level security;

-- سياسة مفتوحة للقراءة والكتابة (مستخدم فردي عبر anon key)
create policy "solo_all_categories" on categories for all using (true) with check (true);
create policy "solo_all_entries" on entries for all using (true) with check (true);
create policy "solo_all_tasks" on tasks for all using (true) with check (true);
create policy "solo_all_reports" on reports for all using (true) with check (true);
create policy "solo_all_gamify" on gamify for all using (true) with check (true);

-- ---------- بيانات أولية للفئات الافتراضية ----------
insert into categories (id, name, color) values
  ('shoot', 'تصوير وتنفيذ', '#C9A24B'),
  ('edit',  'مونتاج وتعديل', '#8A7BD1'),
  ('study', 'دراسة جامعية', '#5FA8A0'),
  ('client','تواصل مع عملاء', '#D17B5F'),
  ('fitness','تمرين', '#6FA8DC'),
  ('rest',  'راحة', '#9A968F')
on conflict (id) do nothing;

-- صف التحفيز الأولي
insert into gamify (owner, points, badges) values ('solo', 0, '[]'::jsonb)
on conflict (owner) do nothing;
-- ============================================================
-- إضافات النسخة الجديدة: الملف الشخصي ووحدة "أنجز"
-- شغّل هذا الجزء أيضا في SQL Editor إن كانت قاعدتك منشأة سابقاً.
-- ============================================================

-- ---------- جدول الملف الشخصي (هوية المستخدم) ----------
create table if not exists profile (
  owner text primary key default 'solo',
  about text default '',          -- من أنا
  hobbies text default '',        -- هواياتي
  field text default '',          -- تخصصي
  updated_at timestamptz not null default now()
);

-- ---------- جدول تحديات "أنجز" ----------
create table if not exists achieve (
  id text primary key,
  owner text not null default 'solo',
  kind text not null,             -- challenge | project | path
  title text not null,
  detail text default '',
  steps jsonb default '[]'::jsonb,
  topic text default '',          -- مرتبط بهواية أو تخصص
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists achieve_owner_idx on achieve (owner, created_at desc);

alter table profile enable row level security;
alter table achieve enable row level security;
create policy "solo_all_profile" on profile for all using (true) with check (true);
create policy "solo_all_achieve" on achieve for all using (true) with check (true);

insert into profile (owner) values ('solo') on conflict (owner) do nothing;

-- ============================================================
-- إضافات: تايمر التركيز وتحديات الالتزام اليومية
-- ============================================================

-- ---------- جلسات التركيز ----------
create table if not exists focus_sessions (
  id text primary key,
  owner text not null default 'solo',
  date date not null,
  minutes integer not null,       -- الدقائق المكتملة
  label text default '',          -- ما الذي ركّز عليه
  is_study boolean not null default false,  -- جلسة دراسة أم نشاط عام
  created_at timestamptz not null default now()
);
create index if not exists focus_date_idx on focus_sessions (owner, date);

-- ---------- تحديات الالتزام اليومية ----------
create table if not exists commitments (
  id text primary key,
  owner text not null default 'solo',
  title text not null,            -- مثال: ساعة دراسة يومياً
  target_minutes integer not null default 60,
  cat_id text,
  log jsonb not null default '{}'::jsonb,  -- {"2026-06-25": 60, ...} دقائق منجزة لكل يوم
  created_at timestamptz not null default now()
);
create index if not exists commitments_owner_idx on commitments (owner);

alter table focus_sessions enable row level security;
alter table commitments enable row level security;
create policy "solo_all_focus" on focus_sessions for all using (true) with check (true);
create policy "solo_all_commitments" on commitments for all using (true) with check (true);

-- ============================================================
-- ترقية لقواعد البيانات المنشأة سابقاً: أضف عمود الدراسة
-- ============================================================
alter table focus_sessions add column if not exists is_study boolean not null default false;

-- ============================================================
-- إضافات: قسم الصلاة والمهام الدينية
-- ============================================================

-- ---------- سجل الصلوات المؤداة ----------
create table if not exists prayer_log (
  id text primary key,
  owner text not null default 'solo',
  date date not null,
  prayer_id text not null,        -- fajr | dhuhr | asr | maghrib | isha
  done_at timestamptz not null default now()
);
create index if not exists prayer_log_idx on prayer_log (owner, date);

-- ---------- المهام الدينية اليومية ----------
create table if not exists religious_tasks (
  id text primary key,
  owner text not null default 'solo',
  date date not null,
  task_key text not null,         -- istighfar | quran | custom
  title text not null,
  target_count integer,           -- مثل 1000 للاستغفار
  target_minutes integer,         -- مثل 30 لقراءة القرآن
  minutes_spent integer default 0,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists religious_idx on religious_tasks (owner, date);

alter table prayer_log enable row level security;
alter table religious_tasks enable row level security;
create policy "solo_all_prayer" on prayer_log for all using (true) with check (true);
create policy "solo_all_religious" on religious_tasks for all using (true) with check (true);
