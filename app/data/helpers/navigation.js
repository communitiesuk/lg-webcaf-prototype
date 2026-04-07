// app/data/helpers/navigation.js
// Build service navigation items with active state.

function buildNavigation(currentPath, role, researchRound, options = {}) {
  const onboardingComplete = Boolean(options.onboardingComplete);

  if (role === "mhclg") {
    return [
      {
        text: "Council overview",
        href: "/mhclg/dashboard",
        active: currentPath === "/mhclg/dashboard",
      },
      {
        text: "Engagement",
        href: "/mhclg/engagement",
        active: currentPath.startsWith("/mhclg/engagement"),
      },
    ];
  }

  if (role === "assurer") {
    const isCheckIns = currentPath.startsWith("/assurer/check-ins");
    const isQueue =
      currentPath.startsWith("/assurer/queue") ||
      currentPath.startsWith("/assurer/outcomes") ||
      currentPath.startsWith("/assurer/overview") ||
      currentPath.startsWith("/assurer/submission");

    return [
      {
        text: "Assurer queue",
        href: "/assurer/queue",
        active: isQueue,
      },
      {
        text: "Check-ins",
        href: "/assurer/check-ins",
        active: isCheckIns,
      },
    ];
  }

  if (researchRound === "round-2") {
    const scopePathBelongsToAnnualAssessment =
      onboardingComplete &&
      (currentPath === "/stages/2/scope" || currentPath.startsWith("/stages/2/scope/"));
    const onboardingActive =
      currentPath === "/onboarding" ||
      currentPath.startsWith("/onboarding/") ||
      currentPath === "/prepare/roles" ||
      (!scopePathBelongsToAnnualAssessment &&
        (currentPath === "/stages/2/scope" || currentPath.startsWith("/stages/2/scope/")));
    const annualAssessmentActive =
      currentPath.startsWith("/assessments/current") ||
      currentPath.startsWith("/self-assess/") ||
      scopePathBelongsToAnnualAssessment;

    const items = [
      {
        text: "Home",
        href: "/entry",
        active: currentPath === "/entry",
      },
      {
        text: "Onboarding and setup",
        href: "/onboarding",
        active: onboardingActive,
      },
      {
        text: "Users and roles",
        href: "/manage-users",
        active:
          currentPath === "/organisation-details" ||
          currentPath.startsWith("/manage-users"),
      },
    ];

    if (onboardingComplete) {
      items.splice(2, 0, {
        text: "Annual assessment",
        href: "/assessments/current/journey",
        active: annualAssessmentActive,
      });
    }

    return items;
  }

  const items = [
    { id: "journey", text: "Assessment journey", href: "/assessments/current/journey", match: ["/assessments/current/journey"] },
    { id: "prepare", text: "Prepare", href: "/prepare", match: ["/prepare"] },
    { id: "scope", text: "Set your scope", href: "/stages/2/scope", match: ["/stages/2/scope"] },
    {
      id: "tracker",
      text: "Assessment dashboard",
      href: "/assessments/current/dashboard",
      match: ["/assessments/current"],
    },
  ];

  return items.map((item) => ({
    text: item.text,
    href: item.href,
    active: Boolean(
      currentPath && item.match.some((prefix) => currentPath === prefix || currentPath.startsWith(prefix + "/"))
    ),
  }));
}

function getRoundTwoAccountBackHref(researchRound, onboardingComplete) {
  if (researchRound === "round-2") {
    return onboardingComplete ? "/onboarding" : "/entry";
  }
  return "/entry";
}

function getRoundTwoOutcomeReturnContext(lens, systemId) {
  if (lens === "bc" && systemId) {
    return {
      href: `/self-assess/bc/${encodeURIComponent(systemId)}`,
      text: "Save and return to selected system",
    };
  }

  return {
    href: "/assessments/current/self-assessment/ad",
    text: "Save and return to A and D self-assessment",
  };
}

module.exports = {
  buildNavigation,
  getRoundTwoAccountBackHref,
  getRoundTwoOutcomeReturnContext,
};
