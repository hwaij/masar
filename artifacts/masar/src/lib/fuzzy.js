// مطابقة تقريبية خفيفة الوزن (بلا مكتبة خارجية) لالتقاط أخطاء إملائية
// شائعة في نص البحث (حرف مفقود/زائد/مستبدل، مثل "دجاذ" بدل "دجاج") - تُستخدم
// فقط كطبقة ثانية بعد فشل المطابقة المباشرة (substring/exact)، لا بديلاً
// عنها - راجع findFuzzyFoodSuggestions في nutrition.js لكيفية استخدامها
// ضمن مسار البحث الكامل.

// مسافة Levenshtein الكلاسيكية (عدد التعديلات الأدنى: إدراج/حذف/استبدال
// حرف لتحويل a إلى b) بمصفوفة صفّين متبادلة (O(n) ذاكرة بدل O(m×n)) - كافية
// تماماً لأسماء أطعمة قصيرة، لا حاجة لخوارزمية أثقل.
export function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// يبحث عن أقرب مرشّحات نصية لاستعلام معيّن. الحد الأقصى لمسافة التعديل
// المقبولة نسبي لطول الكلمة (كلمة قصيرة تتحمل خطأ حرف واحد فقط، الأطول
// تتحمل اثنين أو ثلاثة) - حتى لا تُقترَح تصحيحات بعيدة المعنى لكلمة قصيرة.
// يتجاهل عمداً أي مرشّح يطابق أصلاً بالاحتواء (substring) في أي الاتجاهين -
// تلك ليست أخطاء إملائية، الطبقة السريعة (بحث مباشر) تتكفّل بها فعلاً.
export function findFuzzyMatches(query, candidates, maxResults = 3) {
  if (!query || query.length < 2) return [];
  const maxDistance = query.length <= 4 ? 1 : query.length <= 8 ? 2 : 3;
  const scored = [];
  const seenText = new Set();
  for (const c of candidates) {
    const text = (c.text || "").trim();
    if (!text || seenText.has(text)) continue;
    if (text === query || text.includes(query) || query.includes(text)) continue;
    const dist = levenshteinDistance(query, text);
    if (dist > 0 && dist <= maxDistance) {
      seenText.add(text);
      scored.push({ ...c, distance: dist });
    }
  }
  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, maxResults);
}
