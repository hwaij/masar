import { supabase, hasSupabase } from "./supabase";

const LS = {
  categories: "masar_categories",
  entries: "masar_entries",
  tasks: "masar_tasks",
  reports: "masar_reports",
  gamify: "masar_gamify",
};

function lsGet(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("localStorage set failed", key, e);
  }
}

const DEFAULT_CATEGORIES = [
  { id: "shoot", name: "تصوير وتنفيذ", color: "#C9A24B" },
  { id: "edit", name: "مونتاج وتعديل", color: "#8A7BD1" },
  { id: "study", name: "دراسة جامعية", color: "#5FA8A0" },
  { id: "client", name: "تواصل مع عملاء", color: "#D17B5F" },
  { id: "fitness", name: "تمرين", color: "#6FA8DC" },
  { id: "rest", name: "راحة", color: "#9A968F" },
];

const fromDbEntry = (r) => ({ id: r.id, date: r.date, catId: r.cat_id, start: r.start_time, end: r.end_time, note: r.note || "" });
const toDbEntry = (e) => ({ id: e.id, date: e.date, cat_id: e.catId, start_time: e.start, end_time: e.end, note: e.note || "", owner: "solo" });
const fromDbTask = (r) => ({ id: r.id, title: r.title, catId: r.cat_id, due: r.due, done: r.done, created: r.created_at });
const toDbTask = (t) => ({ id: t.id, title: t.title, cat_id: t.catId, due: t.due || null, done: !!t.done, owner: "solo" });

export const store = {
  hasCloud: hasSupabase,

  async loadCategories() {
    const local = lsGet(LS.categories, DEFAULT_CATEGORIES);
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("categories").select("*").order("created_at");
    if (error || !data) return local;
    const cats = data.map((r) => ({ id: r.id, name: r.name, color: r.color }));
    const result = cats.length ? cats : DEFAULT_CATEGORIES;
    lsSet(LS.categories, result);
    return result;
  },
  async saveCategory(cat) {
    const local = lsGet(LS.categories, DEFAULT_CATEGORIES);
    const next = local.some((c) => c.id === cat.id) ? local.map((c) => (c.id === cat.id ? cat : c)) : [...local, cat];
    lsSet(LS.categories, next);
    if (hasSupabase) await supabase.from("categories").upsert({ id: cat.id, name: cat.name, color: cat.color, owner: "solo" });
  },
  async deleteCategory(id) {
    const local = lsGet(LS.categories, DEFAULT_CATEGORIES).filter((c) => c.id !== id);
    lsSet(LS.categories, local);
    if (hasSupabase) await supabase.from("categories").delete().eq("id", id);
  },

  async loadEntries() {
    const local = lsGet(LS.entries, []);
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("entries").select("*").order("date");
    if (error || !data) return local;
    const entries = data.map(fromDbEntry);
    lsSet(LS.entries, entries);
    return entries;
  },
  async saveEntry(entry) {
    const local = lsGet(LS.entries, []);
    const next = local.some((e) => e.id === entry.id) ? local.map((e) => (e.id === entry.id ? entry : e)) : [...local, entry];
    lsSet(LS.entries, next);
    if (hasSupabase) await supabase.from("entries").upsert(toDbEntry(entry));
  },
  async deleteEntry(id) {
    lsSet(LS.entries, lsGet(LS.entries, []).filter((e) => e.id !== id));
    if (hasSupabase) await supabase.from("entries").delete().eq("id", id);
  },

  async loadTasks() {
    const local = lsGet(LS.tasks, []);
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("tasks").select("*").order("created_at");
    if (error || !data) return local;
    const tasks = data.map(fromDbTask);
    lsSet(LS.tasks, tasks);
    return tasks;
  },
  async saveTask(task) {
    const local = lsGet(LS.tasks, []);
    const next = local.some((t) => t.id === task.id) ? local.map((t) => (t.id === task.id ? task : t)) : [...local, task];
    lsSet(LS.tasks, next);
    if (hasSupabase) await supabase.from("tasks").upsert(toDbTask(task));
  },
  async deleteTask(id) {
    lsSet(LS.tasks, lsGet(LS.tasks, []).filter((t) => t.id !== id));
    if (hasSupabase) await supabase.from("tasks").delete().eq("id", id);
  },

  async loadReports() {
    const local = lsGet(LS.reports, []);
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (error || !data) return local;
    const reports = data.map((r) => ({ id: r.id, kind: r.kind, date: r.date, payload: r.payload, gist: r.gist }));
    lsSet(LS.reports, reports);
    return reports;
  },
  async saveReport(report) {
    const local = lsGet(LS.reports, []);
    lsSet(LS.reports, [report, ...local]);
    if (hasSupabase) await supabase.from("reports").upsert({ id: report.id, kind: report.kind, date: report.date, payload: report.payload, gist: report.gist, owner: "solo" });
  },

  async loadProfile() {
    const local = lsGet("masar_profile", { about: "", hobbies: "", field: "" });
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("profile").select("*").eq("owner", "solo").maybeSingle();
    if (error || !data) return local;
    const p = { about: data.about || "", hobbies: data.hobbies || "", field: data.field || "" };
    lsSet("masar_profile", p);
    return p;
  },
  async saveProfile(p) {
    lsSet("masar_profile", p);
    if (hasSupabase) await supabase.from("profile").upsert({ owner: "solo", about: p.about, hobbies: p.hobbies, field: p.field, updated_at: new Date().toISOString() });
  },

  async loadAchieve() {
    const local = lsGet("masar_achieve", []);
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("achieve").select("*").order("created_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, kind: r.kind, title: r.title, detail: r.detail, steps: r.steps || [], topic: r.topic, done: r.done }));
    lsSet("masar_achieve", items);
    return items;
  },
  async saveAchieve(item) {
    const local = lsGet("masar_achieve", []);
    const next = local.some((a) => a.id === item.id) ? local.map((a) => (a.id === item.id ? item : a)) : [item, ...local];
    lsSet("masar_achieve", next);
    if (hasSupabase) await supabase.from("achieve").upsert({ id: item.id, kind: item.kind, title: item.title, detail: item.detail, steps: item.steps, topic: item.topic, done: !!item.done, owner: "solo" });
  },
  async deleteAchieve(id) {
    lsSet("masar_achieve", lsGet("masar_achieve", []).filter((a) => a.id !== id));
    if (hasSupabase) await supabase.from("achieve").delete().eq("id", id);
  },

  async loadFocus() {
    const local = lsGet("masar_focus", []);
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("focus_sessions").select("*").order("created_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, date: r.date, minutes: r.minutes, label: r.label || "", isStudy: !!r.is_study }));
    lsSet("masar_focus", items);
    return items;
  },
  async saveFocus(session) {
    const local = lsGet("masar_focus", []);
    lsSet("masar_focus", [session, ...local]);
    if (hasSupabase) await supabase.from("focus_sessions").upsert({ id: session.id, date: session.date, minutes: session.minutes, label: session.label || "", is_study: !!session.isStudy, owner: "solo" });
  },

  async loadCommitments() {
    const local = lsGet("masar_commitments", []);
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("commitments").select("*").order("created_at");
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, title: r.title, targetMinutes: r.target_minutes, catId: r.cat_id, log: r.log || {} }));
    lsSet("masar_commitments", items);
    return items;
  },
  async saveCommitment(c) {
    const local = lsGet("masar_commitments", []);
    const next = local.some((x) => x.id === c.id) ? local.map((x) => (x.id === c.id ? c : x)) : [...local, c];
    lsSet("masar_commitments", next);
    if (hasSupabase) await supabase.from("commitments").upsert({ id: c.id, title: c.title, target_minutes: c.targetMinutes, cat_id: c.catId || null, log: c.log || {}, owner: "solo" });
  },
  async deleteCommitment(id) {
    lsSet("masar_commitments", lsGet("masar_commitments", []).filter((c) => c.id !== id));
    if (hasSupabase) await supabase.from("commitments").delete().eq("id", id);
  },

  async loadPrayerLog() {
    const local = lsGet("masar_prayer_log", []);
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("prayer_log").select("*").order("done_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, date: r.date, prayerId: r.prayer_id }));
    lsSet("masar_prayer_log", items);
    return items;
  },
  async savePrayer(entry) {
    const local = lsGet("masar_prayer_log", []);
    if (local.some((p) => p.date === entry.date && p.prayerId === entry.prayerId)) return;
    lsSet("masar_prayer_log", [entry, ...local]);
    if (hasSupabase) await supabase.from("prayer_log").upsert({ id: entry.id, date: entry.date, prayer_id: entry.prayerId, owner: "solo" });
  },
  async removePrayer(date, prayerId) {
    const local = lsGet("masar_prayer_log", []).filter((p) => !(p.date === date && p.prayerId === prayerId));
    lsSet("masar_prayer_log", local);
    if (hasSupabase) await supabase.from("prayer_log").delete().eq("date", date).eq("prayer_id", prayerId);
  },

  async loadReligious() {
    const local = lsGet("masar_religious", []);
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("religious_tasks").select("*").order("created_at", { ascending: false });
    if (error || !data) return local;
    const items = data.map((r) => ({ id: r.id, date: r.date, taskKey: r.task_key, title: r.title, targetCount: r.target_count, targetMinutes: r.target_minutes, minutesSpent: r.minutes_spent || 0, done: r.done }));
    lsSet("masar_religious", items);
    return items;
  },
  async saveReligious(t) {
    const local = lsGet("masar_religious", []);
    const next = local.some((x) => x.id === t.id) ? local.map((x) => (x.id === t.id ? t : x)) : [t, ...local];
    lsSet("masar_religious", next);
    if (hasSupabase) await supabase.from("religious_tasks").upsert({ id: t.id, date: t.date, task_key: t.taskKey, title: t.title, target_count: t.targetCount || null, target_minutes: t.targetMinutes || null, minutes_spent: t.minutesSpent || 0, done: !!t.done, done_at: t.done ? new Date().toISOString() : null, owner: "solo" });
  },
  async deleteReligious(id) {
    lsSet("masar_religious", lsGet("masar_religious", []).filter((t) => t.id !== id));
    if (hasSupabase) await supabase.from("religious_tasks").delete().eq("id", id);
  },

  async loadMandatoryLog() {
    return lsGet("masar_mandatory_log", {});
  },
  async saveMandatoryItem(date, taskKey, done) {
    const log = lsGet("masar_mandatory_log", {});
    if (!log[date]) log[date] = {};
    log[date][taskKey] = done;
    lsSet("masar_mandatory_log", log);
  },

  async loadAzkarLog() {
    return lsGet("masar_azkar_log", {});
  },
  async saveAzkarLog(date, session, done) {
    const log = lsGet("masar_azkar_log", {});
    if (!log[date]) log[date] = {};
    log[date][session] = done;
    lsSet("masar_azkar_log", log);
  },

  async loadQuranProgress() {
    return lsGet("masar_quran_juz", {});
  },
  async saveQuranJuz(juzNum, done) {
    const data = lsGet("masar_quran_juz", {});
    data[juzNum] = done;
    lsSet("masar_quran_juz", data);
  },

  async loadGamify() {
    const local = lsGet(LS.gamify, { points: 0, badges: [] });
    if (!hasSupabase) return local;
    const { data, error } = await supabase.from("gamify").select("*").eq("owner", "solo").maybeSingle();
    if (error || !data) return local;
    const g = { points: data.points, badges: data.badges || [] };
    lsSet(LS.gamify, g);
    return g;
  },
  async saveGamify(g) {
    lsSet(LS.gamify, g);
    if (hasSupabase) await supabase.from("gamify").upsert({ owner: "solo", points: g.points, badges: g.badges, updated_at: new Date().toISOString() });
  },
};
