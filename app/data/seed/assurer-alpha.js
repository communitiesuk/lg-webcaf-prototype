function buildAssurerAlphaSeed() {
  return {
    assumptions: [
      "The assurer reviews one completed CAF submission from a council, covering organisation outcomes, critical systems outcomes and evidence references.",
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
          criticalSystemsComplete: true,
          iipIncluded: false,
          criticalSystemsAssessed: 1,
          contributingOutcomesCompleted: 2,
          evidenceReferencesIncluded: 4,
        },
        contributingOutcomeCount: 2,
        outcomesNeedingAttention: 1,
        iipStatus: "Not yet submitted",
        summary:
          "This submission covers critical systems outcomes for the payments platform, with evidence references for each outcome.",
        outcomes: [
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
            assurerReview: {
              decision: "judgement_may_need_changing",
              rationale:
                "The council's judgement of Achieved is not supported by the evidence. Legacy contracts have not been brought onto the standard security schedule, and the tracker shows partial coverage only. Achieved implies comprehensive coverage — this submission does not demonstrate that.",
              nextAction: "Issue raised. Council should either revise the judgement or provide evidence that legacy contracts are sufficiently covered.",
              alignmentDecision: "consistent_with_organisation_assessment",
              alignmentExplanation:
                "Consistent with the cross-cutting signal about uneven control maturity and supplier assurance depending on local workarounds.",
              status: "challenged",
              statusLabel: "Judgement may need changing",
              statusTagClass: "govuk-tag--red",
              reviewedAt: "14 April 2026",
            },
            issue: {
              categories: ["supply chain"],
              detail:
                "Legacy supplier contracts have not been brought onto the standard security schedule. The evidence shows partial coverage, which does not support a judgement of Achieved.",
              actionRequested:
                "Extend the standard security schedule to legacy contracts for the payments platform and update the tracker to reflect full coverage, or revise the judgement to Partially achieved.",
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
            assurerReview: {
              decision: "agree_judgement",
              rationale:
                "Partially achieved is the right call. The playbook and dependency map are in place. The absence of a completed recovery exercise is clearly acknowledged and the judgement reflects this accurately.",
              nextAction: "No further action needed. The council should complete a recovery exercise in the next cycle.",
              alignmentDecision: "consistent_with_organisation_assessment",
              alignmentExplanation:
                "No cross-cutting concerns for this outcome — the evidence and rationale are self-consistent.",
              status: "agreed",
              statusLabel: "Agree with council judgement",
              statusTagClass: "govuk-tag--green",
              reviewedAt: "14 April 2026",
            },
            issue: null,
          },
        ],
        iip: {
          status: "Submitted",
          owner: "Morgan Ellis, CAF lead",
          submittedAt: "23 April 2026",
          lastUpdated: "23 April 2026",
          priorities: [
            {
              title: "Extend standard security schedule to legacy supplier contracts",
              timescale: "By July 2026",
              owner: "Head of ICT operations",
              relatedOutcomes: ["B2"],
              successMeasure: "All priority legacy contracts include security requirements aligned to the standard schedule, and the supplier tracker reflects full coverage.",
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
        summary: "A CAF submission covering critical systems outcomes, currently being reviewed.",
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
