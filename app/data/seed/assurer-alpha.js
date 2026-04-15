function buildAssurerAlphaSeed() {
  return {
    assumptions: [
      "The assurer reviews one completed CAF submission from a council, covering organisation outcomes, critical systems outcomes, evidence references and the IIP.",
      "Structured review decisions are included to test whether they make assurance more consistent across councils and assurers.",
      "Evidence is shown as references and links for alpha research. This prototype does not model document upload or access control.",
      "This route explores an optional model where the assurer can complete final submission to MHCLG, but it is clearly marked as an alpha assumption.",
    ],
    assessments: [
      {
        id: "west-marchshire-2026",
        councilName: "West Marchshire Council",
        assessmentType: "CAF assessment submission",
        cycleLabel: "2026 annual submission",
        submittedAt: "9 April 2026",
        reviewDueAt: "15 April 2026",
        dueState: "Due in 2 days",
        overallStatus: "Ready for assurance",
        statusTagClass: "govuk-tag--blue",
        submittedBy: "Morgan Ellis, CAF lead",
        assignedAssurer: "NorthStar Assurance",
        submissionSummary: {
          organisationComplete: true,
          criticalSystemsComplete: true,
          iipIncluded: true,
          criticalSystemsAssessed: 2,
          contributingOutcomesCompleted: 7,
          evidenceReferencesIncluded: 10,
        },
        contributingOutcomeCount: 7,
        outcomesNeedingAttention: 4,
        iipStatus: "Included",
        summary:
          "This submission includes organisation outcomes for Objectives A and D, critical systems outcomes for Objectives B and C, evidence references and a draft improvement and implementation plan.",
        crossCuttingSignals: [
          "Organisation-level evidence points to improving governance and risk management, but accountability is still being embedded.",
          "Multiple critical systems outcomes suggest uneven control maturity where supplier assurance and monitoring depend on local workarounds.",
          "System-level monitoring and supplier oversight appear weaker than the organisation-level story would suggest.",
        ],
        organisationContext:
          "The council assessed governance and risk management as improving but not yet fully embedded. As you review critical systems, check whether local controls, supplier oversight and monitoring reflect that organisation-level position.",
        outcomes: [
          {
            id: "a1-governance-oversight",
            lens: "ad",
            code: "A1",
            title: "Governance and oversight",
            description:
              "Senior leaders should have clear oversight of cyber risk, receive timely reporting and use it to make decisions.",
            councilJudgement: "Partially achieved",
            councilRationale:
              "Corporate leadership now receives a quarterly cyber risk report and the risk committee reviews movement in the top five issues. Directorates use the same reporting template, but escalation thresholds are not yet applied consistently in every service.",
            igpSignals: [
              "Board and committee reporting is in place and happens quarterly.",
              "A single reporting template is being used across directorates.",
              "Escalation thresholds are still being embedded in service-level practice.",
            ],
            evidenceReferences: [
              {
                title: "Corporate cyber risk report template",
                reference: "WM-AD-A1-001",
                href: "https://example.gov.uk/west-marchshire/cyber-risk-report-template",
                note: "Template used for quarterly leadership reporting.",
              },
              {
                title: "Risk committee minutes, January and March 2026",
                reference: "WM-AD-A1-002",
                href: "https://example.gov.uk/west-marchshire/risk-committee-minutes",
                note: "Minutes showing discussion of cyber risk decisions.",
              },
            ],
            reviewPromptLabel: "Rationale and evidence look complete",
            reviewPromptHint:
              "Use this as a straightforward example to sense-check the council judgement.",
            reviewPromptTagClass: "govuk-tag--green",
            assurerReview: {
              decision: "agree_judgement",
              rationale:
                "The rationale is clear and the evidence references support a partially achieved judgement.",
              nextAction: "No further action needed before sign-off.",
              alignmentDecision: "consistent_with_organisation_assessment",
              alignmentExplanation:
                "This outcome is consistent with the broader organisation-level picture of governance maturing but not yet embedded everywhere.",
              status: "agreed",
              statusLabel: "Agree with council judgement",
              statusTagClass: "govuk-tag--green",
              reviewedAt: "11 April 2026",
            },
            issue: null,
          },
          {
            id: "a2-roles-responsibilities",
            lens: "ad",
            code: "A2",
            title: "Roles and responsibilities",
            description:
              "Roles for cyber risk, decision making and operational delivery should be clear across corporate teams, services and suppliers.",
            councilJudgement: "Partially achieved",
            councilRationale:
              "Named leads exist across ICT, procurement and service teams. Handoffs are improving and the council intends to confirm accountability in the next quarter.",
            igpSignals: [
              "Named leads are listed for ICT, procurement and service ownership.",
              "The handoff between teams is described inconsistently in workshop notes.",
              "The accountability map is still in draft and not yet signed off.",
            ],
            evidenceReferences: [
              {
                title: "Draft cyber accountability map",
                reference: "WM-AD-A2-001",
                href: "https://example.gov.uk/west-marchshire/accountability-map",
                note: "Working draft showing planned ownership model.",
              },
              {
                title: "Procurement and ICT operating note",
                reference: "WM-AD-A2-002",
                href: "https://example.gov.uk/west-marchshire/procurement-ict-note",
                note: "Describes how teams currently hand off supplier issues.",
              },
            ],
            reviewPromptLabel: "Rationale unclear",
            reviewPromptHint:
              "Check whether the rationale explains how roles work in practice, not just who is named.",
            reviewPromptTagClass: "govuk-tag--yellow",
            assurerReview: null,
            issue: {
              categories: [],
              detail: "",
              actionRequested: "",
            },
          },
          {
            id: "d1-risk-management",
            lens: "ad",
            code: "D1",
            title: "Risk management",
            description:
              "The council should identify, track and act on cyber risks consistently across the organisation.",
            councilJudgement: "Partially achieved",
            councilRationale:
              "The council says high-level risks are understood and reviewed by leadership, but service evidence is still being pulled together.",
            igpSignals: [
              "Corporate cyber risks are listed in the main risk register.",
              "Service-level risk treatment activity is referenced but not clearly evidenced.",
              "The rationale refers to local registers that are not linked in this submission.",
            ],
            evidenceReferences: [
              {
                title: "Corporate risk register extract",
                reference: "WM-AD-D1-001",
                href: "https://example.gov.uk/west-marchshire/corporate-risk-register",
                note: "Extract covering the main cyber and resilience risks.",
              },
            ],
            reviewPromptLabel: "Evidence missing",
            reviewPromptHint:
              "Check whether service-level risk evidence is referenced clearly enough to support the judgement.",
            reviewPromptTagClass: "govuk-tag--red",
            assurerReview: null,
            issue: {
              categories: [],
              detail: "",
              actionRequested: "",
            },
          },
          {
            id: "b1-social-care-policy",
            lens: "bc",
            systemName: "Adult social care case management",
            code: "B1",
            title: "Policy, process and procedure development",
            description:
              "Controls for the critical system should be supported by clear policy and operating procedures.",
            councilJudgement: "Partially achieved",
            councilRationale:
              "The council has a protection policy and operational process for the case management system, but supplier evidence is still referenced indirectly.",
            igpSignals: [
              "Service protection policy is in place.",
              "Operational procedures are documented locally.",
              "Supplier evidence is referenced but not fully explained.",
            ],
            evidenceReferences: [
              {
                title: "Service protection policy",
                reference: "WM-BC-B1-001",
                href: "https://example.gov.uk/west-marchshire/service-protection-policy",
                note: "Current policy governing protective controls for the system.",
              },
              {
                title: "Supplier assurance statement",
                reference: "WM-BC-B1-002",
                href: "https://example.gov.uk/west-marchshire/supplier-assurance-statement",
                note: "Referenced supplier statement used to support the judgement.",
              },
            ],
            reviewPromptLabel: "Evidence mostly complete",
            reviewPromptHint:
              "Check whether the supplier evidence is specific enough to support the council judgement.",
            reviewPromptTagClass: "govuk-tag--turquoise",
            assurerReview: null,
            issue: {
              categories: [],
              detail: "",
              actionRequested: "",
            },
          },
          {
            id: "c1-social-care-detection",
            lens: "bc",
            systemName: "Adult social care case management",
            code: "C1",
            title: "Monitoring and detection",
            description:
              "The council should be able to detect and investigate suspicious activity affecting the critical system.",
            councilJudgement: "Partially achieved",
            councilRationale:
              "Central monitoring is in place, but the council still relies on the supplier for some alert triage and evidence is split across teams.",
            igpSignals: [
              "Monitoring is enabled for core services.",
              "Alert triage between council and supplier is not yet fully defined.",
              "Incident evidence is referenced across different sources.",
            ],
            evidenceReferences: [
              {
                title: "Monitoring operations note",
                reference: "WM-BC-C1-001",
                href: "https://example.gov.uk/west-marchshire/monitoring-operations-note",
                note: "Explains current monitoring responsibilities for the system.",
              },
            ],
            reviewPromptLabel: "Rationale unclear",
            reviewPromptHint:
              "Check whether monitoring responsibilities and alert triage are explained clearly enough.",
            reviewPromptTagClass: "govuk-tag--yellow",
            assurerReview: null,
            issue: {
              categories: [],
              detail: "",
              actionRequested: "",
            },
          },
          {
            id: "b2-payments-supply-chain",
            lens: "bc",
            systemName: "Payments platform",
            code: "B2",
            title: "Supply chain and external dependencies",
            description:
              "The council should understand and manage third-party cyber risks affecting the critical system.",
            councilJudgement: "Achieved",
            councilRationale:
              "Supplier due diligence is carried out before contract award and the council has started to use a standard security schedule for major procurements. Most high-risk suppliers are now covered.",
            igpSignals: [
              "A standard security schedule is in use for new procurements.",
              "Legacy contracts have not yet been brought onto the same assurance approach.",
              "Evidence points to partial coverage rather than complete coverage.",
            ],
            evidenceReferences: [
              {
                title: "Standard security schedule for procurements",
                reference: "WM-BC-B2-001",
                href: "https://example.gov.uk/west-marchshire/security-schedule",
                note: "Template schedule used in current procurement work.",
              },
              {
                title: "Supplier assurance tracker",
                reference: "WM-BC-B2-002",
                href: "https://example.gov.uk/west-marchshire/supplier-assurance-tracker",
                note: "Tracker showing which priority suppliers have been reviewed.",
              },
            ],
            reviewPromptLabel: "Evidence mostly complete",
            reviewPromptHint:
              "Check whether the submission covers legacy suppliers as well as new procurements.",
            reviewPromptTagClass: "govuk-tag--turquoise",
            assurerReview: null,
            issue: {
              categories: [],
              detail: "",
              actionRequested: "",
            },
          },
          {
            id: "c2-payments-response",
            lens: "bc",
            systemName: "Payments platform",
            code: "C2",
            title: "Response and recovery",
            description:
              "The council should be able to respond to disruption and recover the critical system in a controlled way.",
            councilJudgement: "Partially achieved",
            councilRationale:
              "Response playbooks exist for high-level incidents, but a full service recovery exercise for the payments platform has not yet been completed.",
            igpSignals: [
              "High-level response playbooks exist.",
              "Recovery dependencies have been identified.",
              "A full recovery exercise has not been evidenced.",
            ],
            evidenceReferences: [
              {
                title: "Payments incident playbook",
                reference: "WM-BC-C2-001",
                href: "https://example.gov.uk/west-marchshire/payments-incident-playbook",
                note: "Playbook for major incidents affecting the platform.",
              },
              {
                title: "Recovery dependency map",
                reference: "WM-BC-C2-002",
                href: "https://example.gov.uk/west-marchshire/recovery-dependency-map",
                note: "Shows upstream and downstream service dependencies.",
              },
            ],
            reviewPromptLabel: "Rationale and evidence look complete",
            reviewPromptHint:
              "Use this as a stronger system example and sense-check whether the judgement is proportionate.",
            reviewPromptTagClass: "govuk-tag--green",
            assurerReview: null,
            issue: {
              categories: [],
              detail: "",
              actionRequested: "",
            },
          },
        ],
        iip: {
          status: "Included",
          owner: "Morgan Ellis, CAF lead",
          lastUpdated: "8 April 2026",
          summary:
            "The council has provided a short improvement and implementation plan covering organisation-wide actions and critical systems actions.",
          priorities: [
            {
              title: "Embed one reporting model across all directorates",
              timescale: "By July 2026",
              owner: "Corporate governance lead",
              relatedOutcomes: ["A1", "A2"],
              successMeasure: "All directorates use the same reporting template and escalation thresholds.",
            },
            {
              title: "Clarify supplier monitoring and assurance for critical systems",
              timescale: "By August 2026",
              owner: "Head of ICT operations",
              relatedOutcomes: ["B1", "C1", "B2"],
              successMeasure: "Council and supplier responsibilities are clear for monitoring, assurance and escalation.",
            },
            {
              title: "Complete a recovery exercise for the payments platform",
              timescale: "By September 2026",
              owner: "Service resilience lead",
              relatedOutcomes: ["C2"],
              successMeasure: "Recovery exercise completed with actions recorded and owned.",
            },
          ],
          assurerReview: null,
        },
        submission: {
          routeLabel: "Assurer may submit the full submission to MHCLG",
          exploredOption: true,
          status: "Not started",
          submittedBy: "",
          submittedAt: "",
        },
        assuranceComplete: false,
        completedAt: "",
      },
      {
        id: "northborough-2026",
        councilName: "Northborough Council",
        assessmentType: "CAF assessment submission",
        cycleLabel: "2026 annual submission",
        submittedAt: "5 April 2026",
        reviewDueAt: "13 April 2026",
        dueState: "Due today",
        overallStatus: "In review",
        statusTagClass: "govuk-tag--yellow",
        submittedBy: "Helen Ward, CAF lead",
        assignedAssurer: "NorthStar Assurance",
        submissionSummary: {
          organisationComplete: true,
          criticalSystemsComplete: true,
          iipIncluded: true,
          criticalSystemsAssessed: 1,
          contributingOutcomesCompleted: 5,
          evidenceReferencesIncluded: 7,
        },
        contributingOutcomeCount: 5,
        outcomesNeedingAttention: 1,
        iipStatus: "Included",
        summary: "A full CAF submission currently being reviewed.",
        crossCuttingSignals: [
          "Organisation narrative and system-level controls appear broadly aligned so far.",
        ],
        organisationContext:
          "Use the organisation-level judgements to sense-check whether critical systems are showing the same level of maturity.",
        outcomes: [],
        iip: {
          status: "Included",
          owner: "Helen Ward",
          lastUpdated: "5 April 2026",
          summary: "",
          priorities: [],
          assurerReview: null,
        },
        submission: {
          routeLabel: "Council submits the full submission after assurance",
          exploredOption: false,
          status: "Not started",
          submittedBy: "",
          submittedAt: "",
        },
        assuranceComplete: false,
        completedAt: "",
      },
      {
        id: "south-barset-2026",
        councilName: "South Barset Council",
        assessmentType: "CAF assessment submission",
        cycleLabel: "2026 annual submission",
        submittedAt: "2 April 2026",
        reviewDueAt: "9 April 2026",
        dueState: "Returned 5 days ago",
        overallStatus: "Returned to council",
        statusTagClass: "govuk-tag--green",
        submittedBy: "Priya Shah, CAF lead",
        assignedAssurer: "NorthStar Assurance",
        submissionSummary: {
          organisationComplete: true,
          criticalSystemsComplete: true,
          iipIncluded: true,
          criticalSystemsAssessed: 2,
          contributingOutcomesCompleted: 6,
          evidenceReferencesIncluded: 9,
        },
        contributingOutcomeCount: 6,
        outcomesNeedingAttention: 2,
        iipStatus: "Included",
        summary: "This example shows a full CAF submission already returned to the council.",
        crossCuttingSignals: [
          "Earlier assurance found that the organisation-level story was stronger than the system evidence.",
        ],
        organisationContext:
          "Critical systems evidence should support the organisation-level claims made elsewhere in the submission.",
        outcomes: [],
        iip: {
          status: "Included",
          owner: "Priya Shah",
          lastUpdated: "7 April 2026",
          summary: "",
          priorities: [],
          assurerReview: {
            decision: "request_changes",
            rationale: "Priority actions did not clearly map to the challenged outcomes.",
            reviewedAt: "9 April 2026",
          },
        },
        submission: {
          routeLabel: "Council submits the full submission after changes",
          exploredOption: false,
          status: "On hold",
          submittedBy: "",
          submittedAt: "",
        },
        assuranceComplete: true,
        completedAt: "9 April 2026",
      },
    ],
    activeAssessmentId: "west-marchshire-2026",
  };
}

module.exports = {
  buildAssurerAlphaSeed,
};
