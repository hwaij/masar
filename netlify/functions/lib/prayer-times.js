// نسخة Node (CommonJS) من خوارزمية src/lib/prayer.js الفلكية - نفس الحساب
// حرفياً بلا أي تغيير منطقي (إحداثيات الكويت، زاوية الفجر 18.5°، فاصل
// العشاء 90 دقيقة). الفارق الجوهري الوحيد الضروري هنا: هذا الملف يعمل على
// خادم Netlify (توقيته الداخلي UTC افتراضياً)، لا في متصفح المستخدم (الذي
// غالباً على توقيت الكويت أصلاً بالفعل) - لذا "الآن"/"اليوم" هنا يُبنيان
// صراحة من إزاحة الكويت الثابتة (UTC+3، الكويت بلا توقيت صيفي) بدل
// الاعتماد على المنطقة الزمنية المحلية لجهاز الخادم، تفادياً لخطأ حقيقي
// بفارق يوم كامل قرب منتصف الليل لو اعتُمد توقيت الخادم كما هو.
const KUWAIT = { lat: 29.3759, lng: 47.9774, tz: 3 };
const PARAMS = { fajrAngle: 18.5, ishaInterval: 90, maghribOffset: 1 };
const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000;

const dtr = (d) => (d * Math.PI) / 180;
const rtd = (r) => (r * 180) / Math.PI;
const fixHour = (h) => ((h % 24) + 24) % 24;

function julianDate(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function fixAngle(a) { return ((a % 360) + 360) % 360; }

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

function timeForAngle(angle, decl, lat) {
  const t = (1 / 15) * rtd(Math.acos(
    (-Math.sin(dtr(angle)) - Math.sin(dtr(lat)) * Math.sin(dtr(decl))) /
    (Math.cos(dtr(lat)) * Math.cos(dtr(decl)))
  ));
  return t;
}

function fmtTime24(hours) {
  hours = fixHour(hours + 0.5 / 60);
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function to12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// year/month(1-12)/day بدل Date object - يُستدعى دائماً بقيم مُستخرَجة
// مسبقاً من توقيت الكويت الصريح (kuwaitNowParts أدناه)، لا Date محلي مباشر.
function prayerTimesForDate(year, month, day, loc = KUWAIT) {
  const jd = julianDate(year, month, day);
  const { lat, lng, tz } = loc;
  const lngDiff = lng / 15;
  const baseAdjust = tz - lngDiff;
  const sun = sunPosition(jd);
  const dhuhr = fixHour(12 - sun.equation) + baseAdjust;
  const sunriseT = timeForAngle(0.833, sun.declination, lat);
  const sunset = dhuhr + sunriseT;
  const sunrise = dhuhr - sunriseT;
  const fajrT = timeForAngle(PARAMS.fajrAngle, sun.declination, lat);
  const fajr = dhuhr - fajrT;
  const asrAngle = -rtd(Math.atan(1 / (1 + Math.tan(dtr(Math.abs(lat - sun.declination))))));
  const asrT = timeForAngle(asrAngle, sun.declination, lat);
  const asr = dhuhr + asrT;
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

function fivePrayersForDate(year, month, day, loc = KUWAIT) {
  const t = prayerTimesForDate(year, month, day, loc);
  return [
    { id: "fajr", time: t.fajr },
    { id: "dhuhr", time: t.dhuhr },
    { id: "asr", time: t.asr },
    { id: "maghrib", time: t.maghrib },
    { id: "isha", time: t.isha },
  ];
}

// الوقت الحالي الفعلي بتوقيت الكويت (بصرف النظر عن توقيت الخادم) - عبر
// UTC getters على طابع زمني مُزاح صراحة، لا getters محلية غير موثوقة على
// خادم قد يعمل بأي توقيت.
function kuwaitShiftedDate(nowMs = Date.now()) {
  return new Date(nowMs + KUWAIT_OFFSET_MS);
}
function partsFromShifted(shifted) {
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}
function kuwaitNowParts(nowMs = Date.now()) {
  return partsFromShifted(kuwaitShiftedDate(nowMs));
}

function todayDateKeyKuwait(nowMs = Date.now()) {
  const { year, month, day } = kuwaitNowParts(nowMs);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// صلوات اليوم الخمس بتوقيت الكويت الحالي فعلياً (لا حاجة لتمرير تاريخ -
// يحسبه داخلياً من الوقت الحقيقي للخادم مع التصحيح لتوقيت الكويت).
function todayFivePrayers(nowMs = Date.now()) {
  const { year, month, day } = kuwaitNowParts(nowMs);
  return fivePrayersForDate(year, month, day);
}

// الصلاة القادمة فعلياً الآن (بتوقيت الكويت) - إن مضت كل صلوات اليوم، تُعاد
// فجر الغد (بعلامة tomorrow:true) بنفس منطق src/lib/prayer.js الأصلي.
function nextPrayerNow(nowMs = Date.now()) {
  const parts = kuwaitNowParts(nowMs);
  const prayers = fivePrayersForDate(parts.year, parts.month, parts.day);
  const nowMin = parts.hours * 60 + parts.minutes;
  for (const p of prayers) {
    const [h, m] = p.time.split(":").map(Number);
    const pMin = h * 60 + m;
    if (pMin > nowMin) return { ...p, minutesUntil: pMin - nowMin, tomorrow: false };
  }
  const tomorrowShifted = new Date(kuwaitShiftedDate(nowMs).getTime() + 24 * 60 * 60 * 1000);
  const tomorrowParts = partsFromShifted(tomorrowShifted);
  const fajrTomorrow = fivePrayersForDate(tomorrowParts.year, tomorrowParts.month, tomorrowParts.day)[0];
  const [h, m] = fajrTomorrow.time.split(":").map(Number);
  const minsUntil = (24 * 60 - nowMin) + (h * 60 + m);
  return { ...fajrTomorrow, minutesUntil: minsUntil, tomorrow: true };
}

module.exports = {
  KUWAIT,
  to12h,
  prayerTimesForDate,
  fivePrayersForDate,
  kuwaitNowParts,
  todayDateKeyKuwait,
  todayFivePrayers,
  nextPrayerNow,
};
