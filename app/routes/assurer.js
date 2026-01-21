// app/routes/assurer.js
// Assurer queue + outcome review stub.

const labels = require("../data/content/labels");
const statuses = require("../data/content/statuses");
const users = require("../data/seed/users");
const outcomesAD = require("../data/seed/outcomes-ad");
const assurerAssignments = require("../data/seed/assurer-assignments");
const engagementSeed = require("../data/seed/mhclg-engagement");

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
    const allRows = trackerRows.map((row) => deriveRowFlags(row, statuses, { currentUserId }));

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
        outcomesTree: outcomesAD,
        users,
      });
      assessment.updatedAt = new Date().toISOString();
    }

    const currentUserId =
      req.session.data.user && req.session.data.user.id ? req.session.data.user.id : null;

    const trackerRows = assessment ? Object.values(assessment.progressTracker || {}) : [];
    const allRows = trackerRows.map((row) => deriveRowFlags(row, statuses, { currentUserId }));
    const scopedRows = applyAssurerScope(allRows, assurerContext).map((row) => ({
      ...row,
      councilName: assurerContext.activeCouncilName,
    }));

    const readyForReview = scopedRows.filter((r) => r.isReadyForReview);
    const missingEvidence = scopedRows.filter((r) => r.isMissingEvidence);
    const view = (req.query.view || "").toString();
    let filteredRows = scopedRows;
    if (view === "ready") filteredRows = readyForReview;
    if (view === "missing") filteredRows = missingEvidence;

    res.render("pages/assurer/queue", {
      pageTitle: labels.assurer.queue.pageTitle,
      labels,
      assessment,
      assurerContext,
      readyForReview,
      missingEvidence,
      filteredRows,
      view,
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
    const row = assessment.progressTracker && assessment.progressTracker[outcomeId];

    if (!row) {
      return res.status(404).render("pages/errors/not-found", {
        pageTitle: "Page not found",
        labels,
        message: "Outcome not found.",
      });
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
    const row = assessment.progressTracker && assessment.progressTracker[outcomeId];

    if (!row) {
      return res.status(404).render("pages/errors/not-found", {
        pageTitle: "Page not found",
        labels,
        message: "Outcome not found.",
      });
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
  const supplierName = assurerAssignments.supplierName || "Assurance supplier";
  const assignedCouncils = user && assurerAssignments.assignments[user.id]
    ? assurerAssignments.assignments[user.id]
    : [];
  const activeCouncilName =
    (assessment && assessment.councilName) || assignedCouncils[0] || "";
  const isAssignedCouncil =
    assignedCouncils.length === 0 || !activeCouncilName
      ? true
      : assignedCouncils.includes(activeCouncilName);

  return {
    supplierName,
    assignedCouncils,
    activeCouncilName,
    isAssignedCouncil,
  };
}

function applyAssurerScope(rows, context) {
  if (!context || !context.isAssignedCouncil) return [];
  return rows;
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
  if (!assessment || !assessment.selfAssess || !assessment.selfAssess.ad) {
    return null;
  }
  const saved = assessment.selfAssess.ad[outcomeId];
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
