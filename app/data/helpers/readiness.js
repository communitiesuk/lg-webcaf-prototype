// app/data/helpers/readiness.js
//
// Helpers for the "Readiness and dashboard" section (Figma Readiness and dashboard v3, page 209:56).
// Owns the readiness session model, the dashboard chrome (three service-navigation variants), the
// dashboard state selector (driven by LIVE Setup/Decide state), and the readiness nudges.
//
// Dashboard state is LIVE: it reads req.session.data.setup.completed and
// req.session.data.decide.approval.decision. A small prototype-only demo flag disambiguates the two
// cycle states (R05 vs R09) and forces the collaborator view (R06).

const { ensureSetup, buildSetupTaskList, buildSetupSummary } = require("./setup");
const { ensureDecide } = require("./decide");

// GDS task-list tag styles (decision #4): grey "Not started", blue "In progress".
const TAG_NOT_STARTED = { tag: { text: "Not started", classes: "govuk-tag--grey" } };
const TAG_IN_PROGRESS = { tag: { text: "In progress", classes: "govuk-tag--blue" } };

const READINESS_SERVICE_NAME = "Assess and manage your council’s cyber resilience";
const COUNCIL_NAME = "Westborough Borough Council";
const CAF_LEAD = { name: "Jo Hart", orgName: COUNCIL_NAME };
const COLLABORATOR = { name: "Priya Shah", orgName: COUNCIL_NAME };
const SIGN_OUT_HREF = "/get-started/sign-out";
const HOLDING_HREF = "/setup/not-in-this-prototype";
// Doing the assessments is not in the Beta prototype; their links go to a dashboard-chrome holding
// page (not the older /self-assessment journey, which belongs to a different example council).
const ASSESSMENTS_NOT_BUILT_HREF = "/dashboard/not-in-this-prototype";

// The council being worked on: the one the person registered (claim), else the Setup council
// (the example council's name in example starting points). Use this, never COUNCIL_NAME directly.
function councilNameFor(sessionData) {
  const claim = (sessionData && sessionData.claim) || {};
  if (claim.council && claim.council.name) return claim.council.name;
  const setup = (sessionData && sessionData.setup) || {};
  return (setup.council && setup.council.name) || COUNCIL_NAME;
}

// True only for the populated example council (loaded by a /beta starting point). Example-only
// content such as previous-assessment history is shown for it and never for a registered council.
function isExampleCouncil(sessionData) {
  return Boolean(sessionData && sessionData.setup && sessionData.setup.exampleCouncil);
}

// Initialise the readiness session namespace (idempotent). Does not pre-answer anything.
function ensureReadiness(sessionData) {
  if (!sessionData.readiness) sessionData.readiness = {};
  return sessionData.readiness;
}

// Seed the drawn example answers (Not yet / Yes / Not yet, answered 2 September 2026) ONLY when the
// readiness has never been touched. This makes R02 (your readiness answers) show the example answers
// — without ever overwriting a real user's answers.
function seedExampleReadinessIfPristine(sessionData) {
  const r = ensureReadiness(sessionData);
  const pristine =
    !r.started && !r.answeredAt &&
    r.seniorSponsor === undefined && r.teamsInvolved === undefined && r.secureEvidence === undefined;
  if (pristine) {
    r.seniorSponsor = "notYet";
    r.teamsInvolved = "yes";
    r.secureEvidence = "notYet";
    r.answeredAt = "2 September 2026";
    r.exampleSeeded = true;
  }
  return r;
}

// --- Chrome ---------------------------------------------------------------------------
// One shared header (main.html). These set res.locals for its three service-navigation variants.

function baseChrome(res) {
  res.locals.serviceName = READINESS_SERVICE_NAME;
  res.locals.serviceUrl = "/dashboard";
  res.locals.showNavigation = true;
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
}

// "Service navigation / full access" — R01–R05, R07–R09. Council identity + full nav.
// The signed-in person's identity, from what they typed when signing in and claiming (name from
// Claim "Your details", council from the claim). Null if nobody has been through Claim, so the demo
// scenarios fall back to the seeded persona. Changed in build, prototype, pending design sign-off.
function signedInIdentity(req) {
  const claim = (req.session && req.session.data && req.session.data.claim) || {};
  const org = (claim.council && claim.council.name) || COUNCIL_NAME;
  if (claim.person && claim.person.fullName) return { name: claim.person.fullName, orgName: org };
  // User-driven: derive the name from the signed-in email rather than a hardcoded persona.
  if (claim.oneLoginEmail) return { name: require("../claim-example-data").displayNameFromEmail(claim.oneLoginEmail), orgName: org };
  return null;
}

function applyFullAccessChrome(req, res) {
  baseChrome(res);
  res.locals.currentUser = signedInIdentity(req) || CAF_LEAD;
  const path = req.path;
  res.locals.navigation = [
    { text: "Dashboard", href: "/dashboard", active: path === "/dashboard" },
    { text: "Your council", href: "/setup/task-list" },
    { text: "Assessments", href: "/decide" },
    { text: "People", href: "/access", active: path.startsWith("/access") },
    // "Switch council" removed from nav — one council per person for now (pending multi-council).
    // Changed in build, prototype, pending design sign-off.
    { text: "Sign out", href: SIGN_OUT_HREF },
  ];
}

// "Service navigation / collaborator" — R06. A collaborator sees a task list, not the whole council.
function applyCollaboratorChrome(req, res) {
  baseChrome(res);
  res.locals.currentUser = COLLABORATOR;
  res.locals.navigation = [
    { text: "Your tasks", href: "/dashboard", active: req.path === "/dashboard" },
    { text: "Sign out", href: SIGN_OUT_HREF },
  ];
}

// "Service navigation / signed in, no council" — R10. No council selected yet.
function applyNoCouncilChrome(req, res) {
  baseChrome(res);
  res.locals.currentUser = null;
  res.locals.navigation = [{ text: "Sign out", href: SIGN_OUT_HREF }];
}

// --- Dashboard state ------------------------------------------------------------------

// Pick the dashboard state from LIVE Setup/Decide session data, plus the prototype demo flags.
function selectDashboardState(sessionData) {
  const r = sessionData.readiness || {};
  if (r.demoCollaborator) return "collaborator";
  const setup = sessionData.setup || {};
  if (!setup.completed) return "setup-in-progress"; // R03
  const decision = (sessionData.decide && sessionData.decide.approval && sessionData.decide.approval.decision) || "";
  if (decision !== "approved") return "ready-to-decide"; // R04
  if (r.demoReminders) return "several-reminders"; // R09
  return "cycle-in-progress"; // R05
}

// Count completed Setup tasks for the R03 "X of Y tasks done" hint (LIVE).
function setupTaskProgress(setup) {
  const tl = buildSetupTaskList(setup);
  const all = [...tl.preServices, ...tl.servicesAndSystems, ...tl.finish];
  // A task's status is either plain text ({ text: "Completed" }) or a tag
  // ({ tag: { text: "Incomplete" | "Not yet started" } }).
  const label = (t) => {
    const s = t.status || {};
    return s.text || (s.tag && s.tag.text) || "";
  };
  const done = all.filter((t) => label(t) === "Completed").length;
  // "Started" = anything the user has touched (Completed or In progress), so the dashboard reads
  // "In progress" as soon as any section is under way — not only once a whole task is Completed.
  const started = all.filter((t) => label(t) === "Completed" || label(t) === "In progress").length;
  return { done, started, total: all.length };
}

// View-model for the R03 (setup in progress) dashboard state.
function buildSetupInProgressModel(sessionData) {
  const setup = ensureSetup(sessionData);
  const { done, started, total } = setupTaskProgress(setup);
  // GDS tag colours: grey not-started, blue in-progress, green completed. "In progress" shows as
  // soon as anything is started, not only once a whole task is Completed.
  const status =
    done >= total
      ? { tag: { text: "Completed", classes: "govuk-tag--green" } }
      : started > 0
      ? { tag: { text: "In progress", classes: "govuk-tag--blue" } }
      : { tag: { text: "Not yet started", classes: "govuk-tag--grey" } };
  // Reflect partial progress: name the in-progress tasks as well as the completed ones, so the
  // hint matches the "In progress" tag instead of reading "0 of 8 done".
  const inProgress = started - done;
  const hintText =
    inProgress > 0
      ? `${done} of ${total} tasks done, ${inProgress} in progress. You only do this once.`
      : `${done} of ${total} tasks done. You only do this once.`;
  return {
    councilName: councilNameFor(sessionData),
    setupTask: {
      title: { text: "Set up your council" },
      href: "/setup/task-list",
      hint: { text: hintText },
      status,
    },
  };
}

// Resolve the cycle's selected critical systems (ids in Decide) to their Setup names (LIVE).
function selectedSystemNames(sessionData) {
  const ids = (sessionData.decide && sessionData.decide.cycle && sessionData.decide.cycle.selectedSystems) || [];
  const byId = {};
  ((sessionData.setup && sessionData.setup.criticalSystems) || []).forEach((s) => {
    byId[s.id] = s.name;
  });
  return ids.map((id) => byId[id] || id);
}

// Decide progress for the dashboard tile: "not-started" until the person has answered anything in
// Decide (CNI, systems, confirmation, sending, or a returned plan); otherwise "in-progress".
function decideTaskStatus(sessionData) {
  const d = (sessionData && sessionData.decide) || {};
  const cycle = d.cycle || {};
  const touched =
    Boolean(d.cniAnswer) ||
    (cycle.selectedSystems || []).length > 0 ||
    Boolean(cycle.noneOnly) ||
    Boolean(cycle.confirmed) ||
    Boolean(d.plan && d.plan.sentToAssurer) ||
    Boolean(d.approval && d.approval.decision);
  return touched ? "in-progress" : "not-started";
}

// View-model for R04 (ready to decide). Setup counts are LIVE; "Last assessment" is example history.
function buildReadyToDecideModel(sessionData) {
  const setup = ensureSetup(sessionData);
  const summary = buildSetupSummary(setup);
  const svc = summary.servicesCount;
  const sys = summary.systemsCount;
  const plural = (n) => (n === 1 ? "" : "s");
  const started = decideTaskStatus(sessionData) === "in-progress";
  return {
    decideTask: {
      title: { text: "Decide what to assess" },
      href: "/decide",
      hint: { text: "Choose what this cycle covers, then get it approved." },
      // Reflects Decide progress: "Not yet started" until the person answers anything in Decide.
      status: started
        ? { tag: { text: "In progress", classes: "govuk-tag--blue" } }
        : { tag: { text: "Not yet started", classes: "govuk-tag--grey" } },
    },
    decideButtonText: started ? "Continue" : "Start this cycle",
    record: {
      setupValue: `Complete, ${svc} essential service${plural(svc)} and ${sys} critical system${plural(sys)}`,
      // Previous assessment history exists only for the example council (the prototype holds no
      // assurance record for a council registered in research). Hidden otherwise.
      lastAssessmentValue: isExampleCouncil(sessionData) ? "Council website and forms, assured March 2025" : "",
    },
  };
}

// View-model for R05 (cycle in progress). System names are LIVE; outcome progress and the assurance
// activities / reminders are example + PROPOSAL data (Microsoft Bookings), noted on the page.
function buildCycleInProgressModel(sessionData) {
  ensureSetup(sessionData);
  ensureDecide(sessionData);
  // Outcome progress is example data for the example council only; a council registered in research
  // has just had its plan approved, so nothing is started yet.
  const example = isExampleCouncil(sessionData);
  const setup = sessionData.setup || {};
  const orgIncluded = !(setup.organisationAssessment && setup.organisationAssessment.doneBefore);
  const assessments = [];
  if (orgIncluded) {
    assessments.push(
      example
        ? { title: { text: "Organisation assessment" }, href: ASSESSMENTS_NOT_BUILT_HREF, hint: { text: "Objectives A and D. 4 of 12 outcomes done." }, status: TAG_IN_PROGRESS }
        : { title: { text: "Organisation assessment" }, href: ASSESSMENTS_NOT_BUILT_HREF, hint: { text: "Objectives A and D. Not started." }, status: TAG_NOT_STARTED }
    );
  }
  selectedSystemNames(sessionData).forEach((name) => {
    assessments.push({
      title: { text: name },
      href: ASSESSMENTS_NOT_BUILT_HREF,
      hint: { text: "Objectives B and C. Not started." },
      status: TAG_NOT_STARTED,
    });
  });
  // Reminders: the pre self-assessment call reminder is live from the shared assurance activities;
  // the evidence-location reminder has no data source, so it is example-council only.
  const preCall = ((sessionData.assurance && sessionData.assurance.activities) || {})["pre-call"] || {};
  const reminders = [];
  if (example) reminders.push("Your assurer has not confirmed they can open your evidence location.");
  if (preCall.status !== "booked" && preCall.status !== "happened") reminders.push("Your pre self-assessment call is not booked yet.");
  return {
    assessments,
    reminders,
    // The "Assurance activities" summary now comes from the shared AA01 partial (assuranceSummary),
    // built in app/data/helpers/assurance.js and passed by the dashboard route.
  };
}

// View-model for R09 (several reminders). The worst realistic case: five reminders at once.
function buildSeveralRemindersModel() {
  return {
    assessments: [
      {
        title: { text: "Organisation assessment" },
        href: ASSESSMENTS_NOT_BUILT_HREF,
        hint: { text: "Objectives A and D. Not started." },
        status: TAG_NOT_STARTED,
      },
    ],
    reminders: [
      "MHCLG has not assigned your assurer yet. We will tell you when they do.",
      "Your onboarding calls are not booked yet, one for each assessment type.",
      "Timing for the organisation assessment is still to be confirmed.",
      "Your assurer has not confirmed they can open your evidence location.",
      "Your pre self-assessment call is not booked yet.",
    ],
    closing: "None of these stop you starting your self-assessment.",
  };
}

// View-model for R06 (collaborator view). A collaborator sees only the outcomes assigned to them.
function buildCollaboratorModel() {
  return {
    inviter: "Jo Hart",
    tasks: [
      {
        title: { text: "A3. Asset management" },
        href: ASSESSMENTS_NOT_BUILT_HREF,
        hint: { text: "Organisation assessment. Not started." },
        status: TAG_NOT_STARTED,
      },
      {
        title: { text: "A4. Supply chain" },
        href: ASSESSMENTS_NOT_BUILT_HREF,
        hint: { text: "Organisation assessment. In progress." },
        status: TAG_IN_PROGRESS,
      },
    ],
  };
}

module.exports = {
  READINESS_SERVICE_NAME,
  COUNCIL_NAME,
  councilNameFor,
  isExampleCouncil,
  decideTaskStatus,
  CAF_LEAD,
  COLLABORATOR,
  SIGN_OUT_HREF,
  HOLDING_HREF,
  ensureReadiness,
  seedExampleReadinessIfPristine,
  ensureSetup,
  ensureDecide,
  applyFullAccessChrome,
  applyCollaboratorChrome,
  applyNoCouncilChrome,
  selectDashboardState,
  setupTaskProgress,
  buildSetupInProgressModel,
  selectedSystemNames,
  buildReadyToDecideModel,
  buildCycleInProgressModel,
  buildSeveralRemindersModel,
  buildCollaboratorModel,
};
