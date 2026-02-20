// app/data/helpers/journey.js
// Build progress steps and breadcrumbs for the assessment journey.

function buildProgress(currentPath) {
  if (currentPath.startsWith("/stages/2/scope")) {
    const steps = [
      { id: "context", text: "Set organisational context", href: "/stages/2/scope/context", match: ["/stages/2/scope/context"] },
      { id: "roles", text: "CAF team and roles", href: "/stages/2/scope/roles", match: ["/stages/2/scope/roles"] },
      { id: "services", text: "Essential services", href: "/stages/2/scope/services/add", match: ["/stages/2/scope/services"] },
      { id: "systems", text: "Critical systems", href: "/stages/2/scope/systems/add", match: ["/stages/2/scope/systems"] },
      { id: "mapping", text: "Map systems", href: "/stages/2/scope/mapping/review", match: ["/stages/2/scope/mapping"] },
      { id: "priority", text: "Prioritise systems", href: "/stages/2/scope/priority/shortlist", match: ["/stages/2/scope/priority"] },
    ];

    const currentIndex = steps.findIndex((step) =>
      step.match.some((prefix) => currentPath === prefix || currentPath.startsWith(prefix + "/"))
    );

    if (currentIndex === -1) return null;

    const decorated = steps.map((step, index) => ({
      text: step.text,
      href: step.href,
      status: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
    }));

    return {
      steps: decorated,
      currentIndex,
      total: steps.length,
      currentLabel: steps[currentIndex] ? steps[currentIndex].text : "",
    };
  }

  const steps = [
    { id: "understand", text: "Stage 1: Understand CAF", href: "/stages/1", match: ["/stages/1"] },
    {
      id: "scope",
      text: "Stage 2: Prepare & set scope",
      href: "/stages/2/scope",
      match: ["/prepare", "/profile", "/stages/2/scope"],
    },
    {
      id: "selfad",
      text: "Stage 3: Self-assess organisation (A & D)",
      href: "/self-assess/ad",
      match: ["/self-assess/ad"],
    },
    {
      id: "selfbc",
      text: "Stage 4: Self-assess critical systems (B & C)",
      href: "/self-assess/bc/select-system",
      match: ["/self-assess/bc"],
    },
    {
      id: "assurance",
      text: "Stage 5: Independent assurance review",
      href: "/assurance-review",
      match: ["/evidence-library", "/assurance-review", "/assurer"],
    },
    {
      id: "improve",
      text: "Stage 6: Improvement plan",
      href: "/improvement-plan",
      match: ["/improvement-plan"],
    },
    {
      id: "submit",
      text: "Stage 7: Submit progress to MHCLG",
      href: "/submit-progress",
      match: ["/submit-progress", "/submit-complete"],
    },
  ];

  const currentIndex = steps.findIndex((step) =>
    step.match.some((prefix) => currentPath === prefix || currentPath.startsWith(prefix + "/"))
  );

  if (currentIndex === -1) return null;

  const decorated = steps.map((step, index) => ({
    text: step.text,
    href: step.href,
    status: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
  }));

  return {
    steps: decorated,
    currentIndex,
    total: steps.length,
    currentLabel: steps[currentIndex] ? steps[currentIndex].text : "",
  };
}

function buildBreadcrumbs(currentPath) {
  if (currentPath === "/assessments/current/journey") {
    return [{ text: "CAF journey" }];
  }

  const crumbs = [{ text: "CAF journey", href: "/assessments/current/journey" }];

  if (currentPath.startsWith("/stages/1")) {
    crumbs.push({ text: "Understand CAF" });
    return crumbs;
  }

  if (currentPath.startsWith("/prepare")) {
    crumbs.push({ text: "Prepare" });
    return crumbs;
  }

  if (currentPath.startsWith("/profile")) {
    crumbs.push({ text: "Profile" });
    return crumbs;
  }

  if (currentPath.startsWith("/stages/2/scope")) {
    crumbs.push({ text: "Set your scope", href: "/stages/2/scope" });

    if (currentPath === "/stages/2/scope") return crumbs;
    if (currentPath.includes("/context")) {
      crumbs.push({ text: "Organisational context" });
    } else if (currentPath.includes("/roles")) {
      crumbs.push({ text: "CAF team and roles" });
    } else if (currentPath.includes("/services")) {
      crumbs.push({ text: "Essential services" });
    } else if (currentPath.includes("/systems")) {
      crumbs.push({ text: "Critical systems" });
    } else if (currentPath.includes("/mapping")) {
      crumbs.push({ text: "Mapping" });
    } else if (currentPath.includes("/priority")) {
      crumbs.push({ text: "Prioritise systems" });
    } else {
      crumbs.push({ text: "Set your scope" });
    }
    return crumbs;
  }

  if (currentPath.startsWith("/assessments/current")) {
    if (currentPath === "/assessments/current/dashboard") {
      crumbs.push({ text: "Progress tracker" });
    } else {
      crumbs.push({ text: "Progress tracker", href: "/assessments/current/dashboard" });
    }
    return crumbs;
  }

  if (currentPath.startsWith("/self-assess/ad")) {
    crumbs.push({ text: "Self-assess (A&D)", href: "/self-assess/ad" });
    if (currentPath !== "/self-assess/ad") crumbs.push({ text: "Outcome" });
    return crumbs;
  }

  if (currentPath.startsWith("/self-assess/bc")) {
    crumbs.push({ text: "Self-assess (B&C)", href: "/self-assess/bc/select-system" });
    if (currentPath !== "/self-assess/bc" && currentPath !== "/self-assess/bc/select-system") {
      crumbs.push({ text: "System assessment" });
    }
    return crumbs;
  }

  if (currentPath.startsWith("/evidence-library")) {
    crumbs.push({ text: "Evidence pack" });
    return crumbs;
  }

  if (currentPath.startsWith("/assurance-review")) {
    crumbs.push({ text: "Assurance" });
    return crumbs;
  }

  if (currentPath.startsWith("/improvement-plan")) {
    crumbs.push({ text: "Improvement plan" });
    return crumbs;
  }

  if (currentPath.startsWith("/submit-progress")) {
    crumbs.push({ text: "Submit" });
    return crumbs;
  }

  return crumbs;
}

module.exports = {
  buildProgress,
  buildBreadcrumbs,
};
