# Masar Nutrition Widget (iOS)

Widget حقيقي (WidgetKit) لشاشة iPhone الرئيسية يعرض ملخّص تغذية اليوم من
حسابك الحقيقي في Supabase — سعرات/بروتين/كارب/دهون مقابل هدفك، وكوب الماء.
لا علاقة له بتطبيق الويب (PWA) تقنياً — WidgetKit لا يمكن تشغيله إلا داخل
تطبيق iOS أصلي مبني بـXcode، هذا قيد من Apple لا حل بديل له (راجع النقاش
في المحادثة الأصلية لو احتجت التفاصيل).

## بلا Mac؟ — التحقق عبر GitHub Actions

إن كنت تعمل من بيئة بلا macOS (مثل هذا المستودع نفسه)، **لا تحتاج Xcode
محلياً للتحقق أن الكود يعمل**: `.github/workflows/ios-widget-ci.yml` يبني
المشروع فعلياً على macOS runner مجاني من GitHub، يُشغّله في محاكي iOS
حقيقي، يسجّل دخول تلقائياً بحساب اختباري، ويلتقط لقطة شاشة حقيقية لنفس
الواجهة (`NutritionSummaryView`) المستخدَمة في الـWidget الفعلي حرفياً —
تجدها كـ`build artifact` قابل للتنزيل بعد نجاح التشغيلة في تبويب Actions.

**قبل أول تشغيلة**: أضف 4 قيم في إعدادات المستودع (Settings → Secrets and
variables → Actions → New repository secret):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — نفس القيمتين المستخدَمتين فعلاً في
  Netlify (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`)، أو من Supabase
  Dashboard → Settings → API.
- `TEST_ACCOUNT_EMAIL`, `TEST_ACCOUNT_PASSWORD` — حساب مسار حقيقي (يفضَّل
  حساب اختباري منفصل) لديه بيانات تغذية اليوم مسجَّلة فعلاً، حتى تظهر أرقام
  حقيقية في اللقطة لا أصفاراً.

هذا يثبت أن الكود **يُصرَّف وينفّذ ويجلب بيانات حقيقية بشكل صحيح** — لا أنه
"widget مُثبَّت على شاشة هاتف حقيقية"؛ تلك الخطوة الأخيرة تحتاج جهاز Mac
فعلي (ولو مؤقتاً/مستأجراً) لا بديل تقني عنه.

## عند توفّر Mac

1. ثبّت [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`).
2. انسخ `MasarWidgetHost/Secrets.swift.example` إلى
   `MasarWidgetHost/Secrets.swift` واملأ قيمتَي Supabase الحقيقيتين.
3. من هذا المجلد: `xcodegen generate` — يُنشئ `MasarWidgetHost.xcodeproj`.
4. افتحه بـXcode، اختر جهازك الحقيقي أو محاكياً، Run.
5. سجّل الدخول بحساب مسار الحقيقي، ثم من شاشة الهاتف الرئيسية: اضغط مطولاً
   → زر `+` أعلى اليسار → ابحث عن "Masar" → أضف الـwidget.
6. غيّر `com.masar.app` في `project.yml` (`bundleIdPrefix`) و`group.com.masar.app.shared`
   (App Group في كلا الهدفين + `SharedSession.appGroupID`) لمعرّفات فريدة
   خاصة بحساب Apple Developer الخاص بك لو أردت تثبيتاً دائماً/توزيعاً حقيقياً
   (المعرّفات الحالية صالحة للتشغيل على المحاكي فقط، تحتاج بصمة فريدة
   لأي توزيع حقيقي عبر App Store/TestFlight).

## البنية

- `MasarWidgetHost/` — تطبيق مضيف صغير: شاشة دخول (بريد/كلمة مرور Supabase،
  نفس مسار `signInWithEmail` في تطبيق الويب)، وشاشة معاينة تعرض نفس واجهة
  الـWidget بالضبط.
- `MasarNutritionWidget/` — الـWidget Extension الحقيقي (WidgetKit).
- `MasarWidgetHost/Services/` — منطق مشترك بلا أي مكتبة خارجية (REST عبر
  `URLSession` فقط): `SupabaseClient.swift` (مصادقة + قراءة)،
  `NutritionSummary.swift` (منفذ Swift لـ`getDailyNutritionSummary()` من
  `artifacts/masar/src/lib/nutrition-plan.js` — **حافظ على تطابقهما يدوياً
  عند أي تعديل مستقبلي على أي منهما**)، `SharedSession.swift` (مشاركة
  الجلسة بين التطبيق والـWidget عبر App Group).

## المرحلة التالية (لاحقاً، غير مُنفَّذة بعد)

Live Activity لجلسة التمرين (ActivityKit) — تُبنى بنفس النمط بعد التأكد من
نجاح هذه المرحلة.
