import { supabase, hasSupabase } from "./supabase";

let CURRENT_OWNER = "solo";
export function setOwner(id) { CURRENT_OWNER = id || "solo"; }
export function getOwner() { return CURRENT_OWNER; }

// Anonymous ("solo") users never touch Supabase: their data stays local-only,
// so guests never read or write another guest's cloud data.
function useCloud() {
  return hasSupabase && CURRENT_OWNER !== "solo";
}

// راية الفتح المجاني المؤقت لكل الميزات (app_flags.free_for_all). تُفحص
// بمعزل عن useCloud() عمداً — يجب أن تعمل حتى للضيوف غير المسجّلين، لا
// فقط للمستخدمين المرتبطين بحساب سحابي. القراءة عامة (anon) بحسب سياسة
// RLS على الجدول، فتنجح دون أي تسجيل دخول.
async function isFreeForAllActive() {
  if (!hasSupabase) return false;
  try {
    const { data, error } = await supabase.from("app_flags").select("free_for_all").eq("id", "global").maybeSingle();
    if (error || !data) return false;
    return !!data.free_for_all;
  } catch {
    return false;
  }
}

const LS = {
  categories: "masar_categories",
  entries: "masar_entries",
  tasks: "masar_tasks",
  reports: "masar_reports",
  gamify: "masar_gamify",
};

function nsKey(key) {
  return CURRENT_OWNER === "solo" ? key : `${key}::${CURRENT_OWNER}`;
}
function lsGet(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(nsKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(nsKey(key), JSON.stringify(value));
  } catch (e) {
    console.error("localStorage set failed", key, e);
  }
}

// تاريخ "قبل n يوماً" بصيغة YYYY-MM-DD (توقيت محلي)، يُستخدم لتقييد جلب
// السجلات التي تُستهلك دائماً ضمن نافذة زمنية محدودة فقط في الواجهة (لا
// ميزة تصفّح تاريخي أو حساب سلسلة/streak تعتمد عليها بالكامل)، بدل جلب كل
// الصفوف المتراكمة منذ إنشاء الحساب في كل تحميل.
function isoDateDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DEFAULT_CATEGORIES = [
  { id: "prayer", name: "الصلاة", color: "#5FA8A0" },
  { id: "study", name: "الدراسة", color: "#8A7BD1" },
  { id: "reading", name: "القراءة", color: "#C9A24B" },
  { id: "learning", name: "التعلم", color: "#6FA8DC" },
];

const fromDbEntry = (r) => ({ id: r.id, date: r.date, catId: r.cat_id, start: r.start_time, end: r.end_time, note: r.note || "" });
const toDbEntry = (e) => ({ id: e.id, date: e.date, cat_id: e.catId, start_time: e.start, end_time: e.end, note: e.note || "", owner: CURRENT_OWNER });
const fromDbTask = (r) => ({ id: r.id, title: r.title, catId: r.cat_id, due: r.due, done: r.done, created: r.created_at });
const toDbTask = (t) => ({ id: t.id, title: t.title, cat_id: t.catId, due: t.due || null, done: !!t.done, owner: CURRENT_OWNER });
const fromDbGroup = (g) => ({
  id: g.id, name: g.name, owner: g.owner, inviteCode: g.invite_code, createdAt: g.created_at,
  inviteMaxUses: g.invite_max_uses, inviteUsesCount: g.invite_uses_count, inviteExpiresAt: g.invite_expires_at,
});

export const store = {
  get hasCloud() {
    return useCloud();
  },

  async loadCategories() {
    const seededKey = "masar_categories_seeded";
    if (!useCloud()) {
      const local = lsGet(LS.categories, null);
      if (local) return local;
      lsSet(LS.categories, DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    const { data, error } = await supabase.from("categories").select("*").eq("owner", CURRENT_OWNER).order("created_at");
    if (error || !data) return lsGet(LS.categories, DEFAULT_CATEGORIES);
    if (data.length > 0) {
      const cloudCats = data.map((r) => ({ id: r.id, name: r.name, color: r.color }));
      lsSet(LS.categories, cloudCats);
      lsSet(seededKey, true);
      return cloudCats;
    }
    // Cloud has zero rows: either this account was already seeded and the
    // user deliberately deleted every category (respect that, return empty),
    // or this is the very first time we're loading for this account (seed
    // the defaults once and persist them so this branch won't fire again).
    if (lsGet(seededKey, false)) {
      lsSet(LS.categories, []);
      return [];
    }
    lsSet(LS.categories, DEFAULT_CATEGORIES);
    lsSet(seededKey, true);
    for (const cat of DEFAULT_CATEGORIES) {
      const { error: seedError } = await supabase.from("categories").upsert(
        { id: cat.id, name: cat.name, color: cat.color, owner: CURRENT_OWNER },
        { onConflict: "owner,id" }
      );
      if (seedError) console.error("[loadCategories] seed error:", seedError.message);
    }
    return DEFAULT_CATEGORIES;
  },
  // Returns {ok, error} so callers can tell a silent cloud failure apart from
  // success — a caller that always assumes success can show a "saved" toast
  // for a write that never actually landed, then have it vanish on refresh.
  async saveCategory(cat) {
    const local = lsGet(LS.categories, DEFAULT_CATEGORIES);
    const next = local.some((c) => c.id === cat.id) ? local.map((c) => (c.id === cat.id ? cat : c)) : [...local, cat];
    lsSet(LS.categories, next);
    if (useCloud()) {
      lsSet("masar_categories_seeded", true);
      const { error } = await supabase.from("categories").upsert(
        { id: cat.id, name: cat.name, color: cat.color, owner: CURRENT_OWNER },
        { onConflict: "owner,id" }
      );
      if (error) { console.error("[saveCategory] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async deleteCategory(id) {
    const local = lsGet(LS.categories, DEFAULT_CATEGORIES).filter((c) => c.id !== id);
    lsSet(LS.categories, local);
    if (useCloud()) {
      lsSet("masar_categories_seeded", true);
      const { error } = await supabase.from("categories").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) { console.error("[deleteCategory] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadEntries() {
    const local = lsGet(LS.entries, []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("entries").select("*").eq("owner", CURRENT_OWNER).order("date");
    if (error || !data) return local;
    const entries = data.map(fromDbEntry);
    lsSet(LS.entries, entries);
    return entries;
  },
  async saveEntry(entry) {
    const local = lsGet(LS.entries, []);
    const next = local.some((e) => e.id === entry.id) ? local.map((e) => (e.id === entry.id ? entry : e)) : [...local, entry];
    lsSet(LS.entries, next);
    if (useCloud()) {
      const { error } = await supabase.from("entries").upsert(toDbEntry(entry));
      if (error) { console.error("[saveEntry] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async deleteEntry(id) {
    lsSet(LS.entries, lsGet(LS.entries, []).filter((e) => e.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("entries").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) { console.error("[deleteEntry] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadTasks() {
    const local = lsGet(LS.tasks, []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("tasks").select("*").eq("owner", CURRENT_OWNER).order("created_at");
    if (error || !data) return local;
    const tasks = data.map(fromDbTask);
    lsSet(LS.tasks, tasks);
    return tasks;
  },
  async saveTask(task) {
    const local = lsGet(LS.tasks, []);
    const next = local.some((t) => t.id === task.id) ? local.map((t) => (t.id === task.id ? task : t)) : [...local, task];
    lsSet(LS.tasks, next);
    if (useCloud()) {
      const { error } = await supabase.from("tasks").upsert(toDbTask(task));
      if (error) { console.error("[saveTask] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async deleteTask(id) {
    lsSet(LS.tasks, lsGet(LS.tasks, []).filter((t) => t.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("tasks").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) { console.error("[deleteTask] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadReports() {
    const local = lsGet(LS.reports, []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("reports").select("*").eq("owner", CURRENT_OWNER).order("created_at", { ascending: false });
    if (error || !data) return local;
    const reports = data.map((r) => ({ id: r.id, kind: r.kind, date: r.date, payload: r.payload, gist: r.gist }));
    lsSet(LS.reports, reports);
    return reports;
  },
  async saveReport(report) {
    const local = lsGet(LS.reports, []);
    lsSet(LS.reports, [report, ...local]);
    if (useCloud()) {
      const { error } = await supabase.from("reports").upsert({ id: report.id, kind: report.kind, date: report.date, payload: report.payload, gist: report.gist, owner: CURRENT_OWNER });
      if (error) { console.error("[saveReport] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  // قراءة متزامنة فورية (لا تنتظر Supabase) لتطبيق المظهر قبل أول رسم
  // للصفحة، فلا يظهر ومضة بالمظهر الخاطئ قبل اكتمال loadProfile().
  getLocalTheme() {
    return lsGet("masar_profile", { theme: "dark" }).theme === "light" ? "light" : "dark";
  },
  // نفس فكرة getLocalTheme لكن للغة الواجهة — تُقرأ متزامنة عند تهيئة
  // i18next (قبل أول رسم) حتى لا تظهر ومضة باللغة الافتراضية قبل تطبيق
  // تفضيل المستخدم الفعلي.
  getLocalLanguage() {
    return lsGet("masar_profile", { language: "ar" }).language === "en" ? "en" : "ar";
  },
  // نفس فكرة getLocalTheme لثلاثة إعدادات إتاحة الوصول - تُقرأ متزامنة قبل
  // أول رسم حتى لا تظهر ومضة بلا تباعد/تباين/حجم خط قبل اكتمال loadProfile().
  getLocalFontSize() {
    const v = lsGet("masar_profile", { fontSize: "normal" }).fontSize;
    return ["normal", "large", "xlarge"].includes(v) ? v : "normal";
  },
  getLocalHighContrast() {
    return !!lsGet("masar_profile", { highContrast: false }).highContrast;
  },
  getLocalSpacious() {
    return !!lsGet("masar_profile", { spacious: false }).spacious;
  },
  // قراءة متزامنة لمفتاح المؤثرات الصوتية - تُستخدم من src/lib/sound.js قبل
  // كل تشغيل صوت، حتى لا يحتاج كل موضع استدعاء (تسجيل صلاة، إكمال هدف...)
  // معرفة هذا الإعداد أو تمريره كخاصية.
  getLocalSoundEnabled() {
    return !!lsGet("masar_profile", { soundEnabled: false }).soundEnabled;
  },
  async loadProfile() {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("profile").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
    if (error || !data) return local;
    const p = {
      name: data.name || "", about: data.about || "", hobbies: data.hobbies || "", field: data.field || "",
      tourSeen: !!data.tour_seen, theme: data.theme === "light" ? "light" : "dark",
      notificationsEnabled: !!data.notifications_enabled, notificationsAsked: !!data.notifications_asked,
      language: data.language === "en" ? "en" : "ar",
      fontSize: ["normal", "large", "xlarge"].includes(data.font_size) ? data.font_size : "normal",
      highContrast: !!data.high_contrast, spacious: !!data.spacious,
      customColorsEnabled: !!data.custom_colors_enabled,
      sectionColors: (data.section_colors && typeof data.section_colors === "object") ? data.section_colors : {},
      soundEnabled: !!data.sound_enabled,
    };
    lsSet("masar_profile", p);
    return p;
  },
  async saveProfile(p) {
    lsSet("masar_profile", p);
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, name: p.name, about: p.about, hobbies: p.hobbies, field: p.field, updated_at: new Date().toISOString() });
      if (error) console.error("[saveProfile] Supabase error:", error.message);
    }
  },
  async saveTourSeen(seen) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, tourSeen: seen });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, tour_seen: seen, updated_at: new Date().toISOString() });
      if (error) console.error("[saveTourSeen] Supabase error:", error.message);
    }
  },
  async saveTheme(theme) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, theme });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, theme, updated_at: new Date().toISOString() });
      if (error) console.error("[saveTheme] Supabase error:", error.message);
    }
  },
  async saveLanguage(language) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, language });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, language, updated_at: new Date().toISOString() });
      if (error) console.error("[saveLanguage] Supabase error:", error.message);
    }
  },
  async saveFontSize(fontSize) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, fontSize });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, font_size: fontSize, updated_at: new Date().toISOString() });
      if (error) { console.error("[saveFontSize] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async saveHighContrast(highContrast) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, highContrast });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, high_contrast: highContrast, updated_at: new Date().toISOString() });
      if (error) { console.error("[saveHighContrast] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async saveSpacious(spacious) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, spacious });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, spacious, updated_at: new Date().toISOString() });
      if (error) { console.error("[saveSpacious] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async saveCustomColorsEnabled(enabled) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, customColorsEnabled: enabled });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, custom_colors_enabled: enabled, updated_at: new Date().toISOString() });
      if (error) { console.error("[saveCustomColorsEnabled] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async saveSectionColors(sectionColors) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, sectionColors });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, section_colors: sectionColors, updated_at: new Date().toISOString() });
      if (error) { console.error("[saveSectionColors] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async saveSoundEnabled(enabled) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, soundEnabled: enabled });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, sound_enabled: enabled, updated_at: new Date().toISOString() });
      if (error) { console.error("[saveSoundEnabled] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  // enabled: هل الاشتراك في الإشعارات مفعّل الآن. asked: هل عُرض على
  // المستخدم طلب الإذن ولو مرة (سواء وافق أو رفض) — حتى لا يُسأل مجدداً.
  async saveNotificationsPreference(enabled, asked) {
    const local = lsGet("masar_profile", { name: "", about: "", hobbies: "", field: "", tourSeen: false, theme: "dark", notificationsEnabled: false, notificationsAsked: false, language: "ar", fontSize: "normal", highContrast: false, spacious: false, customColorsEnabled: false, sectionColors: {}, soundEnabled: false });
    lsSet("masar_profile", { ...local, notificationsEnabled: enabled, notificationsAsked: asked });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({
        owner: CURRENT_OWNER, notifications_enabled: enabled, notifications_asked: asked, updated_at: new Date().toISOString(),
      });
      if (error) console.error("[saveNotificationsPreference] Supabase error:", error.message);
    }
  },

  // بيانات قسم "أنت" الصحية (الطول/الوزن/العمر/الجنس/النشاط/الحالات
  // الصحية) والقيم المحسوبة منها (BMI/IBW/REE/TEE) — صف واحد لكل مستخدم،
  // بنفس نمط جدول profile.
  async loadHealthProfile() {
    const local = lsGet("masar_health_profile", {
      heightCm: null, weightKg: null, age: null, gender: null, activityLevel: null, conditions: [],
      bmi: null, bmiCategory: null, ibw: null, ree: null, tee: null,
    });
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("health_profile").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
      if (error || !data) return local;
      const result = {
        heightCm: data.height_cm, weightKg: data.weight_kg, age: data.age, gender: data.gender,
        activityLevel: data.activity_level, conditions: data.conditions || [],
        bmi: data.bmi, bmiCategory: data.bmi_category, ibw: data.ibw_kg, ree: data.ree, tee: data.tee,
      };
      lsSet("masar_health_profile", result);
      return result;
    } catch (e) { console.error("[loadHealthProfile] read failed:", e); return local; }
  },
  async saveHealthProfile(p) {
    lsSet("masar_health_profile", p);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("health_profile").upsert({
          owner: CURRENT_OWNER,
          height_cm: p.heightCm, weight_kg: p.weightKg, age: p.age, gender: p.gender,
          activity_level: p.activityLevel, conditions: p.conditions || [],
          bmi: p.bmi, bmi_category: p.bmiCategory, ibw_kg: p.ibw, ree: p.ree, tee: p.tee,
          updated_at: new Date().toISOString(),
        });
        if (error) { console.error("[saveHealthProfile] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveHealthProfile] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  // قسم "الرياضة": إعداد أولي (هدف/معدات/أيام أسبوعياً) + سجل بسيط لأيام
  // التمرين المكتملة (تاريخ واحد لكل يوم، بلا ربط بيوم مُحدَّد من الخطة).
  async loadFitnessProfile() {
    const local = lsGet("masar_fitness_profile", { goal: null, equipment: null, daysPerWeek: null });
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("fitness_profile").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
      if (error || !data) return local;
      const result = { goal: data.goal, equipment: data.equipment, daysPerWeek: data.days_per_week };
      lsSet("masar_fitness_profile", result);
      return result;
    } catch (e) { console.error("[loadFitnessProfile] read failed:", e); return local; }
  },
  async saveFitnessProfile(p) {
    lsSet("masar_fitness_profile", p);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("fitness_profile").upsert({
          owner: CURRENT_OWNER, goal: p.goal, equipment: p.equipment, days_per_week: p.daysPerWeek,
          updated_at: new Date().toISOString(),
        });
        if (error) { console.error("[saveFitnessProfile] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveFitnessProfile] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  async loadFitnessLog() {
    const local = lsGet("masar_fitness_log", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("fitness_log").select("*").eq("owner", CURRENT_OWNER);
      if (error || !data) return local;
      const log = {};
      data.forEach((r) => { log[r.date] = !!r.day_completed; });
      lsSet("masar_fitness_log", log);
      return log;
    } catch (e) { console.error("[loadFitnessLog] read failed:", e); return local; }
  },
  async saveFitnessDayCompleted(date, completed) {
    const local = lsGet("masar_fitness_log", {});
    lsSet("masar_fitness_log", { ...local, [date]: completed });
    if (useCloud()) {
      try {
        const { error } = await supabase.from("fitness_log").upsert(
          { owner: CURRENT_OWNER, date, day_completed: completed, updated_at: new Date().toISOString() },
          { onConflict: "owner,date" },
        );
        if (error) { console.error("[saveFitnessDayCompleted] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveFitnessDayCompleted] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  // قسم "الصحة النفسية": تسجيل يومي واحد لكل يوم (مزاج/توتر/طاقة/ملاحظة
  // + علم flagged_risk عند اكتشاف كلمات خطر في الملاحظة).
  async loadMentalHealthLog() {
    const local = lsGet("masar_mental_health_log", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("mental_health_log").select("*").eq("owner", CURRENT_OWNER);
      if (error || !data) return local;
      const log = {};
      data.forEach((r) => {
        log[r.date] = { mood: r.mood, stress: r.stress, energy: r.energy, note: r.note || "", flaggedRisk: !!r.flagged_risk };
      });
      lsSet("masar_mental_health_log", log);
      return log;
    } catch (e) { console.error("[loadMentalHealthLog] read failed:", e); return local; }
  },
  async saveMentalHealthEntry(date, entry) {
    const local = lsGet("masar_mental_health_log", {});
    lsSet("masar_mental_health_log", { ...local, [date]: entry });
    if (useCloud()) {
      try {
        const { error } = await supabase.from("mental_health_log").upsert(
          {
            owner: CURRENT_OWNER, date, mood: entry.mood, stress: entry.stress, energy: entry.energy,
            note: entry.note || null, flagged_risk: !!entry.flaggedRisk, updated_at: new Date().toISOString(),
          },
          { onConflict: "owner,date" },
        );
        if (error) { console.error("[saveMentalHealthEntry] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveMentalHealthEntry] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  // قسم "التغذية": سجل الطعام اليومي، ذاكرة الإدخالات اليدوية للباركود
  // (مشتركة الآن بين كل المستخدمين، انظر التعليق عند saveCustomFood)،
  // وسجل أكواب الماء.
  // ملاحظة مهمة (خلل حقيقي وُجد وأُصلح): كانت loadNutritionLog تكتب فوق
  // الذاكرة المحلية بأي رد ناجح من Supabase حتى لو رجع صفوفاً أقل مما هو
  // متوقع، وكانت addNutritionEntry لا تُرجع أي نتيجة للمستدعي - فإن فشل
  // الإدخال فعلياً في القاعدة (خطأ RLS، أو عمود غير موجود بعد لم يُنفَّذ
  // تعديله على القاعدة الحقيقية بعد) كان يُسجَّل في console فقط، بينما تبقى
  // الواجهة تُظهر "أُضيف بنجاح" لأن التحديث المتفائل للحالة المحلية سبق
  // التحقق من نجاح الحفظ فعلياً. فيظهر السجل فوراً، ثم يختفي عند أول تحديث
  // للصفحة لأن التحميل التالي يقرأ من القاعدة الحقيقية التي لم تستلم الصف
  // أصلاً. أصبحت الآن addNutritionEntry تُرجع { ok, error } صريحاً،
  // والمستدعي (NutritionView) يتراجع عن التحديث المتفائل ويُظهر خطأً حقيقياً
  // للمستخدم بدل رسالة نجاح مضلِّلة عند أي فشل فعلي.
  // مقيَّدة بآخر 90 يوماً: كل استهلاك فعلي لهذا السجل في التطبيق (التغذية،
  // ومساعد الذكاء الاصطناعي) يُصفّي دائماً على "اليوم" فقط ولا توجد أي ميزة
  // تصفّح تاريخي أو حساب سلسلة/streak تعتمد على سجل التغذية الكامل - لذا هذا
  // القيد لا يغيّر أي سلوك ظاهر للمستخدم، ويمنع فقط تراكم جلب صفوف لن
  // تُستخدم فعلياً مع مرور الأشهر.
  async loadNutritionLog() {
    const local = lsGet("masar_nutrition_log", []);
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("nutrition_log").select("*").eq("owner", CURRENT_OWNER).gte("date", isoDateDaysAgo(90)).order("created_at", { ascending: false });
      if (error) { console.error("[loadNutritionLog] Supabase error:", error.message); return local; }
      const items = (data || []).map((r) => ({
        id: r.id, date: r.date, foodName: r.food_name, calories: r.calories, protein: r.protein,
        carbs: r.carbs, fat: r.fat, fiber: r.fiber || 0, sugar: r.sugar || 0, sodium: r.sodium || 0,
        servingInfo: r.serving_info || "", source: r.source, unit: r.unit || "g",
      }));
      lsSet("masar_nutrition_log", items);
      return items;
    } catch (e) { console.error("[loadNutritionLog] read failed:", e); return local; }
  },
  async addNutritionEntry(entry) {
    const local = lsGet("masar_nutrition_log", []);
    lsSet("masar_nutrition_log", [entry, ...local]);
    if (!useCloud()) return { ok: true };
    const payload = {
      id: entry.id, owner: CURRENT_OWNER, date: entry.date, food_name: entry.foodName,
      calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fat: entry.fat,
      fiber: entry.fiber || 0, sugar: entry.sugar || 0, sodium: entry.sodium || 0,
      serving_info: entry.servingInfo || "", source: entry.source, unit: entry.unit || "g",
    };
    try {
      const { error } = await supabase.from("nutrition_log").insert(payload);
      if (error) {
        // التفاصيل الكاملة (message/code/details/hint) إلى console المطوّر
        // فقط - المستدعي (NutritionView) يُظهر رسالة عامة ودّية للمستخدم.
        console.error("[addNutritionEntry] Supabase error:", error);
        lsSet("masar_nutrition_log", local); // تراجع محلياً أيضاً - لم يُحفظ فعلياً
        return {
          ok: false,
          error: error.message,
          code: error.code || null,
          details: error.details || null,
          hint: error.hint || null,
        };
      }
      return { ok: true };
    } catch (e) {
      console.error("[addNutritionEntry] write failed:", e);
      lsSet("masar_nutrition_log", local);
      return { ok: false, error: String(e), code: null, details: null, hint: null };
    }
  },
  async deleteNutritionEntry(id) {
    const local = lsGet("masar_nutrition_log", []);
    lsSet("masar_nutrition_log", local.filter((e) => e.id !== id));
    if (useCloud()) {
      try {
        const { error } = await supabase.from("nutrition_log").delete().eq("id", id).eq("owner", CURRENT_OWNER);
        if (error) console.error("[deleteNutritionEntry] Supabase error:", error.message);
      } catch (e) { console.error("[deleteNutritionEntry] write failed:", e); }
    }
  },

  // يبحث محلياً أولاً (ذاكرة سريعة)، ثم سحابياً — الآن عن أي مساهمة من أي
  // مستخدم لنفس الباركود (RLS تسمح بالقراءة العامة، انظر تعليق SQL)، لا
  // مقتصرة على مساهمات المستخدم الحالي وحده كما كانت سابقاً. يُستدعى قبل
  // حتى محاولة الاتصال بـ Open Food Facts.
  async findCustomFood(barcode) {
    const local = lsGet("masar_custom_foods", {});
    if (local[barcode]) return local[barcode];
    if (!useCloud()) return null;
    try {
      const { data, error } = await supabase.from("custom_foods").select("*").eq("barcode", barcode).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error || !data) return null;
      const food = {
        barcode: data.barcode, foodName: data.food_name, calories: data.calories, protein: data.protein,
        carbs: data.carbs, fat: data.fat, fiber: data.fiber || 0, sugar: data.sugar || 0, sodium: data.sodium || 0,
        brand: data.brand || "", country: data.country || "", servingSizeLabel: data.serving_size_label || "",
        servingGrams: data.serving_grams || null, imageUrl: data.image_url || "", micronutrients: data.micronutrients || {},
      };
      lsSet("masar_custom_foods", { ...local, [barcode]: food });
      return food;
    } catch (e) { console.error("[findCustomFood] read failed:", e); return null; }
  },
  // قرار هندسي: custom_foods قاعدة بيانات منتجات مُجتمعية مشتركة الآن (لا
  // خاصة بكل مستخدم) - owner هنا يعني فقط "من ساهم بهذا الصف"، ولا يُستخدم
  // للتصفية عند القراءة (انظر findCustomFood أعلاه). كل مستخدم يستفيد من
  // كل مساهمة سابقة لنفس الباركود من أي مستخدم آخر.
  async saveCustomFood(food) {
    const local = lsGet("masar_custom_foods", {});
    lsSet("masar_custom_foods", { ...local, [food.barcode]: food });
    if (useCloud()) {
      try {
        const { error } = await supabase.from("custom_foods").upsert({
          owner: CURRENT_OWNER, barcode: food.barcode, food_name: food.foodName,
          calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat,
          fiber: food.fiber || 0, sugar: food.sugar || 0, sodium: food.sodium || 0,
          brand: food.brand || "", country: food.country || "", serving_size_label: food.servingSizeLabel || "",
          serving_grams: food.servingGrams || null, image_url: food.imageUrl || "",
          micronutrients: food.micronutrients || {}, updated_at: new Date().toISOString(),
        });
        if (error) { console.error("[saveCustomFood] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveCustomFood] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  // جدول مرجعي عام (نفس نمط app_flags) - يُقرأ حتى بلا اتصال سحابي حقيقي
  // بمعزل عن useCloud() عمداً، مطابقةً لباقي البيانات المرجعية العامة.
  // استعلامان منفصلان بـ.eq() بدل .or() بنص واحد، حتى لا يتأثر بناء
  // فلتر PostgREST بأي حرف خاص (فاصلة، قوس...) قد يكتبه المستخدم ضمن نص
  // البحث الحر.
  async lookupFoodSynonym(term) {
    if (!hasSupabase) return null;
    const normalized = term.trim().toLowerCase();
    if (!normalized) return null;
    try {
      const { data: byAr } = await supabase.from("food_synonyms").select("canonical_term").eq("term_ar", normalized).maybeSingle();
      if (byAr) return byAr.canonical_term;
      const { data: byEn } = await supabase.from("food_synonyms").select("canonical_term").eq("term_en", normalized).maybeSingle();
      if (byEn) return byEn.canonical_term;
      return null;
    } catch (e) { console.error("[lookupFoodSynonym] read failed:", e); return null; }
  },

  async loadWaterLog() {
    const local = lsGet("masar_water_log", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("water_log").select("*").eq("owner", CURRENT_OWNER);
      if (error || !data) return local;
      const log = {};
      data.forEach((r) => { log[r.date] = r.cups_count; });
      lsSet("masar_water_log", log);
      return log;
    } catch (e) { console.error("[loadWaterLog] read failed:", e); return local; }
  },
  async saveWaterCups(date, count) {
    const local = lsGet("masar_water_log", {});
    lsSet("masar_water_log", { ...local, [date]: count });
    if (useCloud()) {
      try {
        const { error } = await supabase.from("water_log").upsert(
          { owner: CURRENT_OWNER, date, cups_count: count, updated_at: new Date().toISOString() },
          { onConflict: "owner,date" }
        );
        if (error) { console.error("[saveWaterCups] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveWaterCups] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  async loadAchieve() {
    const local = lsGet("masar_achieve", []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("achieve").select("*").eq("owner", CURRENT_OWNER).order("created_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, kind: r.kind, title: r.title, detail: r.detail, steps: r.steps || [], topic: r.topic, done: r.done }));
    lsSet("masar_achieve", items);
    return items;
  },
  async saveAchieve(item) {
    const local = lsGet("masar_achieve", []);
    const next = local.some((a) => a.id === item.id) ? local.map((a) => (a.id === item.id ? item : a)) : [item, ...local];
    lsSet("masar_achieve", next);
    if (useCloud()) {
      const { error } = await supabase.from("achieve").upsert({ id: item.id, kind: item.kind, title: item.title, detail: item.detail, steps: item.steps, topic: item.topic, done: !!item.done, owner: CURRENT_OWNER });
      if (error) { console.error("[saveAchieve] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async deleteAchieve(id) {
    lsSet("masar_achieve", lsGet("masar_achieve", []).filter((a) => a.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("achieve").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) { console.error("[deleteAchieve] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadFocus() {
    const local = lsGet("masar_focus", []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("focus_sessions").select("*").eq("owner", CURRENT_OWNER).order("created_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, date: r.date, minutes: r.minutes, label: r.label || "", isStudy: !!r.is_study, start: r.start_time || null, end: r.end_time || null }));
    lsSet("masar_focus", items);
    return items;
  },
  async saveFocus(session) {
    const local = lsGet("masar_focus", []);
    lsSet("masar_focus", [session, ...local]);
    if (useCloud()) {
      const { error } = await supabase.from("focus_sessions").upsert({ id: session.id, date: session.date, minutes: session.minutes, label: session.label || "", is_study: !!session.isStudy, start_time: session.start || null, end_time: session.end || null, owner: CURRENT_OWNER });
      if (error) { console.error("[saveFocus] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadCommitments() {
    const local = lsGet("masar_commitments", []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("commitments").select("*").eq("owner", CURRENT_OWNER).order("created_at");
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, title: r.title, targetMinutes: r.target_minutes, catId: r.cat_id, log: r.log || {} }));
    lsSet("masar_commitments", items);
    return items;
  },
  async saveCommitment(c) {
    const local = lsGet("masar_commitments", []);
    const next = local.some((x) => x.id === c.id) ? local.map((x) => (x.id === c.id ? c : x)) : [...local, c];
    lsSet("masar_commitments", next);
    if (useCloud()) {
      const { error } = await supabase.from("commitments").upsert({ id: c.id, title: c.title, target_minutes: c.targetMinutes, cat_id: c.catId || null, log: c.log || {}, owner: CURRENT_OWNER });
      if (error) { console.error("[saveCommitment] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async deleteCommitment(id) {
    lsSet("masar_commitments", lsGet("masar_commitments", []).filter((c) => c.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("commitments").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) { console.error("[deleteCommitment] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadPrayerLog() {
    const local = lsGet("masar_prayer_log", []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("prayer_log").select("*").eq("owner", CURRENT_OWNER).order("done_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({
      id: r.id, date: r.date, prayerId: r.prayer_id,
      minutesAfterAdhan: typeof r.minutes_after_adhan === "number" ? r.minutes_after_adhan : undefined,
    }));
    lsSet("masar_prayer_log", items);
    return items;
  },
  async savePrayer(entry) {
    const local = lsGet("masar_prayer_log", []);
    if (local.some((p) => p.date === entry.date && p.prayerId === entry.prayerId)) return { ok: true };
    lsSet("masar_prayer_log", [entry, ...local]);
    if (useCloud()) {
      const { error } = await supabase.from("prayer_log").upsert({
        id: entry.id, date: entry.date, prayer_id: entry.prayerId, owner: CURRENT_OWNER,
        minutes_after_adhan: typeof entry.minutesAfterAdhan === "number" ? entry.minutesAfterAdhan : null,
      });
      if (error) { console.error("[savePrayer] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async removePrayer(date, prayerId) {
    const local = lsGet("masar_prayer_log", []).filter((p) => !(p.date === date && p.prayerId === prayerId));
    lsSet("masar_prayer_log", local);
    if (useCloud()) {
      const { error } = await supabase.from("prayer_log").delete().eq("date", date).eq("prayer_id", prayerId).eq("owner", CURRENT_OWNER);
      if (error) { console.error("[removePrayer] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadReligious() {
    const local = lsGet("masar_religious", []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("religious_tasks").select("*").eq("owner", CURRENT_OWNER).order("created_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, date: r.date, taskKey: r.task_key, title: r.title, targetCount: r.target_count, targetMinutes: r.target_minutes, minutesSpent: r.minutes_spent || 0, done: r.done }));
    lsSet("masar_religious", items);
    return items;
  },
  async saveReligious(t) {
    const local = lsGet("masar_religious", []);
    const next = local.some((x) => x.id === t.id) ? local.map((x) => (x.id === t.id ? t : x)) : [t, ...local];
    lsSet("masar_religious", next);
    if (useCloud()) {
      const { error } = await supabase.from("religious_tasks").upsert({ id: t.id, date: t.date, task_key: t.taskKey, title: t.title, target_count: t.targetCount || null, target_minutes: t.targetMinutes || null, minutes_spent: t.minutesSpent || 0, done: !!t.done, done_at: t.done ? new Date().toISOString() : null, owner: CURRENT_OWNER });
      if (error) { console.error("[saveReligious] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async deleteReligious(id) {
    lsSet("masar_religious", lsGet("masar_religious", []).filter((t) => t.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("religious_tasks").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) { console.error("[deleteReligious] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadMandatoryLog() {
    const local = lsGet("masar_mandatory_log", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("mandatory_log").select("*").eq("owner", CURRENT_OWNER).order("date");
      if (error) { console.error("[loadMandatoryLog] Supabase error:", error.message); return local; }
      if (!data) return local;
      const log = {};
      data.forEach((r) => { if (!log[r.date]) log[r.date] = {}; log[r.date][r.task_key] = r.done; });
      lsSet("masar_mandatory_log", log);
      return log;
    } catch (e) { console.error("[loadMandatoryLog] read failed:", e); return local; }
  },
  async saveMandatoryItem(date, taskKey, done) {
    const log = lsGet("masar_mandatory_log", {});
    if (!log[date]) log[date] = {};
    log[date][taskKey] = done;
    lsSet("masar_mandatory_log", log);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("mandatory_log").upsert(
          { date, task_key: taskKey, done, owner: CURRENT_OWNER, updated_at: new Date().toISOString() },
          { onConflict: "owner,date,task_key" }
        );
        if (error) { console.error("[saveMandatoryItem] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveMandatoryItem] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  async loadAzkarLog() {
    const local = lsGet("masar_azkar_log", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("azkar_log").select("*").eq("owner", CURRENT_OWNER).order("date");
      if (error) { console.error("[loadAzkarLog] Supabase error:", error.message); return local; }
      if (!data) return local;
      const log = {};
      data.forEach((r) => { if (!log[r.date]) log[r.date] = {}; log[r.date][r.session] = r.done; });
      lsSet("masar_azkar_log", log);
      return log;
    } catch (e) { console.error("[loadAzkarLog] read failed:", e); return local; }
  },
  async loadAzkarItems() {
    return lsGet("masar_azkar_items", {});
  },
  async saveAzkarItem(date, itemId, done) {
    const items = lsGet("masar_azkar_items", {});
    if (!items[date]) items[date] = {};
    items[date][itemId] = done;
    lsSet("masar_azkar_items", items);
  },
  async saveAzkarLog(date, session, done) {
    const log = lsGet("masar_azkar_log", {});
    if (!log[date]) log[date] = {};
    log[date][session] = done;
    lsSet("masar_azkar_log", log);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("azkar_log").upsert(
          { date, session, done, owner: CURRENT_OWNER, updated_at: new Date().toISOString() },
          { onConflict: "owner,date,session" }
        );
        if (error) { console.error("[saveAzkarLog] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveAzkarLog] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  async loadQuranProgress() {
    const local = lsGet("masar_quran_juz", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("quran_progress").select("*").eq("owner", CURRENT_OWNER);
      if (error) { console.error("[loadQuranProgress] Supabase error:", error.message); return local; }
      if (!data) return local;
      const prog = {};
      data.forEach((r) => { prog[r.juz_num] = r.done; });
      lsSet("masar_quran_juz", prog);
      return prog;
    } catch (e) { console.error("[loadQuranProgress] read failed:", e); return local; }
  },
  async saveQuranJuz(juzNum, done) {
    const data = lsGet("masar_quran_juz", {});
    data[juzNum] = done;
    lsSet("masar_quran_juz", data);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("quran_progress").upsert({ juz_num: juzNum, done, owner: CURRENT_OWNER });
        if (error) { console.error("[saveQuranJuz] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveQuranJuz] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  async loadIstighfar() {
    const local = lsGet("masar_istighfar", { daily: {}, total: 0 });
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("istighfar").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
      if (error) { console.error("[loadIstighfar] Supabase error:", error.message); return local; }
      if (!data) return local;
      const result = { daily: data.daily || {}, total: data.total || 0 };
      lsSet("masar_istighfar", result);
      return result;
    } catch (e) { console.error("[loadIstighfar] read failed:", e); return local; }
  },
  async saveIstighfar(data) {
    lsSet("masar_istighfar", data);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("istighfar").upsert({ owner: CURRENT_OWNER, daily: data.daily, total: data.total, updated_at: new Date().toISOString() });
        if (error) { console.error("[saveIstighfar] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveIstighfar] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  async loadPointsLog() {
    const local = lsGet("masar_points_log", []);
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("points_log").select("*").eq("owner", CURRENT_OWNER).order("date", { ascending: false }).limit(200);
      if (error) { console.error("[loadPointsLog] Supabase error:", error.message); return local; }
      if (!data) return local;
      const items = data.map((r) => ({ id: r.id, date: r.date, amount: r.amount, reason: r.reason }));
      lsSet("masar_points_log", items);
      return items;
    } catch (e) { console.error("[loadPointsLog] read failed:", e); return local; }
  },
  async addPointsLog(entry) {
    const log = lsGet("masar_points_log", []);
    const next = [entry, ...log].slice(0, 200);
    lsSet("masar_points_log", next);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("points_log").insert({ id: entry.id, date: entry.date, amount: entry.amount, reason: entry.reason, owner: CURRENT_OWNER });
        if (error) { console.error("[addPointsLog] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[addPointsLog] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  async loadGamify() {
    const local = lsGet(LS.gamify, { points: 0, badges: [] });
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("gamify").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
    if (error || !data) return local;
    const g = { points: data.points, badges: data.badges || [] };
    lsSet(LS.gamify, g);
    return g;
  },
  async saveGamify(g) {
    lsSet(LS.gamify, g);
    if (useCloud()) {
      const { error } = await supabase.from("gamify").upsert({ owner: CURRENT_OWNER, points: g.points, badges: g.badges, updated_at: new Date().toISOString() });
      if (error) { console.error("[saveGamify] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadChatMessages() {
    const local = lsGet("masar_chat_messages", []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("chat_messages").select("*").eq("owner", CURRENT_OWNER).order("created_at");
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, role: r.role, content: r.content }));
    lsSet("masar_chat_messages", items);
    return items;
  },
  async saveChatMessage(msg) {
    const local = lsGet("masar_chat_messages", []);
    lsSet("masar_chat_messages", [...local, msg]);
    if (useCloud()) {
      const { error } = await supabase.from("chat_messages").insert({ id: msg.id, owner: CURRENT_OWNER, role: msg.role, content: msg.content });
      if (error) { console.error("[saveChatMessage] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },
  async clearChatMessages() {
    lsSet("masar_chat_messages", []);
    if (useCloud()) {
      const { error } = await supabase.from("chat_messages").delete().eq("owner", CURRENT_OWNER);
      if (error) { console.error("[clearChatMessages] Supabase error:", error.message); return { ok: false, error: error.message }; }
    }
    return { ok: true };
  },

  async loadAdhkarProgress(date) {
    const key = `masar_adhkar_progress_${date}`;
    const local = lsGet(key, {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("adhkar_progress").select("*").eq("owner", CURRENT_OWNER).eq("date", date);
      if (error) { console.error("[loadAdhkarProgress] Supabase error:", error.message); return local; }
      if (!data) return local;
      const progress = {};
      data.forEach((r) => {
        if (!progress[r.category]) progress[r.category] = {};
        progress[r.category][r.item_id] = { remaining: r.remaining, done: r.done };
      });
      lsSet(key, progress);
      return progress;
    } catch (e) { console.error("[loadAdhkarProgress] read failed:", e); return local; }
  },
  async saveAdhkarProgressItem(date, category, itemId, remaining, done) {
    const key = `masar_adhkar_progress_${date}`;
    const progress = lsGet(key, {});
    if (!progress[category]) progress[category] = {};
    progress[category][itemId] = { remaining, done };
    lsSet(key, progress);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("adhkar_progress").upsert(
          { date, category, item_id: itemId, remaining, done, owner: CURRENT_OWNER, updated_at: new Date().toISOString() },
          { onConflict: "owner,date,category,item_id" }
        );
        if (error) { console.error("[saveAdhkarProgressItem] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveAdhkarProgressItem] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  async loadTipsLog() {
    const local = lsGet("masar_tips_log", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("tips_log").select("*").eq("owner", CURRENT_OWNER).order("date");
      if (error) { console.error("[loadTipsLog] Supabase error:", error.message); return local; }
      if (!data) return local;
      const log = {};
      data.forEach((r) => { log[r.date] = r.tip_id; });
      // Merge over the local cache instead of replacing it outright, so a
      // transient/partial cloud read can never make a previously-seen day
      // vanish from the archive — the cloud rows still win on conflicts.
      const merged = { ...local, ...log };
      lsSet("masar_tips_log", merged);
      return merged;
    } catch (e) { console.error("[loadTipsLog] read failed:", e); return local; }
  },
  async saveTipsLog(date, tipId) {
    const log = lsGet("masar_tips_log", {});
    log[date] = tipId;
    lsSet("masar_tips_log", log);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("tips_log").upsert(
          { date, tip_id: tipId, owner: CURRENT_OWNER, seen_at: new Date().toISOString() },
          { onConflict: "owner,date" }
        );
        if (error) { console.error("[saveTipsLog] Supabase error:", error.message); return { ok: false, error: error.message }; }
      } catch (e) { console.error("[saveTipsLog] write failed:", e); return { ok: false, error: String(e) }; }
    }
    return { ok: true };
  },

  // Synchronous, local-only "already shown today" flag for the daily-tip
  // popup — deliberately independent of the (async, cloud-loaded) tips_log
  // state so the popup's gate never races with the network round-trip.
  getDailyTipShownDate() {
    return lsGet("masar_daily_tip_shown_date", null);
  },
  setDailyTipShownDate(date) {
    lsSet("masar_daily_tip_shown_date", date);
  },

  async loadGoals() {
    const local = lsGet("masar_goals", []);
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("goals").select("*").eq("owner", CURRENT_OWNER).order("created_at", { ascending: false });
      if (error) { console.error("[loadGoals] Supabase error:", error.message); return local; }
      if (!data) return local;
      const items = data.map((r) => ({
        id: r.id, title: r.title, period: r.period, createdDate: r.created_date,
        cells: r.cells || [], checkpoints: r.checkpoints || [], checkpointIndex: r.checkpoint_index || 0,
        unit: r.period === "yearly" ? "month" : "day",
        status: r.status, failures: r.failures || [],
      }));
      lsSet("masar_goals", items);
      return items;
    } catch (e) { console.error("[loadGoals] read failed:", e); return local; }
  },
  // Returns true/false (like saveCategory) so the UI can tell a silent
  // cloud failure apart from success instead of assuming it always worked.
  async saveGoal(goal) {
    const local = lsGet("masar_goals", []);
    const next = local.some((g) => g.id === goal.id) ? local.map((g) => (g.id === goal.id ? goal : g)) : [goal, ...local];
    lsSet("masar_goals", next);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("goals").upsert({
          id: goal.id, title: goal.title, period: goal.period, created_date: goal.createdDate,
          cells: goal.cells, checkpoints: goal.checkpoints, checkpoint_index: goal.checkpointIndex,
          status: goal.status, failures: goal.failures, owner: CURRENT_OWNER,
        });
        if (error) { console.error("[saveGoal] Supabase error:", error.message); return false; }
      } catch (e) { console.error("[saveGoal] write failed:", e); return false; }
    }
    return true;
  },
  async deleteGoal(id) {
    lsSet("masar_goals", lsGet("masar_goals", []).filter((g) => g.id !== id));
    if (useCloud()) {
      try {
        const { error } = await supabase.from("goals").delete().eq("id", id).eq("owner", CURRENT_OWNER);
        if (error) { console.error("[deleteGoal] Supabase error:", error.message); return false; }
      } catch (e) { console.error("[deleteGoal] write failed:", e); return false; }
    }
    return true;
  },

  // قسم "خزنة": null يعني أن المستخدم لم يُعِدَّ رصيده بعد (شاشة الإعداد
  // الأولى تظهر عندها)، أما بعد الإعداد فتُعاد دائماً { balance, currency }.
  async loadVault() {
    const local = lsGet("masar_vault", null);
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("vault").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
      if (error) { console.error("[loadVault] Supabase error:", error.message); return local; }
      if (!data) return local;
      const v = { balance: Number(data.balance) || 0, currency: data.currency || "KWD" };
      lsSet("masar_vault", v);
      return v;
    } catch (e) { console.error("[loadVault] read failed:", e); return local; }
  },
  async saveVault(vault) {
    lsSet("masar_vault", vault);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("vault").upsert(
          { owner: CURRENT_OWNER, balance: vault.balance, currency: vault.currency, updated_at: new Date().toISOString() },
          { onConflict: "owner" }
        );
        if (error) { console.error("[saveVault] Supabase error:", error.message); return false; }
      } catch (e) { console.error("[saveVault] write failed:", e); return false; }
    }
    return true;
  },
  async loadVaultTransactions() {
    const local = lsGet("masar_vault_transactions", []);
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("vault_transactions").select("*").eq("owner", CURRENT_OWNER).order("created_at", { ascending: false });
      if (error) { console.error("[loadVaultTransactions] Supabase error:", error.message); return local; }
      if (!data) return local;
      const items = data.map((r) => ({ id: r.id, date: r.date, amount: Number(r.amount), type: r.type, reason: r.reason, createdAt: r.created_at }));
      lsSet("masar_vault_transactions", items);
      return items;
    } catch (e) { console.error("[loadVaultTransactions] read failed:", e); return local; }
  },
  async addVaultTransaction(tx) {
    lsSet("masar_vault_transactions", [tx, ...lsGet("masar_vault_transactions", [])]);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("vault_transactions").insert({
          id: tx.id, owner: CURRENT_OWNER, date: tx.date, amount: tx.amount, type: tx.type, reason: tx.reason,
        });
        if (error) { console.error("[addVaultTransaction] Supabase error:", error.message); return false; }
      } catch (e) { console.error("[addVaultTransaction] write failed:", e); return false; }
    }
    return true;
  },
  async deleteVaultTransaction(id) {
    lsSet("masar_vault_transactions", lsGet("masar_vault_transactions", []).filter((t) => t.id !== id));
    if (useCloud()) {
      try {
        const { error } = await supabase.from("vault_transactions").delete().eq("id", id).eq("owner", CURRENT_OWNER);
        if (error) { console.error("[deleteVaultTransaction] Supabase error:", error.message); return false; }
      } catch (e) { console.error("[deleteVaultTransaction] write failed:", e); return false; }
    }
    return true;
  },

  // قسم تتبّع النوم داخل "التقارير": صف واحد لكل تاريخ (يوم الاستيقاظ)،
  // sleepTime/wakeTime اختياريان (فارغان إن أدخل المستخدم الساعات مباشرة).
  // مقيَّدة بآخر 90 يوماً: ReportsView لا يعرض نطاقاً أوسع من "شهر" (30
  // يوماً) لهذا السجل، فلا حاجة لجلب كل التاريخ المتراكم منذ إنشاء الحساب.
  async loadSleepLog() {
    const local = lsGet("masar_sleep_log", []);
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("sleep_log").select("*").eq("owner", CURRENT_OWNER).gte("date", isoDateDaysAgo(90)).order("date", { ascending: false });
      if (error) { console.error("[loadSleepLog] Supabase error:", error.message); return local; }
      if (!data) return local;
      const items = data.map((r) => ({ id: r.id, date: r.date, sleepTime: r.sleep_time, wakeTime: r.wake_time, hours: Number(r.hours) }));
      lsSet("masar_sleep_log", items);
      return items;
    } catch (e) { console.error("[loadSleepLog] read failed:", e); return local; }
  },
  async saveSleepEntry(entry) {
    const local = lsGet("masar_sleep_log", []);
    const next = local.some((s) => s.date === entry.date) ? local.map((s) => (s.date === entry.date ? entry : s)) : [entry, ...local];
    lsSet("masar_sleep_log", next);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("sleep_log").upsert(
          { id: entry.id, date: entry.date, sleep_time: entry.sleepTime || null, wake_time: entry.wakeTime || null, hours: entry.hours, owner: CURRENT_OWNER },
          { onConflict: "owner,date" }
        );
        if (error) { console.error("[saveSleepEntry] Supabase error:", error.message); return false; }
      } catch (e) { console.error("[saveSleepEntry] write failed:", e); return false; }
    }
    return true;
  },
  async deleteSleepEntry(id) {
    lsSet("masar_sleep_log", lsGet("masar_sleep_log", []).filter((s) => s.id !== id));
    if (useCloud()) {
      try {
        const { error } = await supabase.from("sleep_log").delete().eq("id", id).eq("owner", CURRENT_OWNER);
        if (error) { console.error("[deleteSleepEntry] Supabase error:", error.message); return false; }
      } catch (e) { console.error("[deleteSleepEntry] write failed:", e); return false; }
    }
    return true;
  },

  // نظام الاشتراكات: قراءة فقط، بلا أي دالة حفظ في هذا الملف عمداً — لا
  // مسار برمجي في التطبيق يقدر يكتب لجدول subscriptions إطلاقاً، وحتى
  // لو استُدعي كود عميل مُخترَق مباشرة، RLS في قاعدة البيانات (سياسة
  // select فقط) يرفض أي محاولة تعديل بغض النظر عن الكود هنا. لا تخزين
  // محلي أيضاً: حالة الاشتراك تُقرأ من الخادم مباشرة في كل تحميل، وتعود
  // "غير مشترك" افتراضياً لأي حساب ضيف أو عند تعذّر القراءة.
  async loadSubscription() {
    const empty = { isSubscriber: false, subscriptionEnd: null, isVip: false, subscriptionType: null };
    if (await isFreeForAllActive()) {
      return { isSubscriber: true, subscriptionEnd: "9999-12-31", isVip: true, subscriptionType: "free_promo" };
    }
    if (!useCloud()) return empty;
    try {
      const { data, error } = await supabase.from("subscriptions").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
      if (error) { console.error("[loadSubscription] Supabase error:", error.message); return empty; }
      if (!data) return empty;
      return {
        isSubscriber: !!data.is_subscriber,
        subscriptionEnd: data.subscription_end,
        isVip: !!data.is_vip,
        subscriptionType: data.subscription_type,
      };
    } catch (e) { console.error("[loadSubscription] read failed:", e); return empty; }
  },

  // "تحديات الأصدقاء" (جداول study_groups/group_members دون تغيير) — ميزة سحابية بحتة، لا معنى لها في
  // وضع "solo" المحلي (المشاركة بين حسابين تتطلب حساباً حقيقياً بالتعريف)،
  // فكل دالة هنا ترمي NEEDS_ACCOUNT مباشرة إن لم يكن هناك اتصال سحابي حقيقي،
  // بدل محاولة تزييف سلوك محلي لا معنى له لميزة جماعية.
  async createGroup(name) {
    if (!useCloud()) throw new Error("NEEDS_ACCOUNT");
    const { data, error } = await supabase.from("study_groups").insert({ name, owner: CURRENT_OWNER }).select().single();
    if (error) { console.error("[createGroup] Supabase error:", error.message); throw error; }
    return fromDbGroup(data);
  },
  async loadMyGroups() {
    if (!useCloud()) return [];
    try {
      const { data: memberRows, error } = await supabase.from("group_members").select("group_id").eq("member_owner", CURRENT_OWNER);
      if (error || !memberRows?.length) return [];
      const groupIds = memberRows.map((r) => r.group_id);
      const { data: groups, error: gErr } = await supabase.from("study_groups").select("*").in("id", groupIds).order("created_at");
      if (gErr || !groups) return [];
      return groups.map(fromDbGroup);
    } catch (e) { console.error("[loadMyGroups] read failed:", e); return []; }
  },
  // date: تاريخ اليوم المحلي (مثل todayKey())، يُمرَّر من المتصل لأن store.js
  // لا يحسب التواريخ بنفسه في أي مكان آخر بالملف - نفس الاتفاق المتّبع.
  async loadGroupDetail(groupId, date) {
    if (!useCloud()) return [];
    try {
      const { data: members, error } = await supabase.from("group_members").select("member_owner, joined_at").eq("group_id", groupId).order("joined_at");
      if (error || !members) return [];
      const owners = members.map((m) => m.member_owner);
      const [{ data: profiles }, { data: stats }, { data: reactions }] = await Promise.all([
        supabase.from("group_shared_profile").select("owner, name").in("owner", owners),
        supabase.from("group_daily_stats").select("owner, study_minutes, workout_done").in("owner", owners).eq("date", date),
        supabase.from("group_reactions").select("from_owner, to_owner, emoji").eq("group_id", groupId).eq("date", date),
      ]);
      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.owner, p.name]));
      const statMap = Object.fromEntries((stats || []).map((s) => [s.owner, { studyMinutes: s.study_minutes, workoutDone: s.workout_done }]));
      // تجميع التفاعلات لكل عضو: عدد كل رمز استُقبِل + هل أرسلتُ أنا (المستخدم
      // الحالي) هذا الرمز له اليوم بالفعل (لمنع إرسال مكرر من الواجهة نفسها،
      // بالإضافة لقيد unique الحقيقي على مستوى القاعدة).
      const reactionMap = {};
      (reactions || []).forEach((r) => {
        if (!reactionMap[r.to_owner]) reactionMap[r.to_owner] = { counts: {}, sentByMe: [] };
        reactionMap[r.to_owner].counts[r.emoji] = (reactionMap[r.to_owner].counts[r.emoji] || 0) + 1;
        if (r.from_owner === CURRENT_OWNER) reactionMap[r.to_owner].sentByMe.push(r.emoji);
      });
      return members.map((m) => ({
        owner: m.member_owner,
        isMe: m.member_owner === CURRENT_OWNER,
        name: (nameMap[m.member_owner] || "").trim(),
        studyMinutes: statMap[m.member_owner]?.studyMinutes || 0,
        workoutDone: !!statMap[m.member_owner]?.workoutDone,
        joinedAt: m.joined_at,
        reactions: reactionMap[m.member_owner] || { counts: {}, sentByMe: [] },
      }));
    } catch (e) { console.error("[loadGroupDetail] read failed:", e); return []; }
  },
  // تفاعل رمزي بسيط (👍/🔥/👏) على نشاط عضو آخر ليوم بعينه. RLS تتحقق من
  // أن المُرسِل والمُستقبِل كلاهما عضو فعلي في نفس الجروب (راجع المخطط) -
  // لا حاجة لأي فحص إضافي هنا. alreadySent يميّز تكراراً غير ضار (المستخدم
  // ضغط مرتين) عن خطأ حقيقي.
  async sendGroupReaction(groupId, toOwner, date, emoji) {
    if (!useCloud()) return { ok: false };
    try {
      const { error } = await supabase.from("group_reactions").insert({ group_id: groupId, from_owner: CURRENT_OWNER, to_owner: toOwner, date, emoji });
      if (error) {
        if (error.code === "23505") return { ok: false, alreadySent: true };
        console.error("[sendGroupReaction] Supabase error:", error.message);
        return { ok: false };
      }
      return { ok: true };
    } catch (e) { console.error("[sendGroupReaction] write failed:", e); return { ok: false }; }
  },
  // إشعار نشاط لحظي (بدء/انتهاء جلسة) - لا يُخزَّن كسجل دائم فعلياً (Trigger
  // تنظيف ذاتي في المخطط يحذف أي صف أقدم من 10 دقائق)، ولا تنتظر الواجهة
  // نتيجة هذا الاستدعاء (fire-and-forget) حتى لا يُبطئ بدء/إنهاء الجلسة.
  async sendGroupActivityPing(groupId, kind, minutes) {
    if (!useCloud()) return;
    try {
      const { error } = await supabase.from("group_activity_pings").insert({ group_id: groupId, owner: CURRENT_OWNER, kind, minutes: minutes || null });
      if (error) console.error("[sendGroupActivityPing] Supabase error:", error.message);
    } catch (e) { console.error("[sendGroupActivityPing] write failed:", e); }
  },
  // اشتراك لحظي بإشعارات نشاط جروب واحد تحديداً (مُصفّاة على مستوى الخادم
  // بعمود group_id، بخلاف subscribeGroupStats الأقدم التي تعتمد فقط على
  // RLS + تصفية العميل لعدم وجود عمود جروب في جدولها).
  subscribeGroupActivity(groupId, onPing) {
    if (!useCloud()) return () => {};
    const channel = supabase
      .channel(`group-activity-${groupId}-${CURRENT_OWNER}-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_activity_pings", filter: `group_id=eq.${groupId}` }, (payload) => {
        if (payload.new) onPing(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
  // يبحث عن اسم الجروب بحسب رمز الدعوة عبر دالة أمنية ضيّقة (لا تكشف سوى
  // id/name/expired/exhausted)، دون الحاجة لأن يكون المستخدم عضواً فيه
  // أصلاً بعد. يُميَّز هنا عمداً بين "لا يوجد جروب بهذا الرمز فعلاً" (ترجع
  // null) و"حدث خطأ فني أثناء التحقق" (تُرمى استثناء RPC_ERROR) - كانا
  // يُعامَلان سابقاً بنفس الرسالة المضلِّلة "الرابط غير صالح" مهما كان
  // السبب الحقيقي. الدفعة الرابعة: expired/exhausted تُتحقَّق هنا أولاً
  // فيُعرَض السبب الحقيقي فوراً للمستخدم قبل حتى محاولة الانضمام، والقيد
  // نفسه مُطبَّق مجدداً على مستوى قاعدة البيانات عند الإدراج الفعلي (دفاع
  // متعدد الطبقات - راجع enforce_invite_code_validity في المخطط).
  async getGroupByInviteCode(code) {
    if (!useCloud()) return null;
    const { data, error } = await supabase.rpc("get_group_by_invite_code", { code });
    if (error) { console.error("[getGroupByInviteCode] Supabase RPC error:", error); throw new Error("RPC_ERROR"); }
    if (!data?.length) return null;
    if (data[0].expired) throw new Error("INVITE_EXPIRED");
    if (data[0].exhausted) throw new Error("INVITE_EXHAUSTED");
    return { id: data[0].id, name: data[0].name };
  },
  // ينفّذ فعلياً إضافة العضوية بمعرّف جروب معروف مسبقاً (بعد أن يكون
  // getGroupByInviteCode قد حلّ الكود وعرض اسم الجروب للتأكيد أصلاً).
  async joinGroupById(groupId) {
    if (!useCloud()) throw new Error("NEEDS_ACCOUNT");
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, member_owner: CURRENT_OWNER });
    if (error) {
      if (error.code === "23505") throw new Error("ALREADY_MEMBER");
      if (error.message?.includes("GROUP_MEMBER_LIMIT_REACHED")) throw new Error("GROUP_FULL");
      if (error.message?.includes("INVITE_EXPIRED")) throw new Error("INVITE_EXPIRED");
      if (error.message?.includes("INVITE_EXHAUSTED")) throw new Error("INVITE_EXHAUSTED");
      console.error("[joinGroupById] Supabase error:", error.message);
      throw error;
    }
  },
  // تُبطل الكود القديم فوراً (invite_code فريد) وتُصفّر عدّاد الاستخدام -
  // فحص الملكية يتم داخل الدالة نفسها (security definer)، وليس بالاعتماد
  // على RLS خارجي فقط.
  async regenerateInviteCode(groupId) {
    const { data, error } = await supabase.rpc("regenerate_invite_code", { p_group_id: groupId });
    if (error) { console.error("[regenerateInviteCode] Supabase RPC error:", error.message); throw error; }
    return data;
  },
  // maxUses: عدد صحيح أو null (بلا حد). expiresInDays: عدد أيام من الآن أو
  // null (بلا انتهاء) - يُحوَّل هنا لطابع زمني مطلق لأن هذا أوضح للتخزين.
  async updateGroupInviteSettings(groupId, { maxUses, expiresInDays }) {
    const payload = {
      invite_max_uses: maxUses === null || maxUses === undefined ? null : maxUses,
      invite_expires_at: expiresInDays === null || expiresInDays === undefined
        ? null
        : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
    };
    const { error } = await supabase.from("study_groups").update(payload).eq("id", groupId);
    if (error) { console.error("[updateGroupInviteSettings] Supabase error:", error.message); throw error; }
  },
  async leaveGroup(groupId) {
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("member_owner", CURRENT_OWNER);
    if (error) { console.error("[leaveGroup] Supabase error:", error.message); throw error; }
  },
  async removeGroupMember(groupId, memberOwner) {
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("member_owner", memberOwner);
    if (error) { console.error("[removeGroupMember] Supabase error:", error.message); throw error; }
  },
  async renameGroup(groupId, name) {
    const { error } = await supabase.from("study_groups").update({ name }).eq("id", groupId);
    if (error) { console.error("[renameGroup] Supabase error:", error.message); throw error; }
  },
  async deleteGroup(groupId) {
    const { error } = await supabase.from("study_groups").delete().eq("id", groupId);
    if (error) { console.error("[deleteGroup] Supabase error:", error.message); throw error; }
  },
  // اشتراك لحظي بتغيّرات group_daily_stats. لا نُصفّي بمعامل الجروب على
  // مستوى الخادم (لا عمود group_id في هذا الجدول أصلاً) - RLS نفسها تمنع
  // وصول أي تغيير لا يخص جروباً مشتركاً فعلياً مع المستخدم الحالي؛ التصفية
  // النهائية حسب أعضاء الجروب المعروض تحديداً تحدث في onChange بالمتصل.
  subscribeGroupStats(onChange) {
    if (!useCloud()) return () => {};
    const channel = supabase
      .channel(`group-daily-stats-${CURRENT_OWNER}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_daily_stats" }, (payload) => {
        const row = payload.new || payload.old;
        if (row) onChange(row);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};
