// app/routes/research-setup.js
//
// Research scenarios for Setup v11 (pass 1, 24 November 2026). Each scenario sets session data only,
// then opens the page the facilitator note names. The participant plays the CAF Lead, already confirmed
// (Claim v15 names the CAF Lead before anyone can open Setup). Councils, people, services and systems
// here are EXAMPLE DATA for research, never shown unless a scenario is started.

const { buildSetupSeedEmpty, buildDecideSeedEmpty, system } = require("../data/seed/setup");
const { buildAccessEmpty, setCafLead } = require("../data/helpers/access");
const { ensureSetup } = require("../data/helpers/setup");
const acting = require("../data/helpers/acting-as");

const METROPOLITAN = { id: "westborough", name: "Westborough Borough Council" };
const DISTRICT = { id: "eastvale", name: "Eastvale District Council" };
const PERSON = { fullName: "Sam Rivera", jobTitle: "Head of IT" };

// A claimed council with its CAF Lead confirmed and nothing else set up.
function freshCouncil(data, council) {
  Object.keys(data).forEach((k) => {
    if (k !== "research") delete data[k];
  });
  const domain = council.id === "eastvale" ? "eastvale.gov.uk" : "westborough.gov.uk";
  const email = "s.rivera@" + domain;
  data.claim = { council: Object.assign({}, council), person: Object.assign({}, PERSON), oneLoginEmail: email };
  data.setup = buildSetupSeedEmpty();
  data.decide = buildDecideSeedEmpty();
  data.access = buildAccessEmpty();
  const me = data.access.people[0];
  Object.assign(me, { name: PERSON.fullName, firstName: "Sam", email });
  setCafLead(data.access, me.id);
  data.access.auditTrail = [];
  ensureSetup(data); // council name and type from the claim
  data.setup.people.cafLead = { name: PERSON.fullName, confirmed: true };
  acting.signInAs(data, "caf-lead");
  return data.setup;
}

// Tasks 2 and 3 answered, and an Approver named, so only tasks 4 to 6 vary between scenarios.
function contextDone(setup) {
  setup.sectorContext.confirmed = true;
  setup.councilContext = {
    cniSectors: ["Not applicable"],
    otTypes: ["CCTV and public space surveillance"],
    itChanges: "",
    anythingElse: "",
    answered: true,
  };
  setup.organisationAssessment = { answer: "no" };
  setup.methodology = { approach: "five-lens", notes: "", link: "" };
  setup.people.approver = { name: "Cllr A Morgan", jobTitle: "Leader of the council", confirmed: true, hasAccount: false };
}

const svc = (id, name, functions, extra) => Object.assign({ id, name, source: "list", functions: functions || [], infraLater: false }, extra);
const fn = (id, name) => ({ id, name });
const plat = (id, name, type, services, systems) => ({ id, name, type, managedBy: "council", supplierId: "", linkedServices: services || [], linkedSystems: systems || [] });
const rated = { confidentiality: "high", integrity: "medium", availability: "medium" };
const owner = (name, jobTitle) => ({ name, jobTitle });

// A complete set of services, platforms and systems: nothing for S24 to list.
function completeInventory(setup) {
  setup.essentialServices = [
    svc("svc-revenues", "Revenues and benefits", [fn("fn-council-tax", "Council tax"), fn("fn-benefits", "Housing benefit")]),
    svc("svc-adult-care", "Adult social care", [fn("fn-assessments", "Assessments")]),
    svc("svc-waste", "Waste collection and recycling", [fn("fn-collection", "Collection rounds")]),
  ];
  setup.platforms = [
    plat("plat-entra", "Entra ID", "Identity and access management", ["svc-revenues", "svc-adult-care", "svc-waste"], ["sys-revenues", "sys-care", "sys-waste"]),
    plat("plat-network", "Council network", "Network and connectivity", ["svc-revenues", "svc-adult-care", "svc-waste"], ["sys-revenues", "sys-care", "sys-waste"]),
  ];
  setup.criticalSystems = [
    system({ id: "sys-revenues", name: "Revenues system", functionIds: ["fn-council-tax", "fn-benefits"], assessedBefore: "no", owner: owner("Lee Grant", "Head of Revenues"), impact: { confidentiality: "high", integrity: "high", availability: "high" }, supplier: { managed: "no", supplierId: "", note: "" }, shared: { answer: "no", councils: [] } }),
    system({ id: "sys-care", name: "Care records system", serviceIds: ["svc-adult-care"], assessedBefore: "no", owner: owner("Ana Ruiz", "Head of Adult Social Care"), impact: rated, supplier: { managed: "no", supplierId: "", note: "" }, shared: { answer: "no", councils: [] } }),
    system({ id: "sys-waste", name: "Waste rounds system", serviceIds: ["svc-waste"], assessedBefore: "no", owner: owner("Tom Hale", "Waste Manager"), impact: { confidentiality: "low", integrity: "medium", availability: "high" }, supplier: { managed: "no", supplierId: "", note: "" }, shared: { answer: "no", councils: [] } }),
  ];
}

const SETUP_SCENARIOS = [
  {
    key: "metropolitan-fresh",
    title: "1. Metropolitan borough, fresh setup",
    note: "Claim done, CAF Lead confirmed, nothing else. Expect S01 with task 1 Completed and the rest Not yet started. Task 4 opens S35 with the 16 single-tier services, none ticked.",
    build: (data) => freshCouncil(data, METROPOLITAN),
    to: "/setup/task-list",
  },
  {
    key: "district-fresh",
    title: "2. District council, fresh setup",
    note: "As 1, for a district council. S35 shows the 7 lower-tier services; S09 says “district councils”.",
    build: (data) => freshCouncil(data, DISTRICT),
    to: "/setup/task-list",
  },
  {
    key: "services-only",
    title: "3. Part-way: services only",
    note: "Three services with nothing added to them. Expect S36 rows “No functions, platforms or critical systems yet”; each opens S10 (the first step). S24 lists each service with no system.",
    build: (data) => {
      const setup = freshCouncil(data, METROPOLITAN);
      contextDone(setup);
      setup.essentialServices = [svc("svc-adult-care", "Adult social care"), svc("svc-revenues", "Revenues and benefits"), svc("svc-waste", "Waste collection and recycling")];
    },
    to: "/setup/essential-services",
  },
  {
    key: "systems-missing-details",
    title: "4. Part-way: systems missing details",
    note: "Four systems, two without an owner or impact ratings. Expect S23 rows saying “Owner and impact not added yet” and S24 “2 critical systems still need an owner and impact ratings”. Its link opens S52 for the first; “Go to the first missing detail” opens S27.",
    build: (data) => {
      const setup = freshCouncil(data, METROPOLITAN);
      contextDone(setup);
      completeInventory(setup);
      setup.criticalSystems.push(
        system({ id: "sys-housing", name: "Housing management system", serviceIds: ["svc-revenues"], assessedBefore: "no" }),
        system({ id: "sys-payments", name: "Payments platform", serviceIds: ["svc-revenues"], assessedBefore: "no" })
      );
      setup.criticalSystems.splice(2, 1); // four systems in all
      setup.platforms.forEach((p) => { p.linkedSystems = p.linkedSystems.filter((id) => id !== "sys-waste"); });
      setup.criticalSystems.find((s) => s.id === "sys-care").serviceIds.push("svc-waste");
    },
    to: "/setup/critical-systems",
  },
  {
    key: "platform-unlinked",
    title: "5. Platform linked to nothing",
    note: "Five platforms, one linked to nothing. Expect S39 In progress on that row, and S24 “… is not linked to any service or system” with “Link it to a service or system” opening S45.",
    build: (data) => {
      const setup = freshCouncil(data, METROPOLITAN);
      contextDone(setup);
      completeInventory(setup);
      setup.platforms.push(
        plat("plat-azure", "Azure landing zone", "Hosting, cloud or compute", ["svc-revenues"], ["sys-revenues"]),
        plat("plat-backup", "Backup service", "Backup and recovery", ["svc-adult-care"], ["sys-care"]),
        plat("plat-siem", "SIEM and monitoring", "Security, logging and monitoring", [], [])
      );
    },
    to: "/setup/shared-infrastructure",
  },
  {
    key: "removal",
    title: "6. Removal",
    note: "Revenues system is linked to two services and three platforms. Open it from S23 and choose Remove this critical system. Expect S47 with “3 shared infrastructure platforms”, then S23 with a banner; the services and platforms are still there.",
    build: (data) => {
      const setup = freshCouncil(data, METROPOLITAN);
      contextDone(setup);
      completeInventory(setup);
      const sys = setup.criticalSystems.find((s) => s.id === "sys-revenues");
      sys.serviceIds = ["svc-adult-care"];
      setup.platforms.push(plat("plat-azure", "Azure landing zone", "Hosting, cloud or compute", ["svc-revenues"], ["sys-revenues"]));
    },
    to: "/setup/critical-systems",
  },
  {
    key: "blocked-removal",
    title: "7. Blocked removal",
    note: "Setup finished and this cycle’s plan approved with Revenues system in it. Open Revenues system from S23 and choose Remove this critical system. Expect S48.",
    build: (data) => {
      const setup = freshCouncil(data, METROPOLITAN);
      contextDone(setup);
      completeInventory(setup);
      setup.completed = true;
      data.decide.cycle = { selectedSystems: ["sys-revenues"], noneOnly: false, confirmed: true };
      data.decide.plan = { state: "approved" };
      data.decide.approval = { decision: "approved", by: setup.people.approver.name, date: "17 November 2026", how: "at-meeting", link: "", returnReason: "" };
    },
    to: "/setup/critical-systems",
  },
  {
    key: "complete",
    title: "8. Complete",
    note: "Everything filled in, not yet confirmed. Expect S24a (nothing to review), S30 with every row, then S31. Before S30 the Decide tile is not shown (AS01 lists Check and confirm); after S31 it reads Not started.",
    build: (data) => {
      const setup = freshCouncil(data, METROPOLITAN);
      contextDone(setup);
      completeInventory(setup);
    },
    to: "/setup/task-list",
  },
];

module.exports = function (router) {
  router.get("/research/setup/:key", (req, res) => {
    const scenario = SETUP_SCENARIOS.find((s) => s.key === req.params.key);
    if (!scenario) return res.redirect("/beta/round-3");
    scenario.build(req.session.data);
    return res.redirect(scenario.to);
  });
};

module.exports.SETUP_SCENARIOS = SETUP_SCENARIOS;
module.exports.freshCouncil = freshCouncil;
