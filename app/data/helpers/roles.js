const ROLE_IDS = {
  CAF_LEAD: "caf-lead",
  APPROVER: "approver",
  COLLABORATOR: "collaborator",
  ASSURER: "assurer",
  QA: "qa",
};

const PERMISSIONS = {
  EDIT_CONTENT: "edit_content",
  REVIEW_CONTENT: "review_content",
  APPROVE_CONTENT: "approve_content",
  ASSURE_CONTENT: "assure_content",
  QA_CONTENT: "qa_content",
  MANAGE_ROLES: "manage_roles",
};

const ROLE_PRIORITY = [
  ROLE_IDS.CAF_LEAD,
  ROLE_IDS.APPROVER,
  ROLE_IDS.COLLABORATOR,
  ROLE_IDS.QA,
  ROLE_IDS.ASSURER,
];

const ROLE_DEFINITIONS = {
  [ROLE_IDS.CAF_LEAD]: {
    id: ROLE_IDS.CAF_LEAD,
    label: "CAF lead",
    description:
      "Leads the council's WebCAF work, coordinates the team, and can assign or change roles for the council account.",
    permissions: [
      PERMISSIONS.EDIT_CONTENT,
      PERMISSIONS.REVIEW_CONTENT,
      PERMISSIONS.MANAGE_ROLES,
    ],
  },
  [ROLE_IDS.APPROVER]: {
    id: ROLE_IDS.APPROVER,
    label: "Approver",
    description:
      "Provides the final internal approval for the self-assessment after review is complete.",
    permissions: [PERMISSIONS.APPROVE_CONTENT],
  },
  [ROLE_IDS.COLLABORATOR]: {
    id: ROLE_IDS.COLLABORATOR,
    label: "Collaborator",
    description:
      "Contributes evidence and draft assessment content but does not approve or assign roles.",
    permissions: [PERMISSIONS.EDIT_CONTENT],
  },
  [ROLE_IDS.ASSURER]: {
    id: ROLE_IDS.ASSURER,
    label: "Assurer",
    description:
      "Carries out the independent assurance view and uses the assurer workspace to review evidence and outcomes.",
    permissions: [PERMISSIONS.ASSURE_CONTENT],
  },
  [ROLE_IDS.QA]: {
    id: ROLE_IDS.QA,
    label: "QA",
    description:
      "Checks draft content for quality and completeness before it moves to approval.",
    permissions: [PERMISSIONS.REVIEW_CONTENT, PERMISSIONS.QA_CONTENT],
  },
};

function getSupportedRoles() {
  return ROLE_PRIORITY.map((roleId) => ROLE_DEFINITIONS[roleId]);
}

function getRoleDefinition(roleId) {
  return ROLE_DEFINITIONS[roleId] || null;
}

function normaliseRoles(input) {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string" && input
      ? [input]
      : [];
  const seen = new Set();
  return raw
    .map((roleId) => (roleId || "").toString().trim().toLowerCase())
    .filter((roleId) => ROLE_DEFINITIONS[roleId] && !seen.has(roleId) && seen.add(roleId));
}

function pickDefaultActiveRole(roles) {
  const available = normaliseRoles(roles);
  return ROLE_PRIORITY.find((roleId) => available.includes(roleId)) || available[0] || "";
}

function getActiveRole(user) {
  if (!user) return "";
  const roles = normaliseRoles(user.roles || user.activeRole || user.accessRole);
  if (roles.length === 0) return "";
  const requested = (user.activeRole || "").toString().trim().toLowerCase();
  return roles.includes(requested) ? requested : pickDefaultActiveRole(roles);
}

function getRoleLabel(roleId) {
  const role = getRoleDefinition(roleId);
  return role ? role.label : "";
}

function getRoleLabels(roleIds) {
  return normaliseRoles(roleIds).map((roleId) => getRoleLabel(roleId));
}

function hasPermissionForRole(roleId, permission) {
  const role = getRoleDefinition(roleId);
  return Boolean(role && Array.isArray(role.permissions) && role.permissions.includes(permission));
}

function userHasRole(user, roleId) {
  return normaliseRoles(user && user.roles).includes(roleId);
}

function userHasPermission(user, permission, options = {}) {
  if (!user || !permission) return false;
  const activeOnly = options.activeOnly !== false;
  const roles = activeOnly ? [getActiveRole(user)] : normaliseRoles(user.roles);
  return roles.some((roleId) => hasPermissionForRole(roleId, permission));
}

function getUserPermissions(user, options = {}) {
  const activeOnly = options.activeOnly !== false;
  const roles = activeOnly ? [getActiveRole(user)] : normaliseRoles(user && user.roles);
  const permissions = new Set();
  roles.forEach((roleId) => {
    const role = getRoleDefinition(roleId);
    if (!role || !Array.isArray(role.permissions)) return;
    role.permissions.forEach((permission) => permissions.add(permission));
  });
  return Array.from(permissions);
}

function getPermissionSummary() {
  return [
    {
      id: PERMISSIONS.EDIT_CONTENT,
      label: "Edit content",
      description: "Draft or update assessment content and evidence references.",
    },
    {
      id: PERMISSIONS.REVIEW_CONTENT,
      label: "Review content",
      description: "Check draft content and send it back or move it forward.",
    },
    {
      id: PERMISSIONS.APPROVE_CONTENT,
      label: "Approve content",
      description: "Give final internal approval after review is complete.",
    },
    {
      id: PERMISSIONS.ASSURE_CONTENT,
      label: "Assure content",
      description: "Carry out independent assurance activity in the assurer view.",
    },
    {
      id: PERMISSIONS.QA_CONTENT,
      label: "QA content",
      description: "Provide quality assurance checks before approval.",
    },
    {
      id: PERMISSIONS.MANAGE_ROLES,
      label: "Manage or assign roles",
      description: "Add users, assign roles, and update role allocations for the council account.",
    },
  ];
}

function getRolePermissionRows() {
  const summary = getPermissionSummary();
  return getSupportedRoles().map((role) => ({
    ...role,
    permissionLabels: summary
      .filter((permission) => role.permissions.includes(permission.id))
      .map((permission) => permission.label),
  }));
}

function isAssurerRole(roleId) {
  return roleId === ROLE_IDS.ASSURER;
}

function deriveSystemRole(user) {
  if (!user) return "";
  if (user.role === "mhclg") return "mhclg";
  const activeRole = getActiveRole(user);
  if (isAssurerRole(activeRole)) return "assurer";
  if (activeRole) return "council";
  return (user.role || "").toString();
}

function syncUserRoleState(user) {
  if (!user) return null;
  const roles = normaliseRoles(user.roles || user.activeRole || user.accessRole);
  const activeRole = roles.length > 0 ? getActiveRole({ ...user, roles }) : "";
  const roleTitle = activeRole ? getRoleLabel(activeRole) : (user.roleTitle || "");
  return {
    ...user,
    roles,
    activeRole,
    role: deriveSystemRole({ ...user, roles, activeRole }),
    roleTitle,
    roleLabels: getRoleLabels(roles),
  };
}

module.exports = {
  PERMISSIONS,
  ROLE_IDS,
  getActiveRole,
  getPermissionSummary,
  getRoleDefinition,
  getRoleLabel,
  getRoleLabels,
  getRolePermissionRows,
  getSupportedRoles,
  getUserPermissions,
  hasPermissionForRole,
  normaliseRoles,
  pickDefaultActiveRole,
  syncUserRoleState,
  userHasPermission,
  userHasRole,
};
