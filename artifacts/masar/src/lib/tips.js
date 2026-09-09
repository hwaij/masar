// بنك النصائح اليومية لقسم "بصيرة" - محتوى معلومات غذائية علمية قصيرة
// وصحيحة (Batch 2 - Item 3، بطلب صريح: استبدال محتوى بصيرة بالكامل بمعلومات
// غذائية بدل التنوّع القديم). كل عنصر مستقل بمعرّف ثابت (id) — سجل النصائح
// المحفوظ للمستخدم (tips_log) يشير إلى هذا الـid لا إلى موضع العنصر في
// المصفوفة، حتى لا تتأثر السجلات القديمة إذا أُعيد ترتيب القسم لاحقاً.
// محتوى Static مكتوب هنا مسبقاً بالكامل - لا استدعاء AI في اختيار أو توليد
// أي نصيحة (pickDailyTip حسابية بحتة أدناه)، تجنّباً لأي معلومة غير دقيقة.
// عند الإضافة مستقبلاً: أضف عناصر جديدة بمعرّفات جديدة فقط، ولا تُعد
// استخدام معرّف محذوف (معرّفات إصدار سابق تُعرض ببطاقة "غير متوفر" بدل
// الإسقاط الصامت من الأرشيف - انظر TipsView.archive في MasarApp.jsx).
export const TIPS = [
  // مغذيات كبرى (بروتين/كارب/دهون) وحساب السعرات
  { id: "mc01", category: "macros", text: "كل غرام بروتين يعطي الجسم نحو 4 سعرات حرارية.", textEn: "Every gram of protein gives the body about 4 calories." },
  { id: "mc02", category: "macros", text: "كل غرام كاربوهيدرات يعطي الجسم نحو 4 سعرات حرارية، مثل البروتين تماماً.", textEn: "Every gram of carbohydrate gives the body about 4 calories, just like protein." },
  { id: "mc03", category: "macros", text: "كل غرام دهون يعطي نحو 9 سعرات حرارية - أكثر من ضعف البروتين أو الكارب لنفس الوزن.", textEn: "Every gram of fat gives about 9 calories - more than double protein or carbs for the same weight." },
  { id: "mc04", category: "macros", text: "الكحول يعطي نحو 7 سعرات لكل غرام - بين الكارب والدهون في كثافته الحرارية.", textEn: "Alcohol provides about 7 calories per gram - between carbs and fat in energy density." },
  { id: "mc05", category: "macros", text: "البروتين يميل لإعطاء شعور بالشبع أطول من نفس عدد السعرات من الكارب أو الدهون.", textEn: "Protein tends to be more filling than the same number of calories from carbs or fat." },
  { id: "mc06", category: "macros", text: "الدهون ضرورية لامتصاص الجسم فيتامينات A وD وE وK - وهي فيتامينات ذوّابة في الدهون تحديداً.", textEn: "Fat is needed for the body to absorb vitamins A, D, E and K - these are fat-soluble vitamins specifically." },
  { id: "mc07", category: "macros", text: "الكاربوهيدرات المعقدة (الحبوب الكاملة، البقوليات) تُهضَم أبطأ من السكريات البسيطة، فترفع سكر الدم تدريجياً.", textEn: "Complex carbs (whole grains, legumes) digest more slowly than simple sugars, raising blood sugar more gradually." },
  { id: "mc08", category: "macros", text: "توزيع البروتين على عدة وجبات خلال اليوم يساعد الجسم على الاستفادة منه أكثر من تركيزه في وجبة واحدة.", textEn: "Spreading protein across several meals a day helps the body use it better than concentrating it in one meal." },
  { id: "mc09", category: "macros", text: "الجسم لا يخزّن البروتين الزائد كعضلات جاهزة - الفائض يُستخدم للطاقة أو يُخزَّن كدهون.", textEn: "The body doesn't store excess protein as ready muscle - the surplus is used for energy or stored as fat." },
  { id: "mc10", category: "macros", text: "هناك تسعة أحماض أمينية \"أساسية\" لا يصنعها الجسم بنفسه، ويجب الحصول عليها من الطعام.", textEn: "There are nine \"essential\" amino acids the body can't make on its own - they must come from food." },
  { id: "mc11", category: "macros", text: "الدهون الأحادية غير المشبعة (زيت الزيتون، الأفوكادو، المكسرات) أفضل عموماً لصحة القلب من الدهون المشبعة.", textEn: "Monounsaturated fats (olive oil, avocado, nuts) are generally better for heart health than saturated fat." },
  { id: "mc12", category: "macros", text: "الدهون المتحوّلة (Trans fats) هي الأكثر ضرراً لصحة القلب بين كل أنواع الدهون المعروفة.", textEn: "Trans fats are considered the most harmful to heart health among all known fat types." },
  { id: "mc13", category: "macros", text: "لا يوجد \"كارب سيء\" بحد ذاته - الكمية والمصدر ونوعية بقية الوجبة هي ما يحدّد الأثر الصحي فعلياً.", textEn: "There's no such thing as an inherently \"bad carb\" - the amount, source, and rest of the meal are what actually determine the health impact." },

  // فيتامينات
  { id: "vt01", category: "vitamins", text: "فيتامين C مضاد أكسدة، ويساعد الجسم أيضاً على امتصاص الحديد النباتي بشكل أفضل.", textEn: "Vitamin C is an antioxidant, and also helps the body absorb plant-based iron better." },
  { id: "vt02", category: "vitamins", text: "فيتامين D يُصنَّع في الجلد عند التعرّض لأشعة الشمس - قلة التعرض قد تسبب نقصه حتى مع غذاء جيد.", textEn: "Vitamin D is made in the skin from sun exposure - too little sun can cause a deficiency even with good nutrition." },
  { id: "vt03", category: "vitamins", text: "فيتامين ب12 يوجد بشكل طبيعي فقط في المصادر الحيوانية (لحوم، بيض، ألبان).", textEn: "Vitamin B12 occurs naturally only in animal-based sources (meat, eggs, dairy)." },
  { id: "vt04", category: "vitamins", text: "فيتامين A مهم بشكل خاص لصحة العينين والرؤية الليلية.", textEn: "Vitamin A is particularly important for eye health and night vision." },
  { id: "vt05", category: "vitamins", text: "فيتامين E مضاد أكسدة يساعد على حماية خلايا الجسم من التلف.", textEn: "Vitamin E is an antioxidant that helps protect the body's cells from damage." },
  { id: "vt06", category: "vitamins", text: "فيتامين K ضروري لعملية تخثّر الدم الطبيعية في الجسم.", textEn: "Vitamin K is essential for normal blood clotting in the body." },
  { id: "vt07", category: "vitamins", text: "فيتامينات B المختلفة تلعب دوراً أساسياً في تحويل الطعام إلى طاقة يستخدمها الجسم.", textEn: "The various B vitamins play a key role in converting food into energy the body can use." },
  { id: "vt08", category: "vitamins", text: "حمض الفوليك (فيتامين B9) مهم بشكل خاص للنساء في سن الإنجاب.", textEn: "Folate (vitamin B9) is especially important for women of childbearing age." },
  { id: "vt09", category: "vitamins", text: "الطهي الطويل بالماء قد يُفقِد بعض الفيتامينات الذوّابة في الماء مثل C وB - البخار أو القلي السريع يحافظ عليها أكثر.", textEn: "Prolonged boiling can lose some water-soluble vitamins like C and B - steaming or quick-frying preserves more of them." },
  { id: "vt10", category: "vitamins", text: "الفيتامينات الذوّابة في الدهون (A وD وE وK) يخزّنها الجسم، بخلاف C وB الذوّابة في الماء التي يتخلّص الجسم من فائضها بسهولة أكبر.", textEn: "Fat-soluble vitamins (A, D, E, K) are stored by the body, unlike water-soluble C and B, whose excess the body clears more easily." },

  // معادن
  { id: "mn01", category: "minerals", text: "الحديد النباتي (غير الهيمي) يُمتَص في الجسم بشكل أفضل حين يُتناول مع فيتامين C.", textEn: "Plant-based (non-heme) iron is absorbed better by the body when eaten alongside vitamin C." },
  { id: "mn02", category: "minerals", text: "الكالسيوم يحتاج إلى فيتامين D ليُمتَص بكفاءة في الجسم.", textEn: "Calcium needs vitamin D to be absorbed efficiently by the body." },
  { id: "mn03", category: "minerals", text: "البوتاسيوم يساعد على موازنة تأثير الصوديوم على ضغط الدم.", textEn: "Potassium helps balance sodium's effect on blood pressure." },
  { id: "mn04", category: "minerals", text: "الزنك عنصر مهم لدعم مناعة الجسم والتئام الجروح.", textEn: "Zinc is important for supporting the immune system and wound healing." },
  { id: "mn05", category: "minerals", text: "المغنيسيوم يشارك في مئات التفاعلات الكيميائية داخل الجسم، منها وظائف العضلات والأعصاب.", textEn: "Magnesium is involved in hundreds of chemical reactions in the body, including muscle and nerve function." },
  { id: "mn06", category: "minerals", text: "الصوديوم معدن أساسي يحتاجه الجسم بكمية صغيرة فقط - الإفراط فيه هو الشائع في الغذاء الحديث، لا نقصه.", textEn: "Sodium is an essential mineral the body needs only in small amounts - excess, not deficiency, is the common issue in modern diets." },
  { id: "mn07", category: "minerals", text: "اليود عنصر ضروري لعمل الغدة الدرقية بشكل صحيح.", textEn: "Iodine is essential for the thyroid gland to function properly." },

  // ألياف وجهاز هضمي
  { id: "fb01", category: "fiber", text: "الألياف الغذائية لا يهضمها الجسم فعلياً، لكنها ضرورية لصحة الجهاز الهضمي.", textEn: "Dietary fiber isn't actually digested by the body, but it's essential for digestive health." },
  { id: "fb02", category: "fiber", text: "الألياف الذوّابة (كالموجودة في الشوفان والبقوليات) تساعد على خفض الكوليسترول.", textEn: "Soluble fiber (found in oats and legumes) helps lower cholesterol." },
  { id: "fb03", category: "fiber", text: "الألياف غير الذوّابة (كقشور الحبوب الكاملة) تساعد على تنظيم حركة الأمعاء.", textEn: "Insoluble fiber (like whole-grain bran) helps regulate bowel movement." },
  { id: "fb04", category: "fiber", text: "الألياف تُبطئ امتصاص السكر في الدم، فتساعد على استقرار سكر الدم بعد الوجبة.", textEn: "Fiber slows sugar absorption into the blood, helping keep blood sugar more stable after a meal." },
  { id: "fb05", category: "fiber", text: "زيادة الألياف في الغذاء تحتاج غالباً كمية كافية من الماء معها ليعمل الجهاز الهضمي بشكل مريح.", textEn: "Increasing dietary fiber usually needs enough water alongside it for comfortable digestion." },
  { id: "fb06", category: "fiber", text: "البقوليات (عدس، حمص، فول) من أغنى المصادر النباتية بالألياف والبروتين معاً.", textEn: "Legumes (lentils, chickpeas, beans) are among the richest plant sources of both fiber and protein." },

  // ماء وترطيب
  { id: "hy01", category: "hydration", text: "الماء يشكّل نحو 60% من وزن جسم الإنسان البالغ تقريباً.", textEn: "Water makes up roughly 60% of an adult human body's weight." },
  { id: "hy02", category: "hydration", text: "الشعور بالعطش قد يكون علامة متأخرة نسبياً على بدء الجفاف، لا بدايته الفعلية.", textEn: "Feeling thirsty can be a relatively late sign that dehydration has already started, not its actual beginning." },
  { id: "hy03", category: "hydration", text: "بعض الخضار والفواكه (كالخيار والبطيخ) تحتوي نسبة ماء عالية جداً وتساهم فعلياً في ترطيب الجسم.", textEn: "Some fruits and vegetables (like cucumber and watermelon) have very high water content and genuinely contribute to hydration." },
  { id: "hy04", category: "hydration", text: "لون البول الفاتح غالباً مؤشر جيد على ترطيب كافٍ، بينما الداكن قد يشير لحاجة لمزيد من الماء.", textEn: "Pale urine is often a good sign of adequate hydration, while dark urine can signal a need for more water." },
  { id: "hy05", category: "hydration", text: "الحاجة للماء تزيد مع النشاط البدني، والحرارة، والرطوبة العالية.", textEn: "Water needs increase with physical activity, heat, and high humidity." },
  { id: "hy06", category: "hydration", text: "الكافيين له تأثير مدرّ خفيف للبول، لكنه لا يسبب جفافاً حاداً عند الاستهلاك المعتدل كما كان يُعتقد سابقاً.", textEn: "Caffeine has a mild diuretic effect, but doesn't cause significant dehydration at moderate intake, as was once believed." },

  // عام / عادات غذائية
  { id: "gn01", category: "general", text: "الطعام المصنَّع بكثافة غالباً أعلى بالسكر والصوديوم والدهون غير الصحية من الطعام الطازج المُعَدّ في المنزل.", textEn: "Heavily processed food is often higher in sugar, sodium, and unhealthy fats than fresh, home-prepared food." },
  { id: "gn02", category: "general", text: "حجم الحصة الفعلي غالباً أكبر مما يتخيله كثير من الناس - القياس أدق دائماً من التقدير البصري.", textEn: "Actual portion sizes are often larger than most people imagine - measuring is always more accurate than eyeballing." },
  { id: "gn03", category: "general", text: "لا يوجد طعام واحد \"خارق\" يغني عن نظام غذائي متوازن ومتنوّع بشكل عام.", textEn: "No single \"superfood\" can replace an overall balanced, varied diet." },
  { id: "gn04", category: "general", text: "البروتين والألياف معاً يزيدان الشعور بالشبع أكثر من الكارب أو الدهون وحدهما عادةً.", textEn: "Protein and fiber together usually increase satiety more than carbs or fat alone." },
  { id: "gn05", category: "general", text: "إفطار متوازن يجمع بروتيناً وألياف يساعد غالباً على تقليل الرغبة الشديدة بالأكل لاحقاً في اليوم.", textEn: "A balanced breakfast combining protein and fiber often helps reduce strong cravings later in the day." },
  { id: "gn06", category: "general", text: "قراءة ملصق \"القيمة الغذائية\" تبدأ عادة بحجم الحصة - كل الأرقام الأخرى على الملصق مبنية عليه.", textEn: "Reading a nutrition facts label usually starts with the serving size - every other number on it is based on that." },
  { id: "gn07", category: "general", text: "السكريات المضافة أثناء التصنيع تختلف عن السكريات الطبيعية الموجودة أصلاً في الفواكه ومنتجات الألبان.", textEn: "Sugars added during processing are different from the natural sugars already present in fruit and dairy." },
  { id: "gn08", category: "general", text: "الكوليسترول الغذائي (من الطعام) يُعتقد اليوم أن تأثيره على كوليسترول الدم أقل مما كان يُظن سابقاً لدى أغلب الناس، مقارنة بالدهون المشبعة والمتحوّلة.", textEn: "Dietary cholesterol (from food) is now thought to affect blood cholesterol less than previously believed for most people, compared to saturated and trans fats." },
  { id: "gn09", category: "general", text: "الطبخ في المنزل يمنح تحكماً أكبر بكمية الملح والسكر والدهون المضافة مقارنة بمعظم الطعام الجاهز.", textEn: "Cooking at home gives you more control over added salt, sugar, and fat compared to most ready-made food." },
  { id: "gn10", category: "general", text: "تناول الطعام ببطء ومضغه جيداً يعطي الدماغ وقتاً كافياً لتسجيل إشارة الشبع.", textEn: "Eating slowly and chewing well gives the brain enough time to register the fullness signal." },
  { id: "gn11", category: "general", text: "التنوّع في مصادر البروتين (حيواني ونباتي) يساعد على تغطية أحماض أمينية ومغذيات مختلفة.", textEn: "Varying protein sources (animal and plant-based) helps cover a wider range of amino acids and nutrients." },
  { id: "gn12", category: "general", text: "الطهي بالشوي أو البخار يقلّل عادةً الدهون المضافة مقارنة بالقلي العميق.", textEn: "Grilling or steaming usually adds less fat compared to deep-frying." },
];

export const TIP_CATEGORY_LABELS = {
  macros: "مغذيات كبرى",
  vitamins: "فيتامينات",
  minerals: "معادن",
  fiber: "ألياف",
  hydration: "ترطيب",
  general: "عام",
};

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// The app's shared todayKey() (in helpers.js) returns the UTC calendar
// date (d.toISOString().slice(0,10)) — a long-standing quirk relied on
// elsewhere, but wrong for "بصيرة": a user ahead of UTC (e.g. Kuwait,
// UTC+3) would still get yesterday's UTC date for the first few hours
// after their own local midnight, and a user behind UTC would flip to
// tomorrow's tip hours before their local midnight. "New calendar day"
// for the daily tip must mean the user's own local midnight, so this
// builds the key from local getFullYear/getMonth/getDate instead of any
// UTC conversion. Used for picking today's tip, the tips_log key, and
// the comparison against previously-logged days — never mix this with
// todayKey() for anything tip-related.
export function localDayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Guaranteed non-empty fallback: used only if TIPS is ever empty/malformed
// or the date-based computation below throws for some unforeseen reason,
// so the card always has something real to show instead of going blank.
// مُصدَّر عمداً: معرّفه "fallback" ليس ضمن بنك TIPS، وقد يُسجَّل في tips_log
// لأي يوم فشل فيه اختيار النصيحة - عارض الأرشيف يحتاج التعرف عليه حتى لا
// يسقط ذلك اليوم من الأرشيف بصمت (انظر archive في TipsView).
export const FALLBACK_TIP = { id: "fallback", category: "macros", text: TIPS[0]?.text || "كل غرام بروتين يعطي الجسم نحو 4 سعرات حرارية.", textEn: TIPS[0]?.textEn || "Every gram of protein gives the body about 4 calories." };

// يختار نصيحة اليوم بشكل حتمي من التاريخ فقط (بدون الحاجة لتخزين "آخر
// نصيحة" في أي مكان): كل تاريخ يقابله فهرس ثابت، فلا تتكرر النصائح إلا
// بعد أن تكتمل دورة القائمة، ولا تظهر نصيحة يوم فات لم يدخل فيه المستخدم
// لأن الاختيار مبني على تاريخ اليوم الحالي فقط لا على تتابع الأيام.
// الإزاحة المشتقة من هوية المستخدم تمنع أيضاً تطابق نصيحة اليوم بين كل
// المستخدمين في نفس التاريخ.
export function pickDailyTip(dateKey, ownerId = "solo") {
  try {
    if (!Array.isArray(TIPS) || TIPS.length === 0) return FALLBACK_TIP;
    const parsed = Date.parse(`${dateKey}T00:00:00Z`);
    const dayIndex = Number.isFinite(parsed) ? Math.floor(parsed / 86400000) : 0;
    const offset = hashString(String(ownerId || "solo")) % TIPS.length;
    const idx = (((dayIndex + offset) % TIPS.length) + TIPS.length) % TIPS.length;
    const tip = TIPS[idx];
    return (tip && tip.text) ? tip : FALLBACK_TIP;
  } catch (e) {
    console.error("[pickDailyTip] fell back after error:", e);
    return FALLBACK_TIP;
  }
}
