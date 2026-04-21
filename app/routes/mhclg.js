// app/routes/mhclg.js
// MHCLG overview dashboard.

const labels = require("../data/content/labels");
const councils = require("../data/seed/councils");
const reporting = require("../data/seed/mhclg-reporting");
const users = require("../data/seed/users");
const engagementSeed = require("../data/seed/mhclg-engagement");
const { ensureUser, requireSignedIn } = require("../data/helpers/session");

module.exports = function (router) {
  router.get("/mhclg/dashboard", (req, res) => {
    ensureUser(req);
    if (!req.session.data.user) {
      const fallback = users.find((user) => user.role === "mhclg");
      if (fallback) {
        req.session.data.user = fallback;
        req.session.data.signedIn = true;
      }
    }
    if (!requireSignedIn(req, res)) return;

    const rows = (councils || []).map((c) => ({
      ...c,
      updatedAtDisplay: formatDateShort(c.updatedAt),
      submissionAtDisplay: formatDateShort(c.submissionAt),
      iipDueDisplay: formatDateShort(c.iipDue),
    }));

    const query = {
      stage: (req.query.stage || "").toString(),
    };

    const filteredCouncils = query.stage
      ? rows.filter((row) => row.stage === query.stage)
      : rows;

    const stages = Array.from(new Set(rows.map((row) => row.stage))).sort();

    const qualitySnapshot = [
      {
        label: "councils missing evidence references",
        value: rows.filter((row) => row.assurance === "Changes needed").length,
      },
      {
        label: "councils ready for independent assurance",
        value: rows.filter((row) => row.assurance === "Ready for independent assurance").length,
      },
      {
        label: "councils with incomplete outcomes",
        value: rows.filter((row) => row.adProgress.startsWith("0/") || row.bcProgress.startsWith("0/"))
          .length,
      },
    ];

    res.render("pages/mhclg/dashboard", {
      pageTitle: labels.mhclg.pageTitle,
      labels,
      councils: filteredCouncils,
      stages,
      query,
      reporting,
      qualitySnapshot,
      engagementSummary: buildEngagementSummary(req),
    });
  });

  router.get("/mhclg/reporting", (req, res) => {
    ensureUser(req);
    if (!requireSignedIn(req, res)) return;

    res.render("pages/mhclg/reporting", {
      pageTitle: "MHCLG reporting snapshot",
      labels,
      reporting,
    });
  });

  router.get("/mhclg/engagement", (req, res) => {
    ensureUser(req);
    if (!requireSignedIn(req, res)) return;

    const engagement = ensureEngagementData(req);
    const queue = engagement.queue.map((item) => ({
      ...item,
      lastCheckInDisplay: formatDateShort(item.lastCheckIn),
      nextCheckInDisplay: formatDateShort(item.nextCheckIn),
    }));

    const stages = Array.from(new Set((councils || []).map((row) => row.stage))).sort();

    res.render("pages/mhclg/engagement", {
      pageTitle: "Engagement queue",
      labels,
      engagement: {
        ...engagement,
        queue,
      },
      councils,
      stages,
      error: null,
      saved: Boolean(req.query.saved),
    });
  });

  router.post("/mhclg/engagement", (req, res) => {
    ensureUser(req);
    if (!requireSignedIn(req, res)) return;

    const engagement = ensureEngagementData(req);
    const councilName = (req.session.data.engagementCouncil || "").toString();
    const lastContact = (req.session.data.engagementLastContact || "").toString();
    const currentStage = (req.session.data.engagementStage || "").toString();
    const keyBlocker = (req.session.data.engagementBlocker || "").toString().trim();
    const nextAction = (req.session.data.engagementNextAction || "").toString().trim();
    const owner = (req.session.data.engagementOwner || "").toString();
    const actionTaken = (req.session.data.engagementActionTaken || "").toString().trim();
    const peerLearning = (req.session.data.engagementPeerLearning || "").toString().trim();
    const supportOutcome = (req.session.data.engagementSupportOutcome || "").toString();

    const errors = [];
    if (!councilName) errors.push({ field: "engagementCouncil", text: "Select a council." });
    if (!lastContact) errors.push({ field: "engagementLastContact", text: "Enter the last contact date." });
    if (!currentStage) errors.push({ field: "engagementStage", text: "Select the current stage." });
    if (!keyBlocker) errors.push({ field: "engagementBlocker", text: "Enter a key blocker or note none." });
    if (!nextAction) errors.push({ field: "engagementNextAction", text: "Enter the next action." });
    if (!owner) errors.push({ field: "engagementOwner", text: "Select who owns the next action." });

    if (errors.length > 0) {
      const queue = engagement.queue.map((item) => ({
        ...item,
        lastCheckInDisplay: formatDateShort(item.lastCheckIn),
        nextCheckInDisplay: formatDateShort(item.nextCheckIn),
      }));
      const stages = Array.from(new Set((councils || []).map((row) => row.stage))).sort();

      return res.render("pages/mhclg/engagement", {
        pageTitle: "Engagement queue",
        labels,
        engagement: {
          ...engagement,
          queue,
        },
        councils,
        stages,
        error: { items: errors },
        saved: false,
      });
    }

    engagement.updates.unshift({
      councilName,
      lastContact,
      currentStage,
      keyBlocker,
      nextAction,
      owner,
      actionTaken,
      peerLearning,
      supportOutcome,
    });

    delete req.session.data.engagementCouncil;
    delete req.session.data.engagementLastContact;
    delete req.session.data.engagementStage;
    delete req.session.data.engagementBlocker;
    delete req.session.data.engagementNextAction;
    delete req.session.data.engagementOwner;
    delete req.session.data.engagementActionTaken;
    delete req.session.data.engagementPeerLearning;
    delete req.session.data.engagementSupportOutcome;

    return res.redirect("/mhclg/engagement?saved=1");
  });
};

function formatDateShort(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
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

function buildEngagementSummary(req) {
  const engagement = ensureEngagementData(req);
  const queue = engagement.queue || [];
  const requests = engagement.requests || [];
  const blockers = engagement.blockers || [];

  const commonIssues = buildCommonIssues(queue, blockers);

  return {
    dueThisWeek: queue.filter((row) => row.status === "Due this week" || row.status === "Overdue").length,
    requested: queue.filter((row) => row.status === "Requested").length,
    blockersNeedingHelp: blockers.filter((row) => row.needsMhclgHelp).length,
    openRequests: requests.length,
    commonIssues,
  };
}

function buildCommonIssues(queue, blockers) {
  const counts = {};

  (queue || []).forEach((row) => {
    if (!row.scopeBlocker) return;
    counts[row.scopeBlocker] = (counts[row.scopeBlocker] || 0) + 1;
  });

  (blockers || []).forEach((row) => {
    const key = row.category ? `Assurer: ${row.category}` : "Assurer: Other";
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}
