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
  owner                  text primary key default 'solo',
  about                  text default '',
  hobbies                text default '',
  field                  text default '',
  tour_seen              boolean not null default false,
  theme                  text not null default 'dark' check (theme in ('dark', 'light')),
  notifications_enabled  boolean not null default false,
  notifications_asked    boolean not null default false,
  updated_at             timestamptz default now()
);
-- ترقية للجداول القديمة التي أُنشئت قبل إضافة الجولة التعريفية ووضع العرض
-- وتفضيل الإشعارات.
alter table profile add column if not exists tour_seen boolean not null default false;
alter table profile add column if not exists theme text not null default 'dark';
alter table profile add column if not exists notifications_enabled boolean not null default false;
alter table profile add column if not exists notifications_asked boolean not null default false;
alter table profile add column if not exists language text not null default 'ar';
alter table profile add column if not exists name text default '';

-- قسم "أنت": بيانات صحية أساسية + القيم المحسوبة منها (BMI/IBW/REE/TEE)
-- مخزّنة جاهزة حتى تقرأها أقسام التغذية والرياضة لاحقاً دون إعادة حسابها.
-- لا علاقة لهذا الجدول بأي حالة اشتراك — ميزة أساسية متاحة للجميع.
create table if not exists health_profile (
  owner           text primary key default 'solo',
  height_cm       numeric,
  weight_kg       numeric,
  age             integer,
  gender          text check (gender in ('male', 'female')),
  activity_level  text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  conditions      jsonb not null default '[]',
  bmi             numeric,
  bmi_category    text,
  ibw_kg          numeric,
  ree             numeric,
  tee             numeric,
  updated_at      timestamptz default now()
);

-- قسم "الرياضة": إعداد أولي (هدف/معدات/أيام أسبوعياً) وسجل بسيط لأيام
-- التمرين المكتملة. الجدول الأسبوعي نفسه (تمارينه وتفاصيلها) يُولَّد
-- بالكامل في الكود من قاعدة تمارين ثابتة محلية — لا يُخزَّن هنا.
create table if not exists fitness_profile (
  owner          text primary key default 'solo',
  goal           text check (goal in ('lose_weight', 'build_muscle', 'general_fitness')),
  equipment      text check (equipment in ('gym', 'home_no_equipment', 'home_light_weights')),
  days_per_week  integer check (days_per_week between 2 and 6),
  updated_at     timestamptz default now()
);

create table if not exists fitness_log (
  owner          text not null default 'solo',
  date           text not null,
  day_completed  boolean not null default false,
  updated_at     timestamptz default now(),
  primary key (owner, date)
);

-- قسم "الصحة النفسية": تسجيل يومي واحد لكل يوم (مزاج/توتر/طاقة/ملاحظة
-- اختيارية)، مع علم flagged_risk عند اكتشاف كلمات خطر في الملاحظة (يُستخدم
-- فقط لعرض بطاقة توجيه لمصادر دعم حقيقية، وليس أي تشخيص أو تدخل علاجي).
create table if not exists mental_health_log (
  owner          text not null default 'solo',
  date           text not null,
  mood           integer check (mood between 1 and 5),
  stress         integer check (stress between 1 and 5),
  energy         integer check (energy between 1 and 5),
  note           text,
  flagged_risk   boolean not null default false,
  updated_at     timestamptz default now(),
  primary key (owner, date)
);

-- قسم "التغذية": سجل ما استُهلك يومياً (عبر باركود Open Food Facts، بحث
-- بالاسم، أو إدخال يدوي)، ذاكرة الإدخالات اليدوية لإعادة استخدامها بنفس
-- الباركود لاحقاً دون كتابتها من جديد، وسجل أكواب الماء اليومي.
create table if not exists nutrition_log (
  id            text primary key,
  owner         text not null default 'solo',
  date          text not null,
  food_name     text not null,
  calories      numeric not null default 0,
  protein       numeric not null default 0,
  carbs         numeric not null default 0,
  fat           numeric not null default 0,
  serving_info  text default '',
  source        text check (source in ('barcode', 'manual', 'search', 'ai_photo')),
  created_at    timestamptz default now()
);
create index if not exists nutrition_log_owner_date on nutrition_log (owner, date);
alter table nutrition_log add column if not exists fiber numeric not null default 0;
alter table nutrition_log add column if not exists sugar numeric not null default 0;
alter table nutrition_log add column if not exists sodium numeric not null default 0;
-- source كان يمنع القيمة الجديدة 'ai_photo' (تصوير الوجبة بالذكاء الاصطناعي)
-- عبر check constraint قديم لا يعرفها؛ يُعاد إنشاؤه هنا ليشملها أيضاً.
alter table nutrition_log drop constraint if exists nutrition_log_source_check;
alter table nutrition_log add constraint nutrition_log_source_check check (source in ('barcode', 'manual', 'search', 'ai_photo'));
-- وحدة القياس التي اختارها المستخدم فعلياً عند التسجيل (غرام افتراضياً)،
-- تُحفظ منفصلة حتى يظهر السجل لاحقاً بنفس الوحدة، حتى لو كانت القيم
-- الغذائية نفسها محسوبة مسبقاً بمكافئها بالغرام.
alter table nutrition_log add column if not exists unit text not null default 'g';

-- مفتاحها (owner, barcode) — لو أدخل المستخدم منتجاً يدوياً لباركود غير
-- موجود في Open Food Facts، يُستخدم هذا الصف تلقائياً في المرة القادمة
-- لنفس الباركود قبل حتى محاولة الاتصال بالـ API.
--
-- قرار هندسي مهم (قابلية التوسع): عمود micronutrients من نوع jsonb بدل
-- عمود منفصل لكل فيتامين/معدن مستقبلي (فيتامين د، حديد، كالسيوم، أوميغا 3...).
-- إضافة عنصر غذائي جديد لاحقاً تصبح مجرد مفتاح جديد داخل هذا الـJSON دون
-- أي ALTER TABLE على الإطلاق. الحقول الستة الأساسية (سعرات/بروتين/كارب/
-- دهون/ألياف/سكر/صوديوم) بقيت أعمدة numeric صريحة لأنها معروفة ومُستخدَمة
-- فعلياً في حسابات وواجهة القسم الآن، بخلاف الفيتامينات/المعادن المستقبلية
-- التي لا صيغة نهائية لها بعد.
create table if not exists custom_foods (
  owner       text not null default 'solo',
  barcode     text not null,
  food_name   text not null,
  calories    numeric not null default 0,
  protein     numeric not null default 0,
  carbs       numeric not null default 0,
  fat         numeric not null default 0,
  updated_at  timestamptz default now(),
  primary key (owner, barcode)
);
alter table custom_foods add column if not exists brand text default '';
alter table custom_foods add column if not exists country text default '';
alter table custom_foods add column if not exists serving_size_label text default '';
alter table custom_foods add column if not exists serving_grams numeric;
alter table custom_foods add column if not exists fiber numeric not null default 0;
alter table custom_foods add column if not exists sugar numeric not null default 0;
alter table custom_foods add column if not exists sodium numeric not null default 0;
alter table custom_foods add column if not exists image_url text default '';
alter table custom_foods add column if not exists micronutrients jsonb not null default '{}'::jsonb;

-- فهرسة على الباركود بمفرده (منفصلة عن المفتاح الأساسي المركّب owner+barcode
-- الذي لا يخدم بحثاً "بالباركود فقط بغض النظر عن المالك" بكفاءة)، وعلى اسم
-- المنتج، حتى يبقى البحث سريعاً حتى لو كبر الجدول لملايين الصفوف مستقبلاً.
create index if not exists custom_foods_barcode on custom_foods (barcode);
create index if not exists custom_foods_food_name on custom_foods (food_name);

-- جدول مرادفات بسيط قابل للنمو بإضافة صفوف فقط (لا تعديل بنية أبداً)، يسمح
-- بالبحث بالعربي حتى لو كان اسم المنتج مخزَّناً بالإنجليزي في Open Food
-- Facts (وهو الغالب) عبر إعادة المحاولة بالمصطلح الإنجليزي المقابل عند
-- فشل البحث المباشر. term_ar فريد لأن كل مرادف عربي يقابله مصطلح قانوني
-- واحد يُعاد به البحث.
create table if not exists food_synonyms (
  id              bigint generated always as identity primary key,
  term_ar         text not null unique,
  term_en         text not null,
  canonical_term  text not null,
  created_at      timestamptz default now()
);
create index if not exists food_synonyms_term_ar on food_synonyms (term_ar);
create index if not exists food_synonyms_term_en on food_synonyms (term_en);

create table if not exists water_log (
  owner       text not null default 'solo',
  date        text not null,
  cups_count  integer not null default 0,
  updated_at  timestamptz default now(),
  primary key (owner, date)
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
  start_time  text,
  end_time    text,
  created_at  timestamptz default now()
);
-- ترقية للجداول القديمة: وقت الجلسة اختياري (NULL) للجلسات المسجّلة قبل
-- هذه الإضافة، فلا تُفقد أي بيانات — فقط لن تظهر تلك الجلسات القديمة في
-- دائرة اليوم لأنها لم تُسجَّل بوقت محدد أصلاً.
alter table focus_sessions add column if not exists start_time text;
alter table focus_sessions add column if not exists end_time text;

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
-- عدد الدقائق بين وقت الأذان ووقت تسجيل الصلاة (يُحسب لحظة التسجيل على
-- جهاز المستخدم) لعرض رسالة تحفيزية والإحصائية الأسبوعية. عمود قابل
-- لأن يكون فارغاً حتى لا تتأثر أي صلوات مسجّلة قبل هذا التحديث.
alter table prayer_log add column if not exists minutes_after_adhan integer;

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

-- محادثة مساعد أنجز (كل رسالة سطر مستقل، لا تُحذف تلقائياً أبداً)
create table if not exists chat_messages (
  id          text primary key,
  owner       text not null default 'solo',
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz default now()
);
create index if not exists chat_messages_owner_created on chat_messages (owner, created_at);

-- تقدّم قسم "أذكار" اليومي (عدّاد كل ذكر لكل فئة، يُعاد ضبطه تلقائياً كل يوم لأنه مرتبط بالتاريخ)
create table if not exists adhkar_progress (
  id          text primary key default gen_random_uuid()::text,
  owner       text not null default 'solo',
  date        text not null,
  category    text not null,
  item_id     text not null,
  remaining   integer not null default 0,
  done        boolean not null default false,
  updated_at  timestamptz default now(),
  unique (owner, date, category, item_id)
);
create index if not exists adhkar_progress_owner_date on adhkar_progress (owner, date);

-- سجل نصيحة اليوم (قسم "بصيرة"): صف واحد لكل مستخدم لكل تاريخ — نفس
-- النصيحة تُحفظ فور ظهورها ولا تُعاد لاحقاً حتى لو تغيّر يوم الدخول،
-- ويوم لم يدخل فيه المستخدم لا يترك أثراً (لا تراكم لنصائح فائتة).
create table if not exists tips_log (
  owner       text not null default 'solo',
  date        text not null,
  tip_id      text not null,
  seen_at     timestamptz default now(),
  primary key (owner, date)
);

-- قسم "أهداف": كل هدف يحمل خطته الكاملة محسوبة عند الإنشاء (خلايا
-- التقويم ومواعيد المراجعة)، فلا تتأثر أهداف قديمة إن تغيّر منطق
-- البناء لاحقاً. failures يجمع كل مرات "لم أحقق الهدف" لهذا الهدف
-- بعينه (يتكرر أكثر من مرة للهدف السنوي ذي المراجعات الشهرية).
create table if not exists goals (
  id                text primary key,
  owner             text not null default 'solo',
  title             text not null,
  period            text not null check (period in ('weekly', 'monthly', 'yearly')),
  created_date      text not null,
  cells             jsonb not null default '[]',
  checkpoints       jsonb not null default '[]',
  checkpoint_index  integer not null default 0,
  status            text not null default 'active' check (status in ('active', 'done', 'failed')),
  failures          jsonb not null default '[]',
  created_at        timestamptz default now()
);
create index if not exists goals_owner_created on goals (owner, created_at desc);

-- قسم "خزنة" (التتبّع المالي): صف واحد لكل مستخدم يحمل رصيده الحالي
-- وعملته المختارة. كل حركة (صرف/إضافة) تُسجَّل كصف مستقل في
-- vault_transactions بتاريخها ومبلغها وسببها الإلزامي، بترتيب زمني
-- عكسي عند العرض.
create table if not exists vault (
  owner       text primary key default 'solo',
  balance     numeric not null default 0,
  currency    text not null default 'KWD',
  updated_at  timestamptz default now()
);

create table if not exists vault_transactions (
  id          text primary key,
  owner       text not null default 'solo',
  date        text not null,
  amount      numeric not null,
  type        text not null check (type in ('expense', 'income')),
  reason      text not null,
  created_at  timestamptz default now()
);
create index if not exists vault_transactions_owner_created on vault_transactions (owner, created_at desc);

-- تتبّع النوم (قسم "التقارير"): صف واحد لكل مستخدم لكل تاريخ — التاريخ
-- هو يوم الاستيقاظ (بالتاريخ المحلي، localDayKey). sleep_time/wake_time
-- تُملآن إن سجّل المستخدم الوقتين، وتبقيان فارغتين إن أدخل عدد الساعات
-- مباشرة بدلاً من ذلك؛ hours محسوبة دائماً وتبقى المرجع الأساسي للعرض.
create table if not exists sleep_log (
  id          text primary key,
  owner       text not null default 'solo',
  date        text not null,
  sleep_time  text,
  wake_time   text,
  hours       numeric not null,
  created_at  timestamptz default now(),
  unique (owner, date)
);
create index if not exists sleep_log_owner_date on sleep_log (owner, date);

-- نظام الاشتراكات (المرحلة الأولى: أساس الصلاحيات فقط، بلا قفل ميزات
-- بعد). صف واحد لكل مستخدم. is_vip = عضوية دائمة مجانية لا تنتهي أبداً.
-- subscription_end تاريخ تقويمي بسيط (لا وقت ولا منطقة زمنية) يقارَن
-- بالتاريخ المحلي للمستخدم (localDayKey) في الكود، لا UTC.
-- أمان متعمّد: لا توجد أي سياسة insert/update/delete لدور authenticated
-- أدناه، فتُرفض هذه العمليات تلقائياً بمجرد تفعيل RLS — التفعيل يتم
-- حصراً يدوياً من لوحة Supabase (بصلاحية service_role التي تتجاوز RLS).
create table if not exists subscriptions (
  owner              text primary key,
  is_subscriber      boolean not null default false,
  subscription_end   date,
  is_vip             boolean not null default false,
  subscription_type  text check (subscription_type in ('monthly', 'yearly')),
  updated_at         timestamptz default now()
);

-- المرحلة الثانية: قفل فعلي على مستوى قاعدة البيانات، لا بصري فقط —
-- هذا هو المصدر الوحيد للحقيقة على الخادم، مطابق لمنطق isActiveSubscriber()
-- في src/lib/subscription.js من حيث الفكرة (VIP دائم، أو مشترك لم ينتهِ
-- اشتراكه)، لكنه يقارن بتاريخ الخادم (current_date) لأن هذا فحص صلاحية
-- خادم لا عرض واجهة. security definer عمداً: تُستدعى هذه الدالة من داخل
-- سياسات RLS نفسها على جداول لا تملك المستخدم صلاحية قراءة subscriptions
-- الخاصة بغيره أصلاً، لكن الدالة تحتاج قراءة صف اشتراكه هو تحديداً بمعزل
-- عن أي سياسة أخرى قد تمنع ذلك أثناء تقييم شرط آخر.
-- راية عامة واحدة (feature flag) للفتح المجاني المؤقت لكل الميزات لكل
-- المستخدمين (بمن فيهم الضيوف). صف واحد ثابت المعرّف 'global'. قراءة
-- عامة (anon + authenticated) حتى تعمل للضيوف غير المسجّلين أيضاً، لكن
-- بلا أي سياسة insert/update/delete — التبديل يتم حصراً من لوحة Supabase
-- (Table Editor) أو عبر SQL Editor بصلاحية owner/service_role.
create table if not exists app_flags (
  id            text primary key default 'global',
  free_for_all  boolean not null default false,
  updated_at    timestamptz default now()
);
insert into app_flags (id, free_for_all) values ('global', false) on conflict (id) do nothing;

alter table app_flags enable row level security;
drop policy if exists app_flags_public_read on app_flags;
create policy app_flags_public_read on app_flags for select to anon, authenticated using (true);

create or replace function is_active_subscriber(check_owner text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce((select f.free_for_all from app_flags f where f.id = 'global'), false)
    or exists (
      select 1 from subscriptions s
      where s.owner = check_owner
        and (s.is_vip = true or (s.is_subscriber = true and s.subscription_end is not null and s.subscription_end >= current_date))
    );
$$;

-- حدّ 3 مهام و5 فئات للنسخة المجانية — فحص "before insert" فقط (لا
-- يعترض تعديل مهمة/فئة موجودة أصلاً عبر upsert، لأن ON CONFLICT DO
-- UPDATE في Postgres يُشغّل مرحلة BEFORE INSERT أيضاً حتى لو انتهى الأمر
-- تحديثاً لا إدراجاً — لذلك يُستثنى الصف إن كان معرّفه موجوداً سلفاً).
create or replace function enforce_tasks_free_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_active_subscriber(NEW.owner) then
    return NEW;
  end if;
  if exists (select 1 from tasks where id = NEW.id) then
    return NEW;
  end if;
  if (select count(*) from tasks where owner = NEW.owner) >= 3 then
    raise exception 'FREE_TIER_TASK_LIMIT' using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists tasks_free_limit on tasks;
create trigger tasks_free_limit before insert on tasks
  for each row execute function enforce_tasks_free_limit();

create or replace function enforce_categories_free_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_active_subscriber(NEW.owner) then
    return NEW;
  end if;
  if exists (select 1 from categories where owner = NEW.owner and id = NEW.id) then
    return NEW;
  end if;
  if (select count(*) from categories where owner = NEW.owner) >= 5 then
    raise exception 'FREE_TIER_CATEGORY_LIMIT' using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists categories_free_limit on categories;
create trigger categories_free_limit before insert on categories
  for each row execute function enforce_categories_free_limit();

-- ============================================================
-- فهارس الأداء: هذه الجداول مفتاحها الأساسي id فقط (بدون owner)، وكل
-- قراءة تفلتر بـ owner ثم ترتّب بعمود تاريخ — بدون فهرس هنا كل تحميل
-- صفحة يفحص الجدول كاملاً (كل المستخدمين) بدل صف هذا المستخدم فقط.
-- الجداول الأخرى مفهرسة أصلاً لأن owner جزء من مفتاحها الأساسي أو من
-- قيد unique عليها. آمنة لإعادة التشغيل.
-- ============================================================
create index if not exists entries_owner_date on entries (owner, date);
create index if not exists tasks_owner_created on tasks (owner, created_at);
create index if not exists reports_owner_created on reports (owner, created_at);
create index if not exists achieve_owner_created on achieve (owner, created_at);
create index if not exists focus_sessions_owner_created on focus_sessions (owner, created_at);
create index if not exists commitments_owner_created on commitments (owner, created_at);
create index if not exists religious_tasks_owner_created on religious_tasks (owner, created_at);

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

alter table health_profile enable row level security;
drop policy if exists health_profile_anon_solo on health_profile;
drop policy if exists health_profile_user_own on health_profile;
create policy health_profile_user_own on health_profile for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table fitness_profile enable row level security;
drop policy if exists fitness_profile_anon_solo on fitness_profile;
drop policy if exists fitness_profile_user_own on fitness_profile;
create policy fitness_profile_user_own on fitness_profile for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table fitness_log enable row level security;
drop policy if exists fitness_log_anon_solo on fitness_log;
drop policy if exists fitness_log_user_own on fitness_log;
create policy fitness_log_user_own on fitness_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table mental_health_log enable row level security;
drop policy if exists mental_health_log_anon_solo on mental_health_log;
drop policy if exists mental_health_log_user_own on mental_health_log;
create policy mental_health_log_user_own on mental_health_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table nutrition_log enable row level security;
drop policy if exists nutrition_log_anon_solo on nutrition_log;
drop policy if exists nutrition_log_user_own on nutrition_log;
create policy nutrition_log_user_own on nutrition_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

-- قرار هندسي مهم (قابلية التوسع): custom_foods كانت خاصة بكل مستخدم على
-- حدة (كل مستخدم يبني نسخته الخاصة من ذاكرة الباركودات). الآن تصبح قاعدة
-- بيانات منتجات "مُجتمعية" مشتركة - أي منتج يُضاف يدوياً من أي مستخدم
-- يستفيد منه أي مستخدم آخر يبحث بنفس الباركود لاحقاً (كلما كبر عدد
-- المستخدمين، كبرت قاعدة البيانات المشتركة بلا أي جهد إضافي). القراءة
-- عامة لكل مصادَق (SELECT true) بينما الكتابة/التعديل/الحذف تبقى مقتصرة
-- على صاحب الصف فقط (owner) - لا يستطيع مستخدم تعديل أو حذف مساهمة مستخدم
-- آخر. هذا آمن لأن الجدول لا يحوي أصلاً أي بيانات شخصية حساسة عن المُساهِم
-- سوى معرّف owner نفسه (UUID لا يكشف شيئاً بمفرده)، فقط بيانات عامة عن
-- المنتج (اسم، سعرات، ماكروز...).
alter table custom_foods enable row level security;
drop policy if exists custom_foods_anon_solo on custom_foods;
drop policy if exists custom_foods_user_own on custom_foods;
drop policy if exists custom_foods_select_shared on custom_foods;
drop policy if exists custom_foods_write_own on custom_foods;
drop policy if exists custom_foods_update_own on custom_foods;
drop policy if exists custom_foods_delete_own on custom_foods;
create policy custom_foods_select_shared on custom_foods for select to authenticated using (true);
create policy custom_foods_write_own on custom_foods for insert to authenticated with check (owner = auth.uid()::text);
create policy custom_foods_update_own on custom_foods for update to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);
create policy custom_foods_delete_own on custom_foods for delete to authenticated using (owner = auth.uid()::text);

-- جدول مرجعي عام (نفس نمط app_flags): يقرؤه الجميع، ولا يملك أي سياسة
-- insert/update/delete لـ authenticated/anon - يُدار حصراً من SQL Editor.
alter table food_synonyms enable row level security;
drop policy if exists food_synonyms_public_read on food_synonyms;
create policy food_synonyms_public_read on food_synonyms for select to anon, authenticated using (true);

insert into food_synonyms (term_ar, term_en, canonical_term) values
  ('موز', 'banana', 'Banana'),
  ('تفاح', 'apple', 'Apple'),
  ('حليب', 'milk', 'Milk'),
  ('بيض', 'egg', 'Egg'),
  ('دجاج', 'chicken', 'Chicken'),
  ('لحم', 'meat', 'Beef'),
  ('رز', 'rice', 'Rice'),
  ('أرز', 'rice', 'Rice'),
  ('خبز', 'bread', 'Bread'),
  ('تمر', 'dates', 'Dates'),
  ('عدس', 'lentils', 'Lentils'),
  ('برتقال', 'orange', 'Orange'),
  ('بطاطا', 'potato', 'Potato'),
  ('بطاطس', 'potato', 'Potato'),
  ('طماطم', 'tomato', 'Tomato'),
  ('جبن', 'cheese', 'Cheese'),
  ('زبادي', 'yogurt', 'Yogurt'),
  ('سمك', 'fish', 'Fish'),
  ('عسل', 'honey', 'Honey'),
  ('شوفان', 'oats', 'Oats'),
  ('مكسرات', 'nuts', 'Nuts'),
  ('لوز', 'almonds', 'Almonds'),
  ('فراولة', 'strawberry', 'Strawberry'),
  ('عنب', 'grapes', 'Grapes'),
  ('خيار', 'cucumber', 'Cucumber'),
  ('جزر', 'carrot', 'Carrot'),
  ('سبانخ', 'spinach', 'Spinach'),
  ('قهوة', 'coffee', 'Coffee'),
  ('شاي', 'tea', 'Tea'),
  ('عصير', 'juice', 'Juice')
on conflict (term_ar) do nothing;

alter table water_log enable row level security;
drop policy if exists water_log_anon_solo on water_log;
drop policy if exists water_log_user_own on water_log;
create policy water_log_user_own on water_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

-- المرحلة الثانية: "أنجز" ميزة مدفوعة — لا يكفي إخفاؤها في الواجهة، إذ
-- يستطيع مستخدم غير مشترك يتلاعب بالطلبات مباشرة القراءة/الكتابة هنا
-- لولا هذا الشرط في RLS نفسه.
alter table achieve enable row level security;
drop policy if exists achieve_anon_solo on achieve;
drop policy if exists achieve_user_own on achieve;
create policy achieve_user_own on achieve for all to authenticated
  using (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text))
  with check (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text));

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

-- المرحلة الثانية: "مساعد" ميزة مدفوعة (نفس مبرر achieve أعلاه).
alter table chat_messages enable row level security;
drop policy if exists chat_messages_anon_solo on chat_messages;
drop policy if exists chat_messages_user_own on chat_messages;
create policy chat_messages_user_own on chat_messages for all to authenticated
  using (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text))
  with check (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text));

alter table adhkar_progress enable row level security;
drop policy if exists adhkar_progress_anon_solo on adhkar_progress;
drop policy if exists adhkar_progress_user_own on adhkar_progress;
create policy adhkar_progress_user_own on adhkar_progress for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

alter table tips_log enable row level security;
drop policy if exists tips_log_anon_solo on tips_log;
drop policy if exists tips_log_user_own on tips_log;
create policy tips_log_user_own on tips_log for all to authenticated using (owner = auth.uid()::text) with check (owner = auth.uid()::text);

-- المرحلة الثانية: "أهداف" ميزة مدفوعة (نفس مبرر achieve أعلاه).
alter table goals enable row level security;
drop policy if exists goals_anon_solo on goals;
drop policy if exists goals_user_own on goals;
create policy goals_user_own on goals for all to authenticated
  using (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text))
  with check (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text));

-- المرحلة الثانية: "خزنة" ميزة مدفوعة (نفس مبرر achieve أعلاه).
alter table vault enable row level security;
drop policy if exists vault_anon_solo on vault;
drop policy if exists vault_user_own on vault;
create policy vault_user_own on vault for all to authenticated
  using (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text))
  with check (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text));

alter table vault_transactions enable row level security;
drop policy if exists vault_transactions_anon_solo on vault_transactions;
drop policy if exists vault_transactions_user_own on vault_transactions;
create policy vault_transactions_user_own on vault_transactions for all to authenticated
  using (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text))
  with check (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text));

-- المرحلة الثانية: تتبّع النوم (ضمن "التقارير") ميزة مدفوعة (نفس مبرر
-- achieve أعلاه). ملاحظة: entries/focus_sessions/categories التي
-- تعرضها بقية "التقارير" تبقى بلا قفل RLS لأنها مشتركة مع ميزات مجانية
-- (اليوم، تركيز)، فالقفل هناك يكون في الواجهة فقط، لا هنا.
alter table sleep_log enable row level security;
drop policy if exists sleep_log_anon_solo on sleep_log;
drop policy if exists sleep_log_user_own on sleep_log;
create policy sleep_log_user_own on sleep_log for all to authenticated
  using (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text))
  with check (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text));

-- عمداً: سياسة قراءة فقط، بلا أي "with check" أو سياسة insert/update/
-- delete — المستخدم يرى حالة اشتراكه ولا يقدر يعدّلها بأي شكل من
-- الواجهة أو الشبكة مهما فعل، لا الآن ولا لاحقاً ما دامت هذه السياسة
-- الوحيدة قائمة.
alter table subscriptions enable row level security;
drop policy if exists subscriptions_anon_solo on subscriptions;
drop policy if exists subscriptions_select_own on subscriptions;
create policy subscriptions_select_own on subscriptions for select to authenticated using (owner = auth.uid()::text);

-- =====================================================================
-- "جروبات الدراسة" (تحديات اجتماعية) — أول ميزة تشارك بيانات بين مستخدمين
-- في مسار. مبدأ التصميم الأمني: RLS وحدها لا تكفي لتقييد "أعمدة" معيّنة
-- (RLS تقيّد صفوفاً فقط) — لذا بدل منح أعضاء الجروب صلاحية قراءة مباشرة
-- على focus_sessions/fitness_log/profile (وهذا كان سيكشف كل عمود فيها:
-- ملاحظات، فئات، عن نفسي، هوايات...)، نُنشئ جدولين "مرآة" ضيّقين جداً
-- (group_daily_stats و group_shared_profile) لا يحتويان فعلياً على أي
-- عمود سوى الاسم/دقائق الدراسة/إنجاز الرياضة، ونُبقيهما متزامنين تلقائياً
-- عبر Triggers من الجداول الحقيقية. هكذا حتى لو نفّذ أحد استعلاماً مباشراً
-- (select *) على هذه الجداول، لا يوجد فيها أصلاً أي بيانات حساسة ليراها.
-- =====================================================================

create table if not exists study_groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  owner        text not null,
  invite_code  text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_at   timestamptz default now()
);

create table if not exists group_members (
  group_id     uuid not null references study_groups(id) on delete cascade,
  member_owner text not null,
  joined_at    timestamptz default now(),
  primary key (group_id, member_owner)
);

-- جدولا "مرآة" ضيّقان: كل عمود فيهما مُصرَّح بمشاركته صراحة في الطلب. لا
-- سياسة insert/update/delete لهما أدناه عمداً — الكتابة الوحيدة المسموحة
-- فيهما تأتي من Triggers أمنية (security definer) تتجاوز RLS داخلياً، لذا
-- لا يقدر أي مستخدم (ولا حتى صاحب الصف نفسه) الكتابة المباشرة فيهما.
create table if not exists group_shared_profile (
  owner       text primary key,
  name        text default '',
  updated_at  timestamptz default now()
);

create table if not exists group_daily_stats (
  owner          text not null,
  date           text not null,
  study_minutes  integer not null default 0,
  workout_done   boolean not null default false,
  updated_at     timestamptz default now(),
  primary key (owner, date)
);

-- عند إنشاء جروب، يُضاف صاحبه كعضو أول تلقائياً.
create or replace function add_group_owner_as_member()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into group_members (group_id, member_owner) values (new.id, new.owner);
  return new;
end;
$$;
drop trigger if exists study_groups_add_owner on study_groups;
create trigger study_groups_add_owner
  after insert on study_groups
  for each row execute function add_group_owner_as_member();

-- الحد الأقصى 10 أعضاء لكل جروب. security definer ضروري هنا: بدونه، عدّ
-- الأعضاء الحاليين قد يفشل بصمت بسبب RLS على group_members نفسه (المستخدم
-- المنضم حديثاً لا يملك بعد صلاحية رؤية أعضاء الجروب).
create or replace function enforce_group_member_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  current_count integer;
begin
  select count(*) into current_count from group_members where group_id = new.group_id;
  if current_count >= 10 then
    raise exception 'GROUP_MEMBER_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists group_members_limit on group_members;
create trigger group_members_limit
  before insert on group_members
  for each row execute function enforce_group_member_limit();

-- مزامنة الاسم من profile.name إلى المرآة العامة عند أي تغيير له فقط.
create or replace function sync_group_shared_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into group_shared_profile (owner, name, updated_at)
  values (new.owner, new.name, now())
  on conflict (owner) do update set name = excluded.name, updated_at = now();
  return new;
end;
$$;
drop trigger if exists profile_sync_group_shared on profile;
create trigger profile_sync_group_shared
  after insert or update of name on profile
  for each row execute function sync_group_shared_profile();

-- مزامنة مجموع دقائق التركيز/الدراسة لليوم المتأثر من focus_sessions
-- (إضافة/تعديل/حذف جلسة تُعيد حساب المجموع الصحيح لذلك اليوم فقط).
create or replace function sync_group_daily_stats_focus()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target_owner text := coalesce(new.owner, old.owner);
  target_date  text := coalesce(new.date, old.date);
  total_minutes integer;
begin
  select coalesce(sum(minutes), 0) into total_minutes
  from focus_sessions where owner = target_owner and date = target_date;

  insert into group_daily_stats (owner, date, study_minutes, updated_at)
  values (target_owner, target_date, total_minutes, now())
  on conflict (owner, date) do update set study_minutes = excluded.study_minutes, updated_at = now();
  return coalesce(new, old);
end;
$$;
drop trigger if exists focus_sessions_sync_group_stats on focus_sessions;
create trigger focus_sessions_sync_group_stats
  after insert or update or delete on focus_sessions
  for each row execute function sync_group_daily_stats_focus();

-- مزامنة حالة إنجاز تمرين اليوم من fitness_log لنفس اليوم المتأثر فقط.
create or replace function sync_group_daily_stats_fitness()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target_owner text := coalesce(new.owner, old.owner);
  target_date  text := coalesce(new.date, old.date);
  is_done boolean;
begin
  select coalesce(day_completed, false) into is_done
  from fitness_log where owner = target_owner and date = target_date;

  insert into group_daily_stats (owner, date, workout_done, updated_at)
  values (target_owner, target_date, coalesce(is_done, false), now())
  on conflict (owner, date) do update set workout_done = excluded.workout_done, updated_at = now();
  return coalesce(new, old);
end;
$$;
drop trigger if exists fitness_log_sync_group_stats on fitness_log;
create trigger fitness_log_sync_group_stats
  after insert or update or delete on fitness_log
  for each row execute function sync_group_daily_stats_fitness();

-- تعبئة أولية (Backfill) لمرة واحدة: الـTriggers أعلاه تُزامن فقط عند أي
-- كتابة جديدة على profile/focus_sessions/fitness_log بعد هذه اللحظة. بدون
-- هذا الـBackfill، مستخدم حالي لديه اسم محفوظ مسبقاً أو نشاط اليوم مسجَّل
-- مسبقاً لن يظهر اسمه/رقمه في أي جروب حتى يُعدِّل ملفه أو يسجّل نشاطاً
-- جديداً اليوم. آمن لإعادة التنفيذ (on conflict do update).
insert into group_shared_profile (owner, name, updated_at)
select owner, name, now() from profile where name is not null and name <> ''
on conflict (owner) do update set name = excluded.name, updated_at = now();

insert into group_daily_stats (owner, date, study_minutes, updated_at)
select owner, date, coalesce(sum(minutes), 0), now()
from focus_sessions group by owner, date
on conflict (owner, date) do update set study_minutes = excluded.study_minutes, updated_at = now();

insert into group_daily_stats (owner, date, workout_done, updated_at)
select owner, date, coalesce(day_completed, false), now()
from fitness_log
on conflict (owner, date) do update set workout_done = excluded.workout_done, updated_at = now();

-- عرض معلومات جروب (الاسم فقط) بحسب رمز الدعوة قبل الانضمام إليه فعلياً.
-- لازم كدالة security definer ضيّقة بدل تخفيف RLS على study_groups نفسه:
-- تجاوز RLS هنا آمن لأنها لا تُعيد سوى id/name، ولا تكشف أي جروب لا يملك
-- الطالب رمز دعوته الصحيح (البحث بالتساوي التام على invite_code فقط).
create or replace function get_group_by_invite_code(code text)
returns table(id uuid, name text)
language sql security definer set search_path = public stable
as $$
  select sg.id, sg.name from study_groups sg where sg.invite_code = code;
$$;

-- دالتا مساعدة (security definer) لفحص العضوية داخل سياسات RLS نفسها.
-- السبب: أي سياسة RLS على group_members تستعلم على group_members نفسه
-- (لمعرفة "هل أنا عضو في هذا الجروب؟") تسبب "infinite recursion detected
-- in policy" فعلياً عند التنفيذ — تحقّقنا من هذا محلياً، وليس افتراضاً
-- نظرياً: لأن أي سياسة permissive إضافية تُقيَّم دائماً (لا يوجد "قصر
-- تقييم" عند أول سياسة تنطبق)، فتقييم سياسة "أرى زملائي" يستدعي استعلاماً
-- جديداً على نفس الجدول، الذي يُعاد تقييم سياساته بما فيها نفس السياسة،
-- إلخ إلى ما لا نهاية. الحل: تفويض فحص العضوية لدالة security definer
-- (تُنفَّذ بصلاحية مالكها الذي يتجاوز RLS تلقائياً بلا حاجة لتفعيل أي شيء
-- إضافي، تماماً كبقية الدوال أعلاه)، بحيث لا تتكرر RLS داخل تنفيذها.
create or replace function is_group_member(p_group_id uuid, p_owner text)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (select 1 from group_members where group_id = p_group_id and member_owner = p_owner);
$$;

create or replace function shares_group_with(p_owner text)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from group_members gm1 join group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.member_owner = auth.uid()::text and gm2.member_owner = p_owner
  );
$$;

alter table study_groups enable row level security;
drop policy if exists study_groups_select on study_groups;
create policy study_groups_select on study_groups for select to authenticated
  using (owner = auth.uid()::text or is_group_member(study_groups.id, auth.uid()::text));
drop policy if exists study_groups_insert on study_groups;
create policy study_groups_insert on study_groups for insert to authenticated
  with check (owner = auth.uid()::text and is_active_subscriber(auth.uid()::text));
drop policy if exists study_groups_update on study_groups;
create policy study_groups_update on study_groups for update to authenticated
  using (owner = auth.uid()::text) with check (owner = auth.uid()::text);
drop policy if exists study_groups_delete on study_groups;
create policy study_groups_delete on study_groups for delete to authenticated
  using (owner = auth.uid()::text);

-- سياسة رؤية واحدة فقط (عبر الدالة أعلاه) بدل EXISTS ذاتي على نفس الجدول،
-- تفادياً لخطأ "infinite recursion detected in policy" الموضّح أعلاه.
alter table group_members enable row level security;
drop policy if exists group_members_select_self on group_members;
drop policy if exists group_members_select_peers on group_members;
drop policy if exists group_members_select on group_members;
create policy group_members_select on group_members for select to authenticated
  using (is_group_member(group_id, auth.uid()::text));
drop policy if exists group_members_insert on group_members;
create policy group_members_insert on group_members for insert to authenticated
  with check (member_owner = auth.uid()::text and is_active_subscriber(auth.uid()::text));
drop policy if exists group_members_delete_self on group_members;
create policy group_members_delete_self on group_members for delete to authenticated
  using (member_owner = auth.uid()::text);
drop policy if exists group_members_delete_owner on group_members;
create policy group_members_delete_owner on group_members for delete to authenticated
  using (exists (select 1 from study_groups sg where sg.id = group_members.group_id and sg.owner = auth.uid()::text));

-- كلا الجدولين أدناه: "يرى صفّه" أو "يرى صفّ أي شخص يشاركه جروباً واحداً
-- على الأقل" (عبر shares_group_with، لنفس سبب تفادي التكرار أعلاه) — لا
-- سياسة insert/update/delete لـ authenticated إطلاقاً (الكتابة عبر
-- Triggers الأمنية أعلاه فقط).
alter table group_shared_profile enable row level security;
drop policy if exists group_shared_profile_select on group_shared_profile;
create policy group_shared_profile_select on group_shared_profile for select to authenticated
  using (owner = auth.uid()::text or shares_group_with(owner));

alter table group_daily_stats enable row level security;
drop policy if exists group_daily_stats_select on group_daily_stats;
create policy group_daily_stats_select on group_daily_stats for select to authenticated
  using (owner = auth.uid()::text or shares_group_with(owner));

-- تفعيل التحديث اللحظي (Realtime) فقط على جدول الإحصائيات — لا حاجة له
-- على الأسماء (نادراً ما تتغيّر) ولا على جداول الجروب/العضوية نفسها.
-- ملفوفة بفحص وجود مسبق لأن ALTER PUBLICATION لا يدعم IF NOT EXISTS، حتى
-- يبقى هذا الملف قابلاً لإعادة التنفيذ بأمان كبقية الملف.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_daily_stats'
  ) then
    alter publication supabase_realtime add table group_daily_stats;
  end if;
end $$;

-- منح صريح لصلاحية تنفيذ الدوال القابلة للاستدعاء من العميل مباشرة (RPC)
-- لدوري anon/authenticated. عادة Postgres يمنح EXECUTE لـPUBLIC تلقائياً
-- عند إنشاء أي دالة، وanon/authenticated يرثان ذلك ضمناً - لكن هذا منح
-- صريح احترازي لا يعتمد على هذا السلوك الافتراضي، تحسّباً لأي مشروع طُبِّق
-- عليه تشديد أمني يزيل صلاحيات PUBLIC الافتراضية عن الدوال الجديدة.
grant execute on function get_group_by_invite_code(text) to anon, authenticated;
grant execute on function is_group_member(uuid, text) to authenticated;
grant execute on function shares_group_with(text) to authenticated;

-- إجبار طبقة PostgREST (التي تُعرِّض RPC عبر supabase.rpc(...)) على إعادة
-- تحميل ذاكرتها المؤقتة للمخطط فوراً، بدل انتظار إعادة التحميل التلقائية
-- (تحدث عادة خلال ثوانٍ، لكن قد تتأخر) - يضمن أن get_group_by_invite_code
-- الجديدة معروفة لدى واجهة الـAPI فور تنفيذ هذا الملف مباشرة.
notify pgrst, 'reload schema';
