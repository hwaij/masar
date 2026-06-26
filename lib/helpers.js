export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
export function fmtHM(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h} س ${m} د`;
}
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function diffMinutes(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}
export function arabicDate(key, opts) {
  // أرقام إنجليزية (latn) مع أسماء أيام وأشهر عربية
  return new Date(key).toLocaleDateString("ar-KW-u-nu-latn", opts);
}
export function computeStreak(entries) {
  if (!entries.length) return 0;
  const days = new Set(entries.map((e) => e.date));
  let streak = 0;
  let d = new Date();
  if (!days.has(todayKey(d))) {
    d.setDate(d.getDate() - 1);
    if (!days.has(todayKey(d))) return 0;
  }
  while (days.has(todayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export const COLOR_CHOICES = [
  "#C9A24B", "#8A7BD1", "#5FA8A0", "#D17B5F", "#6FA8DC",
  "#B25D7D", "#9AA84C", "#D4A04C", "#7BA05B", "#C76B6B",
];

export const BADGES = [
  { id: "first_step", name: "الخطوة الأولى", desc: "سجّلت أول نشاط لك", icon: "◐", threshold: (s) => s.totalEntries >= 1 },
  { id: "streak3", name: "ثلاثة أيام", desc: "التزمت 3 أيام متتالية", icon: "✦", threshold: (s) => s.streak >= 3 },
  { id: "streak7", name: "أسبوع كامل", desc: "أسبوع من الالتزام", icon: "✶", threshold: (s) => s.streak >= 7 },
  { id: "task_master", name: "منجِز", desc: "أنهيت 20 مهمة", icon: "✓", threshold: (s) => s.tasksDone >= 20 },
  { id: "deep_work", name: "تركيز عميق", desc: "5 ساعات عمل في يوم", icon: "◆", threshold: (s) => s.maxDayHours >= 5 },
  { id: "century", name: "المئة", desc: "سجّلت 100 نشاط", icon: "★", threshold: (s) => s.totalEntries >= 100 },
  { id: "focus_first", name: "أول تركيز", desc: "أكملت أول جلسة تركيز", icon: "⏣", threshold: (s) => s.focusSessions >= 1 },
  { id: "focus_master", name: "سيّد التركيز", desc: "10 ساعات تركيز إجمالاً", icon: "❂", threshold: (s) => s.focusHours >= 10 },
];

// مهام يومية بديهية تُضاف تلقائياً لمن يريد أساسيات الانضباط
export const DEFAULT_DAILY_TASKS = [
  "قم الساعة 6 صباحاً",
  "رتّب سريرك",
  "نظّف أسنانك",
  "مارس الرياضة ساعة واحدة",
  "ادرس ساعة واحدة",
];

// مساعد لاستدعاء مسار API الخادمي
export async function analyze(prompt, maxTokens = 1000) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "تعذّر التحليل");
  return data.text;
}

export function parseJsonLoose(text) {
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ============================================================
// نظام Fallback محلي لوحدة "أنجز": يعمل دائماً بدون اتصال بـ Claude
// مرتبط تلقائياً بهوايات وتخصص المستخدم (يحدّث من صفحة التخصيص)
// ============================================================

// بنك مهام لكل اهتمام معروف (الكلمة المفتاحية تُطابق نص الهوايات/التخصص بشكل جزئي)
const LOCAL_TASK_BANK = {
  تصوير: [
    { title: "التقط صورة لغروب الشمس اليوم", detail: "اخرج قبل الغروب بـ 15 دقيقة وجرّب زاوية جديدة لم تستخدمها من قبل." },
    { title: "صوّر 3 لقطات بإضاءة طبيعية مختلفة", detail: "جرّب نفس الموضوع في ثلاثة أوقات نهارية مختلفة وقارن النتيجة." },
    { title: "نظّم مجلد صورك الأخيرة وانتقِ أفضل 5", detail: "مراجعة أرشيفك تطوّر عينك في الانتقاء بقدر التصوير نفسه." },
    { title: "جرّب تصوير لقطة مقربة (Macro) لشيء صغير", detail: "استخدم هاتفك أو عدستك وركّز على التفاصيل الدقيقة." },
  ],
  فيلم: [
    { title: "صوّر مشهداً قصيراً من 10 ثوانٍ بزاوية غير مألوفة", detail: "تجربة زاوية جديدة تبني حسّك البصري بسرعة." },
    { title: "راجع فيديو قديم لك وحدد 3 أشياء تحسّنها", detail: "النقد الذاتي البنّاء أسرع طريق للتطور." },
  ],
  مونتاج: [
    { title: "جرّب انتقالاً (Transition) جديداً لم تستخدمه قبل", detail: "ابحث عن تقنية مونتاج بسيطة وطبّقها على مقطع قصير." },
  ],
  دراس: [
    { title: "راجع فصل واحد من كتابك أو مذكراتك", detail: "حدد فصلاً واحداً فقط وراجعه بتركيز كامل دون تشتت." },
    { title: "اكتب ملخصاً من 5 نقاط لآخر موضوع درسته", detail: "كتابة الملخص بكلماتك تثبّت الفهم أكثر من القراءة المكررة." },
    { title: "حل 10 أسئلة تدريبية في أي مادة تدرسها", detail: "التطبيق العملي أهم من القراءة النظرية وحدها." },
    { title: "اشرح فكرة درستها لشخص آخر بصوت عال", detail: "إن استطعت تبسيطها لغيرك فأنت فهمتها فعلاً." },
  ],
  تغذية: [
    { title: "اكتب 3 نصائح غذائية صحية تعلّمتها", detail: "تدوين ما تعرفه يرسّخه ويجهّزك لمشاركته مع آخرين." },
    { title: "جرّب وصفة صحية جديدة اليوم", detail: "اختر وصفة بسيطة بمكونات قليلة وجرّبها لأول مرة." },
    { title: "راجع وجبة يومك وحدد نقطة تحسين واحدة", detail: "تحسين واحد صغير كل يوم يبني عادة غذائية قوية." },
  ],
  رياض: [
    { title: "قم بـ 20 تمرين ضغط الآن", detail: "لا تحتاج معدات، فقط 3 دقائق من وقتك." },
    { title: "تمرين إطالة لمدة 5 دقائق", detail: "الإطالة تمنع الإصابات وتحسّن المرونة على المدى الطويل." },
    { title: "اتقال أو ملاكمة: 3 مجموعات تمرين تسخين", detail: "ركّز على التقنية الصحيحة قبل القوة." },
  ],
  ملاكمة: [
    { title: "تمرين ظل (Shadow boxing) لمدة 5 دقائق", detail: "ركّز على الحركة والتوازن أكثر من السرعة." },
  ],
  تصميم: [
    { title: "صمّم عنصراً واحداً بسيطاً (شعار أو أيقونة)", detail: "قيّد نفسك بـ 20 دقيقة فقط لتنشيط الإبداع السريع." },
  ],
};

// تحديات يومية عامة، تتغيّر بشكل دوري حسب تاريخ اليوم (نفس التحدي يبقى طوال اليوم)
const DAILY_CHALLENGES = [
  { title: "اكتب 5 أشياء أنت ممتن لها اليوم", detail: "تمرين الامتنان اليومي يحسّن المزاج والتركيز بشكل ملموس." },
  { title: "اقرأ 10 صفحات من كتاب تحبه", detail: "حتى 10 صفحات يومياً تجمع كتاباً كاملاً في أسابيع قليلة." },
  { title: "اتصل أو تواصل مع شخص تقدّره ولم تتحدث معه مؤخراً", detail: "العلاقات تحتاج صيانة دورية مثل أي شيء آخر." },
  { title: "نظّف وريّح مساحة عملك لمدة 10 دقائق", detail: "البيئة المرتبة تقلل التشتت الذهني فعلياً." },
  { title: "اكتب هدفاً واحداً واضحاً لهذا الأسبوع", detail: "هدف واحد محدد أقوى من خمسة أهداف غامضة." },
  { title: "جرّب نشاطاً جديداً لم تجربه من قبل لمدة 15 دقيقة", detail: "الخروج من الروتين يفتح زوايا تفكير جديدة." },
  { title: "راجع مصاريفك أو وقتك المستهلك اليوم", detail: "الوعي بالاستهلاك (وقت أو مال) أول خطوة للتحسين." },
];

// يعيد فهرس اليوم (يتغير كل 24 ساعة بثبات، بدون عشوائية فعلية تكسر الاستمرارية)
function dayIndex(arrLength) {
  const days = Math.floor(Date.now() / 86400000);
  return days % arrLength;
}

// يبني قائمة مهام محلية مرتبطة بهوايات/تخصص المستخدم + تحدي اليوم العام
export function localAchieveSuggestions(profile, kind, excludeTitles = []) {
  const text = `${profile?.hobbies || ""} ${profile?.field || ""} ${profile?.about || ""}`;
  const matchedKeys = Object.keys(LOCAL_TASK_BANK).filter((k) => text.includes(k));
  let pool = [];
  matchedKeys.forEach((k) => pool.push(...LOCAL_TASK_BANK[k].map((t) => ({ ...t, topic: k }))));
  // إن لم يوجد أي تطابق مع هوايات المستخدم، استخدم كل البنك كتنويع عام
  if (pool.length === 0) {
    Object.entries(LOCAL_TASK_BANK).forEach(([k, items]) => pool.push(...items.map((t) => ({ ...t, topic: k }))));
  }
  // أضف تحدي اليوم العام دائماً كخيار متاح
  const challenge = DAILY_CHALLENGES[dayIndex(DAILY_CHALLENGES.length)];
  pool.push({ ...challenge, topic: "تحدي اليوم" });

  const filtered = pool.filter((t) => !excludeTitles.includes(t.title));
  const source = filtered.length ? filtered : pool;
  // اختيار 3 عناصر متنوعة (دوّار حسب اليوم لتفادي التكرار اليومي)
  const start = dayIndex(source.length);
  const picked = [];
  for (let i = 0; i < Math.min(3, source.length); i++) {
    picked.push(source[(start + i) % source.length]);
  }
  return picked.map((t) => ({
    title: t.title,
    detail: t.detail,
    steps: [],
    topic: t.topic,
  }));
}

// رد محلي لـ "كيف يومك؟" حسب المزاج، بدون اتصال بالخادم
export function localCoachReply(mood) {
  const replies = {
    "متحمّس": { message: "حماسك اليوم فرصة ذهبية، استثمرها فوراً.", activity: "ابدأ أهم مهمة بقائمتك الآن قبل أن يهدأ الحماس", why: "الزخم العاطفي وقود قوي لكنه قصير المدى، استغلّه بسرعة." },
    "عادي": { message: "يوم عادي هو يوم ممتاز للتقدم الهادئ والمستمر.", activity: "أنجز مهمة صغيرة واحدة من قائمتك خلال 15 دقيقة", why: "التقدم الصغير المتكرر يبني نتائج كبيرة بمرور الوقت." },
    "متعب": { message: "التعب رسالة من جسمك، استمع له ولا تتجاهله بالكامل.", activity: "خذ راحة 10 دقائق ثم اختر مهمة خفيفة جداً", why: "الراحة القصيرة المدروسة أفضل من إنتاجية مجهدة منخفضة الجودة." },
    "مشتّت": { message: "التشتت طبيعي، يحتاج فقط نقطة ارتكاز واحدة.", activity: "اختر مهمة واحدة فقط واطفئ كل الإشعارات لـ 10 دقائق", why: "تضييق التركيز لمهمة واحدة يكسر حلقة التشتت بسرعة." },
  };
  return replies[mood] || replies["عادي"];
}

// تحليل محلي مبسّط من البيانات المخزّنة فعلياً (بدون استدعاء أي خدمة خارجية)
export function localAnalysisSummary({ tasks, focus, prayerLog, religious }) {
  const today = todayKey();
  const tasksToday = (tasks || []).filter((t) => t.due === today);
  const doneTasksToday = tasksToday.filter((t) => t.done).length;
  const studyMinutes = (focus || []).filter((f) => f.isStudy).reduce((s, f) => s + f.minutes, 0);
  const totalFocusMinutes = (focus || []).reduce((s, f) => s + f.minutes, 0);
  const prayersToday = (prayerLog || []).filter((p) => p.date === today).length;
  const religiousDoneTotal = (religious || []).filter((r) => r.done).length;
  return {
    doneTasksToday,
    totalTasksToday: tasksToday.length,
    studyMinutes,
    totalFocusMinutes,
    prayersToday,
    religiousDoneTotal,
  };
}
