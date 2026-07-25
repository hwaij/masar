import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Users, Copy, UserPlus, LogOut, Trash2, Edit3, Check, X,
  Timer, Dumbbell, Crown, Loader2, Plus, RefreshCw, Clock, Hash, Settings2,
} from "lucide-react";
import { store } from "../lib/store";
import { todayKey, fmtHM } from "../lib/helpers";
import { S } from "./styles";

const REACTION_EMOJIS = ["👍", "🔥", "👏"];

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

  activityBanner: { display: "flex", alignItems: "center", gap: 8, background: "rgba(95,168,160,0.1)", border: "1px solid rgba(95,168,160,0.3)", borderRadius: 12, padding: "10px 14px", fontSize: 12.5, color: "#5FA8A0", fontWeight: 600, marginBottom: 14 },

  reactionsRow: { display: "flex", gap: 5, marginTop: 6, alignItems: "center", flexWrap: "wrap" },
  reactionBtn: { display: "flex", alignItems: "center", gap: 3, background: "var(--surface-raised)", border: "1px solid var(--border2)", borderRadius: 20, padding: "3px 8px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "var(--muted2)" },
  reactionBtnSent: { background: "rgba(138,123,209,0.15)", borderColor: "rgba(138,123,209,0.45)" },
  reactionCount: { fontSize: 10.5, fontWeight: 700, color: "var(--muted2)" },

  inviteSettingsToggle: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: "none", color: "var(--muted2)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "6px 0", width: "100%" },
  inviteSettingsCard: { background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px", marginTop: 8 },
  inviteSettingsRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--muted2)", marginBottom: 8 },
  inviteSettingsInputRow: { display: "flex", gap: 8, marginBottom: 8, alignItems: "center" },
  inviteSettingsInput: { flex: 1, background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 10px", color: "var(--ink)", fontSize: 12.5, fontFamily: "inherit" },
  inviteSettingsLabel: { fontSize: 11, color: "var(--muted2)", minWidth: 70 },
  regenerateBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "rgba(209,123,95,0.08)", border: "1px solid rgba(209,123,95,0.25)", color: "#D17B5F", borderRadius: 10, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4 },
};

function RankIcon({ rank }) {
  if (rank === 1) return <Crown size={14} color="#C9A24B" />;
  return <span style={GS.leaderRank}>{rank}</span>;
}

function joinErrorMessage(err, t) {
  return {
    GROUP_NOT_FOUND: t("groups.errors.invalidCode"),
    RPC_ERROR: t("groups.errors.verifyFailed"),
    ALREADY_MEMBER: t("groups.errors.alreadyMember"),
    GROUP_FULL: t("groups.errors.groupFull"),
    NEEDS_ACCOUNT: t("groups.errors.signInFirst"),
    INVITE_EXPIRED: t("groups.errors.codeExpired"),
    INVITE_EXHAUSTED: t("groups.errors.codeLimitReached"),
  }[err.message] || t("groups.errors.joinFailed");
}

export default function GroupsView({ showToast }) {
  const { t, i18n } = useTranslation();
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
  const [activityPing, setActivityPing] = useState(null);
  const [showInviteSettings, setShowInviteSettings] = useState(false);
  const [maxUsesInput, setMaxUsesInput] = useState("");
  const [expiresDaysInput, setExpiresDaysInput] = useState("");
  const [savingInviteSettings, setSavingInviteSettings] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const memberOwnersRef = useRef(new Set());
  const memberNamesRef = useRef({});
  const pingTimerRef = useRef(null);

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
    memberNamesRef.current = Object.fromEntries(detail.map((m) => [m.owner, m.name || t("groups.memberFallback")]));
  }, [today, t]);

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

  // إشعار نشاط لحظي (بدء/انتهاء جلسة تركيز) - يظهر لبقية الأعضاء فقط (لا
  // إشعار عن نشاطي أنا)، ويختفي تلقائياً بعد دقيقة أو عند وصول حدث جديد.
  // اشتراك جديد لكل جروب مُختار (يُلغى ويُعاد عند تبديل الجروب المعروض).
  useEffect(() => {
    if (!hasCloud || !selectedGroupId) return;
    const unsubscribe = store.subscribeGroupActivity(selectedGroupId, (row) => {
      if (row.owner === (groupDetail || []).find((m) => m.isMe)?.owner) return;
      const name = memberNamesRef.current[row.owner] || t("groups.memberFallback");
      setActivityPing({ name, kind: row.kind, minutes: row.minutes });
      clearTimeout(pingTimerRef.current);
      pingTimerRef.current = setTimeout(() => setActivityPing(null), 60000);
    });
    return () => { unsubscribe(); clearTimeout(pingTimerRef.current); };
  }, [hasCloud, selectedGroupId]);

  async function handleReact(memberOwner, emoji) {
    const result = await store.sendGroupReaction(selectedGroupId, memberOwner, today, emoji);
    if (result.ok) loadDetail(selectedGroupId);
    else if (!result.alreadySent) showToast(t("groups.actionFailed"));
  }

  async function handleSaveInviteSettings(groupId) {
    setSavingInviteSettings(true);
    try {
      const maxUses = maxUsesInput.trim() ? Math.max(1, parseInt(maxUsesInput, 10) || 1) : null;
      const expiresInDays = expiresDaysInput.trim() ? Math.max(1, parseInt(expiresDaysInput, 10) || 1) : null;
      await store.updateGroupInviteSettings(groupId, { maxUses, expiresInDays });
      await refreshGroups();
      showToast(t("groups.inviteSettingsSaved"));
    } catch { showToast(t("groups.saveFailedNow")); }
    finally { setSavingInviteSettings(false); }
  }

  async function handleRegenerateCode(groupId) {
    if (!window.confirm(t("groups.confirmNewCode"))) return;
    setRegeneratingCode(true);
    try {
      await store.regenerateInviteCode(groupId);
      await refreshGroups();
      showToast(t("groups.newCodeCreated"));
    } catch { showToast(t("groups.newCodeFailed")); }
    finally { setRegeneratingCode(false); }
  }

  async function handleCreate() {
    const name = newGroupName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const group = await store.createGroup(name);
      setNewGroupName("");
      const groups = await refreshGroups();
      setSelectedGroupId(group.id);
      showToast(t("groups.groupCreated"));
    } catch (err) {
      console.error("[GroupsView] createGroup failed:", err);
      showToast(t("groups.groupCreateFailed"));
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
        showToast(joinErrorMessage({ message: "GROUP_NOT_FOUND" }, t));
      }
    } catch (err) {
      console.error("[GroupsView] getGroupByInviteCode failed:", err);
      showToast(joinErrorMessage(err, t));
    } finally { setCheckingCode(false); }
  }

  async function confirmPendingInvite() {
    if (!pendingInvite || joining) return;
    setJoining(true);
    try {
      await store.joinGroupById(pendingInvite.id);
      await refreshGroups();
      setSelectedGroupId(pendingInvite.id);
      showToast(t("groups.joined", { name: pendingInvite.name }));
    } catch (err) {
      console.error("[GroupsView] joinGroupById failed:", err);
      showToast(joinErrorMessage(err, t));
    } finally { setJoining(false); setPendingInvite(null); }
  }

  async function handleLeave(groupId) {
    if (!window.confirm(t("groups.confirmLeave"))) return;
    try {
      await store.leaveGroup(groupId);
      const groups = await refreshGroups();
      setSelectedGroupId(groups[0]?.id || null);
      showToast(t("groups.left"));
    } catch { showToast(t("groups.actionFailed")); }
  }

  async function handleRemoveMember(groupId, memberOwner) {
    try {
      await store.removeGroupMember(groupId, memberOwner);
      loadDetail(groupId);
      showToast(t("groups.memberRemoved"));
    } catch { showToast(t("groups.actionFailed")); }
  }

  async function handleDeleteGroup(groupId) {
    if (!window.confirm(t("groups.confirmDelete"))) return;
    try {
      await store.deleteGroup(groupId);
      const groups = await refreshGroups();
      setSelectedGroupId(groups[0]?.id || null);
      showToast(t("groups.groupDeleted"));
    } catch { showToast(t("groups.actionFailed")); }
  }

  async function handleRename(groupId) {
    const name = renameValue.trim();
    if (!name) return;
    try {
      await store.renameGroup(groupId, name);
      setMyGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)));
      setRenaming(false);
      showToast(t("groups.nameUpdated"));
    } catch { showToast(t("groups.actionFailed")); }
  }

  function copyInviteCode(code) {
    navigator.clipboard?.writeText(code).then(
      () => showToast(t("groups.codeCopied")),
      () => showToast(t("groups.copyFailed")),
    );
  }

  if (!hasCloud) {
    return (
      <div style={S.view}>
        <div style={GS.hero}>
          <div style={GS.heroIcon}><Users size={22} color="#fff" /></div>
          <div>
            <div style={GS.heroTitle}>{t("groups.heroTitle")}</div>
            <div style={GS.heroSub}>{t("groups.heroSub")}</div>
          </div>
        </div>
        <div style={S.setupCard}>
          <Users size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={S.setupText}>{t("groups.signInRequired")}</div>
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
          <div style={GS.heroTitle}>{t("groups.heroTitle")}</div>
          <div style={GS.heroSub}>{t("groups.heroSub")}</div>
        </div>
      </div>

      {activityPing && (
        <div style={GS.activityBanner} className="overlay-in">
          {activityPing.kind === "started"
            ? t("groups.startedSession", { name: activityPing.name, minutes: activityPing.minutes ? ` (${activityPing.minutes} ${t("common.units.minutes")})` : "" })
            : t("groups.finishedSession", { name: activityPing.name, minutes: activityPing.minutes || 0 })}
        </div>
      )}

      {pendingInvite && (
        <div style={GS.pendingOverlay} className="overlay-in">
          <div style={GS.pendingCard} className="modal-card-in">
            <div style={GS.pendingTitle}>{t("groups.joinGroupQuestion", { name: pendingInvite.name })}</div>
            <div style={GS.pendingBtnRow}>
              <button onClick={() => setPendingInvite(null)} style={{ ...GS.dangerBtn, color: "var(--muted2)", background: "var(--surface-sunken)", borderColor: "var(--line)" }}>{t("common.buttons.cancel")}</button>
              <button onClick={confirmPendingInvite} disabled={joining} style={{ ...GS.createBtn, flex: 1, justifyContent: "center", padding: "10px 0" }}>
                {joining ? <Loader2 size={14} className="spin" /> : t("groups.join")}
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingGroups ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Loader2 size={22} className="spin" color="#8A7BD1" /></div>
      ) : myGroups.length === 0 ? (
        <div style={GS.card}>
          <div style={GS.cardTitle}>{t("groups.createFirstGroup")}</div>
          <div style={GS.createRow}>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder={t("groups.groupNamePlaceholder")} style={GS.createInput} />
            <button onClick={handleCreate} disabled={creating || !newGroupName.trim()} style={GS.createBtn}>
              {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} {t("groups.create")}
            </button>
          </div>
          <div style={GS.divider}>{t("groups.orDivider")}</div>
          {showJoinByCode ? (
            <div style={GS.createRow}>
              <input value={manualCode} onChange={(e) => setManualCode(e.target.value.toLowerCase().replace(/\s/g, "").slice(0, 8))} onKeyDown={(e) => e.key === "Enter" && handleCheckCode()} placeholder={t("groups.codePlaceholder")} style={{ ...GS.createInput, direction: "ltr", textAlign: "center", letterSpacing: 2, fontFamily: "monospace" }} autoFocus />
              <button onClick={handleCheckCode} disabled={checkingCode || !manualCode.trim()} style={GS.createBtn}>
                {checkingCode ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />} {t("groups.verifyAndJoin")}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowJoinByCode(true)} style={GS.joinByCodeBtn}>
              <UserPlus size={14} /> {t("groups.joinWithCode")}
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
                <span style={GS.memberCount}>{t("groups.membersCount", { count: (groupDetail || []).length })}</span>
              </div>

              <div style={GS.codeBox}>
                <span style={GS.codeBoxLabel}>{t("groups.groupCode")}</span>
                <span style={GS.codeBoxValue}>{selectedGroup.inviteCode}</span>
                <button onClick={() => copyInviteCode(selectedGroup.inviteCode)} style={GS.copyBtn}><Copy size={12} /> {t("groups.copyCode")}</button>
              </div>
              <div style={GS.codeBoxHint}>{t("groups.shareCodeNote")}</div>

              {isOwner && (
                <>
                  <button onClick={() => setShowInviteSettings((v) => !v)} style={GS.inviteSettingsToggle}>
                    <Settings2 size={13} /> {showInviteSettings ? t("groups.hideInviteSettings") : t("groups.inviteSettings")}
                  </button>
                  {showInviteSettings && (
                    <div style={GS.inviteSettingsCard}>
                      <div style={GS.inviteSettingsRow}>
                        <span><Hash size={12} style={{ verticalAlign: "-1px" }} /> {t("groups.usage")}</span>
                        <span>{selectedGroup.inviteMaxUses ? t("groups.usageOf", { used: selectedGroup.inviteUsesCount || 0, max: selectedGroup.inviteMaxUses }) : t("groups.usageUnlimited", { used: selectedGroup.inviteUsesCount || 0 })}</span>
                      </div>
                      <div style={GS.inviteSettingsRow}>
                        <span><Clock size={12} style={{ verticalAlign: "-1px" }} /> {t("groups.expiry")}</span>
                        <span>{selectedGroup.inviteExpiresAt ? new Date(selectedGroup.inviteExpiresAt).toLocaleDateString(i18n.language === "en" ? "en-US" : "ar") : t("groups.noExpiry")}</span>
                      </div>
                      <div style={GS.inviteSettingsInputRow}>
                        <span style={GS.inviteSettingsLabel}>{t("groups.usageLimit")}</span>
                        <input type="number" min="1" value={maxUsesInput} onChange={(e) => setMaxUsesInput(e.target.value)} placeholder={t("groups.noLimitPlaceholder")} style={GS.inviteSettingsInput} />
                      </div>
                      <div style={GS.inviteSettingsInputRow}>
                        <span style={GS.inviteSettingsLabel}>{t("groups.expiresInDays")}</span>
                        <input type="number" min="1" value={expiresDaysInput} onChange={(e) => setExpiresDaysInput(e.target.value)} placeholder={t("groups.neverExpiresPlaceholder")} style={GS.inviteSettingsInput} />
                      </div>
                      <button onClick={() => handleSaveInviteSettings(selectedGroup.id)} disabled={savingInviteSettings} style={{ ...GS.createBtn, width: "100%", justifyContent: "center" }}>
                        {savingInviteSettings ? <Loader2 size={14} className="spin" /> : t("groups.saveSettings")}
                      </button>
                      <button onClick={() => handleRegenerateCode(selectedGroup.id)} disabled={regeneratingCode} style={GS.regenerateBtn}>
                        {regeneratingCode ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} {t("groups.generateNewCode")}
                      </button>
                    </div>
                  )}
                </>
              )}

              {groupDetail === null ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Loader2 size={18} className="spin" color="#8A7BD1" /></div>
              ) : (
                <div style={GS.leaderList} className="stagger-in responsive-card-list">
                  {sortedMembers.map((m, i) => (
                    <div key={m.owner} style={{ ...GS.leaderRow, ...(m.isMe ? GS.leaderRowMe : {}) }}>
                      <RankIcon rank={i + 1} />
                      <div style={GS.leaderInfo}>
                        <span style={GS.leaderName}>{m.name || t("groups.memberFallback")}{m.isMe && <span style={GS.meTag}>{t("groups.you")}</span>}</span>
                        <div style={GS.leaderStats}>
                          <span style={GS.leaderStat}><Timer size={12} /> {fmtHM(m.studyMinutes)}</span>
                          <span style={{ ...GS.leaderStat, ...(m.workoutDone ? GS.leaderStatDone : {}) }}><Dumbbell size={12} /> {m.workoutDone ? t("groups.workoutDoneToday") : t("groups.workoutNotDoneYet")}</span>
                        </div>
                        {!m.isMe && (
                          <div style={GS.reactionsRow}>
                            {REACTION_EMOJIS.map((emoji) => {
                              const sent = (m.reactions?.sentByMe || []).includes(emoji);
                              const count = m.reactions?.counts?.[emoji] || 0;
                              return (
                                <button key={emoji} onClick={() => handleReact(m.owner, emoji)} disabled={sent} style={{ ...GS.reactionBtn, ...(sent ? GS.reactionBtnSent : {}) }} title={sent ? t("groups.sentToday") : t("groups.sendReaction")}>
                                  {emoji}{count > 0 && <span style={GS.reactionCount}>{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {!m.isMe && isOwner && (
                        <button onClick={() => handleRemoveMember(selectedGroup.id, m.owner)} style={GS.removeBtn} title={t("groups.removeFromGroup")}><X size={15} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={GS.actionsRow}>
                <button onClick={() => handleLeave(selectedGroup.id)} style={{ ...GS.dangerBtn, color: "var(--muted2)", background: "var(--surface-sunken)", borderColor: "var(--line)" }}>
                  <LogOut size={13} /> {t("groups.leaveGroup")}
                </button>
                {isOwner && (
                  <button onClick={() => handleDeleteGroup(selectedGroup.id)} style={GS.dangerBtn}><Trash2 size={13} /> {t("groups.deleteGroup")}</button>
                )}
              </div>
            </div>
          )}

          <div style={GS.card}>
            <div style={GS.cardTitle}>{t("groups.createNewGroup")}</div>
            <div style={GS.createRow}>
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder={t("groups.groupNameShort")} style={GS.createInput} />
              <button onClick={handleCreate} disabled={creating || !newGroupName.trim()} style={GS.createBtn}>
                {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} {t("groups.create")}
              </button>
            </div>
            <div style={GS.divider}>{t("groups.orDivider")}</div>
            {showJoinByCode ? (
              <div style={GS.createRow}>
                <input value={manualCode} onChange={(e) => setManualCode(e.target.value.toLowerCase().replace(/\s/g, "").slice(0, 8))} onKeyDown={(e) => e.key === "Enter" && handleCheckCode()} placeholder={t("groups.codePlaceholder")} style={{ ...GS.createInput, direction: "ltr", textAlign: "center", letterSpacing: 2, fontFamily: "monospace" }} autoFocus />
                <button onClick={handleCheckCode} disabled={checkingCode || !manualCode.trim()} style={GS.createBtn}>
                  {checkingCode ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />} {t("groups.verifyAndJoin")}
                </button>
              </div>
            ) : (
              <button onClick={() => setShowJoinByCode(true)} style={GS.joinByCodeBtn}>
                <UserPlus size={14} /> {t("groups.joinWithCode")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
