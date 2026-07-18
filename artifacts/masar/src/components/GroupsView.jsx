import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Users, Copy, UserPlus, LogOut, Trash2, Edit3, Check, X,
  Timer, Dumbbell, Crown, Loader2, Plus,
} from "lucide-react";
import { store } from "../lib/store";
import { todayKey, fmtHM } from "../lib/helpers";
import { S } from "./styles";

const GS = {
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #8A7BD1, #5FA8A0)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },

  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "var(--muted2)", marginBottom: 10 },

  groupChipsRow: { display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 },
  groupChip: { flexShrink: 0, border: "1px solid var(--border2)", borderRadius: 20, padding: "7px 14px", fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", background: "transparent", whiteSpace: "nowrap" },
  groupChipActive: { borderColor: "#8A7BD1", background: "rgba(138,123,209,0.14)", color: "#8A7BD1", fontWeight: 700 },

  groupHeadRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  groupNameRow: { display: "flex", alignItems: "center", gap: 8 },
  groupName: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700 },
  memberCount: { fontSize: 11.5, color: "var(--muted2)" },
  iconGhostBtn: { background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", padding: 4, display: "flex" },

  codeBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 14px", marginTop: 10 },
  codeBoxLabel: { fontSize: 11.5, color: "var(--muted2)", fontWeight: 700 },
  codeBoxValue: { fontSize: 26, fontWeight: 700, letterSpacing: 4, fontFamily: "monospace", color: "var(--gold)", direction: "ltr" },
  codeBoxHint: { fontSize: 11.5, color: "var(--muted2)", textAlign: "center", marginTop: 8, marginBottom: 4, lineHeight: 1.5 },
  copyBtn: { display: "flex", alignItems: "center", gap: 4, background: "rgba(138,123,209,0.12)", border: "1px solid rgba(138,123,209,0.35)", color: "#8A7BD1", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },
  joinByCodeBtn: { width: "100%", justifyContent: "center", background: "var(--surface-sunken)", color: "var(--ink)", border: "1px solid var(--border2)", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 },

  leaderList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 14 },
  leaderRow: { display: "flex", alignItems: "center", gap: 10, background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px" },
  leaderRowMe: { borderColor: "rgba(138,123,209,0.45)", background: "rgba(138,123,209,0.08)" },
  leaderRank: { fontFamily: "'Amiri', serif", fontSize: 15, fontWeight: 700, color: "var(--muted)", width: 18, textAlign: "center", flexShrink: 0 },
  leaderInfo: { flex: 1, minWidth: 0 },
  leaderName: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  meTag: { fontSize: 10, color: "#8A7BD1", fontWeight: 700, marginInlineStart: 5 },
  leaderStats: { display: "flex", gap: 10, marginTop: 3 },
  leaderStat: { display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--muted2)" },
  leaderStatDone: { color: "#5FA8A0", fontWeight: 700 },
  removeBtn: { background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 },

  actionsRow: { display: "flex", gap: 8, marginTop: 16 },
  dangerBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(209,123,95,0.1)", border: "1px solid rgba(209,123,95,0.3)", color: "#D17B5F", borderRadius: 10, padding: "9px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  createRow: { display: "flex", gap: 8, marginBottom: 10 },
  createInput: { flex: 1, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 12, padding: "10px 12px", color: "var(--ink)", fontSize: 13.5, fontFamily: "inherit" },
  createBtn: { background: "var(--gold)", color: "var(--on-accent)", border: "none", borderRadius: 12, padding: "0 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 },

  divider: { textAlign: "center", fontSize: 11.5, color: "var(--muted)", margin: "14px 0" },

  pendingOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  pendingCard: { background: "var(--panel)", border: "1px solid var(--border2)", borderRadius: 18, padding: "22px 18px", maxWidth: 340, width: "100%", textAlign: "center" },
  pendingTitle: { fontFamily: "'Amiri', serif", fontSize: 17, fontWeight: 700, marginBottom: 16 },
  pendingBtnRow: { display: "flex", gap: 8 },
};

function RankIcon({ rank }) {
  if (rank === 1) return <Crown size={14} color="#C9A24B" />;
  return <span style={GS.leaderRank}>{rank}</span>;
}

function joinErrorMessage(err) {
  return {
    GROUP_NOT_FOUND: "الكود المدخل غير صحيح، تأكد من كتابته بشكل صحيح",
    RPC_ERROR: "تعذّر التحقق الآن، حاول مرة أخرى بعد قليل",
    ALREADY_MEMBER: "أنت عضو في هذا الجروب مسبقاً",
    GROUP_FULL: "هذا الجروب وصل للحد الأقصى (10 أعضاء)",
    NEEDS_ACCOUNT: "سجّل الدخول أولاً",
  }[err.message] || "تعذّر الانضمام الآن";
}

export default function GroupsView({ showToast }) {
  const hasCloud = store.hasCloud;
  const [myGroups, setMyGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const [joining, setJoining] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [pendingInvite, setPendingInvite] = useState(null);
  const memberOwnersRef = useRef(new Set());

  const today = todayKey();

  const refreshGroups = useCallback(async () => {
    setLoadingGroups(true);
    const groups = await store.loadMyGroups();
    setMyGroups(groups);
    setLoadingGroups(false);
    return groups;
  }, []);

  useEffect(() => {
    if (!hasCloud) { setLoadingGroups(false); return; }
    refreshGroups().then((groups) => {
      if (groups.length > 0) setSelectedGroupId((prev) => prev || groups[0].id);
    });
  }, [hasCloud, refreshGroups]);

  const loadDetail = useCallback(async (groupId) => {
    if (!groupId) { setGroupDetail(null); return; }
    const detail = await store.loadGroupDetail(groupId, today);
    setGroupDetail(detail);
    memberOwnersRef.current = new Set(detail.map((m) => m.owner));
  }, [today]);

  useEffect(() => { loadDetail(selectedGroupId); }, [selectedGroupId, loadDetail]);

  // تحديث لحظي: نشترك مرة واحدة فقط، ونستخدم memberOwnersRef (محدَّثة مع كل
  // تحميل تفصيل) بدل الاعتماد على قيمة groupDetail وقت التسجيل — لتفادي
  // إعادة الاشتراك بقناة جديدة مع كل تغيّر في التفاصيل.
  useEffect(() => {
    if (!hasCloud) return;
    const unsubscribe = store.subscribeGroupStats((row) => {
      if (row.date !== today) return;
      if (!memberOwnersRef.current.has(row.owner)) return;
      setGroupDetail((prev) => (prev || []).map((m) => (
        m.owner === row.owner ? { ...m, studyMinutes: row.study_minutes || 0, workoutDone: !!row.workout_done } : m
      )));
    });
    return unsubscribe;
  }, [hasCloud, today]);

  async function handleCreate() {
    const name = newGroupName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const group = await store.createGroup(name);
      setNewGroupName("");
      const groups = await refreshGroups();
      setSelectedGroupId(group.id);
      showToast("تم إنشاء الجروب");
    } catch (err) {
      console.error("[GroupsView] createGroup failed:", err);
      showToast("تعذّر إنشاء الجروب الآن");
    } finally { setCreating(false); }
  }

  // تحويل تلقائي لأحرف صغيرة عند الكتابة (يتفادى مشاكل حساسية الأحرف)،
  // وtrim قبل الإرسال فعلياً (وليس أثناء الكتابة، حتى لا يمنع المستخدم من
  // كتابة الكود بشكل طبيعي). تستدعي get_group_by_invite_code نفسها فقط
  // لعرض اسم الجروب والتأكيد - نفس منطق التأكيد المستخدم سابقاً تماماً.
  async function handleCheckCode() {
    const code = manualCode.trim();
    if (!code || checkingCode) return;
    setCheckingCode(true);
    try {
      const group = await store.getGroupByInviteCode(code);
      if (group) {
        setPendingInvite({ id: group.id, name: group.name });
        setShowJoinByCode(false);
        setManualCode("");
      } else {
        showToast(joinErrorMessage({ message: "GROUP_NOT_FOUND" }));
      }
    } catch (err) {
      console.error("[GroupsView] getGroupByInviteCode failed:", err);
      showToast(joinErrorMessage(err));
    } finally { setCheckingCode(false); }
  }

  async function confirmPendingInvite() {
    if (!pendingInvite || joining) return;
    setJoining(true);
    try {
      await store.joinGroupById(pendingInvite.id);
      await refreshGroups();
      setSelectedGroupId(pendingInvite.id);
      showToast(`انضممت إلى ${pendingInvite.name}`);
    } catch (err) {
      console.error("[GroupsView] joinGroupById failed:", err);
      showToast(joinErrorMessage(err));
    } finally { setJoining(false); setPendingInvite(null); }
  }

  async function handleLeave(groupId) {
    if (!window.confirm("مغادرة الجروب؟")) return;
    try {
      await store.leaveGroup(groupId);
      const groups = await refreshGroups();
      setSelectedGroupId(groups[0]?.id || null);
      showToast("غادرت الجروب");
    } catch { showToast("تعذّر تنفيذ العملية الآن"); }
  }

  async function handleRemoveMember(groupId, memberOwner) {
    try {
      await store.removeGroupMember(groupId, memberOwner);
      loadDetail(groupId);
      showToast("تمت إزالة العضو");
    } catch { showToast("تعذّر تنفيذ العملية الآن"); }
  }

  async function handleDeleteGroup(groupId) {
    if (!window.confirm("حذف الجروب نهائياً لكل الأعضاء؟")) return;
    try {
      await store.deleteGroup(groupId);
      const groups = await refreshGroups();
      setSelectedGroupId(groups[0]?.id || null);
      showToast("تم حذف الجروب");
    } catch { showToast("تعذّر تنفيذ العملية الآن"); }
  }

  async function handleRename(groupId) {
    const name = renameValue.trim();
    if (!name) return;
    try {
      await store.renameGroup(groupId, name);
      setMyGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)));
      setRenaming(false);
      showToast("تم تحديث اسم الجروب");
    } catch { showToast("تعذّر تنفيذ العملية الآن"); }
  }

  function copyInviteCode(code) {
    navigator.clipboard?.writeText(code).then(
      () => showToast("تم نسخ الكود"),
      () => showToast("تعذّر النسخ، انسخه يدوياً"),
    );
  }

  if (!hasCloud) {
    return (
      <div style={S.view}>
        <div style={GS.hero}>
          <div style={GS.heroIcon}><Users size={22} color="#fff" /></div>
          <div>
            <div style={GS.heroTitle}>تحديات الأصدقاء</div>
            <div style={GS.heroSub}>تحدَّ أصدقاءك بساعات الدراسة وإنجاز الرياضة</div>
          </div>
        </div>
        <div style={S.setupCard}>
          <Users size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={S.setupText}>سجّل الدخول بحساب حقيقي أولاً لاستخدام تحديات الأصدقاء، فهذه ميزة تشارك بيانات بينك وبين أصدقائك.</div>
        </div>
      </div>
    );
  }

  const selectedGroup = myGroups.find((g) => g.id === selectedGroupId);
  const isOwner = selectedGroup && selectedGroup.owner === (groupDetail || []).find((m) => m.isMe)?.owner;
  const sortedMembers = groupDetail ? [...groupDetail].sort((a, b) => (b.studyMinutes - a.studyMinutes) || (Number(b.workoutDone) - Number(a.workoutDone))) : [];

  return (
    <div style={S.view}>
      <div style={GS.hero}>
        <div style={GS.heroIcon}><Users size={22} color="#fff" /></div>
        <div>
          <div style={GS.heroTitle}>تحديات الأصدقاء</div>
          <div style={GS.heroSub}>تحدَّ أصدقاءك بساعات الدراسة وإنجاز الرياضة</div>
        </div>
      </div>

      {pendingInvite && (
        <div style={GS.pendingOverlay} className="overlay-in">
          <div style={GS.pendingCard} className="modal-card-in">
            <div style={GS.pendingTitle}>انضمام لجروب "{pendingInvite.name}"؟</div>
            <div style={GS.pendingBtnRow}>
              <button onClick={() => setPendingInvite(null)} style={{ ...GS.dangerBtn, color: "var(--muted2)", background: "var(--surface-sunken)", borderColor: "var(--line)" }}>إلغاء</button>
              <button onClick={confirmPendingInvite} disabled={joining} style={{ ...GS.createBtn, flex: 1, justifyContent: "center", padding: "10px 0" }}>
                {joining ? <Loader2 size={14} className="spin" /> : "انضمام"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingGroups ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Loader2 size={22} className="spin" color="#8A7BD1" /></div>
      ) : myGroups.length === 0 ? (
        <div style={GS.card}>
          <div style={GS.cardTitle}>أنشئ جروبك الأول</div>
          <div style={GS.createRow}>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder="اسم الجروب، مثال: شلة الجامعة" style={GS.createInput} />
            <button onClick={handleCreate} disabled={creating || !newGroupName.trim()} style={GS.createBtn}>
              {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} إنشاء
            </button>
          </div>
          <div style={GS.divider}>— أو —</div>
          {showJoinByCode ? (
            <div style={GS.createRow}>
              <input value={manualCode} onChange={(e) => setManualCode(e.target.value.toLowerCase().replace(/\s/g, "").slice(0, 8))} onKeyDown={(e) => e.key === "Enter" && handleCheckCode()} placeholder="اكتب الكود هنا" style={{ ...GS.createInput, direction: "ltr", textAlign: "center", letterSpacing: 2, fontFamily: "monospace" }} autoFocus />
              <button onClick={handleCheckCode} disabled={checkingCode || !manualCode.trim()} style={GS.createBtn}>
                {checkingCode ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />} تحقق وانضم
              </button>
            </div>
          ) : (
            <button onClick={() => setShowJoinByCode(true)} style={GS.joinByCodeBtn}>
              <UserPlus size={14} /> الانضمام لجروب بكود
            </button>
          )}
        </div>
      ) : (
        <>
          {myGroups.length > 1 && (
            <div style={GS.groupChipsRow}>
              {myGroups.map((g) => (
                <button key={g.id} onClick={() => setSelectedGroupId(g.id)} style={{ ...GS.groupChip, ...(g.id === selectedGroupId ? GS.groupChipActive : {}) }}>{g.name}</button>
              ))}
            </div>
          )}

          {selectedGroup && (
            <div style={GS.card}>
              <div style={GS.groupHeadRow}>
                {renaming ? (
                  <div style={{ display: "flex", gap: 6, flex: 1 }}>
                    <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} style={{ ...GS.createInput }} autoFocus />
                    <button onClick={() => handleRename(selectedGroup.id)} style={GS.iconGhostBtn}><Check size={18} color="#5FA8A0" /></button>
                    <button onClick={() => setRenaming(false)} style={GS.iconGhostBtn}><X size={18} /></button>
                  </div>
                ) : (
                  <div style={GS.groupNameRow}>
                    <span style={GS.groupName}>{selectedGroup.name}</span>
                    {isOwner && (
                      <button onClick={() => { setRenaming(true); setRenameValue(selectedGroup.name); }} style={GS.iconGhostBtn}><Edit3 size={13} /></button>
                    )}
                  </div>
                )}
                <span style={GS.memberCount}>{(groupDetail || []).length}/10 أعضاء</span>
              </div>

              <div style={GS.codeBox}>
                <span style={GS.codeBoxLabel}>كود الجروب</span>
                <span style={GS.codeBoxValue}>{selectedGroup.inviteCode}</span>
                <button onClick={() => copyInviteCode(selectedGroup.inviteCode)} style={GS.copyBtn}><Copy size={12} /> نسخ الكود</button>
              </div>
              <div style={GS.codeBoxHint}>شارك هذا الكود مع أصدقائك ليدخلوه من قسم تحديات الأصدقاء</div>

              {groupDetail === null ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Loader2 size={18} className="spin" color="#8A7BD1" /></div>
              ) : (
                <div style={GS.leaderList} className="stagger-in">
                  {sortedMembers.map((m, i) => (
                    <div key={m.owner} style={{ ...GS.leaderRow, ...(m.isMe ? GS.leaderRowMe : {}) }}>
                      <RankIcon rank={i + 1} />
                      <div style={GS.leaderInfo}>
                        <span style={GS.leaderName}>{m.name || "عضو"}{m.isMe && <span style={GS.meTag}>أنت</span>}</span>
                        <div style={GS.leaderStats}>
                          <span style={GS.leaderStat}><Timer size={12} /> {fmtHM(m.studyMinutes)}</span>
                          <span style={{ ...GS.leaderStat, ...(m.workoutDone ? GS.leaderStatDone : {}) }}><Dumbbell size={12} /> {m.workoutDone ? "أنجز تمرين اليوم" : "لم يُنجز بعد"}</span>
                        </div>
                      </div>
                      {!m.isMe && isOwner && (
                        <button onClick={() => handleRemoveMember(selectedGroup.id, m.owner)} style={GS.removeBtn} title="إزالة من الجروب"><X size={15} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={GS.actionsRow}>
                <button onClick={() => handleLeave(selectedGroup.id)} style={{ ...GS.dangerBtn, color: "var(--muted2)", background: "var(--surface-sunken)", borderColor: "var(--line)" }}>
                  <LogOut size={13} /> مغادرة الجروب
                </button>
                {isOwner && (
                  <button onClick={() => handleDeleteGroup(selectedGroup.id)} style={GS.dangerBtn}><Trash2 size={13} /> حذف الجروب</button>
                )}
              </div>
            </div>
          )}

          <div style={GS.card}>
            <div style={GS.cardTitle}>إنشاء جروب جديد</div>
            <div style={GS.createRow}>
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder="اسم الجروب" style={GS.createInput} />
              <button onClick={handleCreate} disabled={creating || !newGroupName.trim()} style={GS.createBtn}>
                {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} إنشاء
              </button>
            </div>
            <div style={GS.divider}>— أو —</div>
            {showJoinByCode ? (
              <div style={GS.createRow}>
                <input value={manualCode} onChange={(e) => setManualCode(e.target.value.toLowerCase().replace(/\s/g, "").slice(0, 8))} onKeyDown={(e) => e.key === "Enter" && handleCheckCode()} placeholder="اكتب الكود هنا" style={{ ...GS.createInput, direction: "ltr", textAlign: "center", letterSpacing: 2, fontFamily: "monospace" }} autoFocus />
                <button onClick={handleCheckCode} disabled={checkingCode || !manualCode.trim()} style={GS.createBtn}>
                  {checkingCode ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />} تحقق وانضم
                </button>
              </div>
            ) : (
              <button onClick={() => setShowJoinByCode(true)} style={GS.joinByCodeBtn}>
                <UserPlus size={14} /> الانضمام لجروب بكود
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
