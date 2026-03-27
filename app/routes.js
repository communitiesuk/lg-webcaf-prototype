// app/routes.js
// GOV.UK Prototype Kit routes entrypoint

const govukPrototypeKit = require("govuk-prototype-kit");
const router = govukPrototypeKit.requests.setupRouter();
const { buildNavigation } = require("./data/helpers/navigation");
const { buildBreadcrumbs, buildProgress } = require("./data/helpers/journey");
const users = require("./data/seed/users");
const { CAF_DEFAULT_VERSION, getOutcomesForVersion } = require("./data/helpers/caf-version");
const { buildInitialProgressTracker } = require("./data/helpers/progress");
const { getSavedAssessment, saveAssessment } = require("./data/helpers/round-two-account-store");

// Defensive guard for prototype stability:
// if a route accidentally tries to send a second response,
// skip it instead of crashing the process.
router.use((req, res, next) => {
  const originals = {
    render: res.render.bind(res),
    redirect: res.redirect.bind(res),
    send: res.send.bind(res),
    json: res.json.bind(res),
  };

  function guard(name, fn) {
    return function guardedResponse(...args) {
      if (res.headersSent) {
        console.warn(
          `[response-guard] prevented duplicate ${name}: ${req.method} ${req.originalUrl}`
        );
        return res;
      }
      return fn(...args);
    };
  }

  res.render = guard("render", originals.render);
  res.redirect = guard("redirect", originals.redirect);
  res.send = guard("send", originals.send);
  res.json = guard("json", originals.json);
  next();
});

router.use((req, res, next) => {
  res.on("finish", () => {
    const sessionData = req.session && req.session.data ? req.session.data : null;
    if (!sessionData || sessionData.researchRound !== "round-2") return;
    const email = sessionData.user && sessionData.user.email ? sessionData.user.email : "";
    if (!email) return;
    if (sessionData.assessment && sessionData.assessment.id) {
      saveAssessment(email, sessionData.assessment);
    }
  });
  next();
});

// Debug helpers
router.get("/debug/plain", (req, res) => {
  res
    .status(200)
    .send("<h1>Debug is working</h1><p>If you can see this, routes are loading.</p>");
});

router.get("/health", (req, res) => res.status(200).send("ok"));

router.use((req, res, next) => {
  const signedIn = Boolean(req.session && req.session.data && req.session.data.signedIn);
  res.locals.currentPath = req.path;
  const role =
    req.session && req.session.data && req.session.data.user ? req.session.data.user.role : "";
  const currentUser = signedIn ? req.session.data.user : null;
  res.locals.currentUser = currentUser;
  const researchRound =
    req.session && req.session.data ? normaliseResearchRound(req.session.data.researchRound) : "round-1";
  res.locals.researchRound = researchRound;
  res.locals.researchRoundLabel = researchRound === "round-2" ? "Round 2" : "Round 1";
  if (signedIn && !currentUser) {
    req.session.data.signedIn = false;
  }
  if (!signedIn && req.session && req.session.data && req.session.data.user) {
    delete req.session.data.user;
  }
  res.locals.showUserSwitcher = false;

  res.locals.headerNavigation = buildHeaderNavigation({
    signedIn,
    role,
    researchRound,
  });

  const hideNav = req.path === "/entry";
  res.locals.showNavigation = signedIn && !hideNav;
  res.locals.navigation = signedIn && !hideNav ? buildNavigation(req.path, role) : [];
  res.locals.showJourney = signedIn && role !== "mhclg" && role !== "assurer" && !hideNav;
  res.locals.breadcrumbs = res.locals.showJourney
    ? buildBreadcrumbs(req.path, { researchRound, role })
    : [];
  res.locals.progress = res.locals.showJourney ? buildProgress(req.path) : null;
  res.locals.showJourneyTaskListLink = false;

  if (signedIn && role) {
    const isStatic =
      req.path.startsWith("/assets") ||
      req.path.startsWith("/public") ||
      req.path.startsWith("/govuk");
    const isSafe =
      ["/research-rounds", "/research-start", "/start", "/guidance", "/my-account", "/logout"].some(
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
      "/engagement",
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
require("./routes/research-rounds")(router);
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
router.get("/", (req, res) => res.redirect("/research-rounds"));

router.get("/round-2/start", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.researchRound = "round-2";
  res.render("pages/round-2/start", {
    pageTitle: "Start Round 2",
  });
});

router.post("/round-2/start", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.researchRound = "round-2";
  return res.redirect("/round-2/sign-in");
});

router.get("/round-2/access", (req, res) => {
  return res.redirect("/round-2/sign-in");
});

router.get("/round-2/sign-in", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.researchRound = "round-2";
  res.render("pages/round-2/auth", {
    pageTitle: "Sign in",
    mode: "sign-in",
    heading: "Sign in",
    submitText: "Sign in",
    secondaryHref: "/round-2/register",
    secondaryText: "Register for the service",
    defaults: {
      name: (req.session.data.round2AuthName || "").toString(),
      email: (req.session.data.round2AuthEmail || "").toString(),
    },
    error: null,
  });
});

router.post("/round-2/sign-in", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.researchRound = "round-2";
  const name = (req.session.data.round2AuthName || "").toString().trim();
  const email = (req.session.data.round2AuthEmail || "").toString().trim();
  const errors = [];
  if (!name) errors.push({ field: "round2AuthName", text: "Enter your name." });
  if (!email) errors.push({ field: "round2AuthEmail", text: "Enter your email address." });

  if (errors.length > 0) {
    return res.render("pages/round-2/auth", {
      pageTitle: "Sign in",
      mode: "sign-in",
      heading: "Sign in",
      submitText: "Sign in",
      secondaryHref: "/round-2/register",
      secondaryText: "Register for the service",
      defaults: { name, email },
      error: { items: errors },
    });
  }

  signInRoundTwoCouncil(req, {
    name,
    email,
    authMode: "sign-in",
  });
  delete req.session.data.round2AuthName;
  delete req.session.data.round2AuthEmail;
  return res.redirect("/entry");
});

router.get("/round-2/register", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.researchRound = "round-2";
  res.render("pages/round-2/auth", {
    pageTitle: "Register",
    mode: "register",
    heading: "Register for the service",
    submitText: "Register and continue",
    secondaryHref: "/round-2/sign-in",
    secondaryText: "Sign in instead",
    defaults: {
      name: (req.session.data.round2AuthName || "").toString(),
      email: (req.session.data.round2AuthEmail || "").toString(),
    },
    error: null,
  });
});

router.post("/round-2/register", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.researchRound = "round-2";
  const name = (req.session.data.round2AuthName || "").toString().trim();
  const email = (req.session.data.round2AuthEmail || "").toString().trim();
  const errors = [];
  if (!name) errors.push({ field: "round2AuthName", text: "Enter your name." });
  if (!email) errors.push({ field: "round2AuthEmail", text: "Enter your email address." });

  if (errors.length > 0) {
    return res.render("pages/round-2/auth", {
      pageTitle: "Register",
      mode: "register",
      heading: "Register for the service",
      submitText: "Register and continue",
      secondaryHref: "/round-2/sign-in",
      secondaryText: "Sign in instead",
      defaults: { name, email },
      error: { items: errors },
    });
  }

  signInRoundTwoCouncil(req, {
    name,
    email,
    authMode: "register",
  });
  delete req.session.data.round2AuthName;
  delete req.session.data.round2AuthEmail;
  return res.redirect("/entry");
});

router.get("/research-start", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  const shouldReset = (req.query.reset || "").toString() === "1";
  if (shouldReset) {
    req.session.data = {};
  }
  const researchRound = normaliseResearchRound(req.query.round || req.session.data.researchRound);
  req.session.data.researchRound = researchRound;
  if (researchRound === "round-2") {
    return res.redirect("/round-2/sign-in");
  }
  const nextPath = sanitiseLocalPath((req.query.next || "").toString());
  res.render("pages/research-start", {
    pageTitle: "Research start",
    users,
    nextPath,
    researchRound,
    researchRoundLabel: researchRound === "round-2" ? "Round 2" : "Round 1",
  });
});

router.get("/sign-out", (req, res) => {
  const redirectPath = getSignOutRedirect(req);
  if (req.session && typeof req.session.destroy === "function") {
    return req.session.destroy(() => res.redirect(redirectPath));
  }
  return res.redirect(redirectPath);
});

router.get("/guidance", (req, res) => res.redirect(getSignedInLanding(req)));
router.get("/my-account", (req, res) => res.redirect(getSignedInLanding(req)));
router.get("/logout", (req, res) => {
  const redirectPath = getSignOutRedirect(req);
  if (req.session && typeof req.session.destroy === "function") {
    return req.session.destroy(() => res.redirect(redirectPath));
  }
  return res.redirect(redirectPath);
});
router.get("/organisation-details", (req, res) => res.redirect("/entry"));
router.get("/manage-users", (req, res) => res.redirect("/entry"));

router.post("/research-start", (req, res) => {
  if (!req.session || !req.session.data) {
    req.session = { data: {} };
  }
  const selectedId = (req.session.data.researchUserId || "").toString();
  const nextPath = sanitiseLocalPath((req.session.data.nextPath || "").toString());
  const researchRound = normaliseResearchRound(req.session.data.researchRound);
  if (researchRound === "round-2") {
    return res.redirect("/round-2/sign-in");
  }
  const selected = users.find((user) => user.id === selectedId);
  if (!selected) {
    return res.render("pages/research-start", {
      pageTitle: "Research start",
      users,
      nextPath,
      researchRound,
      researchRoundLabel: researchRound === "round-2" ? "Round 2" : "Round 1",
      error: {
        items: [{ field: "researchUserId", text: "Select a role to start the journey." }],
      },
    });
  }
  if (selected && selected.id === "u-1") {
    req.session.data = {
      pendingUserId: selected.id,
      pendingNextPath: nextPath,
      pendingResearchRound: researchRound,
      researchRound,
    };
    return res.redirect("/research-start/sign-in-details");
  }

  req.session.data = {
    user: selected,
    signedIn: true,
    researchRound,
  };

  if (selected && selected.role === "mhclg") return res.redirect("/mhclg/dashboard");
  if (selected && selected.role === "assurer") {
    seedAssurerAssessment(req.session.data, selected);
    return res.redirect("/assurer/queue");
  }
  if (nextPath) return res.redirect(nextPath);
  return res.redirect("/entry/start-new?returnTo=/prepare");
});

router.get("/research-start/sign-in-details", (req, res) => {
  if (!req.session || !req.session.data) {
    req.session = { data: {} };
  }
  const pendingUserId = (req.session.data.pendingUserId || "").toString();
  const selected = users.find((user) => user.id === pendingUserId);
  if (!selected) return res.redirect("/research-start");
  const researchRound = normaliseResearchRound(req.session.data.pendingResearchRound);
  if (researchRound === "round-2") {
    return res.redirect("/round-2/sign-in");
  }

  const defaults = {
    name: (req.session.data.signInName || selected.name || "").toString(),
    email: (req.session.data.signInEmail || selected.email || "").toString(),
  };

  return res.render("pages/research-sign-in-details", {
    pageTitle: "Sign in",
    selected,
    defaults,
    researchRound,
    researchRoundLabel: researchRound === "round-2" ? "Round 2" : "Round 1",
  });
});

router.post("/research-start/sign-in-details", (req, res) => {
  if (!req.session || !req.session.data) {
    req.session = { data: {} };
  }
  const pendingUserId = (req.session.data.pendingUserId || "").toString();
  const pendingNextPath = sanitiseLocalPath((req.session.data.pendingNextPath || "").toString());
  const pendingResearchRound = normaliseResearchRound(req.session.data.pendingResearchRound);
  if (pendingResearchRound === "round-2") {
    return res.redirect("/round-2/sign-in");
  }
  const selected = users.find((user) => user.id === pendingUserId);
  if (!selected) return res.redirect("/research-start");

  const enteredName = (req.session.data.signInName || "").toString().trim();
  const enteredEmail = (req.session.data.signInEmail || "").toString().trim();

  req.session.data = {
    user: {
      ...selected,
      name: enteredName || selected.name,
      email: enteredEmail,
    },
    signedIn: true,
    researchRound: pendingResearchRound,
  };

  if (pendingNextPath) return res.redirect(pendingNextPath);
  return res.redirect("/entry/start-new?returnTo=/prepare");
});

function seedAssurerAssessment(sessionData, user) {
  if (!sessionData) return;
  if (sessionData.assessment && sessionData.assessment.id) return;

  const { ad } = getOutcomesForVersion(sessionData.assessment || CAF_DEFAULT_VERSION);
  const assessment = {
    id: "current",
    cafVersion: CAF_DEFAULT_VERSION,
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
    progressTracker: buildInitialProgressTracker({ outcomesTree: ad, users }),
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

function signInRoundTwoCouncil(req, { name, email, authMode }) {
  const defaultCouncilUser = users.find((user) => user.id === "u-1") || users[0];
  const savedAssessment = getSavedAssessment(email);
  req.session.data = {
    user: {
      ...defaultCouncilUser,
      name: name || defaultCouncilUser.name,
      email,
    },
    signedIn: true,
    researchRound: "round-2",
    round2AuthMode: authMode,
  };
  if (savedAssessment) {
    req.session.data.assessment = savedAssessment;
  }
}

function buildHeaderNavigation({ signedIn, role, researchRound }) {
  if (!signedIn) return [];

  if (role === "mhclg") {
    return [
      { text: "Dashboard", href: "/mhclg/dashboard" },
      { text: "Sign out", href: "/logout" },
    ];
  }

  if (role === "assurer") {
    return [
      { text: "Queue", href: "/assurer/queue" },
      { text: "Sign out", href: "/logout" },
    ];
  }

  if (researchRound === "round-2") {
    return [
      { text: "My account", href: "/entry" },
      { text: "Sign out", href: "/logout" },
    ];
  }

  return [
    { text: "My account", href: "/entry" },
    { text: "Sign out", href: "/logout" },
  ];
}

function getSignOutRedirect(req) {
  const researchRound =
    req.session && req.session.data ? normaliseResearchRound(req.session.data.researchRound) : "round-1";
  return researchRound === "round-2" ? "/research-rounds" : "/research-start?reset=1";
}

function getSignedInLanding(req) {
  const user = req && req.session && req.session.data ? req.session.data.user : null;
  if (!user || !req.session.data.signedIn) return "/research-start";
  if (user.role === "mhclg") return "/mhclg/dashboard";
  if (user.role === "assurer") return "/assurer/queue";
  return "/entry";
}

function sanitiseLocalPath(input) {
  const path = (input || "").toString().trim();
  if (!path) return "";
  if (!path.startsWith("/") || path.startsWith("//")) return "";
  if (path.startsWith("/research-start")) return "";
  return path;
}

function normaliseResearchRound(input) {
  return input === "round-2" ? "round-2" : "round-1";
}

module.exports = router;
