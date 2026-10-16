// app/data/helpers/assurance.js
//
// Helpers for the "Assurance activities" section (Figma page 447:2693, v3 — proposal agreed, advice
// route). WebCAF does not book: it records booked / done in the session and links to the live
// Microsoft Bookings form. Advice route — nothing here blocks a booking.
//
// Batch 1: the session model + the AA01 dashboard summary (shared by R05 and R09). The full AA02
// rows, AA03/04/05/06/08 come in later batches.

// The earliest a workshop can be booked = this many WORKING days after the information is marked
// "ready" for assurer review. UNCONFIRMED — the review window is still open with Leon (D-2026-101).
const EARLIEST_BOOK_WORKING_DAYS = 5;

// Canonical "whole cycle" activities that feed the AA01 summary. (Workshops / milestones per
// assessment are derived from the live cycle in the AA02 batch.)
const CYCLE_ACTIVITIES = [
  { id: "onboarding-org", step: "Step 1: Onboarding, organisation assessment", shortName: "Onboarding call for your organisation assessment" },
  { id: "onboarding-systems", step: "Step 1: Onboarding, critical systems", shortName: "Onboarding call for your critical systems" },
  { id: "pre-call", step: "Step 2: Pre self-assessment call (optional)", shortName: "Pre self-assessment call", optional: true },
];

// The drawn AA02/AA01 example state (completed onboarding, pre-call booked). Example data, not real.
function completedExample() {
  return {
    "onboarding-org": { status: "happened", date: "12 March 2027" },
    "onboarding-systems": { status: "happened", date: "12 March 2027" },
    "pre-call": { status: "booked", date: "3 May 2027" },
  };
}

// The early state used for R09 ("several reminders" — nothing booked yet).
function nothingBookedExample() {
  return {
    "onboarding-org": { status: "not-booked", date: "" },
    "onboarding-systems": { status: "not-booked", date: "" },
    "pre-call": { status: "not-booked", date: "" },
  };
}

// Initialise the assurance session namespace (idempotent). Seeds the completed example if absent.
function ensureAssurance(sessionData) {
  if (!sessionData.assurance) {
    sessionData.assurance = { activities: completedExample(), ready: {} };
  }
  if (!sessionData.assurance.activities) sessionData.assurance.activities = completedExample();
  if (!sessionData.assurance.ready) sessionData.assurance.ready = {};
  return sessionData.assurance;
}

// Set the assurance state to match a dashboard demo state (prototype control). R05 = completed
// example; R09 = nothing booked. Other states leave it untouched.
function seedAssuranceForState(sessionData, dashboardState) {
  const a = ensureAssurance(sessionData);
  if (dashboardState === "several-reminders") {
    a.activities = nothingBookedExample();
  } else if (dashboardState === "cycle-in-progress") {
    a.activities = completedExample();
  }
  return a;
}

// AA01 dashboard summary: the next upcoming activity and what is done, one line each (nodes 447:2709
// / 447:2726). Derived from the session so recording a booking updates the dashboard.
function buildAssuranceSummary(sessionData) {
  const acts = ensureAssurance(sessionData).activities;
  const rows = [];

  // Next = the first cycle activity that is booked (upcoming), else the first not yet booked.
  const booked = CYCLE_ACTIVITIES.find((a) => acts[a.id] && acts[a.id].status === "booked");
  const notBooked = CYCLE_ACTIVITIES.find((a) => acts[a.id] && acts[a.id].status === "not-booked");
  if (booked) {
    rows.push({ key: { text: "Next" }, value: { text: `${booked.shortName} · booked for ${acts[booked.id].date}` } });
  } else if (notBooked) {
    rows.push({ key: { text: "Next" }, value: { text: `${notBooked.shortName} · not booked yet` } });
  }

  // Done = completed onboarding (verbatim AA01 line when both are done).
  const orgDone = acts["onboarding-org"] && acts["onboarding-org"].status === "happened";
  const sysDone = acts["onboarding-systems"] && acts["onboarding-systems"].status === "happened";
  if (orgDone && sysDone) {
    rows.push({ key: { text: "Done" }, value: { text: "Onboarding calls for both assessments" } });
  }

  return {
    intro: "Calls and workshops with your assurer, booked through Microsoft Bookings.",
    rows,
  };
}

// --- Dates: the "earliest you can book" = 5 WORKING days after the ready date -----------
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function parseUkDate(s) {
  const parts = (s || "").toString().trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const mi = MONTHS.indexOf(parts[1]);
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || mi < 0 || isNaN(y)) return null;
  return new Date(y, mi, d);
}
function formatUkDate(dt) {
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}
// Add n working days (skip Saturday/Sunday). Used for the earliest workshop booking date.
function earliestBookDate(readyDateStr) {
  const dt = parseUkDate(readyDateStr);
  if (!dt) return "";
  let added = 0;
  while (added < EARLIEST_BOOK_WORKING_DAYS) {
    dt.setDate(dt.getDate() + 1);
    const day = dt.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return formatUkDate(dt);
}

// --- AA02 model (driven from the LIVE cycle: organisation assessment + each selected system) -------

// Resolve the cycle's selected critical systems to { id, name } (LIVE).
function selectedSystems(sessionData) {
  const ids =
    (sessionData.decide && sessionData.decide.cycle && sessionData.decide.cycle.selectedSystems) || [];
  const byId = {};
  ((sessionData.setup && sessionData.setup.criticalSystems) || []).forEach((s) => {
    byId[s.id] = s.name;
  });
  return ids.map((id) => ({ id, name: byId[id] || id }));
}

function updateAction(id) {
  return { href: `/assurance-activities/update/${id}`, text: "Update", visuallyHiddenText: "this activity" };
}
function bookAction(href) {
  return { href, text: "Book", visuallyHiddenText: "this activity" };
}

// One "whole cycle" row (onboarding / pre-call): value derived from the recorded status.
function cycleRow(act, step, bookHref) {
  if (act && act.status === "happened") return { key: { text: step }, value: { text: `Done, ${act.date}` }, actions: { items: [updateAction(bookHrefToId(bookHref))] } };
  if (act && act.status === "booked") return { key: { text: step }, value: { text: `Booked for ${act.date}` }, actions: { items: [updateAction(bookHrefToId(bookHref))] } };
  return { key: { text: step }, value: { text: "Not booked yet" }, actions: { items: [bookAction(bookHref)] } };
}
function bookHrefToId(href) {
  return href.replace("/assurance-activities/book/", "");
}

// A workshop row: recorded → Booked/Done + Update; otherwise the drawn default text + Book (→ AA08).
function workshopRow(act, step, defaultValue, activityId) {
  if (act && act.status === "booked") return { key: { text: step }, value: { text: `Booked for ${act.date}` }, actions: { items: [updateAction(activityId)] } };
  if (act && act.status === "happened") return { key: { text: step }, value: { text: `Done, ${act.date}` }, actions: { items: [updateAction(activityId)] } };
  return { key: { text: step }, value: { text: defaultValue }, actions: { items: [bookAction(`/assurance-activities/mark-ready/${activityId}`)] } };
}
// A milestone row (no action).
function milestoneRow(step, value) {
  return { key: { text: step }, value: { text: value } };
}

function buildActivitiesModel(sessionData) {
  const a = ensureAssurance(sessionData);
  const acts = a.activities;
  const groups = [];

  // 1. For the whole cycle
  const cycleRows = [
    cycleRow(acts["onboarding-org"], "Step 1: Onboarding, organisation assessment", "/assurance-activities/book/onboarding-org"),
    cycleRow(acts["onboarding-systems"], "Step 1: Onboarding, critical systems", "/assurance-activities/book/onboarding-systems"),
    cycleRow(acts["pre-call"], "Step 2: Pre self-assessment call (optional)", "/assurance-activities/book/pre-call"),
    // Other activities — opens the live form directly, in a new tab. Not recorded, no status.
    {
      key: { text: "Other activities" },
      value: { text: "Your assurer may ask you to book other sessions, for example CAF 3.2 to 4.0 transition workshops. Book them in Microsoft Bookings. These are not recorded here." },
      actions: { items: [{ href: "/assurance-activities/bookings-external", text: "Book (opens in a new tab)", attributes: { target: "_blank", rel: "noopener noreferrer" }, visuallyHiddenText: "other activities in Microsoft Bookings" }] },
    },
  ];
  groups.push({ heading: "For the whole cycle", rows: cycleRows });

  // 2. Organisation assessment
  groups.push({
    heading: "Organisation assessment",
    rows: [
      workshopRow(acts["workshop-A"], "Step 3: Objective A workshop", "Mark your information as ready for review, then book", "workshop-A"),
      workshopRow(acts["workshop-D"], "Step 3: Objective D workshop", "Book when your Objective D outcomes are complete", "workshop-D"),
      milestoneRow("Step 4: Report clarification session", "After your draft report arrives"),
      milestoneRow("Step 5: Improvement plan review", "After your final report"),
    ],
  });

  // 3. One group per selected critical system (LIVE)
  selectedSystems(sessionData).forEach((sys) => {
    groups.push({
      heading: sys.name,
      rows: [
        workshopRow(acts[`workshop-B-${sys.id}`], "Step 3: Objective B workshop", "Not yet", `workshop-B-${sys.id}`),
        workshopRow(acts[`workshop-C-${sys.id}`], "Step 3: Objective C workshop", "Not yet", `workshop-C-${sys.id}`),
        milestoneRow("Steps 4 and 5", "After your draft report arrives"),
      ],
    });
  });

  return groups;
}

// --- AA03 "before you book": resolve the :activity to page content --------------------
function resolveBookActivity(activityId, sessionData) {
  const councilName = (sessionData.setup && sessionData.setup.council && sessionData.setup.council.name) || "Westborough Borough Council";
  if (activityId === "onboarding-org") {
    return { caption: "Step 1: Onboarding, organisation assessment", h1: "Book your onboarding call", isWorkshop: false, serviceName: "Step 1: Onboarding, organisation assessment", councilName, activityId };
  }
  if (activityId === "onboarding-systems") {
    return { caption: "Step 1: Onboarding, critical systems", h1: "Book your onboarding call", isWorkshop: false, serviceName: "Step 1: Onboarding, critical systems", councilName, activityId };
  }
  if (activityId === "pre-call") {
    return { caption: "Step 2: Pre self-assessment call", h1: "Book your pre self-assessment call", isWorkshop: false, serviceName: "Step 2: Pre self-assessment call", councilName, activityId };
  }
  const m = activityId.match(/^workshop-([ABCD])(?:-(.+))?$/);
  if (m) {
    const obj = m[1];
    const sysId = m[2];
    const context = sysId ? (selectedSystems(sessionData).find((s) => s.id === sysId) || {}).name || "" : "Organisation assessment";
    // Readiness date: set by AA08 (Batch 4); until then use the drawn example (12 April 2027).
    const a = ensureAssurance(sessionData);
    const readyDate = (a.ready && a.ready[activityId] && a.ready[activityId].date) || "12 April 2027";
    return {
      caption: `Step 3: Objective ${obj} workshop`,
      h1: `Book your Objective ${obj} workshop`,
      isWorkshop: true,
      objective: obj,
      serviceName: `Step 3: Objective ${obj} workshop (${context})`,
      readyDate,
      earliestDate: earliestBookDate(readyDate),
      councilName,
      activityId,
    };
  }
  return null;
}

// --- AA04 update: resolve the :activity to caption + name, and date <-> parts helpers -----------

// Caption and lowercase name for the "Update your [name]" heading, plus the error noun.
function activityMeta(id) {
  if (id === "onboarding-org") return { caption: "Step 1: Onboarding, organisation assessment", name: "onboarding call", noun: "call" };
  if (id === "onboarding-systems") return { caption: "Step 1: Onboarding, critical systems", name: "onboarding call", noun: "call" };
  if (id === "pre-call") return { caption: "Step 2: Pre self-assessment call", name: "pre self-assessment call", noun: "call" };
  const m = id.match(/^workshop-([ABCD])(?:-(.+))?$/);
  if (m) return { caption: `Step 3: Objective ${m[1]} workshop`, name: `Objective ${m[1]} workshop`, noun: "workshop" };
  return null;
}

// Format day/month/year numbers to "3 May 2027".
function formatBookedDate(day, month, year) {
  const mi = parseInt(month, 10) - 1;
  if (isNaN(mi) || mi < 0 || mi > 11) return "";
  return `${parseInt(day, 10)} ${MONTHS[mi]} ${year}`;
}

// Parse "3 May 2027" back to { day, month, year } strings (month as a number) for prefilling.
function dateToParts(dateStr) {
  const dt = parseUkDate(dateStr);
  if (!dt) return { day: "", month: "", year: "" };
  return { day: String(dt.getDate()), month: String(dt.getMonth() + 1), year: String(dt.getFullYear()) };
}

// --- AA08 mark-ready, AA05 onboarding, AA06 pre-call --------------------------------------------

// AA08 content for a workshop activity (workshops only — A/D/B/C). Objective letter parameterised.
function resolveMarkReady(id) {
  const m = id.match(/^workshop-([ABCD])(?:-(.+))?$/);
  if (!m) return null;
  const obj = m[1];
  return {
    caption: `Step 3: Objective ${obj} workshop`,
    h1: `Mark your Objective ${obj} information as ready`,
    rowKey: `Objective ${obj} outcomes`,
    objective: obj,
    activityId: id,
  };
}

// Record that an objective's information is ready for assurer review (sets the ready date; AA03 then
// shows the earliest bookable date = this + 5 working days).
function markReady(sessionData, id, readyDateStr) {
  const a = ensureAssurance(sessionData);
  if (!a.ready) a.ready = {};
  a.ready[id] = { date: readyDateStr };
}

// AA05 onboarding rows / AA06 pre-call row — from the session (same source as AA02/AA04).
function buildOnboardingRows(sessionData) {
  const a = ensureAssurance(sessionData);
  return [
    cycleRow(a.activities["onboarding-org"], "Step 1: Onboarding, organisation assessment", "/assurance-activities/book/onboarding-org"),
    cycleRow(a.activities["onboarding-systems"], "Step 1: Onboarding, critical systems", "/assurance-activities/book/onboarding-systems"),
  ];
}
function buildPreCallRow(sessionData) {
  const a = ensureAssurance(sessionData);
  return [cycleRow(a.activities["pre-call"], "Step 2: Pre self-assessment call (optional)", "/assurance-activities/book/pre-call")];
}

// Prototype demo seeds so the AA05 / AA06 /beta links match the drawn early-journey frames.
function seedAA05Demo(sessionData) {
  const a = ensureAssurance(sessionData);
  a.activities["onboarding-org"] = { status: "not-booked", date: "" };
  a.activities["onboarding-systems"] = { status: "booked", date: "10 March 2027" };
}
function seedAA06Demo(sessionData) {
  ensureAssurance(sessionData).activities["pre-call"] = { status: "not-booked", date: "" };
}

module.exports = {
  EARLIEST_BOOK_WORKING_DAYS,
  CYCLE_ACTIVITIES,
  ensureAssurance,
  seedAssuranceForState,
  buildAssuranceSummary,
  earliestBookDate,
  formatUkDate,
  selectedSystems,
  buildActivitiesModel,
  resolveBookActivity,
  activityMeta,
  formatBookedDate,
  dateToParts,
  resolveMarkReady,
  markReady,
  buildOnboardingRows,
  buildPreCallRow,
  seedAA05Demo,
  seedAA06Demo,
};
