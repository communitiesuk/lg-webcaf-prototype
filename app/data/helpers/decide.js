// app/data/helpers/decide.js
//
// Helpers for the "Decide what to assess" (Decide v6) prototype section.
// Owns Decide's chrome (council / assurer / approver variants) and its session state
// (req.session.data.decide). Reads systems/criticality/CNI/assessed-before from the
// Setup model (req.session.data.setup). Kept isolated: chrome is painted via res.locals.

const { buildDecideSeedEmpty } = require("../seed/setup");
const {
  ensureSetup,
  SETUP_USER,
  signedInSetupUser,
  SETUP_SERVICE_NAME,
  HOLDING_HREF,
  getSystem,
  deriveCriticality,
} = require("./setup");

// Ensure both Setup and Decide session state exist (idempotent). Both start empty; the example
// council's Decide choices are only loaded explicitly by a research starting point
// (routes/beta.js loadExampleCouncil).
function ensureDecide(sessionData) {
  if (!sessionData) return null;
  ensureSetup(sessionData);
  if (!sessionData.decide || !sessionData.decide.seeded) {
    sessionData.decide = buildDecideSeedEmpty();
  }
  return sessionData.decide;
}

// Council service navigation for Decide — "Assessments" is the active section.
function buildDecideCouncilNavigation(currentPath) {
  const active = typeof currentPath === "string" && currentPath.startsWith("/decide");
  return [
    { text: "Dashboard", href: "/dashboard" },
    { text: "Your council", href: "/setup/task-list" },
    { text: "Assessments", href: "/decide", active },
    { text: "People", href: "/access" },
    // "Switch council" removed from nav — one council per person for now (pending multi-council).
    // Changed in build, prototype, pending design sign-off.
    { text: "Sign out", href: "/get-started/sign-out" },
  ];
}

// Assurer / approver "signed in, no council" navigation — only Sign out.
function buildMinimalNavigation() {
  return [{ text: "Sign out", href: "/get-started/sign-out" }];
}

// Council chrome (most Decide screens).
function applyDecideChrome(req, res) {
  res.locals.serviceName = SETUP_SERVICE_NAME;
  res.locals.showNavigation = true;
  // The signed-in person and their registered council (as Setup does); the example persona only
  // when no one has signed in (the example-council starting points).
  res.locals.currentUser = signedInSetupUser(req) || SETUP_USER;
  res.locals.navigation = buildDecideCouncilNavigation(req.path);
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
}

// Assurer / approver chrome — no council identity shown, only Sign out.
function applyDecideMinimalChrome(req, res) {
  res.locals.serviceName = SETUP_SERVICE_NAME;
  res.locals.showNavigation = true;
  res.locals.currentUser = null;
  res.locals.navigation = buildMinimalNavigation();
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
}

// --- Entry rules ----------------------------------------------------------------------

// S03 records a CNI sector as a dropdown value. "none" (explicitly chosen) and "" (not answered)
// both mean no CNI sector, so the CNI screens (D23-D26a) are skipped.
function isCniFlaggedInSetup(setup) {
  const cni = setup && setup.councilContext && setup.councilContext.cni;
  return Boolean(cni && cni !== "none");
}

// The CNI screens only make sense when the council chose a CNI sector AND has critical systems.
function showCniScreens(setup) {
  return isCniFlaggedInSetup(setup) && (setup.criticalSystems || []).length > 0;
}

// Decide needs a named Approver (confirmed, or invited and awaiting acceptance) — the same rule
// S30 uses to finish setup. Without one, the plan has nobody to approve it.
function hasApprover(setup) {
  const a = (setup && setup.people && setup.people.approver) || {};
  return Boolean(a.name && (a.confirmed || a.pending));
}

function hasAssurer(setup) {
  return Boolean(setup && setup.assurer && setup.assurer.assigned && setup.assurer.name);
}

function assurerLine(setup) {
  if (!hasAssurer(setup)) return "";
  return [setup.assurer.name, setup.assurer.organisation].filter(Boolean).join(", ");
}

function orgIncluded(setup) {
  return !(setup.organisationAssessment && setup.organisationAssessment.doneBefore);
}

// Today as "9 November 2026" — used when the Approver approves or returns the plan in service.
function formatToday() {
  const d = new Date();
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
}

// "Assessed March 2025" if Setup holds a date, otherwise "Assessed before". Never invented.
function assessedLabel(system) {
  return system.assessedDate ? "Assessed " + system.assessedDate : "Assessed before";
}

// --- CNI helpers (Batch 1) ----------------------------------------------------------

function cniSystems(setup) {
  return (setup.criticalSystems || []).filter((s) => s.cni);
}

function nonCniSystems(setup) {
  return (setup.criticalSystems || []).filter((s) => !s.cni);
}

// --- System selection helpers (Batch 2: D02 / D22 / D15 / D19 / D20) ----------------

// Criticality tiers, most critical first; unrated ("") sorts last.
const CRITICALITY_RANK = {
  "Mission critical": 1,
  "Business critical": 2,
  "Business supporting": 3,
  "Non-critical": 4,
  "": 5,
};

// Systems that have NOT been assessed in a previous cycle — candidates for this cycle.
function assessableSystems(setup) {
  return (setup.criticalSystems || []).filter((s) => s.assessedBefore !== "yes");
}

// Systems already assessed in a previous cycle — the read-only "Already assessed" list.
function alreadyAssessedSystems(setup) {
  return (setup.criticalSystems || []).filter((s) => s.assessedBefore === "yes");
}

// True if any in-scope (assessable) system has no impact rating yet (drives the D22 variant).
function hasUnratedInScope(setup) {
  return assessableSystems(setup).some((s) => !deriveCriticality(s.impact));
}

// Rank the assessable systems: criticality tier first (Mission > Business critical >
// Business supporting > Non-critical > unrated); within a tier, CNI first; otherwise
// stable by directory order. PROPOSAL ranking rule per Decide v6 D02.
function rankAssessableSystems(setup) {
  return assessableSystems(setup)
    .map((system, idx) => ({ system, idx }))
    .sort((a, b) => {
      const ra = CRITICALITY_RANK[deriveCriticality(a.system.impact)] || 5;
      const rb = CRITICALITY_RANK[deriveCriticality(b.system.impact)] || 5;
      if (ra !== rb) return ra - rb;
      const ca = a.system.cni ? 0 : 1;
      const cb = b.system.cni ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return a.idx - b.idx;
    })
    .map((x) => x.system);
}

// Checkbox rows for D02/D22: { id, name, criticalityLabel, rated, checked }.
function buildSystemChoiceRows(setup, selectedIds) {
  const selected = selectedIds || [];
  return rankAssessableSystems(setup).map((s) => {
    const crit = deriveCriticality(s.impact);
    let criticalityLabel;
    if (!crit) criticalityLabel = "not yet rated";
    else if (s.cni) criticalityLabel = crit + " · CNI";
    else criticalityLabel = crit;
    return {
      id: s.id,
      name: s.name,
      criticalityLabel,
      rated: Boolean(crit),
      checked: selected.indexOf(s.id) !== -1,
    };
  });
}

// --- Timing + plan summary (Batch 3: D03 / D04 / D16 / D05, shared by D07/D11/D21) ----

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A stored timing entry is either "tbc" or { month, year }. Render it for display.
function formatTiming(entry) {
  if (entry && typeof entry === "object" && entry.month) {
    const m = parseInt(entry.month, 10);
    const name = MONTHS[m - 1] || entry.month;
    return (name + " " + (entry.year || "")).trim();
  }
  return "Date not confirmed";
}

// The assessments included in the cycle, in display order: the organisation assessment
// (if not done before) then the selected systems, ranked. Used by D04 timing + plan summary.
function includedAssessments(setup, decide) {
  const list = [];
  if (orgIncluded(setup)) {
    list.push({ id: "organisation", name: "Organisation assessment", kind: "org" });
  }
  const selected = (decide.cycle && decide.cycle.selectedSystems) || [];
  rankAssessableSystems(setup).forEach((s) => {
    if (selected.indexOf(s.id) !== -1) list.push({ id: s.id, name: s.name, kind: "system", system: s });
  });
  return list;
}

// The shared plan summary data: Included / Not included / Already assessed.
function buildPlanSummary(setup, decide) {
  const selected = (decide.cycle && decide.cycle.selectedSystems) || [];
  const timing = decide.timing || {};

  const included = [];
  if (orgIncluded(setup)) {
    included.push({ name: "Organisation assessment", detail: "First assessment · " + formatTiming(timing.organisation) });
  }
  const notIncluded = [];
  rankAssessableSystems(setup).forEach((s) => {
    const crit = deriveCriticality(s.impact) || "Not yet rated";
    if (selected.indexOf(s.id) !== -1) {
      included.push({ name: s.name, detail: crit + " · " + formatTiming(timing[s.id]) });
    } else {
      const parts = [crit];
      if (s.cni) parts.push("CNI");
      parts.push("Not yet assessed");
      notIncluded.push({ name: s.name, detail: parts.join(" · ") });
    }
  });

  const assessed = alreadyAssessedSystems(setup).map((s) => ({
    name: s.name,
    detail: assessedLabel(s) + " · You cannot update this assessment yet",
  }));

  return { included, notIncluded, assessed };
}

function joinWithAnd(items) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return items[0] + ", and " + items[1];
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
}

// Priority warning (plan-summary v2): flags higher-priority systems left out — a not-included
// CNI system, or a not-included system rated more critical than the least critical included
// system ("X is mission critical while a business supporting system is included"). Unrated
// systems are not compared (their criticality is unknown). One bullet per system. Null if none.
function buildPriorityWarning(setup, decide) {
  const selected = (decide.cycle && decide.cycle.selectedSystems) || [];
  const ranked = rankAssessableSystems(setup);
  const notSelected = ranked.filter((s) => selected.indexOf(s.id) === -1);
  const includedCrits = ranked
    .filter((s) => selected.indexOf(s.id) !== -1)
    .map((s) => deriveCriticality(s.impact))
    .filter(Boolean);
  // The least critical rated system included this cycle (highest rank number).
  const lowestIncluded = includedCrits.sort((a, b) => CRITICALITY_RANK[b] - CRITICALITY_RANK[a])[0] || "";

  const clauses = [];
  notSelected.forEach((s) => {
    const parts = [];
    if (s.cni) parts.push("is CNI");
    const crit = deriveCriticality(s.impact);
    if (crit && lowestIncluded && CRITICALITY_RANK[crit] < CRITICALITY_RANK[lowestIncluded]) {
      parts.push("is " + crit.toLowerCase() + " while a " + lowestIncluded.toLowerCase() + " system is included");
    }
    if (parts.length) clauses.push(s.name + " " + parts.join(" and "));
  });
  if (!clauses.length) return null;
  // Returns the flagged systems as bullet items; the "Check the systems that are not included"
  // heading and the trailing advice are rendered by components/plan-summary.njk (D07/D11/D21).
  return { items: clauses };
}

module.exports = {
  HOLDING_HREF,
  isCniFlaggedInSetup,
  showCniScreens,
  hasApprover,
  hasAssurer,
  assurerLine,
  orgIncluded,
  formatToday,
  assessedLabel,
  ensureDecide,
  applyDecideChrome,
  applyDecideMinimalChrome,
  getSystem,
  deriveCriticality,
  cniSystems,
  nonCniSystems,
  assessableSystems,
  alreadyAssessedSystems,
  hasUnratedInScope,
  rankAssessableSystems,
  buildSystemChoiceRows,
  formatTiming,
  includedAssessments,
  buildPlanSummary,
  buildPriorityWarning,
};
