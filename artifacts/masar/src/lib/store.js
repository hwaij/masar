import { supabase, hasSupabase } from "./supabase";

let CURRENT_OWNER = "solo";
export function setOwner(id) { CURRENT_OWNER = id || "solo"; }
export function getOwner() { return CURRENT_OWNER; }

// Anonymous ("solo") users never touch Supabase: their data stays local-only,
// so guests never read or write another guest's cloud data.
function useCloud() {
  return hasSupabase && CURRENT_OWNER !== "solo";
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

const DEFAULT_CATEGORIES = [
  { id: "prayer", name: "الصلاة", color: "#5FA8A0" },
  { id: "quran", name: "القرآن", color: "#8A7BD1" },
  { id: "istighfar", name: "الاستغفار", color: "#9AA84C" },
  { id: "teeth", name: "الأسنان", color: "#6FA8DC" },
  { id: "bed", name: "ترتيب السرير", color: "#D17B5F" },
  { id: "shoot", name: "تصوير وتنفيذ", color: "#C9A24B" },
  { id: "edit", name: "مونتاج وتعديل", color: "#8A7BD1" },
  { id: "study", name: "دراسة جامعية", color: "#5FA8A0" },
  { id: "client", name: "تواصل مع عملاء", color: "#D17B5F" },
  { id: "fitness", name: "تمرين", color: "#6FA8DC" },
  { id: "rest", name: "راحة", color: "#9A968F" },
];

const fromDbEntry = (r) => ({ id: r.id, date: r.date, catId: r.cat_id, start: r.start_time, end: r.end_time, note: r.note || "" });
const toDbEntry = (e) => ({ id: e.id, date: e.date, cat_id: e.catId, start_time: e.start, end_time: e.end, note: e.note || "", owner: CURRENT_OWNER });
const fromDbTask = (r) => ({ id: r.id, title: r.title, catId: r.cat_id, due: r.due, done: r.done, created: r.created_at });
const toDbTask = (t) => ({ id: t.id, title: t.title, cat_id: t.catId, due: t.due || null, done: !!t.done, owner: CURRENT_OWNER });

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
      if (error) console.error("[saveCategory] Supabase error:", error.message);
    }
  },
  async deleteCategory(id) {
    const local = lsGet(LS.categories, DEFAULT_CATEGORIES).filter((c) => c.id !== id);
    lsSet(LS.categories, local);
    if (useCloud()) {
      lsSet("masar_categories_seeded", true);
      const { error } = await supabase.from("categories").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) console.error("[deleteCategory] Supabase error:", error.message);
    }
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
      if (error) console.error("[saveEntry] Supabase error:", error.message);
    }
  },
  async deleteEntry(id) {
    lsSet(LS.entries, lsGet(LS.entries, []).filter((e) => e.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("entries").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) console.error("[deleteEntry] Supabase error:", error.message);
    }
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
      if (error) console.error("[saveTask] Supabase error:", error.message);
    }
  },
  async deleteTask(id) {
    lsSet(LS.tasks, lsGet(LS.tasks, []).filter((t) => t.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("tasks").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) console.error("[deleteTask] Supabase error:", error.message);
    }
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
      if (error) console.error("[saveReport] Supabase error:", error.message);
    }
  },

  async loadProfile() {
    const local = lsGet("masar_profile", { about: "", hobbies: "", field: "" });
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("profile").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
    if (error || !data) return local;
    const p = { about: data.about || "", hobbies: data.hobbies || "", field: data.field || "" };
    lsSet("masar_profile", p);
    return p;
  },
  async saveProfile(p) {
    lsSet("masar_profile", p);
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, about: p.about, hobbies: p.hobbies, field: p.field, updated_at: new Date().toISOString() });
      if (error) console.error("[saveProfile] Supabase error:", error.message);
    }
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
      if (error) console.error("[saveAchieve] Supabase error:", error.message);
    }
  },
  async deleteAchieve(id) {
    lsSet("masar_achieve", lsGet("masar_achieve", []).filter((a) => a.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("achieve").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) console.error("[deleteAchieve] Supabase error:", error.message);
    }
  },

  async loadFocus() {
    const local = lsGet("masar_focus", []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("focus_sessions").select("*").eq("owner", CURRENT_OWNER).order("created_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, date: r.date, minutes: r.minutes, label: r.label || "", isStudy: !!r.is_study }));
    lsSet("masar_focus", items);
    return items;
  },
  async saveFocus(session) {
    const local = lsGet("masar_focus", []);
    lsSet("masar_focus", [session, ...local]);
    if (useCloud()) {
      const { error } = await supabase.from("focus_sessions").upsert({ id: session.id, date: session.date, minutes: session.minutes, label: session.label || "", is_study: !!session.isStudy, owner: CURRENT_OWNER });
      if (error) console.error("[saveFocus] Supabase error:", error.message);
    }
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
      if (error) console.error("[saveCommitment] Supabase error:", error.message);
    }
  },
  async deleteCommitment(id) {
    lsSet("masar_commitments", lsGet("masar_commitments", []).filter((c) => c.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("commitments").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) console.error("[deleteCommitment] Supabase error:", error.message);
    }
  },

  async loadPrayerLog() {
    const local = lsGet("masar_prayer_log", []);
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("prayer_log").select("*").eq("owner", CURRENT_OWNER).order("done_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, date: r.date, prayerId: r.prayer_id }));
    lsSet("masar_prayer_log", items);
    return items;
  },
  async savePrayer(entry) {
    const local = lsGet("masar_prayer_log", []);
    if (local.some((p) => p.date === entry.date && p.prayerId === entry.prayerId)) return;
    lsSet("masar_prayer_log", [entry, ...local]);
    if (useCloud()) {
      const { error } = await supabase.from("prayer_log").upsert({ id: entry.id, date: entry.date, prayer_id: entry.prayerId, owner: CURRENT_OWNER });
      if (error) console.error("[savePrayer] Supabase error:", error.message);
    }
  },
  async removePrayer(date, prayerId) {
    const local = lsGet("masar_prayer_log", []).filter((p) => !(p.date === date && p.prayerId === prayerId));
    lsSet("masar_prayer_log", local);
    if (useCloud()) {
      const { error } = await supabase.from("prayer_log").delete().eq("date", date).eq("prayer_id", prayerId).eq("owner", CURRENT_OWNER);
      if (error) console.error("[removePrayer] Supabase error:", error.message);
    }
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
      if (error) console.error("[saveReligious] Supabase error:", error.message);
    }
  },
  async deleteReligious(id) {
    lsSet("masar_religious", lsGet("masar_religious", []).filter((t) => t.id !== id));
    if (useCloud()) {
      const { error } = await supabase.from("religious_tasks").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) console.error("[deleteReligious] Supabase error:", error.message);
    }
  },

  async loadMandatoryLog() {
    const local = lsGet("masar_mandatory_log", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("mandatory_log").select("*").eq("owner", CURRENT_OWNER).order("date");
      if (error || !data) return local;
      const log = {};
      data.forEach((r) => { if (!log[r.date]) log[r.date] = {}; log[r.date][r.task_key] = r.done; });
      lsSet("masar_mandatory_log", log);
      return log;
    } catch { return local; }
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
        if (error) console.warn("mandatory_log sync error:", error.message);
      } catch (e) { console.warn("mandatory_log write failed:", e); }
    }
  },

  async loadAzkarLog() {
    const local = lsGet("masar_azkar_log", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("azkar_log").select("*").eq("owner", CURRENT_OWNER).order("date");
      if (error || !data) return local;
      const log = {};
      data.forEach((r) => { if (!log[r.date]) log[r.date] = {}; log[r.date][r.session] = r.done; });
      lsSet("masar_azkar_log", log);
      return log;
    } catch { return local; }
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
        if (error) console.warn("azkar_log sync error:", error.message);
      } catch (e) { console.warn("azkar_log write failed:", e); }
    }
  },

  async loadQuranProgress() {
    const local = lsGet("masar_quran_juz", {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("quran_progress").select("*").eq("owner", CURRENT_OWNER);
      if (error || !data) return local;
      const prog = {};
      data.forEach((r) => { prog[r.juz_num] = r.done; });
      lsSet("masar_quran_juz", prog);
      return prog;
    } catch { return local; }
  },
  async saveQuranJuz(juzNum, done) {
    const data = lsGet("masar_quran_juz", {});
    data[juzNum] = done;
    lsSet("masar_quran_juz", data);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("quran_progress").upsert({ juz_num: juzNum, done, owner: CURRENT_OWNER });
        if (error) console.warn("quran_progress sync error:", error.message);
      } catch (e) { console.warn("quran_progress write failed:", e); }
    }
  },

  async loadIstighfar() {
    const local = lsGet("masar_istighfar", { daily: {}, total: 0 });
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("istighfar").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
      if (error || !data) return local;
      const result = { daily: data.daily || {}, total: data.total || 0 };
      lsSet("masar_istighfar", result);
      return result;
    } catch { return local; }
  },
  async saveIstighfar(data) {
    lsSet("masar_istighfar", data);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("istighfar").upsert({ owner: CURRENT_OWNER, daily: data.daily, total: data.total, updated_at: new Date().toISOString() });
        if (error) console.warn("istighfar sync error:", error.message);
      } catch (e) { console.warn("istighfar write failed:", e); }
    }
  },

  async loadPointsLog() {
    const local = lsGet("masar_points_log", []);
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("points_log").select("*").eq("owner", CURRENT_OWNER).order("date", { ascending: false }).limit(200);
      if (error || !data) return local;
      const items = data.map((r) => ({ id: r.id, date: r.date, amount: r.amount, reason: r.reason }));
      lsSet("masar_points_log", items);
      return items;
    } catch { return local; }
  },
  async addPointsLog(entry) {
    const log = lsGet("masar_points_log", []);
    const next = [entry, ...log].slice(0, 200);
    lsSet("masar_points_log", next);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("points_log").insert({ id: entry.id, date: entry.date, amount: entry.amount, reason: entry.reason, owner: CURRENT_OWNER });
        if (error) console.warn("points_log sync error:", error.message);
      } catch (e) { console.warn("points_log write failed:", e); }
    }
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
      if (error) console.error("[saveGamify] Supabase error:", error.message);
    }
  },

  async loadHealth() {
    const local = lsGet("masar_health", []);
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("health_log").select("*").eq("owner", CURRENT_OWNER).order("date", { ascending: false });
      if (error || !data) return local;
      const items = data.map((r) => ({ id: r.id, date: r.date, steps: r.steps || 0, sleepHours: r.sleep_hours || 0, waterCups: r.water_cups || 0, weight: r.weight ?? null, energy: r.energy ?? null, note: r.note || "" }));
      lsSet("masar_health", items);
      return items;
    } catch { return local; }
  },
  async saveHealth(h) {
    const local = lsGet("masar_health", []);
    const next = local.some((x) => x.id === h.id) ? local.map((x) => (x.id === h.id ? h : x)) : [h, ...local];
    next.sort((a, b) => (a.date < b.date ? 1 : -1));
    lsSet("masar_health", next);
    if (useCloud()) {
      try {
        const { error } = await supabase.from("health_log").upsert(
          { id: h.id, date: h.date, steps: h.steps || 0, sleep_hours: h.sleepHours || 0, water_cups: h.waterCups || 0, weight: h.weight ?? null, energy: h.energy ?? null, note: h.note || "", owner: CURRENT_OWNER, updated_at: new Date().toISOString() },
          { onConflict: "owner,date" }
        );
        if (error) console.warn("health_log sync error:", error.message);
      } catch (e) { console.warn("health_log write failed:", e); }
    }
  },
};
