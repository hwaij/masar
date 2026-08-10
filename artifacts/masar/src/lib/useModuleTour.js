import { useState, useRef, useEffect, useCallback } from "react";
import { store } from "./store";

// خطاف عام لأي "جولة سياقية" لقسم واحد (تغذية/مهام/أهداف/رياضة/...):
// تبدأ تلقائياً أول مرة يُفتح فيها القسم طالما لم تكتمل من قبل، وتُحفَظ
// حالة اكتمالها في نفس عمود tour_progress.modules.<name>.done المشترك بين
// كل الجولات السياقية (راجع NutritionView.jsx للنمط الأصلي الذي استُخرج
// منه هذا الخطاف). كل قسم لا يزال يحتاج مراقبة حالته الخاصة (عدد المهام/
// الأهداف/الرسائل...) بمنطقه الخاص - هذا الخطاف يكفّل فقط الجزء المشترك:
// "ابدأ مرة واحدة" و"احفظ الاكتمال".
export function useModuleTour(moduleName, profile, setProfile, { active = true } = {}) {
  const done = !!profile?.tourProgress?.modules?.[moduleName]?.done;
  const [step, setStep] = useState(0); // 0 = غير نشطة
  const startedRef = useRef(false);

  useEffect(() => {
    if (active && !done && !startedRef.current) {
      startedRef.current = true;
      setStep(1);
    }
  }, [active, done]);

  const finish = useCallback(() => {
    setStep(0);
    setProfile((p) => ({ ...p, tourProgress: { ...p.tourProgress, modules: { ...(p.tourProgress?.modules || {}), [moduleName]: { done: true } } } }));
    store.saveTourProgress({ modules: { [moduleName]: { done: true } } });
  }, [moduleName, setProfile]);

  return { step, setStep, finish, done };
}
