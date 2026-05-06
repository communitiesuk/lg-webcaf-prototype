const { buildAssurerAlphaSeed } = require("../data/seed/assurer-alpha");

module.exports = function (router) {
  router.get("/research-rounds/assurer-alpha", (req, res) => {
    ensureAssurerAlphaState(req);
    return res.redirect("/assurer-alpha");
  });

  router.get("/assurer-alpha", (req, res) => {
    const state = ensureAssurerAlphaState(req);

    res.render("pages/assurer-alpha/landing", {
      pageTitle: "Assurer journey (alpha)",
      assumptions: state.assumptions,
      featuredAssessment: getAssessment(state, state.activeAssessmentId),
      queueCount: getQueueCount(state),
    });
  });

  router.get("/assurer-alpha/dashboard", (req, res) => {
    const state = ensureAssurerAlphaState(req);

    res.render("pages/assurer-alpha/dashboard", {
      pageTitle: "Assessments submitted for assurance",
      assessments: state.assessments,
      awaitingCount: getQueueCount(state),
    });
  });

  router.get("/assurer-alpha/assessment/:assessmentId", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");

    state.activeAssessmentId = assessment.id;
    const completionState = buildCompletionState(assessment);

    res.render("pages/assurer-alpha/overview", {
      pageTitle: `${assessment.councilName} CAF assessment`,
      assessment,
      overviewStats: buildAssessmentOverviewStats(assessment),
      summary: buildAssessmentSummary(assessment),
      outcomeIssues: getOutcomeIssues(assessment),
      completionState,
      nextAction: buildNextAction(assessment, completionState),
      organisationOutcomes: getOrganisationOutcomes(assessment),
      criticalSystemGroups: getCriticalSystemGroups(assessment),
      evidenceReferenceCount: getEvidenceReferenceCount(assessment),
    });
  });

  router.get("/assurer-alpha/assessment/:assessmentId/outcomes", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");

    return res.redirect(`/assurer-alpha/assessment/${assessment.id}/organisation-outcomes`);
  });

  router.get("/assurer-alpha/assessment/:assessmentId/organisation-outcomes", (req, res) => {
    return res.redirect(`/assurer-alpha/assessment/${req.params.assessmentId}/critical-systems`);
  });

  router.get("/assurer-alpha/assessment/:assessmentId/critical-systems", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");

    state.activeAssessmentId = assessment.id;

    res.render("pages/assurer-alpha/outcomes", {
      pageTitle: `Critical systems outcomes for ${assessment.councilName}`,
      assessment,
      summary: buildOutcomeSummary(getCriticalSystemsOutcomes(assessment)),
      saved: req.query.saved === "1",
      pageCaption: `${assessment.councilName} CAF assessment`,
      sectionTitle: "Review critical systems outcomes",
      sectionDescription:
        "These outcomes are part of the same CAF submission and cover the critical systems outcomes for Objectives B and C.",
      sectionType: "critical-systems",
      criticalSystemGroups: getCriticalSystemGroups(assessment),
      organisationContext: assessment.organisationContext,
    });
  });

  router.get("/assurer-alpha/assessment/:assessmentId/outcomes/:outcomeId", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    const outcome = assessment ? getOutcome(assessment, req.params.outcomeId) : null;
    if (!assessment || !outcome) return res.redirect("/assurer-alpha/dashboard");

    res.render("pages/assurer-alpha/outcome-review", {
      pageTitle: `${outcome.code} ${outcome.title}`,
      assessment,
      outcome,
      error: null,
      values: buildOutcomeFormValues(req.session.data, outcome),
      saved: req.query.saved === "1",
      returnPath: getOutcomeReturnPath(assessment, outcome),
    });
  });

  router.post("/assurer-alpha/assessment/:assessmentId/outcomes/:outcomeId", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    const outcome = assessment ? getOutcome(assessment, req.params.outcomeId) : null;
    if (!assessment || !outcome) return res.redirect("/assurer-alpha/dashboard");

    const values = buildOutcomeFormValues(req.session.data, outcome);
    const errors = [];

    if (!values.decision) {
      errors.push({ field: "assurerDecision", text: "Select your assessment position." });
    }
    if (
      values.decision === "judgement_may_need_changing" &&
      !values.suggestedJudgement
    ) {
      errors.push({
        field: "assurerSuggestedJudgement",
        text: "Select the assurer judgement.",
      });
    }
    if (!values.evidenceFindings || values.evidenceFindings.length === 0) {
      errors.push({
        field: "assurerEvidenceFinding",
        text: "Select what you found when reviewing the evidence.",
      });
    }
    if (!values.rationale) {
      errors.push({ field: "assurerRationale", text: "Enter the assurer rationale." });
    }

    if (errors.length > 0) {
      return res.render("pages/assurer-alpha/outcome-review", {
        pageTitle: `${outcome.code} ${outcome.title}`,
        assessment,
        outcome,
        error: { items: errors },
        values,
        saved: false,
        returnPath: getOutcomeReturnPath(assessment, outcome),
      });
    }

    outcome.assurerReview = {
      decision: normalizeOutcomeDecision(values.decision),
      suggestedJudgement: values.suggestedJudgement,
      evidenceFindings: values.evidenceFindings,
      evidenceReviewed: values.evidenceReviewed,
      alignmentDecision: values.alignmentDecision,
      alignmentExplanation: values.alignmentExplanation,
      rationale: values.rationale,
      nextAction: values.nextAction,
      status: mapOutcomeStatus(normalizeOutcomeDecision(values.decision)),
      statusLabel: mapOutcomeStatusLabel(normalizeOutcomeDecision(values.decision)),
      statusTagClass: mapOutcomeStatusTagClass(normalizeOutcomeDecision(values.decision)),
      reviewedAt: "13 April 2026",
    };

    clearOutcomeForm(req.session.data);

    if (shouldCaptureIssue(normalizeOutcomeDecision(values.decision))) {
      return res.redirect(
        `/assurer-alpha/assessment/${assessment.id}/outcomes/${outcome.id}/issues`
      );
    }

    const nextOutcome = getNextOutcomeInSameSection(assessment, outcome.id);
    if (nextOutcome) {
      return res.redirect(
        `/assurer-alpha/assessment/${assessment.id}/outcomes/${nextOutcome.id}?saved=1`
      );
    }

    return res.redirect(getPostSectionRoute(assessment, outcome));
  });

  router.get("/assurer-alpha/assessment/:assessmentId/outcomes/:outcomeId/issues", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    const outcome = assessment ? getOutcome(assessment, req.params.outcomeId) : null;
    if (!assessment || !outcome) return res.redirect("/assurer-alpha/dashboard");

    res.render("pages/assurer-alpha/issues", {
      pageTitle: `Record issue for ${outcome.code}`,
      assessment,
      outcome,
      error: null,
      values: buildIssueFormValues(req.session.data, outcome),
      returnPath: getOutcomeReturnPath(assessment, outcome),
    });
  });

  router.post("/assurer-alpha/assessment/:assessmentId/outcomes/:outcomeId/issues", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    const outcome = assessment ? getOutcome(assessment, req.params.outcomeId) : null;
    if (!assessment || !outcome) return res.redirect("/assurer-alpha/dashboard");

    const values = buildIssueFormValues(req.session.data, outcome);
    const errors = [];

    if (!values.categories || values.categories.length === 0) {
      errors.push({ field: "assurerIssueCategory", text: "Select what is missing or unclear." });
    }
    if (!values.detail) {
      errors.push({ field: "assurerIssueDetail", text: "Enter what the council needs to clarify." });
    }

    if (errors.length > 0) {
      return res.render("pages/assurer-alpha/issues", {
        pageTitle: `Record issue for ${outcome.code}`,
        assessment,
        outcome,
        error: { items: errors },
        values,
        returnPath: getOutcomeReturnPath(assessment, outcome),
      });
    }

    outcome.issue = {
      categories: values.categories,
      detail: values.detail,
      actionRequested: values.actionRequested,
    };

    clearIssueForm(req.session.data);

    const nextOutcome = getNextOutcomeInSameSection(assessment, outcome.id);
    if (nextOutcome) {
      return res.redirect(
        `/assurer-alpha/assessment/${assessment.id}/outcomes/${nextOutcome.id}?saved=1`
      );
    }

    return res.redirect(getPostSectionRoute(assessment, outcome));
  });

  router.get("/assurer-alpha/assessment/:assessmentId/iip", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");
    const completionState = buildCompletionState(assessment);

    res.render("pages/assurer-alpha/iip", {
      pageTitle: `Review IIP for ${assessment.councilName}`,
      assessment,
      error: null,
      values: buildIipFormValues(req.session.data, assessment, getOutcomeIssues(assessment)),
      issueRows: getOutcomeIssues(assessment),
      completionState,
    });
  });

  router.post("/assurer-alpha/assessment/:assessmentId/iip", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");

    const issueRows = getOutcomeIssues(assessment);
    const values = buildIipFormValues(req.session.data, assessment, issueRows);
    const errors = [];

    if (!values.decision) {
      errors.push({ field: "assurerIipDecision", text: "Select an IIP review outcome." });
    }
    if (!values.rationale) {
      errors.push({ field: "assurerIipRationale", text: "Enter the assurer rationale for the IIP." });
    }
    if (!values.crossCuttingDecision) {
      errors.push({
        field: "assurerIipCrossCuttingDecision",
        text: "Select whether the plan addresses cross-cutting issues.",
      });
    }
    issueRows.forEach((issue) => {
      if (!values.issueResponses[issue.code]) {
        errors.push({
          field: `assurerIipIssue-${issue.code}`,
          text: `Select whether ${issue.code} is addressed in the plan.`,
        });
      }
    });
    if (
      values.decision === "agree_sufficient" &&
      issueRows.some((issue) => values.issueResponses[issue.code] === "not_addressed")
    ) {
      errors.push({
        field: "assurerIipDecision",
        text: "You cannot say the IIP is sufficient if any raised issue is not addressed in the plan.",
      });
    }

    if (errors.length > 0) {
      return res.render("pages/assurer-alpha/iip", {
        pageTitle: `Review IIP for ${assessment.councilName}`,
        assessment,
        error: { items: errors },
        values,
        issueRows,
        completionState: buildCompletionState(assessment),
      });
    }

    assessment.iip.assurerReview = {
      decision: values.decision,
      rationale: values.rationale,
      priorityGaps: values.priorityGaps,
      issueResponses: values.issueResponses,
      crossCuttingDecision: values.crossCuttingDecision,
      crossCuttingExplanation: values.crossCuttingExplanation,
      reviewedAt: "13 April 2026",
    };

    clearIipForm(req.session.data);

    return res.redirect(`/assurer-alpha/assessment/${assessment.id}/summary`);
  });

  router.get("/assurer-alpha/assessment/:assessmentId/summary", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");
    const completionState = buildCompletionState(assessment);

    res.render("pages/assurer-alpha/summary", {
      pageTitle: `Assurance summary for ${assessment.councilName}`,
      assessment,
      summary: buildAssessmentSummary(assessment),
      issueRows: getOutcomeIssues(assessment),
      alignmentSummary: buildAlignmentSummary(assessment),
      missingReviewCount: getMissingReviewCount(assessment),
      completionState,
      error: null,
      values: buildSummaryFormValues(req.session.data, assessment),
    });
  });

  router.post("/assurer-alpha/assessment/:assessmentId/summary", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");
    const completionState = buildCompletionState(assessment);
    const values = buildSummaryFormValues(req.session.data, assessment);

    if (!completionState.reviewCompleteReady) {
      const errors = [];
      if (completionState.missingOutcomeReviews > 0) {
        errors.push({
          field: "review-complete",
          text: "Review every contributing outcome before completing the assurance step.",
        });
      }
      return res.render("pages/assurer-alpha/summary", {
        pageTitle: `Assurance summary for ${assessment.councilName}`,
        assessment,
        summary: buildAssessmentSummary(assessment),
        issueRows: getOutcomeIssues(assessment),
        alignmentSummary: buildAlignmentSummary(assessment),
        missingReviewCount: getMissingReviewCount(assessment),
        completionState,
        error: { items: errors },
        values,
      });
    }

    const errors = [];
    if (!values.declarationChecked) {
      errors.push({
        field: "assurerSummaryDeclaration",
        text: "Confirm that you have reviewed each contributing outcome and the evidence provided.",
      });
    }
    if (!values.completionRationale) {
      errors.push({
        field: "assurerSummaryRationale",
        text: "Enter a short rationale for completing the assurance step.",
      });
    } else if (values.completionRationale.length < 25) {
      errors.push({
        field: "assurerSummaryRationale",
        text: "Please provide more detail explaining your decision.",
      });
    }

    if (errors.length > 0) {
      return res.render("pages/assurer-alpha/summary", {
        pageTitle: `Assurance summary for ${assessment.councilName}`,
        assessment,
        summary: buildAssessmentSummary(assessment),
        issueRows: getOutcomeIssues(assessment),
        alignmentSummary: buildAlignmentSummary(assessment),
        missingReviewCount: getMissingReviewCount(assessment),
        completionState,
        error: { items: errors },
        values,
      });
    }

    assessment.assuranceComplete = true;
    assessment.completedAt = "13 April 2026";
    assessment.overallStatus = "Assurance review completed";
    assessment.statusTagClass = "govuk-tag--blue";
    assessment.assuranceCompletion = {
      declarationChecked: values.declarationChecked,
      completionRationale: values.completionRationale,
    };
    clearSummaryForm(req.session.data);

    return res.redirect(`/assurer-alpha/assessment/${assessment.id}/submission`);
  });

  router.get("/assurer-alpha/assessment/:assessmentId/submission", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");
    const completionState = buildCompletionState(assessment);

    res.render("pages/assurer-alpha/submission", {
      pageTitle: `Submission route for ${assessment.councilName}`,
      assessment,
      error: null,
      values: buildSubmissionFormValues(req.session.data, assessment),
      completionState,
    });
  });

  router.post("/assurer-alpha/assessment/:assessmentId/submission", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");

    const values = buildSubmissionFormValues(req.session.data, assessment);
    const completionState = buildCompletionState(assessment);
    const errors = [];

    if (!values.decision) {
      errors.push({ field: "assurerSubmissionDecision", text: "Select what should happen next." });
    }
    if (values.decision === "ready_for_submission" && !completionState.readyForSubmission) {
      errors.push({
        field: "assurerSubmissionDecision",
        text: "This assessment is not ready for submission. Choose the option that sends it back for council action.",
      });
    }

    if (errors.length > 0) {
      return res.render("pages/assurer-alpha/submission", {
        pageTitle: `Submission route for ${assessment.councilName}`,
        assessment,
        error: { items: errors },
        values,
        completionState,
      });
    }

    assessment.submission.status = values.decision;

    if (values.decision === "ready_for_submission") {
      assessment.overallStatus = "Assurance complete";
      assessment.statusTagClass = "govuk-tag--blue";
    } else {
      assessment.overallStatus = "Council action needed";
      assessment.statusTagClass = "govuk-tag--yellow";
    }

    clearSubmissionForm(req.session.data);

    return res.redirect(`/assurer-alpha/assessment/${assessment.id}/confirmation`);
  });

  router.get("/assurer-alpha/assessment/:assessmentId/confirmation", (req, res) => {
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, req.params.assessmentId);
    if (!assessment) return res.redirect("/assurer-alpha/dashboard");

    res.render("pages/assurer-alpha/confirmation", {
      pageTitle: `Assurance complete for ${assessment.councilName}`,
      assessment,
      summary: buildAssessmentSummary(assessment),
      nextSteps: buildNextSteps(assessment),
    });
  });

  router.get("/research-rounds/alpha-demo/assurer-confirmation", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    delete req.session.data.assurerAlpha;
    const state = ensureAssurerAlphaState(req);
    const assessment = getAssessment(state, "west-marchshire-2026");
    if (assessment) {
      assessment.assuranceComplete = true;
      assessment.completedAt = "15 April 2026";
      assessment.overallStatus = "Assurance complete";
      assessment.statusTagClass = "govuk-tag--blue";
      assessment.submission.status = "ready_for_submission";
    }
    return res.redirect("/assurer-alpha/assessment/west-marchshire-2026/confirmation");
  });
};

function ensureAssurerAlphaState(req) {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.assurerAlpha = normaliseAssurerAlphaState(req.session.data.assurerAlpha);
  return req.session.data.assurerAlpha;
}

function normaliseAssurerAlphaState(existingState) {
  const freshState = buildAssurerAlphaSeed();

  if (
    !existingState ||
    !Array.isArray(existingState.assessments) ||
    !existingState.assessments.every(
      (assessment) =>
        Array.isArray(assessment.outcomes) &&
        assessment.submissionSummary
    )
  ) {
    return freshState;
  }

  return {
    ...freshState,
    ...existingState,
    assumptions: Array.isArray(existingState.assumptions)
      ? existingState.assumptions
      : freshState.assumptions,
    assessments: existingState.assessments.map((assessment, index) => {
      const fallback = freshState.assessments[index] || {};
      return {
        ...fallback,
        ...assessment,
        outcomes: normalizeAssessmentOutcomes(assessment, fallback),
        iip: {
          ...(fallback.iip || {}),
          ...(assessment.iip || {}),
          priorities: Array.isArray(assessment.iip && assessment.iip.priorities)
            ? assessment.iip.priorities
            : Array.isArray(fallback.iip && fallback.iip.priorities)
              ? fallback.iip.priorities
              : [],
        },
        submission: {
          ...(fallback.submission || {}),
          ...(assessment.submission || {}),
        },
      };
    }),
    activeAssessmentId:
      existingState.activeAssessmentId || freshState.activeAssessmentId,
  };
}

function getAssessment(state, assessmentId) {
  return state.assessments.find((assessment) => assessment.id === assessmentId);
}

function getOutcome(assessment, outcomeId) {
  return getAssessmentOutcomes(assessment).find((outcome) => outcome.id === outcomeId);
}

function getOrganisationOutcomes(assessment) {
  return getAssessmentOutcomes(assessment).filter((outcome) => outcome.lens === "ad");
}

function getCriticalSystemsOutcomes(assessment) {
  return getAssessmentOutcomes(assessment).filter((outcome) => outcome.lens === "bc");
}

function getCriticalSystemGroups(assessment) {
  const groups = [];
  getCriticalSystemsOutcomes(assessment).forEach((outcome) => {
    const existing = groups.find((group) => group.systemName === outcome.systemName);
    if (existing) {
      existing.outcomes.push(outcome);
      return;
    }
    groups.push({
      systemName: outcome.systemName,
      outcomes: [outcome],
    });
  });
  return groups;
}

function getNextOutcomeInSameSection(assessment, currentOutcomeId) {
  const currentOutcome = getOutcome(assessment, currentOutcomeId);
  if (!currentOutcome) return null;
  const outcomes = currentOutcome.lens === "ad"
    ? getOrganisationOutcomes(assessment)
    : getCriticalSystemsOutcomes(assessment);
  const currentIndex = outcomes.findIndex((outcome) => outcome.id === currentOutcomeId);
  return currentIndex >= 0 && currentIndex < outcomes.length - 1
    ? outcomes[currentIndex + 1]
    : null;
}

function getOutcomeReturnPath(assessment, outcome) {
  return outcome.lens === "ad"
    ? `/assurer-alpha/assessment/${assessment.id}/organisation-outcomes`
    : `/assurer-alpha/assessment/${assessment.id}/critical-systems`;
}

function getPostSectionRoute(assessment, outcome) {
  return outcome.lens === "ad"
    ? `/assurer-alpha/assessment/${assessment.id}/critical-systems?saved=1`
    : `/assurer-alpha/assessment/${assessment.id}/summary`;
}

function getQueueCount(state) {
  return state.assessments.filter((assessment) =>
    ["Ready for assurance", "In review", "Assurance review completed", "Assurance complete"].includes(
      assessment.overallStatus
    )
  ).length;
}

function buildAssessmentOverviewStats(assessment) {
  const completionState = buildCompletionState(assessment);

  return [
    {
      label: "Organisation outcomes",
      value: assessment.submissionSummary.organisationComplete ? "Complete" : "In progress",
    },
    {
      label: "Critical systems outcomes",
      value: assessment.submissionSummary.criticalSystemsComplete ? "Complete" : "In progress",
    },
    {
      label: "Submission state",
      value: completionState.readyForSubmission ? "Ready for submission" : "Not ready yet",
    },
  ];
}

function buildAssessmentSummary(assessment) {
  return buildOutcomeSummary(getAssessmentOutcomes(assessment));
}

function buildOutcomeSummary(outcomes) {
  const summary = {
    agreed: 0,
    judgementMayNeedChanging: 0,
    insufficientEvidence: 0,
    reviewed: 0,
    notReviewed: 0,
    issueRaised: 0,
    alignmentConsistent: 0,
    alignmentGap: 0,
    alignmentNotEnoughInfo: 0,
  };

  outcomes.forEach((outcome) => {
    if (!outcome.assurerReview) {
      summary.notReviewed += 1;
      return;
    }

    summary.reviewed += 1;

    const decision = normalizeOutcomeDecision(outcome.assurerReview.decision);

    if (decision === "agree_judgement") summary.agreed += 1;
    if (decision === "judgement_may_need_changing") {
      summary.judgementMayNeedChanging += 1;
    }
    if (decision === "cannot_judge_insufficient_evidence") {
      summary.insufficientEvidence += 1;
    }
    if (outcome.assurerReview.alignmentDecision === "consistent_with_organisation_assessment") {
      summary.alignmentConsistent += 1;
    }
    if (outcome.assurerReview.alignmentDecision === "gaps_in_organisation_controls") {
      summary.alignmentGap += 1;
    }
    if (outcome.assurerReview.alignmentDecision === "not_enough_information_alignment") {
      summary.alignmentNotEnoughInfo += 1;
    }
    if (outcome.issue && outcome.issue.detail) summary.issueRaised += 1;
  });

  return summary;
}

function normalizeAssessmentOutcomes(assessment, fallback) {
  const fallbackOutcomes = Array.isArray(fallback.outcomes) ? fallback.outcomes : [];
  if (!Array.isArray(assessment.outcomes) || assessment.outcomes.length === 0) {
    return fallbackOutcomes;
  }

  const existingOutcomes = assessment.outcomes;
  const fallbackById = new Map(fallbackOutcomes.map((outcome) => [outcome.id, outcome]));
  const existingById = new Map(existingOutcomes.map((outcome) => [outcome.id, outcome]));

  const normalizedFallbackOutcomes = fallbackOutcomes.map((fallbackOutcome) => {
    const outcome = existingById.get(fallbackOutcome.id) || {};
    return {
      ...fallbackOutcome,
      ...outcome,
      lens: outcome.lens || fallbackOutcome.lens || inferOutcomeLens(outcome.code),
      systemName: outcome.systemName || fallbackOutcome.systemName || "",
    };
  });

  const additionalOutcomes = existingOutcomes
    .filter((outcome) => !fallbackById.has(outcome.id))
    .map((outcome) => ({
      ...outcome,
      lens: outcome.lens || inferOutcomeLens(outcome.code),
      systemName: outcome.systemName || "",
    }));

  return [...normalizedFallbackOutcomes, ...additionalOutcomes];
}

function inferOutcomeLens(code = "") {
  if (["A", "D"].includes(code.charAt(0))) return "ad";
  if (["B", "C"].includes(code.charAt(0))) return "bc";
  return "";
}

function getOutcomeIssues(assessment) {
  return getAssessmentOutcomes(assessment)
    .filter((outcome) => outcome.issue && outcome.issue.detail)
    .map((outcome) => ({
      code: outcome.code,
      title: outcome.title,
      categories: outcome.issue.categories,
      detail: outcome.issue.detail,
      actionRequested: outcome.issue.actionRequested,
      scope: getIssueScope(outcome),
      scopeLabel: getIssueScopeLabel(getIssueScope(outcome)),
      scopeTagClass: getIssueScopeTagClass(getIssueScope(outcome)),
    }));
}

function getMissingReviewCount(assessment) {
  return getAssessmentOutcomes(assessment).filter((outcome) => !outcome.assurerReview).length;
}

function getAssessmentOutcomes(assessment) {
  return assessment && Array.isArray(assessment.outcomes) ? assessment.outcomes : [];
}

function buildCompletionState(assessment) {
  const outcomes = getAssessmentOutcomes(assessment);
  const outcomeIssues = getOutcomeIssues(assessment);
  const blockerOutcomes = outcomes.filter((outcome) => {
    const decision = outcome.assurerReview
      ? normalizeOutcomeDecision(outcome.assurerReview.decision)
      : "";
    return [
      "judgement_may_need_changing",
      "cannot_judge_insufficient_evidence",
    ].includes(decision);
  });
  const missingOutcomeReviews = getMissingReviewCount(assessment);

  return {
    missingOutcomeReviews,
    issueCount: outcomeIssues.length,
    blockerOutcomeCount: blockerOutcomes.length,
    reviewCompleteReady: missingOutcomeReviews === 0,
    readyForSubmission:
      missingOutcomeReviews === 0 &&
      blockerOutcomes.length === 0 &&
      outcomeIssues.length === 0,
  };
}

function buildNextAction(assessment, completionState) {
  if (completionState.missingOutcomeReviews > 0) {
    return {
      href: `/assurer-alpha/assessment/${assessment.id}/critical-systems`,
      text: "Review critical systems outcomes",
      hint: `${completionState.missingOutcomeReviews} outcomes in this submission still need an assurer decision.`,
    };
  }

  return {
    href: `/assurer-alpha/assessment/${assessment.id}/summary`,
    text: "Check assurance summary",
    hint: completionState.readyForSubmission
      ? "The assessment looks ready to move to a submission decision."
      : "The assurance review is complete, but the summary still shows issues or changes for the council.",
  };
}

function getEvidenceReferenceCount(assessment) {
  return getAssessmentOutcomes(assessment).reduce((count, outcome) => {
    return count + (Array.isArray(outcome.evidenceReferences) ? outcome.evidenceReferences.length : 0);
  }, 0);
}

function buildOutcomeFormValues(sessionData, outcome) {
  const evidenceFindings = sessionData.assurerEvidenceFinding;
  const review = outcome.assurerReview || {};
  return {
    decision:
      normalizeOutcomeDecision((sessionData.assurerDecision || "").toString()) ||
      normalizeOutcomeDecision(review.decision || ""),
    suggestedJudgement:
      (sessionData.assurerSuggestedJudgement || "").toString() ||
      (review.suggestedJudgement || ""),
    evidenceFindings: Array.isArray(evidenceFindings)
      ? evidenceFindings
      : evidenceFindings
        ? [evidenceFindings.toString()]
        : Array.isArray(review.evidenceFindings)
          ? review.evidenceFindings
          : [],
    evidenceReviewed:
      (sessionData.assurerEvidenceReviewed || "").toString() ||
      (review.evidenceReviewed || ""),
    alignmentDecision:
      (sessionData.assurerAlignmentDecision || "").toString() ||
      (review.alignmentDecision || ""),
    alignmentExplanation:
      (sessionData.assurerAlignmentExplanation || "").toString() ||
      (review.alignmentExplanation || ""),
    rationale:
      (sessionData.assurerRationale || "").toString() ||
      (review.rationale || ""),
    nextAction:
      (sessionData.assurerNextAction || "").toString() ||
      (review.nextAction || ""),
  };
}

function clearOutcomeForm(sessionData) {
  delete sessionData.assurerDecision;
  delete sessionData.assurerSuggestedJudgement;
  delete sessionData.assurerEvidenceFinding;
  delete sessionData.assurerEvidenceReviewed;
  delete sessionData.assurerAlignmentDecision;
  delete sessionData.assurerAlignmentExplanation;
  delete sessionData.assurerRationale;
  delete sessionData.assurerNextAction;
}

function shouldCaptureIssue(decision) {
  return [
    "judgement_may_need_changing",
    "cannot_judge_insufficient_evidence",
  ].includes(decision);
}

function buildIssueFormValues(sessionData, outcome) {
  const categories = sessionData.assurerIssueCategory;
  return {
    categories: Array.isArray(categories)
      ? categories
      : categories
        ? [categories.toString()]
        : outcome.issue && Array.isArray(outcome.issue.categories)
          ? outcome.issue.categories
          : [],
    detail:
      (sessionData.assurerIssueDetail || "").toString() ||
      (outcome.issue ? outcome.issue.detail : ""),
    actionRequested:
      (sessionData.assurerIssueAction || "").toString() ||
      (outcome.issue ? outcome.issue.actionRequested : ""),
  };
}

function clearIssueForm(sessionData) {
  delete sessionData.assurerIssueCategory;
  delete sessionData.assurerIssueDetail;
  delete sessionData.assurerIssueAction;
}

function buildIipFormValues(sessionData, assessment, issueRows) {
  const issueResponses = {};
  issueRows.forEach((issue) => {
    const field = `assurerIipIssue-${issue.code}`;
    issueResponses[issue.code] =
      (sessionData[field] || "").toString() ||
      (
        assessment.iip.assurerReview &&
        assessment.iip.assurerReview.issueResponses &&
        assessment.iip.assurerReview.issueResponses[issue.code]
          ? assessment.iip.assurerReview.issueResponses[issue.code]
          : ""
      );
  });

  return {
    decision:
      (sessionData.assurerIipDecision || "").toString() ||
      (assessment.iip.assurerReview ? assessment.iip.assurerReview.decision : ""),
    rationale:
      (sessionData.assurerIipRationale || "").toString() ||
      (assessment.iip.assurerReview ? assessment.iip.assurerReview.rationale : ""),
    priorityGaps:
      (sessionData.assurerIipPriorityGaps || "").toString() ||
      (assessment.iip.assurerReview ? assessment.iip.assurerReview.priorityGaps : ""),
    crossCuttingDecision:
      (sessionData.assurerIipCrossCuttingDecision || "").toString() ||
      (assessment.iip.assurerReview ? assessment.iip.assurerReview.crossCuttingDecision : ""),
    crossCuttingExplanation:
      (sessionData.assurerIipCrossCuttingExplanation || "").toString() ||
      (assessment.iip.assurerReview ? assessment.iip.assurerReview.crossCuttingExplanation : ""),
    issueResponses,
  };
}

function clearIipForm(sessionData) {
  delete sessionData.assurerIipDecision;
  delete sessionData.assurerIipRationale;
  delete sessionData.assurerIipPriorityGaps;
  delete sessionData.assurerIipCrossCuttingDecision;
  delete sessionData.assurerIipCrossCuttingExplanation;
  Object.keys(sessionData)
    .filter((key) => key.startsWith("assurerIipIssue-"))
    .forEach((key) => delete sessionData[key]);
}

function buildSummaryFormValues(sessionData, assessment) {
  return {
    declarationChecked:
      (sessionData.assurerSummaryDeclaration || "").toString() === "yes" ||
      Boolean(
        assessment.assuranceCompletion && assessment.assuranceCompletion.declarationChecked
      ),
    completionRationale:
      (sessionData.assurerSummaryRationale || "").toString().trim() ||
      (
        assessment.assuranceCompletion && assessment.assuranceCompletion.completionRationale
          ? assessment.assuranceCompletion.completionRationale
          : ""
      ),
  };
}

function clearSummaryForm(sessionData) {
  delete sessionData.assurerSummaryDeclaration;
  delete sessionData.assurerSummaryRationale;
}

function buildSubmissionFormValues(sessionData, assessment) {
  return {
    decision:
      (sessionData.assurerSubmissionDecision || "").toString() ||
      (assessment.submission ? assessment.submission.status : ""),
  };
}

function clearSubmissionForm(sessionData) {
  delete sessionData.assurerSubmissionDecision;
}

function buildNextSteps(assessment) {
  if (assessment.submission.status === "ready_for_submission") {
    return [
      "The assurer has completed the review and the assessment is ready for submission.",
      "The council can now submit to MHCLG.",
    ];
  }

  return [
    "The assurer has completed the review and returned the assurance outcome to the council.",
    "The council should update the outcomes where the judgement may need changing, or provide the missing evidence, before the assessment moves on.",
  ];
}

function buildAlignmentSummary(assessment) {
  const alignmentNotes = [];
  const consistentAreas = [];
  const gapAreas = [];

  getAssessmentOutcomes(assessment).forEach((outcome) => {
    if (!outcome.assurerReview || !outcome.assurerReview.alignmentDecision) return;

    const label = `${outcome.code} ${outcome.title}`;
    if (outcome.assurerReview.alignmentDecision === "consistent_with_organisation_assessment") {
      consistentAreas.push(label);
    }
    if (outcome.assurerReview.alignmentDecision === "gaps_in_organisation_controls") {
      gapAreas.push(label);
      if (outcome.assurerReview.alignmentExplanation) {
        alignmentNotes.push(outcome.assurerReview.alignmentExplanation);
      }
    }
  });

  return {
    consistentAreas,
    gapAreas,
    alignmentNotes,
  };
}

function getIssueScope(outcome) {
  if (
    outcome.assurerReview &&
    outcome.assurerReview.alignmentDecision === "gaps_in_organisation_controls"
  ) {
    return "cross_cutting";
  }

  return outcome.lens === "ad" ? "organisation" : "system";
}

function getIssueScopeLabel(scope) {
  if (scope === "organisation") return "Organisation-level issue";
  if (scope === "system") return "System-level issue";
  if (scope === "cross_cutting") return "Cross-cutting issue";
  return "Issue";
}

function getIssueScopeTagClass(scope) {
  if (scope === "organisation") return "govuk-tag--blue";
  if (scope === "system") return "govuk-tag--turquoise";
  if (scope === "cross_cutting") return "govuk-tag--purple";
  return "govuk-tag--grey";
}

function mapOutcomeStatus(decision) {
  if (decision === "agree_judgement") return "agreed";
  if (decision === "cannot_judge_insufficient_evidence") return "issue_raised";
  if (decision === "judgement_may_need_changing") return "reviewed";
  return "reviewed";
}

function mapOutcomeStatusLabel(decision) {
  if (decision === "agree_judgement") return "Agree with council judgement";
  if (decision === "cannot_judge_insufficient_evidence") {
    return "Cannot assess (insufficient evidence)";
  }
  if (decision === "judgement_may_need_changing") {
    return "Different judgement required";
  }
  return "Reviewed";
}

function mapOutcomeStatusTagClass(decision) {
  if (decision === "agree_judgement") return "govuk-tag--green";
  if (decision === "cannot_judge_insufficient_evidence") return "govuk-tag--red";
  if (decision === "judgement_may_need_changing") return "govuk-tag--yellow";
  return "govuk-tag--grey";
}

function normalizeOutcomeDecision(decision) {
  if (decision === "concerns_about_judgement") return "judgement_may_need_changing";
  if (decision === "suggest_different_judgement") return "judgement_may_need_changing";
  if (decision === "insufficient_evidence") return "cannot_judge_insufficient_evidence";
  return decision;
}

function mapIipDecisionLabel(decision) {
  if (decision === "agree_sufficient") return "Agreed as sufficient";
  if (decision === "request_changes") return "Changes requested";
  if (decision === "priority_gaps") return "Priority gaps noted";
  return "Not yet reviewed";
}
