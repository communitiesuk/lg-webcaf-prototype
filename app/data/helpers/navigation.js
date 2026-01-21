// app/data/helpers/navigation.js
// Build service navigation items with active state.

function buildNavigation(currentPath, role) {
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

  const items = [
    { id: "prepare", text: "Prepare", href: "/prepare", match: ["/prepare"] },
    { id: "profile", text: "Profile", href: "/profile", match: ["/profile"] },
    {
      id: "tracker",
      text: "Progress tracker",
      href: "/assessments/current/dashboard",
      match: ["/assessments/current"],
    },
    {
      id: "self-ad",
      text: "Self-assess (A&D)",
      href: "/self-assess/ad",
      match: ["/self-assess/ad"],
    },
    {
      id: "self-bc",
      text: "Self-assess (B&C)",
      href: "/self-assess/bc",
      match: ["/self-assess/bc"],
    },
    { id: "evidence", text: "Evidence pack", href: "/evidence-library", match: ["/evidence-library"] },
    { id: "assure", text: "Assurance", href: "/assurance-review", match: ["/assurance-review"] },
    { id: "improve", text: "Improvement plan", href: "/improvement-plan", match: ["/improvement-plan"] },
    { id: "submit", text: "Submit", href: "/submit-progress", match: ["/submit-progress"] },
  ];

  return items.map((item) => ({
    text: item.text,
    href: item.href,
    active: Boolean(
      currentPath && item.match.some((prefix) => currentPath === prefix || currentPath.startsWith(prefix + "/"))
    ),
  }));
}

module.exports = {
  buildNavigation,
};
