// app/routes/cycles.js
// Cycle journeys: start new cycle + cycle history + snapshot dashboard (read-only)
// URL namespace: /assessments/current/cycle/*

const labels = require("../data/content/labels");

const {
  requireSignedIn,
  ensureAssessment,
  getAssessmentOrRedirect,
} = require("../data/helpers/session");

const { normaliseQuery, buildQueryString } = require("../data/helpers/progress");
const {
  startNewCycle,
  ensureCycleExists,
  getCycleHistoryRows,
  getSnapshotOrNull,
  buildRowsFromTracker,
} = require("../data/helpers/cycles");

const statuses = require("../data/content/statuses");
const users = require("../data/seed/users");

module.exports = function (router) {
  router.use("/assessments/current/cycle", (req, res, next) => {
    if (!requireSignedIn(req, res)) return;
    if (!ensureAssessment(req)) return res.redirect("/entry");
    next();
  });

  // Start new cycle (confirm)
  router.get("/assessments/current/cycle/start", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureCycleExists(assessment);

    const query = normaliseQuery(req.query);

    const cycleStartedAt = formatTimestamp(assessment.cycle.startedAt);

    res.render("pages/cycles/start", {
      pageTitle: labels.cycles.start.pageTitle,
      labels,
      assessment,
      cycleStartedAt,
      query,
      error: null,
      defaults: {
        cycleName: "",
        carryOwners: "yes",
        carryCollaborators: "yes",
        resetStatuses: "yes",
        clearDueDates: "yes",
        keepEvidence: "yes",
      },
      buildQueryString,
    });
  });

  // Start new cycle (apply)
  router.post("/assessments/current/cycle/start", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureCycleExists(assessment);

    const query = normaliseQuery(req.query);

    const cycleName = (req.session.data.cycleName || "").toString().trim();

    const carryOwners = (req.session.data.carryOwners || "").toString();
    const carryCollaborators = (req.session.data.carryCollaborators || "").toString();
    const resetStatuses = (req.session.data.resetStatuses || "").toString();
    const clearDueDates = (req.session.data.clearDueDates || "").toString();
    const keepEvidence = (req.session.data.keepEvidence || "").toString();

    const errors = [];
    if (!carryOwners) errors.push({ field: "carryOwners", text: labels.cycles.errors.carryOwners });
    if (!carryCollaborators) errors.push({ field: "carryCollaborators", text: labels.cycles.errors.carryCollaborators });
    if (!resetStatuses) errors.push({ field: "resetStatuses", text: labels.cycles.errors.resetStatuses });
    if (!clearDueDates) errors.push({ field: "clearDueDates", text: labels.cycles.errors.clearDueDates });
    if (!keepEvidence) errors.push({ field: "keepEvidence", text: labels.cycles.errors.keepEvidence });

    if (errors.length > 0) {
      return res.render("pages/cycles/start", {
        pageTitle: labels.cycles.start.pageTitle,
        labels,
        assessment,
        query,
        error: { items: errors },
        defaults: {
          cycleName,
          carryOwners: carryOwners || "yes",
          carryCollaborators: carryCollaborators || "yes",
          resetStatuses: resetStatuses || "yes",
          clearDueDates: clearDueDates || "yes",
          keepEvidence: keepEvidence || "yes",
        },
        buildQueryString,
      });
    }

    startNewCycle(assessment, {
      name: cycleName,
      carryOwners: carryOwners === "yes",
      carryCollaborators: carryCollaborators === "yes",
      resetStatuses: resetStatuses === "yes",
      clearDueDates: clearDueDates === "yes",
      keepEvidence: keepEvidence === "yes",
    });

    delete req.session.data.cycleName;
    delete req.session.data.carryOwners;
    delete req.session.data.carryCollaborators;
    delete req.session.data.resetStatuses;
    delete req.session.data.clearDueDates;
    delete req.session.data.keepEvidence;

    const qs = buildQueryString(query);
    return res.redirect(`/assessments/current/dashboard${qs ? `?${qs}` : ""}`);
  });

  // Cycle history page
  router.get("/assessments/current/cycle/history", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureCycleExists(assessment);

    const rows = getCycleHistoryRows(assessment).map((row) => ({
      ...row,
      startedAtDisplay: formatTimestamp(row.startedAt),
      snapshotSavedAtDisplay: row.snapshotSavedAt ? formatTimestamp(row.snapshotSavedAt) : "",
    }));

    res.render("pages/cycles/history", {
      pageTitle: labels.cycles.history.pageTitle,
      labels,
      assessment,
      rows,
    });
  });

  // Snapshot dashboard (read-only)
  router.get("/assessments/current/cycle/:cycleId/dashboard", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureCycleExists(assessment);

    const cycleId = req.params.cycleId;
    const snapshot = getSnapshotOrNull(assessment, cycleId);

    if (!snapshot) {
      return res.status(404).render("pages/errors/not-found", {
        pageTitle: "Page not found",
        labels,
        message: "Cycle snapshot not found.",
      });
    }

    const currentUserId =
      req.session.data.user && req.session.data.user.id ? req.session.data.user.id : null;

    // Build rows from snapshot tracker and group by objective/principle
    const allRows = buildRowsFromTracker(snapshot.progressTracker, statuses, { currentUserId });
    const grouped = groupByObjectivePrinciple(allRows);

    const summaryAll = computeSummary(allRows);

    const snapshotDisplay = {
      startedAt: formatTimestamp(snapshot.cycle.startedAt),
      savedAt: formatTimestamp(snapshot.savedAt),
    };

    res.render("pages/cycles/snapshot-dashboard", {
      pageTitle: `${labels.cycles.snapshot.pageTitlePrefix} ${snapshot.cycle.name}`,
      labels,
      statuses,
      users,
      assessment,
      snapshot,
      snapshotDisplay,
      grouped,
      summaryAll,
      cycleId,
    });
  });
};

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

function groupByObjectivePrinciple(rows) {
  const grouped = {};
  for (const r of rows) {
    grouped[r.objective] = grouped[r.objective] || {};
    grouped[r.objective][r.principle] = grouped[r.objective][r.principle] || [];
    grouped[r.objective][r.principle].push(r);
  }
  return grouped;
}

function computeSummary(rows) {
  return {
    total: rows.length,
    overdue: rows.filter((r) => r.isOverdue).length,
    blocked: rows.filter((r) => r.status === "blocked").length,
    notStarted: rows.filter((r) => r.status === "not_started").length,
    inProgress: rows.filter((r) => r.status === "in_progress").length,
    readyForReview: rows.filter((r) => r.status === "ready_for_internal_review").length,
    complete: rows.filter((r) => r.status === "complete").length,
    needsAttention: rows.filter((r) => r.isNeedsAttention).length,
  };
}
