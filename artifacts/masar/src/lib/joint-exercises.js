// محتوى تعليمي ثابت لتمارين "الركبة" و"القدم" - نقطتا ضغط جديدتان على مخطط
// الجسم التفاعلي (InteractiveMuscleDiagram.jsx) لا ترتبطان بمحرك بناء
// البرنامج التلقائي في fitness-engine.js (ذلك المحرك مصمَّم لتمارين بناء
// عضلي بحجم تدريب/معدات/تكرارات محسوبة - لا يناسب دلالياً تمارين تأهيلية
// عامة بإرشاد ثابت). بنفس مبدأ diet-systems.js: مصدر الحقيقة الوحيد لهذا
// المحتوى العلمي هنا حصراً - لا أي استدعاء ذكاء اصطناعي يُنشئ أو يُعدّل
// هذي التمارين.
//
// مبادئ عامة موثَّقة وواسعة الانتشار بمجال العلاج الطبيعي/تقوية المفاصل
// (لا اقتباس أرقام دراسات محددة): تمارين تقوية الركبة (Quad Sets, Straight
// Leg Raise, Terminal Knee Extension, Wall Sit, Step-Up) شائعة في بروتوكولات
// إعادة التأهيل العامة لمفصل الركبة (مثال: مصادر مثل OrthoInfo-AAOS
// وArthritis Foundation ومصادر علاج طبيعي مشابهة). تمارين القدم المسطحة
// (Short Foot Exercise/Arch Lifts, Tibialis Posterior Strengthening) وتمارين
// التهاب اللفافة الأخمصية (Plantar Fascia Stretch, دحرجة كرة تحت القدم)
// مبادئ عامة شائعة بنفس المصادر. صياغة الفوائد هنا دائماً "قد يساعد على
// تقوية/تحسين مرونة" - لا ادعاء علاجي (لا "يعالج"/"يشفي").

export const PAIN_WARNING = {
  ar: "إذا شعرت بألم حاد أو غير معتاد أثناء أي تمرين، توقف فوراً واستشر مختص علاج طبيعي أو طبيب قبل الاستمرار.",
  en: "If you feel sharp or unusual pain during any exercise, stop immediately and consult a physical therapist or doctor before continuing.",
};

// خمسة تمارين تقوية ركبة عامة موثَّقة (لا فرق حسب حالة صحية محدَّدة - بخلاف
// القدم أدناه، الركبة هنا مجموعة واحدة عامة كما طُلب).
export const KNEE_EXERCISES = [
  {
    id: "quad_sets",
    name: "شد عضلة الفخذ الرباعية (Quad Sets)",
    nameEn: "Quad Sets",
    description: "اجلس أو استلقِ مع تمديد الرجل بالكامل. اشدد عضلة أعلى الفخذ بالضغط بالجزء الخلفي من الركبة نحو الأرض/السرير، دون ثني الركبة فعلياً، واستمر بالشد.",
    descriptionEn: "Sit or lie down with your leg fully extended. Tighten the muscle at the top of your thigh by pressing the back of your knee down toward the floor/bed, without actually bending the knee, and hold the contraction.",
    repsGuidance: "3 مجموعات × 10 تكرارات (شد لمدة 5 ثوانٍ لكل تكرار)، كإرشاد عام",
    repsGuidanceEn: "3 sets × 10 reps (hold each for 5 seconds), as a general guideline",
  },
  {
    id: "straight_leg_raise",
    name: "رفع الرجل المستقيمة (Straight Leg Raise)",
    nameEn: "Straight Leg Raise",
    description: "استلقِ على ظهرك، اثنِ الركبة السليمة وقدمها مسطحة على الأرض. حافظ على الرجل الأخرى مستقيمة تماماً وارفعها ببطء حتى ارتفاع ركبة الرجل المثنية، ثم أنزلها ببطء.",
    descriptionEn: "Lie on your back with your unaffected knee bent, foot flat on the floor. Keep the other leg fully straight and slowly raise it to about the height of the bent knee, then lower it slowly.",
    repsGuidance: "3 مجموعات × 10-15 تكراراً، كإرشاد عام",
    repsGuidanceEn: "3 sets × 10-15 reps, as a general guideline",
  },
  {
    id: "terminal_knee_extension",
    name: "تمديد الركبة النهائي (Terminal Knee Extension)",
    nameEn: "Terminal Knee Extension",
    description: "اربط حزاماً مطاطياً خلف الركبة بمستوى منخفض، مع ثني الركبة بزاوية بسيطة (10-15 درجة). ادفع بمقدمة الفخذ لتمديد الركبة بالكامل ببطء ضد مقاومة الحزام، ثم ارجع ببطء.",
    descriptionEn: "Anchor a resistance band behind your knee at a low point, starting with a slight bend (10-15 degrees). Push through the front of your thigh to slowly straighten the knee fully against the band's resistance, then return slowly.",
    repsGuidance: "3 مجموعات × 10-15 تكراراً، كإرشاد عام",
    repsGuidanceEn: "3 sets × 10-15 reps, as a general guideline",
  },
  {
    id: "wall_sit_moderate",
    name: "جلسة الحائط المعتدلة (Wall Sit)",
    nameEn: "Moderate Wall Sit",
    description: "استند بظهرك على حائط وانزل بزاوية معتدلة فقط (30-45 درجة بالركبة، لا 90 درجة كاملة)، وحافظ على الوضعية بتنفّس طبيعي.",
    descriptionEn: "Lean your back against a wall and lower down to only a moderate angle (30-45 degrees at the knee, not a full 90), holding the position while breathing normally.",
    repsGuidance: "2-3 مجموعات × 15-30 ثانية، كإرشاد عام - ابدأ بمدة أقصر إن كنت مبتدئاً",
    repsGuidanceEn: "2-3 sets × 15-30 seconds, as a general guideline - start with a shorter hold if you're a beginner",
  },
  {
    id: "low_step_up",
    name: "الصعود على مرتفع منخفض (Low Step-Up)",
    nameEn: "Low Step-Up",
    description: "استخدم درجة أو مرتفعاً منخفضاً جداً (10-15 سم). اصعد بالرجل المستهدفة بالكامل ثم انزل ببطء وتحكّم، دون أن ترتطم القدم الأخرى بالأرض بقوة.",
    descriptionEn: "Use a very low step or platform (about 10-15cm / 4-6in). Step up fully with the target leg, then step back down slowly and with control, avoiding letting the other foot drop heavily.",
    repsGuidance: "2-3 مجموعات × 8-12 تكراراً لكل رجل، كإرشاد عام",
    repsGuidanceEn: "2-3 sets × 8-12 reps per leg, as a general guideline",
  },
];

// خيارات سؤال حالة القدم - مخزَّنة محلياً فقط (لا عمود بقاعدة بيانات حالياً،
// انظر getFootCondition/saveFootCondition في store.js).
export const FOOT_CONDITIONS = [
  { key: "none", label: "لا شيء", labelEn: "None" },
  { key: "flat_feet", label: "فلات فوت (قدم مسطحة)", labelEn: "Flat feet" },
  { key: "plantar_fasciitis", label: "التهاب اللفافة الأخمصية", labelEn: "Plantar fasciitis" },
  { key: "other", label: "أخرى / عام", labelEn: "Other / general" },
];

export const FOOT_EXERCISE_SETS = {
  none: [
    {
      id: "towel_marble_pickup",
      name: "التقاط الرخام/المنشفة بأصابع القدم",
      nameEn: "Towel/Marble Toe Pickup",
      description: "ضع حبات رخام صغيرة أو منشفة مفرودة على الأرض أمام قدمك حافي، والتقطها بأصابع قدمك واحدة تلو الأخرى.",
      descriptionEn: "Place small marbles or a spread-out towel on the floor in front of your bare foot, and pick them up one at a time using just your toes.",
      repsGuidance: "2 مجموعات × 10-15 التقاطة لكل قدم، كإرشاد عام",
      repsGuidanceEn: "2 sets × 10-15 picks per foot, as a general guideline",
    },
    {
      id: "ankle_circles",
      name: "دوائر الكاحل",
      nameEn: "Ankle Circles",
      description: "وأنت جالس، ارفع قدماً عن الأرض وارسم دوائر كاملة بالكاحل، بالاتجاهين.",
      descriptionEn: "While seated, lift one foot off the floor and draw full circles with your ankle, in both directions.",
      repsGuidance: "2 مجموعات × 10 دوائر لكل اتجاه ولكل قدم، كإرشاد عام",
      repsGuidanceEn: "2 sets × 10 circles each direction, per foot, as a general guideline",
    },
    {
      id: "calf_stretch_general",
      name: "تمديد ربلة الساق",
      nameEn: "Calf Stretch",
      description: "قف مواجهاً حائطاً، ضع إحدى الرجلين للخلف مستقيمة مع بقاء الكعب على الأرض، وانحنِ للأمام قليلاً حتى تشعر بتمدد خفيف في ربلة الساق الخلفية.",
      descriptionEn: "Stand facing a wall, step one leg back and keep it straight with the heel on the ground, then lean forward slightly until you feel a gentle stretch in the back calf.",
      repsGuidance: "2-3 مرات × 20-30 ثانية لكل رجل، كإرشاد عام",
      repsGuidanceEn: "2-3 times × 20-30 seconds per leg, as a general guideline",
    },
  ],
  flat_feet: [
    {
      id: "short_foot_exercise",
      name: "تمرين رفع القوس (Short Foot Exercise)",
      nameEn: "Short Foot Exercise (Arch Lift)",
      description: "وأنت جالس أو واقف، حاول \"تقصير\" باطن قدمك بسحب مقدمة القدم نحو الكعب دون ثني الأصابع، لرفع قوس القدم قليلاً، ثم استرخِ.",
      descriptionEn: "While sitting or standing, try to \"shorten\" your foot by drawing the ball of your foot toward your heel without curling your toes, gently lifting your arch, then relax.",
      repsGuidance: "3 مجموعات × 10 تكرارات (شد 5 ثوانٍ) لكل قدم، كإرشاد عام",
      repsGuidanceEn: "3 sets × 10 reps (hold 5 seconds) per foot, as a general guideline",
    },
    {
      id: "tibialis_posterior_strength",
      name: "تقوية العضلة الظنبوبية الخلفية",
      nameEn: "Tibialis Posterior Strengthening",
      description: "بحزام مطاطي مربوط حول مقدمة القدم، اجلس مع تمديد الرجل، وحرّك القدم للداخل (نحو الرجل الأخرى) ضد مقاومة الحزام، ثم ارجع ببطء.",
      descriptionEn: "With a resistance band looped around your forefoot, sit with your leg extended and turn your foot inward (toward the other leg) against the band's resistance, then return slowly.",
      repsGuidance: "3 مجموعات × 10-15 تكراراً لكل قدم، كإرشاد عام",
      repsGuidanceEn: "3 sets × 10-15 reps per foot, as a general guideline",
    },
    {
      id: "achilles_stretch_flatfeet",
      name: "تمديد وتر أخيل",
      nameEn: "Achilles Tendon Stretch",
      description: "بنفس وضعية تمديد ربلة الساق، اثنِ الركبة الخلفية قليلاً مع بقاء الكعب على الأرض، للوصول لتمدد أعمق باتجاه وتر أخيل.",
      descriptionEn: "In the same calf-stretch stance, bend the back knee slightly while keeping the heel down, to reach a deeper stretch toward the Achilles tendon.",
      repsGuidance: "2-3 مرات × 20-30 ثانية لكل رجل، كإرشاد عام",
      repsGuidanceEn: "2-3 times × 20-30 seconds per leg, as a general guideline",
    },
  ],
  plantar_fasciitis: [
    {
      id: "plantar_fascia_stretch",
      name: "تمديد اللفافة الأخمصية",
      nameEn: "Plantar Fascia Stretch",
      description: "وأنت جالس، ضع الكاحل المصاب فوق الرجل الأخرى، وامسك أصابع القدم واسحبها نحوك برفق باتجاه الساق حتى تشعر بتمدد أسفل القدم.",
      descriptionEn: "While seated, cross the affected ankle over the other leg, grasp your toes and gently pull them back toward your shin until you feel a stretch along the bottom of your foot.",
      repsGuidance: "3 مرات × 15-20 ثانية، عدة مرات باليوم (خصوصاً قبل أول خطوة صباحاً) كإرشاد عام",
      repsGuidanceEn: "3 times × 15-20 seconds, several times a day (especially before your first steps in the morning), as a general guideline",
    },
    {
      id: "ball_roll",
      name: "دحرجة كرة تحت القدم",
      nameEn: "Ball Rolling Under the Foot",
      description: "وأنت جالس أو واقف، ضع كرة صغيرة صلبة (أو زجاجة ماء مجمَّدة) تحت باطن قدمك ودحرجها للأمام والخلف بضغط خفيف إلى معتدل.",
      descriptionEn: "While sitting or standing, place a small firm ball (or a frozen water bottle) under the arch of your foot and roll it back and forth with light to moderate pressure.",
      repsGuidance: "دقيقتان لكل قدم، مرة أو مرتين باليوم، كإرشاد عام",
      repsGuidanceEn: "2 minutes per foot, once or twice a day, as a general guideline",
    },
    {
      id: "calf_stretch_pf",
      name: "تمديد ربلة الساق (بالمنشفة)",
      nameEn: "Towel Calf Stretch",
      description: "وأنت جالس مع تمديد الرجل، لف منشفة حول مقدمة القدم واسحبها نحوك برفق مع بقاء الركبة مستقيمة، للتمدد على طول ربلة الساق ووتر أخيل.",
      descriptionEn: "While sitting with your leg extended, loop a towel around the ball of your foot and gently pull it toward you while keeping your knee straight, stretching along the calf and Achilles tendon.",
      repsGuidance: "3 مرات × 20-30 ثانية لكل رجل، كإرشاد عام",
      repsGuidanceEn: "3 times × 20-30 seconds per leg, as a general guideline",
    },
  ],
  other: [
    {
      id: "toe_spreads",
      name: "تفريق أصابع القدم",
      nameEn: "Toe Spreads",
      description: "وأنت جالس حافي القدم، حاول تفريق أصابع قدمك عن بعضها قدر الإمكان دون تحريك باقي القدم، واستمر بالتفريق لثوانٍ.",
      descriptionEn: "While seated barefoot, try to spread your toes apart as far as possible without moving the rest of your foot, and hold the spread for a few seconds.",
      repsGuidance: "2-3 مجموعات × 10 تكرارات لكل قدم، كإرشاد عام",
      repsGuidanceEn: "2-3 sets × 10 reps per foot, as a general guideline",
    },
    {
      id: "ankle_alphabet",
      name: "أبجدية الكاحل",
      nameEn: "Ankle Alphabet",
      description: "وأنت جالس، ارفع قدماً عن الأرض واكتب بها حروف الأبجدية بالهواء بحركة الكاحل فقط.",
      descriptionEn: "While seated, lift one foot off the floor and \"write\" the letters of the alphabet in the air using only ankle movement.",
      repsGuidance: "مرة واحدة لكل قدم، مرة أو مرتين باليوم، كإرشاد عام",
      repsGuidanceEn: "Once per foot, once or twice a day, as a general guideline",
    },
    {
      id: "foot_doming_general",
      name: "رفع قوس القدم (Foot Doming)",
      nameEn: "Foot Doming",
      description: "وأنت واقف أو جالس، حاول رفع منتصف باطن قدمك عن الأرض قليلاً دون ثني الأصابع أو رفع الكعب/مقدمة القدم.",
      descriptionEn: "While standing or sitting, try to gently lift the middle of your arch off the ground without curling your toes or lifting your heel/forefoot.",
      repsGuidance: "2-3 مجموعات × 10 تكرارات (شد 5 ثوانٍ) لكل قدم، كإرشاد عام",
      repsGuidanceEn: "2-3 sets × 10 reps (hold 5 seconds) per foot, as a general guideline",
    },
  ],
};
