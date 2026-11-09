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
} = require("../data/helpers/decide");
// Onboarding bookings are owned by the Assurance activities section (single source of truth).
const { ensureAssurance } = require("../data/helpers/assurance");

function clean(value) {
  return (value || "").toString().trim();
}

// S03 records a CNI sector as a dropdown value. "none" (explicitly chosen) and "" (not answered)
// both mean no CNI, so neither flags the Decide CNI consistency check (D24).
// Changed in build, prototype, pending design sign-off.
function isCniFlaggedInSetup(setup) {
  const cni = setup && setup.councilContext && setup.councilContext.cni;
  return Boolean(cni && cni !== "none");
}

module.exports = function (router) {
  // Decide chrome + seed for every /decide request (council chrome by default; the
  // assurer/approver screens in later batches override to the minimal nav per-route).
  router.use((req, res, next) => {
    if (!req.path.startsWith("/decide")) return next();
    ensureDecide(req.session.data);
    applyDecideChrome(req, res);
    next();
  });

  // Section entry → the CNI gate (Batch 2 will route on to D02 once CNI is decided).
  router.get("/decide", (req, res) => res.redirect("/decide/cni"));

  // ----- Batch 1: CNI gate -----------------------------------------------------------

  // D23 — Are any of your critical systems critical national infrastructure (CNI)? (393:3118)
  router.get("/decide/cni", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    res.render("pages/decide/cni", {
      pageTitle: "Are any of your critical systems part of critical national infrastructure (CNI)?",
      backHref: "/setup/task-list",
      cniFlaggedInSetup: isCniFlaggedInSetup(setup),
      answer: decide.cniAnswer,
    });
  });

  router.post("/decide/cni", (req, res) => {
    ensureDecide(req.session.data);
    const setup = req.session.data.setup;
    const decide = req.session.data.decide;
    const answer = clean(req.session.data.cniAnswer) === "no" ? "no" : "yes";
    decide.cniAnswer = answer;
    delete req.session.data.cniAnswer;
    if (answer === "yes") return res.redirect("/decide/cni/add");
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
    res.render("pages/decide/cni-add", {
      pageTitle: "Which critical systems are part of CNI?",
      backHref: "/decide/cni",
      options: nonCniSystems(setup).map((s) => ({ id: s.id, name: s.name })),
    });
  });

  router.post("/decide/cni/add", (req, res) => {
    ensureDecide(req.session.data);
    const setup = req.session.data.setup;
    const systemId = clean(req.session.data.cniSystemId);
    delete req.session.data.cniSystemId;
    const system = getSystem(setup, systemId);
    if (system) system.cni = true;
    req.session.data.decide.cniAnswer = "yes";
    return res.redirect("/decide/cni/added");
  });

  // D26 — You have added N CNI system(s) (393:3229) — add-another pattern
  router.get("/decide/cni/added", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const added = cniSystems(setup).map((s) => ({
      id: s.id,
      name: s.name,
      criticality: deriveCriticality(s.impact),
    }));
    res.render("pages/decide/cni-added", {
      pageTitle: `You have selected ${added.length} CNI system${added.length === 1 ? "" : "s"}`,
      backHref: "/decide/cni/add",
      added,
    });
  });

  router.post("/decide/cni/added", (req, res) => {
    ensureDecide(req.session.data);
    const another = clean(req.session.data.addAnotherCni) === "yes";
    delete req.session.data.addAnotherCni;
    if (another) return res.redirect("/decide/cni/add");
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
    const orgIncluded = !(setup.organisationAssessment && setup.organisationAssessment.doneBefore);

    // D20 — nothing left: no assessable systems AND the organisation assessment is done.
    if (rows.length === 0 && !orgIncluded) {
      return res.redirect("/decide/systems/nothing-left");
    }

    renderSystems(res, setup, decide, { rows, orgIncluded });
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
      const orgIncluded = !(setup.organisationAssessment && setup.organisationAssessment.doneBefore);
      return renderSystems(res, setup, decide, { rows, orgIncluded, showError: true });
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
      backHref: "/decide/cni",
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
      orgIncluded: !(setup.organisationAssessment && setup.organisationAssessment.doneBefore),
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

    const errors = assessments
      .filter((a) => a.choice !== "month" && a.choice !== "tbc")
      .map((a) => ({
        id: a.id,
        message:
          "Tell us when you expect the " +
          (a.kind === "org" ? "organisation assessment" : a.name) +
          " to happen, or select ‘I do not know yet’",
      }));

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
      planWarning: {
        warning: "Your assurer will review your plan before it goes for approval.",
        body: "Next, arrange a call with your assurer to discuss your plan.",
      },
    });
  });

  router.post("/decide/review", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    decide.plan = decide.plan || {};
    decide.plan.sentToAssurer = true;
    // Sending the plan starts this cycle's onboarding. Reset the cycle's assurance activities to
    // "not booked yet" (the single source of truth, shared with the Assurance section) so D09
    // prompts the user to book them. Bookings made afterwards flow back to D09.
    const assurance = ensureAssurance(req.session.data);
    ["onboarding-org", "onboarding-systems", "pre-call"].forEach((id) => {
      assurance.activities[id] = { status: "not-booked", date: "" };
    });
    // D09 (assurer assigned) vs D06 (no assurer).
    if (setup.assurer && setup.assurer.assigned) {
      return res.redirect("/decide/sent");
    }
    return res.redirect("/decide/no-assurer");
  });

  // ----- Batch 4: assurer / send flow -------------------------------------------------

  // D06 — Waiting for your assurer (393:2539)
  router.get("/decide/no-assurer", (req, res) => {
    ensureDecide(req.session.data);
    res.render("pages/decide/no-assurer", {
      pageTitle: "Waiting for an assurer",
    });
  });

  // D09 — Book your onboarding calls (393:3103)
  router.get("/decide/sent", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const orgIncluded = !(setup.organisationAssessment && setup.organisationAssessment.doneBefore);
    const hasSystems = ((decide.cycle && decide.cycle.selectedSystems) || []).length > 0;
    const acts = ensureAssurance(req.session.data).activities || {};
    const rows = [];
    if (orgIncluded) rows.push(bookingRow("onboarding-org", "Step 1: Onboarding, organisation assessment", acts["onboarding-org"]));
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
    decide.assurerFeedback = clean(req.session.data.assurerFeedback);
    delete req.session.data.assurerFeedback;
    return res.redirect("/decide/feedback");
  });

  // D08 — Your assurer has commented on your plan (393:2617)
  router.get("/decide/feedback", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const assurer = setup.assurer || {};
    res.render("pages/decide/feedback", {
      pageTitle: "Your assurer has given feedback on your plan",
      backHref: "/decide/sent",
      assurerName: [assurer.name, assurer.organisation].filter(Boolean).join(", "),
      feedback: decide.assurerFeedback || "",
    });
  });

  router.post("/decide/feedback", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const approver = (setup.people && setup.people.approver) || {};
    // D11 (Approver approves in service) vs D12 (record decision elsewhere).
    if (approver.hasAccount) {
      return res.redirect("/decide/approve");
    }
    return res.redirect("/decide/record-approval");
  });

  // ----- Batch 5: approval flow + printable plan summary ------------------------------

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
      return res.redirect("/decide/approved");
    }
    if (decision === "return") {
      if (!reason) {
        applyDecideMinimalChrome(req, res);
        return res.render("pages/decide/approve", approveModel(setup, decide, { decision: "return", reason: "", showError: true }));
      }
      decide.approval.decision = "returned";
      decide.approval.by = approver.name || "";
      decide.approval.returnReason = reason;
      return res.redirect("/decide/returned");
    }
    // No decision chosen — re-render the page unchanged.
    applyDecideMinimalChrome(req, res);
    return res.render("pages/decide/approve", approveModel(setup, decide, {}));
  });

  // D12 — council: Record your Approver's decision (393:2726)
  router.get("/decide/record-approval", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const approver = (setup.people && setup.people.approver) || {};
    const approval = decide.approval || {};
    res.render("pages/decide/record-approval", {
      pageTitle: "Record your Approver's decision",
      backHref: "/decide/feedback",
      approverName: approver.name || "",
      approverLine: [approver.name, approver.jobTitle].filter(Boolean).join(", "),
      date: approval.date || "",
      how: approval.how || "at-meeting",
      link: approval.link || "",
    });
  });

  router.post("/decide/record-approval", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const data = req.session.data;
    const approver = (setup.people && setup.people.approver) || {};
    decide.approval = decide.approval || {};
    decide.approval.decision = "approved";
    decide.approval.by = approver.name || "";
    decide.approval.date = clean(data.approvalDate) || decide.approval.date;
    decide.approval.how = clean(data.approvalHow) || decide.approval.how;
    decide.approval.link = clean(data.approvalLink);
    ["approvalDate", "approvalHow", "approvalLink"].forEach((k) => delete data[k]);
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
      returnedDate: approval.date || "",
      returnReason: approval.returnReason || "",
    });
  });

  // D21 — council: printable Plan summary (393:3013)
  router.get("/decide/plan-summary", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    const people = setup.people || {};
    const assurer = setup.assurer || {};
    res.render("pages/decide/plan-summary", {
      pageTitle: "Plan summary",
      councilName: (setup.council && setup.council.name) || "",
      cafLeadName: (people.cafLead && people.cafLead.name) || "",
      approverName: (people.approver && people.approver.name) || "",
      assurerLine: [assurer.name, assurer.organisation].filter(Boolean).join(", "),
      planSummary: buildPlanSummary(setup, decide),
      planWarning: buildPriorityWarning(setup, decide),
    });
  });
};

// View model for the approver's D11/D17 screen.
function approveModel(setup, decide, opts) {
  const people = setup.people || {};
  const assurer = setup.assurer || {};
  const hasFeedback = Boolean(decide.assurerFeedback);
  const assurerLine = [assurer.name, assurer.organisation].filter(Boolean).join(", ");
  return {
    pageTitle: "Approve the plan for this cycle",
    councilName: (setup.council && setup.council.name) || "",
    cafLeadName: (people.cafLead && people.cafLead.name) || "",
    planSummary: buildPlanSummary(setup, decide),
    planWarning: buildPriorityWarning(setup, decide),
    assurerLine: assurerLine + (hasFeedback ? " · Gave feedback on the plan" : ""),
    decision: opts.decision || "",
    reason: opts.reason || "",
    showError: Boolean(opts.showError),
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
function assurerReviewModel(setup, decide) {
  const serviceCount = (setup.essentialServices || []).length;
  const systemCount = (setup.criticalSystems || []).length;
  const allRated = !hasUnratedInScope(setup);
  return {
    pageTitle: "Review the council’s setup and plan",
    backHref: "/decide/sent",
    councilName: (setup.council && setup.council.name) || "",
    serviceSummary: serviceCount + " service" + (serviceCount === 1 ? "" : "s") + ", all in scope",
    systemSummary:
      systemCount + " system" + (systemCount === 1 ? "" : "s") + ", all in scope" + (allRated ? ", all rated" : ""),
    planSummary: buildPlanSummary(setup, decide),
    planWarning: buildPriorityWarning(setup, decide),
    feedback: decide.assurerFeedback || "",
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
  });
}

// Display cap: how many ranked systems to list before "Show all" (large directories).
const SYSTEM_DISPLAY_CAP = 5;

// Shared render for the D02/D22/D15 states of "Which critical systems will you assess?".
function renderSystems(res, setup, decide, opts) {
  const unrated = hasUnratedInScope(setup);
  const unratedRow = opts.rows.find((r) => !r.rated);
  res.render("pages/decide/systems", {
    pageTitle: "Which critical systems will you assess?",
    backHref: "/decide/cni",
    rows: opts.rows,
    assessed: alreadyAssessedSystems(setup).map((s) => ({
      name: s.name,
      assessedDate: s.assessedDate || "",
    })),
    orgIncluded: opts.orgIncluded,
    noneOnly: Boolean(decide.cycle.noneOnly),
    unrated,
    unratedName: unratedRow ? unratedRow.name : "",
    // Cap hint / "Show all" only make sense for a large directory (more systems than shown).
    // The coherent seed lists everything, so this stays off; logged as a deviation.
    showCapHint: opts.rows.length > SYSTEM_DISPLAY_CAP,
    showError: Boolean(opts.showError),
  });
}
