// app/routes/assessments.js
// Dashboard/Hub + Outcome progress record (structured updates + evidence refs + history)

const labels = require("../data/content/labels");
const statuses = require("../data/content/statuses");
const users = require("../data/seed/users");
const { CAF_CURRENT_VERSION, getOutcomesForVersion } = require("../data/helpers/caf-version");

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

const PROTOTYPE_OUTCOME_LIMITS = {
  AD: 2,
  BC: 1,
};
const PROTOTYPE_BC_SYSTEM_LIMIT = Number.POSITIVE_INFINITY;

module.exports = function (router) {
  router.use("/assessments", (req, res, next) => {
    if (!requireSignedIn(req, res)) return;
    if (!ensureAssessment(req)) return res.redirect("/entry");
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
      ensureAssessmentDates(assessment);
    }
    const { ad, bc } = getOutcomesForVersion(assessment);
    const prepareSummary = buildPrepareJourneySummary(assessment, { roundTwo });
    const onboardingPreparationSummary = roundTwo
      ? buildOnboardingPreparationSummary(assessment)
      : null;
    const onboardingRolesSummary = roundTwo ? buildOnboardingRolesSummary(assessment) : null;
    const scopeSummary = buildScopeJourneySummary(assessment, { roundTwo });
    const scopeContextSummary = roundTwo ? buildScopeContextSummary(assessment) : null;
    const essentialServicesSummary = roundTwo ? buildEssentialServicesSummary(assessment) : null;
    const criticalSystemsScopeSummary = roundTwo ? buildCriticalSystemsScopeSummary(assessment) : null;
    const annualSetupSummary = roundTwo
      ? buildAnnualSetupSummary(assessment, req.session.data.user || null)
      : null;
    const whoInvolvedSummary = buildWhoInvolvedSummary(assessment, req.session.data.user || null);
    const annualSetupComplete = roundTwo ? annualSetupSummary.statusText === "Completed" : false;
    const whoInvolvedComplete = roundTwo ? false : whoInvolvedSummary.statusText === "Completed";
    const selfAssessStartSummary = buildSelfAssessStartSummary(assessment);
    const selfAssessStartReady = roundTwo ? annualSetupComplete : whoInvolvedComplete;
    const selfAssessStartComplete = roundTwo
      ? annualSetupComplete
      : selfAssessStartSummary.statusText === "Completed";
    const iipSummary = buildIIPJourneySummary(assessment, { roundTwo });
    const internalSignOffSummary = buildInternalSignOffSummary(assessment);
    const submitAssurerSummary = buildSubmitAssurerSummary(assessment);
    const adLensSummary = buildADJourneySummary(assessment, ad, { roundTwo });
    const bcLensSummary = buildBCJourneySummary(assessment, bc, { roundTwo });
    const completeSelfAssessmentSummary = roundTwo
      ? buildCompleteSelfAssessmentSummary(assessment)
      : null;
    const adLocked =
      !selfAssessStartComplete &&
      adLensSummary.statusText !== "In progress" &&
      adLensSummary.statusText !== "Completed";
    const bcLocked =
      !selfAssessStartComplete &&
      bcLensSummary.statusText !== "In progress" &&
      bcLensSummary.statusText !== "Completed";

    const journeySections = roundTwo
      ? [
          {
            heading: "Get started",
            items: [
              journeyItem("Prepare for CAF", onboardingPreparationSummary, { locked: false }),
              journeyItem("Set up key roles", onboardingRolesSummary, { locked: false }),
            ],
          },
          {
            heading: "Set your CAF scope",
            items: [
              journeyItem("Provide organisation strategic context", scopeContextSummary, {
                locked: false,
              }),
              journeyItem("Identify essential services", essentialServicesSummary, {
                locked: false,
              }),
              journeyItem("Identify and prioritise critical systems", criticalSystemsScopeSummary, {
                locked: false,
              }),
            ],
          },
          {
            heading: "Set up this year's assessment",
            items: [
              journeyItem("Set up this year's assessment", annualSetupSummary, { locked: false }),
            ],
          },
          {
            heading: "Complete your self-assessment",
            items: [
              journeyItem(
                "Who is involved",
                !annualSetupComplete
                  ? {
                      ...whoInvolvedSummary,
                      statusText: "Cannot start yet",
                      statusClass: "govuk-tag--grey",
                    }
                  : whoInvolvedSummary,
                {
                locked: !annualSetupComplete,
                lockedHint: "Complete annual setup first.",
                }
              ),
              journeyItem("Complete A and D self-assessment", adLensSummary, {
                locked: adLocked,
                lockedHint: "Complete annual setup first.",
              }),
              journeyItem("Complete B and C self-assessment", bcLensSummary, {
                locked: bcLocked,
                lockedHint: "Complete annual setup first.",
              }),
              journeyItem("Complete your self-assessment", completeSelfAssessmentSummary, {
                locked: completeSelfAssessmentSummary.statusText === "Cannot start yet",
                lockedHint: "Complete the full self-assessment.",
              }),
            ],
          },
        ]
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
              journeyItem("A and D self-assessment (organisational)", adLensSummary, {
                locked: adLocked,
                lockedHint: "Complete Readiness checks first.",
              }),
              journeyItem("B and C self-assessment (critical systems)", bcLensSummary, {
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
                lockedHint: "Complete all outcomes and resolve assurer feedback first.",
              }),
              journeyItem("Submit full assessment to assurer", submitAssurerSummary, {
                locked: !submitAssurerSummary.ready,
                lockedHint: "Complete internal sign-off first.",
              }),
            ],
          },
        ];

    const allItems = journeySections.flatMap((section) => section.items);
    const nextAction = findNextRecommendedAction(allItems);
    const roundTwoProgress = roundTwo
      ? buildRoundTwoTaskListProgress(assessment, req.session.data.user || null)
      : null;

    res.render("pages/assessments/journey", {
      pageTitle: "CAF journey",
      labels,
      assessment,
      journeySections,
      nextAction,
      prepareSummary,
      scopeSummary,
      annualSetupSummary,
      roundTwo,
      assessmentStartedAtDisplay: roundTwo ? formatDateTimeDisplay(assessment.createdAt) : "",
      assessmentDueAtDisplay: roundTwo ? formatDateTimeDisplay(assessment.dueAt) : "",
      roundTwoProgress,
    });
  });

  router.get("/assessments/current/annual-setup", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    if (!assessment.scopeReview.completed) {
      return res.redirect("/assessments/current/review-scope");
    }
    return res.redirect(getAnnualSetupNextStep(assessment));
  });

  router.get("/assessments/current/annual-setup/assessment", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    if (!assessment.scopeReview.completed) {
      return res.redirect("/assessments/current/review-scope");
    }

    const scope = assessment.scope || {};
    const hasPreviousAdAssessment = Boolean(assessment.hasPreviousAdAssessment);
    const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
    const inScopeSystems = systems
      .filter((system) => Boolean(system && system.inScope))
      .map((system) => {
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

    return res.render("pages/assessments/annual-setup-assessment", {
      pageTitle: "Set up this year's assessment",
      labels,
      assessment,
      systems: inScopeSystems,
      form: {
        ...assessment.annualSetup,
        adAssessmentStatus: hasPreviousAdAssessment ? assessment.annualSetup.adAssessmentStatus : "new_assessment",
      },
      hasPreviousAdAssessment,
      error: null,
    });
  });

  router.post("/assessments/current/annual-setup/assessment", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    const scope = assessment.scope || {};
    const hasPreviousAdAssessment = Boolean(assessment.hasPreviousAdAssessment);
    const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
    const inScopeSystems = systems
      .filter((system) => Boolean(system && system.inScope))
      .map((system) => {
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
    const allowedSystemIds = new Set(inScopeSystems.map((system) => system.id));
    const requestedSystemIds = coerceArray(req.session.data.annualSystemIds).filter(Boolean);
    const selectedSystemIds = requestedSystemIds
      .filter((systemId) => allowedSystemIds.has(systemId))
      .slice(0, 3);

    const nextState = {
      ...assessment.annualSetup,
      adAssessmentStatus: hasPreviousAdAssessment
        ? (req.session.data.adAssessmentStatus || "").toString()
        : "new_assessment",
      systemIds: selectedSystemIds,
      completed: false,
      updatedAt: new Date().toISOString(),
    };

    const errors = [];
    if (hasPreviousAdAssessment && !nextState.adAssessmentStatus) {
      errors.push({ field: "adAssessmentStatus", text: "Select how you will handle the organisational assessment this year." });
    }
    if (selectedSystemIds.length === 0) {
      errors.push({ field: "annualSystemIds", text: "Select up to 3 critical systems for this year’s B and C assessment." });
    }
    if (requestedSystemIds.length > 3) {
      errors.push({ field: "annualSystemIds", text: "Select no more than 3 critical systems for this year’s B and C assessment." });
    }
    if (requestedSystemIds.some((systemId) => !allowedSystemIds.has(systemId))) {
      errors.push({ field: "annualSystemIds", text: "Select critical systems from the current in-scope systems list." });
    }

    if (errors.length > 0) {
      assessment.annualSetup = { ...assessment.annualSetup, ...nextState };
      return res.render("pages/assessments/annual-setup-assessment", {
        pageTitle: "Set up this year's assessment",
        labels,
        assessment,
        systems: inScopeSystems,
        form: {
          ...assessment.annualSetup,
          adAssessmentStatus: hasPreviousAdAssessment ? assessment.annualSetup.adAssessmentStatus : "new_assessment",
        },
        hasPreviousAdAssessment,
        error: { items: errors },
      });
    }

    assessment.annualSetup = nextState;
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.adAssessmentStatus;
    delete req.session.data.annualSystemIds;

    return res.redirect("/assessments/current/annual-setup/roles");
  });

  router.get("/assessments/current/annual-setup/roles", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    if (!assessment.scopeReview.completed) {
      return res.redirect("/assessments/current/review-scope");
    }
    if (!isAnnualSetupAssessmentStepComplete(assessment)) {
      return res.redirect("/assessments/current/annual-setup/assessment");
    }

    const annualRolesForm = buildAnnualRolesForm(assessment);

    return res.render("pages/assessments/annual-setup-roles", {
      pageTitle: "Set up annual roles",
      labels,
      assessment,
      form: annualRolesForm,
      rolesAudit: buildRolesAudit(
        assessment.annualSetup.annualRolesMeta,
        assessment.annualSetup.annualRolesHistory
      ),
      error: null,
    });
  });

  router.post("/assessments/current/annual-setup/roles", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    if (!isAnnualSetupAssessmentStepComplete(assessment)) {
      return res.redirect("/assessments/current/annual-setup/assessment");
    }

    const nextState = {
      ...assessment.annualSetup,
      annualLead: (req.session.data.annualLead || "").toString().trim(),
      annualApprover: (req.session.data.annualApprover || "").toString().trim(),
      completed: false,
      updatedAt: new Date().toISOString(),
    };

    const errors = [];
    if (!nextState.annualLead) {
      errors.push({ field: "annualLead", text: "Enter the CAF lead for this assessment year." });
    }
    if (!nextState.annualApprover) {
      errors.push({ field: "annualApprover", text: "Enter the approver for this assessment year." });
    }

    if (errors.length > 0) {
      assessment.annualSetup = nextState;
      return res.render("pages/assessments/annual-setup-roles", {
        pageTitle: "Set up annual roles",
        labels,
        assessment,
        form: assessment.annualSetup,
        rolesAudit: buildRolesAudit(
          assessment.annualSetup.annualRolesMeta,
          assessment.annualSetup.annualRolesHistory
        ),
        error: { items: errors },
      });
    }

    assessment.annualSetup = nextState;
    applyRoleAudit(assessment.annualSetup, "annualRoles", req.session.data.user || null, {
      lead: nextState.annualLead,
      approver: nextState.annualApprover,
    });
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.annualLead;
    delete req.session.data.annualApprover;

    return res.redirect("/assessments/current/annual-setup/planning");
  });

  router.get("/assessments/current/annual-setup/planning", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    if (!assessment.scopeReview.completed) {
      return res.redirect("/assessments/current/review-scope");
    }
    if (!isAnnualSetupAssessmentStepComplete(assessment)) {
      return res.redirect("/assessments/current/annual-setup/assessment");
    }
    if (!isAnnualSetupRolesStepComplete(assessment)) {
      return res.redirect("/assessments/current/annual-setup/roles");
    }

    return res.render("pages/assessments/annual-setup-planning", {
      pageTitle: "Plan assurance support",
      labels,
      assessment,
      form: assessment.annualSetup,
      error: null,
    });
  });

  router.post("/assessments/current/annual-setup/planning", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAnnualSetupData(assessment);
    ensureScopeReviewState(assessment);
    if (!isAnnualSetupAssessmentStepComplete(assessment)) {
      return res.redirect("/assessments/current/annual-setup/assessment");
    }
    if (!isAnnualSetupRolesStepComplete(assessment)) {
      return res.redirect("/assessments/current/annual-setup/roles");
    }

    const assuranceMonth = (req.session.data.assuranceMonth || "").toString().trim();
    const assuranceYear = (req.session.data.assuranceYear || "").toString().trim();
    const assuranceWindow = [assuranceMonth, assuranceYear].filter(Boolean).join(" ");

    const nextState = {
      ...assessment.annualSetup,
      assurerContact: (req.session.data.assurerContact || "").toString().trim(),
      assuranceMonth,
      assuranceYear,
      assuranceWindow,
      checkInPlan: (req.session.data.checkInPlan || "").toString(),
      checkInNotes: (req.session.data.checkInNotes || "").toString().trim(),
      completed: false,
      updatedAt: new Date().toISOString(),
    };

    const errors = [];
    if (!assuranceMonth) {
      errors.push({ field: "assuranceMonth", text: "Enter the month you expect to need assurer support." });
    }
    if (!assuranceYear) {
      errors.push({ field: "assuranceYear", text: "Enter the year you expect to need assurer support." });
    }

    if (errors.length > 0) {
      assessment.annualSetup = nextState;
      return res.render("pages/assessments/annual-setup-planning", {
        pageTitle: "Plan assurance support",
        labels,
        assessment,
        form: assessment.annualSetup,
        error: { items: errors },
      });
    }

    nextState.completed = true;
    assessment.annualSetup = nextState;
    assessment.scope.priorityShortlist = Array.isArray(nextState.systemIds) ? nextState.systemIds : [];
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.assurerContact;
    delete req.session.data.assuranceMonth;
    delete req.session.data.assuranceYear;
    delete req.session.data.assuranceWindow;
    delete req.session.data.checkInPlan;
    delete req.session.data.checkInNotes;

    return res.redirect("/assessments/current/annual-setup/complete");
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
      pageTitle: "Annual setup complete",
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

    ensureProgressTrackerForStart(assessment);
    ensureAnnualSetupData(assessment);
    ensureSectionReviewData(assessment);
    if (!assessment.annualSetup.completed) {
      return res.redirect("/assessments/current/journey");
    }
    const { ad } = getOutcomesForVersion(assessment);
    const outcomes = flattenOutcomes(ad);
    const total = countOutcomesInTree(ad);
    const judged = countADJudged(assessment);
    const rows = outcomes.map((outcome) => {
      const saved = (assessment.selfAssess && assessment.selfAssess.ad && assessment.selfAssess.ad[outcome.id]) || {};
      return {
        ...outcome,
        status: saved.judgement ? "In progress" : "Not started",
        href: buildSelfAssessUrl({ outcomeId: outcome.id }),
        actionText: saved.judgement ? "Review outcome" : "Start outcome",
      };
    });
    const frameworkChange = buildFrameworkChangeSummary(assessment, "ad", rows);
    rows.forEach((row) => {
      row.frameworkFlag = frameworkChange.updatedIds.includes(row.id) ? `Updated in CAF ${frameworkChange.currentVersion}` : "";
    });
    const primaryOutcome = rows[0] || null;
    const adPageStatus = judged === 0 ? "Not started" : judged >= total ? "Complete" : "In progress";
    const reviewState = getADReviewState(assessment);
    const readyToComplete = total > 0 && judged >= total;

    return res.render("pages/assessments/self-assessment-ad", {
      pageTitle: "Complete A and D self-assessment",
      assessment,
      total,
      judged,
      rows,
      primaryOutcome,
      adPageStatus,
      adAssessmentStatus: assessment.annualSetup.adAssessmentStatus || "",
      reviewState,
      readyToComplete,
      frameworkChange,
      error: null,
    });
  });

  router.post("/assessments/current/self-assessment/ad", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");

    ensureProgressTrackerForStart(assessment);
    ensureAnnualSetupData(assessment);
    ensureSectionReviewData(assessment);

    const { ad } = getOutcomesForVersion(assessment);
    const outcomes = flattenOutcomes(ad);
    const total = countOutcomesInTree(ad);
    const judged = countADJudged(assessment);
    const rows = outcomes.map((outcome) => {
      const saved = (assessment.selfAssess && assessment.selfAssess.ad && assessment.selfAssess.ad[outcome.id]) || {};
      return {
        ...outcome,
        status: saved.judgement ? "In progress" : "Not started",
        href: buildSelfAssessUrl({ outcomeId: outcome.id }),
        actionText: saved.judgement ? "Review outcome" : "Start outcome",
      };
    });
    const frameworkChange = buildFrameworkChangeSummary(assessment, "ad", rows);
    rows.forEach((row) => {
      row.frameworkFlag = frameworkChange.updatedIds.includes(row.id) ? `Updated in CAF ${frameworkChange.currentVersion}` : "";
    });
    const primaryOutcome = rows[0] || null;
    const adPageStatus = judged === 0 ? "Not started" : judged >= total ? "Complete" : "In progress";
    const reviewState = getADReviewState(assessment);
    const readyToComplete = total > 0 && judged >= total;
    const decision = (req.session.data.completeAdAssessment || "").toString();

    if (!readyToComplete) {
      return res.redirect("/assessments/current/self-assessment/ad");
    }

    if (!decision) {
      return res.render("pages/assessments/self-assessment-ad", {
        pageTitle: "Complete A and D self-assessment",
        assessment,
        total,
        judged,
        rows,
        primaryOutcome,
        adPageStatus,
        adAssessmentStatus: assessment.annualSetup.adAssessmentStatus || "",
        reviewState,
        readyToComplete,
        frameworkChange,
        error: { items: [{ field: "completeAdAssessment", text: "Select whether A and D is complete." }] },
      });
    }

    if (decision === "no") {
      delete req.session.data.completeAdAssessment;
      return res.redirect("/assessments/current/journey");
    }

    const nowIso = new Date().toISOString();
    assessment.selfAssess.adReview = {
      completed: true,
      completedAt: nowIso,
      completedBy: getAuditActor(req.session.data.user || null),
    };
    assessment.updatedAt = nowIso;
    delete req.session.data.completeAdAssessment;
    return res.redirect("/assessments/current/journey");
  });

  router.get("/assessments/current/self-assessment/bc", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/dashboard?lens=bc&view=all");
    }

    ensureProgressTrackerForStart(assessment);
    ensureAnnualSetupData(assessment);
    ensureSectionReviewData(assessment);
    if (!assessment.annualSetup.completed) {
      return res.redirect("/assessments/current/journey");
    }
    const { bc } = getOutcomesForVersion(assessment);
    const selectedSystems = getPrototypeBCSystems(assessment.scope || {}, assessment);
    const totalPerSystem = countOutcomesInTree(bc);
    const systems = selectedSystems.map((system) => {
      const judged = countBCJudgedForSystems(assessment, [system.id]);
      const refsCount = Array.isArray(system.diagramRefs) ? system.diagramRefs.filter(Boolean).length : 0;
      const mapping = getMapping(assessment.scope || {}, system.id);
      const mappedServices = (mapping && Array.isArray(mapping.serviceIds) ? mapping.serviceIds : [])
        .map((serviceId) => findService(assessment.scope || {}, serviceId))
        .filter(Boolean)
        .map((service) => service.name);
      const priority = getPriority(assessment.scope || {}, system.id);
      const status = judged === 0 ? "Not started" : judged >= totalPerSystem ? "Complete" : "In progress";
      return {
        ...system,
        judged,
        total: totalPerSystem,
        refsCount,
        mappedServices,
        mappedCount: mapping && Array.isArray(mapping.serviceIds) ? mapping.serviceIds.length : 0,
        priorityLevel: priority && priority.level ? priority.level : "",
        status,
      };
    });
    const frameworkChange = buildFrameworkChangeSummary(assessment, "bc", systems.length > 0 ? [{ id: "B1a" }] : []);
    systems.forEach((system) => {
      system.frameworkFlag = frameworkChange.updatedIds.includes("B1a") ? `Updated in CAF ${frameworkChange.currentVersion}` : "";
    });
    const bcPageStatus = systems.length === 0
      ? "Not started"
      : systems.every((system) => system.status === "Complete")
        ? "Complete"
        : systems.some((system) => system.judged > 0)
          ? "In progress"
          : "Not started";
    const primarySystem = systems[0] || null;
    const primaryActionHref = primarySystem
      ? `/self-assess/bc/${primarySystem.id}`
      : "/assessments/current/annual-setup/assessment";
    const primaryActionText = "Open selected system";
    const reviewState = getBCReviewState(assessment);
    const readyToComplete = totalPerSystem > 0 && systems.length > 0 && systems.every((system) => system.judged >= totalPerSystem);

    return res.render("pages/assessments/self-assessment-bc", {
      pageTitle: "Complete B and C self-assessment",
      assessment,
      systems,
      bcPageStatus,
      primaryActionHref,
      primaryActionText,
      hasCheckInPlanned: assessment.annualSetup.checkInPlan === "planned",
      assuranceWindow: assessment.annualSetup.assuranceWindow || "",
      checkInNotes: assessment.annualSetup.checkInNotes || "",
      reviewState,
      readyToComplete,
      frameworkChange,
      error: null,
    });
  });

  router.post("/assessments/current/self-assessment/bc", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) return res.redirect("/assessments/current/journey");

    ensureProgressTrackerForStart(assessment);
    ensureAnnualSetupData(assessment);
    ensureSectionReviewData(assessment);

    const { bc } = getOutcomesForVersion(assessment);
    const selectedSystems = getPrototypeBCSystems(assessment.scope || {}, assessment);
    const totalPerSystem = countOutcomesInTree(bc);
    const systems = selectedSystems.map((system) => {
      const judged = countBCJudgedForSystems(assessment, [system.id]);
      const refsCount = Array.isArray(system.diagramRefs) ? system.diagramRefs.filter(Boolean).length : 0;
      const mapping = getMapping(assessment.scope || {}, system.id);
      const mappedServices = (mapping && Array.isArray(mapping.serviceIds) ? mapping.serviceIds : [])
        .map((serviceId) => findService(assessment.scope || {}, serviceId))
        .filter(Boolean)
        .map((service) => service.name);
      const priority = getPriority(assessment.scope || {}, system.id);
      const status = judged === 0 ? "Not started" : judged >= totalPerSystem ? "Complete" : "In progress";
      return {
        ...system,
        judged,
        total: totalPerSystem,
        refsCount,
        mappedServices,
        mappedCount: mapping && Array.isArray(mapping.serviceIds) ? mapping.serviceIds.length : 0,
        priorityLevel: priority && priority.level ? priority.level : "",
        status,
      };
    });
    const frameworkChange = buildFrameworkChangeSummary(assessment, "bc", systems.length > 0 ? [{ id: "B1a" }] : []);
    systems.forEach((system) => {
      system.frameworkFlag = frameworkChange.updatedIds.includes("B1a") ? `Updated in CAF ${frameworkChange.currentVersion}` : "";
    });
    const bcPageStatus = systems.length === 0
      ? "Not started"
      : systems.every((system) => system.status === "Complete")
        ? "Complete"
        : systems.some((system) => system.judged > 0)
          ? "In progress"
          : "Not started";
    const primarySystem = systems[0] || null;
    const primaryActionHref = primarySystem
      ? `/self-assess/bc/${primarySystem.id}`
      : "/assessments/current/annual-setup/assessment";
    const primaryActionText = "Open selected system";
    const reviewState = getBCReviewState(assessment);
    const readyToComplete = totalPerSystem > 0 && systems.length > 0 && systems.every((system) => system.judged >= totalPerSystem);
    const decision = (req.session.data.completeBcAssessment || "").toString();

    if (!readyToComplete) {
      return res.redirect("/assessments/current/self-assessment/bc");
    }

    if (!decision) {
      return res.render("pages/assessments/self-assessment-bc", {
        pageTitle: "Complete B and C self-assessment",
        assessment,
        systems,
        bcPageStatus,
        primaryActionHref,
        primaryActionText,
        hasCheckInPlanned: assessment.annualSetup.checkInPlan === "planned",
        assuranceWindow: assessment.annualSetup.assuranceWindow || "",
        checkInNotes: assessment.annualSetup.checkInNotes || "",
        reviewState,
        readyToComplete,
        frameworkChange,
        error: { items: [{ field: "completeBcAssessment", text: "Select whether B and C is complete." }] },
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
    return res.redirect("/assessments/current/journey");
  });

  router.get("/assessments/current/complete-self-assessment", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    ensureSectionReviewData(assessment);
    const completion = getAssessmentCompletionState(assessment);
    const reviewState = getSelfAssessmentReviewState(assessment);
    const adReviewState = getADReviewState(assessment);
    const bcReviewState = getBCReviewState(assessment);
    if (!adReviewState.completed || !bcReviewState.completed) {
      return res.redirect("/assessments/current/journey");
    }
    const selectedSystems = getSelectedAnnualSystems(assessment);

    return res.render("pages/assessments/complete-self-assessment", {
      pageTitle: "Complete your self-assessment",
      assessment,
      completion,
      reviewState,
      adReviewState,
      bcReviewState,
      selectedSystems,
      error: null,
    });
  });

  router.get("/assessments/current/complete-self-assessment/download", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    ensureSectionReviewData(assessment);
    const completion = getAssessmentCompletionState(assessment);
    if (!getADReviewState(assessment).completed || !getBCReviewState(assessment).completed) {
      return res.redirect("/assessments/current/journey");
    }

    const selectedSystems = getSelectedAnnualSystems(assessment);
    res.setHeader("Content-Disposition", 'attachment; filename="webcaf-self-assessment-summary.html"');
    return res.render("pages/assessments/download-self-assessment-summary", {
      pageTitle: "Self-assessment summary",
      assessment,
      completion,
      reviewState: getSelfAssessmentReviewState(assessment),
      selectedSystems,
    });
  });

  router.post("/assessments/current/complete-self-assessment", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    ensureSectionReviewData(assessment);
    const completion = getAssessmentCompletionState(assessment);
    const confirm = (req.session.data.completeSelfAssessment || "").toString();
    const adReviewState = getADReviewState(assessment);
    const bcReviewState = getBCReviewState(assessment);
    if (!adReviewState.completed || !bcReviewState.completed) {
      return res.redirect("/assessments/current/journey");
    }
    if (!confirm) {
      return res.render("pages/assessments/complete-self-assessment", {
        pageTitle: "Complete your self-assessment",
        assessment,
        completion,
        reviewState: getSelfAssessmentReviewState(assessment),
        adReviewState,
        bcReviewState,
        selectedSystems: getSelectedAnnualSystems(assessment),
        error: { items: [{ field: "completeSelfAssessment", text: "Confirm that your self-assessment is complete." }] },
      });
    }
    if (confirm === "no") {
      delete req.session.data.completeSelfAssessment;
      return res.redirect("/assessments/current/journey");
    }

    assessment.selfAssessmentReview = {
      completed: true,
      completedAt: new Date().toISOString(),
      completedBy: getAuditActor(req.session.data.user || null),
    };
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.completeSelfAssessment;
    return res.redirect("/assessments/current/journey");
  });

  router.get("/assessments/current/review-scope", (req, res) => {
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScopeReviewState(assessment);
    const scope = assessment.scope || {};
    const essentialServices = Array.isArray(scope.essentialServices) ? scope.essentialServices : [];
    const criticalSystems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];

    return res.render("pages/assessments/review-scope", {
      pageTitle: "Review your CAF scope",
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
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScopeReviewState(assessment);
    ensureAnnualSetupData(assessment);

    const scopeChanged = (req.session.data.scopeChanged || "").toString();
    const scopeUpdateArea = (req.session.data.scopeUpdateArea || "").toString();
    assessment.scopeReview.scopeChanged = scopeChanged;
    assessment.scopeReview.scopeUpdateArea = scopeUpdateArea;
    assessment.scopeReview.decision =
      scopeChanged === "no"
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
    if (!scopeChanged) {
      errors.push({ field: "scopeChanged", text: "Select whether your CAF scope has changed." });
    }
    if (scopeChanged === "yes" && !scopeUpdateArea) {
      errors.push({ field: "scopeUpdateArea", text: "Select which part of your CAF scope you need to update." });
    }

    if (errors.length > 0) {
      return res.render("pages/assessments/review-scope", {
        pageTitle: "Review your CAF scope",
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

    if (scopeChanged === "no") {
      assessment.scopeReview.completed = true;
      assessment.annualSetup.scopeCheckStatus = "no_change";
      delete req.session.data.scopeChanged;
      delete req.session.data.scopeUpdateArea;
      return res.redirect("/assessments/current/annual-setup");
    }

    assessment.scopeReview.completed = false;
    assessment.annualSetup.scopeCheckStatus = "updated";
    assessment.annualSetup.completed = false;
    req.session.data.scopeReviewReturnTo = "/assessments/current/review-scope";
    delete req.session.data.scopeChanged;
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
        text: "Complete all outcomes and resolve assurer feedback before internal sign-off.",
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

    return res.redirect("/assessments/current/internal-sign-off?saved=1");
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
      signOff,
      submissionWindow,
      submitted,
      confirmChoice: "",
      error: null,
      saved: req.query.saved === "1",
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
        text: "Complete all outcomes and resolve assurer feedback before submission.",
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
    return res.redirect("/assessments/current/submit-assessment?saved=1");
  });

  router.get("/assessments/current/assurance-report", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);

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

  router.get("/assessments/current/start-self-assessment/people", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const currentUser = req.session.data.user || null;
    const contributors = ensureSelfAssessContributors(assessment, currentUser).map((person) => ({
      ...person,
      isLead: Boolean(currentUser && person.id === currentUser.id),
    }));

    return res.render("pages/assessments/start-self-assessment-people", {
      pageTitle: "Add people involved in assessment",
      labels,
      assessment,
      contributors,
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

    const currentUser = req.session.data.user || null;
    const contributors = ensureSelfAssessContributors(assessment, currentUser);
    const name = (req.session.data.selfAssessPersonName || "").toString().trim();
    const email = (req.session.data.selfAssessPersonEmail || "").toString().trim();
    const errors = [];
    if (!name) errors.push({ field: "selfAssessPersonName", text: "Enter a name." });
    if (!email) errors.push({ field: "selfAssessPersonEmail", text: "Enter an email address." });

    if (errors.length > 0) {
      return res.render("pages/assessments/start-self-assessment-people", {
        pageTitle: "Add people involved in assessment",
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
    return res.redirect("/assessments/current/start-self-assessment/people");
  });

  router.post("/assessments/current/start-self-assessment/people/:personId/remove", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const currentUser = req.session.data.user || null;
    const contributors = ensureSelfAssessContributors(assessment, currentUser);
    const personId = (req.params.personId || "").toString();

    const target = contributors.find((c) => c.id === personId);
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

    return res.redirect("/assessments/current/start-self-assessment/people");
  });

  router.get("/assessments/current/start-self-assessment/assignments", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureProgressTrackerForStart(assessment);
    const currentUser = req.session.data.user || null;
    const assignmentUsers = buildAssignmentUsers(assessment, currentUser);
    const rows = buildAssignableRows(assessment)
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
      pageTitle: "Assign people to outcomes",
      labels,
      assessment,
      rows,
      assignedCount,
      totalCount: rows.length,
    });
  });

  router.get("/assessments/current/start-self-assessment/assignments/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureProgressTrackerForStart(assessment);
    const row = getAssignableRowById(assessment, req.params.outcomeId);
    if (!row) {
      return res.redirect("/assessments/current/start-self-assessment/assignments");
    }

    const currentUser = req.session.data.user || null;
    const councilUsers = buildAssignmentUsers(assessment, currentUser);

    return res.render("pages/assessments/start-self-assessment-assign-outcome", {
      pageTitle: `Assign people: ${row.outcomeCode}`,
      labels,
      assessment,
      row,
      councilUsers,
      error: null,
    });
  });

  router.post("/assessments/current/start-self-assessment/assignments/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

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
      allowedIds.has(id)
    );
    const additionalCollaborators = (req.session.data.additionalCollaborators || "")
      .toString()
      .trim();

    const errors = [];
    if (!ownerId || !allowedIds.has(ownerId)) {
      errors.push({ field: "ownerId", text: "Select an assigned owner." });
    }

    if (errors.length > 0) {
      return res.render("pages/assessments/start-self-assessment-assign-outcome", {
        pageTitle: `Assign people: ${row.outcomeCode}`,
        labels,
        assessment,
        row: {
          ...row,
          ownerId,
          collaboratorIds,
          additionalCollaborators,
        },
        councilUsers,
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

    return res.redirect("/assessments/current/start-self-assessment/assignments");
  });

  // DASHBOARD (Progress tracker hub)
  router.get("/assessments/current/dashboard", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureAssuranceStageData(assessment);
    ensureIipStage2Data(assessment);
    const roundTwo = isRoundTwoRequest(req);

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
        linkUrl: roundTwo ? `/self-assess/ad/${row.outcomeId}` : `/assessments/current/outcomes/${row.outcomeId}`,
        selfAssessUrl: `/self-assess/ad/${row.outcomeId}`,
        systemName: "",
        ownerName: getParticipantName(assessment, row.ownerId, req.session.data.user) || "Unassigned",
        collaboratorCount:
          (Array.isArray(row.collaboratorIds) ? row.collaboratorIds.length : 0) +
          parseAdditionalCollaborators(row.additionalCollaborators).length,
      }));

    const bcRows = buildBCOutcomeRows(assessment, bc).map((row) => ({
      ...row,
      linkUrl: roundTwo ? row.selfAssessUrl : row.linkUrl,
      ownerName: getParticipantName(assessment, row.ownerId, req.session.data.user) || "Unassigned",
      collaboratorCount:
        (Array.isArray(row.collaboratorIds) ? row.collaboratorIds.length : 0) +
        parseAdditionalCollaborators(row.additionalCollaborators).length,
    }));
    const adFrameworkChange = roundTwo ? buildFrameworkChangeSummary(assessment, "ad", allRowsAd) : null;
    allRowsAd.forEach((row) => {
      row.frameworkFlag = adFrameworkChange && adFrameworkChange.updatedIds.includes(row.outcomeId)
        ? `Updated in CAF ${adFrameworkChange.currentVersion}`
        : "";
    });

    const bcFrameworkChange = roundTwo ? buildFrameworkChangeSummary(assessment, "bc", bcRows) : null;
    bcRows.forEach((row) => {
      row.frameworkFlag = bcFrameworkChange && bcFrameworkChange.updatedIds.includes(row.outcomeId)
        ? `Updated in CAF ${bcFrameworkChange.currentVersion}`
        : "";
    });

    const allRows = allRowsAd.concat(bcRows);
    const dashboardFrameworkChange = roundTwo && (adFrameworkChange || bcFrameworkChange)
      ? {
          changed: Boolean(
            (adFrameworkChange && adFrameworkChange.changed) ||
            (bcFrameworkChange && bcFrameworkChange.changed)
          ),
          assessmentVersion: (adFrameworkChange || bcFrameworkChange).assessmentVersion,
          currentVersion: (adFrameworkChange || bcFrameworkChange).currentVersion,
          updatedCount:
            ((adFrameworkChange && adFrameworkChange.updatedIds.length) || 0) +
            ((bcFrameworkChange && bcFrameworkChange.updatedIds.length) || 0),
          newOutcomes: [
            ...((adFrameworkChange && adFrameworkChange.newOutcomes) || []).map((row) => ({ ...row, lens: "A and D" })),
            ...((bcFrameworkChange && bcFrameworkChange.newOutcomes) || []).map((row) => ({ ...row, lens: "B and C" })),
          ].slice(0, 4),
        }
      : null;
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
    const roundTwoWorkQueues = isRoundTwoRequest(req)
      ? buildRoundTwoWorkQueues(allRows)
      : null;

    const cycleStartedAt = assessment.cycle ? formatTimestamp(assessment.cycle.startedAt) : "";
    const assuranceSummary = buildAssuranceSummary(assessment);
    const iipStage2Summary = buildIipStage2Summary(assessment);

    const bcSystems = buildBCSystemRows(assessment, bc);
    res.render("pages/assessments/dashboard", {
      pageTitle: labels.dashboard.pageTitle,
      labels,
      statuses,
      users,
      assessment,
      cycleStartedAt,
      query,
      grouped,
      summaryAll,
      summaryFiltered,
      bcSystems,
      notifications,
      assuranceSummary,
      iipStage2Summary,
      roundTwoWorkQueues,
      dashboardFrameworkChange,
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

    // Ensure newer fields exist (backwards-safe)
    const evidenceRefs = ensureAtLeastOneEvidenceRow(normaliseEvidenceRefs(outcomeRow.evidenceRefs));
    const history = Array.isArray(outcomeRow.history) ? outcomeRow.history : [];
    const statusMeta = getStatusMeta(statuses, outcomeRow.status);
    const assignment = buildAssignmentDisplay(
      buildAssignmentUsers(assessment, req.session.data.user || null),
      outcomeRow.ownerId,
      outcomeRow.collaboratorIds,
      outcomeRow.additionalCollaborators
    );
    const latestUpdate = getLatestHistoryEntry(history);

    const query = normaliseQuery(req.query);
    const selfAssessSummary = buildSelfAssessSummary(assessment, outcomeId);
    const outcomeGuidance = buildOutcomeGuidance(outcomeRow.outcomeCode);
    const selfAssessUrl = buildSelfAssessUrl(outcomeRow);
    ensureAssuranceStageData(assessment);
    const openEvidenceRequestCount = countOpenEvidenceRequestsForOutcome(
      assessment.assurance.evidenceRequests || [],
      outcomeRow.outcomeId
    );

    res.render("pages/assessments/outcome", {
      pageTitle: `${labels.outcome.pageTitlePrefix} ${outcomeRow.outcomeCode}`,
      labels,
      statuses,
      users: buildAssignmentUsers(assessment, req.session.data.user || null),
      row: {
        ...outcomeRow,
        dueDateInput: formatDateForInput(outcomeRow.dueDate),
        evidenceRefs,
        history: formatHistoryEntries(history), // newest first
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
      openEvidenceRequestCount,
      error: null,
    });
  });

  // OUTCOME DETAIL (actions + save)
  router.post("/assessments/current/outcomes/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const outcomeId = req.params.outcomeId;
    const existing = assessment.progressTracker && assessment.progressTracker[outcomeId];
    if (!existing && parseBCOutcomeId(outcomeId)) {
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
      const previouslyShared = existing.status === "feedback_received" || existing.status === "updated_after_feedback";
      const shareSummary = previouslyShared
        ? "Updated and re-shared with assurer for feedback."
        : "Shared with assurer for feedback.";

      history.push({
        at: nowIso,
        by: actor,
        summary: shareSummary,
        status: "ready_for_review",
        statusLabel: getStatusLabel(statuses, "ready_for_review"),
        dueDate: dueDate || existing.dueDate || "",
        blocker: "",
        nextStep: "Await assurer feedback",
      });

      assessment.progressTracker[outcomeId] = {
        ...existing,
        ownerId: ownerIdValue,
        collaboratorIds,
        additionalCollaborators,
        status: "ready_for_review",
        dueDate,
        blocker: "",
        nextStep: "Await assurer feedback",
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
      return res.redirect(`/assessments/current/dashboard${qs ? `?${qs}` : ""}`);
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
    return res.redirect(`/assessments/current/dashboard${qs ? `?${qs}` : ""}`);
  });
};

function clearOutcomeFormAction(req) {
  delete req.session.data.action;
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

  const prepare = assessment.prepare || {};
  const annualSetup = assessment.annualSetup || {};

  if (prepare.onboardingLead) {
    upsertContributor(list, buildNamedContributor("onboarding-lead", prepare.onboardingLead, "CAF lead"));
  }
  if (prepare.onboardingApprover) {
    upsertContributor(list, buildNamedContributor("onboarding-approver", prepare.onboardingApprover, "Approver"));
  }
  if (annualSetup.annualLead) {
    upsertContributor(list, buildNamedContributor("annual-lead", annualSetup.annualLead, "CAF lead"));
  }
  if (annualSetup.annualApprover) {
    upsertContributor(list, buildNamedContributor("annual-approver", annualSetup.annualApprover, "Approver"));
  }

  const onboardingContributors = (prepare.onboardingContributors || "")
    .toString()
    .split(/\n|,/) 
    .map((value) => value.trim())
    .filter(Boolean);

  onboardingContributors.forEach((name, index) => {
    upsertContributor(list, buildNamedContributor(`onboarding-contributor-${index + 1}`, name, "Contributor"));
  });

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
  return Boolean(ref.refId || ref.type || ref.link || ref.note);
}

function validateEvidenceRefs(evidenceRefs, labels) {
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0) {
    return labels.errors.evidenceRequired;
  }

  for (const ref of evidenceRefs) {
    if (!ref) continue;
    const hasIdOrLink = Boolean(ref.refId || ref.link);
    if (!hasIdOrLink) {
      return labels.errors.evidenceRequired;
    }
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
  const annualSelected = assessment && assessment.annualSetup && Array.isArray(assessment.annualSetup.systemIds)
    ? assessment.annualSetup.systemIds
    : [];
  const shortlist = annualSelected.length > 0 ? annualSelected : Array.isArray(scope.priorityShortlist) ? scope.priorityShortlist : [];
  const outcomeList = flattenOutcomes(outcomesTree);
  const totalOutcomes = outcomeList.length;

  return systems.map((system) => {
    const bcData =
      assessment.selfAssess && assessment.selfAssess.bc && assessment.selfAssess.bc[system.id]
        ? assessment.selfAssess.bc[system.id]
        : { outcomes: {} };

    const outcomeData = bcData.outcomes || {};
    let completed = 0;
    let evidenceCount = 0;
    let latestUpdatedAt = "";

    for (const outcome of outcomeList) {
      const saved = outcomeData[outcome.id] || {};
      if (saved.judgement) completed += 1;
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
    if (completed > 0 && completed < totalOutcomes) statusLabel = "In progress";
    if (totalOutcomes > 0 && completed === totalOutcomes) statusLabel = "Complete";

    return {
      id: system.id,
      name: system.name,
      inShortlist: shortlist.includes(system.id),
      totalOutcomes,
      completed,
      evidenceCount,
      statusLabel,
      lastUpdatedAt: latestUpdatedAt ? formatTimestamp(latestUpdatedAt) : "",
    };
  });
}

function buildBCOutcomeRows(assessment, outcomesTree) {
  const scope = assessment.scope || {};
  const systems = getPrototypeBCSystems(scope, assessment);
  const outcomeList = flattenOutcomes(outcomesTree);

  const rows = [];

  for (const system of systems) {
    const bcData =
      assessment.selfAssess && assessment.selfAssess.bc && assessment.selfAssess.bc[system.id]
        ? assessment.selfAssess.bc[system.id]
        : { outcomes: {} };
    const outcomeData = bcData.outcomes || {};

    for (const outcome of outcomeList) {
      const saved = outcomeData[outcome.id] || {};
      const evidenceCount = Array.isArray(saved.evidenceRefs)
        ? saved.evidenceRefs.filter(hasAnyEvidenceValue).length
        : 0;
      const hasContent = Boolean(saved.igpResponse || saved.rationale || evidenceCount > 0);
      const statusValue = (saved.status || "").toString() || (
        saved.blocker
          ? "blocked"
          : saved.judgement
          ? "complete"
          : hasContent
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
        nextStep: "",
        evidenceCount,
        isMissingEvidence: evidenceCount === 0 && Boolean(saved.judgement),
        isOverdue: false,
        isBlocked: Boolean(saved.blocker),
        isReadyForReview: false,
        isNeedsAttention: (evidenceCount === 0 && Boolean(saved.judgement)) || Boolean(saved.blocker),
        lastUpdateAt: saved.updatedAt ? formatTimestamp(saved.updatedAt) : "",
        lastUpdateSummary: "",
        linkUrl: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
        selfAssessUrl: `/self-assess/bc/${system.id}/outcomes/${outcome.id}`,
        systemName: system.name,
      });
    }
  }

  return rows;
}

function getPrototypeBCSystems(scope, assessment) {
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const selectedIds = assessment && assessment.annualSetup && Array.isArray(assessment.annualSetup.systemIds)
    ? assessment.annualSetup.systemIds
    : [];

  if (selectedIds.length > 0) {
    return systems.filter((system) => selectedIds.includes(system.id)).slice(0, PROTOTYPE_BC_SYSTEM_LIMIT);
  }

  const inScopeSystems = systems.filter((system) => Boolean(system && system.inScope));
  const source = inScopeSystems.length > 0 ? inScopeSystems : systems;
  return source.slice(0, PROTOTYPE_BC_SYSTEM_LIMIT);
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
      refId: (ref.refId || "").toString().trim(),
      type: (ref.type || "").toString().trim(),
      link: (ref.link || "").toString().trim(),
      note: (ref.note || "").toString().trim(),
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
  const inScopeSystems = systems.filter((system) => Boolean(system.inScope));
  const mappedCount = systems.filter((system) => {
    const mapping = Array.isArray(scope.mappings)
      ? scope.mappings.find((m) => m.systemId === system.id)
      : null;
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;
  const isComplete = roundTwo
    ? isRoundTwoScopeComplete(assessment)
    : Boolean(assessment.stage && assessment.stage.prepareScopeComplete);
  const contextComplete = Boolean(scope.context && scope.context.completed);
  const rolesComplete = Boolean(scope.rolesConfirmed);
  const servicesComplete = Boolean(scope.servicesConfirmed);
  const systemsComplete = roundTwo
    ? systems.length > 0 && inScopeSystems.length > 0 && mappedCount === systems.length
    : systems.length >= 3 && inScopeSystems.length >= 3 && mappedCount === systems.length;
  const completedSteps = roundTwo
    ? (contextComplete ? 1 : 0) + (servicesComplete ? 1 : 0) + (systemsComplete ? 1 : 0)
    : (contextComplete && rolesComplete ? 1 : 0) +
      (servicesComplete ? 1 : 0) +
      (systemsComplete ? 1 : 0) +
      (isComplete ? 1 : 0);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (isComplete) {
    statusText = "Completed";
    statusClass = "govuk-tag--green";
  } else if (services.length > 0 || systems.length > 0 || (scope.context && scope.context.completed)) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }

  return {
    href: roundTwo ? "/assessments/current/journey" : "/stages/2/scope",
    statusText,
    statusClass,
    hint: roundTwo
      ? `${completedSteps} of 3 complete: context, essential services, critical systems. This register is maintained over time and reused each year.`
      : `${completedSteps} of 4 complete: strategic context, essential services, priority systems, share with assurers.`,
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
    prepare.onboardingLead || prepare.onboardingApprover || prepare.onboardingContributors
  );
  const isComplete = roundTwo
    ? Boolean(prepare.onboardingUnderstandingComplete && prepare.onboardingRolesComplete && prepare.guidanceRead)
    : Boolean(prepare.guidanceRead) || selectedCount === checks.length;

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (!isComplete && (selectedCount > 0 || rolesStepStarted)) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }
  if (isComplete) {
    statusText = "Completed";
    statusClass = "govuk-tag--green";
  }

  return {
    href: "/prepare",
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

function buildOnboardingPreparationSummary(assessment) {
  const prepare = assessment.prepare || {};
  const checks = ["understandService", "hasStakeholderSupport"];
  const selectedCount = checks.filter((field) => Boolean(prepare[field])).length;
  const isComplete = Boolean(prepare.onboardingUnderstandingComplete);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (isComplete) {
    statusText = "Completed";
    statusClass = "govuk-tag--green";
  } else if (selectedCount > 0) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }

  return {
    href: "/prepare",
    statusText,
    statusClass,
    hint: isComplete
      ? "Preparation complete."
      : "Confirm understanding and internal support.",
  };
}

function buildOnboardingRolesSummary(assessment) {
  const prepare = assessment.prepare || {};
  const hasStarted = Boolean(
    prepare.onboardingLead || prepare.onboardingApprover || prepare.onboardingContributors
  );
  const isComplete = Boolean(prepare.onboardingRolesComplete);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (isComplete) {
    statusText = "Completed";
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
      ? "Key roles added."
      : "Add the CAF lead and approver.",
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
    statusText: contextComplete ? "Completed" : hasStarted ? "In progress" : "Not started",
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
  const hasStarted = Boolean(systems.length > 0 || mappedCount > 0);

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

function scopeContextCompleted(scope) {
  return Boolean(scope && scope.context && scope.context.completed);
}

function isRoundTwoScopeComplete(assessment) {
  if (!assessment || !assessment.scope) return false;
  const scope = assessment.scope;
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const inScopeSystems = systems.filter((system) => Boolean(system && system.inScope));
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
    inScopeSystems.length > 0 &&
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

function buildRoundTwoTaskListProgress(assessment, currentUser) {
  ensureSectionReviewData(assessment);
  const prepare = assessment && assessment.prepare ? assessment.prepare : {};
  const scope = assessment && assessment.scope ? assessment.scope : {};
  const annualSetup = assessment && assessment.annualSetup ? assessment.annualSetup : {};
  const adReview = getADReviewState(assessment);
  const bcReview = getBCReviewState(assessment);
  const reviewState = getSelfAssessmentReviewState(assessment);
  const assignmentStatus = getAssignmentStatus(assessment);

  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const inScopeSystems = systems.filter((system) => Boolean(system && system.inScope));
  const mappedCount = systems.filter((system) => {
    const mapping = getMapping(scope, system.id);
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;
  const prioritisedCount = systems.filter((system) => {
    const priority = getPriority(scope, system.id);
    return Boolean(priority && priority.level);
  }).length;

  const milestones = [
    {
      label: "Get started",
      completed: Boolean(prepare.onboardingUnderstandingComplete) && Boolean(prepare.onboardingRolesComplete),
    },
    {
      label: "CAF scope set",
      completed:
        scopeContextCompleted(scope) &&
        Array.isArray(scope.essentialServices) &&
        scope.essentialServices.length > 0 &&
        systems.length > 0 &&
        inScopeSystems.length > 0 &&
        mappedCount === systems.length &&
        prioritisedCount === systems.length,
    },
    {
      label: "This year's assessment set up",
      completed: Boolean(annualSetup.completed),
    },
    {
      label: "Who is involved set up",
      completed: assignmentStatus.allAssigned,
    },
    {
      label: "A and D complete",
      completed: adReview.completed,
    },
    {
      label: "B and C complete",
      completed: bcReview.completed,
    },
    {
      label: "Ready for independent review",
      completed: reviewState.completed,
    },
  ];

  const total = milestones.length;
  const completed = milestones.filter((milestone) => milestone.completed).length;
  const currentIndex = milestones.findIndex((milestone) => !milestone.completed);
  const nextMilestone = currentIndex >= 0 ? milestones[currentIndex] : null;

  const milestonesWithState = milestones.map((milestone, index) => ({
    ...milestone,
    state: milestone.completed ? "completed" : index === currentIndex ? "current" : "not_yet",
  }));

  return {
    completed,
    total,
    milestones: milestonesWithState,
    nextMilestoneLabel: nextMilestone ? nextMilestone.label : "",
  };
}

function buildAnnualSetupSummary(assessment, currentUser) {
  ensureAnnualSetupData(assessment);
  ensureScopeReviewState(assessment);
  const state = assessment.annualSetup || {};
  const scopeReview = assessment.scopeReview || {};
  const contributors = ensureSelfAssessContributors(assessment, currentUser);
  const selectedSystems = Array.isArray(state.systemIds) ? state.systemIds.length : 0;
  const requiredChecks = [
    state.adAssessmentStatus,
    state.annualLead,
    state.annualApprover,
    state.assuranceWindow,
  ];
  const completedCount = requiredChecks.filter(Boolean).length + (selectedSystems > 0 ? 1 : 0);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  let href = scopeReview.completed ? getAnnualSetupNextStep(assessment) : "/assessments/current/review-scope";
  let hint = `${selectedSystems} of 3 systems selected.`;
  if (state.completed) {
    statusText = "Completed";
    statusClass = "govuk-tag--green";
    href = "/assessments/current/annual-setup/complete";
    hint = "Review or update this year's setup.";
  } else if (completedCount > 0 || contributors.length > 0) {
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

function isAnnualSetupAssessmentStepComplete(assessment) {
  const state = assessment && assessment.annualSetup ? assessment.annualSetup : {};
  return Boolean(
    state.adAssessmentStatus &&
      Array.isArray(state.systemIds) &&
      state.systemIds.length > 0 &&
      state.systemIds.length <= 3
  );
}

function isAnnualSetupRolesStepComplete(assessment) {
  const state = assessment && assessment.annualSetup ? assessment.annualSetup : {};
  return Boolean(state.annualLead && state.annualApprover);
}

function getAnnualSetupNextStep(assessment) {
  if (!isAnnualSetupAssessmentStepComplete(assessment)) {
    return "/assessments/current/annual-setup/assessment";
  }
  if (!isAnnualSetupRolesStepComplete(assessment)) {
    return "/assessments/current/annual-setup/roles";
  }
  return "/assessments/current/annual-setup/planning";
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

function buildRolesAudit(meta, history) {
  return {
    updatedAt: meta && meta.updatedAt ? meta.updatedAt : "",
    updatedBy: meta && meta.updatedBy ? meta.updatedBy : "",
    history: Array.isArray(history) ? history : [],
  };
}

function buildAnnualRolesForm(assessment) {
  const annualSetup = assessment && assessment.annualSetup ? assessment.annualSetup : {};
  const prepare = assessment && assessment.prepare ? assessment.prepare : {};

  return {
    ...annualSetup,
    annualLead: annualSetup.annualLead || prepare.onboardingLead || "",
    annualApprover: annualSetup.annualApprover || prepare.onboardingApprover || "",
  };
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
  const refsCount = systems.filter(
    (system) => Array.isArray(system.diagramRefs) && system.diagramRefs.length > 0
  ).length;
  const mappedCount = systems.filter((system) => {
    const mapping = mappings.find((m) => m.systemId === system.id);
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  const href = "/stages/2/scope/systems/review";

  if (systems.length > 0) {
    if (mappedCount === systems.length && refsCount === systems.length) {
      statusText = "Completed";
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
    hint: `${refsCount} of ${systems.length} systems have architecture references recorded and ${mappedCount} are mapped. This is completed offline and recorded here for B and C.`,
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

  let statusText = "Cannot start yet";
  let statusClass = "govuk-tag--grey";
  if (ready) {
    if (reviewState.completed) {
      statusText = "Completed";
      statusClass = "govuk-tag--green";
    } else if (judged > 0) {
      statusText = "In progress";
      statusClass = "govuk-tag--blue";
    } else {
      statusText = "Ready to start";
      statusClass = "govuk-tag--blue";
    }
  }

  return {
    href: roundTwo ? "/assessments/current/self-assessment/ad" : "/assessments/current/dashboard?lens=ad&view=all",
    statusText,
    statusClass,
    hint: reviewState.completed
      ? "Review or update the completed A and D self-assessment."
      : `${judged} of ${total} A and D outcomes judged.`,
    judged,
  };
}

function buildBCJourneySummary(assessment, outcomesTree, { roundTwo = false } = {}) {
  ensureSectionReviewData(assessment);
  const scope = assessment.scope || {};
  const systems = getPrototypeBCSystems(scope, assessment);
  const perSystemTotal = countOutcomesInTree(outcomesTree);
  const total = systems.length * perSystemTotal;
  const judged = countBCJudgedForSystems(assessment, systems.map((s) => s.id));
  const reviewState = getBCReviewState(assessment);
  const ready = roundTwo
    ? Boolean(assessment && assessment.annualSetup && assessment.annualSetup.completed)
    : Boolean(assessment.stage && assessment.stage.prepareScopeComplete);

  let statusText = "Cannot start yet";
  let statusClass = "govuk-tag--grey";
  if (ready && systems.length > 0) {
    if (reviewState.completed) {
      statusText = "Completed";
      statusClass = "govuk-tag--green";
    } else if (judged > 0) {
      statusText = "In progress";
      statusClass = "govuk-tag--blue";
    } else {
      statusText = "Ready to start";
      statusClass = "govuk-tag--blue";
    }
  }

  return {
    href: roundTwo ? "/assessments/current/self-assessment/bc" : "/assessments/current/dashboard?lens=bc&view=all",
    statusText,
    statusClass,
    hint: reviewState.completed
      ? "Review or update the completed B and C self-assessment."
      : `${judged} of ${total} B and C outcomes judged.`,
    judged,
  };
}

function buildRoundTwoWorkQueues(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const needsAttention = list.filter((row) => row && row.isNeedsAttention);
  const inProgress = list.filter(
    (row) =>
      row &&
      !row.isNeedsAttention &&
      (row.status === "in_progress" ||
        row.status === "ready_for_review" ||
        row.status === "feedback_received" ||
        row.status === "updated_after_feedback")
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
    needsAttention: sortRows(needsAttention).slice(0, 6),
    inProgress: sortRows(inProgress).slice(0, 6),
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
    statusText = "Completed";
    statusClass = "govuk-tag--green";
  } else if (
    status &&
    status !== "not_started"
  ) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  } else if (assuranceSummary.reportFinalised) {
    statusText = "Ready to start";
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
    statusText = "Completed";
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
      ? `Clarification workshops, evidence review, and assurer feedback. Record of Audit: ${summary.recordStatus}. Report: ${summary.reportStatus}.`
      : `Record of Audit: ${summary.recordStatus}. Stage 1 report: ${summary.reportStatus}. Workshop dates: ${summary.workshopResponseStatus}.`,
  };
}

function buildCompleteSelfAssessmentSummary(assessment) {
  ensureSectionReviewData(assessment);
  const reviewState = getSelfAssessmentReviewState(assessment);
  const adReview = getADReviewState(assessment);
  const bcReview = getBCReviewState(assessment);

  let statusText = "Cannot start yet";
  let statusClass = "govuk-tag--grey";
  if (reviewState.completed) {
    statusText = "Completed";
    statusClass = "govuk-tag--green";
  } else if (adReview.completed && bcReview.completed) {
    statusText = "Ready to start";
    statusClass = "govuk-tag--blue";
  }

  return {
    href: "/assessments/current/complete-self-assessment",
    statusText,
    statusClass,
    hint: "Review and complete the self-assessment for this year.",
  };
}

function getSelfAssessmentReviewState(assessment) {
  const state = assessment && assessment.selfAssessmentReview ? assessment.selfAssessmentReview : {};
  return {
    completed: Boolean(state.completed),
    completedAt: (state.completedAt || "").toString(),
    completedBy: (state.completedBy || "").toString(),
  };
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
  return {
    completed: Boolean(state.completed),
    completedAt: (state.completedAt || "").toString(),
    completedBy: (state.completedBy || "").toString(),
  };
}

function buildInternalSignOffSummary(assessment) {
  const completion = getAssessmentCompletionState(assessment);
  const signOff = getInternalSignOffState(assessment);

  let statusText = "Cannot start yet";
  let statusClass = "govuk-tag--grey";
  if (signOff.completed) {
    statusText = "Completed";
    statusClass = "govuk-tag--green";
  } else if (completion.readyForSignOff) {
    statusText = "Ready to start";
    statusClass = "govuk-tag--blue";
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

  let statusText = "Cannot start yet";
  let statusClass = "govuk-tag--grey";
  if (submission.submitted) {
    statusText = "Completed";
    statusClass = "govuk-tag--green";
  } else if (signOff.completed) {
    statusText = "Ready to start";
    statusClass = "govuk-tag--blue";
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
    statusText = "Completed";
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
  if (typeof assessment.hasPreviousAdAssessment !== "boolean") {
    assessment.hasPreviousAdAssessment = false;
  }
  if (!assessment.annualSetup || typeof assessment.annualSetup !== "object") {
    assessment.annualSetup = {
      scopeCheckStatus: "",
      adAssessmentStatus: "",
      annualLead: "",
      annualApprover: "",
      assurerContact: "",
      assuranceMonth: "",
      assuranceYear: "",
      assuranceWindow: "",
      checkInPlan: "",
      checkInNotes: "",
      systemIds: [],
      completed: false,
      updatedAt: "",
    };
  }
  if (!Array.isArray(assessment.annualSetup.systemIds)) {
    assessment.annualSetup.systemIds = [];
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
  const { ad, bc } = getOutcomesForVersion(assessment);
  const adTotal = countOutcomesInTree(ad);
  const adJudged = countADJudged(assessment);
  const scope = assessment && assessment.scope ? assessment.scope : {};
  const bcSystems = getPrototypeBCSystems(scope, assessment);
  const bcTotal = bcSystems.length * countOutcomesInTree(bc);
  const bcJudged = countBCJudgedForSystems(assessment, bcSystems.map((system) => system.id));
  const totalOutcomes = adTotal + bcTotal;
  const judgedCount = adJudged + bcJudged;
  const allJudged = totalOutcomes > 0 && judgedCount >= totalOutcomes;

  const allRows = getAllOutcomeRowsForFeedback(assessment);
  const outstandingFeedback = allRows.filter(
    (row) => row && (row.status === "feedback_received" || row.status === "ready_for_review")
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
  const selectedIds = assessment && assessment.annualSetup && Array.isArray(assessment.annualSetup.systemIds)
    ? assessment.annualSetup.systemIds
    : [];
  return allSystems.filter((system) => selectedIds.includes(system.id));
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
    if (row.status === "feedback_received") {
      list.push({
        type: "feedback",
        text: `Feedback received: ${row.outcomeCode} ${row.title}`,
        href: row.linkUrl || "",
      });
    } else if (row.status === "ready_for_review") {
      list.push({
        type: "awaiting",
        text: `Awaiting assurer feedback: ${row.outcomeCode} ${row.title}`,
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
  const contributors = ensureSelfAssessContributors(assessment, currentUser);
  const assignmentStatus = getAssignmentStatus(assessment);

  let statusText = "Not started";
  let statusClass = "govuk-tag--grey";
  if (assignmentStatus.allAssigned) {
    statusText = "Completed";
    statusClass = "govuk-tag--green";
  } else if (contributors.length > 0 || assignmentStatus.assigned > 0) {
    statusText = "In progress";
    statusClass = "govuk-tag--blue";
  }

  return {
    href: "/assessments/current/start-self-assessment/people",
    statusText,
    statusClass,
    hint: `${contributors.length} people added.`,
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
  if (Object.keys(filteredProgressTracker).length !== Object.keys(assessment.progressTracker).length) {
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

function countADJudged(assessment) {
  const ad = assessment && assessment.selfAssess && assessment.selfAssess.ad ? assessment.selfAssess.ad : {};
  let count = 0;
  for (const key of Object.keys(ad)) {
    if ((ad[key] || {}).judgement) count += 1;
  }
  return count;
}

function countBCJudgedForSystems(assessment, systemIds) {
  const bc = assessment && assessment.selfAssess && assessment.selfAssess.bc ? assessment.selfAssess.bc : {};
  const selectedSystemIds = Array.isArray(systemIds) ? systemIds : Object.keys(bc);
  let count = 0;
  for (const systemId of selectedSystemIds) {
    const system = bc[systemId] || {};
    const outcomes = system.outcomes || {};
    for (const outcomeId of Object.keys(outcomes)) {
      if ((outcomes[outcomeId] || {}).judgement) count += 1;
    }
  }
  return count;
}

function journeyItem(title, summary, options) {
  const locked = Boolean(options && options.locked);
  const lockHint = (options && options.lockedHint) || "Complete the previous step first.";
  const hint = locked
    ? `${summary.hint} ${lockHint}`.trim()
    : summary.hint;
  const statusText = summary.statusText;
  const statusClass = summary.statusClass;
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
  const next = items.find((item) => item.href && item.status && item.status.tag && item.status.tag.text !== "Completed");
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
