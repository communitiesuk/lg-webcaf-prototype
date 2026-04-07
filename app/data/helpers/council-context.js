const {
  applyCouncilDetails,
  buildCouncilAccount,
  ensurePrototypeSession,
  getCurrentCouncil,
} = require("./prototype-session");

function formatCouncilName(value) {
  return (value || "").toString().trim().replace(/\s+/g, " ");
}

function getStoredCouncilName(sessionData) {
  if (!sessionData) return "";
  const council = getCurrentCouncil(sessionData);
  return formatCouncilName(council.name);
}

function isCouncilSetupComplete(sessionData) {
  if (!sessionData) return false;
  const council = getCurrentCouncil(sessionData);
  return Boolean(council && council.setupStatus === "complete" && getStoredCouncilName(sessionData));
}

function applyCouncilContext(sessionData, councilNameInput) {
  if (!sessionData) return "";
  ensurePrototypeSession(sessionData);
  const councilName = formatCouncilName(councilNameInput);
  if (!councilName) return "";
  applyCouncilDetails(sessionData, {
    name: councilName,
    setupStatus: "complete",
  });

  if (sessionData.assessment) {
    sessionData.assessment.councilName = councilName;
  }

  return councilName;
}

function getCouncilDisplayName(sessionData, fallback = "Your council") {
  return getStoredCouncilName(sessionData) || fallback;
}

function getCouncilEmailDomain(sessionData, fallback = "your-council.gov.uk") {
  if (!sessionData) return fallback;
  const account = buildCouncilAccount(sessionData);
  return (account.allowedDomains && account.allowedDomains[0]) || fallback;
}

module.exports = {
  applyCouncilContext,
  formatCouncilName,
  getCouncilEmailDomain,
  getCouncilDisplayName,
  getStoredCouncilName,
  isCouncilSetupComplete,
};
