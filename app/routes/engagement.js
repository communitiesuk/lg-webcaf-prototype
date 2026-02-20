// app/routes/engagement.js
// Council check-in request stub.

const engagementSeed = require("../data/seed/mhclg-engagement");
const { requireSignedIn } = require("../data/helpers/session");

module.exports = function (router) {
  router.get("/engagement/request", (req, res) => {
    if (!requireCouncil(req, res)) return;

    const engagement = ensureEngagementData(req);
    const fromScope = req.query.source === "scope";
    if (fromScope) {
      if (!req.session.data.checkInReason) {
        req.session.data.checkInReason = "Optional scope check-in before objective clarification workshop.";
      }
      if (!req.session.data.checkInInternalSteps) {
        req.session.data.checkInInternalSteps = "Completed scope pack and mapped all systems.";
      }
      if (!req.session.data.checkInUrgency) {
        req.session.data.checkInUrgency = "Normal";
      }
      if (!req.session.data.checkInTopic) {
        req.session.data.checkInTopic = ["critical-systems", "assurance"];
      }
    }

    res.render("pages/engagement/request", {
      pageTitle: "Request a check-in",
      engagement,
      fromScope,
      saved: Boolean(req.query.saved),
      error: null,
    });
  });

  router.post("/engagement/request", (req, res) => {
    if (!requireCouncil(req, res)) return;

    const engagement = ensureEngagementData(req);
    const councilName =
      (req.session.data.user && req.session.data.user.orgName) || "Council";
    const reason = (req.session.data.checkInReason || "").toString().trim();
    const internalSteps = (req.session.data.checkInInternalSteps || "").toString().trim();
    const urgency = (req.session.data.checkInUrgency || "").toString();
    const preferredWeek = (req.session.data.checkInPreferredWeek || "").toString().trim();
    const topics = coerceArray(req.session.data.checkInTopic).filter(Boolean);

    const errors = [];
    if (!reason) errors.push({ field: "checkInReason", text: "Enter a reason for the check-in." });
    if (!internalSteps) errors.push({ field: "checkInInternalSteps", text: "Describe what you have already tried internally." });
    if (!urgency) errors.push({ field: "checkInUrgency", text: "Select an urgency level." });

    if (errors.length > 0) {
      return res.render("pages/engagement/request", {
        pageTitle: "Request a check-in",
        engagement,
        fromScope: false,
        saved: false,
        error: { items: errors },
      });
    }

    engagement.requests.push({
      councilName,
      reason,
      internalSteps,
      urgency,
      preferredWeek: preferredWeek || "Not specified",
      requestedAt: new Date().toISOString().slice(0, 10),
      topics,
    });

    engagement.queue.push({
      councilName,
      status: "Requested",
      source: "Council request",
      lastCheckIn: "",
      nextCheckIn: "",
      blockers: 0,
      notes: `${reason}${internalSteps ? ` (Internal steps: ${internalSteps})` : ""}`,
    });

    if (topics.includes("critical-systems")) {
      engagement.guidance.push({
        councilName,
        note: "Council requested support with critical systems selection (informal guidance).",
        source: "Council request",
        date: new Date().toISOString().slice(0, 10),
      });
    }

    delete req.session.data.checkInReason;
    delete req.session.data.checkInInternalSteps;
    delete req.session.data.checkInUrgency;
    delete req.session.data.checkInPreferredWeek;
    delete req.session.data.checkInTopic;

    return res.redirect("/engagement/request?saved=1");
  });
};

function requireCouncil(req, res) {
  if (!requireSignedIn(req, res)) return false;
  const role = req.session && req.session.data && req.session.data.user ? req.session.data.user.role : "";
  if (role === "council") return true;
  if (role === "mhclg") {
    res.redirect("/mhclg/dashboard");
    return false;
  }
  if (role === "assurer") {
    res.redirect("/assurer/queue");
    return false;
  }
  res.redirect("/research-start");
  return false;
}

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

function coerceArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}
