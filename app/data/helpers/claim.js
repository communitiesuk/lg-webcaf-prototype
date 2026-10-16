// app/data/helpers/claim.js
//
// Helpers for the "Claim your council" (Claim v3) prototype section.
// Owns Claim's chrome (pre-access "signed in, no council" and post-access "access granted")
// and its session state (req.session.data.claim). Domain recognition reads the fictional
// example data; council state (has users / already has access / review outcome) comes from
// scenario flags set by the prototype-only controls. See docs/claim-session-keys.md.

const {
  getCouncilById,
  getCouncilByName,
  councilsForEmail,
  domainOf,
} = require("../claim-example-data");

const CLAIM_SERVICE_NAME = "Assess and manage your council's cyber resilience";
// Sign out clears the Beta service state and shows the "You have signed out" page (G10).
const CLAIM_SIGN_OUT_HREF = "/get-started/sign-out";
const HOLDING_HREF = "/setup/not-in-this-prototype";

// Initialise the Claim session namespace (idempotent). Does not seed example values —
// the One Login stand-in and scenario switcher set oneLoginEmail, arrival and the flags.
function ensureClaim(sessionData) {
  if (!sessionData) return null;
  if (!sessionData.claim) sessionData.claim = {};
  return sessionData.claim;
}

// Pre-access chrome: service name + "Sign out" only, no council identity line.
function applyClaimChrome(req, res) {
  res.locals.serviceName = CLAIM_SERVICE_NAME;
  res.locals.showNavigation = true;
  res.locals.currentUser = null;
  res.locals.navigation = [{ text: "Sign out", href: CLAIM_SIGN_OUT_HREF }];
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
}

// Post-access chrome (frames 07, 07b, 17): full nav + "Name · Council" identity.
function applyClaimGrantedChrome(req, res, person, councilName) {
  res.locals.serviceName = CLAIM_SERVICE_NAME;
  res.locals.showNavigation = true;
  res.locals.currentUser = { name: (person && person.fullName) || "", orgName: councilName || "" };
  res.locals.navigation = [
    { text: "Dashboard", href: "/dashboard" },
    { text: "Your council", href: "/setup/task-list" },
    { text: "Assessments", href: "/self-assessment" },
    { text: "People", href: HOLDING_HREF },
    { text: "Switch council", href: "/choose-council" },
    { text: "Sign out", href: CLAIM_SIGN_OUT_HREF },
  ];
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
}

// --- Recognition + routing helpers --------------------------------------------------

// Is the signed-in email recognised for the chosen council?
function isEmailRecognisedForCouncil(email, councilId) {
  if (!councilId) return false;
  return councilsForEmail(email).indexOf(councilId) !== -1;
}

// Does the email domain match more than one council (shared-service case, frame 19)?
function emailMatchesManyCouncils(email) {
  return councilsForEmail(email).length > 1;
}

module.exports = {
  CLAIM_SERVICE_NAME,
  CLAIM_SIGN_OUT_HREF,
  HOLDING_HREF,
  ensureClaim,
  applyClaimChrome,
  applyClaimGrantedChrome,
  getCouncilById,
  getCouncilByName,
  councilsForEmail,
  domainOf,
  isEmailRecognisedForCouncil,
  emailMatchesManyCouncils,
};
