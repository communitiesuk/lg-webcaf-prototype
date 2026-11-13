// app/routes/research.js
//
// Round 2 research harness (beta-2). Not part of the service.
// - Research switch: sessionData.research.on. Off by default; turned on from /beta. When off, N00,
//   the "Research only" footer link, the person switcher, the scenarios and the Decide "Prototype
//   only" blocks are hidden.
// - N00 Emails sent in this session (Figma Decide v8, N00), and each email's view (N01 to N08).
// - /go/:id — the email-link resolver (D-2026-141, proposed; R04e and A36 panels).
// - Person switcher (acting-as.js) and the round 2 scenarios.

const { ensureSetup } = require("../data/helpers/setup");
const {
  ensureDecide,
  applyDecideMinimalChrome,
  hasApprover,
  hasAssurer,
  rankAssessableSystems,
  orgIncluded,
  showCniScreens,
  cniSystems,
  includedAssessments,
} = require("../data/helpers/decide");
const { buildDecideSeedEmpty, buildSetupSeedEmpty } = require("../data/seed/setup");
const { buildAccessEmpty } = require("../data/helpers/access");
const { ensureAssurance } = require("../data/helpers/assurance");
const planStateModel = require("../data/helpers/plan-state");
const { planState, syncApprover } = planStateModel;
const { findEmail, listEmails, renderEmail, ensureNotify } = require("../data/helpers/notify");
const acting = require("../data/helpers/acting-as");

function researchOn(data) {
  return Boolean(data && data.research && data.research.on);
}

function setResearch(data, on) {
  data.research = { on: Boolean(on) };
}

// Runs on every request (registered early in app/routes.js).
function researchMiddleware(req, res, next) {
  const data = req.session && req.session.data;
  res.locals.researchOn = researchOn(data);
  // Pick up an Approver change made in People wherever the person goes next (D27b, D12b, N05, N08).
  if (data && data.setup && data.decide && data.decide.seeded) syncApprover(data);
  next();
}

function researchChrome(res) {
  res.locals.serviceName = "Assess and manage your council’s cyber resilience";
  res.locals.showNavigation = false;
  res.locals.currentUser = null;
  res.locals.navigation = [];
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
}

// --- The resolver -----------------------------------------------------------------------

const EXPECTED_ROLE = { N02: "assurer", N05: "approver" };

// Who the email was for, as a switcher key (a replaced Approver is now the "previous Approver").
function recipientKey(data, record) {
  if (record.to.key !== "approver") return record.to.key || "caf-lead";
  const current = (data.setup.people && data.setup.people.approver && data.setup.people.approver.name) || "";
  return record.to.name === current ? "approver" : "previous-approver";
}

function onboardingBooked(data) {
  const setup = data.setup;
  const acts = ensureAssurance(data).activities || {};
  const done = (id) => acts[id] && (acts[id].status === "booked" || acts[id].status === "happened");
  const needed = [];
  if (orgIncluded(setup)) needed.push("onboarding-org");
  if (((data.decide.cycle && data.decide.cycle.selectedSystems) || []).length) needed.push("onboarding-systems");
  return needed.length > 0 && needed.every(done);
}

function banner(data, where, heading, body) {
  data.oneOffBanner = { where, heading, body };
}

// Where an email link lands for the signed-in person, given the plan's state now.
function targetFor(data, record, person) {
  const state = planState(data);
  const plan = data.decide.plan || {};
  const approval = data.decide.approval || {};
  const expected = EXPECTED_ROLE[record.emailId] || "caf-lead";
  // Someone at the council, but not the person the email was for (for example the CAF Lead opening
  // the assurer's email): their own starting page, no banner.
  if (person.role !== expected && !(expected === "approver" && person.role === "previous-approver")) return person.homeHref;
  const sentForApproval = ["awaiting_approval", "awaiting_recorded_decision", "approved", "returned"].indexOf(state) !== -1;
  const dealtWith = () => {
    if (!sentForApproval || !plan.sentForApprovalOn) return "/dashboard";
    banner(data, "dashboard", "You have already dealt with this feedback",
      "The link in your email is out of date. Your plan was sent to " + plan.sentForApprovalTo + " for approval on " + plan.sentForApprovalOn + ".");
    return "/dashboard";
  };
  switch (record.emailId) {
    case "N01":
      if (onboardingBooked(data)) {
        banner(data, "dashboard", "Your assurer is already in place", "Your onboarding calls have been booked.");
        return "/dashboard";
      }
      return hasAssurer(data.setup) ? "/decide/sent" : "/dashboard";
    case "N02":
      if (state === "with_assurer") return "/decide/assurer-review";
      if (plan.assurerReviewed) banner(data, "councils", "You have already reviewed this plan", "You sent your review on " + (plan.reviewedOn || "") + ".");
      return "/decide/assurer/councils";
    case "N03":
      if (state === "feedback_received") return "/decide/feedback";
      if (state === "ready_to_send" || state === "reviewed_no_feedback") return "/decide/send-for-approval";
      return dealtWith();
    case "N04":
      if (state === "reviewed_no_feedback" || state === "ready_to_send") return "/decide/send-for-approval";
      return dealtWith();
    case "N05":
      if (state === "awaiting_approval" && record.to.name === plan.sentForApprovalTo) return "/decide/approve";
      if (state === "approved" || state === "returned") {
        const date = state === "approved" ? approval.date : approval.returnedDate || approval.date;
        banner(data, "dashboard", "This plan no longer needs your decision",
          (approval.by || "") + " " + (state === "approved" ? "approved" : "returned") + " it on " + (date || "") + ".");
      }
      return "/dashboard";
    case "N06":
      return state === "approved" ? "/decide/approved" : "/dashboard";
    case "N07":
      return state === "returned" ? "/decide/returned" : "/dashboard";
    default:
      return "/dashboard";
  }
}

function renderA36(req, res, record, person) {
  res.locals.serviceName = "Assess and manage your council’s cyber resilience";
  res.locals.showNavigation = true;
  res.locals.currentUser = { name: person.name, orgName: person.orgName || "" };
  res.locals.navigation = [{ text: "Sign out", href: "/research/sign-out" }];
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
  return res.render("pages/access/cannot-view-plan", {
    pageTitle: "You cannot view this plan",
    councilName: record.councilName,
    dashboardHref: person.homeHref,
  });
}

// --- Scenarios --------------------------------------------------------------------------

// Build a plan from the participant's own Setup: CNI as Setup records it, the up to 3 highest-ranked
// systems, the organisation assessment if it is due, and "I do not know yet" for every date.
function buildPlanFromSetup(data) {
  const setup = data.setup;
  const keepAssurer = setup.assurer;
  data.decide = buildDecideSeedEmpty();
  data.notify = { emails: [], counter: 0 };
  const decide = data.decide;
  if (showCniScreens(setup)) decide.cniAnswer = cniSystems(setup).length ? "yes" : "no";
  const selected = rankAssessableSystems(setup).slice(0, 3).map((s) => s.id);
  decide.cycle = { selectedSystems: selected, noneOnly: selected.length === 0, confirmed: true };
  decide.timing = {};
  includedAssessments(setup, decide).forEach((a) => {
    decide.timing[a.id] = "tbc";
  });
  const assurance = ensureAssurance(data);
  ["onboarding-org", "onboarding-systems", "pre-call"].forEach((id) => {
    assurance.activities[id] = { status: "not-booked", date: "" };
  });
  setup.assurer = keepAssurer && keepAssurer.assigned ? keepAssurer : { name: "", organisation: "", assigned: false };
  acting.signInAs(data, "caf-lead");
}

const EXAMPLE_ASSURER = { name: "Example assurer", organisation: "Example supplier", stub: true };

function assurerAssigned(data) {
  buildPlanFromSetup(data);
  data.setup.assurer = { name: "", organisation: "", assigned: false };
  planStateModel.sendToAssurer(data); // waiting_for_assurer_assignment (no N02 yet)
  planStateModel.assignAssurer(data, EXAMPLE_ASSURER); // N01, then N02: with_assurer
}

function notIncludedName(data) {
  const selected = (data.decide.cycle && data.decide.cycle.selectedSystems) || [];
  const left = rankAssessableSystems(data.setup).find((s) => selected.indexOf(s.id) === -1);
  return left ? left.name : "";
}

function exampleFeedback(data) {
  const name = notIncludedName(data);
  return name
    ? "Consider whether " + name + " should be included in this cycle."
    : "Consider whether the dates you have given are realistic for your team.";
}

function approverUsesService(data, uses) {
  const a = data.setup.people.approver;
  a.hasAccount = Boolean(uses);
  if (uses) a.confirmed = true;
}

function feedbackReceived(data) {
  assurerAssigned(data);
  planStateModel.recordAssurerReview(data, exampleFeedback(data)); // N03
}

function withApprover(data) {
  assurerAssigned(data);
  approverUsesService(data, true);
  planStateModel.recordAssurerReview(data, ""); // N04
  planStateModel.sendForApproval(data); // N05
}

const SCENARIOS = [
  {
    key: "fresh-start",
    title: "1. Fresh start",
    note: "Clears the session. The participant registers, sets up their council (with an Approver in task 7), then starts Decide from the dashboard. Ends at D05 Send to your assurer, then D06 (no assurer yet).",
    fresh: true,
  },
  {
    key: "setup-part-way",
    title: "2. Assessments before setup is finished",
    note: "Clears the session. The participant registers and leaves Set up your council part-way (including task 7, Confirm your Approver), then opens Assessments in the navigation. Expect AS01 listing exactly the tasks not completed, each linking to its task. Once they finish setup, Assessments shows AS01b.",
    fresh: true,
  },
  {
    key: "assurer-assigned",
    title: "3. Assurer assigned",
    note: "Plan built from their setup and sent; an example assurer is assigned (N01 and N02). Starts on N00: the participant opens N01 and follows the link to D09.",
    build: assurerAssigned,
    to: "/research/emails",
  },
  {
    key: "assurer-review",
    title: "4. Assurer’s review",
    note: "As 3, signed in as the assurer. Open N02, review on D07. Try both routes: Yes with feedback (N03), and No (N04). Ends on D07b.",
    build: assurerAssigned,
    as: "assurer",
    to: "/research/emails",
  },
  {
    key: "feedback-received",
    title: "5. Feedback received",
    note: "The assurer gave example feedback (N03). The participant opens N03, lands on D08, chooses change or continue, and reaches D10 (or D10b).",
    build: feedbackReceived,
    to: "/research/emails",
  },
  {
    key: "no-feedback",
    title: "6. No feedback",
    note: "The assurer had no feedback (N04). Their Approver is set to use the service. N04 lands on D10; Send for approval shows D27 and creates N05.",
    build: (data) => {
      assurerAssigned(data);
      approverUsesService(data, true);
      planStateModel.recordAssurerReview(data, "");
    },
    to: "/research/emails",
  },
  {
    key: "approver-in-service",
    title: "7. Approver in the service",
    note: "Plan sent to their Approver (N05), signed in as the Approver. N05 lands on D11. Try approve (D28a, N06) and return (D28b, N07): start the scenario again between them.",
    build: withApprover,
    as: "approver",
    to: "/research/emails",
  },
  {
    key: "approver-not-in-service",
    title: "8. Approver not in the service",
    note: "Their Approver is set up without an account; the assurer had no feedback (N04). D10b → print D21 → D12 (At a meeting, By email, Another way) → D13. No email to the Approver.",
    build: (data) => {
      assurerAssigned(data);
      approverUsesService(data, false);
      planStateModel.recordAssurerReview(data, "");
    },
    to: "/research/emails",
  },
  {
    key: "plan-returned",
    title: "9. Plan returned",
    note: "Their Approver returned the plan with an example reason (N07). N07 → D14 → Change my plan → D02 with selections kept → back to D05.",
    build: (data) => {
      withApprover(data);
      const name = notIncludedName(data);
      const decide = data.decide;
      decide.approval = Object.assign(decide.approval || {}, {
        decision: "returned",
        by: data.setup.people.approver.name,
        returnReason: name ? "Please include " + name + " in this cycle." : "Please check the assessment dates with your team.",
        returnedDate: require("../data/helpers/notify").todayLabel(),
      });
      planStateModel.approverDecides(data, "returned");
    },
    to: "/research/emails",
  },
  {
    key: "old-link",
    title: "10. Old link",
    note: "The plan is with their Approver, but the participant opens N03 (feedback). Expect the dashboard with “You have already dealt with this feedback”, tile Waiting.",
    build: (data) => {
      feedbackReceived(data);
      approverUsesService(data, true);
      planStateModel.continueWithPlan(data);
      planStateModel.sendForApproval(data);
    },
    to: "/research/emails",
  },
  {
    key: "wrong-person",
    title: "11. Wrong person",
    note: "Signed in as a collaborator from another council (labelled example). Open any email link. Expect A36, showing only the council name.",
    build: feedbackReceived,
    as: "other-council",
    to: "/research/emails",
  },
  {
    key: "approver-changed",
    title: "12. Approver changed mid-flight",
    note: "The plan is with their Approver (N05). The participant changes the Approver in People. Expect D27b, N05 to the new Approver and N08 to the previous one.",
    build: withApprover,
    to: "/access",
  },
  {
    key: "example-council",
    title: "13. Example council",
    note: "The ready-made example council (Westborough Borough Council), untouched, for comparison. Starts at the beginning of Decide.",
    href: "/beta/go/decide-start",
  },
];

// Round 2 main task (13 November): set up the council, then decide what to assess. Registration and
// claiming were tested in round 1, so the participant starts signed in as the CAF Lead of a claimed
// council with nothing set up: Setup task list → dashboard → Decide tile → D05/D06.
// Example council and person (Eastvale is one of the three fictional demo councils).
const SETUP_AND_DECIDE = {
  href: "/research/start-setup-and-decide",
  council: { id: "eastvale", name: "Eastvale District Council" },
  person: { fullName: "Sam Rivera", jobTitle: "Head of IT" },
  email: "s.rivera@eastvale.gov.uk",
};

function startSetupAndDecide(data) {
  Object.keys(data).forEach((k) => {
    if (k !== "research") delete data[k];
  });
  data.claim = {
    council: Object.assign({}, SETUP_AND_DECIDE.council),
    person: Object.assign({}, SETUP_AND_DECIDE.person),
    oneLoginEmail: SETUP_AND_DECIDE.email,
  };
  data.setup = buildSetupSeedEmpty();
  data.decide = buildDecideSeedEmpty();
  data.access = buildAccessEmpty();
  const me = data.access.people[0];
  me.name = SETUP_AND_DECIDE.person.fullName;
  me.firstName = SETUP_AND_DECIDE.person.fullName.split(" ")[0];
  me.email = SETUP_AND_DECIDE.email;
  ensureSetup(data); // copies the council name from the claim
  acting.signInAs(data, "caf-lead");
}

function scenarioReady(data) {
  const setup = data.setup || {};
  return Boolean(setup.completed && hasApprover(setup) && (rankAssessableSystems(setup).length || orgIncluded(setup)));
}

// --- Routes -----------------------------------------------------------------------------

function routes(router) {
  router.get("/research/on", (req, res) => {
    setResearch(req.session.data, true);
    return res.redirect("/beta");
  });
  router.get("/research/off", (req, res) => {
    setResearch(req.session.data, false);
    return res.redirect("/beta");
  });

  // Everything below is hidden when the research switch is off.
  router.use("/research", (req, res, next) => {
    if (!researchOn(req.session.data)) return res.redirect("/beta");
    next();
  });

  // N00 — Emails sent in this session (research only).
  router.get("/research/emails", (req, res) => {
    const data = req.session.data;
    ensureSetup(data);
    ensureDecide(data);
    researchChrome(res);
    const emails = listEmails(data).map((e) => {
      const key = recipientKey(data, e);
      const recipient = acting.persona(data, key);
      return {
        id: e.id,
        emailId: e.emailId,
        to: e.to,
        subject: e.subject,
        hasLink: e.emailId !== "N08",
        signInAsKey: recipient.available && key !== acting.actingAs(data).key ? key : "",
      };
    });
    res.render("pages/research/emails", {
      pageTitle: "Emails sent in this session",
      emails,
      switcher: acting.switcherOptions(data),
      signedOut: acting.isSignedOut(data),
      returnTo: "/research/emails",
    });
  });

  // One email, as it would arrive (N01 to N08).
  router.get("/research/emails/:id", (req, res) => {
    const record = findEmail(req.session.data, req.params.id);
    if (!record) return res.redirect("/research/emails");
    researchChrome(res);
    const url = req.protocol + "://" + (req.get("x-forwarded-host") || req.get("host")) + "/go/" + record.id;
    res.render("pages/research/email", {
      pageTitle: record.subject,
      record,
      email: renderEmail(record, url),
    });
  });

  // Person switcher. ?to= must be a local path.
  router.get("/research/sign-in-as/:key", (req, res) => {
    acting.signInAs(req.session.data, req.params.key);
    const to = (req.query.to || "/research/emails").toString();
    return res.redirect(to.startsWith("/") && !to.startsWith("//") ? to : "/research/emails");
  });

  router.get("/research/sign-out", (req, res) => {
    acting.signOutKeepingData(req.session.data);
    return res.redirect("/research/emails");
  });

  // Round 2 main task: start on the Setup task list as the CAF Lead of a claimed, empty council.
  router.get(SETUP_AND_DECIDE.href, (req, res) => {
    startSetupAndDecide(req.session.data);
    return res.redirect("/setup/task-list");
  });

  // Scenarios.
  router.get("/research/scenario/:key", (req, res) => {
    const data = req.session.data;
    const scenario = SCENARIOS.find((s) => s.key === req.params.key);
    if (!scenario) return res.redirect("/beta");
    if (scenario.href) return res.redirect(scenario.href);
    if (scenario.fresh) {
      // Clear everything but the research switch; the participant starts as a brand-new user.
      Object.keys(data).forEach((k) => {
        if (k !== "research") delete data[k];
      });
      return res.redirect("/get-started");
    }
    ensureSetup(data);
    ensureDecide(data);
    if (!scenarioReady(data) && req.query.council !== "example") {
      researchChrome(res);
      return res.render("pages/research/needs-setup", { pageTitle: "This scenario needs a finished setup", scenario });
    }
    if (req.query.council === "example") {
      require("./beta").loadExampleCouncil(req);
      data.setup.completed = true;
    }
    scenario.build(data);
    acting.signInAs(data, scenario.as || "caf-lead");
    return res.redirect(scenario.to);
  });

  // The email-link resolver (D-2026-141, proposed). Order of checks from the A36 and R04e panels.
  router.get("/go/:id", (req, res) => {
    const data = req.session.data;
    ensureSetup(data);
    ensureDecide(data);
    const record = findEmail(data, req.params.id);
    if (!record) return res.redirect("/dashboard");
    // 1. Signed out → Internal Access, then back to this link (Dashboard Q7).
    if (acting.isSignedOut(data)) {
      data.signInReturn = { to: "/go/" + record.id, key: recipientKey(data, record) };
      return res.redirect("/internal-access");
    }
    const person = acting.currentPersona(data);
    // 2. No role at the council in the email → A36 (council name only).
    if (person.councilIds.indexOf(record.councilId) === -1) return renderA36(req, res, record, person);
    // 3. Signed in to a different council they also belong to → switch to it. The prototype holds
    //    one council per session, so the email's council is always the current one.
    // 4/5. Resolve by the plan's state now.
    return res.redirect(targetFor(data, record, person));
  });
}

module.exports = routes;
module.exports.researchMiddleware = researchMiddleware;
module.exports.SCENARIOS = SCENARIOS;
module.exports.SETUP_AND_DECIDE = SETUP_AND_DECIDE;
module.exports.researchOn = researchOn;
module.exports.setResearch = setResearch;
