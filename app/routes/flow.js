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

const PROTOTYPE_OUTCOME_LIMIT = 1;

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
      return res.redirect("/assessments/current/dashboard?lens=ad&view=all");
    }
    const outcome = findOutcome(ad, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const saved = assessment.selfAssess.ad[outcome.id] || {};
    const evidenceRefs = ensureAtLeastOneEvidenceRow(normaliseEvidenceRefs(saved.evidenceRefs));

    res.render("pages/flow/self-assess-outcome", {
      pageTitle: buildOutcomeOverviewTitle(outcome),
      labels,
      assessment,
      context: {
        backLink: `/assessments/current/outcomes/${outcome.id}`,
        heading: buildOutcomeOverviewTitle(outcome),
        subHeading: "",
        lens: "ad",
        progressLink: `/assessments/current/outcomes/${outcome.id}`,
        progressLinkText: "Return to outcome overview",
      },
      outcome,
      form: {
        igpResponse: saved.igpResponse || "",
        judgement: saved.judgement || "",
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

  router.post("/self-assess/ad/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const { ad } = getOutcomesForVersion(assessment);
    const allowedIds = getPrototypeOutcomeIds(ad);
    if (!allowedIds.includes(req.params.outcomeId)) {
      return res.redirect("/assessments/current/dashboard?lens=ad&view=all");
    }
    const outcome = findOutcome(ad, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const action = (req.session.data.action || "").toString();

    const existingAd = assessment.selfAssess.ad[outcome.id] || {};
    const igpResponse = (req.session.data.igpResponse || existingAd.igpResponse || "").toString().trim();
    const judgement = (req.session.data.judgement || "").toString();
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
        context: {
          backLink: `/assessments/current/outcomes/${outcome.id}`,
          heading: buildOutcomeOverviewTitle(outcome),
          subHeading: "",
          progressLink: `/assessments/current/outcomes/${outcome.id}`,
          progressLinkText: "Return to outcome overview",
        },
        form: {
          igpResponse,
          judgement,
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
        context: {
          backLink: `/assessments/current/outcomes/${outcome.id}`,
          heading: buildOutcomeOverviewTitle(outcome),
          subHeading: "",
          progressLink: `/assessments/current/outcomes/${outcome.id}`,
          progressLinkText: "Return to outcome overview",
        },
        form: {
          igpResponse,
          judgement,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs: safeEvidence,
        },
      });
    }

    const existingStatus = (existingAd.status || "").toString();

    if (action === "shareForReview") {
      const shareErrors = validateSelfAssess({
        igpResponse,
        judgement,
        rationale,
        labels,
      });

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
            judgement,
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
        judgement,
        rationale,
        qualityReviewedAt,
        approverReviewedAt,
        evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
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
      judgement,
      rationale,
      labels,
    });

    if (errors.length > 0) {
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
          judgement,
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
        ? "in_progress"
        : "not_started";

    const nowIso = new Date().toISOString();
    assessment.selfAssess.ad[outcome.id] = {
      ...existingAd,
      igpResponse,
      judgement,
      rationale,
      qualityReviewedAt,
      approverReviewedAt,
      evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
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

    clearOutcomeForm(req);

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
    const shortlist = Array.isArray(scope.priorityShortlist) ? scope.priorityShortlist : [];
    const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];

    if (!shortlist.includes(req.params.systemId)) {
      return res.redirect("/self-assess/bc/select-system");
    }

    const system = systems.find((s) => s.id === req.params.systemId);
    if (!system) return renderNotFound(res);

    return res.redirect("/assessments/current/dashboard?lens=bc&view=all");
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
      return res.redirect("/assessments/current/dashboard?lens=bc&view=all");
    }
    const outcome = findOutcome(bc, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const saved = getBCOutcome(assessment, system.id, outcome.id);
    const evidenceRefs = ensureAtLeastOneEvidenceRow(normaliseEvidenceRefs(saved.evidenceRefs));

    res.render("pages/flow/self-assess-outcome", {
      pageTitle: buildOutcomeOverviewTitle(outcome),
      labels,
      assessment,
      context: {
        backLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
        heading: buildOutcomeOverviewTitle(outcome),
        subHeading: "",
        lens: "bc",
        progressLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
        progressLinkText: "Return to outcome overview",
      },
      outcome,
      form: {
        igpResponse: saved.igpResponse || "",
        judgement: saved.judgement || "",
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

    const action = (req.session.data.action || "").toString();

    const existingBc = getBCOutcome(assessment, system.id, outcome.id);
    const igpResponse = (req.session.data.igpResponse || existingBc.igpResponse || "").toString().trim();
    const judgement = (req.session.data.judgement || "").toString();
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
        context: {
          backLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
          heading: buildOutcomeOverviewTitle(outcome),
          subHeading: "",
        },
        form: {
          igpResponse,
          judgement,
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
        context: {
          backLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
          heading: buildOutcomeOverviewTitle(outcome),
          subHeading: "",
        },
        form: {
          igpResponse,
          judgement,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs: safeEvidence,
        },
      });
    }

    const existingStatus = (existingBc.status || "").toString();

    if (action === "shareForReview") {
      const shareErrors = validateSelfAssess({
        igpResponse,
        judgement,
        rationale,
        labels,
      });

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
            judgement,
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
        judgement,
        rationale,
        qualityReviewedAt,
        approverReviewedAt,
        evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
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
      judgement,
      rationale,
      labels,
    });

    if (errors.length > 0) {
      clearOutcomeAction(req);
      return renderSelfAssessOutcome(res, {
        labels,
        assessment,
        outcome,
        context: {
          backLink: `/assessments/current/outcomes/${encodeURIComponent(system.id)}:${encodeURIComponent(outcome.id)}`,
          heading: buildOutcomeOverviewTitle(outcome),
          subHeading: "",
        },
        form: {
          igpResponse,
          judgement,
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
        ? "in_progress"
        : "not_started";
    const nowIso = new Date().toISOString();
    setBCOutcome(assessment, system.id, outcome.id, {
      ...existingBc,
      igpResponse,
      judgement,
      rationale,
      qualityReviewedAt,
      approverReviewedAt,
      evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
      status: nextStatus,
      updatedAt: nowIso,
    });
    assessment.updatedAt = nowIso;

    clearOutcomeForm(req);

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
      evidenceLibrary: assessment.evidenceLibrary,
      collectedEvidence: collectEvidenceReferences(assessment),
    });
  });

  router.post("/evidence-library", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const refId = (req.session.data.refId || "").toString().trim();
    const type = (req.session.data.type || "").toString().trim();
    const link = (req.session.data.link || "").toString().trim();
    const note = (req.session.data.note || "").toString().trim();

    if (refId || link || type || note) {
      assessment.evidenceLibrary.push({
        refId,
        type,
        link,
        note,
        createdAt: new Date().toISOString(),
      });
      assessment.updatedAt = new Date().toISOString();
    }

    delete req.session.data.refId;
    delete req.session.data.type;
    delete req.session.data.link;
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
    approvals.signedOffBy = req.session.data.user ? req.session.data.user.name : "CAF lead";
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
    assessment.improvementPlan.stage2.assurerReview.submittedBy = req.session.data.user ? req.session.data.user.name : "CAF lead";
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
      submittedBy: req.session.data.user ? req.session.data.user.name : "CAF lead",
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
    [ref.refId, ref.type, ref.link, ref.note].some((value) => (value || "").toString().trim())
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

function getPrototypeOutcomeRows(outcomesTree) {
  return flattenOutcomes(outcomesTree).slice(0, PROTOTYPE_OUTCOME_LIMIT);
}

function getPrototypeOutcomeIds(outcomesTree) {
  return getPrototypeOutcomeRows(outcomesTree).map((outcome) => outcome.id);
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
      name: currentUser.name || "CAF lead",
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
        { refId: "GOV-DEMO-01", type: "Board tracker", link: "", note: "" },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  if (!assessment.selfAssess.ad["D1b"]) {
    assessment.selfAssess.ad["D1b"] = {
      igpResponse: "Incident response playbooks exist but have not been exercised.",
      judgement: "Not achieved",
      rationale: "Exercises are scheduled but not yet completed.",
      evidenceRefs: [
        { refId: "IR-DEMO-02", type: "Playbook", link: "", note: "" },
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

  if (!assessment.selfAssess.bc[systemId].outcomes["C1b"]) {
    assessment.selfAssess.bc[systemId].outcomes["C1b"] = {
      igpResponse: "Coverage is partial for third-party interfaces.",
      judgement: "Not achieved",
      rationale: "Monitoring does not yet include all integrations.",
      evidenceRefs: [
        { refId: "MON-DEMO-03", type: "Gap log", link: "", note: "" },
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

function redirectIfScopeNotReady(req, res, assessment, target) {
  if (!assessment.prepare || !assessment.prepare.guidanceRead) {
    req.session.data.stage1Gate = true;
    return res.redirect("/prepare");
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
  delete req.session.data.igpResponse;
  delete req.session.data.judgement;
  delete req.session.data.rationale;
  delete req.session.data.qualityReviewedAt;
  delete req.session.data.approverReviewedAt;
  delete req.session.data.evidenceRefs;
}

function renderSelfAssessOutcome(res, { labels, assessment, outcome, context, form, error }) {
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

function hasAnyEvidenceValue(ref) {
  if (!ref) return false;
  return Boolean(ref.refId || ref.type || ref.link || ref.note);
}

function validateSelfAssess({ judgement, rationale, labels }) {
  const errors = [];
  if (!judgement) {
    errors.push({ field: "judgement", text: labels.flow.selfAssessOutcome.errors.judgementRequired });
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

function collectEvidenceReferences(assessment) {
  const rows = [];

  if (assessment.progressTracker) {
    for (const row of Object.values(assessment.progressTracker)) {
      if (Array.isArray(row.evidenceRefs)) {
        for (const ref of row.evidenceRefs) {
          if (hasAnyEvidenceValue(ref)) {
            rows.push({
              source: `Progress tracker ${row.outcomeCode}`,
              ...ref,
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
              ...ref,
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
                ...ref,
              });
            }
          }
        }
      }
    }
  }

  return rows;
}
