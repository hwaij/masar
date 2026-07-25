// بنك النصائح المالية اليومية لقسم "خزنة" — ملف مستقل تماماً عن نصائح
// "بصيرة" العامة (src/lib/tips.js): محتوى مختلف، ومنطق اختيار مستقل
// خاص به، بلا أي استيراد أو تشارك بينهما، حتى لا تتكرر نصيحة بين
// القسمين ولا يتأثر أحدهما بتغييرات الآخر. كل نصيحة عنصر مستقل بمعرّف
// ثابت (id) — عند الإضافة مستقبلاً أضف عناصر جديدة بمعرّفات جديدة فقط.
export const MONEY_TIPS = [
  // ادخار
  { id: "mt01", category: "saving", text: "اجعل الادخار أول ما يخرج من دخلك، لا آخر ما يتبقى منه.", textEn: "Make saving the first thing that leaves your income, not the last thing left over." },
  { id: "mt02", category: "saving", text: "مبلغ صغير يُدَّخر كل شهر بانتظام يفوق مع الوقت مبلغاً كبيراً يُدَّخر مرة واحدة ثم يتوقف.", textEn: "A small amount saved regularly every month outgrows, over time, a large amount saved once and then stopped." },
  { id: "mt03", category: "saving", text: "احتياطي يغطي نفقات بضعة أشهر يمنحك قراراً حراً وقت الأزمات، لا قراراً مضطراً.", textEn: "A reserve covering a few months' expenses gives you a free choice in a crisis, not a forced one." },
  { id: "mt04", category: "saving", text: "لا تنتظر أن يفيض دخلك لتبدأ الادخار؛ ابدأ بأي مبلغ ممكن اليوم.", textEn: "Don't wait for your income to overflow before saving; start with whatever amount is possible today." },
  { id: "mt05", category: "saving", text: "افصل حساب ادخارك عن حساب إنفاقك اليومي؛ فالمال البعيد عن يدك أصعب أن يُصرف بلا تفكير.", textEn: "Keep your savings account separate from your daily spending account; money that's out of easy reach is harder to spend thoughtlessly." },
  { id: "mt06", category: "saving", text: "كل زيادة في الدخل فرصة لزيادة الادخار قبل أن تتضخّم معها نفقاتك.", textEn: "Every raise in income is a chance to increase your savings before your expenses inflate along with it." },
  { id: "mt07", category: "saving", text: "الادخار المنتظم عادة تُبنى بالتكرار، لا قراراً يُتَّخذ مرة واحدة ويُنسى.", textEn: "Regular saving is a habit built through repetition, not a decision made once and forgotten." },

  // إنفاق واعٍ
  { id: "mt08", category: "spending", text: "قبل أي شراء، امنح نفسه يوماً واحداً على الأقل؛ فالرغبة العابرة تخفت والحاجة الحقيقية تبقى.", textEn: "Before any purchase, give yourself at least one day; a passing craving fades while a real need remains." },
  { id: "mt09", category: "spending", text: "اسأل نفسك دوماً: هل أشتري هذا لأنني أحتاجه، أم لأن غيري يملكه؟", textEn: "Always ask yourself: am I buying this because I need it, or because someone else has it?" },
  { id: "mt10", category: "spending", text: "النفقات الصغيرة المتكررة تتجمّع بصمت حتى تصبح أثقل من نفقة كبيرة واحدة.", textEn: "Small, recurring expenses quietly add up until they become heavier than one large expense." },
  { id: "mt11", category: "spending", text: "لا تجعل لحظة الحماس هي من تقرر مصير مالك؛ دع القرار الهادئ يتولى ذلك.", textEn: "Don't let a moment of excitement decide your money's fate; let a calm decision handle that instead." },
  { id: "mt12", category: "spending", text: "قارن السعر بساعات العمل التي تكلّفكها، لا بالرقم وحده على البطاقة.", textEn: "Compare the price to the hours of work it costs you, not just the number on the tag." },
  { id: "mt13", category: "spending", text: "الشراء لتعويض مزاج سيّئ يترك بعده فراغاً مالياً فوق الفراغ النفسي الذي بدأ منه.", textEn: "Buying to compensate for a bad mood leaves a financial void on top of the emotional void it started from." },
  { id: "mt14", category: "spending", text: "تتبّع كل ما تنفقه ولو لأسبوع واحد يكشف عادات إنفاق لم تكن منتبهاً لها.", textEn: "Tracking everything you spend for even one week reveals spending habits you weren't aware of." },
  { id: "mt15", category: "spending", text: "الجودة التي تدوم توفّر عليك تكرار الشراء أكثر مما يوفّره السعر الأرخص المؤقت.", textEn: "Quality that lasts saves you from repeat purchases more than a temporarily cheaper price ever does." },

  // ميزانية
  { id: "mt16", category: "budgeting", text: "من لا يخطط لنفقاته مسبقاً، يجد نفسه يبرر كل نفقة بعد وقوعها.", textEn: "Whoever doesn't plan their spending in advance finds themselves justifying every expense after it's already happened." },
  { id: "mt17", category: "budgeting", text: "اجعل لكل ريال يدخل جيبك وجهة واضحة قبل أن ينفقه غيرك عنك.", textEn: "Give every riyal that enters your pocket a clear destination before someone else spends it for you." },
  { id: "mt18", category: "budgeting", text: "الميزانية ليست قيداً يخنقك، بل خريطة تريك أين تذهب أموالك بالضبط.", textEn: "A budget isn't a chain that strangles you — it's a map that shows you exactly where your money goes." },
  { id: "mt19", category: "budgeting", text: "راجع ميزانيتك كل شهر؛ فحاجاتك تتغيّر، وخطتك المالية يجب أن تتغيّر معها.", textEn: "Review your budget every month; your needs change, and your financial plan should change with them." },
  { id: "mt20", category: "budgeting", text: "افصل بين نفقات ثابتة لا مفر منها ونفقات اختيارية يمكن تأجيلها عند الضيق.", textEn: "Separate fixed expenses you can't avoid from optional expenses that can be postponed when money is tight." },
  { id: "mt21", category: "budgeting", text: "ضع سقفاً لكل بند من نفقاتك الشهرية، ولو كان تقديرياً في البداية.", textEn: "Set a cap for every category of your monthly expenses, even if it's just an estimate at first." },
  { id: "mt22", category: "budgeting", text: "الفائض غير المخطط له يُصرف عادة بلا تفكير؛ خطّط له كما تخطّط لبقية دخلك.", textEn: "Unplanned surplus is usually spent without thought; plan for it just as you plan the rest of your income." },

  // تجنّب الديون
  { id: "mt23", category: "debt", text: "الدَّين المريح اليوم قد يتحوّل إلى قيد ثقيل غداً حين يحين موعد سداده.", textEn: "Comfortable debt today can turn into a heavy chain tomorrow when it comes time to repay it." },
  { id: "mt24", category: "debt", text: "لا تستدن من أجل مظهر لا تحتاجه؛ ثمنه الحقيقي أغلى بكثير مما يبدو للوهلة الأولى.", textEn: "Don't borrow for an image you don't need; its real cost is far higher than it first appears." },
  { id: "mt25", category: "debt", text: "قبل أن تقترض، اسأل: هل هذا الدَّين يبني شيئاً يدوم، أم يموّل رغبة تزول أثرها بسرعة؟", textEn: "Before you borrow, ask: does this debt build something lasting, or fund a desire whose effect quickly fades?" },
  { id: "mt26", category: "debt", text: "سدد أعلى ديونك فائدة أولاً؛ فهي التي تنمو الأسرع إن تُركت.", textEn: "Pay off your highest-interest debt first; it's the one that grows fastest if left alone." },
  { id: "mt27", category: "debt", text: "الاقتراض المتكرر لتغطية نفقات يومية عادية إشارة إلى ضرورة مراجعة الميزانية، لا الاستدانة أكثر.", textEn: "Repeatedly borrowing to cover ordinary daily expenses is a sign you need to review your budget, not borrow more." },
  { id: "mt28", category: "debt", text: "حرّرك من دَين واحد أهم غالباً من كل استثمار جديد قبل أن تتخلص منه.", textEn: "Freeing yourself from a single debt is often more important than any new investment before you're rid of it." },

  // استثمار بسيط
  { id: "mt29", category: "investing", text: "لا تضع كل مالك في مكان واحد؛ التنويع يحميك حين يخيب مصدر ولا يخيب غيره.", textEn: "Don't put all your money in one place; diversification protects you when one source fails and another doesn't." },
  { id: "mt30", category: "investing", text: "الاستثمار المنتظم الصغير مع الوقت يتفوّق غالباً على محاولة توقيت السوق بمبلغ كبير مرة واحدة.", textEn: "Small, regular investing over time often outperforms trying to time the market with one large lump sum." },
  { id: "mt31", category: "investing", text: "لا تضع في أي استثمار مالاً قد تحتاجه قريباً؛ فالحاجة العاجلة تجبرك على بيع بخسارة.", textEn: "Don't put money you might need soon into any investment; urgent need forces you to sell at a loss." },
  { id: "mt32", category: "investing", text: "افهم أي أداة مالية جيداً قبل أن تضع فيها مالك؛ الجهل بها أخطر من أي تقلّب في السوق.", textEn: "Understand any financial instrument well before putting your money into it; ignorance of it is riskier than any market swing." },
  { id: "mt33", category: "investing", text: "الاستثمار في تطوير مهاراتك يمنحك عائداً لا يتأثر بانهيار أي سوق.", textEn: "Investing in developing your skills gives you a return unaffected by any market crash." },
  { id: "mt34", category: "investing", text: "الصبر على استثمار طويل الأمد أنفع غالباً من قفزك بين فرص سريعة تعدك بربح فوري.", textEn: "Patience with a long-term investment is often more rewarding than jumping between quick opportunities promising instant profit." },
  { id: "mt35", category: "investing", text: "لا تتبع قراراً مالياً لمجرد أن كثيرين يتحدثون عنه؛ اسأل هل يناسب وضعك أنت بالذات.", textEn: "Don't follow a financial decision just because many people are talking about it; ask whether it actually suits your own situation." },

  // قناعة
  { id: "mt36", category: "contentment", text: "القناعة أعظم رأس مال؛ فهي تحميك من إنفاق ما لا تملك لتُثبت ما لا تحتاجه.", textEn: "Contentment is the greatest capital; it protects you from spending what you don't have to prove what you don't need." },
  { id: "mt37", category: "contentment", text: "لا تقس ثراءك بما تملك، بل بالمسافة بين دخلك وحاجاتك الفعلية.", textEn: "Don't measure your wealth by what you own, but by the gap between your income and your actual needs." },
  { id: "mt38", category: "contentment", text: "لا تُقارن أسلوب حياتك المالي بأسلوب غيرك؛ ظروف كل شخص ومسؤولياته مختلفة.", textEn: "Don't compare your financial lifestyle to someone else's; everyone's circumstances and responsibilities differ." },
  { id: "mt39", category: "contentment", text: "المال أداة لخدمة حياتك، لا هدفاً تُفنى من أجله حياتك.", textEn: "Money is a tool to serve your life, not a goal your life should be spent chasing." },
  { id: "mt40", category: "contentment", text: "الرضا بما تملك اليوم لا يمنعك من السعي لمزيد غداً، لكنه يمنع القلق من أن يسرق سلامك.", textEn: "Being content with what you have today doesn't stop you from striving for more tomorrow, but it stops worry from stealing your peace." },
  { id: "mt41", category: "contentment", text: "أمانك المالي الحقيقي يبدأ من داخلك قبل أن يبدأ من رصيد حسابك.", textEn: "Your real financial security starts from within you before it starts from your account balance." },

  // عادات مالية عامة
  { id: "mt42", category: "habits", text: "راجع حسابك المصرفي بانتظام؛ فالمتابعة الدورية تكشف أخطاءً ونفقات نسيتها.", textEn: "Review your bank account regularly; periodic monitoring uncovers errors and expenses you'd forgotten." },
  { id: "mt43", category: "habits", text: "علِّم أطفالك قيمة المال مبكراً؛ العادة المالية تُبنى في الصغر أسهل من تصحيحها في الكبر.", textEn: "Teach your children the value of money early; a financial habit is easier to build in childhood than to fix in adulthood." },
  { id: "mt44", category: "habits", text: "اجعل لنفسك موعداً أسبوعياً ثابتاً لمراجعة أموالك، ولو لعشر دقائق فقط.", textEn: "Set yourself a fixed weekly appointment to review your finances, even if just for ten minutes." },
  { id: "mt45", category: "habits", text: "احتفظ بنسخة من كل التزام مالي مهم؛ فالتوثيق يحميك من نزاعات لاحقة.", textEn: "Keep a copy of every important financial commitment; documentation protects you from later disputes." },
  { id: "mt46", category: "habits", text: "لا تخجل من طلب المشورة المالية حين يتعلق الأمر بقرار كبير يفوق خبرتك.", textEn: "Don't be embarrassed to seek financial advice when it comes to a major decision beyond your expertise." },
  { id: "mt47", category: "habits", text: "خصّص جزءاً بسيطاً من دخلك للعطاء؛ فهو لا ينقص المال بقدر ما يبارك فيما بقي منه.", textEn: "Set aside a small part of your income for giving; it doesn't decrease your wealth so much as it blesses what remains." },
];

export const MONEY_TIP_CATEGORY_LABELS = {
  saving: "ادخار",
  spending: "إنفاق واعٍ",
  budgeting: "ميزانية",
  debt: "تجنّب الديون",
  investing: "استثمار",
  contentment: "قناعة",
  habits: "عادات مالية",
};

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const FALLBACK_MONEY_TIP = { id: "fallback", category: "saving", text: MONEY_TIPS[0]?.text || "ادّخر جزءاً من أي دخل يصلك قبل أن تفكّر في إنفاقه.", textEn: MONEY_TIPS[0]?.textEn || "Save a portion of any income you receive before you even think about spending it." };

// نفس منطق pickDailyTip في src/lib/tips.js من حيث الفكرة (اختيار حتمي من
// التاريخ فقط)، لكن بتطبيق مستقل تماماً هنا حتى لا يعتمد هذا الملف على
// ملف "بصيرة" إطلاقاً. dateKey يجب أن يكون التاريخ المحلي (localDayKey)
// القادم من المستدعي، لا تاريخاً بتوقيت UTC.
export function pickDailyMoneyTip(dateKey, ownerId = "solo") {
  try {
    if (!Array.isArray(MONEY_TIPS) || MONEY_TIPS.length === 0) return FALLBACK_MONEY_TIP;
    const parsed = Date.parse(`${dateKey}T00:00:00Z`);
    const dayIndex = Number.isFinite(parsed) ? Math.floor(parsed / 86400000) : 0;
    const offset = hashString(String(ownerId || "solo")) % MONEY_TIPS.length;
    const idx = (((dayIndex + offset) % MONEY_TIPS.length) + MONEY_TIPS.length) % MONEY_TIPS.length;
    const tip = MONEY_TIPS[idx];
    return (tip && tip.text) ? tip : FALLBACK_MONEY_TIP;
  } catch (e) {
    console.error("[pickDailyMoneyTip] fell back after error:", e);
    return FALLBACK_MONEY_TIP;
  }
}
