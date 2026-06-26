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

export function getLevel(points) {
  // L1: 0–99, L2: 100–249, then +150 per level threshold
  const thresholds = [0, 100, 250, 400, 550, 700, 850, 1000, 1150, 1300];
  const labels = ["مبتدئ", "منتظم", "ملتزم", "متقدم", "محترف", "خبير", "نخبة", "أسطورة", "بطل", "خارق"];
  let lvl = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (points >= thresholds[i]) lvl = i;
    else break;
  }
  return {
    level: lvl + 1,
    label: labels[lvl],
    current: thresholds[lvl],
    next: thresholds[lvl + 1] || null,
    progress: thresholds[lvl + 1]
      ? (points - thresholds[lvl]) / (thresholds[lvl + 1] - thresholds[lvl])
      : 1,
  };
}

export function addMinutesToTime(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const nm = ((total % 60) + 60) % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function nowHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export const AUTO_CLASSIFY_RULES = [
  { keywords: ["دراس", "جامعة", "مادة", "اختبار", "امتحان", "محاضرة", "مذاكرة"], catId: "study" },
  { keywords: ["تصوير", "كاميرا", "لقطة", "جلسة تصوير"], catId: "shoot" },
  { keywords: ["مونتاج", "تعديل", "تحرير", "بريمير"], catId: "edit" },
  { keywords: ["عميل", "تواصل", "اجتماع"], catId: "client" },
  { keywords: ["رياضة", "تمرين", "جيم", "ركض", "ملاكمة"], catId: "fitness" },
  { keywords: ["راحة", "نوم", "قيلولة"], catId: "rest" },
];

export function autoClassify(note, categories) {
  if (!note || !categories) return null;
  const lower = note.toLowerCase();
  for (const rule of AUTO_CLASSIFY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      const cat = categories.find((c) => c.id === rule.catId);
      if (cat) return cat.id;
    }
  }
  return null;
}

export const MANDATORY_TASKS = [
  { key: "bed", label: "ترتيب السرير", points: 5, penalty: 5, icon: "🛏" },
  { key: "teeth_morning", label: "أسنان الصباح", points: 5, penalty: 3, icon: "🦷" },
  { key: "teeth_evening", label: "أسنان المساء", points: 5, penalty: 3, icon: "🦷" },
  { key: "quran_daily", label: "قراءة القرآن اليومية", points: 15, penalty: 10, icon: "📖" },
  { key: "alkahf", label: "سورة الكهف", points: 10, penalty: 5, icon: "📗", fridayOnly: true },
];

export const AZKAR_MORNING = [
  { id: "sub_m", text: "سبحان الله", count: 33, short: "سبحان الله (33)" },
  { id: "ham_m", text: "الحمد لله", count: 33, short: "الحمد لله (33)" },
  { id: "akb_m", text: "الله أكبر", count: 33, short: "الله أكبر (33)" },
  { id: "lailaha_m", text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير", count: 1, short: "لا إله إلا الله" },
  { id: "kursi_m", text: "آية الكرسي", count: 1, short: "آية الكرسي" },
  { id: "morning_dua", text: "اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور", count: 1, short: "دعاء الصباح" },
];

export const AZKAR_EVENING = [
  { id: "sub_e", text: "سبحان الله", count: 33, short: "سبحان الله (33)" },
  { id: "ham_e", text: "الحمد لله", count: 33, short: "الحمد لله (33)" },
  { id: "akb_e", text: "الله أكبر", count: 33, short: "الله أكبر (33)" },
  { id: "lailaha_e", text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير", count: 1, short: "لا إله إلا الله" },
  { id: "kursi_e", text: "آية الكرسي", count: 1, short: "آية الكرسي" },
  { id: "evening_dua", text: "اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير", count: 1, short: "دعاء المساء" },
];

const QURAN_JUZ_NAMES = [
  "الم","سيقول","تلك الرسل","لن تنالوا","والمحصنات","لا يحب الله",
  "وإذا سمعوا","ولو أننا","قال الملأ","واعلموا","يعتذرون","وما من دابة",
  "وما أبرئ","ربما","سبحان الذي","قال ألم","اقترب","قد أفلح",
  "وقال الذين","أمن خلق","اتل ما أوحي","ومن يقنت","وما لي",
  "فمن أظلم","إليه يرد","حم","قال فما خطبكم","قد سمع الله",
  "تبارك الذي","عم",
];

const _quranBadges = QURAN_JUZ_NAMES.map((name, i) => ({
  id: `juz_${i + 1}`,
  name: `الجزء ${i + 1}`,
  desc: `أتممت الجزء ${i + 1}: ${name}`,
  icon: "📖",
  threshold: (s) => (s.quranJuzDone || 0) >= i + 1,
}));

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
  { id: "prayer_week", name: "صفوف منتظمة", desc: "صليت جميع الصلوات 7 أيام", icon: "🕌", threshold: (s) => (s.prayerStreak || 0) >= 7 },
  { id: "azkar_streak7", name: "مداوم الأذكار", desc: "أذكار صباح ومساء 7 أيام متتالية", icon: "📿", threshold: (s) => (s.azkarStreak || 0) >= 7 },
  { id: "istighfar_1k", name: "ألف استغفار", desc: "أكملت 1000 استغفار", icon: "📿", threshold: (s) => (s.istighfarTotal || 0) >= 1000 },
  { id: "istighfar_5k", name: "خمسة آلاف", desc: "أكملت 5000 استغفار", icon: "🌿", threshold: (s) => (s.istighfarTotal || 0) >= 5000 },
  { id: "istighfar_10k", name: "عشرة آلاف", desc: "أكملت 10000 استغفار", icon: "🌙", threshold: (s) => (s.istighfarTotal || 0) >= 10000 },
  { id: "quran_5juz", name: "خمسة أجزاء", desc: "أتممت 5 أجزاء من القرآن", icon: "📗", threshold: (s) => (s.quranJuzDone || 0) >= 5 },
  { id: "quran_10juz", name: "عشرة أجزاء", desc: "أتممت 10 أجزاء من القرآن", icon: "📘", threshold: (s) => (s.quranJuzDone || 0) >= 10 },
  { id: "quran_30juz", name: "ختم القرآن", desc: "أتممت ختمة كاملة للقرآن الكريم", icon: "🌟", threshold: (s) => (s.quranJuzDone || 0) >= 30 },
  ..._quranBadges,
];

export const DEFAULT_DAILY_TASKS = [
  "قم الساعة 6 صباحاً",
  "رتّب سريرك",
  "نظّف أسنانك",
  "مارس الرياضة ساعة واحدة",
  "ادرس ساعة واحدة",
];

export async function analyze(prompt, maxTokens = 1000) {
  const base = import.meta.env.BASE_URL || "/";
  const res = await fetch(`${base}api/analyze`, {
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

const DAILY_CHALLENGES = [
  { title: "اكتب 5 أشياء أنت ممتن لها اليوم", detail: "تمرين الامتنان اليومي يحسّن المزاج والتركيز بشكل ملموس." },
  { title: "اقرأ 10 صفحات من كتاب تحبه", detail: "حتى 10 صفحات يومياً تجمع كتاباً كاملاً في أسابيع قليلة." },
  { title: "اتصل أو تواصل مع شخص تقدّره ولم تتحدث معه مؤخراً", detail: "العلاقات تحتاج صيانة دورية مثل أي شيء آخر." },
  { title: "نظّف وريّح مساحة عملك لمدة 10 دقائق", detail: "البيئة المرتبة تقلل التشتت الذهني فعلياً." },
  { title: "اكتب هدفاً واحداً واضحاً لهذا الأسبوع", detail: "هدف واحد محدد أقوى من خمسة أهداف غامضة." },
  { title: "جرّب نشاطاً جديداً لم تجربه من قبل لمدة 15 دقيقة", detail: "الخروج من الروتين يفتح زوايا تفكير جديدة." },
  { title: "راجع مصاريفك أو وقتك المستهلك اليوم", detail: "الوعي بالاستهلاك (وقت أو مال) أول خطوة للتحسين." },
];

function dayIndex(arrLength) {
  const days = Math.floor(Date.now() / 86400000);
  return days % arrLength;
}

export function localAchieveSuggestions(profile, kind, excludeTitles = []) {
  const text = `${profile?.hobbies || ""} ${profile?.field || ""} ${profile?.about || ""}`;
  const matchedKeys = Object.keys(LOCAL_TASK_BANK).filter((k) => text.includes(k));
  let pool = [];
  matchedKeys.forEach((k) => pool.push(...LOCAL_TASK_BANK[k].map((t) => ({ ...t, topic: k }))));
  if (pool.length === 0) {
    Object.entries(LOCAL_TASK_BANK).forEach(([k, items]) => pool.push(...items.map((t) => ({ ...t, topic: k }))));
  }
  const challenge = DAILY_CHALLENGES[dayIndex(DAILY_CHALLENGES.length)];
  pool.push({ ...challenge, topic: "تحدي اليوم" });

  const filtered = pool.filter((t) => !excludeTitles.includes(t.title));
  const source = filtered.length ? filtered : pool;
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

export function localCoachReply(mood) {
  const replies = {
    "متحمّس": { message: "حماسك اليوم فرصة ذهبية، استثمرها فوراً.", activity: "ابدأ أهم مهمة بقائمتك الآن قبل أن يهدأ الحماس", why: "الزخم العاطفي وقود قوي لكنه قصير المدى، استغلّه بسرعة." },
    "عادي": { message: "يوم عادي هو يوم ممتاز للتقدم الهادئ والمستمر.", activity: "أنجز مهمة صغيرة واحدة من قائمتك خلال 15 دقيقة", why: "التقدم الصغير المتكرر يبني نتائج كبيرة بمرور الوقت." },
    "متعب": { message: "التعب رسالة من جسمك، استمع له ولا تتجاهله بالكامل.", activity: "خذ راحة 10 دقائق ثم اختر مهمة خفيفة جداً", why: "الراحة القصيرة المدروسة أفضل من إنتاجية مجهدة منخفضة الجودة." },
    "مشتّت": { message: "التشتت طبيعي، يحتاج فقط نقطة ارتكاز واحدة.", activity: "اختر مهمة واحدة فقط واطفئ كل الإشعارات لـ 10 دقائق", why: "تضييق التركيز لمهمة واحدة يكسر حلقة التشتت بسرعة." },
  };
  return replies[mood] || replies["عادي"];
}

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
