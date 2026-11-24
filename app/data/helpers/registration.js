// app/data/helpers/registration.js
//
// Claim v15 (CAF Lead nomination, D-2026-154): one registration per council. The person who registers
// is the claimant. Only the state is stored; which screen each person sees is worked out from it.
//
//   state              reached by                          claimant sees            council record
//   submitted          04 Confirm and register             06, then 18              none
//   not_approved       MHCLG rejects                       16                       none
//   approved_no_lead   MHCLG approves                      07 → 31                  none, nobody can open Setup
//   lead_is_claimant   31 "Me"                             37 → Setup S01           cafLead = claimant
//   invitation_sent    32, nominee at the council's domain 33, then 35              none until accepted
//   invitation_held    32, nominee at another domain       34                       none (check undefined, Q23)
//   lead_confirmed     nominee accepts (A24)               35 says accepted         cafLead = nominee
//   nominee_declined   nominee chooses A25                 36 → 31                  none
//
// The claimant has no access to the council record in any state except lead_is_claimant. Join
// requests made before a CAF Lead is in place are held, and listed on 30 when the CAF Lead first
// signs in (proposal, Q24). Stored at sessionData.registration, not in sessionData.claim, because it
// belongs to the council: signing out clears the person's claim journey but not the registration.

const { councilsForEmail } = require("../claim-example-data");
const { buildSetupSeedEmpty, buildDecideSeedEmpty } = require("../seed/setup");
const { buildAccessEmpty, setCafLead } = require("./access");

const LEAD_STATES = ["lead_is_claimant", "lead_confirmed"];

function todayLabel() {
  return require("./notify").todayLabel();
}

function getRegistration(sessionData) {
  return (sessionData && sessionData.registration) || null;
}

function leadInPlace(reg) {
  return Boolean(reg && LEAD_STATES.indexOf(reg.state) !== -1);
}

// 04 "Confirm and register" (also 11 and 24 for a first registrant).
function startRegistration(sessionData, claim) {
  const person = claim.person || {};
  sessionData.registration = {
    state: "submitted",
    council: Object.assign({}, claim.council || {}),
    claimant: { name: person.fullName || "", jobTitle: person.jobTitle || "", email: claim.oneLoginEmail || "" },
    registeredOn: todayLabel(),
    nominee: null,
    requests: [],
  };
  return sessionData.registration;
}

// Where the claimant lands for each state (06 only straight after registering; 18 after that).
function claimantLanding(reg) {
  switch (reg && reg.state) {
    case "submitted": return "/claim/still-checking"; // 18
    case "not_approved": return "/claim/not-approved"; // 16
    case "approved_no_lead": return "/claim/access-granted"; // 07 → 31
    case "lead_is_claimant": return "/dashboard";
    case "invitation_sent": return "/claim/caf-lead/waiting"; // 35
    case "invitation_held": return "/claim/caf-lead/check"; // 34
    case "lead_confirmed": return "/claim/caf-lead/waiting"; // 35, says accepted
    case "nominee_declined": return "/claim/caf-lead/declined"; // 36
    default: return "/claim";
  }
}

function emailDomainMatchesCouncil(email, councilId) {
  return Boolean(councilId) && councilsForEmail(email).indexOf(councilId) !== -1;
}

function sameEmail(a, b) {
  return (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase() && Boolean(a);
}

// The council record, created only when a CAF Lead is in place (37 "Me", or the nominee accepts on
// A24). The CAF Lead is the only person in it; Setup opens with task 1 Completed.
function createCouncilRecord(sessionData, lead) {
  sessionData.setup = buildSetupSeedEmpty();
  sessionData.decide = buildDecideSeedEmpty();
  sessionData.access = buildAccessEmpty();
  const me = sessionData.access.people[0];
  me.name = lead.name;
  me.firstName = (lead.name || "").split(" ")[0];
  me.email = lead.email || "";
  setCafLead(sessionData.access, me.id);
  sessionData.access.auditTrail = [];
  require("./setup").ensureSetup(sessionData); // council name and type from the claim
  sessionData.setup.people.cafLead = { name: lead.name, confirmed: true };
}

function removeCouncilRecord(sessionData) {
  delete sessionData.setup;
  delete sessionData.decide;
  delete sessionData.access;
}

// Join requests: held until a CAF Lead is in place, then listed on 30. One per email address.
function addRequest(reg, person) {
  if (!reg) return null;
  reg.requests = reg.requests || [];
  const existing = reg.requests.find((r) => sameEmail(r.email, person.email));
  if (existing) {
    Object.assign(existing, { name: person.name || existing.name, jobTitle: person.jobTitle || existing.jobTitle });
    return existing;
  }
  const request = {
    id: "req-" + (reg.requests.length + 1),
    name: person.name || "",
    jobTitle: person.jobTitle || "",
    email: person.email || "",
    requestedOn: todayLabel(),
    status: "waiting",
  };
  reg.requests.push(request);
  return request;
}

function waitingRequests(reg) {
  return ((reg && reg.requests) || []).filter((r) => r.status === "waiting");
}

module.exports = {
  LEAD_STATES,
  getRegistration,
  leadInPlace,
  startRegistration,
  claimantLanding,
  emailDomainMatchesCouncil,
  sameEmail,
  createCouncilRecord,
  removeCouncilRecord,
  addRequest,
  waitingRequests,
};
