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
    { id: "journey", text: "CAF journey", href: "/assessments/current/journey", match: ["/assessments/current/journey"] },
    { id: "prepare", text: "Prepare", href: "/prepare", match: ["/prepare"] },
    { id: "scope", text: "Set your scope", href: "/stages/2/scope", match: ["/stages/2/scope"] },
    {
      id: "tracker",
      text: "Progress tracker",
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

module.exports = {
  buildNavigation,
};
