// app/routes/assessments.js
// Dashboard/Hub + Outcome progress record (structured updates + evidence refs + history)

const labels = require("../data/content/labels");
const statuses = require("../data/content/statuses");
const users = require("../data/seed/users");
const { CAF_CURRENT_VERSION, getOutcomesForVersion } = require("../data/helpers/caf-version");
const {
  buildPhaseProgress,
  buildRoundTwoSetupProgress,
  hasRoundTwoScopeSummaryComplete,
  isRoundTwoOnboardingComplete,
} = require("../data/helpers/phase-progress");

const {
  requireSignedIn,
  ensureAssessment,
  getAssessmentOrRedirect,
} = require("../data/helpers/session");

const {
  buildInitialProgressTracker,
  applyDashboardFilters,
  deriveRowFlags,
  normaliseQuery,
  formatDateForInput,
  buildQueryString,
  computeSummary,
} = require("../data/helpers/progress");
const { ensureCycleExists } = require("../data/helpers/cycles");

const {
  coerceArray,
  normaliseEvidenceRefs,
  blankEvidenceRef,
  ensureAtLeastOneEvidenceRow,
} = require("../data/helpers/outcome");
const {
  PERMISSIONS,
  getActiveRole,
  getRoleLabel,
  userHasPermission,
} = require("../data/helpers/roles");
const { getAssurerAccessContext } = require("../data/helpers/assurer-access");

const PROTOTYPE_OUTCOME_LIMITS = {
  AD: 12,
  BC: 25,
};
const PROTOTYPE_BC_SYSTEM_LIMIT = Number.POSITIVE_INFINITY;
const B2A_SELF_ASSESS_HREF = (systemId) =>
  `/self-assess/bc/${encodeURIComponent(systemId)}/outcomes/B2a/b2a-achieved`;

module.exports = function (router) {
  router.use("/assessments", (req, res, next) => {
    if (!requireSignedIn(req, res)) return;
    if (!ensureAssessment(req)) return res.redirect("/entry");
    const allowPreOnboardingRoutes =
      req.path === "/current/journey" ||
      req.path === "/current/review-scope" ||
      req.path.startsWith("/current/annual-setup");
    if (
      isRoundTwoRequest(req) &&
      !isRoundTwoOnboardingComplete(req.session.data.assessment) &&
      !allowPreOnboardingRoutes
    ) {
      return res.redirect("/onboarding");
    }
    next();
  });

  // PICK OUTCOME TO TEST (alpha shortcut)
  router.get("/assessments/current/pick-outcome", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    if (!assessment.progressTracker || Object.keys(assessment.progressTracker).length === 0) {
      const { ad } = getOutcomesForVersion(assessment);
      assessment.progressTracker = buildInitialProgressTracker({
        outcomesTree: ad,
        users,
      });
      const prototypeAdIds = flattenOutcomes(ad).map((outcome) => outcome.id);
      assessment.progressTracker = filterProgressTrackerByOutcomeIds(
        assessment.progressTracker,
        prototypeAdIds
      );
      assessment.updatedAt = new Date().toISOString();
    }

    const simpleId = "A1b";
    const hardId = "A1a";

    const simple = assessment.progressTracker[simpleId];
    const hard = assessment.progressTracker[hardId];

    const simpleOwnerName = simple ? getUserName(users, simple.ownerId) : "";
    const hardOwnerName = hard ? getUserName(users, hard.ownerId) : "";

    return res.render("pages/assessments/pick-outcome", {
      pageTitle: labels.outcome.pickTitle,
      labels,
      assessment,
      simple: simple
        ? {
            ...simple,
            statusMeta: getStatusMeta(statuses, simple.status),
            ownerName: simpleOwnerName,
            collaboratorCount: Array.isArray(simple.collaboratorIds)
              ? simple.collaboratorIds.length
              : 0,
            evidenceCount: Array.isArray(simple.evidenceRefs) ? simple.evidenceRefs.length : 0,
          }
        : null,
      hard: hard
        ? {
            ...hard,
            statusMeta: getStatusMeta(statuses, hard.status),
            ownerName: hardOwnerName,
            collaboratorCount: Array.isArray(hard.collaboratorIds)
              ? hard.collaboratorIds.length
              : 0,
          }
        : null,
    });
  });

  // MASTER JOURNEY TASK LIST
  router.get("/assessments/current/journey", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureProgressTrackerForStart(assessment);
    ensureAssuranceStageData(assessment);
    const roundTwo = isRoundTwoRequest(req);
    if (roundTwo) {
      ensureAnnualSetupData(assessment);
      ensureSectionReviewData(assessment);
      ensureCollaborationWorkflowData(assessment, req.session.data.user || null);
      ensureAssessmentDates(assessment);
    }
    const { ad, bc } = getOutcomesForVersion(assessment);
    const prepareSummary = buildPrepareJourneySummary(assessment, { roundTwo });
    const scopeSummary = buildScopeJourneySummary(assessment, { roundTwo });
    const annualSetupSummary = roundTwo
      ? buildAnnualSetupSummary(assessment, req.session.data.user || null)
      : null;
    const currentUser = req.session.data.user || null;
    const canEdit = userHasPermission(currentUser, PERMISSIONS.EDIT_CONTENT);
    const whoInvolvedSummary = buildWhoInvolvedSummary(assessment, req.session.data.user || null);
    const annualSetupComplete = roundTwo ? annualSetupSummary.statusText === "Complete" : false;
    const whoInvolvedComplete = roundTwo ? false : whoInvolvedSummary.statusText === "Complete";
    const selfAssessStartSummary = buildSelfAssessStartSummary(assessment);
    const selfAssessStartReady = roundTwo ? annualSetupComplete : whoInvolvedComplete;
    const selfAssessStartComplete = roundTwo
      ? annualSetupComplete
      : selfAssessStartSummary.statusText === "Complete";
    const iipSummary = buildIIPJourneySummary(assessment, { roundTwo });
    const internalSignOffSummary = buildInternalSignOffSummary(assessment);
    const submitAssurerSummary = buildSubmitAssurerSummary(assessment);
    const adLensSummary = buildADJourneySummary(assessment, ad, { roundTwo });
    const bcLensSummary = buildBCJourneySummary(assessment, bc, { roundTwo });
    const completeSelfAssessmentSummary = roundTwo
      ? buildCompleteSelfAssessmentSummary(assessment)
      : null;
    const adHasActiveData = ["In progress", "Complete", "Needs review", "Carried forward"].includes(adLensSummary.statusText);
    const adLocked = !selfAssessStartComplete && !adHasActiveData;
    const adApproach = assessment.annualSetup && assessment.annualSetup.adApproach;
    const adTaskTitle = adApproach === "reuse_current"
      ? "Review the organisation self-assessment (Objectives A and D)"
      : adApproach === "update_existing"
      ? "Update the organisation self-assessment (Objectives A and D)"
      : "Complete the organisation self-assessment (Objectives A and D)";
    const bcLocked =
      !selfAssessStartComplete &&
      bcLensSummary.statusText !== "In progress" &&
      bcLensSummary.statusText !== "Complete";

    const roundTwoSetupSection = roundTwo
      ? {
          heading: "Before you assess",
          items: [
            journeyItem("Review your services and systems lists", buildScopeReviewSummary(assessment), {
              locked: !canEdit,
              lockedHint: "Your current role cannot update these setup lists.",
            }),
            journeyItem("Choose what to assess", annualSetupSummary, {
              locked: !canEdit,
              lockedHint: "Your current role cannot edit assessment setup.",
            }),
          ],
        }
      : null;
    const roundTwoAssessmentSection = roundTwo
      ? {
          heading: "Complete the assessment",
          body: null,
          items: [
            journeyItem(adTaskTitle, adLensSummary, {
              locked: !canEdit || adLocked,
              lockedHint: !canEdit
                ? "Your current role cannot edit the self-assessment."
                : "Complete setup first.",
            }),
            journeyItem("Complete the critical systems self-assessment (Objectives B and C)", bcLensSummary, {
              locked: !canEdit || bcLocked,
              lockedHint: !canEdit
                ? "Your current role cannot edit the self-assessment."
                : "Complete setup first.",
            }),
            journeyItem("Get internal sign-off", completeSelfAssessmentSummary, {
              locked: completeSelfAssessmentSummary.locked,
              lockedHint: "Complete the full self-assessment first.",
            }),
            journeyItem("Send to assurer", buildSendToAssurerSummary(assessment), {
              locked: buildSendToAssurerSummary(assessment).locked,
              lockedHint: "Get internal sign-off first.",
            }),
          ],
        }
      : null;
    const roundTwoPostAssuranceSection = roundTwo
      ? {
          heading: "Assurance and improvement",
          items: [
            journeyItem("Review assurance report", buildAssuranceReportJourneySummary(assessment), {
              locked: buildAssuranceReportJourneySummary(assessment).locked,
              lockedHint: "Send the self-assessment to the assurer first.",
            }),
            journeyItem("Complete your Improvement and Implementation Plan", buildRecommendationsJourneySummary(assessment), {
              locked: buildRecommendationsJourneySummary(assessment).locked,
              lockedHint: "Receive the assurance report first.",
            }),
            journeyItem("Finalise assessment record", buildFinaliseJourneySummary(assessment), {
              locked: buildFinaliseJourneySummary(assessment).locked,
              lockedHint: "Complete the assurance report and improvement plan steps first.",
            }),
          ],
        }
      : null;
    const journeySections = roundTwo
      ? []
      : [
          {
            heading: "Start and setup",
            items: [
              journeyItem("Prepare for CAF", prepareSummary, { locked: false }),
              journeyItem("Set your scope", scopeSummary, { locked: false }),
            ],
          },
          {
            heading: "Assessment work",
            items: [
              journeyItem("Who is involved", whoInvolvedSummary, { locked: false }),
              journeyItem("Readiness checks", selfAssessStartSummary, {
                locked: !selfAssessStartReady,
                lockedHint: "Complete Who is involved first.",
              }),
              journeyItem("Organisation self-assessment (Objectives A and D)", adLensSummary, {
                locked: adLocked,
                lockedHint: "Complete Readiness checks first.",
              }),
              journeyItem("Critical systems self-assessment (Objectives B and C)", bcLensSummary, {
                locked: bcLocked,
                lockedHint: "Complete Readiness checks first.",
              }),
            ],
          },
          {
            heading: "Plan and improve",
            items: [
              journeyItem("Receive and agree with assurance report", buildAssuranceReportJourneySummary(assessment, { roundTwo }), {
                locked: false,
              }),
              journeyItem("Improvement & Implementation Plan (IIP)", iipSummary, { locked: false }),
              journeyItem("Internal quality and approver sign-off", internalSignOffSummary, {
                locked: !internalSignOffSummary.ready,
                lockedHint: "Complete all outcomes and internal review first.",
              }),
              journeyItem("Submit full assessment to assurer", submitAssurerSummary, {
                locked: !submitAssurerSummary.ready,
                lockedHint: "Complete internal sign-off first.",
              }),
            ],
          },
        ];

    const allItems = roundTwo
      ? [
          ...(roundTwoSetupSection ? roundTwoSetupSection.items : []),
          ...(roundTwoAssessmentSection ? roundTwoAssessmentSection.items : []),
        ]
      : journeySections.flatMap((section) => section.items);
    const nextAction = findNextRecommendedAction(
      roundTwo && roundTwoAssessmentSection ? roundTwoAssessmentSection.items : allItems
    );
    const roundTwoSetupProgress = roundTwo
      ? buildRoundTwoSetupProgress(assessment)
      : null;
    const roundTwoAssessmentProgress = roundTwo
      ? buildRoundTwoAssessmentProgress(assessment)
      : null;
    if (roundTwo && roundTwoAssessmentProgress && nextAction) {
      roundTwoAssessmentProgress.nextActionText = nextAction.text;
      roundTwoAssessmentProgress.nextActionHref = nextAction.href;
    }

    res.render("pages/assessments/journey", {
      pageTitle: "CAF journey",
      labels,
      assessment,
      journeySections,
      roundTwoSetupSection,
      roundTwoAssessmentSection,
      roundTwoPostAssuranceSection,
      nextAction,
      prepareSummary,
      scopeSummary,
      annualSetupSummary,
      roundTwo,
      assessmentStartedAtDisplay: roundTwo ? formatDateTimeDisplay(assessment.createdAt) : "",
      assessmentDueAtDisplay: roundTwo ? formatDateTimeDisplay(assessment.dueAt) : "",
      roundTwoSetupProgress,
      roundTwoAssessmentProgress,
      collaborationState: roundTwo ? getCollaborationWorkflowState(assessment, req.session.data.user || null) : null,
      roleActionSummary: roundTwo ? buildRoleActionSummary(req.session.data.user || null) : null,
    });
  });

  router.get("/assessments/current/annual-setup", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    if (!hasRoundTwoScopeSummaryComplete(assessment)) {
      return res.redirect("/assessments/current/review-scope");
    }
    return res.render("pages/assessments/annual-setup-start", {
      pageTitle: "Choose what to assess",
      assessment,
    });
  });

  router.post("/assessments/current/annual-setup", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    if (!hasRoundTwoScopeSummaryComplete(assessment)) {
      return res.redirect("/assessments/current/review-scope");
    }
    return res.redirect(getAnnualSetupNextStep(assessment));
  });


  router.get("/assessments/current/annual-setup/organisation", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    if (!hasRoundTwoScopeSummaryComplete(assessment)) {
      return res.redirect("/assessments/current/review-scope");
    }
    const currentApproach = assessment.annualSetup.adApproach || "";
    // If already a returning user, send them straight to the approach selection page
    if (currentApproach && currentApproach !== "first_time") {
      return res.redirect("/assessments/current/annual-setup/organisation/approach");
    }
    // Auto-detect: check for any existing A&D judgements or carried-forward outcomes
    const adData = (assessment.selfAssess && assessment.selfAssess.ad) || {};
    const hasExistingAd = Object.values(adData).some((o) => o.judgement || o.carriedForward);
    if (hasExistingAd) {
      return res.redirect("/assessments/current/annual-setup/organisation/approach");
    }
    // First-time user — show informational page before systems
    return res.redirect("/assessments/current/annual-setup/organisation/first-time");
  });

  router.post("/assessments/current/annual-setup/organisation", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    const hasPreviousAd = (req.session.data.hasPreviousAd || "").toString().trim();
    const errors = [];
    if (!hasPreviousAd) {
      errors.push({ field: "hasPreviousAd", text: "Select yes if you have completed an organisation self-assessment before." });
    }
    if (errors.length > 0) {
      return res.render("pages/assessments/annual-setup-organisation", {
        pageTitle: "Organisation self-assessment",
        assessment,
        hasPreviousAd,
        error: { items: errors },
      });
    }
    delete req.session.data.hasPreviousAd;
    if (hasPreviousAd === "no") {
      assessment.annualSetup.adApproach = "first_time";
      assessment.annualSetup.completed = false;
      assessment.updatedAt = new Date().toISOString();
      return res.redirect("/assessments/current/annual-setup/systems");
    }
    return res.redirect("/assessments/current/annual-setup/organisation/approach");
  });

  router.get("/assessments/current/annual-setup/organisation/approach", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    const currentApproach = assessment.annualSetup.adApproach || "";
    const returningApproach = currentApproach !== "first_time" ? currentApproach : "";
    return res.render("pages/assessments/annual-setup-organisation-approach", {
      pageTitle: "Organisation self-assessment",
      assessment,
      adApproach: returningApproach,
      error: null,
    });
  });

  router.post("/assessments/current/annual-setup/organisation/approach", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    const adApproach = (req.session.data.adApproach || "").toString().trim();
    const validReturning = ["update_existing", "reuse_current", "new_assessment"];
    const errors = [];
    if (!adApproach || !validReturning.includes(adApproach)) {
      errors.push({ field: "adApproach", text: "Select how you will approach the previous assessment." });
    }
    if (errors.length > 0) {
      return res.render("pages/assessments/annual-setup-organisation-approach", {
        pageTitle: "Organisation self-assessment",
        assessment,
        adApproach,
        error: { items: errors },
      });
    }
    assessment.annualSetup.adApproach = adApproach;
    assessment.annualSetup.completed = false;
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.adApproach;
    return res.redirect("/assessments/current/annual-setup/systems");
  });

  router.get("/assessments/current/annual-setup/organisation/first-time", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    return res.render("pages/assessments/annual-setup-organisation-first-time", {
      pageTitle: "Organisation self-assessment",
      assessment,
    });
  });

  router.post("/assessments/current/annual-setup/organisation/first-time", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    assessment.annualSetup.adApproach = "first_time";
    assessment.annualSetup.completed = false;
    assessment.updatedAt = new Date().toISOString();
    return res.redirect("/assessments/current/annual-setup/systems");
  });


  router.get("/assessments/current/annual-setup/systems", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    if (!assessment.annualSetup.adApproach) {
      return res.redirect("/assessments/current/annual-setup/organisation");
    }
    const availableSystems = buildAvailableSystems(assessment);
    const systemsBackHref = assessment.annualSetup.adApproach === "first_time"
      ? "/assessments/current/annual-setup/organisation/first-time"
      : "/assessments/current/annual-setup/organisation/approach";
    return res.render("pages/assessments/annual-setup-systems", {
      pageTitle: "Choose critical systems to assess",
      assessment,
      systems: availableSystems,
      selectedIds: Array.isArray(assessment.annualSetup.systemIds) ? assessment.annualSetup.systemIds : [],
      noSystems: assessment.annualSetup.systemsStepComplete && assessment.annualSetup.systemIds.length === 0,
      backHref: systemsBackHref,
      error: null,
    });
  });

  router.post("/assessments/current/annual-setup/systems", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    if (!assessment.annualSetup.adApproach) {
      return res.redirect("/assessments/current/annual-setup/organisation");
    }
    const availableSystems = buildAvailableSystems(assessment);
    const allowedIds = new Set(availableSystems.map((s) => s.id));
    const noSystemsChosen = (req.body.noSystemsThisYear || "").toString() === "yes";
    const requestedIds = noSystemsChosen ? [] : coerceArray(req.body.annualSystemIds).filter(Boolean);
    const selectedIds = requestedIds.filter((id) => allowedIds.has(id));
    const errors = [];
    if (!noSystemsChosen && requestedIds.length === 0) {
      errors.push({ field: "annualSystemIds", text: "Select up to 3 critical systems, or choose the option if you are not assessing any this year." });
    }
    if (requestedIds.length > 3) {
      errors.push({ field: "annualSystemIds", text: "Select no more than 3 critical systems." });
    }
    if (errors.length > 0) {
      return res.render("pages/assessments/annual-setup-systems", {
        pageTitle: "Choose critical systems to assess",
        assessment,
        systems: availableSystems,
        selectedIds,
        noSystems: noSystemsChosen,
        error: { items: errors },
      });
    }
    assessment.annualSetup.systemIds = selectedIds;
    assessment.annualSetup.systemsStepComplete = true;
    assessment.annualSetup.completed = false;
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.annualSystemIds;
    delete req.session.data.noSystemsThisYear;
    return res.redirect("/assessments/current/annual-setup/confirm");
  });

  router.get("/assessments/current/annual-setup/confirm", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    if (!assessment.annualSetup.adApproach) {
      return res.redirect("/assessments/current/annual-setup/organisation");
    }
    if (!assessment.annualSetup.systemsStepComplete) {
      return res.redirect("/assessments/current/annual-setup/systems");
    }
    const adApproachLabels = {
      first_time: "Included",
      update_existing: "Included",
      reuse_current: "Included",
      new_assessment: "Included",
    };
    const allSystems = Array.isArray(assessment.scope && assessment.scope.criticalSystems) ? assessment.scope.criticalSystems : [];
    const selectedSystems = allSystems.filter((s) => (assessment.annualSetup.systemIds || []).includes(s.id));
    const isFirstTime = assessment.annualSetup.adApproach === "first_time";
    return res.render("pages/assessments/annual-setup-confirm", {
      pageTitle: "Check your choices",
      assessment,
      adApproachLabel: adApproachLabels[assessment.annualSetup.adApproach] || assessment.annualSetup.adApproach,
      adChangeHref: isFirstTime ? null : "/assessments/current/annual-setup/organisation/approach",
      selectedSystems,
    });
  });

  router.post("/assessments/current/annual-setup/confirm", (req, res) => {
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAnnualSetupData(assessment);
    if (!isAnnualSetupAssessmentStepComplete(assessment)) {
      return res.redirect(getAnnualSetupNextStep(assessment));
    }
    assessment.annualSetup.completed = true;
    assessment.annualSetup.updatedAt = new Date().toISOString();
    assessment.updatedAt = new Date().toISOString();
    return res.redirect("/assessments/current/annual-setup/complete");
  });


  router.get("/assessments/current/annual-setup/planning", (req, res) => {
    return res.redirect("/assessments/current/assurance-planning");
  });

  router.post("/assessments/current/annual-setup/planning", (req, res) => {
    return res.redirect("/assessments/current/assurance-planning");
  });

  router.get("/assessments/current/assurance-planning", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAssurancePlanningData(assessment);
    ensureCollaborationWorkflowData(assessment, req.session.data.user || null);

    return res.render("pages/assessments/assurance-planning", {
      pageTitle: "Plan for independent assurance",
      labels,
      assessment,
      collaborationState: getCollaborationWorkflowState(assessment, req.session.data.user || null),
      form: assessment.assurancePlanning,
      returnTo: normaliseInternalReturnTo(req.query.returnTo),
      saved: req.query.saved === "1",
    });
  });

  router.post("/assessments/current/assurance-planning", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAssurancePlanningData(assessment);

    assessment.assurancePlanning = {
      assurerName: (req.session.data.assurancePlanningAssurerName || "").toString().trim(),
      provider: (req.session.data.assurancePlanningProvider || "").toString().trim(),
      expectedTiming: (req.session.data.assurancePlanningExpectedTiming || "").toString().trim(),
      notes: (req.session.data.assurancePlanningNotes || "").toString().trim(),
      updatedAt: new Date().toISOString(),
    };
    assessment.updatedAt = assessment.assurancePlanning.updatedAt;

    delete req.session.data.assurancePlanningAssurerName;
    delete req.session.data.assurancePlanningProvider;
    delete req.session.data.assurancePlanningExpectedTiming;
    delete req.session.data.assurancePlanningNotes;

    return res.redirect(
      appendQueryParam(normaliseInternalReturnTo(req.body.returnTo), "saved", "assurance-planning")
    );
  });

  router.get("/assessments/current/annual-setup/complete", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    if (!assessment.annualSetup.completed) {
      return res.redirect(getAnnualSetupNextStep(assessment));
    }

    const systems = Array.isArray(assessment.scope && assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
    const selectedSystems = systems.filter((system) =>
      Array.isArray(assessment.annualSetup.systemIds) &&
      assessment.annualSetup.systemIds.includes(system.id)
    );

    return res.render("pages/assessments/annual-setup-complete", {
      pageTitle: "What happens next",
      assessment,
      selectedSystems,
    });
  });

  router.get("/assessments/current/self-assessment/ad", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/dashboard?lens=ad&view=all");
    }
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    ensureProgressTrackerForStart(assessment);
    ensureAnnualSetupData(assessment);
    ensureSectionReviewData(assessment);
    ensureCollaborationWorkflowData(assessment, req.session.data.user || null);
    if (!assessment.annualSetup.completed) {
      return res.redirect("/assessments/current/journey");
    }
    const { ad } = getOutcomesForVersion(assessment);
    const outcomes = flattenOutcomes(ad);
    const total = countOutcomesInTree(ad);
    const judged = countADJudged(assessment);

    const principleTitles = {};
    for (const objective of ad.objectives || []) {
      for (const principle of objective.principles || []) {
        principleTitles[principle.code] = principle.title;
      }
    }

    const rows = outcomes.map((outcome) => {
      const saved = (assessment.selfAssess && assessment.selfAssess.ad && assessment.selfAssess.ad[outcome.id]) || {};
      const carriedForward = Boolean(saved.carriedForward);
      const reviewRequired = Boolean(saved.reviewRequired);
      const started = hasStartedIgpAssessmentRow(saved);
      const statusText = carriedForward && reviewRequired ? "Carried forward" : saved.judgement ? "Complete" : started ? "In progress" : "Not started";
      const statusTagClass = carriedForward && reviewRequired ? "govuk-tag--turquoise" : saved.judgement ? "govuk-tag--green" : started ? "govuk-tag--blue" : "govuk-tag--grey";
      return {
        ...outcome,
        statusText,
        statusTagClass,
        href: buildSelfAssessUrl({ outcomeId: outcome.id }),
        carriedForward,
      };
    });

    const groupMap = {};
    const groupOrder = [];
    for (const row of rows) {
      if (!groupMap[row.principle]) {
        groupMap[row.principle] = { principleCode: row.principle, principleTitle: principleTitles[row.principle] || row.principle, outcomes: [] };
        groupOrder.push(row.principle);
      }
      groupMap[row.principle].outcomes.push(row);
    }
    const groups = groupOrder.map((code) => {
      const g = groupMap[code];
      return { ...g, judgedCount: g.outcomes.filter((r) => r.statusText === "Complete").length, totalCount: g.outcomes.length };
    });

    const carriedForwardReviewCount = rows.filter((row) => row.carriedForward).length;
    const reviewState = getADReviewState(assessment);
    const readyToComplete = total > 0 && judged >= total;

    return res.render("pages/assessments/self-assessment-ad", {
      pageTitle: "Organisation self-assessment",
      assessment,
      total,
      judged,
      groups,
      reviewState,
      collaborationState: getCollaborationWorkflowState(assessment, req.session.data.user || null),
      readyToComplete,
      carriedForwardReviewCount,
      saved: (req.query.saved || "").toString(),
      savedName: (req.query.name || "").toString(),
      error: null,
    });
  });

  router.post("/assessments/current/self-assessment/ad", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    ensureProgressTrackerForStart(assessment);
    ensureAnnualSetupData(assessment);
    ensureSectionReviewData(assessment);
    ensureCollaborationWorkflowData(assessment, req.session.data.user || null);

    const { ad } = getOutcomesForVersion(assessment);
    const outcomes = flattenOutcomes(ad);
    const total = countOutcomesInTree(ad);
    const judged = countADJudged(assessment);
    const rows = outcomes.map((outcome) => {
      const saved = (assessment.selfAssess && assessment.selfAssess.ad && assessment.selfAssess.ad[outcome.id]) || {};
      const carriedForward = Boolean(saved.carriedForward);
      const reviewRequired = Boolean(saved.reviewRequired);
      const started = hasStartedIgpAssessmentRow(saved);
      return {
        ...outcome,
        status: carriedForward && reviewRequired ? "Carried forward - review needed" : saved.judgement ? "Complete" : started ? "In progress" : "Not started",
        href: buildSelfAssessUrl({ outcomeId: outcome.id }),
        actionText: carriedForward && reviewRequired ? "Review" : saved.judgement ? "Review" : started ? "Continue" : "Start",
        carriedForward,
      };
    });
    const carriedForwardReviewCount = rows.filter((row) => row.carriedForward).length;
    const adPageStatus = judged === 0 ? "Not started" : judged >= total ? "Complete" : "In progress";
    const reviewState = getADReviewState(assessment);
    const readyToComplete = total > 0 && judged >= total;

    if (!readyToComplete) {
      return res.redirect("/assessments/current/self-assessment/ad");
    }

    const nowIso = new Date().toISOString();
    assessment.selfAssess.adReview = {
      completed: true,
      completedAt: nowIso,
      completedBy: getAuditActor(req.session.data.user || null),
    };
    assessment.updatedAt = nowIso;
    delete req.session.data.completeAdAssessment;
    return res.redirect("/assessments/current/self-assessment/ad/complete");
  });

  router.get("/assessments/current/self-assessment/ad/complete", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");

    ensureSectionReviewData(assessment);
    const reviewState = getADReviewState(assessment);
    if (!reviewState.completed) {
      return res.redirect("/assessments/current/self-assessment/ad");
    }

    const { ad } = getOutcomesForVersion(assessment);
    const outcomes = flattenOutcomes(ad);
    const bcReviewState = getBCReviewState(assessment);

    return res.render("pages/assessments/self-assessment-ad-complete", {
      pageTitle: "A and D complete",
      assessment,
      reviewState,
      outcomes,
      nextActionHref: bcReviewState.completed
        ? "/assessments/current/complete-self-assessment"
        : "/assessments/current/self-assessment/bc",
      nextActionText: bcReviewState.completed
        ? "Continue to self-assessment summary"
        : "Continue to B and C self-assessment",
    });
  });

  router.get("/assessments/current/self-assessment/bc", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/dashboard?lens=bc&view=all");
    }
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    ensureProgressTrackerForStart(assessment);
    ensureAnnualSetupData(assessment);
    ensureSectionReviewData(assessment);
    ensureCollaborationWorkflowData(assessment, req.session.data.user || null);
    if (!assessment.annualSetup.completed) {
      return res.redirect("/assessments/current/journey");
    }
    const { bc } = getOutcomesForVersion(assessment);
    const allSystems = buildBCSystemList(assessment, bc);
    const filterState = buildBCSystemFilterState(allSystems, req.query.view);
    const systems = filterState.visibleSystems;
    const totalPerSystem = filterState.totalPerSystem;
    const bcPageStatus = allSystems.length === 0
      ? "Not started"
      : allSystems.every((system) => system.status === "Complete")
        ? "Complete"
        : allSystems.some((system) => system.judged > 0)
          ? "In progress"
          : "Not started";
    const primarySystem = systems[0] || null;
    const primaryActionHref = primarySystem
      ? `/self-assess/bc/${primarySystem.id}`
      : filterState.showEmptyHighPriorityState
        ? "/assessments/current/self-assessment/bc?view=all"
        : "/assessments/current/annual-setup/organisation";
    const primaryActionText = primarySystem
      ? "Open selected system"
      : filterState.showEmptyHighPriorityState
        ? "View all systems"
        : "Return to assessment setup";
    const reviewState = getBCReviewState(assessment);
    const readyToComplete = totalPerSystem > 0 && allSystems.length > 0 && allSystems.every((system) => system.judged >= totalPerSystem);

    return res.render("pages/assessments/self-assessment-bc", {
      pageTitle: "Critical systems",
      assessment,
      systems,
      allSystemsCount: allSystems.length,
      highPrioritySystemsCount: filterState.highPrioritySystemsCount,
      activeFilter: filterState.activeFilter,
      showEmptyHighPriorityState: filterState.showEmptyHighPriorityState,
      bcPageStatus,
      primaryActionHref,
      primaryActionText,
      hasCheckInPlanned: assessment.annualSetup.checkInPlan === "planned",
      assuranceWindow: assessment.annualSetup.assuranceWindow || "",
      checkInNotes: assessment.annualSetup.checkInNotes || "",
      reviewState,
      collaborationState: getCollaborationWorkflowState(assessment, req.session.data.user || null),
      readyToComplete,
      frameworkChange: filterState.frameworkChange,
      carriedForwardReviewCount: filterState.carriedForwardReviewCount,
      saved: (req.query.saved || "").toString(),
      savedName: (req.query.name || "").toString(),
      error: null,
    });
  });

  router.post("/assessments/current/self-assessment/bc", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    ensureProgressTrackerForStart(assessment);
    ensureAnnualSetupData(assessment);
    ensureSectionReviewData(assessment);
    ensureCollaborationWorkflowData(assessment, req.session.data.user || null);

    const { bc } = getOutcomesForVersion(assessment);
    const allSystems = buildBCSystemList(assessment, bc);
    const filterState = buildBCSystemFilterState(allSystems, req.body.view);
    const systems = filterState.visibleSystems;
    const totalPerSystem = filterState.totalPerSystem;
    const bcPageStatus = allSystems.length === 0
      ? "Not started"
      : allSystems.every((system) => system.status === "Complete")
        ? "Complete"
        : allSystems.some((system) => system.judged > 0)
          ? "In progress"
          : "Not started";
    const primarySystem = systems[0] || null;
    const primaryActionHref = primarySystem
      ? `/self-assess/bc/${primarySystem.id}`
      : filterState.showEmptyHighPriorityState
        ? "/assessments/current/self-assessment/bc?view=all"
        : "/assessments/current/annual-setup/organisation";
    const primaryActionText = primarySystem
      ? "Open selected system"
      : filterState.showEmptyHighPriorityState
        ? "View all systems"
        : "Return to assessment setup";
    const reviewState = getBCReviewState(assessment);
    const readyToComplete = totalPerSystem > 0 && allSystems.length > 0 && allSystems.every((system) => system.judged >= totalPerSystem);
    const decision = (req.session.data.completeBcAssessment || "").toString();

    if (!readyToComplete) {
      return res.redirect("/assessments/current/self-assessment/bc");
    }

    if (!decision) {
      return res.render("pages/assessments/self-assessment-bc", {
        pageTitle: "Critical systems",
        assessment,
        systems,
        allSystemsCount: allSystems.length,
        highPrioritySystemsCount: filterState.highPrioritySystemsCount,
        activeFilter: filterState.activeFilter,
        showEmptyHighPriorityState: filterState.showEmptyHighPriorityState,
        bcPageStatus,
        primaryActionHref,
        primaryActionText,
        hasCheckInPlanned: assessment.annualSetup.checkInPlan === "planned",
        assuranceWindow: assessment.annualSetup.assuranceWindow || "",
        checkInNotes: assessment.annualSetup.checkInNotes || "",
        reviewState,
        collaborationState: getCollaborationWorkflowState(assessment, req.session.data.user || null),
        readyToComplete,
        frameworkChange: filterState.frameworkChange,
        carriedForwardReviewCount: filterState.carriedForwardReviewCount,
        saved: "",
        savedName: "",
        error: { items: [{ field: "completeBcAssessment", text: "Confirm the critical systems self-assessment is complete to continue." }] },
      });
    }

    if (decision === "no") {
      delete req.session.data.completeBcAssessment;
      return res.redirect("/assessments/current/journey");
    }

    const nowIso = new Date().toISOString();
    assessment.selfAssess.bcReview = {
      completed: true,
      completedAt: nowIso,
      completedBy: getAuditActor(req.session.data.user || null),
    };
    assessment.updatedAt = nowIso;
    delete req.session.data.completeBcAssessment;
    return res.redirect("/assessments/current/self-assessment/bc/complete");
  });

  router.get("/assessments/current/self-assessment/bc/complete", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");

    ensureSectionReviewData(assessment);
    const reviewState = getBCReviewState(assessment);
    if (!reviewState.completed) {
      return res.redirect("/assessments/current/self-assessment/bc");
    }

    const systems = getSelectedAnnualSystems(assessment);
    const adReviewState = getADReviewState(assessment);

    return res.render("pages/assessments/self-assessment-bc-complete", {
      pageTitle: "B and C complete",
      assessment,
      reviewState,
      systems,
      nextActionHref: adReviewState.completed
        ? "/assessments/current/complete-self-assessment"
        : "/assessments/current/self-assessment/ad",
      nextActionText: adReviewState.completed
        ? "Continue to self-assessment summary"
        : "Continue to A and D self-assessment",
    });
  });

  router.get("/assessments/current/complete-self-assessment", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    if (assessment.assurerSubmission && assessment.assurerSubmission.submitted) {
      return res.redirect("/assessments/current/send-to-assurer/confirmation");
    }

    ensureSectionReviewData(assessment);
    ensureCollaborationWorkflowData(assessment, req.session.data.user || null);
    const adReviewState = getADReviewState(assessment);
    const bcReviewState = getBCReviewState(assessment);
    if (!adReviewState.completed || !bcReviewState.completed) {
      return res.redirect("/assessments/current/journey");
    }

    return res.render("pages/assessments/complete-self-assessment", {
      pageTitle: "Get internal sign-off",
      assessment,
      completion: getAssessmentCompletionState(assessment),
      collaborationState: getCollaborationWorkflowState(assessment, req.session.data.user || null),
      selectedSystems: getSelectedAnnualSystems(assessment),
      error: null,
    });
  });

  router.get("/assessments/current/complete-self-assessment/download", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    return res.redirect("/assessments/current/export-assessment");
  });

  router.get("/assessments/current/export-assessment", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    const exportOptions = buildAssessmentExportOptions(assessment);
    const selection = getAssessmentExportSelection(req.query, exportOptions);

    return res.render("pages/assessments/export-assessment", {
      pageTitle: "Export assessment",
      assessment,
      selection,
      exportOptions,
      error: null,
    });
  });

  router.get("/assessments/current/export-assessment/print", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    const exportOptions = buildAssessmentExportOptions(assessment);
    const selection = getAssessmentExportSelection(req.query, exportOptions);
    const validationErrors = validateAssessmentExportSelection(selection, exportOptions);

    if (validationErrors.length > 0) {
      return res.render("pages/assessments/export-assessment", {
        pageTitle: "Export assessment",
        assessment,
        selection,
        exportOptions,
        error: { items: validationErrors },
      });
    }

    const exportSummary = buildAssessmentExportSummary(assessment, selection, exportOptions);
    if (exportSummary.outcomeCount === 0) {
      return res.render("pages/assessments/export-assessment", {
        pageTitle: "Export assessment",
        assessment,
        selection,
        exportOptions,
        error: {
          items: [
            {
              field: selection.scopeType === "section" ? "sectionId" : "outcomeId",
              text: "No saved assessment content matches that export selection yet.",
            },
          ],
        },
      });
    }
    return res.render("pages/assessments/download-self-assessment-summary", {
      pageTitle: `${exportSummary.title} - printable summary`,
      assessment,
      exportSummary,
      printGeneratedAt: formatDateTimeDisplay(new Date().toISOString()),
    });
  });

  router.post("/assessments/current/complete-self-assessment", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    ensureSectionReviewData(assessment);
    ensureCollaborationWorkflowData(assessment, req.session.data.user || null);
    const adReviewState = getADReviewState(assessment);
    const bcReviewState = getBCReviewState(assessment);
    if (!adReviewState.completed || !bcReviewState.completed) {
      return res.redirect("/assessments/current/journey");
    }

    const confirm = (req.session.data.internalSignOffConfirm || "").toString();
    if (confirm !== "yes") {
      return res.render("pages/assessments/complete-self-assessment", {
        pageTitle: "Get internal sign-off",
        assessment,
        completion: getAssessmentCompletionState(assessment),
        collaborationState: getCollaborationWorkflowState(assessment, req.session.data.user || null),
        selectedSystems: getSelectedAnnualSystems(assessment),
        error: { items: [{ field: "internalSignOffConfirm", text: "Confirm that this self-assessment has been reviewed and approved internally." }] },
      });
    }

    const nowIso = new Date().toISOString();
    const actor = getAuditActor(req.session.data.user || null);
    assessment.collaborationWorkflow = {
      ...assessment.collaborationWorkflow,
      status: "approved",
      approvedAt: nowIso,
      approvedBy: actor,
    };
    assessment.updatedAt = nowIso;
    delete req.session.data.internalSignOffConfirm;

    return res.redirect("/assessments/current/send-to-assurer");
  });

  router.get("/assessments/current/review-scope", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScopeReviewState(assessment);
    const scope = assessment.scope || {};
    const essentialServices = Array.isArray(scope.essentialServices) ? scope.essentialServices : [];
    const criticalSystems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];

    return res.render("pages/assessments/review-scope", {
      pageTitle: "Review your services and systems lists",
      assessment,
      form: assessment.scopeReview,
      scopeSummary: {
        contextStatus: scopeContextCompleted(scope) ? "Added" : "Not added",
        essentialServicesCount: essentialServices.length,
        criticalSystemsCount: criticalSystems.length,
      },
      error: null,
    });
  });

  router.post("/assessments/current/review-scope", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    if (!requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScopeReviewState(assessment);
    ensureAnnualSetupData(assessment);

    const scopeUpdateArea = (req.session.data.scopeUpdateArea || "").toString();
    const scopeChanged = scopeUpdateArea === "no" ? "no" : scopeUpdateArea ? "yes" : "";
    assessment.scopeReview.scopeChanged = scopeChanged;
    assessment.scopeReview.scopeUpdateArea = scopeUpdateArea;
    assessment.scopeReview.decision =
      scopeUpdateArea === "no"
        ? "no_change"
        : scopeUpdateArea === "context"
          ? "update_context"
          : scopeUpdateArea === "services"
            ? "update_services"
            : scopeUpdateArea === "systems"
              ? "update_systems"
              : "";
    assessment.scopeReview.updatedAt = new Date().toISOString();
    const scope = assessment.scope || {};
    const essentialServices = Array.isArray(scope.essentialServices) ? scope.essentialServices : [];
    const criticalSystems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];

    const errors = [];
    if (!scopeUpdateArea) {
      errors.push({ field: "scopeUpdateArea", text: "Select whether your setup details need updating, or which part to update." });
    }

    if (errors.length > 0) {
      return res.render("pages/assessments/review-scope", {
        pageTitle: "Review your services and systems lists",
        assessment,
        form: assessment.scopeReview,
        scopeSummary: {
          contextStatus: scopeContextCompleted(scope) ? "Added" : "Not added",
          essentialServicesCount: essentialServices.length,
          criticalSystemsCount: criticalSystems.length,
        },
        error: { items: errors },
      });
    }

    if (scopeUpdateArea === "no") {
      assessment.scopeReview.completed = true;
      assessment.annualSetup.scopeCheckStatus = "no_change";
      delete req.session.data.scopeUpdateArea;
      return res.redirect("/assessments/current/annual-setup");
    }

    assessment.scopeReview.completed = false;
    assessment.annualSetup.scopeCheckStatus = "updated";
    assessment.annualSetup.completed = false;
    req.session.data.scopeReviewReturnTo = "/assessments/current/review-scope";
    delete req.session.data.scopeUpdateArea;

    if (scopeUpdateArea === "context") {
      return res.redirect("/stages/2/scope/context");
    }
    if (scopeUpdateArea === "services") {
      return res.redirect("/stages/2/scope/services/review");
    }
    return res.redirect("/stages/2/scope/systems/review");
  });

  router.get("/assessments/current/start-self-assessment", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    ensureProgressTrackerForStart(assessment);
    const state = getSelfAssessStartState(assessment);

    return res.render("pages/assessments/start-self-assessment", {
      pageTitle: "Readiness checks",
      labels,
      assessment,
      form: state,
      error: null,
    });
  });

  router.post("/assessments/current/start-self-assessment", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    ensureProgressTrackerForStart(assessment);
    const selected = coerceArray(req.session.data.selfAssessStartChecks).filter(Boolean);
    const required = [
      "checkInBooked",
      "outcomesReviewed",
      "evidencePrepared",
    ];
    const isChecked = (id) => selected.includes(id);
    const missing = required.filter((id) => !isChecked(id));

    const nextState = {
      checkInBooked: isChecked("checkInBooked"),
      outcomesReviewed: isChecked("outcomesReviewed"),
      evidencePrepared: isChecked("evidencePrepared"),
      completed: missing.length === 0,
      updatedAt: new Date().toISOString(),
    };
    assessment.selfAssessStart = nextState;
    assessment.updatedAt = new Date().toISOString();

    if (missing.length > 0) {
      const errorItems = [];
      if (missing.length > 0) {
        errorItems.push({
          field: "selfAssessStartChecks",
          text:
            "Confirm all checks before starting A and D and B and C self-assessment.",
        });
      }
      return res.render("pages/assessments/start-self-assessment", {
        pageTitle: "Readiness checks",
        labels,
        assessment,
        form: nextState,
        error: { items: errorItems },
      });
    }

    delete req.session.data.selfAssessStartChecks;
    const returnTo = (req.session.data.selfAssessReturnTo || "").toString();
    delete req.session.data.selfAssessReturnTo;
    if (returnTo && returnTo.startsWith("/")) {
      return res.redirect(returnTo);
    }
    return res.redirect("/assessments/current/dashboard");
  });

  router.get("/assessments/current/internal-sign-off", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const completion = getAssessmentCompletionState(assessment);
    const signOff = getInternalSignOffState(assessment);

    return res.render("pages/assessments/internal-sign-off", {
      pageTitle: "Internal quality and approver sign-off",
      labels,
      assessment,
      completion,
      signOff,
      error: null,
      saved: req.query.saved === "1",
    });
  });

  router.get("/assessments/current/internal-sign-off/complete", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const signOff = getInternalSignOffState(assessment);
    if (!signOff.completed) {
      return res.redirect("/assessments/current/internal-sign-off");
    }

    return res.render("pages/assessments/internal-sign-off-complete", {
      pageTitle: "Internal sign-off complete",
      labels,
      assessment,
      signOff,
    });
  });

  router.post("/assessments/current/internal-sign-off", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const completion = getAssessmentCompletionState(assessment);
    const signOff = {
      qualityAssurerName: (req.session.data.qualityAssurerName || "").toString().trim(),
      qualityAssurerDate: (req.session.data.qualityAssurerDate || "").toString().trim(),
      approverName: (req.session.data.approverName || "").toString().trim(),
      approverDate: (req.session.data.approverDate || "").toString().trim(),
      completed: false,
    };

    const errors = [];
    if (!completion.readyForSignOff) {
      errors.push({
        field: "signOffGate",
        text: "Complete all outcomes and internal review before internal sign-off.",
      });
    }
    if (!signOff.qualityAssurerName) {
      errors.push({ field: "qualityAssurerName", text: "Enter internal quality assurer name" });
    }
    if (!isValidIsoDate(signOff.qualityAssurerDate)) {
      errors.push({ field: "qualityAssurerDate", text: "Enter a valid quality assurer sign-off date" });
    }
    if (!signOff.approverName) {
      errors.push({ field: "approverName", text: "Enter internal approver name" });
    }
    if (!isValidIsoDate(signOff.approverDate)) {
      errors.push({ field: "approverDate", text: "Enter a valid internal approver sign-off date" });
    }

    if (errors.length > 0) {
      return res.render("pages/assessments/internal-sign-off", {
        pageTitle: "Internal quality and approver sign-off",
        labels,
        assessment,
        completion,
        signOff,
        error: { items: errors },
        saved: false,
      });
    }

    const nowIso = new Date().toISOString();
    assessment.internalSignOff = {
      ...signOff,
      completed: true,
      completedAt: nowIso,
      completedBy: req.session.data.user ? req.session.data.user.name : "Council lead",
    };
    assessment.updatedAt = nowIso;

    delete req.session.data.qualityAssurerName;
    delete req.session.data.qualityAssurerDate;
    delete req.session.data.approverName;
    delete req.session.data.approverDate;

    return res.redirect("/assessments/current/internal-sign-off/complete");
  });

  router.get("/assessments/current/submit-assessment", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const completion = getAssessmentCompletionState(assessment);
    const signOff = getInternalSignOffState(assessment);
    const submissionWindow = getSubmissionWindowState(assessment);
    const submitted = assessment.assurerSubmission || {};

    return res.render("pages/assessments/submit-assessment", {
      pageTitle: "Submit full assessment to assurer",
      labels,
      assessment,
      completion,
      assessmentWorkflowStatus: getAssessmentWorkflowStatus(assessment, {
        preferReadyForIndependentAssurance: true,
      }),
      signOff,
      submissionWindow,
      submitted,
      confirmChoice: "",
      error: null,
      saved: req.query.saved === "1",
    });
  });

  router.get("/assessments/current/submit-assessment/complete", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const submitted = assessment.assurerSubmission || {};
    const signOff = getInternalSignOffState(assessment);
    const submissionWindow = getSubmissionWindowState(assessment);
    if (!submitted.submitted) {
      return res.redirect("/assessments/current/submit-assessment");
    }

    return res.render("pages/assessments/submit-assessment-complete", {
      pageTitle: "Assessment sent for independent assurance",
      labels,
      assessment,
      assessmentWorkflowStatus: getAssessmentWorkflowStatus(assessment),
      submitted,
      signOff,
      submissionWindow,
      roundTwo: isRoundTwoRequest(req),
    });
  });

  router.post("/assessments/current/submit-assessment", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const completion = getAssessmentCompletionState(assessment);
    const signOff = getInternalSignOffState(assessment);
    const submissionWindow = getSubmissionWindowState(assessment);
    const confirmSubmit = (req.session.data.submitAssessmentConfirm || "").toString();
    const errors = [];

    if (!completion.readyForSignOff) {
      errors.push({
        field: "submitGate",
        text: "Complete all outcomes and internal review before submission.",
      });
    }
    if (!signOff.completed) {
      errors.push({ field: "submitGate", text: "Complete internal quality and approver sign-off first." });
    }
    if (!submissionWindow.workshopDateIso) {
      errors.push({
        field: "submitGate",
        text: "Set an objective clarification workshop date in scope before submitting.",
      });
    }
    if (!submissionWindow.canSubmitNow) {
      errors.push({
        field: "submitGate",
        text: "Submission is outside the 5 working day window before workshops.",
      });
    }
    if (confirmSubmit !== "yes") {
      errors.push({ field: "submitAssessmentConfirm", text: "Confirm you want to submit to the assurer" });
    }

    if (errors.length > 0) {
      return res.render("pages/assessments/submit-assessment", {
        pageTitle: "Submit full assessment to assurer",
        labels,
        assessment,
        completion,
        assessmentWorkflowStatus: getAssessmentWorkflowStatus(assessment, {
          preferReadyForIndependentAssurance: true,
        }),
        signOff,
        submissionWindow,
        submitted: assessment.assurerSubmission || {},
        confirmChoice: confirmSubmit,
        error: { items: errors },
        saved: false,
      });
    }

    const submittedAt = new Date().toISOString();
    assessment.assurerSubmission = {
      submitted: true,
      submittedAt,
      submittedBy: req.session.data.user ? req.session.data.user.name : "Council lead",
      workshopDate: submissionWindow.workshopDateIso,
      submitByDate: submissionWindow.submitByDateIso,
      metTimingRule: true,
    };
    assessment.updatedAt = submittedAt;

    delete req.session.data.submitAssessmentConfirm;
    return res.redirect("/assessments/current/submit-assessment/complete");
  });

  // --- Ready for assurance (CAF lead review view) ---
  // --- Send to assurer (CAF lead declaration + submit) ---
  router.get("/assessments/current/send-to-assurer", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");

    if (assessment.assurerSubmission && assessment.assurerSubmission.submitted) {
      return res.redirect("/assessments/current/send-to-assurer/confirmation");
    }

    ensureCollaborationWorkflowData(assessment, req.session.data.user || null);
    const collaborationState = getCollaborationWorkflowState(assessment, req.session.data.user || null);
    if (collaborationState.status !== "approved") {
      return res.redirect("/assessments/current/journey");
    }

    const completion = getAssessmentCompletionState(assessment);
    const selectedSystems = getSelectedAnnualSystems(assessment);

    return res.render("pages/assessments/send-to-assurer", {
      pageTitle: "Confirm and send assessment to assurer",
      assessment,
      collaborationState,
      completion,
      selectedSystems,
      error: null,
      declarationChecked: false,
    });
  });

  router.post("/assessments/current/send-to-assurer", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");

    ensureCollaborationWorkflowData(assessment, req.session.data.user || null);
    const collaborationState = getCollaborationWorkflowState(assessment, req.session.data.user || null);
    if (collaborationState.status !== "approved") {
      return res.redirect("/assessments/current/journey");
    }

    const declarationChecked =
      (req.session.data.sendToAssurerDeclaration || "").toString() === "yes";
    delete req.session.data.sendToAssurerDeclaration;

    if (!declarationChecked) {
      const completion = getAssessmentCompletionState(assessment);
      const selectedSystems = getSelectedAnnualSystems(assessment);
      return res.render("pages/assessments/send-to-assurer", {
        pageTitle: "Confirm and send assessment to assurer",
        assessment,
        collaborationState,
        completion,
        selectedSystems,
        error: {
          items: [
            {
              field: "sendToAssurerDeclaration",
              text: "Confirm that this assessment is ready to send to the assurer.",
            },
          ],
        },
        declarationChecked: false,
      });
    }

    const nowIso = new Date().toISOString();
    const actor = getAuditActor(req.session.data.user || null);
    assessment.assurerSubmission = {
      submitted: true,
      submittedAt: nowIso,
      submittedBy: actor,
      workshopDate: "",
      submitByDate: "",
      metTimingRule: true,
    };
    assessment.updatedAt = nowIso;

    return res.redirect("/assessments/current/send-to-assurer/confirmation");
  });

  router.get("/assessments/current/send-to-assurer/confirmation", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");

    if (!assessment.assurerSubmission || !assessment.assurerSubmission.submitted) {
      return res.redirect("/assessments/current/send-to-assurer");
    }

    return res.render("pages/assessments/send-to-assurer-confirmation", {
      pageTitle: "Assessment sent to assurer",
      assessment,
      assessmentWorkflowStatus: getAssessmentWorkflowStatus(assessment),
      submitted: assessment.assurerSubmission,
      selectedSystems: getSelectedAnnualSystems(assessment),
    });
  });

  router.get("/assessments/current/assurance-report", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);

    if (isRoundTwoRequest(req)) {
      const record = assessment.assurance.recordOfAudit || { outcomes: [], igps: [] };
      const stage1 = assessment.assurance.stage1Report || {};
      const assuranceSummary = buildAssuranceSummary(assessment);
      const bcGroups = buildBCAssuranceComparison(assessment, record, stage1);
      const outcomeGroups = bcGroups;
      const recommendations = (stage1.items || []).filter(
        (item) => item.recommendation && item.outcomeId && /^B/i.test(item.outcomeId)
      );
      return res.render("pages/assessments/receive-assurance-report", {
        pageTitle: "Assurance report",
        labels,
        assessment,
        record,
        stage1,
        assuranceSummary,
        outcomeGroups,
        recommendations,
        councilDisplayName: assessment.councilName || "Your council",
      });
    }

    const stage1 = assessment.assurance.stage1Report || {};
    const amendments = stage1.councilAmendments || { status: "none", dueAt: "", submittedAt: "", notes: "" };
    const deadline = parseDateISO(amendments.dueAt || "");
    const now = startOfDay(new Date());
    const canAmend = Boolean(deadline && now.getTime() <= deadline.getTime() && amendments.status !== "submitted");
    const windowState = {
      dueAtDisplay: deadline ? formatDateShort(deadline) : "",
      canAmend,
      status: amendments.status || "none",
    };
    const record = assessment.assurance.recordOfAudit || { outcomes: [], igps: [] };
    const submissionWindow = getSubmissionWindowState(assessment);
    const workshopResponse = assessment.assurance.councilWorkshopResponse || {
      decision: "",
      notes: "",
      respondedAt: "",
      respondedBy: "",
    };

    res.render("pages/assessments/assurance-report", {
      pageTitle: "Assurance report",
      labels,
      assessment,
      record,
      stage1,
      windowState,
      submissionWindow,
      workshopResponse,
      error: null,
      saved: req.query.saved === "1",
      workshopSaved: req.query.workshopSaved === "1",
    });
  });

  router.post("/assessments/current/assurance-report/workshops", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);

    const decision = (req.session.data.workshopDatesDecision || "").toString();
    const notes = (req.session.data.workshopDatesNotes || "").toString().trim();
    const errors = [];

    if (!decision) {
      errors.push({ field: "workshopDatesDecision", text: "Select whether the upcoming dates are correct." });
    }
    if (decision === "deny" && !notes) {
      errors.push({ field: "workshopDatesNotes", text: "Enter what needs changing before dates are updated." });
    }

    if (errors.length > 0) {
      const stage1 = assessment.assurance.stage1Report || {};
      const amendments = stage1.councilAmendments || { status: "none", dueAt: "", submittedAt: "", notes: "" };
      const deadline = parseDateISO(amendments.dueAt || "");
      const now = startOfDay(new Date());
      const canAmend = Boolean(deadline && now.getTime() <= deadline.getTime() && amendments.status !== "submitted");
      const windowState = {
        dueAtDisplay: deadline ? formatDateShort(deadline) : "",
        canAmend,
        status: amendments.status || "none",
      };
      return res.render("pages/assessments/assurance-report", {
        pageTitle: "Assurance report",
        labels,
        assessment,
        record: assessment.assurance.recordOfAudit || { outcomes: [], igps: [] },
        stage1,
        windowState,
        submissionWindow: getSubmissionWindowState(assessment),
        workshopResponse: {
          decision,
          notes,
          respondedAt: "",
          respondedBy: "",
        },
        error: { items: errors },
        saved: false,
        workshopSaved: false,
      });
    }

    const nowIso = new Date().toISOString();
    assessment.assurance.councilWorkshopResponse = {
      decision,
      notes,
      respondedAt: nowIso,
      respondedBy: req.session.data.user ? req.session.data.user.name : "Council lead",
    };
    assessment.assurance.workflowStage = "council_review_in_progress";
    assessment.updatedAt = nowIso;

    delete req.session.data.workshopDatesDecision;
    delete req.session.data.workshopDatesNotes;
    return res.redirect("/assessments/current/assurance-report?workshopSaved=1");
  });

  router.post("/assessments/current/assurance-report/amendments", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);

    const stage1 = assessment.assurance.stage1Report || {};
    const amendments = stage1.councilAmendments || { status: "none", dueAt: "", submittedAt: "", notes: "" };
    const notes = (req.session.data.assuranceAmendmentsNotes || "").toString().trim();
    const deadline = parseDateISO(amendments.dueAt || "");
    const now = startOfDay(new Date());
    const canAmend = Boolean(deadline && now.getTime() <= deadline.getTime() && amendments.status !== "submitted");
    const errors = [];
    if (!canAmend) {
      errors.push({ field: "assuranceAmendments", text: "Amendment window has closed." });
    }
    if (!notes) {
      errors.push({ field: "assuranceAmendmentsNotes", text: "Enter amendment notes." });
    }

    if (errors.length > 0) {
      const windowState = {
        dueAtDisplay: deadline ? formatDateShort(deadline) : "",
        canAmend,
        status: amendments.status || "none",
      };
      return res.render("pages/assessments/assurance-report", {
        pageTitle: "Assurance report",
        labels,
        assessment,
        record: assessment.assurance.recordOfAudit || { outcomes: [], igps: [] },
        stage1: {
          ...stage1,
          councilAmendments: {
            ...amendments,
            notes,
          },
        },
        windowState,
        submissionWindow: getSubmissionWindowState(assessment),
        workshopResponse: assessment.assurance.councilWorkshopResponse || {
          decision: "",
          notes: "",
          respondedAt: "",
          respondedBy: "",
        },
        error: { items: errors },
        saved: false,
        workshopSaved: false,
      });
    }

    const nowIso = new Date().toISOString();
    assessment.assurance.stage1Report = {
      ...stage1,
      councilAmendments: {
        ...amendments,
        status: "submitted",
        submittedAt: nowIso,
        notes,
      },
    };
    assessment.assurance.workflowStage = "council_review_in_progress";
    assessment.updatedAt = nowIso;

    delete req.session.data.assuranceAmendmentsNotes;
    return res.redirect("/assessments/current/assurance-report?saved=1");
  });

  router.get("/assessments/current/evidence-requests", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);

    const all = assessment.assurance.evidenceRequests || [];
    const open = all.filter((item) => item.status === "open");
    const addressed = all.filter((item) => item.status !== "open");
    res.render("pages/assessments/evidence-requests", {
      pageTitle: "Evidence requests",
      labels,
      assessment,
      open,
      addressed,
      error: null,
      saved: req.query.saved === "1",
    });
  });

  router.post("/assessments/current/evidence-requests/:id/respond", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);

    const id = (req.params.id || "").toString();
    const responseText = (req.session.data.evidenceResponseText || "").toString().trim();
    const errors = [];
    if (!responseText) {
      errors.push({ field: "evidenceResponseText", text: "Enter your clarification response." });
    }

    const all = assessment.assurance.evidenceRequests || [];
    const open = all.filter((item) => item.status === "open");
    const addressed = all.filter((item) => item.status !== "open");
    if (errors.length > 0) {
      return res.render("pages/assessments/evidence-requests", {
        pageTitle: "Evidence requests",
        labels,
        assessment,
        open,
        addressed,
        error: { items: errors },
        saved: false,
      });
    }

    assessment.assurance.evidenceRequests = all.map((item) =>
      item.id === id
        ? { ...item, status: "addressed", councilResponse: responseText }
        : item
    );
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.evidenceResponseText;
    return res.redirect("/assessments/current/evidence-requests?saved=1");
  });

  // COLLABORATOR VIEW
  router.get("/assessments/current/collaborator-view", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    const currentUser = req.session.data.user || null;
    const currentUserId = currentUser && currentUser.id ? currentUser.id : null;

    const enriched = [];

    // BC outcomes — check selfAssess.bc for collaboratorIds
    const bcSelfAssess = (assessment.selfAssess && assessment.selfAssess.bc) || {};
    for (const [systemId, systemData] of Object.entries(bcSelfAssess)) {
      const outcomes = (systemData && systemData.outcomes) || {};
      for (const [outcomeId, outcomeData] of Object.entries(outcomes)) {
        if (!Array.isArray(outcomeData.collaboratorIds) || !currentUserId) continue;
        if (!outcomeData.collaboratorIds.includes(currentUserId)) continue;
        const systemName = ((assessment.scope && assessment.scope.criticalSystems) || []).find(s => s.id === systemId);
        enriched.push({
          outcomeId,
          outcomeCode: outcomeId,
          outcomeTitle: "Identity and access controls",
          systemName: systemName ? systemName.name : systemId,
          principleCode: "B and C",
          status: outcomeData.status || "not_started",
          statusLabel: outcomeData.status === "complete" ? "Complete" : outcomeData.status === "in_progress" ? "In progress" : "Not started",
          statusTagClass: outcomeData.status === "complete" ? "govuk-tag--green" : outcomeData.status === "in_progress" ? "govuk-tag--blue" : "govuk-tag--grey",
          ownerName: getUserName(users, outcomeData.ownerId),
          linkUrl: `/self-assess/bc/${systemId}/outcomes/${outcomeId}/b2a-context`,
          lens: "bc",
        });
      }
    }

    const grouped = {};
    for (const row of enriched) {
      grouped[row.principleCode] = grouped[row.principleCode] || [];
      grouped[row.principleCode].push(row);
    }

    return res.render("pages/assessments/collaborator-view", {
      pageTitle: "Your assigned outcomes",
      labels,
      assessment,
      enriched,
      grouped,
      currentUser,
    });
  });

  // RECOMMENDATIONS DASHBOARD
  router.get("/assessments/current/recommendations", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);
    ensurePrototypeRecommendationSeed(assessment);
    ensureIipStage2Data(assessment);
    const { ad, bc } = getOutcomesForVersion(assessment);
    const stage2 = assessment.improvementPlan.stage2;
    const stage1Items = (assessment.assurance.stage1Report && assessment.assurance.stage1Report.items) || [];
    enrichStage2RowsWithStage1Data(stage2.rows, stage1Items);
    seedPrototypeStage2RowData(stage2.rows);
    const bcRows = stage2.rows.filter((r) => r.outcomeId && /^B/i.test(r.outcomeId));
    const groups = buildRecommendationGroups(bcRows, buildIIPOutcomesTree(ad, bc));
    const totalRows = bcRows.length;
    const completedRows = bcRows.filter((r) => isStage2RowComplete(r)).length;
    return res.render("pages/assessments/recommendations-dashboard", {
      pageTitle: "Assurer recommendations",
      labels,
      assessment,
      groups,
      totalRows,
      completedRows,
      stage2,
      finalisedAt: formatDateShort(parseDateISO(assessment.assurance.stage1Report.finalisedAt || "")) || "",
    });
  });

  // SINGLE RECOMMENDATION DETAIL
  router.get("/assessments/current/recommendations/:rowId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);
    ensurePrototypeRecommendationSeed(assessment);
    ensureIipStage2Data(assessment);
    const { ad } = getOutcomesForVersion(assessment);
    const stage2 = assessment.improvementPlan.stage2;
    const stage1Items = (assessment.assurance.stage1Report && assessment.assurance.stage1Report.items) || [];
    enrichStage2RowsWithStage1Data(stage2.rows, stage1Items);
    seedPrototypeStage2RowData(stage2.rows);
    const rowId = (req.params.rowId || "").toString();
    const row = stage2.rows.find((r) => r.id === rowId);
    if (!row) return res.redirect("/assessments/current/recommendations");
    const allOutcomes = flattenAllOutcomes(ad);
    const outcomeRef = allOutcomes.find((o) => o.id === row.outcomeId) || {};
    const principleRef = findPrincipleForOutcome(ad, row.outcomeId) || {};
    const objectiveRef = findObjectiveForOutcome(ad, row.outcomeId) || {};
    const enrichedRow = {
      ...row,
      outcomeCode: outcomeRef.code || row.outcomeCode || row.outcomeId,
      outcomeTitle: outcomeRef.title || row.outcomeTitle,
      outcomeDescription: outcomeRef.description || "",
      principleTitle: principleRef.title || "",
      principleCode: principleRef.code || "",
      objectiveTitle: objectiveRef.title || "",
      objectiveCode: objectiveRef.code || "",
    };
    return res.render("pages/assessments/recommendation-detail", {
      pageTitle: `${enrichedRow.outcomeCode} – Recommendation`,
      labels,
      assessment,
      row: enrichedRow,
      backHref: "/assessments/current/recommendations",
    });
  });

  // IIP READY FOR INTERNAL REVIEW
  router.get("/assessments/current/iip/ready-for-review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);
    ensurePrototypeRecommendationSeed(assessment);
    ensureIipStage2Data(assessment);
    const stage2 = assessment.improvementPlan.stage2;
    const stage1Items = (assessment.assurance.stage1Report && assessment.assurance.stage1Report.items) || [];
    enrichStage2RowsWithStage1Data(stage2.rows, stage1Items);
    seedPrototypeStage2RowData(stage2.rows);
    const bcRows = stage2.rows.filter((r) => r.outcomeId && /^B/i.test(r.outcomeId));
    const totalRows = bcRows.length;
    const completedRows = bcRows.filter((r) => isStage2RowComplete(r)).length;
    const allComplete = completedRows === totalRows && totalRows > 0;
    const alreadyMarked = ["ready_for_review", "internally_signed_off", "rework_internally_signed_off", "submitted_to_assurer"].includes(stage2.status);
    return res.render("pages/assessments/iip-ready-for-review", {
      pageTitle: "Mark IIP as ready for internal review",
      labels,
      assessment,
      stage2,
      totalRows,
      completedRows,
      allComplete,
      alreadyMarked,
      saved: req.query.saved === "1",
    });
  });

  router.post("/assessments/current/iip/ready-for-review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);
    ensureIipStage2Data(assessment);
    const stage2 = assessment.improvementPlan.stage2;
    const immutable = ["internally_signed_off", "rework_internally_signed_off", "submitted_to_assurer", "submitted_to_mhclg"];
    if (!immutable.includes(stage2.status)) {
      stage2.status = "ready_for_review";
      stage2.timeline.lastUpdatedAt = new Date().toISOString();
    }
    assessment.updatedAt = new Date().toISOString();
    return res.redirect("/assessments/current/iip/ready-for-review?saved=1");
  });

  // FINALISE ASSESSMENT RECORD
  router.get("/assessments/current/finalise", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);
    ensurePrototypeRecommendationSeed(assessment);
    ensureIipStage2Data(assessment);
    const stage1 = assessment.assurance.stage1Report || {};
    const stage2 = assessment.improvementPlan.stage2;
    const stage1Items = (stage1.items) || [];
    enrichStage2RowsWithStage1Data(stage2.rows, stage1Items);
    seedPrototypeStage2RowData(stage2.rows);
    const assuranceSummary = buildAssuranceSummary(assessment);
    const totalRows = stage2.rows.length;
    const completedRows = stage2.rows.filter((r) => isStage2RowComplete(r)).length;
    const iipStatusLabel = formatStage2Status(stage2.status || "not_started");
    const alreadyFinalised = Boolean(assessment.finalised && assessment.finalised.at);
    const currentUser = req.session.data.user || null;
    const errors = req.query.error ? [{ text: "You must confirm the declaration before finalising." }] : [];
    return res.render("pages/assessments/finalise", {
      pageTitle: "Finalise assessment record",
      labels,
      assessment,
      stage1,
      stage2,
      assuranceSummary,
      totalRows,
      completedRows,
      iipStatusLabel,
      alreadyFinalised,
      finalised: assessment.finalised || null,
      currentUser,
      councilName: assessment.councilName || "Your council",
      finalisedAtDisplay: alreadyFinalised ? formatDateShort(parseDateISO(assessment.finalised.at)) : "",
      errors,
    });
  });

  router.post("/assessments/current/finalise", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    const confirmed = (req.session.data.finaliseConfirm || "").toString();
    const declarantName = (req.session.data.finaliseDeclarantName || "").toString().trim();
    const declarantRole = (req.session.data.finaliseDeclarantRole || "").toString().trim();
    if (confirmed !== "yes" || !declarantName) {
      return res.redirect("/assessments/current/finalise?error=1");
    }
    const now = new Date();
    const year = now.getFullYear();
    const refNum = String(Math.floor(Math.random() * 900) + 100);
    assessment.finalised = {
      at: now.toISOString(),
      by: declarantName,
      role: declarantRole || "CAF Lead",
      ref: `WCAF-${year}-${refNum}`,
    };
    assessment.updatedAt = now.toISOString();
    delete req.session.data.finaliseConfirm;
    delete req.session.data.finaliseDeclarantName;
    delete req.session.data.finaliseDeclarantRole;
    return res.redirect("/assessments/current/finalise/confirmation");
  });

  router.get("/assessments/current/finalise/confirmation", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!assessment.finalised || !assessment.finalised.at) {
      return res.redirect("/assessments/current/finalise");
    }
    return res.render("pages/assessments/finalise-confirmation", {
      pageTitle: "Assessment finalised",
      labels,
      assessment,
      finalised: assessment.finalised,
      finalisedAtDisplay: formatDateTimeDisplay(assessment.finalised.at),
      councilName: assessment.councilName || "Your council",
    });
  });

  // IIP REPORT
  router.get("/assessments/current/iip-report", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);
    ensurePrototypeRecommendationSeed(assessment);
    ensureIipStage2Data(assessment);
    const { ad, bc } = getOutcomesForVersion(assessment);
    const stage2 = assessment.improvementPlan.stage2;
    const stage1Items = (assessment.assurance.stage1Report && assessment.assurance.stage1Report.items) || [];
    enrichStage2RowsWithStage1Data(stage2.rows, stage1Items);
    seedPrototypeStage2RowData(stage2.rows);
    const bcRows = stage2.rows.filter((r) => r.outcomeId && /^B/i.test(r.outcomeId));
    const groups = buildRecommendationGroups(bcRows, buildIIPOutcomesTree(ad, bc));
    const totalRows = bcRows.length;
    const completedRows = bcRows.filter((r) => isStage2RowComplete(r)).length;
    return res.render("pages/assessments/iip-report", {
      pageTitle: "Improvement & Implementation Plan",
      labels,
      assessment,
      groups,
      totalRows,
      completedRows,
      stage2,
      finalisedAt: formatDateShort(parseDateISO(assessment.assurance.stage1Report.finalisedAt || "")) || "",
      councilName: assessment.councilName || "Your council",
      generatedAt: formatDateTimeDisplay(new Date().toISOString()),
    });
  });

  router.get("/assessments/current/start-self-assessment/people", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req) && !requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    const currentUser = req.session.data.user || null;
    const contributors = ensureSelfAssessContributors(assessment, currentUser).map((person) => ({
      ...person,
      isLead: Boolean(currentUser && person.id === currentUser.id),
    }));

    return res.render("pages/assessments/start-self-assessment-people", {
      pageTitle: "Add people where they are needed",
      labels,
      assessment,
      contributors,
      saved: (req.query.saved || "").toString(),
      savedName: (req.query.name || "").toString(),
      returnTo: (req.query.returnTo || "").toString(),
      form: {
        name: "",
        email: "",
      },
      error: null,
    });
  });

  router.post("/assessments/current/start-self-assessment/people", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req) && !requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    const currentUser = req.session.data.user || null;
    const contributors = ensureSelfAssessContributors(assessment, currentUser);
    const name = (req.session.data.selfAssessPersonName || "").toString().trim();
    const email = (req.session.data.selfAssessPersonEmail || "").toString().trim();
    const errors = [];
    if (!name) errors.push({ field: "selfAssessPersonName", text: "Enter a name." });
    if (!email) errors.push({ field: "selfAssessPersonEmail", text: "Enter an email address." });

    if (errors.length > 0) {
      return res.render("pages/assessments/start-self-assessment-people", {
        pageTitle: "Add people where they are needed",
        labels,
        assessment,
        contributors: contributors.map((person) => ({
          ...person,
          isLead: Boolean(currentUser && person.id === currentUser.id),
        })),
        form: { name, email },
        error: { items: errors },
      });
    }

    const exists = contributors.some(
      (c) =>
        c.name.toLowerCase() === name.toLowerCase() ||
        (c.email && c.email.toLowerCase() === email.toLowerCase())
    );
    if (!exists) {
      contributors.push({
        id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        email,
        role: "council",
      });
      assessment.updatedAt = new Date().toISOString();
    }

    delete req.session.data.selfAssessPersonName;
    delete req.session.data.selfAssessPersonEmail;
    const addReturnTo = (req.session.data.returnTo || "").toString();
    delete req.session.data.returnTo;
    const addReturnParam = addReturnTo ? `&returnTo=${encodeURIComponent(addReturnTo)}` : "";
    return res.redirect(`/assessments/current/start-self-assessment/people?saved=person-added&name=${encodeURIComponent(name)}${addReturnParam}`);
  });

  router.post("/assessments/current/start-self-assessment/people/:personId/remove", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req) && !requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    const currentUser = req.session.data.user || null;
    const contributors = ensureSelfAssessContributors(assessment, currentUser);
    const personId = (req.params.personId || "").toString();

    const target = contributors.find((c) => c.id === personId);
    const removedName = target && target.name ? target.name : "Person";
    if (target && target.id !== (currentUser && currentUser.id)) {
      assessment.selfAssessContributors = contributors.filter((c) => c.id !== personId);

      if (assessment.progressTracker) {
        for (const key of Object.keys(assessment.progressTracker)) {
          const row = assessment.progressTracker[key];
          if (!row) continue;
          if (row.ownerId === personId) row.ownerId = "";
          row.collaboratorIds = coerceArray(row.collaboratorIds).filter((id) => id !== personId);
        }
      }
      if (assessment.selfAssess && assessment.selfAssess.bc) {
        for (const systemId of Object.keys(assessment.selfAssess.bc)) {
          const system = assessment.selfAssess.bc[systemId] || {};
          const outcomes = system.outcomes || {};
          for (const outcomeId of Object.keys(outcomes)) {
            const saved = outcomes[outcomeId] || {};
            if (saved.ownerId === personId) saved.ownerId = "";
            saved.collaboratorIds = coerceArray(saved.collaboratorIds).filter((id) => id !== personId);
            outcomes[outcomeId] = saved;
          }
          system.outcomes = outcomes;
          assessment.selfAssess.bc[systemId] = system;
        }
      }
      assessment.updatedAt = new Date().toISOString();
    }

    const removeReturnTo = (req.session.data.returnTo || "").toString();
    delete req.session.data.returnTo;
    const removeReturnParam = removeReturnTo ? `&returnTo=${encodeURIComponent(removeReturnTo)}` : "";
    return res.redirect(`/assessments/current/start-self-assessment/people?saved=person-removed&name=${encodeURIComponent(removedName)}${removeReturnParam}`);
  });

  router.get("/assessments/current/start-self-assessment/assignments", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req) && !requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    ensureProgressTrackerForStart(assessment);
    const currentUser = req.session.data.user || null;
    const assignmentUsers = buildAssignmentUsers(assessment, currentUser);
    const allRows = buildAssignableRows(assessment);
    const rows = (isRoundTwoRequest(req) ? allRows.filter((r) => r.lens === "bc") : allRows)
      .slice()
      .sort((a, b) => {
        const codeCompare = String(a.outcomeCode || "").localeCompare(String(b.outcomeCode || ""));
        if (codeCompare !== 0) return codeCompare;
        return String(a.systemName || "").localeCompare(String(b.systemName || ""));
      })
      .map((row) => {
        const assignment = buildAssignmentDisplay(
          assignmentUsers,
          row.ownerId,
          row.collaboratorIds,
          row.additionalCollaborators
        );
        return {
          outcomeId: row.outcomeId,
          outcomeCode: row.outcomeCode,
          title: row.title,
          lens: row.lens || "ad",
          systemName: row.systemName || "",
          ownerName: assignment.ownerName || "Unassigned",
          collaboratorCount:
            assignment.collaboratorNames.length + assignment.additionalCollaboratorNames.length,
          isAssigned: Boolean(row.ownerId),
        };
      });

    const assignedCount = rows.filter((row) => row.isAssigned).length;

    return res.render("pages/assessments/start-self-assessment-assignments", {
      pageTitle: "Assign outcome owners and contributors",
      labels,
      assessment,
      rows,
      assignedCount,
      totalCount: rows.length,
      saved: (req.query.saved || "").toString(),
      savedName: (req.query.name || "").toString(),
    });
  });

  router.post("/assessments/current/start-self-assessment/assignments", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req) && !requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;
    assessment.whoInvolvedStepCompleted = true;
    assessment.updatedAt = new Date().toISOString();
    return res.redirect("/assessments/current/journey");
  });

  router.get("/assessments/current/start-self-assessment/assignments/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req) && !requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    ensureProgressTrackerForStart(assessment);
    const row = getAssignableRowById(assessment, req.params.outcomeId);
    if (!row) {
      return res.redirect("/assessments/current/start-self-assessment/assignments");
    }

    const currentUser = req.session.data.user || null;
    const councilUsers = buildAssignmentUsers(assessment, currentUser);
    const contributorUsers = councilUsers.filter((u) => u.id !== (row.ownerId || ""));

    return res.render("pages/assessments/start-self-assessment-assign-outcome", {
      pageTitle: `Assign this outcome: ${row.outcomeCode}`,
      labels,
      assessment,
      row,
      councilUsers,
      contributorUsers,
      returnTo: (req.query.returnTo || "").toString(),
      error: null,
    });
  });

  router.post("/assessments/current/start-self-assessment/assignments/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req) && !requireAssessmentPermission(req, res, PERMISSIONS.EDIT_CONTENT)) return;

    ensureProgressTrackerForStart(assessment);
    const row = getAssignableRowById(assessment, req.params.outcomeId);
    if (!row) {
      return res.redirect("/assessments/current/start-self-assessment/assignments");
    }

    const currentUser = req.session.data.user || null;
    const councilUsers = buildAssignmentUsers(assessment, currentUser);
    const allowedIds = new Set(councilUsers.map((u) => u.id));

    const ownerId = (req.session.data.ownerId || "").toString();
    const collaboratorIds = coerceArray(req.session.data.collaboratorIds).filter((id) =>
      allowedIds.has(id) && id !== ownerId
    );
    const additionalCollaborators = (req.session.data.additionalCollaborators || "")
      .toString()
      .trim();

    const errors = [];
    if (!ownerId || !allowedIds.has(ownerId)) {
      errors.push({ field: "ownerId", text: "Select an assigned owner." });
    }

    if (errors.length > 0) {
      const contributorUsers = councilUsers.filter((u) => u.id !== ownerId);
      return res.render("pages/assessments/start-self-assessment-assign-outcome", {
        pageTitle: `Assign this outcome: ${row.outcomeCode}`,
        labels,
        assessment,
        row: {
          ...row,
          ownerId,
          collaboratorIds,
          additionalCollaborators,
        },
        councilUsers,
        contributorUsers,
        error: { items: errors },
      });
    }

    upsertAssignmentForOutcome(assessment, row, {
      ownerId,
      collaboratorIds,
      additionalCollaborators,
    });
    assessment.updatedAt = new Date().toISOString();

    clearOutcomeAssignmentForm(req);

    const assignmentName = `${row.outcomeCode} ${row.title}`.trim();
    const assignReturnTo = (req.session.data.returnTo || "").toString();
    delete req.session.data.returnTo;
    const isBC = req.params.outcomeId.includes(":");
    const defaultReturn = isRoundTwoRequest(req)
      ? (isBC ? "/assessments/current/self-assessment/bc" : "/assessments/current/self-assessment/ad")
      : "/assessments/current/start-self-assessment/assignments";
    const redirectBase = assignReturnTo || defaultReturn;
    return res.redirect(`${redirectBase}?saved=assignment&name=${encodeURIComponent(assignmentName)}`);
  });

  // DASHBOARD (Progress tracker hub)
  router.get("/assessments/current/dashboard", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);
    ensureIipStage2Data(assessment);
    const roundTwo = isRoundTwoRequest(req);
    const currentUser = req.session.data.user || null;
    const assurerAccess = getAssurerAccessContext(currentUser, assessment);
    const isAssurerView = assurerAccess.isAssurer;
    if (isAssurerView && !assurerAccess.isAssignedAssessment) {
      return res.status(403).render("pages/errors/restricted", {
        pageTitle: "Access restricted",
      });
    }
    const { ad, bc } = getOutcomesForVersion(assessment);
    const prototypeAdIds = flattenOutcomes(ad).map((outcome) => outcome.id);

    if (!assessment.progressTracker || Object.keys(assessment.progressTracker).length === 0) {
      assessment.progressTracker = buildInitialProgressTracker({
        outcomesTree: ad,
        users,
      });
      assessment.progressTracker = filterProgressTrackerByOutcomeIds(
        assessment.progressTracker,
        prototypeAdIds
      );
      assessment.updatedAt = new Date().toISOString();
    } else {
      const filteredProgressTracker = filterProgressTrackerByOutcomeIds(
        assessment.progressTracker,
        prototypeAdIds
      );
      if (Object.keys(filteredProgressTracker).length !== Object.keys(assessment.progressTracker).length) {
        assessment.progressTracker = filteredProgressTracker;
        assessment.updatedAt = new Date().toISOString();
      }
    }

    if (Object.keys(assessment.progressTracker).length === 0) {
      assessment.progressTracker = buildInitialProgressTracker({
        outcomesTree: ad,
        users,
      });
      assessment.progressTracker = filterProgressTrackerByOutcomeIds(
        assessment.progressTracker,
        prototypeAdIds
      );
      assessment.updatedAt = new Date().toISOString();
    }

    const query = normaliseQuery(req.query);
    const currentUserId =
      req.session.data.user && req.session.data.user.id ? req.session.data.user.id : null;

    const allRowsAd = Object.values(assessment.progressTracker)
      .filter((row) => prototypeAdIds.includes(row.outcomeId))
      .map((row) => ({
        ...deriveRowFlags(row, statuses, { currentUserId }),
        lens: "ad",
        linkUrl:
          roundTwo && !isAssurerView
            ? `/self-assess/ad/${row.outcomeId}`
            : `/assessments/current/outcomes/${row.outcomeId}`,
        selfAssessUrl:
          isAssurerView
            ? `/assessments/current/outcomes/${row.outcomeId}`
            : `/self-assess/ad/${row.outcomeId}`,
        systemName: "",
        carriedForwardFlag:
          Boolean(
            assessment.selfAssess &&
            assessment.selfAssess.ad &&
            assessment.selfAssess.ad[row.outcomeId] &&
            assessment.selfAssess.ad[row.outcomeId].carriedForward &&
            assessment.selfAssess.ad[row.outcomeId].reviewRequired
          ),
        ownerName: getParticipantName(assessment, row.ownerId, req.session.data.user) || "Unassigned",
        collaboratorCount:
          (Array.isArray(row.collaboratorIds) ? row.collaboratorIds.length : 0) +
          parseAdditionalCollaborators(row.additionalCollaborators).length,
      }));

    const bcRows = buildBCOutcomeRows(assessment, bc).map((row) => ({
      ...row,
      linkUrl: roundTwo && !isAssurerView ? row.selfAssessUrl : row.linkUrl,
      selfAssessUrl: isAssurerView ? row.linkUrl : row.selfAssessUrl,
      carriedForwardFlag: Boolean(row.carriedForward && row.reviewRequired),
      ownerName: getParticipantName(assessment, row.ownerId, req.session.data.user) || "Unassigned",
      collaboratorCount:
        (Array.isArray(row.collaboratorIds) ? row.collaboratorIds.length : 0) +
          parseAdditionalCollaborators(row.additionalCollaborators).length,
    }));
    allRowsAd.forEach((row) => {
      if (row.carriedForwardFlag) {
        row.isNeedsAttention = true;
      }
    });
    bcRows.forEach((row) => {
      if (row.carriedForwardFlag) {
        row.isNeedsAttention = true;
      }
    });
    const adFrameworkChange = roundTwo ? buildFrameworkChangeSummary(assessment, "ad", allRowsAd) : null;
    allRowsAd.forEach((row) => {
      row.frameworkFlag = "";
    });

    const bcFrameworkChange = roundTwo ? buildFrameworkChangeSummary(assessment, "bc", bcRows) : null;
    bcRows.forEach((row) => {
      row.frameworkFlag = "";
    });

    const allRows = allRowsAd.concat(bcRows);
    const dashboardFrameworkChange = null;
    const notifications = buildFeedbackNotifications(allRows);

    const filteredRows = applyDashboardFilters(allRows, query, { currentUserId });

    const grouped = {};
    for (const r of filteredRows) {
      grouped[r.objective] = grouped[r.objective] || {};
      grouped[r.objective][r.principle] = grouped[r.objective][r.principle] || [];
      grouped[r.objective][r.principle].push(r);
    }

    const summaryAll = computeSummary(allRows);
    const summaryFiltered = computeSummary(filteredRows);
    const cycleStartedAt = assessment.cycle ? formatTimestamp(assessment.cycle.startedAt) : "";
    const assuranceSummary = buildAssuranceSummary(assessment);
    const iipStage2Summary = buildIipStage2Summary(assessment);
    const dashboardHref = (overrides = {}) => {
      const qs = buildQueryString({
        lens: query.lens !== "all" ? query.lens : "",
        ...overrides,
      });
      return `/assessments/current/dashboard${qs ? `?${qs}` : ""}`;
    };
    const summaryCards = [
      {
        label: "Needs attention",
        value: summaryAll.needsAttention,
        meta: `Overdue ${summaryAll.overdue}, Blocked ${summaryAll.blocked}, Missing evidence ${summaryAll.missingEvidence}`,
        href: roundTwo
          ? dashboardHref({ workStatus: "needs_attention" })
          : dashboardHref({ view: "attention" }),
        actionText: "View outcomes",
      },
      {
        label: isAssurerView ? "Assessment outcomes" : "My work",
        value: isAssurerView ? summaryAll.total : summaryAll.mine,
        meta: isAssurerView ? "Outcomes in this submitted assessment" : "Assigned to you",
        href: isAssurerView
          ? dashboardHref()
          : roundTwo
            ? dashboardHref({ assigned: "me" })
            : dashboardHref({ view: "my" }),
        actionText: isAssurerView ? "Open submitted assessment" : "Open your work",
      },
      {
        label: "Complete",
        value: summaryAll.complete,
        meta: "Outcomes finished",
        href: roundTwo
          ? dashboardHref({ workStatus: "completed" })
          : dashboardHref({ status: "complete" }),
        actionText: "View completed outcomes",
      },
    ];

    if (!roundTwo) {
      summaryCards.push(
        {
          label: "Assurance report",
          value: assuranceSummary.reportStatus,
          meta: `Record of Audit: ${assuranceSummary.recordStatus}`,
          href: "/assessments/current/assurance-report",
          actionText: "Open assurance report",
        },
        {
          label: "IIP Stage 2",
          value: iipStage2Summary.statusLabel,
          meta: iipStage2Summary.expectedByDisplay
            ? `Offline drafting target: ${iipStage2Summary.expectedByDisplay}`
            : "No target date yet",
          href: iipStage2Summary.nextActionHref,
          actionText: "Open IIP Stage 2",
        },
        {
          label: "Evidence requests",
          value: assuranceSummary.openEvidenceRequests,
          meta: "Open evidence clarification requests",
          href: "/assessments/current/evidence-requests",
          actionText: "Open requests",
        }
      );
    }
    const collaborationState = isRoundTwoRequest(req)
      ? getCollaborationWorkflowState(assessment, req.session.data.user || null)
      : null;
    if (roundTwo && !isAssurerView) {
      ensureAssurancePlanningData(assessment);
    }
    const bcSystems = buildBCSystemRows(assessment, bc);
    const dashboardPhase = roundTwo && !isAssurerView
      ? buildDashboardPhase(collaborationState, assessment)
      : null;
    const adDashboardRows = roundTwo && !isAssurerView
      ? flattenOutcomes(ad).map((outcome) => {
          const saved = (assessment.selfAssess && assessment.selfAssess.ad && assessment.selfAssess.ad[outcome.id]) || {};
          const carriedForward = Boolean(saved.carriedForward);
          const reviewRequired = Boolean(saved.reviewRequired);
          const started = hasStartedIgpAssessmentRow(saved);
          const statusLabel = (carriedForward && reviewRequired) ? "Needs review"
            : saved.judgement ? "Complete"
            : started ? "In progress"
            : "Not started";
          const statusTagClass = (carriedForward && reviewRequired) ? "govuk-tag--yellow"
            : saved.judgement ? "govuk-tag--green"
            : started ? "govuk-tag--blue"
            : "govuk-tag--grey";
          const actionText = (saved.judgement || (carriedForward && reviewRequired)) ? "Review" : started ? "Continue" : "Start";
          return {
            outcomeId: outcome.id,
            code: outcome.code,
            title: outcome.title,
            judgement: saved.judgement || "",
            statusLabel,
            statusTagClass,
            actionText,
            actionHref: `/self-assess/ad/${outcome.id}`,
          };
        })
      : null;
    res.render("pages/assessments/dashboard", {
      pageTitle: labels.dashboard.pageTitle,
      labels,
      statuses,
      users,
      assessment,
      cycleStartedAt,
      query,
      grouped,
      summaryCards,
      summaryAll,
      summaryFiltered,
      bcSystems,
      adDashboardRows,
      notifications,
      assuranceSummary,
      iipStage2Summary,
      dashboardFrameworkChange,
      collaborationState,
      dashboardPhase,
      assurancePlanningSummary: roundTwo && !isAssurerView
        ? buildAssurancePlanningSummary(assessment, collaborationState)
        : null,
      assurerAccess,
      isAssurerView,
      currentUserId,
      buildQueryString,
    });
  });

  router.get("/assessments/current/summary", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAssessmentData(assessment);

    const { ad, bc } = getOutcomesForVersion(assessment);
    const adSummary = buildObjectiveSummary({
      outcomesTree: ad,
      assessment,
      lens: "ad",
    });
    const bcSummary = buildObjectiveSummary({
      outcomesTree: bc,
      assessment,
      lens: "bc",
    });
    const gaps = buildKeyGaps({ assessment, outcomesAD: ad, outcomesBC: bc });

    res.render("pages/assessments/summary", {
      pageTitle: "Resilience summary",
      labels,
      assessment,
      adSummary,
      bcSummary,
      gaps,
    });
  });

  // OUTCOME DETAIL (progress tracker record)
  router.get("/assessments/current/outcomes/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    const currentUser = req.session.data.user || null;
    const assurerAccess = getAssurerAccessContext(currentUser, assessment);
    if (assurerAccess.isAssurer && !assurerAccess.isAssignedAssessment) {
      return res.status(403).render("pages/errors/restricted", {
        pageTitle: "Access restricted",
      });
    }

    const outcomeId = req.params.outcomeId;
    const row = assessment.progressTracker && assessment.progressTracker[outcomeId];
    const { bc } = getOutcomesForVersion(assessment);
    const bcRow = getBCOverviewRow(assessment, bc, outcomeId);
    const outcomeRow = row || bcRow;

    if (!outcomeRow) {
      const bcOutcome = findOutcomeInTree(bc, outcomeId);
      if (bcOutcome) {
        const scope = assessment.scope || {};
        const shortlist = Array.isArray(scope.priorityShortlist) ? scope.priorityShortlist : [];
        const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
        const targetSystemId = shortlist[0] || (systems[0] ? systems[0].id : "");
        if (targetSystemId) {
          return res.redirect(
            `/assessments/current/outcomes/${encodeURIComponent(targetSystemId)}:${encodeURIComponent(outcomeId)}`
          );
        }
        return res.redirect("/assessments/current/dashboard?lens=bc&view=all");
      }
      return res.status(404).render("pages/errors/not-found", {
        pageTitle: "Page not found",
        labels,
        message: "Outcome not found in this assessment.",
      });
    }

    return renderAssessmentOutcomePage(req, res, assessment, outcomeRow, {
      query: normaliseQuery(req.query),
      savedAssurance: (req.query.saved || "").toString() === "assurance",
    });
  });

  router.get("/assessments/current/outcomes/:outcomeId/transition", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    const currentUser = req.session.data.user || null;
    const assurerAccess = getAssurerAccessContext(currentUser, assessment);
    if (assurerAccess.isAssurer) {
      return res.redirect("/assessments/current/dashboard");
    }

    const outcomeId = req.params.outcomeId;
    const row = assessment.progressTracker && assessment.progressTracker[outcomeId];
    const { bc } = getOutcomesForVersion(assessment);
    const bcRow = getBCOverviewRow(assessment, bc, outcomeId);
    const outcomeRow = row || bcRow;

    if (!outcomeRow) {
      return res.status(404).render("pages/errors/not-found", {
        pageTitle: "Page not found",
        labels,
        message: "Outcome not found in this assessment.",
      });
    }

    const requestedStage = (req.query.stage || "").toString();
    const stage = isOutcomeTransitionStage(requestedStage) ? requestedStage : outcomeRow.status;
    if (!isOutcomeTransitionStage(stage)) {
      return res.redirect(`/assessments/current/outcomes/${encodeURIComponent(outcomeId)}`);
    }

    const query = normaliseQuery(req.query);
    const transition = buildOutcomeTransitionContent(outcomeRow, stage);
    const qs = buildQueryString(query);

    return res.render("pages/assessments/outcome-transition", {
      pageTitle: transition.title,
      assessment,
      row: outcomeRow,
      transition,
      statusMeta: getStatusMeta(statuses, stage),
      returnHref: `/assessments/current/dashboard${qs ? `?${qs}` : ""}`,
      selfAssessUrl: buildSelfAssessUrl(outcomeRow),
    });
  });

  // OUTCOME DETAIL (actions + save)
  router.post("/assessments/current/outcomes/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    const currentUser = req.session.data.user || null;
    const assurerAccess = getAssurerAccessContext(currentUser, assessment);
    if (assurerAccess.isAssurer && !assurerAccess.isAssignedAssessment) {
      return res.status(403).render("pages/errors/restricted", {
        pageTitle: "Access restricted",
      });
    }

    const outcomeId = req.params.outcomeId;
    const existingAd = assessment.progressTracker && assessment.progressTracker[outcomeId];
    const { bc } = getOutcomesForVersion(assessment);
    const existingBc = getBCOverviewRow(assessment, bc, outcomeId);
    const existing = existingAd || existingBc;
    if (!assurerAccess.isAssurer && !existingAd && parseBCOutcomeId(outcomeId)) {
      const qs = buildQueryString(normaliseQuery(req.query));
      return res.redirect(`${buildSelfAssessUrl({ outcomeId })}${qs ? `?${qs}` : ""}`);
    }

    if (!existing) {
      return res.status(404).render("pages/errors/not-found", {
        pageTitle: "Page not found",
        labels,
        message: "Outcome not found in this assessment.",
      });
    }

    const query = normaliseQuery(req.query);
    if (assurerAccess.isAssurer) {
      const decision = (req.session.data.assurerDecision || "").toString();
      const rationale = (req.session.data.assurerRationale || "").toString().trim();
      const errors = [];

      if (!decision) {
        errors.push({ field: "assurerDecision", text: labels.assurer.errors.decisionRequired });
      }
      if (!rationale) {
        errors.push({ field: "assurerRationale", text: labels.assurer.errors.rationaleRequired });
      }

      if (errors.length > 0) {
        return renderAssessmentOutcomePage(req, res, assessment, existing, {
          query,
          error: { items: errors },
          review: {
            ...(existing.assurerReview || {}),
            decision,
            rationale,
          },
        });
      }

      saveAssurerOutcomeReview(assessment, outcomeId, existing, currentUser, {
        decision,
        rationale,
      });
      delete req.session.data.assurerDecision;
      delete req.session.data.assurerRationale;

      return res.redirect(
        `/assessments/current/outcomes/${encodeURIComponent(outcomeId)}?saved=assurance`
      );
    }

    const action = (req.session.data.action || "").toString();

    // Pull form data from session (Prototype Kit convention)
    const ownerId = (req.session.data.ownerId || "").toString();
    const collaboratorIds = coerceArray(req.session.data.collaboratorIds).filter(Boolean);
    const additionalCollaborators = (req.session.data.additionalCollaborators || "").toString().trim();

    const status = (req.session.data.progressStatus || "").toString();
    const dueDate = (req.session.data.dueDate || "").toString().trim();

    const updateText = (req.session.data.updateText || "").toString().trim();
    const blockerInput = (req.session.data.blocker || "").toString().trim();
    const nextStep = (req.session.data.nextStep || "").toString().trim();

    const evidenceRefsFromForm = normaliseEvidenceRefs(req.session.data.evidenceRefs);
    const evidenceRefs = ensureAtLeastOneEvidenceRow(evidenceRefsFromForm);
    const ownerIdValue = ownerId || existing.ownerId;
    const statusValue = status || existing.status;
    const blockerValue =
      statusValue === "blocked" ? blockerInput || existing.blocker || "" : "";
    const statusMeta = getStatusMeta(statuses, statusValue);
    const assignment = buildAssignmentDisplay(
      buildAssignmentUsers(assessment, req.session.data.user || null),
      ownerIdValue,
      collaboratorIds,
      additionalCollaborators
    );
    const history = Array.isArray(existing.history) ? existing.history : [];
    const latestUpdate = getLatestHistoryEntry(history);
    const selfAssessSummary = buildSelfAssessSummary(assessment, outcomeId);
    const outcomeGuidance = buildOutcomeGuidance(existing.outcomeCode);
    const selfAssessUrl = buildSelfAssessUrl(existing);
    const latestSavedUpdate = getLatestHistoryEntry(history);

    if (action === "shareForReview") {
      const shareErrors = validateShareForReview({
        ownerId: ownerIdValue,
        selfAssessSummary,
        updateText,
        latestUpdate: latestSavedUpdate,
      });

      if (shareErrors.length > 0) {
        clearOutcomeFormAction(req);
        return res.render("pages/assessments/outcome", {
          pageTitle: `${labels.outcome.pageTitlePrefix} ${existing.outcomeCode}`,
          labels,
          statuses,
          users: buildAssignmentUsers(assessment, req.session.data.user || null),
          row: {
            ...existing,
            ownerId: ownerIdValue,
            collaboratorIds,
            additionalCollaborators,
            status: statusValue,
            dueDate,
            dueDateInput: formatDateForInput(dueDate),
            updateText,
            blocker: blockerValue,
            nextStep,
            evidenceRefs,
            history: formatHistoryEntries(history),
          },
          statusMeta,
          ownerName: assignment.ownerName,
          collaboratorNames: assignment.collaboratorNames,
          additionalCollaboratorNames: assignment.additionalCollaboratorNames,
          lastUpdatedAt: latestUpdate ? formatTimestamp(latestUpdate.at) : "",
          lastUpdatedBy: latestUpdate ? latestUpdate.by : "",
          query,
          selfAssessSummary,
          outcomeGuidance,
          selfAssessUrl,
          error: { items: shareErrors },
        });
      }

      const actor = req.session.data.user ? req.session.data.user.name : "Unknown user";
      const nowIso = new Date().toISOString();
      const previouslyShared =
        existing.status === "ready_for_internal_review" || existing.status === "internally_reviewed";
      const shareSummary = previouslyShared
        ? "Updated and marked ready for internal review again."
        : "Marked ready for internal review.";

      history.push({
        at: nowIso,
        by: actor,
        summary: shareSummary,
        status: "ready_for_internal_review",
        statusLabel: getStatusLabel(statuses, "ready_for_internal_review"),
        dueDate: dueDate || existing.dueDate || "",
        blocker: "",
        nextStep: "Internal review needed",
      });

      assessment.progressTracker[outcomeId] = {
        ...existing,
        ownerId: ownerIdValue,
        collaboratorIds,
        additionalCollaborators,
        status: "ready_for_internal_review",
        dueDate,
        blocker: "",
        nextStep: "Internal review needed",
        evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
        history,
        assuranceShare: {
          sharedBy: actor,
          sharedAt: nowIso,
          shareCount: ((existing.assuranceShare && Number(existing.assuranceShare.shareCount)) || 0) + 1,
        },
        updatedAt: nowIso,
      };
      assessment.updatedAt = nowIso;
      clearOutcomeForm(req);

      const qs = buildQueryString(query);
      return res.redirect(
        `/assessments/current/outcomes/${encodeURIComponent(outcomeId)}/transition?stage=ready_for_internal_review${qs ? `&${qs}` : ""}`
      );
    }

    // Handle add/remove evidence actions without validation
    if (action === "addEvidence") {
      evidenceRefs.push(blankEvidenceRef());
      clearOutcomeFormAction(req);

      return res.render("pages/assessments/outcome", {
        pageTitle: `${labels.outcome.pageTitlePrefix} ${existing.outcomeCode}`,
        labels,
        statuses,
        users: buildAssignmentUsers(assessment, req.session.data.user || null),
        row: {
          ...existing,
          ownerId: ownerIdValue,
          collaboratorIds,
          additionalCollaborators,
          status: statusValue,
          dueDate,
          dueDateInput: formatDateForInput(dueDate),
          updateText,
          blocker: blockerValue,
          nextStep,
          evidenceRefs,
          history: formatHistoryEntries(history),
        },
        statusMeta,
        ownerName: assignment.ownerName,
        collaboratorNames: assignment.collaboratorNames,
        additionalCollaboratorNames: assignment.additionalCollaboratorNames,
        lastUpdatedAt: latestUpdate ? formatTimestamp(latestUpdate.at) : "",
        lastUpdatedBy: latestUpdate ? latestUpdate.by : "",
        query,
        selfAssessSummary,
        outcomeGuidance,
        selfAssessUrl,
        error: null,
      });
    }

    if (action.startsWith("removeEvidence:")) {
      const idxStr = action.split(":")[1];
      const idx = parseInt(idxStr, 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < evidenceRefs.length) {
        evidenceRefs.splice(idx, 1);
      }
      const safeEvidence = ensureAtLeastOneEvidenceRow(evidenceRefs);
      clearOutcomeFormAction(req);

      return res.render("pages/assessments/outcome", {
        pageTitle: `${labels.outcome.pageTitlePrefix} ${existing.outcomeCode}`,
        labels,
        statuses,
        users: buildAssignmentUsers(assessment, req.session.data.user || null),
        row: {
          ...existing,
          ownerId: ownerIdValue,
          collaboratorIds,
          additionalCollaborators,
          status: statusValue,
          dueDate,
          dueDateInput: formatDateForInput(dueDate),
          updateText,
          blocker: blockerValue,
          nextStep,
          evidenceRefs: safeEvidence,
          history: formatHistoryEntries(history),
        },
        statusMeta,
        ownerName: assignment.ownerName,
        collaboratorNames: assignment.collaboratorNames,
        additionalCollaboratorNames: assignment.additionalCollaboratorNames,
        lastUpdatedAt: latestUpdate ? formatTimestamp(latestUpdate.at) : "",
        lastUpdatedBy: latestUpdate ? latestUpdate.by : "",
        query,
        selfAssessSummary,
        outcomeGuidance,
        selfAssessUrl,
        error: null,
      });
    }

    const hasChanges = hasOutcomeChanges({
      existing,
      ownerId: ownerIdValue,
      collaboratorIds,
      additionalCollaborators,
      status: statusValue,
      dueDate,
      blocker: blockerValue,
      nextStep,
      evidenceRefs: evidenceRefsFromForm,
    });

    let updateTextValue = updateText;
    if (!updateTextValue && hasChanges) {
      if (
        ownerIdValue !== existing.ownerId ||
        !arraysEqual(collaboratorIds, existing.collaboratorIds || [])
      ) {
        updateTextValue = "Assignment updated.";
      } else {
        updateTextValue = "Update captured.";
      }
    }

    // Validate on save
    const errors = [];
    if (!ownerIdValue) errors.push({ field: "ownerId", text: labels.errors.ownerRequired });
    if (!statusValue) errors.push({ field: "progressStatus", text: labels.errors.statusRequired });
    if (
      statusValue === "blocked" ||
      statusValue === "not_started"
    ) {
      const blockerReason = blockerInput || existing.blocker || "";
      if (!blockerReason) errors.push({ field: "blocker", text: labels.errors.blockerRequired });
    }
    const evidenceError = validateEvidenceRefs(evidenceRefsFromForm, labels);
    if (evidenceError) errors.push({ field: "evidenceRefs", text: evidenceError });

    if (!updateTextValue) {
      updateTextValue = hasChanges ? "Update captured." : "Record reviewed.";
    }

    if (errors.length > 0) {
      clearOutcomeFormAction(req);
      return res.render("pages/assessments/outcome", {
        pageTitle: `${labels.outcome.pageTitlePrefix} ${existing.outcomeCode}`,
        labels,
        statuses,
        users: buildAssignmentUsers(assessment, req.session.data.user || null),
          row: {
          ...existing,
          ownerId: ownerIdValue,
          collaboratorIds,
          additionalCollaborators,
          status: statusValue,
          dueDate,
          dueDateInput: formatDateForInput(dueDate),
          updateText: updateTextValue,
          blocker: blockerValue,
          nextStep,
          evidenceRefs,
          history: formatHistoryEntries(history),
        },
        statusMeta,
        ownerName: assignment.ownerName,
        collaboratorNames: assignment.collaboratorNames,
        additionalCollaboratorNames: assignment.additionalCollaboratorNames,
        lastUpdatedAt: latestUpdate ? formatTimestamp(latestUpdate.at) : "",
        lastUpdatedBy: latestUpdate ? latestUpdate.by : "",
        query,
        selfAssessSummary,
        outcomeGuidance,
        selfAssessUrl,
        error: { items: errors },
      });
    }

    // Append-only history entry
    const actor = req.session.data.user ? req.session.data.user.name : "Unknown user";
    const statusLabel = getStatusLabel(statuses, statusValue);

    const newHistoryEntry = {
      at: new Date().toISOString(),
      by: actor,
      summary: updateTextValue,
      status: statusValue,
      statusLabel,
      dueDate: dueDate || "",
      blocker: statusValue === "blocked" ? blockerInput || existing.blocker || "" : "",
      nextStep: nextStep || "",
    };

    history.push(newHistoryEntry);

    assessment.progressTracker[outcomeId] = {
      ...existing,
      ownerId: ownerIdValue,
      collaboratorIds,
      additionalCollaborators,
      status: statusValue,
      dueDate,
      // Structured fields
      blocker: statusValue === "blocked" ? blockerInput || existing.blocker || "" : "",
      nextStep,
      // Evidence refs stored as structured list (IDs/links only)
      evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
      // Append-only history
      history,
      // Keep a simple last-updated stamp
      updatedAt: new Date().toISOString(),
    };

    assessment.updatedAt = new Date().toISOString();

    // Clear form-only fields so the next visit doesn't keep old text in session
    clearOutcomeForm(req);

    const qs = buildQueryString(query);
    if (existing.status !== statusValue && isOutcomeTransitionStage(statusValue)) {
      return res.redirect(
        `/assessments/current/outcomes/${encodeURIComponent(outcomeId)}/transition?stage=${encodeURIComponent(statusValue)}${qs ? `&${qs}` : ""}`
      );
    }
    return res.redirect(`/assessments/current/dashboard${qs ? `?${qs}` : ""}`);
  });
};

function clearOutcomeFormAction(req) {
  delete req.session.data.action;
}

function isOutcomeTransitionStage(value) {
  return (
    value === "ready_for_internal_review" ||
    value === "internally_reviewed" ||
    value === "complete"
  );
}

function buildOutcomeTransitionContent(row, stage) {
  const outcomeName = `${row.outcomeCode} ${row.title || ""}`.trim();

  if (stage === "ready_for_internal_review") {
    return {
      title: "Outcome ready for internal review",
      intro: `${outcomeName} is ready for an internal reviewer to check.`,
      meaning:
        "You have finished the drafting work for this contributing outcome and handed it into the council's internal review stage.",
      nextStep:
        "An internal reviewer can now check whether the judgement is evidence-based and complete. Once the outcome is internally reviewed and completed, it counts towards the wider assessment being internally complete.",
      primaryActionText: "Return to outcomes list",
      secondaryActionText: "Review this outcome again",
    };
  }

  if (stage === "internally_reviewed") {
    return {
      title: "Outcome reviewed internally",
      intro: `${outcomeName} has now been through internal review.`,
      meaning:
        "This outcome has moved on from drafting. It has been checked internally, but it still sits within the wider assessment until the remaining outcomes reach the same point.",
      nextStep:
        "Continue with the remaining contributing outcomes. Independent assurance starts only after the completed assessment is ready, not after an individual outcome is reviewed.",
      primaryActionText: "Return to outcomes list",
      secondaryActionText: "Open this outcome",
    };
  }

  return {
    title: "Outcome complete",
    intro: `${outcomeName} is complete within this assessment.`,
    meaning:
      "This contributing outcome is now finished and contributes to the assessment's internal completion.",
    nextStep:
      "You can continue with any remaining outcomes. When all required outcomes are complete, the assessment can move to independent assurance.",
    primaryActionText: "Return to outcomes list",
    secondaryActionText: "Open this outcome",
  };
}

function clearOutcomeForm(req) {
  delete req.session.data.action;
  delete req.session.data.updateText;
  delete req.session.data.blocker;
  delete req.session.data.nextStep;
  // keep owner/status selections in the saved row, not session
  delete req.session.data.ownerId;
  delete req.session.data.collaboratorIds;
  delete req.session.data.additionalCollaborators;
  delete req.session.data.progressStatus;
  delete req.session.data.dueDate;
  delete req.session.data.evidenceRefs;
}

function clearOutcomeAssignmentForm(req) {
  delete req.session.data.ownerId;
  delete req.session.data.collaboratorIds;
  delete req.session.data.additionalCollaborators;
}

function ensureSelfAssessContributors(assessment, currentUser) {
  if (!assessment) return [];
  if (!Array.isArray(assessment.selfAssessContributors)) {
    assessment.selfAssessContributors = [];
  }

  const list = assessment.selfAssessContributors;

  if (currentUser && currentUser.id) {
    upsertContributor(list, {
      id: currentUser.id,
      name: currentUser.name || "Council lead",
      email: currentUser.email || "",
      role: "council",
    }, { prepend: true });
  }

  return list;
}

function upsertContributor(list, person, options = {}) {
  const prepend = Boolean(options.prepend);
  const name = (person.name || "").toString().trim().toLowerCase();
  const email = (person.email || "").toString().trim().toLowerCase();
  const existingIndex = list.findIndex((entry) => {
    const entryName = (entry.name || "").toString().trim().toLowerCase();
    const entryEmail = (entry.email || "").toString().trim().toLowerCase();
    return (email && entryEmail === email) || (name && entryName === name) || entry.id === person.id;
  });

  if (existingIndex >= 0) {
    list[existingIndex] = {
      ...list[existingIndex],
      ...person,
      id: list[existingIndex].id || person.id,
    };
    if (prepend && existingIndex > 0) {
      const [entry] = list.splice(existingIndex, 1);
      list.unshift(entry);
    }
    return;
  }

  if (prepend) {
    list.unshift(person);
  } else {
    list.push(person);
  }
}

function buildNamedContributor(prefix, name, roleLabel) {
  const trimmedName = (name || "").toString().trim();
  return {
    id: `${prefix}-${slugifyName(trimmedName)}`,
    name: trimmedName,
    email: "",
    role: roleLabel,
  };
}

function slugifyName(value) {
  return (value || "person")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "person";
}

function buildAssignmentUsers(assessment, currentUser) {
  const contributors = ensureSelfAssessContributors(assessment, currentUser);
  const list = contributors.map((person) => ({
    id: person.id,
    name: person.name,
    role: "council",
    email: person.email || "",
  }));
  const ids = new Set(list.map((u) => u.id));

  if (assessment && assessment.progressTracker) {
    for (const row of Object.values(assessment.progressTracker)) {
      const candidateIds = [row.ownerId].concat(coerceArray(row.collaboratorIds));
      for (const id of candidateIds) {
        if (!id || ids.has(id)) continue;
        const fallback = users.find((u) => u.id === id);
        if (fallback) {
          ids.add(fallback.id);
          list.push({
            id: fallback.id,
            name: fallback.name,
            role: "council",
            email: fallback.email || "",
          });
        }
      }
    }
  }
  if (assessment && assessment.selfAssess && assessment.selfAssess.bc) {
    for (const systemId of Object.keys(assessment.selfAssess.bc)) {
      const system = assessment.selfAssess.bc[systemId] || {};
      const outcomes = system.outcomes || {};
      for (const outcomeId of Object.keys(outcomes)) {
        const row = outcomes[outcomeId] || {};
        const candidateIds = [row.ownerId].concat(coerceArray(row.collaboratorIds));
        for (const id of candidateIds) {
          if (!id || ids.has(id)) continue;
          const fallback = users.find((u) => u.id === id);
          if (fallback) {
            ids.add(fallback.id);
            list.push({
              id: fallback.id,
              name: fallback.name,
              role: "council",
              email: fallback.email || "",
            });
          }
        }
      }
    }
  }

  return list;
}

function getParticipantName(assessment, userId, currentUser) {
  if (!userId) return "";
  const assignmentUsers = buildAssignmentUsers(assessment, currentUser);
  const found = assignmentUsers.find((u) => u.id === userId);
  if (found) return found.name;
  return getUserName(users, userId);
}

function getStatusLabel(statusesDef, value) {
  const found = statusesDef.options.find((s) => s.value === value);
  return found ? found.label : value;
}

function hasAnyEvidenceValue(ref) {
  if (!ref) return false;
  return Boolean(ref.title || ref.type || ref.link || ref.description || ref.refId || ref.note);
}

function validateEvidenceRefs(evidenceRefs, labels) {
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0) {
    return labels.errors.evidenceRequired;
  }

  for (const ref of evidenceRefs) {
    if (!ref) continue;
    if (!(ref.title || "").toString().trim()) return "Enter an evidence title for each evidence reference.";
    if (!(ref.link || "").toString().trim()) return "Enter a link for each evidence reference.";
    if (!(ref.description || "").toString().trim()) return "Enter a description for each evidence reference.";
  }

  return "";
}

function getStatusMeta(statusesDef, value) {
  const found = statusesDef.options.find((s) => s.value === value);
  return found || null;
}

function buildScopePackStatus(assessment) {
  const scope = assessment.scope || {};
  const servicesCount = Array.isArray(scope.essentialServices) ? scope.essentialServices.length : 0;
  const systemsCount = Array.isArray(scope.criticalSystems) ? scope.criticalSystems.length : 0;
  const mappingsCount = Array.isArray(scope.mappings) ? scope.mappings.length : 0;
  const isComplete = Boolean(assessment.stage && assessment.stage.prepareScopeComplete);

  if (isComplete) {
    return { label: "Complete", tagClass: "govuk-tag--green", reason: "" };
  }
  if (scope.packStatus === "stalled" || scope.blockerReason) {
    return {
      label: "Stalled",
      tagClass: "govuk-tag--red",
      reason: scope.blockerReason || scope.blockerNotes || "",
    };
  }
  if (servicesCount === 0 && systemsCount === 0 && mappingsCount === 0) {
    return { label: "Not started", tagClass: "govuk-tag--grey", reason: "" };
  }
  return { label: "In progress", tagClass: "govuk-tag--blue", reason: "" };
}

function findOutcomeInTree(outcomesTree, outcomeId) {
  return flattenOutcomes(outcomesTree).find((outcome) => outcome.id === outcomeId) || null;
}

function getLatestHistoryEntry(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  return history[history.length - 1];
}

function buildAssignmentDisplay(usersList, ownerId, collaboratorIds, additionalCollaborators) {
  const ownerName = getUserName(usersList, ownerId);
  const collaboratorNames = Array.isArray(collaboratorIds)
    ? collaboratorIds.map((id) => getUserName(usersList, id)).filter(Boolean)
    : [];
  const additionalCollaboratorNames = parseAdditionalCollaborators(additionalCollaborators);

  return { ownerName, collaboratorNames, additionalCollaboratorNames };
}

function flattenOutcomes(outcomesTree) {
  const flat = [];
  for (const objective of outcomesTree.objectives) {
    for (const principle of objective.principles) {
      for (const outcome of principle.outcomes) {
        flat.push({
          id: outcome.id,
          code: outcome.code,
          title: outcome.title,
          principle: principle.code,
        });
      }
    }
  }
  const lens = outcomesTree && outcomesTree.lens ? String(outcomesTree.lens).toUpperCase() : "";
  const limit = PROTOTYPE_OUTCOME_LIMITS[lens] || 1;
  return flat.slice(0, limit);
}

function flattenAllOutcomes(outcomesTree) {
  const flat = [];
  for (const objective of outcomesTree.objectives) {
    for (const principle of objective.principles) {
      for (const outcome of principle.outcomes) {
        flat.push({
          id: outcome.id,
          code: outcome.code,
          title: outcome.title,
          description: outcome.description || "",
        });
      }
    }
  }
  return flat;
}

function buildFrameworkChangeSummary(assessment, lens, visibleRows) {
  const assessmentVersion = assessment && assessment.cafVersion ? assessment.cafVersion : "3.2";
  const currentVersion = CAF_CURRENT_VERSION;
  if (!assessmentVersion || assessmentVersion === currentVersion) {
    return {
      changed: false,
      assessmentVersion,
      currentVersion,
      summaryText: "",
      updatedIds: [],
      newOutcomes: [],
    };
  }

  const assessmentOutcomes = getOutcomesForVersion(assessmentVersion);
  const currentOutcomes = getOutcomesForVersion(currentVersion);
  const assessmentRows = flattenAllOutcomes(lens === "ad" ? assessmentOutcomes.ad : assessmentOutcomes.bc);
  const currentRows = flattenAllOutcomes(lens === "ad" ? currentOutcomes.ad : currentOutcomes.bc);
  const assessmentById = Object.fromEntries(assessmentRows.map((row) => [row.id, row]));
  const currentById = Object.fromEntries(currentRows.map((row) => [row.id, row]));

  const updatedIds = (Array.isArray(visibleRows) ? visibleRows : [])
    .filter((row) => {
      const oldRow = assessmentById[row.id];
      const newRow = currentById[row.id];
      if (!oldRow || !newRow) return false;
      return oldRow.title !== newRow.title || oldRow.description !== newRow.description || oldRow.code !== newRow.code;
    })
    .map((row) => row.id);

  const newOutcomes = currentRows.filter((row) => !assessmentById[row.id]);
  const parts = [];
  if (updatedIds.length > 0) {
    parts.push(`${updatedIds.length} updated outcome${updatedIds.length === 1 ? "" : "s"}`);
  }
  if (newOutcomes.length > 0) {
    parts.push(`${newOutcomes.length} new outcome${newOutcomes.length === 1 ? "" : "s"}`);
  }

  return {
    changed: parts.length > 0,
    assessmentVersion,
    currentVersion,
    summaryText: parts.join(" and "),
    updatedIds,
    newOutcomes: newOutcomes.slice(0, 3),
  };
}

function buildBCSystemRows(assessment, outcomesTree) {
  const scope = assessment.scope || {};
  const systems = getPrototypeBCSystems(scope, assessment);
  const shortlist = getResolvedBCSystemIds(assessment);
  const PROTOTYPE_BC_OUTCOME_IDS = ["B1a", "B1b", "B2a", "B2b", "B2c", "B2d", "B3a", "B3b", "B3c", "B3d", "B3e", "B4a", "B4b", "B4c", "B4d", "B5a", "B5b", "B5c", "B6a", "B6b", "C1a", "C1b", "C1c", "C2a", "C2b"];
  const outcomeList = flattenAllOutcomes(outcomesTree).filter((o) => PROTOTYPE_BC_OUTCOME_IDS.includes(o.id));
  const totalOutcomes = outcomeList.length;

  return systems.map((system) => {
    const bcData =
      assessment.selfAssess && assessment.selfAssess.bc && assessment.selfAssess.bc[system.id]
        ? assessment.selfAssess.bc[system.id]
        : { outcomes: {} };

    const outcomeData = bcData.outcomes || {};
    let completed = 0;
    let anyInProgress = false;
    let evidenceCount = 0;
    let latestUpdatedAt = "";

    for (const outcome of outcomeList) {
      const saved = outcomeData[outcome.id] || {};
      if (saved.judgement) completed += 1;
      if (!saved.judgement && saved.status && saved.status !== "not_started") anyInProgress = true;
      if (Array.isArray(saved.evidenceRefs)) {
        evidenceCount += saved.evidenceRefs.filter(hasAnyEvidenceValue).length;
      }
      if (saved.updatedAt) {
        if (!latestUpdatedAt || Date.parse(saved.updatedAt) > Date.parse(latestUpdatedAt)) {
          latestUpdatedAt = saved.updatedAt;
        }
      }
    }

    let statusLabel = "Not started";
    let statusTagClass = "govuk-tag--grey";
    if (anyInProgress || (completed > 0 && completed < totalOutcomes)) {
      statusLabel = "In progress";
      statusTagClass = "govuk-tag--blue";
    }
    if (totalOutcomes > 0 && completed === totalOutcomes) {
      statusLabel = "Complete";
      statusTagClass = "govuk-tag--green";
    }

    const actionText = statusLabel === "Not started" ? "Start" : statusLabel === "Complete" ? "Review" : "Continue";
    const actionHref = `/self-assess/bc/${system.id}`;

    return {
      id: system.id,
      name: system.name,
      inShortlist: shortlist.includes(system.id),
      totalOutcomes,
      completed,
      evidenceCount,
      statusLabel,
      statusTagClass,
      actionText,
      actionHref,
      lastUpdatedAt: latestUpdatedAt ? formatTimestamp(latestUpdatedAt) : "",
    };
  });
}

function buildBCOutcomeRows(assessment, outcomesTree) {
  const scope = assessment.scope || {};
  const systems = getPrototypeBCSystems(scope, assessment);
  const PROTOTYPE_BC_OUTCOME_IDS = ["B1a", "B1b", "B2a", "B2b", "B2c", "B2d", "B3a", "B3b", "B3c", "B3d", "B3e", "B4a", "B4b", "B4c", "B4d", "B5a", "B5b", "B5c", "B6a", "B6b", "C1a", "C1b", "C1c", "C2a", "C2b"];
  const outcomeList = flattenAllOutcomes(outcomesTree).filter((o) => PROTOTYPE_BC_OUTCOME_IDS.includes(o.id));

  const rows = [];

  for (const system of systems) {
    const bcData =
      assessment.selfAssess && assessment.selfAssess.bc && assessment.selfAssess.bc[system.id]
        ? assessment.selfAssess.bc[system.id]
        : { outcomes: {} };
    const outcomeData = bcData.outcomes || {};

    for (const outcome of outcomeList) {
      const saved = outcomeData[outcome.id] || {};
      const evidenceRefs = Array.isArray(saved.evidenceRefs) ? saved.evidenceRefs : [];
      const history = Array.isArray(saved.history) ? saved.history : [];
      const evidenceCount = Array.isArray(saved.evidenceRefs)
        ? saved.evidenceRefs.filter(hasAnyEvidenceValue).length
        : 0;
      const hasContent = Boolean(saved.igpResponse || saved.rationale || evidenceCount > 0);
      const hasStatementContent = hasStartedIgpAssessmentRow(saved);
      const statusValue = (saved.status || "").toString() || (
        saved.blocker
          ? "blocked"
          : saved.judgement
          ? "complete"
          : hasContent || hasStatementContent
          ? "in_progress"
          : "not_started"
      );
      const statusMeta = getStatusMeta(statuses, statusValue);

      rows.push({
        lens: "bc",
        outcomeId: `${system.id}:${outcome.id}`,
        outcomeCode: outcome.code,
        title: outcome.title,
        description: outcome.description || "",
        objective: outcome.code.split(".")[0].charAt(0),
        principle: outcome.code.split(".")[0],
        ownerId: (saved.ownerId || "").toString(),
        collaboratorIds: coerceArray(saved.collaboratorIds).filter(Boolean),
        additionalCollaborators: (saved.additionalCollaborators || "").toString(),
        isOwner: false,
        isCollaborator: false,
        isMine: false,
        status: statusValue,
        statusLabel: statusMeta ? statusMeta.label : statusValue,
        statusTagClass: statusMeta ? statusMeta.tagClass : "govuk-tag--grey",
        dueDate: "",
        dueDateDisplay: "",
        nextStep: (saved.nextStep || "").toString(),
        evidenceRefs,
        history,
        assurerReview: saved.assurerReview || null,
        evidenceCount,
        carriedForward: Boolean(saved.carriedForward),
        reviewRequired: Boolean(saved.reviewRequired),
        isMissingEvidence: evidenceCount === 0 && Boolean(saved.judgement),
        isOverdue: false,
        isBlocked: Boolean(saved.blocker),
        isReadyForReview: false,
        isNeedsAttention: (evidenceCount === 0 && Boolean(saved.judgement)) || Boolean(saved.blocker),
        lastUpdateAt: saved.updatedAt ? formatTimestamp(saved.updatedAt) : "",
        lastUpdateSummary: "",
        linkUrl: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
        selfAssessUrl:
          outcome.id === "B2a"
            ? B2A_SELF_ASSESS_HREF(system.id)
            : `/self-assess/bc/${system.id}/outcomes/${outcome.id}/${outcome.id.toLowerCase()}-achieved`,
        systemName: system.name,
      });
    }
  }

  return rows;
}

function getPrototypeBCSystems(scope, assessment) {
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const selectedIds = getResolvedBCSystemIds(assessment);

  if (selectedIds.length > 0) {
    return systems.filter((system) => selectedIds.includes(system.id)).slice(0, PROTOTYPE_BC_SYSTEM_LIMIT);
  }

  return [];
}

function buildBCSystemList(assessment, outcomesTree) {
  const scope = assessment.scope || {};
  const selectedSystems = getPrototypeBCSystems(scope, assessment);
  const PROTOTYPE_BC_OUTCOME_IDS = ["B2a"];
  const prototypeBcOutcomeIds = PROTOTYPE_BC_OUTCOME_IDS;
  const totalPerSystem = prototypeBcOutcomeIds.length;
  const systems = selectedSystems.map((system) => {
    const systemData =
      assessment.selfAssess && assessment.selfAssess.bc && assessment.selfAssess.bc[system.id]
        ? assessment.selfAssess.bc[system.id]
        : { outcomes: {} };
    const primarySaved = (systemData.outcomes && systemData.outcomes["B2a"]) || {};
    const judged = countBCJudgedForSystems(assessment, [system.id], prototypeBcOutcomeIds);
    const mapping = getMapping(scope, system.id);
    const mappedServices = (mapping && Array.isArray(mapping.serviceIds) ? mapping.serviceIds : [])
      .map((serviceId) => findService(scope, serviceId))
      .filter(Boolean)
      .map((service) => service.name);
    const priority = getPriority(scope, system.id);
    const priorityLevel = priority && priority.level ? priority.level : "";
    const started = Boolean(
      (primarySaved.status && primarySaved.status !== "not_started") ||
      hasStartedIgpAssessmentRow(primarySaved)
    );
    const status = primarySaved.carriedForward && primarySaved.reviewRequired
      ? "Carried forward - review needed"
      : judged >= totalPerSystem ? "Complete" : judged > 0 || started ? "In progress" : "Not started";

    return {
      ...system,
      judged,
      total: totalPerSystem,
      mappedServices,
      mappedCount: mapping && Array.isArray(mapping.serviceIds) ? mapping.serviceIds.length : 0,
      priorityLevel,
      priorityText: formatPriorityLabel(priorityLevel),
      priorityTagClass: getPriorityTagClass(priorityLevel),
      status,
      carriedForward: Boolean(primarySaved.carriedForward && primarySaved.reviewRequired),
    };
  });
  const frameworkChange = buildFrameworkChangeSummary(assessment, "bc", systems.length > 0 ? [{ id: "B1a" }] : []);
  systems.forEach((system) => {
    system.frameworkFlag = "";
  });

  systems.totalPerSystem = totalPerSystem;
  systems.frameworkChange = frameworkChange;
  return systems;
}

function buildBCSystemFilterState(allSystems, rawView) {
  const activeFilter = normaliseBCSystemFilter(rawView);
  const highPrioritySystems = allSystems.filter((system) => system.priorityLevel === "high");
  const visibleSystems = activeFilter === "all" ? allSystems : highPrioritySystems;

  return {
    activeFilter,
    visibleSystems,
    highPrioritySystemsCount: highPrioritySystems.length,
    showEmptyHighPriorityState: activeFilter === "high" && highPrioritySystems.length === 0 && allSystems.length > 0,
    carriedForwardReviewCount: allSystems.filter((system) => system.carriedForward).length,
    frameworkChange: allSystems.frameworkChange,
    totalPerSystem: allSystems.totalPerSystem || 0,
  };
}

function normaliseBCSystemFilter(value) {
  return value === "all" ? "all" : "high";
}

function formatPriorityLabel(level) {
  if (level === "not_sure") return "Not sure yet";
  if (!level) return "Not set";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function getPriorityTagClass(level) {
  if (level === "high") return "govuk-tag--red";
  if (level === "medium") return "govuk-tag--blue";
  if (level === "low") return "govuk-tag--green";
  if (level === "not_sure") return "govuk-tag--yellow";
  return "govuk-tag--grey";
}

function ensureAssessmentData(assessment) {
  assessment.selfAssess = assessment.selfAssess || { ad: {}, bc: {} };
  assessment.selfAssess.ad = assessment.selfAssess.ad || {};
  assessment.selfAssess.bc = assessment.selfAssess.bc || {};
  assessment.scope = assessment.scope || {};
  assessment.scope.criticalSystems = Array.isArray(assessment.scope.criticalSystems)
    ? assessment.scope.criticalSystems
    : [];
  if (!assessment.cafVersion) assessment.cafVersion = "3.2";
  ensureCycleExists(assessment);
}

function buildObjectiveSummary({ outcomesTree, assessment, lens }) {
  const objectives = outcomesTree.objectives || [];
  const rows = [];
  const systemMap = new Map(
    (assessment.scope.criticalSystems || []).map((system) => [system.id, system.name])
  );
  const systemsAssessed = lens === "bc" ? Object.keys(assessment.selfAssess.bc || {}).length : 0;

  for (const objective of objectives) {
    const outcomeList = [];
    for (const principle of objective.principles || []) {
      for (const outcome of principle.outcomes || []) {
        outcomeList.push(outcome);
      }
    }

    let achieved = 0;
    let partial = 0;
    let notAchieved = 0;
    let notStarted = 0;
    let total = 0;

    if (lens === "ad") {
      for (const outcome of outcomeList) {
        total += 1;
        const saved = (assessment.selfAssess.ad || {})[outcome.id] || {};
        const bucket = normaliseJudgement(saved.judgement);
        if (!bucket) {
          notStarted += 1;
        } else if (bucket === "achieved") {
          achieved += 1;
        } else if (bucket === "partial") {
          partial += 1;
        } else if (bucket === "notAchieved") {
          notAchieved += 1;
        } else {
          notStarted += 1;
        }
      }
    } else {
      for (const systemId of Object.keys(assessment.selfAssess.bc || {})) {
        const system = (assessment.selfAssess.bc || {})[systemId] || {};
        const outcomes = system.outcomes || {};
        for (const outcome of outcomeList) {
          total += 1;
          const saved = outcomes[outcome.id] || {};
          const bucket = normaliseJudgement(saved.judgement);
          if (!bucket) {
            notStarted += 1;
          } else if (bucket === "achieved") {
            achieved += 1;
          } else if (bucket === "partial") {
            partial += 1;
          } else if (bucket === "notAchieved") {
            notAchieved += 1;
          } else {
            notStarted += 1;
          }
        }
      }
    }

    rows.push({
      objective: objective.code,
      title: objective.title,
      total,
      achieved,
      partial,
      notAchieved,
      notStarted,
    });
  }

  return {
    lens,
    systemsAssessed,
    systemNames: lens === "bc" ? Array.from(systemMap.values()) : [],
    rows,
  };
}

function buildKeyGaps({ assessment, outcomesAD, outcomesBC }) {
  const gaps = [];
  const adMap = buildOutcomeMap(outcomesAD);
  const bcMap = buildOutcomeMap(outcomesBC);
  const bcSystemMap = new Map(
    (assessment.scope.criticalSystems || []).map((system) => [system.id, system.name])
  );

  for (const key of Object.keys(assessment.selfAssess.ad || {})) {
    const saved = assessment.selfAssess.ad[key] || {};
    const bucket = normaliseJudgement(saved.judgement);
    if (bucket === "partial" || bucket === "notAchieved") {
      const meta = adMap.get(key);
      gaps.push({
        kind: bucket,
        label: meta ? `${meta.code} ${meta.title}` : key,
        lens: "A and D",
      });
    }
  }

  for (const systemId of Object.keys(assessment.selfAssess.bc || {})) {
    const system = assessment.selfAssess.bc[systemId] || {};
    const outcomes = system.outcomes || {};
    for (const key of Object.keys(outcomes)) {
      const saved = outcomes[key] || {};
      const bucket = normaliseJudgement(saved.judgement);
      if (bucket === "partial" || bucket === "notAchieved") {
        const meta = bcMap.get(key);
        const systemName = bcSystemMap.get(systemId) || "Critical system";
        gaps.push({
          kind: bucket,
          label: meta ? `${meta.code} ${meta.title}` : key,
          lens: `B and C — ${systemName}`,
        });
      }
    }
  }

  gaps.sort((a, b) => {
    const score = (item) => (item.kind === "notAchieved" ? 0 : 1);
    return score(a) - score(b);
  });

  return gaps.slice(0, 6);
}

function buildOutcomeMap(outcomesTree) {
  const map = new Map();
  for (const objective of outcomesTree.objectives || []) {
    for (const principle of objective.principles || []) {
      for (const outcome of principle.outcomes || []) {
        map.set(outcome.id, { code: outcome.code, title: outcome.title });
      }
    }
  }
  return map;
}

function normaliseJudgement(value) {
  const input = (value || "").toString().toLowerCase();
  if (!input) return "";
  if (input.startsWith("achieved")) return "achieved";
  if (input.startsWith("partially")) return "partial";
  if (input.startsWith("not")) return "notAchieved";
  return "";
}

function getUserName(usersList, userId) {
  if (!userId) return "";
  const found = usersList.find((u) => u.id === userId);
  return found ? found.name : "";
}

function formatTimestamp(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sortedA = a.slice().sort();
  const sortedB = b.slice().sort();
  return sortedA.every((value, idx) => value === sortedB[idx]);
}

function normaliseEvidenceForCompare(refs) {
  if (!Array.isArray(refs)) return [];
  return refs
    .filter((ref) => ref && hasAnyEvidenceValue(ref))
    .map((ref) => ({
      title: (ref.title || ref.refId || "").toString().trim(),
      type: (ref.type || "").toString().trim(),
      link: (ref.link || "").toString().trim(),
      description: (ref.description || ref.note || "").toString().trim(),
    }));
}

function hasOutcomeChanges(next) {
  const existing = next.existing || {};
  const ownerChanged = (next.ownerId || "") !== (existing.ownerId || "");
  const collaboratorsChanged = !arraysEqual(
    next.collaboratorIds || [],
    existing.collaboratorIds || []
  );
  const additionalCollaboratorsChanged =
    (next.additionalCollaborators || "").trim() !==
    (existing.additionalCollaborators || "").toString().trim();
  const statusChanged = (next.status || "") !== (existing.status || "");
  const dueDateChanged = (next.dueDate || "") !== (existing.dueDate || "");
  const blockerChanged = (next.blocker || "") !== (existing.blocker || "");
  const nextStepChanged = (next.nextStep || "") !== (existing.nextStep || "");
  const evidenceChanged =
    JSON.stringify(normaliseEvidenceForCompare(next.evidenceRefs || [])) !==
    JSON.stringify(normaliseEvidenceForCompare(existing.evidenceRefs || []));

  return (
    ownerChanged ||
    collaboratorsChanged ||
    additionalCollaboratorsChanged ||
    statusChanged ||
    dueDateChanged ||
    blockerChanged ||
    nextStepChanged ||
    evidenceChanged
  );
}

function validateShareForReview({ ownerId, selfAssessSummary, updateText, latestUpdate }) {
  const errors = [];
  if (!ownerId) {
    errors.push({ field: "ownerId", text: "Assign an owner before sharing with assurer." });
  }
  if (!selfAssessSummary || !selfAssessSummary.judgement) {
    errors.push({
      field: "self-assessment-summary",
      text: "Complete self-assessment judgement before sharing with assurer.",
    });
  }
  if (!selfAssessSummary || !selfAssessSummary.rationale) {
    errors.push({
      field: "self-assessment-summary",
      text: "Add reasons for judgement before sharing with assurer.",
    });
  }
  const noteExists = Boolean((updateText || "").trim() || (latestUpdate && latestUpdate.summary));
  if (!noteExists) {
    errors.push({ field: "updateText", text: "Add a note or decision before sharing with assurer." });
  }
  return errors;
}

function parseAdditionalCollaborators(value) {
  const input = (value || "").toString().trim();
  if (!input) return [];
  return input
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function filterProgressTrackerByOutcomeIds(progressTracker, allowedOutcomeIds) {
  if (!progressTracker || typeof progressTracker !== "object") return {};
  const allowedIds = new Set(Array.isArray(allowedOutcomeIds) ? allowedOutcomeIds : []);
  return Object.fromEntries(
    Object.entries(progressTracker).filter(([outcomeId]) => allowedIds.has(outcomeId))
  );
}

function formatDateForDisplay(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function formatHistoryEntries(history) {
  return history
    .slice()
    .reverse()
    .map((entry) => ({
      ...entry,
      displayAt: formatTimestamp(entry.at),
      displayDueDate: entry.dueDate ? formatDateForDisplay(entry.dueDate) : "",
    }));
}

function renderAssessmentOutcomePage(req, res, assessment, outcomeRow, options = {}) {
  const currentUser = req.session.data.user || null;
  const rowForView = outcomeRow || {};
  const outcomeId = options.outcomeId || rowForView.outcomeId;
  const evidenceRefs = ensureAtLeastOneEvidenceRow(normaliseEvidenceRefs(rowForView.evidenceRefs));
  const history = Array.isArray(rowForView.history) ? rowForView.history : [];
  const statusMeta = getStatusMeta(statuses, rowForView.status);
  const assignment = buildAssignmentDisplay(
    buildAssignmentUsers(assessment, currentUser),
    rowForView.ownerId,
    rowForView.collaboratorIds,
    rowForView.additionalCollaborators
  );
  const latestUpdate = getLatestHistoryEntry(history);
  const query = options.query || normaliseQuery(req.query);
  const selfAssessSummary = buildSelfAssessSummary(assessment, outcomeId);
  const outcomeGuidance = buildOutcomeGuidance(rowForView.outcomeCode);
  const selfAssessUrl = buildSelfAssessUrl(rowForView);
  const assurerAccess = getAssurerAccessContext(currentUser, assessment);

  ensureAssuranceStageData(assessment);

  return res.render("pages/assessments/outcome", {
    pageTitle: `${labels.outcome.pageTitlePrefix} ${rowForView.outcomeCode}`,
    labels,
    statuses,
    users: buildAssignmentUsers(assessment, currentUser),
    row: {
      ...rowForView,
      dueDateInput: formatDateForInput(rowForView.dueDate),
      evidenceRefs,
      history: formatHistoryEntries(history),
    },
    statusMeta,
    ownerName: assignment.ownerName,
    collaboratorNames: assignment.collaboratorNames,
    additionalCollaboratorNames: assignment.additionalCollaboratorNames,
    lastUpdatedAt: latestUpdate ? formatTimestamp(latestUpdate.at) : "",
    lastUpdatedBy: latestUpdate ? latestUpdate.by : "",
    query,
    selfAssessSummary,
    outcomeGuidance,
    selfAssessUrl,
    openEvidenceRequestCount: countOpenEvidenceRequestsForOutcome(
      assessment.assurance.evidenceRequests || [],
      rowForView.outcomeId
    ),
    assurerAccess,
    isAssurerView: assurerAccess.isAssurer,
    review: options.review || rowForView.assurerReview || {},
    savedAssurance: Boolean(options.savedAssurance),
    error: options.error || null,
  });
}

function saveAssurerOutcomeReview(assessment, outcomeId, existing, currentUser, review) {
  const actor = currentUser && currentUser.name ? currentUser.name : "Assurer";
  const nowIso = new Date().toISOString();
  const nextReview = {
    decision: review.decision,
    rationale: review.rationale,
    by: actor,
    at: nowIso,
  };
  const nextHistory = Array.isArray(existing.history) ? existing.history.slice() : [];
  nextHistory.push({
    at: nowIso,
    by: actor,
    summary: `Independent assurance note: ${review.decision}`,
    status: existing.status,
    statusLabel: getStatusLabel(statuses, existing.status),
    dueDate: existing.dueDate || "",
    blocker: existing.blocker || "",
    nextStep: existing.nextStep || "Consider independent assurance findings",
    kind: "assurer_review",
    rationale: review.rationale,
  });

  const nextRow = {
    ...existing,
    assurerReview: nextReview,
    status: existing.status,
    nextStep: existing.nextStep || "Consider independent assurance findings",
    history: nextHistory,
    updatedAt: nowIso,
  };

  if (!assessment.selfAssess) assessment.selfAssess = { ad: {}, bc: {} };
  if (!assessment.selfAssess.ad) assessment.selfAssess.ad = {};
  if (!assessment.selfAssess.bc) assessment.selfAssess.bc = {};

  const bcParts = parseBCOutcomeId(outcomeId);
  if (bcParts) {
    if (!assessment.selfAssess.bc[bcParts.systemId]) {
      assessment.selfAssess.bc[bcParts.systemId] = { outcomes: {} };
    }
    if (!assessment.selfAssess.bc[bcParts.systemId].outcomes) {
      assessment.selfAssess.bc[bcParts.systemId].outcomes = {};
    }
    const target = assessment.selfAssess.bc[bcParts.systemId].outcomes[bcParts.outcomeKey] || {};
    assessment.selfAssess.bc[bcParts.systemId].outcomes[bcParts.outcomeKey] = {
      ...target,
      assurerReview: nextReview,
      status: nextRow.status,
      nextStep: nextRow.nextStep,
      history: nextHistory,
      updatedAt: nowIso,
    };
  } else {
    assessment.progressTracker[outcomeId] = nextRow;
    const target = assessment.selfAssess.ad[outcomeId] || {};
    assessment.selfAssess.ad[outcomeId] = {
      ...target,
      assurerReview: nextReview,
      status: nextRow.status,
      nextStep: nextRow.nextStep,
      history: nextHistory,
      updatedAt: nowIso,
    };
  }

  assessment.updatedAt = nowIso;
}

function buildSelfAssessSummary(assessment, outcomeId) {
  if (!assessment || !assessment.selfAssess) {
    return null;
  }
  const bcParts = parseBCOutcomeId(outcomeId);
  let saved = null;
  if (bcParts) {
    const bcData =
      assessment.selfAssess.bc &&
      assessment.selfAssess.bc[bcParts.systemId] &&
      assessment.selfAssess.bc[bcParts.systemId].outcomes
        ? assessment.selfAssess.bc[bcParts.systemId].outcomes
        : {};
    saved = bcData[bcParts.outcomeKey];
  } else {
    const adData = assessment.selfAssess.ad || {};
    saved = adData[outcomeId];
  }
  if (!saved) {
    return {
      judgement: "",
      rationale: "",
      qualityReviewedAt: "",
      approverReviewedAt: "",
    };
  }

  return {
    judgement: saved.judgement || "",
    rationale: saved.rationale || "",
    qualityReviewedAt: formatDateForDisplay(saved.qualityReviewedAt),
    approverReviewedAt: formatDateForDisplay(saved.approverReviewedAt),
  };
}

function buildScopeJourneySummary(assessment, { roundTwo = false } = {}) {
  const scope = assessment.scope || {};
  const services = Array.isArray(scope.essentialServices) ? scope.essentialServices : [];
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const mappedCount = systems.filter((system) => {
    const mapping = Array.isArray(scope.mappings)
      ? scope.mappings.find((m) => m.systemId === system.id)
      : null;
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;
  const priorityCount = getPriorityCount(scope);
  const isComplete = roundTwo
    ? isRoundTwoScopeComplete(assessment)
    : Boolean(assessment.stage && assessment.stage.prepareScopeComplete);
  const contextComplete = Boolean(scope.context && scope.context.completed);
  const rolesComplete = Boolean(scope.rolesConfirmed);
  const servicesComplete = Boolean(scope.servicesConfirmed);
  const systemsComplete = roundTwo
    ? systems.length > 0 && mappedCount === systems.length && priorityCount === systems.length
    : systems.length >= 3 && mappedCount === systems.length && areNonRoundTwoPrioritiesComplete(scope);
  const completedSteps = roundTwo
    ? (contextComplete ? 1 : 0) + (servicesComplete ? 1 : 0) + (systemsComplete ? 1 : 0)
    : (contextComplete && rolesComplete ? 1 : 0) +
      (servicesComplete ? 1 : 0) +
      (systemsComplete ? 1 : 0) +
      (isComplete ? 1 : 0);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (isComplete) {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
  } else if (services.length > 0 || systems.length > 0 || (scope.context && scope.context.completed)) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }

  return {
    href: roundTwo ? "/onboarding/scope" : "/stages/2/scope",
    statusText,
    statusClass,
    hint: roundTwo
      ? `${completedSteps} of 3 complete: context, essential services, critical systems. These setup lists are maintained over time and reused each year.`
      : `${completedSteps} of 4 complete: strategic context, essential services, priority systems, and assurance planning.`,
  };
}

function buildPrepareJourneySummary(assessment, { roundTwo = false } = {}) {
  const prepare = assessment.prepare || {};
  const checks = roundTwo
    ? ["understandService", "hasStakeholderSupport"]
    : [
        "awareness",
        "signoff",
        "support",
        "understanding",
        "governance",
        "assurers",
      ];
  const selectedCount = checks.filter((field) => Boolean(prepare[field])).length;
  const rolesStepStarted = roundTwo && Boolean(
    prepare.onboardingLead || prepare.onboardingApprover
  );
  const isComplete = roundTwo
    ? Boolean(prepare.onboardingRolesComplete && prepare.guidanceRead)
    : Boolean(prepare.guidanceRead) || selectedCount === checks.length;

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (!isComplete && (selectedCount > 0 || rolesStepStarted)) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }
  if (isComplete) {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
  }

  return {
    href: roundTwo ? "/prepare/roles?returnTo=journey" : "/prepare",
    statusText,
    statusClass,
    hint: roundTwo
      ? isComplete
        ? "Onboarding complete."
        : "Prepare to start CAF."
      : isComplete
        ? "Preparation checklist completed."
        : "Confirm readiness, governance and support before starting scope.",
  };
}

function buildOnboardingRolesSummary(assessment) {
  const prepare = assessment.prepare || {};
  const hasStarted = Boolean(
    prepare.onboardingLead || prepare.onboardingApprover
  );
  const isComplete = Boolean(prepare.onboardingRolesComplete);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (isComplete) {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
  } else if (hasStarted) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }

  return {
    href: "/prepare/roles",
    statusText,
    statusClass,
    hint: isComplete
      ? "Oversight roles added."
      : "Add the CAF Lead and approver.",
  };
}

function buildScopeContextSummary(assessment) {
  const scope = assessment.scope || {};
  const contextComplete = Boolean(scope.context && scope.context.completed);
  const hasStarted = Boolean(
    contextComplete ||
    (scope.context &&
      (scope.context.mission ||
        scope.context.objectives ||
        scope.context.priorities ||
        scope.context.setup ||
        scope.context.operate ||
        scope.context.threat ||
        scope.context.appetite))
  );

  return {
    href: "/stages/2/scope/context",
    statusText: contextComplete ? "Complete" : hasStarted ? "In progress" : "Not started",
    statusClass: contextComplete
      ? "govuk-tag--green"
      : hasStarted
        ? "govuk-tag--blue"
        : "govuk-tag--grey",
    hint: contextComplete
      ? "Strategic context recorded."
      : "Add your council's strategic context.",
  };
}

function buildEssentialServicesSummary(assessment) {
  const scope = assessment.scope || {};
  const services = Array.isArray(scope.essentialServices) ? scope.essentialServices : [];
  const hasStarted = Boolean(services.length > 0 || scope.servicesConfirmed);

  return {
    href: services.length > 0 ? "/stages/2/scope/services/review" : "/stages/2/scope/services/add",
    statusText: hasStarted ? "In progress" : "Not started",
    statusClass: hasStarted ? "govuk-tag--blue" : "govuk-tag--grey",
    hint: hasStarted
      ? "Review and update your essential services."
      : "Add your essential services.",
  };
}

function buildCriticalSystemsScopeSummary(assessment) {
  const scope = assessment.scope || {};
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const mappedCount = systems.filter((system) => {
    const mapping = getMapping(scope, system.id);
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;
  const hasStarted = Boolean(systems.length > 0 || mappedCount > 0 || getPriorityCount(scope) > 0);

  const href = systems.length > 0 ? "/stages/2/scope/systems/review" : "/stages/2/scope/systems/add";

  return {
    href,
    statusText: hasStarted ? "In progress" : "Not started",
    statusClass: hasStarted ? "govuk-tag--blue" : "govuk-tag--grey",
    hint: hasStarted
      ? "Review and update your critical systems."
      : "Add your critical systems.",
  };
}

function getMapping(scope, systemId) {
  if (!scope || !Array.isArray(scope.mappings)) return null;
  return scope.mappings.find((mapping) => mapping && mapping.systemId === systemId) || null;
}

function findService(scope, serviceId) {
  if (!scope || !Array.isArray(scope.essentialServices)) return null;
  return scope.essentialServices.find((service) => service && service.id === serviceId) || null;
}

function getPriority(scope, systemId) {
  if (!scope || !Array.isArray(scope.priority)) return null;
  return scope.priority.find((priority) => priority && priority.systemId === systemId) || null;
}

function getPriorityCount(scope) {
  const systems = scope && Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  return systems.filter((system) => {
    const priority = getPriority(scope, system.id);
    return Boolean(priority && priority.level);
  }).length;
}

function areNonRoundTwoPrioritiesComplete(scope) {
  return getPriorityCount(scope) >= 3 &&
    Array.isArray(scope.priorityShortlist) &&
    scope.priorityShortlist.length > 0 &&
    Boolean(scope.priorityDetailsComplete);
}

function scopeContextCompleted(scope) {
  return Boolean(scope && scope.context && scope.context.completed);
}

function isRoundTwoScopeComplete(assessment) {
  if (!assessment || !assessment.scope) return false;
  const scope = assessment.scope;
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const mappedCount = systems.filter((system) => {
    const mapping = getMapping(scope, system.id);
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;
  const prioritisedCount = systems.filter((system) => {
    const priority = getPriority(scope, system.id);
    return Boolean(priority && priority.level);
  }).length;

  return Boolean(scope.context && scope.context.completed) &&
    Boolean(scope.servicesConfirmed) &&
    systems.length > 0 &&
    mappedCount === systems.length &&
    prioritisedCount === systems.length;
}

function ensureScopeReviewState(assessment) {
  if (!assessment.scopeReview) {
    assessment.scopeReview = {
      decision: "",
      completed: false,
      updatedAt: "",
    };
  }
  if (typeof assessment.scopeReview.decision !== "string") assessment.scopeReview.decision = "";
  if (typeof assessment.scopeReview.completed !== "boolean") assessment.scopeReview.completed = false;
  if (typeof assessment.scopeReview.updatedAt !== "string") assessment.scopeReview.updatedAt = "";
}

function buildRoundTwoAssessmentProgress(assessment) {
  ensureSectionReviewData(assessment);
  ensureCollaborationWorkflowData(assessment);
  ensureScopeReviewState(assessment);
  const scope = assessment && assessment.scope ? assessment.scope : {};
  const scopeReview = assessment && assessment.scopeReview ? assessment.scopeReview : {};
  const annualSetup = assessment && assessment.annualSetup ? assessment.annualSetup : {};
  const adReview = getADReviewState(assessment);
  const bcReview = getBCReviewState(assessment);
  const collaborationState = getCollaborationWorkflowState(assessment);
  const assignmentStatus = getAssignmentStatus(assessment);

  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const mappedCount = systems.filter((system) => {
    const mapping = getMapping(scope, system.id);
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;
  const prioritisedCount = systems.filter((system) => {
    const priority = getPriority(scope, system.id);
    return Boolean(priority && priority.level);
  }).length;

  const scopeComplete =
    Boolean(scopeReview.completed) &&
    scopeContextCompleted(scope) &&
    Array.isArray(scope.essentialServices) &&
    scope.essentialServices.length > 0 &&
    systems.length > 0 &&
    mappedCount === systems.length &&
    prioritisedCount === systems.length;
  const annualSetupComplete = scopeComplete && Boolean(annualSetup.completed);
  const whoInvolvedComplete = annualSetupComplete && assignmentStatus.allAssigned;
  const adComplete = whoInvolvedComplete && adReview.completed;
  const bcComplete = whoInvolvedComplete && bcReview.completed;
  const submittedForReview =
    adComplete &&
    bcComplete &&
    (collaborationState.status === "in_review" ||
      collaborationState.status === "needs_changes" ||
      collaborationState.status === "ready_for_approval" ||
      collaborationState.status === "approved");
  const reviewed =
    collaborationState.status === "ready_for_approval" ||
    collaborationState.status === "approved";
  const approved = collaborationState.status === "approved";

  return buildPhaseProgress([
    {
      label: "Choose what to assess",
      completed: annualSetupComplete,
    },
    {
      label: "Assign outcome owners and contributors",
      completed: whoInvolvedComplete,
    },
    {
      label: "Complete organisation self-assessment",
      completed: adComplete,
    },
    {
      label: "Complete critical systems self-assessment",
      completed: bcComplete,
    },
    {
      label: "Send the self-assessment for review",
      completed: submittedForReview,
    },
    {
      label: "Review the submitted self-assessment",
      completed: reviewed,
    },
    {
      label: "Approve the reviewed self-assessment",
      completed: approved,
    },
  ]);
}

function buildAnnualSetupSummary(assessment, currentUser) {
  ensureAnnualSetupData(assessment);
  ensureScopeReviewState(assessment);
  const state = assessment.annualSetup || {};
  const scopeReview = assessment.scopeReview || {};
  const selectedSystems = Array.isArray(state.systemIds) ? state.systemIds.length : 0;
  const requiredChecks = [
    state.adAssessmentStatus,
  ];
  const completedCount = requiredChecks.filter(Boolean).length + (selectedSystems > 0 ? 1 : 0);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  let href = scopeReview.completed ? "/assessments/current/annual-setup" : "/assessments/current/review-scope";
  let hint = "Choose what you will assess this year.";
  if (state.completed) {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
    href = "/assessments/current/annual-setup/complete";
    hint = "Review or update this assessment's setup.";
  } else if (completedCount > 0) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }

  return {
    href,
    statusText,
    statusClass,
    hint,
  };
}

function buildScopeReviewSummary(assessment) {
  const scopeReview = assessment && assessment.scopeReview ? assessment.scopeReview : {};
  const completed = Boolean(scopeReview.completed);
  const started = Boolean(scopeReview.decision);
  const changed = started && scopeReview.decision !== "no_change";

  return {
    href: "/assessments/current/review-scope",
    statusText: completed ? "Complete" : started ? "In progress" : "Not started",
    statusClass: completed ? "govuk-tag--green" : started ? "govuk-tag--blue" : "govuk-tag--grey",
    hint: completed
      ? changed
        ? "These setup lists have been updated for this year."
        : "These setup lists have been reviewed and confirmed without changes."
      : "Review your services and systems lists before yearly setup.",
  };
}

function isAnnualSetupAssessmentStepComplete(assessment) {
  const state = assessment && assessment.annualSetup ? assessment.annualSetup : {};
  return Boolean(state.adApproach && state.systemsStepComplete);
}

function isAnnualSetupPlanningStepComplete(assessment) {
  const state = assessment && assessment.annualSetup ? assessment.annualSetup : {};
  return Boolean(state.assuranceMonth && state.assuranceYear);
}

function buildAvailableSystems(assessment) {
  const scope = assessment.scope || {};
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  return systems.map((system) => {
    const mapping = getMapping(scope, system.id);
    const mappedServices = (mapping && Array.isArray(mapping.serviceIds) ? mapping.serviceIds : [])
      .map((serviceId) => findService(scope, serviceId))
      .filter(Boolean)
      .map((service) => service.name);
    const priority = getPriority(scope, system.id);
    return {
      ...system,
      mappedServices,
      priorityLabel: priority && priority.level ? priority.level : "",
    };
  });
}

function getAnnualSetupNextStep(assessment) {
  const state = assessment && assessment.annualSetup ? assessment.annualSetup : {};
  if (!state.adApproach) return "/assessments/current/annual-setup/organisation";
  if (!state.systemsStepComplete) return "/assessments/current/annual-setup/systems";
  return "/assessments/current/annual-setup/confirm";
}

function buildAssurancePlanningSummary(assessment, collaborationState) {
  ensureAssurancePlanningData(assessment);
  const planning = assessment.assurancePlanning || {};
  const hasDetails = Boolean(
    planning.assurerName || planning.provider || planning.expectedTiming || planning.notes
  );
  const isAvailable = Boolean(
    collaborationState &&
      (collaborationState.status === "approved" || collaborationState.assurerSubmitted)
  );

  return {
    available: isAvailable,
    hasDetails,
    statusText: hasDetails ? "Added" : "Not added",
    body: hasDetails
      ? "Update your planning notes for independent assurance at any time."
      : "This helps you plan for independent assurance. You do not need to arrange or book it now.",
    href: "/assessments/current/assurance-planning?returnTo=/assessments/current/dashboard",
  };
}

function normaliseInternalReturnTo(value) {
  const fallback = "/assessments/current/journey";
  const candidate = (value || "").toString().trim();
  if (!candidate.startsWith("/")) return fallback;
  if (!candidate.startsWith("/assessments/current/")) return fallback;
  return candidate;
}

function appendQueryParam(url, key, value) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function applyRoleAudit(container, keyPrefix, currentUser, values) {
  const metaKey = `${keyPrefix}Meta`;
  const historyKey = `${keyPrefix}History`;
  const updatedAt = new Date().toISOString();
  const updatedBy = getAuditActor(currentUser);
  const history = Array.isArray(container[historyKey]) ? container[historyKey] : [];
  const nextEntry = {
    updatedAt,
    updatedBy,
    ...values,
  };
  const previous = history[history.length - 1];
  const unchanged =
    previous &&
    previous.lead === nextEntry.lead &&
    previous.approver === nextEntry.approver;

  container[metaKey] = { updatedAt, updatedBy };
  container[historyKey] = unchanged ? history : history.concat(nextEntry);
}

function getAuditActor(user) {
  if (!user) return "Unknown user";
  const name = (user.name || "").toString().trim();
  const email = (user.email || "").toString().trim();
  if (name && email) return `${name} (${email})`;
  return name || email || "Unknown user";
}

function ensureAssessmentDates(assessment) {
  if (!assessment) return;
  const createdAt = assessment.createdAt || new Date().toISOString();
  if (!assessment.createdAt) {
    assessment.createdAt = createdAt;
  }
  if (!assessment.dueAt) {
    assessment.dueAt = endOfFinancialYear(createdAt);
  }
}

function endOfFinancialYear(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const year = dt.getFullYear() + 1;
  const end = new Date(year, 3, 5, 23, 59, 0, 0);
  return end.toISOString();
}

function buildMappingJourneySummary(assessment) {
  const scope = assessment.scope || {};
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const mappings = Array.isArray(scope.mappings) ? scope.mappings : [];
  const mappedCount = systems.filter((system) => {
    const mapping = mappings.find((m) => m.systemId === system.id);
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  const href = "/stages/2/scope/systems/review";

  if (systems.length > 0) {
    if (mappedCount === systems.length) {
      statusText = "Complete";
      statusClass = "govuk-tag--green";
    } else {
      statusText = "In progress";
      statusClass = "govuk-tag--blue";
    }
  }

  return {
    href,
    statusText,
    statusClass,
    hint: `${mappedCount} of ${systems.length} systems are mapped to essential services.`,
  };
}

function buildADJourneySummary(assessment, outcomesTree, { roundTwo = false } = {}) {
  ensureSectionReviewData(assessment);
  const total = countOutcomesInTree(outcomesTree);
  const judged = countADJudged(assessment);
  const reviewState = getADReviewState(assessment);
  const ready = roundTwo
    ? Boolean(assessment && assessment.annualSetup && assessment.annualSetup.completed)
    : Boolean(assessment.stage && assessment.stage.prepareScopeComplete);

  const ad = (assessment.selfAssess && assessment.selfAssess.ad) || {};
  const needsReviewCount = Object.values(ad).filter((o) => o.carriedForward && o.reviewRequired).length;
  const anyAdStarted = Object.values(ad).some(
    (o) => (o.igpAssessments || []).some((i) => (i.response || "").toString().trim())
  );

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (ready) {
    if (reviewState.completed) {
      statusText = "Complete";
      statusClass = "govuk-tag--green";
    } else if (judged > 0 || anyAdStarted) {
      statusText = "In progress";
      statusClass = "govuk-tag--blue";
    } else if (needsReviewCount > 0) {
      statusText = "Needs review";
      statusClass = "govuk-tag--yellow";
    }
  } else if (needsReviewCount > 0) {
    statusText = "Carried forward";
    statusClass = "govuk-tag--yellow";
  }

  const hint =
    needsReviewCount > 0 && !reviewState.completed
      ? `${needsReviewCount} outcome${needsReviewCount !== 1 ? "s" : ""} carried forward — review before marking complete.`
      : "Assess Objectives A and D.";

  return {
    href: roundTwo ? "/assessments/current/self-assessment/ad" : "/assessments/current/dashboard?lens=ad&view=all",
    statusText,
    statusClass,
    hint,
    judged,
  };
}

function buildBCJourneySummary(assessment, outcomesTree, { roundTwo = false } = {}) {
  ensureSectionReviewData(assessment);
  const scope = assessment.scope || {};
  const systems = getPrototypeBCSystems(scope, assessment);
  const annualSetup = assessment && assessment.annualSetup ? assessment.annualSetup : {};

  if (annualSetup.systemsStepComplete && systems.length === 0) {
    return {
      href: "",
      statusText: "Not applicable",
      statusClass: "govuk-tag--grey",
      hint: "You are not assessing any critical systems this year.",
      judged: 0,
    };
  }

  const PROTOTYPE_BC_OUTCOME_IDS = ["B1a", "B1b", "B2a", "B2b", "B2c", "B2d", "B3a", "B3b", "B3c", "B3d", "B3e", "B4a", "B4b", "B4c", "B4d", "B5a", "B5b", "B5c", "B6a", "B6b", "C1a", "C1b", "C1c", "C2a", "C2b"];
  const prototypeOutcomeIds = flattenAllOutcomes(outcomesTree)
    .filter((o) => PROTOTYPE_BC_OUTCOME_IDS.includes(o.id))
    .map((o) => o.id);
  const perSystemTotal = prototypeOutcomeIds.length;
  const total = systems.length * perSystemTotal;
  const judged = countBCJudgedForSystems(assessment, systems.map((s) => s.id), prototypeOutcomeIds);
  const reviewState = getBCReviewState(assessment);
  const ready = roundTwo
    ? Boolean(assessment && assessment.annualSetup && assessment.annualSetup.completed)
    : Boolean(assessment.stage && assessment.stage.prepareScopeComplete);

  const anyStarted = (() => {
    const bc = (assessment.selfAssess && assessment.selfAssess.bc) || {};
    const allowedSet = new Set(prototypeOutcomeIds);
    for (const system of systems) {
      const outcomes = (bc[system.id] && bc[system.id].outcomes) || {};
      for (const [outcomeId, row] of Object.entries(outcomes)) {
        if (!allowedSet.has(outcomeId)) continue;
        const status = (row.status || "not_started").toString();
        if (status !== "not_started") return true;
      }
    }
    return false;
  })();

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (ready && systems.length > 0) {
    if (reviewState.completed) {
      statusText = "Complete";
      statusClass = "govuk-tag--green";
    } else if (judged > 0 || anyStarted) {
      statusText = "In progress";
      statusClass = "govuk-tag--blue";
    }
  }

  const hint =
    judged > 0
      ? `${judged} of ${total} outcome${total !== 1 ? "s" : ""} complete.`
      : systems.length > 0
        ? `${systems.length} critical system${systems.length !== 1 ? "s" : ""} to assess.`
        : "Assess Objectives B and C.";

  return {
    href: roundTwo ? "/assessments/current/self-assessment/bc" : "/assessments/current/dashboard?lens=bc&view=all",
    statusText,
    statusClass,
    hint,
    judged,
  };
}

function buildRoundTwoWorkQueueRow(row, { isAssurerView = false } = {}) {
  const actionHref = row && row.selfAssessUrl ? row.selfAssessUrl : row.linkUrl || "";
  const defaultActionText = isAssurerView ? "Review outcome" : "Open outcome";

  if (!row) {
    return {
      issueText: "",
      actionText: defaultActionText,
      actionHref,
    };
  }

  if (row.isBlocked) {
    return {
      ...row,
      issueText: "Blocked by a saved blocker",
      actionText: "Resolve blocker",
      actionHref,
    };
  }

  if (row.carriedForwardFlag) {
    return {
      ...row,
      issueText: "Carried-forward outcome needs review",
      actionText: "Review carried-forward outcome",
      actionHref,
    };
  }

  if (row.isMissingEvidence) {
    return {
      ...row,
      issueText: "Evidence references missing",
      actionText: "Add evidence references",
      actionHref,
    };
  }

  if (row.status === "ready_for_internal_review") {
    return {
      ...row,
      issueText: "Ready for internal review",
      actionText: "Open outcome",
      actionHref,
    };
  }

  if (row.status === "internally_reviewed") {
    return {
      ...row,
      issueText: "Internally reviewed",
      actionText: "Open outcome",
      actionHref,
    };
  }

  return {
    ...row,
    issueText: "Needs review",
    actionText: defaultActionText,
    actionHref,
  };
}

function buildRoundTwoWorkQueues(rows, options = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const frameworkUpdates = list.filter(
    (row) => row && row.frameworkFlag && !row.carriedForwardFlag
  );
  const needsAttention = list.filter(
    (row) => row && row.isNeedsAttention && !row.frameworkFlag
  );
  const inProgress = list.filter(
    (row) =>
      row &&
      !row.carriedForwardFlag &&
      !row.frameworkFlag &&
      !row.isNeedsAttention &&
      (row.status === "in_progress" ||
        row.status === "ready_for_internal_review" ||
        row.status === "internally_reviewed")
  );

  const sortRows = (items) =>
    items.slice().sort((a, b) => {
      const lensCompare = String(a.lens || "").localeCompare(String(b.lens || ""));
      if (lensCompare !== 0) return lensCompare;
      const codeCompare = String(a.outcomeCode || "").localeCompare(String(b.outcomeCode || ""));
      if (codeCompare !== 0) return codeCompare;
      return String(a.systemName || "").localeCompare(String(b.systemName || ""));
    });

  return {
    frameworkUpdates: sortRows(frameworkUpdates).slice(0, 6),
    needsAttention: sortRows(needsAttention).slice(0, 6).map((row) => buildRoundTwoWorkQueueRow(row, options)),
    inProgress: sortRows(inProgress).slice(0, 6).map((row) => buildRoundTwoWorkQueueRow(row, options)),
  };
}

function buildIIPJourneySummary(assessment, { roundTwo = false } = {}) {
  const assuranceSummary = buildAssuranceSummary(assessment);
  ensureIipStage2Data(assessment);
  const stage2 = assessment.improvementPlan.stage2 || {};
  const rows = Array.isArray(stage2.rows) ? stage2.rows : [];
  const status = (stage2.status || "").toString();

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (status === "submitted_to_mhclg") {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
  } else if (
    status &&
    status !== "not_started"
  ) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }

  return {
    href: "/improvement-plan/stage-2",
    statusText,
    statusClass,
    hint: assuranceSummary.reportFinalised
      ? roundTwo
        ? `${rows.length} actions in the living improvement plan. Combine knowledge bank suggestions with council and MHCLG additions.`
        : `${rows.length} rows in Stage 2 plan.`
      : roundTwo
        ? "Available after assurance results are finalised."
        : "Available after assurer finalises Stage 1 report.",
  };
}

function buildAssuranceReportJourneySummary(assessment, { roundTwo = false } = {}) {
  const summary = buildAssuranceSummary(assessment);
  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (summary.reportFinalised) {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
  } else if (summary.reportDraftShared || summary.recordSubmitted) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }
  return {
    href: "/assessments/current/assurance-report",
    statusText,
    statusClass,
    hint: roundTwo
      ? `Independent assurance happens after the assessment is complete. Record of Audit: ${summary.recordStatus}. Report: ${summary.reportStatus}.`
      : `Record of Audit: ${summary.recordStatus}. Stage 1 report: ${summary.reportStatus}. Workshop dates: ${summary.workshopResponseStatus}.`,
  };
}

function buildCompleteSelfAssessmentSummary(assessment) {
  ensureSectionReviewData(assessment);
  ensureCollaborationWorkflowData(assessment);
  const adReview = getADReviewState(assessment);
  const bcReview = getBCReviewState(assessment);
  const collaborationState = getCollaborationWorkflowState(assessment);
  const submission = assessment && assessment.assurerSubmission ? assessment.assurerSubmission : {};
  const allComplete = adReview.completed && bcReview.completed;

  if (!allComplete) {
    return {
      href: "/assessments/current/complete-self-assessment",
      statusText: "Not started",
      statusClass: "govuk-tag--grey",
      hint: "Complete all outcomes before getting sign-off.",
      locked: true,
    };
  }

  if (submission.submitted || collaborationState.status === "approved") {
    return {
      href: "/assessments/current/complete-self-assessment",
      statusText: "Complete",
      statusClass: "govuk-tag--green",
      hint: submission.submitted
        ? "Assessment sent to assurer."
        : "Internally approved. Ready to send to assurer.",
      locked: false,
    };
  }

  return {
    href: "/assessments/current/complete-self-assessment",
    statusText: "Not started",
    statusClass: "govuk-tag--grey",
    hint: "Download the draft and confirm internal sign-off.",
    locked: false,
  };
}

function getSelfAssessmentReviewState(assessment) {
  ensureCollaborationWorkflowData(assessment);
  const state = assessment && assessment.selfAssessmentReview ? assessment.selfAssessmentReview : {};
  const workflow = assessment && assessment.collaborationWorkflow ? assessment.collaborationWorkflow : {};
  return {
    completed:
      Boolean(state.completed) ||
      workflow.status === "in_review" ||
      workflow.status === "ready_for_approval" ||
      workflow.status === "approved",
    completedAt: (state.completedAt || workflow.submittedAt || "").toString(),
    completedBy: (state.completedBy || workflow.submittedBy || "").toString(),
  };
}

function buildRoleActionSummary(user) {
  const activeRole = getActiveRole(user);
  if (!activeRole) return null;
  return {
    activeRole,
    activeRoleLabel: getRoleLabel(activeRole),
    canEdit: userHasPermission(user, PERMISSIONS.EDIT_CONTENT),
    canReview: userHasPermission(user, PERMISSIONS.REVIEW_CONTENT),
    canApprove: userHasPermission(user, PERMISSIONS.APPROVE_CONTENT),
    canAssure: userHasPermission(user, PERMISSIONS.ASSURE_CONTENT),
    canQa: userHasPermission(user, PERMISSIONS.QA_CONTENT),
    canManageRoles: userHasPermission(user, PERMISSIONS.MANAGE_ROLES),
  };
}

function buildDashboardPhase(collaborationState, assessment) {
  const assurerSubmitted = collaborationState && collaborationState.assurerSubmitted;
  const status = collaborationState ? collaborationState.status : "draft";
  const stage1Finalised = assessment.stage1Report && assessment.stage1Report.finalisedAt;
  if (stage1Finalised) return { label: "Improvement plan", step: 4, totalSteps: 4 };
  if (assurerSubmitted || status === "approved") return { label: "Assurance", step: 3, totalSteps: 4 };
  if (status === "in_review" || status === "ready_for_approval") return { label: "Self-assessment", step: 2, totalSteps: 4 };
  return { label: "Self-assessment", step: 2, totalSteps: 4 };
}

function buildDashboardNextAction(collaborationState, bcSystems) {
  const status = collaborationState ? collaborationState.status : "draft";
  const assurerSubmitted = collaborationState && collaborationState.assurerSubmitted;

  if (assurerSubmitted) {
    return {
      heading: "Review your assurance report",
      body: "Your assurer has submitted their report. Review the findings and respond to any recommendations.",
      href: "/assessments/current/assurance-report",
      actionText: "Review assurance report",
    };
  }

  if (status === "approved") {
    return {
      heading: "Send your assessment to your assurer",
      body: "Your self-assessment has been internally approved and is ready to send for independent assurance.",
      href: "/assessments/current/send-to-assurer",
      actionText: "Send to assurer",
    };
  }

  if (status === "ready_for_approval") {
    return {
      heading: "Approve the reviewed self-assessment",
      body: "The internal review is complete. Approve the self-assessment to move to the next stage.",
      href: "/assessments/current/journey",
      actionText: "Go to task list",
    };
  }

  if (status === "in_review") {
    return {
      heading: "Awaiting internal review",
      body: "Your self-assessment has been sent for internal review. You will be notified when it is ready to approve.",
      href: "/assessments/current/journey",
      actionText: "View task list",
      secondary: true,
    };
  }

  const allComplete =
    bcSystems.length > 0 && bcSystems.every((s) => s.statusLabel === "Complete");
  if (allComplete) {
    return {
      heading: "Send your self-assessment for review",
      body: "All critical systems are complete. Send the self-assessment to your internal reviewer.",
      href: "/assessments/current/complete-self-assessment",
      actionText: "Send for review",
    };
  }

  const inProgressSystem = bcSystems.find((s) => s.statusLabel === "In progress");
  if (inProgressSystem) {
    return {
      heading: "Continue: " + inProgressSystem.name,
      body: "Pick up where you left off on this critical system.",
      href: inProgressSystem.actionHref,
      actionText: "Continue",
    };
  }

  const firstSystem = bcSystems[0];
  if (firstSystem) {
    return {
      heading: "Start your self-assessment",
      body: "Begin with your first critical system.",
      href: firstSystem.actionHref,
      actionText: "Start",
    };
  }

  return null;
}

function requireAssessmentPermission(req, res, permission) {
  const user = req && req.session && req.session.data ? req.session.data.user : null;
  if (userHasPermission(user, permission)) return true;
  res.status(403).render("pages/errors/restricted", {
    pageTitle: "Access restricted",
  });
  return false;
}

function getADReviewState(assessment) {
  ensureSectionReviewData(assessment);
  const state = assessment && assessment.selfAssess ? assessment.selfAssess.adReview : {};
  return {
    completed: Boolean(state.completed),
    completedAt: (state.completedAt || "").toString(),
    completedBy: (state.completedBy || "").toString(),
  };
}

function getBCReviewState(assessment) {
  ensureSectionReviewData(assessment);
  const state = assessment && assessment.selfAssess ? assessment.selfAssess.bcReview : {};
  const annualSetup = assessment && assessment.annualSetup ? assessment.annualSetup : {};
  const noSystemsChosen =
    annualSetup.systemsStepComplete === true &&
    Array.isArray(annualSetup.systemIds) &&
    annualSetup.systemIds.length === 0;
  return {
    completed: noSystemsChosen || Boolean(state.completed),
    completedAt: (state.completedAt || "").toString(),
    completedBy: (state.completedBy || "").toString(),
  };
}

function buildInternalSignOffSummary(assessment) {
  const completion = getAssessmentCompletionState(assessment);
  const signOff = getInternalSignOffState(assessment);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (signOff.completed) {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
  }

  return {
    href: "/assessments/current/internal-sign-off",
    statusText,
    statusClass,
    hint: `Judged ${completion.judgedCount} of ${completion.totalOutcomes}. Outstanding feedback: ${completion.outstandingFeedback}.`,
    ready: completion.readyForSignOff,
  };
}

function buildSubmitAssurerSummary(assessment) {
  const signOff = getInternalSignOffState(assessment);
  const submission = assessment.assurerSubmission || {};
  const submissionWindow = getSubmissionWindowState(assessment);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (submission.submitted) {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
  }

  return {
    href: "/assessments/current/submit-assessment",
    statusText,
    statusClass,
    hint: submissionWindow.submitByDateDisplay
      ? `Submit by ${submissionWindow.submitByDateDisplay} (5 working days before workshop).`
      : "Set workshop date in scope to confirm submission window.",
    ready: signOff.completed,
  };
}

function buildSendToAssurerSummary(assessment) {
  const collaborationState = getCollaborationWorkflowState(assessment);
  const submission = assessment.assurerSubmission || {};

  if (submission.submitted) {
    return {
      href: "/assessments/current/send-to-assurer/confirmation",
      statusText: "Complete",
      statusClass: "govuk-tag--green",
      hint: submission.submittedAt
        ? `Sent for independent assurance ${formatDateTimeDisplay(submission.submittedAt)}.`
        : "The assessment has been sent to the assurer.",
      locked: false,
    };
  }

  if (collaborationState.status === "approved") {
    return {
      href: "/assessments/current/send-to-assurer",
      statusText: "Not started",
      statusClass: "govuk-tag--grey",
      hint: "The assessment has been approved and is ready to send to the assurer.",
      locked: false,
    };
  }

  return {
    href: "/assessments/current/send-to-assurer",
    statusText: "Not started",
    statusClass: "govuk-tag--grey",
    hint: "Get internal sign-off first.",
    locked: true,
  };
}

function buildSelfAssessStartSummary(assessment) {
  const state = getSelfAssessStartState(assessment);
  const checks = [
    state.checkInBooked,
    state.outcomesReviewed,
    state.evidencePrepared,
  ];
  const completedCount = checks.filter(Boolean).length;

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (state.completed) {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
  } else if (completedCount > 0) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }

  return {
    href: "/assessments/current/start-self-assessment",
    statusText,
    statusClass,
    hint: `${completedCount} of 3 checks complete.`,
  };
}

function buildLensJourneySummary({ href, hint, statusText, statusClass }) {
  return {
    href,
    statusText,
    statusClass,
    hint,
  };
}

function getSelfAssessStartState(assessment) {
  const state = assessment && assessment.selfAssessStart ? assessment.selfAssessStart : {};
  return {
    checkInBooked: Boolean(state.checkInBooked),
    outcomesReviewed: Boolean(state.outcomesReviewed),
    evidencePrepared: Boolean(state.evidencePrepared),
    completed: Boolean(state.completed),
  };
}

function ensureAnnualSetupData(assessment) {
  if (!assessment) return;
  if (!assessment.annualSetup || typeof assessment.annualSetup !== "object") {
    assessment.annualSetup = {
      adApproach: "",
      systemIds: [],
      systemsStepComplete: false,
      annualLead: "",
      annualApprover: "",
      assurerContact: "",
      assuranceMonth: "",
      assuranceYear: "",
      assuranceWindow: "",
      checkInPlan: "",
      checkInNotes: "",
      completed: false,
      updatedAt: "",
    };
  }
  if (!Array.isArray(assessment.annualSetup.systemIds)) {
    assessment.annualSetup.systemIds = [];
  }
  if (!assessment.annualSetup.adApproach && assessment.annualSetup.adAssessmentStatus) {
    assessment.annualSetup.adApproach = assessment.hasPreviousAdAssessment
      ? assessment.annualSetup.adAssessmentStatus
      : "first_time";
  }
  if (assessment.annualSetup.adApproach && !assessment.annualSetup.systemsStepComplete && Array.isArray(assessment.annualSetup.systemIds)) {
    assessment.annualSetup.systemsStepComplete = true;
  }
  if (
    !assessment.annualSetup.completed &&
    isAnnualSetupAssessmentStepComplete(assessment)
  ) {
    assessment.annualSetup.completed = true;
  }
}

function ensureAssurancePlanningData(assessment) {
  if (!assessment) return;
  if (!assessment.assurancePlanning || typeof assessment.assurancePlanning !== "object") {
    const annualSetup = assessment.annualSetup || {};
    assessment.assurancePlanning = {
      assurerName: (annualSetup.assurerContact || "").toString(),
      provider: "",
      expectedTiming: (annualSetup.assuranceWindow || "").toString(),
      notes: (annualSetup.checkInNotes || "").toString(),
      updatedAt: "",
    };
  }
}

function ensureSectionReviewData(assessment) {
  if (!assessment) return;
  if (!assessment.selfAssess || typeof assessment.selfAssess !== "object") {
    assessment.selfAssess = { ad: {}, bc: {} };
  }
  if (!assessment.selfAssess.adReview || typeof assessment.selfAssess.adReview !== "object") {
    assessment.selfAssess.adReview = {
      completed: false,
      completedAt: "",
      completedBy: "",
    };
  }
  if (!assessment.selfAssess.bcReview || typeof assessment.selfAssess.bcReview !== "object") {
    assessment.selfAssess.bcReview = {
      completed: false,
      completedAt: "",
      completedBy: "",
    };
  }
}

function ensureCollaborationWorkflowData(assessment, currentUser) {
  if (!assessment) return;
  if (!assessment.collaborationWorkflow || typeof assessment.collaborationWorkflow !== "object") {
    assessment.collaborationWorkflow = {
      status: "draft",
      reviewerName: "",
      approverName: "",
      submittedAt: "",
      submittedBy: "",
      reviewDecision: "",
      reviewNotes: "",
      reviewedAt: "",
      reviewedBy: "",
      approvedAt: "",
      approvedBy: "",
      lastEditedAt: "",
      lastEditedBy: "",
    };
  }
  if (!assessment.collaborationWorkflow.approverName) {
    assessment.collaborationWorkflow.approverName =
      (assessment.annualSetup && assessment.annualSetup.annualApprover) ||
      (assessment.prepare && assessment.prepare.onboardingApprover) ||
      "";
  }
  if (!assessment.collaborationWorkflow.lastEditedBy && currentUser) {
    assessment.collaborationWorkflow.lastEditedBy = getAuditActor(currentUser);
  }
}

function getCollaborationWorkflowState(assessment, currentUser) {
  ensureCollaborationWorkflowData(assessment, currentUser);
  const state = assessment && assessment.collaborationWorkflow ? assessment.collaborationWorkflow : {};
  const submission = assessment && assessment.assurerSubmission ? assessment.assurerSubmission : {};
  const drafterName =
    (assessment && assessment.annualSetup && assessment.annualSetup.annualLead) ||
    (assessment && assessment.prepare && assessment.prepare.onboardingLead) ||
    (currentUser && currentUser.name) ||
    "CAF Lead";
  const meta = {
    draft: { label: "Draft", tagClass: "govuk-tag--grey" },
    in_review: { label: "In review", tagClass: "govuk-tag--blue" },
    needs_changes: { label: "Needs changes", tagClass: "govuk-tag--yellow" },
    ready_for_approval: { label: "Ready for approval", tagClass: "govuk-tag--blue" },
    approved: { label: "Approved", tagClass: "govuk-tag--green" },
  }[state.status || "draft"] || { label: "Draft", tagClass: "govuk-tag--grey" };

  return {
    status: (state.status || "draft").toString(),
    statusLabel: meta.label,
    statusTagClass: meta.tagClass,
    drafterName,
    reviewerName: (state.reviewerName || "").toString(),
    approverName: (state.approverName || "").toString(),
    submittedAt: (state.submittedAt || "").toString(),
    submittedBy: (state.submittedBy || "").toString(),
    reviewDecision: (state.reviewDecision || "").toString(),
    reviewNotes: (state.reviewNotes || "").toString(),
    reviewedAt: (state.reviewedAt || "").toString(),
    reviewedBy: (state.reviewedBy || "").toString(),
    approvedAt: (state.approvedAt || "").toString(),
    approvedBy: (state.approvedBy || "").toString(),
    lastEditedAt: (state.lastEditedAt || "").toString(),
    lastEditedBy: (state.lastEditedBy || "").toString(),
    assurerSubmitted: Boolean(submission.submitted),
  };
}

function getAssessmentWorkflowStatus(assessment, options = {}) {
  const submission = assessment && assessment.assurerSubmission ? assessment.assurerSubmission : {};
  const finalSubmission = assessment && assessment.submission ? assessment.submission : {};
  const signOff = getInternalSignOffState(assessment);
  const collaboration = getCollaborationWorkflowState(assessment, null);
  const stage1Report =
    assessment && assessment.assurance && assessment.assurance.stage1Report
      ? assessment.assurance.stage1Report
      : {};
  const internallyComplete = collaboration.status === "approved" || signOff.completed;
  const assuranceComplete = Boolean(stage1Report.finalisedAt);

  if (finalSubmission.submittedAt) {
    return { key: "submitted", label: "Submitted", tagClass: "govuk-tag--green" };
  }
  if (assuranceComplete) {
    return { key: "ready_for_submission", label: "Ready for submission", tagClass: "govuk-tag--turquoise" };
  }
  if (submission.submitted) {
    return { key: "in_independent_assurance", label: "In independent assurance", tagClass: "govuk-tag--blue" };
  }
  if (internallyComplete && options.preferReadyForIndependentAssurance) {
    return {
      key: "ready_for_independent_assurance",
      label: "Ready for independent assurance",
      tagClass: "govuk-tag--purple",
    };
  }
  if (internallyComplete) {
    return { key: "internally_complete", label: "Internally complete", tagClass: "govuk-tag--green" };
  }
  return { key: "in_progress", label: "In progress", tagClass: "govuk-tag--blue" };
}

function isRoundTwoRequest(req) {
  return Boolean(
    req &&
      req.session &&
      req.session.data &&
      req.session.data.researchRound === "round-2"
  );
}

function getInternalSignOffState(assessment) {
  const state = assessment && assessment.internalSignOff ? assessment.internalSignOff : {};
  return {
    qualityAssurerName: (state.qualityAssurerName || "").toString(),
    qualityAssurerDate: (state.qualityAssurerDate || "").toString(),
    approverName: (state.approverName || "").toString(),
    approverDate: (state.approverDate || "").toString(),
    completed: Boolean(state.completed),
    completedAt: (state.completedAt || "").toString(),
    completedBy: (state.completedBy || "").toString(),
  };
}

function getAssessmentCompletionState(assessment) {
  const { ad } = getOutcomesForVersion(assessment);
  const adTotal = countOutcomesInTree(ad);
  const adJudged = countADJudged(assessment);
  const prototypeBcOutcomeIds = ["B2a"];
  const bcData = assessment && assessment.selfAssess && assessment.selfAssess.bc ? assessment.selfAssess.bc : {};
  const bcSystemIds = Object.keys(bcData);
  const bcTotal = bcSystemIds.length * prototypeBcOutcomeIds.length;
  const bcJudged = countBCJudgedForSystems(assessment, bcSystemIds, prototypeBcOutcomeIds);
  const totalOutcomes = adTotal + bcTotal;
  const judgedCount = adJudged + bcJudged;
  const allJudged = totalOutcomes > 0 && judgedCount >= totalOutcomes;

  const allRows = getAllOutcomeRowsForFeedback(assessment);
  const outstandingFeedback = allRows.filter(
    (row) => row && row.status === "ready_for_internal_review"
  ).length;

  return {
    adTotal,
    adJudged,
    bcTotal,
    bcJudged,
    totalOutcomes,
    judgedCount,
    allJudged,
    outstandingFeedback,
    readyForSignOff: allJudged && outstandingFeedback === 0,
  };
}

function getSelectedAnnualSystems(assessment) {
  const scope = assessment && assessment.scope ? assessment.scope : {};
  const allSystems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const selectedIds = getResolvedBCSystemIds(assessment);
  const found = allSystems.filter((system) => selectedIds.includes(system.id));
  if (found.length > 0) return found;
  const bcData = assessment && assessment.selfAssess && assessment.selfAssess.bc ? assessment.selfAssess.bc : {};
  return Object.keys(bcData).map((id) => {
    const fromScope = allSystems.find((s) => s.id === id);
    return fromScope || { id, name: id };
  });
}

function getResolvedBCSystemIds(assessment) {
  const scope = assessment && assessment.scope ? assessment.scope : {};
  const validIds = new Set(
    Array.isArray(scope.criticalSystems) ? scope.criticalSystems.map((system) => system.id) : []
  );
  const shortlistIds = Array.isArray(scope.priorityShortlist)
    ? scope.priorityShortlist.filter((systemId) => validIds.has(systemId))
    : [];
  const annualIds =
    assessment && assessment.annualSetup && Array.isArray(assessment.annualSetup.systemIds)
      ? assessment.annualSetup.systemIds.filter((systemId) => validIds.has(systemId))
      : [];

  if (shortlistIds.length > 0) return shortlistIds.slice(0, PROTOTYPE_BC_SYSTEM_LIMIT);
  if (annualIds.length > 0) return annualIds.slice(0, PROTOTYPE_BC_SYSTEM_LIMIT);
  const bcDataIds = Object.keys(
    assessment && assessment.selfAssess && assessment.selfAssess.bc ? assessment.selfAssess.bc : {}
  ).filter((id) => validIds.has(id));
  if (bcDataIds.length > 0) return bcDataIds.slice(0, PROTOTYPE_BC_SYSTEM_LIMIT);
  return [];
}

function buildAssessmentExportOptions(assessment) {
  const { ad, bc } = getOutcomesForVersion(assessment);
  const adOutcomes = flattenOutcomes(ad);
  const bcOutcomes = flattenOutcomes(bc);
  const selectedSystems = getSelectedAnnualSystems(assessment);
  const bcSystems = selectedSystems.length > 0 ? selectedSystems : getPrototypeBCSystems(assessment.scope || {}, assessment);

  const sections = [
    {
      id: "ad",
      text: "A and D",
      description: "Organisation outcomes",
      outcomeCount: adOutcomes.length,
    },
    {
      id: "bc",
      text: "B and C",
      description: bcSystems.length > 0 ? `Critical systems outcomes across ${bcSystems.length} system${bcSystems.length === 1 ? "" : "s"}` : "Critical systems outcomes",
      outcomeCount: bcOutcomes.length * bcSystems.length,
    },
  ];

  const outcomes = [];

  adOutcomes.forEach((outcome) => {
    outcomes.push({
      id: outcome.id,
      sectionId: "ad",
      text: `${outcome.code} ${outcome.title}`,
      hint: "A and D",
    });
  });

  bcSystems.forEach((system) => {
    bcOutcomes.forEach((outcome) => {
      outcomes.push({
        id: `${system.id}:${outcome.id}`,
        sectionId: "bc",
        text: `${outcome.code} ${outcome.title}`,
        hint: system.name,
      });
    });
  });

  return {
    sections,
    outcomes,
    selectedSystems: bcSystems,
  };
}

function getAssessmentExportSelection(source, exportOptions) {
  const query = source || {};
  const defaultSection = exportOptions.sections[0] ? exportOptions.sections[0].id : "ad";
  const defaultOutcome = exportOptions.outcomes[0] ? exportOptions.outcomes[0].id : "";

  return {
    scopeType: ((query.scopeType || query.scope || "full").toString() || "full"),
    sectionId: ((query.sectionId || defaultSection).toString() || defaultSection),
    outcomeId: ((query.outcomeId || defaultOutcome).toString() || defaultOutcome),
  };
}

function validateAssessmentExportSelection(selection, exportOptions) {
  const errors = [];
  const scopeType = (selection.scopeType || "").toString();
  const validScopes = new Set(["full", "section", "outcome"]);
  const sectionIds = new Set((exportOptions.sections || []).map((section) => section.id));
  const outcomeIds = new Set((exportOptions.outcomes || []).map((outcome) => outcome.id));

  if (!validScopes.has(scopeType)) {
    errors.push({ field: "scopeType", text: "Select what you want to include in the summary." });
    return errors;
  }

  if (scopeType === "section" && !sectionIds.has(selection.sectionId)) {
    errors.push({ field: "sectionId", text: "Select a section to export." });
  }

  if (scopeType === "outcome" && !outcomeIds.has(selection.outcomeId)) {
    errors.push({ field: "outcomeId", text: "Select an outcome to export." });
  }

  return errors;
}

function buildAssessmentExportSummary(assessment, selection, exportOptions) {
  const { ad, bc } = getOutcomesForVersion(assessment);
  const adOutcomeMap = new Map(flattenOutcomes(ad).map((outcome) => [outcome.id, outcome]));
  const bcOutcomeMap = new Map(flattenOutcomes(bc).map((outcome) => [outcome.id, outcome]));
  const sections = [];
  const selectedSectionIds = selection.scopeType === "section"
    ? [selection.sectionId]
    : selection.scopeType === "full"
      ? ["ad", "bc"]
      : [];
  const bcScope = selection.scopeType === "outcome" ? parseBCOutcomeId(selection.outcomeId) : null;

  if (selection.scopeType === "full" || selection.scopeType === "section" || (selection.scopeType === "outcome" && adOutcomeMap.has(selection.outcomeId))) {
    const includeAllAd = selection.scopeType !== "outcome";
    const adOutcomes = [];

    adOutcomeMap.forEach((outcome) => {
      if (!includeAllAd && outcome.id !== selection.outcomeId) return;
      const saved = (assessment.selfAssess && assessment.selfAssess.ad && assessment.selfAssess.ad[outcome.id]) || {};
      adOutcomes.push(buildAssessmentExportOutcome({
        sectionId: "ad",
        outcome,
        saved,
        systemName: "",
        outcomeId: outcome.id,
      }));
    });

    if ((selectedSectionIds.includes("ad") || selection.scopeType === "outcome") && adOutcomes.length > 0) {
      sections.push({
        id: "ad",
        title: "A and D",
        subtitle: "Organisation outcomes",
        outcomes: adOutcomes,
      });
    }
  }

  if (selection.scopeType === "full" || selection.scopeType === "section" || bcScope) {
    const includeAllBc = selection.scopeType !== "outcome";
    const bcOutcomes = [];

    exportOptions.selectedSystems.forEach((system) => {
      const systemRows =
        assessment.selfAssess && assessment.selfAssess.bc && assessment.selfAssess.bc[system.id]
          ? assessment.selfAssess.bc[system.id].outcomes || {}
          : {};

      bcOutcomeMap.forEach((outcome) => {
        if (!includeAllBc && (!bcScope || bcScope.systemId !== system.id || bcScope.outcomeKey !== outcome.id)) {
          return;
        }
        const saved = systemRows[outcome.id] || {};
        bcOutcomes.push(buildAssessmentExportOutcome({
          sectionId: "bc",
          outcome,
          saved,
          systemName: system.name,
          outcomeId: `${system.id}:${outcome.id}`,
        }));
      });
    });

    if ((selectedSectionIds.includes("bc") || bcScope) && bcOutcomes.length > 0) {
      sections.push({
        id: "bc",
        title: "B and C",
        subtitle: "Critical systems outcomes",
        outcomes: bcOutcomes,
      });
    }
  }

  const scopeLabel = buildAssessmentExportScopeLabel(selection, exportOptions);

  return {
    title: "Assessment summary",
    scopeLabel,
    sections,
    outcomeCount: sections.reduce((total, section) => total + section.outcomes.length, 0),
    completion: getAssessmentCompletionState(assessment),
    collaborationState: getCollaborationWorkflowState(assessment, null),
    selectedSystems: getSelectedAnnualSystems(assessment),
  };
}

function buildAssessmentExportScopeLabel(selection, exportOptions) {
  if (selection.scopeType === "full") return "Entire assessment";
  if (selection.scopeType === "section") {
    const section = (exportOptions.sections || []).find((item) => item.id === selection.sectionId);
    return section ? `${section.text} section` : "Selected section";
  }
  const outcome = (exportOptions.outcomes || []).find((item) => item.id === selection.outcomeId);
  return outcome ? `Single outcome: ${outcome.text}${outcome.hint ? ` (${outcome.hint})` : ""}` : "Single outcome";
}

function buildAssessmentExportOutcome({ sectionId, outcome, saved, systemName, outcomeId }) {
  const igpAssessments = buildAssessmentExportIgpAssessments(saved.igpAssessments, outcome);
  const evidenceRefs = normaliseEvidenceRefs(saved.evidenceRefs).filter(hasAnyEvidenceValue);

  return {
    id: outcomeId,
    sectionId,
    code: outcome.code,
    title: outcome.title,
    description: outcome.description || "",
    systemName,
    judgement: (saved.judgement || "").toString(),
    rationale: (saved.rationale || "").toString(),
    evidenceRefs,
    igpAssessments,
    updatedAt: saved.updatedAt ? formatDateTimeDisplay(saved.updatedAt) : "",
  };
}

function buildAssessmentExportIgpAssessments(saved, outcome) {
  const existing = Array.isArray(saved) ? saved : [];
  return getPrototypeIgpStatements(outcome).map((statement, idx) => {
    const prior = existing[idx] || {};
    const response = (prior.response || "").toString();
    return {
      statement: statement.statement,
      maturity: (prior.maturity || mapLegacyIgpResponseToMaturity(response) || "").toString(),
      rationale: (prior.rationale || "").toString(),
      evidenceNote: (prior.evidenceNote || "").toString(),
      confidence: (prior.confidence || "").toString(),
    };
  });
}

function getPrototypeIgpStatements(outcome) {
  const byOutcome = {
    A1a: [
      {
        statement:
          "The security of network and information systems related to the operation of essential function(s) is not discussed or reported on regularly at board-level.",
      },
      {
        statement:
          "Board-level discussions on the security of network and information systems are based on partial or out-of-date information, without the benefit of expert guidance.",
      },
      {
        statement:
          "The security of network and information systems supporting your essential function(s) are not driven effectively by the direction set at board-level.",
      },
      {
        statement:
          "Senior management or other pockets of the organisation consider themselves exempt from some policies or expect special accommodations to be made.",
      },
      {
        statement:
          "Your organisation's approach and policy relating to the security of network and information systems supporting the operation of essential function(s) are owned and managed at board-level. These are communicated, in a meaningful way, to risk management decision-makers across the organisation.",
      },
      {
        statement:
          "Regular board-level discussions on the security of network and information systems supporting the operation of your essential function(s) take place, based on timely and accurate information and informed by expert guidance.",
      },
      {
        statement:
          "There is a board-level individual who has overall accountability for the security of network and information systems and drives regular discussion at board-level.",
      },
      {
        statement:
          "Direction set at board-level is translated into effective organisational practices that direct and control the security of the network and information systems supporting your essential functions(s).",
      },
      {
        statement:
          "The board has the information and understanding needed in order to effectively discuss how the security and resilience of network and information systems contributes to the delivery of essential function(s) and what the potential impact from compromise of those systems would be.",
      },
      {
        statement:
          "Security is recognised as an important enabler for the resilience of your essential function(s) and considered in all relevant discussions.",
      },
    ],
    B1a: [
      { statement: "Security policies and procedures exist for this critical system." },
      { statement: "Those policies and procedures are kept up to date." },
      { statement: "People supporting this system understand how the policies apply in practice." },
    ],
    C1b: [
      { statement: "Monitoring is in place to detect security events affecting this system." },
      { statement: "Alerts are reviewed and acted on in a timely way." },
      { statement: "Coverage includes the most important integrations and access points." },
    ],
  };

  if (outcome && byOutcome[outcome.id]) return byOutcome[outcome.id];

  const code = outcome && outcome.code ? String(outcome.code).charAt(0) : "";
  if (code === "A" || code === "D") {
    return [
      { statement: "Roles, policies or plans are defined and understood." },
      { statement: "This outcome is applied consistently across the council." },
      { statement: "Weaknesses are reviewed and acted on over time." },
    ];
  }

  return [
    { statement: "Controls are in place for this critical system." },
    { statement: "Those controls are used consistently in practice." },
    { statement: "Gaps are identified and addressed when they are found." },
  ];
}

function mapLegacyIgpResponseToMaturity(response) {
  if (response === "Yes") return "Fully in place";
  if (response === "Alternative control in place") return "Mostly in place";
  if (response === "Not applicable") return "Partially in place";
  if (response === "No") return "Not in place";
  return "";
}

function getAllOutcomeRowsForFeedback(assessment) {
  const { ad, bc } = getOutcomesForVersion(assessment);
  const prototypeAdIds = flattenOutcomes(ad).map((outcome) => outcome.id);
  const adRows = Object.values(assessment.progressTracker || {}).filter((row) =>
    prototypeAdIds.includes(row.outcomeId)
  );
  const bcRows = buildBCOutcomeRows(assessment, bc);
  return adRows.concat(bcRows);
}

function buildFeedbackNotifications(rows) {
  const list = [];
  for (const row of rows) {
    if (!row) continue;
    if (row.status === "ready_for_internal_review") {
      list.push({
        type: "awaiting",
        text: `Ready for internal review: ${row.outcomeCode} ${row.title}`,
        href: row.linkUrl || "",
      });
    } else if (row.status === "internally_reviewed") {
      list.push({
        type: "internal",
        text: `Internally reviewed: ${row.outcomeCode} ${row.title}`,
        href: row.linkUrl || "",
      });
    }
  }
  return list.slice(0, 6);
}

function getSubmissionWindowState(assessment) {
  const scope = assessment && assessment.scope ? assessment.scope : {};
  const schedule = scope.assuranceSchedule || {};
  const workshopDateIso = (schedule.workshopDate || "").toString();
  const workshopDate = parseDateISO(workshopDateIso);
  const fallbackSubmitBy = workshopDate ? subtractWorkingDays(workshopDate, 5) : null;
  const submitByDateIso = (schedule.shareByDate || "").toString() || (fallbackSubmitBy ? toIsoDateOnly(fallbackSubmitBy) : "");
  const submitByDate = parseDateISO(submitByDateIso);
  const today = startOfDay(new Date());
  const canSubmitNow = Boolean(submitByDate && today.getTime() <= submitByDate.getTime());

  return {
    workshopDateIso,
    workshopDateDisplay: workshopDate ? formatDateShort(workshopDate) : "",
    submitByDateIso,
    submitByDateDisplay: submitByDate ? formatDateShort(submitByDate) : "",
    todayDisplay: formatDateShort(today),
    canSubmitNow,
  };
}

function ensureAssuranceStageData(assessment) {
  if (!assessment) return;
  if (!assessment.assurance || typeof assessment.assurance !== "object") assessment.assurance = {};
  if (!assessment.assurance.workflowStage) assessment.assurance.workflowStage = "not_started";
  if (!assessment.assurance.objectives) {
    assessment.assurance.objectives = {
      adWorkshop: { scheduledAt: "", completedAt: "", notes: "" },
      bcWorkshop: { scheduledAt: "", completedAt: "", notes: "" },
    };
  }
  if (!Array.isArray(assessment.assurance.evidenceRequests)) assessment.assurance.evidenceRequests = [];
  if (!assessment.assurance.recordOfAudit) {
    assessment.assurance.recordOfAudit = { outcomes: [], igps: [], submittedAt: "", submittedBy: "" };
  }
  if (!assessment.assurance.stage1Report) {
    assessment.assurance.stage1Report = {
      items: [],
      draftSharedAt: "",
      draftSharedBy: "",
      councilAmendments: { status: "none", dueAt: "", submittedAt: "", notes: "" },
      finalisedAt: "",
      finalisedBy: "",
    };
  } else if (!assessment.assurance.stage1Report.councilAmendments) {
    assessment.assurance.stage1Report.councilAmendments = { status: "none", dueAt: "", submittedAt: "", notes: "" };
  }
  if (!assessment.assurance.councilWorkshopResponse) {
    assessment.assurance.councilWorkshopResponse = {
      decision: "",
      notes: "",
      respondedAt: "",
      respondedBy: "",
    };
  }
}

function ensureIipStage2Data(assessment) {
  if (!assessment.improvementPlan) assessment.improvementPlan = {};
  if (!assessment.improvementPlan.stage2) {
    assessment.improvementPlan.stage2 = {
      status: "not_started",
      timeline: { receivedStage1At: "", offlineDraftExpectedBy: "", lastUpdatedAt: "" },
      rows: [],
      internalApprovals: {
        qualityAssurerName: "",
        qualityAssurerDate: "",
        approverName: "",
        approverDate: "",
        signedOffAt: "",
        signedOffBy: "",
      },
      assurerReview: {
        submittedAt: "",
        submittedBy: "",
        sessionScheduledAt: "",
        sessionCompletedAt: "",
        sessionNotes: "",
        outcome: "",
        feedback: "",
      },
      rework: { required: false, submittedAt: "", notes: "", completedAt: "" },
      mhclgSubmission: { submittedAt: "", submittedBy: "", reference: "", notes: "" },
    };
  }
  const stage2 = assessment.improvementPlan.stage2;
  const stage1 = assessment.assurance && assessment.assurance.stage1Report ? assessment.assurance.stage1Report : {};
  if (stage1.finalisedAt && stage2.timeline && !stage2.timeline.receivedStage1At) {
    stage2.timeline.receivedStage1At = stage1.finalisedAt;
    const dt = new Date(stage1.finalisedAt);
    if (!Number.isNaN(dt.getTime())) {
      dt.setDate(dt.getDate() + 10);
      stage2.timeline.offlineDraftExpectedBy = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    }
  }
  if (Array.isArray(stage1.items) && stage1.items.length > 0 && Array.isArray(stage2.rows) && stage2.rows.length === 0) {
    stage2.rows = stage1.items.map((item, idx) => ({
      id: `stage2-${idx + 1}-${Date.now().toString(36)}`,
      outcomeId: (item.outcomeId || "").toString(),
      outcomeCode: (item.outcomeId || "").toString(),
      outcomeTitle: "Contributing outcome",
      objective: "",
      systemName: "",
      assurerRiskLevel: (item.riskLevel || "").toString(),
      assurerRecommendation: (item.recommendation || "").toString(),
      assurerRiskDescription: (item.riskDescription || "").toString(),
      assurerControlTypes: Array.isArray(item.controlTypes) ? [...item.controlTypes] : [],
      ownerId: "",
      ownerNameSnapshot: "",
      ownerDueDate: "",
      ownershipRolesResponsible: "",
      cost: "",
      effort: "",
      complexity: "",
      implementationJustification: "",
      implementationPriority: "",
      quarter1: "",
      quarter2: "",
      quarter3: "",
      quarter4: "",
      nextYearStarts: "",
      updatedAt: "",
    }));
    if (!stage2.status || stage2.status === "not_started") stage2.status = "drafting_offline";
  }
}

function buildIipStage2Summary(assessment) {
  ensureIipStage2Data(assessment);
  const stage2 = assessment.improvementPlan.stage2;
  const status = (stage2.status || "not_started").toString();
  const reviewOutcome = (stage2.assurerReview && stage2.assurerReview.outcome) || "";
  const rows = Array.isArray(stage2.rows) ? stage2.rows : [];
  const expectedBy = stage2.timeline && stage2.timeline.offlineDraftExpectedBy
    ? stage2.timeline.offlineDraftExpectedBy
    : "";
  const expectedByDisplay = expectedBy
    ? formatDateShort(parseDateISO(expectedBy))
    : "";
  const nextActionHref = !rows.length
    ? "/improvement-plan/stage-2"
    : status === "submitted_to_mhclg"
    ? "/improvement-plan/stage-2"
    : reviewOutcome === "accepted"
    ? "/improvement-plan/stage-2/submit-mhclg"
    : status === "rework_required"
    ? "/improvement-plan/stage-2/rework"
    : status === "internally_signed_off" || status === "rework_internally_signed_off"
    ? "/improvement-plan/stage-2/submit-assurer"
    : status === "submitted_to_assurer" || status === "assurer_session_scheduled"
    ? "/improvement-plan/stage-2"
    : "/improvement-plan/stage-2/review";

  return {
    statusLabel: formatStage2Status(status),
    expectedBy,
    expectedByDisplay,
    nextActionHref,
  };
}

function formatStage2Status(value) {
  const map = {
    not_started: "Not started",
    drafting_offline: "Drafting offline",
    setup_in_progress: "Set up in progress",
    in_progress: "In progress",
    ready_for_review: "Ready for internal review",
    ready_for_internal_signoff: "Ready for internal sign-off",
    internally_signed_off: "Internally signed off",
    submitted_to_assurer: "Submitted to assurer",
    assurer_session_scheduled: "Assurer session scheduled",
    rework_required: "Rework required",
    rework_in_progress: "Rework in progress",
    rework_internally_signed_off: "Rework internally signed off",
    submitted_to_mhclg: "Submitted to MHCLG",
  };
  return map[value] || "Not started";
}

function buildAssuranceComparison(assessment, ad, record, stage1) {
  const adData = (assessment.selfAssess && assessment.selfAssess.ad) || {};
  const recordOutcomes = Array.isArray(record.outcomes) ? record.outcomes : [];
  const recordIgps = Array.isArray(record.igps) ? record.igps : [];
  const stage1Items = stage1 && Array.isArray(stage1.items) ? stage1.items : [];

  const ratingLabel = { achieved: "Achieved", partial: "Partially achieved", not_achieved: "Not achieved" };

  const groups = [];
  for (const objective of (ad.objectives || [])) {
    const principles = [];
    for (const principle of (objective.principles || [])) {
      const outcomes = [];
      for (const outcome of (principle.outcomes || [])) {
        const selfAssess = adData[outcome.id] || {};
        const auditOutcome = recordOutcomes.find((o) => o.outcomeId === outcome.id) || {};
        const auditIgps = recordIgps.filter((i) => i.outcomeId === outcome.id);
        const stage1Item = stage1Items.find((i) => i.outcomeId === outcome.id) || {};

        const councilIgpList = Array.isArray(selfAssess.igpAssessments) ? selfAssess.igpAssessments : [];
        const reviewedIgpIds = auditIgps.map((i) => i.igpId);
        const councilIgpIds = councilIgpList.map((i) => i.igpId).filter(Boolean);
        const allIgpIds = [...new Set([...reviewedIgpIds, ...councilIgpIds])];
        const igps = allIgpIds.map((igpId) => {
          const auditIgp = auditIgps.find((i) => i.igpId === igpId) || {};
          const councilIgp = councilIgpList.find((i) => i.igpId === igpId) || {};
          return {
            igpId,
            councilMaturity: (councilIgp.maturity || "").toString(),
            councilRationale: (councilIgp.rationale || "").toString(),
            assurerAssessment: (auditIgp.assessment || "").toString(),
            assurerNote: (auditIgp.note || "").toString(),
          };
        });

        const hasData = Boolean(selfAssess.judgement) || Boolean(auditOutcome.assurerRating);
        if (!hasData) continue;

        outcomes.push({
          id: outcome.id,
          code: outcome.code,
          title: outcome.title,
          councilJudgement: (selfAssess.judgement || "").toString(),
          councilRationale: (selfAssess.rationale || "").toString(),
          assurerRating: (auditOutcome.assurerRating || "").toString(),
          assurerRatingLabel: ratingLabel[auditOutcome.assurerRating] || "",
          assurerJustification: (auditOutcome.justification || "").toString(),
          recommendation: (stage1Item.recommendation || "").toString(),
          riskLevel: (stage1Item.riskLevel || "").toString(),
          igps,
        });
      }
      if (outcomes.length > 0) {
        principles.push({ code: principle.code, title: principle.title, outcomes });
      }
    }
    if (principles.length > 0) {
      groups.push({ code: objective.code, title: objective.title, principles });
    }
  }
  return groups;
}

function buildBCAssuranceComparison(assessment, record, stage1) {
  const bcData = (assessment.selfAssess && assessment.selfAssess.bc) || {};
  const selectedSystems = getSelectedAnnualSystems(assessment);
  const recordOutcomes = Array.isArray(record.outcomes) ? record.outcomes : [];
  const recordIgps = Array.isArray(record.igps) ? record.igps : [];
  const stage1Items = stage1 && Array.isArray(stage1.items) ? stage1.items : [];
  const ratingLabel = { achieved: "Achieved", partial: "Partially achieved", not_achieved: "Not achieved" };

  const outcomes = [];
  for (const system of selectedSystems) {
    const systemData = (bcData[system.id] && bcData[system.id].outcomes && bcData[system.id].outcomes.B2a) || {};
    const compositeId = `B2a:${system.id}`;
    const auditOutcome = recordOutcomes.find((o) => o.outcomeId === compositeId) || {};
    const auditIgps = recordIgps.filter((i) => i.outcomeId === compositeId);
    const stage1Item = stage1Items.find((i) => i.outcomeId === "B2a") || {};

    const hasData = Boolean(systemData.judgement) || Boolean(auditOutcome.assurerRating);
    if (!hasData) continue;

    const councilIgpList = Array.isArray(systemData.igpAssessments) ? systemData.igpAssessments : [];
    const reviewedIgpIds = auditIgps.map((i) => i.igpId);
    const councilIgpIds = councilIgpList.map((i) => i.igpId).filter(Boolean);
    const allIgpIds = [...new Set([...reviewedIgpIds, ...councilIgpIds])];
    const igps = allIgpIds.map((igpId) => {
      const auditIgp = auditIgps.find((i) => i.igpId === igpId) || {};
      const councilIgp = councilIgpList.find((i) => i.igpId === igpId) || {};
      return {
        igpId,
        councilMaturity: (councilIgp.maturity || "").toString(),
        councilRationale: (councilIgp.rationale || "").toString(),
        assurerAssessment: (auditIgp.assessment || "").toString(),
        assurerNote: (auditIgp.note || "").toString(),
      };
    });

    outcomes.push({
      id: compositeId,
      code: "B2a",
      title: system.name,
      councilJudgement: (systemData.judgement || "").toString(),
      councilRationale: (systemData.rationale || "").toString(),
      assurerRating: (auditOutcome.assurerRating || "").toString(),
      assurerRatingLabel: ratingLabel[auditOutcome.assurerRating] || "",
      assurerJustification: (auditOutcome.justification || "").toString(),
      recommendation: (stage1Item.recommendation || "").toString(),
      riskLevel: (stage1Item.riskLevel || "").toString(),
      igps,
    });
  }

  if (outcomes.length === 0) return [];
  return [{ code: "B", title: "Managing security risk", principles: [{ code: "B2", title: "Identity and access control", outcomes }] }];
}

function buildAssuranceReportJourneySummary(assessment) {
  const submission = assessment.assurerSubmission || {};
  const sentToAssurer = Boolean(submission.submitted);
  if (!sentToAssurer) {
    return {
      href: "",
      statusText: "Not started",
      statusClass: "govuk-tag--grey",
      hint: "Send the self-assessment to the assurer first.",
      locked: true,
    };
  }
  const assuranceSummary = buildAssuranceSummary(assessment);
  const reportFinalised = assuranceSummary.reportFinalised;
  return {
    href: "/assessments/current/assurance-report",
    statusText: reportFinalised ? "Complete" : "In progress",
    statusClass: reportFinalised ? "govuk-tag--green" : "govuk-tag--blue",
    hint: reportFinalised
      ? "Assurance report received from the assurer."
      : "Waiting for the assurer to finalise and share their report.",
    locked: false,
  };
}

function buildRecommendationsJourneySummary(assessment) {
  const assuranceSummary = buildAssuranceSummary(assessment);
  const reportFinalised = assuranceSummary.reportFinalised;
  if (!reportFinalised) {
    return {
      href: "",
      statusText: "Not started",
      statusClass: "govuk-tag--grey",
      hint: "Receive the assurance report first.",
      locked: true,
    };
  }
  ensureIipStage2Data(assessment);
  const stage2 = (assessment.improvementPlan && assessment.improvementPlan.stage2) || {};
  const iipComplete = ["ready_for_review", "internally_signed_off", "rework_internally_signed_off", "submitted_to_assurer", "accepted", "submitted_to_mhclg"].includes(stage2.status);
  return {
    href: "/assessments/current/recommendations",
    statusText: iipComplete ? "Complete" : stage2.status !== "not_started" ? "In progress" : "Not started",
    statusClass: iipComplete ? "govuk-tag--green" : stage2.status !== "not_started" ? "govuk-tag--blue" : "govuk-tag--grey",
    hint: iipComplete
      ? "Improvement plan complete."
      : "Respond to the assurer's recommendations with an implementation plan.",
    locked: false,
  };
}

function buildFinaliseJourneySummary(assessment) {
  const finalised = assessment.finalised || {};
  if (finalised.at) {
    return {
      href: "/assessments/current/finalise/confirmation",
      statusText: "Complete",
      statusClass: "govuk-tag--green",
      hint: `Confirmed by ${finalised.by}. Reference: ${finalised.ref}`,
      locked: false,
    };
  }
  const assuranceSummary = buildAssuranceSummary(assessment);
  ensureIipStage2Data(assessment);
  const stage2 = (assessment.improvementPlan && assessment.improvementPlan.stage2) || {};
  const iipProgressed = Boolean(
    stage2.status && !["not_started", "drafting_offline"].includes(stage2.status)
  );
  const ready = assuranceSummary.reportFinalised || iipProgressed;
  return {
    href: "/assessments/current/finalise",
    statusText: "Not started",
    statusClass: "govuk-tag--grey",
    hint: ready
      ? "Confirm the assured assessment and IIP as final official records."
      : "Complete the assurance report and implementation plan steps first.",
    locked: !ready,
  };
}

function buildAssuranceSummary(assessment) {
  ensureAssuranceStageData(assessment);
  const record = assessment.assurance.recordOfAudit || { outcomes: [], igps: [], submittedAt: "" };
  const stage1 = assessment.assurance.stage1Report || { draftSharedAt: "", finalisedAt: "", councilAmendments: {} };
  const openEvidenceRequests = (assessment.assurance.evidenceRequests || []).filter((item) => item.status === "open").length;
  const deadline = parseDateISO((stage1.councilAmendments && stage1.councilAmendments.dueAt) || "");
  const today = startOfDay(new Date());
  const amendments = stage1.councilAmendments || {};
  const workshopResponse = assessment.assurance.councilWorkshopResponse || {};
  const hasExpiredWindow = Boolean(
    deadline && today.getTime() > deadline.getTime() && amendments.status !== "submitted"
  );
  const amendmentsStatus = hasExpiredWindow ? "expired" : (amendments.status || "none");
  const amendmentWindowOpen = Boolean(deadline && today.getTime() <= deadline.getTime() && amendmentsStatus !== "submitted");

  return {
    recordSubmitted: Boolean(record.submittedAt),
    reportDraftShared: Boolean(stage1.draftSharedAt),
    reportFinalised: Boolean(stage1.finalisedAt),
    recordStatus: record.submittedAt ? "Submitted" : "In progress",
    reportStatus: stage1.finalisedAt ? "Finalised" : stage1.draftSharedAt ? "Draft shared" : "Not shared",
    openEvidenceRequests,
    amendmentDueAt: deadline ? formatDateShort(deadline) : "",
    amendmentWindowOpen,
    amendmentsStatus,
    workshopResponseStatus:
      workshopResponse.decision === "confirm"
        ? "Confirmed"
        : workshopResponse.decision === "deny"
        ? "Changes requested"
        : "No response",
  };
}

function countOpenEvidenceRequestsForOutcome(requests, outcomeId) {
  if (!Array.isArray(requests) || !outcomeId) return 0;
  return requests.filter(
    (item) => item.status === "open" && String(item.outcomeId || "") === String(outcomeId || "")
  ).length;
}

function isValidIsoDate(value) {
  if (!value || typeof value !== "string") return false;
  const parsed = parseDateISO(value);
  return Boolean(parsed);
}

function parseDateISO(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) {
      return null;
    }
    return startOfDay(date);
  }

  const fallback = new Date(trimmed);
  if (Number.isNaN(fallback.getTime())) return null;
  return startOfDay(fallback);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function subtractWorkingDays(date, days) {
  const result = startOfDay(date);
  let remaining = Math.max(0, Number(days) || 0);
  while (remaining > 0) {
    result.setDate(result.getDate() - 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}

function formatDateShort(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeDisplay(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toIsoDateOnly(date) {
  const d = startOfDay(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildWhoInvolvedSummary(assessment, currentUser) {
  ensureSelfAssessContributors(assessment, currentUser);
  const assignmentStatus = getAssignmentStatus(assessment);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (assessment && assessment.whoInvolvedStepCompleted) {
    statusText = "Complete";
    statusClass = "govuk-tag--green";
  } else if (assignmentStatus.assigned > 0) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }

  return {
    href: "/assessments/current/start-self-assessment/assignments",
    statusText,
    statusClass,
    hint: "Assign owners and add contributors where needed.",
  };
}

function ensureProgressTrackerForStart(assessment) {
  if (!assessment) return;
  const { ad } = getOutcomesForVersion(assessment);
  const prototypeAdIds = flattenOutcomes(ad).map((outcome) => outcome.id);

  if (!assessment.progressTracker || Object.keys(assessment.progressTracker).length === 0) {
    assessment.progressTracker = buildInitialProgressTracker({
      outcomesTree: ad,
      users,
    });
    assessment.progressTracker = filterProgressTrackerByOutcomeIds(
      assessment.progressTracker,
      prototypeAdIds
    );
    assessment.updatedAt = new Date().toISOString();
    return;
  }

  const filteredProgressTracker = filterProgressTrackerByOutcomeIds(
    assessment.progressTracker,
    prototypeAdIds
  );
  const fullTracker = buildInitialProgressTracker({ outcomesTree: ad, users });
  let changed = Object.keys(filteredProgressTracker).length !== Object.keys(assessment.progressTracker).length;
  for (const id of prototypeAdIds) {
    if (!filteredProgressTracker[id]) {
      filteredProgressTracker[id] = fullTracker[id];
      changed = true;
    }
  }
  if (changed) {
    assessment.progressTracker = filteredProgressTracker;
    assessment.updatedAt = new Date().toISOString();
  }
}

function getAssignmentStatus(assessment) {
  const rows = buildAssignableRows(assessment);
  const total = rows.length;
  const assigned = rows.filter((row) => Boolean(row && row.ownerId)).length;
  return {
    total,
    assigned,
    unassigned: Math.max(0, total - assigned),
    allAssigned: total > 0 && assigned === total,
  };
}

function countOutcomesInTree(tree) {
  if (!tree || !Array.isArray(tree.objectives)) return 0;
  return flattenOutcomes(tree).length;
}

function hasStartedIgpAssessmentRow(row) {
  if (!row || !Array.isArray(row.igpAssessments)) {
    return Boolean(row && (row.igpResponse || row.rationale));
  }
  return row.igpAssessments.some((item) =>
    Boolean(
      (item.response || "").toString().trim() ||
      (item.maturity || "").toString().trim() ||
      (item.rationale || "").toString().trim() ||
      (item.evidenceNote || "").toString().trim() ||
      (item.confidence || "").toString().trim()
    )
  );
}

function countADJudged(assessment) {
  const ad = assessment && assessment.selfAssess && assessment.selfAssess.ad ? assessment.selfAssess.ad : {};
  let count = 0;
  for (const key of Object.keys(ad)) {
    const row = ad[key] || {};
    if (row.judgement && !(row.carriedForward && row.reviewRequired)) count += 1;
  }
  return count;
}

function countBCJudgedForSystems(assessment, systemIds, allowedOutcomeIds = null) {
  const bc = assessment && assessment.selfAssess && assessment.selfAssess.bc ? assessment.selfAssess.bc : {};
  const selectedSystemIds = Array.isArray(systemIds) ? systemIds : Object.keys(bc);
  const allowed = Array.isArray(allowedOutcomeIds) && allowedOutcomeIds.length > 0
    ? new Set(allowedOutcomeIds)
    : null;
  let count = 0;
  for (const systemId of selectedSystemIds) {
    const system = bc[systemId] || {};
    const outcomes = system.outcomes || {};
    for (const outcomeId of Object.keys(outcomes)) {
      if (allowed && !allowed.has(outcomeId)) continue;
      const row = outcomes[outcomeId] || {};
      if (row.judgement && !(row.carriedForward && row.reviewRequired)) count += 1;
    }
  }
  return count;
}

function journeyItem(title, summary, options) {
  const locked = Boolean(options && options.locked);
  const hint = summary.hint || "";
  const statusText = locked ? "Cannot start yet" : summary.statusText;
  const statusClass = locked ? "govuk-tag--grey" : summary.statusClass;
  const href = locked ? "" : summary.href;

  return {
    title: { text: title },
    href,
    hint: { text: hint },
    status: { tag: { text: statusText, classes: statusClass } },
  };
}

function findNextRecommendedAction(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const next = items.find((item) => item.href && item.status && item.status.tag && item.status.tag.text !== "Complete");
  if (!next) return null;
  return {
    text: next.title.text,
    href: next.href,
  };
}

function buildOutcomeGuidance(outcomeCode) {
  const principle = ((outcomeCode || "").split(".")[0] || "").toUpperCase();
  const byPrinciple = {
    A1: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-a-managing-security-risk/principle-a1-governance",
    A2: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-a-managing-security-risk/principle-a2-risk-management",
    A3: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-a-managing-security-risk/principle-a3-asset-management",
    A4: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-a-managing-security-risk/principle-a4-supply-chain",
    B1: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-b-protecting-against-cyber-attack/principle-b1-service-protection-policies-and-processes",
    B2: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-b-protecting-against-cyber-attack/principle-b2-identity-and-access-control",
    B3: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-b-protecting-against-cyber-attack/principle-b3-data-security",
    B4: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-b-protecting-against-cyber-attack/principle-b4-system-security",
    B5: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-b-protecting-against-cyber-attack/principle-b5-resilient-networks-and-systems",
    B6: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-b-protecting-against-cyber-attack/principle-b6-staff-awareness-and-training",
    C1: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-c-detecting-cyber-security-events/principle-c1-security-monitoring",
    C2: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-c-detecting-cyber-security-events/principle-c2-proactive-security-event-discovery",
    D1: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-d-minimising-the-impact-of-cyber-security-incidents/principle-d1-response-and-recovery-planning",
    D2: "https://www.ncsc.gov.uk/collection/cyber-assessment-framework/caf-objective-d-minimising-the-impact-of-cyber-security-incidents/principle-d2-lessons-learned",
  };

  const url = byPrinciple[principle] || "";
  if (!url) return null;
  return {
    url,
    text: `View guidance for ${principle} (opens in a new tab)`,
  };
}

function buildSelfAssessUrl(row) {
  if (!row) return "/self-assess/ad";

  const outcomeId = (row.outcomeId || "").toString();
  if (outcomeId.includes(":")) {
    const [systemId, bcOutcomeId] = outcomeId.split(":");
    if (systemId && bcOutcomeId) {
      if (bcOutcomeId === "B2a") {
        return B2A_SELF_ASSESS_HREF(systemId);
      }
      return `/self-assess/bc/${systemId}/outcomes/${bcOutcomeId}`;
    }
  }

  return `/self-assess/ad/${outcomeId}`;
}

function parseBCOutcomeId(outcomeId) {
  const value = (outcomeId || "").toString();
  if (!value.includes(":")) return null;
  const [systemId, outcomeKey] = value.split(":");
  if (!systemId || !outcomeKey) return null;
  return { systemId: decodeURIComponent(systemId), outcomeKey: decodeURIComponent(outcomeKey) };
}

function getBCOverviewRow(assessment, outcomesTree, rowId) {
  const parts = parseBCOutcomeId(rowId);
  if (!parts) return null;
  const rows = buildBCOutcomeRows(assessment, outcomesTree);
  return rows.find((row) => row.outcomeId === `${parts.systemId}:${parts.outcomeKey}`) || null;
}

function buildAssignableRows(assessment) {
  if (!assessment) return [];
  const adRows = Object.values(assessment.progressTracker || {}).map((row) => ({
    ...row,
    lens: "ad",
    systemName: "",
  }));
  const { bc } = getOutcomesForVersion(assessment);
  const bcRows = buildBCOutcomeRows(assessment, bc);
  return adRows.concat(bcRows);
}

function getAssignableRowById(assessment, outcomeId) {
  if (!assessment) return null;
  const adRow = assessment.progressTracker && assessment.progressTracker[outcomeId];
  if (adRow) {
    return {
      ...adRow,
      lens: "ad",
      systemName: "",
    };
  }
  const { bc } = getOutcomesForVersion(assessment);
  return getBCOverviewRow(assessment, bc, outcomeId);
}

function upsertAssignmentForOutcome(assessment, row, assignment) {
  if (!assessment || !row) return;
  const updatedAt = new Date().toISOString();
  const next = {
    ownerId: assignment.ownerId || "",
    collaboratorIds: coerceArray(assignment.collaboratorIds).filter(Boolean),
    additionalCollaborators: (assignment.additionalCollaborators || "").toString().trim(),
    updatedAt,
  };

  if ((row.lens || "ad") === "bc") {
    const parts = parseBCOutcomeId(row.outcomeId);
    if (!parts) return;
    if (!assessment.selfAssess) assessment.selfAssess = { ad: {}, bc: {} };
    if (!assessment.selfAssess.bc) assessment.selfAssess.bc = {};
    if (!assessment.selfAssess.bc[parts.systemId]) assessment.selfAssess.bc[parts.systemId] = { outcomes: {} };
    if (!assessment.selfAssess.bc[parts.systemId].outcomes) assessment.selfAssess.bc[parts.systemId].outcomes = {};
    const existing = assessment.selfAssess.bc[parts.systemId].outcomes[parts.outcomeKey] || {};
    assessment.selfAssess.bc[parts.systemId].outcomes[parts.outcomeKey] = {
      ...existing,
      ...next,
    };
    return;
  }

  const existing = (assessment.progressTracker && assessment.progressTracker[row.outcomeId]) || {};
  assessment.progressTracker[row.outcomeId] = {
    ...existing,
    ...next,
  };
}

function ensurePrototypeRecommendationSeed(assessment) {
  const stage1 = assessment.assurance && assessment.assurance.stage1Report;
  if (stage1 && Array.isArray(stage1.items) && stage1.items.length > 0) return;
  if (!assessment.assurance) assessment.assurance = {};
  const now = new Date();
  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return toIsoDateOnly(d);
  };
  assessment.assurance.stage1Report = {
    ...(assessment.assurance.stage1Report || {}),
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
    draftSharedAt: (stage1 && stage1.draftSharedAt) ? stage1.draftSharedAt : daysAgo(10),
    draftSharedBy: "Assurer",
    finalisedAt: (stage1 && stage1.finalisedAt) ? stage1.finalisedAt : daysAgo(7),
    finalisedBy: "Assurer",
    councilAmendments: (stage1 && stage1.councilAmendments) || { status: "none", dueAt: "", submittedAt: "", notes: "" },
  };
}

function enrichStage2RowsWithStage1Data(rows, stage1Items) {
  if (!Array.isArray(rows) || !Array.isArray(stage1Items)) return;
  for (const row of rows) {
    if (!row.assurerRiskDescription) {
      const item = stage1Items.find((i) => i.outcomeId === row.outcomeId) || {};
      row.assurerRiskDescription = (item.riskDescription || "").toString();
    }
    if (!Array.isArray(row.assurerControlTypes) || row.assurerControlTypes.length === 0) {
      const item = stage1Items.find((i) => i.outcomeId === row.outcomeId) || {};
      row.assurerControlTypes = Array.isArray(item.controlTypes) ? [...item.controlTypes] : [];
    }
  }
}

function seedPrototypeStage2RowData(rows) {
  if (!Array.isArray(rows)) return;
  const prototypeData = {
    A1a: {
      ownerId: "u-1",
      ownerNameSnapshot: "Alex Chen",
      ownerDueDate: "2026-03-31",
      ownershipRolesResponsible: "CAF Lead, Head of Governance, CEO office",
      cost: "£5,000 – £10,000 (facilitation and documentation)",
      effort: "medium",
      complexity: "medium",
      implementationJustification: "Board-level reporting cadence is foundational to effective governance. Without it, other cyber improvements cannot be effectively overseen or resourced.",
      implementationPriority: "high",
      quarter1: "01/26",
      quarter2: "04/26",
      quarter3: "07/26",
      quarter4: "10/26",
      nextYearStarts: "01/27",
    },
    A1b: {
      ownerId: "u-2",
      ownerNameSnapshot: "Sam Taylor",
      ownerDueDate: "2026-06-30",
      ownershipRolesResponsible: "Head of IT, HR Business Partner, Directorate leads",
      cost: "£2,000 – £4,000 (documentation and workshops)",
      effort: "low",
      complexity: "low",
      implementationJustification: "Roles and responsibilities documentation already partially exists. This work requires consolidation and sign-off rather than creation from scratch.",
      implementationPriority: "medium",
      quarter1: "01/26",
      quarter2: "04/26",
      quarter3: "07/26",
      quarter4: "10/26",
      nextYearStarts: "01/27",
    },
    B2a: {
      ownerId: "u-3",
      ownerNameSnapshot: "Priya Shah",
      ownerDueDate: "2026-09-30",
      ownershipRolesResponsible: "Head of IT, ICT Security Lead, Third-party Service Manager",
      cost: "£6,000 – £12,000 (tooling configuration and policy updates)",
      effort: "medium",
      complexity: "medium",
      implementationJustification: "MFA enforcement requires configuration changes across multiple systems and coordination with third-party support teams. A phased rollout by system priority is the most practical approach.",
      implementationPriority: "medium",
      quarter1: "",
      quarter2: "04/26",
      quarter3: "07/26",
      quarter4: "",
      nextYearStarts: "",
    },
  };
  for (const row of rows) {
    const seed = prototypeData[row.outcomeId];
    if (seed && !row.ownershipRolesResponsible) {
      Object.assign(row, seed);
    }
  }
}

function buildIIPOutcomesTree(ad, bc) {
  const b2aOutcome = flattenAllOutcomes(bc).find((o) => o.id === "B2a");
  if (!b2aOutcome) return ad;
  return {
    objectives: [
      ...ad.objectives,
      {
        code: "B",
        title: "Managing security risk",
        principles: [{ code: "B2", title: "Identity and access control", outcomes: [b2aOutcome] }],
      },
    ],
  };
}

function buildRecommendationGroups(stage2Rows, outcomesTree) {
  const rows = Array.isArray(stage2Rows) ? stage2Rows : [];
  const groups = [];
  for (const objective of (outcomesTree.objectives || [])) {
    const principles = [];
    for (const principle of (objective.principles || [])) {
      const matchedRows = [];
      for (const outcome of (principle.outcomes || [])) {
        const row = rows.find((r) => r.outcomeId === outcome.id);
        if (row) {
          matchedRows.push({
            ...row,
            outcomeCode: outcome.code || row.outcomeCode || row.outcomeId,
            outcomeTitle: outcome.title || row.outcomeTitle,
          });
        }
      }
      if (matchedRows.length > 0) {
        principles.push({ code: principle.code, title: principle.title, rows: matchedRows });
      }
    }
    if (principles.length > 0) {
      groups.push({ code: objective.code, title: objective.title, principles });
    }
  }
  return groups;
}

function findObjectiveForOutcome(outcomesTree, outcomeId) {
  for (const objective of (outcomesTree.objectives || [])) {
    for (const principle of (objective.principles || [])) {
      for (const outcome of (principle.outcomes || [])) {
        if (outcome.id === outcomeId) return objective;
      }
    }
  }
  return null;
}

function findPrincipleForOutcome(outcomesTree, outcomeId) {
  for (const objective of (outcomesTree.objectives || [])) {
    for (const principle of (objective.principles || [])) {
      for (const outcome of (principle.outcomes || [])) {
        if (outcome.id === outcomeId) return principle;
      }
    }
  }
  return null;
}

function isStage2RowComplete(row) {
  return Boolean(
    row.ownerId && row.ownerDueDate && row.ownershipRolesResponsible && row.cost &&
    row.effort && row.complexity && row.implementationJustification && row.implementationPriority &&
    row.quarter1 && row.quarter2
  );
}
