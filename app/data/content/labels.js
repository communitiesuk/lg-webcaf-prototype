// app/data/content/labels.js
// Centralised copy/labels (adds export copy label)

module.exports = {
  serviceName: "WebCAF for local government",

  entry: {
    pageTitle: "CAF for Local Government",
    heading: "WebCAF for local government",
    intro:
      "Plan, complete and submit your Cyber Assessment Framework (CAF) self-assessment, with clear ownership, evidence references and independent review.",
    actions: {
      startNew: "Start your assessment",
      resume: "Continue your assessment",
    },
    scopeLink: "Go to setup summary",
    resumeHint:
      "Continue takes you to the most recently updated assessment item assigned to you. If none, it opens your dashboard.",
    nextSteps: [
      "Complete your setup summary, including essential services, critical systems and system mappings",
      "Get internal sign-off for the setup summary and share it with your independent assurer",
      "Start the self-assessment once the setup summary is complete",
    ],
    optionalLinks: {
      previousSubmissions: "View previous submissions (optional)",
      assurerEntry: "Assurer review entry (optional)",
    },
  },
  start: {
    pageTitle: "Start",
    heading: "Start a CAF self-assessment",
    intro:
      "Use this service to plan, complete and submit your CAF self-assessment for local government. Some preparation happens outside the service before you record your scope.",
    startButton: "Start now",
    beforeYouStart: [
      "Agree who owns the assessment and who needs to contribute",
      "Collect evidence references (IDs or links) — do not upload evidence",
      "Decide which critical systems you will assess for Objectives B and C",
    ],
    youWillNeed: {
      intro: "You will need:",
      items: [
        "a list of the contributing outcomes in your target profile",
        "owners and collaborators for each outcome",
        "evidence reference IDs or links for each outcome",
        "an assurer contact for independent review",
      ],
    },
    details: {
      heading: "About CAF and evidence references",
      caf:
        "The Cyber Assessment Framework (CAF) is used to assess cyber resilience. It is made up of outcomes and indicators of good practice (IGPs).",
      evidence:
        "This service records references to evidence stored elsewhere. Keep the evidence in your own systems and record the ID or link here.",
    },
  },
  signIn: {
    pageTitle: "Switch user",
    heading: "Switch user",
    intro: "Select a user profile to open the service in that role.",
    prototypeNote:
      "This changes what this session can see and do.",
    chooseUser: "Choose a user",
    hint: "Switching user changes which dashboards and pages you can see.",
    signInButton: "Switch user",
    errors: {
      userRequired: "Select a user",
    },
  },
  mhclg: {
    pageTitle: "Council progress overview",
    heading: "Council progress overview",
    intro: "Track where each council is in the assessment journey and prepare engagement.",
  },

  stages: {
    stage1: {
      pageTitle: "Stage 1: Understand the CAF",
      heading: "Understand the CAF for local government",
      intro:
        "Use the CAF to assess and improve cyber resilience across your council and its critical systems.",
      programmeGoal:
        "Good looks like councils understanding resilience gaps, acting on improvement plans, and MHCLG gaining a sector-wide view of resilience.",
      prototypeNote: "You will not upload evidence here.",
      structure: {
        objectives: {
          title: "Objectives",
          text: "4 objectives describe what good cyber resilience looks like.",
        },
        principles: {
          title: "Principles",
          text: "14 principles break each objective into areas to assess.",
        },
        outcomes: {
          title: "Contributing outcomes",
          text: "You assess each outcome and record your judgement.",
        },
        igps: {
          title: "Indicators of good practice (IGPs)",
          text: "IGPs guide evidence gathering and help inform judgement.",
        },
      },
      lens: {
        ad: {
          title: "Council-wide self-assessment (Objectives A and D)",
          text: "Governance, risk, incident response and recovery across the council.",
        },
        bc: {
          title: "Critical systems self-assessment (Objectives B and C)",
          text: "Technical and operational controls for each priority system.",
        },
      },
      profileDetails: {
        heading: "What is the local government CAF profile?",
        text:
          "The local government profile is the set of CAF outcomes councils are expected to assess. MHCLG has tailored it for local government.",
      },
      evidenceDetails: {
        heading: "What counts as evidence references?",
        text:
          "You will record evidence reference IDs or links to documents held elsewhere. Evidence is not stored in this service.",
      },
      whoHeading: "Who you will likely need involved",
      whoList: [
        "CAF Lead and approver",
        "Governance, risk and compliance leads",
        "Business continuity and incident response leads",
        "Procurement, legal and communications partners",
        "Technical owners who can map and describe systems",
      ],
      timeHeading: "Time expectation:",
      timeText: "Around 40 hours over roughly 4 weeks for a typical council.",
      continue: "Continue to Stage 2: Prepare and set scope",
    },
    stage1Decision: {
      pageTitle: "Choose your next step",
      heading: "Choose your next step",
      intro: "Choose which part of the self-assessment you want to start now.",
      question: "What do you want to do next?",
      options: {
        stage3: "Self-assess your council (Objectives A and D) — Stage 3",
        stage4: "Self-assess critical systems (Objectives B and C) — Stage 4",
      },
      continue: "Continue",
      errors: {
        required: "Select a next step",
      },
    },
    stage2: {
      pageTitle: "Stage 2: Prepare and set scope",
      whoInvolvedHeading: "Confirm who is involved",
      evidenceRulesHeading: "Confirm evidence referencing rules agreed with the assurer",
      chooseAssessmentHeading: "Choose assessment to start now",
      criticalSystemHeading: "Create critical system record",
    },
    scope: {
      hub: {
        title: "Assessment setup",
        intro:
          "Add your essential services and critical systems, link them together, and get them ready to use in each assessment.",
        continue: "Continue setup",
        completeContinue: "Setup complete",
        statusHeading: "Setup status",
        statusHint: "Use this to record whether setup work is stalled and why.",
        statusOptions: {
          onTrack: "On track",
          stalled: "Stalled",
        },
        blockerLabel: "What is blocking progress?",
        blockerHint: "Keep this short so engagement managers can act quickly.",
        blockerNotesLabel: "Notes (optional)",
        rolesHeading: "People helping with this assessment",
        rolesHint: "Add the people or teams who will help complete this assessment.",
        rolesLeadLabel: "CAF Lead or assessment owner",
        rolesSmeLabel: "Subject matter experts (governance, risk, legal, procurement)",
        rolesTechLabel: "System and technical owners",
        rolesApproverLabel: "Approver or senior sign-off",
        rolesConfirmLabel: "I have confirmed the people who will help complete this assessment",
        leadConfirmLabel: "The CAF Lead has reviewed and signed off these setup details internally",
        assurerReviewLabel: "I have shared these setup details with the assurer for review",
      },
      services: {
        addTitle: "List your essential services",
        reviewTitle: "Review your essential services list",
        confirmTitle: "Choose which essential services are in this assessment",
        addButton: "Add service",
        continueButton: "Continue to critical systems",
      },
      systems: {
        addTitle: "List your critical systems",
        reviewTitle: "Review your critical systems list",
        addButton: "Add system",
        continueButton: "Continue to mapping",
      },
      mapping: {
        title: "Link systems to essential services",
        reviewTitle: "Review system mappings",
      },
      priority: {
        title: "Set priorities for critical systems",
        shortlistTitle: "Choose which systems to assess",
        confirmTitle: "Confirm priority shortlist",
      },
      criteria: {
        statutory: "Supports a statutory or critical service",
        singlePointFailure: "Single point of failure or no workaround",
        sensitiveData: "High sensitivity of data",
        highExposure: "High exposure (internet-facing or widely accessed)",
        incidents: "Known incidents or near misses",
      },
      errors: {
        serviceName: "Enter the essential service name",
        serviceInScope: "Select whether the service is in scope",
        systemName: "Enter the critical system name",
        mappingRequired: "Select at least one essential service",
        priorityLevel: "Select a priority level",
        priorityRationale: "Enter a short rationale for the priority",
        scopePackStatus: "Select the setup status",
        scopeBlockerReason: "Select a blocker reason",
        scopeRolesConfirm: "Confirm the team who will complete this assessment",
        scopeLeadConfirm: "Confirm the CAF Lead has signed off the setup details internally",
        scopeAssurerReview: "Confirm the setup details have been shared with the assurer for review",
        shortlistMinimum: "Add and prioritise at least 3 critical systems before continuing",
      },
    },
  },

  dashboard: {
    pageTitle: "Assessment dashboard",
    heading: "Assessment dashboard",
    hint:
      "Assign owners, track progress, set due dates, and record notes for each contributing outcome.",
    resumeHint:
      "Continue takes you to the most recently updated outcome assigned to you.",
    evidenceHint:
      "Evidence references here are working notes. Record the final evidence set in the self-assessment outcome.",
    lensNotice:
      "This dashboard combines council-wide outcomes (A and D) and critical systems outcomes (B and C). Use the filters to focus on the work you need.",
    pickOutcome: "Choose an outcome",
    summaryHeading: "Summary",
    filterHeading: "Filter outcomes",
    viewsHeading: "Views",
    groupsHeading: "Outcomes",
    views: {
      all: "All outcomes",
      my: "My work",
      attention: "Needs attention",
    },
    overdueOnly: "Show overdue only",
    resultsHeading: "Results",
    cycleHeading: "Current cycle",
    startNewCycle: "Start new cycle",
    cycleHistory: "View cycle history",
    exportCsv: "Export CSV (current cycle)",
  },

  flow: {
    actions: {
      continue: "Continue",
      addEvidence: "Add evidence reference",
      removeEvidence: "Remove",
      saveOutcome: "Save outcome",
      addAction: "Add action",
      saveSubmission: "Save submission",
    },
    prepare: {
      pageTitle: "Prepare and get set up",
      heading: "Prepare for the CAF",
      intro: "Confirm you have completed the preparation steps before you continue.",
      checklistHeading: "Preparation checklist",
      checklistLegend: "Confirm you have completed the preparation steps",
      checklist: {
        awareness: "I understand what the CAF is and why we are completing it",
        signoff: "I have internal sign-off to complete the CAF",
        support: "I know how to access support if we need it",
        understanding: "I understand what the CAF involves",
        governance: "I have set up the CAF team and governance",
        assurers: "I have met or contacted our assurer",
      },
      errors: {
        required: "Confirm you have completed all preparation steps",
      },
    },
    profile: {
      pageTitle: "Assessment profile and target level",
      heading: "Assessment profile and target level",
      intro:
        "Use this page to see which outcomes are included in this assessment and the target level your council should aim for.",
      switchLink: "Switch assessment view",
      reviewedYes: "I have reviewed the profile targets",
      reviewedNo: "I will review these later",
    },
    selfAssessAD: {
      pageTitle: "Self-assess your council (Objectives A and D)",
      heading: "Self-assess your council (Objectives A and D)",
      intro: "Complete each contributing outcome with IGP responses, evidence references and a judgement.",
      outcomeHeading: "Outcome",
    },
    selfAssessBC: {
      pageTitle: "Self-assess critical systems (Objectives B and C)",
      heading: "Self-assess critical systems (Objectives B and C)",
      intro:
        "Assess each priority critical system against Objectives B and C, capturing IGP responses, evidence and judgements.",
      selectHeading: "Choose a system to assess",
      selectIntro:
        "Only shortlisted systems appear here. Add or update priorities in the setup lists if you need to change the list.",
      noShortlist: "No shortlisted systems yet.",
      addSystemLink: "Add another critical system",
      addHeading: "Add a critical system",
      nameLabel: "Critical system name",
      addButton: "Add critical system",
      systemHeading: "Critical system assessment",
      outcomeHeading: "Outcome",
      errors: {
        nameRequired: "Enter the name of the critical system",
      },
    },
    selfAssessOutcome: {
      igpResponse: "IGP responses",
      igpHint: "Summarise the IGP responses for this outcome. Keep it factual and clear.",
      judgement: "Overall judgement",
      judgementOptions: [
        { value: "Achieved", text: "Met" },
        { value: "Not achieved", text: "Not met" },
      ],
      rationale: "Reasons for this judgement",
      evidenceHeading: "Evidence references",
      evidenceHint:
        "Add reference IDs or links only. If you have working references in the assessment dashboard, copy them here for the judgement record.",
      progressLink: "View the dashboard record for this outcome",
      reviewHeading: "Internal review and approval",
      qualityReviewedAt: "Quality review date",
      approverReviewedAt: "Approver sign-off date",
      errors: {
        igpRequired: "Enter the IGP response summary",
        judgementRequired: "Select an overall judgement",
        rationaleRequired: "Enter the rationale for the judgement",
        evidenceRequired: "Add at least one evidence reference (ID or link)",
      },
    },
    evidence: {
      pageTitle: "Evidence pack",
      heading: "Evidence pack",
      intro:
        "Maintain a structured evidence library so an assurer can review references without hunting for documents.",
      libraryHeading: "Evidence library entries",
      addHeading: "Add a library reference",
      collectedHeading: "Evidence references captured in outcomes",
    },
    assurance: {
      pageTitle: "Independent review",
      heading: "Independent review",
      intro: "Record the assurer's feedback and whether changes are needed before submission.",
      statusLabel: "Independent review status",
      statusOptions: [
        { value: "changes_needed", text: "Changes needed" },
        { value: "approved", text: "Approved" },
      ],
      feedbackLabel: "Assurer feedback",
      reviewedAt: "Review date",
    },
    improvement: {
      pageTitle: "Improvement and implementation plan",
      heading: "Improvement and implementation plan",
      intro:
        "Record a small set of prioritised actions with owners, dates and expected evidence of change.",
      addHeading: "Add an action",
      tracking: {
        heading: "Action tracking",
        intro: "Track delivery status, check-ins, and evidence of change for each action.",
        statusLabel: "Progress status",
        lastUpdate: "Last update",
        evidence: "Expected evidence",
        evidenceRef: "Evidence of change",
      },
      generate: {
        pageTitle: "Generate improvement plan from gaps",
        heading: "Generate improvement plan from gaps",
        intro:
          "Select the outcomes that are not achieved or partially achieved. Keep the list small and leadership-ready.",
        roleHint: "Assurer: select the gaps to turn into improvement actions.",
        actionHint: "Start with 5 to 10 actions so the plan is achievable.",
        tableHeading: "Gaps identified",
        keepLabel: "Include in plan",
        errors: {
          required: "Select at least one gap to generate the plan",
        },
      },
      awaiting: {
        pageTitle: "Improvement plan awaiting assurance",
        heading: "Improvement plan awaiting assurance",
        intro:
          "The assurer needs to generate the improvement actions before you can add owners and dates.",
        linkText: "Return to dashboard",
      },
      edit: {
        pageTitle: "Prioritise and assign actions",
        heading: "Prioritise and assign actions",
        intro:
          "Complete priority, owner, due date, expected evidence, and check-in cadence for each action.",
        roleHint: "Council: complete the implementation details for each action.",
        priorityLabel: "Priority",
        ownerLabel: "Owner",
        dueDateLabel: "Due date",
        evidenceLabel: "Expected evidence of change",
        progressLabel: "Progress status",
        evidenceRefLabel: "Evidence of change reference",
        cadenceLabel: "Check-in cadence",
        keepLabel: "Keep",
        errors: {
          required: "Complete all fields for each action you keep",
        },
      },
      review: {
      pageTitle: "Review your improvement plan",
      heading: "Review your improvement plan",
      intro: "Confirm the final action list before the assurer signs it off.",
        editLink: "Edit actions",
        signOffButton: "Continue to assurer sign-off",
      },
      signOff: {
        pageTitle: "Assurer sign-off",
        heading: "Assurer sign-off",
        intro: "Record that the assurer has signed off the improvement plan.",
        roleHint: "Assurer: confirm the plan is ready to submit.",
        byLabel: "Assurer name",
        dateLabel: "Sign-off date",
        noteLabel: "Note (optional)",
        save: "Save sign-off",
        continue: "Continue to submission",
        errors: {
          byRequired: "Enter the assurer name",
          dateRequired: "Enter the sign-off date",
        },
      },
    },
    submit: {
      pageTitle: "Submit progress to MHCLG",
      heading: "Submit progress to MHCLG",
      intro:
        "Record the submission details and whether the council or the assurer made the submission.",
      completeHeading: "Submission complete",
      completeIntro:
        "The submission record has been captured. You can return to the dashboard or start another assessment.",
      completeReturn: "Return to dashboard",
      completeStart: "Start another assessment",
      recordHeading: "Submission record",
      recordIntro: "Track the key stages of the submission and the acknowledgement from MHCLG.",
      methodLabel: "Submission method",
      methodOptions: [
        { value: "portal", text: "Upload via the submission portal" },
        { value: "email", text: "Email submission pack" },
      ],
      informedAt: "Date you informed MHCLG",
      submittedBy: "Submitted by",
      submittedAt: "Submission date",
      reference: "Submission reference",
      acknowledgedAt: "Acknowledgement date",
      acknowledgedReference: "Acknowledgement reference",
      storedAt: "Stored/archived date",
      storageLocation: "Storage location or record ID",
      reviewedAt: "Internal review date",
      reviewNotes: "Internal review notes",
      notes: "Notes",
      assurerLabel: "Did the assurer submit on your behalf?",
    },
  },

  assurer: {
    queue: {
      pageTitle: "Assurer queue",
      heading: "Independent assurance queue",
      intro: "Start assurance from completed assessments that have been sent for independent assurance, then inspect outcomes within that submitted assessment.",
      readyHeading: "Assessments in independent assurance",
      missingHeading: "Submitted assessments with evidence gaps to follow up",
      linkText: "Go to assurer queue (stub)",
    },
    outcome: {
      pageTitlePrefix: "Independent assurance review",
      headingPrefix: "Outcome review within submitted assessment",
      evidenceHeading: "Evidence references",
      historyHeading: "Change log",
      reviewHeading: "Independent assurance note",
      decisionLabel: "Decision",
      decisionOptions: [
        { value: "agree", text: "Agree with judgement" },
        { value: "upgrade", text: "Upgrade judgement" },
        { value: "downgrade", text: "Downgrade judgement" },
      ],
      rationaleLabel: "Rationale",
      saveReview: "Save assurance note",
    },
    errors: {
      decisionRequired: "Select a decision",
      rationaleRequired: "Enter a rationale",
    },
  },

  cycles: {
    start: {
      pageTitle: "Start a new cycle",
      heading: "Start a new cycle",
      intro:
        "Starting a new cycle snapshots the current cycle and creates a fresh set of progress records. This supports repeatable assessment runs.",
      continue: "Start new cycle",
      cancel: "Cancel and go back",
    },
    history: {
      pageTitle: "Cycle history",
      heading: "Cycle history",
      intro:
        "Cycles support repeatable assessment runs. Snapshots keep a read-only record of what the tracker looked like at the end of a cycle.",
      backToDashboard: "Back to current dashboard",
      viewSnapshot: "View snapshot dashboard",
      noSnapshot: "No snapshot",
      currentCycleTag: "Current",
    },
    snapshot: {
      pageTitlePrefix: "Snapshot dashboard:",
      heading: "Snapshot dashboard",
      backToHistory: "Back to cycle history",
      backToCurrent: "Back to current dashboard",
      readOnlyHint: "This is read-only. To make changes, return to the current cycle.",
    },
    fields: {
      cycleName: "Cycle name (optional)",
      carryOwners: "Carry forward owners",
      carryCollaborators: "Carry forward collaborators",
      resetStatuses: "Reset statuses to Not started",
      clearDueDates: "Clear due dates",
      keepEvidence: "Keep evidence references",
    },
    hints: {
      cycleName: "If blank, the service will name it automatically, such as Cycle 2.",
    },
    errors: {
      carryOwners: "Select whether to carry forward owners",
      carryCollaborators: "Select whether to carry forward collaborators",
      resetStatuses: "Select whether to reset statuses",
      clearDueDates: "Select whether to clear due dates",
      keepEvidence: "Select whether to keep evidence references",
    },
  },

  outcome: {
    pageTitlePrefix: "Contributing outcome",
    headingPrefix: "Contributing outcome",
    pickTitle: "Choose an outcome",
    pickIntro:
      "Choose one simpler outcome and one more complex outcome so you can work through the full journey.",
    pickSimpleTitle: "Simple outcome",
    pickHardTitle: "Hard outcome",
    save: "Save update",
    saveAndReturn: "Save and return to dashboard",
    back: "Back to dashboard",

    sections: {
      assignment: "People assigned",
      update: "Notes and updates",
      evidence: "Evidence references",
      history: "Update history",
      next: "Next step (stub)",
    },

    fields: {
      owner: "Owner",
      collaborators: "Other contributors",
      status: "Progress status",
      dueDate: "Due date",
      updateText: "Latest update",
      blocker: "Blocker or dependency",
      nextStep: "Next step",
      evidenceTitle: "Evidence title",
      evidenceType: "Evidence type (optional)",
      evidenceLink: "Evidence link",
      evidenceDescription: "Description",
    },

    hints: {
      updateText: "Capture the latest notes, decisions, or activity for this outcome.",
      blocker: "Required if the status is Not started or Blocked.",
      nextStep: "The next concrete action to move this outcome forward.",
      evidence:
        "Add links to evidence stored outside WebCAF, such as SharePoint files or architecture diagrams. Describe what each item shows and why it is relevant. Assurers will need access to the linked evidence.",
    },

    actions: {
      addEvidence: "Add another evidence reference",
      removeEvidence: "Remove",
      openSelfAssess: "Open self-assessment for this outcome",
    },
  },

  errors: {
    evidenceRules: "Select yes if you have agreed evidence referencing rules with the assurer",
    chooseAssessment: "Select which assessment you want to start now",
    criticalSystemName: "Enter the name of the critical system",
    evidenceRequired: "Add at least one evidence reference with a title, link and description",
    ownerRequired: "Select an owner",
    statusRequired: "Select a progress status",
    updateRequired: "Enter an update",
    blockerRequired: "Enter a blocker or dependency to explain why work cannot progress",
  },
};
