const { requireSignedIn, ensureAssessment, getAssessmentOrRedirect } = require("../data/helpers/session");
const {
  canManageCouncilSetup,
  canManageUsers,
  ensureRoundTwoAccessState,
  normaliseEmail,
} = require("../data/helpers/round-two-access");
const {
  PERMISSIONS,
  getRoleLabel,
  getRolePermissionRows,
  getSupportedRoles,
  normaliseRoles,
  pickDefaultActiveRole,
  syncUserRoleState,
  userHasPermission,
} = require("../data/helpers/roles");
const {
  buildRoundTwoSetupProgress,
  hasRoundTwoRolesComplete,
  hasRoundTwoScopeSummaryComplete,
  isRoundTwoOnboardingComplete,
} = require("../data/helpers/phase-progress");
const { getRoundTwoAccountBackHref } = require("../data/helpers/navigation");
const {
  getCouncilDisplayName,
  getCouncilEmailDomain,
  getStoredCouncilName,
  isCouncilSetupComplete,
} = require("../data/helpers/council-context");
const {
  addCouncilUser,
  buildCouncilAccount,
  findCouncilUser,
  getCafLead,
  updateCouncilUser,
} = require("../data/helpers/prototype-session");

module.exports = function (router) {
  router.use((req, res, next) => {
    const protectedPaths = ["/onboarding", "/organisation-details", "/manage-users"];
    const isProtected = protectedPaths.some(
      (path) => req.path === path || req.path.startsWith(path + "/")
    );
    if (!isProtected) return next();
    if (!requireSignedIn(req, res)) return;
    ensureRoundTwoAccessState(req.session.data);
    next();
  });

  router.get("/onboarding", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const roundTwo = req.session.data.researchRound === "round-2";
    if (!roundTwo) {
      return res.redirect("/assessments/current/journey");
    }

    const account = getCurrentCouncilAccount(req);
    syncAccountSetupStatus(req.session.data, account);
    const tasks = buildOnboardingTasks(assessment);
    const completedCount = tasks.filter((task) => task.status === "Complete").length;
    const nextTask = tasks.find((task) => task.status !== "Complete") || null;
    const onboardingComplete = tasks.every((task) => task.status === "Complete");
    const onboardingProgressBase = buildRoundTwoSetupProgress(assessment);
    const onboardingProgress = {
      ...onboardingProgressBase,
      milestones: onboardingProgressBase.milestones.map((milestone, index) => ({
        ...milestone,
        href: tasks[index] && tasks[index].status !== "Cannot start yet" ? tasks[index].href : "",
      })),
    };

    return res.render("pages/onboarding/index", {
      pageTitle: "Council onboarding and setup",
      account,
      councilDisplayName: getCouncilDisplayName(req.session.data),
      currentUser: req.session.data.user || null,
      tasks,
      completedCount,
      nextTask,
      onboardingComplete,
      onboardingProgress,
      canManageSetup: canManageCouncilSetup(req.session.data.user || null),
    });
  });

  router.get("/onboarding/scope", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const scope = assessment.scope || {};
    const contextComplete = Boolean(scope.context && scope.context.completed);
    const servicesComplete = Boolean(scope.servicesConfirmed);
    const servicesStarted = Array.isArray(scope.essentialServices) && scope.essentialServices.length > 0;
    const systemsStarted = Array.isArray(scope.criticalSystems) && scope.criticalSystems.length > 0;
    const systemsComplete = Boolean(assessment.stage && assessment.stage.prepareScopeComplete);

    if (!contextComplete) return res.redirect("/stages/2/scope/context");
    if (!servicesComplete) {
      return res.redirect(servicesStarted ? "/stages/2/scope/services/review" : "/stages/2/scope/services/add");
    }
    if (!systemsComplete) {
      return res.redirect(systemsStarted ? "/stages/2/scope/systems/review" : "/stages/2/scope/systems/add");
    }
    return res.redirect("/onboarding");
  });

  router.get("/organisation-details", (req, res) => {
    const account = getCurrentCouncilAccount(req);
    if (!account) {
      return res.redirect("/entry");
    }
    if (req.session.data.assessment) {
      syncAccountSetupStatus(req.session.data, account);
    }

    return res.render("pages/account/organisation-details", {
      pageTitle: "Organisation details",
      account,
      backHref: getRoundTwoAccountBackHref(
        req.session.data.researchRound,
        isOnboardingComplete(req.session.data.assessment)
      ),
      councilDisplayName: getCouncilDisplayName(req.session.data),
      councilEmailDomain: getCouncilEmailDomain(req.session.data),
      currentUser: req.session.data.user || null,
      cafLead: getCafLead(req.session.data),
      canManageSetup: canManageCouncilSetup(req.session.data.user || null),
    });
  });

  router.get("/manage-users", (req, res) => {
    const account = getCurrentCouncilAccount(req);
    if (!account) {
      return res.redirect("/entry");
    }
    if (req.session.data.assessment) {
      syncAccountSetupStatus(req.session.data, account);
    }

    return res.render("pages/account/manage-users", {
      pageTitle: "Manage users",
      account,
      backHref: getRoundTwoAccountBackHref(
        req.session.data.researchRound,
        isOnboardingComplete(req.session.data.assessment)
      ),
      councilDisplayName: getCouncilDisplayName(req.session.data),
      councilEmailDomain: getCouncilEmailDomain(req.session.data),
      currentUser: syncUserRoleState(req.session.data.user || null),
      cafLead: getCafLead(req.session.data),
      canManageUsers: canManageUsers(req.session.data.user || null),
      addUserDefaults: buildAddUserDefaults(req.session.data),
      addUserError: null,
      addUserSuccess: (req.query.added || "").toString(),
      roleUpdateSuccess: (req.query.updated || "").toString(),
      roleOptions: getSupportedRoles(),
      rolePermissionRows: getRolePermissionRows(),
    });
  });

  router.post("/manage-users", (req, res) => {
    const account = getCurrentCouncilAccount(req);
    if (!account) {
      return res.redirect("/entry");
    }

    if (!canManageUsers(req.session.data.user || null)) {
      return res.status(403).render("pages/errors/restricted", {
        pageTitle: "Access restricted",
      });
    }

    const name = (req.session.data.manageUserName || "").toString().trim();
    const email = normaliseEmail(req.session.data.manageUserEmail);
    const selectedRoles = normaliseRoles(req.session.data.manageUserRoles);
    const errors = [];

    if (!name) errors.push({ field: "manageUserName", text: "Enter the new user's name." });
    if (!email) errors.push({ field: "manageUserEmail", text: "Enter the new user's email address." });
    if (selectedRoles.length === 0) errors.push({ field: "manageUserRoles", text: "Select at least one role for the new user." });

    const duplicate = Array.isArray(account.users)
      ? account.users.find((user) => normaliseEmail(user.email) === email)
      : null;
    if (duplicate) {
      errors.push({
        field: "manageUserEmail",
        text: "This email address already has access to this council account.",
      });
    }

    const allowedDomain = Array.isArray(account.allowedDomains)
      ? account.allowedDomains.some((domain) => email.endsWith(`@${domain}`))
      : false;
    if (email && !allowedDomain) {
      errors.push({
        field: "manageUserEmail",
        text: "Use an approved council email domain for this account.",
      });
    }

    if (errors.length > 0) {
      return res.render("pages/account/manage-users", {
        pageTitle: "Manage users",
        account,
        backHref: getRoundTwoAccountBackHref(
          req.session.data.researchRound,
          isOnboardingComplete(req.session.data.assessment)
        ),
        councilDisplayName: getCouncilDisplayName(req.session.data),
        councilEmailDomain: getCouncilEmailDomain(req.session.data),
        currentUser: req.session.data.user || null,
        cafLead: getCafLead(req.session.data),
        canManageUsers: true,
        addUserDefaults: buildAddUserDefaults(req.session.data),
        addUserError: { items: errors },
        addUserSuccess: "",
        roleOptions: getSupportedRoles(),
        rolePermissionRows: getRolePermissionRows(),
      });
    }

    addCouncilUser(req.session.data, { name, email, roles: selectedRoles });

    delete req.session.data.manageUserName;
    delete req.session.data.manageUserEmail;
    delete req.session.data.manageUserRoles;

    return res.redirect("/manage-users?added=1");
  });

  router.get("/manage-users/:userId", (req, res) => {
    const account = getCurrentCouncilAccount(req);
    if (!account) {
      return res.redirect("/entry");
    }
    if (!canManageUsers(req.session.data.user || null)) {
      return res.status(403).render("pages/errors/restricted", {
        pageTitle: "Access restricted",
      });
    }

    const member = findCouncilUser(req.session.data, req.params.userId);
    if (!member) {
      return res.redirect("/manage-users");
    }

    return res.render("pages/account/manage-user-roles", {
      pageTitle: "Edit user roles",
      account,
      member,
      backHref: "/manage-users",
      councilDisplayName: getCouncilDisplayName(req.session.data),
      currentUser: syncUserRoleState(req.session.data.user || null),
      canManageUsers: canManageUsers(req.session.data.user || null),
      form: buildEditUserDefaults(req.session.data, member),
      error: null,
      roleOptions: getSupportedRoles(),
      rolePermissionRows: getRolePermissionRows(),
      currentUserCanManageRoles: userHasPermission(req.session.data.user || null, PERMISSIONS.MANAGE_ROLES),
    });
  });

  router.post("/manage-users/:userId", (req, res) => {
    const account = getCurrentCouncilAccount(req);
    if (!account) {
      return res.redirect("/entry");
    }
    if (!canManageUsers(req.session.data.user || null)) {
      return res.status(403).render("pages/errors/restricted", {
        pageTitle: "Access restricted",
      });
    }

    const member = findCouncilUser(req.session.data, req.params.userId);
    if (!member) {
      return res.redirect("/manage-users");
    }

    const selectedRoles = normaliseRoles(req.session.data.editUserRoles);
    const selectedActiveRole = (req.session.data.editUserActiveRole || "").toString().trim().toLowerCase();
    const errors = [];

    if (selectedRoles.length === 0) {
      errors.push({ field: "editUserRoles", text: "Select at least one role for this user." });
    }
    if (selectedRoles.length > 0 && !selectedRoles.includes(selectedActiveRole)) {
      errors.push({ field: "editUserActiveRole", text: "Select an active role that matches one of the assigned roles." });
    }

    if (errors.length > 0) {
      return res.render("pages/account/manage-user-roles", {
        pageTitle: "Edit user roles",
        account,
        member,
        backHref: "/manage-users",
        councilDisplayName: getCouncilDisplayName(req.session.data),
        currentUser: syncUserRoleState(req.session.data.user || null),
        canManageUsers: true,
        form: buildEditUserDefaults(req.session.data, member),
        error: { items: errors },
        roleOptions: getSupportedRoles(),
        rolePermissionRows: getRolePermissionRows(),
        currentUserCanManageRoles: true,
      });
    }

    updateCouncilUser(req.session.data, member.id, {
      roles: selectedRoles,
      activeRole: selectedRoles.includes(selectedActiveRole)
        ? selectedActiveRole
        : pickDefaultActiveRole(selectedRoles),
    });

    delete req.session.data.editUserRoles;
    delete req.session.data.editUserActiveRole;

    return res.redirect("/manage-users?updated=1");
  });
};

function getCurrentCouncilAccount(req) {
  if (!req || !req.session || !req.session.data) return null;
  return syncAccountUsers(buildCouncilAccount(req.session.data));
}

function isOnboardingComplete(assessment) {
  return isRoundTwoOnboardingComplete(assessment);
}

function buildOnboardingTasks(assessment) {
  const prepare = assessment && assessment.prepare ? assessment.prepare : {};
  const rolesStarted = Boolean(
    prepare.onboardingLead || prepare.onboardingApprover
  );
  const scope = assessment && assessment.scope ? assessment.scope : {};
  const scopeReview = assessment && assessment.scopeReview ? assessment.scopeReview : {};
  const rolesComplete = hasRoundTwoRolesComplete(assessment);
  const scopeReviewed = hasRoundTwoScopeSummaryComplete(assessment);
  const scopeStarted = Boolean(
    (scope.context && Object.values(scope.context).some(Boolean)) ||
      (Array.isArray(scope.essentialServices) && scope.essentialServices.length > 0) ||
      (Array.isArray(scope.criticalSystems) && scope.criticalSystems.length > 0) ||
      scopeReviewed ||
      scopeReview.decision
  );

  return [
    {
      title: "Add the people leading this assessment",
      href: "/prepare/roles?returnTo=journey",
      hint: "Do this once when your council account is set up. You can update these names later.",
      status: rolesComplete
        ? "Complete"
        : rolesStarted
          ? "In progress"
          : "Ready to start",
    },
    {
      title: "Review your services and systems lists",
      href: "/onboarding/scope",
      hint: "Use your main lists and update them if anything has changed before the yearly assessment starts.",
      status: scopeReviewed
        ? "Complete"
        : scopeStarted
          ? "In progress"
          : rolesComplete
            ? "Ready to start"
            : "Cannot start yet",
    },
  ];
}

function buildAddUserDefaults(sessionData) {
  return {
    name: (sessionData.manageUserName || "").toString(),
    email: (sessionData.manageUserEmail || "").toString(),
    roles: normaliseRoles(sessionData.manageUserRoles),
  };
}

function buildEditUserDefaults(sessionData, member) {
  const fallbackRoles = member && Array.isArray(member.roles) ? member.roles : [];
  const roles = normaliseRoles(sessionData.editUserRoles || fallbackRoles);
  return {
    roles,
    activeRole: (sessionData.editUserActiveRole || member.activeRole || pickDefaultActiveRole(roles)).toString(),
  };
}

function syncAccountUsers(account) {
  if (!account || !Array.isArray(account.users)) return account;
  account.users = account.users.map((user) => syncUserRoleState(user));
  return account;
}

function syncAccountSetupStatus(sessionData, account) {
  if (!account) return;
  if (isCouncilSetupComplete(sessionData)) {
    account.setupStatus = "complete";
    return;
  }

  account.setupStatus = getStoredCouncilName(sessionData) ? "in_progress" : "not_started";
}
