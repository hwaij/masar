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
  { id: "pushup", name: "تمرين الضغط", nameEn: "push up", muscle: "push", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "10-15", icon: "Dumbbell", description: "استلقِ على بطنك مع استقامة الجسم، ادفع بيديك حتى تمديد الذراعين بالكامل، ثم انزل ببطء حتى يقترب صدرك من الأرض.", descriptionEn: "Lie face down with your body straight, push with your arms until they're fully extended, then lower slowly until your chest nearly touches the ground." },
  { id: "incline_pushup", name: "ضغط مائل", nameEn: "incline push up", muscle: "push", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "Dumbbell", description: "ضع يديك على سطح مرتفع (كرسي أو طاولة) وقدميك على الأرض، وأدِّ حركة الضغط بزاوية أخف على الرسغين.", descriptionEn: "Place your hands on a raised surface (a chair or table) with your feet on the ground, and perform the push-up at an angle that's easier on the wrists." },
  { id: "diamond_pushup", name: "ضغط الماس", nameEn: "diamond push up", muscle: "push", equipment: ["gym", "home_no_equipment"], sets: 3, reps: "8-12", icon: "Dumbbell", description: "قرِّب يديك تحت الصدر لتشكيل شكل الماس بالأصابع، وأدِّ الضغط ليركّز الحمل على الترايسبس.", descriptionEn: "Bring your hands together under your chest to form a diamond shape with your fingers, and perform the push-up to focus the load on your triceps." },
  { id: "pike_pushup", name: "ضغط الكتف (الحمامة)", nameEn: "pike push up", muscle: "push", equipment: ["gym", "home_no_equipment"], sets: 3, reps: "8-12", icon: "Dumbbell", description: "ارفع الوركين لأعلى فتصبح بوضعية V مقلوبة، وانزل برأسك نحو الأرض بين يديك مع ثني المرفقين.", descriptionEn: "Raise your hips up into an inverted V position, and lower your head toward the ground between your hands while bending your elbows." },
  { id: "chair_dips", name: "غطس الترايسبس على كرسي", nameEn: "chair tricep dips", muscle: "push", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "10-15", icon: "Dumbbell", description: "استند بيديك على حافة كرسي ثابت وقدميك للأمام، وانزل بجسمك عمودياً ثم ادفع لأعلى.", descriptionEn: "Support yourself with your hands on the edge of a stable chair with your feet forward, lower your body vertically, then push back up." },
  { id: "db_shoulder_press", name: "ضغط الكتف بالدمبل", nameEn: "dumbbell shoulder press", muscle: "push", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "امسك دمبلين عند مستوى الكتفين، وادفعهما لأعلى حتى استقامة الذراعين ثم أعدهما ببطء.", descriptionEn: "Hold a dumbbell in each hand at shoulder height, push them up until your arms are straight, then lower them back slowly." },
  { id: "db_floor_press", name: "ضغط الصدر بالدمبل من الأرض", nameEn: "dumbbell floor press", muscle: "push", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "استلقِ على ظهرك مع دمبل بكل يد عند الصدر، وادفعهما لأعلى حتى استقامة الذراعين.", descriptionEn: "Lie on your back with a dumbbell in each hand at chest level, and push them up until your arms are fully extended." },
  { id: "barbell_bench", name: "ضغط البنش بالبار", nameEn: "barbell bench press", muscle: "push", equipment: ["gym"], sets: 4, reps: "8-10", icon: "Dumbbell", description: "استلقِ على مقعد البنش وأنزل البار حتى يلامس الصدر بلطف، ثم ادفعه لأعلى حتى استقامة الذراعين.", descriptionEn: "Lie on a bench press and lower the bar until it gently touches your chest, then push it back up until your arms are straight." },
  { id: "parallel_dips", name: "غطس المتوازي", nameEn: "parallel bar dips", muscle: "push", equipment: ["gym"], sets: 3, reps: "8-12", icon: "Dumbbell", description: "استند على قضيبي المتوازي وانزل بجسمك حتى زاوية مريحة بالمرفقين، ثم ادفع لأعلى.", descriptionEn: "Support yourself on parallel bars and lower your body until your elbows reach a comfortable angle, then push back up." },
  { id: "cable_chest_press", name: "ضغط الصدر بالكابل", nameEn: "cable chest press", muscle: "push", equipment: ["gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "قف بين جهاز الكابل وادفع المقبضين للأمام حتى استقامة الذراعين مع ثبات الجذع.", descriptionEn: "Stand between the cable machine and push the handles forward until your arms are straight while keeping your torso stable." },

  // ===== سحب (ظهر/باي) =====
  { id: "superman", name: "السوبرمان", nameEn: "superman exercise", muscle: "pull", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "PersonStanding", description: "استلقِ على بطنك وارفع الذراعين والساقين معاً عن الأرض في آن واحد، ثم اخفضهما ببطء.", descriptionEn: "Lie face down and lift both your arms and legs off the ground at the same time, then lower them slowly." },
  { id: "reverse_snow_angel", name: "ملاك الثلج المعكوس", nameEn: "reverse snow angel", muscle: "pull", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "PersonStanding", description: "استلقِ على بطنك وحرّك ذراعيك من جانبيك إلى أعلى الرأس وبالعكس مع رفعهما قليلاً عن الأرض.", descriptionEn: "Lie face down and move your arms from your sides up above your head and back, lifting them slightly off the ground." },
  { id: "bird_dog", name: "الكلب الطائر", nameEn: "bird dog exercise", muscle: "pull", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "10 لكل جانب", icon: "PersonStanding", description: "على وضعية الزحف، مدّ ذراعاً وساقاً معاكسة في آن واحد مع ثبات الجذع، ثم بدّل الجانب.", descriptionEn: "On all fours, extend one arm and the opposite leg at the same time while keeping your torso steady, then switch sides." },
  { id: "db_bent_row", name: "صف منحني بالدمبل", nameEn: "dumbbell bent over row", muscle: "pull", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "انحنِ للأمام قليلاً مع استقامة الظهر، واسحب الدمبلين نحو خصرك ثم أنزلهما ببطء.", descriptionEn: "Bend forward slightly while keeping your back straight, pull the dumbbells toward your waist, then lower them slowly." },
  { id: "db_single_row", name: "صف بدمبل واحد", nameEn: "single arm dumbbell row", muscle: "pull", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12 لكل جانب", icon: "Dumbbell", description: "استند بيد وركبة على مقعد، واسحب الدمبل باليد الأخرى نحو الخصر مع ثبات الجذع.", descriptionEn: "Support yourself with one hand and one knee on a bench, and pull the dumbbell with your other hand toward your waist while keeping your torso stable." },
  { id: "pullup", name: "العقلة (Pull-up)", nameEn: "pull up exercise", muscle: "pull", equipment: ["gym"], sets: 3, reps: "5-10", icon: "Dumbbell", description: "تعلّق من القضيب بقبضة عريضة واسحب جسمك لأعلى حتى يقترب ذقنك من القضيب.", descriptionEn: "Hang from the bar with a wide grip and pull your body up until your chin nears the bar." },
  { id: "lat_pulldown", name: "سحب أمامي (Lat Pulldown)", nameEn: "lat pulldown machine", muscle: "pull", equipment: ["gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "اجلس أمام جهاز السحب واسحب القضيب نحو أعلى الصدر مع ثبات الجذع، ثم أعده ببطء.", descriptionEn: "Sit in front of the pulldown machine and pull the bar toward the top of your chest while keeping your torso stable, then return it slowly." },
  { id: "seated_cable_row", name: "صف الكابل الجالس", nameEn: "seated cable row", muscle: "pull", equipment: ["gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "اجلس أمام جهاز الكابل واسحب المقبض نحو بطنك مع تقريب لوحي الكتف، ثم أعده ببطء.", descriptionEn: "Sit in front of the cable machine and pull the handle toward your stomach while squeezing your shoulder blades together, then return it slowly." },

  // ===== الجزء العلوي (مزيج دفع وسحب) =====
  { id: "upper_pushpull_circuit", name: "دائرة الجزء العلوي", nameEn: "upper body circuit workout", muscle: "upper", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "Dumbbell", description: "كرّر تمرين ضغط ثم تمرين سحب (كسوبرمان أو صف بالدمبل) بالتناوب دون راحة بينهما.", descriptionEn: "Alternate between a push exercise and a pull exercise (like superman or a dumbbell row) without resting in between." },
  { id: "plank_shoulder_tap", name: "لمس الكتف بوضعية البلانك", nameEn: "plank shoulder tap", muscle: "upper", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "16 لمسة", icon: "PersonStanding", description: "في وضعية البلانك، المس كتفك المعاكس بيدك بالتناوب مع ثبات الوركين قدر الإمكان.", descriptionEn: "In a plank position, touch your opposite shoulder with alternating hands while keeping your hips as steady as possible." },
  { id: "db_overhead_carry", name: "المشي بالدمبل فوق الرأس", nameEn: "overhead dumbbell carry", muscle: "upper", equipment: ["home_light_weights", "gym"], sets: 3, reps: "20 خطوة", icon: "Dumbbell", description: "ارفع دمبلاً فوق رأسك بذراع مستقيمة وامشِ مسافة قصيرة مع ثبات الجذع، ثم بدّل الذراع.", descriptionEn: "Raise a dumbbell above your head with a straight arm and walk a short distance while keeping your torso stable, then switch arms." },
  { id: "arm_circles", name: "دوائر الذراعين", nameEn: "arm circles exercise", muscle: "upper", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "20 لكل اتجاه", icon: "Wind", description: "مدّ ذراعيك أفقياً وارسم دوائر صغيرة ثم كبيرة تدريجياً لتنشيط مفصل الكتف.", descriptionEn: "Extend your arms horizontally and draw small then gradually larger circles to activate the shoulder joint." },

  // ===== الجزء السفلي/الأرجل =====
  { id: "squat", name: "سكوات (القرفصاء)", nameEn: "bodyweight squat", muscle: "legs", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "15-20", icon: "Footprints", description: "قف بعرض الكتفين وانزل بالوركين للخلف وللأسفل كأنك تجلس على كرسي، ثم عد للوقوف.", descriptionEn: "Stand shoulder-width apart and lower your hips back and down as if sitting in a chair, then return to standing." },
  { id: "lunge", name: "اندفاع الرجل (لانج)", nameEn: "lunge exercise", muscle: "legs", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "10-12 لكل رجل", icon: "Footprints", description: "خطِ خطوة للأمام وانزل حتى تصل الركبة الخلفية قريباً من الأرض، ثم عد للوقوف وبدّل الرجل.", descriptionEn: "Step forward and lower yourself until your back knee nearly touches the ground, then return to standing and switch legs." },
  { id: "glute_bridge", name: "جسر الأرداف", nameEn: "glute bridge", muscle: "legs", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "15-20", icon: "PersonStanding", description: "استلقِ على ظهرك مع ثني الركبتين، وارفع الوركين لأعلى بالضغط على الكعبين، ثم أنزلهما ببطء.", descriptionEn: "Lie on your back with your knees bent, raise your hips up by pressing through your heels, then lower them slowly." },
  { id: "wall_sit", name: "جلسة الحائط", nameEn: "wall sit exercise", muscle: "legs", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "30-45 ثانية", icon: "Footprints", description: "استند بظهرك على حائط وانزل حتى تصبح زاوية الركبتين 90 درجة، وحافظ على الوضعية.", descriptionEn: "Lean your back against a wall and lower down until your knees form a 90-degree angle, and hold the position." },
  { id: "calf_raise", name: "رفعة السمانة", nameEn: "calf raise exercise", muscle: "legs", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "15-20", icon: "Footprints", description: "قف باستقامة وارتفع على أطراف أصابع قدميك ببطء، ثم انزل ببطء أكبر.", descriptionEn: "Stand straight and rise up onto your toes slowly, then lower down even more slowly." },
  { id: "step_up", name: "الصعود على مرتفع", nameEn: "step up exercise", muscle: "legs", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "10-12 لكل رجل", icon: "Footprints", description: "اصعد بقدم واحدة على كرسي أو درجة ثابتة، ثم انزل ببطء وكرّر بالرجل الأخرى.", descriptionEn: "Step up onto a chair or sturdy step with one foot, then step down slowly and repeat with the other leg." },
  { id: "db_goblet_squat", name: "سكوات الكأس بالدمبل", nameEn: "dumbbell goblet squat", muscle: "legs", equipment: ["home_light_weights", "gym"], sets: 3, reps: "12-15", icon: "Dumbbell", description: "امسك دمبلاً عمودياً أمام صدرك وأدِّ حركة السكوات مع الحفاظ على استقامة الظهر.", descriptionEn: "Hold a dumbbell vertically in front of your chest and perform a squat while keeping your back straight." },
  { id: "db_rdl", name: "رفعة رومانية بالدمبل", nameEn: "dumbbell romanian deadlift", muscle: "legs", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "امسك دمبلين أمام فخذيك وانحنِ للأمام من الوركين مع استقامة الظهر حتى تشعر بشد الفخذ الخلفي.", descriptionEn: "Hold a dumbbell in each hand in front of your thighs and hinge forward at the hips while keeping your back straight, until you feel a stretch in your hamstrings." },
  { id: "leg_press", name: "مكبس الأرجل (Leg Press)", nameEn: "leg press machine", muscle: "legs", equipment: ["gym"], sets: 4, reps: "10-12", icon: "Dumbbell", description: "اجلس على جهاز مكبس الأرجل وادفع اللوح بقدميك حتى استقامة الركبتين تقريباً، ثم أعده ببطء.", descriptionEn: "Sit on the leg press machine and push the platform with your feet until your knees are nearly straight, then return it slowly." },
  { id: "leg_curl", name: "ثني الرجل (Leg Curl)", nameEn: "leg curl machine", muscle: "legs", equipment: ["gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "استلقِ على جهاز ثني الرجل واسحب الوسادة نحو المؤخرة بثني الركبتين، ثم أعدها ببطء.", descriptionEn: "Lie on the leg curl machine and pull the pad toward your glutes by bending your knees, then return it slowly." },
  { id: "barbell_squat", name: "سكوات بالبار", nameEn: "barbell back squat", muscle: "legs", equipment: ["gym"], sets: 4, reps: "8-10", icon: "Dumbbell", description: "ضع البار على أعلى الظهر وانزل بالوركين للخلف وللأسفل حتى توازي الفخذين الأرض، ثم عد للوقوف.", descriptionEn: "Place the bar on your upper back and lower your hips back and down until your thighs are parallel to the ground, then return to standing." },

  // ===== كامل الجسم =====
  { id: "burpee", name: "بيربي", nameEn: "burpee exercise", muscle: "full_body", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "8-12", icon: "Flame", description: "انزل لوضعية الضغط ثم اقفز بقدميك للأمام وقف مع قفزة عمودية، وكرّر بإيقاع مستمر.", descriptionEn: "Drop into a push-up position, then jump your feet forward and stand up with a vertical jump, repeating at a steady rhythm." },
  { id: "mountain_climber", name: "متسلق الجبل", nameEn: "mountain climber exercise", muscle: "full_body", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "20-30 ثانية", icon: "Flame", description: "من وضعية الضغط، اسحب ركبتيك بالتناوب نحو الصدر بسرعة مع ثبات الجذع.", descriptionEn: "From a push-up position, quickly alternate pulling your knees toward your chest while keeping your torso stable." },
  { id: "bear_crawl", name: "زحف الدب", nameEn: "bear crawl exercise", muscle: "full_body", equipment: ["home_no_equipment", "home_light_weights"], sets: 3, reps: "20 خطوة", icon: "PersonStanding", description: "تحرّك للأمام والخلف على يديك وقدميك مع رفع الركبتين قليلاً عن الأرض، وحافظ على استقامة الظهر.", descriptionEn: "Move forward and backward on your hands and feet with your knees slightly raised off the ground, keeping your back straight." },
  { id: "db_thruster", name: "ثرَستر بالدمبل", nameEn: "dumbbell thruster", muscle: "full_body", equipment: ["home_light_weights", "gym"], sets: 3, reps: "10-12", icon: "Dumbbell", description: "امسك دمبلين عند الكتفين، انزل لسكوات ثم انفجر للوقوف مع دفع الدمبلين فوق الرأس.", descriptionEn: "Hold a dumbbell in each hand at shoulder height, drop into a squat, then explode up to standing while pushing the dumbbells overhead." },
  { id: "db_swing", name: "أرجحة الدمبل", nameEn: "dumbbell swing exercise", muscle: "full_body", equipment: ["home_light_weights", "gym"], sets: 3, reps: "15-20", icon: "Dumbbell", description: "أمسك دمبلاً بيدين وأرجحه بين ساقيك ثم للأمام حتى مستوى الكتف بدفع الوركين.", descriptionEn: "Hold a dumbbell with both hands and swing it between your legs and then forward to shoulder height by driving through your hips." },
  { id: "kettlebell_swing", name: "أرجحة الكيتل بيل", nameEn: "kettlebell swing", muscle: "full_body", equipment: ["gym"], sets: 4, reps: "15-20", icon: "Dumbbell", description: "أمسك الكيتل بيل بيدين وأرجحه من بين الساقين إلى مستوى الصدر بدفع قوي من الوركين.", descriptionEn: "Hold the kettlebell with both hands and swing it from between your legs up to chest height with a powerful hip drive." },
  { id: "rowing_sprint", name: "سبرنت جهاز التجديف", nameEn: "rowing machine sprint", muscle: "full_body", equipment: ["gym"], sets: 5, reps: "30 ثانية سريع / 30 راحة", icon: "Dumbbell", description: "جدّف بأقصى جهد لمدة 30 ثانية، ثم استرح 30 ثانية، وكرّر.", descriptionEn: "Row at maximum effort for 30 seconds, then rest for 30 seconds, and repeat." },

  // ===== كارديو =====
  { id: "jumping_jack", name: "نطة الفتح", nameEn: "jumping jacks", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "30-45 ثانية", icon: "HeartPulse", description: "اقفز مع فتح الساقين والذراعين للأعلى في آن واحد، ثم عد للوضعية الأصلية بسرعة.", descriptionEn: "Jump while opening your legs and raising your arms up at the same time, then quickly return to the starting position." },
  { id: "high_knees", name: "رفع الركبتين", nameEn: "high knees exercise", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "30-45 ثانية", icon: "HeartPulse", description: "اركض في مكانك مع رفع الركبتين لأعلى قدر الإمكان بسرعة.", descriptionEn: "Run in place while raising your knees as high as possible, as fast as you can." },
  { id: "butt_kicks", name: "ركل المؤخرة", nameEn: "butt kicks exercise", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "30-45 ثانية", icon: "HeartPulse", description: "اركض في مكانك مع محاولة لمس كعبيك لمؤخرتك بسرعة.", descriptionEn: "Run in place while trying to touch your glutes with your heels, quickly." },
  { id: "star_jump", name: "قفزة النجمة", nameEn: "star jump exercise", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "12-15", icon: "HeartPulse", description: "اقفز من وضعية القرفصاء مع فرد الذراعين والساقين على شكل نجمة في الهواء.", descriptionEn: "Jump up from a squat position while spreading your arms and legs into a star shape in the air." },
  { id: "shadow_jump_rope", name: "قفز الحبل (بلا حبل)", nameEn: "jump rope exercise", muscle: "cardio", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 3, reps: "45-60 ثانية", icon: "HeartPulse", description: "قلّد حركة القفز على الحبل بالوثب الخفيف مع تحريك المعصمين، حتى دون حبل فعلي.", descriptionEn: "Mimic a jump rope motion with light hops and wrist movements, even without an actual rope." },
  { id: "treadmill_run", name: "الجري على المشاية", nameEn: "treadmill running", muscle: "cardio", equipment: ["gym"], sets: 1, reps: "15-20 دقيقة", icon: "Bike", description: "اجرِ أو امشِ بسرعة ثابتة على المشاية مع رفع السرعة تدريجياً حسب لياقتك.", descriptionEn: "Run or walk at a steady pace on the treadmill, gradually increasing speed according to your fitness level." },
  { id: "stationary_bike", name: "الدراجة الثابتة", nameEn: "stationary bike cardio", muscle: "cardio", equipment: ["gym"], sets: 1, reps: "15-20 دقيقة", icon: "Bike", description: "اضبط مقاومة متوسطة وادفع بانتظام لمدة الجلسة مع الحفاظ على معدل نبض ثابت.", descriptionEn: "Set a moderate resistance and pedal steadily for the session while keeping a consistent heart rate." },
  { id: "elliptical", name: "جهاز الإليبتيكال", nameEn: "elliptical machine cardio", muscle: "cardio", equipment: ["gym"], sets: 1, reps: "15-20 دقيقة", icon: "Bike", description: "حرّك الجهاز بإيقاع ثابت مع دفع الذراعين والساقين معاً لتنشيط كامل الجسم.", descriptionEn: "Move the machine at a steady rhythm while pushing with both your arms and legs to activate your whole body." },

  // ===== مرونة وإحماء =====
  { id: "cat_cow", name: "تمدد القطة والبقرة", nameEn: "cat cow stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "10 حركات", icon: "Wind", description: "على وضعية الزحف، قوّس ظهرك للأعلى ثم للأسفل بالتناوب مع التنفس ببطء.", descriptionEn: "On all fours, arch your back up then down alternately while breathing slowly." },
  { id: "hip_flexor_stretch", name: "تمدد ثنيات الورك", nameEn: "hip flexor stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "30 ثانية لكل جانب", icon: "Wind", description: "اركع بركبة واحدة وادفع الوركين للأمام برفق حتى تشعر بتمدد أمام الفخذ الخلفي، ثم بدّل الجانب.", descriptionEn: "Kneel on one knee and gently push your hips forward until you feel a stretch in front of your rear thigh, then switch sides." },
  { id: "shoulder_rolls", name: "لفّ الأكتاف", nameEn: "shoulder rolls stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "10 لكل اتجاه", icon: "Wind", description: "ارفع كتفيك ولفّهما للخلف ثم للأمام ببطء لتحرير توتر الرقبة والكتفين.", descriptionEn: "Raise your shoulders and roll them backward then forward slowly to release tension in the neck and shoulders." },
  { id: "quad_stretch", name: "تمدد الفخذ الأمامي", nameEn: "standing quad stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "30 ثانية لكل رجل", icon: "Wind", description: "قف على رجل واحدة واسحب كعب الرجل الأخرى نحو المؤخرة برفق، ثم بدّل.", descriptionEn: "Stand on one leg and gently pull the heel of the other leg toward your glutes, then switch." },
  { id: "worlds_greatest_stretch", name: "التمدد الشامل", nameEn: "world's greatest stretch", muscle: "mobility", equipment: ["gym", "home_no_equipment", "home_light_weights"], sets: 2, reps: "5 لكل جانب", icon: "Wind", description: "خطِ خطوة واسعة للأمام وضع يدك على الأرض، ثم لُف جذعك ومدّ ذراعك الأخرى للأعلى، وبدّل الجانب.", descriptionEn: "Take a wide step forward and place your hand on the ground, then rotate your torso and extend your other arm upward, and switch sides." },
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
