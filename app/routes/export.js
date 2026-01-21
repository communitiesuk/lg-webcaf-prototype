// app/routes/export.js
// CSV export for current cycle + snapshot cycles (structured data payoff)
// Routes:
// - GET /assessments/current/export.csv
// - GET /assessments/current/cycle/:cycleId/export.csv

const {
  requireSignedIn,
  ensureAssessment,
  getAssessmentOrRedirect,
} = require("../data/helpers/session");

const { ensureCycleExists, getSnapshotOrNull } = require("../data/helpers/cycles");
const statuses = require("../data/content/statuses");
const users = require("../data/seed/users");

const { deriveRowFlags } = require("../data/helpers/progress");

module.exports = function (router) {
  router.get("/assessments/current/export.csv", (req, res) => {
    if (!requireSignedIn(req, res)) return;
    if (!ensureAssessment(req)) return res.redirect("/entry");

    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureCycleExists(assessment);

    const cycleId = assessment.cycle ? assessment.cycle.id : "";
    const tracker = assessment.progressTracker || {};

    return sendCsv(res, {
      filename: `caf-progress-${cycleId || "current"}.csv`,
      rows: buildExportRows(tracker, cycleId),
    });
  });

  router.get("/assessments/current/cycle/:cycleId/export.csv", (req, res) => {
    if (!requireSignedIn(req, res)) return;
    if (!ensureAssessment(req)) return res.redirect("/entry");

    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureCycleExists(assessment);

    const cycleId = req.params.cycleId;
    const snapshot = getSnapshotOrNull(assessment, cycleId);

    if (!snapshot) {
      res.status(404).send("Snapshot not found");
      return;
    }

    const tracker = snapshot.progressTracker || {};
    return sendCsv(res, {
      filename: `caf-progress-${cycleId}.csv`,
      rows: buildExportRows(tracker, cycleId),
    });
  });
};

function buildExportRows(progressTracker, cycleId) {
  const tracker = progressTracker || {};

  const userById = {};
  for (const u of users) userById[u.id] = u;

  const statusByValue = {};
  for (const s of statuses.options) statusByValue[s.value] = s.label;

  const derived = Object.values(tracker).map((row) =>
    deriveRowFlags(row, statuses, { currentUserId: null })
  );

  // Keep export ordering consistent and readable:
  // objective asc, principle asc, outcomeCode asc
  derived.sort((a, b) => {
    const ao = (a.objective || "").localeCompare(b.objective || "");
    if (ao !== 0) return ao;

    const ap = (a.principle || "").localeCompare(b.principle || "");
    if (ap !== 0) return ap;

    return (a.outcomeCode || "").localeCompare(b.outcomeCode || "");
  });

  return derived.map((r) => {
    const ownerName = r.ownerId && userById[r.ownerId] ? userById[r.ownerId].name : "";
    const collaboratorCount = Array.isArray(r.collaboratorIds) ? r.collaboratorIds.length : 0;

    const lastUpdateAt = r.lastUpdateAt || "";
    const lastUpdateBy = r.lastUpdateBy || "";
    const lastUpdateSummary = r.lastUpdateSummary || "";

    return {
      cycleId: r.cycleId || cycleId || "",
      objective: r.objective || "",
      principle: r.principle || "",
      outcomeCode: r.outcomeCode || "",
      outcomeTitle: r.title || "",

      ownerName,
      collaboratorCount: String(collaboratorCount),

      status: r.status || "",
      statusLabel: statusByValue[r.status] || "",

      dueDate: r.dueDate || "",
      isOverdue: r.isOverdue ? "yes" : "no",

      attentionFlags: buildAttentionFlags(r),
      nextStep: r.nextStep || "",

      lastUpdateAt,
      lastUpdateBy,
      lastUpdateSummary,

      evidenceRefsCount: String(r.evidenceCount || 0),
    };
  });
}

function buildAttentionFlags(r) {
  const flags = [];
  if (r.isOverdue) flags.push("overdue");
  if (r.status === "blocked") flags.push("blocked");
  if (r.status === "ready_for_review") flags.push("ready_for_review");
  if (r.isMissingEvidence) flags.push("missing_evidence");
  return flags.join("|");
}

function sendCsv(res, { filename, rows }) {
  const header = [
    "cycleId",
    "objective",
    "principle",
    "outcomeCode",
    "outcomeTitle",
    "ownerName",
    "collaboratorCount",
    "status",
    "statusLabel",
    "dueDate",
    "isOverdue",
    "attentionFlags",
    "nextStep",
    "lastUpdateAt",
    "lastUpdateBy",
    "lastUpdateSummary",
    "evidenceRefsCount",
  ];

  const lines = [];
  lines.push(header.join(","));

  for (const row of rows) {
    const values = header.map((key) => csvCell(row[key]));
    lines.push(values.join(","));
  }

  const csv = lines.join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);

  // Escape quotes by doubling them, wrap if contains comma/newline/quote
  const needsWrap = /[",\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsWrap ? `"${escaped}"` : escaped;
}
