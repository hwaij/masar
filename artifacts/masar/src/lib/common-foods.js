// قائمة "أطعمة شائعة" جاهزة للاختيار السريع بضغطة واحدة، بلا حاجة لمسح
// باركود أو بحث أو إدخال يدوي. القيم لكل 100غم تقديرية موثوقة (مراجع تغذية
// عامة معروفة)، لا بيانات دقيقة لمنتج تجاري بعينه - تماماً كمبدأ "تقديرية"
// المُتَّبَع أصلاً في DAILY_GUIDELINES/servingPresets داخل nutrition.js.
//
// مبدأ التوسع: كل عنصر أدناه سطر واحد مستقل بنفس الشكل تماماً - إضافة طعام
// شائع جديد لاحقاً = سطر واحد فقط هنا، بلا أي تعديل بنيوي في أي مكان آخر
// (لا في common-foods.js نفسه ولا في NutritionView.jsx الذي يقرأ هذه
// القائمة ديناميكياً بالكامل).
//
// category تُستخدم فقط للتجميع البصري في الواجهة (عنوان كل مجموعة يُترجَم
// عبر nutrition.commonFoodCategories.<category> في ar.json/en.json).
// searchTerms: مصفوفة نصوص بحث بالعربي والإنجليزي (بلا تشكيل) تُطابَق عبر
// normalizeSearchTerm من nutrition.js، حتى يعثر المستخدم على الطعام بسرعة
// بأي من اللغتين بغض النظر عن لغة الواجهة الحالية.
export const COMMON_FOODS = [
  // بروتينات — proteins
  { id: "egg", category: "protein", name: "بيض مسلوق", nameEn: "Boiled egg", searchTerms: ["بيض", "egg", "eggs"], caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, fiberPer100g: 0 },
  { id: "chicken_breast", category: "protein", name: "صدر دجاج مشوي", nameEn: "Grilled chicken breast", searchTerms: ["دجاج", "صدر دجاج", "chicken", "chicken breast"], caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0 },
  { id: "beef", category: "protein", name: "لحم بقري مطبوخ", nameEn: "Cooked beef", searchTerms: ["لحم", "لحم بقري", "beef", "meat"], caloriesPer100g: 250, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 15, fiberPer100g: 0 },
  { id: "fish", category: "protein", name: "سمك مشوي", nameEn: "Grilled fish", searchTerms: ["سمك", "fish"], caloriesPer100g: 105, proteinPer100g: 23, carbsPer100g: 0, fatPer100g: 1.2, fiberPer100g: 0 },
  { id: "tuna", category: "protein", name: "تونة (معلّبة بالماء)", nameEn: "Tuna (canned in water)", searchTerms: ["تونة", "tuna"], caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 1, fiberPer100g: 0 },
  // نشويات — starches
  { id: "rice", category: "starch", name: "أرز أبيض مطبوخ", nameEn: "Cooked white rice", searchTerms: ["أرز", "rice"], caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0.4 },
  { id: "bread", category: "starch", name: "خبز أبيض", nameEn: "White bread", searchTerms: ["خبز", "bread"], caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2, fiberPer100g: 2.7 },
  { id: "potato", category: "starch", name: "بطاطا مسلوقة", nameEn: "Boiled potato", searchTerms: ["بطاطا", "بطاطس", "potato"], caloriesPer100g: 87, proteinPer100g: 1.9, carbsPer100g: 20, fatPer100g: 0.1, fiberPer100g: 1.8 },
  { id: "pasta", category: "starch", name: "معكرونة مطبوخة", nameEn: "Cooked pasta", searchTerms: ["معكرونة", "باستا", "pasta"], caloriesPer100g: 131, proteinPer100g: 5, carbsPer100g: 25, fatPer100g: 1.1, fiberPer100g: 1.8 },
  { id: "oats", category: "starch", name: "شوفان", nameEn: "Oats", searchTerms: ["شوفان", "oats", "oatmeal"], caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66, fatPer100g: 6.9, fiberPer100g: 10.6 },
  // خضروات — vegetables
  { id: "cucumber", category: "vegetable", name: "خيار", nameEn: "Cucumber", searchTerms: ["خيار", "cucumber"], caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, fiberPer100g: 0.5 },
  { id: "tomato", category: "vegetable", name: "طماطم", nameEn: "Tomato", searchTerms: ["طماطم", "بندورة", "tomato"], caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, fiberPer100g: 1.2 },
  { id: "lettuce", category: "vegetable", name: "خس", nameEn: "Lettuce", searchTerms: ["خس", "lettuce"], caloriesPer100g: 15, proteinPer100g: 1.4, carbsPer100g: 2.9, fatPer100g: 0.2, fiberPer100g: 1.3 },
  { id: "carrot", category: "vegetable", name: "جزر", nameEn: "Carrot", searchTerms: ["جزر", "carrot"], caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2, fiberPer100g: 2.8 },
  { id: "onion", category: "vegetable", name: "بصل", nameEn: "Onion", searchTerms: ["بصل", "onion"], caloriesPer100g: 40, proteinPer100g: 1.1, carbsPer100g: 9.3, fatPer100g: 0.1, fiberPer100g: 1.7 },
  { id: "spinach", category: "vegetable", name: "سبانخ", nameEn: "Spinach", searchTerms: ["سبانخ", "spinach"], caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 2.2 },
  // فواكه — fruits
  { id: "apple", category: "fruit", name: "تفاح", nameEn: "Apple", searchTerms: ["تفاح", "apple"], caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, fiberPer100g: 2.4 },
  { id: "banana", category: "fruit", name: "موز", nameEn: "Banana", searchTerms: ["موز", "banana"], caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, fiberPer100g: 2.6 },
  { id: "orange", category: "fruit", name: "برتقال", nameEn: "Orange", searchTerms: ["برتقال", "orange"], caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1, fiberPer100g: 2.4 },
  { id: "grapes", category: "fruit", name: "عنب", nameEn: "Grapes", searchTerms: ["عنب", "grapes"], caloriesPer100g: 69, proteinPer100g: 0.7, carbsPer100g: 18, fatPer100g: 0.2, fiberPer100g: 0.9 },
  { id: "dates", category: "fruit", name: "تمر", nameEn: "Dates", searchTerms: ["تمر", "dates"], caloriesPer100g: 277, proteinPer100g: 1.8, carbsPer100g: 75, fatPer100g: 0.2, fiberPer100g: 6.7 },
  { id: "strawberry", category: "fruit", name: "فراولة", nameEn: "Strawberry", searchTerms: ["فراولة", "strawberry"], caloriesPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3, fiberPer100g: 2 },
  // ألبان — dairy
  { id: "milk", category: "dairy", name: "حليب كامل الدسم", nameEn: "Whole milk", searchTerms: ["حليب", "milk"], caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3, fiberPer100g: 0 },
  { id: "yogurt", category: "dairy", name: "زبادي", nameEn: "Yogurt", searchTerms: ["زبادي", "لبن زبادي", "yogurt"], caloriesPer100g: 61, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3, fiberPer100g: 0 },
  { id: "cheese", category: "dairy", name: "جبن", nameEn: "Cheese", searchTerms: ["جبن", "جبنة", "cheese"], caloriesPer100g: 402, proteinPer100g: 25, carbsPer100g: 1.3, fatPer100g: 33, fiberPer100g: 0 },
  // أخرى شائعة — other common items
  { id: "honey", category: "other", name: "عسل", nameEn: "Honey", searchTerms: ["عسل", "honey"], caloriesPer100g: 304, proteinPer100g: 0.3, carbsPer100g: 82, fatPer100g: 0, fiberPer100g: 0.2 },
  { id: "nuts", category: "other", name: "مكسرات", nameEn: "Nuts", searchTerms: ["مكسرات", "لوز", "جوز", "nuts", "almonds"], caloriesPer100g: 607, proteinPer100g: 20, carbsPer100g: 20, fatPer100g: 54, fiberPer100g: 8 },
  { id: "olive_oil", category: "other", name: "زيت زيتون", nameEn: "Olive oil", searchTerms: ["زيت زيتون", "olive oil"], caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, fiberPer100g: 0 },
];

// ترتيب المجموعات كما تُعرض في الواجهة - يجب أن يطابق كل مفتاح ترجمة
// nutrition.commonFoodCategories.<key> في ar.json/en.json.
export const COMMON_FOOD_CATEGORIES = ["protein", "starch", "vegetable", "fruit", "dairy", "other"];

// يحوّل عنصر common-food إلى شكل "product" الموحّد الذي تتوقعه
// ConfirmQuantityCard (نفس حقول XxxPer100g التي تُنتجها normalizeProduct في
// nutrition.js) - بلا حاجة لأي تعديل في ذلك المكوّن. barcode مصطنع فريد
// (common:<id>) لا يصطدم أبداً بباركود Open Food Facts حقيقي. sugar/sodium
// ومايكرونيوترينتس غير مذكورة في مصدر البيانات هنا فتبقى صفر/فارغة (لا
// اختراع قيمة غير معروفة فعلياً)، ونفس مبدأ "لا قيمة مخترعة" المتّبع في
// extractMicronutrients بملف nutrition.js.
export function commonFoodToProduct(food, isEn) {
  return {
    barcode: `common:${food.id}`,
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
    servingGrams: null,
    micronutrientsPer100g: {},
    origin: "common",
  };
}
