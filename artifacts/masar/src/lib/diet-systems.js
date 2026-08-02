// محتوى تعليمي ثابت لقسم "الأنظمة الغذائية" - بيانات مرجعية فقط، لا يُنشئها
// أو يُعدّلها أي استدعاء ذكاء اصطناعي إطلاقاً. هذا الملف هو المصدر الوحيد
// للحقيقة العلمية في هذا القسم، ليقدر أخصائي المشروع مراجعته واعتماده قبل
// النشر - أي تحديث على المحتوى العلمي نفسه يجب أن يمرّ عبر هذا الملف
// حصراً، لا عبر أي prompt أو استجابة AI في الواجهة.
//
// دور Gemini يقتصر على البناء ضمن هذه المبادئ (الخطة الشخصية) لا اختراعها -
// انظر buildDietPlanPrompt في DietPlansView.jsx: يُرسَل محتوى النظام كاملاً
// كسياق ثابت للنموذج، ويُطلَب منه صراحة عدم اختلاق مبادئ غذائية خارج هذا
// السياق المرفق.
//
// unsuitableConditions تطابق المفاتيح الإنجليزية الثابتة لحالات
// health_profile.conditions (نفس CONDITION_KEY_MAP في MasarApp.jsx):
// diabetes, blood_pressure, kidney, liver, heart, cholesterol.

export const DIET_SYSTEMS = [
  // ============================================================
  // 1) DASH - مكتمل المحتوى
  // ============================================================
  {
    id: "dash",
    completed: true,
    name: "نظام داش (DASH)",
    nameEn: "DASH Diet",
    overview: "نمط غذائي طُوِّر أصلاً لدعم ضبط ضغط الدم، ويعتمده كثير من الجهات الصحية كنمط غذائي عام صحي للقلب. يركّز على الخضار والفواكه والحبوب الكاملة والبروتين قليل الدهن وتقليل الصوديوم.",
    overviewEn: "An eating pattern originally developed to help manage blood pressure, and widely adopted by health bodies as a general heart-healthy pattern. It emphasizes vegetables, fruits, whole grains, lean protein, and reduced sodium.",
    scientificReference: "مبنيّ على توصيات المعهد الوطني الأمريكي للقلب والرئة والدم (NHLBI)، ومتوافق مع توجّهات منظمة الصحة العالمية للحدّ من استهلاك الصوديوم لدعم صحة القلب.",
    scientificReferenceEn: "Based on guidance from the U.S. National Heart, Lung, and Blood Institute (NHLBI), and aligned with World Health Organization guidance on reducing sodium intake for heart health.",
    suitableFor: "من يريد ضبط ضغط الدم أو الوقاية منه، ومن يبحث عن نمط غذائي عام داعم لصحة القلب.",
    suitableForEn: "Those managing or preventing high blood pressure, and anyone seeking a general heart-healthy eating pattern.",
    notRecommendedFor: "قد لا يناسب مرضى الكلى المتقدمين دون إشراف طبي (بسبب محتوى البوتاسيوم والفوسفور في الخضار والألبان)، ومن يتناول أدوية مدرّة للبول أو ضغط تتطلب ضبطاً دقيقاً للصوديوم والبوتاسيوم - يجب التنسيق مع الطبيب أولاً.",
    notRecommendedForEn: "May not suit advanced kidney disease without medical supervision (due to potassium/phosphorus in vegetables and dairy), or those on diuretics/blood-pressure medication requiring precise sodium/potassium control - coordinate with a doctor first.",
    unsuitableConditions: ["kidney"],
    benefits: ["يدعم ضبط ضغط الدم", "يدعم صحة القلب عموماً", "قد يساعد على خسارة وزن معتدلة", "يعتمد أطعمة كاملة غير مصنّعة"],
    benefitsEn: ["Supports blood pressure management", "Supports general heart health", "May aid modest weight loss", "Emphasizes whole, unprocessed foods"],
    drawbacks: ["يحتاج تخطيطاً ووقتاً لتحضير الوجبات", "تقليل الصوديوم قد يحتاج وقتاً للتأقلم", "محتوى الألبان قد لا يناسب حساسية اللاكتوز دون بدائل"],
    drawbacksEn: ["Requires meal planning and prep time", "Reducing sodium can take time to adjust to", "Dairy content may not suit lactose sensitivity without substitutes"],
    allowedFoods: ["خضار وفواكه طازجة", "حبوب كاملة", "ألبان قليلة الدسم", "دواجن وأسماك", "بقوليات ومكسرات غير مملّحة", "زيوت صحية كزيت الزيتون"],
    allowedFoodsEn: ["Fresh vegetables and fruits", "Whole grains", "Low-fat dairy", "Poultry and fish", "Legumes and unsalted nuts", "Healthy oils like olive oil"],
    limitFoods: ["الأطعمة المصنّعة عالية الصوديوم", "اللحوم الحمراء والمصنّعة", "المشروبات والحلويات السكرية", "الدهون المشبعة والمهدرجة"],
    limitFoodsEn: ["High-sodium processed foods", "Red and processed meat", "Sugary drinks and sweets", "Saturated and trans fats"],
    sampleDay: {
      breakfast: "شوفان بالفواكه الطازجة مع زبادي قليل الدسم",
      lunch: "صدر دجاج مشوي مع سلطة خضار وحبوب كاملة وزيت زيتون",
      dinner: "سمك مشوي مع خضار مطهوّة على البخار وأرز بني",
      snacks: "فاكهة طازجة أو حفنة مكسرات غير مملّحة",
    },
    sampleDayEn: {
      breakfast: "Oatmeal with fresh fruit and low-fat yogurt",
      lunch: "Grilled chicken breast with a vegetable and whole-grain salad, olive oil dressing",
      dinner: "Grilled fish with steamed vegetables and brown rice",
      snacks: "Fresh fruit or a handful of unsalted nuts",
    },
  },

  // ============================================================
  // 2) Mediterranean - مكتمل المحتوى
  // ============================================================
  {
    id: "mediterranean",
    completed: true,
    name: "النظام المتوسطي (Mediterranean)",
    nameEn: "Mediterranean Diet",
    overview: "نمط غذائي مستوحى من عادات الأكل التقليدية في دول حوض البحر الأبيض المتوسط، يعتمد الخضار والفواكه والحبوب الكاملة والبقوليات والمكسرات وزيت الزيتون كمصدر دهون رئيسي، مع أسماك ودواجن باعتدال ولحوم حمراء محدودة.",
    overviewEn: "An eating pattern inspired by the traditional dietary habits of countries bordering the Mediterranean Sea, emphasizing vegetables, fruits, whole grains, legumes, nuts, and olive oil as the primary fat source, with moderate fish and poultry and limited red meat.",
    scientificReference: "من أكثر الأنماط الغذائية دراسةً في أبحاث التغذية المرتبطة بصحة القلب والشرايين، ويظهر عموماً في توجيهات النظام الغذائي الصحي الصادرة عن جهات صحية دولية.",
    scientificReferenceEn: "One of the most widely studied eating patterns in cardiovascular nutrition research, and it commonly appears in healthy-diet guidance issued by international health bodies.",
    suitableFor: "عموم من يبحث عن نمط غذائي مستدام وطويل الأمد داعم لصحة القلب والشرايين، بمرونة عالية في التطبيق اليومي.",
    suitableForEn: "Anyone seeking a sustainable, long-term eating pattern that supports cardiovascular health, with high flexibility for daily application.",
    notRecommendedFor: "يحتاج بدائل لمن لديه حساسية من المكسرات أو زيت الزيتون. لا توجد محاذير كبرى معروفة لعموم الأصحاء، لكن كأي تغيير غذائي كبير يُستحسن استشارة الطبيب لمن لديه حالة مزمنة قائمة.",
    notRecommendedForEn: "Needs substitutes for those with nut or olive oil allergies. No major known contraindications for generally healthy individuals, but as with any major dietary change, anyone with an existing chronic condition should consult their doctor.",
    unsuitableConditions: [],
    benefits: ["يدعم صحة القلب والشرايين", "غني بمضادات الأكسدة والألياف", "مرن ومستدام على المدى الطويل", "يعتمد أطعمة متوفرة ومتنوعة"],
    benefitsEn: ["Supports cardiovascular health", "Rich in antioxidants and fiber", "Flexible and sustainable long-term", "Uses widely available, varied foods"],
    drawbacks: ["تكلفة زيت الزيتون والأسماك والمكسرات قد ترتفع في بعض الأسواق", "الدهون الصحية تبقى كثيفة بالسعرات فتحتاج انتباهاً للكمية"],
    drawbacksEn: ["Olive oil, fish, and nut costs can be higher in some markets", "Healthy fats are still calorie-dense, so portion awareness still matters"],
    allowedFoods: ["خضار وفواكه", "حبوب كاملة", "بقوليات ومكسرات", "زيت الزيتون", "أسماك (يُفضَّل مرتين أسبوعياً)", "دواجن وبيض وألبان باعتدال", "أعشاب وتوابل بدل الملح"],
    allowedFoodsEn: ["Vegetables and fruits", "Whole grains", "Legumes and nuts", "Olive oil", "Fish (ideally twice a week)", "Poultry, eggs, and dairy in moderation", "Herbs and spices instead of salt"],
    limitFoods: ["اللحوم الحمراء والمصنّعة", "السكريات المكرَّرة", "الحبوب المكرَّرة", "الأطعمة شديدة المعالجة الصناعية"],
    limitFoodsEn: ["Red and processed meat", "Refined sugars", "Refined grains", "Highly processed foods"],
    sampleDay: {
      breakfast: "خبز حبوب كاملة مع زيت زيتون وطماطم وبيض مسلوق",
      lunch: "سمك مشوي مع سلطة خضار وبرغل أو أرز بني وزيت زيتون",
      dinner: "شوربة عدس أو بقوليات مع خضار وخبز حبوب كاملة",
      snacks: "فاكهة، مكسرات، أو زبادي",
    },
    sampleDayEn: {
      breakfast: "Whole-grain bread with olive oil, tomato, and a boiled egg",
      lunch: "Grilled fish with a vegetable salad and bulgur or brown rice, olive oil dressing",
      dinner: "Lentil or legume soup with vegetables and whole-grain bread",
      snacks: "Fruit, nuts, or yogurt",
    },
  },

  // ============================================================
  // 3) MIND - مكتمل المحتوى
  // ============================================================
  {
    id: "mind",
    completed: true,
    name: "نظام مايند (MIND)",
    nameEn: "MIND Diet",
    overview: "نمط غذائي هجين يدمج مبادئ DASH والنظام المتوسطي، مع تركيز خاص على مجموعات أطعمة ارتبطت في أبحاث التغذية بدعم الصحة الإدراكية (الخضار الورقية، التوت، المكسرات، زيت الزيتون)، مع تقليل الزبدة والجبن واللحوم الحمراء والمقالي والحلويات.",
    overviewEn: "A hybrid eating pattern combining DASH and Mediterranean principles, with special emphasis on food groups that nutrition research has associated with supporting cognitive health (leafy greens, berries, nuts, olive oil), while limiting butter, cheese, red meat, fried food, and pastries.",
    scientificReference: "طُوِّر هذا النمط في أبحاث تغذية أمريكية (جامعة راش) بدمج مبادئ DASH والمتوسطي. ارتبط في دراسات رصدية بدعم الصحة الإدراكية مع التقدّم بالعمر - وهذا ليس ادعاءً بالعلاج أو ضماناً للوقاية من أي مرض، بل نمط غذائي داعم عموماً ضمن نمط حياة صحي شامل.",
    scientificReferenceEn: "This pattern was developed in U.S. nutrition research (Rush University) by combining DASH and Mediterranean principles. Observational studies have associated it with supporting cognitive health with aging - this is not a claim of treatment or a guarantee of disease prevention, but a generally supportive eating pattern within an overall healthy lifestyle.",
    suitableFor: "من يهتم بنمط غذائي داعم عموماً للصحة الإدراكية مع التقدّم بالعمر، إلى جانب دعم صحة القلب.",
    suitableForEn: "Those interested in a generally cognitive-health-supportive eating pattern with aging, alongside cardiovascular health support.",
    notRecommendedFor: "نفس محاذير DASH (حذر لمرضى الكلى بسبب الخضار الورقية الغنية بالبوتاسيوم) والمتوسطي (حساسية المكسرات). لا يُعتبر علاجاً أو وقاية مؤكدة من أي حالة إدراكية.",
    notRecommendedForEn: "Same cautions as DASH (kidney disease caution due to potassium-rich leafy greens) and Mediterranean (nut allergies). Not a treatment or guaranteed prevention for any cognitive condition.",
    unsuitableConditions: ["kidney"],
    benefits: ["يجمع فوائد DASH والمتوسطي معاً", "غني بمضادات الأكسدة من التوت والخضار الورقية", "يدعم صحة القلب والأوعية أيضاً"],
    benefitsEn: ["Combines the benefits of DASH and Mediterranean", "Rich in antioxidants from berries and leafy greens", "Also supports cardiovascular health"],
    drawbacks: ["التركيز اليومي على التوت والخضار الورقية قد يحتاج تخطيطاً لتوفّرها وتكلفتها", "كأي نمط غذائي، لا يضمن نتيجة صحية بمفرده"],
    drawbacksEn: ["Daily emphasis on berries and leafy greens may require planning for availability and cost", "Like any eating pattern, it doesn't guarantee a health outcome on its own"],
    allowedFoods: ["خضار ورقية (يومياً)", "خضار أخرى", "توت (يُفضَّل معظم أيام الأسبوع)", "مكسرات", "زيت الزيتون", "حبوب كاملة", "أسماك", "بقوليات", "دواجن"],
    allowedFoodsEn: ["Leafy green vegetables (daily)", "Other vegetables", "Berries (most days of the week ideally)", "Nuts", "Olive oil", "Whole grains", "Fish", "Legumes", "Poultry"],
    limitFoods: ["الزبدة والسمن الصناعي", "الجبن", "اللحوم الحمراء", "الأطعمة المقلية والوجبات السريعة", "الحلويات والمعجنات"],
    limitFoodsEn: ["Butter and margarine", "Cheese", "Red meat", "Fried food and fast food", "Pastries and sweets"],
    sampleDay: {
      breakfast: "شوفان مع توت ومكسرات",
      lunch: "سلطة خضار ورقية مع دجاج مشوي وصلصة زيت زيتون وحبوب كاملة",
      dinner: "سمك مشوي مع خضار ورقية مطهوّة وبقوليات",
      snacks: "توت طازج أو حفنة صغيرة من المكسرات",
    },
    sampleDayEn: {
      breakfast: "Oatmeal with berries and nuts",
      lunch: "Leafy green salad with grilled chicken, olive oil dressing, and whole grains",
      dinner: "Grilled fish with cooked leafy greens and legumes",
      snacks: "Fresh berries or a small handful of nuts",
    },
  },

  // ============================================================
  // بنية جاهزة فقط - تنتظر تعبئة المحتوى بعد مراجعة أخصائي التغذية
  // (نفس الحقول بالضبط أعلاه، فارغة عمداً - لا نص افتراضي مخترَع)
  // ============================================================
  { id: "flexitarian", completed: false, name: "النظام المرن (Flexitarian)", nameEn: "Flexitarian Diet" },
  { id: "vegetarian", completed: false, name: "النظام النباتي (يشمل الألبان/البيض)", nameEn: "Vegetarian Diet" },
  { id: "vegan", completed: false, name: "النظام النباتي الصرف (Vegan)", nameEn: "Vegan Diet" },
  { id: "low_carb", completed: false, name: "منخفض الكربوهيدرات (Low-Carb)", nameEn: "Low-Carb Diet" },
  { id: "ketogenic", completed: false, name: "الكيتوجيني (Ketogenic)", nameEn: "Ketogenic Diet" },
  { id: "high_protein", completed: false, name: "عالي البروتين (High-Protein)", nameEn: "High-Protein Diet" },
];

export function getDietSystem(id) {
  return DIET_SYSTEMS.find((d) => d.id === id) || null;
}

// يطابق حالات health_profile.conditions (نصوص عربية ثابتة) مع مفاتيح
// unsuitableConditions الإنجليزية أعلاه - نفس CONDITION_KEY_MAP المستخدَم في
// YouView (MasarApp.jsx) لعرض هذه الحالات، معاد تعريفه هنا محلياً حتى يبقى
// diet-systems.js مستقلاً بذاته بلا استيراد من مكوّن واجهة.
export const CONDITION_KEY_MAP = {
  "سكري": "diabetes", "ضغط الدم": "blood_pressure", "أمراض الكلى": "kidney",
  "أمراض الكبد": "liver", "أمراض القلب": "heart", "ارتفاع الكولسترول": "cholesterol",
};

// يتحقق إن كان نظام غذائي معيّن غير مناسب لأي من حالات المستخدم الصحية
// المسجّلة في health_profile.conditions - يُستخدَم لعرض التحذير البارز ومنع
// التوصية به، بدل استنتاج ذلك بالذكاء الاصطناعي (قرار طبي حسّاس يجب أن
// يعتمد على مطابقة بيانات ثابتة صريحة لا تخمين نموذج لغوي).
export function isDietUnsuitable(system, conditions = []) {
  if (!system?.unsuitableConditions?.length) return false;
  const conditionKeys = conditions.map((c) => CONDITION_KEY_MAP[c]).filter(Boolean);
  return system.unsuitableConditions.some((key) => conditionKeys.includes(key));
}
