const { CAF_DEFAULT_VERSION, getOutcomesForVersion } = require("./caf-version");
const { buildInitialProgressTracker } = require("./progress");
const { getCouncilUsers, setSignedInCouncilUser } = require("./prototype-session");

const RESEARCH_READY_VARIANT = "round-2-post-setup";
const RESEARCH_READY_EMAIL = "morgan.ellis+research-ready@west-marchshire.gov.uk";
const RESEARCH_READY_COUNCIL = "West Marchshire Council";
const DEMO_OWNER_IDS = {
  lead: "user-west-marchshire-1",
  collaborator: "user-west-marchshire-2",
  approver: "user-west-marchshire-3",
};

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
    progressTracker.A1a.ownerId = DEMO_OWNER_IDS.lead || ownerId;
    progressTracker.A1a.status = "ready_for_internal_review";
    progressTracker.A1a.evidenceRefs = [
      {
        refId: "GOV-BOARD-2026-02",
        type: "Board paper",
        link: "CABINET-CYBER-2026-02",
        note: "Board security update and governance actions agreed.",
      },
    ];
    progressTracker.A1a.updatedAt = nowIso;
  }

  if (progressTracker.A1b) {
    progressTracker.A1b.ownerId = DEMO_OWNER_IDS.collaborator;
    progressTracker.A1b.status = "in_progress";
    progressTracker.A1b.updatedAt = nowIso;
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
        {
          id: "svc-2",
          name: "Revenues and benefits",
          description: "Administration of council tax support, housing benefit and related payments.",
          owner: "Head of Revenues and Benefits",
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
        {
          id: "sys-2",
          name: "Benefits Administration Platform",
          systemType: "Hosted SaaS",
          ownerSupplier: "NEC",
          boundaryNotes: "Supports claims processing and staff access for revenues and benefits teams.",
          diagramRefs: ["ARCH-BEN-02"],
        },
        {
          id: "sys-3",
          name: "Remote Access Gateway",
          systemType: "Infrastructure service",
          ownerSupplier: "Managed service",
          boundaryNotes: "Controls remote access for internal administrators and third-party support.",
          diagramRefs: ["ARCH-RAG-03"],
        },
      ],
      mappings: [
        { systemId: "sys-1", serviceIds: ["svc-1"] },
        { systemId: "sys-2", serviceIds: ["svc-2"] },
        { systemId: "sys-3", serviceIds: ["svc-1", "svc-2"] },
      ],
      priority: [
        {
          systemId: "sys-1",
          level: "high",
          rationale: "Service disruption would affect statutory casework.",
          criteria: ["statutory", "singlePointFailure"],
        },
        {
          systemId: "sys-2",
          level: "medium",
          rationale: "Incorrect access could affect payment decisions and resident data.",
          criteria: ["sensitiveData"],
        },
        {
          systemId: "sys-3",
          level: "high",
          rationale: "This gateway controls remote access into the council network.",
          criteria: ["adminAccess", "singlePointFailure"],
        },
      ],
      priorityShortlist: ["sys-1", "sys-2", "sys-3"],
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
      systemIds: ["sys-1", "sys-2", "sys-3"],
      completed: true,
      updatedAt: nowIso,
    },
    selfAssess: {
      ad: {},
      bc: {
        "sys-1": {
          outcomes: {
            B2a: {
              ownerId: DEMO_OWNER_IDS.lead,
              collaboratorIds: [DEMO_OWNER_IDS.collaborator],
              status: "in_progress",
              rationale:
                "Most access is individually authenticated and reviewed, but supervisor role design and manual agency worker checks still need tightening.",
              evidenceRefs: [
                {
                  title: "Access control policy (v2.1)",
                  link: "POL-ACC-2.1",
                  description: "Joiner, mover and leaver process and role-based access expectations.",
                },
                {
                  title: "Active Directory configuration extract",
                  link: "AD-CONFIG-2026-04",
                  description: "Shows MFA and privileged access settings for the system support group.",
                },
                {
                  title: "User access audit report",
                  link: "AUDIT-UAR-Q1-2026",
                  description: "Quarterly review of named users, leavers and privileged access.",
                },
              ],
              b2aJourney: {
                achieved: {
                  "robust-identity-proofing": {
                    response: "alternative-control",
                    explanation: "Council staff are identity checked through HR onboarding before accounts are created.",
                    note: "Evidence: Access control policy (v2.1)",
                  },
                  "individual-authentication": {
                    response: "yes",
                    explanation: "",
                    note: "Evidence: Active Directory configuration extract",
                  },
                  "authorised-access-only": {
                    response: "yes",
                    explanation: "",
                    note: "Role profiles limit access by team and case type.",
                  },
                  "mfa-privileged-remote": {
                    response: "",
                    explanation: "",
                    note: "",
                  },
                  "access-review": {
                    response: "yes",
                    explanation: "",
                    note: "Evidence: User access audit report",
                  },
                  "auth-practice-current": {
                    response: "",
                    explanation: "",
                    note: "",
                  },
                },
                notAchieved: {
                  "unauthorised-access": {
                    response: "no",
                    explanation: "",
                    note: "Privileged admin access is limited to named support staff.",
                  },
                  "excessive-access": {
                    response: "yes",
                    explanation: "",
                    note: "Legacy supervisor roles still allow broader case visibility than needed.",
                  },
                  "weak-authentication": {
                    response: "",
                    explanation: "",
                    note: "",
                  },
                },
                partiallyAchieved: {
                  "reasonable-confidence": {
                    response: "yes",
                    explanation: "",
                    note: "Manual checks for agency workers are not yet consistent.",
                  },
                  "some-additional-controls": {
                    response: "",
                    explanation: "",
                    note: "",
                  },
                  "annual-access-review": {
                    response: "",
                    explanation: "",
                    note: "",
                  },
                  "remote-access-controlled": {
                    response: "",
                    explanation: "",
                    note: "",
                  },
                },
              },
              igpResponse:
                "4 yes, 1 no, 1 alternative control, 0 not applicable",
              igpAssessments: [
                {
                  statement:
                    "Users are identity verified to an appropriate level before accounts are issued for this system.",
                  response: "alternative-control",
                  rationale: "Council staff are identity checked through HR onboarding before accounts are created.",
                  evidenceNote: "Evidence: Access control policy (v2.1)",
                  captureMode: "signal",
                },
                {
                  statement:
                    "Each user has an individual account and authentication credentials are not shared.",
                  response: "yes",
                  rationale: "Evidence: Active Directory configuration extract",
                  evidenceNote: "Evidence: Active Directory configuration extract",
                  captureMode: "signal",
                },
                {
                  statement:
                    "Access is restricted so only authorised users can reach the system and the functions they need.",
                  response: "yes",
                  rationale: "Role profiles limit access by team and case type.",
                  evidenceNote: "Role profiles limit access by team and case type.",
                  captureMode: "signal",
                },
                {
                  statement:
                    "User and privileged access lists are reviewed regularly and leavers or role changes are updated promptly.",
                  response: "yes",
                  rationale: "Evidence: User access audit report",
                  evidenceNote: "Evidence: User access audit report",
                  captureMode: "signal",
                },
                {
                  statement:
                    "Unauthorised individuals can gain access to this system or its administrative functions.",
                  response: "no",
                  rationale: "Privileged admin access is limited to named support staff.",
                  evidenceNote: "Privileged admin access is limited to named support staff.",
                  captureMode: "signal",
                },
                {
                  statement:
                    "Users have broader access than they need to perform their role on this system.",
                  response: "yes",
                  rationale: "Legacy supervisor roles still allow broader case visibility than needed.",
                  evidenceNote: "Legacy supervisor roles still allow broader case visibility than needed.",
                  captureMode: "signal",
                },
                {
                  statement:
                    "The council has reasonable confidence in identity verification, but some joining routes still need strengthening.",
                  response: "yes",
                  rationale: "Manual checks for agency workers are not yet consistent.",
                  evidenceNote: "Manual checks for agency workers are not yet consistent.",
                  captureMode: "signal",
                },
              ],
              updatedAt: nowIso,
            },
          },
        },
        "sys-2": {
          outcomes: {
            B2a: {
              ownerId: DEMO_OWNER_IDS.collaborator,
              collaboratorIds: [DEMO_OWNER_IDS.approver],
              status: "ready_for_internal_review",
              judgement: "Achieved",
              rationale:
                "Identity and access controls are consistently applied for this platform and recent review evidence supports the judgement.",
              evidenceRefs: [
                {
                  title: "Benefits platform access matrix",
                  link: "BEN-ACCESS-2026-03",
                  description: "Named roles and approved access profiles for operational teams.",
                },
              ],
              updatedAt: nowIso,
            },
          },
        },
        "sys-3": {
          outcomes: {
            B2a: {
              ownerId: DEMO_OWNER_IDS.approver,
              collaboratorIds: [],
              status: "not_started",
              updatedAt: nowIso,
            },
          },
        },
      },
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
