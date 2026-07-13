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
  { id: "study", name: "الدراسة", color: "#8A7BD1" },
  { id: "reading", name: "القراءة", color: "#C9A24B" },
  { id: "learning", name: "التعلم", color: "#6FA8DC" },
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
  // Returns true/false so callers can tell a silent cloud failure apart from
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
      if (error) { console.error("[saveCategory] Supabase error:", error.message); return false; }
    }
    return true;
  },
  async deleteCategory(id) {
    const local = lsGet(LS.categories, DEFAULT_CATEGORIES).filter((c) => c.id !== id);
    lsSet(LS.categories, local);
    if (useCloud()) {
      lsSet("masar_categories_seeded", true);
      const { error } = await supabase.from("categories").delete().eq("id", id).eq("owner", CURRENT_OWNER);
      if (error) { console.error("[deleteCategory] Supabase error:", error.message); return false; }
    }
    return true;
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
    const local = lsGet("masar_profile", { about: "", hobbies: "", field: "", tourSeen: false });
    if (!useCloud()) return local;
    const { data, error } = await supabase.from("profile").select("*").eq("owner", CURRENT_OWNER).maybeSingle();
    if (error || !data) return local;
    const p = { about: data.about || "", hobbies: data.hobbies || "", field: data.field || "", tourSeen: !!data.tour_seen };
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
  async saveTourSeen(seen) {
    const local = lsGet("masar_profile", { about: "", hobbies: "", field: "", tourSeen: false });
    lsSet("masar_profile", { ...local, tourSeen: seen });
    if (useCloud()) {
      const { error } = await supabase.from("profile").upsert({ owner: CURRENT_OWNER, tour_seen: seen, updated_at: new Date().toISOString() });
      if (error) console.error("[saveTourSeen] Supabase error:", error.message);
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
    const items = data.map((r) => ({ id: r.id, date: r.date, minutes: r.minutes, label: r.label || "", isStudy: !!r.is_study, start: r.start_time || null, end: r.end_time || null }));
    lsSet("masar_focus", items);
    return items;
  },
  async saveFocus(session) {
    const local = lsGet("masar_focus", []);
    lsSet("masar_focus", [session, ...local]);
    if (useCloud()) {
      const { error } = await supabase.from("focus_sessions").upsert({ id: session.id, date: session.date, minutes: session.minutes, label: session.label || "", is_study: !!session.isStudy, start_time: session.start || null, end_time: session.end || null, owner: CURRENT_OWNER });
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
    const items = data.map((r) => ({
      id: r.id, date: r.date, prayerId: r.prayer_id,
      minutesAfterAdhan: typeof r.minutes_after_adhan === "number" ? r.minutes_after_adhan : undefined,
    }));
    lsSet("masar_prayer_log", items);
    return items;
  },
  async savePrayer(entry) {
    const local = lsGet("masar_prayer_log", []);
    if (local.some((p) => p.date === entry.date && p.prayerId === entry.prayerId)) return;
    lsSet("masar_prayer_log", [entry, ...local]);
    if (useCloud()) {
      const { error } = await supabase.from("prayer_log").upsert({
        id: entry.id, date: entry.date, prayer_id: entry.prayerId, owner: CURRENT_OWNER,
        minutes_after_adhan: typeof entry.minutesAfterAdhan === "number" ? entry.minutesAfterAdhan : null,
      });
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
      if (error) console.error("[saveChatMessage] Supabase error:", error.message);
    }
  },
  async clearChatMessages() {
    lsSet("masar_chat_messages", []);
    if (useCloud()) {
      const { error } = await supabase.from("chat_messages").delete().eq("owner", CURRENT_OWNER);
      if (error) console.error("[clearChatMessages] Supabase error:", error.message);
    }
  },

  async loadAdhkarProgress(date) {
    const key = `masar_adhkar_progress_${date}`;
    const local = lsGet(key, {});
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("adhkar_progress").select("*").eq("owner", CURRENT_OWNER).eq("date", date);
      if (error || !data) return local;
      const progress = {};
      data.forEach((r) => {
        if (!progress[r.category]) progress[r.category] = {};
        progress[r.category][r.item_id] = { remaining: r.remaining, done: r.done };
      });
      lsSet(key, progress);
      return progress;
    } catch { return local; }
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
        if (error) console.warn("adhkar_progress sync error:", error.message);
      } catch (e) { console.warn("adhkar_progress write failed:", e); }
    }
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
        if (error) console.warn("tips_log sync error:", error.message);
      } catch (e) { console.warn("tips_log write failed:", e); }
    }
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
      if (error || !data) return local;
      const items = data.map((r) => ({
        id: r.id, title: r.title, period: r.period, createdDate: r.created_date,
        cells: r.cells || [], checkpoints: r.checkpoints || [], checkpointIndex: r.checkpoint_index || 0,
        unit: r.period === "yearly" ? "month" : "day",
        status: r.status, failures: r.failures || [],
      }));
      lsSet("masar_goals", items);
      return items;
    } catch { return local; }
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
      if (error || !data) return local;
      const v = { balance: Number(data.balance) || 0, currency: data.currency || "KWD" };
      lsSet("masar_vault", v);
      return v;
    } catch { return local; }
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
      if (error || !data) return local;
      const items = data.map((r) => ({ id: r.id, date: r.date, amount: Number(r.amount), type: r.type, reason: r.reason, createdAt: r.created_at }));
      lsSet("masar_vault_transactions", items);
      return items;
    } catch { return local; }
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
  async loadSleepLog() {
    const local = lsGet("masar_sleep_log", []);
    if (!useCloud()) return local;
    try {
      const { data, error } = await supabase.from("sleep_log").select("*").eq("owner", CURRENT_OWNER).order("date", { ascending: false });
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
};
