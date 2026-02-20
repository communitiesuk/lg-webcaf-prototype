// app/data/helpers/cycles.js
// Cycle management: ensure cycle exists + snapshot current cycle + start new one + history rows + snapshot helpers

const { deriveRowFlags } = require("./progress");

function ensureCycleExists(assessment) {
  if (!assessment) return;

  if (!assessment.cycles) assessment.cycles = [];
  if (!assessment.cycleSnapshots) assessment.cycleSnapshots = {};
  const now = new Date().toISOString();
  const fallbackStartedAt = assessment.createdAt || now;

  if (!assessment.cycle) {
    const initialId = "cycle-1";

    assessment.cycle = {
      id: initialId,
      name: "Cycle 1",
      startedAt: fallbackStartedAt,
    };

    assessment.cycles.push({
      id: assessment.cycle.id,
      name: assessment.cycle.name,
      startedAt: assessment.cycle.startedAt,
    });
    return;
  }

  if (!assessment.cycle.id) assessment.cycle.id = "cycle-1";
  if (!assessment.cycle.name) assessment.cycle.name = "Cycle 1";
  if (!assessment.cycle.startedAt) assessment.cycle.startedAt = fallbackStartedAt;

  const hasCurrentInHistory = assessment.cycles.some((c) => c && c.id === assessment.cycle.id);
  if (!hasCurrentInHistory) {
    assessment.cycles.push({
      id: assessment.cycle.id,
      name: assessment.cycle.name,
      startedAt: assessment.cycle.startedAt,
    });
  }
}

function startNewCycle(assessment, options = {}) {
  ensureCycleExists(assessment);

  const currentCycle = assessment.cycle;
  const nowIso = new Date().toISOString();

  // Snapshot current cycle state
  const snapshotId = currentCycle.id;
  assessment.cycleSnapshots[snapshotId] = {
    cycle: { ...currentCycle },
    savedAt: nowIso,
    progressTracker: deepClone(assessment.progressTracker || {}),
  };

  // Create new cycle
  const nextIndex = (assessment.cycles ? assessment.cycles.length : 1) + 1;
  const newId = `cycle-${nextIndex}`;
  const newName = options.name && options.name.trim() ? options.name.trim() : `Cycle ${nextIndex}`;

  assessment.cycle = {
    id: newId,
    name: newName,
    startedAt: nowIso,
  };

  assessment.cycles.push({
    id: assessment.cycle.id,
    name: assessment.cycle.name,
    startedAt: assessment.cycle.startedAt,
  });

  // Apply reset/carry-forward rules to progress tracker
  const carryOwners = Boolean(options.carryOwners);
  const carryCollaborators = Boolean(options.carryCollaborators);
  const resetStatuses = options.resetStatuses !== false; // default true
  const clearDueDates = options.clearDueDates !== false; // default true
  const keepEvidence = options.keepEvidence !== false; // default true

  const existing = assessment.progressTracker || {};
  const nextTracker = {};

  for (const outcomeId of Object.keys(existing)) {
    const row = existing[outcomeId] || {};

    nextTracker[outcomeId] = {
      outcomeId: row.outcomeId || outcomeId,
      outcomeCode: row.outcomeCode || "",
      title: row.title || "",
      objective: row.objective || "",
      principle: row.principle || "",

      cycleId: newId,

      ownerId: carryOwners ? (row.ownerId || "") : "",
      collaboratorIds: carryCollaborators ? (Array.isArray(row.collaboratorIds) ? row.collaboratorIds : []) : [],
      status: resetStatuses ? "not_started" : (row.status || "not_started"),
      dueDate: clearDueDates ? "" : (row.dueDate || ""),

      blocker: "",
      nextStep: "",

      evidenceRefs: keepEvidence ? (Array.isArray(row.evidenceRefs) ? row.evidenceRefs : []) : [],
      history: [],

      createdAt: row.createdAt || nowIso,
      updatedAt: nowIso,
    };
  }

  assessment.progressTracker = nextTracker;
  assessment.updatedAt = nowIso;
}

function getCycleHistoryRows(assessment) {
  ensureCycleExists(assessment);

  const cycles = Array.isArray(assessment.cycles) ? assessment.cycles : [];
  const snapshots = assessment.cycleSnapshots || {};

  return cycles
    .slice()
    .reverse()
    .map((c) => {
      const snap = snapshots[c.id] || null;
      return {
        id: c.id,
        name: c.name,
        startedAt: c.startedAt,
        hasSnapshot: Boolean(snap),
        snapshotSavedAt: snap ? snap.savedAt : "",
      };
    });
}

function getSnapshotOrNull(assessment, cycleId) {
  ensureCycleExists(assessment);
  const snapshots = assessment.cycleSnapshots || {};
  return snapshots[cycleId] || null;
}

function buildRowsFromTracker(progressTracker, statusesDef, opts = {}) {
  const tracker = progressTracker || {};
  return Object.values(tracker).map((row) => deriveRowFlags(row, statusesDef, opts));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

module.exports = {
  ensureCycleExists,
  startNewCycle,
  getCycleHistoryRows,
  getSnapshotOrNull,
  buildRowsFromTracker,
};
