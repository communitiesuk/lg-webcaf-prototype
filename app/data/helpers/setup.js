// app/data/helpers/setup.js
//
// "Set up your council" (Setup v11, Figma "07 Set up your council · v11 (content review)").
// Owns the Setup chrome (service name and navigation) and the view models for each screen. Every
// list, count, status and summary is worked out from the council record (council-record.js); see
// docs/setup-session-keys.md for the record itself.

const { buildSetupSeedEmpty, ESSENTIAL_SERVICE_OPTIONS, COUNCIL_REGISTER } = require("../seed/setup");
const record = require("./council-record");

const {
  plural,
  byName,
  slugify,
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
  serviceStatus,
  platformLinked,
  systemComplete,
} = record;

// The example council's CAF Lead, shown in the header only when the example council is loaded.
const SETUP_USER = {
  name: "Jo Hart",
  orgName: "Westborough Borough Council",
  role: "council",
};

const SETUP_SERVICE_NAME = "Assess and manage your council's cyber resilience";

// Holding page for links that leave the Setup section.
const HOLDING_HREF = "/setup/not-in-this-prototype";

// Ensure the Setup record exists (idempotent), in the v11 format. It starts EMPTY; the example
// council is only loaded by a named research starting point (routes/beta.js loadExampleCouncil).
// The council's name and type come from the council identified at Claim.
function ensureSetup(sessionData) {
  if (!sessionData) return null;
  if (!sessionData.setup || !sessionData.setup.seeded) {
    sessionData.setup = buildSetupSeedEmpty();
  }
  record.migrate(sessionData.setup);
  const claimCouncil = sessionData.claim && sessionData.claim.council;
  if (claimCouncil && claimCouncil.name) {
    sessionData.setup.council.name = claimCouncil.name;
    const registered = claimCouncil.id && require("../councils").find((c) => c.id === claimCouncil.id);
    const type = record.councilTypeFromRegister(registered || claimCouncil);
    if (type) sessionData.setup.council.type = type;
  }
  return sessionData.setup;
}

// Service navigation. "Your council" is "Services and systems" from v11 (23 November 2026), same
// route. It is the current section on every /setup page except the holding page.
function buildSetupNavigation(currentPath) {
  const onSetup = typeof currentPath === "string" && currentPath.startsWith("/setup") && currentPath !== HOLDING_HREF;
  return [
    { text: "Dashboard", href: "/dashboard" },
    { text: "Services and systems", href: "/setup/task-list", active: onSetup },
    { text: "Assessments", href: "/your-assessments" }, // AS01
    { text: "People", href: "/access" },
    { text: "Sign out", href: "/get-started/sign-out" },
  ];
}

// --- Statuses (task list style: Completed plain text, In progress blue, Not yet started grey) ---

const COMPLETED = { text: "Completed" };
const IN_PROGRESS = { tag: { text: "In progress", classes: "govuk-tag--blue" } };
const NOT_STARTED = { tag: { text: "Not yet started", classes: "govuk-tag--grey" } };
const STATUS = { completed: COMPLETED, in_progress: IN_PROGRESS, not_started: NOT_STARTED };

function peopleStatus(p) {
  return p && p.confirmed ? COMPLETED : p && p.pending ? IN_PROGRESS : NOT_STARTED;
}

// S01. Statuses and hints are worked out from the record (S01 panel rules, plus the rules agreed
// on 24 November for tasks 4 to 6: Completed when every row on the task's list is Completed).
function buildSetupTaskList(setup) {
  setup = setup || {};
  const svcs = setup.essentialServices || [];
  const plats = setup.platforms || [];
  const syss = setup.criticalSystems || [];
  const people = setup.people || {};

  const ctxDone = setup.sectorContext && setup.sectorContext.confirmed && record.contextComplete(setup) && record.orgAnswered(setup);
  const ctxStarted = (setup.sectorContext && setup.sectorContext.confirmed) || record.contextStarted(setup) || record.orgAnswered(setup);
  const methodStarted = Boolean((setup.methodology || {}).approach);

  const svcRowsDone = svcs.length > 0 && svcs.every((s) => serviceStatus(setup, s) === "completed");
  const svcToLink = svcs.filter((s) => !platformsForService(setup, s.id).length && !s.infraLater).length;
  const platUnlinked = plats.filter((p) => !platformLinked(p)).length;
  const sysUnlinked = syss.filter((s) => !systemLinked(setup, s)).length;
  const sysNoDetails = syss.filter((s) => !detailsComplete(s)).length;

  const approver = people.approver || {};
  const preServices = [
    { title: { text: "1. Confirm your CAF Lead" }, href: "/access/caf-lead?return=/setup/task-list", status: peopleStatus(people.cafLead) },
    { title: { text: "2. Your council’s context" }, href: "/setup/sector-context", status: ctxDone ? COMPLETED : ctxStarted ? IN_PROGRESS : NOT_STARTED },
    { title: { text: "3. How you identify services and systems" }, href: "/setup/methodology", status: record.methodologyComplete(setup) ? COMPLETED : methodStarted ? IN_PROGRESS : NOT_STARTED },
  ];

  const svcHint = [`${svcs.length} added`];
  if (svcToLink) svcHint.push(`${svcToLink} still to link to infrastructure`);
  const platHint = [`${plats.length} ${plural(plats.length, "platform")}`];
  if (platUnlinked) platHint.push(`${platUnlinked} not linked to anything yet`);
  const sysHint = [`${syss.length} added`];
  if (sysUnlinked) sysHint.push(`${sysUnlinked} not linked to a service yet`);
  if (sysNoDetails) sysHint.push(`${sysNoDetails} still ${sysNoDetails === 1 ? "needs" : "need"} an owner and impact ratings`);

  const servicesAndSystems = [
    {
      title: { text: "4. Your essential services" },
      href: svcs.length ? "/setup/essential-services" : "/setup/essential-services/choose",
      hint: svcs.length && !svcRowsDone ? { text: svcHint.join(" · ") } : undefined,
      status: !svcs.length ? NOT_STARTED : svcRowsDone ? COMPLETED : IN_PROGRESS,
    },
    {
      title: { text: "5. Your shared infrastructure" },
      href: plats.length ? "/setup/shared-infrastructure" : "/setup/shared-infrastructure/add-platform",
      hint: plats.length && platUnlinked ? { text: platHint.join(" · ") } : undefined,
      status: !plats.length ? NOT_STARTED : platUnlinked ? IN_PROGRESS : COMPLETED,
    },
    {
      title: { text: "6. Your critical systems" },
      href: "/setup/critical-systems",
      hint: syss.length && (sysUnlinked || sysNoDetails) ? { text: sysHint.join(" · ") } : undefined,
      status: !syss.length ? NOT_STARTED : syss.every((s) => systemComplete(setup, s)) ? COMPLETED : IN_PROGRESS,
    },
  ];

  const finish = [
    {
      title: { text: "7. Confirm your Approver" },
      href: "/access/approver?return=/setup/task-list",
      hint: approver.pending && !approver.confirmed ? { text: "Invitation sent, waiting for them to accept" } : undefined,
      status: peopleStatus(approver),
    },
    {
      title: { text: "8. Check and confirm" },
      href: "/setup/coverage-check",
      hint: setup.completed ? undefined : { text: "See anything still to link, then finish" },
      status: setup.completed ? COMPLETED : NOT_STARTED,
    },
  ];

  return { preServices, servicesAndSystems, finish };
}

// --- Essential services ------------------------------------------------------------------

// A service with nothing added yet starts the guided sequence (S10, S38, then S37). Otherwise the
// row opens the service page (S37). S36 panel.
function serviceHasNothing(setup, svc) {
  return serviceStatus(setup, svc) === "not_started";
}
function serviceHref(setup, svc) {
  return serviceHasNothing(setup, svc) ? `/setup/essential-services/${svc.id}/functions` : `/setup/essential-services/${svc.id}`;
}

// S36 task-list rows. The hint says what is linked; Completed rows have no hint (as drawn).
function buildServiceRows(setup) {
  return (setup.essentialServices || []).map((svc) => {
    const status = serviceStatus(setup, svc);
    const fns = (svc.functions || []).length;
    const plats = platformsForService(setup, svc.id).length;
    const syss = systemsForService(setup, svc).length;
    let hint;
    if (status === "not_started") {
      hint = "No functions, platforms or critical systems linked yet";
    } else if (status === "in_progress") {
      hint = [
        fns ? `${fns} ${plural(fns, "function")}` : "No functions yet",
        syss ? `${syss} critical ${plural(syss, "system")}` : "No critical systems linked yet",
        plats ? `${plats} ${plural(plats, "platform")}` : svc.infraLater ? "Infrastructure: link later" : "Infrastructure not linked yet",
      ].join(" · ");
    }
    return { title: { text: svc.name }, href: serviceHref(setup, svc), hint: hint ? { text: hint } : undefined, status: STATUS[status] };
  });
}

// One line for a system on S37: "Mission critical · Details complete" / "Assessed March 2025 · Details to do".
function systemLine(sys) {
  const parts = [];
  const crit = deriveCriticality(sys.impact);
  if (sys.assessedDate) parts.push(`Assessed ${sys.assessedDate}`);
  else if (crit) parts.push(crit);
  parts.push(detailsComplete(sys) ? "Details complete" : "Details to do");
  return parts.join(" · ");
}

// S37 / S37b: the service page, three summary cards. Empty cards show one row saying so.
function buildServicePage(setup, svc) {
  const base = `/setup/essential-services/${svc.id}`;
  const fns = svc.functions || [];
  const plats = platformsForService(setup, svc.id).slice().sort(byName);
  const syss = systemsForService(setup, svc).slice().sort(byName);
  return {
    functions: {
      action: { text: "Add a function", href: `${base}/functions/add?from=service` },
      rows: fns.map((f) => ({ key: f.name, change: { href: `${base}/functions/${f.id}/change`, text: "Change", hidden: f.name } })),
      empty: "No functions added yet",
    },
    infrastructure: {
      action: { text: "Link or unlink infrastructure", href: `${base}/core-infrastructure?from=service` },
      rows: plats.map((p) => ({ key: p.name, value: p.type })),
      empty: svc.infraLater ? "Not linked yet" : "No core infrastructure linked yet",
      emptyValue: svc.infraLater ? "You chose to link infrastructure later" : "",
    },
    systems: {
      action: { text: "Link or unlink critical systems", href: `${base}/systems?from=service` },
      rows: syss.map((s) => ({
        key: s.name,
        value: systemLine(s),
        change: { href: `/setup/critical-systems/${s.id}/summary?from=service:${svc.id}`, text: detailsComplete(s) ? "Change" : "Add details", hidden: s.name },
      })),
      empty: "No critical systems linked yet",
    },
  };
}

// S46 consequences, worked out from the record.
function buildRemoveServiceConsequences(setup, svc) {
  const fns = (svc.functions || []).length;
  const plats = platformsForService(setup, svc.id).length;
  const orphaned = systemsForService(setup, svc).filter((sys) => servicesForSystem(setup, sys).length === 1);
  const bullets = [];
  if (fns) bullets.push(`its ${fns} ${plural(fns, "function")} will be removed. You will need to add them again if you need them later`);
  if (plats) bullets.push(`it will no longer be linked to ${plats} core infrastructure ${plural(plats, "component")}. ${plats === 1 ? "The component" : "The components"} will not be removed`);
  orphaned.forEach((sys) => bullets.push(`the critical system ${sys.name} will no longer be linked to any essential services`));
  return { bullets, orphaned };
}

// --- Core infrastructure (platforms) ------------------------------------------------------

function platformSupportLine(p) {
  const svc = (p.linkedServices || []).length;
  const sys = (p.linkedSystems || []).length;
  if (!svc && !sys) return "Not linked to a service or system yet";
  const parts = [];
  if (svc) parts.push(`${svc} ${plural(svc, "service")}`);
  if (sys) parts.push(`${sys} ${plural(sys, "system")}`);
  return "Supports " + parts.join(" and ");
}

// S39 task-list rows: Completed once linked to anything. Only an In progress row has a hint, saying
// what is missing (24 November 2026, Michael: as S23 and S36).
function buildPlatformRows(setup) {
  return (setup.platforms || []).map((p) => ({
    title: { text: p.name },
    href: `/setup/shared-infrastructure/${p.id}`,
    hint: platformLinked(p) ? undefined : { text: platformSupportLine(p) },
    status: platformLinked(p) ? COMPLETED : IN_PROGRESS,
  }));
}

function platformManagedLine(setup, p) {
  const label = record.PLATFORM_MANAGED_LABELS[p.managedBy] || "";
  const supplier = p.supplierId ? getSupplier(setup, p.supplierId) : null;
  return supplier && label ? `${label}: ${supplier.name}` : label;
}

// S39a: the platform page.
function buildPlatformPage(setup, p) {
  const services = (setup.essentialServices || []).filter((s) => (p.linkedServices || []).includes(s.id)).map((s) => s.name);
  const systems = (setup.criticalSystems || []).filter((s) => (p.linkedSystems || []).includes(s.id)).map((s) => s.name);
  return { managed: platformManagedLine(setup, p), services, systems };
}

// S49 consequence sentence, using the same counts as S39.
function buildRemovePlatformConsequence(p) {
  const svc = (p.linkedServices || []).length;
  const sys = (p.linkedSystems || []).length;
  return `This core infrastructure supports ${svc} essential ${plural(svc, "service")} and ${sys} critical ${plural(sys, "system")}. If you remove it, these links will be removed.`;
}

// S45 / S38 / S20 option lists.
function buildPlatformChoices(setup, linkedIds) {
  const linked = new Set(linkedIds || []);
  return (setup.platforms || []).map((p) => ({ value: p.id, text: p.name, checked: linked.has(p.id) }));
}

// --- Critical systems --------------------------------------------------------------------

// S23 task-list rows: owner and criticality when complete; otherwise what is still to add.
function buildSystemRows(setup) {
  return (setup.criticalSystems || []).map((sys) => {
    const parts = [];
    const svcs = servicesForSystem(setup, sys).map((s) => s.name);
    // S23: a Completed row has no hint (24 November 2026, Michael); an In progress row says what is missing.
    if (!systemComplete(setup, sys)) {
      if (sys.assessedDate) parts.push(`Assessed ${sys.assessedDate}`);
      else if (svcs.length) parts.push(svcs.join(", "));
      if (!svcs.length) parts.push("Not linked to a service yet");
      if (!detailsComplete(sys)) {
        const missing = [];
        if (!(sys.owner && sys.owner.name)) missing.push("Owner");
        if (!deriveCriticality(sys.impact)) missing.push(missing.length ? "impact" : "Impact");
        parts.push(`${missing.join(" and ")} not added yet`);
      }
    }
    return {
      title: { text: sys.name },
      href: `/setup/critical-systems/${sys.id}/summary`,
      hint: parts.length ? { text: parts.join(" · ") } : undefined,
      status: systemComplete(setup, sys) ? COMPLETED : IN_PROGRESS,
    };
  });
}

const SUPPLIER_LABELS = { fully: "Yes, fully", partially: "Yes, partially", no: "No, the council manages it" };
const HOSTING_LABELS = { "third-party": "Third-party hosting", "on-premises": "On premises", "council-cloud": "Council-managed cloud" };
const IMPACT_LABELS = { low: "Low", medium: "Medium", high: "High" };

// S52: five summary cards. Values come from stored answers only: unanswered → "Not answered" with
// "Enter answer"; "None of these" → "None"; deferred → "Not linked yet" with "Link". One Change per
// question page; each returns to S52 (the `ret` query carries where S52 itself returns to).
function buildSystemCards(setup, sys, ret) {
  const base = `/setup/critical-systems/${sys.id}`;
  const q = "?return=summary" + (ret ? "&from=" + encodeURIComponent(ret) : "");
  const row = (key, value, href, opts) => {
    opts = opts || {};
    const answered = value !== undefined && value !== null && value !== "";
    return {
      key,
      value: answered ? value : opts.later ? "Not linked yet" : "Not answered",
      action: href ? { href: href + q, text: answered ? "Change" : opts.later ? "Link" : "Enter answer", hidden: opts.hidden || key.toLowerCase() } : null,
    };
  };

  const supported = supportedLabels(setup, sys);
  const others = sys.otherFunctionsNone
    ? "None"
    : (sys.otherFunctions || []).map((v) => (v === "other" ? sys.otherFunctionsDetail || "Other" : (record.OTHER_FUNCTION_OPTIONS.find((o) => o.value === v) || {}).label || v)).join(", ");
  const plats = platformsForSystem(setup, sys.id).map((p) => p.name).join(", ");
  const sup = sys.supplier || {};
  const supplier = sup.managed ? SUPPLIER_LABELS[sup.managed] + ((sup.managed === "fully" || sup.managed === "partially") && getSupplier(setup, sup.supplierId) ? ": " + getSupplier(setup, sup.supplierId).name : "") : "";
  const shared = sys.shared || {};
  const sharedValue = shared.answer === "yes" ? "Yes" + ((shared.councils || []).length ? ": " + shared.councils.join(", ") : "") : shared.answer === "no" ? "No" : "";
  const h = sys.hosting || {};
  const hosting = [HOSTING_LABELS[h.type], h.provider, h.secondary ? "Secondary: " + h.secondary : ""].filter(Boolean).join(" · ");
  const owner = sys.owner && sys.owner.name ? [sys.owner.name, sys.owner.jobTitle].filter(Boolean).join(", ") : "";
  const imp = sys.impact || {};
  const impact = deriveCriticality(imp) ? `Confidentiality: ${IMPACT_LABELS[imp.confidentiality]}<br>Integrity: ${IMPACT_LABELS[imp.integrity]}<br>Availability: ${IMPACT_LABELS[imp.availability]}` : "";

  return [
    { title: "About the system", rows: [
      row("Name", sys.name, `${base}/edit`),
      row("What it does", sys.description, `${base}/edit`),
      row("Assessed against the CAF before", { within_3_years: "Yes, within the last 3 years", more_than_3_years: "Yes, more than 3 years ago", no: "No", dont_know: "I don’t know" }[sys.assessedBefore], `${base}/edit`),
    ] },
    { title: "What it supports", rows: [
      row("Services it supports", supported.join(", ") || (sys.servicesLater ? "" : ""), `${base}/edit`, { later: sys.servicesLater }),
      row("Other council services or functions", others, `${base}/corporate-services`),
      row("Shared platforms it relies on", plats, `${base}/platforms`, { later: sys.platformsLater }),
    ] },
    { title: "Supplier and sharing", rows: [
      row("Managed by a third-party supplier", supplier, `${base}/supplier`),
      row("Shared with other councils", sharedValue, `${base}/shared-with-councils`),
    ] },
    { title: "Hosting", rows: [row("Where it is hosted", hosting, `${base}/hosting`)] },
    { title: "Ownership and impact", rows: [
      row("System owner", owner, `${base}/owner`),
      Object.assign(row("Impact if compromised", impact, `${base}/impact`), { html: true }),
      { key: "Overall criticality", value: deriveCriticality(imp) || "Not yet rated", note: "Worked out from the three impact ratings.", action: null },
    ] },
  ];
}

// S14 options: one per function ("Service — Function"), or one per service with no functions.
// A system linked to a service with functions shows all its functions ticked.
function buildSupportedServiceOptions(setup, sys) {
  const fnIds = new Set((sys && sys.functionIds) || []);
  const svcIds = new Set((sys && sys.serviceIds) || []);
  const options = [];
  (setup.essentialServices || []).forEach((svc) => {
    if ((svc.functions || []).length) {
      svc.functions.forEach((f) => options.push({ value: "fn:" + f.id, text: `${svc.name} — ${f.name}`, checked: fnIds.has(f.id) || svcIds.has(svc.id) }));
    } else {
      options.push({ value: "svc:" + svc.id, text: svc.name, checked: svcIds.has(svc.id) });
    }
  });
  return options;
}

// S47 consequences.
function buildRemoveSystemConsequences(setup, sys) {
  const plats = platformsForSystem(setup, sys.id).length;
  const bullets = [];
  if (plats) bullets.push(`it will no longer be linked to ${plats} shared infrastructure ${plural(plats, "platform")}. The platforms will not be removed`);
  if (sys.supplier && sys.supplier.supplierId) bullets.push("its supplier will stay on your list, if it is used elsewhere");
  return bullets;
}

// S21 inset: the hosting platform this system relies on, if any.
function deriveHostingPlatformName(setup, sys) {
  const hosting = platformsForSystem(setup, sys.id).find((p) => /hosting/i.test(p.type || ""));
  return hosting ? hosting.name : "";
}

// S27 / S28 caption: "2 of 3 systems".
function systemDetailCounter(setup, sys) {
  const all = setup.criticalSystems || [];
  return `${all.findIndex((s) => s.id === sys.id) + 1} of ${all.length} systems`;
}

// --- S30 Check your setup --------------------------------------------------------------------

function criticalityDistribution(setup) {
  const order = ["Mission critical", "Business critical", "Business supporting", "Non-critical"];
  const counts = {};
  let notRated = 0;
  (setup.criticalSystems || []).forEach((s) => {
    const c = deriveCriticality(s.impact);
    if (!c) notRated += 1;
    else counts[c] = (counts[c] || 0) + 1;
  });
  const parts = order.filter((l) => counts[l]).map((l) => `${counts[l]} ${l}`);
  if (notRated) parts.push(`${notRated} not yet rated`);
  return parts.join(" · ");
}

function personLine(p) {
  if (p && p.name && p.confirmed) return `${p.name}, confirmed`;
  if (p && p.name && p.pending) return `${p.name}, invitation sent`;
  return "";
}

// S30 sections. Unanswered rows read "Not answered" with "Enter"; Sector context has no Change.
function buildSetupCheck(setup) {
  const people = setup.people || {};
  const svcs = setup.essentialServices || [];
  const plats = setup.platforms || [];
  const syss = setup.criticalSystems || [];
  const row = (key, value, href, emptyText, enterText) => ({
    key,
    value: value || emptyText || "Not answered",
    action: href ? { href, text: value ? "Change" : enterText || "Enter", hidden: key.toLowerCase() } : null,
    id: null,
  });
  const cafLead = personLine(people.cafLead);
  const approver = personLine(people.approver);
  const unlinkedPlats = plats.filter((p) => !platformLinked(p)).length;
  const sysAll = syss.length && syss.every((s) => detailsComplete(s));
  return [
    { title: "Your people", rows: [
      Object.assign(row("CAF Lead", cafLead, "/access/caf-lead?return=/setup/check-your-setup", "Not confirmed yet", "Confirm"), { id: "cafLead-change" }),
      Object.assign(row("Approver", approver, "/access/approver?return=/setup/check-your-setup", "Not confirmed yet", "Confirm"), { id: "approver-change" }),
    ], note: "Setup is only complete once a CAF Lead and an Approver have been named." },
    { title: "Your council’s context", rows: [
      { key: "Sector context", value: setup.sectorContext && setup.sectorContext.confirmed ? "Read and confirmed" : "Not read yet", action: null },
      row("Council context", record.contextComplete(setup) ? "Completed" : record.contextStarted(setup) ? "Started" : "", "/setup/council-context?from=s30"),
      row("Organisational assessment done before", { within_3_years: "Yes, within the last 3 years", more_than_3_years: "Yes, more than 3 years ago", no: "No", dont_know: "I don’t know" }[(setup.organisationAssessment || {}).answer], "/setup/previous-assessment?from=s30"),
    ] },
    { title: "How you identify services and systems", rows: [
      row("Methodology", record.methodologyComplete(setup) ? (setup.methodology.approach === "five-lens" ? "GovAssure Five Lens Model" : "Your own approach") : "", "/setup/methodology?from=s30"),
    ] },
    { title: "Your services and systems", rows: [
      row("Essential services", svcs.length ? `${svcs.length} added` : "", "/setup/essential-services?return=/setup/check-your-setup", "None added"),
      row("Core infrastructure", plats.length ? `${plats.length} shared ${plural(plats.length, "platform")}, ${unlinkedPlats ? `${unlinkedPlats} not linked yet` : "linked to your services"}` : "", "/setup/shared-infrastructure?return=/setup/check-your-setup", "None added"),
      row("Critical systems", syss.length ? `${syss.length} added${sysAll ? ", all with owners and ratings" : ""}` : "", "/setup/critical-systems?return=/setup/check-your-setup", "None added"),
      row("System criticality", criticalityDistribution(setup), "/setup/critical-systems?return=/setup/check-your-setup", "None added"),
    ] },
  ];
}

// Counts the dashboard reads (R04 council record row).
function buildSetupSummary(setup) {
  return {
    servicesCount: (setup.essentialServices || []).length,
    platformsCount: (setup.platforms || []).length,
    systemsCount: (setup.criticalSystems || []).length,
    criticality: criticalityDistribution(setup),
  };
}

// --- Identity and chrome -------------------------------------------------------------------

// The signed-in person, from what they gave at sign-in and Claim.
function signedInSetupUser(req) {
  const claim = (req.session && req.session.data && req.session.data.claim) || {};
  const org = (claim.council && claim.council.name) || SETUP_USER.orgName;
  if (claim.person && claim.person.fullName) return { name: claim.person.fullName, orgName: org, role: "council" };
  if (claim.oneLoginEmail) return { name: require("../claim-example-data").displayNameFromEmail(claim.oneLoginEmail), orgName: org, role: "council" };
  return null;
}

// The example persona (Jo Hart, Westborough), only when the example council is loaded.
function exampleCouncilPersona(req) {
  const setup = req.session && req.session.data && req.session.data.setup;
  return setup && setup.exampleCouncil ? SETUP_USER : null;
}

function applySetupChrome(req, res) {
  res.locals.serviceName = SETUP_SERVICE_NAME;
  res.locals.showNavigation = true;
  res.locals.currentUser = signedInSetupUser(req) || exampleCouncilPersona(req);
  res.locals.navigation = buildSetupNavigation(req.path);
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
}

module.exports = {
  SETUP_USER,
  signedInSetupUser,
  exampleCouncilPersona,
  SETUP_SERVICE_NAME,
  HOLDING_HREF,
  ESSENTIAL_SERVICE_OPTIONS,
  COUNCIL_REGISTER,
  ensureSetup,
  buildSetupNavigation,
  buildSetupTaskList,
  applySetupChrome,
  slugify,
  getService,
  getPlatform,
  getSystem,
  getSupplier,
  deriveCriticality,
  serviceHref,
  buildServiceRows,
  buildServicePage,
  buildRemoveServiceConsequences,
  buildPlatformRows,
  buildPlatformPage,
  buildRemovePlatformConsequence,
  buildPlatformChoices,
  buildSystemRows,
  buildSystemCards,
  buildSupportedServiceOptions,
  buildRemoveSystemConsequences,
  deriveHostingPlatformName,
  systemDetailCounter,
  buildSetupCheck,
  buildSetupSummary,
  criticalityDistribution,
};
