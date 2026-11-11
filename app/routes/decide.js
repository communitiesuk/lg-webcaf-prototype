// app/routes/decide.js
// "Decide what to assess" (Decide v6) prototype section.
// Source of truth: Figma file mnOq3QRhTdiliuSuzQoNsX, page 393:2311 (Decide v6).
// Batch 1: the CNI gate — D23 (any CNI?), D24 (check none), D25 (add by name), D26 (added).

const {
  ensureDecide,
  applyDecideChrome,
  applyDecideMinimalChrome,
  getSystem,
  deriveCriticality,
  cniSystems,
  nonCniSystems,
  alreadyAssessedSystems,
  hasUnratedInScope,
  buildSystemChoiceRows,
  rankAssessableSystems,
  includedAssessments,
  buildPlanSummary,
  buildPriorityWarning,
  isCniFlaggedInSetup,
  showCniScreens,
  hasApprover,
  hasAssurer,
  assurerLine,
  orgIncluded,
  formatToday,
  assessedLabel,
} = require("../data/helpers/decide");
// The plan state model (round 2 build): the state drives the screen, the dashboard tile and the emails.
const planStateModel = require("../data/helpers/plan-state");
const { planState, screenFor, syncApprover } = planStateModel;
const { currentPersona, currentCouncil, OTHER_COUNCIL } = require("../data/helpers/acting-as");
// Onboarding bookings are owned by the Assurance activities section (single source of truth).
const { ensureAssurance } = require("../data/helpers/assurance");

function clean(value) {
  return (value || "").toString().trim();
}

// Where "Back" goes from the first Decide screen the person saw: D23 if the CNI screens ran,
// otherwise the dashboard (Decide is entered from S31 or the dashboard).
// Back from D02/D20 returns to the last CNI screen the person actually answered: D26 (their CNI
// list) after Yes, D24 after confirming No, D23 otherwise. No CNI screens → the dashboard.
function firstScreenBackHref(setup, decide) {
  if (!showCniScreens(setup)) return "/dashboard";
  const answer = decide && decide.cniAnswer;
  if (answer === "yes" && cniSystems(setup).length) return "/decide/cni/added";
  if (answer === "no") return "/decide/cni/check";
  return "/decide/cni";
}

// Back from D25 (search for a CNI system) returns to where the person came from: the D26 list
// after "add another", otherwise the D23 question.
function cniAddBackHref(setup, decide) {
  return decide.cniAddFrom === "added" && cniSystems(setup).length ? "/decide/cni/added" : "/decide/cni";
}

// Read and clear the one-off "Approver changed" banner.
function takeApproverChange(decide) {
  const plan = decide.plan || {};
  const change = plan.approverChange || null;
  delete plan.approverChange;
  return change;
}

// Which plan states each Decide path is open in. Anything else goes to the screen for the current
// state (CAF Lead), the assurer's councils list (assurer screens) or the dashboard (Approver screens).
const BUILD_PATHS = ["/decide/cni", "/decide/systems", "/decide/confirm", "/decide/timing", "/decide/review"];
const BUILD_STATES = ["not_started", "in_progress"];
const AFTER_ASSIGNMENT = [
  "with_assurer",
  "feedback_received",
  "reviewed_no_feedback",
  "ready_to_send",
  "awaiting_approval",
  "awaiting_recorded_decision",
  "returned",
  "approved",
];
const COUNCIL_PATHS = {
  "/decide/approver-needed": ["no_approver"],
  "/decide/no-assurer": ["waiting_for_assurer_assignment"],
  "/decide/sent": AFTER_ASSIGNMENT,
  "/decide/feedback": ["feedback_received"],
  "/decide/send-for-approval": ["reviewed_no_feedback", "ready_to_send"],
  "/decide/sent-for-approval": ["awaiting_approval"],
  "/decide/record-approval": ["awaiting_recorded_decision"],
  "/decide/returned": ["returned"],
  "/decide/approved": ["approved"],
  "/decide/change-plan": ["feedback_received", "returned"],
};

function guardDecidePath(req) {
  const p = req.path.replace(/\/$/, "") || "/decide";
  const data = req.session.data;
  const setup = data.setup;
  const state = planState(data);
  const own = screenFor(data);
  if (p === "/decide" || p === "/decide/plan-summary") return null;
  if (p === "/decide/no-assurer/assign") return hasAssurer(setup) ? own : null;
  // Assurer screens (D07, D07a, D07b, AL30).
  if (p === "/decide/assurer/councils" || p === "/decide/review-sent" || p === "/decide/assurer-review/setup") return null;
  if (p === "/decide/assurer-review") return state === "with_assurer" ? null : "/decide/assurer/councils";
  // Approver screens (D11, D28a/b).
  if (p === "/decide/approve") return state === "awaiting_approval" ? null : "/dashboard";
  if (p === "/decide/approve/done") return state === "approved" || state === "returned" ? null : "/dashboard";
  // Building the plan (D23 to D05).
  if (BUILD_PATHS.some((b) => p === b || p.startsWith(b + "/"))) {
    if (BUILD_STATES.indexOf(state) === -1) return own;
    if (p.startsWith("/decide/cni") && !showCniScreens(setup)) return "/decide/systems";
    return null;
  }
  const allowed = COUNCIL_PATHS[p];
  if (allowed) return allowed.indexOf(state) === -1 ? own : null;
  return null;
}

module.exports = function (router) {
  // Decide chrome + seed for every /decide request (council chrome by default; the
  // assurer/approver screens in later batches override to the minimal nav per-route).
  router.use((req, res, next) => {
    if (!req.path.startsWith("/decide")) return next();
    ensureDecide(req.session.data);
    applyDecideChrome(req, res);
    // The Approver changed in People while the plan waits for a decision: the plan goes to the
    // new Approver (D27b or D12b), with N05 and N08 (plan-state.js syncApprover).
    syncApprover(req.session.data);
    const target = guardDecidePath(req);
    if (target && target !== req.path) return res.redirect(target);
    next();
  });

  // Section entry (dashboard "Start this cycle" / "Continue", S31, the Assessments nav). Resumes
  // where the plan is: approved (D13), returned (D14), waiting on the assurer (D06/D09) or for
  // approval after the assurer's review. Otherwise starts the cycle: D23 if the council chose a CNI
  // sector in setup, else straight to D02 (clearing stale CNI flags, as no system can be CNI).
  router.get("/decide", (req, res) => {
    const setup = req.session.data.setup;
    const state = planState(req.session.data);
    // Approved: Decide is finished and "Assessments" means the assessments themselves, which are
    // not in this prototype yet. (D13 is still shown straight after approval, and N06 lands on it.)
    if (state === "approved") return res.redirect("/dashboard/not-in-this-prototype");
    if (state === "not_started" && !isCniFlaggedInSetup(setup)) {
      (setup.criticalSystems || []).forEach((s) => {
        s.cni = false;
      });
    }
    return res.redirect(screenFor(req.session.data));
  });

  // D01 — You need to confirm your Approver before you start a cycle (Decide v8, proposal)
  router.get("/decide/approver-needed", (req, res) => {
    res.render("pages/decide/approver-needed", {
      pageTitle: "You need to confirm your Approver before you start a cycle",
      backHref: "/dashboard",
    });
  });

  // ----- Batch 1: CNI gate -----------------------------------------------------------

  // D23 — Are any of your critical systems critical national infrastructure (CNI)? (393:3118)
  router.get("/decide/cni", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    res.render("pages/decide/cni", {
      pageTitle: "Are any of your critical systems part of critical national infrastructure (CNI)?",
      backHref: "/dashboard",
      cniFlaggedInSetup: isCniFlaggedInSetup(setup),
      answer: decide.cniAnswer,
    });
  });

  router.post("/decide/cni", (req, res) => {
    ensureDecide(req.session.data);
    const setup = req.session.data.setup;
    const decide = req.session.data.decide;
    const posted = clean(req.session.data.cniAnswer);
    delete req.session.data.cniAnswer;
    if (posted !== "yes" && posted !== "no") {
      return res.render("pages/decide/cni", {
        pageTitle: "Error: Are any of your critical systems part of critical national infrastructure (CNI)?",
        backHref: "/dashboard",
        cniFlaggedInSetup: isCniFlaggedInSetup(setup),
        answer: "",
        showError: true,
      });
    }
    const answer = posted;
    decide.cniAnswer = answer;
    decide.cniAddFrom = "question";
    // Yes: add CNI systems (D25), or straight to the list (D26) if every system is already CNI.
    if (answer === "yes") return res.redirect(nonCniSystems(setup).length ? "/decide/cni/add" : "/decide/cni/added");
    // No: if CNI was flagged in Setup (S03), show the consistency check (D24).
    if (isCniFlaggedInSetup(setup)) {
      return res.redirect("/decide/cni/check");
    }
    return res.redirect("/decide/systems"); // D02 (Batch 2)
  });

  // D24 — Are you sure none of your critical systems are CNI? (393:3174)
  router.get("/decide/cni/check", (req, res) => {
    ensureDecide(req.session.data);
    res.render("pages/decide/cni-check", {
      pageTitle: "Confirm that none of your critical systems are part of CNI",
      backHref: "/decide/cni",
    });
  });

  router.post("/decide/cni/check", (req, res) => {
    ensureDecide(req.session.data);
    const setup = req.session.data.setup;
    // "Yes, none of them are CNI" — confirm none; clear any system CNI flags.
    (setup.criticalSystems || []).forEach((s) => {
      s.cni = false;
    });
    req.session.data.decide.cniAnswer = "no";
    return res.redirect("/decide/systems"); // D02 (Batch 2)
  });

  // D25 — Which critical system is CNI? (393:3212) — accessible autocomplete
  router.get("/decide/cni/add", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    // Every system is already CNI — nothing left to add.
    if (!nonCniSystems(setup).length) return res.redirect("/decide/cni/added");
    renderCniAdd(res, setup, req.session.data.decide, false);
  });

  router.post("/decide/cni/add", (req, res) => {
    ensureDecide(req.session.data);
    const setup = req.session.data.setup;
    const systemId = clean(req.session.data.cniSystemId);
    delete req.session.data.cniSystemId;
    const system = getSystem(setup, systemId);
    if (!system) return renderCniAdd(res, setup, req.session.data.decide, true);
    system.cni = true;
    req.session.data.decide.cniAnswer = "yes";
    return res.redirect("/decide/cni/added");
  });

  // D26 — You have added N CNI system(s) (393:3229) — add-another pattern
  router.get("/decide/cni/added", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const added = cniSystems(setup).map((s) => ({
      id: s.id,
      name: s.name,
      criticality: deriveCriticality(s.impact) || "Not yet rated",
    }));
    // All CNI designations removed — ask the CNI question again.
    if (!added.length) {
      req.session.data.decide.cniAnswer = "";
      return res.redirect("/decide/cni");
    }
    res.render("pages/decide/cni-added", {
      pageTitle: `You have selected ${added.length} CNI system${added.length === 1 ? "" : "s"}`,
      backHref: "/decide/cni",
      added,
    });
  });

  router.post("/decide/cni/added", (req, res) => {
    ensureDecide(req.session.data);
    const answer = clean(req.session.data.addAnotherCni);
    delete req.session.data.addAnotherCni;
    if (answer !== "yes" && answer !== "no") {
      const setup = req.session.data.setup;
      const added = cniSystems(setup).map((s) => ({ id: s.id, name: s.name, criticality: deriveCriticality(s.impact) || "Not yet rated" }));
      return res.render("pages/decide/cni-added", {
        pageTitle: `Error: You have selected ${added.length} CNI system${added.length === 1 ? "" : "s"}`,
        backHref: "/decide/cni",
        added,
        showError: true,
      });
    }
    if (answer === "yes") {
      req.session.data.decide.cniAddFrom = "added";
      return res.redirect("/decide/cni/add");
    }
    return res.redirect("/decide/systems"); // D02 (Batch 2)
  });

  // Remove a CNI designation from the D26 list — confirm first (GET), then remove (POST),
  // matching every other "remove" in the service. The destructive action is never a GET link.
  router.get("/decide/cni/added/:systemId/remove", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const system = getSystem(setup, req.params.systemId);
    if (!system || !system.cni) return res.redirect("/decide/cni/added");
    res.render("pages/decide/cni-remove", {
      pageTitle: `Are you sure you want to remove CNI status from ${system.name}?`,
      backHref: "/decide/cni/added",
      system,
    });
  });

  router.post("/decide/cni/added/:systemId/remove", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const system = getSystem(setup, req.params.systemId);
    if (system) system.cni = false;
    return res.redirect("/decide/cni/added");
  });

  // ----- Batch 2: choose critical systems ---------------------------------------------

  // D02 / D22 / D15 — Which critical systems will you assess? (393:2337 / 393:3058 / 393:2834)
  // One screen in three states: base (D02), unrated-system variant (D22), error (D15).
  router.get("/decide/systems", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const rows = buildSystemChoiceRows(setup, decide.cycle.selectedSystems);

    // D20 — nothing left: no assessable systems AND the organisation assessment is done.
    if (rows.length === 0 && !orgIncluded(setup)) {
      return res.redirect("/decide/systems/nothing-left");
    }

    renderSystems(res, setup, decide, { rows, showAll: req.query.all === "1" });
  });

  router.post("/decide/systems", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    let chosen = req.session.data.whichSystems;
    delete req.session.data.whichSystems;
    if (typeof chosen === "string") chosen = [chosen];
    chosen = Array.isArray(chosen) ? chosen : [];

    // "None this cycle, the organisation assessment only" is exclusive.
    if (chosen.indexOf("none") !== -1) {
      decide.cycle.selectedSystems = [];
      decide.cycle.noneOnly = true;
      return res.redirect("/decide/confirm"); // D03 (Batch 3)
    }

    const systemIds = chosen.filter((id) => getSystem(setup, id));
    decide.cycle.noneOnly = false;

    // D15 — nothing selected: re-render with the error summary.
    if (systemIds.length === 0) {
      const rows = buildSystemChoiceRows(setup, []);
      return renderSystems(res, setup, decide, { rows, showAll: true, showError: true });
    }

    decide.cycle.selectedSystems = systemIds;

    // D19 — more than three chosen: confirm before continuing.
    if (systemIds.length > 3) {
      return res.redirect("/decide/systems/too-many");
    }
    return res.redirect("/decide/confirm"); // D03 (Batch 3)
  });

  // D19 — warning: more than three systems chosen (393:2938)
  router.get("/decide/systems/too-many", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const rows = buildSystemChoiceRows(setup, decide.cycle.selectedSystems).filter((r) => r.checked);
    res.render("pages/decide/systems-too-many", {
      pageTitle: "Which critical systems will you assess?",
      backHref: "/decide/systems",
      rows,
      count: rows.length,
    });
  });

  router.post("/decide/systems/too-many", (req, res) => {
    ensureDecide(req.session.data);
    return res.redirect("/decide/confirm"); // D03 (Batch 3)
  });

  // D20 — edge: nothing new to assess this cycle (393:2977)
  router.get("/decide/systems/nothing-left", (req, res) => {
    ensureDecide(req.session.data);
    res.render("pages/decide/systems-nothing-left", {
      pageTitle: "There is nothing new to assess this cycle",
      backHref: firstScreenBackHref(req.session.data.setup, req.session.data.decide),
    });
  });

  // ----- Batch 3: confirm, timing, review ---------------------------------------------

  // D03 — Confirm what this cycle covers (393:2415)
  router.get("/decide/confirm", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const selected = (decide.cycle && decide.cycle.selectedSystems) || [];
    const ranked = rankAssessableSystems(setup);
    res.render("pages/decide/confirm", {
      pageTitle: "Confirm what you will assess in this cycle",
      backHref: "/decide/systems",
      orgIncluded: orgIncluded(setup),
      selectedNames: ranked.filter((s) => selected.indexOf(s.id) !== -1).map((s) => s.name),
      notIncludedNames: ranked.filter((s) => selected.indexOf(s.id) === -1).map((s) => s.name),
    });
  });

  router.post("/decide/confirm", (req, res) => {
    ensureDecide(req.session.data);
    req.session.data.decide.cycle.confirmed = true;
    return res.redirect("/decide/timing");
  });

  // D04 / D16 — Roughly when will each assessment happen? (393:2447 / 393:2871)
  router.get("/decide/timing", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const assessments = includedAssessments(setup, decide).map((a) => {
      const t = (decide.timing || {})[a.id];
      let choice = "", month = "", year = "";
      if (t === "tbc") choice = "tbc";
      else if (t && typeof t === "object" && t.month) { choice = "month"; month = t.month; year = t.year; }
      return { id: a.id, name: a.name, kind: a.kind, choice, month, year };
    });
    renderTiming(res, assessments, []);
  });

  router.post("/decide/timing", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const data = req.session.data;

    const assessments = includedAssessments(setup, decide).map((a) => {
      const choice = clean(data["timing-" + a.id]);
      const month = clean(data["timing-" + a.id + "-month"]);
      const year = clean(data["timing-" + a.id + "-year"]);
      return { id: a.id, name: a.name, kind: a.kind, choice, month, year };
    });
    // Clear the posted fields from the shared data bag.
    assessments.forEach((a) => {
      delete data["timing-" + a.id];
      delete data["timing-" + a.id + "-month"];
      delete data["timing-" + a.id + "-year"];
    });

    const errors = [];
    assessments.forEach((a) => {
      const label = a.kind === "org" ? "organisation assessment" : a.name;
      if (a.choice !== "month" && a.choice !== "tbc") {
        errors.push({ id: a.id, message: "Tell us when you expect the " + label + " to happen, or select ‘I do not know yet’" });
        return;
      }
      if (a.choice !== "month") return;
      // GOV.UK month-and-year validation. "the organisation assessment" / a system's own name.
      const what = a.kind === "org" ? "the organisation assessment" : a.name;
      const m = Number(a.month);
      const y = Number(a.year);
      if (!a.month && !a.year) {
        errors.push({ id: a.id, field: "", message: "Enter the month and year for " + what });
      } else if (!a.month) {
        errors.push({ id: a.id, field: "month", message: "The date for " + what + " must include a month" });
      } else if (!a.year) {
        errors.push({ id: a.id, field: "year", message: "The date for " + what + " must include a year" });
      } else if (!/^\d{1,2}$/.test(a.month) || m < 1 || m > 12) {
        errors.push({ id: a.id, field: "month", message: "Month must be a number from 1 to 12" });
      } else if (!/^\d{4}$/.test(a.year)) {
        errors.push({ id: a.id, field: "year", message: "Year must include 4 numbers" });
      } else {
        const now = new Date();
        if (y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1)) {
          errors.push({ id: a.id, field: "", message: "The date for " + what + " must be this month or in the future" });
        }
      }
    });

    if (errors.length) {
      return renderTiming(res, assessments, errors);
    }

    decide.timing = decide.timing || {};
    assessments.forEach((a) => {
      decide.timing[a.id] = a.choice === "month" ? { month: a.month, year: a.year } : "tbc";
    });
    return res.redirect("/decide/review");
  });

  // D05 — Review your plan for this cycle (393:2504)
  router.get("/decide/review", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    res.render("pages/decide/review", {
      pageTitle: "Confirm your plan for this cycle",
      backHref: "/decide/timing",
      planSummary: buildPlanSummary(setup, decide),
      // "Check the systems that are not included" — only when true.
      planWarning: buildPriorityWarning(setup, decide),
      // Figma v7 D05 note, shown after the plan summary.
      planNote: {
        warning: "Your assurer will review your plan before it goes for approval.",
        body: "Next, arrange a call with your assurer to discuss your plan.",
      },
    });
  });

  router.post("/decide/review", (req, res) => {
    ensureDecide(req.session.data);
    // Sending the plan starts this cycle's onboarding. Reset the cycle's assurance activities to
    // "not booked yet" (the single source of truth, shared with the Assurance section) so D09
    // prompts the user to book them. Bookings made afterwards flow back to D09.
    const assurance = ensureAssurance(req.session.data);
    ["onboarding-org", "onboarding-systems", "pre-call"].forEach((id) => {
      assurance.activities[id] = { status: "not-booked", date: "" };
    });
    // A new (or re-sent) plan goes back through review and approval. N02 to the assurer if one is
    // assigned (D09); otherwise D06.
    planStateModel.sendToAssurer(req.session.data);
    return res.redirect(screenFor(req.session.data));
  });

  // ----- Batch 4: assurer / send flow -------------------------------------------------

  // D06 — Waiting for your assurer (393:2539)
  router.get("/decide/no-assurer", (req, res) => {
    res.render("pages/decide/no-assurer", {
      pageTitle: "Waiting for an assurer",
    });
  });

  // Prototype-only control on D06: simulate MHCLG assigning an assurer, so research can continue
  // to D09 and the assurer review. The assurer is a clearly labelled stub — MHCLG assigns the real
  // one, so there is no user-entered value.
  router.get("/decide/no-assurer/assign", (req, res) => {
    // N01 to the CAF Lead; the waiting plan goes to the assurer (N02).
    planStateModel.assignAssurer(req.session.data, { name: "Example assurer", organisation: "Example supplier", stub: true });
    return res.redirect("/decide");
  });

  // D09 — Book your onboarding calls (393:3103)
  router.get("/decide/sent", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    if (!hasAssurer(setup)) return res.redirect("/decide/no-assurer");
    const hasSystems = ((decide.cycle && decide.cycle.selectedSystems) || []).length > 0;
    const acts = ensureAssurance(req.session.data).activities || {};
    const rows = [];
    if (orgIncluded(setup)) rows.push(bookingRow("onboarding-org", "Step 1: Onboarding, organisation assessment", acts["onboarding-org"]));
    if (hasSystems) rows.push(bookingRow("onboarding-systems", "Step 1: Onboarding, critical systems", acts["onboarding-systems"]));
    res.render("pages/decide/sent", {
      pageTitle: "Book your onboarding calls",
      backHref: "/decide/review",
      rows,
    });
  });

  // D07 — ASSURER: Review their setup and plan (393:2572)
  router.get("/decide/assurer-review", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    applyDecideMinimalChrome(req, res); // assurer chrome (only Sign out, no council identity)
    res.render("pages/decide/assurer-review", assurerReviewModel(setup, decide));
  });

  router.post("/decide/assurer-review", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const data = req.session.data;
    const answer = clean(data.assurerHasFeedback);
    const feedback = clean(data.assurerFeedback);
    delete data.assurerHasFeedback;
    delete data.assurerFeedback;
    const errors = [];
    if (answer !== "yes" && answer !== "no") {
      errors.push({ id: "assurerHasFeedback", text: "Select yes if you have feedback on this plan" });
    } else if (answer === "yes" && !feedback) {
      errors.push({ id: "assurerFeedback", text: "Enter your feedback" });
    }
    if (errors.length) {
      applyDecideMinimalChrome(req, res);
      return res.render("pages/decide/assurer-review", assurerReviewModel(setup, decide, { answer, feedback, errors }));
    }
    // Yes with feedback → N03, the council sees D08. No → N04, the council goes to D10/D10b.
    planStateModel.recordAssurerReview(req.session.data, answer === "yes" ? feedback : "");
    return res.redirect("/decide/review-sent");
  });

  // D07b — ASSURER: Review sent (Decide v8, proposal). Ends the assurer's part of Decide.
  router.get("/decide/review-sent", (req, res) => {
    applyDecideMinimalChrome(req, res);
    res.render("pages/decide/review-sent", {
      pageTitle: "Review sent",
      councilName: currentCouncil(req.session.data).name,
    });
  });

  // AL30 — ASSURER: Your councils (Assurance allocation v1, workshop proposal; built for round 2 so
  // D07, D07b and old N02 links have somewhere to land). The participant's council plus one
  // labelled example council. Status lines other than "Plan sent for your review" and
  // "Setup in progress" are the build's own (no Figma copy): flagged in the Figma notes.
  router.get("/decide/assurer/councils", (req, res) => {
    const data = req.session.data;
    applyDecideMinimalChrome(req, res);
    const state = planState(data);
    const plan = data.decide.plan || {};
    const assurer = currentPersona(data).role === "assurer" ? currentPersona(data) : null;
    const setup = data.setup;
    let status = "Setup in progress";
    let action = { text: "View", href: "/decide/assurer-review/setup" };
    if (state === "with_assurer") {
      status = "Plan sent for your review";
      action = { text: "Review", href: "/decide/assurer-review" };
    } else if (plan.assurerReviewed) {
      status = "Review sent" + (plan.reviewedOn ? " on " + plan.reviewedOn : "");
    }
    const banner = data.oneOffBanner && data.oneOffBanner.where === "councils" ? data.oneOffBanner : null;
    if (banner) delete data.oneOffBanner;
    res.render("pages/decide/assurer-councils", {
      pageTitle: "Your councils",
      assurerLine: [(setup.assurer && setup.assurer.name) || (assurer && assurer.name), setup.assurer && setup.assurer.organisation].filter(Boolean).join(", "),
      banner,
      councils: [
        { name: currentCouncil(data).name, status, action },
        { name: OTHER_COUNCIL.name, status: "Setup in progress", action: { text: "View", href: "/dashboard/not-in-this-prototype" } },
      ],
    });
  });

  // D07a (ADDITION, not in Figma v7) — ASSURER: read-only view of the council's setup, reached
  // from the three "View" links on D07. Assurers cannot change anything here.
  router.get("/decide/assurer-review/setup", (req, res) => {
    const setup = req.session.data.setup;
    applyDecideMinimalChrome(req, res);
    const ctx = setup.councilContext || {};
    const cni = ctx.cni && ctx.cni !== "none" ? sectorLabel(ctx.cni) : "None";
    res.render("pages/decide/assurer-setup", {
      pageTitle: "The council’s setup",
      backHref: "/decide/assurer-review",
      councilName: (setup.council && setup.council.name) || "",
      context: {
        sectorConfirmed: Boolean(setup.sectorContext && setup.sectorContext.confirmed),
        councilContextProvided: Boolean(ctx.completed),
        cniSector: ctx.completed ? cni : "",
        orgAssessedBefore: { yes: "Yes", no: "No", dontknow: "I don't know" }[(setup.organisationAssessment || {}).answer] || "Not answered",
        methodology: setup.methodology && setup.methodology.completed
          ? (setup.methodology.approach === "five-lens" ? "GovAssure Five Lens Model" : "Their own methodology")
          : "",
      },
      services: (setup.essentialServices || []).map((s) => s.name),
      systems: (setup.criticalSystems || []).map((s) => {
        const parts = [deriveCriticality(s.impact) || "Not yet rated"];
        if (s.cni) parts.push("CNI");
        parts.push(s.assessedBefore === "yes" ? assessedLabel(s) : "Not yet assessed");
        return { name: s.name, detail: parts.join(" · ") };
      }),
    });
  });

  // D08 — Your assurer has commented on your plan (393:2617)
  router.get("/decide/feedback", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    res.render("pages/decide/feedback", {
      pageTitle: "Your assurer has given feedback on your plan",
      backHref: "/decide/sent",
      assurerName: assurerLine(setup) || "Your assurer",
      feedback: decide.assurerFeedback,
    });
  });

  // D08 "Continue with current plan and send for approval" → D10 (or D10b).
  router.post("/decide/feedback", (req, res) => {
    planStateModel.continueWithPlan(req.session.data);
    return res.redirect("/decide/send-for-approval");
  });

  // D08 "Change plan" / D14 "Change my plan": back to D02 with the current selections; the plan is
  // in progress again.
  router.post("/decide/change-plan", (req, res) => {
    planStateModel.changePlan(req.session.data);
    return res.redirect("/decide/systems");
  });

  // D10 / D10b — Send your plan for approval (Decide v8). D10 when the Approver has an account
  // (sends N05, then D27); D10b when they do not (no email; the CAF Lead records it on D12).
  router.get("/decide/send-for-approval", (req, res) => {
    const setup = req.session.data.setup;
    const decide = req.session.data.decide;
    const approver = (setup.people && setup.people.approver) || {};
    res.render("pages/decide/send-for-approval", {
      pageTitle: "Send your plan for approval",
      backHref: decide.assurerFeedback ? "/decide/feedback" : "/dashboard",
      inService: Boolean(approver.hasAccount),
      approverLine: [approver.name, approver.jobTitle].filter(Boolean).join(", "),
    });
  });

  router.post("/decide/send-for-approval", (req, res) => {
    const setup = req.session.data.setup;
    const approver = (setup.people && setup.people.approver) || {};
    if (approver.hasAccount) {
      planStateModel.sendForApproval(req.session.data);
      return res.redirect("/decide/sent-for-approval");
    }
    planStateModel.startRecordingDecision(req.session.data);
    return res.redirect("/decide/record-approval");
  });

  // ----- Batch 5: approval flow + printable plan summary ------------------------------

  // D27 (ADDITION, not in Figma v7) — council: Plan sent for approval. Shown to the CAF Lead when
  // the Approver uses the service, instead of taking the CAF Lead into the Approver's view (D11).
  router.get("/decide/sent-for-approval", (req, res) => {
    const setup = req.session.data.setup;
    const decide = req.session.data.decide;
    const approver = (setup.people && setup.people.approver) || {};
    const change = takeApproverChange(decide);
    res.render("pages/decide/sent-for-approval", {
      pageTitle: "Plan sent for approval",
      approverName: (decide.plan && decide.plan.sentForApprovalTo) || approver.name || "",
      approverChange: change,
    });
  });

  // D28 (ADDITION, not in Figma v7) — APPROVER: confirmation after submitting a decision on D11,
  // in the Approver's own chrome, instead of showing them the CAF Lead's D13/D14.
  router.get("/decide/approve/done", (req, res) => {
    const setup = req.session.data.setup;
    const decide = req.session.data.decide;
    const decision = (decide.approval && decide.approval.decision) || "";
    if (decision !== "approved" && decision !== "returned") return res.redirect("/decide/approve");
    applyDecideMinimalChrome(req, res);
    const people = setup.people || {};
    res.render("pages/decide/approve-done", {
      pageTitle: decision === "approved" ? "Plan approved" : "Plan returned",
      decision,
      councilName: (setup.council && setup.council.name) || "",
      cafLeadName: (people.cafLead && people.cafLead.name) || "",
    });
  });

  // D11 / D17 — APPROVER: Approve this cycle's plan (393:2685 / 393:2905)
  router.get("/decide/approve", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    applyDecideMinimalChrome(req, res); // approver chrome
    res.render("pages/decide/approve", approveModel(setup, decide, {}));
  });

  router.post("/decide/approve", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const data = req.session.data;
    const approver = (setup.people && setup.people.approver) || {};
    const decision = clean(data.approveDecision);
    const reason = clean(data.returnReason);
    delete data.approveDecision;
    delete data.returnReason;

    decide.approval = decide.approval || {};

    if (decision === "approve") {
      decide.approval.decision = "approved";
      decide.approval.by = approver.name || "";
      decide.approval.date = formatToday(); // approved in the service today
      planStateModel.approverDecides(data, "approved"); // D28a, N06
      return res.redirect("/decide/approve/done");
    }
    if (decision === "return") {
      if (!reason) {
        applyDecideMinimalChrome(req, res);
        return res.render("pages/decide/approve", approveModel(setup, decide, { decision: "return", reason: "", showError: true }));
      }
      decide.approval.decision = "returned";
      decide.approval.by = approver.name || "";
      decide.approval.returnReason = reason;
      decide.approval.returnedDate = formatToday();
      planStateModel.approverDecides(data, "returned"); // D28b, N07
      return res.redirect("/decide/approve/done");
    }
    // D11e — no decision chosen.
    applyDecideMinimalChrome(req, res);
    return res.render("pages/decide/approve", approveModel(setup, decide, { noDecision: true }));
  });

  // D12 — council: Record your Approver's decision (393:2726)
  router.get("/decide/record-approval", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const approver = (setup.people && setup.people.approver) || {};
    const approval = decide.approval || {};
    const parts = approval.dateParts || {};
    res.locals.approverChange = takeApproverChange(decide);
    renderRecordApproval(res, setup, decide, {
      day: parts.day || "",
      month: parts.month || "",
      year: parts.year || "",
      how: approval.how || "",
      howOther: approval.howOther || "",
      link: approval.link || "",
    });
  });

  router.post("/decide/record-approval", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const data = req.session.data;
    const approver = (setup.people && setup.people.approver) || {};
    const entered = {
      day: clean(data["approvalDate-day"]),
      month: clean(data["approvalDate-month"]),
      year: clean(data["approvalDate-year"]),
      how: clean(data.approvalHow),
      howOther: clean(data.approvalHowOther),
      link: clean(data.approvalLink),
    };
    ["approvalDate-day", "approvalDate-month", "approvalDate-year", "approvalHow", "approvalHowOther", "approvalLink"].forEach((k) => delete data[k]);
    const errors = [];
    const dateError = validateApprovalDate(entered);
    if (dateError) errors.push({ id: "approvalDate", field: dateError.field, text: dateError.text });
    if (!entered.how) errors.push({ id: "approvalHow", text: "Select how the plan was approved" });
    else if (entered.how === "another" && !entered.howOther) {
      errors.push({ id: "approvalHowOther", text: "Describe how the plan was approved" });
    }
    if (errors.length) return renderRecordApproval(res, setup, decide, entered, errors);
    decide.approval = decide.approval || {};
    decide.approval.decision = "approved";
    decide.approval.by = approver.name || "";
    decide.approval.date = formatDate(Number(entered.day), Number(entered.month), Number(entered.year));
    decide.approval.dateParts = { day: entered.day, month: entered.month, year: entered.year };
    decide.approval.how = entered.how;
    // Saved for any screen that later shows the approval method (none does yet).
    decide.approval.howOther = entered.how === "another" ? entered.howOther : "";
    planStateModel.recordApproval(req.session.data); // no email: the CAF Lead already knows
    decide.approval.link = entered.link;
    return res.redirect("/decide/approved");
  });

  // D13 — council: Cycle approved (393:2769)
  router.get("/decide/approved", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const approver = (setup.people && setup.people.approver) || {};
    const approval = decide.approval || {};
    res.render("pages/decide/approved", {
      pageTitle: "Cycle approved",
      approvedBy: approval.by || approver.name || "",
      approvedDate: approval.date || "",
    });
  });

  // D14 — council: Your plan has been returned (393:2800)
  router.get("/decide/returned", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const approver = (setup.people && setup.people.approver) || {};
    const approval = decide.approval || {};
    res.render("pages/decide/returned", {
      pageTitle: "Your plan has been returned",
      approverName: approval.by || approver.name || "",
      returnedDate: approval.returnedDate || "",
      returnReason: approval.returnReason || "",
    });
  });

  // D21 — council: printable Plan summary (393:3013)
  router.get("/decide/plan-summary", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const people = setup.people || {};
    res.render("pages/decide/plan-summary", {
      pageTitle: "Plan summary",
      councilName: (setup.council && setup.council.name) || "",
      // The cycle being planned starts now (the year the plan is prepared).
      cycleYear: new Date().getFullYear(),
      cafLeadName: (people.cafLead && people.cafLead.name) || "",
      approverName: (people.approver && people.approver.name) || "",
      assurerLine: assurerLine(setup),
      planSummary: buildPlanSummary(setup, decide),
      planWarning: buildPriorityWarning(setup, decide),
    });
  });
};

// View model for the approver's D11/D17 screen.
function approveModel(setup, decide, opts) {
  const people = setup.people || {};
  const hasFeedback = Boolean(decide.assurerFeedback);
  const assurer = assurerLine(setup);
  return {
    pageTitle: (opts.showError || opts.noDecision ? "Error: " : "") + "Approve the plan for this cycle",
    councilName: (setup.council && setup.council.name) || "",
    cafLeadName: (people.cafLead && people.cafLead.name) || "",
    planSummary: buildPlanSummary(setup, decide),
    planWarning: buildPriorityWarning(setup, decide),
    assurerLine: assurer ? assurer + (hasFeedback ? " · Gave feedback on the plan" : "") : "",
    hasFeedback,
    feedback: decide.assurerFeedback || "",
    decision: opts.decision || "",
    reason: opts.reason || "",
    showError: Boolean(opts.showError),
    noDecision: Boolean(opts.noDecision),
  };
}

// A D09 onboarding booking row from a { status, date } entry.
function bookingRow(activityId, label, entry) {
  const status = entry && entry.status;
  const done = status === "booked" || status === "happened";
  // Status + link come from assurance.activities (shared with the Assurance section), so bookings
  // made there show here and vice versa. Link to that section's booking journey for this activity.
  let value = "Not booked yet";
  if (status === "happened") value = "Call completed";
  else if (status === "booked") value = "Booked for " + (entry.date || "");
  return {
    label,
    value,
    action: done ? "Change" : "Book",
    href: (done ? "/assurance-activities/update/" : "/assurance-activities/book/") + activityId + "?return=/decide/sent",
  };
}

// View model for the assurer's D07 review screen.
function assurerReviewModel(setup, decide, form) {
  const values = form || {};
  const errors = values.errors || [];
  const reviewed = Boolean(decide.plan && decide.plan.assurerReviewed);
  const serviceCount = (setup.essentialServices || []).length;
  const systemCount = (setup.criticalSystems || []).length;
  const unratedCount = (setup.criticalSystems || []).filter((s) => !deriveCriticality(s.impact)).length;
  const ctx = setup.councilContext || {};
  const contextDone = Boolean(setup.sectorContext && setup.sectorContext.confirmed && ctx.completed);
  return {
    pageTitle: (errors.length ? "Error: " : "") + "Review the council’s setup and plan",
    backHref: "/decide/assurer/councils",
    councilName: (setup.council && setup.council.name) || "",
    // Everything added in Setup is in scope by definition, so "all in scope" holds.
    contextSummary: contextDone ? "Completed" : "Not completed",
    serviceSummary: serviceCount + " service" + (serviceCount === 1 ? "" : "s") + ", all in scope",
    systemSummary:
      systemCount + " system" + (systemCount === 1 ? "" : "s") + ", all in scope" +
      (systemCount === 0 ? "" : unratedCount === 0 ? ", all rated" : ", " + unratedCount + " not yet rated"),
    planSummary: buildPlanSummary(setup, decide),
    planWarning: buildPriorityWarning(setup, decide),
    // Re-shown answers: the submitted form on an error, otherwise the last answer given.
    answer: form ? values.answer : reviewed ? (decide.assurerFeedback ? "yes" : "no") : "",
    feedback: form ? values.feedback : reviewed ? decide.assurerFeedback || "" : "",
    errors,
    errorById: errors.reduce((acc, e) => {
      acc[e.id] = e.text;
      return acc;
    }, {}),
    // "Return to your councils": AL30 (Assurance allocation v1, built for round 2).
    councilsHref: "/decide/assurer/councils",
  };
}

// Shared render for the D04/D16 states of "Roughly when will each assessment happen?".
function renderTiming(res, assessments, errors) {
  res.render("pages/decide/timing", {
    pageTitle: "When do you expect each assessment to happen?",
    backHref: "/decide/confirm",
    assessments,
    errors,
    errorById: (errors || []).reduce((acc, e) => {
      acc[e.id] = e.message;
      return acc;
    }, {}),
    // Which part of the month/year input to highlight (both when the error is not field-specific).
    errorFieldById: (errors || []).reduce((acc, e) => {
      acc[e.id] = e.field || "";
      return acc;
    }, {}),
  });
}

// "emergency-services" -> "Emergency services" (S03 CNI sector values).
function sectorLabel(value) {
  const s = (value || "").replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Display cap: how many ranked systems to list before "Show all".
const SYSTEM_DISPLAY_CAP = 5;

// Shared render for the D02/D22/D15 states of "Which critical systems will you assess?".
// Shows the 5 highest-ranked systems unless showAll, or a selected system sits below the cap
// (so a selection is never hidden).
function renderSystems(res, setup, decide, opts) {
  const unrated = hasUnratedInScope(setup);
  const total = opts.rows.length;
  const selectedBelowCap = opts.rows.slice(SYSTEM_DISPLAY_CAP).some((r) => r.checked);
  const capped = total > SYSTEM_DISPLAY_CAP && !opts.showAll && !selectedBelowCap;
  const included = orgIncluded(setup);
  res.render("pages/decide/systems", {
    pageTitle: (opts.showError ? "Error: " : "") + "Which critical systems will you assess?",
    backHref: firstScreenBackHref(setup, decide),
    rows: capped ? opts.rows.slice(0, SYSTEM_DISPLAY_CAP) : opts.rows,
    totalCount: total,
    displayCap: SYSTEM_DISPLAY_CAP,
    showCapHint: capped,
    assessed: (included ? [] : [{ name: "Organisation assessment", assessedLabel: "Assessed before" }]).concat(
      alreadyAssessedSystems(setup).map((s) => ({ name: s.name, assessedLabel: assessedLabel(s) }))
    ),
    orgIncluded: included,
    noneOnly: Boolean(decide.cycle.noneOnly),
    unrated,
    unratedSystems: opts.rows.filter((r) => !r.rated).map((r) => ({ id: r.id, name: r.name })),
    errorText: included
      ? "Select at least one critical system, or select ‘None this cycle’"
      : "Select at least one critical system",
    showError: Boolean(opts.showError),
  });
}

// D25 render (base + error).
function renderCniAdd(res, setup, decide, showError) {
  res.render("pages/decide/cni-add", {
    pageTitle: (showError ? "Error: " : "") + "Which critical systems are part of CNI?",
    backHref: cniAddBackHref(setup, decide),
    options: nonCniSystems(setup).map((s) => ({ id: s.id, name: s.name })),
    showError,
  });
}

// D12 render (base + error). The Approver comes from setup task 7.
function renderRecordApproval(res, setup, decide, values, errors) {
  const approver = (setup.people && setup.people.approver) || {};
  const errs = errors || [];
  res.render("pages/decide/record-approval", {
    pageTitle: (errs.length ? "Error: " : "") + "Record your Approver's decision",
    backHref: decide.assurerFeedback ? "/decide/feedback" : "/decide/sent",
    approverName: approver.name || "",
    approverLine: [approver.name, approver.jobTitle].filter(Boolean).join(", "),
    day: values.day,
    month: values.month,
    year: values.year,
    how: values.how,
    howOther: values.howOther,
    link: values.link,
    errors: errs,
    errorById: errs.reduce((acc, e) => {
      acc[e.id] = e.text;
      return acc;
    }, {}),
    dateErrorField: (errs.find((e) => e.id === "approvalDate") || {}).field || "",
  });
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d, m, y) {
  return d + " " + MONTH_NAMES[m - 1] + " " + y;
}

// GOV.UK date-input validation for "When was the plan approved?" (D12). The date must be real and
// not in the future. Returns { field, text } or null. field: "day" | "month" | "year" | "" (all).
function validateApprovalDate(v) {
  const label = "The date the plan was approved";
  if (!v.day && !v.month && !v.year) return { field: "", text: "Enter the date the plan was approved" };
  if (!v.day) return { field: "day", text: label + " must include a day" };
  if (!v.month) return { field: "month", text: label + " must include a month" };
  if (!v.year) return { field: "year", text: label + " must include a year" };
  if (!/^\d{4}$/.test(v.year)) return { field: "year", text: "Year must include 4 numbers" };
  const d = Number(v.day), m = Number(v.month), y = Number(v.year);
  const date = new Date(y, m - 1, d);
  if (!/^\d{1,2}$/.test(v.day) || !/^\d{1,2}$/.test(v.month) || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return { field: "", text: label + " must be a real date" };
  }
  if (date > new Date()) return { field: "", text: label + " must be today or in the past" };
  return null;
}
