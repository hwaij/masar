// قاعدة بيانات "أطعمة عامة" (Generic Foods) محلية موثوقة - طبقة أولى قبل
// حتى محاولة الاتصال بـ Open Food Facts. القيم لكل 100غم تقديرية موثوقة
// (مرجع عام: قيم USDA FoodData Central العامة، بيانات عامة غير محمية)،
// وليست دقيقة لمنتج تجاري بعينه - تماماً كمبدأ "تقديرية" المُتَّبَع أصلاً في
// DAILY_GUIDELINES/servingPresets داخل nutrition.js.
//
// مبدأ التوسع: كل عنصر أدناه كائن واحد مستقل بنفس الشكل تماماً - إضافة طعام
// جديد لاحقاً = كائن واحد فقط هنا، بلا أي تعديل بنيوي في أي مكان آخر
// (لا في هذا الملف ولا في NutritionView.jsx الذي يستدعي searchGenericFoods
// ديناميكياً بالكامل). قابلة للنمو لآلاف العناصر بنفس النمط.
//
// category تُستخدم فقط لاختيار أيقونة توضيحية (لا صورة حقيقية) في نتائج
// البحث عندما لا تتوفر صورة فعلية (OFF/custom_foods) - انظر CATEGORY_ICONS
// في NutritionView.jsx. searchTerms: كلمات بحث عربية وإنجليزية إضافية (بلا
// تشكيل، تُطابَق عبر normalizeSearchTerm) تُستخدم مع الاسمين name/nameEn
// أنفسهما تلقائياً - لا حاجة لتكرارهما داخل searchTerms.
// servingGrams: حجم حصة مرجعي تقريبي شائع (يُستخدم كافتراضي "حصة واحدة" في
// شاشة تأكيد الكمية، تماماً كـservingGrams القادم من Open Food Facts).
//
// micronutrients (اختياري، لكل 100غم): تقدير تقريبي موثوق من مرجعية USDA
// FoodData Central العامة لذلك الصنف تحديداً - أُضيف فقط لعدد محدود من
// "الأطعمة الأساسية" الأكثر شهرة/توثيقاً لعنصر معيّن (مثال: بيض=فيتامين
// د/ب12، سبانخ=حديد/فيتامين أ، موز=بوتاسيوم)، لا لكل صنف في القائمة - أي
// صنف بلا هذا الحقل يبقى بلا فيتامينات كما كان (لا اختراع رقم غير موثوق).
// عند وجود تفاوت بين مصادر USDA لنفس الصنف (مثال: فيتامين د في السلمون
// يختلف كثيراً بين بري/مستزرَع)، اخترنا القيمة الأقرب للحد الأدنى الموثوق
// عمداً - تفادياً لإيهام المستخدم بتحقيق احتياجه فعلياً. هذه القيم تُعرض
// دائماً في الواجهة بعلامة "≈ تقريبي" واضحة (انظر microApprox في
// nutrition.js وgenericFoodToProduct أدناه) تمييزاً كاملاً عن القيم
// الدقيقة الفعلية القادمة من باركود Open Food Facts أو قراءة ملصق حقيقي.
import { normalizeSearchTerm } from "./nutrition";

export const GENERIC_FOODS = [
  // ===== بيض — eggs =====
  { id: "egg_boiled", category: "egg", name: "بيض مسلوق", nameEn: "Boiled egg", searchTerms: ["بيض", "egg", "eggs", "boiled egg"], caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, fiberPer100g: 0, servingGrams: 50, micronutrients: { vitamin_a: 140, vitamin_d: 2, vitamin_b12: 0.9, iron: 1.2, calcium: 50, potassium: 126, zinc: 1.1 } },
  { id: "egg_fried", category: "egg", name: "بيض مقلي", nameEn: "Fried egg", searchTerms: ["بيض مقلي", "fried egg"], caloriesPer100g: 196, proteinPer100g: 13.6, carbsPer100g: 0.8, fatPer100g: 15, fiberPer100g: 0, servingGrams: 50 },
  { id: "egg_omelette", category: "egg", name: "أومليت", nameEn: "Omelette", searchTerms: ["اومليت", "omelet", "omelette"], caloriesPer100g: 154, proteinPer100g: 10.6, carbsPer100g: 1.6, fatPer100g: 11.7, fiberPer100g: 0, servingGrams: 120 },
  { id: "egg_scrambled", category: "egg", name: "بيض مخفوق", nameEn: "Scrambled egg", searchTerms: ["بيض مخفوق", "scrambled egg", "scrambled eggs"], caloriesPer100g: 149, proteinPer100g: 10, carbsPer100g: 1.6, fatPer100g: 11, fiberPer100g: 0, servingGrams: 110 },
  { id: "egg_white", category: "egg", name: "بياض البيض", nameEn: "Egg white", searchTerms: ["بياض بيض", "egg whites"], caloriesPer100g: 52, proteinPer100g: 10.9, carbsPer100g: 0.7, fatPer100g: 0.2, fiberPer100g: 0, servingGrams: 33, micronutrients: { potassium: 163 } },
  { id: "egg_yolk", category: "egg", name: "صفار البيض", nameEn: "Egg yolk", searchTerms: ["صفار بيض", "egg yolks"], caloriesPer100g: 322, proteinPer100g: 15.9, carbsPer100g: 3.6, fatPer100g: 26.5, fiberPer100g: 0, servingGrams: 17, micronutrients: { vitamin_a: 380, vitamin_d: 5, vitamin_b12: 1.9, iron: 2.7, calcium: 129 } },

  // ===== نشويات وحبوب — grains =====
  { id: "rice_white_cooked", category: "grain", name: "أرز أبيض مطبوخ", nameEn: "White rice, cooked", searchTerms: ["أرز", "رز", "rice", "white rice"], caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0.4, servingGrams: 150 },
  { id: "rice_brown_cooked", category: "grain", name: "أرز بني مطبوخ", nameEn: "Brown rice, cooked", searchTerms: ["أرز بني", "برون رايس", "brown rice"], caloriesPer100g: 112, proteinPer100g: 2.6, carbsPer100g: 23.5, fatPer100g: 0.9, fiberPer100g: 1.8, servingGrams: 150, micronutrients: { magnesium: 39 } },
  { id: "rice_basmati_cooked", category: "grain", name: "أرز بسمتي مطبوخ", nameEn: "Basmati rice, cooked", searchTerms: ["أرز بسمتي", "بسمتي", "basmati", "basmati rice"], caloriesPer100g: 121, proteinPer100g: 3.5, carbsPer100g: 25, fatPer100g: 0.4, fiberPer100g: 0.6, servingGrams: 150 },
  { id: "bread_white", category: "grain", name: "خبز أبيض", nameEn: "White bread", searchTerms: ["خبز", "خبز ابيض", "bread", "white bread"], caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2, fiberPer100g: 2.7, servingGrams: 30 },
  { id: "bread_whole_wheat", category: "grain", name: "خبز أسمر (قمح كامل)", nameEn: "Whole wheat bread", searchTerms: ["خبز اسمر", "خبز قمح كامل", "whole wheat bread", "brown bread"], caloriesPer100g: 247, proteinPer100g: 13, carbsPer100g: 41, fatPer100g: 3.4, fiberPer100g: 7, servingGrams: 30 },
  { id: "bread_toast", category: "grain", name: "خبز توست", nameEn: "Toast bread", searchTerms: ["توست", "خبز توست", "toast", "toast bread", "sandwich bread"], caloriesPer100g: 275, proteinPer100g: 9, carbsPer100g: 50, fatPer100g: 3.5, fiberPer100g: 2.3, servingGrams: 28 },
  { id: "bread_arabic", category: "grain", name: "خبز عربي (صمون)", nameEn: "Arabic / pita bread", searchTerms: ["خبز عربي", "خبز صمون", "صمون", "خبز رقاق", "pita", "pita bread", "arabic bread"], caloriesPer100g: 275, proteinPer100g: 9.1, carbsPer100g: 55.7, fatPer100g: 1.2, fiberPer100g: 2.2, servingGrams: 60 },
  { id: "pasta_cooked", category: "grain", name: "معكرونة مطبوخة", nameEn: "Pasta, cooked", searchTerms: ["معكرونة", "باستا", "pasta", "spaghetti"], caloriesPer100g: 131, proteinPer100g: 5, carbsPer100g: 25, fatPer100g: 1.1, fiberPer100g: 1.8, servingGrams: 140 },
  { id: "oats", category: "grain", name: "شوفان", nameEn: "Oats", searchTerms: ["شوفان", "oats", "oatmeal"], caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66, fatPer100g: 6.9, fiberPer100g: 10.6, servingGrams: 40, micronutrients: { iron: 4, magnesium: 177, zinc: 3.6 } },
  { id: "bulgur_cooked", category: "grain", name: "برغل مطبوخ", nameEn: "Bulgur, cooked", searchTerms: ["برغل", "bulgur"], caloriesPer100g: 83, proteinPer100g: 3.1, carbsPer100g: 18.6, fatPer100g: 0.2, fiberPer100g: 4.5, servingGrams: 150 },
  { id: "quinoa_cooked", category: "grain", name: "كينوا مطبوخة", nameEn: "Quinoa, cooked", searchTerms: ["كينوا", "quinoa"], caloriesPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 21.3, fatPer100g: 1.9, fiberPer100g: 2.8, servingGrams: 150, micronutrients: { iron: 1.5, magnesium: 64 } },

  // ===== دجاج — poultry =====
  { id: "chicken_breast_grilled", category: "poultry", name: "صدر دجاج مشوي", nameEn: "Grilled chicken breast", searchTerms: ["دجاج", "صدر دجاج", "chicken", "chicken breast", "grilled chicken"], caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0, servingGrams: 120 },
  { id: "chicken_breast_fried", category: "poultry", name: "صدر دجاج مقلي", nameEn: "Fried chicken breast", searchTerms: ["دجاج مقلي", "fried chicken", "fried chicken breast"], caloriesPer100g: 246, proteinPer100g: 24, carbsPer100g: 8, fatPer100g: 12.6, fiberPer100g: 0.3, servingGrams: 120 },
  { id: "chicken_thigh", category: "poultry", name: "فخذ دجاج", nameEn: "Chicken thigh", searchTerms: ["فخذ دجاج", "chicken thigh"], caloriesPer100g: 209, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 10.9, fiberPer100g: 0, servingGrams: 120 },
  { id: "chicken_with_skin", category: "poultry", name: "دجاج بجلد مشوي", nameEn: "Roasted chicken with skin", searchTerms: ["دجاج بالجلد", "دجاج مشوي بالجلد", "chicken with skin", "roasted chicken"], caloriesPer100g: 220, proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 12, fiberPer100g: 0, servingGrams: 120 },

  // ===== لحوم — meats =====
  { id: "beef_ground_80", category: "meat", name: "لحم بقري مفروم (80% خالٍ من الدهن)", nameEn: "Ground beef (80% lean)", searchTerms: ["لحم مفروم", "لحمة مفرومة", "ground beef", "minced beef"], caloriesPer100g: 254, proteinPer100g: 25.9, carbsPer100g: 0, fatPer100g: 16.4, fiberPer100g: 0, servingGrams: 120, micronutrients: { iron: 2.4, zinc: 4.4, vitamin_b12: 2.1 } },
  { id: "beef_ground_90", category: "meat", name: "لحم بقري مفروم قليل الدسم (90%)", nameEn: "Ground beef (90% lean)", searchTerms: ["لحم مفروم قليل الدسم", "lean ground beef"], caloriesPer100g: 196, proteinPer100g: 26.8, carbsPer100g: 0, fatPer100g: 9.4, fiberPer100g: 0, servingGrams: 120, micronutrients: { iron: 2.5, zinc: 4.4, vitamin_b12: 2.1 } },
  { id: "beef_cooked", category: "meat", name: "لحم بقري مطبوخ", nameEn: "Cooked beef", searchTerms: ["لحم", "لحم بقري", "beef", "meat", "steak"], caloriesPer100g: 250, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 15, fiberPer100g: 0, servingGrams: 120, micronutrients: { iron: 2.6, zinc: 4.5, vitamin_b12: 2.6 } },
  { id: "lamb_cooked", category: "meat", name: "لحم غنم مطبوخ", nameEn: "Cooked lamb", searchTerms: ["لحم غنم", "لحم خروف", "lamb", "mutton"], caloriesPer100g: 294, proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 21, fiberPer100g: 0, servingGrams: 120, micronutrients: { vitamin_b12: 2.3, zinc: 4 } },

  // ===== أسماك — fish & seafood =====
  { id: "fish_grilled", category: "fish", name: "سمك مشوي", nameEn: "Grilled fish", searchTerms: ["سمك", "سمك مشوي", "fish", "grilled fish"], caloriesPer100g: 105, proteinPer100g: 23, carbsPer100g: 0, fatPer100g: 1.2, fiberPer100g: 0, servingGrams: 120 },
  { id: "salmon_grilled", category: "fish", name: "سلمون مشوي", nameEn: "Grilled salmon", searchTerms: ["سلمون", "salmon"], caloriesPer100g: 206, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 13, fiberPer100g: 0, servingGrams: 120, micronutrients: { vitamin_d: 8, vitamin_b12: 2.8 } },
  { id: "tuna_canned_water", category: "fish", name: "تونة (معلّبة بالماء)", nameEn: "Tuna (canned in water)", searchTerms: ["تونة", "tuna"], caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 1, fiberPer100g: 0, servingGrams: 100, micronutrients: { vitamin_b12: 2.2 } },
  { id: "tilapia_grilled", category: "fish", name: "بلطي مشوي", nameEn: "Grilled tilapia", searchTerms: ["بلطي", "تلابيا", "tilapia"], caloriesPer100g: 129, proteinPer100g: 26.2, carbsPer100g: 0, fatPer100g: 2.7, fiberPer100g: 0, servingGrams: 120, micronutrients: { vitamin_b12: 1.6 } },
  { id: "shrimp_cooked", category: "fish", name: "روبيان مطبوخ", nameEn: "Cooked shrimp", searchTerms: ["روبيان", "جمبري", "shrimp", "prawns"], caloriesPer100g: 99, proteinPer100g: 24, carbsPer100g: 0.2, fatPer100g: 0.3, fiberPer100g: 0, servingGrams: 85 },

  // ===== خضروات — vegetables =====
  { id: "tomato", category: "vegetable", name: "طماطم", nameEn: "Tomato", searchTerms: ["طماطم", "بندورة", "tomato", "tomatoes"], caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, fiberPer100g: 1.2, servingGrams: 120, micronutrients: { vitamin_c: 14, potassium: 237 } },
  { id: "cucumber", category: "vegetable", name: "خيار", nameEn: "Cucumber", searchTerms: ["خيار", "cucumber"], caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, fiberPer100g: 0.5, servingGrams: 120 },
  { id: "lettuce", category: "vegetable", name: "خس", nameEn: "Lettuce", searchTerms: ["خس", "lettuce"], caloriesPer100g: 15, proteinPer100g: 1.4, carbsPer100g: 2.9, fatPer100g: 0.2, fiberPer100g: 1.3, servingGrams: 50 },
  { id: "carrot", category: "vegetable", name: "جزر", nameEn: "Carrot", searchTerms: ["جزر", "carrot", "carrots"], caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2, fiberPer100g: 2.8, servingGrams: 60, micronutrients: { vitamin_a: 800, potassium: 320 } },
  { id: "onion", category: "vegetable", name: "بصل", nameEn: "Onion", searchTerms: ["بصل", "onion", "onions"], caloriesPer100g: 40, proteinPer100g: 1.1, carbsPer100g: 9.3, fatPer100g: 0.1, fiberPer100g: 1.7, servingGrams: 110 },
  { id: "spinach", category: "vegetable", name: "سبانخ", nameEn: "Spinach", searchTerms: ["سبانخ", "spinach"], caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 2.2, servingGrams: 30, micronutrients: { vitamin_a: 469, vitamin_c: 28, iron: 2.7, calcium: 99, potassium: 558, magnesium: 79 } },
  { id: "broccoli", category: "vegetable", name: "بروكلي", nameEn: "Broccoli", searchTerms: ["بروكلي", "broccoli"], caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 6.6, fatPer100g: 0.4, fiberPer100g: 2.6, servingGrams: 90, micronutrients: { vitamin_c: 89, calcium: 47, potassium: 316 } },
  { id: "bell_pepper", category: "vegetable", name: "فلفل حلو", nameEn: "Bell pepper", searchTerms: ["فلفل", "فلفل حلو", "فلفل رومي", "bell pepper", "capsicum"], caloriesPer100g: 31, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.3, fiberPer100g: 2.1, servingGrams: 120, micronutrients: { vitamin_c: 80 } },
  { id: "potato_boiled", category: "vegetable", name: "بطاطس مسلوقة", nameEn: "Boiled potato", searchTerms: ["بطاطا", "بطاطس", "potato", "potatoes"], caloriesPer100g: 87, proteinPer100g: 1.9, carbsPer100g: 20, fatPer100g: 0.1, fiberPer100g: 1.8, servingGrams: 150 },
  { id: "eggplant", category: "vegetable", name: "باذنجان", nameEn: "Eggplant", searchTerms: ["باذنجان", "eggplant", "aubergine"], caloriesPer100g: 25, proteinPer100g: 1, carbsPer100g: 5.9, fatPer100g: 0.2, fiberPer100g: 3, servingGrams: 80 },
  { id: "zucchini", category: "vegetable", name: "كوسا", nameEn: "Zucchini", searchTerms: ["كوسا", "كوسة", "zucchini", "courgette"], caloriesPer100g: 17, proteinPer100g: 1.2, carbsPer100g: 3.1, fatPer100g: 0.3, fiberPer100g: 1, servingGrams: 100 },

  // ===== فواكه — fruits =====
  { id: "apple", category: "fruit", name: "تفاح", nameEn: "Apple", searchTerms: ["تفاح", "apple", "apples"], caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, fiberPer100g: 2.4, servingGrams: 180 },
  { id: "banana", category: "fruit", name: "موز", nameEn: "Banana", searchTerms: ["موز", "banana", "bananas"], caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, fiberPer100g: 2.6, servingGrams: 120, micronutrients: { potassium: 358, vitamin_c: 8.7 } },
  { id: "orange", category: "fruit", name: "برتقال", nameEn: "Orange", searchTerms: ["برتقال", "orange", "oranges"], caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1, fiberPer100g: 2.4, servingGrams: 130, micronutrients: { vitamin_c: 50, potassium: 181 } },
  { id: "grapes", category: "fruit", name: "عنب", nameEn: "Grapes", searchTerms: ["عنب", "grapes"], caloriesPer100g: 69, proteinPer100g: 0.7, carbsPer100g: 18, fatPer100g: 0.2, fiberPer100g: 0.9, servingGrams: 90 },
  { id: "strawberry", category: "fruit", name: "فراولة", nameEn: "Strawberry", searchTerms: ["فراولة", "strawberry", "strawberries"], caloriesPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3, fiberPer100g: 2, servingGrams: 150, micronutrients: { vitamin_c: 58 } },
  { id: "dates", category: "fruit", name: "تمر", nameEn: "Dates", searchTerms: ["تمر", "دتس", "dates"], caloriesPer100g: 277, proteinPer100g: 1.8, carbsPer100g: 75, fatPer100g: 0.2, fiberPer100g: 6.7, servingGrams: 24, micronutrients: { potassium: 656 } },
  { id: "mango", category: "fruit", name: "مانجو", nameEn: "Mango", searchTerms: ["مانجو", "مانجا", "mango"], caloriesPer100g: 60, proteinPer100g: 0.8, carbsPer100g: 15, fatPer100g: 0.4, fiberPer100g: 1.6, servingGrams: 200, micronutrients: { vitamin_c: 36 } },
  { id: "watermelon", category: "fruit", name: "بطيخ", nameEn: "Watermelon", searchTerms: ["بطيخ", "watermelon"], caloriesPer100g: 30, proteinPer100g: 0.6, carbsPer100g: 7.6, fatPer100g: 0.2, fiberPer100g: 0.4, servingGrams: 280 },
  { id: "pomegranate", category: "fruit", name: "رمان", nameEn: "Pomegranate", searchTerms: ["رمان", "pomegranate"], caloriesPer100g: 83, proteinPer100g: 1.7, carbsPer100g: 18.7, fatPer100g: 1.2, fiberPer100g: 4, servingGrams: 100 },
  { id: "kiwi", category: "fruit", name: "كيوي", nameEn: "Kiwi", searchTerms: ["كيوي", "kiwi"], caloriesPer100g: 61, proteinPer100g: 1.1, carbsPer100g: 14.7, fatPer100g: 0.5, fiberPer100g: 3, servingGrams: 75, micronutrients: { vitamin_c: 85, potassium: 312 } },

  // ===== بقوليات — legumes =====
  { id: "lentils_cooked", category: "legume", name: "عدس مطبوخ", nameEn: "Lentils, cooked", searchTerms: ["عدس", "lentils", "lentil"], caloriesPer100g: 116, proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 0.4, fiberPer100g: 7.9, servingGrams: 150, micronutrients: { iron: 3.3, potassium: 360, magnesium: 36 } },
  { id: "chickpeas_cooked", category: "legume", name: "حمص مطبوخ", nameEn: "Chickpeas, cooked", searchTerms: ["حمص", "chickpeas", "chickpea", "garbanzo"], caloriesPer100g: 164, proteinPer100g: 8.9, carbsPer100g: 27.4, fatPer100g: 2.6, fiberPer100g: 7.6, servingGrams: 150, micronutrients: { iron: 2.9, potassium: 291, magnesium: 48 } },
  { id: "fava_beans_cooked", category: "legume", name: "فول مطبوخ", nameEn: "Fava beans, cooked", searchTerms: ["فول", "fava beans", "broad beans"], caloriesPer100g: 110, proteinPer100g: 7.6, carbsPer100g: 19.7, fatPer100g: 0.4, fiberPer100g: 5.4, servingGrams: 150, micronutrients: { potassium: 268 } },
  { id: "kidney_beans_cooked", category: "legume", name: "فاصوليا حمراء مطبوخة", nameEn: "Kidney beans, cooked", searchTerms: ["فاصوليا", "فاصوليا حمراء", "kidney beans", "beans"], caloriesPer100g: 127, proteinPer100g: 8.7, carbsPer100g: 22.8, fatPer100g: 0.5, fiberPer100g: 6.4, servingGrams: 150, micronutrients: { iron: 2.2, potassium: 400, magnesium: 45 } },

  // ===== ألبان — dairy =====
  { id: "milk_whole", category: "dairy", name: "حليب كامل الدسم", nameEn: "Whole milk", searchTerms: ["حليب", "milk", "whole milk"], caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3, fiberPer100g: 0, servingGrams: 240, micronutrients: { calcium: 113, vitamin_d: 1, vitamin_b12: 0.45, potassium: 132 } },
  { id: "milk_skim", category: "dairy", name: "حليب خالي الدسم", nameEn: "Skim milk", searchTerms: ["حليب خالي الدسم", "حليب قليل الدسم", "skim milk", "low fat milk"], caloriesPer100g: 34, proteinPer100g: 3.4, carbsPer100g: 5, fatPer100g: 0.1, fiberPer100g: 0, servingGrams: 240, micronutrients: { calcium: 122, vitamin_d: 1, vitamin_b12: 0.5, potassium: 156 } },
  { id: "yogurt_plain", category: "dairy", name: "زبادي", nameEn: "Plain yogurt", searchTerms: ["زبادي", "لبن زبادي", "yogurt", "yoghurt"], caloriesPer100g: 61, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3, fiberPer100g: 0, servingGrams: 170, micronutrients: { calcium: 110, vitamin_b12: 0.75, potassium: 141 } },
  { id: "laban", category: "dairy", name: "لبن (رائب)", nameEn: "Buttermilk (laban)", searchTerms: ["لبن", "لبن رائب", "laban", "buttermilk"], caloriesPer100g: 40, proteinPer100g: 3.3, carbsPer100g: 4.8, fatPer100g: 0.9, fiberPer100g: 0, servingGrams: 240, micronutrients: { calcium: 116 } },
  { id: "cheese_white", category: "dairy", name: "جبن أبيض", nameEn: "White cheese (feta-style)", searchTerms: ["جبن أبيض", "جبنة بيضاء", "فيتا", "feta", "white cheese"], caloriesPer100g: 264, proteinPer100g: 14.2, carbsPer100g: 4.1, fatPer100g: 21.3, fiberPer100g: 0, servingGrams: 30, micronutrients: { calcium: 470, vitamin_b12: 1.7 } },
  { id: "cheese_cheddar", category: "dairy", name: "جبن شيدر", nameEn: "Cheddar cheese", searchTerms: ["جبن", "جبنة", "شيدر", "cheese", "cheddar"], caloriesPer100g: 402, proteinPer100g: 25, carbsPer100g: 1.3, fatPer100g: 33, fiberPer100g: 0, servingGrams: 30, micronutrients: { calcium: 700 } },
  { id: "cream", category: "dairy", name: "قشطة", nameEn: "Cream", searchTerms: ["قشطة", "كريمة", "cream", "heavy cream"], caloriesPer100g: 340, proteinPer100g: 2.1, carbsPer100g: 2.8, fatPer100g: 36, fiberPer100g: 0, servingGrams: 15 },

  // ===== مكسرات — nuts =====
  { id: "almonds", category: "nut", name: "لوز", nameEn: "Almonds", searchTerms: ["لوز", "almonds", "almond"], caloriesPer100g: 579, proteinPer100g: 21.2, carbsPer100g: 21.6, fatPer100g: 49.9, fiberPer100g: 12.5, servingGrams: 28, micronutrients: { magnesium: 268, calcium: 264 } },
  { id: "walnuts", category: "nut", name: "جوز", nameEn: "Walnuts", searchTerms: ["جوز", "عين جمل", "walnuts", "walnut"], caloriesPer100g: 654, proteinPer100g: 15.2, carbsPer100g: 13.7, fatPer100g: 65.2, fiberPer100g: 6.7, servingGrams: 28, micronutrients: { magnesium: 158 } },
  { id: "pistachios", category: "nut", name: "فستق", nameEn: "Pistachios", searchTerms: ["فستق", "فستق حلبي", "pistachios", "pistachio"], caloriesPer100g: 560, proteinPer100g: 20.2, carbsPer100g: 27.2, fatPer100g: 45.3, fiberPer100g: 10.6, servingGrams: 28, micronutrients: { potassium: 1000, magnesium: 121 } },
  { id: "cashews", category: "nut", name: "كاجو", nameEn: "Cashews", searchTerms: ["كاجو", "cashews", "cashew"], caloriesPer100g: 553, proteinPer100g: 18.2, carbsPer100g: 30.2, fatPer100g: 43.9, fiberPer100g: 3.3, servingGrams: 28, micronutrients: { magnesium: 292, zinc: 5.6 } },
  { id: "peanuts", category: "nut", name: "فول سوداني", nameEn: "Peanuts", searchTerms: ["فول سوداني", "peanuts", "peanut"], caloriesPer100g: 567, proteinPer100g: 25.8, carbsPer100g: 16.1, fatPer100g: 49.2, fiberPer100g: 8.5, servingGrams: 28, micronutrients: { magnesium: 168 } },
  { id: "nuts_mixed", category: "nut", name: "مكسرات مشكّلة", nameEn: "Mixed nuts", searchTerms: ["مكسرات", "nuts", "mixed nuts"], caloriesPer100g: 607, proteinPer100g: 20, carbsPer100g: 20, fatPer100g: 54, fiberPer100g: 8, servingGrams: 28 },

  // ===== مشروبات — beverages =====
  { id: "coffee_black", category: "beverage", name: "قهوة سوداء", nameEn: "Black coffee", searchTerms: ["قهوة", "قهوة سوداء", "coffee", "black coffee"], caloriesPer100g: 2, proteinPer100g: 0.3, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, servingGrams: 240 },
  { id: "tea_black", category: "beverage", name: "شاي", nameEn: "Black tea", searchTerms: ["شاي", "tea", "black tea"], caloriesPer100g: 1, proteinPer100g: 0, carbsPer100g: 0.3, fatPer100g: 0, fiberPer100g: 0, servingGrams: 240 },
  { id: "orange_juice", category: "beverage", name: "عصير برتقال", nameEn: "Orange juice", searchTerms: ["عصير برتقال", "orange juice"], caloriesPer100g: 45, proteinPer100g: 0.7, carbsPer100g: 10.4, fatPer100g: 0.2, fiberPer100g: 0.2, servingGrams: 240, micronutrients: { vitamin_c: 40, potassium: 190 } },
  { id: "apple_juice", category: "beverage", name: "عصير تفاح", nameEn: "Apple juice", searchTerms: ["عصير تفاح", "apple juice"], caloriesPer100g: 46, proteinPer100g: 0.1, carbsPer100g: 11.3, fatPer100g: 0.1, fiberPer100g: 0.2, servingGrams: 240 },
  { id: "soda_cola", category: "beverage", name: "مشروب غازي (كولا)", nameEn: "Cola soda", searchTerms: ["كولا", "مشروب غازي", "بيبسي", "كوكاكولا", "soda", "cola", "soft drink"], caloriesPer100g: 42, proteinPer100g: 0, carbsPer100g: 10.6, fatPer100g: 0, fiberPer100g: 0, servingGrams: 330 },

  // ===== زيوت ودهون — oils & fats =====
  { id: "olive_oil", category: "oil", name: "زيت زيتون", nameEn: "Olive oil", searchTerms: ["زيت زيتون", "olive oil"], caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, fiberPer100g: 0, servingGrams: 14 },
  { id: "vegetable_oil", category: "oil", name: "زيت نباتي", nameEn: "Vegetable oil", searchTerms: ["زيت نباتي", "زيت", "vegetable oil", "cooking oil"], caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, fiberPer100g: 0, servingGrams: 14 },
  { id: "ghee", category: "oil", name: "سمن", nameEn: "Ghee", searchTerms: ["سمن", "سمنة", "ghee", "clarified butter"], caloriesPer100g: 900, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, fiberPer100g: 0, servingGrams: 14 },

  // ===== أخرى شائعة — other =====
  { id: "honey", category: "other", name: "عسل", nameEn: "Honey", searchTerms: ["عسل", "honey"], caloriesPer100g: 304, proteinPer100g: 0.3, carbsPer100g: 82, fatPer100g: 0, fiberPer100g: 0.2, servingGrams: 21 },
];

export const CATEGORY_ORDER = ["egg", "poultry", "meat", "fish", "grain", "vegetable", "fruit", "legume", "dairy", "nut", "beverage", "oil", "other"];

// ترتيب أهمية المطابقة: تطابق كامل > بادئة > احتواء - نفس المبدأ الذي
// تعتمده أغلب محركات البحث البسيطة، حتى تظهر أدق نتيجة أولاً (بحث "بيض"
// يُظهر "بيض مسلوق" قبل أي نتيجة أخرى تحتوي كلمة "بيض" في مكان أعمق).
export function searchGenericFoods(normalizedQuery) {
  if (!normalizedQuery) return [];
  const scored = [];
  for (const food of GENERIC_FOODS) {
    const terms = [food.name, food.nameEn, ...food.searchTerms].map(normalizeSearchTerm);
    let score = -1;
    for (const term of terms) {
      if (term === normalizedQuery) score = Math.max(score, 3);
      else if (term.startsWith(normalizedQuery)) score = Math.max(score, 2);
      else if (term.includes(normalizedQuery)) score = Math.max(score, 1);
    }
    if (score >= 0) scored.push({ food, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.food);
}

// يحوّل عنصر generic-food إلى شكل "product" الموحّد الذي تتوقعه
// ConfirmQuantityCard (نفس حقول XxxPer100g التي تُنتجها normalizeProduct في
// nutrition.js) - بلا حاجة لأي تعديل في ذلك المكوّن. barcode مصطنع فريد
// (generic:<id>) لا يصطدم أبداً بباركود Open Food Facts حقيقي. sugar/sodium
// تبقى صفراً (غير مذكورة في مصدر البيانات هنا - لا اختراع قيمة غير معروفة
// فعلياً). micronutrientsPer100g تُؤخذ من حقل food.micronutrients أعلاه إن
// وُجد (تقدير USDA تقريبي لصنف محدَّد) وإلا كائن فارغ كما كان دائماً.
// origin: "generic" هو العلامة الوحيدة التي تُستخدم لاحقاً (ConfirmQuantityCard)
// لوسم أي فيتامين/معدن من هذا المصدر بـmicroApprox=true في سجل التغذية -
// تمييزاً عن بيانات حقيقية دقيقة من باركود Open Food Facts أو ملصق حقيقي.
export function genericFoodToProduct(food, isEn) {
  return {
    barcode: `generic:${food.id}`,
    name: isEn ? food.nameEn : food.name,
    brand: "",
    country: "",
    imageUrl: null,
    caloriesPer100g: food.caloriesPer100g,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
    fiberPer100g: food.fiberPer100g,
    sugarPer100g: 0,
    sodiumPer100gMg: 0,
    servingSizeLabel: null,
    servingGrams: food.servingGrams || null,
    micronutrientsPer100g: food.micronutrients || {},
    origin: "generic",
    category: food.category,
  };
}
