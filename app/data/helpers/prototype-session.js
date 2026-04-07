const {
  ROLE_IDS,
  getRoleLabel,
  normaliseRoles,
  pickDefaultActiveRole,
  syncUserRoleState,
} = require("./roles");

const DEFAULT_COUNCIL = {
  id: "council-west-marchshire",
  name: "West Marchshire Council",
  setupStatus: "not_started",
  emailDomain: "west-marchshire.gov.uk",
};

const DEFAULT_USERS = [
  {
    id: "user-west-marchshire-1",
    name: "Morgan Ellis",
    email: "morgan.ellis@west-marchshire.gov.uk",
    roles: [ROLE_IDS.CAF_LEAD, ROLE_IDS.APPROVER],
    activeRole: ROLE_IDS.CAF_LEAD,
    active: true,
    status: "active",
    councilId: DEFAULT_COUNCIL.id,
  },
  {
    id: "user-west-marchshire-2",
    name: "Priya Shah",
    email: "priya.shah@west-marchshire.gov.uk",
    roles: [ROLE_IDS.COLLABORATOR, ROLE_IDS.QA],
    activeRole: ROLE_IDS.COLLABORATOR,
    active: true,
    status: "active",
    councilId: DEFAULT_COUNCIL.id,
  },
  {
    id: "user-west-marchshire-3",
    name: "Lewis Turner",
    email: "lewis.turner@west-marchshire.gov.uk",
    roles: [ROLE_IDS.APPROVER],
    activeRole: ROLE_IDS.APPROVER,
    active: true,
    status: "active",
    councilId: DEFAULT_COUNCIL.id,
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatText(value) {
  return (value || "").toString().trim().replace(/\s+/g, " ");
}

function formatEmail(value) {
  return (value || "").toString().trim().toLowerCase();
}

function slugify(value) {
  return formatText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "your-council";
}

function getEmailDomain(email) {
  const normalised = formatEmail(email);
  const parts = normalised.split("@");
  return parts.length === 2 ? parts[1] : "";
}

function getPrototypeCouncilDomain(councilName) {
  return `${slugify(councilName)}.gov.uk`;
}

function getEmailLocalPart(name, existingEmail) {
  const existingLocal = formatEmail(existingEmail).split("@")[0];
  if (existingLocal) return existingLocal;
  return formatText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "webcaf-user";
}

function buildUserRecord(user, council) {
  const roles = normaliseRoles(user.roles || user.activeRole || []);
  const activeRole = roles.includes(user.activeRole) ? user.activeRole : pickDefaultActiveRole(roles);
  const syncedUser = syncUserRoleState({
    ...user,
    name: formatText(user.name) || "Council user",
    email: formatEmail(user.email),
    roles,
    activeRole,
    role: "council",
    orgName: council.name,
    councilId: council.id,
    active: user.active !== false,
    status: user.status === "inactive" ? "inactive" : "active",
  });

  return {
    ...syncedUser,
    roleTitle: getRoleLabel(syncedUser.activeRole) || syncedUser.roleTitle || "Council user",
  };
}

function buildDefaultPrototypeSession() {
  return {
    session: {
      isSignedIn: false,
      currentUserId: DEFAULT_USERS[0].id,
    },
    council: clone(DEFAULT_COUNCIL),
    users: clone(DEFAULT_USERS),
  };
}

function ensurePrototypeSession(sessionData) {
  if (!sessionData.prototypeSession) {
    sessionData.prototypeSession = buildDefaultPrototypeSession();
    migrateLegacySessionData(sessionData);
  }

  sessionData.prototypeSession = normalisePrototypeSession(sessionData.prototypeSession);
  syncLegacySessionData(sessionData);
  return sessionData.prototypeSession;
}

function normalisePrototypeSession(state) {
  const base = state && typeof state === "object" ? clone(state) : buildDefaultPrototypeSession();
  const council = {
    id: formatText(base.council && base.council.id) || DEFAULT_COUNCIL.id,
    name: formatText(base.council && base.council.name) || DEFAULT_COUNCIL.name,
    setupStatus: formatSetupStatus(base.council && base.council.setupStatus),
    emailDomain:
      formatText(base.council && base.council.emailDomain).toLowerCase() ||
      getPrototypeCouncilDomain(base.council && base.council.name),
  };

  const rawUsers = Array.isArray(base.users) && base.users.length > 0 ? base.users : clone(DEFAULT_USERS);
  const seen = new Set();
  let users = rawUsers
    .map((user, index) => ({
      ...user,
      id: formatText(user.id) || `user-${council.id}-${index + 1}`,
      councilId: formatText(user.councilId) || council.id,
    }))
    .filter((user) => user.councilId === council.id)
    .filter((user) => {
      if (seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    })
    .map((user) => buildUserRecord(user, council));

  if (users.length === 0) {
    users = clone(DEFAULT_USERS).map((user) =>
      buildUserRecord(
        {
          ...user,
          councilId: council.id,
          email: `${getEmailLocalPart(user.name, user.email)}@${council.emailDomain}`,
        },
        council
      )
    );
  }

  const session = {
    isSignedIn: Boolean(base.session && base.session.isSignedIn),
    currentUserId:
      formatText(base.session && base.session.currentUserId) ||
      users[0].id,
  };

  let currentUser = users.find((user) => user.id === session.currentUserId) || users[0];
  if (!users.some((user) => user.roles.includes(ROLE_IDS.CAF_LEAD))) {
    currentUser = buildUserRecord(
      {
        ...currentUser,
        roles: [ROLE_IDS.CAF_LEAD, ...currentUser.roles],
        activeRole: currentUser.activeRole || ROLE_IDS.CAF_LEAD,
      },
      council
    );
    users = users.map((user) => (user.id === currentUser.id ? currentUser : user));
  }

  session.currentUserId = currentUser.id;

  return { session, council, users };
}

function migrateLegacySessionData(sessionData) {
  const state = sessionData.prototypeSession;
  if (!state) return;

  if (sessionData.user) {
    const currentUser = getCurrentUserFromState(state);
    const nextUser = buildUserRecord(
      {
        ...currentUser,
        ...sessionData.user,
        councilId: state.council.id,
      },
      state.council
    );
    state.users = state.users.map((user) => (user.id === nextUser.id ? nextUser : user));
    state.session.currentUserId = nextUser.id;
  }

  if (typeof sessionData.signedIn === "boolean") {
    state.session.isSignedIn = sessionData.signedIn;
  }

  if (sessionData.councilContext && sessionData.councilContext.councilName) {
    applyCouncilDetails(sessionData, {
      name: sessionData.councilContext.councilName,
      setupStatus: sessionData.councilContext.setupComplete ? "complete" : "in_progress",
    });
  }
}

function syncLegacySessionData(sessionData) {
  const state = sessionData.prototypeSession;
  if (!state) return;
  const currentUser = getCurrentUserFromState(state);
  const council = state.council;
  sessionData.signedIn = state.session.isSignedIn;
  sessionData.user = currentUser ? { ...currentUser } : null;
  sessionData.councilContext = {
    councilName: council.name,
    setupComplete: council.setupStatus === "complete",
  };
}

function getCurrentUserFromState(state) {
  if (!state || !Array.isArray(state.users)) return null;
  return state.users.find((user) => user.id === state.session.currentUserId) || state.users[0] || null;
}

function getCurrentUser(sessionData) {
  const state = ensurePrototypeSession(sessionData);
  return getCurrentUserFromState(state);
}

function getCurrentCouncil(sessionData) {
  return ensurePrototypeSession(sessionData).council;
}

function getCouncilUsers(sessionData) {
  const state = ensurePrototypeSession(sessionData);
  return state.users.map((user) => ({ ...user }));
}

function getCafLead(sessionData) {
  const state = ensurePrototypeSession(sessionData);
  return (
    state.users.find((user) => user.roles.includes(ROLE_IDS.CAF_LEAD)) ||
    getCurrentUserFromState(state)
  );
}

function buildCouncilAccount(sessionData) {
  const council = getCurrentCouncil(sessionData);
  const users = getCouncilUsers(sessionData);
  const cafLead = getCafLead(sessionData);
  return {
    id: `account-${council.id}`,
    councilId: council.id,
    councilName: council.name,
    setupStatus: council.setupStatus,
    allowedDomains: [council.emailDomain],
    contactName: cafLead ? cafLead.name : "",
    contactEmail: cafLead ? cafLead.email : "",
    users,
  };
}

function setSignedInCouncilUser(sessionData, input = {}) {
  const state = ensurePrototypeSession(sessionData);
  const currentUser = getCurrentUserFromState(state);
  const email = formatEmail(input.email) || currentUser.email;
  const name = formatText(input.name) || currentUser.name;
  const emailDomain = getEmailDomain(email) || state.council.emailDomain || getPrototypeCouncilDomain(state.council.name);

  state.session.isSignedIn = true;
  state.council.emailDomain = emailDomain;

  state.users = state.users.map((user) => {
    if (user.id === currentUser.id) {
      return buildUserRecord(
        {
          ...user,
          name,
          email,
        },
        state.council
      );
    }

    return buildUserRecord(
      {
        ...user,
        email: `${getEmailLocalPart(user.name, user.email)}@${emailDomain}`,
      },
      state.council
    );
  });

  if (input.councilName) {
    applyCouncilDetails(sessionData, {
      name: input.councilName,
      emailDomain,
      setupStatus: input.setupStatus,
    });
  } else {
    syncLegacySessionData(sessionData);
  }

  return getCurrentUser(sessionData);
}

function setSignedInState(sessionData, isSignedIn) {
  const state = ensurePrototypeSession(sessionData);
  state.session.isSignedIn = Boolean(isSignedIn);
  syncLegacySessionData(sessionData);
}

function switchCurrentUserRole(sessionData, requestedRole) {
  const state = ensurePrototypeSession(sessionData);
  const currentUser = getCurrentUserFromState(state);
  const roleId = (requestedRole || "").toString().trim().toLowerCase();
  if (!currentUser || !currentUser.roles.includes(roleId)) return currentUser;

  state.users = state.users.map((user) =>
    user.id === currentUser.id
      ? buildUserRecord({ ...user, activeRole: roleId }, state.council)
      : user
  );
  syncLegacySessionData(sessionData);
  return getCurrentUser(sessionData);
}

function applyCouncilDetails(sessionData, details = {}) {
  const state = ensurePrototypeSession(sessionData);
  const councilName = formatText(details.name) || state.council.name;
  const emailDomain =
    formatText(details.emailDomain).toLowerCase() ||
    state.council.emailDomain ||
    getPrototypeCouncilDomain(councilName);

  state.council = {
    ...state.council,
    name: councilName,
    setupStatus: formatSetupStatus(details.setupStatus || state.council.setupStatus || "in_progress"),
    emailDomain,
  };

  state.users = state.users.map((user) =>
    buildUserRecord(
      {
        ...user,
        email: user.id === state.session.currentUserId && getEmailDomain(user.email) === emailDomain
          ? user.email
          : `${getEmailLocalPart(user.name, user.email)}@${emailDomain}`,
      },
      state.council
    )
  );

  syncLegacySessionData(sessionData);
  return state.council;
}

function addCouncilUser(sessionData, input) {
  const state = ensurePrototypeSession(sessionData);
  const roles = normaliseRoles(input.roles);
  const nextUser = buildUserRecord(
    {
      id: `user-${state.council.id}-${state.users.length + 1}`,
      name: input.name,
      email: formatEmail(input.email),
      roles,
      activeRole: pickDefaultActiveRole(roles),
      active: true,
      status: "active",
      councilId: state.council.id,
    },
    state.council
  );
  state.users.push(nextUser);
  syncLegacySessionData(sessionData);
  return nextUser;
}

function updateCouncilUser(sessionData, userId, updates = {}) {
  const state = ensurePrototypeSession(sessionData);
  const existingUser = state.users.find((user) => user.id === userId);
  if (!existingUser) return null;

  const nextRoles = normaliseRoles(updates.roles || existingUser.roles);
  const activeRole = nextRoles.includes(updates.activeRole)
    ? updates.activeRole
    : pickDefaultActiveRole(nextRoles);

  const nextUser = buildUserRecord(
    {
      ...existingUser,
      ...updates,
      roles: nextRoles,
      activeRole,
    },
    state.council
  );

  state.users = state.users.map((user) => (user.id === userId ? nextUser : user));
  syncLegacySessionData(sessionData);
  return nextUser;
}

function findCouncilUser(sessionData, userId) {
  const state = ensurePrototypeSession(sessionData);
  return state.users.find((user) => user.id === userId) || null;
}

function formatSetupStatus(value) {
  const setupStatus = (value || "").toString().trim().toLowerCase();
  if (["complete", "in_progress", "not_started"].includes(setupStatus)) {
    return setupStatus;
  }
  return "not_started";
}

module.exports = {
  DEFAULT_COUNCIL,
  DEFAULT_USERS,
  addCouncilUser,
  applyCouncilDetails,
  buildCouncilAccount,
  ensurePrototypeSession,
  findCouncilUser,
  getCafLead,
  getCouncilUsers,
  getCurrentCouncil,
  getCurrentUser,
  getEmailDomain,
  getPrototypeCouncilDomain,
  setSignedInCouncilUser,
  setSignedInState,
  switchCurrentUserRole,
  updateCouncilUser,
};
