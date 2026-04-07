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
const {
  ACCESS_ROLES,
  ensureRoundTwoAccessState,
  evaluateRegistrationRequest,
  findUserRecordByEmail,
  normaliseEmail,
  storePendingAccessRequest,
} = require("./data/helpers/round-two-access");
const {
  getActiveRole,
  getPermissionSummary,
  getRoleLabel,
  getRolePermissionRows,
  getSupportedRoles,
  syncUserRoleState,
  userHasPermission,
  PERMISSIONS,
} = require("./data/helpers/roles");
const { getAssurerAccessContext } = require("./data/helpers/assurer-access");
const { isRoundTwoOnboardingComplete } = require("./data/helpers/phase-progress");
const {
  applyCouncilContext,
  getCouncilDisplayName,
  getStoredCouncilName,
  isCouncilSetupComplete,
} = require("./data/helpers/council-context");
const {
  buildCouncilAccount,
  ensurePrototypeSession,
  getCafLead,
  getCouncilUsers,
  getCurrentCouncil,
  getCurrentUser,
  setSignedInCouncilUser,
  setSignedInState,
  switchCurrentUserRole,
} = require("./data/helpers/prototype-session");

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
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  ensurePrototypeSession(req.session.data);
  const signedIn = Boolean(req.session.data.signedIn);
  res.locals.currentPath = req.path;
  const currentUser = signedIn ? getCurrentUser(req.session.data) : null;
  const currentCouncil = getCurrentCouncil(req.session.data);
  const councilUsers = getCouncilUsers(req.session.data);
  const cafLead = getCafLead(req.session.data);
  const role = currentUser ? currentUser.role : "";
  const activeRole = currentUser ? getActiveRole(currentUser) : "";
  res.locals.currentUser = currentUser;
  res.locals.currentCouncil = currentCouncil;
  res.locals.councilUsers = councilUsers;
  res.locals.cafLead = cafLead;
  res.locals.currentAccount = buildCouncilAccount(req.session.data);
  res.locals.activeRole = activeRole;
  res.locals.activeRoleLabel = activeRole ? getRoleLabel(activeRole) : "";
  res.locals.assignedRoles = currentUser && Array.isArray(currentUser.roleLabels) ? currentUser.roleLabels : [];
  res.locals.supportedRoles = getSupportedRoles();
  res.locals.rolePermissionRows = getRolePermissionRows();
  res.locals.permissionSummary = getPermissionSummary();
  res.locals.currentPermissions = currentUser ? {
    canEditContent: userHasPermission(currentUser, PERMISSIONS.EDIT_CONTENT),
    canReviewContent: userHasPermission(currentUser, PERMISSIONS.REVIEW_CONTENT),
    canApproveContent: userHasPermission(currentUser, PERMISSIONS.APPROVE_CONTENT),
    canAssureContent: userHasPermission(currentUser, PERMISSIONS.ASSURE_CONTENT),
    canQaContent: userHasPermission(currentUser, PERMISSIONS.QA_CONTENT),
    canManageRoles: userHasPermission(currentUser, PERMISSIONS.MANAGE_ROLES),
  } : null;
  const researchRound =
    req.session && req.session.data ? normaliseResearchRound(req.session.data.researchRound) : "round-1";
  const assessment =
    req.session && req.session.data && req.session.data.assessment
      ? req.session.data.assessment
      : null;
  const councilSetupComplete = isCouncilSetupComplete(req.session && req.session.data);
  if (councilSetupComplete && req.session && req.session.data) {
    applyCouncilContext(req.session.data, getStoredCouncilName(req.session.data));
  }
  const onboardingComplete =
    researchRound === "round-2" ? isRoundTwoOnboardingComplete(assessment) : true;
  res.locals.researchRound = researchRound;
  res.locals.researchRoundLabel = researchRound === "round-2" ? "Round 2" : "Round 1";
  res.locals.onboardingComplete = onboardingComplete;
  res.locals.councilSetupComplete = councilSetupComplete;
  res.locals.councilDisplayName = getCouncilDisplayName(req.session.data);
  if (signedIn && !currentUser) {
    req.session.data.signedIn = false;
  }
  if (!signedIn && req.session && req.session.data && req.session.data.user) {
    delete req.session.data.user;
  }
  res.locals.showUserSwitcher = Boolean(
    currentUser &&
    Array.isArray(currentUser.roles) &&
    currentUser.roles.length > 1
  );

  res.locals.headerNavigation = buildHeaderNavigation({
    signedIn,
    role,
    researchRound,
  });

  const hideNav = req.path === "/entry";
  res.locals.showNavigation = signedIn && !hideNav;
  res.locals.navigation = signedIn && !hideNav
    ? buildNavigation(req.path, role, researchRound, { onboardingComplete })
    : [];
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
      ["/research-rounds", "/research-start", "/start", "/guidance", "/my-account", "/logout", "/council-setup", "/council-context/restore"].some(
        (path) => req.path === path || req.path.startsWith(path + "/")
      );
    const councilPrefixes = [
      "/entry",
      "/onboarding",
      "/organisation-details",
      "/manage-users",
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
        const assurerAccess = getAssurerAccessContext(currentUser, assessment);
        const allowedAssessmentPages =
          req.path === "/assessments/current/dashboard" ||
          req.path.startsWith("/assessments/current/outcomes/");
        const allowedAssurer =
          req.path.startsWith("/assurer") ||
          allowedAssessmentPages ||
          req.path.startsWith("/improvement-plan/generate") ||
          req.path.startsWith("/improvement-plan/sign-off");
        if (!allowedAssurer && isCouncilArea) {
          return res.redirect("/assurer/queue");
        }
        if (allowedAssessmentPages && !assurerAccess.isAssignedAssessment) {
          return res.status(403).render("pages/errors/restricted", {
            pageTitle: "Access restricted",
          });
        }
      }
      if (role === "council") {
        const isMhclgArea = req.path.startsWith("/mhclg");
        const isAssurerArea = req.path.startsWith("/assurer");
        if (researchRound === "round-2" && isCouncilArea && !councilSetupComplete) {
          return res.redirect("/council-setup");
        }
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
require("./routes/council-context")(router);
require("./routes/onboarding")(router);
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
  ensureRoundTwoAccessState(req.session.data);
  res.render("pages/round-2/auth", {
    pageTitle: "Sign in to webCAF",
    mode: "sign-in",
    heading: "Sign in to webCAF",
    submitText: "Continue",
    secondaryLinks: [
      { href: "/round-2/register?path=join-existing", text: "Join your council" },
      { href: "/round-2/register?path=request-new", text: "Request access" },
    ],
    defaults: {
      name: (req.session.data.round2AuthName || "").toString(),
      email: (req.session.data.round2AuthEmail || "").toString(),
      councilName: "",
      accessPath: "join-existing",
    },
    error: null,
  });
});

router.post("/round-2/sign-in", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.researchRound = "round-2";
  ensureRoundTwoAccessState(req.session.data);
  const name = (req.session.data.round2AuthName || "").toString().trim();
  const email = normaliseEmail(req.session.data.round2AuthEmail);
  const errors = [];
  if (!name) {
    errors.push({ field: "round2AuthName", text: "Enter your full name." });
  } else if (!/\s+/.test(name)) {
    errors.push({ field: "round2AuthName", text: "Enter your first and last name." });
  }
  if (!email) {
    errors.push({ field: "round2AuthEmail", text: "Enter your work email address." });
  } else {
    const emailValidationError = getPrototypeWorkEmailError(email);
    if (emailValidationError) {
      errors.push({
        field: "round2AuthEmail",
        text: emailValidationError,
      });
    }
  }

  if (errors.length > 0) {
    return res.render("pages/round-2/auth", {
      pageTitle: "Sign in to webCAF",
      mode: "sign-in",
      heading: "Sign in to webCAF",
      submitText: "Continue",
      secondaryLinks: [
        { href: "/round-2/register?path=join-existing", text: "Join your council" },
        { href: "/round-2/register?path=request-new", text: "Request access" },
      ],
      defaults: { name, email, councilName: "", accessPath: "join-existing" },
      error: { items: errors },
    });
  }

  const matchedUser = email ? findUserRecordByEmail(req.session.data, email) : null;
  signInRoundTwoUser(req, {
    matchedUser,
    name,
    email,
    authMode: "sign-in",
  });
  delete req.session.data.round2AuthName;
  delete req.session.data.round2AuthEmail;
  return res.redirect(getSignedInLanding(req));
});

router.get("/round-2/register", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.researchRound = "round-2";
  ensureRoundTwoAccessState(req.session.data);
  const accessPath = ["join-existing", "request-new"].includes(req.query.path)
    ? req.query.path
    : ((req.session.data.round2AccessPath || "join-existing").toString());
  res.render("pages/round-2/auth", {
    pageTitle: "Get access",
    mode: "register",
    heading: "Get access to webCAF",
    submitText: "Continue",
    secondaryLinks: [
      { href: "/round-2/sign-in", text: "Sign in instead" },
    ],
    defaults: {
      name: (req.session.data.round2AuthName || "").toString(),
      email: (req.session.data.round2AuthEmail || "").toString(),
      councilName: (req.session.data.round2CouncilName || "").toString(),
      accessPath,
    },
    error: null,
  });
});

router.post("/round-2/register", (req, res) => {
  if (!req.session) req.session = {};
  if (!req.session.data) req.session.data = {};
  req.session.data.researchRound = "round-2";
  ensureRoundTwoAccessState(req.session.data);
  const name = (req.session.data.round2AuthName || "").toString().trim();
  const email = normaliseEmail(req.session.data.round2AuthEmail);
  const councilName = (req.session.data.round2CouncilName || "").toString().trim();
  const accessPath = (req.session.data.round2AccessPath || "").toString().trim();
  const errors = [];
  if (!accessPath) errors.push({ field: "round2AccessPath", text: "Choose whether you need to join your council or request access for a council." });
  if (!name) errors.push({ field: "round2AuthName", text: "Enter your name." });
  if (!email) errors.push({ field: "round2AuthEmail", text: "Enter your email address." });
  if (!councilName) errors.push({ field: "round2CouncilName", text: "Enter the council you need access for." });

  if (errors.length > 0) {
    return res.render("pages/round-2/auth", {
      pageTitle: "Get access",
      mode: "register",
      heading: "Get access to webCAF",
      submitText: "Continue",
      secondaryLinks: [
        { href: "/round-2/sign-in", text: "Sign in instead" },
      ],
      defaults: { name, email, councilName, accessPath },
      error: { items: errors },
    });
  }

  const outcome = evaluateRegistrationRequest(req.session.data, {
    name,
    email,
    councilName,
    accessPath,
  });
  storePendingAccessRequest(req.session.data, {
    name,
    email,
    councilName: outcome.councilName || councilName,
    accessPath,
    status: outcome.status,
  });
  delete req.session.data.round2AuthName;
  delete req.session.data.round2AuthEmail;
  delete req.session.data.round2CouncilName;
  delete req.session.data.round2AccessPath;

  return res.render("pages/round-2/request-access-result", {
    pageTitle: "Get access",
    outcome,
  });
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
  const redirectPath = getSignedOutPageRedirect(req);
  if (req.session && typeof req.session.destroy === "function") {
    return req.session.destroy(() => res.redirect(redirectPath));
  }
  return res.redirect(redirectPath);
});

router.get("/guidance", (req, res) => res.redirect(getSignedInLanding(req)));
router.get("/my-account", (req, res) => res.redirect(getSignedInLanding(req)));
router.get("/logout", (req, res) => {
  const redirectPath = getSignedOutPageRedirect(req);
  if (req.session && typeof req.session.destroy === "function") {
    return req.session.destroy(() => res.redirect(redirectPath));
  }
  return res.redirect(redirectPath);
});
router.get("/signed-out", (req, res) => {
  const researchRound = normaliseResearchRound((req.query.round || "").toString());
  const roundTwo = researchRound === "round-2";
  res.render("pages/signed-out", {
    pageTitle: "Signed out",
    roundTwo,
    signInHref: roundTwo ? "/round-2/sign-in" : "/research-start?reset=1",
    secondaryHref: roundTwo ? "/research-rounds" : "/research-start?reset=1",
  });
});
router.get("/organisation-details", (req, res) => res.redirect("/entry"));
router.get("/manage-users", (req, res) => res.redirect("/entry"));
router.post("/switch-role", (req, res) => {
  if (!req.session || !req.session.data || !req.session.data.user) {
    return res.redirect("/research-start");
  }
  const requestedRole = (req.session.data.switchRole || "").toString().trim().toLowerCase();
  switchCurrentUserRole(req.session.data, requestedRole);
  delete req.session.data.switchRole;
  const returnTo = sanitiseLocalPath((req.query.returnTo || "").toString()) || getSignedInLanding(req);
  return res.redirect(returnTo);
});

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
    researchRound,
  };
  ensurePrototypeSession(req.session.data);
  req.session.data.user = syncUserRoleState(selected);
  setSignedInState(req.session.data, true);

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
    researchRound: pendingResearchRound,
  };
  ensurePrototypeSession(req.session.data);
  req.session.data.user = syncUserRoleState({
    ...selected,
    name: enteredName || selected.name,
    email: enteredEmail,
  });
  setSignedInState(req.session.data, true);

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
        by: user && user.name ? user.name : "Council user",
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
        by: user && user.name ? user.name : "Council user",
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

function signInRoundTwoUser(req, { matchedUser, name, email, authMode }) {
  const accessState = ensureRoundTwoAccessState(req.session.data);
  const record = matchedUser || findUserRecordByEmail(req.session.data, email);
  const defaultCouncilUser = users.find((user) => user.id === "u-1") || users[0];
  const baseUser = record && record.user ? record.user : defaultCouncilUser;
  const savedAssessment = getSavedAssessment(email);
  req.session.data = {
    researchRound: "round-2",
    round2AuthMode: authMode,
  };
  ensurePrototypeSession(req.session.data);
  setSignedInCouncilUser(req.session.data, {
    name: name || baseUser.name,
    email,
    councilName: record && record.account ? record.account.councilName : "",
  });
  req.session.data.roundTwoAccess = accessState;
  if (record && record.account) {
    req.session.data.accessAccountId = record.account.id;
  }
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

function getSignedOutPageRedirect(req) {
  const researchRound =
    req.session && req.session.data ? normaliseResearchRound(req.session.data.researchRound) : "round-1";
  return `/signed-out?round=${encodeURIComponent(researchRound)}`;
}

function getSignedInLanding(req) {
  const user = req && req.session && req.session.data ? syncUserRoleState(req.session.data.user) : null;
  if (!user || !req.session.data.signedIn) return "/research-start";
  if (user.role === "mhclg") return "/mhclg/dashboard";
  if (user.role === "assurer") return "/assurer/queue";
  if (req.session.data.researchRound === "round-2") {
    return isCouncilSetupComplete(req.session.data)
      ? getRoundTwoCouncilLanding(req.session.data)
      : "/council-context/restore";
  }
  return "/entry";
}

function getRoundTwoCouncilLanding(sessionData) {
  if (sessionData && sessionData.assessment && sessionData.assessment.id) {
    return "/assessments/current/dashboard?view=my";
  }
  return "/entry/start-new?returnTo=/onboarding";
}

function sanitiseLocalPath(input) {
  const path = (input || "").toString().trim();
  if (!path) return "";
  if (!path.startsWith("/") || path.startsWith("//")) return "";
  if (path.startsWith("/research-start")) return "";
  return path;
}

function isPrototypeWorkEmail(email) {
  return !getPrototypeWorkEmailError(email);
}

function getPrototypeWorkEmailError(email) {
  const value = normaliseEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Enter an email address in the correct format, such as name@council.gov.uk.";
  }

  const personalDomains = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "me.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "gmx.com",
    "live.com",
  ]);

  const domain = value.split("@")[1] || "";
  if (personalDomains.has(domain)) {
    return "Use your work email address. Personal email addresses such as Gmail or Hotmail cannot be used.";
  }

  const isAllowed =
    domain.endsWith(".gov.uk") ||
    domain.endsWith(".gov.scot") ||
    domain.endsWith(".mod.uk") ||
    domain.endsWith(".nhs.uk") ||
    domain.endsWith(".police.uk") ||
    domain.endsWith(".ac.uk") ||
    domain.endsWith(".sch.uk") ||
    domain.endsWith(".parliament.uk");

  if (!isAllowed) {
    return "Use a work email address from your council, government or another public sector organisation.";
  }

  return "";
}

function normaliseResearchRound(input) {
  return input === "round-2" ? "round-2" : "round-1";
}

module.exports = router;
