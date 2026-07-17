// قاعدة تمارين ثابتة محلية لقسم "الرياضة" — لا تتصل بأي API خارجي.
// كل تمرين مُصنَّف بفئة عضلية/نوع يوم (muscle) وقائمة مستويات المعدات
// المتوافقة معه (equipment)، فيولّد fitnessPlan() جدولاً أسبوعياً بمجرد
// تصفية هذه القائمة حسب اختيارات المستخدم — منطق بسيط بلا أي ذكاء خارجي.

export const FITNESS_GOALS = [
  { key: "lose_weight", label: "خسارة وزن" },
  { key: "build_muscle", label: "بناء عضلات" },
  { key: "general_fitness", label: "لياقة عامة" },
];

export const EQUIPMENT_LEVELS = [
  { key: "gym", label: "صالة رياضية كاملة" },
  { key: "home_no_equipment", label: "بيت بدون معدات" },
  { key: "home_light_weights", label: "بيت بأوزان بسيطة (دمبل خفيف)" },
];

export const DAY_TYPE_LABELS = {
  full_body: "تمرين كامل الجسم",
  cardio: "كارديو",
  upper: "الجزء العلوي",
  push: "الدفع (صدر/أكتاف/ترايسبس)",
  pull: "السحب (ظهر/باي)",
  legs: "الأرجل",
  mobility: "مرونة وإحماء",
};

// ترتيب أنواع الأيام حسب الهدف — تُؤخذ أول N منها بحسب عدد أيام التمرين
// المختار. مصمَّمة لتوزيع متوازن (لا تكرار نفس العضلة يومين متتاليين قدر
// الإمكان) حتى عند اختيار عدد أيام قليل.
const GOAL_DAY_SEQUENCE = {
  lose_weight: ["full_body", "cardio", "full_body", "mobility", "cardio", "full_body"],
  build_muscle: ["upper", "legs", "push", "pull", "legs", "full_body"],
  general_fitness: ["full_body", "cardio", "upper", "legs", "mobility", "full_body"],
};

export const EXERCISES = [
  // ===== دفع (صدر/أكتاف/ترايسبس) =====
  { id: "pushup", name: "تمرين الضغط", nameEn: "push up", muscle: "push", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "10-15", icon: "Dumbbell", description: "استلقِ على بطنك مع استقامة الجسم، ادفع بيديك حتى تمديد الذراعين بالكامل، ثم انزل ببطء حتى يقترب صدرك من الأرض." },
  { id: "incline_pushup", name: "ضغط مائل", nameEn: "incline push up", muscle: "push", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "Dumbbell", description: "ضع يديك على سطح مرتفع (كرسي أو طاولة) وقدميك على الأرض، وأدِّ حركة الضغط بزاوية أخف على الرسغين." },
  { id: "diamond_pushup", name: "ضغط الماس", nameEn: "diamond push up", muscle: "push", equipment: ["gym", "home_no_equipment"], sets: 3, reps: "8-12", icon: "Dumbbell", description: "قرِّب يديك تحت الصدر لتشكيل شكل الماس بالأصابع، وأدِّ الضغط ليركّز الحمل على الترايسبس." },
  { id: "pike_pushup", name: "ضغط الكتف (الحمامة)", nameEn: "pike push up", muscle: "push", equipment: ["gym", "home_no_equipment"], sets: 3, reps: "8-12", icon: "Dumbbell", description: "ارفع الوركين لأعلى فتصبح بوضعية V مقلوبة، وانزل برأسك نحو الأرض بين يديك مع ثني المرفقين." },
  { id: "chair_dips", name: "غطس الترايسبس على كرسي", nameEn: "chair tricep dips", muscle: "push", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "10-15", icon: "Dumbbell", description: "استند بيديك على حافة كرسي ثابت وقدميك للأمام، وانزل بجسمك عمودياً ثم ادفع لأعلى." },
  { id: "db_shoulder_press", name: "ضغط الكتف بالدمبل", nameEn: "dumbbell shoulder press", muscle: "push", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "امسك دمبلين عند مستوى الكتفين، وادفعهما لأعلى حتى استقامة الذراعين ثم أعدهما ببطء." },
  { id: "db_floor_press", name: "ضغط الصدر بالدمبل من الأرض", nameEn: "dumbbell floor press", muscle: "push", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "استلقِ على ظهرك مع دمبل بكل يد عند الصدر، وادفعهما لأعلى حتى استقامة الذراعين." },
  { id: "barbell_bench", name: "ضغط البنش بالبار", nameEn: "barbell bench press", muscle: "push", equipment: ["gym"], sets: 4, reps: "8-10", icon: "Dumbbell", description: "استلقِ على مقعد البنش وأنزل البار حتى يلامس الصدر بلطف، ثم ادفعه لأعلى حتى استقامة الذراعين." },
  { id: "parallel_dips", name: "غطس المتوازي", nameEn: "parallel bar dips", muscle: "push", equipment: ["gym"], sets: 3, reps: "8-12", icon: "Dumbbell", description: "استند على قضيبي المتوازي وانزل بجسمك حتى زاوية مريحة بالمرفقين، ثم ادفع لأعلى." },
  { id: "cable_chest_press", name: "ضغط الصدر بالكابل", nameEn: "cable chest press", muscle: "push", equipment: ["gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "قف بين جهاز الكابل وادفع المقبضين للأمام حتى استقامة الذراعين مع ثبات الجذع." },

  // ===== سحب (ظهر/باي) =====
  { id: "superman", name: "السوبرمان", nameEn: "superman exercise", muscle: "pull", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "PersonStanding", description: "استلقِ على بطنك وارفع الذراعين والساقين معاً عن الأرض في آن واحد، ثم اخفضهما ببطء." },
  { id: "reverse_snow_angel", name: "ملاك الثلج المعكوس", nameEn: "reverse snow angel", muscle: "pull", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "PersonStanding", description: "استلقِ على بطنك وحرّك ذراعيك من جانبيك إلى أعلى الرأس وبالعكس مع رفعهما قليلاً عن الأرض." },
  { id: "bird_dog", name: "الكلب الطائر", nameEn: "bird dog exercise", muscle: "pull", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "10 لكل جانب", icon: "PersonStanding", description: "على وضعية الزحف، مدّ ذراعاً وساقاً معاكسة في آن واحد مع ثبات الجذع، ثم بدّل الجانب." },
  { id: "db_bent_row", name: "صف منحني بالدمبل", nameEn: "dumbbell bent over row", muscle: "pull", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "انحنِ للأمام قليلاً مع استقامة الظهر، واسحب الدمبلين نحو خصرك ثم أنزلهما ببطء." },
  { id: "db_single_row", name: "صف بدمبل واحد", nameEn: "single arm dumbbell row", muscle: "pull", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12 لكل جانب", icon: "Dumbbell", description: "استند بيد وركبة على مقعد، واسحب الدمبل باليد الأخرى نحو الخصر مع ثبات الجذع." },
  { id: "pullup", name: "العقلة (Pull-up)", nameEn: "pull up exercise", muscle: "pull", equipment: ["gym"], sets: 3, reps: "5-10", icon: "Dumbbell", description: "تعلّق من القضيب بقبضة عريضة واسحب جسمك لأعلى حتى يقترب ذقنك من القضيب." },
  { id: "lat_pulldown", name: "سحب أمامي (Lat Pulldown)", nameEn: "lat pulldown machine", muscle: "pull", equipment: ["gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "اجلس أمام جهاز السحب واسحب القضيب نحو أعلى الصدر مع ثبات الجذع، ثم أعده ببطء." },
  { id: "seated_cable_row", name: "صف الكابل الجالس", nameEn: "seated cable row", muscle: "pull", equipment: ["gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "اجلس أمام جهاز الكابل واسحب المقبض نحو بطنك مع تقريب لوحي الكتف، ثم أعده ببطء." },

  // ===== الجزء العلوي (مزيج دفع وسحب) =====
  { id: "upper_pushpull_circuit", name: "دائرة الجزء العلوي", nameEn: "upper body circuit workout", muscle: "upper", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "Dumbbell", description: "كرّر تمرين ضغط ثم تمرين سحب (كسوبرمان أو صف بالدمبل) بالتناوب دون راحة بينهما." },
  { id: "plank_shoulder_tap", name: "لمس الكتف بوضعية البلانك", nameEn: "plank shoulder tap", muscle: "upper", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "16 لمسة", icon: "PersonStanding", description: "في وضعية البلانك، المس كتفك المعاكس بيدك بالتناوب مع ثبات الوركين قدر الإمكان." },
  { id: "db_overhead_carry", name: "المشي بالدمبل فوق الرأس", nameEn: "overhead dumbbell carry", muscle: "upper", equipment: ["home_light_weights", "gym"], sets: 3, reps: "20 خطوة", icon: "Dumbbell", description: "ارفع دمبلاً فوق رأسك بذراع مستقيمة وامشِ مسافة قصيرة مع ثبات الجذع، ثم بدّل الذراع." },
  { id: "arm_circles", name: "دوائر الذراعين", nameEn: "arm circles exercise", muscle: "upper", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "20 لكل اتجاه", icon: "Wind", description: "مدّ ذراعيك أفقياً وارسم دوائر صغيرة ثم كبيرة تدريجياً لتنشيط مفصل الكتف." },

  // ===== الجزء السفلي/الأرجل =====
  { id: "squat", name: "سكوات (القرفصاء)", nameEn: "bodyweight squat", muscle: "legs", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "15-20", icon: "Footprints", description: "قف بعرض الكتفين وانزل بالوركين للخلف وللأسفل كأنك تجلس على كرسي، ثم عد للوقوف." },
  { id: "lunge", name: "اندفاع الرجل (لانج)", nameEn: "lunge exercise", muscle: "legs", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "10-12 لكل رجل", icon: "Footprints", description: "خطِ خطوة للأمام وانزل حتى تصل الركبة الخلفية قريباً من الأرض، ثم عد للوقوف وبدّل الرجل." },
  { id: "glute_bridge", name: "جسر الأرداف", nameEn: "glute bridge", muscle: "legs", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "15-20", icon: "PersonStanding", description: "استلقِ على ظهرك مع ثني الركبتين، وارفع الوركين لأعلى بالضغط على الكعبين، ثم أنزلهما ببطء." },
  { id: "wall_sit", name: "جلسة الحائط", nameEn: "wall sit exercise", muscle: "legs", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "30-45 ثانية", icon: "Footprints", description: "استند بظهرك على حائط وانزل حتى تصبح زاوية الركبتين 90 درجة، وحافظ على الوضعية." },
  { id: "calf_raise", name: "رفعة السمانة", nameEn: "calf raise exercise", muscle: "legs", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "15-20", icon: "Footprints", description: "قف باستقامة وارتفع على أطراف أصابع قدميك ببطء، ثم انزل ببطء أكبر." },
  { id: "step_up", name: "الصعود على مرتفع", nameEn: "step up exercise", muscle: "legs", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "10-12 لكل رجل", icon: "Footprints", description: "اصعد بقدم واحدة على كرسي أو درجة ثابتة، ثم انزل ببطء وكرّر بالرجل الأخرى." },
  { id: "db_goblet_squat", name: "سكوات الكأس بالدمبل", nameEn: "dumbbell goblet squat", muscle: "legs", equipment: ["home_light_weights", "gym"], sets: 3, reps: "12-15", icon: "Dumbbell", description: "امسك دمبلاً عمودياً أمام صدرك وأدِّ حركة السكوات مع الحفاظ على استقامة الظهر." },
  { id: "db_rdl", name: "رفعة رومانية بالدمبل", nameEn: "dumbbell romanian deadlift", muscle: "legs", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "امسك دمبلين أمام فخذيك وانحنِ للأمام من الوركين مع استقامة الظهر حتى تشعر بشد الفخذ الخلفي." },
  { id: "leg_press", name: "مكبس الأرجل (Leg Press)", nameEn: "leg press machine", muscle: "legs", equipment: ["gym"], sets: 4, reps: "10-12", icon: "Dumbbell", description: "اجلس على جهاز مكبس الأرجل وادفع اللوح بقدميك حتى استقامة الركبتين تقريباً، ثم أعده ببطء." },
  { id: "leg_curl", name: "ثني الرجل (Leg Curl)", nameEn: "leg curl machine", muscle: "legs", equipment: ["gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "استلقِ على جهاز ثني الرجل واسحب الوسادة نحو المؤخرة بثني الركبتين، ثم أعدها ببطء." },
  { id: "barbell_squat", name: "سكوات بالبار", nameEn: "barbell back squat", muscle: "legs", equipment: ["gym"], sets: 4, reps: "8-10", icon: "Dumbbell", description: "ضع البار على أعلى الظهر وانزل بالوركين للخلف وللأسفل حتى توازي الفخذين الأرض، ثم عد للوقوف." },

  // ===== كامل الجسم =====
  { id: "burpee", name: "بيربي", nameEn: "burpee exercise", muscle: "full_body", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "8-12", icon: "Flame", description: "انزل لوضعية الضغط ثم اقفز بقدميك للأمام وقف مع قفزة عمودية، وكرّر بإيقاع مستمر." },
  { id: "mountain_climber", name: "متسلق الجبل", nameEn: "mountain climber exercise", muscle: "full_body", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "20-30 ثانية", icon: "Flame", description: "من وضعية الضغط، اسحب ركبتيك بالتناوب نحو الصدر بسرعة مع ثبات الجذع." },
  { id: "bear_crawl", name: "زحف الدب", nameEn: "bear crawl exercise", muscle: "full_body", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "20 خطوة", icon: "PersonStanding", description: "تحرّك للأمام والخلف على يديك وقدميك مع رفع الركبتين قليلاً عن الأرض، وحافظ على استقامة الظهر." },
  { id: "db_thruster", name: "ثرَستر بالدمبل", nameEn: "dumbbell thruster", muscle: "full_body", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "امسك دمبلين عند الكتفين، انزل لسكوات ثم انفجر للوقوف مع دفع الدمبلين فوق الرأس." },
  { id: "db_swing", name: "أرجحة الدمبل", nameEn: "dumbbell swing exercise", muscle: "full_body", equipment: ["home_light_weights", "gym"], sets: 3, reps: "15-20", icon: "Dumbbell", description: "أمسك دمبلاً بيدين وأرجحه بين ساقيك ثم للأمام حتى مستوى الكتف بدفع الوركين." },
  { id: "kettlebell_swing", name: "أرجحة الكيتل بيل", nameEn: "kettlebell swing", muscle: "full_body", equipment: ["gym"], sets: 4, reps: "15-20", icon: "Dumbbell", description: "أمسك الكيتل بيل بيدين وأرجحه من بين الساقين إلى مستوى الصدر بدفع قوي من الوركين." },
  { id: "rowing_sprint", name: "سبرنت جهاز التجديف", nameEn: "rowing machine sprint", muscle: "full_body", equipment: ["gym"], sets: 5, reps: "30 ثانية سريع / 30 راحة", icon: "Dumbbell", description: "جدّف بأقصى جهد لمدة 30 ثانية، ثم استرح 30 ثانية، وكرّر." },

  // ===== كارديو =====
  { id: "jumping_jack", name: "نطة الفتح", nameEn: "jumping jacks", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "30-45 ثانية", icon: "HeartPulse", description: "اقفز مع فتح الساقين والذراعين للأعلى في آن واحد، ثم عد للوضعية الأصلية بسرعة." },
  { id: "high_knees", name: "رفع الركبتين", nameEn: "high knees exercise", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "30-45 ثانية", icon: "HeartPulse", description: "اركض في مكانك مع رفع الركبتين لأعلى قدر الإمكان بسرعة." },
  { id: "butt_kicks", name: "ركل المؤخرة", nameEn: "butt kicks exercise", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "30-45 ثانية", icon: "HeartPulse", description: "اركض في مكانك مع محاولة لمس كعبيك لمؤخرتك بسرعة." },
  { id: "star_jump", name: "قفزة النجمة", nameEn: "star jump exercise", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "HeartPulse", description: "اقفز من وضعية القرفصاء مع فرد الذراعين والساقين على شكل نجمة في الهواء." },
  { id: "shadow_jump_rope", name: "قفز الحبل (بلا حبل)", nameEn: "jump rope exercise", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "45-60 ثانية", icon: "HeartPulse", description: "قلّد حركة القفز على الحبل بالوثب الخفيف مع تحريك المعصمين، حتى دون حبل فعلي." },
  { id: "treadmill_run", name: "الجري على المشاية", nameEn: "treadmill running", muscle: "cardio", equipment: ["gym"], sets: 1, reps: "15-20 دقيقة", icon: "Bike", description: "اجرِ أو امشِ بسرعة ثابتة على المشاية مع رفع السرعة تدريجياً حسب لياقتك." },
  { id: "stationary_bike", name: "الدراجة الثابتة", nameEn: "stationary bike cardio", muscle: "cardio", equipment: ["gym"], sets: 1, reps: "15-20 دقيقة", icon: "Bike", description: "اضبط مقاومة متوسطة وادفع بانتظام لمدة الجلسة مع الحفاظ على معدل نبض ثابت." },
  { id: "elliptical", name: "جهاز الإليبتيكال", nameEn: "elliptical machine cardio", muscle: "cardio", equipment: ["gym"], sets: 1, reps: "15-20 دقيقة", icon: "Bike", description: "حرّك الجهاز بإيقاع ثابت مع دفع الذراعين والساقين معاً لتنشيط كامل الجسم." },

  // ===== مرونة وإحماء =====
  { id: "cat_cow", name: "تمدد القطة والبقرة", nameEn: "cat cow stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "10 حركات", icon: "Wind", description: "على وضعية الزحف، قوّس ظهرك للأعلى ثم للأسفل بالتناوب مع التنفس ببطء." },
  { id: "hip_flexor_stretch", name: "تمدد ثنيات الورك", nameEn: "hip flexor stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "30 ثانية لكل جانب", icon: "Wind", description: "اركع بركبة واحدة وادفع الوركين للأمام برفق حتى تشعر بتمدد أمام الفخذ الخلفي، ثم بدّل الجانب." },
  { id: "shoulder_rolls", name: "لفّ الأكتاف", nameEn: "shoulder rolls stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "10 لكل اتجاه", icon: "Wind", description: "ارفع كتفيك ولفّهما للخلف ثم للأمام ببطء لتحرير توتر الرقبة والكتفين." },
  { id: "quad_stretch", name: "تمدد الفخذ الأمامي", nameEn: "standing quad stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "30 ثانية لكل رجل", icon: "Wind", description: "قف على رجل واحدة واسحب كعب الرجل الأخرى نحو المؤخرة برفق، ثم بدّل." },
  { id: "worlds_greatest_stretch", name: "التمدد الشامل", nameEn: "world's greatest stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "5 لكل جانب", icon: "Wind", description: "خطِ خطوة واسعة للأمام وضع يدك على الأرض، ثم لُف جذعك ومدّ ذراعك الأخرى للأعلى، وبدّل الجانب." },
];

// اختيار عدد `count` من التمارين المطابقة لعضلة/فئة `muscle` ومستوى
// المعدات `equipment` — بلا تكرار، وبترتيب ثابت (لا عشوائية) حتى يبقى
// نفس الجدول الأسبوعي مستقراً عبر الجلسات ولا يتغيّر عند كل زيارة.
function pickExercises(muscle, equipment, count) {
  return EXERCISES.filter((e) => e.muscle === muscle && e.equipment.includes(equipment)).slice(0, count);
}

// يولّد الجدول الأسبوعي: مصفوفة من الأيام، كل يوم { dayType, dayLabel, exercises }.
export function generateFitnessPlan({ goal, equipment, daysPerWeek }) {
  const sequence = GOAL_DAY_SEQUENCE[goal] || GOAL_DAY_SEQUENCE.general_fitness;
  const days = [];
  for (let i = 0; i < daysPerWeek; i++) {
    const dayType = sequence[i % sequence.length];
    const exercises = pickExercises(dayType, equipment, 5);
    days.push({ dayIndex: i, dayType, dayLabel: DAY_TYPE_LABELS[dayType] || dayType, exercises });
  }
  return days;
}

export function youtubeSearchUrl(exercise) {
  const query = encodeURIComponent(`${exercise.nameEn} exercise tutorial`);
  return `https://www.youtube.com/results?search_query=${query}`;
}
