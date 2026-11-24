// app/data/helpers/council-record.js
//
// The council record (Setup v11, 24 November 2026). Everything Setup shows is worked out from the
// record in req.session.data.setup: lists, counts, statuses, issues and summaries. Only answers
// are stored, never "which screen to show" or "task complete" flags. The one exception is
// setup.completed, which records that the CAF Lead confirmed their setup on S30.
//
// Field names Decide already reads are kept (essentialServices, criticalSystems, people.approver,
// councilContext); their contents follow the v11 model. Each link is stored once:
//   service ↔ platform and system ↔ platform: on the platform (linkedServices, linkedSystems)
//   system ↔ service or function: on the system (serviceIds, functionIds)
// and the other direction is worked out here.

const COUNCIL_TYPES = ["county", "district", "unitary", "metropolitan_borough", "london_borough", "city_of_london", "isles_of_scilly"];

// Council register types (app/data/councils.js) → council type. The three made-up "Borough"
// councils are metropolitan boroughs, as Westborough is in Figma. Combined Authorities are not
// councils in the CAF sense; they are treated as single tier until that is decided.
const REGISTER_TYPE_MAP = {
  County: "county",
  District: "district",
  Unitary: "unitary",
  Metropolitan: "metropolitan_borough",
  "London Borough": "london_borough",
  Borough: "metropolitan_borough",
  "Combined Authority": "unitary",
};

function councilTypeFromRegister(council) {
  if (!council) return "";
  const name = (council.name || "").toLowerCase();
  if (name.includes("city of london")) return "city_of_london";
  if (name.includes("isles of scilly")) return "isles_of_scilly";
  return REGISTER_TYPE_MAP[council.type] || "";
}

function tierFor(type) {
  if (type === "county") return "upper";
  if (type === "district") return "lower";
  return type ? "single" : "";
}

// "metropolitan borough councils", as S35 and S09 say it.
const TYPE_PLURAL = {
  county: "county councils",
  district: "district councils",
  unitary: "unitary councils",
  metropolitan_borough: "metropolitan borough councils",
  london_borough: "London borough councils",
  city_of_london: "single-tier councils",
  isles_of_scilly: "single-tier councils",
};

function councilTypePlural(setup) {
  return TYPE_PLURAL[(setup.council || {}).type] || "councils";
}

// S35 lists by tier. DRAFT LIST, to confirm with Leon and policy (Q36). Sorted A to Z.
const SERVICES_BY_TIER = {
  single: [
    "Adult social care", "Children’s social care", "Education and SEND", "Electoral services",
    "Emergency planning and resilience", "Environmental health", "Highways and transport",
    "Housing and homelessness", "Libraries", "Licensing", "Planning and building control",
    "Public health", "Revenues and benefits", "Trading standards", "Waste collection and recycling",
    "Waste disposal",
  ],
  upper: [
    "Adult social care", "Children’s social care", "Education and SEND", "Emergency planning and resilience",
    "Highways and transport", "Libraries", "Public health", "Trading standards", "Waste disposal",
  ],
  lower: [
    "Electoral services", "Environmental health", "Housing and homelessness", "Licensing",
    "Planning and building control", "Revenues and benefits", "Waste collection and recycling",
  ],
};

function essentialServiceOptions(setup) {
  const tier = tierFor((setup.council || {}).type) || "single";
  return SERVICES_BY_TIER[tier];
}

// S03 lists.
const CNI_SECTORS = [
  "Chemicals", "Civil nuclear", "Communications", "Defence", "Emergency services", "Energy",
  "Finance", "Food", "Health", "Space", "Transport", "Water", "Not applicable",
];
const OT_TYPES = [
  "Building management systems, such as heating, ventilation and lighting controls",
  "Car park and barrier systems",
  "CCTV and public space surveillance",
  "Flood, drainage and pumping station controls",
  "Leisure centre plant, such as pool filtration and plant rooms",
  "Lift and escalator controls",
  "Physical access control and door entry systems",
  "Street lighting controls",
  "Telecare and assistive technology alarm systems",
  "Traffic signals and urban traffic control",
  "Waste and recycling plant controls",
];

// S12c platform types (Chris Linnell, v9 comments).
const PLATFORM_TYPES = [
  "Identity and access management", "Network and connectivity", "Hosting, cloud or compute",
  "Integration and APIs", "Data and storage", "Security, logging and monitoring",
  "Backup and recovery", "Other core infrastructure",
];
const PLATFORM_MANAGED_LABELS = {
  council: "The council",
  "supplier-fully": "A third-party supplier, fully",
  "supplier-partly": "A third-party supplier, partly",
  shared: "A shared service",
};

// S19, A to Z with Other last (None of these is the exclusive option).
const OTHER_FUNCTION_OPTIONS = [
  { value: "crm", label: "Customer relationship management" },
  { value: "data-analytics", label: "Data management / analytics" },
  { value: "document-storage", label: "Document storage and management" },
  { value: "email-communication", label: "Email and communication" },
  { value: "finance-accounting", label: "Finance and accounting" },
  { value: "hr", label: "HR" },
  { value: "help-desk", label: "Help desk / IT support" },
  { value: "office-productivity", label: "Office productivity" },
  { value: "payroll", label: "Payroll" },
  { value: "procurement-contract", label: "Procurement and contract management" },
  { value: "other", label: "Other" },
];

const ASSESSED_BEFORE = ["within_3_years", "more_than_3_years", "no", "dont_know"];
const ASSESSED_BEFORE_LABELS = {
  within_3_years: "Yes - within the last 3 years",
  more_than_3_years: "Yes - more than 3 years ago",
  no: "No",
  dont_know: "I don’t know",
};

// --- Small helpers ----------------------------------------------------------------------

const plural = (n, one, many) => (n === 1 ? one : many || one + "s");
const byName = (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

function slugify(value) {
  return (value || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// A unique id for a new item, from its name.
function newId(prefix, name, existing) {
  const base = prefix + "-" + (slugify(name) || "item");
  const used = new Set((existing || []).map((x) => x.id));
  let id = base;
  let n = 2;
  while (used.has(id)) id = base + "-" + n++;
  return id;
}

function services(setup) { return setup.essentialServices || []; }
function platforms(setup) { return setup.platforms || []; }
function systems(setup) { return setup.criticalSystems || []; }
function getService(setup, id) { return services(setup).find((s) => s.id === id) || null; }
function getPlatform(setup, id) { return platforms(setup).find((p) => p.id === id) || null; }
function getSystem(setup, id) { return systems(setup).find((s) => s.id === id) || null; }
function getSupplier(setup, id) { return (setup.suppliers || []).find((s) => s.id === id) || null; }

// --- Criticality and completeness ------------------------------------------------------------

// S28 rule: low 1, medium 2, high 3; 8 or more Mission critical, 6 or more Business critical,
// 4 or more Business supporting, otherwise Non-critical. Not yet rated until all three are given.
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

// A system's details are complete when it has an owner and all three impact ratings.
function detailsComplete(system) {
  return Boolean(system.owner && system.owner.name && deriveCriticality(system.impact));
}

// --- Links, both directions -------------------------------------------------------------------

function platformsForService(setup, serviceId) {
  return platforms(setup).filter((p) => (p.linkedServices || []).includes(serviceId));
}
function platformsForSystem(setup, systemId) {
  return platforms(setup).filter((p) => (p.linkedSystems || []).includes(systemId));
}

// The services a system supports: linked directly, or through one of the service's functions.
function servicesForSystem(setup, system) {
  const fnIds = new Set(system.functionIds || []);
  return services(setup).filter(
    (svc) => (system.serviceIds || []).includes(svc.id) || (svc.functions || []).some((f) => fnIds.has(f.id))
  );
}
function systemsForService(setup, service) {
  return systems(setup).filter((sys) => servicesForSystem(setup, sys).some((s) => s.id === service.id));
}
function systemLinked(setup, system) {
  return servicesForSystem(setup, system).length > 0;
}

// "Revenue and benefits — Benefits management", or the service name when linked at service level.
function supportedLabels(setup, system) {
  const labels = [];
  const fnIds = new Set(system.functionIds || []);
  services(setup).forEach((svc) => {
    const fns = (svc.functions || []).filter((f) => fnIds.has(f.id));
    if ((system.serviceIds || []).includes(svc.id)) labels.push(svc.name);
    else fns.forEach((f) => labels.push(svc.name + " — " + f.name));
  });
  return labels;
}

// Link or unlink one system to one service (S37d). Unlinking removes the service and its functions.
function setSystemServiceLink(setup, system, service, linked) {
  const fnIds = new Set((service.functions || []).map((f) => f.id));
  system.serviceIds = (system.serviceIds || []).filter((id) => id !== service.id);
  system.functionIds = (system.functionIds || []).filter((id) => !fnIds.has(id));
  if (linked) {
    system.serviceIds.push(service.id);
    system.servicesLater = false;
  }
}

// --- Statuses ---------------------------------------------------------------------------

function serviceStatus(setup, svc) {
  const fns = (svc.functions || []).length;
  const plats = platformsForService(setup, svc.id).length;
  const syss = systemsForService(setup, svc).length;
  if (fns && (plats || svc.infraLater) && (syss || svc.noSystemReason)) return "completed";
  if (!fns && !plats && !syss && !svc.infraLater && !svc.noSystemReason) return "not_started";
  return "in_progress";
}

function platformLinked(p) {
  return (p.linkedServices || []).length > 0 || (p.linkedSystems || []).length > 0;
}

function systemComplete(setup, sys) {
  return detailsComplete(sys) && systemLinked(setup, sys);
}

function contextComplete(setup) {
  const cc = setup.councilContext || {};
  const it = cc.itTransformation || {};
  return (cc.cniSectors || []).length > 0 && (cc.otTypes || []).length > 0 && Boolean(it.recent || it.upcoming || it.noneOfThese);
}
function contextStarted(setup) {
  const cc = setup.councilContext || {};
  const it = cc.itTransformation || {};
  return (cc.cniSectors || []).length > 0 || (cc.otTypes || []).length > 0 || Boolean(it.recent || it.upcoming || it.noneOfThese || cc.anythingElse);
}
function methodologyComplete(setup) {
  const m = setup.methodology || {};
  return m.approach === "five-lens" || (m.approach === "other" && Boolean(m.notes));
}
function orgAnswered(setup) {
  return ASSESSED_BEFORE.includes((setup.organisationAssessment || {}).answer);
}

// Decide: assessed within the last 3 years counts as already assessed. More than 3 years ago, No and
// I don't know mean it is assessed again (S03a: "If you have not done an organisational assessment
// before or it has been more than 3 years, this will automatically be included").
function assessedRecently(answer) {
  return answer === "within_3_years";
}
function orgAssessedRecently(setup) {
  return assessedRecently((setup.organisationAssessment || {}).answer);
}
function systemAssessedRecently(system) {
  return assessedRecently(system && system.assessedBefore);
}
function systemAssessedEver(system) {
  return system && (system.assessedBefore === "within_3_years" || system.assessedBefore === "more_than_3_years");
}
// A CNI sector was chosen in S03 ("Not applicable" is not a sector).
function cniSectorChosen(setup) {
  return ((setup.councilContext || {}).cniSectors || []).some((s) => s && s !== "Not applicable");
}

// A system is in this cycle's approved plan.
function inApprovedPlan(sessionData, systemId) {
  const decide = (sessionData && sessionData.decide) || {};
  const state = (decide.plan || {}).state;
  const approved = state === "approved" || (decide.approval || {}).decision === "approved";
  return approved && ((decide.cycle || {}).selectedSystems || []).includes(systemId);
}

// S47 or S48: removal is blocked while the system is in the approved plan, or once assessed.
function removalBlock(sessionData, system) {
  if (inApprovedPlan(sessionData, system.id)) return "in_plan";
  if (systemAssessedEver(system)) return "assessed";
  return "";
}

// --- Removal (removes the item and its links, never the linked items) -------------------------

function removeService(setup, serviceId) {
  const svc = getService(setup, serviceId);
  if (!svc) return { orphaned: [] };
  const orphaned = systemsForService(setup, svc).filter((sys) => servicesForSystem(setup, sys).length === 1);
  const fnIds = new Set((svc.functions || []).map((f) => f.id));
  systems(setup).forEach((sys) => {
    sys.serviceIds = (sys.serviceIds || []).filter((id) => id !== serviceId);
    sys.functionIds = (sys.functionIds || []).filter((id) => !fnIds.has(id));
  });
  platforms(setup).forEach((p) => {
    p.linkedServices = (p.linkedServices || []).filter((id) => id !== serviceId);
  });
  setup.essentialServices = services(setup).filter((s) => s.id !== serviceId);
  return { service: svc, orphaned };
}

function removeFunction(setup, service, functionId) {
  service.functions = (service.functions || []).filter((f) => f.id !== functionId);
  systems(setup).forEach((sys) => {
    sys.functionIds = (sys.functionIds || []).filter((id) => id !== functionId);
  });
}

function removePlatform(setup, platformId) {
  setup.platforms = platforms(setup).filter((p) => p.id !== platformId);
  pruneSuppliers(setup);
}

// Removes the system, its platform links and its place in an unapproved plan. Suppliers nothing
// else uses are removed too (S47 rule).
function removeSystem(sessionData, systemId) {
  const setup = sessionData.setup;
  platforms(setup).forEach((p) => {
    p.linkedSystems = (p.linkedSystems || []).filter((id) => id !== systemId);
  });
  setup.criticalSystems = systems(setup).filter((s) => s.id !== systemId);
  const decide = sessionData.decide;
  if (decide && decide.cycle) {
    decide.cycle.selectedSystems = (decide.cycle.selectedSystems || []).filter((id) => id !== systemId);
    if (decide.timing) delete decide.timing[systemId];
  }
  pruneSuppliers(setup);
}

function pruneSuppliers(setup) {
  const used = new Set();
  systems(setup).forEach((s) => s.supplier && s.supplier.supplierId && used.add(s.supplier.supplierId));
  platforms(setup).forEach((p) => p.supplierId && used.add(p.supplierId));
  setup.suppliers = (setup.suppliers || []).filter((s) => used.has(s.id));
}

// --- S24 issues -------------------------------------------------------------------------

// One row per issue, in the order drawn on S24. Each action opens the page that fixes it.
function setupIssues(setup) {
  const rows = [];
  const missing = systems(setup).filter((s) => !detailsComplete(s));
  if (missing.length) {
    rows.push({
      key: "details",
      text: `${missing.length} critical ${plural(missing.length, "system")} still ${missing.length === 1 ? "needs" : "need"} an owner and impact ratings.`,
      actions: [{ text: "Add the missing details", href: `/setup/critical-systems/${missing[0].id}/summary?from=check` }],
    });
  }
  services(setup)
    .filter((svc) => !svc.noSystemReason && systemsForService(setup, svc).length === 0)
    .forEach((svc) => {
      rows.push({
        key: "service:" + svc.id,
        text: `${svc.name} has no critical system linked to it.`,
        actions: [
          { text: "Add a system or record why none is needed", href: `/setup/essential-services/${svc.id}?from=check` },
          { text: "Record why none is needed", href: `/setup/essential-services/${svc.id}/no-system-reason` },
        ],
      });
    });
  systems(setup)
    .filter((sys) => !systemLinked(setup, sys))
    .forEach((sys) => {
      rows.push({
        key: "system:" + sys.id,
        text: `${sys.name} is not linked to any essential service.`,
        actions: [{ text: "Link it to a service", href: `/setup/critical-systems/${sys.id}/edit?from=check` }],
      });
    });
  platforms(setup)
    .filter((p) => !platformLinked(p))
    .forEach((p) => {
      rows.push({
        key: "platform:" + p.id,
        text: `${p.name} is not linked to any service or system.`,
        actions: [{ text: "Link the platform", href: `/setup/shared-infrastructure/${p.id}/relies?from=check` }],
      });
    });
  return rows;
}

// "Go to the first missing detail": the next question to answer, one at a time, in the same order.
function firstMissingDetail(setup) {
  for (const sys of systems(setup)) {
    if (!(sys.owner && sys.owner.name)) return `/setup/critical-systems/${sys.id}/owner?from=walk`;
    if (!deriveCriticality(sys.impact)) return `/setup/critical-systems/${sys.id}/impact?from=walk`;
  }
  const svc = services(setup).find((s) => !s.noSystemReason && systemsForService(setup, s).length === 0);
  if (svc) return `/setup/essential-services/${svc.id}/systems?from=walk`;
  const sys = systems(setup).find((s) => !systemLinked(setup, s));
  if (sys) return `/setup/critical-systems/${sys.id}/edit?from=walk`;
  const plat = platforms(setup).find((p) => !platformLinked(p));
  if (plat) return `/setup/shared-infrastructure/${plat.id}/relies?from=walk`;
  return "";
}

// S24 inset: the platform the most depends on, when it supports more than one thing.
function concentrationNote(setup) {
  let top = null;
  let best = 0;
  platforms(setup).forEach((p) => {
    const score = (p.linkedServices || []).length + (p.linkedSystems || []).length;
    if (score > best) { best = score; top = p; }
  });
  if (!top || best < 2) return "";
  const svcTotal = services(setup).length;
  const sysTotal = systems(setup).length;
  const svc = (top.linkedServices || []).length;
  const sys = (top.linkedSystems || []).length;
  const part = (n, total, noun) => (n === total ? `all ${n} of your ${noun}${total === 1 ? "" : "s"}` : `${n} of your ${total} ${noun}${total === 1 ? "" : "s"}`);
  return `${top.name} supports ${part(svc, svcTotal, "essential service")} and ${part(sys, sysTotal, "critical system")}. If it failed, everything linked to it would be affected. You should mention this to your assurer.`;
}

// --- Migration from the format used before 24 November 2026 --------------------------------------

const OLD_CORPORATE = new Set(OTHER_FUNCTION_OPTIONS.map((o) => o.value));

function migrate(setup) {
  if (!setup || setup.recordVersion === 11) return setup;
  setup.council = setup.council || { name: "", type: "" };
  if (setup.council.type && !COUNCIL_TYPES.includes(setup.council.type)) {
    setup.council.type = /metropolitan/i.test(setup.council.type) ? "metropolitan_borough" : "";
  }
  const cc = setup.councilContext || {};
  if (!cc.itTransformation) {
    const cniName = { "emergency-services": "Emergency services", none: "Not applicable" }[cc.cni] || (cc.cni ? cc.cni.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) : "");
    setup.councilContext = {
      cniSectors: cniName ? [cniName] : [],
      otTypes: [],
      itTransformation: {
        recent: Boolean(cc.recentItTransformation),
        recentDetail: cc.recentItTransformationDetail || "",
        upcoming: Boolean(cc.upcomingItTransformation),
        upcomingDetail: cc.upcomingItTransformationDetail || "",
        noneOfThese: Boolean(cc.noneOfThese),
      },
      anythingElse: cc.anythingElse || "",
    };
  }
  delete setup.sectorContextComment;
  const oa = setup.organisationAssessment || {};
  const mapAnswer = { yes: "within_3_years", dontknow: "dont_know" };
  setup.organisationAssessment = { answer: mapAnswer[oa.answer] || oa.answer || "" };
  const m = setup.methodology || {};
  setup.methodology = { approach: m.approach || "", notes: m.notes || m.detail || "", link: m.link || "" };
  services(setup).forEach((svc) => {
    if (svc.infraStatus === "link_later") svc.infraLater = true;
    if (svc.source === "custom") svc.source = "added";
    delete svc.infraStatus;
    delete svc.platforms;
  });
  platforms(setup).forEach((p) => {
    const map = { Network: "Network and connectivity", Hosting: "Hosting, cloud or compute", "Hosting or cloud control plane": "Hosting, cloud or compute", Integration: "Integration and APIs", "Integration or API gateway": "Integration and APIs", "Logging and monitoring": "Security, logging and monitoring", "Something else": "Other core infrastructure" };
    if (map[p.type]) p.type = map[p.type];
  });
  const fnOwner = new Map();
  services(setup).forEach((svc) => (svc.functions || []).forEach((f) => fnOwner.set(f.id, svc.id)));
  systems(setup).forEach((sys) => {
    if (sys.supportedServices) {
      sys.serviceIds = sys.supportedServices.filter((id) => !fnOwner.has(id));
      sys.functionIds = sys.supportedServices.filter((id) => fnOwner.has(id));
      delete sys.supportedServices;
    }
    if (sys.corporateServices) {
      sys.otherFunctions = sys.corporateServices.filter((v) => OLD_CORPORATE.has(v));
      sys.otherFunctionsDetail = sys.corporateServicesOther || "";
      delete sys.corporateServices;
      delete sys.corporateServicesOther;
    }
    if (!sys.supplier) {
      const managed = { fully: "fully", partially: "partially", council: "no" }[sys.managedBySupplier] || "";
      sys.supplier = { managed, supplierId: sys.supplierId || "", note: sys.supplierNote || "" };
      ["managedBySupplier", "supplierId", "supplierNote"].forEach((k) => delete sys[k]);
    }
    if (!sys.shared) {
      const answered = sys.sharedWithCouncils === true || (sys.councils || []).length > 0;
      sys.shared = { answer: answered ? "yes" : sys.sharedWithCouncils === false && sys.owner && sys.owner.name ? "no" : "", councils: sys.councils || [] };
      delete sys.sharedWithCouncils;
      delete sys.councils;
    }
    sys.assessedBefore = mapAnswer[sys.assessedBefore] || sys.assessedBefore || "";
    ["detailsComplete", "inPlan", "recovery", "assessedBeforeRecord"].forEach((k) => delete sys[k]);
  });
  delete setup.councilContext.completed;
  setup.recordVersion = 11;
  return setup;
}

module.exports = {
  COUNCIL_TYPES,
  councilTypeFromRegister,
  tierFor,
  councilTypePlural,
  SERVICES_BY_TIER,
  essentialServiceOptions,
  CNI_SECTORS,
  OT_TYPES,
  PLATFORM_TYPES,
  PLATFORM_MANAGED_LABELS,
  OTHER_FUNCTION_OPTIONS,
  ASSESSED_BEFORE,
  ASSESSED_BEFORE_LABELS,
  plural,
  byName,
  slugify,
  newId,
  getService,
  getPlatform,
  getSystem,
  getSupplier,
  deriveCriticality,
  detailsComplete,
  platformsForService,
  platformsForSystem,
  servicesForSystem,
  systemsForService,
  systemLinked,
  supportedLabels,
  setSystemServiceLink,
  serviceStatus,
  platformLinked,
  systemComplete,
  contextComplete,
  contextStarted,
  methodologyComplete,
  orgAnswered,
  assessedRecently,
  orgAssessedRecently,
  systemAssessedRecently,
  systemAssessedEver,
  cniSectorChosen,
  inApprovedPlan,
  removalBlock,
  removeService,
  removeFunction,
  removePlatform,
  removeSystem,
  pruneSuppliers,
  setupIssues,
  firstMissingDetail,
  concentrationNote,
  migrate,
};
