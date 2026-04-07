// app/data/helpers/progress.js
// Progress tracker data shaping + filters + derived flags (dashboard-ready)

function buildInitialProgressTracker({ outcomesTree, users }) {
  const tracker = {};
  const flat = flattenOutcomes(outcomesTree);

  for (let i = 0; i < flat.length; i++) {
    const o = flat[i];
    const baseRow = {
      outcomeId: o.id,
      outcomeCode: o.code,
      title: o.title,
      description: o.description || "",
      objective: o.objective,
      principle: o.principle,
      ownerId: "",
      collaboratorIds: [],
      status: "not_started",
      dueDate: "",

      // Newer fields (kept empty until user updates)
      blocker: "",
      nextStep: "",
      evidenceRefs: [],
      history: [],

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tracker[o.id] = baseRow;
  }

  return tracker;
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

function toISODate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isISODateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseISODate(value) {
  if (!isISODateString(value)) return null;
  const [y, m, d] = value.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function getLatestHistoryEntry(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  // history is stored oldest->newest; last element is latest
  return history[history.length - 1];
}

function countEvidenceRefs(evidenceRefs) {
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0) return 0;

  // count refs that actually have content (avoid empty placeholder rows)
  return evidenceRefs.filter((r) => {
    if (!r) return false;
    return Boolean(
      (r.title && String(r.title).trim()) ||
      (r.type && String(r.type).trim()) ||
      (r.link && String(r.link).trim()) ||
      (r.description && String(r.description).trim()) ||
      (r.refId && String(r.refId).trim()) ||
      (r.note && String(r.note).trim())
    );
  }).length;
}

function deriveRowFlags(row, statusesDef, opts = {}) {
  const due = parseISODate(row.dueDate);
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const isComplete = row.status === "complete";
  const isBlocked = row.status === "blocked";
  const isReadyForReview = row.status === "ready_for_review";
  const isFeedbackReceived = row.status === "feedback_received";
  const isOverdue = Boolean(due && due < todayMidnight && !isComplete);

  const currentUserId = opts.currentUserId || null;
  const isOwner = Boolean(currentUserId && row.ownerId === currentUserId);
  const isCollaborator =
    Boolean(currentUserId && Array.isArray(row.collaboratorIds) && row.collaboratorIds.includes(currentUserId));

  const isMine = Boolean(isOwner || isCollaborator);

  const isNeedsAttention = Boolean(isOverdue || isBlocked || isReadyForReview || isFeedbackReceived);

  const statusMeta =
    statusesDef.options.find((s) => s.value === row.status) || statusesDef.options[0];

  const latest = getLatestHistoryEntry(row.history);
  const lastUpdateAt = latest ? formatTimestampShort(latest.at) : "";
  const lastUpdateBy = latest ? latest.by : "";
  const lastUpdateSummary = latest ? latest.summary : "";
  const dueDateDisplay = row.dueDate ? formatDateShort(row.dueDate) : "";

  const evidenceCount = countEvidenceRefs(row.evidenceRefs);
  const evidenceExpectedStatuses = new Set([
    "complete",
    "ready_for_review",
    "feedback_received",
    "updated_after_feedback",
  ]);
  const isMissingEvidence = evidenceCount === 0 && evidenceExpectedStatuses.has(row.status);
  const isNeedsAttentionWithEvidence = Boolean(isNeedsAttention || isMissingEvidence);

  return {
    ...row,
    isOverdue,
    isBlocked,
    isReadyForReview,
    isOwner,
    isCollaborator,
    isMine,
    isNeedsAttention: isNeedsAttentionWithEvidence,
    statusLabel: statusMeta.label,
    statusTagClass: statusMeta.tagClass,

    // Dashboard-friendly derived fields
    evidenceCount,
    isMissingEvidence,
    lastUpdateAt,
    lastUpdateBy,
    lastUpdateSummary,
    dueDateDisplay,
  };
}

function normaliseQuery(query) {
  return {
    // filters
    objective: (query.objective || "").toString(),
    principle: (query.principle || "").toString(),
    status: (query.status || "").toString(),
    owner: (query.owner || "").toString(),
    lens: (query.lens || "all").toString(),
    workStatus: (query.workStatus || "all").toString(),
    assigned: (query.assigned || "anyone").toString(),

    // view controls
    view: (query.view || "all").toString(), // all | my | attention
    overdueOnly: (query.overdueOnly || "").toString(), // "1" or ""
  };
}

function applyDashboardFilters(rows, query, opts = {}) {
  const currentUserId = opts.currentUserId || null;

  return rows.filter((r) => {
    if (query.lens && query.lens !== "all") {
      if ((r.lens || "ad") !== query.lens) return false;
    }
    if (query.objective && r.objective !== query.objective) return false;
    if (query.principle && r.principle !== query.principle) return false;
    if (query.status && r.status !== query.status) return false;
    if (query.owner && r.ownerId !== query.owner) return false;
    if (query.assigned === "me") {
      if (!currentUserId) return false;
      if (!r.isMine) return false;
    }

    if (query.workStatus && query.workStatus !== "all") {
      if (query.workStatus === "needs_attention") {
        if (!r.isNeedsAttention) return false;
      } else if (query.workStatus === "completed") {
        if (r.status !== "complete") return false;
      } else if (query.workStatus === "in_progress") {
        if (r.status !== "in_progress") return false;
      } else if (query.workStatus === "not_started") {
        if (r.status !== "not_started") return false;
      }
    }

    // View: my work (owner or collaborator)
    if (query.view === "my") {
      if (!currentUserId) return false;
      if (!r.isMine) return false;
    }

    // View: needs attention (overdue/blocked/ready for review)
    if (query.view === "attention") {
      if (!r.isNeedsAttention) return false;
    }

    // Overdue only (derived flag)
    if (query.overdueOnly === "1" && !r.isOverdue) return false;

    return true;
  });
}

function formatDateForInput(value) {
  if (!value) return "";
  return isISODateString(value) ? value : "";
}

function formatDateShort(value) {
  const dt = parseISODate(value);
  if (!dt) return value || "";
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function formatTimestampShort(value) {
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

function buildQueryString(query) {
  const params = new URLSearchParams();

  const allowedKeys = ["objective", "principle", "status", "owner", "view", "overdueOnly", "lens", "workStatus", "assigned"];

  for (const key of allowedKeys) {
    if (query[key]) params.set(key, query[key]);
  }

  return params.toString();
}

function computeSummary(rows) {
  return {
    total: rows.length,
    overdue: rows.filter((r) => r.isOverdue).length,
    blocked: rows.filter((r) => r.status === "blocked").length,
    notStarted: rows.filter((r) => r.status === "not_started").length,
    inProgress: rows.filter((r) => r.status === "in_progress").length,
    readyForReview: rows.filter((r) => r.status === "ready_for_review").length,
    complete: rows.filter((r) => r.status === "complete").length,
    needsAttention: rows.filter((r) => r.isNeedsAttention).length,
    missingEvidence: rows.filter((r) => r.isMissingEvidence).length,
    mine: rows.filter((r) => r.isMine).length,
  };
}

module.exports = {
  buildInitialProgressTracker,
  applyDashboardFilters,
  deriveRowFlags,
  normaliseQuery,
  formatDateForInput,
  buildQueryString,
  computeSummary,
};
