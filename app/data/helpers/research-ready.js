const { CAF_DEFAULT_VERSION, getOutcomesForVersion } = require("./caf-version");
const { buildInitialProgressTracker } = require("./progress");
const { getCouncilUsers, setSignedInCouncilUser } = require("./prototype-session");

const RESEARCH_READY_VARIANT = "round-2-post-setup";

const DEMO_B2A_JOURNEY = {
  achieved: {
    "robust-identity-proofing": {
      response: "alternative-control",
      explanation: "Staff accounts are set up through HR onboarding checks. Agency workers go through a separate vetting sign-off before access is granted.",
      note: "",
    },
    "individual-authentication": { response: "yes", explanation: "", note: "All users have individual named accounts. Shared credentials are not permitted." },
    "authorised-access-only": { response: "yes", explanation: "", note: "Role-based access profiles applied by team and case type." },
    "mfa-privileged-remote": { response: "yes", explanation: "", note: "MFA enforced for VPN and privileged admin access via Entra ID." },
    "access-review": { response: "yes", explanation: "", note: "Quarterly access reviews in place — last completed March 2026." },
    "auth-practice-current": { response: "yes", explanation: "", note: "Authentication managed via Entra ID and reviewed annually against NCSC guidance." },
  },
  notAchieved: {
    "unauthorised-access": { response: "no", explanation: "", note: "Privileged access is limited to named ICT support staff only." },
    "excessive-access": { response: "yes", explanation: "", note: "Some legacy supervisor roles give broader case visibility than the role requires." },
    "weak-authentication": { response: "no", explanation: "", note: "MFA enforced for admin access; password policy aligns with NCSC guidance." },
  },
  partiallyAchieved: {
    "reasonable-confidence": { response: "yes", explanation: "", note: "Agency worker onboarding relies on manual checks that are not consistently documented." },
    "some-additional-controls": { response: "yes", explanation: "", note: "MFA applied for VPN access but not yet enforced for all application-level admin functions." },
    "annual-access-review": { response: "yes", explanation: "", note: "Quarterly review is in place but leaver processing has had occasional delays." },
    "remote-access-controlled": { response: "yes", explanation: "", note: "VPN-only remote access enforced; a small number of local exceptions are logged." },
  },
};

const RESEARCH_READY_EMAIL = "morgan.ellis+research-ready@west-marchshire.gov.uk";
const RESEARCH_READY_COUNCIL = "West Marchshire Council";
const DEMO_OWNER_IDS = {
  lead: "user-west-marchshire-1",
  collaborator: "user-west-marchshire-2",
  approver: "user-west-marchshire-3",
};

const DEMO_SYS2_OUTCOMES_COMPLETED = {
  B2a: {
    ownerId: DEMO_OWNER_IDS.lead,
    collaboratorIds: [],
    status: "ready_for_internal_review",
    judgement: "Achieved",
    rationale: "Identity and access controls for the Revenues and Benefits System are well established. Role-based access profiles are applied consistently, MFA is enforced for all privileged and application-level admin access, and quarterly access reviews are completed on time.",
    b2aJourney: {
      achieved: {
        "robust-identity-proofing": { response: "yes", explanation: "", note: "All user accounts set up through formal onboarding process." },
        "individual-authentication": { response: "yes", explanation: "", note: "No shared accounts in use." },
        "authorised-access-only": { response: "yes", explanation: "", note: "Role-based profiles applied by team and function." },
        "mfa-privileged-remote": { response: "yes", explanation: "", note: "MFA enforced for all privileged and admin access." },
        "access-review": { response: "yes", explanation: "", note: "Quarterly access reviews completed and documented." },
        "auth-practice-current": { response: "yes", explanation: "", note: "Authentication reviewed annually against NCSC guidance." },
      },
      notAchieved: {
        "unauthorised-access": { response: "no", explanation: "", note: "" },
        "excessive-access": { response: "no", explanation: "", note: "" },
        "weak-authentication": { response: "no", explanation: "", note: "" },
      },
      partiallyAchieved: {
        "reasonable-confidence": { response: "no", explanation: "", note: "" },
        "some-additional-controls": { response: "no", explanation: "", note: "" },
        "annual-access-review": { response: "no", explanation: "", note: "" },
        "remote-access-controlled": { response: "no", explanation: "", note: "" },
      },
      indicativeJudgement: "Achieved",
      reviewDeclaration: true,
    },
  },
  B2b: {
    ownerId: DEMO_OWNER_IDS.lead,
    status: "ready_for_internal_review",
    judgement: "Partially achieved",
    rationale: "Device management policies are documented and MDM is deployed for most endpoints. A small number of contractor-owned devices remain outside MDM enrolment pending a procurement review.",
  },
  B3a: {
    ownerId: DEMO_OWNER_IDS.lead,
    status: "ready_for_internal_review",
    judgement: "Achieved",
    rationale: "Data flows are mapped and the information asset register is maintained and reviewed quarterly. Personal data processing activities are documented in line with council data protection requirements.",
  },
  B4a: {
    ownerId: DEMO_OWNER_IDS.lead,
    status: "ready_for_internal_review",
    judgement: "Achieved",
    rationale: "Security requirements are included in procurement and change management procedures. New systems and significant changes go through a security review before deployment.",
  },
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

  return {
    id: "current",
    startedFromEntry: true,
    cafVersion: CAF_DEFAULT_VERSION,
    councilName: RESEARCH_READY_COUNCIL,
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
        {
          id: "svc-3",
          name: "Workforce management",
          description: "HR, payroll and workforce planning for all council staff.",
          owner: "Head of HR",
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
          name: "Revenues and Benefits System",
          systemType: "COTS platform",
          ownerSupplier: "Capita",
          boundaryNotes: "Processes council tax and housing benefit applications across two service centres.",
          diagramRefs: ["ARCH-RBS-01"],
        },
        {
          id: "sys-3",
          name: "HR and Payroll System",
          systemType: "SaaS",
          ownerSupplier: "MHR",
          boundaryNotes: "Supports workforce management and payroll processing for all council staff.",
          diagramRefs: [],
        },
      ],
      mappings: [
        { systemId: "sys-1", serviceIds: ["svc-1"] },
        { systemId: "sys-2", serviceIds: ["svc-2"] },
        { systemId: "sys-3", serviceIds: ["svc-3"] },
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
          level: "high",
          rationale: "Disruption would affect council tax and benefit payments to residents.",
          criteria: ["statutory", "manyPeopleAffected"],
        },
        {
          systemId: "sys-3",
          level: "medium",
          rationale: "Payroll failure would have significant operational impact on service delivery.",
          criteria: ["manyPeopleAffected"],
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
    whoInvolvedStepCompleted: true,
    annualSetup: {
      adApproach: "first_time",
      systemsStepComplete: true,
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
      ad: {
        A1a: {
          judgement: "Achieved",
          rationale: "The council has a clearly defined board-level governance structure for cyber security and resilience, with named senior responsible owners and regular reporting.",
          updatedAt: "2026-03-03T10:00:00.000Z",
        },
        A1b: {
          judgement: "Partially achieved",
          rationale: "Roles and responsibilities are documented but not consistently understood across all teams. A communications plan is in progress.",
          updatedAt: "2026-03-03T10:00:00.000Z",
        },
      },
      adReview: {
        completed: true,
        completedAt: "2026-03-03T10:00:00.000Z",
        completedBy: "Morgan Ellis",
      },
      bc: {
        "sys-1": {
          outcomes: {
            B2a: {
              ownerId: DEMO_OWNER_IDS.lead,
              collaboratorIds: [DEMO_OWNER_IDS.collaborator],
              status: "in_progress",
              b2aJourney: { ...DEMO_B2A_JOURNEY },
              updatedAt: nowIso,
            },
          },
        },
        "sys-2": {
          outcomes: Object.fromEntries(
            Object.entries(DEMO_SYS2_OUTCOMES_COMPLETED).map(([k, v]) => [k, { ...v, updatedAt: "2026-04-10T14:00:00.000Z" }])
          ),
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

const DEMO_SYS1_B2A_COMPLETED = {
  ownerId: DEMO_OWNER_IDS.lead,
  collaboratorIds: [DEMO_OWNER_IDS.collaborator],
  status: "ready_for_internal_review",
  judgement: "Partially achieved",
  rationale:
    "Most identity and access controls are in place and working well. Individual accounts and MFA for privileged access are applied consistently across the system. The main gap is legacy supervisor roles that provide broader case visibility than their role requires — this is acknowledged and a role-profile review is planned for Q3. Agency worker onboarding is manual and not consistently documented, which adds risk to the joining process. These gaps prevent a full 'Achieved' judgement but the overall control position is strong.",
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
    ...DEMO_B2A_JOURNEY,
    indicativeJudgement: "Partially achieved",
    reviewDeclaration: true,
  },
};

function applyAllSystemsJudged(sessionData, nowIso) {
  const bc = sessionData.assessment.selfAssess.bc;
  bc["sys-1"].outcomes.B2a = { ...DEMO_SYS1_B2A_COMPLETED, updatedAt: nowIso };
  bc["sys-1"].outcomes.B2b = { ownerId: DEMO_OWNER_IDS.lead, status: "ready_for_internal_review", judgement: "Partially achieved", rationale: "Device management policies are in place for managed devices. A small number of legacy devices used by agency staff remain outside MDM enrolment.", updatedAt: nowIso };
  bc["sys-1"].outcomes.B3a = { ownerId: DEMO_OWNER_IDS.lead, status: "ready_for_internal_review", judgement: "Achieved", rationale: "Data flows for the Case Management System are mapped and documented. The information asset register is reviewed quarterly and kept current.", updatedAt: nowIso };
  bc["sys-1"].outcomes.B4a = { ownerId: DEMO_OWNER_IDS.lead, status: "ready_for_internal_review", judgement: "Achieved", rationale: "Security requirements are embedded in the system change management process. All changes to the Case Management System go through a formal security review.", updatedAt: nowIso };
  bc["sys-3"] = bc["sys-3"] || { outcomes: {} };
  bc["sys-3"].outcomes = {
    B2a: { ownerId: DEMO_OWNER_IDS.lead, status: "ready_for_internal_review", judgement: "Partially achieved", rationale: "Identity and access controls for the HR and Payroll System are partially in place. Individual accounts and MFA for remote access are enforced, but application-level admin functions do not yet require MFA.", updatedAt: nowIso },
    B2b: { ownerId: DEMO_OWNER_IDS.lead, status: "ready_for_internal_review", judgement: "Partially achieved", rationale: "MDM is deployed for council-issued devices. Personal devices used for mobile working are not yet enrolled.", updatedAt: nowIso },
    B3a: { ownerId: DEMO_OWNER_IDS.lead, status: "ready_for_internal_review", judgement: "Partially achieved", rationale: "Payroll data flows are partially mapped. The information asset register does not yet fully reflect all data flows between the HR system and third-party payroll processor.", updatedAt: nowIso },
    B4a: { ownerId: DEMO_OWNER_IDS.lead, status: "ready_for_internal_review", judgement: "Partially achieved", rationale: "Security requirements are considered during procurement but are not formally documented in all supplier contracts. A review is under way.", updatedAt: nowIso },
  };
  sessionData.assessment.selfAssess.ad = {
    A1a: {
      judgement: "Achieved",
      rationale: "The council has a clearly defined board-level governance structure for cyber security and resilience, with named senior responsible owners and regular reporting.",
      updatedAt: nowIso,
    },
    A1b: {
      judgement: "Partially achieved",
      rationale: "Roles and responsibilities are documented but not consistently understood across all teams. A communications plan is in progress.",
      updatedAt: nowIso,
    },
  };
  sessionData.assessment.selfAssess.adReview = {
    completed: true,
    completedAt: nowIso,
    completedBy: "Morgan Ellis",
  };
  sessionData.assessment.selfAssess.bcReview = {
    completed: true,
    completedAt: nowIso,
    completedBy: "Morgan Ellis",
  };
}

function initialiseDemoScene(sessionData, scene) {
  initialiseRoundTwoPostSetupResearch(sessionData);

  if (scene === "collaborator") {
    // Switch signed-in user to Priya Shah (user-west-marchshire-2)
    if (sessionData.prototypeSession && sessionData.prototypeSession.session) {
      sessionData.prototypeSession.session.currentUserId = DEMO_OWNER_IDS.collaborator;
    }
    const priyaUser = sessionData.prototypeSession &&
      sessionData.prototypeSession.users &&
      sessionData.prototypeSession.users.find(u => u.id === DEMO_OWNER_IDS.collaborator);
    if (priyaUser) {
      sessionData.user = { ...priyaUser };
    }
    // Clear the B2a journey so IGP questions are empty for research
    const bc = sessionData.assessment.selfAssess.bc;
    bc["sys-1"].outcomes.B2a = {
      ownerId: DEMO_OWNER_IDS.lead,
      collaboratorIds: [DEMO_OWNER_IDS.collaborator],
      status: "in_progress",
      b2aJourney: {},
      updatedAt: new Date().toISOString(),
    };
  }

  if (scene === "onboarding-task-list") {
    sessionData.assessment.scope = {};
    sessionData.assessment.stage.prepareScopeComplete = false;
    sessionData.assessment.scopeReview = {};
  }

  if (scene === "onboarding-context") {
    const ctx = sessionData.assessment.scope.context;
    sessionData.assessment.scope.context = { ...ctx, completed: false };
    sessionData.assessment.scope.essentialServices = [];
    sessionData.assessment.scope.criticalSystems = [];
    sessionData.assessment.scope.servicesConfirmed = false;
    sessionData.assessment.scope.priorityShortlist = [];
    sessionData.assessment.stage.prepareScopeComplete = false;
    sessionData.assessment.scopeReview = {};
  }

  if (scene === "onboarding-services") {
    sessionData.assessment.scope.servicesConfirmed = false;
    sessionData.assessment.scope.criticalSystems = [];
    sessionData.assessment.scope.priorityShortlist = [];
    sessionData.assessment.stage.prepareScopeComplete = false;
    sessionData.assessment.scopeReview = {};
  }

  if (scene === "onboarding-systems") {
    sessionData.assessment.stage.prepareScopeComplete = false;
    sessionData.assessment.scopeReview = {};
  }

  if (scene === "carried-forward-task-list") {
    const nowIso = new Date().toISOString();
    sessionData.assessment.annualSetup.adApproach = "reuse_current";
    sessionData.assessment.selfAssess = sessionData.assessment.selfAssess || { ad: {}, bc: {} };
    sessionData.assessment.selfAssess.ad = {
      A1a: {
        judgement: "Achieved",
        rationale: "Board-level ownership and reporting were in place across the council last year.",
        igpResponse: "Board reporting was regular and cyber risks were reviewed at the right level.",
        evidenceRefs: [{ title: "Previous annual governance report", type: "Board paper" }],
        updatedAt: nowIso,
        carriedForward: true,
        reviewRequired: true,
      },
      A1b: {
        judgement: "Partially achieved",
        rationale: "Roles were defined last year but not all responsibilities were consistently understood.",
        igpResponse: "Role descriptions existed, but handoffs between teams were inconsistent.",
        evidenceRefs: [{ title: "Prior accountability matrix", type: "Role description" }],
        updatedAt: nowIso,
        carriedForward: true,
        reviewRequired: true,
      },
    };
  }

  if (scene === "completed") {
    const nowIso = new Date().toISOString();
    const bc = sessionData.assessment.selfAssess.bc;
    bc["sys-1"].outcomes.B2a = { ...DEMO_SYS1_B2A_COMPLETED, updatedAt: nowIso };
  }

  if (scene === "review") {
    const nowIso = new Date().toISOString();
    applyAllSystemsJudged(sessionData, nowIso);
    sessionData.assessment.collaborationWorkflow = {
      status: "draft",
      lastEditedAt: nowIso,
      lastEditedBy: "Morgan Ellis",
    };
  }

  if (scene === "send-to-assurer") {
    const nowIso = new Date().toISOString();
    applyAllSystemsJudged(sessionData, nowIso);
    sessionData.assessment.collaborationWorkflow = {
      status: "approved",
      approvedAt: nowIso,
      approvedBy: "Morgan Ellis",
      lastEditedAt: nowIso,
      lastEditedBy: "Morgan Ellis",
    };
  }

  if (scene === "post-assurance") {
    const now = new Date();
    const nowIso = now.toISOString();
    const daysAgo = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      return d.toISOString();
    };
    applyAllSystemsJudged(sessionData, nowIso);
    sessionData.assessment.collaborationWorkflow = {
      status: "approved",
      reviewerName: "Lewis Turner",
      approverName: "Lewis Turner",
      submittedAt: daysAgo(21),
      submittedBy: "Morgan Ellis",
      reviewDecision: "approved",
      reviewNotes: "",
      reviewedAt: daysAgo(18),
      reviewedBy: "Lewis Turner",
      approvedAt: daysAgo(14),
      approvedBy: "Lewis Turner",
      lastEditedAt: daysAgo(14),
      lastEditedBy: "Morgan Ellis",
    };
    sessionData.assessment.assurerSubmission = {
      submitted: true,
      submittedAt: daysAgo(14),
      confirmedBy: "Morgan Ellis",
      assurerOrg: "NorthStar Assurance",
      assurerName: "Jordan Blake",
    };
    sessionData.assessment.assurance = {
      workflowStage: "stage1_finalised",
      objectives: {
        adWorkshop: { scheduledAt: daysAgo(12), completedAt: daysAgo(12), notes: "" },
        bcWorkshop: { scheduledAt: daysAgo(10), completedAt: daysAgo(10), notes: "" },
      },
      evidenceRequests: [],
      recordOfAudit: {
        submittedAt: daysAgo(8),
        submittedBy: "Jordan Blake",
        outcomes: [
          { outcomeId: "A1a", assurerRating: "partial", justification: "Board reporting exists but cadence is inconsistent. The council has named leads but quarterly review evidence was incomplete for two of the four quarters reviewed." },
          { outcomeId: "A1b", assurerRating: "partial", justification: "Role definitions are documented at a high level but ownership gaps were identified across third-party relationships and between IT and operational teams." },
          { outcomeId: "B2a:sys-1", assurerRating: "partial", justification: "Access controls are largely in place. Named accounts and role-based profiles are applied consistently. However MFA is not enforced for all application-level administrator functions, and a small number of VPN exceptions have not been formally reviewed." },
        ],
        igps: [
          { outcomeId: "A1a", igpId: "IGP-1", assessment: "met", note: "" },
          { outcomeId: "A1a", igpId: "IGP-2", assessment: "not_met", note: "Quarterly board papers reviewed — two quarters lacked specific cyber agenda items." },
          { outcomeId: "A1a", igpId: "IGP-3", assessment: "met", note: "" },
          { outcomeId: "A1b", igpId: "IGP-1", assessment: "met", note: "" },
          { outcomeId: "A1b", igpId: "IGP-2", assessment: "not_met", note: "Supplier accountability not covered in current RACI." },
          { outcomeId: "A1b", igpId: "IGP-3", assessment: "met", note: "" },
          { outcomeId: "B2a:sys-1", igpId: "IGP-1", assessment: "met", note: "" },
          { outcomeId: "B2a:sys-1", igpId: "IGP-2", assessment: "not_met", note: "MFA not enforced for all application-level admin access — some functions accessible without MFA when on-network." },
          { outcomeId: "B2a:sys-1", igpId: "IGP-3", assessment: "met", note: "VPN exceptions are logged but formal review process not yet in place." },
        ],
      },
      stage1Report: {
        draftSharedAt: daysAgo(9),
        draftSharedBy: "Jordan Blake",
        finalisedAt: daysAgo(7),
        finalisedBy: "Jordan Blake",
        councilAmendments: { status: "none", dueAt: "", submittedAt: "", notes: "" },
        items: [
          {
            outcomeId: "A1a",
            recommendation: "Establish a formal board-level cyber risk reporting cadence with dedicated quarterly agenda items. Ensure board papers demonstrate active engagement with specific cyber risk decisions, not just status updates.",
            riskLevel: "high",
            riskDescription: "Without consistent board-level oversight, strategic cyber risks may not be escalated or addressed in a timely manner, potentially leading to governance failures and non-compliance with CAF requirements.",
            controlTypes: ["process", "people"],
          },
          {
            outcomeId: "A1b",
            recommendation: "Define and publish an accountability matrix covering all cyber-related roles. Include explicit handoff points between teams, third-party relationships, and escalation paths for incidents.",
            riskLevel: "medium",
            riskDescription: "Unclear ownership of cyber responsibilities risks gaps in security controls, delayed incident response, and difficulty assigning accountability in the event of an incident.",
            controlTypes: ["people", "process"],
          },
          {
            outcomeId: "B2a",
            recommendation: "Enforce multi-factor authentication across all application-level administrator accounts for in-scope systems. Formalise the review and closure of remote access exceptions. Ensure named account policy consistently covers all third-party support access.",
            riskLevel: "medium",
            riskDescription: "Gaps in MFA enforcement and unreviewed remote access exceptions create opportunities for unauthorised or excessive access to systems supporting statutory services.",
            controlTypes: ["tech", "process"],
          },
        ],
      },
      councilWorkshopResponse: { decision: "", notes: "", respondedAt: "", respondedBy: "" },
    };
  }
}

function endOfFinancialYear(date) {
  const year = date.getFullYear() + 1;
  return new Date(year, 3, 5, 23, 59, 0, 0).toISOString();
}

module.exports = {
  initialiseRoundTwoPostSetupResearch,
  initialiseDemoScene,
  isResearchReadyVariant,
  RESEARCH_READY_VARIANT,
};
