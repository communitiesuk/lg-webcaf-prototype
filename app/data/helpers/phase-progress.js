function buildPhaseProgress(milestones) {
  const list = Array.isArray(milestones) ? milestones : [];
  const total = list.length;
  const completed = list.filter((milestone) => Boolean(milestone && milestone.completed)).length;
  const currentIndex = list.findIndex((milestone) => !milestone.completed);
  const nextMilestone = currentIndex >= 0 ? list[currentIndex] : null;

  return {
    completed,
    total,
    milestones: list.map((milestone, index) => ({
      ...milestone,
      state: milestone.completed ? "completed" : index === currentIndex ? "current" : "not_yet",
    })),
    nextMilestoneLabel: nextMilestone ? nextMilestone.label : "",
    statusText:
      completed === 0
        ? "Not started"
        : completed >= total && total > 0
          ? "Complete"
          : "In progress",
  };
}

function hasRoundTwoScopeSummaryComplete(assessment) {
  if (!assessment) return false;
  const stage = assessment.stage || {};
  const scopeReview = assessment.scopeReview || {};
  const scope = assessment.scope || {};
  const services = Array.isArray(scope.essentialServices) ? scope.essentialServices : [];
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];

  return Boolean(
    scopeReview.completed ||
    stage.prepareScopeComplete ||
    (
      scope.context &&
      scope.context.completed &&
      services.length > 0 &&
      systems.length > 0
    )
  );
}

function isRoundTwoOnboardingComplete(assessment) {
  return hasRoundTwoScopeSummaryComplete(assessment);
}

function buildRoundTwoSetupProgress(assessment) {
  return buildPhaseProgress([
    {
      label: "Review and update your scope summary",
      completed: hasRoundTwoScopeSummaryComplete(assessment),
    },
  ]);
}

module.exports = {
  buildPhaseProgress,
  buildRoundTwoSetupProgress,
  hasRoundTwoScopeSummaryComplete,
  isRoundTwoOnboardingComplete,
};
