"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Sparkles, Clock, TrendingUp, ListChecks, Settings, ChevronLeft, ChevronRight,
  Loader2, Plus, X, Trash2, Check, Flame, Star, Edit3, Calendar,
  Sun, Target, Palette, Cloud, CloudOff,
  Rocket, BookOpen, User, Trophy, ChevronDown, ExternalLink,
  Timer, Play, Pause, RotateCcw, Zap, Download, ListPlus, Save,
  Moon, Bell, BookMarked, CheckCircle2,
} from "lucide-react";
import { fivePrayers, nextPrayer, to12h } from "@/lib/prayer";
import { store } from "@/lib/store";
import {
  todayKey, fmtHM, uid, diffMinutes, arabicDate, computeStreak,
  COLOR_CHOICES, BADGES, DEFAULT_DAILY_TASKS, analyze, parseJsonLoose,
} from "@/lib/helpers";
import { S } from "@/components/styles";
import DayWheel from "@/components/DayWheel";

export default function Page() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("today");
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [gamify, setGamify] = useState({ points: 0, badges: [] });
  const [profile, setProfile] = useState({ about: "", hobbies: "", field: "" });
  const [achieve, setAchieve] = useState([]);
  const [focus, setFocus] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [prayerLog, setPrayerLog] = useState([]);
  const [religious, setReligious] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const [c, e, t, r, g, p, a, f, cm, pl, rel] = await Promise.all([
        store.loadCategories(), store.loadEntries(), store.loadTasks(),
        store.loadReports(), store.loadGamify(), store.loadProfile(), store.loadAchieve(),
        store.loadFocus(), store.loadCommitments(), store.loadPrayerLog(), store.loadReligious(),
      ]);
      setCategories(c); setEntries(e); setTasks(t); setReports(r); setGamify(g);
      setProfile(p); setAchieve(a); setFocus(f); setCommitments(cm);
      setPrayerLog(pl); setReligious(rel);
      setLoaded(true);
    })();
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const aiHistory = useMemo(() => reports.filter((r) => r.gist).map((r) => ({ date: r.date, gist: r.gist })), [reports]);

  const stats = useMemo(() => {
    const dayHours = {};
    entries.forEach((e) => { dayHours[e.date] = (dayHours[e.date] || 0) + diffMinutes(e.start, e.end); });
    const focusMinutes = focus.reduce((s, f) => s + f.minutes, 0);
    return {
      totalEntries: entries.length,
      streak: computeStreak(entries),
      tasksDone: tasks.filter((t) => t.done).length,
      maxDayHours: Math.max(0, ...Object.values(dayHours)) / 60,
      focusSessions: focus.length,
      focusHours: focusMinutes / 60,
    };
  }, [entries, tasks, focus]);

  // award badges
  useEffect(() => {
    if (!loaded) return;
    const earned = BADGES.filter((b) => b.threshold(stats)).map((b) => b.id);
    const newOnes = earned.filter((id) => !gamify.badges.includes(id));
    if (newOnes.length) {
      const next = { ...gamify, badges: [...gamify.badges, ...newOnes] };
      setGamify(next); store.saveGamify(next);
      showToast(`شارة جديدة: ${BADGES.find((b) => b.id === newOnes[0]).name}`);
    }
  }, [stats, loaded]);

  const addPoints = useCallback((n) => {
    setGamify((g) => { const next = { ...g, points: g.points + n }; store.saveGamify(next); return next; });
  }, []);

  if (!loaded) {
    return <div style={{ ...S.app, ...S.loaderWrap }}><Loader2 size={28} color="#C9A24B" className="spin" /></div>;
  }

  return (
    <div style={S.app}>
      <Header view={view} setView={setView} gamify={gamify} stats={stats} hasCloud={store.hasCloud} />
      <div style={S.body}>
        {view === "today" && (
          <TodayView
            date={selectedDate} setDate={setSelectedDate}
            entries={entries} setEntries={setEntries}
            categories={categories} tasks={tasks} setTasks={setTasks}
            reports={reports} setReports={setReports}
            aiHistory={aiHistory} addPoints={addPoints} showToast={showToast}
          />
        )}
        {view === "prayer" && <PrayerView prayerLog={prayerLog} setPrayerLog={setPrayerLog} religious={religious} setReligious={setReligious} addPoints={addPoints} showToast={showToast} />}
        {view === "tasks" && <TasksView tasks={tasks} setTasks={setTasks} categories={categories} addPoints={addPoints} showToast={showToast} />}
        {view === "focus" && <FocusView focus={focus} setFocus={setFocus} commitments={commitments} setCommitments={setCommitments} categories={categories} addPoints={addPoints} showToast={showToast} />}
        {view === "achieve" && <AchieveView achieve={achieve} setAchieve={setAchieve} profile={profile} focus={focus} tasks={tasks} addPoints={addPoints} showToast={showToast} />}
        {view === "reports" && <ReportsView entries={entries} categories={categories} focus={focus} profile={profile} showToast={showToast} />}
        {view === "ai" && <AIView entries={entries} tasks={tasks} categories={categories} reports={reports} setReports={setReports} aiHistory={aiHistory} focus={focus} commitments={commitments} prayerLog={prayerLog} religious={religious} />}
        {view === "settings" && <SettingsView categories={categories} setCategories={setCategories} gamify={gamify} hasCloud={store.hasCloud} showToast={showToast} profile={profile} setProfile={setProfile} />}
      </div>
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

function Header({ view, setView, gamify, stats, hasCloud }) {
  const tabs = [
    { id: "today", label: "اليوم", icon: Clock },
    { id: "prayer", label: "الصلاة", icon: Moon },
    { id: "focus", label: "تركيز", icon: Timer },
    { id: "tasks", label: "المهام", icon: ListChecks },
    { id: "achieve", label: "أنجز", icon: Rocket },
    { id: "reports", label: "التقارير", icon: TrendingUp },
    { id: "ai", label: "التحليل", icon: Sparkles },
    { id: "settings", label: "التخصيص", icon: Settings },
  ];
  return (
    <div style={S.header}>
      <div style={S.headerTop}>
        <div style={S.brand}><span style={S.brandMark}>◐</span><span style={S.brandText}>مسار</span></div>
        <div style={S.headerStats}>
          <span title={hasCloud ? "متصل بالسحابة" : "تخزين محلي"} style={{ ...S.cloudDot, background: hasCloud ? "rgba(95,168,160,0.15)" : "rgba(107,104,99,0.15)", color: hasCloud ? "#5FA8A0" : "#8A8782", display: "flex", alignItems: "center", gap: 4 }}>
            {hasCloud ? <Cloud size={11} /> : <CloudOff size={11} />}
          </span>
          <span style={S.hStat}><Flame size={13} color="#D17B5F" /> {stats.streak}</span>
          <span style={S.hStat}><Star size={13} color="#C9A24B" /> {gamify.points}</span>
        </div>
      </div>
      <div style={S.tabs}>
        {tabs.map((t) => {
          const Icon = t.icon; const active = view === t.id;
          return (
            <button key={t.id} onClick={() => setView(t.id)} style={{ ...S.tabBtn, ...(active ? S.tabBtnActive : {}) }}>
              <Icon size={15} strokeWidth={2} /><span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TodayView({ date, setDate, entries, setEntries, categories, tasks, setTasks, reports, setReports, aiHistory, addPoints, showToast }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const dayEntries = useMemo(() => entries.filter((e) => e.date === date).sort((a, b) => a.start.localeCompare(b.start)), [entries, date]);
  const totalMinutes = dayEntries.reduce((s, e) => s + diffMinutes(e.start, e.end), 0);
  const dayTasks = tasks.filter((t) => t.due === date);
  const isToday = date === todayKey();
  const dailyReport = reports.find((r) => r.kind === "daily" && r.date === date);

  async function saveEntry(entry) {
    setEntries((prev) => prev.some((e) => e.id === entry.id) ? prev.map((e) => (e.id === entry.id ? entry : e)) : [...prev, entry]);
    await store.saveEntry(entry);
    if (!editingEntry) addPoints(15);
    setModalOpen(false); setEditingEntry(null); showToast("تم الحفظ");
  }
  async function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await store.deleteEntry(id); showToast("تم الحذف");
  }
  async function toggleTask(t) {
    const updated = { ...t, done: !t.done };
    setTasks((prev) => prev.map((x) => x.id === t.id ? updated : x));
    await store.saveTask(updated);
    if (!t.done) addPoints(10);
  }

  const byCategory = useMemo(() => {
    const m = {};
    dayEntries.forEach((e) => { m[e.catId] = (m[e.catId] || 0) + diffMinutes(e.start, e.end); });
    return Object.entries(m).map(([catId, mins]) => ({ catId, mins, ...catMap[catId] })).sort((a, b) => b.mins - a.mins);
  }, [dayEntries, catMap]);

  function shiftDay(delta) {
    const d = new Date(date); d.setDate(d.getDate() + delta); setDate(todayKey(d));
  }

  return (
    <div style={S.view}>
      <div style={S.dateRow}>
        <button onClick={() => shiftDay(-1)} style={S.iconBtn}><ChevronRight size={18} /></button>
        <div style={S.dateLabel}>{arabicDate(date, { weekday: "long", day: "numeric", month: "long" })}{isToday && <span style={S.todayPill}>اليوم</span>}</div>
        <button onClick={() => shiftDay(1)} style={S.iconBtn}><ChevronLeft size={18} /></button>
      </div>

      <div style={S.wheelSection}>
        <DayWheel entries={dayEntries} catMap={catMap} size={224} />
        {dayEntries.length === 0 && (
          <div style={S.wheelStats}><div style={S.wheelTotal}>{fmtHM(0)}</div><div style={S.wheelTotalLabel}>ابدأ يومك</div></div>
        )}
      </div>
      <div style={{ textAlign: "center", marginBottom: 14, marginTop: -4 }}>
        <span style={{ fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 }}>{fmtHM(totalMinutes)}</span>
        <span style={{ fontSize: 11, color: "#6B6863", marginRight: 8 }}>إجمالي اليوم · اضغط أي قوس لتفاصيله</span>
      </div>

      <div style={S.legendRow}>
        {byCategory.map((c) => (
          <div key={c.catId} style={S.legendChip}><span style={{ ...S.legendDot, background: c.color }} /><span>{c.name}</span><span style={S.legendMins}>{fmtHM(c.mins)}</span></div>
        ))}
        {byCategory.length === 0 && <div style={S.emptyHint}>لا أنشطة مسجلة لهذا اليوم</div>}
      </div>

      <DailyEvolution
        date={date} dayEntries={dayEntries} catMap={catMap}
        report={dailyReport?.payload} aiHistory={aiHistory}
        onSave={async (payload, gist) => {
          const rep = { id: uid(), kind: "daily", date, payload, gist };
          setReports((prev) => [rep, ...prev.filter((r) => !(r.kind === "daily" && r.date === date))]);
          await store.saveReport(rep);
        }}
      />

      <div style={S.entryListHeader}>
        <span>السجل</span>
        <button onClick={() => { setEditingEntry(null); setModalOpen(true); }} style={S.addBtn}><Plus size={16} /><span>إضافة نشاط</span></button>
      </div>
      <div style={S.entryList}>
        {dayEntries.length === 0 && <div style={S.emptyState}><div style={S.emptyStateTitle}>ابدأ يومك</div><div style={S.emptyStateSub}>سجّل أول نشاط لترى عجلة يومك تنبض</div></div>}
        {dayEntries.map((e) => {
          const cat = catMap[e.catId] || { name: "غير محدد", color: "#9A968F" };
          return (
            <div key={e.id} style={S.entryRow} onClick={() => { setEditingEntry(e); setModalOpen(true); }}>
              <span style={{ ...S.entryBar, background: cat.color }} />
              <div style={S.entryInfo}><div style={S.entryName}>{cat.name}</div>{e.note && <div style={S.entryNote}>{e.note}</div>}</div>
              <div style={S.entryTime}><div>{e.start} – {e.end}</div><div style={S.entryDuration}>{fmtHM(diffMinutes(e.start, e.end))}</div></div>
              <button onClick={(ev) => { ev.stopPropagation(); deleteEntry(e.id); }} style={S.deleteBtn}><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>

      {dayTasks.length > 0 && (
        <div style={S.quickTasks}>
          <div style={S.quickTasksTitle}>مهام اليوم</div>
          {dayTasks.map((t) => (
            <div key={t.id} style={S.quickTaskRow} onClick={() => toggleTask(t)}>
              <span style={{ ...S.checkbox, ...(t.done ? S.checkboxDone : {}) }}>{t.done && <Check size={12} />}</span>
              <span style={{ ...S.quickTaskText, ...(t.done ? S.quickTaskTextDone : {}) }}>{t.title}</span>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <EntryModal entry={editingEntry} date={date} categories={categories} onSave={saveEntry} onClose={() => { setModalOpen(false); setEditingEntry(null); }} />}
    </div>
  );
}

function DailyEvolution({ date, dayEntries, catMap, report, aiHistory, onSave }) {
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState(report || null);
  useEffect(() => { setLocal(report || null); }, [report, date]);

  async function generate() {
    if (dayEntries.length === 0) { setLocal({ error: "سجّل بعض الأنشطة أولاً حتى أقدر ألخّص يومك." }); return; }
    setLoading(true);
    try {
      const summary = dayEntries.map((e) => `${catMap[e.catId]?.name || "غير محدد"} | ${e.start}-${e.end} | ${e.note || ""}`).join("\n");
      const prevGists = aiHistory.slice(0, 3).map((h) => h.gist).join(" / ");
      const prompt = `أنت مرشد تطوير ذاتي يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. هذا سجل أنشطة المستخدم ليوم واحد:\n${summary}\n\n${prevGists ? `ملخصات أيام سابقة لا تكررها بل تبني عليها: ${prevGists}` : ""}\n\nاكتب ملخصاً ملهماً قصيراً عن أداء اليوم مع نصيحة عملية للغد. أعد فقط JSON بدون أي نص أو markdown:\n{"summary":"جملتان عن أداء اليوم","tip":"نصيحة واحدة قصيرة للغد","mood":"كلمة واحدة تصف اليوم","gist":"ملخص 6 كلمات"}`;
      const text = await analyze(prompt, 500);
      const parsed = parseJsonLoose(text);
      setLocal(parsed); onSave(parsed, parsed.gist);
    } catch { setLocal({ error: "تعذّر التحليل الآن، جرّب مرة أخرى." }); }
    finally { setLoading(false); }
  }

  return (
    <div style={S.evolutionCard}>
      <div style={S.evolutionHeader}>
        <div style={S.evolutionTitleRow}><Sun size={16} color="#C9A24B" /><span style={S.evolutionTitle}>تطوّرك اليوم</span></div>
        <button onClick={generate} disabled={loading} style={S.evolutionBtn}>
          {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
          {loading ? "..." : local && !local.error ? "تحديث" : "لخّص يومي"}
        </button>
      </div>
      {!local && <div style={S.evolutionEmpty}>اطلب من مسار أن يلخّص يومك ويقترح خطوة للغد.</div>}
      {local?.error && <div style={S.evolutionEmpty}>{local.error}</div>}
      {local && !local.error && (
        <div>
          {local.mood && <span style={S.moodPill}>{local.mood}</span>}
          <p style={S.evolutionSummary}>{local.summary}</p>
          {local.tip && <div style={S.tipBox}><Target size={13} color="#5FA8A0" /><span>{local.tip}</span></div>}
        </div>
      )}
    </div>
  );
}

function TasksView({ tasks, setTasks, categories, addPoints, showToast }) {
  const [title, setTitle] = useState("");
  const [catId, setCatId] = useState(categories[0]?.id);
  const [due, setDue] = useState(todayKey());
  const [filter, setFilter] = useState("all");
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  async function addTask() {
    if (!title.trim()) return;
    const t = { id: uid(), title: title.trim(), catId, due, done: false, created: todayKey() };
    setTasks((prev) => [...prev, t]); await store.saveTask(t); setTitle(""); showToast("تمت إضافة المهمة");
  }
  async function addDefaults() {
    const existing = new Set(tasks.filter((t) => t.due === todayKey()).map((t) => t.title));
    const toAdd = DEFAULT_DAILY_TASKS.filter((title) => !existing.has(title))
      .map((title) => ({ id: uid(), title, catId, due: todayKey(), done: false, created: todayKey() }));
    if (toAdd.length === 0) { showToast("الأساسيات مضافة بالفعل"); return; }
    setTasks((prev) => [...prev, ...toAdd]);
    for (const t of toAdd) await store.saveTask(t);
    showToast(`أضفت ${toAdd.length} مهام أساسية`);
  }
  async function toggle(t) {
    const updated = { ...t, done: !t.done };
    setTasks((prev) => prev.map((x) => x.id === t.id ? updated : x));
    await store.saveTask(updated); if (!t.done) addPoints(10);
  }
  async function remove(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id)); await store.deleteTask(id); showToast("تم الحذف");
  }

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filter === "active") list = list.filter((t) => !t.done);
    if (filter === "done") list = list.filter((t) => t.done);
    return list.sort((a, b) => a.done !== b.done ? (a.done ? 1 : -1) : (a.due || "").localeCompare(b.due || ""));
  }, [tasks, filter]);
  const activeCount = tasks.filter((t) => !t.done).length;

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>دفترك الذكي</div>
      <div style={S.taskComposer}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder="أضف مهمة جديدة..." style={S.taskInput} />
        <button onClick={addTask} style={S.taskAddBtn}><Plus size={18} /></button>
      </div>
      <div style={S.taskMeta}>
        <div style={S.catScroll}>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCatId(c.id)} style={{ ...S.catMini, borderColor: catId === c.id ? c.color : "#2A2A2D", background: catId === c.id ? `${c.color}22` : "transparent" }}>
              <span style={{ ...S.legendDot, background: c.color }} />{c.name}
            </button>
          ))}
        </div>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={S.dateInput} />
      </div>
      <div style={S.filterRow}>
        {[{ id: "all", label: "الكل" }, { id: "active", label: `النشطة (${activeCount})` }, { id: "done", label: "المنجزة" }].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ ...S.filterBtn, ...(filter === f.id ? S.filterBtnActive : {}) }}>{f.label}</button>
        ))}
        <button onClick={addDefaults} style={S.defaultsBtn} title="أضف أساسيات اليوم"><ListPlus size={14} /> أساسيات اليوم</button>
      </div>
      <div style={S.taskList}>
        {filtered.length === 0 && <div style={S.emptyState}><div style={S.emptyStateTitle}>لا مهام هنا</div><div style={S.emptyStateSub}>أضف مهمة لتبدأ</div></div>}
        {filtered.map((t) => {
          const cat = catMap[t.catId];
          return (
            <div key={t.id} style={S.taskRow}>
              <span onClick={() => toggle(t)} style={{ ...S.checkbox, ...(t.done ? S.checkboxDone : {}) }}>{t.done && <Check size={12} />}</span>
              <div style={S.taskInfo}>
                <div style={{ ...S.taskTitle, ...(t.done ? S.taskTitleDone : {}) }}>{t.title}</div>
                <div style={S.taskTags}>
                  {cat && <span style={S.taskTag}><span style={{ ...S.legendDot, background: cat.color, width: 6, height: 6 }} />{cat.name}</span>}
                  {t.due && <span style={S.taskTag}><Calendar size={10} />{arabicDate(t.due, { day: "numeric", month: "short" })}</span>}
                </div>
              </div>
              <button onClick={() => remove(t.id)} style={S.deleteBtn}><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportsView({ entries, categories, focus, profile, showToast }) {
  const [range, setRange] = useState("week");
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const span = range === "week" ? 7 : 30;
  const days = useMemo(() => {
    const arr = []; const today = new Date();
    for (let i = span - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); arr.push(todayKey(d)); }
    return arr;
  }, [span]);
  const barData = days.map((day) => ({
    day, label: range === "week" ? arabicDate(day, { weekday: "short" }) : arabicDate(day, { day: "numeric" }),
    hours: +(entries.filter((e) => e.date === day).reduce((s, e) => s + diffMinutes(e.start, e.end), 0) / 60).toFixed(1),
  }));
  const totalMin = entries.filter((e) => days.includes(e.date)).reduce((s, e) => s + diffMinutes(e.start, e.end), 0);
  const activeDays = new Set(entries.filter((e) => days.includes(e.date)).map((e) => e.date)).size;
  const avgPerActiveDay = activeDays ? totalMin / activeDays : 0;
  const focusMin = (focus || []).filter((f) => days.includes(f.date)).reduce((s, f) => s + f.minutes, 0);
  const catTotals = useMemo(() => {
    const m = {};
    entries.filter((e) => days.includes(e.date)).forEach((e) => { m[e.catId] = (m[e.catId] || 0) + diffMinutes(e.start, e.end); });
    return Object.entries(m).map(([catId, mins]) => ({ name: catMap[catId]?.name || "غير محدد", value: mins, color: catMap[catId]?.color || "#9A968F" })).sort((a, b) => b.value - a.value);
  }, [entries, days, catMap]);

  function exportPdf() {
    const rangeLabel = range === "week" ? "الأسبوعي" : "الشهري";
    const rows = catTotals.map((c) => `<tr><td>${c.name}</td><td>${fmtHM(c.value)}</td></tr>`).join("");
    const dayRows = barData.filter((d) => d.hours > 0).map((d) => `<tr><td>${d.label}</td><td>${d.hours} ساعة</td></tr>`).join("");
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير مسار ${rangeLabel}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Amiri:wght@700&display=swap');
        body{font-family:'Tajawal',sans-serif;color:#1a1a1a;padding:40px;max-width:700px;margin:auto}
        h1{font-family:'Amiri',serif;color:#8a6d28;border-bottom:2px solid #C9A24B;padding-bottom:10px}
        .meta{color:#666;font-size:13px;margin-bottom:24px}
        .kpis{display:flex;gap:16px;margin-bottom:24px}
        .kpi{flex:1;border:1px solid #ddd;border-radius:10px;padding:14px;text-align:center}
        .kpi .v{font-family:'Amiri',serif;font-size:22px;font-weight:700;color:#8a6d28}
        .kpi .l{font-size:12px;color:#666;margin-top:4px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th,td{text-align:right;padding:8px 12px;border-bottom:1px solid #eee;font-size:14px}
        th{color:#8a6d28;font-size:12px}
        h2{font-size:16px;margin-top:24px}
        .footer{margin-top:40px;color:#999;font-size:11px;text-align:center}
      </style></head><body>
      <h1>◐ تقرير مسار ${rangeLabel}</h1>
      <div class="meta">${profile?.about ? profile.about + " · " : ""}صدر بتاريخ ${arabicDate(todayKey(), { day: "numeric", month: "long", year: "numeric" })}</div>
      <div class="kpis">
        <div class="kpi"><div class="v">${fmtHM(totalMin)}</div><div class="l">إجمالي الوقت المسجّل</div></div>
        <div class="kpi"><div class="v">${activeDays}</div><div class="l">أيام نشطة</div></div>
        <div class="kpi"><div class="v">${fmtHM(focusMin)}</div><div class="l">وقت التركيز</div></div>
      </div>
      <h2>توزيع الأنشطة</h2>
      <table><tr><th>الفئة</th><th>الوقت</th></tr>${rows || '<tr><td colspan=2>لا بيانات</td></tr>'}</table>
      <h2>الساعات اليومية</h2>
      <table><tr><th>اليوم</th><th>الساعات</th></tr>${dayRows || '<tr><td colspan=2>لا بيانات</td></tr>'}</table>
      <div class="footer">مسار · أداتك الشخصية للوقت وتطوير الذات</div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { showToast("اسمح بالنوافذ المنبثقة للتصدير"); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
  }

  return (
    <div style={S.view}>
      <div style={S.reportsHead}>
        <div style={S.sectionTitle}>تقاريرك</div>
        <div style={S.rangeToggle}>
          <button onClick={() => setRange("week")} style={{ ...S.rangeBtn, ...(range === "week" ? S.rangeBtnActive : {}) }}>أسبوع</button>
          <button onClick={() => setRange("month")} style={{ ...S.rangeBtn, ...(range === "month" ? S.rangeBtnActive : {}) }}>شهر</button>
        </div>
      </div>

      <button onClick={exportPdf} style={S.exportBtn}><Download size={15} /> تصدير التقرير PDF</button>

      <div style={S.kpiRow}>
        <div style={S.kpiCard}><div style={S.kpiValue}>{fmtHM(totalMin)}</div><div style={S.kpiLabel}>الإجمالي</div></div>
        <div style={S.kpiCard}><div style={S.kpiValue}>{activeDays}</div><div style={S.kpiLabel}>أيام نشطة</div></div>
        <div style={S.kpiCard}><div style={S.kpiValue}>{fmtHM(avgPerActiveDay)}</div><div style={S.kpiLabel}>معدل اليوم</div></div>
      </div>
      <div style={S.chartCard}>
        <div style={S.chartTitle}>الساعات {range === "week" ? "اليومية" : "خلال الشهر"}</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={barData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1F1F22" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#6B6863", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "#2A2A2D" }} tickLine={false} interval={range === "week" ? 0 : 3} />
            <YAxis tick={{ fill: "#6B6863", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#1A1A1D", border: "1px solid #2A2A2D", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ساعة`, ""]} />
            <Bar dataKey="hours" radius={[3, 3, 3, 3]} fill="#C9A24B" maxBarSize={range === "week" ? 28 : 12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={S.chartCard}>
        <div style={S.chartTitle}>توزيع الأنشطة</div>
        {catTotals.length === 0 ? <div style={S.emptyHint}>لا بيانات كافية بعد</div> : (
          <div style={S.pieRow}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={catTotals} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none">
                  {catTotals.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1A1A1D", border: "1px solid #2A2A2D", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v, n) => [fmtHM(v), n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={S.pieLegend}>
              {catTotals.map((c, i) => (
                <div key={i} style={S.legendChip}><span style={{ ...S.legendDot, background: c.color }} /><span>{c.name}</span><span style={S.legendMins}>{fmtHM(c.value)}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={S.chartCard}>
        <div style={S.chartTitle}>اتجاه الإنتاجية</div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={barData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1F1F22" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#6B6863", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "#2A2A2D" }} tickLine={false} interval={range === "week" ? 0 : 3} />
            <YAxis tick={{ fill: "#6B6863", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#1A1A1D", border: "1px solid #2A2A2D", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ساعة`, ""]} />
            <Line type="monotone" dataKey="hours" stroke="#C9A24B" strokeWidth={2} dot={{ fill: "#C9A24B", r: range === "week" ? 3 : 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AIView({ entries, tasks, categories, reports, setReports, aiHistory, focus, commitments, prayerLog, religious }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  async function generate() {
    if (entries.length === 0 && (!focus || focus.length === 0)) { setReport({ error: "سجّل بعض الأنشطة أو جلسات التركيز أولاً حتى أقدر أحلّل أداءك." }); return; }
    setLoading(true);
    try {
      const summary = entries.slice(-120).map((e) => `${e.date} | ${catMap[e.catId]?.name || "غير محدد"} | ${e.start}-${e.end} | ${e.note || ""}`).join("\n");
      const doneTasks = tasks.filter((t) => t.done).length;
      const taskInfo = `المهام: ${doneTasks} منجزة من ${tasks.length} (نسبة الالتزام ${tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0}%)`;
      const focusMin = (focus || []).reduce((s, f) => s + f.minutes, 0);
      const studyMin = (focus || []).filter((f) => f.isStudy).reduce((s, f) => s + f.minutes, 0);
      const focusInfo = `التركيز: ${focusMin} دقيقة إجمالا، منها ${studyMin} دقيقة دراسة، عبر ${(focus || []).length} جلسة`;
      const commitInfo = (commitments || []).length ? `تحديات الالتزام: ${commitments.map((c) => c.title).join("، ")}` : "";
      const prayerInfo = (prayerLog || []).length ? `الصلوات المسجّلة: ${prayerLog.filter((p) => p.date === todayKey()).length} اليوم` : "";
      const religiousDone = (religious || []).filter((r) => r.done).length;
      const religiousInfo = religiousDone ? `المهام الدينية المنجزة: ${religiousDone}` : "";
      const prev = aiHistory.slice(0, 3).map((h, i) => `${i + 1}: ${h.gist}`).join("\n");

      const prompt = `أنت مرشد تطوير ذاتي وخبير إنتاجية يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. حلل أداء مستخدم هو مصور ومصمم محتوى بصري وطالب جامعي تحليلاً حياً وعملياً.\n\nسجل الأنشطة (تاريخ | فئة | وقت | ملاحظة):\n${summary || "لا يوجد"}\n\n${taskInfo}\n${focusInfo}\n${commitInfo}\n${prayerInfo}\n${religiousInfo}\n\n${prev ? `تقارير سابقة لا تكررها بل تتجاوزها برؤى جديدة:\n${prev}` : ""}\n\nركّز تحليلك على: مدى الالتزام بالمهام، معدل التركيز اليومي، عدد الإنجازات، والتوازن بين الدراسة والعمل والروحانية. أعد فقط JSON بدون أي نص أو markdown:\n{"headline":"جملة قوية تلخص الأداء","insights":["رؤية محددة بالأرقام 1","رؤية 2","رؤية 3"],"warning":"تحذير من نمط غير صحي أو null","recommendations":["توصية عملية 1","توصية 2","توصية 3"],"focus_area":"مجال تركيز للأسبوع القادم","gist":"ملخص 10 كلمات"}`;
      const text = await analyze(prompt, 1100);
      const parsed = parseJsonLoose(text);
      setReport(parsed);
      const rep = { id: uid(), kind: "deep", date: todayKey(), payload: parsed, gist: parsed.gist || parsed.headline };
      setReports((prev2) => [rep, ...prev2]); await store.saveReport(rep);
    } catch { setReport({ error: "تعذر التحليل الآن، جرّب مرة أخرى." }); }
    finally { setLoading(false); }
  }

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>التحليل العميق</div>
      <p style={S.aiIntro}>نظرة شاملة على نمطك عبر الزمن. كل تحليل يبني على ما سبقه ويضيف رؤى جديدة.</p>
      <button onClick={generate} disabled={loading} style={S.aiButton}>
        {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
        {loading ? "يحلّل نمطك الآن..." : "حلّل أنشطتي"}
      </button>
      {report && !report.error && (
        <div style={S.reportCard}>
          <div style={S.reportHeadline}>{report.headline}</div>
          {report.warning && report.warning !== "null" && <div style={S.warningBox}>⚠ {report.warning}</div>}
          <div style={S.reportBlock}><div style={S.reportBlockTitle}>رؤى</div>{report.insights?.map((it, i) => <div key={i} style={S.reportItem}><span style={S.reportDot}>•</span>{it}</div>)}</div>
          <div style={S.reportBlock}><div style={S.reportBlockTitle}>توصيات</div>{report.recommendations?.map((it, i) => <div key={i} style={S.reportItem}><span style={S.reportDot}>•</span>{it}</div>)}</div>
          {report.focus_area && <div style={S.focusBox}><span style={S.focusLabel}>تركيز الأسبوع القادم</span><span style={S.focusValue}>{report.focus_area}</span></div>}
        </div>
      )}
      {report?.error && <div style={S.warningBox}>{report.error}</div>}
      {aiHistory.length > 0 && (
        <div style={S.historyBlock}>
          <div style={S.reportBlockTitle}>سجل تطوّرك</div>
          {aiHistory.slice(0, 8).map((h, i) => (
            <div key={i} style={S.historyRow}><span style={S.historyDate}>{arabicDate(h.date, { day: "numeric", month: "short" })}</span><span>{h.gist}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrayerView({ prayerLog, setPrayerLog, religious, setReligious, addPoints, showToast }) {
  const [now, setNow] = useState(new Date());
  const [notifEnabled, setNotifEnabled] = useState(false);
  const notifiedRef = useRef({});

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(iv);
  }, []);

  const prayers = useMemo(() => fivePrayers(now), [now]);
  const next = useMemo(() => nextPrayer(now), [now]);
  const today = todayKey();
  const todayLog = prayerLog.filter((p) => p.date === today);
  const isDone = (id) => todayLog.some((p) => p.prayerId === id);

  useEffect(() => {
    if (!notifEnabled || typeof Notification === "undefined") return;
    const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    for (const p of prayers) {
      if (p.time === cur && !notifiedRef.current[p.id + today]) {
        notifiedRef.current[p.id + today] = true;
        try {
          new Notification("حان وقت الصلاة", { body: `${p.name}: لا تنسَ أن تتوضأ وتصلّي`, icon: "/icon.png" });
        } catch {}
      }
    }
  }, [now, notifEnabled, prayers, today]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") { showToast("متصفحك لا يدعم الإشعارات"); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") { setNotifEnabled(true); showToast("تم تفعيل إشعارات الصلاة"); }
    else showToast("لم يُسمح بالإشعارات");
  }

  async function togglePrayer(p) {
    if (isDone(p.id)) {
      setPrayerLog((prev) => prev.filter((x) => !(x.date === today && x.prayerId === p.id)));
      await store.removePrayer(today, p.id);
    } else {
      const entry = { id: uid(), date: today, prayerId: p.id };
      setPrayerLog((prev) => [entry, ...prev]);
      await store.savePrayer(entry);
      addPoints(20);
      showToast(`تُقبّل ${p.name}`);
    }
  }

  const todayReligious = religious.filter((r) => r.date === today);
  async function addReligiousPreset(preset) {
    if (todayReligious.some((r) => r.taskKey === preset.key)) { showToast("مضافة بالفعل اليوم"); return; }
    const t = { id: uid(), date: today, taskKey: preset.key, title: preset.title, targetCount: preset.targetCount, targetMinutes: preset.targetMinutes, minutesSpent: 0, done: false };
    setReligious((prev) => [t, ...prev]); await store.saveReligious(t); showToast("أضيفت المهمة");
  }
  async function updateReligious(t) {
    setReligious((prev) => prev.map((x) => x.id === t.id ? t : x)); await store.saveReligious(t);
  }
  async function removeReligious(id) {
    setReligious((prev) => prev.filter((x) => x.id !== id)); await store.deleteReligious(id);
  }

  const hh = String(next.minutesUntil ? Math.floor(next.minutesUntil / 60) : 0).padStart(2, "0");
  const mm = String(next.minutesUntil ? next.minutesUntil % 60 : 0).padStart(2, "0");

  return (
    <div style={S.view}>
      <div style={S.prayerHero}>
        <Moon size={18} color="#C9A24B" />
        <div>
          <div style={S.prayerHeroTitle}>أوقات الصلاة · الكويت</div>
          <div style={S.prayerHeroSub}>{arabicDate(today, { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </div>

      <div style={S.nextPrayerCard}>
        <div style={S.nextLabel}>الصلاة القادمة</div>
        <div style={S.nextName}>{next.name}{next.tomorrow ? " (غداً)" : ""}</div>
        <div style={S.nextTime}>{to12h(next.time)}</div>
        <div style={S.nextCountdown}>بعد {hh}:{mm}</div>
      </div>

      {!notifEnabled && (
        <button onClick={enableNotifications} style={S.notifBtn}><Bell size={15} /> فعّل إشعار الأذان</button>
      )}

      <div style={S.prayerList}>
        {prayers.map((p) => {
          const done = isDone(p.id);
          const isNext = p.id === next.id && !next.tomorrow;
          return (
            <div key={p.id} style={{ ...S.prayerRow, ...(isNext ? S.prayerRowNext : {}), ...(done ? S.prayerRowDone : {}) }}>
              <div style={S.prayerInfo}>
                <div style={S.prayerName}>{p.name}</div>
                <div style={S.prayerTime}>{to12h(p.time)}</div>
              </div>
              <button onClick={() => togglePrayer(p)} style={{ ...S.prayerBtn, ...(done ? S.prayerBtnDone : {}) }}>
                {done ? <><CheckCircle2 size={15} /> تمت</> : "تمت الصلاة"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={S.religiousCard}>
        <div style={S.catEditorHeader}><BookMarked size={15} color="#C9A24B" /><span>المهام الدينية اليومية</span></div>
        <p style={S.profileHint}>كل مهمة تسجّل الدقائق التي استغرقتها قبل أن تكتمل.</p>

        {todayReligious.length === 0 && (
          <div style={S.religiousPresets}>
            {RELIGIOUS_PRESETS.map((p) => (
              <button key={p.key} onClick={() => addReligiousPreset(p)} style={S.presetAddBtn}><Plus size={14} /> {p.title}</button>
            ))}
          </div>
        )}

        <div style={S.religiousList}>
          {todayReligious.map((t) => (
            <ReligiousTask key={t.id} task={t} onUpdate={updateReligious} onRemove={removeReligious} addPoints={addPoints} showToast={showToast} />
          ))}
        </div>

        {todayReligious.length > 0 && todayReligious.length < RELIGIOUS_PRESETS.length && (
          <div style={S.religiousPresets}>
            {RELIGIOUS_PRESETS.filter((p) => !todayReligious.some((r)
function FocusView({ focus, setFocus, commitments, setCommitments, categories, addPoints, showToast }) {
  const [targetMin, setTargetMin] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("");
  const [isStudy, setIsStudy] = useState(true);
  const [subTab, setSubTab] = useState("timer"); // timer | study | general | bots
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => { if (r <= 1) { finishSession(); return 0; } return r - 1; });
      }, 1000);
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function adjust(deltaMin) {
    if (running) return;
    const next = Math.max(5, Math.min(180, targetMin + deltaMin));
    setTargetMin(next); setRemaining(next * 60);
  }
  function toggle() { setRunning((r) => !r); }
  function reset() { setRunning(false); setRemaining(targetMin * 60); }

  async function finishSession() {
    setRunning(false);
    const minutesDone = targetMin;
    const session = { id: uid(), date: todayKey(), minutes: minutesDone, label: label.trim(), isStudy };
    setFocus((prev) => [session, ...prev]);
    await store.saveFocus(session);
    addPoints(minutesDone);
    showToast(`أكملت ${minutesDone} دقيقة! +${minutesDone} نقطة`);
    setRemaining(targetMin * 60);
    setCommitments((prev) => prev.map((c) => {
      const updated = { ...c, log: { ...c.log, [todayKey()]: (c.log[todayKey()] || 0) + minutesDone } };
      store.saveCommitment(updated);
      return updated;
    }));
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const progress = 1 - remaining / (targetMin * 60);

  const subTabs = [
    { id: "timer", label: "المؤقت", icon: Timer },
    { id: "study", label: "تقرير الدراسة", icon: BookOpen },
    { id: "general", label: "تقرير عام", icon: TrendingUp },
    { id: "bots", label: "التحدي", icon: Zap },
  ];

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>تركيز</div>

      <div style={S.subTabRow}>
        {subTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)} style={{ ...S.subTab, ...(subTab === t.id ? S.subTabActive : {}) }}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {subTab === "timer" && (
        <>
          <div style={S.timerCard}>
            <FocusRing progress={progress} size={224}>
              <div style={S.timerTime}>{mm}:{ss}</div>
              <div style={S.timerTargetLabel}>{running ? "ركّز الآن" : `${targetMin} دقيقة`}</div>
            </FocusRing>

            <div style={S.adjustRow}>
              <button onClick={() => adjust(-5)} disabled={running} style={S.adjustBtn}>−5</button>
              <button onClick={() => adjust(-1)} disabled={running} style={S.adjustBtnSmall}>−1</button>
              <span style={S.adjustValue}>{targetMin} د</span>
              <button onClick={() => adjust(1)} disabled={running} style={S.adjustBtnSmall}>+1</button>
              <button onClick={() => adjust(5)} disabled={running} style={S.adjustBtn}>+5</button>
            </div>

            <div style={S.studyToggleRow}>
              <button onClick={() => setIsStudy(true)} style={{ ...S.studyToggle, ...(isStudy ? S.studyToggleActive : {}) }}><BookOpen size={13} /> دراسة</button>
              <button onClick={() => setIsStudy(false)} style={{ ...S.studyToggle, ...(!isStudy ? S.studyToggleActive : {}) }}><Zap size={13} /> نشاط عام</button>
            </div>

            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="على ماذا تركّز؟ (اختياري)" style={{ ...S.input, marginTop: 12 }} />

            <div style={S.timerControls}>
              <button onClick={reset} style={S.timerSecondary}><RotateCcw size={18} /></button>
              <button onClick={toggle} style={S.timerPrimary}>
                {running ? <Pause size={20} /> : <Play size={20} />}
                {running ? "إيقاف مؤقت" : "ابدأ"}
              </button>
            </div>
          </div>

          <div style={S.memoryNote}><Save size={13} color="#5FA8A0" /><span>كل جلسة تُحفظ بشكل دائم في ذاكرة التايمر، وتظهر في التقريرين أدناه ولا تُحذف.</span></div>

          <CommitmentsSection commitments={commitments} setCommitments={setCommitments} categories={categories} focus={focus} showToast={showToast} />
        </>
      )}

      {subTab === "study" && <FocusReport focus={focus.filter((f) => f.isStudy)} title="تقرير الدراسة" color="#5FA8A0" emptyMsg="لا جلسات دراسة بعد. شغّل المؤقت بوضع دراسة." />}
      {subTab === "general" && <FocusReport focus={focus.filter((f) => !f.isStudy)} title="التقرير العام" color="#C9A24B" emptyMsg="لا جلسات عامة بعد. شغّل المؤقت بوضع نشاط عام." />}
      {subTab === "bots" && <BotsChallenge focus={focus} />}
    </div>
  );
}

function FocusReport({ focus, title, color, emptyMsg }) {
  const totalMin = focus.reduce((s, f) => s + f.minutes, 0);
  const todayMin = focus.filter((f) => f.date === todayKey()).reduce((s, f) => s + f.minutes, 0);
  const streak = useMemo(() => {
    const days = new Set(focus.map((f) => f.date));
    let s = 0; let d = new Date();
    if (!days.has(todayKey(d))) { d.setDate(d.getDate() - 1); if (!days.has(todayKey(d))) return 0; }
    while (days.has(todayKey(d))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }, [focus]);
  const last14 = useMemo(() => {
    const arr = []; const today = new Date();
    for (let i = 13; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const k = todayKey(d); arr.push({ label: arabicDate(k, { day: "numeric" }), mins: focus.filter((f) => f.date === k).reduce((s, f) => s + f.minutes, 0) }); }
    return arr;
  }, [focus]);

  return (
    <div>
      <div style={{ ...S.sectionTitle, fontSize: 17, color }}>{title}</div>
      <div style={S.focusStatsRow}>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{fmtHM(totalMin)}</div><div style={S.kpiLabel}>الإجمالي</div></div>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{fmtHM(todayMin)}</div><div style={S.kpiLabel}>اليوم</div></div>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{streak}</div><div style={S.kpiLabel}>سلسلة الأيام</div></div>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{focus.length}</div><div style={S.kpiLabel}>جلسات</div></div>
      </div>
      <div style={S.chartCard}>
        <div style={S.chartTitle}>آخر 14 يوماً</div>
        {focus.length === 0 ? <div style={S.emptyHint}>{emptyMsg}</div> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={last14} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1F1F22" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#6B6863", fontSize: 9, fontFamily: "Tajawal" }} axisLine={{ stroke: "#2A2A2D" }} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "#6B6863", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1A1A1D", border: "1px solid #2A2A2D", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} دقيقة`, ""]} />
              <Bar dataKey="mins" radius={[3, 3, 3, 3]} fill={color} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {focus.length > 0 && (
        <div style={S.chartCard}>
          <div style={S.chartTitle}>سجل الجلسات المحفوظة</div>
          <div style={S.sessionLog}>
            {focus.slice(0, 12).map((f) => (
              <div key={f.id} style={S.sessionRow}>
                <span style={{ ...S.legendDot, background: color }} />
                <span style={S.sessionLabel}>{f.label || "جلسة تركيز"}</span>
                <span style={S.sessionMins}>{fmtHM(f.minutes)}</span>
                <span style={S.sessionDate}>{arabicDate(f.date, { day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BotsChallenge({ focus }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const myToday = focus.filter((f) => f.date === todayKey()).reduce((s, f) => s + f.minutes, 0);

  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const bots = useMemo(() => {
    const winner = Math.round(Math.min(240, hour * 11 + 20));
    const avg = Math.round(Math.max(0, Math.min(180, hour * 6 + Math.sin(hour * 1.5 + tick * 0.1) * 25)));
    const loser = Math.round(Math.max(0, Math.min(70, hour * 2.2 - 5)));
    let list = [
      { id: "winner", name: "ناجح", emoji: "🟢", mins: Math.max(winner, myToday > winner ? myToday : winner), color: "#5FA8A0", trait: "منظم ومستمر، يتفوق عليك إذا توقفت" },
      { id: "avg", name: "متوسط", emoji: "🟡", mins: avg, color: "#C9A24B", trait: "يتقدم أحياناً ويتراجع أحياناً" },
      { id: "loser", name: "متكاسل", emoji: "🔴", mins: loser, color: "#D17B5F", trait: "يتأخر دائماً ويتوقف بسرعة" },
    ];
    const me = { id: "me", name: "أنت", emoji: "⭐", mins: myToday, color: "#E8E6E1", trait: "تقدمك الحقيقي اليوم", isMe: true };
    return [...list, me].sort((a, b) => b.mins - a.mins);
  }, [hour, tick, myToday]);

  const maxMins = Math.max(60, ...bots.map((b) => b.mins));
  const myRank = bots.findIndex((b) => b.isMe) + 1;

  return (
    <div>
      <div style={{ ...S.sectionTitle, fontSize: 17 }}>تحدي الروبوتات</div>
      <p style={S.profileHint}>منافسون افتراضيون يتحركون على مدار اليوم. ركّز أكثر لتتقدم عليهم. الناجح يسبقك إن توقفت.</p>

      <div style={S.rankBanner}>
        <Trophy size={16} color={myRank === 1 ? "#C9A24B" : "#8A8782"} />
        <span>ترتيبك الآن: <strong style={{ color: myRank === 1 ? "#C9A24B" : "#E8E6E1" }}>{myRank} من 4</strong></span>
        {myRank === 1 && <span style={S.leadPill}>متصدّر</span>}
      </div>

      <div style={S.botsList}>
        {bots.map((b, i) => (
          <div key={b.id} style={{ ...S.botRow, ...(b.isMe ? S.botRowMe : {}) }}>
            <span style={S.botRank}>{i + 1}</span>
            <span style={S.botEmoji}>{b.emoji}</span>
            <div style={S.botInfo}>
              <div style={S.botName}>{b.name} {b.isMe && <span style={S.botYou}>أنت</span>}</div>
              <div style={S.botTrait}>{b.trait}</div>
              <div style={S.botBarWrap}><div style={{ ...S.botBarFill, width: `${(b.mins / maxMins) * 100}%`, background: b.color }} /></div>
            </div>
            <span style={S.botMins}>{fmtHM(b.mins)}</span>
          </div>
        ))}
      </div>
      <div style={S.memoryNote}><Zap size={13} color="#C9A24B" /><span>تتحدث أوقات الروبوتات تلقائياً كل دقيقة ومع تقدّم الساعة. ركّز الآن لترفع ترتيبك.</span></div>
    </div>
  );
}

function FocusRing({ progress, size, children }) {
  const stroke = 8;
  const r = (size - stroke) / 2 - 10;
  const c = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1F1F22" strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r} fill="none" stroke="#C9A24B" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function CommitmentsSection({ commitments, setCommitments, categories, focus, showToast }) {
  const [title, setTitle] = useState("");
  const [mins, setMins] = useState(60);

  async function add() {
    if (!title.trim()) return;
    const c = { id: uid(), title: title.trim(), targetMinutes: mins, catId: categories[0]?.id, log: {} };
    setCommitments((prev) => [...prev, c]); await store.saveCommitment(c); setTitle(""); showToast("أضفت تحدي التزام");
  }
  async function remove(id) {
    setCommitments((prev) => prev.filter((c) => c.id !== id)); await store.deleteCommitment(id);
  }

  function streakOf(c) {
    let s = 0; let d = new Date();
    const met = (k) => (c.log[k] || 0) >= c.targetMinutes;
    if (!met(todayKey(d))) { d.setDate(d.getDate() - 1); if (!met(todayKey(d))) return 0; }
    while (met(todayKey(d))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }

  return (
    <div style={S.commitCard}>
      <div style={S.catEditorHeader}><Zap size={15} color="#C9A24B" /><span>تحديات الالتزام اليومية</span></div>
      <p style={S.profileHint}>تحدٍّ فردي بدون منافسة. التزم بوقت يومي ثابت وشاهد سلسلتك تكبر.</p>

      <div style={S.commitList}>
        {commitments.map((c) => {
          const todayMin = c.log[todayKey()] || 0;
          const pct = Math.min(100, Math.round((todayMin / c.targetMinutes) * 100));
          const done = todayMin >= c.targetMinutes;
          const streak = streakOf(c);
          return (
            <div key={c.id} style={S.commitItem}>
              <div style={S.commitItemTop}>
                <div style={{ flex: 1 }}>
                  <div style={S.commitTitle}>{c.title}</div>
                  <div style={S.commitMeta}>الهدف {c.targetMinutes} دقيقة يومياً · سلسلة {streak} {streak === 1 ? "يوم" : "أيام"}</div>
                </div>
                {done && <span style={S.commitDoneBadge}><Check size={12} /> اليوم</span>}
                <button onClick={() => remove(c.id)} style={S.deleteBtn}><Trash2 size={14} /></button>
              </div>
              <div style={S.commitBarWrap}><div style={{ ...S.commitBarFill, width: `${pct}%`, background: done ? "#5FA8A0" : "#C9A24B" }} /></div>
              <div style={S.commitProgress}>{fmtHM(todayMin)} من {fmtHM(c.targetMinutes)} · جلسات التركيز تُحتسب تلقائياً</div>
            </div>
          );
        })}
        {commitments.length === 0 && <div style={S.emptyHint}>لا تحديات بعد. أضف واحداً لتبدأ.</div>}
      </div>

      <div style={S.commitAdd}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="مثال: ساعة دراسة يومياً" style={S.catEditInput} />
        <select value={mins} onChange={(e) => setMins(Number(e.target.value))} style={S.commitSelect}>
          <option value={30}>30 د</option>
          <option value={60}>60 د</option>
          <option value={90}>90 د</option>
          <option value={120}>120 د</option>
        </select>
        <button onClick={add} style={S.taskAddBtn}><Plus size={16} /></button>
      </div>
    </div>
  );
}

function AchieveView({ achieve, setAchieve, profile, focus, tasks, addPoints, showToast }) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("challenges");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachReply, setCoachReply] = useState(null);
  const hasProfile = profile.hobbies || profile.field || profile.about;

  async function askCoach(mood) {
    setCoachLoading(true); setCoachReply(null);
    try {
      const who = `نبذة: ${profile.about || "غير محدد"}. الهوايات: ${profile.hobbies || "غير محدد"}. التخصص: ${profile.field || "غير محدد"}.`;
      const todayFocus = (focus || []).filter((f) => f.date === todayKey()).reduce((s, f) => s + f.minutes, 0);
      const doneToday = (tasks || []).filter((t) => t.done && t.due === todayKey()).length;
      const prompt = `أنت "أنجز"، مدرب شخصي ذكي ودود يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. المستخدم: ${who}\nمزاجه الآن: ${mood}. ركّز اليوم ${todayFocus} دقيقة وأنجز ${doneToday} مهمة.\n\nتحدّث معه بجملة تتفهّم مزاجه، ثم اقترح له نشاطاً واحداً محدداً وقصيراً يحسّن مزاجه أو إنتاجيته الآن، مرتبطاً بهواياته أو تخصصه إن أمكن. أعد فقط JSON بدون أي نص أو markdown:\n{"message":"جملة تتفهم مزاجه","activity":"نشاط واحد محدد مقترح الآن","why":"سبب قصير لماذا هذا النشاط"}`;
      const text = await analyze(prompt, 500);
      setCoachReply(parseJsonLoose(text));
    } catch { setCoachReply({ error: "تعذّر الآن، جرّب مرة أخرى." }); }
    finally { setCoachLoading(false); }
  }

  async function generate(kind) {
    setLoading(true);
    try {
      const who = `نبذة: ${profile.about || "غير محدد"}. الهوايات: ${profile.hobbies || "غير محدد"}. التخصص: ${profile.field || "غير محدد"}.`;
      const existing = achieve.slice(0, 8).map((a) => a.title).join(" / ");
      const kindAr = kind === "challenge" ? "تحديات أسبوعية عملية" : kind === "project" ? "مشاريع صغيرة قابلة للتنفيذ" : "مسارات تعلّم متدرجة";
      const prompt = `أنت مدرب تطوير مهارات يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. المستخدم التالي يريد أن يتطور في هواياته وتخصصه.\n${who}\n\nاقترح 3 ${kindAr} مرتبطة مباشرة بهواياته أو تخصصه. كل عنصر يجب أن يكون محدداً وقابلاً للتنفيذ، ومرتبطاً باهتماماته الفعلية (مثلاً إن كان مصوراً فاقترح تحديات تصوير أو مسابقات، وإن كان في التغذية فاقترح مشاريع أو تدريبات عملية).\n\n${existing ? `لا تكرر هذه العناصر الموجودة: ${existing}` : ""}\n\nأعد فقط JSON بدون أي نص أو markdown:\n{"items":[{"title":"عنوان قصير","detail":"وصف من جملتين","steps":["خطوة 1","خطوة 2","خطوة 3"],"topic":"الهواية أو التخصص المرتبط"}]}`;
      const text = await analyze(prompt, 1100);
      const parsed = parseJsonLoose(text);
      const newItems = (parsed.items || []).map((it) => ({ id: uid(), kind, title: it.title, detail: it.detail, steps: it.steps || [], topic: it.topic || "", done: false }));
      for (const it of newItems) await store.saveAchieve(it);
      setAchieve((prev) => [...newItems, ...prev]);
      showToast(`أضفت ${newItems.length} عناصر جديدة`);
    } catch { showToast("تعذّر التوليد، جرّب مرة أخرى"); }
    finally { setLoading(false); }
  }

  async function toggleDone(item) {
    const updated = { ...item, done: !item.done };
    setAchieve((prev) => prev.map((a) => a.id === item.id ? updated : a));
    await store.saveAchieve(updated);
    if (!item.done) { addPoints(25); showToast("أحسنت! +25 نقطة"); }
  }
  async function remove(id) {
    setAchieve((prev) => prev.filter((a) => a.id !== id));
    await store.deleteAchieve(id); showToast("تم الحذف");
  }

  const kindMap = { challenge: "تحدي", project: "مشروع", path: "مسار تعلّم" };
  const filtered = achieve.filter((a) => {
    if (tab === "challenges") return a.kind === "challenge";
    if (tab === "projects") return a.kind === "project";
    if (tab === "paths") return a.kind === "path";
    return true;
  });
  const kindForTab = tab === "challenges" ? "challenge" : tab === "projects" ? "project" : "path";

  return (
    <div style={S.view}>
      <div style={S.achieveHero}>
        <div style={S.achieveHeroIcon}><Rocket size={20} color="#0A0A0B" /></div>
        <div>
          <div style={S.achieveHeroTitle}>أنجز</div>
          <div style={S.achieveHeroSub}>تحديات ومشاريع ومسارات مصممة لهواياتك وتخصصك</div>
        </div>
      </div>

      {!hasProfile && (
        <div style={S.setupCard}>
          <User size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={S.setupText}>عرّف عن نفسك أولاً في التخصيص (من أنا، هواياتي، تخصصي) حتى تكون اقتراحات أنجز مرتبطة بك فعلاً.</div>
        </div>
      )}

      <div style={S.coachCard}>
        <div style={S.coachTitleRow}><Sparkles size={15} color="#C9A24B" /><span style={S.coachTitle}>كيف يومك؟</span></div>
        <p style={S.profileHint}>أخبر أنجز بمزاجك ليقترح لك نشاطاً يحسّنه الآن.</p>
        <div style={S.moodRow}>
          {["متحمّس", "عادي", "متعب", "مشتّت"].map((m) => (
            <button key={m} onClick={() => askCoach(m)} disabled={coachLoading} style={S.moodBtn}>{m}</button>
          ))}
        </div>
        {coachLoading && <div style={S.coachLoading}><Loader2 size={15} className="spin" /> أنجز يفكّر...</div>}
        {coachReply && !coachReply.error && (
          <div style={S.coachReply}>
            <div style={S.coachMessage}>{coachReply.message}</div>
            <div style={S.coachActivity}><Rocket size={14} color="#C9A24B" /> {coachReply.activity}</div>
            {coachReply.why && <div style={S.coachWhy}>{coachReply.why}</div>}
          </div>
        )}
        {coachReply?.error && <div style={S.coachLoading}>{coachReply.error}</div>}
      </div>

      <div style={S.achieveTabs}>
        {[{ id: "challenges", label: "تحديات", icon: Trophy }, { id: "projects", label: "مشاريع", icon: Target }, { id: "paths", label: "مسارات", icon: BookOpen }].map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...S.achieveTab, ...(tab === t.id ? S.achieveTabActive : {}) }}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <button onClick={() => generate(kindForTab)} disabled={loading} style={S.aiButton}>
        {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
        {loading ? "يصمّم لك الآن..." : `اقترح ${tab === "challenges" ? "تحديات" : tab === "projects" ? "مشاريع" : "مسارات"} جديدة`}
      </button>

      <div style={S.achieveList}>
        {filtered.length === 0 && <div style={S.emptyState}><div style={S.emptyStateTitle}>لا شيء بعد</div><div style={S.emptyStateSub}>اضغط الزر أعلاه ليقترح لك أنجز</div></div>}
        {filtered.map((item) => <AchieveCard key={item.id} item={item} kindLabel={kindMap[item.kind]} onToggle={() => toggleDone(item)} onRemove={() => remove(item.id)} />)}
      </div>
    </div>
  );
}

function AchieveCard({ item, kindLabel, onToggle, onRemove }) {
  const [open, setOpen] = useState(false);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " " + (item.topic || ""))}`;
  return (
    <div style={{ ...S.achieveCard, ...(item.done ? S.achieveCardDone : {}) }}>
      <div style={S.achieveCardTop}>
        <span onClick={onToggle} style={{ ...S.checkbox, ...(item.done ? S.checkboxDone : {}) }}>{item.done && <Check size={12} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.achieveCardHead}>
            <span style={S.achieveKind}>{kindLabel}</span>
            {item.topic && <span style={S.achieveTopic}>{item.topic}</span>}
          </div>
          <div style={{ ...S.achieveTitle, ...(item.done ? S.taskTitleDone : {}) }}>{item.title}</div>
        </div>
        <button onClick={onRemove} style={S.deleteBtn}><Trash2 size={14} /></button>
      </div>
      <p style={S.achieveDetail}>{item.detail}</p>
      {item.steps?.length > 0 && (
        <>
          <button onClick={() => setOpen(!open)} style={S.achieveToggle}>
            <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            {open ? "إخفاء الخطوات" : `الخطوات (${item.steps.length})`}
          </button>
          {open && (
            <div style={S.achieveSteps}>
              {item.steps.map((s, i) => <div key={i} style={S.achieveStep}><span style={S.achieveStepNum}>{i + 1}</span>{s}</div>)}
            </div>
          )}
        </>
      )}
      <a href={searchUrl} target="_blank" rel="noopener noreferrer" style={S.achieveLink}>
        <ExternalLink size={12} /> فيديوهات تعليمية عن هذا
      </a>
    </div>
  );
}

function SettingsView({ categories, setCategories, gamify, hasCloud, showToast, profile, setProfile }) {
  const [editing, setEditing] = useState(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_CHOICES[0]);

  async function addCategory() {
    if (!newName.trim()) return;
    const cat = { id: uid(), name: newName.trim(), color: newColor };
    setCategories((prev) => [...prev, cat]); await store.saveCategory(cat); setNewName(""); showToast("تمت إضافة الفئة");
  }
  async function updateCategory(id, patch) {
    let updated;
    setCategories((prev) => prev.map((c) => { if (c.id === id) { updated = { ...c, ...patch }; return updated; } return c; }));
    if (updated) await store.saveCategory(updated);
  }
  async function removeCategory(id) {
    setCategories((prev) => prev.filter((c) => c.id !== id)); await store.deleteCategory(id); showToast("تم حذف الفئة");
  }

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>التخصيص</div>

      <ProfileCard profile={profile} setProfile={setProfile} showToast={showToast} />

      {!hasCloud && (
        <div style={S.setupCard}>
          <Cloud size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={S.setupText}>أنت تعمل الآن بالتخزين المحلي فقط. لتفعيل المزامنة السحابية عبر أجهزتك، أضف مفاتيح Supabase في ملف البيئة كما هو موضح في دليل النشر، ثم أعد النشر.</div>
        </div>
      )}

      <div style={S.badgesCard}>
        <div style={S.chartTitle}>شاراتك</div>
        <div style={S.badgesGrid}>
          {BADGES.map((b) => {
            const earned = gamify.badges.includes(b.id);
            return (
              <div key={b.id} style={{ ...S.badge, ...(earned ? S.badgeEarned : {}) }}>
                <div style={{ ...S.badgeIcon, ...(earned ? S.badgeIconEarned : {}) }}>{b.icon}</div>
                <div style={S.badgeName}>{b.name}</div>
                <div style={S.badgeDesc}>{earned ? b.desc : "مقفلة"}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.catEditorCard}>
        <div style={S.catEditorHeader}><Palette size={15} color="#C9A24B" /><span>فئاتك</span></div>
        <div style={S.catEditList}>
          {categories.map((c) => (
            <div key={c.id} style={S.catEditRow}>
              {editing === c.id ? (
                <>
                  <div style={S.colorPickRow}>{COLOR_CHOICES.map((col) => <button key={col} onClick={() => updateCategory(c.id, { color: col })} style={{ ...S.colorDot, background: col, outline: c.color === col ? "2px solid #fff" : "none" }} />)}</div>
                  <input value={c.name} onChange={(e) => updateCategory(c.id, { name: e.target.value })} style={S.catEditInput} />
                  <button onClick={() => setEditing(null)} style={S.catSaveBtn}><Check size={14} /></button>
                </>
              ) : (
                <>
                  <span style={{ ...S.legendDot, background: c.color, width: 12, height: 12 }} />
                  <span style={S.catEditName}>{c.name}</span>
                  <button onClick={() => setEditing(c.id)} style={S.catIconBtn}><Edit3 size={13} /></button>
                  <button onClick={() => removeCategory(c.id)} style={S.catIconBtn}><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={S.catAddRow}>
          <div style={S.colorPickRow}>{COLOR_CHOICES.map((col) => <button key={col} onClick={() => setNewColor(col)} style={{ ...S.colorDot, background: col, outline: newColor === col ? "2px solid #fff" : "none" }} />)}</div>
          <div style={S.catAddInputRow}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="اسم فئة جديدة..." style={S.catEditInput} />
            <button onClick={addCategory} style={S.taskAddBtn}><Plus size={16} /></button>
          </div>
        </div>
      </div>

      <RoadmapCard />
    </div>
  );
}

function ProfileCard({ profile, setProfile, showToast }) {
  const [local, setLocal] = useState(profile);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setLocal(profile); }, [profile]);

  function change(field, val) { setLocal((p) => ({ ...p, [field]: val })); setDirty(true); }
  async function save() {
    setProfile(local); await store.saveProfile(local); setDirty(false); showToast("تم حفظ هويتك");
  }

  return (
    <div style={S.profileCard}>
      <div style={S.catEditorHeader}><User size={15} color="#C9A24B" /><span>هويتي</span></div>
      <p style={S.profileHint}>هذه البيانات تجعل اقتراحات أنجز والتحليل مرتبطة بك شخصياً.</p>
      <label style={S.label}>من أنا</label>
      <input value={local.about} onChange={(e) => change("about", e.target.value)} placeholder="مثال: مصور ومصمم محتوى بصري وطالب جامعي" style={S.input} />
      <label style={S.label}>هواياتي</label>
      <input value={local.hobbies} onChange={(e) => change("hobbies", e.target.value)} placeholder="مثال: التصوير، تمارين الجسم، التصميم" style={S.input} />
      <label style={S.label}>تخصصي</label>
      <input value={local.field} onChange={(e) => change("field", e.target.value)} placeholder="مثال: التغذية والتطبيق الغذائي" style={S.input} />
      {dirty && <button onClick={save} style={{ ...S.saveBtn, marginTop: 12 }}>حفظ هويتي</button>}
    </div>
  );
}

function RoadmapCard() {
  const phases = [
    { phase: "النسخة الحالية", title: "أداتك اليومية", items: ["تتبع الوقت بعجلة اليوم التفاعلية", "إدارة المهام", "تحليل AI وتطور يومي", "تخزين سحابي مع نسخة محلية"] },
    { phase: "التالي", title: "ذاكرة أعمق", items: ["أهداف أسبوعية قابلة للقياس", "تذكيرات ذكية حسب نمطك", "مقارنة الأسابيع ببعضها"] },
    { phase: "لاحقاً", title: "ربط حياتك", items: ["استيراد من التقويم", "ملخص صوتي للتطور اليومي", "تصدير تقاريرك PDF"] },
  ];
  return (
    <div style={S.roadmapCard}>
      <div style={S.chartTitle}>كيف يتطوّر مسار معك</div>
      {phases.map((p, i) => (
        <div key={i} style={S.roadmapPhaseRow}>
          <div style={S.roadmapPhaseHead}><span style={S.roadmapPhaseTag}>{p.phase}</span><span style={S.roadmapPhaseTitle}>{p.title}</span></div>
          <div style={S.roadmapPhaseItems}>{p.items.map((it, j) => <div key={j} style={S.roadmapPhaseItem}><span style={S.reportDot}>•</span>{it}</div>)}</div>
        </div>
      ))}
    </div>
  );
}

function EntryModal({ entry, date, categories, onSave, onClose }) {
  const [catId, setCatId] = useState(entry?.catId || categories[0]?.id);
  const [start, setStart] = useState(entry?.start || "09:00");
  const [end, setEnd] = useState(entry?.end || "10:00");
  const [note, setNote] = useState(entry?.note || "");
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}><span>{entry ? "تعديل النشاط" : "نشاط جديد"}</span><button onClick={onClose} style={S.iconBtn}><X size={18} /></button></div>
        <div style={S.modalBody}>
          <label style={S.label}>الفئة</label>
          <div style={S.catGrid}>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setCatId(c.id)} style={{ ...S.catChip, borderColor: catId === c.id ? c.color : "#2A2A2D", background: catId === c.id ? `${c.color}22` : "transparent" }}>
                <span style={{ ...S.legendDot, background: c.color }} />{c.name}
              </button>
            ))}
          </div>
          <div style={S.timeRow}>
            <div style={S.timeField}><label style={S.label}>من</label><input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={S.input} /></div>
            <div style={S.timeField}><label style={S.label}>إلى</label><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={S.input} /></div>
          </div>
          <label style={S.label}>ملاحظة (اختياري)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: تصوير جلسة تخرج" style={S.input} />
        </div>
        <button onClick={() => onSave({ id: entry?.id || uid(), date: entry?.date || date, catId, start, end, note: note.trim() })} style={S.saveBtn}>حفظ النشاط</button>
      </div>
    </div>
  );
}
