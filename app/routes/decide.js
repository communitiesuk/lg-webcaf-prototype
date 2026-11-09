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
// Onboarding bookings are owned by the Assurance activities section (single source of truth).
const { ensureAssurance } = require("../data/helpers/assurance");

function clean(value) {
  return (value || "").toString().trim();
}

// Where "Back" goes from the first Decide screen the person saw: D23 if the CNI screens ran,
// otherwise the dashboard (Decide is entered from S31 or the dashboard).
function firstScreenBackHref(setup) {
  return showCniScreens(setup) ? "/decide/cni" : "/dashboard";
}

// After D07: the council sees the assurer's feedback (D08) only if there is some; otherwise the
// plan goes straight for approval — D11 (Approver uses the service) or D12 (record it here).
function afterAssurerReview(setup, decide) {
  if (decide.assurerFeedback) return "/decide/feedback";
  return approvalHref(setup);
}

// The CAF Lead's next screen when the plan goes for approval: D27 "Plan sent for approval" if the
// Approver uses the service (they approve on D11 themselves), else D12 (record it here).
function approvalHref(setup) {
  const approver = (setup.people && setup.people.approver) || {};
  return approver.hasAccount ? "/decide/sent-for-approval" : "/decide/record-approval";
}

module.exports = function (router) {
  // Decide chrome + seed for every /decide request (council chrome by default; the
  // assurer/approver screens in later batches override to the minimal nav per-route).
  router.use((req, res, next) => {
    if (!req.path.startsWith("/decide")) return next();
    ensureDecide(req.session.data);
    applyDecideChrome(req, res);
    const setup = req.session.data.setup;
    // No Approver named in setup (task 7) → nobody can approve the plan. Send the person back
    // to the setup task list to confirm one (S30 applies the same rule to finishing setup).
    if (!hasApprover(setup)) return res.redirect("/setup/task-list");
    // Once the plan is approved it is locked: the plan screens go to D13 (changes are made by
    // speaking to the assurer, as D13 says). Only D13, D28 and the plan summary stay open.
    const decision = (req.session.data.decide.approval && req.session.data.decide.approval.decision) || "";
    const openAfterApproval = ["/decide", "/decide/approved", "/decide/approve/done", "/decide/plan-summary"];
    if (decision === "approved" && openAfterApproval.indexOf(req.path) === -1) {
      return res.redirect("/decide/approved");
    }
    // The CNI screens only run when the council chose a CNI sector in S03 and has systems.
    if (req.path.startsWith("/decide/cni") && !showCniScreens(setup)) {
      return res.redirect("/decide/systems");
    }
    next();
  });

  // Section entry (dashboard "Start this cycle" / "Continue", S31, the Assessments nav). Resumes
  // where the plan is: approved (D13), returned (D14), waiting on the assurer (D06/D09) or for
  // approval after the assurer's review. Otherwise starts the cycle: D23 if the council chose a CNI
  // sector in setup, else straight to D02 (clearing stale CNI flags, as no system can be CNI).
  router.get("/decide", (req, res) => {
    const setup = req.session.data.setup;
    const decide = req.session.data.decide;
    const decision = (decide.approval && decide.approval.decision) || "";
    if (decision === "approved") return res.redirect("/decide/approved");
    if (decision === "returned") return res.redirect("/decide/returned");
    if (decide.plan && decide.plan.sentToAssurer) {
      if (!hasAssurer(setup)) return res.redirect("/decide/no-assurer");
      if (decide.plan.sentForApproval) return res.redirect(approvalHref(setup));
      if (decide.plan.assurerReviewed) return res.redirect(afterAssurerReview(setup, decide));
      return res.redirect("/decide/sent");
    }
    if (showCniScreens(setup)) return res.redirect("/decide/cni");
    if (!isCniFlaggedInSetup(setup)) {
      (setup.criticalSystems || []).forEach((s) => {
        s.cni = false;
      });
    }
    return res.redirect("/decide/systems");
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
    renderCniAdd(res, setup, false);
  });

  router.post("/decide/cni/add", (req, res) => {
    ensureDecide(req.session.data);
    const setup = req.session.data.setup;
    const systemId = clean(req.session.data.cniSystemId);
    delete req.session.data.cniSystemId;
    const system = getSystem(setup, systemId);
    if (!system) return renderCniAdd(res, setup, true);
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
      backHref: nonCniSystems(setup).length ? "/decide/cni/add" : "/decide/cni",
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
        backHref: nonCniSystems(setup).length ? "/decide/cni/add" : "/decide/cni",
        added,
        showError: true,
      });
    }
    if (answer === "yes") return res.redirect("/decide/cni/add");
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
      backHref: firstScreenBackHref(req.session.data.setup),
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
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    decide.plan = decide.plan || {};
    decide.plan.sentToAssurer = true;
    // A new (or re-sent, after being returned) plan goes back through review and approval.
    decide.plan.assurerReviewed = false;
    decide.plan.sentForApproval = false;
    decide.approval = decide.approval || {};
    decide.approval.decision = "";
    // Sending the plan starts this cycle's onboarding. Reset the cycle's assurance activities to
    // "not booked yet" (the single source of truth, shared with the Assurance section) so D09
    // prompts the user to book them. Bookings made afterwards flow back to D09.
    const assurance = ensureAssurance(req.session.data);
    ["onboarding-org", "onboarding-systems", "pre-call"].forEach((id) => {
      assurance.activities[id] = { status: "not-booked", date: "" };
    });
    // D09 (assurer assigned) vs D06 (no assurer).
    if (hasAssurer(setup)) {
      return res.redirect("/decide/sent");
    }
    return res.redirect("/decide/no-assurer");
  });

  // ----- Batch 4: assurer / send flow -------------------------------------------------

  // D06 — Waiting for your assurer (393:2539)
  router.get("/decide/no-assurer", (req, res) => {
    ensureDecide(req.session.data);
    const setup = req.session.data.setup;
    // Assigned since (for example via the prototype control) — carry on to D09.
    if (hasAssurer(setup) && req.session.data.decide.plan && req.session.data.decide.plan.sentToAssurer) {
      return res.redirect("/decide/sent");
    }
    res.render("pages/decide/no-assurer", {
      pageTitle: "Waiting for an assurer",
    });
  });

  // Prototype-only control on D06: simulate MHCLG assigning an assurer, so research can continue
  // to D09 and the assurer review. The assurer is a clearly labelled stub — MHCLG assigns the real
  // one, so there is no user-entered value.
  router.get("/decide/no-assurer/assign", (req, res) => {
    req.session.data.setup.assurer = { name: "Example assurer", organisation: "", assigned: true, stub: true };
    return res.redirect("/decide/sent");
  });

  // D09 — Book your onboarding calls (393:3103)
  router.get("/decide/sent", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    const decide = req.session.data.decide;
    if (!hasAssurer(setup)) return res.redirect("/decide/no-assurer");
    // Being on D09 means the plan has been sent (also keeps example scenes that open D09 directly
    // coherent, so /decide resumes here).
    decide.plan = decide.plan || {};
    decide.plan.sentToAssurer = true;
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
    decide.assurerFeedback = clean(req.session.data.assurerFeedback);
    delete req.session.data.assurerFeedback;
    decide.plan = decide.plan || {};
    decide.plan.assurerReviewed = true;
    return res.redirect(afterAssurerReview(setup, decide));
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
    // No feedback — nothing to show; the plan goes for approval.
    if (!decide.assurerFeedback) return res.redirect(approvalHref(setup));
    res.render("pages/decide/feedback", {
      pageTitle: "Your assurer has given feedback on your plan",
      backHref: "/decide/sent",
      assurerName: assurerLine(setup) || "Your assurer",
      feedback: decide.assurerFeedback,
    });
  });

  router.post("/decide/feedback", (req, res) => {
    const setup = ensureDecide(req.session.data) && req.session.data.setup;
    // D11 (Approver approves in service) vs D12 (record decision elsewhere).
    return res.redirect(approvalHref(setup));
  });

  // ----- Batch 5: approval flow + printable plan summary ------------------------------

  // D27 (ADDITION, not in Figma v7) — council: Plan sent for approval. Shown to the CAF Lead when
  // the Approver uses the service, instead of taking the CAF Lead into the Approver's view (D11).
  router.get("/decide/sent-for-approval", (req, res) => {
    const setup = req.session.data.setup;
    const decide = req.session.data.decide;
    const approver = (setup.people && setup.people.approver) || {};
    if (!approver.hasAccount) return res.redirect("/decide/record-approval");
    decide.plan = decide.plan || {};
    decide.plan.sentForApproval = true;
    res.render("pages/decide/sent-for-approval", {
      pageTitle: "Plan sent for approval",
      approverName: approver.name || "",
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
      return res.redirect("/decide/approve/done");
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
    const parts = approval.dateParts || {};
    renderRecordApproval(res, setup, decide, {
      day: parts.day || "",
      month: parts.month || "",
      year: parts.year || "",
      how: approval.how || "",
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
      link: clean(data.approvalLink),
    };
    ["approvalDate-day", "approvalDate-month", "approvalDate-year", "approvalHow", "approvalLink"].forEach((k) => delete data[k]);
    const errors = [];
    const dateError = validateApprovalDate(entered);
    if (dateError) errors.push({ id: "approvalDate", field: dateError.field, text: dateError.text });
    if (!entered.how) errors.push({ id: "approvalHow", text: "Select how the plan was approved" });
    if (errors.length) return renderRecordApproval(res, setup, decide, entered, errors);
    decide.approval = decide.approval || {};
    decide.approval.decision = "approved";
    decide.approval.by = approver.name || "";
    decide.approval.date = formatDate(Number(entered.day), Number(entered.month), Number(entered.year));
    decide.approval.dateParts = { day: entered.day, month: entered.month, year: entered.year };
    decide.approval.how = entered.how;
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
    pageTitle: "Approve the plan for this cycle",
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
  const unratedCount = (setup.criticalSystems || []).filter((s) => !deriveCriticality(s.impact)).length;
  const ctx = setup.councilContext || {};
  const contextDone = Boolean(setup.sectorContext && setup.sectorContext.confirmed && ctx.completed);
  return {
    pageTitle: "Review the council’s setup and plan",
    backHref: "/decide/sent",
    councilName: (setup.council && setup.council.name) || "",
    // Everything added in Setup is in scope by definition, so "all in scope" holds.
    contextSummary: contextDone ? "Completed" : "Not completed",
    serviceSummary: serviceCount + " service" + (serviceCount === 1 ? "" : "s") + ", all in scope",
    systemSummary:
      systemCount + " system" + (systemCount === 1 ? "" : "s") + ", all in scope" +
      (systemCount === 0 ? "" : unratedCount === 0 ? ", all rated" : ", " + unratedCount + " not yet rated"),
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
    backHref: firstScreenBackHref(setup),
    rows: capped ? opts.rows.slice(0, SYSTEM_DISPLAY_CAP) : opts.rows,
    totalCount: total,
    displayCap: SYSTEM_DISPLAY_CAP,
    showCapHint: capped,
    assessed: alreadyAssessedSystems(setup).map((s) => ({
      name: s.name,
      assessedLabel: assessedLabel(s),
    })),
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
function renderCniAdd(res, setup, showError) {
  res.render("pages/decide/cni-add", {
    pageTitle: (showError ? "Error: " : "") + "Which critical systems are part of CNI?",
    backHref: "/decide/cni",
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
