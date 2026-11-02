// app/data/helpers/setup.js
//
// Helpers for the "Set up your council" (Setup v6) prototype section.
// Owns: the Setup persona and chrome (service name + service navigation), seeding of the
// Setup session state, and the S01 task-list model. All Setup session state lives under
// req.session.data.setup (see docs/setup-session-keys.md). The Setup section is kept
// isolated from the rest of the prototype: chrome is painted via res.locals, not by
// mutating the shared prototype session user.

const {
  buildSetupSeed,
  ESSENTIAL_SERVICE_OPTIONS,
  COUNCIL_REGISTER,
} = require("../seed/setup");

function slugify(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Design persona (Figma Setup v6). Shown in the service navigation.
const SETUP_USER = {
  name: "Jo Hart",
  orgName: "Westborough Borough Council",
  role: "council",
};

// Service name as named in the brief and drawn in the Figma service navigation.
// NOTE: differs from the global config.json serviceName ("CAF for Local Government").
// Overridden via res.locals for /setup pages only. Logged as a deviation.
const SETUP_SERVICE_NAME = "Assess and manage your council's cyber resilience";

// Holding page for links that leave the Setup section (Access management, Decide, etc.).
const HOLDING_HREF = "/setup/not-in-this-prototype";

// Ensure the Setup session state exists (idempotent). Boots into the populated state
// the design depicts. EXAMPLE DATA, NOT REAL.
function ensureSetup(sessionData) {
  if (!sessionData) return null;
  if (!sessionData.setup || !sessionData.setup.seeded) {
    sessionData.setup = buildSetupSeed();
  }
  // Keep the Setup council name in step with the council identified at claim (from the
  // signed-in email), so the task-list and S30 captions match the nav identity. Demo
  // scenarios with no claim journey keep the seeded name.
  const claimCouncil = sessionData.claim && sessionData.claim.council;
  if (claimCouncil && claimCouncil.name) {
    sessionData.setup.council.name = claimCouncil.name;
  }
  return sessionData.setup;
}

// Service navigation matching the Figma design (order and labels verbatim).
// "Your council" is the active section for every /setup page except the holding page.
function buildSetupNavigation(currentPath) {
  const onSetup =
    typeof currentPath === "string" &&
    currentPath.startsWith("/setup") &&
    currentPath !== HOLDING_HREF;

  return [
    { text: "Dashboard", href: "/dashboard" },
    { text: "Your council", href: "/setup/task-list", active: onSetup },
    { text: "Assessments", href: "/self-assessment" },
    { text: "People", href: HOLDING_HREF },
    // "Switch council" removed from nav — one council per person for now (pending multi-council).
    // Changed in build, prototype, pending design sign-off.
    { text: "Sign out", href: "/get-started/sign-out" },
  ];
}

// S01 task-list model. Only tasks 4-6 (services / infrastructure / systems) carry hint text
// now — a dynamic progress line reflecting the current counts. The static descriptive hints on
// the other tasks were removed (they restated the title). Grouped to match the design:
// pre-services tasks, then "Your services and systems", then "Finish setting up".
function buildSetupTaskList(setup) {
  setup = setup || {};
  const services = setup.essentialServices || [];
  const platforms = setup.platforms || [];
  const systems = setup.criticalSystems || [];
  const ctx = setup.councilContext || {};
  const sector = setup.sectorContext || {};
  const method = setup.methodology || {};
  const people = setup.people || {};
  const cafLead = people.cafLead || {};
  const approver = people.approver || {};
  // People tasks: confirmed (recorded / existing user) -> Completed; pending (invited, awaiting
  // acceptance) -> Incomplete; otherwise Not yet started.
  const peopleStatus = (p) => (p.confirmed ? completed : p.pending ? incomplete : notStarted);

  // GOV.UK task list statuses (standard set): "Completed" is plain text with no tag; "Incomplete"
  // is a blue tag; "Not yet started" is a grey tag. No other statuses are used.
  const completed = { text: "Completed" };
  const incomplete = { tag: { text: "Incomplete", classes: "govuk-tag--blue" } };
  const notStarted = { tag: { text: "Not yet started", classes: "govuk-tag--grey" } };

  // Statuses and hints are derived from the Setup state, so the list is correct for both
  // the populated demo and an empty (build-from-scratch) council.
  const ctxDone = sector.confirmed && ctx.completed;
  const ctxStarted = sector.confirmed || ctx.completed;
  const svcToLink = services.filter((s) => s.infraStatus === "to_do").length;
  const platUnlinked = platforms.filter(
    (p) => (p.linkedServices || []).length === 0 && (p.linkedSystems || []).length === 0
  ).length;
  const sysUnlinked = systems.filter((s) => (s.supportedServices || []).length === 0).length;
  const plural = (n) => (n === 1 ? "" : "s");

  const preServices = [
    {
      title: { text: "1. Confirm your CAF Lead" },
      href: "/access/caf-lead?return=/setup/task-list",
      status: peopleStatus(cafLead),
    },
    {
      title: { text: "2. Organisational context" },
      href: "/setup/sector-context",
      status: ctxDone ? completed : ctxStarted ? incomplete : notStarted,
    },
    {
      title: { text: "3. How you identify services and systems" },
      href: "/setup/methodology",
      status: method.completed ? completed : notStarted,
    },
  ];

  const servicesAndSystems = [
    {
      title: { text: "4. Your essential services" },
      href: "/setup/essential-services/choose",
      hint: {
        text: services.length
          ? `${services.length} added${svcToLink ? ` · ${svcToLink} still to link to infrastructure` : ""}`
          : "Add the services your council delivers",
      },
      status: services.length ? incomplete : notStarted,
    },
    {
      title: { text: "5. Your shared infrastructure" },
      href: "/setup/shared-infrastructure",
      hint: {
        text: platforms.length
          ? `${platforms.length} platform${plural(platforms.length)}${platUnlinked ? ` · ${platUnlinked} not linked to anything yet` : ""}`
          : "Add the platforms your services share",
      },
      status: platforms.length ? incomplete : notStarted,
    },
    {
      title: { text: "6. Your critical systems" },
      href: "/setup/critical-systems",
      hint: {
        text: systems.length
          ? `${systems.length} added${sysUnlinked ? ` · ${sysUnlinked} not linked to a service yet` : ""}`
          : "Add your most critical systems",
      },
      status: systems.length ? incomplete : notStarted,
    },
  ];

  const finish = [
    {
      title: { text: "7. Confirm your Approver" },
      href: "/access/approver?return=/setup/task-list",
      status: peopleStatus(approver),
    },
    {
      title: { text: "8. Check and confirm" },
      href: "/setup/coverage-check",
      status: setup.completed ? completed : notStarted,
    },
  ];

  return { preServices, servicesAndSystems, finish };
}

// --- Essential services -------------------------------------------------------------

function getService(setup, serviceId) {
  return (setup.essentialServices || []).find((s) => s.id === serviceId) || null;
}

// Count critical systems linked to a service, by service id or any of its function ids.
function countLinkedSystems(setup, service) {
  return linkedSystemsFor(setup, service).length;
}

function linkedSystemsFor(setup, service) {
  const ids = new Set([service.id, ...(service.functions || []).map((f) => f.id)]);
  return (setup.criticalSystems || []).filter((sys) =>
    (sys.supportedServices || []).some((ref) => ids.has(ref))
  );
}

// Build the S36 hub summary rows, formatted exactly as the design does.
function buildServiceHubRows(setup) {
  return (setup.essentialServices || []).map((svc) => {
    const fnCount = (svc.functions || []).length;
    const platCount = platformsForService(setup, svc.id).length;
    const sysCount = countLinkedSystems(setup, svc);

    const parts = [];
    parts.push(fnCount > 0 ? `${fnCount} function${fnCount === 1 ? "" : "s"}` : "Functions to do");
    if (platCount > 0) parts.push(`${platCount} platform${platCount === 1 ? "" : "s"}`);
    parts.push(
      sysCount > 0
        ? `${sysCount} critical system${sysCount === 1 ? "" : "s"}`
        : "No critical systems linked yet"
    );
    if (svc.infraStatus === "complete") parts.push("Complete");
    else if (svc.infraStatus === "link_later") parts.push("Infrastructure: link later");
    else parts.push("Infrastructure to do");

    return {
      id: svc.id,
      name: svc.name,
      summary: parts.join(" · "),
      action: svc.infraStatus === "complete" ? "Change" : "Continue",
    };
  });
}

// Consequences shown on S46 when removing a service. Derived from actual state.
function buildRemoveServiceConsequences(setup, service) {
  const fnCount = (service.functions || []).length;
  const platCount = platformsForService(setup, service.id).length;
  // Systems that would be left with no essential service after removing this one.
  const orphaned = linkedSystemsFor(setup, service).filter((sys) => {
    const remainingRefs = (sys.supportedServices || []).filter((ref) => {
      if (ref === service.id) return false;
      return !(service.functions || []).some((f) => f.id === ref);
    });
    return remainingRefs.length === 0;
  });

  const bullets = [];
  bullets.push(`remove its ${fnCount} function${fnCount === 1 ? "" : "s"}`);
  if (platCount > 0) {
    bullets.push(
      `unlink ${platCount} shared platform${platCount === 1 ? "" : "s"} from it; the platforms stay on your list`
    );
  }
  orphaned.forEach((sys) => {
    bullets.push(`leave 1 critical system, ${sys.name}, not linked to any essential service`);
  });

  return { bullets, orphaned };
}

// Reconcile the essential services list with the S35 pick-list selection.
// Keeps existing (rich) services whose name is still ticked, drops unticked list
// services, and adds empty services for newly ticked names. Custom services
// (source !== "list") are left untouched.
function reconcileChosenServices(setup, selectedNames) {
  const chosen = new Set(selectedNames);
  const existing = setup.essentialServices || [];

  const kept = existing.filter(
    (svc) => svc.source !== "list" || chosen.has(svc.name)
  );
  const keptNames = new Set(kept.map((s) => s.name));

  selectedNames.forEach((name) => {
    if (!keptNames.has(name)) {
      kept.push({
        id: `svc-${slugify(name)}`,
        name,
        source: "list",
        functions: [],
        platforms: [],
        noSystemReason: "",
        infraStatus: "to_do",
      });
      keptNames.add(name);
    }
  });

  setup.essentialServices = kept;
}

// --- Shared infrastructure (platforms) ----------------------------------------------

// S12c "What type of platform is it?" radio options (verbatim, in order).
const PLATFORM_TYPE_OPTIONS = [
  "Identity and access management",
  "Network",
  "Hosting or cloud control plane",
  "Integration or API gateway",
  "Logging and monitoring",
  "Something else",
];

function getPlatform(setup, platformId) {
  return (setup.platforms || []).find((p) => p.id === platformId) || null;
}

function getSystem(setup, systemId) {
  return (setup.criticalSystems || []).find((s) => s.id === systemId) || null;
}

function platformsForService(setup, serviceId) {
  return (setup.platforms || []).filter((p) =>
    (p.linkedServices || []).includes(serviceId)
  );
}

function platformsForSystem(setup, systemId) {
  return (setup.platforms || []).filter((p) =>
    (p.linkedSystems || []).includes(systemId)
  );
}

function plural(n) {
  return n === 1 ? "" : "s";
}

// S39 hub rows: platform, type, support counts, and whether to Change or Link it.
function buildInfraHubRows(setup) {
  return (setup.platforms || []).map((p) => {
    const svcCount = (p.linkedServices || []).length;
    const sysCount = (p.linkedSystems || []).length;
    let support;
    if (svcCount > 0 && sysCount > 0) {
      support = `Supports ${svcCount} service${plural(svcCount)} and ${sysCount} system${plural(sysCount)}`;
    } else if (svcCount > 0) {
      support = `Supports ${svcCount} service${plural(svcCount)}`;
    } else if (sysCount > 0) {
      support = `Supports ${sysCount} system${plural(sysCount)}`;
    } else {
      support = "Not linked to any service or system yet";
    }
    const linked = svcCount > 0 || sysCount > 0;
    return {
      id: p.id,
      name: p.name,
      summary: `${p.type} · ${support}`,
      action: linked ? "Change" : "Link it",
    };
  });
}

// S45 model: all services and systems, pre-ticked with what this platform links.
function buildPlatformReliesModel(setup, platform) {
  return {
    services: (setup.essentialServices || []).map((s) => ({
      id: s.id,
      name: s.name,
      checked: (platform.linkedServices || []).includes(s.id),
    })),
    systems: (setup.criticalSystems || []).map((s) => ({
      id: s.id,
      name: s.name,
      checked: (platform.linkedSystems || []).includes(s.id),
    })),
  };
}

// S38 / S20 model: all platforms, pre-ticked with those linked to a service/system.
function buildPlatformChoices(setup, linkedIds) {
  const linked = new Set(linkedIds || []);
  return (setup.platforms || []).map((p) => ({
    id: p.id,
    name: p.name,
    checked: linked.has(p.id),
  }));
}

// S49 remove-platform consequence sentence, derived.
function buildRemovePlatformConsequences(platform) {
  const svcCount = (platform.linkedServices || []).length;
  const sysCount = (platform.linkedSystems || []).length;
  return `This core infrastructure platform supports ${svcCount} essential service${plural(svcCount)} and ${sysCount} critical system${plural(sysCount)}. If you remove it, these links will be removed.`;
}

// Remove a service from every platform that lists it.
function unlinkServiceFromPlatforms(setup, serviceId) {
  (setup.platforms || []).forEach((p) => {
    p.linkedServices = (p.linkedServices || []).filter((id) => id !== serviceId);
  });
}

// --- Critical systems ---------------------------------------------------------------

// S19 "What else does this system do for the council?" options (verbatim, in order).
const CORPORATE_SERVICE_OPTIONS = [
  { value: "email-communication", label: "Email and communication" },
  { value: "office-productivity", label: "Office productivity" },
  { value: "document-storage", label: "Document storage and management" },
  { value: "hr", label: "HR" },
  { value: "payroll", label: "Payroll" },
  { value: "finance-accounting", label: "Finance and accounting" },
  { value: "procurement-contract", label: "Procurement and contract management" },
  { value: "crm", label: "Customer relationship management" },
  { value: "help-desk", label: "Help desk / IT support" },
  { value: "data-analytics", label: "Data management / analytics" },
  { value: "other", label: "Other" },
];

// Overall criticality derived from the three impact ratings (S28 shows this).
function deriveCriticality(impact) {
  const score = { low: 1, medium: 2, high: 3 };
  const c = score[impact && impact.confidentiality];
  const i = score[impact && impact.integrity];
  const a = score[impact && impact.availability];
  if (!c || !i || !a) return "";
  const total = c + i + a;
  if (total >= 8) return "Mission critical";
  if (total >= 6) return "Business critical";
  if (total >= 4) return "Business supporting";
  return "Non-critical";
}

// S23 hub rows: system name, status line, and the right action.
function buildCriticalSystemsHubRows(setup) {
  return (setup.criticalSystems || []).map((sys) => {
    const linked = (sys.supportedServices || []).length > 0;
    const parts = [];
    if (sys.assessedDate) parts.push(`Assessed ${sys.assessedDate}`);
    if (sys.detailsComplete) {
      const crit = deriveCriticality(sys.impact);
      if (crit) parts.push(crit);
      parts.push("Details complete");
    } else if (!linked) {
      parts.push("Not linked to a service yet");
    } else {
      parts.push("Details to do");
    }
    let action = "Add details";
    if (!linked) action = "Link it";
    else if (sys.detailsComplete) action = "Change";
    // "Add details" starts the owner/ratings pass (S27); "Link it" opens the system in edit mode
    // (S14); "Change" opens the per-system check-answers summary, where every field can be changed.
    let href = `/setup/critical-systems/${sys.id}/edit`;
    if (action === "Add details") href = `/setup/critical-systems/${sys.id}/owner`;
    else if (action === "Change") href = `/setup/critical-systems/${sys.id}/summary`;
    return { id: sys.id, name: sys.name, summary: parts.join(" · "), action, href };
  });
}

// Readable labels for the stored values, used by the per-system check-answers summary (S30-style).
const SUPPLIER_MANAGED_LABELS = {
  fully: "Yes, fully",
  partially: "Yes, partially",
  council: "No, the council manages it",
  dontknow: "I don't know",
};
const ASSESSED_BEFORE_LABELS = { yes: "Yes", no: "No", dontknow: "I don't know" };
const HOSTING_TYPE_LABELS = {
  "third-party": "Third-party hosting",
  "on-premises": "On premises",
  "council-cloud": "Council-managed cloud",
};
const IMPACT_LABELS = { low: "Low", medium: "Medium", high: "High" };

function supportedServiceLabels(setup, system) {
  const map = new Map(buildSupportedServiceOptions(setup).map((o) => [o.value, o.label]));
  return (system.supportedServices || []).map((v) => map.get(v) || v);
}

function corporateServiceLabels(system) {
  const map = new Map(CORPORATE_SERVICE_OPTIONS.map((o) => [o.value, o.label]));
  return (system.corporateServices || []).map((v) =>
    v === "other" ? system.corporateServicesOther || "Other" : map.get(v) || v
  );
}

// Per-system check-answers rows. Every field has a Change link back to the page where it was
// answered, carrying ?return=summary so saving returns here. "Overall criticality" is calculated
// from the three impact ratings and has no Change link.
function buildCriticalSystemDetail(setup, system) {
  const base = `/setup/critical-systems/${system.id}`;
  const join = (arr) => (arr && arr.length ? arr.join(", ") : "");
  const supplier = system.supplierId ? getSupplier(setup, system.supplierId) : null;
  const impact = system.impact || {};
  const recovery = system.recovery || {};
  const hosting = system.hosting || {};

  const rows = [
    { key: "Name", value: system.name, changeHref: `${base}/edit?return=summary` },
    { key: "What it does", value: system.description, changeHref: `${base}/edit?return=summary` },
    { key: "Services it supports", value: join(supportedServiceLabels(setup, system)), changeHref: `${base}/edit?return=summary` },
    { key: "Assessed against the CAF before", value: ASSESSED_BEFORE_LABELS[system.assessedBefore] || "", changeHref: `${base}/edit?return=summary` },
    { key: "Other council services or functions", value: join(corporateServiceLabels(system)), changeHref: `${base}/corporate-services?return=summary` },
    { key: "Managed by a third-party supplier", value: SUPPLIER_MANAGED_LABELS[system.managedBySupplier] || "", changeHref: `${base}/supplier?return=summary` },
  ];
  if (system.managedBySupplier === "fully" || system.managedBySupplier === "partially") {
    rows.push({ key: "Supplier", value: supplier ? supplier.name : "", changeHref: `${base}/which-supplier?return=summary` });
  }
  rows.push({ key: "Shared with other councils", value: system.sharedWithCouncils ? "Yes" : "No", changeHref: `${base}/shared-with-councils?return=summary` });
  if (system.sharedWithCouncils) {
    rows.push({ key: "Councils it is shared with", value: join(system.councils), changeHref: `${base}/councils?return=summary` });
  }
  const hostingParts = [];
  if (hosting.type) hostingParts.push(HOSTING_TYPE_LABELS[hosting.type] || hosting.type);
  if (hosting.provider) hostingParts.push(hosting.provider);
  if (hosting.secondary) hostingParts.push(`Secondary: ${hosting.secondary}`);
  rows.push({ key: "Where it is hosted", value: hostingParts.join(" · "), changeHref: `${base}/hosting?return=summary` });

  const ownerParts = [];
  if (system.owner && system.owner.name) ownerParts.push(system.owner.name);
  if (system.owner && system.owner.jobTitle) ownerParts.push(system.owner.jobTitle);
  rows.push({ key: "System owner", value: ownerParts.join(", "), changeHref: `${base}/owner?return=summary` });

  rows.push({ key: "Confidentiality impact", value: IMPACT_LABELS[impact.confidentiality] || "", changeHref: `${base}/impact?return=summary` });
  rows.push({ key: "Integrity impact", value: IMPACT_LABELS[impact.integrity] || "", changeHref: `${base}/impact?return=summary` });
  rows.push({ key: "Availability impact", value: IMPACT_LABELS[impact.availability] || "", changeHref: `${base}/impact?return=summary` });
  rows.push({ key: "Overall criticality", value: deriveCriticality(impact) || "", calculated: true });

  rows.push({ key: "Maximum tolerable downtime (MTD)", value: recovery.mtd || "", changeHref: `${base}/recovery?return=summary` });
  rows.push({ key: "Recovery time objective (RTO)", value: recovery.rto || "", changeHref: `${base}/recovery?return=summary` });
  rows.push({ key: "Recovery point objective (RPO)", value: recovery.rpo || "", changeHref: `${base}/recovery?return=summary` });

  return rows;
}

// S14 "Which essential services or functions does it support?" options.
// A service with functions contributes one option per function ("Service — Function");
// a service with no functions contributes a single service-level option.
function buildSupportedServiceOptions(setup) {
  const options = [];
  (setup.essentialServices || []).forEach((svc) => {
    if ((svc.functions || []).length > 0) {
      svc.functions.forEach((fn) => {
        options.push({ value: fn.id, label: `${svc.name} — ${fn.name}` });
      });
    } else {
      options.push({ value: svc.id, label: svc.name });
    }
  });
  return options;
}

function getSupplier(setup, supplierId) {
  return (setup.suppliers || []).find((s) => s.id === supplierId) || null;
}

// A system can be removed only if it is not in this cycle's plan and was never assessed.
function systemCanBeRemoved(system) {
  return !system.inPlan && system.assessedBefore !== "yes";
}

// S47 remove-system consequence bullets, derived.
function buildRemoveSystemConsequences(setup, system) {
  const platformCount = platformsForSystem(setup, system.id).length;
  const bullets = [];
  if (platformCount > 0) {
    bullets.push(
      `remove its links to ${platformCount} shared platform${plural(platformCount)}; the platforms stay`
    );
  }
  if (system.supplierId) {
    bullets.push("keep its supplier on your list if anything else uses it");
  }
  return { bullets };
}

// Remove a system from every platform that lists it.
function unlinkSystemFromPlatforms(setup, systemId) {
  (setup.platforms || []).forEach((p) => {
    p.linkedSystems = (p.linkedSystems || []).filter((id) => id !== systemId);
  });
}

// S21 inset — names the hosting/cloud platform this system relies on, if any.
function deriveHostingPlatformName(setup, system) {
  const hosting = platformsForSystem(setup, system.id).find((p) =>
    (p.type || "").toLowerCase().includes("hosting")
  );
  return hosting ? hosting.name : "";
}

// S27 caption progress counter, e.g. "2 of 4 systems".
function systemDetailCounter(setup, system) {
  const all = setup.criticalSystems || [];
  const index = all.findIndex((s) => s.id === system.id);
  return `${index + 1} of ${all.length} systems`;
}

// --- Coverage check (S24) & check-your-setup (S30) ----------------------------------

function servicesWithoutSystem(setup) {
  return (setup.essentialServices || []).filter(
    (svc) => !svc.noSystemReason && countLinkedSystems(setup, svc) === 0
  );
}

function unlinkedSystems(setup) {
  return (setup.criticalSystems || []).filter(
    (s) => (s.supportedServices || []).length === 0
  );
}

function systemsNeedingDetails(setup) {
  return (setup.criticalSystems || []).filter(
    (s) => (s.supportedServices || []).length > 0 && !s.detailsComplete
  );
}

function unlinkedPlatforms(setup) {
  return (setup.platforms || []).filter(
    (p) => (p.linkedServices || []).length === 0 && (p.linkedSystems || []).length === 0
  );
}

// S24 warning list, derived from the current state (order matches the design).
function buildCoverageWarnings(setup) {
  const warnings = [];
  const need = systemsNeedingDetails(setup);
  if (need.length > 0) {
    warnings.push(
      `${need.length} critical system${plural(need.length)} still ${need.length === 1 ? "needs" : "need"} an owner and impact ratings.`
    );
  }
  servicesWithoutSystem(setup).forEach((svc) => {
    warnings.push(`${svc.name} has no critical system linked to it.`);
  });
  unlinkedSystems(setup).forEach((sys) => {
    warnings.push(`${sys.name} is not linked to any essential service.`);
  });
  unlinkedPlatforms(setup).forEach((p) => {
    warnings.push(`${p.name} is not linked to any service or system.`);
  });
  return warnings;
}

// S24 concentration inset — the most-depended-on platform and its coverage.
function buildConcentrationInset(setup) {
  const platforms = setup.platforms || [];
  let top = null;
  let topScore = -1;
  platforms.forEach((p) => {
    const score = (p.linkedServices || []).length + (p.linkedSystems || []).length;
    if (score > topScore) {
      topScore = score;
      top = p;
    }
  });
  if (!top || topScore <= 0) return null;
  const totalSvc = (setup.essentialServices || []).length;
  const totalSys = (setup.criticalSystems || []).length;
  const svc = (top.linkedServices || []).length;
  const sys = (top.linkedSystems || []).length;
  return `${top.name} supports ${svc} of your ${totalSvc} essential service${plural(totalSvc)} and ${sys} of your ${totalSys} critical system${plural(totalSys)}. If it failed, everything would be affected. You may want to mention this to your assurer.`;
}

// S30 "How critical your systems are" line, derived.
function criticalityDistribution(setup) {
  const order = ["Mission critical", "Business critical", "Business supporting", "Non-critical"];
  const counts = {};
  let notRated = 0;
  (setup.criticalSystems || []).forEach((s) => {
    const c = deriveCriticality(s.impact);
    if (!c) notRated += 1;
    else counts[c] = (counts[c] || 0) + 1;
  });
  const parts = [];
  order.forEach((lvl) => {
    if (counts[lvl]) parts.push(`${counts[lvl]} ${lvl}`);
  });
  if (notRated) parts.push(`${notRated} not yet rated`);
  return parts.join(" · ");
}

// S30 summary values, derived.
function buildSetupSummary(setup) {
  const systems = setup.criticalSystems || [];
  const allComplete = systems.length > 0 && systems.every((s) => s.detailsComplete);
  return {
    cafLead: setup.people.cafLead.name,
    cafLeadConfirmed: setup.people.cafLead.confirmed,
    cafLeadPending: setup.people.cafLead.pending,
    approver: setup.people.approver.name,
    approverConfirmed: setup.people.approver.confirmed,
    approverPending: setup.people.approver.pending,
    sectorConfirmed: setup.sectorContext.confirmed,
    councilContextProvided: setup.councilContext.completed,
    methodology:
      setup.methodology.approach === "five-lens"
        ? "GovAssure Five Lens Model"
        : "Your own methodology",
    servicesCount: (setup.essentialServices || []).length,
    platformsCount: (setup.platforms || []).length,
    systemsCount: systems.length,
    systemsAllComplete: allComplete,
    criticality: criticalityDistribution(setup),
  };
}

// The signed-in person's identity, from what they typed when signing in and claiming (name from
// Claim "Your details"). Falls back to the seeded SETUP_USER for the demo scenarios.
// Changed in build, prototype, pending design sign-off.
function signedInSetupUser(req) {
  const claim = (req.session && req.session.data && req.session.data.claim) || {};
  const org = (claim.council && claim.council.name) || SETUP_USER.orgName;
  if (claim.person && claim.person.fullName) return { name: claim.person.fullName, orgName: org, role: "council" };
  // User-driven: derive the name from the signed-in email rather than a hardcoded persona.
  if (claim.oneLoginEmail) return { name: require("../claim-example-data").displayNameFromEmail(claim.oneLoginEmail), orgName: org, role: "council" };
  return null;
}

// Apply Setup chrome to res.locals for a /setup request, without touching session auth.
function applySetupChrome(req, res) {
  res.locals.serviceName = SETUP_SERVICE_NAME;
  res.locals.showNavigation = true;
  res.locals.currentUser = signedInSetupUser(req) || SETUP_USER;
  res.locals.navigation = buildSetupNavigation(req.path);
  // Setup owns its own page chrome; suppress the generic journey breadcrumbs/progress.
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
}

module.exports = {
  SETUP_USER,
  SETUP_SERVICE_NAME,
  HOLDING_HREF,
  ESSENTIAL_SERVICE_OPTIONS,
  COUNCIL_REGISTER,
  ensureSetup,
  buildSetupNavigation,
  buildSetupTaskList,
  applySetupChrome,
  getService,
  countLinkedSystems,
  buildServiceHubRows,
  buildRemoveServiceConsequences,
  reconcileChosenServices,
  slugify,
  PLATFORM_TYPE_OPTIONS,
  getPlatform,
  getSystem,
  platformsForService,
  platformsForSystem,
  buildInfraHubRows,
  buildPlatformReliesModel,
  buildPlatformChoices,
  buildRemovePlatformConsequences,
  unlinkServiceFromPlatforms,
  CORPORATE_SERVICE_OPTIONS,
  deriveCriticality,
  buildCriticalSystemsHubRows,
  buildCriticalSystemDetail,
  buildSupportedServiceOptions,
  getSupplier,
  systemCanBeRemoved,
  buildRemoveSystemConsequences,
  unlinkSystemFromPlatforms,
  deriveHostingPlatformName,
  systemDetailCounter,
  buildCoverageWarnings,
  buildConcentrationInset,
  servicesWithoutSystem,
  systemsNeedingDetails,
  buildSetupSummary,
};
