// app/data/helpers/journey.js
// Build progress steps and breadcrumbs for the assessment journey.

function buildProgress(currentPath) {
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
  const crumbs = [{ text: "Home", href: "/entry" }];

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
    crumbs.push({ text: "Scope pack", href: "/stages/2/scope" });

    if (currentPath === "/stages/2/scope") return crumbs;
    if (currentPath.includes("/services")) {
      crumbs.push({ text: "Essential services" });
    } else if (currentPath.includes("/systems")) {
      crumbs.push({ text: "Critical systems" });
    } else if (currentPath.includes("/mapping")) {
      crumbs.push({ text: "Mapping" });
    } else if (currentPath.includes("/priority")) {
      crumbs.push({ text: "Prioritisation" });
    } else {
      crumbs.push({ text: "Scope pack" });
    }
    return crumbs;
  }

  if (currentPath.startsWith("/assessments/current")) {
    crumbs.push({ text: "Progress tracker" });
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
