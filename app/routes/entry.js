// app/routes/entry.js
// ENTRY route with "show me the error" rendering, so you stop guessing

const labels = require("../data/content/labels");
const outcomesAD = require("../data/seed/outcomes-ad");
const users = require("../data/seed/users");
const { buildInitialProgressTracker } = require("../data/helpers/progress");
const { requireSignedIn } = require("../data/helpers/session");

module.exports = function (router) {
  router.get("/entry", (req, res) => {
    if (!requireSignedIn(req, res)) return;

    const assessment = req.session.data.assessment || null;

    const viewModel = {
      pageTitle: labels.entry.pageTitle,
      labels,
      user: req.session.data.user,
      hasInProgress: Boolean(assessment && assessment.id),
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

    if (!a.stage || !a.stage.understandCAFComplete) {
      return res.redirect("/stages/1");
    }

    if (!a.prepare || !a.prepare.guidanceRead) {
      return res.redirect("/prepare");
    }
    if (!a.profile || !a.profile.reviewed) {
      return res.redirect("/profile");
    }
    if (!a.stage || !a.stage.prepareScopeComplete) {
      return res.redirect("/stages/2/scope");
    }

    const currentUserId =
      req.session.data.user && req.session.data.user.id ? req.session.data.user.id : null;

    if (!a.progressTracker || Object.keys(a.progressTracker).length === 0) {
      a.progressTracker = buildInitialProgressTracker({ outcomesTree: outcomesAD, users });
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

    seedPrototypeData(req.session.data.assessment, req.session.data.user);

    return res.redirect("/assessments/current/dashboard");
  });
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function seedPrototypeData(assessment, currentUser) {
  if (!assessment) return;

  const ownerId = currentUser && currentUser.id ? currentUser.id : "u-1";
  const now = new Date();

  if (!assessment.councilName && currentUser && currentUser.orgName) {
    assessment.councilName = currentUser.orgName;
  }

  assessment.scope = assessment.scope || {};
  if (!Array.isArray(assessment.scope.essentialServices) || assessment.scope.essentialServices.length === 0) {
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

  if (!Array.isArray(assessment.scope.criticalSystems) || assessment.scope.criticalSystems.length === 0) {
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

  if (!Array.isArray(assessment.scope.mappings) || assessment.scope.mappings.length === 0) {
    assessment.scope.mappings = [
      { systemId: "sys-1", serviceIds: ["svc-1"] },
      { systemId: "sys-2", serviceIds: ["svc-1", "svc-2"] },
    ];
  }

  if (!Array.isArray(assessment.scope.priority) || assessment.scope.priority.length === 0) {
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

  if (!Array.isArray(assessment.scope.priorityShortlist) || assessment.scope.priorityShortlist.length === 0) {
    assessment.scope.priorityShortlist = ["sys-1"];
  }

  if (typeof assessment.scope.servicesConfirmed !== "boolean") {
    assessment.scope.servicesConfirmed = true;
  }

  if (!assessment.progressTracker || Object.keys(assessment.progressTracker).length === 0) {
    assessment.progressTracker = buildInitialProgressTracker({
      outcomesTree: outcomesAD,
      users,
    });
  }

  const seededOutcomeB = assessment.progressTracker["A1b"];
  if (seededOutcomeB && !seededOutcomeB.ownerId) {
    seededOutcomeB.ownerId = ownerId;
    seededOutcomeB.status = "not_started";
    seededOutcomeB.updatedAt = new Date().toISOString();
  }

  const seededOutcomeD = assessment.progressTracker["D1b"];
  if (seededOutcomeD && !seededOutcomeD.ownerId) {
    seededOutcomeD.ownerId = ownerId;
    seededOutcomeD.status = "not_started";
    seededOutcomeD.updatedAt = new Date().toISOString();
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
  if (!assessment.selfAssess.bc["sys-1"]) {
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
        C1a: {
          igpResponse: "Monitoring for core services active; alerts triaged daily.",
          judgement: "Achieved",
          rationale: "SOC coverage includes the system and key dependencies.",
          evidenceRefs: [
            { refId: "MON-CCMS-07", type: "Monitoring report", link: "", note: "" },
          ],
          updatedAt: addDays(now, -2).toISOString(),
        },
        C1b: {
          igpResponse: "Coverage is partial for third-party interfaces.",
          judgement: "Not achieved",
          rationale: "Monitoring does not yet include all integrations.",
          evidenceRefs: [
            { refId: "MON-GAP-03", type: "Gap log", link: "", note: "" },
          ],
          updatedAt: addDays(now, -1).toISOString(),
        },
      },
    };
  }

  assessment.selfAssess.ad = assessment.selfAssess.ad || {};
  if (!assessment.selfAssess.ad["A1a"]) {
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

  if (!assessment.selfAssess.ad["D1b"]) {
    assessment.selfAssess.ad["D1b"] = {
      igpResponse: "Incident response playbooks exist but have not been exercised.",
      judgement: "Not achieved",
      rationale: "Exercises are scheduled but not yet completed.",
      evidenceRefs: [
        { refId: "IR-PLAN-02", type: "Playbook", link: "", note: "" },
      ],
      updatedAt: addDays(now, -6).toISOString(),
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
        sourceId: "sys-1:C1b",
        title: "Expand monitoring coverage for third-party interfaces",
        priority: "medium",
        owner: "Security operations lead",
        dueDate: toISODate(addDays(now, 60)),
        expectedEvidence: "Monitoring coverage report including integrations",
        checkInCadence: "quarterly",
        confirmed: true,
        status: "not_started",
        lastUpdateAt: "",
        lastUpdateNote: "",
        gapMeta: {
          outcomeCode: "C1.b",
          outcomeTitle: "Monitoring coverage",
          judgement: "Not achieved",
          systemName: "Case Management System",
        },
      },
      {
        id: `iip-seed-${Date.now() + 2}`,
        sourceType: "ad",
        sourceId: "D1b",
        title: "Run annual incident response exercise",
        priority: "high",
        owner: "Business continuity lead",
        dueDate: toISODate(addDays(now, 90)),
        expectedEvidence: "Exercise report and lessons learned log",
        checkInCadence: "monthly",
        confirmed: true,
        status: "in_progress",
        lastUpdateAt: toISODate(addDays(now, -8)),
        lastUpdateNote: "Scenario agreed; exercise scheduled with directorates.",
        gapMeta: {
          outcomeCode: "D1.b",
          outcomeTitle: "Incident response and recovery",
          judgement: "Not achieved",
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
  req.session.data.assessment = {
    id: "current",
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progressTracker: {},
  };

  seedPrototypeData(req.session.data.assessment, req.session.data.user);
}

function addDays(date, days) {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + days);
  return dt;
}

function toISODate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
