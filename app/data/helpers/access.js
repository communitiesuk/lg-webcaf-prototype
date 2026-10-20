// app/data/helpers/access.js
//
// Helpers for the "Access management" section (Figma page 209:751, v3). Three capabilities: see who
// has access (A01 hub + A02 audit trail + A03 review), invite people, and change/remove access.
// Session-only. Westborough Borough Council example data, exactly as drawn.
//
// Batch 1: the session model + A01 (hub), A02 (audit trail), A03/A04 (periodic review).

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function formatToday() {
  const d = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function roleLabel(role) {
  return { full: "Full access", collaborator: "Collaborator", approver: "Approver", assurer: "Assurer" }[role] || role;
}

// The drawn example state. Example data, not real.
function seedAccess() {
  return {
    people: [
      { id: "jo-hart", name: "Jo Hart", firstName: "Jo", role: "full", isCafLead: true, isCurrentUser: true, emailType: "council", email: "j.hart@westborough.gov.uk", lastActive: "today", hasAccount: true, canChange: true, outcomes: [] },
      { id: "marcus-webb", name: "Marcus Webb", firstName: "Marcus", role: "full", emailType: "council", email: "m.webb@westborough.gov.uk", lastActive: "3 days ago", hasAccount: true, canChange: true, outcomes: [] },
      // NOTE: the design is inconsistent — A01/A15/A18/A28 say Priya has "2 outcomes" while A14 lists
      // four (A3, A4, Northgate B2, B4). `outcomeCount` is the drawn count (2); `outcomes` is the A14
      // list. Reproduced as drawn and flagged.
      { id: "priya-shah", name: "Priya Shah", firstName: "Priya", role: "collaborator", emailType: "council", email: "priya.shah@westborough.gov.uk", lastActive: "today", hasAccount: true, canChange: true, outcomeCount: 2, outcomes: ["A3. Asset management", "A4. Supply chain", "Northgate Revenues and Benefits: B2", "Northgate Revenues and Benefits: B4"], outcomesDisplay: "Organisation assessment: A3, A4 · Northgate Revenues and Benefits: B2, B4" },
      { id: "a-mensah", name: "A Mensah", firstName: "A Mensah", role: "collaborator", emailType: "managed", email: "a.patel@novatech-services.co.uk", lastActive: "2 weeks ago", hasAccount: true, canChange: true, outcomeCount: 2, outcomes: [] },
      { id: "cllr-devlin", name: "Cllr M Devlin", role: "approver", roleTitle: "Cabinet Member for Resources", emailType: "none", hasAccount: false, canChange: true, outcomes: [] },
      { id: "k-osei", name: "K Osei, Bridewell", role: "assurer", assignedByMhclg: true, canChange: false, outcomes: [] },
    ],
    invitations: [
      { id: "inv-sam", name: "Sam Okoro", sent: "today", expires: "22 October", status: "pending" },
      { id: "inv-rbell", name: "R Bell", sent: "3 weeks ago", expires: "in 4 days", status: "pending", nearExpiry: true },
      { id: "inv-tnowak", name: "T Nowak", expired: "2 days ago", status: "expired" },
    ],
    auditTrail: [
      { date: "21 September 2026", event: "A Mensah accepted an invitation sent to a.patel@novatech-services.co.uk" },
      { date: "18 September 2026", event: "Jo Hart invited A Mensah as a Collaborator" },
      { date: "14 September 2026", event: "Priya Shah joined, recognised by council email domain" },
      { date: "2 September 2026", event: "MHCLG approved Jo Hart's registration, first claim on this council" },
    ],
    cafLeadId: "jo-hart",
    approver: { name: "Cllr M Devlin", role: "Cabinet Member for Resources", hasAccount: false },
    reviewDue: true,
  };
}

function ensureAccess(sessionData) {
  if (!sessionData.access) sessionData.access = seedAccess();
  return sessionData.access;
}

// Empty Access state for a brand-new, just-claimed council: only the signed-in person, with no
// other people, invitations or audit trail. The current user's name and email are filled in from
// the claim at access-granted (syncAccessCurrentUser in routes/claim.js).
// Changed in build, prototype, pending design sign-off.
function buildAccessEmpty() {
  return {
    people: [
      { id: "you", name: "", firstName: "", role: "full", isCurrentUser: true, emailType: "council", email: "", lastActive: "today", hasAccount: true, canChange: true, outcomes: [] },
    ],
    invitations: [],
    auditTrail: [],
    cafLeadId: "",
    approver: { name: "", role: "", hasAccount: false },
    reviewDue: false,
  };
}

function getPerson(access, id) {
  return (access.people || []).find((p) => p.id === id) || null;
}

// Append an audit entry (newest first). Event wording is composed to match the A02 example style
// (A02 only draws four example entries; new actions need generated lines).
function addAuditEntry(access, event) {
  if (!access.auditTrail) access.auditTrail = [];
  access.auditTrail.unshift({ date: formatToday(), event });
}

// People with real access (full / collaborator) — the set the review and last-person rule care about.
function accessHolders(access) {
  return (access.people || []).filter((p) => p.role === "full" || p.role === "collaborator");
}

// --- A01 hub -------------------------------------------------------------------------
// The detail line under each name, built to match the drawn text exactly.
function buildPersonDetail(p) {
  if (p.role === "assurer") return "Assurer · Assigned by MHCLG · Can read and comment";
  if (p.role === "approver") return "Approver · No account, details stored only";
  const parts = [];
  if (p.isCafLead) parts.push("CAF Lead");
  if (p.role === "full") parts.push("Full access");
  else if (p.role === "collaborator") parts.push(`Collaborator, ${p.outcomeCount != null ? p.outcomeCount : p.outcomes.length} outcomes`);
  if (p.emailType === "council") parts.push("Council email");
  else if (p.emailType === "managed") parts.push("Managed service, checked by MHCLG");
  if (p.lastActive) parts.push(`Active ${p.lastActive}`);
  return parts.join(" · ");
}

function buildPeopleRows(access) {
  return (access.people || []).map((p) => {
    const row = {
      key: { text: p.name },
      value: { text: buildPersonDetail(p) },
    };
    if (p.canChange) {
      row.actions = { items: [{ href: `/access/people/${p.id}/change`, text: "Change", visuallyHiddenText: `access for ${p.name}` }] };
    }
    return row;
  });
}

// --- A02 audit trail -----------------------------------------------------------------
function buildAuditRows(access) {
  return (access.auditTrail || []).map((e) => ({ key: { text: e.date }, value: { text: e.event } }));
}

// --- A03 review ----------------------------------------------------------------------
function buildReviewModel(access) {
  const items = accessHolders(access).map((p) => {
    let label = `${p.name} — `;
    if (p.isCafLead) label += "CAF Lead";
    else if (p.role === "full") label += "Full access";
    else label += "Collaborator";
    // A Mensah shows a last-active hint in the drawn example (the stale one).
    if (p.role === "collaborator" && p.lastActive && p.lastActive !== "today") label += `, last active ${p.lastActive}`;
    return { value: p.id, text: label, checked: !(p.lastActive === "2 weeks ago") };
  });
  return {
    items,
    approver: access.approver || {},
  };
}

// Apply the review: anyone with access not in `stillNeeded` is removed. Returns the removed names.
function applyReview(access, stillNeededIds) {
  const removed = [];
  const keep = [];
  accessHolders(access).forEach((p) => {
    if (stillNeededIds.indexOf(p.id) === -1) {
      removed.push(p.name);
    }
  });
  access.people = (access.people || []).filter((p) => {
    if (p.role !== "full" && p.role !== "collaborator") return true;
    return stillNeededIds.indexOf(p.id) !== -1;
  });
  removed.forEach((name) => addAuditEntry(access, `Jo Hart removed ${name}'s access in the access review`));
  access.reviewDue = false;
  return removed;
}

// --- A22–A25 CAF Lead ----------------------------------------------------------------
function currentUser(access) {
  return (access.people || []).find((p) => p.isCurrentUser) || null;
}

// A22 model: the current user ("Me, …") plus the people-with-access options for "someone else".
function buildCafLeadModel(access) {
  const me = currentUser(access);
  const others = (access.people || [])
    .filter((p) => (p.role === "full" || p.role === "collaborator") && !p.isCurrentUser)
    .map((p) => ({ value: p.id, text: `${p.name} — ${roleLabel(p.role)}` }));
  return { currentUserName: me ? me.name : "", innerItems: others };
}

// Set the CAF Lead. A Collaborator named as CAF Lead is given full access (as drawn).
function setCafLead(access, personId) {
  (access.people || []).forEach((p) => { p.isCafLead = false; });
  const person = getPerson(access, personId);
  if (!person) return null;
  person.isCafLead = true;
  access.cafLeadId = personId;
  if (person.role === "collaborator") {
    person.role = "full";
    person.outcomes = [];
    person.outcomeCount = undefined;
  }
  const me = currentUser(access);
  const by = me ? me.name : "Jo Hart";
  if (person.isCurrentUser) addAuditEntry(access, `${by} confirmed themselves as CAF Lead`);
  else addAuditEntry(access, `${by} named ${person.name} as CAF Lead`);
  return person;
}

// A25: decline being CAF Lead — clears the CAF Lead (Setup task 1 reopens).
function clearCafLead(access, declinerName) {
  (access.people || []).forEach((p) => { p.isCafLead = false; });
  access.cafLeadId = null;
  addAuditEntry(access, `${declinerName || "Marcus Webb"} declined being named CAF Lead`);
}

// --- A05–A09 invite journey ----------------------------------------------------------
const { selectedSystems } = require("./assurance");

const ORG_OUTCOMES = [
  { value: "A1", text: "A1. Governance" },
  { value: "A2", text: "A2. Risk management" },
  { value: "A3", text: "A3. Asset management" },
  { value: "A4", text: "A4. Supply chain" },
  { value: "D1", text: "D1. Response and recovery planning" },
  { value: "D2", text: "D2. Lessons learned" },
];
const SYSTEM_OUTCOMES = [
  { code: "B1", text: "B1. Service protection policies and processes" },
  { code: "B2", text: "B2. Identity and access control" },
  { code: "B3", text: "B3. Data security" },
  { code: "B4", text: "B4. System security" },
  { code: "B5", text: "B5. Resilient networks and systems" },
  { code: "B6", text: "B6. Staff awareness and training" },
  { code: "C1", text: "C1. Security monitoring" },
  { code: "C2", text: "C2. Proactive security event discovery" },
];

function ensureInvite(access) {
  if (!access.invite) {
    const first = "sys-northgate";
    access.invite = {
      name: "Sam Okoro",
      email: "s.okoro@westborough.gov.uk",
      role: "collaborator",
      // Drawn A06 pre-checks (A3, A4 + first system B2, B4).
      outcomes: ["A3", "A4", `${first}:B2`, `${first}:B4`],
    };
  }
  return access.invite;
}

// A06 checkbox groups (LIVE: organisation assessment + each selected system). First system expanded,
// the rest collapsed in a details, as drawn.
function buildOutcomeGroups(sessionData, selected) {
  const selSet = {};
  (selected || []).forEach((v) => { selSet[v] = true; });
  const groups = [
    {
      heading: "Organisation assessment",
      expanded: true,
      items: ORG_OUTCOMES.map((o) => ({ value: o.value, text: o.text, checked: !!selSet[o.value] })),
    },
  ];
  selectedSystems(sessionData).forEach((sys, i) => {
    groups.push({
      heading: sys.name,
      expanded: i === 0,
      items: SYSTEM_OUTCOMES.map((o) => {
        const v = `${sys.id}:${o.code}`;
        return { value: v, text: o.text, checked: !!selSet[v] };
      }),
    });
  });
  return groups;
}

function outcomeLabel(value) {
  if (value.indexOf(":") === -1) {
    const o = ORG_OUTCOMES.find((x) => x.value === value);
    return o ? o.text : value;
  }
  const code = value.split(":")[1];
  const o = SYSTEM_OUTCOMES.find((x) => x.code === code);
  return o ? o.text : value;
}

function roleVerb(role) {
  return { collaborator: "Work on specific outcomes", full: "Everything, the same as you", approver: "Approve the assessment plan" }[role] || role;
}

// Add the invitation to the pending list and the audit trail.
function addInvitation(access, invite) {
  const id = `inv-${(invite.name || "person").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  access.invitations = access.invitations || [];
  access.invitations.unshift({ id, name: invite.name, sent: "today", expires: "22 October", status: "pending" });
  addAuditEntry(access, `Jo Hart invited ${invite.name} as a ${roleLabel(invite.role)}`);
}

function getInvitation(access, id) {
  return (access.invitations || []).find((i) => i.id === id) || null;
}

// A30 — cancel an invitation.
function cancelInvitation(access, id) {
  const inv = getInvitation(access, id);
  access.invitations = (access.invitations || []).filter((i) => i.id !== id);
  if (inv) addAuditEntry(access, `Jo Hart cancelled the invitation to ${inv.name}`);
  return inv;
}

// A10 rows.
function buildInvitationRows(access) {
  return (access.invitations || []).map((inv) => {
    let value;
    let action;
    if (inv.status === "expired") {
      value = `Expired ${inv.expired}`;
      action = { href: `/access/invitations/${inv.id}/resend`, text: "Resend", visuallyHiddenText: `invitation to ${inv.name}` };
    } else {
      value = `Sent ${inv.sent} · Expires ${inv.expires}`;
      action = { href: `/access/invitations/${inv.id}/cancel`, text: inv.nearExpiry ? "Resend" : "Cancel", visuallyHiddenText: `invitation to ${inv.name}` };
    }
    return { key: { text: inv.name }, value: { text: value }, actions: { items: [action] } };
  });
}

// --- A14–A18, A21, A28 change / remove / transfer / reassign --------------------------
function fullAccessPeople(access) {
  return (access.people || []).filter((p) => p.role === "full");
}
function isOnlyFullAccess(access, id) {
  const fa = fullAccessPeople(access);
  return fa.length === 1 && fa[0].id === id;
}

// A14 — change role / outcomes.
function changeRole(access, id, newRole, outcomes) {
  const p = getPerson(access, id);
  if (!p) return;
  p.role = newRole;
  if (newRole === "collaborator") {
    if (outcomes && outcomes.length) { p.outcomes = outcomes; p.outcomeCount = outcomes.length; }
  } else {
    p.outcomes = [];
    p.outcomeCount = undefined;
  }
  addAuditEntry(access, `Jo Hart changed ${p.name}'s access`);
}

// Remove a person. HARD RULE: never remove the last full-access person (guarded by the routes).
function removePerson(access, id) {
  const p = getPerson(access, id);
  access.people = (access.people || []).filter((x) => x.id !== id);
  if (p) addAuditEntry(access, `Jo Hart removed ${p.name}'s access`);
  return p;
}

function promoteToFull(access, id) {
  const p = getPerson(access, id);
  if (!p) return;
  p.role = "full";
  p.outcomes = [];
  p.outcomeCount = undefined;
  addAuditEntry(access, `Jo Hart gave ${p.name} full access`);
}

// A17 — who should take over full access (people other than self + "someone new").
function buildTransferModel(access, selfId) {
  const items = (access.people || [])
    .filter((p) => (p.role === "full" || p.role === "collaborator") && p.id !== selfId)
    .map((p) => ({ value: p.id, text: p.role === "full" ? `${p.name} — full access already` : `${p.name} — ${roleLabel(p.role)}` }));
  items.push({ value: "new", text: "Someone who does not have access yet" });
  return { items };
}

// A28 — who takes over the removed person's outcomes.
function buildReassignModel(access) {
  const items = (access.people || [])
    .filter((p) => p.role === "full" || p.role === "collaborator")
    .map((p) => ({ value: p.id, text: `${p.name} — ${roleLabel(p.role)}` }));
  items.push({ value: "new", text: "Someone who does not have access yet" });
  items.push({ value: "unassigned", text: "Leave them unassigned for now" });
  return { items };
}

// A27 — record the no-account Approver's details.
function setApprover(access, name, role) {
  access.approver = { name, role, hasAccount: false };
  const person = (access.people || []).find((p) => p.role === "approver");
  if (person) { person.name = name; person.roleTitle = role; }
  addAuditEntry(access, `Jo Hart recorded ${name} as the Approver`);
}

// --- A29 Approver model (3 routes) ---------------------------------------------------
function buildApproverModel(access) {
  const withAccess = (access.people || [])
    .filter((p) => p.role === "full" || p.role === "collaborator")
    .map((p) => ({ value: p.id, text: `${p.name} — ${roleLabel(p.role)}` }));
  return { withAccess };
}

module.exports = {
  formatToday,
  roleLabel,
  seedAccess,
  buildAccessEmpty,
  ensureAccess,
  getPerson,
  addAuditEntry,
  accessHolders,
  currentUser,
  buildPersonDetail,
  buildPeopleRows,
  buildAuditRows,
  buildReviewModel,
  applyReview,
  buildCafLeadModel,
  setCafLead,
  clearCafLead,
  buildApproverModel,
  ensureInvite,
  buildOutcomeGroups,
  outcomeLabel,
  roleVerb,
  addInvitation,
  getInvitation,
  cancelInvitation,
  buildInvitationRows,
  setApprover,
  fullAccessPeople,
  isOnlyFullAccess,
  changeRole,
  removePerson,
  promoteToFull,
  buildTransferModel,
  buildReassignModel,
};
