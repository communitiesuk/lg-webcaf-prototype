// app/data/helpers/session.js
// Session helpers used by route modules
const { ensurePrototypeSession } = require("./prototype-session");

function ensureUser(req) {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  ensurePrototypeSession(req.session.data);
}

function requireSignedIn(req, res) {
  ensureUser(req);
  if (!req.session.data.signedIn || !req.session.data.user) {
    res.redirect("/research-start");
    return false;
  }
  return true;
}

function ensureAssessment(req) {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};

  return Boolean(req.session.data.assessment && req.session.data.assessment.id);
}

function getAssessmentOrRedirect(req, res) {
  if (!ensureAssessment(req)) {
    res.redirect("/entry");
    return null;
  }
  return req.session.data.assessment;
}

module.exports = {
  ensureUser,
  requireSignedIn,
  ensureAssessment,
  getAssessmentOrRedirect,
};
