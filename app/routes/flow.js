// app/routes/flow.js
// End-to-end flow pages: prepare, profile, self-assess, evidence, assurance, improvement, submit.

const labels = require("../data/content/labels");
const outcomesAD = require("../data/seed/outcomes-ad");
const outcomesBC = require("../data/seed/outcomes-bc");
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
      gatedNotice,
    });
  });

  router.post("/prepare", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const checklist = coerceArray(req.session.data.prepChecklist);
    assessment.prepare = {
      guidanceRead: checklist.includes("guidance"),
      contributorsConfirmed: checklist.includes("contributors"),
      cafReviewed: checklist.includes("caf"),
    };
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.prepChecklist;

    return res.redirect("/profile");
  });

  router.get("/profile", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    const gatedNotice = getStage1GateNotice(req, labels);

    const rows = buildProfileRows(profileTargets, outcomesAD, outcomesBC);
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
    assessment.lens = "ad";
    assessment.updatedAt = new Date().toISOString();

    const rows = flattenOutcomes(outcomesAD).map((o) => {
      const saved = assessment.selfAssess.ad[o.id] || {};
      return {
        ...o,
        judgement: saved.judgement || "",
        evidenceCount: Array.isArray(saved.evidenceRefs) ? saved.evidenceRefs.length : 0,
      };
    });

    res.render("pages/flow/self-assess-ad", {
      pageTitle: labels.flow.selfAssessAD.pageTitle,
      labels,
      assessment,
      rows,
    });
  });

  router.get("/self-assess/ad/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const outcome = findOutcome(outcomesAD, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const saved = assessment.selfAssess.ad[outcome.id] || {};
    const evidenceRefs = ensureAtLeastOneEvidenceRow(normaliseEvidenceRefs(saved.evidenceRefs));

    res.render("pages/flow/self-assess-outcome", {
      pageTitle: `${labels.flow.selfAssessAD.pageTitle}: ${outcome.code}`,
      labels,
      assessment,
      context: {
        backLink: "/self-assess/ad",
        heading: `${labels.flow.selfAssessAD.outcomeHeading} ${outcome.code}`,
        subHeading: outcome.title,
        lens: "ad",
        progressLink: `/assessments/current/outcomes/${outcome.id}`,
        progressLinkText: labels.flow.selfAssessOutcome.progressLink,
      },
      outcome,
      form: {
        igpResponse: saved.igpResponse || "",
        judgement: saved.judgement || "",
        rationale: saved.rationale || "",
        qualityReviewedAt: formatDateForInput(saved.qualityReviewedAt),
        approverReviewedAt: formatDateForInput(saved.approverReviewedAt),
        evidenceRefs,
      },
      error: null,
    });
  });

  router.post("/self-assess/ad/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const outcome = findOutcome(outcomesAD, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const action = (req.session.data.action || "").toString();

    const igpResponse = (req.session.data.igpResponse || "").toString().trim();
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
          backLink: "/self-assess/ad",
          heading: `${labels.flow.selfAssessAD.outcomeHeading} ${outcome.code}`,
          subHeading: outcome.title,
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
          backLink: "/self-assess/ad",
          heading: `${labels.flow.selfAssessAD.outcomeHeading} ${outcome.code}`,
          subHeading: outcome.title,
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

    const errors = validateSelfAssess({
      igpResponse,
      judgement,
      rationale,
      evidenceRefs: evidenceRefsFromForm,
      labels,
    });

    if (errors.length > 0) {
      clearOutcomeAction(req);
      return renderSelfAssessOutcome(res, {
        labels,
        assessment,
        outcome,
        context: {
          backLink: "/self-assess/ad",
          heading: `${labels.flow.selfAssessAD.outcomeHeading} ${outcome.code}`,
          subHeading: outcome.title,
        },
        form: {
          igpResponse,
          judgement,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs,
        },
        error: { items: errors },
      });
    }

    assessment.selfAssess.ad[outcome.id] = {
      igpResponse,
      judgement,
      rationale,
      qualityReviewedAt,
      approverReviewedAt,
      evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
      updatedAt: new Date().toISOString(),
    };
    assessment.updatedAt = new Date().toISOString();

    clearOutcomeForm(req);

    return res.redirect("/self-assess/ad");
  });

  router.get("/self-assess/bc", (req, res) => {
    return res.redirect("/self-assess/bc/select-system");
  });

  router.get("/self-assess/bc/select-system", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
    assessment.lens = "bc";
    assessment.updatedAt = new Date().toISOString();

    const scope = assessment.scope || {};
    const shortlist = Array.isArray(scope.priorityShortlist) ? scope.priorityShortlist : [];
    const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];

    const shortlistSystems = systems.filter((s) => shortlist.includes(s.id));
    const outcomesPreview = flattenOutcomes(outcomesBC).map((o) => ({
      code: o.code,
      title: o.title,
      description: o.description || "",
    }));

    res.render("pages/flow/self-assess-bc-select", {
      pageTitle: labels.flow.selfAssessBC.pageTitle,
      labels,
      assessment,
      shortlist: shortlistSystems,
      outcomesPreview,
    });
  });

  router.get("/self-assess/bc/:systemId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);
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

    const rows = flattenOutcomes(outcomesBC).map((o) => {
      const saved = getBCOutcome(assessment, system.id, o.id);
      return {
        ...o,
        judgement: saved.judgement || "",
        evidenceCount: Array.isArray(saved.evidenceRefs) ? saved.evidenceRefs.length : 0,
      };
    });

    res.render("pages/flow/self-assess-bc-system", {
      pageTitle: `${labels.flow.selfAssessBC.pageTitle}: ${system.name}`,
      labels,
      assessment,
      system,
      rows,
    });
  });

  router.get("/self-assess/bc/:systemId/outcomes/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureFlowData(assessment);

    const scopeSystems = assessment.scope && Array.isArray(assessment.scope.criticalSystems)
      ? assessment.scope.criticalSystems
      : [];
    const system = scopeSystems.find((s) => s.id === req.params.systemId);
    if (!system) return renderNotFound(res);

    const outcome = findOutcome(outcomesBC, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const saved = getBCOutcome(assessment, system.id, outcome.id);
    const evidenceRefs = ensureAtLeastOneEvidenceRow(normaliseEvidenceRefs(saved.evidenceRefs));

    res.render("pages/flow/self-assess-outcome", {
      pageTitle: `${labels.flow.selfAssessBC.pageTitle}: ${outcome.code}`,
      labels,
      assessment,
      context: {
        backLink: `/self-assess/bc/${system.id}`,
        heading: `${labels.flow.selfAssessBC.outcomeHeading} ${outcome.code}`,
        subHeading: outcome.title,
        lens: "bc",
        progressLink: `/assessments/current/dashboard?view=all&lens=bc&objective=${outcome.code.split(".")[0].charAt(0)}&principle=${outcome.code.split(".")[0]}`,
        progressLinkText: "View progress tracker dashboard",
      },
      outcome,
      form: {
        igpResponse: saved.igpResponse || "",
        judgement: saved.judgement || "",
        rationale: saved.rationale || "",
        qualityReviewedAt: formatDateForInput(saved.qualityReviewedAt),
        approverReviewedAt: formatDateForInput(saved.approverReviewedAt),
        evidenceRefs,
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

    const outcome = findOutcome(outcomesBC, req.params.outcomeId);
    if (!outcome) return renderNotFound(res);

    const action = (req.session.data.action || "").toString();

    const igpResponse = (req.session.data.igpResponse || "").toString().trim();
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
        backLink: `/self-assess/bc/${system.id}`,
        heading: `${labels.flow.selfAssessBC.outcomeHeading} ${outcome.code}`,
        subHeading: outcome.title,
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
        backLink: `/self-assess/bc/${system.id}`,
        heading: `${labels.flow.selfAssessBC.outcomeHeading} ${outcome.code}`,
        subHeading: outcome.title,
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

    const errors = validateSelfAssess({
      igpResponse,
      judgement,
      rationale,
      evidenceRefs: evidenceRefsFromForm,
      labels,
    });

    if (errors.length > 0) {
      clearOutcomeAction(req);
      return renderSelfAssessOutcome(res, {
        labels,
        assessment,
        outcome,
        context: {
          backLink: `/self-assess/bc/${system.id}`,
          heading: `${labels.flow.selfAssessBC.outcomeHeading} ${outcome.code}`,
          subHeading: outcome.title,
        },
        form: {
          igpResponse,
          judgement,
          rationale,
          qualityReviewedAt,
          approverReviewedAt,
          evidenceRefs,
        },
        error: { items: errors },
      });
    }

    setBCOutcome(assessment, system.id, outcome.id, {
      igpResponse,
      judgement,
      rationale,
      qualityReviewedAt,
      approverReviewedAt,
      evidenceRefs: evidenceRefs.filter(hasAnyEvidenceValue),
      updatedAt: new Date().toISOString(),
    });
    assessment.updatedAt = new Date().toISOString();

    clearOutcomeForm(req);

    return res.redirect(`/self-assess/bc/${system.id}`);
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

  router.get("/improvement-plan", (req, res) => {
    return res.redirect("/improvement-plan/edit");
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
    if (isAssurer(req)) {
      return res.redirect("/improvement-plan/generate");
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
    if (isAssurer(req)) {
      return res.redirect("/improvement-plan/generate");
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

function isAssurer(req) {
  const user = req.session && req.session.data ? req.session.data.user : null;
  return Boolean(user && user.role === "assurer");
}

function buildIipGaps(assessment) {
  const gaps = [];
  const gapJudgements = new Set(["Partially achieved", "Not achieved"]);
  const adOutcomes = flattenOutcomes(outcomesAD);
  const bcOutcomes = flattenOutcomes(outcomesBC);
  const adLookup = new Map(adOutcomes.map((o) => [o.id, o]));
  const bcLookup = new Map(bcOutcomes.map((o) => [o.id, o]));

  const ad = assessment.selfAssess && assessment.selfAssess.ad ? assessment.selfAssess.ad : {};
  for (const [outcomeId, data] of Object.entries(ad)) {
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
  const bc = assessment.selfAssess && assessment.selfAssess.bc ? assessment.selfAssess.bc : {};
  for (const system of systems) {
    const systemData = bc[system.id] || {};
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
      checkInCadence: "",
      confirmed: false,
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
      checkInCadence: (item.checkInCadence || base.checkInCadence || "").toString(),
      keep: (item.keep || "yes").toString(),
      confirmed: base.confirmed || false,
      status: base.status || "",
      lastUpdateAt: base.lastUpdateAt || "",
      lastUpdateNote: base.lastUpdateNote || "",
      gapMeta: base.gapMeta || {},
    };
  });
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

function validateSelfAssess({ igpResponse, judgement, rationale, evidenceRefs, labels }) {
  const errors = [];

  if (!igpResponse) {
    errors.push({ field: "igpResponse", text: labels.flow.selfAssessOutcome.errors.igpRequired });
  }
  if (!judgement) {
    errors.push({ field: "judgement", text: labels.flow.selfAssessOutcome.errors.judgementRequired });
  }
  if (!rationale) {
    errors.push({ field: "rationale", text: labels.flow.selfAssessOutcome.errors.rationaleRequired });
  }

  const hasEvidence =
    Array.isArray(evidenceRefs) &&
    evidenceRefs.some((ref) => ref && (ref.refId || ref.link));

  if (!hasEvidence) {
    errors.push({ field: "evidenceRefs", text: labels.flow.selfAssessOutcome.errors.evidenceRequired });
  }

  return errors;
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
              source: `Self-assess A&D ${outcomeId}`,
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
                source: `Self-assess B&C ${systemId} ${outcomeId}`,
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
