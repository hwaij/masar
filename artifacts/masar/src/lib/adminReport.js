// عميل بسيط لدالة netlify/functions/admin-report.js - لا يحوي بريد المالك
// المصرَّح ولا أي منطق تحقق هوية هنا إطلاقاً (يبقى ذلك حصراً على الخادم)؛
// هذا الملف فقط يرسل توكن جلسة المستخدم الحالي ويُرجع ما يقرره الخادم.
// نفس نمط lib/gemini.js تماماً (getSession -> access_token -> Authorization
// Bearer)، بلا أي تخزين محلي للنتيجة (isAdmin يُعاد فحصه من الخادم في كل
// مرة، لا كاش قد يبقى صحيحاً خطأً بعد تغيّر شيء ما).
import { supabase, hasSupabase } from "./supabase";

const ADMIN_REPORT_URL = "/.netlify/functions/admin-report";

async function getAccessToken() {
  if (!hasSupabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

// يُستخدَم فقط لتقرير ما إذا كانت الواجهة تُظهر مدخل الشاشة الإدارية أم لا -
// قرار عرض بحت (UX)، لا الحماية الفعلية (تلك تعيد التحقق بشكل مستقل داخل
// admin-report.js نفسها عند mode=search بصرف النظر عن نتيجة هذا الاستدعاء).
export async function checkIsAdmin() {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${ADMIN_REPORT_URL}?mode=check`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.isAdmin;
  } catch {
    return false;
  }
}

async function callAdminReport(params) {
  const token = await getAccessToken();
  if (!token) throw new Error("NOT_SIGNED_IN");
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${ADMIN_REPORT_URL}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(data?.error || "UNKNOWN");
    err.status = res.status;
    throw err;
  }
  return data;
}

// اقتراحات فورية أثناء الكتابة (بداية الرقم الجامعي أو احتواء بجزء من
// الاسم) - يُرجع [] بصمت عند الفشل بدل رمي خطأ، لأن هذا استدعاء خلفي متكرر
// أثناء الكتابة (debounced في الواجهة) لا يستحق رسالة خطأ مزعجة في كل مرة.
export async function suggestStudents(query) {
  try {
    const data = await callAdminReport({ mode: "suggest", q: query });
    return data?.suggestions || [];
  } catch {
    return [];
  }
}

// السجل الغذائي الكامل لطالب محدَّد بمعرّف حسابه (owner، من نتيجة
// suggestStudents أعلاه) - range اختياري { from, to } بصيغة YYYY-MM-DD.
// يرمي خطأ عند الرفض/الفشل بدل إرجاع قيمة صامتة - الشاشة نفسها تعرض الرسالة
// المناسبة (رُفض الوصول/تعذّر الجلب) بدل التعامل مع نتيجة غامضة.
export async function fetchStudentReport(owner, range = {}) {
  const params = { mode: "report", owner };
  if (range.from) params.from = range.from;
  if (range.to) params.to = range.to;
  return callAdminReport(params);
}

// نظرة عامة على كل الطلاب (ذوي رقم جامعي مسجَّل) ليوم واحد محدَّد (YYYY-MM-DD) -
// استعلام واحد مجمَّع من الخادم (راجع mode=overview في admin-report.js)،
// لا نداء منفصل لكل طالب.
export async function fetchOverview(date) {
  return callAdminReport({ mode: "overview", date });
}
