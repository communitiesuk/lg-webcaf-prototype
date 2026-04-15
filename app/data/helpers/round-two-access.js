const clone = (value) => JSON.parse(JSON.stringify(value));
const {
  ROLE_IDS,
  getRoleLabel,
  normaliseRoles,
  pickDefaultActiveRole,
  syncUserRoleState,
  userHasPermission,
  PERMISSIONS,
} = require("./roles");

const ACCESS_ROLES = {
  CENTRAL_ADMIN: "central-admin",
  CAF_LEAD: "caf-lead",
  COUNCIL_USER: "council-user",
};

const CENTRAL_ADMINS = [
  {
    id: "u-admin-1",
    name: "Riley Morgan",
    email: "caf-admin@communities.gov.uk",
    role: "mhclg",
    accessRole: ACCESS_ROLES.CENTRAL_ADMIN,
    roles: [],
    activeRole: "",
    roleTitle: "Central webCAF admin",
    orgName: "MHCLG",
    status: "active",
  },
];

const COUNCIL_ACCOUNTS = [
  {
    id: "acct-c-1",
    councilId: "c-1",
    councilName: "",
    allowedDomains: ["centralbedfordshire.gov.uk"],
    allowlistedEmails: [
      "morgan.ellis@centralbedfordshire.gov.uk",
      "priya.shah@centralbedfordshire.gov.uk",
    ],
    contactEmail: "morgan.ellis@centralbedfordshire.gov.uk",
    contactName: "Morgan Ellis",
    setupStatus: "in_progress",
    users: [
      {
        id: "u-1",
        name: "Morgan Ellis",
        email: "morgan.ellis@centralbedfordshire.gov.uk",
        role: "council",
        accessRole: ACCESS_ROLES.CAF_LEAD,
        roles: [ROLE_IDS.CAF_LEAD, ROLE_IDS.APPROVER],
        activeRole: ROLE_IDS.CAF_LEAD,
        roleTitle: "CAF Lead",
        orgName: "",
        status: "active",
      },
      {
        id: "u-c-1-2",
        name: "Priya Shah",
        email: "priya.shah@centralbedfordshire.gov.uk",
        role: "council",
        accessRole: ACCESS_ROLES.COUNCIL_USER,
        roles: [ROLE_IDS.COLLABORATOR, ROLE_IDS.QA],
        activeRole: ROLE_IDS.COLLABORATOR,
        roleTitle: "Collaborator",
        orgName: "",
        status: "active",
      },
    ],
  },
  {
    id: "acct-c-2",
    councilId: "c-2",
    councilName: "Gloucestershire County Council",
    allowedDomains: ["gloucestershire.gov.uk"],
    allowlistedEmails: ["jordan.singh@gloucestershire.gov.uk"],
    contactEmail: "jordan.singh@gloucestershire.gov.uk",
    contactName: "Jordan Singh",
    setupStatus: "not_started",
    users: [
      {
        id: "u-2",
        name: "Jordan Singh",
        email: "jordan.singh@gloucestershire.gov.uk",
        role: "council",
        accessRole: ACCESS_ROLES.CAF_LEAD,
        roles: [ROLE_IDS.CAF_LEAD, ROLE_IDS.COLLABORATOR],
        activeRole: ROLE_IDS.CAF_LEAD,
        roleTitle: "CAF Lead",
        orgName: "Gloucestershire County Council",
        status: "active",
      },
    ],
  },
  {
    id: "acct-c-3",
    councilId: "c-3",
    councilName: "London Borough of Islington",
    allowedDomains: ["islington.gov.uk"],
    allowlistedEmails: ["samira.khan@islington.gov.uk"],
    contactEmail: "samira.khan@islington.gov.uk",
    contactName: "Samira Khan",
    setupStatus: "complete",
    users: [
      {
        id: "u-3",
        name: "Samira Khan",
        email: "samira.khan@islington.gov.uk",
        role: "council",
        accessRole: ACCESS_ROLES.CAF_LEAD,
        roles: [ROLE_IDS.QA, ROLE_IDS.APPROVER],
        activeRole: ROLE_IDS.QA,
        roleTitle: "QA",
        orgName: "London Borough of Islington",
        status: "active",
      },
    ],
  },
];

function normaliseEmail(value) {
  return (value || "").toString().trim().toLowerCase();
}

function normaliseText(value) {
  return (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function slugifyCouncilName(value) {
  const slug = (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "your-council";
}

function getPrototypeCouncilDomain(councilName) {
  return `${slugifyCouncilName(councilName)}.gov.uk`;
}

function getEmailDomainOrFallback(email, fallback) {
  return getEmailDomain(email) || fallback;
}

function getEmailLocalPart(name, existingEmail) {
  const existingLocal = normaliseEmail(existingEmail).split("@")[0];
  if (existingLocal) {
    return existingLocal.replace(/[^a-z0-9._-]+/g, ".").replace(/^\.+|\.+$/g, "") || "webcaf-user";
  }

  const derived = (name || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return derived || "webcaf-user";
}

function getPrototypeCouncilEmail(name, councilName, existingEmail) {
  return `${getEmailLocalPart(name, existingEmail)}@${getPrototypeCouncilDomain(councilName)}`;
}

function syncCouncilAccountContext(account, councilNameInput, options = {}) {
  if (!account) return null;

  const councilName = (councilNameInput || account.councilName || "Your council").toString().trim();
  const councilDomain = getEmailDomainOrFallback(
    options.currentUser && options.currentUser.email,
    getPrototypeCouncilDomain(councilName)
  );
  account.councilName = councilName;
  account.allowedDomains = [councilDomain];

  const existingUsers = Array.isArray(account.users) ? account.users : [];
  const currentUser = options.currentUser && options.currentUser.role === "council"
    ? syncUserRoleState({
        ...options.currentUser,
        roles: normaliseRoles([
          ROLE_IDS.CAF_LEAD,
          ...(Array.isArray(options.currentUser.roles) ? options.currentUser.roles : []),
        ]),
        activeRole: ROLE_IDS.CAF_LEAD,
        accessRole: ACCESS_ROLES.CAF_LEAD,
        roleTitle: getRoleLabel(ROLE_IDS.CAF_LEAD),
        orgName: councilName,
        email: normaliseEmail(options.currentUser.email),
        status: "active",
      })
    : null;

  const otherUsers = existingUsers
    .filter((user) => !(currentUser && user.id === currentUser.id))
    .map((user) =>
      syncUserRoleState({
        ...user,
        email: `${getEmailLocalPart(user.name, user.email)}@${councilDomain}`,
        orgName: councilName,
      })
    );

  account.users = currentUser ? [currentUser, ...otherUsers] : otherUsers;

  const cafLead =
    currentUser ||
    account.users.find((user) => user.accessRole === ACCESS_ROLES.CAF_LEAD) ||
    account.users[0] ||
    null;
  account.contactName = (cafLead && cafLead.name) || "CAF Lead";
  account.contactEmail = (cafLead && cafLead.email) || `caf-lead@${councilDomain}`;
  account.allowlistedEmails = account.users.map((user) => user.email);

  return account;
}

function getEmailDomain(email) {
  const normalised = normaliseEmail(email);
  const parts = normalised.split("@");
  return parts.length === 2 ? parts[1] : "";
}

function buildSeededCouncilAccounts() {
  return clone(COUNCIL_ACCOUNTS);
}

function buildSeededCentralAdmins() {
  return clone(CENTRAL_ADMINS);
}

function buildRoundTwoAccessState() {
  return {
    councilAccounts: buildSeededCouncilAccounts(),
    centralAdmins: buildSeededCentralAdmins(),
    pendingRequests: [],
  };
}

function ensureRoundTwoAccessState(sessionData) {
  if (!sessionData.roundTwoAccess) {
    sessionData.roundTwoAccess = buildRoundTwoAccessState();
  }
  if (!Array.isArray(sessionData.roundTwoAccess.councilAccounts)) {
    sessionData.roundTwoAccess.councilAccounts = buildSeededCouncilAccounts();
  }
  if (!Array.isArray(sessionData.roundTwoAccess.centralAdmins)) {
    sessionData.roundTwoAccess.centralAdmins = buildSeededCentralAdmins();
  }
  if (!Array.isArray(sessionData.roundTwoAccess.pendingRequests)) {
    sessionData.roundTwoAccess.pendingRequests = [];
  }
  return sessionData.roundTwoAccess;
}

function getAllAccounts(sessionData) {
  const accessState = ensureRoundTwoAccessState(sessionData);
  return accessState.councilAccounts;
}

function getAllAdmins(sessionData) {
  const accessState = ensureRoundTwoAccessState(sessionData);
  return accessState.centralAdmins;
}

function findCouncilAccountByName(sessionData, councilName) {
  const target = normaliseText(councilName);
  if (!target) return null;
  return getAllAccounts(sessionData).find((account) => normaliseText(account.councilName) === target) || null;
}

function findCouncilAccountByDomain(sessionData, emailDomain) {
  const target = normaliseText(emailDomain);
  if (!target) return null;
  return getAllAccounts(sessionData).find((account) =>
    Array.isArray(account.allowedDomains) &&
    account.allowedDomains.some((domain) => normaliseText(domain) === target)
  ) || null;
}

function findCouncilAccountById(sessionData, accountId) {
  return getAllAccounts(sessionData).find((account) => account.id === accountId) || null;
}

function findUserRecordByEmail(sessionData, email) {
  const normalisedEmail = normaliseEmail(email);
  if (!normalisedEmail) return null;

  const admin = getAllAdmins(sessionData).find((user) => normaliseEmail(user.email) === normalisedEmail);
  if (admin) {
    return {
      user: admin,
      account: null,
      userType: "central-admin",
    };
  }

  for (const account of getAllAccounts(sessionData)) {
    const user = Array.isArray(account.users)
      ? account.users.find((row) => normaliseEmail(row.email) === normalisedEmail)
      : null;
    if (user) {
      return {
        user,
        account,
        userType: "council",
      };
    }
  }

  return null;
}

function isSupportedPublicSectorDomain(emailDomain) {
  return Boolean(emailDomain) && /\.gov\.uk$/.test(emailDomain);
}

function canManageCouncilSetup(user) {
  return Boolean(
    user &&
    (user.accessRole === ACCESS_ROLES.CENTRAL_ADMIN ||
      userHasPermission(user, PERMISSIONS.MANAGE_ROLES))
  );
}

function canManageUsers(user) {
  return canManageCouncilSetup(user);
}

function canViewAnnualAssessment(user) {
  return Boolean(user && user.role === "council");
}

function addCouncilUserToAccount(account, input) {
  const nextIndex = Array.isArray(account.users) ? account.users.length + 1 : 1;
  const roles = normaliseRoles(input.roles);
  const activeRole = pickDefaultActiveRole(roles);
  const user = {
    id: `u-${account.councilId}-${nextIndex}`,
    name: input.name,
    email: normaliseEmail(input.email),
    role: "council",
    accessRole: roles.includes(ROLE_IDS.CAF_LEAD) ? ACCESS_ROLES.CAF_LEAD : ACCESS_ROLES.COUNCIL_USER,
    roles,
    activeRole,
    roleTitle: getRoleLabel(activeRole) || "Council user",
    orgName: account.councilName,
    status: "active",
  };

  if (!Array.isArray(account.users)) {
    account.users = [];
  }
  account.users.push(user);
  if (!Array.isArray(account.allowlistedEmails)) {
    account.allowlistedEmails = [];
  }
  if (!account.allowlistedEmails.includes(user.email)) {
    account.allowlistedEmails.push(user.email);
  }
  return user;
}

function updateCouncilUserRoles(user, roleIds) {
  if (!user) return null;
  const roles = normaliseRoles(roleIds);
  const activeRole = roles.includes(user.activeRole) ? user.activeRole : pickDefaultActiveRole(roles);
  const nextUser = syncUserRoleState({
    ...user,
    roles,
    activeRole,
    accessRole: roles.includes(ROLE_IDS.CAF_LEAD) ? ACCESS_ROLES.CAF_LEAD : ACCESS_ROLES.COUNCIL_USER,
  });
  Object.assign(user, nextUser);
  return user;
}

function evaluateRegistrationRequest(sessionData, details) {
  const email = normaliseEmail(details.email);
  const councilName = (details.councilName || "").toString().trim();
  const accessPath = (details.accessPath || "join-existing").toString().trim();
  const emailDomain = getEmailDomain(email);
  const accountByName = findCouncilAccountByName(sessionData, councilName);
  const accountByDomain = findCouncilAccountByDomain(sessionData, emailDomain);
  const matchedAccount = accountByName || accountByDomain;

  if (!emailDomain || !isSupportedPublicSectorDomain(emailDomain)) {
    return {
      status: "unsupported-domain",
      email,
      emailDomain,
      councilName,
      accessPath,
      matchedAccount: null,
    };
  }

  if (accessPath === "join-existing") {
    if (matchedAccount) {
      return {
        status: "join-request",
        email,
        emailDomain,
        councilName: matchedAccount.councilName,
        accessPath,
        matchedAccount,
      };
    }

    return {
      status: "council-not-found",
      email,
      emailDomain,
      councilName,
      accessPath,
      matchedAccount: null,
    };
  }

  if (matchedAccount) {
    return {
      status: "existing-council",
      email,
      emailDomain,
      councilName: matchedAccount.councilName,
      accessPath,
      matchedAccount,
    };
  }

  return {
    status: "new-council-request",
    email,
    emailDomain,
    councilName,
    accessPath,
    matchedAccount: null,
  };
}

function storePendingAccessRequest(sessionData, request) {
  const accessState = ensureRoundTwoAccessState(sessionData);
  accessState.pendingRequests.push({
    id: `req-${Date.now()}`,
    requestedAt: new Date().toISOString(),
    ...request,
  });
}

module.exports = {
  ACCESS_ROLES,
  addCouncilUserToAccount,
  canManageCouncilSetup,
  canManageUsers,
  canViewAnnualAssessment,
  ensureRoundTwoAccessState,
  evaluateRegistrationRequest,
  findCouncilAccountByDomain,
  findCouncilAccountById,
  findCouncilAccountByName,
  findUserRecordByEmail,
  getEmailDomain,
  getPrototypeCouncilDomain,
  getPrototypeCouncilEmail,
  normaliseEmail,
  syncCouncilAccountContext,
  storePendingAccessRequest,
  updateCouncilUserRoles,
};
