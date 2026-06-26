// ============================================================
// محرك حساب أوقات الصلاة (حساب فلكي داخلي، يعمل بدون إنترنت)
// طريقة أم القرى المعتمدة في الخليج
// إحداثيات مدينة الكويت: 29.3759 شمالاً، 47.9774 شرقاً، التوقيت +3
// ============================================================

const KUWAIT = { lat: 29.3759, lng: 47.9774, tz: 3 };

// طريقة أم القرى: الفجر زاوية 18.5 تحت الأفق، العشاء 90 دقيقة بعد المغرب
const PARAMS = { fajrAngle: 18.5, ishaInterval: 90, maghribOffset: 1 };

const dtr = (d) => (d * Math.PI) / 180;
const rtd = (r) => (r * 180) / Math.PI;
const fixHour = (h) => ((h % 24) + 24) % 24;

// المعادلات الفلكية (حساب موضع الشمس)
function julianDate(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(dtr(g)) + 0.020 * Math.sin(dtr(2 * g)));
  const e = 23.439 - 0.00000036 * D;
  const RA = rtd(Math.atan2(Math.cos(dtr(e)) * Math.sin(dtr(L)), Math.cos(dtr(L)))) / 15;
  const eqt = q / 15 - fixHour(RA);
  const decl = rtd(Math.asin(Math.sin(dtr(e)) * Math.sin(dtr(L))));
  return { declination: decl, equation: eqt };
}

function fixAngle(a) { return ((a % 360) + 360) % 360; }

// حساب زاوية الوقت لارتفاع شمس معيّن
function timeForAngle(angle, decl, lat) {
  const t = (1 / 15) * rtd(Math.acos(
    (-Math.sin(dtr(angle)) - Math.sin(dtr(lat)) * Math.sin(dtr(decl))) /
    (Math.cos(dtr(lat)) * Math.cos(dtr(decl)))
  ));
  return t;
}

// الوقت الأساسي للظهر (الزوال)
function midDay(jd, lng, tz) {
  const { equation } = sunPosition(jd);
  return fixHour(12 - equation) ; // بالتوقيت الشمسي المحلي قبل تصحيح خط الطول
}

// تحويل ساعة عشرية إلى نص HH:MM بصيغة إنجليزية 24 ساعة
function fmtTime24(hours) {
  hours = fixHour(hours + 0.5 / 60); // تقريب للدقيقة
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// تحويل لصيغة 12 ساعة مع AM/PM إنجليزي
export function to12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// الحساب الرئيسي: يعيد أوقات الصلوات الخمس لتاريخ معيّن في الكويت
export function prayerTimes(date = new Date(), loc = KUWAIT) {
  const jd = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const { lat, lng, tz } = loc;

  // تصحيح خط الطول والمنطقة الزمنية
  const lngDiff = lng / 15;
  const baseAdjust = tz - lngDiff;

  function computeAt(jdLocal, fn) {
    const sun = sunPosition(jdLocal);
    return fn(sun);
  }

  const sun = sunPosition(jd);
  const dhuhr = fixHour(12 - sun.equation) + baseAdjust + PARAMS.maghribOffset / 60 * 0; // الظهر

  // أوقات الشروق والغروب (ارتفاع 0.833 تحت بسبب الانكسار ونصف قطر الشمس)
  const sunriseT = timeForAngle(0.833, sun.declination, lat);
  const sunset = dhuhr + sunriseT;
  const sunrise = dhuhr - sunriseT;

  // الفجر
  const fajrT = timeForAngle(PARAMS.fajrAngle, sun.declination, lat);
  const fajr = dhuhr - fajrT;

  // العصر (مذهب الجمهور: ظل الشيء = طوله + ظل الزوال)
  const asrAngle = -rtd(Math.atan(1 / (1 + Math.tan(dtr(Math.abs(lat - sun.declination))))));
  const asrT = timeForAngle(asrAngle, sun.declination, lat);
  const asr = dhuhr + asrT;

  // المغرب = الغروب، العشاء = المغرب + 90 دقيقة (أم القرى)
  const maghrib = sunset;
  const isha = sunset + PARAMS.ishaInterval / 60;

  return {
    fajr: fmtTime24(fajr),
    sunrise: fmtTime24(sunrise),
    dhuhr: fmtTime24(dhuhr),
    asr: fmtTime24(asr),
    maghrib: fmtTime24(maghrib),
    isha: fmtTime24(isha),
  };
}

// قائمة الصلوات الخمس بأسمائها العربية وأوقاتها
export function fivePrayers(date = new Date()) {
  const t = prayerTimes(date);
  return [
    { id: "fajr", name: "الفجر", time: t.fajr },
    { id: "dhuhr", name: "الظهر", time: t.dhuhr },
    { id: "asr", name: "العصر", time: t.asr },
    { id: "maghrib", name: "المغرب", time: t.maghrib },
    { id: "isha", name: "العشاء", time: t.isha },
  ];
}

// إيجاد الصلاة القادمة والوقت المتبقي لها
export function nextPrayer(date = new Date()) {
  const prayers = fivePrayers(date);
  const nowMin = date.getHours() * 60 + date.getMinutes();
  for (const p of prayers) {
    const [h, m] = p.time.split(":").map(Number);
    const pMin = h * 60 + m;
    if (pMin > nowMin) {
      return { ...p, minutesUntil: pMin - nowMin };
    }
  }
  // بعد العشاء: التالي هو فجر الغد
  const tomorrow = new Date(date); tomorrow.setDate(tomorrow.getDate() + 1);
  const fajrTomorrow = fivePrayers(tomorrow)[0];
  const [h, m] = fajrTomorrow.time.split(":").map(Number);
  const minsUntil = (24 * 60 - nowMin) + (h * 60 + m);
  return { ...fajrTomorrow, minutesUntil: minsUntil, tomorrow: true };
}
