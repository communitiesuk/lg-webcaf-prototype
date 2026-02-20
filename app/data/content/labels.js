// app/data/content/labels.js
// Centralised copy/labels (adds export copy label)

module.exports = {
  serviceName: "WebCAF for Local Government",

  entry: {
    pageTitle: "CAF for Local Government",
    heading: "CAF for Local Government",
    intro:
      "Plan, run and submit your CAF self-assessment with clear ownership, evidence references and assurance.",
    actions: {
      startNew: "Start CAF journey",
      resume: "Continue in-progress work",
    },
    scopeLink: "Go to scope pack",
    resumeHint:
      "Resume takes you to the most recently updated outcome assigned to you. If none, it opens your dashboard view.",
    nextSteps: [
      "Complete the scope pack (essential services, critical systems and mapping)",
      "Confirm the scope pack with CAF lead internal sign-off and share it with your assurer",
      "Start self-assessment once the scope pack is complete",
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
      "Use this service to plan, run and submit your CAF self-assessment for local government. Preparation happens offline before you build the scope pack.",
    startButton: "Start now",
    beforeYouStart: [
      "Agree who owns the assessment and who needs to contribute",
      "Collect evidence references (IDs or links) — do not upload evidence",
      "Decide which critical systems will be assessed for Objectives B and C",
    ],
    youWillNeed: {
      intro: "You will need:",
      items: [
        "a list of contributing outcomes for your profile target level",
        "owners and collaborators for each outcome",
        "evidence reference IDs or links for each outcome",
        "an assurer contact for review and submission",
      ],
    },
    details: {
      heading: "About CAF and evidence references",
      caf:
        "The Cyber Assessment Framework (CAF) sets outcomes and indicators of good practice (IGPs) used to assess maturity.",
      evidence:
        "This service captures references to evidence stored elsewhere. Keep evidence in your own systems and record IDs or links here.",
    },
  },
  signIn: {
    pageTitle: "Switch user",
    heading: "Switch user",
    intro: "Select a user profile to view the prototype as that role.",
    prototypeNote:
      "Prototype only: this switches the active user role for testing.",
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
      prototypeNote: "This is a prototype. You will not upload evidence here.",
      structure: {
        objectives: {
          title: "Objectives",
          text: "4 objectives define what good cyber resilience looks like.",
        },
        principles: {
          title: "Principles",
          text: "14 principles break each objective into areas to assess.",
        },
        outcomes: {
          title: "Contributing outcomes",
          text: "You work outcome-by-outcome to capture progress and judgement.",
        },
        igps: {
          title: "Indicators of good practice (IGPs)",
          text: "IGPs guide evidence gathering and help inform judgement.",
        },
      },
      lens: {
        ad: {
          title: "Organisation self-assessment (Objectives A & D)",
          text: "Governance, risk, incident response and recovery across the council.",
        },
        bc: {
          title: "Critical-systems self-assessment (Objectives B & C)",
          text: "Technical and operational controls for each priority system.",
        },
      },
      profileDetails: {
        heading: "What is the local government CAF profile?",
        text:
          "The local government profile is a tailored subset of CAF outcomes set by MHCLG. It defines the baseline outcomes councils are assessed against.",
      },
      evidenceDetails: {
        heading: "What counts as evidence references?",
        text:
          "You will record evidence reference IDs or links to documents held elsewhere. Evidence is not stored in this service.",
      },
      whoHeading: "Who you will likely need involved",
      whoList: [
        "CAF lead and approver",
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
      intro: "Choose which self-assessment you want to start now.",
      question: "What do you want to do next?",
      options: {
        stage3: "Self-assess your organisation (Objectives A & D) — Stage 3",
        stage4: "Self-assess critical systems (Objectives B & C) — Stage 4",
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
        title: "Scope pack",
        intro:
          "Build the registers, map systems to services, confirm at least 3 in-scope critical systems, then complete the scope pack.",
        continue: "Continue scope pack",
        completeContinue: "Scope pack complete",
        statusHeading: "Scope pack status",
        statusHint: "Use this to record if the scope pack is stalled and why.",
        statusOptions: {
          onTrack: "On track",
          stalled: "Stalled",
        },
        blockerLabel: "What is blocking progress?",
        blockerHint: "Keep this short so engagement managers can act quickly.",
        blockerNotesLabel: "Notes (optional)",
        rolesHeading: "Who is involved in the CAF work",
        rolesHint: "Name the people or teams who will help complete the assessment.",
        rolesLeadLabel: "CAF lead or assessment owner",
        rolesSmeLabel: "Subject matter experts (governance, risk, legal, procurement)",
        rolesTechLabel: "System and technical owners",
        rolesApproverLabel: "Approver or senior sign-off",
        rolesConfirmLabel: "I have confirmed the team who will complete the CAF work",
        leadConfirmLabel: "CAF lead has reviewed and signed off the scope pack internally",
        assurerReviewLabel: "I have shared the scope pack with the assurer for review",
      },
      services: {
        addTitle: "Essential services register",
        reviewTitle: "Review essential services",
        confirmTitle: "Confirm essential services in scope",
        addButton: "Add service",
        continueButton: "Continue to critical systems",
      },
      systems: {
        addTitle: "Critical systems register",
        reviewTitle: "Review critical systems",
        addButton: "Add system",
        continueButton: "Continue to mapping",
      },
      mapping: {
        title: "Map systems to essential services",
        reviewTitle: "Review system mappings",
      },
      priority: {
        title: "Prioritise critical systems",
        shortlistTitle: "Select priority critical systems to assess",
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
        scopePackStatus: "Select the scope pack status",
        scopeBlockerReason: "Select a blocker reason",
        scopeRolesConfirm: "Confirm the team who will complete the CAF work",
        scopeLeadConfirm: "Confirm the CAF lead has signed off the scope pack internally",
        scopeAssurerReview: "Confirm the scope pack has been shared with the assurer for review",
        shortlistMinimum: "Add and prioritise at least 3 critical systems before continuing",
      },
    },
  },

  dashboard: {
    pageTitle: "Progress tracker dashboard",
    heading: "Progress tracker dashboard",
    hint:
      "Assign owners, track status, set due dates, and capture notes for each contributing outcome.",
    resumeHint:
      "Resume takes you to the most recently updated outcome assigned to you.",
    evidenceHint:
      "Evidence here is working references. Record the formal evidence set in the self-assessment outcome.",
    lensNotice:
      "This dashboard combines organisation (A & D) outcomes and critical systems (B & C). Use filters to focus.",
    pickOutcome: "Pick an outcome to test",
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
        awareness: "I am aware of the CAF and why we are completing it",
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
      pageTitle: "Profile targets",
      heading: "Profile targets",
      intro:
        "Use the profile to see the outcomes included in this assessment and the target level the council should aim for.",
      switchLink: "Switch assessment lens",
      reviewedYes: "I have reviewed the profile targets",
      reviewedNo: "I will review these later",
    },
    selfAssessAD: {
      pageTitle: "Self-assess the organisation (Objectives A & D)",
      heading: "Self-assess the organisation (Objectives A & D)",
      intro: "Complete each contributing outcome with IGP responses, evidence references and a judgement.",
      outcomeHeading: "Outcome",
    },
    selfAssessBC: {
      pageTitle: "Self-assess critical systems (Objectives B & C)",
      heading: "Self-assess critical systems (Objectives B & C)",
      intro:
        "Assess each priority critical system against Objectives B and C, capturing IGP responses, evidence and judgements.",
      selectHeading: "Pick a system to assess",
      selectIntro:
        "Only shortlisted systems appear here. Add or update priorities in the scope pack if you need to change the list.",
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
      igpHint: "Summarise the IGP responses for this outcome. Keep it factual.",
      judgement: "Overall judgement",
      judgementOptions: [
        { value: "Achieved", text: "Met" },
        { value: "Not achieved", text: "Not met" },
      ],
      rationale: "Reasons for judgement",
      evidenceHeading: "Evidence references",
      evidenceHint:
        "Add reference IDs or links only. If you have working references in the progress tracker, copy them here for the judgement record.",
      progressLink: "View progress tracker record",
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
      pageTitle: "Assurance review",
      heading: "Assurance review",
      intro: "Capture assurer feedback and whether changes are needed before submission.",
      statusLabel: "Assurance status",
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
        pageTitle: "Review improvement plan",
        heading: "Review improvement plan",
        intro: "Confirm the final action list before assurer sign-off.",
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
      heading: "Assurer queue",
      intro: "Review outcomes that are ready or blocked by missing evidence references.",
      readyHeading: "Ready for review",
      missingHeading: "Blocked by missing evidence references",
      linkText: "Go to assurer queue (stub)",
    },
    outcome: {
      pageTitlePrefix: "Assurer review",
      headingPrefix: "Outcome",
      evidenceHeading: "Evidence references",
      historyHeading: "Change log",
      reviewHeading: "Assurer decision",
      decisionLabel: "Decision",
      decisionOptions: [
        { value: "agree", text: "Agree with judgement" },
        { value: "upgrade", text: "Upgrade judgement" },
        { value: "downgrade", text: "Downgrade judgement" },
      ],
      rationaleLabel: "Rationale",
      saveReview: "Save review",
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
      cycleName: "If blank, the prototype will name it automatically (for example, Cycle 2).",
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
    pickTitle: "Pick an outcome to test",
    pickIntro:
      "Choose one simple outcome and one hard outcome so you can test the end-to-end flow.",
    pickSimpleTitle: "Simple outcome",
    pickHardTitle: "Hard outcome",
    save: "Save update",
    saveAndReturn: "Save and return to dashboard",
    back: "Back to dashboard",

    sections: {
      assignment: "Assignment",
      update: "Notes and updates",
      evidence: "Evidence references",
      history: "Update history",
      next: "Next step (stub)",
    },

    fields: {
      owner: "Assigned owner",
      collaborators: "Additional collaborators",
      status: "Progress status",
      dueDate: "Due date",
      updateText: "Use this box to record notes or decisions",
      blocker: "Blocker or dependency",
      nextStep: "Next step",
      evidenceRefId: "Reference ID",
      evidenceType: "Type",
      evidenceLink: "Link (optional)",
      evidenceNote: "Note (optional)",
    },

    hints: {
      updateText: "Capture the latest notes, decisions, or activity for this outcome.",
      blocker: "Required if status is Not started or Blocked.",
      nextStep: "The next concrete action to move this outcome forward.",
      evidence:
        "Add reference IDs or links only. Do not paste evidence content into the prototype. Record formal evidence for judgement in the self-assessment.",
    },

    actions: {
      addEvidence: "Add another reference",
      removeEvidence: "Remove",
      openSelfAssess: "Open self-assessment for this outcome",
    },
  },

  errors: {
    evidenceRules: "Select yes if you have agreed evidence referencing rules with the assurer",
    chooseAssessment: "Select which assessment you want to start now",
    criticalSystemName: "Enter the name of the critical system",
    evidenceRequired: "Add at least one evidence reference (ID or link)",
    ownerRequired: "Select an owner",
    statusRequired: "Select a progress status",
    updateRequired: "Enter an update",
    blockerRequired: "Enter a blocker or dependency to explain why work cannot progress",
  },
};
