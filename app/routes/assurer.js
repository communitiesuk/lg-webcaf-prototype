// app/routes/assurer.js
// Assurer queue + outcome review stub.

const labels = require("../data/content/labels");
const statuses = require("../data/content/statuses");
const users = require("../data/seed/users");
const { getOutcomesForVersion } = require("../data/helpers/caf-version");
const engagementSeed = require("../data/seed/mhclg-engagement");
const { getAssurerAccessContext } = require("../data/helpers/assurer-access");
const { normaliseEvidenceRefs } = require("../data/helpers/outcome");

const {
  requireSignedIn,
  ensureAssessment,
  getAssessmentOrRedirect,
} = require("../data/helpers/session");

const { buildInitialProgressTracker, deriveRowFlags } = require("../data/helpers/progress");

module.exports = function (router) {
  router.use("/assurer", (req, res, next) => {
    if (!requireSignedIn(req, res)) return;
    next();
  });

  router.get("/assurer", (req, res) => {
    return res.redirect("/assurer/overview");
  });

  router.get("/assurer/overview", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    const assurerContext = getAssurerContext(req.session.data.user, assessment);

    const currentUserId =
      req.session.data.user && req.session.data.user.id ? req.session.data.user.id : null;

    const trackerRows = assessment ? Object.values(assessment.progressTracker || {}) : [];
    const adRows = trackerRows.map((row) => deriveRowFlags(row, statuses, { currentUserId }));
    const { bc } = getOutcomesForVersion(assessment);
    const bcRows = assessment ? buildAssurerBCRows(assessment, bc) : [];
    const allRows = adRows.concat(bcRows);

    const scopedRows = applyAssurerScope(allRows, assurerContext);
    const readyForReview = scopedRows.filter((r) => r.isReadyForReview);
    const missingEvidence = scopedRows.filter((r) => r.isMissingEvidence);
    const reviewedCount = scopedRows.filter((r) => r.assurerReview).length;

    res.render("pages/assurer/overview", {
      pageTitle: "Assurer overview",
      labels,
      assessment,
      assurerContext,
      readyForReview,
      missingEvidence,
      reviewedCount,
    });
  });

  router.get("/assurer/queue", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    const assurerContext = getAssurerContext(req.session.data.user, assessment);

    if (
      assessment &&
      (!assessment.progressTracker || Object.keys(assessment.progressTracker).length === 0)
    ) {
      assessment.progressTracker = buildInitialProgressTracker({
        outcomesTree: getOutcomesForVersion(assessment).ad,
        users,
      });
      assessment.updatedAt = new Date().toISOString();
    }

    const currentUserId =
      req.session.data.user && req.session.data.user.id ? req.session.data.user.id : null;

    const trackerRows = assessment ? Object.values(assessment.progressTracker || {}) : [];
    const adRows = trackerRows.map((row) => deriveRowFlags(row, statuses, { currentUserId }));
    const { bc } = getOutcomesForVersion(assessment);
    const bcRows = assessment ? buildAssurerBCRows(assessment, bc) : [];
    const allRows = adRows.concat(bcRows);
    const scopedRows = applyAssurerScope(allRows, assurerContext).map((row) => ({
      ...row,
      councilName: assurerContext.activeCouncilName,
      systemName: row.lens === "bc" ? row.systemName || "" : "",
    }));

    const readyForReview = scopedRows.filter((r) => r.isReadyForReview);
    const missingEvidence = scopedRows.filter((r) => r.isMissingEvidence);
    const view = (req.query.view || "").toString();
    let filteredRows = scopedRows;
    if (view === "ready") filteredRows = readyForReview;
    if (view === "missing") filteredRows = missingEvidence;
    const assuranceSnapshot = buildAssuranceSnapshot(assessment);

    res.render("pages/assurer/queue", {
      pageTitle: labels.assurer.queue.pageTitle,
      labels,
      assessment,
      assurerContext,
      readyForReview,
      missingEvidence,
      filteredRows,
      view,
      assuranceSnapshot,
    });
  });

  router.get("/assurer/check-ins", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    const assurerContext = getAssurerContext(req.session.data.user, assessment);
    const engagement = ensureEngagementData(req);

    res.render("pages/assurer/check-ins", {
      pageTitle: "Assurer check-ins",
      labels,
      assurerContext,
      engagement,
      error: null,
      saved: Boolean(req.query.saved),
    });
  });

  router.post("/assurer/check-ins", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    const assurerContext = getAssurerContext(req.session.data.user, assessment);
    const engagement = ensureEngagementData(req);

    const councilName = (req.session.data.checkInCouncil || "").toString();
    const category = (req.session.data.checkInCategory || "").toString();
    const detail = (req.session.data.checkInDetail || "").toString().trim();
    const needsHelp = (req.session.data.checkInNeedsHelp || "").toString();

    const errors = [];
    if (!councilName) errors.push({ field: "checkInCouncil", text: "Select a council." });
    if (!category) errors.push({ field: "checkInCategory", text: "Select a blocker category." });
    if (!detail) errors.push({ field: "checkInDetail", text: "Enter a short summary." });
    if (!needsHelp) errors.push({ field: "checkInNeedsHelp", text: "Select whether MHCLG help is needed." });

    if (errors.length > 0) {
      return res.render("pages/assurer/check-ins", {
        pageTitle: "Assurer check-ins",
        labels,
        assurerContext,
        engagement,
        error: { items: errors },
        saved: false,
      });
    }

    engagement.blockers.push({
      councilName,
      category,
      detail,
      raisedBy: req.session.data.user ? req.session.data.user.name : "Assurer",
      raisedAt: new Date().toISOString().slice(0, 10),
      needsMhclgHelp: needsHelp === "yes",
    });

    updateEngagementQueue(engagement, councilName);

    delete req.session.data.checkInCouncil;
    delete req.session.data.checkInCategory;
    delete req.session.data.checkInDetail;
    delete req.session.data.checkInNeedsHelp;

    return res.redirect("/assurer/check-ins?saved=1");
  });

  router.get("/assurer/workshops", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureAssuranceWorkflow(assessment);

    res.render("pages/assurer/workshops", {
      pageTitle: "Objective clarification workshops",
      labels,
      assessment,
      assurance: assessment.assurance,
      error: null,
      saved: Boolean(req.query.saved),
    });
  });

  router.post("/assurer/workshops", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureAssuranceWorkflow(assessment);

    const adWorkshop = {
      scheduledAt: (req.session.data.adWorkshopScheduledAt || "").toString().trim(),
      completedAt: (req.session.data.adWorkshopCompletedAt || "").toString().trim(),
      notes: (req.session.data.adWorkshopNotes || "").toString().trim(),
    };
    const bcWorkshop = {
      scheduledAt: (req.session.data.bcWorkshopScheduledAt || "").toString().trim(),
      completedAt: (req.session.data.bcWorkshopCompletedAt || "").toString().trim(),
      notes: (req.session.data.bcWorkshopNotes || "").toString().trim(),
    };

    assessment.assurance.objectives = { adWorkshop, bcWorkshop };
    assessment.assurance.workflowStage = "workshops_in_progress";
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.adWorkshopScheduledAt;
    delete req.session.data.adWorkshopCompletedAt;
    delete req.session.data.adWorkshopNotes;
    delete req.session.data.bcWorkshopScheduledAt;
    delete req.session.data.bcWorkshopCompletedAt;
    delete req.session.data.bcWorkshopNotes;

    return res.redirect("/assurer/workshops?saved=1");
  });

  router.get("/assurer/record-of-audit", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureAssuranceWorkflow(assessment);

    const outcomeRows = buildAssuranceOutcomeCatalog(assessment);
    const igpRows = buildAssuranceIgpCatalog(outcomeRows);

    res.render("pages/assurer/record-of-audit", {
      pageTitle: "Record of Audit",
      labels,
      assessment,
      outcomeRows,
      igpRows,
      existing: assessment.assurance.recordOfAudit || { outcomes: [], igps: [] },
      error: null,
      saved: Boolean(req.query.saved),
    });
  });

  router.post("/assurer/record-of-audit", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureAssuranceWorkflow(assessment);

    const action = (req.session.data.auditAction || "save").toString();
    const outcomeRows = buildAssuranceOutcomeCatalog(assessment);
    const igpRows = buildAssuranceIgpCatalog(outcomeRows);
    const data = req.session.data || {};

    const outcomes = outcomeRows.map((row) => {
      const key = toFieldKey(row.outcomeId);
      return {
        outcomeId: row.outcomeId,
        objective: row.objective,
        assurerRating: (data[`auditRating-${key}`] || "").toString(),
        justification: (data[`auditJustification-${key}`] || "").toString().trim(),
      };
    });

    const igps = igpRows.map((row) => {
      const key = toFieldKey(`${row.outcomeId}__${row.igpId}`);
      return {
        outcomeId: row.outcomeId,
        igpId: row.igpId,
        assessment: (data[`auditIgpAssessment-${key}`] || "").toString(),
        note: (data[`auditIgpNote-${key}`] || "").toString().trim(),
      };
    });

    const errors = [];
    if (action === "submit") {
      for (const item of outcomes) {
        if (!item.assurerRating) {
          errors.push({ field: "recordOfAudit", text: "Select an assurer rating for every contributing outcome." });
          break;
        }
        if (!item.justification) {
          errors.push({ field: "recordOfAudit", text: "Enter assurer justification for every contributing outcome." });
          break;
        }
      }
      if (errors.length === 0) {
        for (const item of igps) {
          if (!item.assessment) {
            errors.push({ field: "recordOfAudit", text: "Select Met or Not met for each IGP." });
            break;
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.render("pages/assurer/record-of-audit", {
        pageTitle: "Record of Audit",
        labels,
        assessment,
        outcomeRows,
        igpRows,
        existing: { outcomes, igps },
        error: { items: errors },
        saved: false,
      });
    }

    assessment.assurance.recordOfAudit = {
      outcomes,
      igps,
      submittedAt: action === "submit" ? new Date().toISOString() : "",
      submittedBy: action === "submit" ? (req.session.data.user ? req.session.data.user.name : "Assurer") : "",
    };
    assessment.assurance.workflowStage = action === "submit" ? "record_of_audit_draft" : assessment.assurance.workflowStage;
    assessment.updatedAt = new Date().toISOString();

    clearAuditFormData(req.session.data, outcomeRows, igpRows);
    delete req.session.data.auditAction;
    return res.redirect("/assurer/record-of-audit?saved=1");
  });

  router.get("/assurer/evidence-requests", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureAssuranceWorkflow(assessment);

    const outcomeRows = buildAssuranceOutcomeCatalog(assessment);
    const openRequests = (assessment.assurance.evidenceRequests || []).filter((item) => item.status === "open");
    const addressedRequests = (assessment.assurance.evidenceRequests || []).filter((item) => item.status !== "open");

    res.render("pages/assurer/evidence-requests", {
      pageTitle: "Evidence clarification requests",
      labels,
      assessment,
      outcomeRows,
      openRequests,
      addressedRequests,
      error: null,
      saved: Boolean(req.query.saved),
    });
  });

  router.post("/assurer/evidence-requests", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureAssuranceWorkflow(assessment);

    const action = (req.session.data.evidenceRequestAction || "add").toString();
    const requests = assessment.assurance.evidenceRequests || [];
    if (action === "close") {
      const requestId = (req.session.data.evidenceRequestId || "").toString();
      assessment.assurance.evidenceRequests = requests.map((item) =>
        item.id === requestId ? { ...item, status: "closed" } : item
      );
      assessment.updatedAt = new Date().toISOString();
      delete req.session.data.evidenceRequestAction;
      delete req.session.data.evidenceRequestId;
      return res.redirect("/assurer/evidence-requests?saved=1");
    }

    const objective = (req.session.data.evidenceRequestObjective || "").toString();
    const outcomeId = (req.session.data.evidenceRequestOutcomeId || "").toString();
    const igpId = (req.session.data.evidenceRequestIgpId || "").toString().trim();
    const requestText = (req.session.data.evidenceRequestText || "").toString().trim();
    const dueAt = (req.session.data.evidenceRequestDueAt || "").toString().trim();
    const errors = [];
    if (!objective) errors.push({ field: "evidenceRequestObjective", text: "Select objective." });
    if (!outcomeId) errors.push({ field: "evidenceRequestOutcomeId", text: "Select contributing outcome." });
    if (!requestText) errors.push({ field: "evidenceRequestText", text: "Enter missing evidence request." });

    const outcomeRows = buildAssuranceOutcomeCatalog(assessment);
    const openRequests = requests.filter((item) => item.status === "open");
    const addressedRequests = requests.filter((item) => item.status !== "open");

    if (errors.length > 0) {
      return res.render("pages/assurer/evidence-requests", {
        pageTitle: "Evidence clarification requests",
        labels,
        assessment,
        outcomeRows,
        openRequests,
        addressedRequests,
        error: { items: errors },
        saved: false,
      });
    }

    assessment.assurance.evidenceRequests.push({
      id: `er-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      objective,
      outcomeId,
      igpId: igpId || "",
      requestText,
      status: "open",
      requestedAt: new Date().toISOString(),
      dueAt,
      councilResponse: "",
    });
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.evidenceRequestAction;
    delete req.session.data.evidenceRequestObjective;
    delete req.session.data.evidenceRequestOutcomeId;
    delete req.session.data.evidenceRequestIgpId;
    delete req.session.data.evidenceRequestText;
    delete req.session.data.evidenceRequestDueAt;

    return res.redirect("/assurer/evidence-requests?saved=1");
  });

  router.get("/assurer/report-stage-1", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureAssuranceWorkflow(assessment);
    const outcomeRows = buildAssuranceOutcomeCatalog(assessment);
    const existing = assessment.assurance.stage1Report || { items: [], councilAmendments: {} };
    const windowInfo = getAmendmentWindow(existing);

    res.render("pages/assurer/report-stage-1", {
      pageTitle: "IIP Stage 1: Assurer report",
      labels,
      assessment,
      outcomeRows,
      existing,
      windowInfo,
      error: null,
      saved: Boolean(req.query.saved),
    });
  });

  router.post("/assurer/report-stage-1", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureAssuranceWorkflow(assessment);

    const action = (req.session.data.stage1Action || "save").toString();
    const outcomeRows = buildAssuranceOutcomeCatalog(assessment);
    const data = req.session.data || {};
    const items = outcomeRows.map((row) => {
      const key = toFieldKey(row.outcomeId);
      return {
        outcomeId: row.outcomeId,
        recommendation: (data[`stage1Recommendation-${key}`] || "").toString().trim(),
        riskLevel: (data[`stage1RiskLevel-${key}`] || "").toString(),
        riskDescription: (data[`stage1RiskDescription-${key}`] || "").toString().trim(),
        controlTypes: coerceArray(data[`stage1ControlTypes-${key}`]).filter(Boolean),
      };
    });

    const record = assessment.assurance.recordOfAudit || { outcomes: [], igps: [] };
    const errors = [];
    if (action === "share") {
      if (!isRecordOfAuditComplete(record, outcomeRows.length)) {
        errors.push({ field: "stage1Report", text: "Submit Record of Audit first before sharing draft report." });
      }
      for (const item of items) {
        if (!item.recommendation || !item.riskLevel || !item.riskDescription || item.controlTypes.length === 0) {
          errors.push({ field: "stage1Report", text: "Complete recommendation, risk, risk description and control types for each contributing outcome." });
          break;
        }
      }
    }
    if (action === "finalise") {
      const current = assessment.assurance.stage1Report || {};
      const canFinalise = canFinaliseReport(current);
      if (!canFinalise.ok) {
        errors.push({ field: "stage1Report", text: canFinalise.reason });
      }
    }

    const existing = assessment.assurance.stage1Report || { items: [], councilAmendments: {} };
    if (errors.length > 0) {
      return res.render("pages/assurer/report-stage-1", {
        pageTitle: "IIP Stage 1: Assurer report",
        labels,
        assessment,
        outcomeRows,
        existing: {
          ...existing,
          items,
        },
        windowInfo: getAmendmentWindow(existing),
        error: { items: errors },
        saved: false,
      });
    }

    const nowIso = new Date().toISOString();
    const next = {
      ...(assessment.assurance.stage1Report || {}),
      items,
      councilAmendments: (assessment.assurance.stage1Report && assessment.assurance.stage1Report.councilAmendments) || {
        status: "none",
        dueAt: "",
        submittedAt: "",
        notes: "",
      },
      draftSharedAt: (assessment.assurance.stage1Report && assessment.assurance.stage1Report.draftSharedAt) || "",
      draftSharedBy: (assessment.assurance.stage1Report && assessment.assurance.stage1Report.draftSharedBy) || "",
      finalisedAt: (assessment.assurance.stage1Report && assessment.assurance.stage1Report.finalisedAt) || "",
      finalisedBy: (assessment.assurance.stage1Report && assessment.assurance.stage1Report.finalisedBy) || "",
    };

    if (action === "share") {
      next.draftSharedAt = nowIso;
      next.draftSharedBy = req.session.data.user ? req.session.data.user.name : "Assurer";
      next.councilAmendments = {
        status: "none",
        dueAt: toDateInput(addWorkingDays(new Date(), 5)),
        submittedAt: "",
        notes: "",
      };
      assessment.assurance.workflowStage = "report_draft_shared";
    } else if (action === "finalise") {
      next.finalisedAt = nowIso;
      next.finalisedBy = req.session.data.user ? req.session.data.user.name : "Assurer";
      assessment.assurance.workflowStage = "report_finalised";
    }

    assessment.assurance.stage1Report = next;
    assessment.updatedAt = nowIso;

    clearStage1FormData(req.session.data, outcomeRows);
    delete req.session.data.stage1Action;

    return res.redirect("/assurer/report-stage-1?saved=1");
  });

  router.get("/assurer/submission", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");

    res.render("pages/assurer/submission", {
      pageTitle: "Submission status",
      labels,
      assessment,
      submission: assessment.submission || {},
    });
  });

  router.get("/assurer/iip-stage-2", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureIipStage2Data(assessment);

    res.render("pages/assurer/iip-stage-2", {
      pageTitle: "IIP Stage 2 queue",
      labels,
      assessment,
      stage2: assessment.improvementPlan.stage2,
      statusLabel: formatStage2Status(assessment.improvementPlan.stage2.status),
      error: null,
      saved: Boolean(req.query.saved),
    });
  });

  router.get("/assurer/iip-stage-2/:assessmentId", (req, res) => {
    if ((req.params.assessmentId || "").toString() !== "current") {
      return res.redirect("/assurer/iip-stage-2");
    }
    return res.redirect("/assurer/iip-stage-2");
  });

  router.post("/assurer/iip-stage-2/:assessmentId/schedule-session", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureIipStage2Data(assessment);
    const scheduledAt = (req.session.data.stage2SessionScheduledAt || "").toString().trim();
    if (!isValidIsoDate(scheduledAt)) {
      return res.render("pages/assurer/iip-stage-2", {
        pageTitle: "IIP Stage 2 queue",
        labels,
        assessment,
        stage2: assessment.improvementPlan.stage2,
        statusLabel: formatStage2Status(assessment.improvementPlan.stage2.status),
        error: { items: [{ field: "stage2SessionScheduledAt", text: "Enter a valid session date." }] },
        saved: false,
      });
    }
    assessment.improvementPlan.stage2.assurerReview.sessionScheduledAt = scheduledAt;
    assessment.improvementPlan.stage2.status = "assurer_session_scheduled";
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.stage2SessionScheduledAt;
    return res.redirect("/assurer/iip-stage-2?saved=1");
  });

  router.post("/assurer/iip-stage-2/:assessmentId/complete-session", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureIipStage2Data(assessment);
    const completedAt = (req.session.data.stage2SessionCompletedAt || "").toString().trim();
    const sessionNotes = (req.session.data.stage2SessionNotes || "").toString().trim();
    const errors = [];
    if (!isValidIsoDate(completedAt)) errors.push({ field: "stage2SessionCompletedAt", text: "Enter a valid completion date." });
    if (!sessionNotes) errors.push({ field: "stage2SessionNotes", text: "Enter session notes." });
    if (errors.length > 0) {
      return res.render("pages/assurer/iip-stage-2", {
        pageTitle: "IIP Stage 2 queue",
        labels,
        assessment,
        stage2: assessment.improvementPlan.stage2,
        statusLabel: formatStage2Status(assessment.improvementPlan.stage2.status),
        error: { items: errors },
        saved: false,
      });
    }
    assessment.improvementPlan.stage2.assurerReview.sessionCompletedAt = completedAt;
    assessment.improvementPlan.stage2.assurerReview.sessionNotes = sessionNotes;
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.stage2SessionCompletedAt;
    delete req.session.data.stage2SessionNotes;
    return res.redirect("/assurer/iip-stage-2?saved=1");
  });

  router.post("/assurer/iip-stage-2/:assessmentId/outcome", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) return res.redirect("/assurer/overview");
    ensureIipStage2Data(assessment);
    const outcome = (req.session.data.stage2AssurerOutcome || "").toString();
    const feedback = (req.session.data.stage2AssurerFeedback || "").toString().trim();
    const errors = [];
    if (!["accepted", "rework_required"].includes(outcome)) {
      errors.push({ field: "stage2AssurerOutcome", text: "Select accepted or rework required." });
    }
    if (!feedback) errors.push({ field: "stage2AssurerFeedback", text: "Enter assurer feedback." });
    if (outcome === "rework_required" && assessment.improvementPlan.stage2.rework.completedAt) {
      errors.push({ field: "stage2AssurerOutcome", text: "Only one rework cycle is supported for this improvement plan." });
    }
    if (errors.length > 0) {
      return res.render("pages/assurer/iip-stage-2", {
        pageTitle: "IIP Stage 2 queue",
        labels,
        assessment,
        stage2: assessment.improvementPlan.stage2,
        statusLabel: formatStage2Status(assessment.improvementPlan.stage2.status),
        error: { items: errors },
        saved: false,
      });
    }

    assessment.improvementPlan.stage2.assurerReview.outcome = outcome;
    assessment.improvementPlan.stage2.assurerReview.feedback = feedback;
    assessment.improvementPlan.stage2.status = outcome === "accepted" ? "internally_signed_off" : "rework_required";
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.stage2AssurerOutcome;
    delete req.session.data.stage2AssurerFeedback;
    return res.redirect("/assurer/iip-stage-2?saved=1");
  });

  router.get("/assurer/outcomes/:outcomeId", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) {
      return res.redirect("/assurer/queue");
    }

    const assurerContext = getAssurerContext(req.session.data.user, assessment);
    if (!assurerContext.isAssignedCouncil) {
      return res.redirect("/assurer/queue");
    }

    const outcomeId = req.params.outcomeId;
    let row = assessment.progressTracker && assessment.progressTracker[outcomeId];

    if (!row) {
      const { bc } = getOutcomesForVersion(assessment);
      const bcRow = buildAssurerBCOutcomeRow(assessment, bc, outcomeId);
      if (bcRow) {
        row = bcRow;
      } else {
        return res.status(404).render("pages/errors/not-found", {
          pageTitle: "Page not found",
          labels,
          message: "Outcome not found.",
        });
      }
    }

    const ownerName = getUserName(row.ownerId);
    const collaboratorNames = Array.isArray(row.collaboratorIds)
      ? row.collaboratorIds.map(getUserName).filter(Boolean)
      : [];
    const statusMeta = getStatusMeta(row.status);
    const history = formatHistoryEntries(row.history);
    const selfAssessSummary = buildSelfAssessSummary(assessment, outcomeId);
    const hasEvidenceRefs = Array.isArray(row.evidenceRefs) && row.evidenceRefs.length > 0;

    const nextReady = nextReadyOutcomeId(assessment, statuses, req.params.outcomeId);

    res.render("pages/assurer/outcome", {
      pageTitle: `${labels.assurer.outcome.pageTitlePrefix} ${row.outcomeCode}`,
      labels,
      row,
      ownerName,
      collaboratorNames,
      statusMeta,
      history,
      selfAssessSummary,
      nextReady,
      hasEvidenceRefs,
      review: row.assurerReview || {},
      error: null,
      saved: false,
    });
  });

  router.post("/assurer/outcomes/:outcomeId", (req, res) => {
    const assessment = ensureAssessment(req) ? req.session.data.assessment : null;
    if (!assessment) {
      return res.redirect("/assurer/queue");
    }

    const assurerContext = getAssurerContext(req.session.data.user, assessment);
    if (!assurerContext.isAssignedCouncil) {
      return res.redirect("/assurer/queue");
    }

    const outcomeId = req.params.outcomeId;
    let row = assessment.progressTracker && assessment.progressTracker[outcomeId];

    if (!row) {
      const { bc } = getOutcomesForVersion(assessment);
      const bcRow = buildAssurerBCOutcomeRow(assessment, bc, outcomeId);
      if (bcRow) {
        row = bcRow;
      } else {
        return res.status(404).render("pages/errors/not-found", {
          pageTitle: "Page not found",
          labels,
          message: "Outcome not found.",
        });
      }
    }

    const decision = (req.session.data.assurerDecision || "").toString();
    const rationale = (req.session.data.assurerRationale || "").toString().trim();

    const errors = [];
    if (!decision) errors.push({ field: "assurerDecision", text: labels.assurer.errors.decisionRequired });
    if (!rationale) errors.push({ field: "assurerRationale", text: labels.assurer.errors.rationaleRequired });

    const ownerName = getUserName(row.ownerId);
    const collaboratorNames = Array.isArray(row.collaboratorIds)
      ? row.collaboratorIds.map(getUserName).filter(Boolean)
      : [];
    const statusMeta = getStatusMeta(row.status);
    const history = formatHistoryEntries(row.history);
    const selfAssessSummary = buildSelfAssessSummary(assessment, outcomeId);
    const hasEvidenceRefs = Array.isArray(row.evidenceRefs) && row.evidenceRefs.length > 0;

    if (errors.length > 0) {
      const nextReady = nextReadyOutcomeId(assessment, statuses, req.params.outcomeId);
      return res.render("pages/assurer/outcome", {
        pageTitle: `${labels.assurer.outcome.pageTitlePrefix} ${row.outcomeCode}`,
        labels,
        row,
        ownerName,
        collaboratorNames,
        statusMeta,
        history,
        selfAssessSummary,
        nextReady,
        hasEvidenceRefs,
        review: { decision, rationale },
        error: { items: errors },
        saved: false,
      });
    }

    row.assurerReview = {
      decision,
      rationale,
      by: req.session.data.user ? req.session.data.user.name : "Assurer",
      at: new Date().toISOString(),
    };
    row.status = "feedback_received";
    row.nextStep = "Council to review and update";

    if (!Array.isArray(row.history)) row.history = [];
    row.history.push({
      at: row.assurerReview.at,
      by: row.assurerReview.by,
      summary: `Assurer decision: ${decision}`,
      status: row.status,
      statusLabel: getStatusMeta(row.status) ? getStatusMeta(row.status).label : row.status,
      dueDate: row.dueDate || "",
      blocker: row.blocker || "",
      nextStep: row.nextStep || "",
      kind: "assurer_review",
      rationale: row.assurerReview.rationale,
    });
    assessment.updatedAt = new Date().toISOString();

    if (!assessment.selfAssess) assessment.selfAssess = { ad: {}, bc: {} };
    if (!assessment.selfAssess.ad) assessment.selfAssess.ad = {};
    if (!assessment.selfAssess.bc) assessment.selfAssess.bc = {};

    if (outcomeId.includes(":")) {
      const bcRowKey = outcomeId;
      const { bc } = getOutcomesForVersion(assessment);
      const bcRow = buildAssurerBCOutcomeRow(assessment, bc, bcRowKey);
      if (bcRow && bcRow.systemId && bcRow.outcomeKey) {
        const systemId = bcRow.systemId;
        const outcomeKey = bcRow.outcomeKey;
        if (!assessment.selfAssess.bc[systemId]) {
          assessment.selfAssess.bc[systemId] = { outcomes: {} };
        }
        const target = assessment.selfAssess.bc[systemId].outcomes[outcomeKey] || {};
        target.assurerReview = row.assurerReview;
        target.status = row.status;
        target.history = Array.isArray(row.history) ? row.history : [];
        target.updatedAt = row.assurerReview.at;
        assessment.selfAssess.bc[systemId].outcomes[outcomeKey] = target;
      }
    } else {
      const target = assessment.selfAssess.ad[outcomeId] || {};
      target.assurerReview = row.assurerReview;
      target.status = row.status;
      target.history = Array.isArray(row.history) ? row.history : [];
      target.updatedAt = row.assurerReview.at;
      assessment.selfAssess.ad[outcomeId] = target;
    }

    delete req.session.data.assurerDecision;
    delete req.session.data.assurerRationale;

    const nextReady = nextReadyOutcomeId(assessment, statuses, req.params.outcomeId);

    return res.render("pages/assurer/outcome", {
      pageTitle: `${labels.assurer.outcome.pageTitlePrefix} ${row.outcomeCode}`,
      labels,
      row,
      ownerName,
      collaboratorNames,
      statusMeta,
      history,
      selfAssessSummary,
      nextReady,
      hasEvidenceRefs,
      review: row.assurerReview,
      error: null,
      saved: true,
    });
  });
};

function getAssurerContext(user, assessment) {
  const context = getAssurerAccessContext(user, assessment);
  return {
    supplierName: context.supplierName,
    assignedCouncils: context.assignedCouncils,
    activeCouncilName: context.activeCouncilName,
    isAssignedCouncil: context.isAssignedAssessment,
  };
}

function applyAssurerScope(rows, context) {
  if (!context || !context.isAssignedCouncil) return [];
  return rows;
}

function buildAssurerBCRows(assessment, outcomesTree) {
  const scope = assessment.scope || {};
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
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
      const evidenceRefs = normaliseEvidenceRefs(saved.evidenceRefs);
      const evidenceCount = evidenceRefs.filter(hasAnyEvidenceValue).length;
      const hasContent = Boolean(saved.igpResponse || saved.rationale || evidenceCount > 0);
      const statusValue = (saved.status || "").toString() || (
        saved.blocker
          ? "blocked"
          : saved.judgement
          ? "ready_for_review"
          : hasContent
          ? "in_progress"
          : "not_started"
      );

      rows.push(
        deriveRowFlags(
          {
            lens: "bc",
            outcomeId: `${system.id}:${outcome.id}`,
            outcomeCode: outcome.code,
            title: outcome.title,
            description: outcome.description || "",
            objective: outcome.code.split(".")[0].charAt(0),
            principle: outcome.code.split(".")[0],
            systemName: system.name,
            ownerId: "",
            collaboratorIds: [],
            status: statusValue,
            dueDate: "",
            nextStep: "",
            history: Array.isArray(saved.history) ? saved.history : [],
            evidenceRefs,
            blocker: saved.blocker || "",
          },
          statuses,
          {}
        )
      );
    }
  }

  return rows;
}

function buildAssurerBCOutcomeRow(assessment, outcomesTree, rowId) {
  if (!rowId || !rowId.includes(":")) return null;
  const [systemId, outcomeKey] = rowId.split(":");
  if (!systemId || !outcomeKey) return null;

  const scope = assessment.scope || {};
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const system = systems.find((item) => item.id === systemId);
  if (!system) return null;

  const outcome = findOutcomeInTree(outcomesTree, outcomeKey);
  if (!outcome) return null;

  const bcData =
    assessment.selfAssess && assessment.selfAssess.bc && assessment.selfAssess.bc[system.id]
      ? assessment.selfAssess.bc[system.id]
      : { outcomes: {} };
  const saved = (bcData.outcomes || {})[outcome.id] || {};
  const evidenceRefs = normaliseEvidenceRefs(saved.evidenceRefs);
  const evidenceCount = evidenceRefs.filter(hasAnyEvidenceValue).length;
  const hasContent = Boolean(saved.igpResponse || saved.rationale || evidenceCount > 0);
  const statusValue = (saved.status || "").toString() || (
    saved.blocker
      ? "blocked"
      : saved.judgement
      ? "ready_for_review"
      : hasContent
      ? "in_progress"
      : "not_started"
  );

  const base = deriveRowFlags(
    {
      lens: "bc",
      outcomeId: rowId,
      outcomeCode: outcome.code,
      title: outcome.title,
      description: outcome.description || "",
      objective: outcome.code.split(".")[0].charAt(0),
      principle: outcome.code.split(".")[0],
      ownerId: "",
      collaboratorIds: [],
      status: statusValue,
      dueDate: "",
      nextStep: "",
      history: Array.isArray(saved.history) ? saved.history : [],
      evidenceRefs,
      blocker: saved.blocker || "",
    },
    statuses,
    {}
  );

  return {
    ...base,
    systemId: system.id,
    systemName: system.name,
    outcomeKey: outcome.id,
    assurerReview: saved.assurerReview || null,
  };
}

function flattenOutcomes(outcomesTree) {
  const list = [];
  for (const objective of outcomesTree.objectives || []) {
    for (const principle of objective.principles || []) {
      for (const outcome of principle.outcomes || []) {
        list.push(outcome);
      }
    }
  }
  return list;
}

function findOutcomeInTree(outcomesTree, outcomeId) {
  for (const objective of outcomesTree.objectives || []) {
    for (const principle of objective.principles || []) {
      for (const outcome of principle.outcomes || []) {
        if (outcome.id === outcomeId) return outcome;
      }
    }
  }
  return null;
}

function hasAnyEvidenceValue(ref) {
  if (!ref) return false;
  return Boolean(ref.title || ref.type || ref.link || ref.description || ref.refId || ref.note);
}

function ensureEngagementData(req) {
  if (!req.session || !req.session.data) return cloneEngagementSeed();
  if (!req.session.data.engagement) {
    req.session.data.engagement = cloneEngagementSeed();
  }
  return req.session.data.engagement;
}

function cloneEngagementSeed() {
  return JSON.parse(JSON.stringify(engagementSeed));
}

function updateEngagementQueue(engagement, councilName) {
  if (!engagement || !Array.isArray(engagement.queue)) return;
  const row = engagement.queue.find((item) => item.councilName === councilName);
  if (row) {
    row.blockers = Number(row.blockers || 0) + 1;
    row.status = row.status === "Overdue" ? row.status : "Blocked";
    row.notes = "Assurer logged new blocker.";
  } else {
    engagement.queue.push({
      councilName,
      status: "Blocked",
      source: "Assurer weekly catch-up",
      lastCheckIn: "",
      nextCheckIn: "",
      blockers: 1,
      notes: "Assurer logged new blocker.",
    });
  }
}

function getUserName(userId) {
  const found = users.find((u) => u.id === userId);
  return found ? found.name : "";
}

function getStatusMeta(value) {
  const found = statuses.options.find((s) => s.value === value);
  return found || null;
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

function nextReadyOutcomeId(assessment, statusesDef, currentId) {
  if (!assessment || !assessment.progressTracker) return "";
  const rows = Object.values(assessment.progressTracker).map((row) =>
    deriveRowFlags(row, statusesDef, {})
  );
  const ready = rows.filter((row) => row.isReadyForReview);
  if (ready.length === 0) return "";
  const next = ready.find((row) => row.outcomeId !== currentId) || ready[0];
  return next ? next.outcomeId : "";
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

function formatHistoryEntries(history) {
  if (!Array.isArray(history)) return [];
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

  if (outcomeId.includes(":")) {
    const [systemId, outcomeKey] = outcomeId.split(":");
    const system = assessment.selfAssess.bc && assessment.selfAssess.bc[systemId];
    const saved = system && system.outcomes ? system.outcomes[outcomeKey] : null;
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

  const saved = assessment.selfAssess.ad ? assessment.selfAssess.ad[outcomeId] : null;
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

function ensureAssuranceWorkflow(assessment) {
  if (!assessment) return;
  if (!assessment.assurance || typeof assessment.assurance !== "object") assessment.assurance = {};
  if (!assessment.assurance.workflowStage) assessment.assurance.workflowStage = "not_started";
  if (!assessment.assurance.objectives) {
    assessment.assurance.objectives = {
      adWorkshop: { scheduledAt: "", completedAt: "", notes: "" },
      bcWorkshop: { scheduledAt: "", completedAt: "", notes: "" },
    };
  } else {
    if (!assessment.assurance.objectives.adWorkshop) {
      assessment.assurance.objectives.adWorkshop = { scheduledAt: "", completedAt: "", notes: "" };
    }
    if (!assessment.assurance.objectives.bcWorkshop) {
      assessment.assurance.objectives.bcWorkshop = { scheduledAt: "", completedAt: "", notes: "" };
    }
  }
  if (!Array.isArray(assessment.assurance.evidenceRequests)) assessment.assurance.evidenceRequests = [];
  if (!assessment.assurance.recordOfAudit) {
    assessment.assurance.recordOfAudit = { outcomes: [], igps: [], submittedAt: "", submittedBy: "" };
  } else {
    if (!Array.isArray(assessment.assurance.recordOfAudit.outcomes)) assessment.assurance.recordOfAudit.outcomes = [];
    if (!Array.isArray(assessment.assurance.recordOfAudit.igps)) assessment.assurance.recordOfAudit.igps = [];
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
  } else {
    if (!Array.isArray(assessment.assurance.stage1Report.items)) assessment.assurance.stage1Report.items = [];
    if (!assessment.assurance.stage1Report.councilAmendments) {
      assessment.assurance.stage1Report.councilAmendments = { status: "none", dueAt: "", submittedAt: "", notes: "" };
    }
  }
}

function buildAssuranceOutcomeCatalog(assessment) {
  const list = [];
  const trackerRows = Object.values(assessment.progressTracker || {});
  for (const row of trackerRows) {
    list.push({
      outcomeId: row.outcomeId,
      objective: (row.objective || "").toString(),
      outcomeCode: row.outcomeCode,
      title: row.title,
      systemName: "",
    });
  }
  const { bc } = getOutcomesForVersion(assessment);
  const bcRows = buildAssurerBCRows(assessment, bc);
  for (const row of bcRows) {
    list.push({
      outcomeId: row.outcomeId,
      objective: (row.objective || "").toString(),
      outcomeCode: row.outcomeCode,
      title: row.title,
      systemName: row.systemName || "",
    });
  }
  return list;
}

function buildAssuranceIgpCatalog(outcomeRows) {
  const igps = [];
  const base = ["IGP-1", "IGP-2", "IGP-3"];
  for (const row of outcomeRows) {
    for (const id of base) {
      igps.push({
        outcomeId: row.outcomeId,
        outcomeCode: row.outcomeCode,
        igpId: id,
      });
    }
  }
  return igps;
}

function toFieldKey(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}

function clearAuditFormData(sessionData, outcomeRows, igpRows) {
  for (const row of outcomeRows) {
    const key = toFieldKey(row.outcomeId);
    delete sessionData[`auditRating-${key}`];
    delete sessionData[`auditJustification-${key}`];
  }
  for (const row of igpRows) {
    const key = toFieldKey(`${row.outcomeId}__${row.igpId}`);
    delete sessionData[`auditIgpAssessment-${key}`];
    delete sessionData[`auditIgpNote-${key}`];
  }
}

function clearStage1FormData(sessionData, outcomeRows) {
  for (const row of outcomeRows) {
    const key = toFieldKey(row.outcomeId);
    delete sessionData[`stage1Recommendation-${key}`];
    delete sessionData[`stage1RiskLevel-${key}`];
    delete sessionData[`stage1RiskDescription-${key}`];
    delete sessionData[`stage1ControlTypes-${key}`];
  }
}

function isRecordOfAuditComplete(record, outcomesCount) {
  if (!record) return false;
  const outcomeRows = Array.isArray(record.outcomes) ? record.outcomes : [];
  const igpRows = Array.isArray(record.igps) ? record.igps : [];
  const allOutcomesComplete =
    outcomeRows.length >= outcomesCount &&
    outcomeRows.every((item) => item.assurerRating && item.justification);
  const allIgpsComplete = igpRows.length >= outcomesCount * 3 && igpRows.every((item) => item.assessment);
  return allOutcomesComplete && allIgpsComplete;
}

function canFinaliseReport(report) {
  if (!report || !report.draftSharedAt) {
    return { ok: false, reason: "Share draft report with council before finalising." };
  }
  const amendments = report.councilAmendments || {};
  const status = (amendments.status || "none").toString();
  if (status === "submitted") return { ok: true, reason: "" };
  const dueAt = amendments.dueAt ? new Date(amendments.dueAt) : null;
  if (dueAt && !Number.isNaN(dueAt.getTime()) && new Date().getTime() > dueAt.getTime()) {
    return { ok: true, reason: "" };
  }
  return { ok: false, reason: "Wait for council amendments or amendment window expiry before finalising." };
}

function addWorkingDays(date, days) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  let remaining = Math.max(0, Number(days) || 0);
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}

function getAmendmentWindow(stage1Report) {
  const amendments = (stage1Report && stage1Report.councilAmendments) || {};
  const dueAt = amendments.dueAt ? new Date(amendments.dueAt) : null;
  const now = new Date();
  const expired = Boolean(dueAt && !Number.isNaN(dueAt.getTime()) && now.getTime() > dueAt.getTime());
  return {
    dueAtDisplay: dueAt && !Number.isNaN(dueAt.getTime()) ? formatDateForDisplay(dueAt.toISOString()) : "",
    expired,
    status: (amendments.status || "none").toString(),
  };
}

function toDateInput(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildAssuranceSnapshot(assessment) {
  ensureAssuranceWorkflow(assessment);
  ensureIipStage2Data(assessment);
  const record = assessment.assurance.recordOfAudit || { outcomes: [], igps: [] };
  const report = assessment.assurance.stage1Report || {};
  const amendments = report.councilAmendments || {};
  const recordComplete = isRecordOfAuditComplete(record, buildAssuranceOutcomeCatalog(assessment).length);
  const dueAt = amendments.dueAt ? new Date(amendments.dueAt) : null;
  const amendmentsExpired =
    Boolean(dueAt && !Number.isNaN(dueAt.getTime()) && new Date().getTime() > dueAt.getTime()) &&
    amendments.status !== "submitted";
  const amendmentsStatus = amendments.status === "submitted"
    ? "Submitted"
    : amendmentsExpired || amendments.status === "expired"
    ? "Expired"
    : "Awaiting";
  return {
    recordOfAuditStatus: recordComplete ? "Submitted" : "In progress",
    reportStage1Status: report.finalisedAt ? "Finalised" : report.draftSharedAt ? "Draft shared" : "In progress",
    amendmentsStatus,
    iipStage2Submitted: assessment.improvementPlan.stage2.assurerReview.submittedAt ? "Yes" : "No",
    iipStage2SessionStatus: assessment.improvementPlan.stage2.assurerReview.sessionCompletedAt
      ? "Completed"
      : assessment.improvementPlan.stage2.assurerReview.sessionScheduledAt
      ? "Scheduled"
      : "Not scheduled",
    iipStage2Rework: assessment.improvementPlan.stage2.assurerReview.outcome === "rework_required" ? "Yes" : "No",
  };
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
    stage2.status = "drafting_offline";
  }
}

function isValidIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").toString().trim());
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
