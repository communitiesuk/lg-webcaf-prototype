const assurerAssignments = require("../seed/assurer-assignments");
const { getActiveRole, ROLE_IDS } = require("./roles");

function isAssurerUser(user) {
  return getActiveRole(user) === ROLE_IDS.ASSURER || (user && user.role === "assurer");
}

function getAssignedCouncils(user) {
  if (!user || !user.id) return [];
  const assignments = assurerAssignments.assignments || {};
  return Array.isArray(assignments[user.id]) ? assignments[user.id] : [];
}

function getAssurerAccessContext(user, assessment) {
  const assignedCouncils = getAssignedCouncils(user);
  const activeCouncilName =
    (assessment && assessment.councilName ? assessment.councilName : "") ||
    assignedCouncils[0] ||
    "";
  const isAssignedAssessment =
    assignedCouncils.length === 0 || !activeCouncilName
      ? true
      : assignedCouncils.includes(activeCouncilName);

  return {
    isAssurer: isAssurerUser(user),
    supplierName: assurerAssignments.supplierName || "Assurance supplier",
    assignedCouncils,
    activeCouncilName,
    isAssignedAssessment,
  };
}

module.exports = {
  getAssignedCouncils,
  getAssurerAccessContext,
  isAssurerUser,
};
