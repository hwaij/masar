// بنك النصائح اليومية لقسم "بصيرة".
// كل نصيحة عنصر مستقل بمعرّف ثابت (id) — سجل النصائح المحفوظ للمستخدم
// يشير إلى هذا الـ id لا إلى موضع العنصر في المصفوفة، حتى لا تتأثر
// السجلات القديمة إذا أُعيد ترتيب القسم لاحقاً. عند الإضافة مستقبلاً:
// أضف عناصر جديدة بمعرّفات جديدة فقط، ولا تُعد استخدام معرّف محذوف.
export const TIPS = [
  // تطوير ذاتي
  { id: "sd01", category: "selfdev", text: "القرار الذي تتردد فيه طويلاً غالباً ما يكون قرارك الصحيح، وتردّدك مجرد خوف من المسؤولية.", textEn: "The decision you hesitate over the longest is often the right one — your hesitation is just fear of responsibility." },
  { id: "sd02", category: "selfdev", text: "لا تنتظر أن تشعر بالحافز لتبدأ؛ ابدأ فيأتيك الحافز أثناء الطريق.", textEn: "Don't wait to feel motivated to start; start, and motivation will follow along the way." },
  { id: "sd03", category: "selfdev", text: "أعظم استثمار تقوم به هو في نفسك؛ فكل ما تتعلمه يبقى معك أينما ذهبت.", textEn: "The greatest investment you can make is in yourself; everything you learn stays with you wherever you go." },
  { id: "sd04", category: "selfdev", text: "مقارنة نفسك بنفسك بالأمس أجدى من مقارنتها بأي شخص آخر اليوم.", textEn: "Comparing yourself to who you were yesterday is more useful than comparing yourself to anyone else today." },
  { id: "sd05", category: "selfdev", text: "الشجاعة ليست غياب الخوف، بل المضي قدماً رغم وجوده.", textEn: "Courage isn't the absence of fear, but moving forward despite it." },
  { id: "sd06", category: "selfdev", text: "من يتقن الاستماع أكثر مما يتكلم، يتعلم أضعاف ما يتعلمه غيره.", textEn: "Whoever masters listening more than speaking learns many times more than others do." },
  { id: "sd07", category: "selfdev", text: "عاداتك الصغيرة اليوم هي شخصيتك بعد خمس سنوات.", textEn: "Your small habits today are your character five years from now." },
  { id: "sd08", category: "selfdev", text: "الفشل ليس نقيض النجاح، بل جزء من طريقه.", textEn: "Failure isn't the opposite of success — it's part of the path to it." },
  { id: "sd09", category: "selfdev", text: "لا يوجد وقت مثالي للبدء؛ الوقت المناسب هو الآن، بما تملكه الآن.", textEn: "There's no perfect time to start; the right time is now, with whatever you have." },
  { id: "sd10", category: "selfdev", text: "من يعرف لماذا يفعل الشيء، يتحمّل كل صعوبة يواجهها في طريقه.", textEn: "Whoever knows why they're doing something can endure any hardship along the way." },
  { id: "sd11", category: "selfdev", text: "الراحة الحقيقية تأتي من إنجاز ما يثقل ضميرك، لا من الهروب منه.", textEn: "True rest comes from doing what weighs on your conscience, not from running away from it." },
  { id: "sd12", category: "selfdev", text: "غيّر بيئتك قبل أن تحاول تغيير إرادتك؛ البيئة أقوى من العزيمة وحدها.", textEn: "Change your environment before trying to change your willpower; environment is stronger than willpower alone." },
  { id: "sd13", category: "selfdev", text: "من السهل أن تعرف الصواب، والصعب أن تفعله حين يكلّفك شيئاً.", textEn: "It's easy to know what's right; the hard part is doing it when it costs you something." },
  { id: "sd14", category: "selfdev", text: "لا تحتقر نمواً بطيئاً؛ فالجذور تكبر في الخفاء قبل أن تُرى الثمار.", textEn: "Don't dismiss slow growth; roots grow unseen long before the fruit appears." },
  { id: "sd15", category: "selfdev", text: "كل مهارة تتقنها اليوم هي باب لم يكن موجوداً بالأمس.", textEn: "Every skill you master today is a door that didn't exist yesterday." },
  { id: "sd16", category: "selfdev", text: "اسأل نفسك: هل هذا القلق يستحق طاقتي، أم أنه مجرد ضجيج عابر؟", textEn: "Ask yourself: does this worry deserve my energy, or is it just passing noise?" },
  { id: "sd17", category: "selfdev", text: "الشخص الذي يعترف بخطئه أقوى من الذي يتمسّك بكبريائه.", textEn: "A person who admits their mistake is stronger than one who clings to their pride." },
  { id: "sd18", category: "selfdev", text: "لا تُرهق نفسك بالكمال؛ التقدّم الحقيقي يُقاس بالاتساق لا بالمثالية.", textEn: "Don't exhaust yourself chasing perfection; real progress is measured by consistency, not perfection." },
  { id: "sd19", category: "selfdev", text: "من يهرب من الانزعاج الصغير اليوم، يواجه مشكلة أكبر غداً.", textEn: "Whoever runs from a small discomfort today faces a bigger problem tomorrow." },
  { id: "sd20", category: "selfdev", text: "حين تشعر أنك عالق، غيّر السؤال الذي تطرحه على نفسك.", textEn: "When you feel stuck, change the question you're asking yourself." },
  { id: "sd21", category: "selfdev", text: "القراءة المتنوعة توسّع الخيارات المتاحة أمامك دون أن تشعر.", textEn: "Reading widely expands the options available to you without you even noticing." },
  { id: "sd22", category: "selfdev", text: "لا تقارن بداياتك بنهايات الآخرين.", textEn: "Don't compare your beginnings to other people's endings." },
  { id: "sd23", category: "selfdev", text: "النضج هو أن تتحمّل نتائج قراراتك دون إلقاء اللوم على أحد.", textEn: "Maturity is bearing the consequences of your decisions without blaming anyone else." },
  { id: "sd24", category: "selfdev", text: "أفضل نسخة منك لا تُبنى في يوم، بل تُراكم يوماً بعد يوم.", textEn: "The best version of you isn't built in a day — it accumulates day after day." },
  { id: "sd25", category: "selfdev", text: "من يخطط لكل التفاصيل قبل أن يبدأ، غالباً لن يبدأ أبداً.", textEn: "Whoever plans every detail before starting often never starts at all." },
  { id: "sd26", category: "selfdev", text: "الهدوء الداخلي مهارة تُكتسب بالتمرين، لا موهبة يُولد بها البعض فقط.", textEn: "Inner calm is a skill gained through practice, not a talent only some are born with." },

  // صحة
  { id: "he01", category: "health", text: "النوم الجيد ليس رفاهية، بل صيانة ضرورية لجسدك وعقلك معاً.", textEn: "Good sleep isn't a luxury — it's essential maintenance for both your body and mind." },
  { id: "he02", category: "health", text: "عشر دقائق مشي بعد الطعام أفضل من ساعة ندم على الكسل.", textEn: "Ten minutes of walking after a meal beats an hour of regret over laziness." },
  { id: "he03", category: "health", text: "الماء أول علاج للتعب الذي تظنّه نقص طاقة.", textEn: "Water is the first remedy for the fatigue you mistake for low energy." },
  { id: "he04", category: "health", text: "جسدك يتحدث إليك قبل أن يصرخ بالمرض؛ استمع للإشارات الصغيرة.", textEn: "Your body speaks to you before it screams with illness; listen to the small signals." },
  { id: "he05", category: "health", text: "الحركة المنتظمة ولو خفيفة، أنفع من تمرين قاسٍ لا يتكرر.", textEn: "Regular movement, even if light, is more beneficial than a harsh workout that isn't repeated." },
  { id: "he06", category: "health", text: "التنفس العميق البطيء يهدّئ جهازك العصبي أسرع مما تتخيل.", textEn: "Slow, deep breathing calms your nervous system faster than you'd imagine." },
  { id: "he07", category: "health", text: "الطعام الملوّن الطبيعي أقرب لصحتك من أي حمية معقّدة.", textEn: "Naturally colorful food serves your health better than any complicated diet." },
  { id: "he08", category: "health", text: "الراحة بعد الجهد ليست كسلاً، بل جزء من التعافي والبناء.", textEn: "Rest after effort isn't laziness — it's part of recovery and building up." },
  { id: "he09", category: "health", text: "قلة الحركة تؤذي الجسد بقدر ما يؤذيه سوء الغذاء.", textEn: "Lack of movement harms the body as much as poor nutrition does." },
  { id: "he10", category: "health", text: "الضحك الحقيقي يخفّف من هرمونات التوتر أكثر مما نظن.", textEn: "Genuine laughter lowers stress hormones more than we realize." },
  { id: "he11", category: "health", text: "لا تقس صحتك بالميزان وحده؛ طاقتك ومزاجك مقاييس لا تقل أهمية.", textEn: "Don't measure your health by the scale alone; your energy and mood matter just as much." },
  { id: "he12", category: "health", text: "خذ فترات راحة قصيرة من الشاشة؛ عيناك وعقلك يستحقان ذلك.", textEn: "Take short breaks from your screen; your eyes and mind deserve it." },
  { id: "he13", category: "health", text: "الألم الذي تتجاهله اليوم يتراكم ليصبح مشكلة أكبر غداً.", textEn: "The pain you ignore today accumulates into a bigger problem tomorrow." },
  { id: "he14", category: "health", text: "نوم منتظم في مواعيد ثابتة أهم من عدد الساعات وحده.", textEn: "A regular sleep schedule at fixed times matters more than the number of hours alone." },
  { id: "he15", category: "health", text: "اجعل وجبتك الأولى في اليوم متوازنة؛ فهي تحدّد نشاطك لساعات قادمة.", textEn: "Make your first meal of the day balanced; it sets your energy for the hours ahead." },
  { id: "he16", category: "health", text: "الإجهاد الذهني يُتعب الجسد كما يفعل الإجهاد البدني تماماً.", textEn: "Mental strain tires the body just as much as physical strain does." },
  { id: "he17", category: "health", text: "تمشية قصيرة في الهواء الطلق تُصلح مزاجاً أفسده يوم طويل.", textEn: "A short walk outdoors can fix a mood a long day has ruined." },
  { id: "he18", category: "health", text: "جسدك يكافئك على كل عادة صحية صغيرة، حتى لو تأخرت النتيجة.", textEn: "Your body rewards every small healthy habit, even if the results take time." },
  { id: "he19", category: "health", text: "الإفراط في القلق على الصحة يُتعب أكثر مما يحمي.", textEn: "Excessive worry about your health exhausts more than it protects." },
  { id: "he20", category: "health", text: "تمدّد بسيط كل صباح يقلّل من توتر عضلي يتراكم طوال اليوم.", textEn: "A simple stretch every morning reduces the muscle tension that builds up through the day." },
  { id: "he21", category: "health", text: "استمع لجسدك حين يطلب الراحة قبل أن يفرضها عليك بالمرض.", textEn: "Listen to your body when it asks for rest, before illness forces it on you." },
  { id: "he22", category: "health", text: "الحد التدريجي من السكر أسهل وأدوم من الحرمان المفاجئ.", textEn: "Gradually cutting back on sugar is easier and lasts longer than sudden deprivation." },
  { id: "he23", category: "health", text: "صحتك النفسية جزء من صحتك الجسدية، لا شيء منفصل عنها.", textEn: "Your mental health is part of your physical health, not something separate from it." },
  { id: "he24", category: "health", text: "قسط بسيط من الشمس صباحاً يُصلح ساعتك البيولوجية أفضل من أي منبّه.", textEn: "A little morning sunlight resets your biological clock better than any alarm." },

  // علاقات
  { id: "re01", category: "relationships", text: "الاستماع بلا مقاطعة هدية أعمق من أي نصيحة تقدّمها.", textEn: "Listening without interrupting is a deeper gift than any advice you could give." },
  { id: "re02", category: "relationships", text: "العلاقة القوية لا تخلو من الخلاف، بل تُحسن التعامل معه.", textEn: "A strong relationship isn't free of conflict — it just handles it well." },
  { id: "re03", category: "relationships", text: "كلمة شكر صادقة تبني جسراً لا تبنيه هدية باهظة.", textEn: "A sincere word of thanks builds a bridge that an expensive gift can't." },
  { id: "re04", category: "relationships", text: "من يعتذر أولاً ليس الأضعف، بل الأنضج.", textEn: "Whoever apologizes first isn't the weaker one — they're the more mature one." },
  { id: "re05", category: "relationships", text: "حدودك الشخصية الواضحة تحمي علاقتك، لا تُهدّدها.", textEn: "Clear personal boundaries protect your relationship — they don't threaten it." },
  { id: "re06", category: "relationships", text: "الوجود الحقيقي مع من تحب أهم من كثرة الكلام معه.", textEn: "Being truly present with someone you love matters more than talking a lot with them." },
  { id: "re07", category: "relationships", text: "لا تفترض نوايا الآخرين؛ اسأل بدل أن تخمّن.", textEn: "Don't assume other people's intentions; ask instead of guessing." },
  { id: "re08", category: "relationships", text: "الثقة تُبنى ببطء وتُهدم بلحظة، فاحرص عليها في كل تفصيل صغير.", textEn: "Trust is built slowly and destroyed in an instant, so guard it in every small detail." },
  { id: "re09", category: "relationships", text: "الاستماع لفهم أعمق أثراً من الاستماع للرد فقط.", textEn: "Listening to understand has a deeper impact than listening just to respond." },
  { id: "re10", category: "relationships", text: "من يحترم رأيك المختلف، يستحق ثقتك أكثر ممن يوافقك دائماً.", textEn: "Someone who respects your differing opinion deserves your trust more than someone who always agrees with you." },
  { id: "re11", category: "relationships", text: "العلاقات تحتاج صيانة مستمرة، لا تنتظر أن تتصدّع لتهتم بها.", textEn: "Relationships need constant upkeep — don't wait for cracks to appear before caring for them." },
  { id: "re12", category: "relationships", text: "الصدق المؤلم أحياناً أفضل من مجاملة تتراكم حتى تنفجر.", textEn: "Painful honesty is sometimes better than politeness that piles up until it explodes." },
  { id: "re13", category: "relationships", text: "لا تحمّل علاقة واحدة كل احتياجاتك العاطفية.", textEn: "Don't burden a single relationship with all your emotional needs." },
  { id: "re14", category: "relationships", text: "من يحتفي بنجاحك دون غيرة، صديق يستحق أن تحتفظ به.", textEn: "Someone who celebrates your success without envy is a friend worth keeping." },
  { id: "re15", category: "relationships", text: "التسامح لا يعني نسيان الخطأ، بل تحرير نفسك من ثقله.", textEn: "Forgiveness doesn't mean forgetting the wrong — it means freeing yourself from its weight." },
  { id: "re16", category: "relationships", text: "الاهتمام الصغير المتكرر أعمق أثراً من مفاجأة كبيرة نادرة.", textEn: "Small, repeated care has a deeper impact than a rare, grand surprise." },
  { id: "re17", category: "relationships", text: "حين تختلف مع أحدهم، هاجم المشكلة لا الشخص.", textEn: "When you disagree with someone, attack the problem, not the person." },
  { id: "re18", category: "relationships", text: "الاحترام المتبادل أساس يسبق أي انسجام آخر في العلاقة.", textEn: "Mutual respect is the foundation that precedes any other harmony in a relationship." },
  { id: "re19", category: "relationships", text: "لا تقس محبة أحدهم بطريقته في التعبير؛ الناس يعبّرون بطرق مختلفة.", textEn: "Don't measure someone's love by how they express it; people express themselves differently." },
  { id: "re20", category: "relationships", text: "مشاركة الصعوبات لا تُثقل من تحبهم، بل تُقرّبهم منك أكثر.", textEn: "Sharing your struggles doesn't burden the people you love — it draws them closer to you." },
  { id: "re21", category: "relationships", text: "من يستمع لانتقادك بهدوء ويحاول أن يتحسّن، يستحق تقديراً لا تجاهلاً.", textEn: "Someone who listens calmly to your criticism and tries to improve deserves appreciation, not neglect." },
  { id: "re22", category: "relationships", text: "العلاقات الصحية تتّسع لمساحة كل طرف الخاصة به.", textEn: "Healthy relationships leave room for each person's own space." },
  { id: "re23", category: "relationships", text: "لا تدع خلافاً صغيراً يتحوّل إلى صمت طويل.", textEn: "Don't let a small disagreement turn into a long silence." },
  { id: "re24", category: "relationships", text: "أصدق مقياس للعلاقة هو كيف تشعر حين تكون على طبيعتك فيها.", textEn: "The truest measure of a relationship is how you feel when you're simply yourself in it." },

  // إدارة وقيادة
  { id: "mg01", category: "management", text: "القائد الجيد يوضّح الهدف، ويترك مساحة لفريقه ليختار الطريق.", textEn: "A good leader clarifies the goal and leaves room for the team to choose the path." },
  { id: "mg02", category: "management", text: "الثقة المُعطاة لفريقك تصنع مسؤولية أكبر من الرقابة المستمرة.", textEn: "Trust given to your team creates more responsibility than constant oversight." },
  { id: "mg03", category: "management", text: "لا تُدر الناس كأنهم مهام؛ لكل شخص دوافعه الخاصة.", textEn: "Don't manage people as if they were tasks; everyone has their own motivations." },
  { id: "mg04", category: "management", text: "القرار الجماعي البطيء أحياناً أفضل من قرار فردي سريع وخاطئ.", textEn: "A slow collective decision is sometimes better than a fast, wrong individual one." },
  { id: "mg05", category: "management", text: "الاعتراف بخطأ القيادة أمام الفريق يبني احتراماً لا يهدمه.", textEn: "Admitting a leadership mistake in front of the team builds respect rather than destroying it." },
  { id: "mg06", category: "management", text: "من يمنح فريقه فضل الإنجاز، يكسب ولاءهم في المرات القادمة.", textEn: "Whoever gives their team credit for achievements earns their loyalty next time." },
  { id: "mg07", category: "management", text: "التفويض الحقيقي يعني قبول أن تُنجَز المهمة بطريقة مختلفة عن طريقتك.", textEn: "Real delegation means accepting that the task may get done differently than you would do it." },
  { id: "mg08", category: "management", text: "القائد الذي يستمع لانتقاد فريقه، يتقدّم أسرع ممن يتجاهله.", textEn: "A leader who listens to their team's criticism progresses faster than one who ignores it." },
  { id: "mg09", category: "management", text: "وضوح التوقعات منذ البداية يوفّر مشاكل كثيرة لاحقاً.", textEn: "Clear expectations from the start prevent many problems later on." },
  { id: "mg10", category: "management", text: "لا تكافئ الانشغال الظاهري؛ كافئ النتيجة الحقيقية.", textEn: "Don't reward the appearance of being busy — reward real results." },
  { id: "mg11", category: "management", text: "أفضل فريق ليس الأكثر مهارة، بل الأكثر ثقة ببعضه.", textEn: "The best team isn't the most skilled — it's the one that trusts each other most." },
  { id: "mg12", category: "management", text: "من يخشى أن يوظّف من هو أفضل منه، يحدّ من نمو فريقه كله.", textEn: "Whoever is afraid to hire someone better than them limits the growth of their whole team." },
  { id: "mg13", category: "management", text: "القرارات الصعبة تُتخذ مبكراً أرخص من تأجيلها.", textEn: "Hard decisions made early are cheaper than delaying them." },
  { id: "mg14", category: "management", text: "التغذية الراجعة المباشرة والمحترمة أنفع من الصمت المجامل.", textEn: "Direct, respectful feedback is more useful than polite silence." },
  { id: "mg15", category: "management", text: "القيادة الهادئة وقت الأزمة تُطمئن الفريق أكثر من أي خطاب.", textEn: "Calm leadership in a crisis reassures the team more than any speech." },
  { id: "mg16", category: "management", text: "من يشرح لماذا وراء القرار، يحصل على التزام أعمق من مجرد الطاعة.", textEn: "Whoever explains the why behind a decision gets deeper commitment than mere obedience." },
  { id: "mg17", category: "management", text: "الاجتماع بلا هدف واضح يسرق وقت الجميع دون فائدة.", textEn: "A meeting without a clear purpose steals everyone's time for nothing." },
  { id: "mg18", category: "management", text: "القائد الجيد يحمي فريقه من الضغط الخارجي غير الضروري.", textEn: "A good leader shields their team from unnecessary external pressure." },
  { id: "mg19", category: "management", text: "لا تدير بالخوف؛ فالخوف يُنتج طاعة مؤقتة لا ولاءً حقيقياً.", textEn: "Don't manage through fear; fear produces temporary obedience, not real loyalty." },
  { id: "mg20", category: "management", text: "مكافأة المبادرة تصنع فريقاً يبتكر، لا فريقاً ينتظر التعليمات فقط.", textEn: "Rewarding initiative creates a team that innovates, not one that just waits for instructions." },
  { id: "mg21", category: "management", text: "أفضل قرار إداري أحياناً هو الاعتراف بأنك لا تملك كل الإجابات.", textEn: "Sometimes the best management decision is admitting you don't have all the answers." },
  { id: "mg22", category: "management", text: "من يستثمر في تطوير فريقه، يحصد نتائج تفوق أي حافز مالي وحده.", textEn: "Whoever invests in developing their team reaps results beyond any financial incentive alone." },

  // مال
  { id: "mo01", category: "money", text: "لا تقس ثراءك بما تملك، بل بالمسافة بين دخلك وحاجاتك الفعلية.", textEn: "Don't measure your wealth by what you own, but by the gap between your income and your actual needs." },
  { id: "mo02", category: "money", text: "ادّخر جزءاً من أي دخل يصلك قبل أن تفكّر في إنفاقه.", textEn: "Save a portion of any income you receive before you even think about spending it." },
  { id: "mo03", category: "money", text: "الدَّين المريح اليوم قد يكون قيداً ثقيلاً غداً.", textEn: "Comfortable debt today can become a heavy chain tomorrow." },
  { id: "mo04", category: "money", text: "الإنفاق العاطفي أكبر عدو للميزانية المنضبطة.", textEn: "Emotional spending is the biggest enemy of a disciplined budget." },
  { id: "mo05", category: "money", text: "اعرف الفرق بين ما تحتاجه وما تريده قبل أي عملية شراء.", textEn: "Know the difference between what you need and what you want before every purchase." },
  { id: "mo06", category: "money", text: "المال أداة لخدمة حياتك، لا هدفاً تُفنى من أجله حياتك.", textEn: "Money is a tool to serve your life, not a goal your life should be spent chasing." },
  { id: "mo07", category: "money", text: "صغر المبلغ المدّخر لا يهم بقدر ما يهم استمرار العادة.", textEn: "The size of the amount you save matters less than keeping the habit going." },
  { id: "mo08", category: "money", text: "قبل أي قرار مالي كبير، امنح نفسك وقتاً كافياً للتفكير بعيداً عن الحماس.", textEn: "Before any major financial decision, give yourself enough time to think, away from the excitement." },
  { id: "mo09", category: "money", text: "من يخطط لنفقاته مسبقاً، يتحكّم في ماله بدل أن يتحكّم فيه.", textEn: "Whoever plans their spending in advance controls their money instead of being controlled by it." },
  { id: "mo10", category: "money", text: "تنويع مصادر دخلك يمنحك أماناً لا يمنحه مصدر واحد مهما كان قوياً.", textEn: "Diversifying your income sources gives you a security that no single source can, no matter how strong." },
  { id: "mo11", category: "money", text: "راقب نفقاتك الصغيرة المتكررة؛ فهي غالباً أكبر أثراً من نفقة كبيرة نادرة.", textEn: "Watch your small, recurring expenses; they often add up to more than a rare large expense." },
  { id: "mo12", category: "money", text: "الاستدانة من أجل مظهر لا تحتاجه، ثمنها أغلى مما تتخيل.", textEn: "Going into debt for an image you don't need costs more than you imagine." },
  { id: "mo13", category: "money", text: "اجعل لكل مبلغ يدخل جيبك وجهة واضحة قبل أن ينفقه غيرك عنك.", textEn: "Give every amount that enters your pocket a clear destination before someone else spends it for you." },
  { id: "mo14", category: "money", text: "الاستثمار في تعلّمك يعود عليك بعائد لا ينقص مهما تغيّرت الأسواق.", textEn: "Investing in your own learning yields a return that never diminishes, no matter how markets change." },
  { id: "mo15", category: "money", text: "لا تُقارن أسلوب حياتك المالي بأسلوب غيرك؛ ظروف كل شخص مختلفة.", textEn: "Don't compare your financial lifestyle to someone else's; everyone's circumstances differ." },
  { id: "mo16", category: "money", text: "الادخار المنتظم البسيط يتفوّق مع الوقت على أي ثراء مفاجئ سريع الزوال.", textEn: "Simple, regular saving outperforms over time any sudden wealth that fades quickly." },
  { id: "mo17", category: "money", text: "اسأل نفسك دائماً: هل هذا الشراء يخدم أولوياتي أم مجرد لحظة رغبة عابرة؟", textEn: "Always ask yourself: does this purchase serve my priorities, or is it just a passing whim?" },
  { id: "mo18", category: "money", text: "الأمان المالي الحقيقي يبدأ من احتياطي بسيط يغطي الطوارئ.", textEn: "Real financial security starts with a simple reserve that covers emergencies." },
  { id: "mo19", category: "money", text: "من يعرف قيمة وقته، لا يقايضه برخص مقابل مال لا يستحق العناء.", textEn: "Whoever knows the value of their time won't trade it cheaply for money that isn't worth the effort." },
  { id: "mo20", category: "money", text: "القناعة أعظم رأس مال، فهي تحميك من إنفاق ما لا تملك لتُثبت ما لا تحتاجه.", textEn: "Contentment is the greatest capital; it protects you from spending what you don't have to prove what you don't need." },
  { id: "mo21", category: "money", text: "تتبّع نفقاتك ولو لأسبوع واحد يكشف لك عادات لم تكن تنتبه لها.", textEn: "Tracking your expenses for even one week reveals habits you never noticed." },
  { id: "mo22", category: "money", text: "لا تجعل قرارك المالي مبنياً على خوف لحظي أو طمع عابر.", textEn: "Don't base your financial decisions on momentary fear or fleeting greed." },
  { id: "mo23", category: "money", text: "النفقة على العلم والصحة استثمار، لا مجرد تكلفة تُخصم من ميزانيتك.", textEn: "Spending on education and health is an investment, not just a cost deducted from your budget." },
  { id: "mo24", category: "money", text: "كل مبلغ يدخل جيبك فرصة لتقترب من حريتك المالية أو تبتعد عنها.", textEn: "Every amount that enters your pocket is a chance to move closer to your financial freedom or further from it." },

  // إنتاجية
  { id: "pr01", category: "productivity", text: "المهمة التي تؤجّلها أكثر من مرة، غالباً هي أهم مما تظن.", textEn: "The task you keep postponing is often more important than you think." },
  { id: "pr02", category: "productivity", text: "ركّز على مهمة واحدة في كل مرة؛ فالتعدد الوهمي للمهام يبطئ الجميع.", textEn: "Focus on one task at a time; the illusion of multitasking slows everything down." },
  { id: "pr03", category: "productivity", text: "أول ساعة في يومك تحدّد نبرة الساعات الباقية.", textEn: "The first hour of your day sets the tone for all the hours that follow." },
  { id: "pr04", category: "productivity", text: "القائمة القصيرة من الأولويات أنفع من قائمة طويلة لا تُنجَز.", textEn: "A short list of priorities is more useful than a long list that never gets done." },
  { id: "pr05", category: "productivity", text: "خصّص وقتاً للراحة كما تخصّص وقتاً للعمل؛ فكلاهما إنتاجية.", textEn: "Set aside time for rest just as you set aside time for work; both are productivity." },
  { id: "pr06", category: "productivity", text: "البدء الناقص أفضل من انتظار الظرف المثالي الذي لن يأتي.", textEn: "An imperfect start beats waiting for the perfect moment that will never come." },
  { id: "pr07", category: "productivity", text: "أغلق الإشعارات وقت التركيز؛ فكل مقاطعة تكلّفك أكثر من ثوانيها الظاهرة.", textEn: "Turn off notifications while focusing; every interruption costs you more than its apparent seconds." },
  { id: "pr08", category: "productivity", text: "قسّم المهمة الكبيرة إلى خطوات صغيرة، فالكبيرة تُخيف والصغيرة تُنجَز.", textEn: "Break a big task into small steps; big tasks intimidate, small ones get done." },
  { id: "pr09", category: "productivity", text: "لا تخلط بين الانشغال والإنتاجية؛ أحدهما حركة، والآخر نتيجة.", textEn: "Don't confuse being busy with being productive; one is motion, the other is results." },
  { id: "pr10", category: "productivity", text: "اكتب مهامك بدل أن تحملها في ذهنك؛ فمكان الذاكرة التفكير لا التخزين.", textEn: "Write your tasks down instead of carrying them in your head; memory is for thinking, not storage." },
  { id: "pr11", category: "productivity", text: "وقتك المحدود يُجبرك على الاختيار؛ فاختر بوعي لا بردّة فعل.", textEn: "Your limited time forces you to choose; choose deliberately, not reactively." },
  { id: "pr12", category: "productivity", text: "الاستراحة القصيرة المتكررة تحافظ على تركيزك أطول من جلسة طويلة متواصلة.", textEn: "Short, frequent breaks preserve your focus longer than one continuous long session." },
  { id: "pr13", category: "productivity", text: "من يخطط ليومه في الليلة السابقة، يبدأ صباحه بوضوح لا تردد.", textEn: "Whoever plans their day the night before starts their morning with clarity, not hesitation." },
  { id: "pr14", category: "productivity", text: "قل لا لما لا يخدم أولوياتك، ولو بأدب شديد.", textEn: "Say no to what doesn't serve your priorities, even if very politely." },
  { id: "pr15", category: "productivity", text: "الوقت الذي تقضيه في التخطيط الجيد يوفّر أضعافه أثناء التنفيذ.", textEn: "Time spent on good planning saves many times more during execution." },
  { id: "pr16", category: "productivity", text: "أنجز أصعب مهمة في يومك أولاً، والباقي سيبدو أخف.", textEn: "Do the hardest task of your day first, and the rest will feel lighter." },
  { id: "pr17", category: "productivity", text: "لا تُقيّم يومك بعدد الساعات التي عملت، بل بما أنجزته فعلاً.", textEn: "Don't judge your day by the hours you worked, but by what you actually accomplished." },
  { id: "pr18", category: "productivity", text: "البيئة المرتّبة تقلّل من تشتت الذهن دون أن تشعر.", textEn: "A tidy environment reduces mental distraction without you even noticing." },
  { id: "pr19", category: "productivity", text: "المواعيد النهائية الواقعية أفضل من طموح مبالغ فيه يُحبط صاحبه.", textEn: "Realistic deadlines beat exaggerated ambition that only frustrates you." },
  { id: "pr20", category: "productivity", text: "راجع أسبوعك مرة كل أسبوع؛ فالتقييم المستمر يصحّح المسار مبكراً.", textEn: "Review your week once every week; ongoing evaluation corrects your course early." },
  { id: "pr21", category: "productivity", text: "لا تنتظر الإلهام لتبدأ عملك؛ الانضباط يصنع الإلهام أثناء العمل لا قبله.", textEn: "Don't wait for inspiration to start your work; discipline creates inspiration during the work, not before it." },
  { id: "pr22", category: "productivity", text: "كل دقيقة تقضيها في تنظيم مهامك، توفّر عليك ساعة من التخبط لاحقاً.", textEn: "Every minute spent organizing your tasks saves you an hour of confusion later." },
  { id: "pr23", category: "productivity", text: "تركيز عميق لفترة قصيرة أنتج من تشتت طويل يبدو وكأنه عمل.", textEn: "Deep focus for a short time produces more than long, scattered effort that only looks like work." },
  { id: "pr24", category: "productivity", text: "اسأل نفسك في نهاية اليوم: ما الشيء الوحيد الذي لو أنجزته يجعل يومي ناجحاً؟", textEn: "Ask yourself at the end of the day: what's the one thing that, if I'd done it, would make my day a success?" },

  // إيمان
  { id: "fa01", category: "faith", text: "الصبر ليس انتظاراً سلبياً، بل ثبات القلب أثناء الانتظار.", textEn: "Patience isn't passive waiting — it's steadiness of heart during the wait." },
  { id: "fa02", category: "faith", text: "الشكر على النعمة الصغيرة يفتح باباً لنعمة أكبر.", textEn: "Gratitude for a small blessing opens the door to a greater one." },
  { id: "fa03", category: "faith", text: "الدعاء ليس آخر الحلول، بل أول ما ينبغي أن تلجأ إليه.", textEn: "Prayer (dua) isn't the last resort — it's the first thing you should turn to." },
  { id: "fa04", category: "faith", text: "من يراقب الله في السر، يستقيم في العلن دون جهد.", textEn: "Whoever is mindful of God in private stays upright in public without effort." },
  { id: "fa05", category: "faith", text: "التوكل على الله لا يعني ترك الأسباب، بل الأخذ بها وتفويض النتيجة له.", textEn: "Trusting in God doesn't mean abandoning effort — it means taking the means and leaving the outcome to Him." },
  { id: "fa06", category: "faith", text: "القلب الذي يذكر الله يطمئن، ولو ضاقت به الدنيا.", textEn: "A heart that remembers God finds peace, even when the world feels tight around it." },
  { id: "fa07", category: "faith", text: "الصدقة لا تُنقص المال، بل تبارك فيما بقي منه.", textEn: "Charity doesn't decrease wealth — it blesses what remains of it." },
  { id: "fa08", category: "faith", text: "اليقين بأن كل ضيق سيُفرَّج يجعل احتماله أخف.", textEn: "Certainty that every hardship will ease makes it lighter to bear." },
  { id: "fa09", category: "faith", text: "حسن الظن بالله راحة لا يعرفها إلا من جرّبها.", textEn: "Good thoughts of God bring a peace only those who've experienced it know." },
  { id: "fa10", category: "faith", text: "الاستغفار يجدّد القلب كما يجدّد الماء الأرض الجافة.", textEn: "Seeking forgiveness renews the heart the way water renews dry earth." },
  { id: "fa11", category: "faith", text: "من يعامل الناس بأخلاق حسنة، يعكس إيمانه بصمت أبلغ من كل قول.", textEn: "Whoever treats people with good character reflects their faith more eloquently than any words." },
  { id: "fa12", category: "faith", text: "الصلاة في وقتها راحة تسبق الحاجة إليها، لا مجرد واجب يؤدَّى.", textEn: "Praying on time is a comfort that precedes the need for it, not just a duty to perform." },
  { id: "fa13", category: "faith", text: "العفو عمّن أساء إليك أثقل على النفس وأعظم عند الله من الانتقام.", textEn: "Forgiving someone who wronged you weighs heavier on the soul, and is greater with God, than revenge." },
  { id: "fa14", category: "faith", text: "طلب العلم عبادة مستمرة ما دامت النية فيها خالصة.", textEn: "Seeking knowledge is continuous worship, as long as the intention behind it stays sincere." },
  { id: "fa15", category: "faith", text: "من يتذكّر الآخرة، يهون عليه كثير مما يتعب الناس لأجله.", textEn: "Whoever remembers the hereafter finds much of what exhausts others becomes trivial." },
  { id: "fa16", category: "faith", text: "الرزق مقسوم، لكن السعي فيه عبادة لا كسل معها.", textEn: "Provision is already apportioned, but striving for it is worship, not an excuse for laziness." },
  { id: "fa17", category: "faith", text: "الإخلاص يجعل العمل الصغير عظيماً، والرياء يُفرغ العمل العظيم من قيمته.", textEn: "Sincerity makes a small deed great, while showing off empties a great deed of its worth." },
  { id: "fa18", category: "faith", text: "من يبرّ والديه، يرى بركة ذلك في نفسه قبل أن يراها في دنياه.", textEn: "Whoever honors their parents sees the blessing of it in themselves before they see it in their worldly life." },
  { id: "fa19", category: "faith", text: "القناعة بما قسمه الله كنز لا يفنى.", textEn: "Contentment with what God has apportioned is a treasure that never runs out." },
  { id: "fa20", category: "faith", text: "كل ابتلاء يُحتسَب عند الله، فلا يضيع صبرك على شيء منه.", textEn: "Every trial is counted with God, so your patience through it is never wasted." },
  { id: "fa21", category: "faith", text: "حسن الخلق يزن في الميزان أكثر مما يظن كثير من الناس.", textEn: "Good character weighs more on the scale than most people realize." },
  { id: "fa22", category: "faith", text: "من يترك شيئاً لله، يعوّضه الله خيراً منه.", textEn: "Whoever gives something up for God's sake, God replaces it with something better." },
  { id: "fa23", category: "faith", text: "التوبة الصادقة تفتح صفحة جديدة، ولا تُبقيك أسير الماضي.", textEn: "Sincere repentance opens a new page and doesn't keep you a prisoner of the past." },
  { id: "fa24", category: "faith", text: "الرحمة بالخلق طريق إلى رحمة الخالق.", textEn: "Mercy toward creation is a path to the mercy of the Creator." },
  { id: "fa25", category: "faith", text: "اليقين بالقدر يريح القلب من الاعتراض على ما فات.", textEn: "Certainty in divine decree relieves the heart from objecting to what has already passed." },
  { id: "fa26", category: "faith", text: "الذكر القليل الدائم خير من كثير منقطع.", textEn: "A little remembrance done consistently is better than a lot done sporadically." },
  { id: "fa27", category: "faith", text: "من يتّق الله، يجعل له من كل ضيق مخرجاً لا يحتسبه.", textEn: "Whoever is mindful of God, He makes a way out for them from every hardship, from where they least expect." },
  { id: "fa28", category: "faith", text: "أعظم غنى غنى النفس، لا كثرة المتاع.", textEn: "The greatest wealth is the wealth of the soul (contentment), not an abundance of possessions." },
];

export const TIP_CATEGORY_LABELS = {
  selfdev: "تطوير ذاتي",
  health: "صحة",
  relationships: "علاقات",
  management: "إدارة",
  money: "مال",
  productivity: "إنتاجية",
  faith: "إيمان",
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
export const FALLBACK_TIP = { id: "fallback", category: "selfdev", text: TIPS[0]?.text || "ابدأ يومك بنية طيبة، فالنية الصالحة نصف العمل.", textEn: TIPS[0]?.textEn || "Start your day with good intentions — a good intention is half the work." };

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
