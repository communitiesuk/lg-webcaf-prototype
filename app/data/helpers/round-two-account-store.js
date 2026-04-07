const store = new Map();

function normaliseEmail(email) {
  return (email || "").toString().trim().toLowerCase();
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function getSavedAssessment(email) {
  const key = normaliseEmail(email);
  if (!key || !store.has(key)) return null;
  return clone(store.get(key));
}

function saveAssessment(email, assessment) {
  const key = normaliseEmail(email);
  if (!key || !assessment || !assessment.id) return;
  store.set(key, clone(assessment));
}

function clearAssessment(email) {
  const key = normaliseEmail(email);
  if (!key) return;
  store.delete(key);
}

function clearAllAssessments() {
  store.clear();
}

module.exports = {
  getSavedAssessment,
  saveAssessment,
  clearAssessment,
  clearAllAssessments,
};
