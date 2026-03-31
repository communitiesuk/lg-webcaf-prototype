// app/routes/entry.js
// ENTRY route with "show me the error" rendering, so you stop guessing

const labels = require("../data/content/labels");
const { CAF_DEFAULT_VERSION, getOutcomesForVersion } = require("../data/helpers/caf-version");
const users = require("../data/seed/users");
const { buildInitialProgressTracker } = require("../data/helpers/progress");
const { requireSignedIn } = require("../data/helpers/session");

module.exports = function (router) {
  router.get("/entry", (req, res) => {
    if (!requireSignedIn(req, res)) return;

    const assessment = req.session.data.assessment || null;
    const researchRound =
      req.session && req.session.data && req.session.data.researchRound === "round-2"
        ? "round-2"
        : "round-1";
    const roundTwo = researchRound === "round-2";
    const hasInProgress = roundTwo
      ? Boolean(assessment && assessment.id && assessment.startedFromEntry)
      : Boolean(assessment && assessment.id);
    const roundTwoEntry = roundTwo ? buildRoundTwoEntrySummary(assessment, req.session.data.user) : null;

    const viewModel = {
      pageTitle: roundTwo ? "My account" : labels.entry.pageTitle,
      labels,
      user: req.session.data.user,
      hasInProgress,
      roundTwo,
      roundTwoEntry,
    };

    res.render("pages/entry/index", viewModel, (err, html) => {
      if (err) {
        res.status(500).send(`
          <h1>/entry render failed</h1>
          <p>This is the real error. Fix this first.</p>
          <pre>${escapeHtml(err.stack || String(err))}</pre>
        `);
        return;
      }
      res.status(200).send(html);
    });
  });

  router.post("/entry/start-new", (req, res) => {
    if (!requireSignedIn(req, res)) return;

    startNewAssessment(req);
    const returnTo = (req.query.returnTo || "").toString();
    return res.redirect(returnTo || "/stages/1");
  });

  router.get("/entry/start-new", (req, res) => {
    if (!requireSignedIn(req, res)) return;

    startNewAssessment(req);
    const returnTo = (req.query.returnTo || "").toString();
    return res.redirect(returnTo || "/stages/1");
  });

  router.post("/entry/resume", (req, res) => {
    if (!requireSignedIn(req, res)) return;

    if (!req.session.data.assessment || !req.session.data.assessment.id) {
      return res.redirect("/entry");
    }

    const a = req.session.data.assessment;
    const roundTwo =
      req.session &&
      req.session.data &&
      req.session.data.researchRound === "round-2";

    if (roundTwo) {
      if (!a.prepare || !a.prepare.onboardingUnderstandingComplete) {
        return res.redirect("/prepare");
      }

      if (!a.prepare || !a.prepare.onboardingRolesComplete) {
        return res.redirect("/prepare/roles");
      }

      if (!a.stage || !a.stage.prepareScopeComplete) {
        return res.redirect("/assessments/current/journey");
      }

      if (!a.scopeReview || !a.scopeReview.completed) {
        return res.redirect("/assessments/current/review-scope");
      }

      if (!a.annualSetup || !a.annualSetup.completed) {
        return res.redirect("/assessments/current/annual-setup");
      }

      return res.redirect("/assessments/current/dashboard?view=my");
    }

    if (!a.stage || !a.stage.understandCAFComplete) {
      return res.redirect("/stages/1");
    }

    if (!a.prepare || !a.prepare.guidanceRead) {
      return res.redirect("/prepare");
    }
    if (!a.stage || !a.stage.prepareScopeComplete) {
      return res.redirect("/stages/2/scope");
    }

    const currentUserId =
      req.session.data.user && req.session.data.user.id ? req.session.data.user.id : null;

    if (!a.progressTracker || Object.keys(a.progressTracker).length === 0) {
      const { ad } = getOutcomesForVersion(a);
      a.progressTracker = buildInitialProgressTracker({ outcomesTree: ad, users });
      a.updatedAt = new Date().toISOString();
    }

    const tracker = a.progressTracker || {};
    const rows = Object.values(tracker);

    const assigned = rows.filter((row) => {
      if (!currentUserId) return false;
      if (row.ownerId === currentUserId) return true;
      return Array.isArray(row.collaboratorIds) && row.collaboratorIds.includes(currentUserId);
    });

    const inProgress = assigned.filter((row) => row.status !== "complete");
    const pool = inProgress.length > 0 ? inProgress : assigned;

    if (req.session.data.researchRound === "round-2") {
      return res.redirect("/assessments/current/journey");
    }

    if (pool.length > 0) {
      pool.sort((aRow, bRow) => {
        const aTime = Date.parse(aRow.updatedAt || "") || 0;
        const bTime = Date.parse(bRow.updatedAt || "") || 0;
        return bTime - aTime;
      });
      return res.redirect(`/assessments/current/outcomes/${pool[0].outcomeId}`);
    }

    return res.redirect("/assessments/current/dashboard?view=my");
  });

  router.post("/entry/go-dashboard", (req, res) => {
    if (!requireSignedIn(req, res)) return;

    if (!req.session.data.assessment || !req.session.data.assessment.id) {
      req.session.data.assessment = {
        id: "current",
        cafVersion: CAF_DEFAULT_VERSION,
        stage: {
          understandCAFComplete: true,
          prepareScopeComplete: true,
        },
      scope: {
        whoInvolvedConfirmed: true,
        evidenceRulesAgreed: true,
        evidenceRulesNotes: "",
        essentialServices: [],
        criticalSystems: [],
        mappings: [],
        priority: [],
        priorityShortlist: [],
        servicesConfirmed: true,
      },
        lens: "ad",
        criticalSystem: null,
        criticalSystems: [],
        evidenceRulesConfirmed: true,
        prepare: {
          guidanceRead: true,
          contributorsConfirmed: true,
          cafReviewed: true,
        },
        profile: {
          reviewed: true,
        },
        selfAssess: {
          ad: {},
          bc: {},
        },
        evidenceLibrary: [],
        assurance: {
          status: "",
          feedback: "",
          reviewedAt: "",
        },
        improvementPlan: {
          actions: [],
        },
        submission: {
          submittedBy: "",
          submittedAt: "",
          method: "",
          reference: "",
          notes: "",
          assurerSubmitted: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progressTracker: {},
      };
    }

    seedPrototypeData(req.session.data.assessment, req.session.data.user, {
      roundTwo: req.session && req.session.data && req.session.data.researchRound === "round-2",
    });

    return res.redirect("/assessments/current/dashboard");
  });
};

function buildRoundTwoEntrySummary(assessment, user) {
  const year = new Date().getFullYear();
  const orgName =
    (assessment && assessment.councilName) ||
    (user && user.orgName) ||
    "Your council";

  if (!assessment || !assessment.id || !assessment.startedFromEntry) {
    return {
      orgName,
      year,
      statusLabel: "Not started",
      primaryActionText: "Start this year's assessment",
      primaryActionHref: "/entry/start-new?returnTo=/assessments/current/journey",
      secondaryActions: [],
      summaryRows: [],
      helperText: "Use the task list to work through the yearly setup and self-assessment stages.",
    };
  }

  const annualSetupComplete = Boolean(assessment.annualSetup && assessment.annualSetup.completed);
  const adComplete = Boolean(assessment.selfAssess && assessment.selfAssess.adReview && assessment.selfAssess.adReview.completed);
  const bcComplete = Boolean(assessment.selfAssess && assessment.selfAssess.bcReview && assessment.selfAssess.bcReview.completed);
  const readyForReview = Boolean(
    assessment.selfAssessmentReview && assessment.selfAssessmentReview.completed
  );
  const selfAssessStarted = Boolean(
    (assessment.selfAssess &&
      assessment.selfAssess.ad &&
      Object.keys(assessment.selfAssess.ad).length > 0) ||
    (assessment.selfAssess &&
      assessment.selfAssess.bc &&
      Object.keys(assessment.selfAssess.bc).length > 0)
  );

  let statusLabel = "In progress";
  if (readyForReview) {
    statusLabel = "Ready for independent review";
  } else if (annualSetupComplete && !selfAssessStarted) {
    statusLabel = "Ready to start self-assessment";
  }

  const secondaryActions = [
    { text: "View task list", href: "/assessments/current/journey" },
  ];

  if (annualSetupComplete) {
    secondaryActions.push({ text: "Go to dashboard", href: "/assessments/current/dashboard?view=my" });
  }

  return {
    orgName,
    year,
    statusLabel,
    primaryActionText: "Continue this year's assessment",
    primaryActionHref: "/entry/resume",
    secondaryActions,
    summaryRows: [
      {
        key: "Annual setup",
        value: annualSetupComplete ? "Completed" : "Not started",
      },
      {
        key: "A and D",
        value: adComplete ? "Completed" : (selfAssessStarted ? "In progress" : "Not started"),
      },
      {
        key: "B and C",
        value: bcComplete ? "Completed" : (selfAssessStarted ? "In progress" : "Not started"),
      },
      {
        key: "Independent review",
        value: readyForReview ? "Ready to send" : "Not yet ready",
      },
    ],
    helperText:
      "Use the task list to track yearly progress and major stages. Use the dashboard to continue day-to-day assessment work.",
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function seedPrototypeData(assessment, currentUser, options = {}) {
  if (!assessment) return;
  const roundTwo = Boolean(options.roundTwo);

  const ownerId = currentUser && currentUser.id ? currentUser.id : "u-1";
  const now = new Date();

  if (!assessment.cafVersion) {
    assessment.cafVersion = CAF_DEFAULT_VERSION;
  }

  if (!assessment.councilName && currentUser && currentUser.orgName) {
    assessment.councilName = currentUser.orgName;
  }

  assessment.scope = assessment.scope || {};
  if (!roundTwo && (!Array.isArray(assessment.scope.essentialServices) || assessment.scope.essentialServices.length === 0)) {
    assessment.scope.essentialServices = [
      {
        id: "svc-1",
        name: "Adult social care",
        description: "Care coordination and safeguarding for vulnerable adults.",
        owner: "Director of Adult Services",
        inScope: true,
      },
      {
        id: "svc-2",
        name: "Housing support",
        description: "Homelessness prevention and temporary accommodation.",
        owner: "Head of Housing",
        inScope: true,
      },
    ];
  }

  if (!roundTwo && (!Array.isArray(assessment.scope.criticalSystems) || assessment.scope.criticalSystems.length === 0)) {
    assessment.scope.criticalSystems = [
      {
        id: "sys-1",
        name: "Case Management System",
        systemType: "COTS platform",
        ownerSupplier: "Civica",
        boundaryNotes: "Used by social care teams across the council.",
        diagramRefs: ["ARCH-CCMS-01"],
      },
      {
        id: "sys-2",
        name: "Payments Platform",
        systemType: "Managed service",
        ownerSupplier: "Finance shared service",
        boundaryNotes: "Processes supplier payments and adult care packages.",
        diagramRefs: ["ARCH-PAY-02"],
      },
    ];
  }

  if (!roundTwo && (!Array.isArray(assessment.scope.mappings) || assessment.scope.mappings.length === 0)) {
    assessment.scope.mappings = [
      { systemId: "sys-1", serviceIds: ["svc-1"] },
      { systemId: "sys-2", serviceIds: ["svc-1", "svc-2"] },
    ];
  }

  if (!roundTwo && (!Array.isArray(assessment.scope.priority) || assessment.scope.priority.length === 0)) {
    assessment.scope.priority = [
      {
        systemId: "sys-1",
        level: "high",
        rationale: "Single system of record for adult social care teams.",
        criteria: ["statutory", "singlePointFailure"],
      },
      {
        systemId: "sys-2",
        level: "medium",
        rationale: "Payment delays would impact statutory care packages.",
        criteria: ["statutory"],
      },
    ];
  }

  if (!roundTwo && (!Array.isArray(assessment.scope.priorityShortlist) || assessment.scope.priorityShortlist.length === 0)) {
    assessment.scope.priorityShortlist = ["sys-1"];
  }

  if (!roundTwo && typeof assessment.scope.servicesConfirmed !== "boolean") {
    assessment.scope.servicesConfirmed = true;
  }

  if (!assessment.progressTracker || Object.keys(assessment.progressTracker).length === 0) {
    const { ad } = getOutcomesForVersion(assessment);
    assessment.progressTracker = buildInitialProgressTracker({
      outcomesTree: ad,
      users,
    });
  }

  const seededOutcomeB = assessment.progressTracker["A1b"];
  if (seededOutcomeB && !seededOutcomeB.ownerId) {
    seededOutcomeB.ownerId = ownerId;
    seededOutcomeB.status = "not_started";
    seededOutcomeB.updatedAt = new Date().toISOString();
  }

  const seededOutcome = assessment.progressTracker["A1a"];
  if (seededOutcome && !seededOutcome.ownerId && (!seededOutcome.history || seededOutcome.history.length === 0)) {
    seededOutcome.ownerId = ownerId;
    seededOutcome.status = "in_progress";
    seededOutcome.dueDate = toISODate(addDays(now, 14));
    seededOutcome.evidenceRefs = [
      {
        refId: "GOV-001",
        type: "Governance note",
        link: "https://intranet.example.gov.uk/governance/board-update",
        note: "Latest board update on cyber priorities.",
      },
    ];
    seededOutcome.history = [
      {
        at: addDays(now, -5).toISOString(),
        by: currentUser && currentUser.name ? currentUser.name : "CAF lead",
        summary: "Drafted governance update and agreed next steps.",
        status: "in_progress",
        statusLabel: "In progress",
        dueDate: seededOutcome.dueDate,
        blocker: "",
        nextStep: "Capture evidence references for board review.",
      },
    ];
    seededOutcome.updatedAt = new Date().toISOString();
  }

  assessment.selfAssess = assessment.selfAssess || { ad: {}, bc: {} };
  assessment.selfAssess.bc = assessment.selfAssess.bc || {};
  if (roundTwo && assessment.hasPreviousAdAssessment) {
    seedReturningAssessmentData(assessment, now);
  }
  if (!roundTwo && !assessment.selfAssess.bc["sys-1"]) {
    assessment.selfAssess.bc["sys-1"] = {
      outcomes: {
        B1a: {
          igpResponse: "Documented protection policy and review schedule in place.",
          judgement: "Partially achieved",
          rationale: "Policy exists but not consistently applied across suppliers.",
          blocker: "Waiting on supplier assurance statement.",
          evidenceRefs: [
            { refId: "POL-BC-01", type: "Policy", link: "", note: "Service protection policy." },
          ],
          updatedAt: addDays(now, -3).toISOString(),
        },
      },
    };
  }

  assessment.selfAssess.ad = assessment.selfAssess.ad || {};
  if (!roundTwo && !assessment.selfAssess.ad["A1a"]) {
    assessment.selfAssess.ad["A1a"] = {
      igpResponse: "Board reporting exists but is not consistent across directorates.",
      judgement: "Partially achieved",
      rationale: "Some directorates follow the agreed governance cadence.",
      evidenceRefs: [
        { refId: "GOV-TRACK-01", type: "Board tracker", link: "", note: "" },
      ],
      updatedAt: addDays(now, -4).toISOString(),
    };
  }

  if (!Array.isArray(assessment.evidenceLibrary) || assessment.evidenceLibrary.length === 0) {
    assessment.evidenceLibrary = [
      {
        refId: "EVID-001",
        type: "Policy",
        link: "https://intranet.example.gov.uk/policies/cyber-policy",
        note: "Current council cyber policy.",
      },
      {
        refId: "EVID-002",
        type: "Risk register",
        link: "",
        note: "Latest risk register extract.",
      },
    ];
  }

  if (!assessment.assurance || !assessment.assurance.status) {
    assessment.assurance = {
      status: "changes_needed",
      feedback: "Evidence references need tightening for two outcomes.",
      reviewedAt: toISODate(addDays(now, -3)),
    };
  }

  if (!assessment.improvementPlan) {
    assessment.improvementPlan = { actions: [], signOff: {}, status: "" };
  }

  if (!Array.isArray(assessment.improvementPlan.actions) || assessment.improvementPlan.actions.length === 0) {
    assessment.improvementPlan.actions = [
      {
        id: `iip-seed-${Date.now()}`,
        sourceType: "ad",
        sourceId: "A1a",
        title: "Improve board reporting cadence for cyber risks",
        priority: "high",
        owner: "CAF lead",
        dueDate: toISODate(addDays(now, 45)),
        expectedEvidence: "Board pack with quarterly cyber risk update",
        evidenceRef: "EVID-BOARD-01",
        checkInCadence: "monthly",
        confirmed: true,
        status: "in_progress",
        lastUpdateAt: toISODate(addDays(now, -5)),
        lastUpdateNote: "Drafted updated reporting template; awaiting approval.",
        gapMeta: {
          outcomeCode: "A1.a",
          outcomeTitle: "Board direction",
          judgement: "Partially achieved",
          systemName: "",
        },
      },
      {
        id: `iip-seed-${Date.now() + 1}`,
        sourceType: "bc",
        sourceId: "sys-1:B1a",
        title: "Extend policy coverage for suppliers and operational teams",
        priority: "medium",
        owner: "Security operations lead",
        dueDate: toISODate(addDays(now, 60)),
        expectedEvidence: "Updated policy and supplier assurance evidence",
        evidenceRef: "",
        checkInCadence: "quarterly",
        confirmed: true,
        status: "planned",
        lastUpdateAt: "",
        lastUpdateNote: "",
        gapMeta: {
          outcomeCode: "B1.a",
          outcomeTitle: "Policy, process and procedure development",
          judgement: "Partially achieved",
          systemName: "Case Management System",
        },
      },
      {
        id: `iip-seed-${Date.now() + 2}`,
        sourceType: "ad",
        sourceId: "A1b",
        title: "Clarify ownership and responsibilities across teams",
        priority: "high",
        owner: "CAF lead",
        dueDate: toISODate(addDays(now, 90)),
        expectedEvidence: "Updated accountability map and role sign-off",
        evidenceRef: "EVID-ROLE-04",
        checkInCadence: "monthly",
        confirmed: true,
        status: "in_progress",
        lastUpdateAt: toISODate(addDays(now, -8)),
        lastUpdateNote: "Updated draft accountability map circulated for review.",
        gapMeta: {
          outcomeCode: "A1.b",
          outcomeTitle: "Roles and responsibilities",
          judgement: "Partially achieved",
          systemName: "",
        },
      },
    ];
    assessment.improvementPlan.status = "ready_for_signoff";
  }

  if (!assessment.improvementPlan.signOff || !assessment.improvementPlan.signOff.by) {
    assessment.improvementPlan.signOff = {
      by: "",
      date: "",
      note: "",
    };
  }

  if (!assessment.submission || !assessment.submission.submittedBy) {
    assessment.submission = {
      submittedBy: "CAF lead",
      submittedAt: toISODate(addDays(now, -1)),
      method: "portal",
      reference: "MHCLG-REF-102",
      notes: "Submission sent via portal.",
      assurerSubmitted: false,
      informedAt: toISODate(addDays(now, -7)),
      acknowledgedAt: "",
      acknowledgedReference: "",
      storedAt: "",
      storageLocation: "",
      reviewedAt: "",
      reviewNotes: "",
    };
  }
}

function startNewAssessment(req) {
  const nowIso = new Date().toISOString();
  const roundTwo =
    req.session &&
    req.session.data &&
    req.session.data.researchRound === "round-2";
  const hasPreviousAdAssessment = roundTwo && isRoundTwoReturningUser(req.session.data.user || null);
  req.session.data.assessment = {
    id: "current",
    startedFromEntry: true,
    cafVersion: CAF_DEFAULT_VERSION,
    hasPreviousAdAssessment,
    stage: {
      understandCAFComplete: false,
      prepareScopeComplete: false,
    },
    scope: {
      whoInvolvedConfirmed: false,
      evidenceRulesAgreed: false,
      evidenceRulesNotes: "",
      essentialServices: [],
      criticalSystems: [],
      mappings: [],
      priority: [],
      priorityShortlist: [],
      servicesConfirmed: false,
      assurerReviewed: false,
    },
    lens: null,
    criticalSystem: null,
    criticalSystems: [],
    evidenceRulesConfirmed: null,
    prepare: {
      guidanceRead: false,
      contributorsConfirmed: false,
      cafReviewed: false,
    },
    profile: {
      reviewed: false,
    },
    selfAssess: {
      ad: {},
      bc: {},
    },
    evidenceLibrary: [],
    assurance: {
      status: "",
      feedback: "",
      reviewedAt: "",
    },
    improvementPlan: {
      actions: [],
    },
    submission: {
      submittedBy: "",
      submittedAt: "",
      method: "",
      reference: "",
      notes: "",
      assurerSubmitted: false,
      informedAt: "",
      acknowledgedAt: "",
      acknowledgedReference: "",
      storedAt: "",
      storageLocation: "",
      reviewedAt: "",
      reviewNotes: "",
    },
    createdAt: nowIso,
    dueAt: endOfFinancialYear(nowIso),
    updatedAt: nowIso,
    progressTracker: {},
  };

  seedPrototypeData(req.session.data.assessment, req.session.data.user, { roundTwo });
}

function isRoundTwoReturningUser(user) {
  const email = user && user.email ? String(user.email).toLowerCase() : "";
  return email.includes("returning") || email.includes("previous") || email.includes("existing");
}

function seedReturningAssessmentData(assessment, now) {
  if (!assessment) return;
  const nowIso = now.toISOString();
  const previousAssessment = assessment.previousAssessment || buildPreviousAssessmentSeed(now);
  assessment.previousAssessment = previousAssessment;

  assessment.selfAssess = assessment.selfAssess || { ad: {}, bc: {} };
  assessment.selfAssess.ad = assessment.selfAssess.ad || {};
  assessment.selfAssess.bc = assessment.selfAssess.bc || {};

  for (const [outcomeId, prior] of Object.entries(previousAssessment.ad || {})) {
    if (!assessment.selfAssess.ad[outcomeId]) {
      assessment.selfAssess.ad[outcomeId] = {
        igpResponse: prior.igpResponse || "",
        judgement: prior.judgement || "",
        rationale: prior.rationale || "",
        evidenceRefs: Array.isArray(prior.evidenceRefs) ? prior.evidenceRefs : [],
        updatedAt: nowIso,
        carriedForward: true,
        reviewRequired: true,
      };
    }
  }

  if (!assessment.selfAssess.bc["sys-1"]) {
    assessment.selfAssess.bc["sys-1"] = { outcomes: {} };
  }
  if (!assessment.selfAssess.bc["sys-1"].outcomes) {
    assessment.selfAssess.bc["sys-1"].outcomes = {};
  }
  for (const [outcomeId, prior] of Object.entries(previousAssessment.bc || {})) {
    if (!assessment.selfAssess.bc["sys-1"].outcomes[outcomeId]) {
      assessment.selfAssess.bc["sys-1"].outcomes[outcomeId] = {
        igpResponse: prior.igpResponse || "",
        judgement: prior.judgement || "",
        rationale: prior.rationale || "",
        evidenceRefs: Array.isArray(prior.evidenceRefs) ? prior.evidenceRefs : [],
        updatedAt: nowIso,
        carriedForward: true,
        reviewRequired: true,
      };
    }
  }
}

function buildPreviousAssessmentSeed(now) {
  return {
    version: CAF_DEFAULT_VERSION,
    reviewedAt: toISODate(addDays(now, -40)),
    ad: {
      A1a: {
        judgement: "Achieved",
        rationale: "Board-level ownership and reporting were in place across the council last year.",
        igpResponse: "Board reporting was regular and cyber risks were reviewed at the right level.",
        evidenceRefs: [
          { refId: "PREV-GOV-01", type: "Board paper", link: "", note: "Previous annual governance report." },
        ],
      },
      A1b: {
        judgement: "Partially achieved",
        rationale: "Roles were defined last year but not all responsibilities were consistently understood.",
        igpResponse: "Role descriptions existed, but handoffs between teams were inconsistent.",
        evidenceRefs: [
          { refId: "PREV-ROLE-02", type: "Role description", link: "", note: "Prior accountability matrix." },
        ],
      },
    },
    bc: {
      B1a: {
        judgement: "Partially achieved",
        rationale: "Core policies were carried by the service, but supplier coverage was incomplete.",
        igpResponse: "Protection policy existed and was reviewed, with some supplier gaps.",
        evidenceRefs: [
          { refId: "PREV-POL-03", type: "Policy", link: "", note: "Last year's service protection policy." },
        ],
      },
    },
  };
}

function addDays(date, days) {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + days);
  return dt;
}

function endOfFinancialYear(value) {
  const dt = new Date(value);
  const year = dt.getFullYear() + 1;
  const end = new Date(year, 3, 5, 23, 59, 0, 0);
  return end.toISOString();
}

function toISODate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
