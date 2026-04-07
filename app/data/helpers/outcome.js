// app/data/helpers/outcome.js
// Helpers for outcome detail form parsing (evidence refs, arrays, etc.)

function coerceArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normaliseEvidenceRefs(raw) {
  if (!raw) return [];

  // If already an array of objects (ideal case)
  if (Array.isArray(raw)) {
    return raw.map(normaliseEvidenceRef).filter(hasAnyEvidenceValue);
  }

  // If it's an object keyed by index (qs sometimes does this)
  if (typeof raw === "object") {
    return Object.keys(raw)
      .sort()
      .map((k) => normaliseEvidenceRef(raw[k]))
      .filter(hasAnyEvidenceValue);
  }

  return [];
}

function normaliseEvidenceRef(ref) {
  if (!ref || typeof ref !== "object") return blankEvidenceRef();

  return {
    title: (ref.title || ref.refId || "").toString().trim(),
    type: (ref.type || "").toString().trim(),
    link: (ref.link || "").toString().trim(),
    description: (ref.description || ref.note || "").toString().trim(),
  };
}

function blankEvidenceRef() {
  return { title: "", type: "", link: "", description: "" };
}

function hasAnyEvidenceValue(ref) {
  return Boolean(ref.title || ref.type || ref.link || ref.description || ref.refId || ref.note);
}

function ensureAtLeastOneEvidenceRow(evidenceRefs) {
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0) return [blankEvidenceRef()];
  return evidenceRefs;
}

module.exports = {
  coerceArray,
  normaliseEvidenceRefs,
  normaliseEvidenceRef,
  blankEvidenceRef,
  ensureAtLeastOneEvidenceRow,
};
