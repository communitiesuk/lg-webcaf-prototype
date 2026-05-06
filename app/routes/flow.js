// app/routes/flow.js
// End-to-end flow pages: prepare, profile, self-assess, evidence, assurance, improvement, submit.

const labels = require("../data/content/labels");
const statuses = require("../data/content/statuses");
const { getOutcomesForVersion } = require("../data/helpers/caf-version");
const profileTargets = require("../data/seed/profile-targets");

const {
  requireSignedIn,
  ensureAssessment,
  getAssessmentOrRedirect,
} = require("../data/helpers/session");

const {
  coerceArray,
  normaliseEvidenceRefs,
  blankEvidenceRef,
  ensureAtLeastOneEvidenceRow,
} = require("../data/helpers/outcome");

const { formatDateForInput } = require("../data/helpers/progress");
const { PERMISSIONS, userHasPermission } = require("../data/helpers/roles");
const { getRoundTwoOutcomeReturnContext } = require("../data/helpers/navigation");

const PROTOTYPE_OUTCOME_LIMITS = {
  AD: 2,
  BC: 1,
};

const PROTOTYPE_OUTCOME_IDS = {
  AD: ["A1a", "A1b"],
  BC: ["B2a"],
};

const B2A_OUTCOME_ID = "B2a";
const B2A_MAX_EVIDENCE_ROWS = 5;

module.exports = function (router) {
  const protectedPrefixes = [
    "/prepare",
    "/profile",
    "/self-assess",
    "/evidence-library",
    "/assurance-review",
    "/improvement-plan",
    "/submit-progress",
    "/submit-complete",
  ];

  router.use((req, res, next) => {
    const isProtected = protectedPrefixes.some(
      (prefix) => req.path === prefix || req.path.startsWith(prefix + "/")
    );
    if (!isProtected) return next();
    if (!requireSignedIn(req, res)) return;
    if (!ensureAssessment(req)) return res.redirect("/entry");
    const requiresEditPermission =
      isRoundTwoRequest(req) &&
      (req.path === "/prepare/roles" ||
        req.path.startsWith("/self-assess"));
    const requiredPermission =
      req.path === "/prepare/roles"
        ? PERMISSIONS.MANAGE_ROLES
        : PERMISSIONS.EDIT_CONTENT;
    if (requiresEditPermission && !userHasPermission(req.session.data.user || null, requiredPermission)) {
      return res.status(403).render("pages/errors/restricted", {
        pageTitle: "Access restricted",
      });
    }
    next();
  });

  const archivedPrefixes = [
    "/profile",
    "/evidence-library",
    "/assurance-review",
    "/submit-progress",
    "/submit-complete",
  ];

  router.use((req, res, next) => {
    if (req.path.startsWith("/mhclg") || req.path.startsWith("/assurer")) {
      return next();
    }
    const isArchived = archivedPrefixes.some(
      (prefix) => req.path === prefix || req.path.startsWith(prefix + "/")
    );
    if (!isArchived) return next();
    return res.redirect("/assessments/current/journey");
  });

  router.get("/prepare", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    const gatedNotice = getStage1GateNotice(req, labels);
    const roundTwo = isRoundTwoRequest(req);

    if (roundTwo) {
      return res.redirect("/onboarding");
    }

    res.render("pages/flow/prepare", {
      pageTitle: labels.flow.prepare.pageTitle,
      labels,
      assessment,
      defaults: assessment.prepare,
      error: null,
      gatedNotice,
    });
  });

  router.post("/prepare", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    const roundTwo = isRoundTwoRequest(req);

    if (roundTwo) {
      return res.redirect("/prepare/roles");
    }

    const checklist = coerceArray(req.session.data.prepChecklist);
    const requiredItems = ["awareness", "signoff", "support", "understanding", "governance", "assurers"];
    const allConfirmed = requiredItems.every((item) => checklist.includes(item));

    assessment.prepare = {
      awareness: checklist.includes("awareness"),
      signoff: checklist.includes("signoff"),
      support: checklist.includes("support"),
      understanding: checklist.includes("understanding"),
      governance: checklist.includes("governance"),
      assurers: checklist.includes("assurers"),
      guidanceRead: allConfirmed,
    };
    assessment.updatedAt = new Date().toISOString();

    if (!allConfirmed) {
      return res.render("pages/flow/prepare", {
        pageTitle: labels.flow.prepare.pageTitle,
        labels,
        assessment,
        defaults: assessment.prepare,
        error: { items: [{ field: "prepChecklist", text: labels.flow.prepare.errors.required }] },
        gatedNotice: null,
      });
    }

    delete req.session.data.prepChecklist;

    return res.redirect("/assessments/current/journey");
  });

  router.get("/prepare/roles", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/prepare");
    }

    const currentUser = req.session.data.user || null;
    const defaults = {
      onboardingLead: (assessment.prepare.onboardingLead || (currentUser && currentUser.name) || "").toString(),
      onboardingApprover: (assessment.prepare.onboardingApprover || "").toString(),
    };
    const returnTo = getCouncilRolesReturnTo(req);

    return res.render("pages/flow/prepare-round-2-roles", {
      pageTitle: "Who is leading and approving the CAF assessment?",
      labels,
      assessment,
      defaults,
      returnTo,
      backHref: getCouncilRolesReturnHref(returnTo),
      returnHref: getCouncilRolesReturnHref(returnTo),
      returnText: getCouncilRolesReturnText(returnTo),
      saved: (req.query.saved || "").toString(),
      rolesAudit: buildRolesAudit(
        assessment.prepare.onboardingRolesMeta,
        assessment.prepare.onboardingRolesHistory
      ),
      error: null,
    });
  });

  router.post("/prepare/roles", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isRoundTwoRequest(req)) {
      return res.redirect("/prepare");
    }

    const currentUser = req.session.data.user || null;
    const returnTo = getCouncilRolesReturnTo(req);
    const onboardingLead = (req.session.data.onboardingLead || "").toString().trim();
    const onboardingApprover = (req.session.data.onboardingApprover || "").toString().trim();
    const errors = [];
    if (!onboardingLead) {
      errors.push({ field: "onboardingLead", text: "Enter the CAF Lead." });
    }
    if (!onboardingApprover) {
      errors.push({ field: "onboardingApprover", text: "Enter the approver." });
    }

    assessment.prepare = {
      ...assessment.prepare,
      onboardingLead,
      onboardingApprover,
      onboardingContributors: "",
      onboardingRolesComplete: Boolean(onboardingLead && onboardingApprover),
      contributorsConfirmed: false,
      guidanceRead: Boolean(onboardingLead && onboardingApprover),
    };
    applyRoleAudit(assessment.prepare, "onboardingRoles", currentUser, {
      lead: onboardingLead,
      approver: onboardingApprover,
    });

    if (!assessment.scope) assessment.scope = {};
    assessment.scope.rolesLead = onboardingLead || ((currentUser && currentUser.name) || "");
    assessment.scope.rolesApprover = onboardingApprover;
    assessment.updatedAt = new Date().toISOString();

    if (errors.length > 0) {
      return res.render("pages/flow/prepare-round-2-roles", {
        pageTitle: "Who is leading and approving the CAF assessment?",
        labels,
        assessment,
        defaults: {
          onboardingLead,
          onboardingApprover,
        },
        returnTo,
        backHref: getCouncilRolesReturnHref(returnTo),
        returnHref: getCouncilRolesReturnHref(returnTo),
        returnText: getCouncilRolesReturnText(returnTo),
        rolesAudit: buildRolesAudit(
          assessment.prepare.onboardingRolesMeta,
          assessment.prepare.onboardingRolesHistory
        ),
        error: { items: errors },
      });
    }

    delete req.session.data.onboardingLead;
    delete req.session.data.onboardingApprover;
    delete req.session.data.onboardingContributors;
    delete req.session.data.councilRolesReturnTo;

    return res.redirect(getCouncilRolesSaveRedirect(returnTo));
  });

  router.get("/profile", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    const gatedNotice = getStage1GateNotice(req, labels);

    const { ad, bc } = getOutcomesForVersion(assessment);
    const rows = buildProfileRows(profileTargets, ad, bc);
    const adRows = rows.filter((row) => row.objective === "A" || row.objective === "D");
    const bcRows = rows.filter((row) => row.objective === "B" || row.objective === "C");

    res.render("pages/flow/profile", {
      pageTitle: labels.flow.profile.pageTitle,
      labels,
      assessment,
      adRows,
      bcRows,
      selectedLens: assessment.lens || "",
      profileReviewed: assessment.profile.reviewed,
      gatedNotice,
    });
  });

  router.post("/profile", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const reviewed = (req.session.data.profileReviewed || "").toString();
    assessment.profile.reviewed = reviewed === "yes";
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.profileReviewed;

    return res.redirect("/assessments/current/dashboard");
  });

  router.get("/self-assess/ad", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (redirectIfScopeNotReady(req, res, assessment, "/self-assess/ad")) return;
    assessment.lens = "ad";
    assessment.updatedAt = new Date().toISOString();
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/self-assessment/ad");
    }
    return res.redirect("/assessments/current/dashboard?lens=ad&view=all");
  });

  router.get("/self-assess/ad/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (redirectIfScopeNotReady(req, res, assessment, `/self-assess/ad/${req.params.outcomeId}`)) return;

    const { ad } = getOutcomesForVersion(assessment);
    const allowedIds = getPrototypeOutcomeIds(ad);
    if (!allowedIds.includes(req.params.outcomeId)) {
      return res.redirect(
        isRoundTwoRequest(req)
          ? "/assessments/current/self-assessment/ad"
          : "/assessments/current/dashboard?lens=ad&view=all"
      );
    }
    const outcome = findOutcome(ad, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const saved = assessment.selfAssess.ad[outcome.id] || {};
    const evidenceRefs = ensureAtLeastOneEvidenceRow(normaliseEvidenceRefs(saved.evidenceRefs));

    const roundTwo = isRoundTwoRequest(req);
    if (roundTwo && !usesCompactCafJudgementPage({ lens: "ad", outcome })) {
      const igpAssessments = buildIgpAssessmentForm(saved.igpAssessments, outcome);
      const firstIncompleteIndex = findFirstIncompleteIgpIndex(igpAssessments);
      const destination = igpAssessments.every(hasCompletedIgpResponse)
        ? `/self-assess/ad/${encodeURIComponent(outcome.id)}/check-answers`
        : `/self-assess/ad/${encodeURIComponent(outcome.id)}/statements/${firstIncompleteIndex + 1}`;
      return res.redirect(destination);
    }
    const nextOutcomeId = getNextPrototypeOutcomeId(ad, outcome.id);
    const context = roundTwo
      ? buildRoundTwoOutcomeContext({ lens: "ad", tree: ad, outcome, nextOutcomeId })
      : {
          backLink: `/assessments/current/outcomes/${outcome.id}`,
          heading: buildOutcomeOverviewTitle(outcome),
          subHeading: "",
          lens: "ad",
          progressLink: `/assessments/current/outcomes/${outcome.id}`,
          progressLinkText: "Return to outcome overview",
        };

    return renderSelfAssessOutcome(res, {
      labels,
      assessment,
      context,
      outcome,
      form: {
        targetLevel: getOutcomeTargetLevel(outcome),
        igpResponse: saved.igpResponse || "",
        igpAssessments: buildIgpAssessmentForm(saved.igpAssessments, outcome),
        igpSynthesis: buildIgpSynthesis(buildIgpAssessmentForm(saved.igpAssessments, outcome)),
        judgement: saved.judgement || "",
        judgementOptions: roundTwo ? getRoundTwoJudgementOptions() : labels.flow.selfAssessOutcome.judgementOptions,
        mismatchReason: saved.mismatchReason || "",
        reuseDecision: saved.reuseDecision || "",
        rationale: saved.rationale || "",
        qualityReviewedAt: formatDateForInput(saved.qualityReviewedAt),
        approverReviewedAt: formatDateForInput(saved.approverReviewedAt),
        evidenceRefs,
        status: (saved.status || "").toString(),
        statusLabel: getStatusLabel((saved.status || "").toString()),
        assurerReview: saved.assurerReview || null,
      },
      error: null,
    });
  });

  router.get("/self-assess/ad/:outcomeId/statements/:statementNumber", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (redirectIfScopeNotReady(req, res, assessment, `/self-assess/ad/${req.params.outcomeId}`)) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(req.params.outcomeId)}`);
    }

    const { ad } = getOutcomesForVersion(assessment);
    const outcome = findOutcome(ad, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const igpAssessments = buildIgpAssessmentForm(
      ((assessment.selfAssess && assessment.selfAssess.ad && assessment.selfAssess.ad[outcome.id]) || {}).igpAssessments,
      outcome
    );
    const returnToCheckAnswers = req.query.return === "check-answers";
    const statementIndex = Number(req.params.statementNumber) - 1;
    if (statementIndex < 0 || statementIndex >= igpAssessments.length) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(outcome.id)}`);
    }

    return renderRoundTwoIgpStatement(res, {
      labels,
      assessment,
      outcome,
      context: buildRoundTwoOutcomeContext({ lens: "ad", tree: ad, outcome, nextOutcomeId: getNextPrototypeOutcomeId(ad, outcome.id) }),
      igpAssessments,
      statementIndex,
      postAction: `/self-assess/ad/${encodeURIComponent(outcome.id)}/statements/${statementIndex + 1}`,
      changeBaseHref: `/self-assess/ad/${encodeURIComponent(outcome.id)}/statements`,
      checkAnswersHref: `/self-assess/ad/${encodeURIComponent(outcome.id)}/check-answers`,
      backHref:
        returnToCheckAnswers
          ? `/self-assess/ad/${encodeURIComponent(outcome.id)}/check-answers`
          : statementIndex === 0
          ? "/assessments/current/self-assessment/ad"
          : `/self-assess/ad/${encodeURIComponent(outcome.id)}/statements/${statementIndex}`,
      returnToCheckAnswers,
    });
  });

  router.post("/self-assess/ad/:outcomeId/statements/:statementNumber", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isRoundTwoRequest(req)) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(req.params.outcomeId)}`);
    }

    const { ad } = getOutcomesForVersion(assessment);
    const outcome = findOutcome(ad, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const returnToCheckAnswers = (req.session.data.returnToCheckAnswers || "").toString() === "yes";
    const statementIndex = Number(req.params.statementNumber) - 1;
    const existingAd = assessment.selfAssess.ad[outcome.id] || {};
    const igpAssessments = normaliseIgpAssessments(
      remapSingleStatementSubmission(req.session.data.igpAssessments, statementIndex),
      existingAd.igpAssessments,
      outcome
    );
    if (statementIndex < 0 || statementIndex >= igpAssessments.length) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(outcome.id)}`);
    }

    const statement = igpAssessments[statementIndex];
    const errors = [];
    if (!statement.maturity) errors.push({ field: "statement-maturity", text: "Select the maturity level for this statement." });
    if (!statement.rationale.trim()) errors.push({ field: "statement-rationale", text: "Enter the rationale for this statement." });
    if (!statement.evidenceNote.trim()) errors.push({ field: "statement-evidence-note", text: "Enter an evidence note for this statement." });

    if (errors.length > 0) {
      return renderRoundTwoIgpStatement(res, {
        labels,
        assessment,
        outcome,
        context: buildRoundTwoOutcomeContext({ lens: "ad", tree: ad, outcome, nextOutcomeId: getNextPrototypeOutcomeId(ad, outcome.id) }),
        igpAssessments,
        statementIndex,
        postAction: `/self-assess/ad/${encodeURIComponent(outcome.id)}/statements/${statementIndex + 1}`,
        changeBaseHref: `/self-assess/ad/${encodeURIComponent(outcome.id)}/statements`,
        checkAnswersHref: `/self-assess/ad/${encodeURIComponent(outcome.id)}/check-answers`,
        backHref:
          returnToCheckAnswers
            ? `/self-assess/ad/${encodeURIComponent(outcome.id)}/check-answers`
            : statementIndex === 0
            ? "/assessments/current/self-assessment/ad"
            : `/self-assess/ad/${encodeURIComponent(outcome.id)}/statements/${statementIndex}`,
        returnToCheckAnswers,
        error: { items: errors },
      });
    }

    const nowIso = new Date().toISOString();
    assessment.selfAssess.ad[outcome.id] = {
      ...existingAd,
      igpAssessments,
      igpResponse: buildRoundTwoOutcomeSummary(igpAssessments),
      status: "in_progress",
      updatedAt: nowIso,
    };
    if (assessment.progressTracker && assessment.progressTracker[outcome.id]) {
      assessment.progressTracker[outcome.id] = {
        ...assessment.progressTracker[outcome.id],
        status: "in_progress",
        updatedAt: nowIso,
      };
    }
    assessment.updatedAt = nowIso;
    invalidateRoundTwoSectionCompletion(assessment, "ad");
    updateRoundTwoCollaborationDraftState(assessment, req.session.data.user || null);
    clearOutcomeForm(req);

    const action = (req.body.action || req.session.data.action || "").toString();
    if (action === "saveReturn") {
      const returnContext = getRoundTwoOutcomeReturnContext("ad");
      return res.redirect(`${returnContext.href}?saved=outcome&name=${encodeURIComponent(`${outcome.code} ${outcome.title}`)}`);
    }
    if (returnToCheckAnswers) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(outcome.id)}/check-answers`);
    }
    if (statementIndex + 1 < igpAssessments.length) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(outcome.id)}/statements/${statementIndex + 2}`);
    }
    return res.redirect(`/self-assess/ad/${encodeURIComponent(outcome.id)}/check-answers`);
  });

  router.get("/self-assess/ad/:outcomeId/check-answers", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (redirectIfScopeNotReady(req, res, assessment, `/self-assess/ad/${req.params.outcomeId}`)) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(req.params.outcomeId)}`);
    }

    const { ad } = getOutcomesForVersion(assessment);
    const outcome = findOutcome(ad, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const existingAd = assessment.selfAssess.ad[outcome.id] || {};
    const igpAssessments = buildIgpAssessmentForm(existingAd.igpAssessments, outcome);
    if (igpAssessments.some((item) => !hasCompletedIgpResponse(item))) {
      const firstIncompleteIndex = findFirstIncompleteIgpIndex(igpAssessments);
      return res.redirect(`/self-assess/ad/${encodeURIComponent(outcome.id)}/statements/${firstIncompleteIndex + 1}`);
    }

    return renderRoundTwoIgpCheckAnswers(res, {
      assessment,
      outcome,
      context: buildRoundTwoOutcomeContext({ lens: "ad", tree: ad, outcome, nextOutcomeId: getNextPrototypeOutcomeId(ad, outcome.id) }),
      igpAssessments,
      formAction: `/self-assess/ad/${encodeURIComponent(outcome.id)}/check-answers`,
      changeBaseHref: `/self-assess/ad/${encodeURIComponent(outcome.id)}/statements`,
      backHref: `/self-assess/ad/${encodeURIComponent(outcome.id)}/statements/${igpAssessments.length}`,
    });
  });

  router.post("/self-assess/ad/:outcomeId/check-answers", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isRoundTwoRequest(req)) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(req.params.outcomeId)}`);
    }

    const { ad } = getOutcomesForVersion(assessment);
    const outcome = findOutcome(ad, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const existingAd = assessment.selfAssess.ad[outcome.id] || {};
    const igpAssessments = buildIgpAssessmentForm(existingAd.igpAssessments, outcome);
    if (igpAssessments.some((item) => !hasCompletedIgpResponse(item))) {
      const firstIncompleteIndex = findFirstIncompleteIgpIndex(igpAssessments);
      return res.redirect(`/self-assess/ad/${encodeURIComponent(outcome.id)}/statements/${firstIncompleteIndex + 1}`);
    }

    const nowIso = new Date().toISOString();
    const judgement = buildRoundTwoOutcomeJudgement(igpAssessments);
    assessment.selfAssess.ad[outcome.id] = {
      ...existingAd,
      igpAssessments,
      igpResponse: buildRoundTwoOutcomeSummary(igpAssessments),
      judgement,
      rationale: buildRoundTwoOutcomeSummary(igpAssessments),
      mismatchReason: "",
      reuseDecision: "",
      evidenceRefs: normaliseEvidenceRefs(existingAd.evidenceRefs),
      carriedForward: false,
      reviewRequired: false,
      status: judgement ? "complete" : "not_started",
      updatedAt: nowIso,
    };
    if (assessment.progressTracker && assessment.progressTracker[outcome.id]) {
      assessment.progressTracker[outcome.id] = {
        ...assessment.progressTracker[outcome.id],
        status: judgement ? "complete" : "not_started",
        updatedAt: nowIso,
      };
    }
    assessment.updatedAt = nowIso;
    invalidateRoundTwoSectionCompletion(assessment, "ad");
    updateRoundTwoCollaborationDraftState(assessment, req.session.data.user || null);
    clearOutcomeForm(req);

    const action = (req.body.action || req.session.data.action || "").toString();
    const savedOutcomeLabel = `${outcome.code} ${outcome.title}`;
    if (action === "saveReturn") {
      const returnContext = getRoundTwoOutcomeReturnContext("ad");
      return res.redirect(`${returnContext.href}?saved=outcome&name=${encodeURIComponent(savedOutcomeLabel)}`);
    }
    const nextOutcomeId = getNextPrototypeOutcomeId(ad, outcome.id);
    if (nextOutcomeId) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(nextOutcomeId)}`);
    }
    return res.redirect(`/assessments/current/self-assessment/ad?saved=outcome&name=${encodeURIComponent(savedOutcomeLabel)}`);
  });

  router.post("/self-assess/ad/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const { ad } = getOutcomesForVersion(assessment);
    const allowedIds = getPrototypeOutcomeIds(ad);
    if (!allowedIds.includes(req.params.outcomeId)) {
      return res.redirect(
        isRoundTwoRequest(req)
          ? "/assessments/current/self-assessment/ad"
          : "/assessments/current/dashboard?lens=ad&view=all"
      );
    }
    const outcome = findOutcome(ad, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const action = (req.session.data.action || "").toString();
    const roundTwo = isRoundTwoRequest(req);
    if (roundTwo && !usesCompactCafJudgementPage({ lens: "ad", outcome })) {
      return res.redirect(`/self-assess/ad/${encodeURIComponent(req.params.outcomeId)}`);
    }
    const nextOutcomeId = getNextPrototypeOutcomeId(ad, outcome.id);

    const existingAd = assessment.selfAssess.ad[outcome.id] || {};
    const igpResponse = (req.session.data.igpResponse || existingAd.igpResponse || "").toString().trim();
    const igpAssessments = normaliseIgpAssessments(
      req.session.data.igpAssessments,
      existingAd.igpAssessments,
      outcome
    );
    const judgement = (req.session.data.judgement || "").toString();
    const mismatchReason = (req.session.data.mismatchReason || existingAd.mismatchReason || "").toString().trim();
    const reuseDecision = (req.session.data.reuseDecision || existingAd.reuseDecision || "").toString().trim();
    const rationale = (req.session.data.rationale || "").toString().trim();
    const qualityReviewedAt = (req.session.data.qualityReviewedAt || "").toString().trim();
    const approverReviewedAt = (req.session.data.approverReviewedAt || "").toString().trim();

    const evidenceRefsFromForm = normaliseEvidenceRefs(req.session.data.evidenceRefs);
    const evidenceRefs = ensureAtLeastOneEvidenceRow(evidenceRefsFromForm);

    if (action === "addEvidence") {
      evidenceRefs.push(blankEvidenceRef());
      clearOutcomeAction(req);
      return renderSelfAssessOutcome(res, {
        labels,
        assessment,
        outcome,
        context: roundTwo
          ? buildRoundTwoOutcomeContext({ lens: "ad", tree: ad, outcome, nextOutcomeId })
          : {
              backLink: `/assessments/current/outcomes/${outcome.id}`,
              heading: buildOutcomeOverviewTitle(outcome),
              subHeading: "",
              progressLink: `/assessments/current/outcomes/${outcome.id}`,
              progressLinkText: "Return to outcome overview",
            },
        form: {
          targetLevel: getOutcomeTargetLevel(outcome),
          igpResponse,
          igpAssessments,
          igpSynthesis: buildIgpSynthesis(igpAssessments),
          judgement,
          judgementOptions: roundTwo ? getRoundTwoJudgementOptions() : labels.flow.selfAssessOutcome.judgementOptions,
          mismatchReason,
          reuseDecision,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs,
        },
      });
    }

    if (action.startsWith("removeEvidence:")) {
      const idxStr = action.split(":")[1];
      const idx = parseInt(idxStr, 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < evidenceRefs.length) {
        evidenceRefs.splice(idx, 1);
      }
      const safeEvidence = ensureAtLeastOneEvidenceRow(evidenceRefs);
      clearOutcomeAction(req);
      return renderSelfAssessOutcome(res, {
        labels,
        assessment,
        outcome,
        context: roundTwo
          ? buildRoundTwoOutcomeContext({ lens: "ad", tree: ad, outcome, nextOutcomeId })
          : {
              backLink: `/assessments/current/outcomes/${outcome.id}`,
              heading: buildOutcomeOverviewTitle(outcome),
              subHeading: "",
              progressLink: `/assessments/current/outcomes/${outcome.id}`,
              progressLinkText: "Return to outcome overview",
            },
        form: {
          targetLevel: getOutcomeTargetLevel(outcome),
          igpResponse,
          igpAssessments,
          igpSynthesis: buildIgpSynthesis(igpAssessments),
          judgement,
          judgementOptions: roundTwo ? getRoundTwoJudgementOptions() : labels.flow.selfAssessOutcome.judgementOptions,
          mismatchReason,
          reuseDecision,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs: safeEvidence,
        },
      });
    }

    const existingStatus = (existingAd.status || "").toString();

    if (!roundTwo && action === "shareForReview") {
      const shareErrors = validateSelfAssess({
        igpResponse,
        judgement,
        rationale,
        labels,
      });
      const evidenceError = validateEvidenceRefs(evidenceRefsFromForm);
      if (evidenceError) shareErrors.push({ field: "evidenceRefs", text: evidenceError });

      if (shareErrors.length > 0) {
        clearOutcomeAction(req);
        return renderSelfAssessOutcome(res, {
          labels,
          assessment,
          outcome,
          context: {
            backLink: `/assessments/current/outcomes/${outcome.id}`,
            heading: buildOutcomeOverviewTitle(outcome),
            subHeading: "",
            progressLink: `/assessments/current/outcomes/${outcome.id}`,
            progressLinkText: "Return to outcome overview",
          },
          form: {
            igpResponse,
            igpAssessments,
            judgement,
            reuseDecision,
            rationale,
            qualityReviewedAt,
            approverReviewedAt,
            evidenceRefs,
            status: existingStatus,
            statusLabel: getStatusLabel(existingStatus),
            assurerReview: existingAd.assurerReview || null,
          },
          error: { items: shareErrors },
        });
      }

      const nowIso = new Date().toISOString();
      const actor = req.session.data.user ? req.session.data.user.name : "Council user";
      const history = Array.isArray(existingAd.history) ? existingAd.history.slice() : [];
      history.push({
        at: nowIso,
        by: actor,
        summary: "Shared with assurer for feedback.",
        status: "ready_for_review",
      });

      const nextAd = {
        ...existingAd,
        igpResponse,
        igpAssessments,
        judgement,
        reuseDecision,
        rationale,
        qualityReviewedAt,
        approverReviewedAt,
        evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
        carriedForward: false,
        reviewRequired: false,
        status: "ready_for_review",
        history,
        updatedAt: nowIso,
      };

      assessment.selfAssess.ad[outcome.id] = nextAd;
      if (assessment.progressTracker && assessment.progressTracker[outcome.id]) {
        assessment.progressTracker[outcome.id] = {
          ...assessment.progressTracker[outcome.id],
          status: "ready_for_review",
          nextStep: "Await assurer feedback",
          updatedAt: nowIso,
        };
      }
      assessment.updatedAt = nowIso;
      clearOutcomeForm(req);
      return res.redirect(`/assessments/current/outcomes/${outcome.id}`);
    }

    const errors = validateSelfAssess({
      igpResponse,
      igpAssessments,
      judgement,
      mismatchReason,
      mismatch: roundTwo ? isJudgementMismatch(judgement, buildIgpJudgementHint(igpAssessments)) : false,
      requireReuseDecision: roundTwo && Boolean(existingAd.carriedForward || existingAd.reviewRequired),
      reuseDecision,
      rationale,
      labels,
    });
    const evidenceError = validateEvidenceRefs(evidenceRefsFromForm);
    if (evidenceError) errors.push({ field: "evidenceRefs", text: evidenceError });

    if (errors.length > 0) {
      clearOutcomeAction(req);
      return renderSelfAssessOutcome(res, {
        labels,
        assessment,
        outcome,
        context: roundTwo
          ? buildRoundTwoOutcomeContext({ lens: "ad", tree: ad, outcome, nextOutcomeId })
          : {
              backLink: `/assessments/current/outcomes/${outcome.id}`,
              heading: buildOutcomeOverviewTitle(outcome),
              subHeading: "",
              progressLink: `/assessments/current/outcomes/${outcome.id}`,
              progressLinkText: "Return to outcome overview",
            },
        form: {
          targetLevel: getOutcomeTargetLevel(outcome),
          igpResponse,
          igpAssessments,
          igpSynthesis: buildIgpSynthesis(igpAssessments),
          judgement,
          judgementOptions: roundTwo ? getRoundTwoJudgementOptions() : labels.flow.selfAssessOutcome.judgementOptions,
          mismatchReason,
          reuseDecision,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs,
          status: existingStatus,
          statusLabel: getStatusLabel(existingStatus),
          assurerReview: existingAd.assurerReview || null,
        },
        error: { items: errors },
      });
    }

    const nextStatus =
      existingStatus === "feedback_received" || existingStatus === "updated_after_feedback"
        ? "updated_after_feedback"
        : judgement
        ? "complete"
        : "not_started";

    const nowIso = new Date().toISOString();
    assessment.selfAssess.ad[outcome.id] = {
      ...existingAd,
      igpResponse,
      igpAssessments,
      judgement,
      mismatchReason,
      reuseDecision,
      rationale,
      qualityReviewedAt,
      approverReviewedAt,
      evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
      carriedForward: false,
      reviewRequired: false,
      status: nextStatus,
      updatedAt: nowIso,
    };
    if (assessment.progressTracker && assessment.progressTracker[outcome.id]) {
      assessment.progressTracker[outcome.id] = {
        ...assessment.progressTracker[outcome.id],
        status: nextStatus,
        nextStep: nextStatus === "updated_after_feedback" ? "Re-share update with assurer" : "",
        updatedAt: nowIso,
      };
    }
    assessment.updatedAt = nowIso;

    if (roundTwo) {
      invalidateRoundTwoSectionCompletion(assessment, "ad");
      updateRoundTwoCollaborationDraftState(assessment, req.session.data.user || null);
      clearOutcomeForm(req);
      const savedOutcomeLabel = `${outcome.code} ${outcome.title}`;
      if (action === "saveReturn") {
        const returnContext = getRoundTwoOutcomeReturnContext("ad");
        return res.redirect(`${returnContext.href}?saved=outcome&name=${encodeURIComponent(savedOutcomeLabel)}`);
      }
      const nextOutcomeId = getNextPrototypeOutcomeId(ad, outcome.id);
      if (nextOutcomeId) {
        return res.redirect(`/self-assess/ad/${encodeURIComponent(nextOutcomeId)}`);
      }
      return res.redirect(`/assessments/current/self-assessment/ad?saved=outcome&name=${encodeURIComponent(savedOutcomeLabel)}`);
    }

    return res.redirect(`/assessments/current/outcomes/${outcome.id}`);
  });

  router.get("/self-assess/bc", (req, res) => {
    return res.redirect("/self-assess/bc/select-system");
  });

  router.get("/self-assess/bc/select-system", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (redirectIfScopeNotReady(req, res, assessment, "/self-assess/bc/select-system")) return;
    assessment.lens = "bc";
    assessment.updatedAt = new Date().toISOString();
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/self-assessment/bc");
    }
    return res.redirect("/assessments/current/dashboard?lens=bc&view=all");
  });

  router.get("/self-assess/bc/:systemId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (redirectIfScopeNotReady(req, res, assessment, `/self-assess/bc/${req.params.systemId}`)) return;
    assessment.lens = "bc";
    assessment.updatedAt = new Date().toISOString();

    const scope = assessment.scope || {};
    const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
    const annualSetup = assessment.annualSetup || {};
    const allowedSystemIds = getResolvedBCSystemIds(assessment);

    if (allowedSystemIds.length > 0 && !allowedSystemIds.includes(req.params.systemId)) {
      return res.redirect(isRoundTwoRequest(req) ? "/assessments/current/self-assessment/bc" : "/self-assess/bc/select-system");
    }

    const system = systems.find((s) => s.id === req.params.systemId);
    if (!system) return renderNotFound(res);

    if (!isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/dashboard?lens=bc&view=all");
    }

    if (!annualSetup.completed) {
      return res.redirect("/assessments/current/journey");
    }

    const { bc } = getOutcomesForVersion(assessment);
    const prototypeRows = getPrototypeOutcomeRows(bc);
    const rows = prototypeRows.map((outcome) => {
      const saved = getBCOutcome(assessment, system.id, outcome.id);
      const evidenceCount = Array.isArray(saved.evidenceRefs)
        ? saved.evidenceRefs.filter(hasAnyEvidenceValue).length
        : 0;
      const started = Array.isArray(saved.igpAssessments)
        ? saved.igpAssessments.some(hasStartedIgpAssessment)
        : false;
      return {
        id: outcome.id,
        code: outcome.code,
        title: outcome.title,
        description: outcome.description || "",
        judgement: saved.judgement || "",
        actionHref:
          outcome.id === B2A_OUTCOME_ID
            ? buildB2aStepPath(system.id, "context")
            : `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}`,
        carriedForward: Boolean(saved.carriedForward && saved.reviewRequired),
        evidenceCount,
        status:
          saved.carriedForward && saved.reviewRequired
            ? "Carried forward - review needed"
            : saved.judgement
              ? "Complete"
              : started
                ? "In progress"
              : "Not started",
      };
    });

    const mapping = getScopeMapping(scope, system.id);
    const mappedServices = (mapping && Array.isArray(mapping.serviceIds) ? mapping.serviceIds : [])
      .map((serviceId) => findScopeService(scope, serviceId))
      .filter(Boolean)
      .map((service) => service.name);
    const priority = getScopePriority(scope, system.id);
    const pageStatus = rows.length > 0 && rows.every((row) => row.judgement)
      ? "Complete"
      : rows.some((row) => row.judgement)
        ? "In progress"
        : "Not started";
    const primaryOutcome = rows[0] || null;

    return res.render("pages/flow/self-assess-bc-system", {
      pageTitle: `Complete B and C self-assessment: ${system.name}`,
      labels,
      assessment,
      system,
      rows,
      mappedServices,
      priorityLevel: priority && priority.level ? priority.level : "",
      pageStatus,
      primaryOutcome,
      saved: (req.query.saved || "").toString(),
      savedName: (req.query.name || "").toString(),
      roundTwo: true,
    });
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-context`, (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (
      redirectIfScopeNotReady(
        req,
        res,
        assessment,
        `/self-assess/bc/${req.params.systemId}/outcomes/${B2A_OUTCOME_ID}/b2a-context`
      )
    ) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(req.params.systemId)}/outcomes/${B2A_OUTCOME_ID}`);
    }

    const system = findBCSystemForJourney(assessment, req.params.systemId);
    if (!system) return renderNotFound(res);

    const { bc } = getOutcomesForVersion(assessment);
    const outcome = findOutcome(bc, B2A_OUTCOME_ID);
    if (!outcome) return renderNotFound(res);

    const saved = getBCOutcome(assessment, system.id, outcome.id);
    const journey = normaliseB2aJourney(saved.b2aJourney);
    const igpProgress = buildB2aIgpProgressSummary(journey);
    const evidenceCount = Array.isArray(saved.evidenceRefs)
      ? saved.evidenceRefs.filter((item) => Boolean(item && (item.title || item.link || item.description))).length
      : 0;
    const nextAction = !saved.judgement
      ? "Continue the IGP responses and set the final judgement."
      : !saved.rationale
      ? "Set the final judgement and rationale, then add supporting evidence."
      : "Review the remaining gaps and mark the outcome ready for internal review.";

    return res.render("pages/flow/b2a-context", {
      pageTitle: `${outcome.code} ${outcome.title}`,
      assessment,
      context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: null }),
      outcome,
      backHref: `/self-assess/bc/${encodeURIComponent(system.id)}`,
      startHref: buildB2aStepPath(system.id, "achieved"),
      startLabel: igpProgress.completed > 0 ? "Continue B2.a" : "Start B2.a",
      progressSummary: {
        statusLabel: formatB2aStatusLabel((saved.status || "").toString() || "in_progress"),
        igpsAnswered: `${igpProgress.completed} of ${igpProgress.total}`,
        evidenceCount,
        judgement: saved.judgement || "Not set",
        rationaleStarted: Boolean((saved.rationale || "").toString().trim()),
        nextAction,
      },
    });
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-achieved`, (req, res) => {
    renderB2aIgpStep(req, res, {
      stepKey: "achieved",
      pageTitle: "Achieved IGPs",
      heading: "Achieved IGPs",
      intro:
        "Start with the indicators of good practice that would usually be present if this contributing outcome is achieved.",
      guidanceSummary: "How to answer these statements",
      guidanceBody:
        "Answer based on how the system works now. Use 'Not applicable' if the statement does not apply in this context. Use 'Alternative control in place' if a different control meets the same need.",
      backHrefBuilder: (systemId) => buildB2aStepPath(systemId, "context"),
      nextHrefBuilder: (systemId) => buildB2aStepPath(systemId, "not-achieved"),
    });
  });

  router.post(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-achieved`, (req, res) => {
    handleB2aIgpStepPost(req, res, {
      stepKey: "achieved",
      pageTitle: "Achieved IGPs",
      heading: "Achieved IGPs",
      intro:
        "Start with the indicators of good practice that would usually be present if this contributing outcome is achieved.",
      guidanceSummary: "How to answer these statements",
      guidanceBody:
        "Answer based on how the system works now. Use 'Not applicable' if the statement does not apply in this context. Use 'Alternative control in place' if a different control meets the same need.",
      backHrefBuilder: (systemId) => buildB2aStepPath(systemId, "context"),
      nextHrefBuilder: (systemId) => buildB2aStepPath(systemId, "not-achieved"),
    });
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-not-achieved`, (req, res) => {
    renderB2aIgpStep(req, res, {
      stepKey: "notAchieved",
      pageTitle: "Not achieved IGPs",
      heading: "Not achieved IGPs",
      intro:
        "Now review indicators that would usually suggest this contributing outcome is not achieved.",
      pageHint: "Some statements on this page relate to controls you reviewed earlier.",
      guidanceSummary: "How to use this page",
      guidanceBody:
        "A 'Yes' answer may indicate a gap that affects your judgement. Use 'Not applicable' or 'Alternative control in place' only when you can explain why the statement does not apply as written.",
      backHrefBuilder: (systemId) => buildB2aStepPath(systemId, "achieved"),
      nextHrefBuilder: (systemId) => buildB2aStepPath(systemId, "partially-achieved"),
    });
  });

  router.post(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-not-achieved`, (req, res) => {
    handleB2aIgpStepPost(req, res, {
      stepKey: "notAchieved",
      pageTitle: "Not achieved IGPs",
      heading: "Not achieved IGPs",
      intro:
        "Now review indicators that would usually suggest this contributing outcome is not achieved.",
      pageHint: "Some statements on this page relate to controls you reviewed earlier.",
      guidanceSummary: "How to use this page",
      guidanceBody:
        "A 'Yes' answer may indicate a gap that affects your judgement. Use 'Not applicable' or 'Alternative control in place' only when you can explain why the statement does not apply as written.",
      backHrefBuilder: (systemId) => buildB2aStepPath(systemId, "achieved"),
      nextHrefBuilder: (systemId) => buildB2aStepPath(systemId, "partially-achieved"),
    });
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-partially-achieved`, (req, res) => {
    renderB2aIgpStep(req, res, {
      stepKey: "partiallyAchieved",
      pageTitle: "Partially achieved IGPs",
      heading: "Partially achieved IGPs",
      intro:
        "Use these indicators where some controls are in place, but the overall position may not yet support an achieved judgement.",
      guidanceSummary: "How to use these statements",
      guidanceBody:
        "These statements help you consider whether the council is getting worthwhile security benefit, while still having gaps to address.",
      backHrefBuilder: (systemId) => buildB2aStepPath(systemId, "not-achieved"),
      nextHrefBuilder: (systemId) => buildB2aStepPath(systemId, "indicative-judgement"),
    });
  });

  router.post(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-partially-achieved`, (req, res) => {
    handleB2aIgpStepPost(req, res, {
      stepKey: "partiallyAchieved",
      pageTitle: "Partially achieved IGPs",
      heading: "Partially achieved IGPs",
      intro:
        "Use these indicators where some controls are in place, but the overall position may not yet support an achieved judgement.",
      guidanceSummary: "How to use these statements",
      guidanceBody:
        "These statements help you consider whether the council is getting worthwhile security benefit, while still having gaps to address.",
      backHrefBuilder: (systemId) => buildB2aStepPath(systemId, "not-achieved"),
      nextHrefBuilder: (systemId) => buildB2aStepPath(systemId, "indicative-judgement"),
    });
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-indicative-judgement`, (req, res) => {
    const routeContext = getB2aRouteContext(req, res);
    if (!routeContext) return;
    const { assessment, system, outcome, saved } = routeContext;
    const summary = buildB2aIndicativeJudgement(saved.b2aJourney || {});
    syncB2aOutcomeData(assessment, system.id, {
      ...saved,
      b2aJourney: {
        ...(saved.b2aJourney || {}),
        indicativeJudgement: summary.judgement,
        indicativeSummary: summary,
      },
    });

    return res.render("pages/flow/b2a-indicative-judgement", {
      pageTitle: "Indicative judgement",
      assessment,
      context: buildRoundTwoOutcomeContext({ lens: "bc", tree: routeContext.bc, outcome, system, nextOutcomeId: null }),
      outcome,
      system,
      backHref: buildB2aStepPath(system.id, "partially-achieved"),
      nextHref: buildB2aStepPath(system.id, "final-judgement"),
      summary,
    });
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-final-judgement`, (req, res) => {
    renderB2aFinalJudgement(req, res);
  });

  router.post(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-final-judgement`, (req, res) => {
    handleB2aFinalJudgementPost(req, res);
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-rationale`, (req, res) => {
    res.redirect(buildB2aStepPath(req.params.systemId, "final-judgement"));
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-evidence`, (req, res) => {
    renderB2aEvidence(req, res);
  });

  router.post(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-evidence`, (req, res) => {
    handleB2aEvidencePost(req, res);
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-review-before-internal-review`, (req, res) => {
    renderB2aReviewBeforeAssurance(req, res);
  });

  router.post(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-review-before-internal-review`, (req, res) => {
    handleB2aReviewBeforeAssurancePost(req, res);
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-ready-for-internal-review`, (req, res) => {
    const routeContext = getB2aRouteContext(req, res);
    if (!routeContext) return;
    const { assessment, system, outcome, saved } = routeContext;
    const journey = saved.b2aJourney || {};
    const evidenceRefs = Array.isArray(saved.evidenceRefs) ? saved.evidenceRefs : [];

    if (!saved.judgement || !saved.rationale || evidenceRefs.length === 0 || !journey.reviewDeclaration) {
      return res.redirect(buildB2aStepPath(system.id, "review"));
    }

    return res.render("pages/flow/b2a-ready", {
      pageTitle: "Outcome ready for internal review",
      assessment,
      context: buildRoundTwoOutcomeContext({ lens: "bc", tree: routeContext.bc, outcome, system, nextOutcomeId: null }),
      outcome,
      system,
      summary: {
        judgement: saved.judgement,
        rationale: saved.rationale,
        evidenceCount: evidenceRefs.length,
        indicativeJudgement: journey.indicativeJudgement || "",
      },
      dashboardHref: "/assessments/current/dashboard?lens=bc&view=all",
      systemHref: `/self-assess/bc/${encodeURIComponent(system.id)}`,
    });
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-review-before-assurance`, (req, res) => {
    return res.redirect(buildB2aStepPath(req.params.systemId, "review"));
  });

  router.post(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-review-before-assurance`, (req, res) => {
    return res.redirect(303, buildB2aStepPath(req.params.systemId, "review"));
  });

  router.get(`/self-assess/bc/:systemId/outcomes/${B2A_OUTCOME_ID}/b2a-ready-for-assurance`, (req, res) => {
    return res.redirect(buildB2aStepPath(req.params.systemId, "ready"));
  });

  router.get("/self-assess/bc/:systemId/outcomes/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (
      redirectIfScopeNotReady(
        req,
        res,
        assessment,
        `/self-assess/bc/${req.params.systemId}/outcomes/${req.params.outcomeId}`
      )
    )
      return;

    const scopeSystems = assessment.scope && Array.isArray(assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
    const system = scopeSystems.find((s) => s.id === req.params.systemId);
    if (!system) return renderNotFound(res);

    const { bc } = getOutcomesForVersion(assessment);
    const allowedIds = getPrototypeOutcomeIds(bc);
    if (!allowedIds.includes(req.params.outcomeId)) {
      return res.redirect(
        isRoundTwoRequest(req)
          ? `/self-assess/bc/${encodeURIComponent(system.id)}`
          : "/assessments/current/dashboard?lens=bc&view=all"
      );
    }
    const outcome = findOutcome(bc, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    if (isRoundTwoRequest(req) && outcome.id === B2A_OUTCOME_ID) {
      return res.redirect(buildB2aStepPath(system.id, "context"));
    }

    const saved = getBCOutcome(assessment, system.id, outcome.id);
    const evidenceRefs = ensureAtLeastOneEvidenceRow(normaliseEvidenceRefs(saved.evidenceRefs));

    const roundTwo = isRoundTwoRequest(req);
    if (roundTwo) {
      const igpAssessments = buildIgpAssessmentForm(saved.igpAssessments, outcome);
      const firstIncompleteIndex = findFirstIncompleteIgpIndex(igpAssessments);
      const destination = igpAssessments.every(hasCompletedIgpResponse)
        ? `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/check-answers`
        : `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements/${firstIncompleteIndex + 1}`;
      return res.redirect(destination);
    }
    const nextOutcomeId = getNextPrototypeOutcomeId(bc, outcome.id);
    const context = roundTwo
      ? buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId })
      : {
          backLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
          heading: buildOutcomeOverviewTitle(outcome),
          subHeading: "",
          lens: "bc",
          progressLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
          progressLinkText: "Return to outcome overview",
        };

    res.render("pages/flow/self-assess-outcome", {
      pageTitle: roundTwo ? buildOutcomeWorkspaceTitle(outcome) : buildOutcomeOverviewTitle(outcome),
      labels,
      assessment,
      context,
      outcome,
      form: {
        targetLevel: getOutcomeTargetLevel(outcome),
        igpResponse: saved.igpResponse || "",
        igpAssessments: buildIgpAssessmentForm(saved.igpAssessments, outcome),
        igpJudgementHint: buildIgpJudgementHint(buildIgpAssessmentForm(saved.igpAssessments, outcome)),
        igpSynthesis: buildIgpSynthesis(buildIgpAssessmentForm(saved.igpAssessments, outcome)),
        judgement: saved.judgement || "",
        judgementOptions: roundTwo ? getRoundTwoJudgementOptions() : labels.flow.selfAssessOutcome.judgementOptions,
        mismatchReason: saved.mismatchReason || "",
        reuseDecision: saved.reuseDecision || "",
        rationale: saved.rationale || "",
        qualityReviewedAt: formatDateForInput(saved.qualityReviewedAt),
        approverReviewedAt: formatDateForInput(saved.approverReviewedAt),
        evidenceRefs,
        status: (saved.status || "").toString(),
        statusLabel: getStatusLabel((saved.status || "").toString()),
        assurerReview: saved.assurerReview || null,
      },
      error: null,
    });
  });

  router.get("/self-assess/bc/:systemId/outcomes/:outcomeId/statements/:statementNumber", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (
      redirectIfScopeNotReady(
        req,
        res,
        assessment,
        `/self-assess/bc/${req.params.systemId}/outcomes/${req.params.outcomeId}`
      )
    ) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(req.params.systemId)}/outcomes/${encodeURIComponent(req.params.outcomeId)}`);
    }

    const scopeSystems = assessment.scope && Array.isArray(assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
    const system = scopeSystems.find((item) => item.id === req.params.systemId);
    if (!system) return renderNotFound(res);

    const { bc } = getOutcomesForVersion(assessment);
    const outcome = findOutcome(bc, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const igpAssessments = buildIgpAssessmentForm(getBCOutcome(assessment, system.id, outcome.id).igpAssessments, outcome);
    const returnToCheckAnswers = req.query.return === "check-answers";
    const statementIndex = Number(req.params.statementNumber) - 1;
    if (statementIndex < 0 || statementIndex >= igpAssessments.length) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}`);
    }

    return renderRoundTwoIgpStatement(res, {
      labels,
      assessment,
      outcome,
      context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: getNextPrototypeOutcomeId(bc, outcome.id) }),
      igpAssessments,
      statementIndex,
      postAction: `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements/${statementIndex + 1}`,
      changeBaseHref: `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements`,
      checkAnswersHref: `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/check-answers`,
      backHref:
        returnToCheckAnswers
          ? `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/check-answers`
          : statementIndex === 0
          ? `/self-assess/bc/${encodeURIComponent(system.id)}`
          : `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements/${statementIndex}`,
      returnToCheckAnswers,
    });
  });

  router.post("/self-assess/bc/:systemId/outcomes/:outcomeId/statements/:statementNumber", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isRoundTwoRequest(req)) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(req.params.systemId)}/outcomes/${encodeURIComponent(req.params.outcomeId)}`);
    }

    const scopeSystems = assessment.scope && Array.isArray(assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
    const system = scopeSystems.find((item) => item.id === req.params.systemId);
    if (!system) return renderNotFound(res);

    const { bc } = getOutcomesForVersion(assessment);
    const outcome = findOutcome(bc, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const returnToCheckAnswers = (req.session.data.returnToCheckAnswers || "").toString() === "yes";
    const statementIndex = Number(req.params.statementNumber) - 1;
    const existingBc = getBCOutcome(assessment, system.id, outcome.id);
    const igpAssessments = normaliseIgpAssessments(
      remapSingleStatementSubmission(req.session.data.igpAssessments, statementIndex),
      existingBc.igpAssessments,
      outcome
    );
    if (statementIndex < 0 || statementIndex >= igpAssessments.length) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}`);
    }

    const statement = igpAssessments[statementIndex];
    const errors = [];
    if (!statement.maturity) errors.push({ field: "statement-maturity", text: "Select the maturity level for this statement." });
    if (!statement.rationale.trim()) errors.push({ field: "statement-rationale", text: "Enter the rationale for this statement." });
    if (!statement.evidenceNote.trim()) errors.push({ field: "statement-evidence-note", text: "Enter an evidence note for this statement." });

    if (errors.length > 0) {
      return renderRoundTwoIgpStatement(res, {
        labels,
        assessment,
        outcome,
        context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: getNextPrototypeOutcomeId(bc, outcome.id) }),
        igpAssessments,
        statementIndex,
        postAction: `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements/${statementIndex + 1}`,
        changeBaseHref: `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements`,
        checkAnswersHref: `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/check-answers`,
        backHref:
          returnToCheckAnswers
            ? `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/check-answers`
            : statementIndex === 0
            ? `/self-assess/bc/${encodeURIComponent(system.id)}`
            : `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements/${statementIndex}`,
        returnToCheckAnswers,
        error: { items: errors },
      });
    }

    const nowIso = new Date().toISOString();
    setBCOutcome(assessment, system.id, outcome.id, {
      ...existingBc,
      igpAssessments,
      igpResponse: buildRoundTwoOutcomeSummary(igpAssessments),
      status: "in_progress",
      updatedAt: nowIso,
    });
    assessment.updatedAt = nowIso;
    invalidateRoundTwoSectionCompletion(assessment, "bc");
    updateRoundTwoCollaborationDraftState(assessment, req.session.data.user || null);
    clearOutcomeForm(req);

    const action = (req.body.action || req.session.data.action || "").toString();
    if (action === "saveReturn") {
      const returnContext = getRoundTwoOutcomeReturnContext("bc", system.id);
      return res.redirect(`${returnContext.href}?saved=outcome&name=${encodeURIComponent(`${outcome.code} ${outcome.title}`)}`);
    }
    if (returnToCheckAnswers) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/check-answers`);
    }
    if (statementIndex + 1 < igpAssessments.length) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements/${statementIndex + 2}`);
    }
    return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/check-answers`);
  });

  router.get("/self-assess/bc/:systemId/outcomes/:outcomeId/check-answers", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (
      redirectIfScopeNotReady(
        req,
        res,
        assessment,
        `/self-assess/bc/${req.params.systemId}/outcomes/${req.params.outcomeId}`
      )
    ) return;
    if (!isRoundTwoRequest(req)) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(req.params.systemId)}/outcomes/${encodeURIComponent(req.params.outcomeId)}`);
    }

    const scopeSystems = assessment.scope && Array.isArray(assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
    const system = scopeSystems.find((item) => item.id === req.params.systemId);
    if (!system) return renderNotFound(res);

    const { bc } = getOutcomesForVersion(assessment);
    const outcome = findOutcome(bc, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const existingBc = getBCOutcome(assessment, system.id, outcome.id);
    const igpAssessments = buildIgpAssessmentForm(existingBc.igpAssessments, outcome);
    if (igpAssessments.some((item) => !hasCompletedIgpResponse(item))) {
      const firstIncompleteIndex = findFirstIncompleteIgpIndex(igpAssessments);
      return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements/${firstIncompleteIndex + 1}`);
    }

    return renderRoundTwoIgpCheckAnswers(res, {
      assessment,
      outcome,
      context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: getNextPrototypeOutcomeId(bc, outcome.id) }),
      igpAssessments,
      formAction: `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/check-answers`,
      changeBaseHref: `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements`,
      backHref: `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements/${igpAssessments.length}`,
    });
  });

  router.post("/self-assess/bc/:systemId/outcomes/:outcomeId/check-answers", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isRoundTwoRequest(req)) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(req.params.systemId)}/outcomes/${encodeURIComponent(req.params.outcomeId)}`);
    }

    const scopeSystems = assessment.scope && Array.isArray(assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
    const system = scopeSystems.find((item) => item.id === req.params.systemId);
    if (!system) return renderNotFound(res);

    const { bc } = getOutcomesForVersion(assessment);
    const outcome = findOutcome(bc, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const existingBc = getBCOutcome(assessment, system.id, outcome.id);
    const igpAssessments = buildIgpAssessmentForm(existingBc.igpAssessments, outcome);
    if (igpAssessments.some((item) => !hasCompletedIgpResponse(item))) {
      const firstIncompleteIndex = findFirstIncompleteIgpIndex(igpAssessments);
      return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}/statements/${firstIncompleteIndex + 1}`);
    }

    const nowIso = new Date().toISOString();
    const judgement = buildRoundTwoOutcomeJudgement(igpAssessments);
    setBCOutcome(assessment, system.id, outcome.id, {
      ...existingBc,
      igpAssessments,
      igpResponse: buildRoundTwoOutcomeSummary(igpAssessments),
      judgement,
      rationale: buildRoundTwoOutcomeSummary(igpAssessments),
      mismatchReason: "",
      reuseDecision: "",
      evidenceRefs: normaliseEvidenceRefs(existingBc.evidenceRefs),
      carriedForward: false,
      reviewRequired: false,
      status: judgement ? "complete" : "not_started",
      updatedAt: nowIso,
    });
    assessment.updatedAt = nowIso;
    invalidateRoundTwoSectionCompletion(assessment, "bc");
    updateRoundTwoCollaborationDraftState(assessment, req.session.data.user || null);
    clearOutcomeForm(req);

    const action = (req.body.action || req.session.data.action || "").toString();
    const savedOutcomeLabel = `${outcome.code} ${outcome.title}`;
    if (action === "saveReturn") {
      const returnContext = getRoundTwoOutcomeReturnContext("bc", system.id);
      return res.redirect(`${returnContext.href}?saved=outcome&name=${encodeURIComponent(savedOutcomeLabel)}`);
    }
    const nextOutcomeId = getNextPrototypeOutcomeId(bc, outcome.id);
    if (nextOutcomeId) {
      return res.redirect(
        `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(nextOutcomeId)}`
      );
    }
    return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}?saved=outcome&name=${encodeURIComponent(savedOutcomeLabel)}`);
  });

  router.post("/self-assess/bc/:systemId/outcomes/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const scopeSystems = assessment.scope && Array.isArray(assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
    const system = scopeSystems.find((s) => s.id === req.params.systemId);
    if (!system) return renderNotFound(res);

    const { bc } = getOutcomesForVersion(assessment);
    const allowedIds = getPrototypeOutcomeIds(bc);
    if (!allowedIds.includes(req.params.outcomeId)) {
      return res.redirect("/assessments/current/dashboard?lens=bc&view=all");
    }
    const outcome = findOutcome(bc, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    if (isRoundTwoRequest(req) && outcome.id === B2A_OUTCOME_ID) {
      return res.redirect(buildB2aStepPath(system.id, "context"));
    }

    const action = (req.session.data.action || "").toString();
    const roundTwo = isRoundTwoRequest(req);
    if (roundTwo) {
      return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(outcome.id)}`);
    }
    const nextOutcomeId = getNextPrototypeOutcomeId(bc, outcome.id);

    const existingBc = getBCOutcome(assessment, system.id, outcome.id);
    const igpResponse = (req.session.data.igpResponse || existingBc.igpResponse || "").toString().trim();
    const igpAssessments = normaliseIgpAssessments(
      req.session.data.igpAssessments,
      existingBc.igpAssessments,
      outcome
    );
    const judgement = (req.session.data.judgement || "").toString();
    const mismatchReason = (req.session.data.mismatchReason || existingBc.mismatchReason || "").toString().trim();
    const reuseDecision = (req.session.data.reuseDecision || existingBc.reuseDecision || "").toString().trim();
    const rationale = (req.session.data.rationale || "").toString().trim();
    const qualityReviewedAt = (req.session.data.qualityReviewedAt || "").toString().trim();
    const approverReviewedAt = (req.session.data.approverReviewedAt || "").toString().trim();

    const evidenceRefsFromForm = normaliseEvidenceRefs(req.session.data.evidenceRefs);
    const evidenceRefs = ensureAtLeastOneEvidenceRow(evidenceRefsFromForm);

    if (action === "addEvidence") {
      evidenceRefs.push(blankEvidenceRef());
      clearOutcomeAction(req);
      return renderSelfAssessOutcome(res, {
        labels,
        assessment,
        outcome,
        context: roundTwo
          ? buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId })
          : {
              backLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
              heading: buildOutcomeOverviewTitle(outcome),
              subHeading: "",
            },
        form: {
          targetLevel: getOutcomeTargetLevel(outcome),
          igpResponse,
          igpAssessments,
          igpSynthesis: buildIgpSynthesis(igpAssessments),
          judgement,
          judgementOptions: roundTwo ? getRoundTwoJudgementOptions() : labels.flow.selfAssessOutcome.judgementOptions,
          mismatchReason,
          reuseDecision,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs,
        },
      });
    }

    if (action.startsWith("removeEvidence:")) {
      const idxStr = action.split(":")[1];
      const idx = parseInt(idxStr, 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < evidenceRefs.length) {
        evidenceRefs.splice(idx, 1);
      }
      const safeEvidence = ensureAtLeastOneEvidenceRow(evidenceRefs);
      clearOutcomeAction(req);
      return renderSelfAssessOutcome(res, {
        labels,
        assessment,
        outcome,
        context: roundTwo
          ? buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId })
          : {
              backLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
              heading: buildOutcomeOverviewTitle(outcome),
              subHeading: "",
            },
        form: {
          targetLevel: getOutcomeTargetLevel(outcome),
          igpResponse,
          igpAssessments,
          igpSynthesis: buildIgpSynthesis(igpAssessments),
          judgement,
          judgementOptions: roundTwo ? getRoundTwoJudgementOptions() : labels.flow.selfAssessOutcome.judgementOptions,
          mismatchReason,
          reuseDecision,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs: safeEvidence,
        },
      });
    }

    const existingStatus = (existingBc.status || "").toString();

    if (!roundTwo && action === "shareForReview") {
      const shareErrors = validateSelfAssess({
        igpResponse,
        judgement,
        reuseDecision,
        rationale,
        labels,
      });
      const evidenceError = validateEvidenceRefs(evidenceRefsFromForm);
      if (evidenceError) shareErrors.push({ field: "evidenceRefs", text: evidenceError });

      if (shareErrors.length > 0) {
        clearOutcomeAction(req);
        return renderSelfAssessOutcome(res, {
          labels,
          assessment,
          outcome,
          context: {
            backLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
            heading: buildOutcomeOverviewTitle(outcome),
            subHeading: "",
            progressLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
            progressLinkText: "Return to outcome overview",
          },
          form: {
            igpResponse,
            igpAssessments,
            judgement,
            reuseDecision,
            rationale,
            qualityReviewedAt,
            approverReviewedAt,
            evidenceRefs,
            status: existingStatus,
            statusLabel: getStatusLabel(existingStatus),
            assurerReview: existingBc.assurerReview || null,
          },
          error: { items: shareErrors },
        });
      }

      const nowIso = new Date().toISOString();
      const actor = req.session.data.user ? req.session.data.user.name : "Council user";
      const history = Array.isArray(existingBc.history) ? existingBc.history.slice() : [];
      history.push({
        at: nowIso,
        by: actor,
        summary: "Shared with assurer for feedback.",
        status: "ready_for_review",
      });

      setBCOutcome(assessment, system.id, outcome.id, {
        ...existingBc,
        igpResponse,
        igpAssessments,
        judgement,
        reuseDecision,
        rationale,
        qualityReviewedAt,
        approverReviewedAt,
        evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
        carriedForward: false,
        reviewRequired: false,
        status: "ready_for_review",
        history,
        updatedAt: nowIso,
      });
      assessment.updatedAt = nowIso;
      clearOutcomeForm(req);
      return res.redirect(
        `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`
      );
    }

    const errors = validateSelfAssess({
      igpResponse,
      igpAssessments,
      judgement,
      mismatchReason,
      mismatch: roundTwo ? isJudgementMismatch(judgement, buildIgpJudgementHint(igpAssessments)) : false,
      requireReuseDecision: roundTwo && Boolean(existingBc.carriedForward || existingBc.reviewRequired),
      reuseDecision,
      rationale,
      labels,
    });
    const evidenceError = validateEvidenceRefs(evidenceRefsFromForm);
    if (evidenceError) errors.push({ field: "evidenceRefs", text: evidenceError });

    if (errors.length > 0) {
      clearOutcomeAction(req);
      return renderSelfAssessOutcome(res, {
        labels,
        assessment,
        outcome,
        context: roundTwo
          ? buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId })
          : {
              backLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
              heading: buildOutcomeOverviewTitle(outcome),
              subHeading: "",
            },
        form: {
          targetLevel: getOutcomeTargetLevel(outcome),
          igpResponse,
          igpAssessments,
          igpSynthesis: buildIgpSynthesis(igpAssessments),
          judgement,
          judgementOptions: roundTwo ? getRoundTwoJudgementOptions() : labels.flow.selfAssessOutcome.judgementOptions,
          mismatchReason,
          reuseDecision,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs,
          status: existingStatus,
          statusLabel: getStatusLabel(existingStatus),
          assurerReview: existingBc.assurerReview || null,
        },
        error: { items: errors },
      });
    }

    const nextStatus =
      existingStatus === "feedback_received" || existingStatus === "updated_after_feedback"
        ? "updated_after_feedback"
        : judgement
        ? "complete"
        : "not_started";
    const nowIso = new Date().toISOString();
    setBCOutcome(assessment, system.id, outcome.id, {
      ...existingBc,
      igpResponse,
      igpAssessments,
      judgement,
      mismatchReason,
      reuseDecision,
      rationale,
      qualityReviewedAt,
      approverReviewedAt,
      evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
      carriedForward: false,
      reviewRequired: false,
      status: nextStatus,
      updatedAt: nowIso,
    });
    assessment.updatedAt = nowIso;

    if (roundTwo) {
      invalidateRoundTwoSectionCompletion(assessment, "bc");
      updateRoundTwoCollaborationDraftState(assessment, req.session.data.user || null);
      clearOutcomeForm(req);
      const savedOutcomeLabel = `${outcome.code} ${outcome.title}`;
      if (action === "saveReturn") {
        const returnContext = getRoundTwoOutcomeReturnContext("bc", system.id);
        return res.redirect(`${returnContext.href}?saved=outcome&name=${encodeURIComponent(savedOutcomeLabel)}`);
      }
      const nextOutcomeId = getNextPrototypeOutcomeId(bc, outcome.id);
      if (nextOutcomeId) {
        return res.redirect(
          `/self-assess/bc/${encodeURIComponent(system.id)}/outcomes/${encodeURIComponent(nextOutcomeId)}`
        );
      }
      return res.redirect(`/self-assess/bc/${encodeURIComponent(system.id)}?saved=outcome&name=${encodeURIComponent(savedOutcomeLabel)}`);
    }

    return res.redirect(
      `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`
    );
  });

  router.get("/evidence-library", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    res.render("pages/flow/evidence-library", {
      pageTitle: labels.flow.evidence.pageTitle,
      labels,
      assessment,
      evidenceLibrary: normaliseEvidenceRefs(assessment.evidenceLibrary),
      collectedEvidence: collectEvidenceReferences(assessment),
    });
  });

  router.post("/evidence-library", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const title = (req.session.data.title || req.session.data.refId || "").toString().trim();
    const type = (req.session.data.type || "").toString().trim();
    const link = (req.session.data.link || "").toString().trim();
    const description = (req.session.data.description || req.session.data.note || "").toString().trim();

    if (title || link || type || description) {
      assessment.evidenceLibrary.push({
        title,
        type,
        link,
        description,
        createdAt: new Date().toISOString(),
      });
      assessment.updatedAt = new Date().toISOString();
    }

    delete req.session.data.title;
    delete req.session.data.refId;
    delete req.session.data.type;
    delete req.session.data.link;
    delete req.session.data.description;
    delete req.session.data.note;

    return res.redirect("/evidence-library");
  });

  router.get("/assurance-review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    res.render("pages/flow/assurance-review", {
      pageTitle: labels.flow.assurance.pageTitle,
      labels,
      assessment,
      assurance: assessment.assurance,
    });
  });

  router.post("/assurance-review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    assessment.assurance = {
      status: (req.session.data.assuranceStatus || "").toString(),
      feedback: (req.session.data.assuranceFeedback || "").toString().trim(),
      reviewedAt: (req.session.data.assuranceReviewedAt || "").toString().trim(),
    };
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.assuranceStatus;
    delete req.session.data.assuranceFeedback;
    delete req.session.data.assuranceReviewedAt;

    return res.redirect("/improvement-plan");
  });

  const legacyIipPaths = [
    "/improvement-plan/generate",
    "/improvement-plan/awaiting",
    "/improvement-plan/edit",
    "/improvement-plan/review",
    "/improvement-plan/sign-off",
  ];

  function redirectLegacyIip(req, res) {
    if (isAssurer(req)) {
      return res.redirect("/assurer/report-stage-1");
    }
    return res.redirect("/improvement-plan/stage-2");
  }

  legacyIipPaths.forEach((path) => {
    router.get(path, redirectLegacyIip);
    router.post(path, redirectLegacyIip);
  });

  router.get("/improvement-plan", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (!isAssurer(req)) {
      return res.redirect("/improvement-plan/stage-2");
    }
    return res.redirect("/assurer/report-stage-1");
  });

  router.get("/improvement-plan/stage-2", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    if (!isAssuranceStage1Finalised(assessment)) {
      return res.redirect("/assessments/current/assurance-report");
    }

    ensureIipStage2Data(assessment);
    const summary = buildIipStage2Summary(assessment);
    return res.render("pages/flow/iip-stage2-hub", {
      pageTitle: "IIP Stage 2",
      labels,
      assessment,
      summary,
      statusLabel: formatStage2Status(summary.status),
    });
  });

  router.get("/improvement-plan/stage-2/setup", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    if (!isAssuranceStage1Finalised(assessment)) {
      return res.redirect("/assessments/current/assurance-report");
    }

    ensureIipStage2Data(assessment);
    const contributors = getIipContributors(assessment, req.session.data.user || null);
    return res.render("pages/flow/iip-stage2-setup", {
      pageTitle: "Set owners and deadlines",
      labels,
      assessment,
      contributors,
      rows: assessment.improvementPlan.stage2.rows,
      error: null,
      saved: req.query.saved === "1",
    });
  });

  router.post("/improvement-plan/stage-2/setup", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    if (!isAssuranceStage1Finalised(assessment)) {
      return res.redirect("/assessments/current/assurance-report");
    }
    ensureIipStage2Data(assessment);

    const contributors = getIipContributors(assessment, req.session.data.user || null);
    const contributorIds = new Set(contributors.map((c) => c.id));
    const updatedRows = normaliseStage2SetupRows(req.session.data.stage2Rows, assessment.improvementPlan.stage2.rows);
    const errors = [];
    updatedRows.forEach((row, idx) => {
      if (!row.ownerId || !contributorIds.has(row.ownerId)) {
        errors.push({ field: `stage2Rows-${idx}-ownerId`, text: `Select an owner for ${row.outcomeCode}.` });
      }
      if (!isValidIsoDate(row.ownerDueDate)) {
        errors.push({ field: `stage2Rows-${idx}-ownerDueDate`, text: `Enter a valid due date for ${row.outcomeCode}.` });
      }
    });

    if (errors.length > 0) {
      return res.render("pages/flow/iip-stage2-setup", {
        pageTitle: "Set owners and deadlines",
        labels,
        assessment,
        contributors,
        rows: updatedRows,
        error: { items: errors },
        saved: false,
      });
    }

    assessment.improvementPlan.stage2.rows = updatedRows.map((row) => ({
      ...row,
      ownerNameSnapshot: getContributorNameById(contributors, row.ownerId),
      updatedAt: new Date().toISOString(),
    }));
    assessment.improvementPlan.stage2.status = "setup_in_progress";
    assessment.improvementPlan.stage2.timeline.lastUpdatedAt = new Date().toISOString();
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.stage2Rows;
    return res.redirect("/improvement-plan/stage-2/setup?saved=1");
  });

  router.get("/improvement-plan/stage-2/rows/:rowId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    if (!isAssuranceStage1Finalised(assessment)) {
      return res.redirect("/assessments/current/assurance-report");
    }
    ensureIipStage2Data(assessment);
    const row = findStage2Row(assessment, req.params.rowId);
    if (!row) return renderNotFound(res);

    return res.render("pages/flow/iip-stage2-row", {
      pageTitle: `IIP row: ${row.outcomeCode}`,
      labels,
      assessment,
      row,
      error: null,
      saved: req.query.saved === "1",
    });
  });

  router.post("/improvement-plan/stage-2/rows/:rowId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    if (!isAssuranceStage1Finalised(assessment)) {
      return res.redirect("/assessments/current/assurance-report");
    }
    ensureIipStage2Data(assessment);
    const row = findStage2Row(assessment, req.params.rowId);
    if (!row) return renderNotFound(res);

    const updated = {
      ...row,
      ownershipRolesResponsible: (req.session.data.ownershipRolesResponsible || "").toString().trim(),
      cost: (req.session.data.cost || "").toString().trim(),
      effort: (req.session.data.effort || "").toString().trim(),
      complexity: (req.session.data.complexity || "").toString().trim(),
      implementationJustification: (req.session.data.implementationJustification || "").toString().trim(),
      implementationPriority: (req.session.data.implementationPriority || "").toString().trim(),
      quarter1: (req.session.data.quarter1 || "").toString().trim(),
      quarter2: (req.session.data.quarter2 || "").toString().trim(),
      quarter3: (req.session.data.quarter3 || "").toString().trim(),
      quarter4: (req.session.data.quarter4 || "").toString().trim(),
      nextYearStarts: (req.session.data.nextYearStarts || "").toString().trim(),
      updatedAt: new Date().toISOString(),
    };

    const errors = validateStage2Row(updated);
    if (errors.length > 0) {
      return res.render("pages/flow/iip-stage2-row", {
        pageTitle: `IIP row: ${row.outcomeCode}`,
        labels,
        assessment,
        row: updated,
        error: { items: errors },
        saved: false,
      });
    }

    assessment.improvementPlan.stage2.rows = assessment.improvementPlan.stage2.rows.map((item) =>
      item.id === row.id ? updated : item
    );
    const allComplete = allStage2RowsComplete(assessment.improvementPlan.stage2.rows);
    assessment.improvementPlan.stage2.status = allComplete
      ? "ready_for_internal_signoff"
      : "in_progress";
    assessment.improvementPlan.stage2.timeline.lastUpdatedAt = new Date().toISOString();
    assessment.updatedAt = new Date().toISOString();

    clearStage2RowForm(req);
    return res.redirect(`/improvement-plan/stage-2/rows/${row.id}?saved=1`);
  });

  router.get("/improvement-plan/stage-2/review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    if (!isAssuranceStage1Finalised(assessment)) {
      return res.redirect("/assessments/current/assurance-report");
    }
    ensureIipStage2Data(assessment);

    return res.render("pages/flow/iip-stage2-review", {
      pageTitle: "Review IIP Stage 2",
      labels,
      assessment,
      rows: assessment.improvementPlan.stage2.rows,
      allComplete: allStage2RowsComplete(assessment.improvementPlan.stage2.rows),
    });
  });

  router.get("/improvement-plan/stage-2/internal-sign-off", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    ensureIipStage2Data(assessment);
    if (!allStage2RowsComplete(assessment.improvementPlan.stage2.rows)) {
      return res.redirect("/improvement-plan/stage-2/review");
    }

    return res.render("pages/flow/iip-stage2-signoff", {
      pageTitle: "IIP Stage 2 internal sign-off",
      labels,
      assessment,
      approvals: assessment.improvementPlan.stage2.internalApprovals,
      error: null,
      saved: req.query.saved === "1",
    });
  });

  router.post("/improvement-plan/stage-2/internal-sign-off", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    ensureIipStage2Data(assessment);
    if (!allStage2RowsComplete(assessment.improvementPlan.stage2.rows)) {
      return res.redirect("/improvement-plan/stage-2/review");
    }

    const approvals = {
      qualityAssurerName: (req.session.data.stage2QualityAssurerName || "").toString().trim(),
      qualityAssurerDate: (req.session.data.stage2QualityAssurerDate || "").toString().trim(),
      approverName: (req.session.data.stage2ApproverName || "").toString().trim(),
      approverDate: (req.session.data.stage2ApproverDate || "").toString().trim(),
      signedOffAt: "",
      signedOffBy: "",
    };
    const errors = [];
    if (!approvals.qualityAssurerName) errors.push({ field: "stage2QualityAssurerName", text: "Enter internal quality assurer name." });
    if (!isValidIsoDate(approvals.qualityAssurerDate)) errors.push({ field: "stage2QualityAssurerDate", text: "Enter valid internal quality assurer date." });
    if (!approvals.approverName) errors.push({ field: "stage2ApproverName", text: "Enter internal approver name." });
    if (!isValidIsoDate(approvals.approverDate)) errors.push({ field: "stage2ApproverDate", text: "Enter valid internal approver date." });

    if (errors.length > 0) {
      return res.render("pages/flow/iip-stage2-signoff", {
        pageTitle: "IIP Stage 2 internal sign-off",
        labels,
        assessment,
        approvals,
        error: { items: errors },
        saved: false,
      });
    }

    approvals.signedOffAt = new Date().toISOString();
    approvals.signedOffBy = req.session.data.user ? req.session.data.user.name : "CAF Lead";
    assessment.improvementPlan.stage2.internalApprovals = approvals;
    assessment.improvementPlan.stage2.status =
      assessment.improvementPlan.stage2.status === "rework_in_progress"
        ? "rework_internally_signed_off"
        : "internally_signed_off";
    assessment.improvementPlan.stage2.timeline.lastUpdatedAt = new Date().toISOString();
    assessment.updatedAt = new Date().toISOString();
    clearStage2SignOffForm(req);
    return res.redirect("/improvement-plan/stage-2/internal-sign-off?saved=1");
  });

  router.get("/improvement-plan/stage-2/submit-assurer", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    ensureIipStage2Data(assessment);

    return res.render("pages/flow/iip-stage2-submit-assurer", {
      pageTitle: "Submit Stage 2 IIP to assurer",
      labels,
      assessment,
      error: null,
      saved: req.query.saved === "1",
    });
  });

  router.post("/improvement-plan/stage-2/submit-assurer", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    ensureIipStage2Data(assessment);

    const confirm = (req.session.data.stage2SubmitAssurerConfirm || "").toString();
    const errors = [];
    const allowedStatus = new Set(["internally_signed_off", "rework_internally_signed_off"]);
    if (!allowedStatus.has(assessment.improvementPlan.stage2.status)) {
      errors.push({ field: "stage2SubmitAssurerConfirm", text: "Complete internal sign-off before submitting to assurer." });
    }
    if (confirm !== "yes") {
      errors.push({ field: "stage2SubmitAssurerConfirm", text: "Confirm submission to assurer." });
    }
    if (errors.length > 0) {
      return res.render("pages/flow/iip-stage2-submit-assurer", {
        pageTitle: "Submit Stage 2 IIP to assurer",
        labels,
        assessment,
        error: { items: errors },
        saved: false,
      });
    }

    assessment.improvementPlan.stage2.assurerReview.submittedAt = new Date().toISOString();
    assessment.improvementPlan.stage2.assurerReview.submittedBy = req.session.data.user ? req.session.data.user.name : "CAF Lead";
    assessment.improvementPlan.stage2.status = "submitted_to_assurer";
    assessment.improvementPlan.stage2.timeline.lastUpdatedAt = new Date().toISOString();
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.stage2SubmitAssurerConfirm;
    return res.redirect("/improvement-plan/stage-2/submit-assurer?saved=1");
  });

  router.get("/improvement-plan/stage-2/rework", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    ensureIipStage2Data(assessment);
    if (assessment.improvementPlan.stage2.status !== "rework_required") {
      return res.redirect("/improvement-plan/stage-2");
    }

    return res.render("pages/flow/iip-stage2-rework", {
      pageTitle: "IIP rework",
      labels,
      assessment,
      error: null,
      saved: req.query.saved === "1",
    });
  });

  router.post("/improvement-plan/stage-2/rework", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    ensureIipStage2Data(assessment);
    if (assessment.improvementPlan.stage2.status !== "rework_required") {
      return res.redirect("/improvement-plan/stage-2");
    }

    const notes = (req.session.data.stage2ReworkNotes || "").toString().trim();
    const errors = [];
    if (!notes) errors.push({ field: "stage2ReworkNotes", text: "Enter rework summary." });
    if (assessment.improvementPlan.stage2.rework.completedAt) {
      errors.push({ field: "stage2ReworkNotes", text: "Rework has already been submitted for this cycle." });
    }
    if (errors.length > 0) {
      return res.render("pages/flow/iip-stage2-rework", {
        pageTitle: "IIP rework",
        labels,
        assessment,
        error: { items: errors },
        saved: false,
      });
    }

    assessment.improvementPlan.stage2.rework.required = true;
    assessment.improvementPlan.stage2.rework.notes = notes;
    assessment.improvementPlan.stage2.rework.submittedAt = new Date().toISOString();
    assessment.improvementPlan.stage2.rework.completedAt = new Date().toISOString();
    assessment.improvementPlan.stage2.status = "rework_in_progress";
    assessment.improvementPlan.stage2.timeline.lastUpdatedAt = new Date().toISOString();
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.stage2ReworkNotes;
    return res.redirect("/improvement-plan/stage-2/rework?saved=1");
  });

  router.get("/improvement-plan/stage-2/submit-mhclg", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    ensureIipStage2Data(assessment);

    return res.render("pages/flow/iip-stage2-submit-mhclg", {
      pageTitle: "Submit Stage 2 IIP to MHCLG",
      labels,
      assessment,
      error: null,
      saved: req.query.saved === "1",
    });
  });

  router.post("/improvement-plan/stage-2/submit-mhclg", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    ensureFlowData(assessment);
    if (isAssurer(req)) return res.redirect("/assurer/iip-stage-2");
    ensureIipStage2Data(assessment);

    const confirm = (req.session.data.stage2SubmitMhclgConfirm || "").toString();
    const reference = (req.session.data.stage2MhclgReference || "").toString().trim();
    const notes = (req.session.data.stage2MhclgNotes || "").toString().trim();
    const errors = [];
    if (assessment.improvementPlan.stage2.assurerReview.outcome !== "accepted") {
      errors.push({ field: "stage2SubmitMhclgConfirm", text: "Assurer must accept Stage 2 IIP before MHCLG submission." });
    }
    if (confirm !== "yes") errors.push({ field: "stage2SubmitMhclgConfirm", text: "Confirm submission to MHCLG." });
    if (!reference) errors.push({ field: "stage2MhclgReference", text: "Enter a submission reference." });

    if (errors.length > 0) {
      return res.render("pages/flow/iip-stage2-submit-mhclg", {
        pageTitle: "Submit Stage 2 IIP to MHCLG",
        labels,
        assessment,
        error: { items: errors },
        saved: false,
      });
    }

    assessment.improvementPlan.stage2.mhclgSubmission = {
      submittedAt: new Date().toISOString(),
      submittedBy: req.session.data.user ? req.session.data.user.name : "CAF Lead",
      reference,
      notes,
    };
    assessment.improvementPlan.stage2.status = "submitted_to_mhclg";
    assessment.improvementPlan.stage2.timeline.lastUpdatedAt = new Date().toISOString();
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.stage2SubmitMhclgConfirm;
    delete req.session.data.stage2MhclgReference;
    delete req.session.data.stage2MhclgNotes;
    return res.redirect("/improvement-plan/stage-2/submit-mhclg?saved=1");
  });

  router.get("/improvement-plan/generate", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isAssurer(req)) {
      return res.redirect("/improvement-plan/awaiting");
    }

    let gaps = buildIipGaps(assessment);
    if (gaps.length === 0) {
      seedIipDemoGaps(assessment);
      gaps = buildIipGaps(assessment);
    }

    res.render("pages/flow/improvement-generate", {
      pageTitle: labels.flow.improvement.generate.pageTitle,
      labels,
      assessment,
      gaps,
      error: null,
      showSizeWarning: gaps.length > 10,
    });
  });

  router.post("/improvement-plan/generate", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isAssurer(req)) {
      return res.redirect("/improvement-plan/awaiting");
    }

    const gaps = buildIipGaps(assessment);
    const selectedIds = coerceArray(req.session.data.gapIds).filter(Boolean);

    if (selectedIds.length === 0) {
      return res.render("pages/flow/improvement-generate", {
        pageTitle: labels.flow.improvement.generate.pageTitle,
        labels,
        assessment,
        gaps,
        error: { items: [{ field: "gapIds", text: labels.flow.improvement.generate.errors.required }] },
        showSizeWarning: gaps.length > 10,
      });
    }

    assessment.improvementPlan.actions = buildIipActionsFromGaps(gaps, selectedIds);
    assessment.improvementPlan.generatedAt = new Date().toISOString();
    assessment.improvementPlan.status = "draft_by_assurer";
    assessment.improvementPlan.signOff = assessment.improvementPlan.signOff || {
      by: "",
      date: "",
      note: "",
    };
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.gapIds;

    return res.redirect("/improvement-plan/edit");
  });

  router.get("/improvement-plan/awaiting", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    res.render("pages/flow/improvement-awaiting", {
      pageTitle: labels.flow.improvement.awaiting.pageTitle,
      labels,
      assessment,
    });
  });

  router.get("/improvement-plan/edit", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isAssurer(req)) {
      return res.redirect("/improvement-plan/stage-2");
    }
    if (isAssurer(req)) {
      return res.redirect("/improvement-plan/generate");
    }
    if (!isAssuranceStage1Finalised(assessment)) {
      return res.redirect("/assessments/current/assurance-report");
    }

    const actions = assessment.improvementPlan.actions || [];
    if (actions.length === 0) {
      return res.redirect("/improvement-plan/awaiting");
    }

    res.render("pages/flow/improvement-edit", {
      pageTitle: labels.flow.improvement.edit.pageTitle,
      labels,
      assessment,
      actions,
      error: null,
    });
  });

  router.post("/improvement-plan/edit", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isAssurer(req)) {
      return res.redirect("/improvement-plan/stage-2");
    }
    if (isAssurer(req)) {
      return res.redirect("/improvement-plan/generate");
    }
    if (!isAssuranceStage1Finalised(assessment)) {
      return res.redirect("/assessments/current/assurance-report");
    }

    const existing = assessment.improvementPlan.actions || [];
    const updated = normaliseIipActions(req.session.data.iipActions, existing);

    const kept = updated.filter((item) => item.keep !== "no");
    const errors = [];

    for (const item of kept) {
      if (!item.priority || !item.owner || !item.dueDate || !item.expectedEvidence || !item.checkInCadence) {
        errors.push({
          field: `iip-action-${item.id}`,
          text: labels.flow.improvement.edit.errors.required,
        });
      }
    }

    if (errors.length > 0) {
      return res.render("pages/flow/improvement-edit", {
        pageTitle: labels.flow.improvement.edit.pageTitle,
        labels,
        assessment,
        actions: updated,
        error: { items: errors },
      });
    }

    assessment.improvementPlan.actions = kept.map((item) => ({
      ...item,
      confirmed: true,
    }));
    assessment.improvementPlan.status = "ready_for_signoff";
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.iipActions;

    return res.redirect("/improvement-plan/review");
  });

  router.get("/improvement-plan/review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isAssurer(req)) {
      return res.redirect("/improvement-plan/stage-2");
    }
    if (isAssurer(req)) {
      return res.redirect("/improvement-plan/generate");
    }

    const actions = assessment.improvementPlan.actions || [];
    if (actions.length === 0) {
      return res.redirect("/improvement-plan/generate");
    }

    res.render("pages/flow/improvement-review", {
      pageTitle: labels.flow.improvement.review.pageTitle,
      labels,
      assessment,
      actions,
    });
  });

  router.get("/improvement-plan/sign-off", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isAssurer(req)) {
      return res.redirect("/improvement-plan/edit");
    }

    res.render("pages/flow/improvement-sign-off", {
      pageTitle: labels.flow.improvement.signOff.pageTitle,
      labels,
      assessment,
      signOff: assessment.improvementPlan.signOff || { by: "", date: "", note: "" },
      error: null,
      saved: false,
    });
  });

  router.post("/improvement-plan/sign-off", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    if (!isAssurer(req)) {
      return res.redirect("/improvement-plan/edit");
    }

    const by = (req.session.data.iipSignOffBy || "").toString().trim();
    const date = (req.session.data.iipSignOffDate || "").toString().trim();
    const note = (req.session.data.iipSignOffNote || "").toString().trim();

    const errors = [];
    if (!by) errors.push({ field: "iipSignOffBy", text: labels.flow.improvement.signOff.errors.byRequired });
    if (!date) errors.push({ field: "iipSignOffDate", text: labels.flow.improvement.signOff.errors.dateRequired });

    if (errors.length > 0) {
      return res.render("pages/flow/improvement-sign-off", {
        pageTitle: labels.flow.improvement.signOff.pageTitle,
        labels,
        assessment,
        signOff: { by, date, note },
        error: { items: errors },
        saved: false,
      });
    }

    assessment.improvementPlan.signOff = { by, date, note };
    assessment.improvementPlan.readyToSubmit = true;
    assessment.improvementPlan.status = "signed_off";
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.iipSignOffBy;
    delete req.session.data.iipSignOffDate;
    delete req.session.data.iipSignOffNote;

    return res.render("pages/flow/improvement-sign-off", {
      pageTitle: labels.flow.improvement.signOff.pageTitle,
      labels,
      assessment,
      signOff: assessment.improvementPlan.signOff,
      error: null,
      saved: true,
    });
  });

  router.get("/submit-progress", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    const readiness = buildSubmissionReadiness(assessment);

    res.render("pages/flow/submit-progress", {
      pageTitle: labels.flow.submit.pageTitle,
      labels,
      assessment,
      submission: assessment.submission,
      readiness,
    });
  });

  router.post("/submit-progress", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    const readiness = buildSubmissionReadiness(assessment);

    assessment.submission = {
      submittedBy: (req.session.data.submittedBy || "").toString().trim(),
      submittedAt: (req.session.data.submittedAt || "").toString().trim(),
      method: (req.session.data.submissionMethod || "").toString(),
      reference: (req.session.data.submissionReference || "").toString().trim(),
      notes: (req.session.data.submissionNotes || "").toString().trim(),
      assurerSubmitted: (req.session.data.assurerSubmitted || "").toString() === "yes",
      informedAt: (req.session.data.informedAt || "").toString().trim(),
      acknowledgedAt: (req.session.data.acknowledgedAt || "").toString().trim(),
      acknowledgedReference: (req.session.data.acknowledgedReference || "").toString().trim(),
      storedAt: (req.session.data.storedAt || "").toString().trim(),
      storageLocation: (req.session.data.storageLocation || "").toString().trim(),
      reviewedAt: (req.session.data.reviewedAt || "").toString().trim(),
      reviewNotes: (req.session.data.reviewNotes || "").toString().trim(),
      scopePackIncluded: (req.session.data.scopePackIncluded || "").toString() !== "no",
      scopePackSnapshotAt: assessment.scope && assessment.scope.assuranceSchedule
        ? (assessment.scope.assuranceSchedule.updatedAt || assessment.updatedAt || "")
        : (assessment.updatedAt || ""),
    };
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.submittedBy;
    delete req.session.data.submittedAt;
    delete req.session.data.submissionMethod;
    delete req.session.data.submissionReference;
    delete req.session.data.submissionNotes;
    delete req.session.data.assurerSubmitted;
    delete req.session.data.informedAt;
    delete req.session.data.acknowledgedAt;
    delete req.session.data.acknowledgedReference;
    delete req.session.data.storedAt;
    delete req.session.data.storageLocation;
    delete req.session.data.reviewedAt;
    delete req.session.data.reviewNotes;
    delete req.session.data.scopePackIncluded;

    return res.render("pages/flow/submit-progress", {
      pageTitle: labels.flow.submit.pageTitle,
      labels,
      assessment,
      submission: assessment.submission,
      saved: true,
      readiness,
    });
  });

  router.get("/submit-complete", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    const readiness = buildSubmissionReadiness(assessment);
    if (!readiness.canSubmit) {
      return res.redirect("/submit-progress");
    }

    res.render("pages/flow/submit-complete", {
      pageTitle: labels.flow.submit.completeHeading,
      labels,
      assessment,
    });
  });
};

function ensureFlowData(assessment) {
  if (!assessment.prepare) {
    assessment.prepare = {
      guidanceRead: false,
      contributorsConfirmed: false,
      cafReviewed: false,
      understandCaf: false,
      understandService: false,
      hasStakeholderSupport: false,
      onboardingRolesComplete: false,
      onboardingLead: "",
      onboardingApprover: "",
      onboardingContributors: "",
    };
  }

  if (!assessment.profile) {
    assessment.profile = { reviewed: false };
  }

  if (!assessment.selfAssess) {
    assessment.selfAssess = { ad: {}, bc: {} };
  }
  if (!assessment.selfAssess.ad) assessment.selfAssess.ad = {};
  if (!assessment.selfAssess.bc) assessment.selfAssess.bc = {};

  if (!assessment.scope) assessment.scope = {};
  if (!Array.isArray(assessment.scope.criticalSystems)) assessment.scope.criticalSystems = [];
  if (!Array.isArray(assessment.scope.priorityShortlist)) assessment.scope.priorityShortlist = [];

  if (!assessment.evidenceLibrary) assessment.evidenceLibrary = [];
  if (!assessment.assurance) assessment.assurance = { status: "", feedback: "", reviewedAt: "" };
  if (!assessment.improvementPlan) assessment.improvementPlan = { actions: [], signOff: {}, status: "" };
  if (!assessment.submission) {
    assessment.submission = {
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
      scopePackIncluded: true,
      scopePackSnapshotAt: "",
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

function buildSubmissionReadiness(assessment) {
  const reasons = [];
  const outcomeSummary = countOutcomeCompletion(assessment);

  if (outcomeSummary.total === 0 || outcomeSummary.judged === 0) {
    reasons.push("Capture at least one outcome judgement before submission.");
  }
  if (outcomeSummary.missingEvidence > 0) {
    reasons.push("Add evidence references for all judged outcomes.");
  }
  if (!assessment.assurance || assessment.assurance.status !== "approved") {
    reasons.push("Assurance review must be marked as approved.");
  }
  if (!assessment.improvementPlan || assessment.improvementPlan.status !== "signed_off") {
    reasons.push("Improvement plan must be signed off by an assurer.");
  }
  if (assessment.submission && assessment.submission.scopePackIncluded === false) {
    reasons.push("Include the latest scope pack snapshot in formal submission.");
  }

  return {
    canSubmit: reasons.length === 0,
    reasons,
    summary: outcomeSummary,
  };
}

function countOutcomeCompletion(assessment) {
  const ad = assessment.selfAssess && assessment.selfAssess.ad ? assessment.selfAssess.ad : {};
  const bc = assessment.selfAssess && assessment.selfAssess.bc ? assessment.selfAssess.bc : {};
  let total = 0;
  let judged = 0;
  let missingEvidence = 0;

  for (const key of Object.keys(ad)) {
    const row = ad[key] || {};
    const hasJudgement = Boolean(row.judgement);
    total += 1;
    if (hasJudgement) {
      judged += 1;
      if (!hasEvidence(row)) missingEvidence += 1;
    }
  }

  for (const systemId of Object.keys(bc)) {
    const system = bc[systemId] || {};
    const outcomes = system.outcomes || {};
    for (const outcomeId of Object.keys(outcomes)) {
      const row = outcomes[outcomeId] || {};
      const hasJudgement = Boolean(row.judgement);
      total += 1;
      if (hasJudgement) {
        judged += 1;
        if (!hasEvidence(row)) missingEvidence += 1;
      }
    }
  }

  return { total, judged, missingEvidence };
}

function isAssuranceStage1Finalised(assessment) {
  if (!assessment || !assessment.assurance) return false;
  const stage1 = assessment.assurance.stage1Report || {};
  return Boolean(stage1.finalisedAt);
}

function hasEvidence(row) {
  if (!row) return false;
  const refs = Array.isArray(row.evidenceRefs) ? row.evidenceRefs : [];
  return refs.some((ref) =>
    [ref.title, ref.type, ref.link, ref.description, ref.refId, ref.note].some((value) => (value || "").toString().trim())
  );
}

function buildProfileRows(targets, adTree, bcTree) {
  const rows = [];
  const adRows = flattenOutcomes(adTree).map((o) => ({
    ...o,
    target: targets[o.id] || "Achieved",
  }));
  const bcRows = flattenOutcomes(bcTree).map((o) => ({
    ...o,
    target: targets[o.id] || "Achieved",
  }));
  return rows.concat(adRows, bcRows);
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
          description: outcome.description || "",
          objective: objective.code,
          principle: principle.code,
        });
      }
    }
  }
  return flat;
}

function getPrototypeOutcomeLimit(outcomesTree) {
  const lens = outcomesTree && outcomesTree.lens ? String(outcomesTree.lens).toUpperCase() : "";
  return PROTOTYPE_OUTCOME_LIMITS[lens] || 1;
}

function getPrototypeOutcomeRows(outcomesTree) {
  const rows = flattenOutcomes(outcomesTree);
  const lens = outcomesTree && outcomesTree.lens ? String(outcomesTree.lens).toUpperCase() : "";
  const ids = PROTOTYPE_OUTCOME_IDS[lens];
  if (Array.isArray(ids) && ids.length > 0) {
    return ids.map((id) => rows.find((outcome) => outcome.id === id)).filter(Boolean);
  }
  return rows.slice(0, getPrototypeOutcomeLimit(outcomesTree));
}

function getPrototypeOutcomeIds(outcomesTree) {
  return getPrototypeOutcomeRows(outcomesTree).map((outcome) => outcome.id);
}

function getNextPrototypeOutcomeId(outcomesTree, currentOutcomeId) {
  const ids = getPrototypeOutcomeIds(outcomesTree);
  const currentIndex = ids.indexOf(currentOutcomeId);
  if (currentIndex === -1) return null;
  return ids[currentIndex + 1] || null;
}

function findOutcome(outcomesTree, outcomeId) {
  const rows = flattenOutcomes(outcomesTree);
  return rows.find((o) => o.id === outcomeId) || null;
}

function renderNotFound(res) {
  return res.status(404).render("pages/errors/not-found", {
    pageTitle: "Page not found",
    labels,
    message: "Outcome not found.",
  });
}

function buildOutcomeOverviewTitle(outcome) {
  if (!outcome) return "Overview";
  return `Overview: '${outcome.code} ${outcome.title}'`;
}

function buildOutcomeWorkspaceTitle(outcome) {
  if (!outcome) return "Contributing outcome";
  return `${outcome.code} ${outcome.title}`;
}

function buildRoundTwoOutcomeContext({ lens, tree, outcome, system, nextOutcomeId }) {
  const bc = lens === "bc";
  const progressText = buildRoundTwoOutcomeProgressText(tree, outcome, {
    systemName: bc && system ? system.name : "",
  });
  const returnContext = getRoundTwoOutcomeReturnContext(lens, bc && system ? system.id : "");
  const cafJudgementPage = usesCompactCafJudgementPage({ lens, outcome });
  return {
    roundTwo: true,
    cafJudgementPage,
    lens,
    caption: bc
      ? "Critical systems self-assessment (Objectives B and C)"
      : "Organisation self-assessment (Objectives A and D)",
    sectionCaption: !bc && outcome && outcome.id === "A1a" ? "Objective A · Principle A1 Governance" : "",
    backLink: bc ? `/self-assess/bc/${encodeURIComponent(system.id)}` : "/assessments/current/self-assessment/ad",
    heading:
      cafJudgementPage && outcome && outcome.id === "A1a"
        ? "A1.a Board direction"
        : buildOutcomeWorkspaceTitle(outcome),
    intro: outcome && outcome.description ? outcome.description : "",
    systemName: bc && system ? system.name : "",
    systemId: bc && system ? system.id : "",
    progressText,
    returnHref: returnContext.href,
    returnText: returnContext.text,
    primaryActionText: nextOutcomeId ? "Save and continue" : "Save and return",
  };
}

function buildB2aStepPath(systemId, step) {
  const base = `/self-assess/bc/${encodeURIComponent(systemId)}/outcomes/${B2A_OUTCOME_ID}`;
  const byStep = {
    context: `${base}/b2a-context`,
    achieved: `${base}/b2a-achieved`,
    "not-achieved": `${base}/b2a-not-achieved`,
    "partially-achieved": `${base}/b2a-partially-achieved`,
    "indicative-judgement": `${base}/b2a-indicative-judgement`,
    "final-judgement": `${base}/b2a-final-judgement`,
    rationale: `${base}/b2a-final-judgement`,
    evidence: `${base}/b2a-evidence`,
    review: `${base}/b2a-review-before-internal-review`,
    ready: `${base}/b2a-ready-for-internal-review`,
  };
  return byStep[step] || byStep.context;
}

function getB2aStatements() {
  return {
    achieved: [
      {
        id: "robust-identity-proofing",
        statement:
          "Users are identity verified to an appropriate level before accounts are issued for this system.",
      },
      {
        id: "individual-authentication",
        statement:
          "Each user has an individual account and authentication credentials are not shared.",
      },
      {
        id: "authorised-access-only",
        statement:
          "Access is restricted so only authorised users can reach the system and the functions they need.",
      },
      {
        id: "mfa-privileged-remote",
        statement:
          "Multi-factor authentication is used for privileged access and for remote access to the system.",
      },
      {
        id: "access-review",
        statement:
          "User and privileged access lists are reviewed regularly and leavers or role changes are updated promptly.",
      },
      {
        id: "auth-practice-current",
        statement:
          "Authentication methods and account controls are kept up to date with current good practice.",
      },
    ],
    notAchieved: [
      {
        id: "unauthorised-access",
        statement:
          "Unauthorised individuals can gain access to this system or its administrative functions.",
        mirrorHint: "This is the inverse of an earlier statement about authorised access.",
      },
      {
        id: "excessive-access",
        statement:
          "Users have broader access than they need to perform their role on this system.",
        mirrorHint: "You reviewed a related statement earlier about limiting access to what users need.",
      },
      {
        id: "weak-authentication",
        statement:
          "Authentication for this system does not follow current good practice for the type of access being provided.",
        mirrorHint: "This relates to the earlier statement about keeping authentication controls up to date.",
      },
    ],
    partiallyAchieved: [
      {
        id: "reasonable-confidence",
        statement:
          "The council has reasonable confidence in identity verification, but some joining routes still need strengthening.",
      },
      {
        id: "some-additional-controls",
        statement:
          "Additional authentication controls are in place for higher-risk access, but not yet consistently applied.",
      },
      {
        id: "annual-access-review",
        statement:
          "Access lists are reviewed at least annually, but not always when people move role or leave.",
      },
      {
        id: "remote-access-controlled",
        statement:
          "Remote access is individually authenticated and authorised, although local exceptions still exist.",
      },
    ],
  };
}

function createEmptyB2aJourney() {
  return {
    achieved: {},
    notAchieved: {},
    partiallyAchieved: {},
    indicativeJudgement: "",
    indicativeSummary: null,
    reviewDeclaration: false,
  };
}

function normaliseB2aJourney(raw) {
  return {
    ...createEmptyB2aJourney(),
    ...(raw || {}),
    achieved: { ...(raw && raw.achieved ? raw.achieved : {}) },
    notAchieved: { ...(raw && raw.notAchieved ? raw.notAchieved : {}) },
    partiallyAchieved: { ...(raw && raw.partiallyAchieved ? raw.partiallyAchieved : {}) },
  };
}

function findBCSystemForJourney(assessment, systemId) {
  const scopeSystems =
    assessment && assessment.scope && Array.isArray(assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
  return scopeSystems.find((item) => item.id === systemId) || null;
}

function getB2aRouteContext(req, res) {
  const assessment = getAssessmentOrRedirect(req, res);
  if (!assessment) return null;

  ensureFlowData(assessment);
  if (redirectIfScopeNotReady(req, res, assessment, buildB2aStepPath(req.params.systemId, "context"))) {
    return null;
  }
  if (!isRoundTwoRequest(req)) {
    res.redirect(`/self-assess/bc/${encodeURIComponent(req.params.systemId)}/outcomes/${B2A_OUTCOME_ID}`);
    return null;
  }

  const system = findBCSystemForJourney(assessment, req.params.systemId);
  if (!system) {
    renderNotFound(res);
    return null;
  }

  const { bc } = getOutcomesForVersion(assessment);
  const outcome = findOutcome(bc, B2A_OUTCOME_ID);
  if (!outcome) {
    renderNotFound(res);
    return null;
  }

  const saved = getBCOutcome(assessment, system.id, outcome.id);
  saved.b2aJourney = normaliseB2aJourney(saved.b2aJourney);

  return { assessment, system, outcome, saved, bc };
}

function getB2aStepForm(journey, stepKey) {
  const stepValues = journey[stepKey] || {};
  return getB2aStatements()[stepKey].map((statement) => ({
    ...statement,
    response: ((stepValues[statement.id] && stepValues[statement.id].response) || "").toString(),
    explanation: ((stepValues[statement.id] && stepValues[statement.id].explanation) || "").toString(),
    note: ((stepValues[statement.id] && stepValues[statement.id].note) || "").toString(),
  }));
}

function parseB2aStepForm(body, stepKey) {
  return getB2aStatements()[stepKey].map((statement) => {
    const prefix = `${stepKey}-${statement.id}`;
    const explanationNotApplicable = ((body && body[`${prefix}-explanation-na`]) || "").toString().trim();
    const explanationAlternative = ((body && body[`${prefix}-explanation-alt`]) || "").toString().trim();
    const response = ((body && body[`${prefix}-response`]) || "").toString();
    return {
      ...statement,
      stepKey,
      response,
      explanation:
        response === "not-applicable"
          ? explanationNotApplicable
          : response === "alternative-control"
          ? explanationAlternative
          : explanationNotApplicable || explanationAlternative,
      note: ((body && body[`${prefix}-note`]) || "").toString().trim(),
    };
  });
}

function validateB2aStepRows(rows) {
  const errors = [];
  rows.forEach((row) => {
    if (!row.response) {
      errors.push({
        field: `${row.stepKey}-${row.id}-yes`,
        text: `Select a response for: ${row.statement}`,
      });
    }
    if (
      (row.response === "not-applicable" || row.response === "alternative-control") &&
      !row.explanation
    ) {
      errors.push({
        field:
          row.response === "not-applicable"
            ? `${row.stepKey}-${row.id}-explanation-na`
            : `${row.stepKey}-${row.id}-explanation-alt`,
        text: `Explain why for: ${row.statement}`,
      });
    }
  });
  return errors;
}

function updateB2aJourneySection(journey, stepKey, rows) {
  const nextJourney = normaliseB2aJourney(journey);
  nextJourney[stepKey] = rows.reduce((acc, row) => {
    acc[row.id] = {
      response: row.response,
      explanation: row.explanation,
      note: row.note,
    };
    return acc;
  }, {});
  return nextJourney;
}

function flattenB2aResponses(journey) {
  const statements = getB2aStatements();
  return Object.entries(statements).flatMap(([stepKey, items]) =>
    items.map((item) => {
      const saved = (journey[stepKey] && journey[stepKey][item.id]) || {};
      return {
        statement: item.statement,
        response: (saved.response || "").toString(),
        rationale: (saved.explanation || saved.note || "").toString(),
        evidenceNote: (saved.note || "").toString(),
        captureMode: "signal",
      };
    })
  );
}

function buildB2aIgpResponseSummary(journey) {
  const flattened = flattenB2aResponses(journey);
  const answered = flattened.filter((item) => item.response);
  if (answered.length === 0) return "";
  const positive = answered.filter((item) => item.response === "yes").length;
  const negative = answered.filter((item) => item.response === "no").length;
  const alternative = answered.filter((item) => item.response === "alternative-control").length;
  const notApplicable = answered.filter((item) => item.response === "not-applicable").length;
  return `${positive} yes, ${negative} no, ${alternative} alternative control, ${notApplicable} not applicable`;
}

function buildB2aIndicativeJudgement(journey) {
  const summary = {
    judgement: "Partially achieved",
    strengths: [],
    weaknesses: [],
    uncertainties: [],
    reflections: [],
  };

  const sections = getB2aStatements();
  let score = 0;
  let criticalGaps = 0;

  Object.entries(sections).forEach(([stepKey, items]) => {
    items.forEach((item) => {
      const saved = (journey[stepKey] && journey[stepKey][item.id]) || {};
      const response = (saved.response || "").toString();
      if (!response) return;

      const positiveResponse =
        (stepKey === "achieved" && response === "yes") ||
        (stepKey === "notAchieved" && response === "no") ||
        (stepKey === "partiallyAchieved" && response === "yes");
      const negativeResponse =
        (stepKey === "achieved" && response === "no") ||
        (stepKey === "notAchieved" && response === "yes") ||
        (stepKey === "partiallyAchieved" && response === "no");

      if (positiveResponse) {
        score += stepKey === "partiallyAchieved" ? 1 : 2;
        summary.strengths.push(item.statement);
      } else if (negativeResponse) {
        score -= stepKey === "partiallyAchieved" ? 1 : 2;
        criticalGaps += stepKey === "partiallyAchieved" ? 0 : 1;
        summary.weaknesses.push(item.statement);
      } else if (response === "alternative-control") {
        score += 1;
        summary.uncertainties.push(`${item.statement} Alternative control noted.`);
      } else if (response === "not-applicable") {
        summary.uncertainties.push(`${item.statement} Marked not applicable.`);
      }
    });
  });

  if (criticalGaps >= 2 || score <= 1) {
    summary.judgement = "Not achieved";
  } else if (score >= 8 && criticalGaps === 0) {
    summary.judgement = "Achieved";
  }

  if (summary.strengths.length > 0) {
    summary.reflections.push("Some identity, authentication or access controls appear to be in place.");
  }
  if (summary.weaknesses.length > 0) {
    summary.reflections.push("There may still be gaps in access control or authentication practice.");
  }
  if (summary.uncertainties.length > 0) {
    summary.reflections.push("Some areas may need clarification, alternative controls or further evidence.");
  }

  return summary;
}

function syncB2aOutcomeData(assessment, systemId, saved) {
  const journey = normaliseB2aJourney(saved.b2aJourney);
  const next = {
    ...saved,
    b2aJourney: journey,
    igpAssessments: flattenB2aResponses(journey),
    igpResponse: buildB2aIgpResponseSummary(journey),
    updatedAt: new Date().toISOString(),
  };
  setBCOutcome(assessment, systemId, B2A_OUTCOME_ID, next);
  assessment.updatedAt = next.updatedAt;
  invalidateRoundTwoSectionCompletion(assessment, "bc");
  updateRoundTwoCollaborationDraftState(assessment, null);
  return next;
}

function buildB2aStepRoute(stepKey, systemId) {
  if (stepKey === "notAchieved") return buildB2aStepPath(systemId, "not-achieved");
  if (stepKey === "partiallyAchieved") return buildB2aStepPath(systemId, "partially-achieved");
  return buildB2aStepPath(systemId, stepKey);
}

function isB2aReviewReturn(req) {
  return ((req && req.query && req.query.return) || "").toString() === "review";
}

function withB2aReviewReturn(href, req) {
  if (!isB2aReviewReturn(req)) return href;
  return `${href}?return=review`;
}

function renderB2aIgpStep(req, res, options) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, outcome, saved, bc } = routeContext;
  const journey = normaliseB2aJourney(saved.b2aJourney);
  const returnToReview = isB2aReviewReturn(req);

  return res.render("pages/flow/b2a-igp-page", {
    pageTitle: options.pageTitle,
    assessment,
    context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: null }),
    outcome,
    backHref: returnToReview ? buildB2aStepPath(system.id, "review") : options.backHrefBuilder(system.id),
    formAction: withB2aReviewReturn(buildB2aStepRoute(options.stepKey, system.id), req),
    nextLabel: "Continue",
    page: {
      heading: options.heading,
      intro: options.intro,
      pageHint: options.pageHint || "",
      guidanceSummary: options.guidanceSummary,
      guidanceBody: options.guidanceBody,
      stepKey: options.stepKey,
      rows: getB2aStepForm(journey, options.stepKey),
    },
    error: null,
  });
}

function handleB2aIgpStepPost(req, res, options) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, outcome, saved, bc } = routeContext;
  const rows = parseB2aStepForm(req.body, options.stepKey);
  const errors = validateB2aStepRows(rows);

  if (errors.length > 0) {
    const returnToReview = isB2aReviewReturn(req);
    return res.render("pages/flow/b2a-igp-page", {
      pageTitle: options.pageTitle,
      assessment,
      context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: null }),
      outcome,
      backHref: returnToReview ? buildB2aStepPath(system.id, "review") : options.backHrefBuilder(system.id),
      formAction: withB2aReviewReturn(buildB2aStepRoute(options.stepKey, system.id), req),
      nextLabel: "Continue",
      page: {
        heading: options.heading,
        intro: options.intro,
        pageHint: options.pageHint || "",
        guidanceSummary: options.guidanceSummary,
        guidanceBody: options.guidanceBody,
        stepKey: options.stepKey,
        rows,
      },
      error: { items: errors },
    });
  }

  const journey = updateB2aJourneySection(saved.b2aJourney, options.stepKey, rows);
  syncB2aOutcomeData(assessment, system.id, {
    ...saved,
    b2aJourney: journey,
    status: "in_progress",
  });

  return res.redirect(options.nextHrefBuilder(system.id));
}

function renderB2aFinalJudgement(req, res, error = null, values = null) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, outcome, saved, bc } = routeContext;
  const journey = normaliseB2aJourney(saved.b2aJourney);
  const summary = journey.indicativeSummary || buildB2aIndicativeJudgement(journey);
  const returnToReview = isB2aReviewReturn(req);

  return res.render("pages/flow/b2a-final-judgement", {
    pageTitle: "Final contributing outcome judgement",
    assessment,
    context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: null }),
    outcome,
    backHref: returnToReview ? buildB2aStepPath(system.id, "review") : buildB2aStepPath(system.id, "indicative-judgement"),
    formAction: withB2aReviewReturn(buildB2aStepPath(system.id, "final-judgement"), req),
    summary,
    form: {
      judgement: values ? values.judgement : (saved.judgement || ""),
      rationale: values ? values.rationale : (saved.rationale || ""),
    },
    error,
  });
}

function handleB2aFinalJudgementPost(req, res) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, saved } = routeContext;
  const judgement = ((req.body && req.body.b2aFinalJudgement) || "").toString();
  const rationale = ((req.body && req.body.b2aRationale) || "").toString().trim();

  const errorItems = [];
  if (!judgement) errorItems.push({ field: "b2aFinalJudgement", text: "Select the final contributing outcome judgement." });
  if (!rationale) errorItems.push({ field: "b2aRationale", text: "Enter the rationale for this contributing outcome judgement." });

  if (errorItems.length) {
    return renderB2aFinalJudgement(req, res, { items: errorItems }, { judgement, rationale });
  }

  syncB2aOutcomeData(assessment, system.id, {
    ...saved,
    judgement,
    rationale,
    status: "in_progress",
  });

  return res.redirect(buildB2aStepPath(system.id, "evidence"));
}

function renderB2aRationale(req, res, error = null, values = null) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, outcome, saved, bc } = routeContext;
  const returnToReview = isB2aReviewReturn(req);

  return res.render("pages/flow/b2a-rationale", {
    pageTitle: "Contributing outcome rationale",
    assessment,
    context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: null }),
    outcome,
    backHref: returnToReview ? buildB2aStepPath(system.id, "review") : buildB2aStepPath(system.id, "final-judgement"),
    formAction: withB2aReviewReturn(buildB2aStepPath(system.id, "rationale"), req),
    form: {
      rationale: values ? values.rationale : (saved.rationale || ""),
    },
    error,
  });
}

function handleB2aRationalePost(req, res) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, saved } = routeContext;
  const rationale = ((req.body && req.body.b2aRationale) || "").toString().trim();

  if (!rationale) {
    return renderB2aRationale(
      req,
      res,
      { items: [{ field: "b2aRationale", text: "Enter the rationale for this contributing outcome judgement." }] },
      { rationale }
    );
  }

  syncB2aOutcomeData(assessment, system.id, {
    ...saved,
    rationale,
    status: "in_progress",
  });

  return res.redirect(buildB2aStepPath(system.id, "evidence"));
}

function getB2aEvidenceRows(savedRefs) {
  const refs = Array.isArray(savedRefs) ? savedRefs.slice(0, B2A_MAX_EVIDENCE_ROWS) : [];
  while (refs.length < 1) {
    refs.push({ title: "", link: "", description: "" });
  }
  return refs.map((item) => ({
    title: (item.title || "").toString(),
    link: (item.link || "").toString(),
    description: (item.description || "").toString(),
  }));
}

function parseB2aEvidenceRows(body) {
  const rawCount = Number((body && body.b2aEvidenceRowCount) || 1);
  const rowCount = Math.max(1, Math.min(B2A_MAX_EVIDENCE_ROWS, Number.isNaN(rawCount) ? 1 : rawCount));
  return Array.from({ length: rowCount }, (_, offset) => {
    const index = offset + 1;
    return {
    title: ((body && body[`b2aEvidenceTitle-${index}`]) || "").toString().trim(),
    link: ((body && body[`b2aEvidenceLink-${index}`]) || "").toString().trim(),
    description: ((body && body[`b2aEvidenceNote-${index}`]) || "").toString().trim(),
    };
  });
}

function validateB2aEvidenceRows(rows) {
  const errors = [];
  const populated = rows
    .map((row, index) => ({ ...row, rowNumber: index + 1 }))
    .filter((row) => row.title || row.link || row.description);
  if (populated.length === 0) {
    errors.push({ field: "b2aEvidenceTitle-1", text: "Add at least one evidence reference for this outcome." });
    return errors;
  }

  populated.forEach((row) => {
    const rowNumber = row.rowNumber;
    if (!row.title) {
      errors.push({
        field: `b2aEvidenceTitle-${rowNumber}`,
        text: `Enter an evidence title or reference for item ${rowNumber}.`,
      });
    }
    if (!row.link) {
      errors.push({
        field: `b2aEvidenceLink-${rowNumber}`,
        text: `Enter a link or identifier for item ${rowNumber}.`,
      });
    }
  });
  return errors;
}

function renderB2aEvidence(req, res, error = null, values = null) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, outcome, saved, bc } = routeContext;
  const returnToReview = isB2aReviewReturn(req);

  return res.render("pages/flow/b2a-evidence", {
    pageTitle: "Evidence references",
    assessment,
    context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: null }),
    outcome,
    backHref: returnToReview ? buildB2aStepPath(system.id, "review") : buildB2aStepPath(system.id, "final-judgement"),
    formAction: withB2aReviewReturn(buildB2aStepPath(system.id, "evidence"), req),
    evidenceRows: values || getB2aEvidenceRows(saved.evidenceRefs),
    error,
  });
}

function buildB2aIgpProgressSummary(journey) {
  const sections = ["achieved", "notAchieved", "partiallyAchieved"];
  const rows = sections.flatMap((sectionKey) => getB2aStepForm(normaliseB2aJourney(journey), sectionKey));
  const completed = rows.filter((row) => row.response).length;
  return {
    completed,
    total: rows.length,
  };
}

function countB2aExplainedResponses(journey) {
  const rows = flattenB2aResponses(normaliseB2aJourney(journey));
  const responsesNeedingExplanation = rows.filter(
    (row) => row.response === "not-applicable" || row.response === "alternative-control"
  );
  const explained = responsesNeedingExplanation.filter((row) => (row.rationale || "").trim()).length;
  return {
    explained,
    total: responsesNeedingExplanation.length,
  };
}

function buildB2aRationalePreview(rationale) {
  const text = (rationale || "").toString().trim();
  if (!text) return "Not added";
  if (text.length <= 180) return text;
  return `${text.slice(0, 177).trim()}...`;
}

function renderB2aReviewBeforeAssurance(req, res, error = null, values = null) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, outcome, saved, bc } = routeContext;
  const journey = normaliseB2aJourney(saved.b2aJourney);
  const evidenceRefs = Array.isArray(saved.evidenceRefs) ? saved.evidenceRefs : [];
  const igpProgress = buildB2aIgpProgressSummary(journey);
  const explanationCount = countB2aExplainedResponses(journey);

  return res.render("pages/flow/b2a-review-before-assurance", {
    pageTitle: "Review this outcome before internal review",
    assessment,
    context: buildRoundTwoOutcomeContext({ lens: "bc", tree: bc, outcome, system, nextOutcomeId: null }),
    outcome,
    backHref: buildB2aStepPath(system.id, "evidence"),
    formAction: buildB2aStepPath(system.id, "review"),
    reviewSummary: {
      judgement: saved.judgement || "Not set",
      rationalePreview: buildB2aRationalePreview(saved.rationale),
      evidenceCount: evidenceRefs.length,
      igpResponses: `${igpProgress.completed} of ${igpProgress.total} answered`,
      explainedResponses:
        explanationCount.total > 0
          ? `${explanationCount.explained} of ${explanationCount.total} explained`
          : "None needed",
    },
    form: {
      readinessChecks: values ? values.readinessChecks : [],
      declaration: values ? values.declaration : Boolean(journey.reviewDeclaration),
    },
    error,
    editLinks: {
      igp: `${buildB2aStepPath(system.id, "achieved")}?return=review`,
      judgement: `${buildB2aStepPath(system.id, "final-judgement")}?return=review`,
      rationale: `${buildB2aStepPath(system.id, "final-judgement")}?return=review`,
      evidence: `${buildB2aStepPath(system.id, "evidence")}?return=review`,
    },
  });
}

function handleB2aReviewBeforeAssurancePost(req, res) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, saved } = routeContext;
  const declarationValues = coerceArray(
    (req.body && req.body.b2aReviewDeclaration) ||
      (req.session && req.session.data && req.session.data.b2aReviewDeclaration)
  ).map((value) => value.toString().trim());
  const declaration = declarationValues.includes("yes") || declarationValues.includes("true");
  const readinessChecks = coerceArray(
    (req.body && req.body.b2aReadinessChecks) ||
      (req.session && req.session.data && req.session.data.b2aReadinessChecks)
  );

  if (!declaration) {
    return renderB2aReviewBeforeAssurance(
      req,
      res,
      { items: [{ field: "b2aReviewDeclaration", text: "Confirm that this outcome is ready for internal review." }] },
      { declaration, readinessChecks }
    );
  }

  syncB2aOutcomeData(assessment, system.id, {
    ...saved,
    b2aJourney: {
      ...normaliseB2aJourney(saved.b2aJourney),
      reviewDeclaration: true,
    },
    status: "ready_for_internal_review",
  });

  return res.redirect(buildB2aStepPath(system.id, "ready"));
}

function handleB2aEvidencePost(req, res) {
  const routeContext = getB2aRouteContext(req, res);
  if (!routeContext) return;
  const { assessment, system, saved } = routeContext;
  const evidenceRows = parseB2aEvidenceRows(req.body);
  const action = ((req.body && req.body.action) || "").toString();

  if (action === "addEvidence" && evidenceRows.length < B2A_MAX_EVIDENCE_ROWS) {
    return renderB2aEvidence(req, res, null, evidenceRows.concat([{ title: "", link: "", description: "" }]));
  }

  if (action.startsWith("removeEvidence:")) {
    const index = Number(action.split(":")[1]) - 1;
    const nextRows = evidenceRows.filter((_, rowIndex) => rowIndex !== index);
    return renderB2aEvidence(req, res, null, nextRows.length > 0 ? nextRows : [{ title: "", link: "", description: "" }]);
  }

  const errors = validateB2aEvidenceRows(evidenceRows);

  if (errors.length > 0) {
    return renderB2aEvidence(req, res, { items: errors }, evidenceRows);
  }

  const cleanedEvidence = evidenceRows.filter((row) => row.title || row.link || row.description);
  syncB2aOutcomeData(assessment, system.id, {
    ...saved,
    evidenceRefs: cleanedEvidence,
    b2aJourney: {
      ...normaliseB2aJourney(saved.b2aJourney),
      reviewDeclaration: false,
    },
    status: "in_progress",
  });

  return res.redirect(buildB2aStepPath(system.id, "review"));
}

function buildRoundTwoOutcomeProgressText(tree, outcome, options = {}) {
  const items = getPrototypeOutcomeRows(tree || {});
  if (!outcome || items.length === 0) return "";
  const index = items.findIndex((item) => item.id === outcome.id);
  if (index < 0) return "";
  const current = index + 1;
  const total = items.length;
  if (options.systemName) {
    return `Outcome ${current} of ${total} for ${options.systemName}`;
  }
  return `Outcome ${current} of ${total}`;
}

function formatB2aStatusLabel(value) {
  const map = {
    not_started: "Not started",
    in_progress: "In progress",
    blocked: "Blocked",
    ready_for_internal_review: "Ready for internal review",
    internally_reviewed: "Internally reviewed",
    complete: "Complete",
  };
  return map[value] || "Not started";
}

function getRoundTwoJudgementOptions() {
  return [
    { value: "Achieved", text: "Achieved" },
    { value: "Partially achieved", text: "Partially achieved" },
    { value: "Not achieved", text: "Not achieved" },
  ];
}

function usesCompactCafJudgementPage({ lens, outcome }) {
  return lens === "ad" && outcome && outcome.id === "A1a";
}

function getRoundTwoMaturityOptions() {
  return [
    { value: "Not in place", text: "Not in place" },
    { value: "Partially in place", text: "Partially in place" },
    { value: "Mostly in place", text: "Mostly in place" },
    { value: "Fully in place", text: "Fully in place" },
  ];
}

function getRoundTwoConfidenceOptions() {
  return [
    { value: "Low", text: "Low" },
    { value: "Medium", text: "Medium" },
    { value: "High", text: "High" },
  ];
}

function getOutcomeTargetLevel(outcome) {
  if (!outcome) return "Achieved";
  return profileTargets[outcome.id] || "Achieved";
}

function getPrototypeIgpStatements(outcome) {
  const byOutcome = {
    A1a: [
      {
        group: "notAchieved",
        groupLabel: "Signals from indicators of good practice",
        captureMode: "signal",
        statement:
          "Security of network and information systems related to the operation of essential functions is not discussed or reported on regularly at board level.",
      },
      {
        group: "notAchieved",
        groupLabel: "Signals from indicators of good practice",
        captureMode: "signal",
        statement:
          "Board-level discussions on security are based on partial or out-of-date information, without expert guidance.",
      },
      {
        group: "achieved",
        groupLabel: "Signals from indicators of good practice",
        captureMode: "signal",
        statement:
          "There is a board-level individual with overall accountability for security of network and information systems.",
      },
      {
        group: "achieved",
        groupLabel: "Signals from indicators of good practice",
        captureMode: "signal",
        statement:
          "Direction set at board level is translated into effective organisational practices.",
      },
      {
        group: "achieved",
        groupLabel: "Signals from indicators of good practice",
        captureMode: "signal",
        statement:
          "Security is recognised as an important enabler for resilience of essential functions.",
      },
    ],
    B1a: [
      {
        group: "standard",
        groupLabel: "Indicators of good practice",
        statement: "Security policies and procedures exist for this critical system.",
      },
      {
        group: "standard",
        groupLabel: "Indicators of good practice",
        statement: "Those policies and procedures are kept up to date.",
      },
      {
        group: "standard",
        groupLabel: "Indicators of good practice",
        statement:
          "People supporting this system understand how the policies apply in practice.",
      },
    ],
    C1b: [
      {
        group: "standard",
        groupLabel: "Indicators of good practice",
        statement: "Monitoring is in place to detect security events affecting this system.",
      },
      {
        group: "standard",
        groupLabel: "Indicators of good practice",
        statement: "Alerts are reviewed and acted on in a timely way.",
      },
      {
        group: "standard",
        groupLabel: "Indicators of good practice",
        statement:
          "Coverage includes the most important integrations and access points.",
      },
    ],
  };

  if (outcome && byOutcome[outcome.id]) return byOutcome[outcome.id];

  const code = outcome && outcome.code ? String(outcome.code).charAt(0) : "";
  if (code === "A" || code === "D") {
    return [
      {
        group: "standard",
        groupLabel: "Indicators of good practice",
        statement: "Roles, policies or plans are defined and understood.",
      },
      {
        group: "standard",
        groupLabel: "Indicators of good practice",
        statement: "This outcome is applied consistently across the council.",
      },
      {
        group: "standard",
        groupLabel: "Indicators of good practice",
        statement: "Weaknesses are reviewed and acted on over time.",
      },
    ];
  }

  return [
    {
      group: "standard",
      groupLabel: "Indicators of good practice",
      statement: "Controls are in place for this critical system.",
    },
    {
      group: "standard",
      groupLabel: "Indicators of good practice",
      statement: "Those controls are used consistently in practice.",
    },
    {
      group: "standard",
      groupLabel: "Indicators of good practice",
      statement: "Gaps are identified and addressed when they are found.",
    },
  ];
}

function buildIgpAssessmentForm(saved, outcome) {
  const existing = Array.isArray(saved) ? saved : [];
  return getPrototypeIgpStatements(outcome).map((statement, idx) => {
    const prior = existing[idx] || {};
    const response = (prior.response || "").toString();
    const maturity = (prior.maturity || mapLegacyIgpResponseToMaturity(response) || "").toString();
    return {
      id: `igp-${idx + 1}`,
      statement: statement.statement,
      group: statement.group || "standard",
      groupLabel: statement.groupLabel || "Indicators of good practice",
      captureMode: statement.captureMode || "statement",
      guidance: buildIgpStatementGuidance(statement),
      maturity,
      signalResponse: mapMaturityToSignalResponse(maturity),
      rationale: (prior.rationale || "").toString(),
      evidenceNote: (prior.evidenceNote || "").toString(),
      confidence: (prior.confidence || "").toString(),
    };
  });
}

function buildIgpStatementGuidance(statement) {
  if (statement && statement.captureMode === "signal") {
    return "Record how far this signal reflects the current position, based on the best evidence available now.";
  }
  const group = statement && statement.group ? statement.group : "standard";
  if (group === "achieved") {
    return "Judge how consistently this expected practice is in place today, using current evidence rather than intent.";
  }
  if (group === "notAchieved") {
    return "Judge how far this risk or weakness reflects the current position today, using current evidence rather than historic gaps.";
  }
  return "Judge how consistently this statement is in place today, using current evidence rather than planned activity.";
}

function mapLegacyIgpResponseToMaturity(response) {
  if (response === "Yes") return "Fully in place";
  if (response === "Alternative control in place") return "Mostly in place";
  if (response === "Not applicable") return "Partially in place";
  if (response === "No") return "Not in place";
  return "";
}

function mapSignalResponseToMaturity(response) {
  if (response === "Fully reflects") return "Fully in place";
  if (response === "Partially reflects") return "Mostly in place";
  if (response === "Does not reflect") return "Not in place";
  return "";
}

function mapMaturityToSignalResponse(maturity) {
  if (maturity === "Fully in place") return "Fully reflects";
  if (maturity === "Mostly in place" || maturity === "Partially in place") return "Partially reflects";
  if (maturity === "Not in place") return "Does not reflect";
  return "";
}

function hasStartedIgpAssessment(item) {
  if (!item) return false;
  return Boolean(
    (item.maturity && item.maturity.toString().trim()) ||
    (item.rationale && item.rationale.toString().trim()) ||
    (item.evidenceNote && item.evidenceNote.toString().trim()) ||
    (item.confidence && item.confidence.toString().trim())
  );
}

function hasCompletedIgpResponse(item) {
  if (item && item.captureMode === "signal") {
    return Boolean(item.signalResponse && item.signalResponse.toString().trim());
  }
  return Boolean(
    item &&
    item.maturity &&
    item.maturity.toString().trim() &&
    item.rationale &&
    item.rationale.toString().trim() &&
    item.evidenceNote &&
    item.evidenceNote.toString().trim() &&
    item.confidence &&
    item.confidence.toString().trim()
  );
}

function normaliseIgpAssessments(raw, existing, outcome) {
  const base = buildIgpAssessmentForm(existing, outcome);
  const incomingByIndex = {};

  if (Array.isArray(raw)) {
    raw.forEach((value, idx) => {
      incomingByIndex[idx] = value;
    });
  } else if (raw && typeof raw === "object") {
    Object.keys(raw).forEach((key) => {
      incomingByIndex[Number(key)] = raw[key];
    });
  }

  return base.map((item, idx) => {
    const incoming = incomingByIndex[idx] || {};
    return {
      id: item.id,
      statement: item.statement,
      group: item.group,
      groupLabel: item.groupLabel,
      captureMode: item.captureMode,
      guidance: item.guidance,
      maturity: (
        mapSignalResponseToMaturity(((incoming && incoming.signalResponse) || "").toString()) ||
        ((incoming && incoming.maturity) || item.maturity || "").toString()
      ),
      signalResponse: (
        (incoming && incoming.signalResponse) ||
        mapMaturityToSignalResponse(((incoming && incoming.maturity) || item.maturity || "").toString()) ||
        item.signalResponse ||
        ""
      ).toString(),
      rationale: ((incoming && incoming.rationale) || item.rationale || "").toString(),
      evidenceNote: ((incoming && incoming.evidenceNote) || item.evidenceNote || "").toString(),
      confidence: ((incoming && incoming.confidence) || item.confidence || "").toString(),
    };
  });
}

function remapSingleStatementSubmission(raw, statementIndex) {
  if (!raw || statementIndex < 0) return raw;

  if (Array.isArray(raw)) {
    if (raw[statementIndex]) return raw;
    const firstFilledIndex = raw.findIndex((item) => item && typeof item === "object");
    if (firstFilledIndex >= 0) {
      const remapped = [];
      remapped[statementIndex] = raw[firstFilledIndex];
      return remapped;
    }
    return raw;
  }

  if (typeof raw === "object") {
    if (raw[statementIndex] || raw[String(statementIndex)]) return raw;
    const keys = Object.keys(raw);
    if (keys.length === 1) {
      return { [statementIndex]: raw[keys[0]] };
    }
  }

  return raw;
}

function buildIgpJudgementHint(igpAssessments) {
  const items = Array.isArray(igpAssessments) ? igpAssessments : [];
  if (!items.length) return null;
  const signalMode = items.some((item) => item.captureMode === "signal");

  const usesCriteriaSelection = items.some(
    (item) => item.group === "achieved" || item.group === "notAchieved"
  );

  const allAnswered = items.every(hasCompletedIgpResponse);
  const answeredItems = items.filter(hasCompletedIgpResponse);
  const hasResponses = answeredItems.length > 0;
  if (!hasResponses) return null;
  if (!allAnswered) {
    return {
      state: "incomplete",
      title: signalMode ? "Complete the signals first." : "Complete the statement review first.",
      text: signalMode
        ? "Record how each signal reflects the current position before finalising the judgement."
        : "Answer every statement to see a reliable steer on the overall judgement.",
    };
  }

  if (usesCriteriaSelection) {
    const achieved = items.filter((item) => item.group === "achieved");
    const notAchieved = items.filter((item) => item.group === "notAchieved");

    const achievedAllYes =
      achieved.length > 0 &&
      achieved.every((item) => item.maturity === "Fully in place");
    const achievedHasGap = achieved.some((item) => item.maturity === "Not in place");
    const negativeTriggered = notAchieved.some(
      (item) => item.maturity === "Mostly in place" || item.maturity === "Fully in place"
    );
    const negativeMixed = notAchieved.some(
      (item) =>
        item.maturity === "Partially in place"
    );

    if (achievedAllYes && !negativeTriggered && !negativeMixed) {
      return {
        state: "met",
        title: signalMode ? "The signals support an achieved judgement." : "This pattern suggests the outcome may be met.",
        text: signalMode
          ? "Positive signals reflect the current position and the negative signals do not. Use your evidence and judgement before deciding the outcome."
          : "All achieved statements are in place and none of the not achieved statements appear to apply. You should still use your judgement and supporting evidence.",
      };
    }

    if (achievedHasGap || negativeTriggered) {
      return {
        state: "not-met",
        title: signalMode ? "The signals point away from achieved." : "This pattern suggests the outcome may not be met.",
        text: signalMode
          ? "One or more negative signals still reflects the current position, or a positive signal does not. Review the evidence before finalising the judgement."
          : "One or more achieved statements are not in place, or one or more not achieved statements still appears to apply. Review the evidence before finalising your judgement.",
      };
    }

    return {
      state: "mixed",
      title: signalMode ? "The signals are mixed." : "The picture is mixed.",
      text: signalMode
        ? "The signals do not point clearly to a single judgement. Use the synthesis and rationale to explain how you reached your decision."
        : "Some statements are marked as not applicable or use an alternative control. Use your rationale to explain the current position and why you selected the overall judgement.",
    };
  }

  const anyNo = items.some((item) => item.maturity === "Not in place");
  const anyAlternative = items.some((item) => item.maturity === "Mostly in place");
  const anyNotApplicable = items.some((item) => item.maturity === "Partially in place");
  const allYes = items.length > 0 && items.every((item) => item.maturity === "Fully in place");

  if (allYes) {
    return {
      state: "met",
      title: "This pattern suggests the outcome may be met.",
      text: "All statements are relevant and in place. You should still use your judgement and supporting evidence.",
    };
  }

  if (anyNo) {
    return {
      state: "not-met",
      title: "This pattern suggests the outcome may not be met.",
      text: "One or more statements are not in place. Review the evidence before finalising your judgement.",
    };
  }

  return {
    state: "mixed",
    title: "The picture is mixed.",
    text: anyAlternative || anyNotApplicable
      ? "Some statements use alternative controls or are marked not applicable. Use your rationale to explain the current position and why you selected the overall judgement."
      : "The statements do not give a simple result. Use your rationale to explain the current position and why you selected the overall judgement.",
  };
}

function buildIgpSynthesis(igpAssessments) {
  const items = Array.isArray(igpAssessments) ? igpAssessments : [];
  return {
    strengths: items.filter((item) => item.maturity === "Fully in place").length,
    partials: items.filter((item) => item.maturity === "Mostly in place").length,
    notApplicable: items.filter((item) => item.maturity === "Partially in place").length,
    criticalGaps: items.filter((item) => item.maturity === "Not in place").length,
  };
}

function buildSignalSummary(igpAssessments) {
  const items = Array.isArray(igpAssessments) ? igpAssessments : [];
  return {
    fullyReflects: items.filter((item) => item.signalResponse === "Fully reflects").length,
    partiallyReflects: items.filter((item) => item.signalResponse === "Partially reflects").length,
    doesNotReflect: items.filter((item) => item.signalResponse === "Does not reflect").length,
  };
}

function findFirstIncompleteIgpIndex(igpAssessments) {
  const items = Array.isArray(igpAssessments) ? igpAssessments : [];
  const index = items.findIndex((item) => !hasCompletedIgpResponse(item));
  return index >= 0 ? index : 0;
}

function buildRoundTwoOutcomeJudgement(igpAssessments) {
  const items = Array.isArray(igpAssessments) ? igpAssessments : [];
  if (!items.length || items.some((item) => !hasCompletedIgpResponse(item))) return "";
  const hint = buildIgpJudgementHint(items);
  if (hint && hint.state === "met") return "Achieved";
  if (hint && hint.state === "not-met") return "Not achieved";
  return "Partially achieved";
}

function buildRoundTwoOutcomeSummary(igpAssessments) {
  const items = Array.isArray(igpAssessments) ? igpAssessments : [];
  const synthesis = buildIgpSynthesis(items);
  const total = items.length;
  if (!total) return "";
  if (items.some((item) => item.captureMode === "signal")) {
    const signalSummary = buildSignalSummary(items);
    return [
      `${signalSummary.fullyReflects} fully reflect`,
      `${signalSummary.partiallyReflects} partially reflect`,
      `${signalSummary.doesNotReflect} do not reflect`,
    ].join(", ");
  }
  return [
    `${synthesis.strengths} fully in place`,
    `${synthesis.partials} mostly in place`,
    `${synthesis.notApplicable} partially in place`,
    `${synthesis.criticalGaps} not in place`,
  ].join(", ");
}

function isJudgementMismatch(judgement, igpJudgementHint) {
  if (!judgement || !igpJudgementHint) return false;
  if (igpJudgementHint.state === "met") {
    return judgement !== "Achieved";
  }
  if (igpJudgementHint.state === "not-met") {
    return judgement === "Achieved";
  }
  return false;
}

function isAssurer(req) {
  const user = req.session && req.session.data ? req.session.data.user : null;
  return Boolean(user && user.role === "assurer");
}

function buildIipGaps(assessment) {
  const gaps = [];
  const gapJudgements = new Set(["Partially achieved", "Not achieved"]);
  const { ad, bc } = getOutcomesForVersion(assessment);
  const adOutcomes = flattenOutcomes(ad);
  const bcOutcomes = flattenOutcomes(bc);
  const adLookup = new Map(adOutcomes.map((o) => [o.id, o]));
  const bcLookup = new Map(bcOutcomes.map((o) => [o.id, o]));

  const adData = assessment.selfAssess && assessment.selfAssess.ad ? assessment.selfAssess.ad : {};
  for (const [outcomeId, data] of Object.entries(adData)) {
    if (!data || !gapJudgements.has(data.judgement)) continue;
    const outcome = adLookup.get(outcomeId);
    if (!outcome) continue;
    gaps.push({
      id: `ad:${outcomeId}`,
      sourceType: "ad",
      sourceId: outcomeId,
      outcomeCode: outcome.code,
      outcomeTitle: outcome.title,
      systemName: "",
      judgement: data.judgement,
      title: `Improve ${outcome.title}`,
    });
  }

  const scope = assessment.scope || {};
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const bcData = assessment.selfAssess && assessment.selfAssess.bc ? assessment.selfAssess.bc : {};
  for (const system of systems) {
    const systemData = bcData[system.id] || {};
    const outcomes = systemData.outcomes || {};
    for (const [outcomeId, data] of Object.entries(outcomes)) {
      if (!data || !gapJudgements.has(data.judgement)) continue;
      const outcome = bcLookup.get(outcomeId);
      if (!outcome) continue;
      gaps.push({
        id: `bc:${system.id}:${outcomeId}`,
        sourceType: "bc",
        sourceId: `${system.id}:${outcomeId}`,
        outcomeCode: outcome.code,
        outcomeTitle: outcome.title,
        systemName: system.name,
        judgement: data.judgement,
        title: `Improve ${outcome.title} for ${system.name}`,
      });
    }
  }

  return gaps;
}

function buildIipActionsFromGaps(gaps, selectedIds) {
  const selected = new Set(selectedIds);
  return gaps
    .filter((gap) => selected.has(gap.id))
    .map((gap) => ({
      id: `iip-${gap.id}-${Date.now()}`,
      sourceType: gap.sourceType,
      sourceId: gap.sourceId,
      title: gap.title,
      priority: "medium",
      owner: "",
      dueDate: "",
      expectedEvidence: "",
      evidenceRef: "",
      checkInCadence: "",
      confirmed: false,
      status: "planned",
      gapMeta: {
        outcomeCode: gap.outcomeCode,
        outcomeTitle: gap.outcomeTitle,
        judgement: gap.judgement,
        systemName: gap.systemName,
      },
    }));
}

function normaliseIipActions(raw, existing) {
  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === "object") {
    items = Object.keys(raw)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((key) => raw[key]);
  }

  return items.map((item, idx) => {
    const base = existing[idx] || {};
    return {
      id: base.id,
      sourceType: base.sourceType,
      sourceId: base.sourceId,
      title: base.title,
      priority: (item.priority || base.priority || "").toString(),
      owner: (item.owner || base.owner || "").toString().trim(),
      dueDate: (item.dueDate || base.dueDate || "").toString().trim(),
      expectedEvidence: (item.expectedEvidence || base.expectedEvidence || "").toString().trim(),
      evidenceRef: (item.evidenceRef || base.evidenceRef || "").toString().trim(),
      checkInCadence: (item.checkInCadence || base.checkInCadence || "").toString(),
      keep: (item.keep || "yes").toString(),
      confirmed: base.confirmed || false,
      status: (item.status || base.status || "planned").toString(),
      lastUpdateAt: base.lastUpdateAt || "",
      lastUpdateNote: base.lastUpdateNote || "",
      gapMeta: base.gapMeta || {},
    };
  });
}

function ensureIipStage2Data(assessment) {
  if (!assessment.improvementPlan) assessment.improvementPlan = {};
  if (!assessment.improvementPlan.stage2) {
    assessment.improvementPlan.stage2 = {
      status: "not_started",
      timeline: {
        receivedStage1At: "",
        offlineDraftExpectedBy: "",
        lastUpdatedAt: "",
      },
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
      rework: {
        required: false,
        submittedAt: "",
        notes: "",
        completedAt: "",
      },
      mhclgSubmission: {
        submittedAt: "",
        submittedBy: "",
        reference: "",
        notes: "",
      },
    };
  }

  const stage2 = assessment.improvementPlan.stage2;
  const stage1 = assessment.assurance && assessment.assurance.stage1Report ? assessment.assurance.stage1Report : {};

  if (!stage2.timeline) {
    stage2.timeline = { receivedStage1At: "", offlineDraftExpectedBy: "", lastUpdatedAt: "" };
  }

  if (stage1.finalisedAt && !stage2.timeline.receivedStage1At) {
    stage2.timeline.receivedStage1At = stage1.finalisedAt;
    stage2.timeline.offlineDraftExpectedBy = addCalendarDays(stage1.finalisedAt, 10);
  }

  if (!Array.isArray(stage2.rows)) stage2.rows = [];
  if (stage2.rows.length === 0 && Array.isArray(stage1.items) && stage1.items.length > 0) {
    stage2.rows = buildStage2RowsFromStage1(assessment, stage1.items);
    stage2.status = "drafting_offline";
    stage2.timeline.lastUpdatedAt = new Date().toISOString();
  }
}

function buildStage2RowsFromStage1(assessment, items) {
  const { ad, bc } = getOutcomesForVersion(assessment);
  const adMap = new Map(flattenOutcomes(ad).map((o) => [o.id, o]));
  const bcMap = new Map(flattenOutcomes(bc).map((o) => [o.id, o]));

  return items.map((item, idx) => {
    const rawId = String(item.outcomeId || "");
    const isBC = rawId.includes(":");
    const [systemId, outcomeKey] = isBC ? rawId.split(":") : ["", rawId];
    const outcome = isBC ? bcMap.get(outcomeKey) : adMap.get(rawId);
    const systems = assessment.scope && Array.isArray(assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
    const system = isBC ? systems.find((s) => s.id === systemId) : null;

    return {
      id: `stage2-${idx + 1}-${Date.now().toString(36)}`,
      outcomeId: rawId,
      outcomeCode: outcome ? outcome.code : rawId,
      outcomeTitle: outcome ? outcome.title : "Contributing outcome",
      objective: outcome ? outcome.objective : "",
      systemName: system ? system.name : "",
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
    };
  });
}

function addCalendarDays(value, days) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + (Number(days) || 0));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildIipStage2Summary(assessment) {
  ensureIipStage2Data(assessment);
  const stage2 = assessment.improvementPlan.stage2;
  const rows = Array.isArray(stage2.rows) ? stage2.rows : [];
  const completeCount = rows.filter((r) => validateStage2Row(r).length === 0).length;
  const nextActionHref = getStage2NextActionHref(stage2, rows);
  return {
    status: stage2.status || "not_started",
    rowCount: rows.length,
    completeCount,
    expectedBy: stage2.timeline && stage2.timeline.offlineDraftExpectedBy ? stage2.timeline.offlineDraftExpectedBy : "",
    nextActionHref,
  };
}

function getStage2NextActionHref(stage2, rows) {
  if (!rows.length) return "/improvement-plan/stage-2";
  if (stage2.status === "rework_required") return "/improvement-plan/stage-2/rework";
  if (!rows.every((r) => r.ownerId && isValidIsoDate(r.ownerDueDate))) return "/improvement-plan/stage-2/setup";
  const incomplete = rows.find((r) => validateStage2Row(r).length > 0);
  if (incomplete) return `/improvement-plan/stage-2/rows/${incomplete.id}`;
  if (!stage2.internalApprovals || !stage2.internalApprovals.signedOffAt) return "/improvement-plan/stage-2/internal-sign-off";
  if (!stage2.assurerReview || !stage2.assurerReview.submittedAt) return "/improvement-plan/stage-2/submit-assurer";
  if (stage2.assurerReview.outcome === "accepted" && !stage2.mhclgSubmission.submittedAt) return "/improvement-plan/stage-2/submit-mhclg";
  return "/improvement-plan/stage-2/review";
}

function getIipContributors(assessment, currentUser) {
  const list = Array.isArray(assessment.selfAssessContributors) ? assessment.selfAssessContributors.slice() : [];
  if (currentUser && currentUser.id && !list.find((p) => p.id === currentUser.id)) {
    list.unshift({
      id: currentUser.id,
      name: currentUser.name || "CAF Lead",
      email: currentUser.email || "",
      role: "council",
    });
  }
  return list;
}

function getContributorNameById(contributors, userId) {
  const found = Array.isArray(contributors) ? contributors.find((c) => c.id === userId) : null;
  return found ? found.name : "";
}

function normaliseStage2SetupRows(raw, existingRows) {
  let rows = [];
  if (Array.isArray(raw)) {
    rows = raw;
  } else if (raw && typeof raw === "object") {
    rows = Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);
  }
  return existingRows.map((existing, idx) => {
    const incoming = rows[idx] || {};
    return {
      ...existing,
      ownerId: (incoming.ownerId || existing.ownerId || "").toString(),
      ownerDueDate: (incoming.ownerDueDate || existing.ownerDueDate || "").toString().trim(),
    };
  });
}

function findStage2Row(assessment, rowId) {
  if (!assessment || !assessment.improvementPlan || !assessment.improvementPlan.stage2) return null;
  const rows = Array.isArray(assessment.improvementPlan.stage2.rows) ? assessment.improvementPlan.stage2.rows : [];
  return rows.find((row) => String(row.id) === String(rowId)) || null;
}

function validateStage2Row(row) {
  const errors = [];
  if (!row.ownerId) errors.push({ field: "ownerId", text: "Select an owner." });
  if (!isValidIsoDate(row.ownerDueDate)) errors.push({ field: "ownerDueDate", text: "Enter a valid due date." });
  if (!row.ownershipRolesResponsible) errors.push({ field: "ownershipRolesResponsible", text: "Enter ownership or roles responsible." });
  if (!row.cost) errors.push({ field: "cost", text: "Enter cost." });
  if (!["high", "medium", "low"].includes((row.effort || "").toLowerCase())) errors.push({ field: "effort", text: "Select effort." });
  if (!["high", "medium", "low"].includes((row.complexity || "").toLowerCase())) errors.push({ field: "complexity", text: "Select complexity." });
  if (!row.implementationJustification) errors.push({ field: "implementationJustification", text: "Enter implementation justification." });
  if (!["high", "medium", "low", "no_action"].includes((row.implementationPriority || "").toLowerCase())) errors.push({ field: "implementationPriority", text: "Select implementation priority." });
  if (!isMonthYear(row.quarter1)) errors.push({ field: "quarter1", text: "Enter Quarter 1 as MM/YY." });
  if (!isMonthYear(row.quarter2)) errors.push({ field: "quarter2", text: "Enter Quarter 2 as MM/YY." });
  if (!isMonthYear(row.quarter3)) errors.push({ field: "quarter3", text: "Enter Quarter 3 as MM/YY." });
  if (!isMonthYear(row.quarter4)) errors.push({ field: "quarter4", text: "Enter Quarter 4 as MM/YY." });
  if (!isMonthYear(row.nextYearStarts)) errors.push({ field: "nextYearStarts", text: "Enter Next year start as MM/YY." });
  return errors;
}

function isMonthYear(value) {
  const str = (value || "").toString().trim();
  const match = /^(\d{2})\/(\d{2})$/.exec(str);
  if (!match) return false;
  const month = Number(match[1]);
  return month >= 1 && month <= 12;
}

function allStage2RowsComplete(rows) {
  return Array.isArray(rows) && rows.length > 0 && rows.every((row) => validateStage2Row(row).length === 0);
}

function clearStage2RowForm(req) {
  delete req.session.data.ownershipRolesResponsible;
  delete req.session.data.cost;
  delete req.session.data.effort;
  delete req.session.data.complexity;
  delete req.session.data.implementationJustification;
  delete req.session.data.implementationPriority;
  delete req.session.data.quarter1;
  delete req.session.data.quarter2;
  delete req.session.data.quarter3;
  delete req.session.data.quarter4;
  delete req.session.data.nextYearStarts;
}

function clearStage2SignOffForm(req) {
  delete req.session.data.stage2QualityAssurerName;
  delete req.session.data.stage2QualityAssurerDate;
  delete req.session.data.stage2ApproverName;
  delete req.session.data.stage2ApproverDate;
}

function isValidIsoDate(value) {
  if (!value || typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const date = new Date(y, m, d);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === y &&
    date.getMonth() === m &&
    date.getDate() === d
  );
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

function seedIipDemoGaps(assessment) {
  if (!assessment || assessment.improvementPlan.demoSeeded) return;

  assessment.selfAssess = assessment.selfAssess || { ad: {}, bc: {} };
  assessment.selfAssess.ad = assessment.selfAssess.ad || {};
  assessment.selfAssess.bc = assessment.selfAssess.bc || {};

  if (!assessment.selfAssess.ad["A1a"]) {
    assessment.selfAssess.ad["A1a"] = {
      igpResponse: "Board reporting exists but is inconsistent across directorates.",
      judgement: "Partially achieved",
      rationale: "Some directorates follow the agreed cadence; others do not.",
      evidenceRefs: [
        { title: "Board cyber tracker", type: "Board tracker", link: "https://intranet.west-marchshire.gov.uk/governance/board-tracker", description: "Tracker showing planned governance reviews and reporting." },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  const scope = assessment.scope || {};
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const systemId = systems.length > 0 ? systems[0].id : "sys-1";
  if (!assessment.selfAssess.bc[systemId]) {
    assessment.selfAssess.bc[systemId] = { outcomes: {} };
  }

  if (!assessment.selfAssess.bc[systemId].outcomes["B1a"]) {
    assessment.selfAssess.bc[systemId].outcomes["B1a"] = {
      igpResponse: "Documented protection policy exists, but coverage is still inconsistent.",
      judgement: "Partially achieved",
      rationale: "The core policy is in place, but supplier and operational coverage is incomplete.",
      evidenceRefs: [
        { title: "Service protection policy", type: "Policy", link: "https://intranet.west-marchshire.gov.uk/policies/service-protection", description: "Policy reference used during improvement plan drafting." },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  assessment.improvementPlan.demoSeeded = true;
  assessment.updatedAt = new Date().toISOString();
}

function getStage1GateNotice(req, labels) {
  const gate = Boolean(req.session.data.stage1Gate);
  if (!gate) return null;
  const returnTo = req.session.data.stage1ReturnTo || "";
  const targetLabel =
    returnTo === "ad"
      ? labels.stages.stage1Decision.options.stage3
      : labels.stages.stage1Decision.options.stage4;
  delete req.session.data.stage1Gate;
  return {
    title: "Complete this step first",
    text: `You chose ${targetLabel}. Finish this step and you will return to it.`,
  };
}

function getCouncilRolesReturnTo(req) {
  const requested = (req.query.returnTo || req.session.data.councilRolesReturnTo || "").toString().trim().toLowerCase();
  const value = requested === "journey" ? "journey" : "onboarding";
  req.session.data.councilRolesReturnTo = value;
  return value;
}

function getCouncilRolesReturnHref(returnTo) {
  return returnTo === "journey" ? "/assessments/current/journey" : "/onboarding";
}

function getCouncilRolesReturnText(returnTo) {
  return returnTo === "journey"
    ? "Return to annual assessment task list"
    : "Return to council onboarding and setup";
}

function getCouncilRolesSaveRedirect(returnTo) {
  return "/onboarding/scope";
}

function redirectIfScopeNotReady(req, res, assessment, target) {
  if (!assessment.prepare || !assessment.prepare.guidanceRead) {
    req.session.data.stage1Gate = true;
    return res.redirect("/prepare");
  }
  if (isRoundTwoRequest(req)) {
    if (!assessment.annualSetup || !assessment.annualSetup.completed) {
      req.session.data.selfAssessReturnTo = target;
      return res.redirect("/assessments/current/journey");
    }
    return false;
  }
  if (!assessment.selfAssessStart || !assessment.selfAssessStart.completed) {
    req.session.data.selfAssessReturnTo = target;
    return res.redirect("/assessments/current/start-self-assessment");
  }

  return false;
}

function clearOutcomeAction(req) {
  delete req.session.data.action;
}

function clearOutcomeForm(req) {
  delete req.session.data.action;
  delete req.session.data.igpAssessments;
  delete req.session.data.igpResponse;
  delete req.session.data.returnToCheckAnswers;
  delete req.session.data.judgement;
  delete req.session.data.mismatchReason;
  delete req.session.data.reuseDecision;
  delete req.session.data.rationale;
  delete req.session.data.qualityReviewedAt;
  delete req.session.data.approverReviewedAt;
  delete req.session.data.evidenceRefs;
}

function invalidateRoundTwoSectionCompletion(assessment, lens) {
  if (!assessment || !assessment.selfAssess) return;
  if (lens === "ad") {
    assessment.selfAssess.adReview = {
      completed: false,
      completedAt: "",
      completedBy: "",
    };
  }
  if (lens === "bc") {
    assessment.selfAssess.bcReview = {
      completed: false,
      completedAt: "",
      completedBy: "",
    };
  }
  if (assessment.selfAssessmentReview) {
    assessment.selfAssessmentReview = {
      completed: false,
      completedAt: "",
      completedBy: "",
    };
  }
}

function updateRoundTwoCollaborationDraftState(assessment, currentUser) {
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

  const actor = getCollaborationActor(currentUser);
  const nowIso = new Date().toISOString();
  const currentStatus = (assessment.collaborationWorkflow.status || "draft").toString();
  const nextStatus = currentStatus === "needs_changes" ? "needs_changes" : "draft";

  assessment.collaborationWorkflow = {
    ...assessment.collaborationWorkflow,
    status: nextStatus,
    submittedAt:
      currentStatus === "in_review" ||
      currentStatus === "ready_for_approval" ||
      currentStatus === "approved"
        ? ""
        : assessment.collaborationWorkflow.submittedAt,
    submittedBy:
      currentStatus === "in_review" ||
      currentStatus === "ready_for_approval" ||
      currentStatus === "approved"
        ? ""
        : assessment.collaborationWorkflow.submittedBy,
    reviewDecision:
      currentStatus === "in_review" ||
      currentStatus === "ready_for_approval" ||
      currentStatus === "approved"
        ? ""
        : assessment.collaborationWorkflow.reviewDecision,
    reviewNotes:
      currentStatus === "in_review" ||
      currentStatus === "ready_for_approval" ||
      currentStatus === "approved"
        ? ""
        : assessment.collaborationWorkflow.reviewNotes,
    reviewedAt:
      currentStatus === "ready_for_approval" || currentStatus === "approved"
        ? ""
        : assessment.collaborationWorkflow.reviewedAt,
    reviewedBy:
      currentStatus === "ready_for_approval" || currentStatus === "approved"
        ? ""
        : assessment.collaborationWorkflow.reviewedBy,
    approvedAt: currentStatus === "approved" ? "" : assessment.collaborationWorkflow.approvedAt,
    approvedBy: currentStatus === "approved" ? "" : assessment.collaborationWorkflow.approvedBy,
    lastEditedAt: nowIso,
    lastEditedBy: actor,
  };
}

function getCollaborationActor(user) {
  if (!user) return "Unknown user";
  const name = (user.name || "").toString().trim();
  const email = (user.email || "").toString().trim();
  if (name && email) return `${name} (${email})`;
  return name || email || "Unknown user";
}

function renderSelfAssessOutcome(res, { labels, assessment, outcome, context, form, error }) {
  if (context && context.roundTwo && form && Array.isArray(form.igpAssessments)) {
    form.igpJudgementHint = buildIgpJudgementHint(form.igpAssessments);
    if (context.cafJudgementPage) {
      form.signalSummary = buildSignalSummary(form.igpAssessments);
    }
  }
  if (context && context.roundTwo && form) {
    form.previousAssessment = buildPreviousAssessmentSummary(assessment, context, outcome);
    if (!form.reuseDecision && form.previousAssessment && form.previousAssessment.carriedForward) {
      const currentRow =
        context.lens === "bc"
          ? getBCOutcome(assessment, context.systemId || "", outcome.id)
          : ((assessment.selfAssess && assessment.selfAssess.ad && assessment.selfAssess.ad[outcome.id]) || {});
      form.reuseDecision = (currentRow.reuseDecision || "").toString();
    }
  }
  return res.render("pages/flow/self-assess-outcome", {
    pageTitle: context.heading,
    labels,
    assessment,
    context,
    outcome,
    form,
    error: error || null,
  });
}

function renderRoundTwoIgpStatement(res, {
  assessment,
  outcome,
  context,
  igpAssessments,
  statementIndex,
  postAction,
  checkAnswersHref,
  backHref,
  returnToCheckAnswers,
  error,
}) {
  const statement = igpAssessments[statementIndex];
  return res.render("pages/flow/self-assess-igp-statement", {
    pageTitle: context.heading,
    assessment,
    outcome,
    context,
    form: {
      targetLevel: getOutcomeTargetLevel(outcome),
      totalStatements: igpAssessments.length,
      currentStatementNumber: statementIndex + 1,
      statement,
      maturityOptions: getRoundTwoMaturityOptions(),
      confidenceOptions: getRoundTwoConfidenceOptions(),
      statementSummary: buildRoundTwoOutcomeSummary(igpAssessments),
    },
    postAction,
    checkAnswersHref,
    backHref,
    returnToCheckAnswers: Boolean(returnToCheckAnswers),
    error: error || null,
  });
}

function renderRoundTwoIgpCheckAnswers(res, {
  assessment,
  outcome,
  context,
  igpAssessments,
  formAction,
  changeBaseHref,
  backHref,
}) {
  return res.render("pages/flow/self-assess-igp-check-answers", {
    pageTitle: `Check your answers: ${context.heading}`,
    assessment,
    outcome,
    context,
    form: {
      targetLevel: getOutcomeTargetLevel(outcome),
      igpAssessments,
      derivedJudgement: buildRoundTwoOutcomeJudgement(igpAssessments),
      statementSummary: buildRoundTwoOutcomeSummary(igpAssessments),
    },
    formAction,
    changeBaseHref,
    backHref,
  });
}

function hasAnyEvidenceValue(ref) {
  if (!ref) return false;
  return Boolean(ref.title || ref.type || ref.link || ref.description || ref.refId || ref.note);
}

function validateEvidenceRefs(evidenceRefs) {
  const refs = Array.isArray(evidenceRefs) ? evidenceRefs.filter(hasAnyEvidenceValue) : [];
  if (refs.length === 0) return "";
  for (const ref of refs) {
    if (!(ref.title || "").toString().trim()) return "Enter an evidence title for each evidence reference.";
    if (!(ref.link || "").toString().trim()) return "Enter a link for each evidence reference.";
    if (!(ref.description || "").toString().trim()) return "Enter a description for each evidence reference.";
  }
  return "";
}

function buildPreviousAssessmentSummary(assessment, context, outcome) {
  if (!assessment || !assessment.previousAssessment || !context || !outcome) return null;
  const lens = (context.lens || "").toString();
  const previous = assessment.previousAssessment || {};
  const previousRow =
    lens === "bc"
      ? previous.bc && previous.bc[outcome.id]
      : previous.ad && previous.ad[outcome.id];
  if (!previousRow) return null;

  const currentRow =
    lens === "bc"
      ? getBCOutcome(assessment, context.systemId || "", outcome.id)
      : ((assessment.selfAssess && assessment.selfAssess.ad && assessment.selfAssess.ad[outcome.id]) || {});
  const evidenceCount = Array.isArray(previousRow.evidenceRefs)
    ? previousRow.evidenceRefs.filter(hasAnyEvidenceValue).length
    : 0;

  return {
    version: previous.version || "",
    reviewedAt: previous.reviewedAt || "",
    judgement: previousRow.judgement || "",
    rationale: previousRow.rationale || "",
    evidenceCount,
    carriedForward: Boolean(currentRow && currentRow.carriedForward),
    reviewRequired: Boolean(currentRow && currentRow.reviewRequired),
  };
}

function validateSelfAssess({
  igpResponse,
  igpAssessments,
  judgement,
  mismatchReason,
  mismatch,
  rationale,
  labels,
  requireReuseDecision,
  reuseDecision,
}) {
  const errors = [];
  const items = Array.isArray(igpAssessments) ? igpAssessments : [];
  const signalMode = items.some((item) => item.captureMode === "signal");
  if (items.length > 0 && items.some((item) => !hasCompletedIgpResponse(item))) {
    errors.push({
      field: "igpAssessments",
      text: signalMode
        ? "Select how each signal reflects the current position."
        : "Complete the IGP responses before saving this outcome.",
    });
  }
  if (requireReuseDecision && !reuseDecision) {
    errors.push({ field: "reuseDecision", text: "Choose how you want to use the previous assessment." });
  }
  if (!judgement) {
    errors.push({ field: "judgement", text: labels.flow.selfAssessOutcome.errors.judgementRequired });
  }
  if (mismatch && !mismatchReason) {
    errors.push({
      field: "mismatchReason",
      text: signalMode
        ? "Explain why your judgement differs from what the signals suggest."
        : "Explain why your judgement differs from the evidence.",
    });
  }
  if (!rationale) {
    errors.push({ field: "rationale", text: labels.flow.selfAssessOutcome.errors.rationaleRequired });
  }

  return errors;
}

function getStatusLabel(value) {
  if (!value) return "";
  const found = (statuses.options || []).find((item) => item.value === value);
  return found ? found.label : value;
}

function getBCOutcome(assessment, systemId, outcomeId) {
  if (!assessment.selfAssess.bc[systemId]) {
    assessment.selfAssess.bc[systemId] = { outcomes: {} };
  }
  if (!assessment.selfAssess.bc[systemId].outcomes) {
    assessment.selfAssess.bc[systemId].outcomes = {};
  }
  return assessment.selfAssess.bc[systemId].outcomes[outcomeId] || {};
}

function setBCOutcome(assessment, systemId, outcomeId, data) {
  if (!assessment.selfAssess.bc[systemId]) {
    assessment.selfAssess.bc[systemId] = { outcomes: {} };
  }
  assessment.selfAssess.bc[systemId].outcomes[outcomeId] = data;
}

function getScopeMapping(scope, systemId) {
  if (!scope || !Array.isArray(scope.mappings)) return null;
  return scope.mappings.find((mapping) => mapping && mapping.systemId === systemId) || null;
}

function getScopePriority(scope, systemId) {
  if (!scope || !Array.isArray(scope.priority)) return null;
  return scope.priority.find((priority) => priority && priority.systemId === systemId) || null;
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

  if (shortlistIds.length > 0) return shortlistIds;
  if (annualIds.length > 0) return annualIds;
  return [];
}

function findScopeService(scope, serviceId) {
  if (!scope || !Array.isArray(scope.essentialServices)) return null;
  return scope.essentialServices.find((service) => service && service.id === serviceId) || null;
}

function collectEvidenceReferences(assessment) {
  const rows = [];

  if (assessment.progressTracker) {
    for (const row of Object.values(assessment.progressTracker)) {
      if (Array.isArray(row.evidenceRefs)) {
        for (const ref of row.evidenceRefs) {
          if (hasAnyEvidenceValue(ref)) {
            rows.push({
              source: `Progress tracker ${row.outcomeCode}`,
              ...normaliseEvidenceRefs([ref])[0],
            });
          }
        }
      }
    }
  }

  if (assessment.selfAssess && assessment.selfAssess.ad) {
    for (const [outcomeId, data] of Object.entries(assessment.selfAssess.ad)) {
      if (Array.isArray(data.evidenceRefs)) {
        for (const ref of data.evidenceRefs) {
          if (hasAnyEvidenceValue(ref)) {
            rows.push({
              source: `Self-assess A and D ${outcomeId}`,
              ...normaliseEvidenceRefs([ref])[0],
            });
          }
        }
      }
    }
  }

  if (assessment.selfAssess && assessment.selfAssess.bc) {
    for (const [systemId, systemData] of Object.entries(assessment.selfAssess.bc)) {
      const outcomes = systemData.outcomes || {};
      for (const [outcomeId, data] of Object.entries(outcomes)) {
        if (Array.isArray(data.evidenceRefs)) {
          for (const ref of data.evidenceRefs) {
            if (hasAnyEvidenceValue(ref)) {
              rows.push({
                source: `Self-assess B and C ${systemId} ${outcomeId}`,
                ...normaliseEvidenceRefs([ref])[0],
              });
            }
          }
        }
      }
    }
  }

  return rows;
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
    previous.approver === nextEntry.approver &&
    previous.contributors === nextEntry.contributors;

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

function getAuditActor(user) {
  if (!user) return "Unknown user";
  const name = (user.name || "").toString().trim();
  const email = (user.email || "").toString().trim();
  if (name && email) return `${name} (${email})`;
  return name || email || "Unknown user";
}
