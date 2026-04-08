const { CAF_DEFAULT_VERSION, getOutcomesForVersion } = require("./caf-version");
const { buildInitialProgressTracker } = require("./progress");
const { getCouncilUsers, setSignedInCouncilUser } = require("./prototype-session");

const RESEARCH_READY_VARIANT = "round-2-post-setup";
const RESEARCH_READY_EMAIL = "morgan.ellis+research-ready@west-marchshire.gov.uk";
const RESEARCH_READY_COUNCIL = "West Marchshire Council";

function initialiseRoundTwoPostSetupResearch(sessionData) {
  if (!sessionData) return;

  Object.keys(sessionData).forEach((key) => {
    delete sessionData[key];
  });

  sessionData.researchRound = "round-2";
  sessionData.prototypeVariant = RESEARCH_READY_VARIANT;

  setSignedInCouncilUser(sessionData, {
    name: "Morgan Ellis",
    email: RESEARCH_READY_EMAIL,
    councilName: RESEARCH_READY_COUNCIL,
    setupStatus: "complete",
  });

  sessionData.assessment = buildRoundTwoPostSetupAssessment(sessionData);
}

function isResearchReadyVariant(sessionData) {
  return Boolean(
    sessionData && sessionData.prototypeVariant === RESEARCH_READY_VARIANT
  );
}

function buildRoundTwoPostSetupAssessment(sessionData) {
  const now = new Date();
  const nowIso = now.toISOString();
  const dueAt = endOfFinancialYear(now);
  const currentUser = sessionData && sessionData.user ? sessionData.user : null;
  const ownerId = currentUser && currentUser.id ? currentUser.id : "user-west-marchshire-1";
  const councilUsers = getCouncilUsers(sessionData);
  const { ad } = getOutcomesForVersion(CAF_DEFAULT_VERSION);
  const progressTracker = buildInitialProgressTracker({
    outcomesTree: ad,
    users: councilUsers,
  });

  if (progressTracker.A1a) {
    progressTracker.A1a.ownerId = ownerId;
    progressTracker.A1a.status = "not_started";
    progressTracker.A1a.updatedAt = nowIso;
  }

  return {
    id: "current",
    startedFromEntry: true,
    cafVersion: CAF_DEFAULT_VERSION,
    councilName: RESEARCH_READY_COUNCIL,
    hasPreviousAdAssessment: false,
    stage: {
      understandCAFComplete: true,
      prepareScopeComplete: true,
    },
    scope: {
      context: {
        mission: "Protect the council services residents rely on every day.",
        objectives: "Keep essential services available and recoverable.",
        priorities: "Focus assurance on the systems that support adult social care.",
        setup: "Core delivery teams and suppliers are already identified.",
        operate: "The council uses shared governance and service management arrangements.",
        threat: "Ransomware and supplier disruption remain the main concerns.",
        appetite: "Limited tolerance for outages affecting statutory services.",
        completed: true,
      },
      whoInvolvedConfirmed: false,
      evidenceRulesAgreed: false,
      evidenceRulesNotes: "",
      essentialServices: [
        {
          id: "svc-1",
          name: "Adult social care",
          description: "Case management and safeguarding for vulnerable adults.",
          owner: "Director of Adult Services",
          inScope: true,
        },
      ],
      criticalSystems: [
        {
          id: "sys-1",
          name: "Case Management System",
          systemType: "COTS platform",
          ownerSupplier: "Civica",
          boundaryNotes: "Used by adult social care teams and commissioned providers.",
          diagramRefs: ["ARCH-CCMS-01"],
        },
      ],
      mappings: [{ systemId: "sys-1", serviceIds: ["svc-1"] }],
      priority: [
        {
          systemId: "sys-1",
          level: "high",
          rationale: "Service disruption would affect statutory casework.",
          criteria: ["statutory", "singlePointFailure"],
        },
      ],
      priorityShortlist: ["sys-1"],
      servicesConfirmed: true,
      assurerReviewed: false,
      rolesLead: "Morgan Ellis",
      rolesApprover: "Lewis Turner",
      rolesTech: "Priya Shah",
    },
    lens: null,
    criticalSystem: null,
    criticalSystems: [],
    evidenceRulesConfirmed: null,
    prepare: {
      guidanceRead: true,
      contributorsConfirmed: true,
      cafReviewed: true,
      onboardingRolesComplete: true,
      onboardingLead: "Morgan Ellis",
      onboardingApprover: "Lewis Turner",
      onboardingContributors: "Priya Shah",
    },
    profile: {
      reviewed: true,
    },
    scopeReview: {
      decision: "no_change",
      completed: true,
      updatedAt: nowIso,
    },
    annualSetup: {
      scopeCheckStatus: "no_change",
      adAssessmentStatus: "new_assessment",
      annualLead: "Morgan Ellis",
      annualApprover: "Lewis Turner",
      assurerContact: "Jordan Blake",
      assuranceMonth: "10",
      assuranceYear: String(now.getFullYear()),
      assuranceWindow: "October 2026",
      checkInPlan: "planned",
      checkInNotes: "Monthly progress check-ins already agreed for the assessment cycle.",
      systemIds: ["sys-1"],
      completed: true,
      updatedAt: nowIso,
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
    dueAt,
    updatedAt: nowIso,
    progressTracker,
  };
}

function endOfFinancialYear(date) {
  const year = date.getFullYear() + 1;
  return new Date(year, 3, 5, 23, 59, 0, 0).toISOString();
}

module.exports = {
  initialiseRoundTwoPostSetupResearch,
  isResearchReadyVariant,
  RESEARCH_READY_VARIANT,
};
