// app/routes.js
// GOV.UK Prototype Kit routes entrypoint

const govukPrototypeKit = require("govuk-prototype-kit");
const router = govukPrototypeKit.requests.setupRouter();
const { buildNavigation } = require("./data/helpers/navigation");
const { buildBreadcrumbs, buildProgress } = require("./data/helpers/journey");
const users = require("./data/seed/users");
const outcomesAD = require("./data/seed/outcomes-ad");
const { buildInitialProgressTracker } = require("./data/helpers/progress");

// Debug helpers
router.get("/debug/plain", (req, res) => {
  res
    .status(200)
    .send("<h1>Debug is working</h1><p>If you can see this, routes are loading.</p>");
});

router.get("/health", (req, res) => res.status(200).send("ok"));

router.use((req, res, next) => {
  const signedIn = Boolean(req.session && req.session.data && req.session.data.signedIn);
  const role =
    req.session && req.session.data && req.session.data.user ? req.session.data.user.role : "";
  const currentUser = signedIn ? req.session.data.user : null;
  res.locals.currentUser = currentUser;
  if (signedIn && !currentUser) {
    req.session.data.signedIn = false;
  }
  if (!signedIn && req.session && req.session.data && req.session.data.user) {
    delete req.session.data.user;
  }
  res.locals.showUserSwitcher = false;

  const landing =
    role === "mhclg" ? "/mhclg/dashboard" : role === "assurer" ? "/assurer/queue" : "/entry";
  res.locals.headerNavigation = [
    { text: "Guidance", href: "/guidance" },
    { text: "My account", href: "/my-account" },
    { text: "Logout", href: "/logout" },
  ];

  const hideNav = req.path === "/entry";
  res.locals.showNavigation = signedIn && !hideNav;
  res.locals.navigation = signedIn && !hideNav ? buildNavigation(req.path, role) : [];
  res.locals.showJourney = signedIn && role !== "mhclg" && role !== "assurer" && !hideNav;
  res.locals.breadcrumbs = res.locals.showJourney ? buildBreadcrumbs(req.path) : [];
  res.locals.progress = res.locals.showJourney ? buildProgress(req.path) : null;

  if (signedIn && role) {
    const isStatic =
      req.path.startsWith("/assets") ||
      req.path.startsWith("/public") ||
      req.path.startsWith("/govuk");
    const isSafe =
      ["/research-start", "/start", "/guidance", "/my-account", "/logout"].some(
        (path) => req.path === path || req.path.startsWith(path + "/")
      );
    const councilPrefixes = [
      "/entry",
      "/stages",
      "/prepare",
      "/profile",
      "/assessments",
      "/self-assess",
      "/evidence-library",
      "/assurance-review",
      "/improvement-plan",
      "/submit-progress",
      "/submit-complete",
    ];
    const isCouncilArea = councilPrefixes.some(
      (prefix) => req.path === prefix || req.path.startsWith(prefix + "/")
    );

    if (!isStatic && !isSafe) {
      if (role === "mhclg" && !req.path.startsWith("/mhclg")) {
        return res.redirect("/mhclg/dashboard");
      }
      if (role === "assurer") {
        const allowedAssurer =
          req.path.startsWith("/assurer") ||
          req.path.startsWith("/improvement-plan/generate") ||
          req.path.startsWith("/improvement-plan/sign-off");
        if (!allowedAssurer && isCouncilArea) {
          return res.redirect("/assurer/queue");
        }
      }
      if (role === "council") {
        const isMhclgArea = req.path.startsWith("/mhclg");
        const isAssurerArea = req.path.startsWith("/assurer");
        if (isMhclgArea || isAssurerArea) {
          return res.status(403).render("pages/errors/restricted", {
            pageTitle: "Access restricted",
          });
        }
      }
    }
  }
  next();
});

// Journey modules
require("./routes/debug")(router);
require("./routes/start")(router);
require("./routes/sign-in")(router);
require("./routes/entry")(router);
require("./routes/flow")(router);
require("./routes/stages")(router);
require("./routes/assessments")(router);
require("./routes/assurer")(router);
require("./routes/mhclg")(router);
require("./routes/engagement")(router);
require("./routes/cycles")(router);
require("./routes/export")(router);

// Root redirect
router.get("/", (req, res) => res.redirect("/research-start"));

router.get("/research-start", (req, res) => {
  if (!req.session) req.session = {};
  req.session.data = {};
  res.render("pages/research-start", {
    pageTitle: "Research start",
    users,
  });
});

router.get("/sign-out", (req, res) => {
  res.redirect("/start");
});

router.get("/guidance", (req, res) => res.redirect("/research-start"));
router.get("/my-account", (req, res) => res.redirect("/research-start"));
router.get("/logout", (req, res) => res.redirect("/research-start"));
router.get("/organisation-details", (req, res) => res.redirect("/entry"));
router.get("/manage-users", (req, res) => res.redirect("/entry"));

router.post("/research-start", (req, res) => {
  if (!req.session || !req.session.data) {
    req.session = { data: {} };
  }
  const selectedId = (req.session.data.researchUserId || "").toString();
  const selected = users.find((user) => user.id === selectedId);
  if (!selected) {
    return res.render("pages/research-start", {
      pageTitle: "Research start",
      users,
      error: {
        items: [{ field: "researchUserId", text: "Select a role to start the journey." }],
      },
    });
  }
  if (selected) {
    req.session.data.user = selected;
    req.session.data.signedIn = true;
  }
  delete req.session.data.researchUserId;

  if (selected && selected.role === "mhclg") return res.redirect("/mhclg/dashboard");
  if (selected && selected.role === "assurer") {
    seedAssurerAssessment(req.session.data, selected);
    return res.redirect("/assurer/queue");
  }
  return res.redirect("/start");
});

function seedAssurerAssessment(sessionData, user) {
  if (!sessionData) return;
  if (sessionData.assessment && sessionData.assessment.id) return;

  const assessment = {
    id: "current",
    stage: {
      understandCAFComplete: true,
      prepareScopeComplete: true,
    },
    scope: {
      essentialServices: [],
      criticalSystems: [],
      mappings: [],
      priority: [],
      priorityShortlist: [],
      servicesConfirmed: true,
    },
    prepare: {
      guidanceRead: true,
      contributorsConfirmed: true,
      cafReviewed: true,
    },
    profile: { reviewed: true },
    selfAssess: { ad: {}, bc: {} },
    evidenceLibrary: [],
    assurance: { status: "", feedback: "", reviewedAt: "" },
    improvementPlan: { actions: [] },
    submission: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progressTracker: buildInitialProgressTracker({ outcomesTree: outcomesAD, users }),
  };

  const ready = assessment.progressTracker["A1a"];
  if (ready) {
    ready.status = "ready_for_review";
    ready.ownerId = user && user.id ? user.id : "u-1";
    ready.evidenceRefs = [
      { refId: "REF-100", type: "Policy", link: "", note: "Latest policy pack." },
    ];
    ready.history = [
      {
        at: new Date().toISOString(),
        by: "Alex Taylor",
        summary: "Marked ready for assurance review.",
        status: "ready_for_review",
        statusLabel: "Ready for review",
        dueDate: "",
        blocker: "",
        nextStep: "Assurer review",
      },
    ];
  }

  const missing = assessment.progressTracker["A1b"];
  if (missing) {
    missing.status = "in_progress";
    missing.ownerId = "u-2";
    missing.evidenceRefs = [];
  }

  const readyTwo = assessment.progressTracker["A2a"];
  if (readyTwo) {
    readyTwo.status = "ready_for_review";
    readyTwo.ownerId = "u-3";
    readyTwo.evidenceRefs = [
      { refId: "RISK-200", type: "Risk assessment", link: "", note: "Latest risk review." },
    ];
    readyTwo.history = [
      {
        at: new Date().toISOString(),
        by: "Samira Khan",
        summary: "Evidence pack prepared for review.",
        status: "ready_for_review",
        statusLabel: "Ready for review",
        dueDate: "",
        blocker: "",
        nextStep: "Assurer review",
      },
    ];
  }

  const missingTwo = assessment.progressTracker["D1a"];
  if (missingTwo) {
    missingTwo.status = "blocked";
    missingTwo.ownerId = "u-1";
    missingTwo.blocker = "Waiting on incident response exercise evidence.";
    missingTwo.evidenceRefs = [];
    missingTwo.history = [
      {
        at: new Date().toISOString(),
        by: "Alex Taylor",
        summary: "Blocked while waiting for exercise evidence.",
        status: "blocked",
        statusLabel: "Blocked",
        dueDate: "",
        blocker: missingTwo.blocker,
        nextStep: "Complete exercise and add evidence reference.",
      },
    ];
  }

  sessionData.assessment = assessment;
}

module.exports = router;
