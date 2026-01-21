// app/routes/engagement.js
// Council check-in request stub.

const engagementSeed = require("../data/seed/mhclg-engagement");
const { requireSignedIn } = require("../data/helpers/session");

module.exports = function (router) {
  router.get("/engagement/request", (req, res) => {
    if (!requireSignedIn(req, res)) return;

    const engagement = ensureEngagementData(req);
    res.render("pages/engagement/request", {
      pageTitle: "Request a check-in",
      engagement,
      saved: Boolean(req.query.saved),
      error: null,
    });
  });

  router.post("/engagement/request", (req, res) => {
    if (!requireSignedIn(req, res)) return;

    const engagement = ensureEngagementData(req);
    const councilName =
      (req.session.data.user && req.session.data.user.orgName) || "Council";
    const reason = (req.session.data.checkInReason || "").toString().trim();
    const urgency = (req.session.data.checkInUrgency || "").toString();
    const preferredWeek = (req.session.data.checkInPreferredWeek || "").toString().trim();

    const errors = [];
    if (!reason) errors.push({ field: "checkInReason", text: "Enter a reason for the check-in." });
    if (!urgency) errors.push({ field: "checkInUrgency", text: "Select an urgency level." });

    if (errors.length > 0) {
      return res.render("pages/engagement/request", {
        pageTitle: "Request a check-in",
        engagement,
        saved: false,
        error: { items: errors },
      });
    }

    engagement.requests.push({
      councilName,
      reason,
      urgency,
      preferredWeek: preferredWeek || "Not specified",
      requestedAt: new Date().toISOString().slice(0, 10),
    });

    engagement.queue.push({
      councilName,
      status: "Requested",
      source: "Council request",
      lastCheckIn: "",
      nextCheckIn: "",
      blockers: 0,
      notes: reason,
    });

    delete req.session.data.checkInReason;
    delete req.session.data.checkInUrgency;
    delete req.session.data.checkInPreferredWeek;

    return res.redirect("/engagement/request?saved=1");
  });
};

function ensureEngagementData(req) {
  if (!req.session || !req.session.data) return cloneEngagementSeed();
  if (!req.session.data.engagement) {
    req.session.data.engagement = cloneEngagementSeed();
  }
  return req.session.data.engagement;
}

function cloneEngagementSeed() {
  return JSON.parse(JSON.stringify(engagementSeed));
}
