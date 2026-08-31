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
  // مسودات قيد المراجعة (Priority 6) - completed يبقى false عمداً لكل هذه
  // الأنظمة حتى تُراجَع وتُعتمَد صراحة من أخصائي تغذية؛ لعموم المستخدمين لا
  // فرق إطلاقاً عن الحالة السابقة (يرون "قيد الإعداد" فقط، بلا أي إشارة لوجود
  // مسودة خلفها). draftContent: true هو العلم الوحيد المسؤول عن كشف هذا
  // المحتوى في وضع المعاينة الخاص (?draft=diet، انظر DietPlansView.jsx) -
  // تغييره لاحقاً إلى completed: true (بعد الاعتماد الفعلي) هو الخطوة الوحيدة
  // المطلوبة لنشر أي نظام منها للجميع، بلا أي تعديل بنيوي آخر.
  //
  // مصادر عامة استُرشِد بها لصياغة هذه المسودات (لا اقتباس أرقام دراسات
  // محددة، بل مبادئ عامة متفَق عليها): USDA Dietary Guidelines for
  // Americans، مواقف الجمعية الأمريكية للتغذية وعلم التغذية (Academy of
  // Nutrition and Dietetics) حول الأنظمة النباتية، وإرشادات عامة حذرة بخصوص
  // الأنظمة منخفضة الكربوهيدرات/الكيتوجينية نظراً لحساسيتها الطبية.
  // ============================================================
  {
    id: "flexitarian",
    completed: false,
    draftContent: true,
    name: "النظام المرن (Flexitarian)",
    nameEn: "Flexitarian Diet",
    overview: "نمط غذائي أساسه نباتي غالباً، مع إدخال اللحوم ومنتجات حيوانية أخرى بين الحين والآخر دون منعها كلياً - مرونة عمدية بدل الالتزام الصارم بقواعد نباتية كاملة.",
    overviewEn: "A largely plant-based eating pattern that still allows meat and other animal products occasionally, without excluding them entirely - deliberate flexibility rather than strict vegetarian rules.",
    scientificReference: "يتوافق مع توجّه الإرشادات الغذائية الأمريكية (Dietary Guidelines for Americans) نحو زيادة الاعتماد على الأطعمة النباتية ضمن نمط غذائي متوازن عموماً، دون اشتراط استبعاد كامل للحوم.",
    scientificReferenceEn: "Aligns with the general direction of the U.S. Dietary Guidelines for Americans toward greater reliance on plant-based foods within an overall balanced pattern, without requiring complete exclusion of meat.",
    suitableFor: "من يريد تقليل استهلاك اللحوم تدريجياً دون التزام صارم، أو من يبحث عن نمط غذائي مرن وسهل الاستمرار عليه على المدى الطويل.",
    suitableForEn: "Those wanting to gradually reduce meat consumption without a strict commitment, or anyone seeking a flexible, easy-to-sustain long-term eating pattern.",
    notRecommendedFor: "لا محاذير صحية كبرى معروفة لعموم الأصحاء نظراً لمرونته العالية. من يقلّل اللحوم بشكل كبير دون تخطيط جيد قد يحتاج انتباهاً لكفاية الحديد والبروتين - لا داعي لاستشارة خاصة إلا لمن لديه حالة صحية قائمة تستدعي متابعة غذائية أصلاً.",
    notRecommendedForEn: "No major known health concerns for generally healthy individuals, given its high flexibility. Those significantly reducing meat without good planning may need to pay attention to iron and protein adequacy - no special consultation needed except for those with an existing condition already requiring dietary follow-up.",
    unsuitableConditions: [],
    benefits: ["يدعم صحة القلب مع زيادة الاعتماد على النباتات", "يساعد على إدارة الوزن لسهولة الاستمرار عليه", "مرن جداً ولا يتطلب استبعاداً كاملاً لأي مجموعة غذائية", "خطوة تدريجية سهلة نحو نمط أكثر اعتماداً على النبات"],
    benefitsEn: ["Supports heart health through greater reliance on plants", "Can help with weight management due to ease of adherence", "Very flexible - no food group is fully excluded", "An easy, gradual step toward a more plant-forward pattern"],
    drawbacks: ["تعريفه المرن قد يجعل الالتزام غير واضح المعايير لبعض الأشخاص", "يحتاج انتباهاً للحديد وفيتامين ب12 والبروتين إن قُلِّلت اللحوم كثيراً بلا تخطيط", "لا يقدّم إرشادات صارمة قد يحتاجها من يفضّل قواعد واضحة"],
    drawbacksEn: ["Its flexible definition can make adherence feel unclear to some", "Needs attention to iron, vitamin B12, and protein if meat is reduced a lot without planning", "Lacks the strict guidance some people prefer for structure"],
    allowedFoods: ["خضار وفواكه", "حبوب كاملة", "بقوليات ومكسرات", "بروتينات نباتية (توفو، عدس)", "لحوم ودواجن وأسماك وألبان وبيض باعتدال وعدم انتظام"],
    allowedFoodsEn: ["Vegetables and fruits", "Whole grains", "Legumes and nuts", "Plant proteins (tofu, lentils)", "Meat, poultry, fish, dairy, and eggs in moderation and irregularly"],
    limitFoods: ["اللحوم المصنّعة", "السكريات المكرَّرة", "الأطعمة شديدة المعالجة الصناعية"],
    limitFoodsEn: ["Processed meat", "Refined sugars", "Highly processed foods"],
    sampleDay: {
      breakfast: "شوفان بالفواكه ومكسرات",
      lunch: "سلطة بقوليات وخضار مع حبوب كاملة",
      dinner: "خضار مشوية مع توفو أو قطعة دجاج صغيرة (يوماً بعد يوم)",
      snacks: "فاكهة أو زبادي",
    },
    sampleDayEn: {
      breakfast: "Oatmeal with fruit and nuts",
      lunch: "Legume and vegetable salad with whole grains",
      dinner: "Grilled vegetables with tofu or a small piece of chicken (every other day)",
      snacks: "Fruit or yogurt",
    },
  },

  {
    id: "vegetarian",
    completed: false,
    draftContent: true,
    name: "النظام النباتي (يشمل الألبان/البيض)",
    nameEn: "Vegetarian Diet",
    overview: "نمط غذائي يستبعد اللحوم والدواجن والأسماك بالكامل، مع الإبقاء على الألبان والبيض (النوع الأكثر شيوعاً من النباتية، المعروف بـ lacto-ovo vegetarian).",
    overviewEn: "An eating pattern that fully excludes meat, poultry, and fish, while still including dairy and eggs (the most common form of vegetarianism, known as lacto-ovo vegetarian).",
    scientificReference: "الجمعية الأمريكية للتغذية وعلم التغذية (Academy of Nutrition and Dietetics) تُقرّ أن الأنظمة النباتية المخطَّطة جيداً يمكن أن تكون صحية وكافية غذائياً لمعظم مراحل الحياة، شريطة الانتباه لعناصر غذائية معيّنة.",
    scientificReferenceEn: "The Academy of Nutrition and Dietetics recognizes that well-planned vegetarian diets can be healthful and nutritionally adequate for most life stages, provided attention is paid to certain nutrients.",
    suitableFor: "من يتجنّب اللحوم لأسباب صحية أو أخلاقية أو دينية، وعموم من يريد نمطاً نباتياً غير صارم يبقي الألبان والبيض.",
    suitableForEn: "Those avoiding meat for health, ethical, or religious reasons, and anyone wanting a non-strict plant-based pattern that still includes dairy and eggs.",
    notRecommendedFor: "يحتاج تخطيطاً لضمان كفاية الحديد والزنك وأوميغا-3 (غالباً من مصادر نباتية أقل امتصاصاً)، أما فيتامين ب12 فمتوفر جزئياً من الألبان/البيض. الاعتماد الكبير على البقوليات والخضار الورقية قد يحتاج حذراً لمرضى الكلى المتقدمين دون إشراف طبي، بنفس منطق DASH أعلاه (محتوى بوتاسيوم/فوسفور أعلى).",
    notRecommendedForEn: "Needs planning to ensure adequate iron, zinc, and omega-3 (often from less-absorbable plant sources); vitamin B12 is partly covered by dairy/eggs. Heavy reliance on legumes and leafy greens may need caution for advanced kidney disease without medical supervision, by the same logic as DASH above (higher potassium/phosphorus content).",
    unsuitableConditions: ["kidney"],
    benefits: ["يدعم صحة القلب ومستويات الكوليسترول", "غني بالألياف ومضادات الأكسدة", "أثر بيئي أقل مقارنة بالأنظمة كثيرة اللحوم", "مرن نسبياً لوجود الألبان والبيض كمصدر بروتين وفيتامين ب12"],
    benefitsEn: ["Supports heart health and cholesterol levels", "Rich in fiber and antioxidants", "Lower environmental footprint compared to meat-heavy patterns", "Relatively flexible since dairy and eggs provide protein and B12"],
    drawbacks: ["يحتاج انتباهاً للحديد والزنك وأوميغا-3", "الاعتماد الزائد على الجبن/الألبان الدسمة قد يرفع الدهون المشبعة", "يحتاج تخطيطاً لضمان تنوّع مصادر البروتين"],
    drawbacksEn: ["Needs attention to iron, zinc, and omega-3", "Overreliance on cheese/full-fat dairy can raise saturated fat intake", "Requires planning to ensure varied protein sources"],
    allowedFoods: ["خضار وفواكه", "حبوب كاملة", "بقوليات ومكسرات وبذور", "ألبان وبيض", "بدائل بروتين نباتية (توفو، تمبيه)"],
    allowedFoodsEn: ["Vegetables and fruits", "Whole grains", "Legumes, nuts, and seeds", "Dairy and eggs", "Plant protein substitutes (tofu, tempeh)"],
    limitFoods: ["اللحوم والدواجن والأسماك (مُستبعَدة)", "الألبان عالية الدسم بإفراط", "السكريات والأطعمة المصنّعة"],
    limitFoodsEn: ["Meat, poultry, and fish (excluded)", "Excessive full-fat dairy", "Sugary and processed foods"],
    sampleDay: {
      breakfast: "بيض مسلوق مع خبز حبوب كاملة وخضار",
      lunch: "طبق عدس أو حمص مع أرز بني وسلطة",
      dinner: "توفو أو جبن مع خضار مشوية وحبوب كاملة",
      snacks: "زبادي، مكسرات، أو فاكهة",
    },
    sampleDayEn: {
      breakfast: "Boiled eggs with whole-grain bread and vegetables",
      lunch: "Lentil or chickpea dish with brown rice and salad",
      dinner: "Tofu or cheese with grilled vegetables and whole grains",
      snacks: "Yogurt, nuts, or fruit",
    },
  },

  {
    id: "vegan",
    completed: false,
    draftContent: true,
    name: "النظام النباتي الصرف (Vegan)",
    nameEn: "Vegan Diet",
    overview: "نمط غذائي يستبعد كل المنتجات الحيوانية بالكامل - اللحوم والدواجن والأسماك والألبان والبيض والعسل غالباً - معتمداً كلياً على مصادر نباتية.",
    overviewEn: "An eating pattern that fully excludes all animal products - meat, poultry, fish, dairy, eggs, and usually honey - relying entirely on plant-based sources.",
    scientificReference: "الجمعية الأمريكية للتغذية وعلم التغذية تُقرّ أن الأنظمة النباتية الصرفة المخطَّطة جيداً يمكن أن تكون كافية غذائياً، لكنها تُشدِّد بوضوح على ضرورة الحصول على فيتامين ب12 من أطعمة مُدعَّمة أو مكمّلات غذائية - فهو غير متوفر عملياً من مصادر نباتية طبيعية.",
    scientificReferenceEn: "The Academy of Nutrition and Dietetics recognizes that well-planned vegan diets can be nutritionally adequate, but explicitly stresses the need to obtain vitamin B12 from fortified foods or supplements - it is not practically available from natural plant sources.",
    suitableFor: "من يريد الالتزام الكامل بنمط نباتي لأسباب أخلاقية أو بيئية أو صحية، ولديه استعداد للتخطيط الجيد ومتابعة بعض العناصر الغذائية.",
    suitableForEn: "Those wanting full commitment to a plant-based pattern for ethical, environmental, or health reasons, who are ready for careful planning and monitoring of certain nutrients.",
    notRecommendedFor: "يتطلّب حتماً مصدراً لفيتامين ب12 (أطعمة مُدعَّمة أو مكمّل) - غيابه يؤدي لنقص حقيقي مع الوقت. يحتاج أيضاً انتباهاً للحديد والكالسيوم وفيتامين د وأوميغا-3 (EPA/DHA) واليود والزنك. الحمل والرضاعة وسنوات الطفولة المبكرة تحتاج إشرافاً من أخصائي تغذية لضمان التخطيط السليم. نفس حذر البوتاسيوم/الفوسفور لمرضى الكلى المتقدمين الوارد في الأنظمة النباتية الأخرى أعلاه.",
    notRecommendedForEn: "Necessarily requires a vitamin B12 source (fortified foods or a supplement) - its absence leads to real deficiency over time. Also needs attention to iron, calcium, vitamin D, omega-3 (EPA/DHA), iodine, and zinc. Pregnancy, breastfeeding, and early childhood need supervision from a nutrition specialist to ensure sound planning. Same potassium/phosphorus caution for advanced kidney disease noted in the other plant-based patterns above.",
    unsuitableConditions: ["kidney"],
    benefits: ["يدعم صحة القلب وخفض الكوليسترول والدهون المشبعة", "غني جداً بالألياف ومضادات الأكسدة", "أقل أثراً بيئياً بين الأنظمة الموصوفة هنا", "قد يدعم إدارة الوزن لغناه بالأطعمة الكاملة قليلة الكثافة السعرية"],
    benefitsEn: ["Supports heart health and lowers cholesterol and saturated fat", "Very rich in fiber and antioxidants", "Among the lowest environmental impact of the patterns described here", "May support weight management due to abundance of low-calorie-density whole foods"],
    drawbacks: ["خطر حقيقي لنقص فيتامين ب12 دون أطعمة مُدعَّمة أو مكمّل - هذه ليست نقطة اختيارية", "يحتاج تخطيطاً دقيقاً للحديد والكالسيوم وأوميغا-3 واليود والزنك", "تحديات اجتماعية وعملية عند تناول الطعام خارج المنزل", "يتطلّب وقتاً أطول للتعلّم والتخطيط في البداية"],
    drawbacksEn: ["Real risk of vitamin B12 deficiency without fortified foods or a supplement - this is not optional", "Requires careful planning for iron, calcium, omega-3, iodine, and zinc", "Social and practical challenges when eating outside the home", "Requires more time to learn and plan initially"],
    allowedFoods: ["خضار وفواكه", "حبوب كاملة", "بقوليات ومكسرات وبذور", "بدائل ألبان نباتية مُدعَّمة", "توفو وتمبيه وسيتان", "أطعمة مُدعَّمة بفيتامين ب12"],
    allowedFoodsEn: ["Vegetables and fruits", "Whole grains", "Legumes, nuts, and seeds", "Fortified plant-based milk alternatives", "Tofu, tempeh, and seitan", "Foods fortified with vitamin B12"],
    limitFoods: ["كل المنتجات الحيوانية (مُستبعَدة بالكامل: لحوم، دواجن، أسماك، ألبان، بيض، وغالباً العسل)", "الأطعمة النباتية شديدة المعالجة (لحوم نباتية مصنَّعة بكثرة)"],
    limitFoodsEn: ["All animal products (fully excluded: meat, poultry, fish, dairy, eggs, and usually honey)", "Highly processed plant-based foods (heavily processed meat substitutes)"],
    sampleDay: {
      breakfast: "شوفان بحليب نباتي مُدعَّم مع فاكهة وبذور",
      lunch: "طبق بقوليات مع أرز بني وخضار متنوعة",
      dinner: "توفو أو تمبيه مشوي مع خضار وحبوب كاملة",
      snacks: "مكسرات، حمص، أو فاكهة",
    },
    sampleDayEn: {
      breakfast: "Oatmeal with fortified plant milk, fruit, and seeds",
      lunch: "Legume dish with brown rice and varied vegetables",
      dinner: "Grilled tofu or tempeh with vegetables and whole grains",
      snacks: "Nuts, hummus, or fruit",
    },
  },

  {
    id: "low_carb",
    completed: false,
    draftContent: true,
    name: "منخفض الكربوهيدرات (Low-Carb)",
    nameEn: "Low-Carb Diet",
    overview: "نمط غذائي يقلّل الكربوهيدرات دون سقف صارم موحَّد (تتفاوت درجة التقليل بين الأنظمة المختلفة)، مع زيادة نسبية في البروتين والدهون - أقل تطرّفاً وتقييداً من الكيتوجيني الموصوف أدناه.",
    overviewEn: "An eating pattern that reduces carbohydrates without one strict universal threshold (the degree of reduction varies between approaches), with a relative increase in protein and fat - less extreme and restrictive than the ketogenic pattern described below.",
    scientificReference: "الجمعية الأمريكية للسكري (American Diabetes Association) تُقرّ تقليل الكربوهيدرات كأحد الأنماط الغذائية الممكنة لبعض مرضى النوع الثاني من السكري، ضمن خطة فردية بإشراف طبي - لا كتوصية عامة موحَّدة للجميع.",
    scientificReferenceEn: "The American Diabetes Association recognizes carbohydrate reduction as one possible eating pattern for some people with type 2 diabetes, within an individualized plan under medical supervision - not as a single universal recommendation for everyone.",
    suitableFor: "بالغون أصحاء يبحثون عن خيار من بين عدة خيارات لإدارة الوزن أو استقرار سكر الدم، وليس بالضرورة الخيار الوحيد أو الأفضل للجميع.",
    suitableForEn: "Healthy adults seeking one option among several for weight management or blood-sugar stability - not necessarily the only or best option for everyone.",
    notRecommendedFor: "محاذير مهمة يجب مراعاتها بجدية: مرضى السكري من النوع الأول أو من يستخدم الإنسولين يواجهون خطر انخفاض حاد في سكر الدم أو مضاعفات أخرى إن غُيِّر النظام الغذائي دون تعديل الجرعات الدوائية تحت إشراف طبي مباشر. مرضى الكلى قد يشكّل ارتفاع البروتين في بعض تطبيقات هذا النظام عبئاً إضافياً على الكلى ويحتاج إشرافاً طبياً. الحمل والرضاعة: التغييرات الغذائية التقييدية الكبيرة تحتاج استشارة طبية مسبقة نظراً لمحدودية الدراسات في هذه الفئة تحديداً. عموماً، هذا النظام ليس خياراً \"آمناً للجميع بلا استثناء\" - أي شخص يتناول أدوية للسكري أو الضغط يجب أن ينسّق مع طبيبه قبل البدء.",
    notRecommendedForEn: "Important cautions that must be taken seriously: People with type 1 diabetes or on insulin face a real risk of sharp blood-sugar drops or other complications if the diet changes without adjusting medication doses under direct medical supervision. People with kidney disease may find the higher protein content in some low-carb approaches an added burden on the kidneys and need medical supervision. Pregnancy and breastfeeding: significant restrictive dietary changes need prior medical consultation given limited research specifically in this group. Overall, this is not a \"safe for everyone without exception\" option - anyone on diabetes or blood-pressure medication must coordinate with their doctor before starting.",
    unsuitableConditions: ["diabetes", "kidney"],
    benefits: ["قد يدعم فقدان الوزن لدى بعض الأفراد", "قد يساعد على استقرار سكر الدم بعد الوجبات لدى بعضهم", "يزيد الشعور بالشبع لدى كثيرين بفضل ارتفاع نسبة البروتين"],
    benefitsEn: ["May support weight loss for some individuals", "May help stabilize post-meal blood sugar for some people", "Increases satiety for many due to the higher protein share"],
    drawbacks: ["قد يقلّل الألياف إن لم تُختَر مصادر الكربوهيدرات المتبقية بعناية", "أعراض تكيّف أولية شائعة (تعب، صداع خفيف) في الأيام الأولى", "ليس مؤكَّداً علمياً كأفضل خيار طويل الأمد للجميع مقارنة بأنماط أخرى", "يتطلّب تعديل جرعات الأدوية لمن يتناول علاجات للسكري أو الضغط - لا يُبدَأ به من تلقاء نفسه لهذه الفئة"],
    drawbacksEn: ["May reduce fiber if remaining carb sources aren't chosen carefully", "Common initial adaptation symptoms (fatigue, mild headache) in the first days", "Not scientifically established as the best long-term option for everyone compared to other patterns", "Requires medication dose adjustment for those on diabetes or blood-pressure treatment - should not be self-started by this group"],
    allowedFoods: ["خضار غير نشوية", "مصادر بروتين (لحوم، دواجن، أسماك، بيض)", "دهون صحية (زيت زيتون، أفوكادو، مكسرات)", "ألبان باعتدال", "كمية محدودة من الفواكه والحبوب الكاملة حسب درجة التقييد"],
    allowedFoodsEn: ["Non-starchy vegetables", "Protein sources (meat, poultry, fish, eggs)", "Healthy fats (olive oil, avocado, nuts)", "Dairy in moderation", "A limited amount of fruit and whole grains depending on strictness"],
    limitFoods: ["السكريات المكرَّرة والمشروبات السكرية", "الخبز والمعكرونة والأرز بكميات كبيرة", "الخضار النشوية بكثرة", "الحبوب المكرَّرة"],
    limitFoodsEn: ["Refined sugars and sugary drinks", "Bread, pasta, and rice in large amounts", "Starchy vegetables in excess", "Refined grains"],
    sampleDay: {
      breakfast: "بيض مع خضار وأفوكادو",
      lunch: "صدر دجاج مشوي مع سلطة خضار كبيرة وزيت زيتون",
      dinner: "سمك مشوي مع خضار غير نشوية مطهوّة",
      snacks: "مكسرات أو قطعة جبن",
    },
    sampleDayEn: {
      breakfast: "Eggs with vegetables and avocado",
      lunch: "Grilled chicken breast with a large vegetable salad and olive oil",
      dinner: "Grilled fish with cooked non-starchy vegetables",
      snacks: "Nuts or a piece of cheese",
    },
  },

  {
    id: "ketogenic",
    completed: false,
    draftContent: true,
    name: "الكيتوجيني (Ketogenic)",
    nameEn: "Ketogenic Diet",
    overview: "نمط غذائي شديد التقييد للكربوهيدرات مع نسبة عالية جداً من الدهون وبروتين معتدل، يهدف لدفع الجسم نحو حالة استقلابية تُسمّى \"الكيتوزيه\" يعتمد فيها على الكيتونات بدل الجلوكوز كمصدر رئيسي للطاقة - أكثر تقييداً بكثير من النظام منخفض الكربوهيدرات أعلاه.",
    overviewEn: "A very carbohydrate-restrictive eating pattern with a very high fat share and moderate protein, aiming to shift the body into a metabolic state called \"ketosis\" where it relies on ketones instead of glucose as its main energy source - substantially more restrictive than the low-carb pattern above.",
    scientificReference: "طُوِّر هذا النمط أصلاً واستُخدم طبياً منذ عقود لعلاج الصرع المقاوم للأدوية تحت إشراف طبي صارم ومتابعة دقيقة. استخدامه لفقدان الوزن لدى عموم الأصحاء أقل درسة على المدى الطويل، ولم تتبنَّه الجهات الصحية الكبرى كتوصية عامة أولى بخلاف DASH أو المتوسطي.",
    scientificReferenceEn: "This pattern was originally developed and has been used medically for decades to treat drug-resistant epilepsy under strict medical supervision and close monitoring. Its use for weight loss in the general healthy population is less studied long-term, and it has not been adopted by major health bodies as a first-line general recommendation the way DASH or Mediterranean have been.",
    suitableFor: "يُناقَش عادة كخيار بإشراف طبي مباشر لحالات محدَّدة (مثل بروتوكولات علاج الصرع)، أو كخيار قصير المدى يختاره بعض الأشخاص لفقدان الوزن بمتابعة أخصائي - لا يُقدَّم هنا كتوصية عامة افتراضية لعموم المستخدمين.",
    suitableForEn: "Typically discussed as an option under direct medical supervision for specific situations (such as epilepsy treatment protocols), or as a short-term option some choose for weight loss with professional follow-up - it is not presented here as a default general recommendation for the general population.",
    notRecommendedFor: "محاذير جوهرية وخطيرة يجب توضيحها بلا تخفيف: مرضى السكري من النوع الأول معرَّضون لخطر حقيقي وخطير هو الحماض الكيتوني السكري (حالة طبية طارئة تختلف تماماً عن الكيتوزيه الغذائي الطبيعي) - يُمنَع البدء بهذا النظام دون إشراف طبي مباشر ومستمر. مرضى الكلى: العبء الاستقلابي المرتفع من الدهون/البروتين قد يُجهد الكلى - غير مناسب دون إشراف طبي. مرضى الكبد: تغيّرات استقلاب الدهون الكبيرة قد تُجهد كبداً ضعيفاً أصلاً - يحتاج إشرافاً طبياً. الحمل والرضاعة: لا يُنصَح به دون توجيه طبي مباشر لعدم كفاية بيانات السلامة لهذا النمط شديد التقييد في هذه الفترة. من يتناول أدوية للسكري أو الضغط: خطر تفاعلات دوائية خطيرة (هبوط سكر حاد، اضطراب الأملاح) - يجب التنسيق مع الطبيب قبل البدء وأثناءه. هذا النظام لا يجب أن يبدأه من تلقاء نفسه أي شخص لديه أي من هذه الحالات بلا إشراف طبي مباشر.",
    notRecommendedForEn: "Serious, fundamental cautions that must be stated without softening: People with type 1 diabetes face a real, serious risk of diabetic ketoacidosis (a medical emergency entirely different from normal nutritional ketosis) - starting this diet without direct, ongoing medical supervision is not permitted. Kidney disease: the elevated metabolic load from fat/protein may stress the kidneys - not appropriate without medical supervision. Liver disease: major fat-metabolism changes may stress an already-compromised liver - needs medical supervision. Pregnancy and breastfeeding: not recommended without direct medical guidance, given insufficient safety data for this very restrictive pattern during this period. Anyone on diabetes or blood-pressure medication: risk of serious medication interactions (sharp blood-sugar drops, electrolyte disturbance) - must coordinate with a doctor before and during. This diet should not be self-started by anyone with any of these conditions without direct medical supervision.",
    unsuitableConditions: ["diabetes", "kidney", "liver"],
    benefits: ["قد يدعم فقدان وزن ملحوظ على المدى القصير لدى بعض الأفراد", "يُستخدَم طبياً في بروتوكولات محدَّدة لعلاج الصرع تحت إشراف مباشر", "قد يقلّل الشعور بالجوع لدى بعض الأشخاص"],
    benefitsEn: ["May support noticeable short-term weight loss for some individuals", "Used medically in specific epilepsy-treatment protocols under direct supervision", "May reduce hunger sensations for some people"],
    drawbacks: ["خطر نقص بعض العناصر الغذائية (الألياف وبعض الفيتامينات/المعادن) دون تخطيط دقيق", "أعراض تكيّف أولية شائعة تُعرَف بـ\"إنفلونزا الكيتو\" (تعب، صداع، تهيّج)", "صعوبة الالتزام به طويل الأمد لصرامته الشديدة", "أبحاث محدودة عن سلامته طويلة المدى لعموم الأصحاء", "قد يؤثر على مستويات الكوليسترول بشكل يختلف من شخص لآخر", "ليس خياراً يُبدَأ ذاتياً لمن لديه أي من الحالات المذكورة أعلاه"],
    drawbacksEn: ["Risk of certain nutrient shortfalls (fiber, some vitamins/minerals) without careful planning", "Common initial adaptation symptoms known as \"keto flu\" (fatigue, headache, irritability)", "Difficult to sustain long-term due to its strictness", "Limited research on long-term safety for the general healthy population", "May affect cholesterol levels differently from person to person", "Not an option to self-start for anyone with the conditions listed above"],
    allowedFoods: ["لحوم ودواجن وأسماك", "بيض", "ألبان عالية الدسم", "دهون وزيوت صحية", "خضار غير نشوية قليلة الكربوهيدرات", "مكسرات وبذور باعتدال"],
    allowedFoodsEn: ["Meat, poultry, and fish", "Eggs", "High-fat dairy", "Healthy fats and oils", "Low-carb, non-starchy vegetables", "Nuts and seeds in moderation"],
    limitFoods: ["الحبوب والخبز والمعكرونة والأرز", "معظم الفواكه", "الخضار النشوية", "السكريات", "البقوليات (كربوهيدرات أعلى نسبياً)"],
    limitFoodsEn: ["Grains, bread, pasta, and rice", "Most fruits", "Starchy vegetables", "Sugars", "Legumes (relatively higher in carbs)"],
    sampleDay: {
      breakfast: "بيض مع أفوكادو",
      lunch: "سلطة خضار مع سمك أو لحم دهني وزيت زيتون",
      dinner: "دجاج أو سمك مع خضار غير نشوية وزبدة",
      snacks: "قطعة جبن أو حفنة صغيرة من المكسرات",
    },
    sampleDayEn: {
      breakfast: "Eggs with avocado",
      lunch: "Vegetable salad with fatty fish or meat and olive oil",
      dinner: "Chicken or fish with non-starchy vegetables and butter",
      snacks: "A piece of cheese or a small handful of nuts",
    },
  },

  {
    id: "high_protein",
    completed: false,
    draftContent: true,
    name: "عالي البروتين (High-Protein)",
    nameEn: "High-Protein Diet",
    overview: "نمط غذائي يرفع نسبة البروتين عن المعتاد (من لحوم، دواجن، أسماك، ألبان، بقوليات) دعماً لبناء العضلات أو الشبع أو إدارة الوزن، دون اشتراط تقييد كربوهيدرات كما في الأنظمة السابقة - يمكن دمجه مع أي توزيع ماكروز آخر.",
    overviewEn: "An eating pattern that raises protein intake above typical levels (from meat, poultry, fish, dairy, legumes) to support muscle building, satiety, or weight management, without necessarily restricting carbohydrates as in the earlier patterns - it can be combined with any other macro distribution.",
    scientificReference: "توصيات عامة من جهات مثل الجمعية الدولية للتغذية الرياضية (International Society of Sports Nutrition) تُقرّ فائدة رفع البروتين ضمن نطاقات معقولة لدعم الأداء الرياضي وبناء العضلات لدى النشطين بدنياً، دون تحديد رقم واحد إلزامي للجميع.",
    scientificReferenceEn: "General guidance from bodies such as the International Society of Sports Nutrition recognizes the benefit of raising protein intake within reasonable ranges to support athletic performance and muscle building for physically active individuals, without a single mandatory number for everyone.",
    suitableFor: "الأفراد النشطون بدنياً، من يهتم ببناء العضلات أو الحفاظ عليها، ومن يبحث عن خيار يعزز الشبع ضمن إدارة الوزن.",
    suitableForEn: "Physically active individuals, those focused on building or maintaining muscle, and anyone seeking an option that supports satiety within weight management.",
    notRecommendedFor: "مرضى الكلى تحديداً يحتاجون حذراً حقيقياً: البروتين الزائد يزيد العبء على عمل الكلى في تصفية الفضلات، وهذا محاذير طبي معروف - يجب التنسيق مع الطبيب قبل رفع البروتين بشكل ملحوظ لمن لديه أي قصور كلوي قائم. لا حاجة لكميات مفرطة تتجاوز الحاجة الفعلية - لا فائدة إضافية مؤكَّدة من الإفراط الشديد، وقد يزاحم عناصر غذائية أخرى مهمة.",
    notRecommendedForEn: "Kidney disease specifically requires real caution: excess protein increases the burden on the kidneys' waste-filtering work, a well-known medical concern - coordination with a doctor is needed before notably raising protein for anyone with existing kidney impairment. There's no need for amounts far beyond actual need - no confirmed added benefit from extreme excess, and it may crowd out other important nutrients.",
    unsuitableConditions: ["kidney"],
    benefits: ["يدعم الشعور بالشبع لفترة أطول", "يدعم الحفاظ على الكتلة العضلية وبناءها مع التمرين", "قد يدعم إدارة الوزن عبر تأثيره على الشهية"],
    benefitsEn: ["Supports feeling full for longer", "Supports maintaining and building muscle mass alongside exercise", "May support weight management through its effect on appetite"],
    drawbacks: ["قد يكون مكلفاً (مصادر البروتين الجيدة ليست دائماً رخيصة)", "خطر مزاحمة مجموعات غذائية أخرى (الألياف مثلاً) إن لم يُوازَن جيداً", "عبء إضافي حقيقي على الكلى لمن لديه قصور كلوي قائم", "لا دليل قوي على فائدة إضافية من تجاوز النطاقات المعقولة"],
    drawbacksEn: ["Can be costly (good protein sources aren't always cheap)", "Risk of crowding out other food groups (fiber, for example) if not well balanced", "A real added burden on the kidneys for anyone with existing kidney impairment", "No strong evidence of added benefit from exceeding reasonable ranges"],
    allowedFoods: ["لحوم قليلة الدهن ودواجن وأسماك", "بيض وألبان", "بقوليات ومصادر بروتين نباتية", "حبوب كاملة وخضار وفواكه باعتدال جنباً إلى جنب"],
    allowedFoodsEn: ["Lean meat, poultry, and fish", "Eggs and dairy", "Legumes and plant protein sources", "Whole grains, vegetables, and fruit in moderation alongside"],
    limitFoods: ["منتجات البروتين شديدة المعالجة (مساحيق/ألواح كمصدر وحيد بدل الطعام الحقيقي)", "اللحوم المصنَّعة عالية الدهون المشبعة", "الإفراط الشديد الذي يتجاوز الحاجة الفعلية بلا داعٍ"],
    limitFoodsEn: ["Highly processed protein products (powders/bars as a sole source instead of real food)", "Processed meats high in saturated fat", "Extreme excess beyond actual need with no clear reason"],
    sampleDay: {
      breakfast: "بيض مع زبادي يوناني وفاكهة",
      lunch: "صدر دجاج مشوي مع أرز بني وخضار",
      dinner: "سمك أو عدس مع خضار وحبوب كاملة",
      snacks: "زبادي يوناني أو حفنة مكسرات",
    },
    sampleDayEn: {
      breakfast: "Eggs with Greek yogurt and fruit",
      lunch: "Grilled chicken breast with brown rice and vegetables",
      dinner: "Fish or lentils with vegetables and whole grains",
      snacks: "Greek yogurt or a handful of nuts",
    },
  },
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
