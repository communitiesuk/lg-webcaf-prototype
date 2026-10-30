// app/routes/readiness.js
// "Readiness and dashboard" section (Figma page 209:56, v3).
// Batch 1: the optional readiness check (R01), updating those answers (R02), and the dashboard
// shell with its LIVE state selector + a prototype-only state switcher. Only the R03
// (setup-in-progress) state is built here; R04/R05/R09/R06 render a "built in a later batch"
// placeholder but the state machinery is complete.

const {
  COUNCIL_NAME,
  ensureReadiness,
  seedExampleReadinessIfPristine,
  ensureSetup,
  ensureDecide,
  applyFullAccessChrome,
  applyCollaboratorChrome,
  applyNoCouncilChrome,
  selectDashboardState,
  buildSetupInProgressModel,
  buildReadyToDecideModel,
  buildCycleInProgressModel,
  buildSeveralRemindersModel,
  buildCollaboratorModel,
} = require("../data/helpers/readiness");
const { buildAssuranceSummary, seedAssuranceForState } = require("../data/helpers/assurance");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function formatDate(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

module.exports = function (router) {
  // R01 — optional readiness check. Save and continue, or skip; both go to the dashboard.
  router.get("/readiness", (req, res) => {
    applyFullAccessChrome(req, res);
    const readiness = ensureReadiness(req.session.data);
    res.render("pages/readiness/readiness-check", {
      pageTitle: "Before you start, a few optional questions",
      councilName: COUNCIL_NAME,
      readiness,
    });
  });

  router.post("/readiness", (req, res) => {
    const readiness = ensureReadiness(req.session.data); // fields auto-saved via name="readiness[...]"
    const action = (req.session.data.readinessAction || "").toString();
    delete req.session.data.readinessAction;
    if (action === "skip") {
      readiness.skipped = true;
    } else {
      readiness.skipped = false;
      readiness.answeredAt = formatDate(new Date());
    }
    readiness.started = true;
    return res.redirect("/dashboard");
  });

  // Prototype-only: clear readiness so R01 shows its blank, first-time state for review.
  router.get("/readiness/reset", (req, res) => {
    delete req.session.data.readiness;
    return res.redirect("/readiness");
  });

  // R02 — your readiness answers (change them later).
  router.get("/readiness/answers", (req, res) => {
    applyFullAccessChrome(req, res);
    const readiness = seedExampleReadinessIfPristine(req.session.data);
    res.render("pages/readiness/your-answers", {
      pageTitle: "Your readiness answers",
      councilName: COUNCIL_NAME,
      readiness,
      answeredAt: readiness.answeredAt || "",
    });
  });

  router.post("/readiness/answers", (req, res) => {
    const readiness = ensureReadiness(req.session.data);
    if (!readiness.answeredAt) readiness.answeredAt = formatDate(new Date());
    return res.redirect("/dashboard");
  });

  // The dashboard — one route, LIVE state from Setup/Decide (+ demo flags). Caption + H1 shared.
  router.get("/dashboard", (req, res) => {
    ensureSetup(req.session.data);
    ensureDecide(req.session.data);
    const state = selectDashboardState(req.session.data);
    if (state === "collaborator") applyCollaboratorChrome(req, res);
    else applyFullAccessChrome(req, res);
    let model = null;
    let prototypeNotes = [];
    let assuranceSummary = null;
    if (state === "setup-in-progress") {
      model = buildSetupInProgressModel(req.session.data);
    } else if (state === "ready-to-decide") {
      model = buildReadyToDecideModel(req.session.data);
      prototypeNotes = [
        "Example data, not real: the ‘Last assessment’ shown is illustrative. The prototype holds no prior assurance record.",
      ];
    } else if (state === "cycle-in-progress") {
      model = buildCycleInProgressModel(req.session.data);
      assuranceSummary = buildAssuranceSummary(req.session.data);
      prototypeNotes = [
        "Proposal, not agreed: the assurance activities summary and the reminders assume the Microsoft Bookings proposal is agreed. The outcome progress shown is example data.",
      ];
    } else if (state === "several-reminders") {
      model = buildSeveralRemindersModel();
      assuranceSummary = buildAssuranceSummary(req.session.data);
      prototypeNotes = [
        "Proposal, not agreed: these reminders assume the Microsoft Bookings proposal is agreed. The progress shown is example data.",
      ];
    } else if (state === "collaborator") {
      model = buildCollaboratorModel();
    }
    res.render("pages/dashboard/index", {
      pageTitle: state === "collaborator" ? "Your tasks" : "Your CAF dashboard",
      state,
      model,
      prototypeNotes,
      assuranceSummary,
      councilName: COUNCIL_NAME,
    });
  });

  // Prototype-only state switcher — sets the LIVE flags that select each state, then returns to the
  // dashboard. Mutates setup/decide (shared with those sections) by design, as a demo control.
  router.get("/dashboard/show/:state", (req, res) => {
    const data = req.session.data;
    ensureSetup(data);
    ensureDecide(data);
    const readiness = ensureReadiness(data);
    readiness.demoCollaborator = false;
    readiness.demoReminders = false;
    const state = req.params.state;
    if (state === "setup-in-progress") {
      data.setup.completed = false;
    } else if (state === "ready-to-decide") {
      data.setup.completed = true;
      data.decide.approval.decision = "";
    } else if (state === "cycle-in-progress") {
      data.setup.completed = true;
      data.decide.approval.decision = "approved";
    } else if (state === "several-reminders") {
      data.setup.completed = true;
      data.decide.approval.decision = "approved";
      readiness.demoReminders = true;
    } else if (state === "collaborator") {
      readiness.demoCollaborator = true;
    }
    // Keep the assurance example coherent with the demo state (R05 = booked example, R09 = nothing).
    seedAssuranceForState(data, state);
    return res.redirect("/dashboard");
  });

  // Stand-in — the self-assessment is not designed yet (README). Linked from the nav and from
  // R05/R06/R09 assessment rows.
  router.get("/self-assessment", (req, res) => {
    applyFullAccessChrome(req, res);
    res.render("pages/readiness/self-assessment-stub", { pageTitle: "Self-assessment" });
  });


  // R07 — previous CAF results. Example history (decision #3: dated March 2025 throughout).
  router.get("/dashboard/previous-results", (req, res) => {
    applyFullAccessChrome(req, res);
    res.render("pages/dashboard/previous-results", {
      pageTitle: "Previous CAF results",
      councilName: COUNCIL_NAME,
    });
  });

  // R08 — how long the CAF takes. Durations are unconfirmed placeholders (noted on the page).
  router.get("/dashboard/how-long", (req, res) => {
    applyFullAccessChrome(req, res);
    res.render("pages/dashboard/how-long", {
      pageTitle: "How long the CAF takes",
      councilName: COUNCIL_NAME,
    });
  });

  // R10 — choose a council (reached by someone with access to more than one). "Signed in, no council".
  router.get("/choose-council", (req, res) => {
    applyNoCouncilChrome(req, res);
    res.render("pages/readiness/choose-council", {
      pageTitle: "Which council do you want to work on?",
    });
  });

  // "Open" a council — sets the mapped dashboard state, then lands on the dashboard. Only Westborough
  // has full seed data, so all three open the (Westborough-backed) dashboard in the state shown
  // against their name on R10 — a single-council prototype limitation (flagged).
  router.get("/choose-council/open/:council", (req, res) => {
    const data = req.session.data;
    ensureSetup(data);
    ensureDecide(data);
    const readiness = ensureReadiness(data);
    readiness.demoCollaborator = false;
    readiness.demoReminders = false;
    const council = req.params.council;
    if (council === "westborough") {
      data.setup.completed = true;
      data.decide.approval.decision = "approved"; // R05 cycle in progress
    } else if (council === "eastvale") {
      data.setup.completed = false; // R03 setup in progress
    } else if (council === "northmoor") {
      data.setup.completed = true;
      data.decide.approval.decision = ""; // R04 ready to decide (no cycle started)
    }
    return res.redirect("/dashboard");
  });
};
