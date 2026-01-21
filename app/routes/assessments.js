// app/routes/assessments.js
// Dashboard/Hub + Outcome progress record (structured updates + evidence refs + history)

const labels = require("../data/content/labels");
const statuses = require("../data/content/statuses");
const users = require("../data/seed/users");
const outcomesAD = require("../data/seed/outcomes-ad");
const outcomesBC = require("../data/seed/outcomes-bc");

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

const {
  coerceArray,
  normaliseEvidenceRefs,
  blankEvidenceRef,
  ensureAtLeastOneEvidenceRow,
} = require("../data/helpers/outcome");

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
      assessment.progressTracker = buildInitialProgressTracker({
        outcomesTree: outcomesAD,
        users,
      });
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

  // DASHBOARD (Progress tracker hub)
  router.get("/assessments/current/dashboard", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    if (!assessment.progressTracker || Object.keys(assessment.progressTracker).length === 0) {
      assessment.progressTracker = buildInitialProgressTracker({
        outcomesTree: outcomesAD,
        users,
      });
      assessment.updatedAt = new Date().toISOString();
    }

    const query = normaliseQuery(req.query);
    const currentUserId =
      req.session.data.user && req.session.data.user.id ? req.session.data.user.id : null;

    const allRowsAd = Object.values(assessment.progressTracker).map((row) => ({
      ...deriveRowFlags(row, statuses, { currentUserId }),
      lens: "ad",
      linkUrl: `/assessments/current/outcomes/${row.outcomeId}`,
      selfAssessUrl: `/self-assess/ad/${row.outcomeId}`,
      systemName: "",
    }));

    const bcRows = buildBCOutcomeRows(assessment, outcomesBC);
    const allRows = allRowsAd.concat(bcRows);

    const filteredRows = applyDashboardFilters(allRows, query, { currentUserId });

    const grouped = {};
    for (const r of filteredRows) {
      grouped[r.objective] = grouped[r.objective] || {};
      grouped[r.objective][r.principle] = grouped[r.objective][r.principle] || [];
      grouped[r.objective][r.principle].push(r);
    }

    const summaryAll = computeSummary(allRows);
    const summaryFiltered = computeSummary(filteredRows);

    const cycleStartedAt = assessment.cycle ? formatTimestamp(assessment.cycle.startedAt) : "";

    const bcSystems = buildBCSystemRows(assessment, outcomesBC);

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
      currentUserId,
      buildQueryString,
    });
  });

  router.get("/assessments/current/summary", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureAssessmentData(assessment);

    const adSummary = buildObjectiveSummary({
      outcomesTree: outcomesAD,
      assessment,
      lens: "ad",
    });
    const bcSummary = buildObjectiveSummary({
      outcomesTree: outcomesBC,
      assessment,
      lens: "bc",
    });
    const gaps = buildKeyGaps({ assessment, outcomesAD, outcomesBC });

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

    if (!row) {
      const bcOutcome = findOutcomeInTree(outcomesBC, outcomeId);
      if (bcOutcome) {
        const scope = assessment.scope || {};
        const shortlist = Array.isArray(scope.priorityShortlist) ? scope.priorityShortlist : [];
        const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
        const targetSystemId = shortlist[0] || (systems[0] ? systems[0].id : "");
        if (targetSystemId) {
          return res.redirect(`/self-assess/bc/${targetSystemId}/outcomes/${outcomeId}`);
        }
        return res.redirect("/self-assess/bc/select-system");
      }
      return res.status(404).render("pages/errors/not-found", {
        pageTitle: "Page not found",
        labels,
        message: "Outcome not found in this assessment.",
      });
    }

    // Ensure newer fields exist (backwards-safe)
    const evidenceRefs = ensureAtLeastOneEvidenceRow(normaliseEvidenceRefs(row.evidenceRefs));
    const history = Array.isArray(row.history) ? row.history : [];
    const statusMeta = getStatusMeta(statuses, row.status);
    const assignment = buildAssignmentDisplay(users, row.ownerId, row.collaboratorIds);
    const latestUpdate = getLatestHistoryEntry(history);

    const query = normaliseQuery(req.query);
    const selfAssessSummary = buildSelfAssessSummary(assessment, outcomeId);

    res.render("pages/assessments/outcome", {
      pageTitle: `${labels.outcome.pageTitlePrefix} ${row.outcomeCode}`,
      labels,
      statuses,
      users,
      row: {
        ...row,
        dueDateInput: formatDateForInput(row.dueDate),
        evidenceRefs,
        history: formatHistoryEntries(history), // newest first
      },
      statusMeta,
      ownerName: assignment.ownerName,
      collaboratorNames: assignment.collaboratorNames,
      lastUpdatedAt: latestUpdate ? formatTimestamp(latestUpdate.at) : "",
      lastUpdatedBy: latestUpdate ? latestUpdate.by : "",
      query,
      selfAssessSummary,
      error: null,
    });
  });

  // OUTCOME DETAIL (actions + save)
  router.post("/assessments/current/outcomes/:outcomeId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const outcomeId = req.params.outcomeId;
    const existing = assessment.progressTracker && assessment.progressTracker[outcomeId];

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
    const assignment = buildAssignmentDisplay(users, ownerIdValue, collaboratorIds);
    const history = Array.isArray(existing.history) ? existing.history : [];
    const latestUpdate = getLatestHistoryEntry(history);
    const selfAssessSummary = buildSelfAssessSummary(assessment, outcomeId);

    // Handle add/remove evidence actions without validation
    if (action === "addEvidence") {
      evidenceRefs.push(blankEvidenceRef());
      clearOutcomeFormAction(req);

      return res.render("pages/assessments/outcome", {
        pageTitle: `${labels.outcome.pageTitlePrefix} ${existing.outcomeCode}`,
        labels,
        statuses,
        users,
        row: {
          ...existing,
          ownerId: ownerIdValue,
          collaboratorIds,
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
        lastUpdatedAt: latestUpdate ? formatTimestamp(latestUpdate.at) : "",
        lastUpdatedBy: latestUpdate ? latestUpdate.by : "",
        query,
        selfAssessSummary,
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
        users,
        row: {
          ...existing,
          ownerId: ownerIdValue,
          collaboratorIds,
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
        lastUpdatedAt: latestUpdate ? formatTimestamp(latestUpdate.at) : "",
        lastUpdatedBy: latestUpdate ? latestUpdate.by : "",
        query,
        selfAssessSummary,
        error: null,
      });
    }

    const hasChanges = hasOutcomeChanges({
      existing,
      ownerId: ownerIdValue,
      collaboratorIds,
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

    // Require an update to keep it auditable
    if (!updateTextValue && !hasChanges) {
      errors.push({ field: "updateText", text: labels.errors.updateRequired });
    }

    if (errors.length > 0) {
      clearOutcomeFormAction(req);
      return res.render("pages/assessments/outcome", {
        pageTitle: `${labels.outcome.pageTitlePrefix} ${existing.outcomeCode}`,
        labels,
        statuses,
        users,
        row: {
          ...existing,
          ownerId: ownerIdValue,
          collaboratorIds,
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
        lastUpdatedAt: latestUpdate ? formatTimestamp(latestUpdate.at) : "",
        lastUpdatedBy: latestUpdate ? latestUpdate.by : "",
        query,
        selfAssessSummary,
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
  delete req.session.data.progressStatus;
  delete req.session.data.dueDate;
  delete req.session.data.evidenceRefs;
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

function getLatestHistoryEntry(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  return history[history.length - 1];
}

function buildAssignmentDisplay(usersList, ownerId, collaboratorIds) {
  const ownerName = getUserName(usersList, ownerId);
  const collaboratorNames = Array.isArray(collaboratorIds)
    ? collaboratorIds.map((id) => getUserName(usersList, id)).filter(Boolean)
    : [];

  return { ownerName, collaboratorNames };
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
  return flat;
}

function buildBCSystemRows(assessment, outcomesTree) {
  const scope = assessment.scope || {};
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const shortlist = Array.isArray(scope.priorityShortlist) ? scope.priorityShortlist : [];
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
      const evidenceCount = Array.isArray(saved.evidenceRefs)
        ? saved.evidenceRefs.filter(hasAnyEvidenceValue).length
        : 0;
      const hasContent = Boolean(saved.igpResponse || saved.rationale || evidenceCount > 0);
      const statusValue = saved.blocker
        ? "blocked"
        : saved.judgement
        ? "complete"
        : hasContent
        ? "in_progress"
        : "not_started";
      const statusMeta = getStatusMeta(statuses, statusValue);

      rows.push({
        lens: "bc",
        outcomeId: `${system.id}:${outcome.id}`,
        outcomeCode: outcome.code,
        title: outcome.title,
        description: outcome.description || "",
        objective: outcome.code.split(".")[0].charAt(0),
        principle: outcome.code.split(".")[0],
        ownerId: "",
        collaboratorIds: [],
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
        linkUrl: `/self-assess/bc/${system.id}/outcomes/${outcome.id}`,
        selfAssessUrl: `/self-assess/bc/${system.id}/outcomes/${outcome.id}`,
        systemName: system.name,
      });
    }
  }

  return rows;
}

function ensureAssessmentData(assessment) {
  assessment.selfAssess = assessment.selfAssess || { ad: {}, bc: {} };
  assessment.selfAssess.ad = assessment.selfAssess.ad || {};
  assessment.selfAssess.bc = assessment.selfAssess.bc || {};
  assessment.scope = assessment.scope || {};
  assessment.scope.criticalSystems = Array.isArray(assessment.scope.criticalSystems)
    ? assessment.scope.criticalSystems
    : [];
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
        lens: "A&D",
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
          lens: `B&C — ${systemName}`,
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
    statusChanged ||
    dueDateChanged ||
    blockerChanged ||
    nextStepChanged ||
    evidenceChanged
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
