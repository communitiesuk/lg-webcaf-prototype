// app/data/seed/setup.js
//
// EXAMPLE DATA, NOT REAL.
// Coherent seed dataset for the "Set up your council" (Setup v6) prototype section.
// Built from Figma Setup v6 (file mnOq3QRhTdiliuSuzQoNsX, page 393:2). Values are the
// design's own example values, reconciled into ONE internally consistent dataset so that
// the counts shown across screens line up (3 essential services, 5 shared platforms,
// 5 critical systems). See docs/setup-session-keys.md for the full data model.
//
// Reconciliations applied (logged as deviations): the design's per-screen numbers
// conflicted (e.g. "2 of 3 systems" vs "4 critical systems"); this dataset standardises
// on 3 services / 5 platforms / 5 critical systems. All Setup counts are derived, so they
// recompute. The 5th system (Housing management system, Mission critical) is the Decide
// D02 mock's own example, added so the shared seed renders Decide's "Which critical systems
// will you assess?" faithfully (two Mission-tier systems; the over-limit path).

// The S35 lists by council tier live in app/data/helpers/council-record.js (SERVICES_BY_TIER).
// Kept for anything that still imports the old flat list: the single-tier list.
const ESSENTIAL_SERVICE_OPTIONS = require("../helpers/council-record").SERVICES_BY_TIER.single;

// Council register for the S18 "Search for a council" autocomplete (which councils share this
// system). Uses the SAME real council list as Claim (app/data/councils.js, 330 real + 3 fictional
// demo councils) so the two registers are consistent.
const COUNCIL_REGISTER = require("../councils").map((c) => c.name);

// A critical system in the record format (Setup v11). Only answers are stored.
function system(fields) {
  return Object.assign(
    {
      id: "",
      name: "",
      description: "",
      serviceIds: [],
      functionIds: [],
      servicesLater: false,
      otherFunctions: [],
      otherFunctionsDetail: "",
      otherFunctionsNone: false,
      platformsLater: false,
      supplier: { managed: "", supplierId: "", note: "" },
      shared: { answer: "", councils: [] },
      hosting: { type: "", provider: "", secondary: "" },
      owner: { name: "", jobTitle: "" },
      impact: { confidentiality: "", integrity: "", availability: "" },
      assessedBefore: "",
      cni: false, // set in Decide (D23, D25, D26)
    },
    fields
  );
}

// --- The populated example council (Westborough), EXAMPLE DATA, NOT REAL ---------------------
// Left part-way on purpose, so S24 has something to show: Social care has no platforms, Waste
// collection has nothing yet, two systems are not linked to a service, one has no owner or ratings
// and SIEM and monitoring is linked to nothing.
function buildSetupSeed() {
  return {
    seeded: true,
    recordVersion: 11,
    exampleData: true, // EXAMPLE DATA, NOT REAL
    exampleCouncil: true, // the populated example council (not one a participant registered)

    council: { name: "Westborough Borough Council", type: "metropolitan_borough" },

    people: {
      cafLead: { name: "Jo Hart", confirmed: true },
      // hasAccount: true → the Approver approves in the service (D11); false → D12.
      approver: { name: "Cllr M Devlin", jobTitle: "Cabinet Member for Resources", confirmed: true, hasAccount: true },
    },

    // Assigned assurer, used by Decide only. `assigned` drives D05 → D09 rather than D06.
    assurer: { name: "K Osei", organisation: "Bridewell", assigned: true },

    organisationAssessment: { answer: "no" }, // S03a
    sectorContext: { confirmed: true }, // S02

    // S03. A CNI sector is chosen, so Decide asks D23.
    councilContext: {
      cniSectors: ["Transport"],
      otTypes: ["Traffic signals and urban traffic control", "CCTV and public space surveillance"],
      itChanges: "Moved to Microsoft 365 in 2025",
      anythingElse: "",
      answered: true,
    },

    // S04, S05.
    methodology: {
      approach: "five-lens",
      notes: "We used our business continuity plan. Services were ranked by the impact of losing them for more than 24 hours.",
      link: "https://westborough.example/methodology",
    },

    essentialServices: [
      {
        id: "svc-revenue-benefits",
        name: "Revenues and benefits",
        source: "list",
        functions: [
          { id: "fn-benefits-management", name: "Benefits management" },
          { id: "fn-revenue-collection", name: "Revenue collection" },
        ],
        noSystemReason: "",
        infraLater: false,
      },
      {
        id: "svc-adult-social-care",
        name: "Adult social care",
        source: "list",
        functions: [
          { id: "fn-assessment-casework", name: "Assessment and casework" },
          { id: "fn-safeguarding", name: "Safeguarding" },
        ],
        noSystemReason: "",
        infraLater: false,
      },
      {
        id: "svc-waste-collection",
        name: "Waste collection and recycling",
        source: "list",
        functions: [],
        noSystemReason: "",
        infraLater: true,
      },
    ],

    // Platforms hold the service and system links (each link is stored once).
    platforms: [
      { id: "plat-entra", name: "Entra ID", type: "Identity and access management", managedBy: "council", supplierId: "", linkedServices: ["svc-revenue-benefits"], linkedSystems: ["sys-northgate", "sys-social-care", "sys-website"] },
      { id: "plat-network", name: "Council network and VPN", type: "Network and connectivity", managedBy: "council", supplierId: "", linkedServices: ["svc-revenue-benefits"], linkedSystems: ["sys-northgate", "sys-social-care", "sys-website", "sys-housing", "sys-traffic"] },
      { id: "plat-azure", name: "Azure landing zone", type: "Hosting, cloud or compute", managedBy: "council", supplierId: "", linkedServices: ["svc-revenue-benefits"], linkedSystems: ["sys-northgate", "sys-website"] },
      { id: "plat-integration", name: "Integration and API gateway", type: "Integration and APIs", managedBy: "council", supplierId: "", linkedServices: [], linkedSystems: ["sys-website"] },
      { id: "plat-siem", name: "SIEM and monitoring", type: "Security, logging and monitoring", managedBy: "council", supplierId: "", linkedServices: [], linkedSystems: [] },
    ],

    suppliers: [{ id: "sup-nec", name: "NEC Software Solutions" }],

    criticalSystems: [
      system({
        id: "sys-northgate",
        name: "Northgate Revenues and Benefits",
        description: "Processes council tax, business rates and housing benefit. If compromised, the council could not bill or pay benefit, and residents' financial data could be exposed.",
        functionIds: ["fn-benefits-management", "fn-revenue-collection"],
        assessedBefore: "no",
        otherFunctions: ["finance-accounting", "procurement-contract", "other"],
        otherFunctionsDetail: "Electronic document signing",
        supplier: { managed: "partially", supplierId: "sup-nec", note: "" },
        shared: { answer: "yes", councils: ["Eastvale District Council", "Northmoor County Council"] },
        hosting: { type: "third-party", provider: "Microsoft Azure, UK South", secondary: "Microsoft Azure, UK West" },
        owner: { name: "Marcus Webb", jobTitle: "Head of Revenues and Benefits" },
        impact: { confidentiality: "high", integrity: "high", availability: "high" },
      }),
      system({
        id: "sys-social-care",
        name: "Social care case management",
        serviceIds: ["svc-adult-social-care"],
        assessedBefore: "no",
        owner: { name: "Dana Price", jobTitle: "Head of Adult Social Care" },
        impact: { confidentiality: "high", integrity: "medium", availability: "medium" },
      }),
      system({
        id: "sys-website",
        name: "Revenue and Benefits processing software",
        functionIds: ["fn-revenue-collection"],
        assessedBefore: "within_3_years",
        assessedDate: "March 2025",
      }),
      system({
        id: "sys-housing",
        name: "Housing management system",
        assessedBefore: "no",
        owner: { name: "Priya Shah", jobTitle: "Head of Housing" },
        impact: { confidentiality: "high", integrity: "high", availability: "high" },
      }),
      system({
        id: "sys-traffic",
        name: "Urban traffic control",
        assessedBefore: "no",
        owner: { name: "Sam Okafor", jobTitle: "Head of Highways" },
        impact: { confidentiality: "high", integrity: "medium", availability: "medium" },
        cni: true,
      }),
    ],
  };
}

// --- Empty Setup (a council with nothing set up yet) -------------------------------------------
// The council's name and type come from Claim (ensureSetup copies them). CAF Lead and Approver are
// not confirmed here; Claim or Access sets them.
function buildSetupSeedEmpty() {
  return {
    seeded: true,
    recordVersion: 11,
    exampleData: true,
    council: { name: "", type: "" },
    people: {
      cafLead: { name: "", confirmed: false },
      approver: { name: "", jobTitle: "", confirmed: false, hasAccount: false },
    },
    // No assurer: a newly registered council has not been assigned one (Decide D05 → D06).
    assurer: { name: "", organisation: "", assigned: false },
    organisationAssessment: { answer: "" },
    sectorContext: { confirmed: false },
    councilContext: {
      cniSectors: [],
      otTypes: [],
      itChanges: "",
      anythingElse: "",
      answered: false,
    },
    methodology: { approach: "", notes: "", link: "" },
    essentialServices: [],
    platforms: [],
    suppliers: [],
    criticalSystems: [],
  };
}

// --- Decide ("Decide what to assess") initial state ---------------------------------
// EXAMPLE DATA, NOT REAL. Decide reads systems/criticality/CNI/assessed-before from the
// Setup model above; this namespace holds Decide's own cycle choices. Pre-populated to
// match the design's examples (Northgate + Social care chosen; Northgate timed March 2027).
function buildDecideSeed() {
  return {
    seeded: true,
    exampleData: true,
    cniAnswer: "yes", // D23 (Urban traffic control is CNI in the seed)
    cycle: { selectedSystems: ["sys-northgate", "sys-social-care"], confirmed: false },
    timing: {
      organisation: "tbc",
      "sys-northgate": { month: "3", year: "2027" },
      "sys-social-care": "tbc",
    },
    plan: { sentToAssurer: false },
    // Pre-filled assurer comment (shown on D07 textarea and quoted on D08). EXAMPLE DATA.
    assurerFeedback:
      "Consider whether Urban traffic control should be in this cycle rather than deferred, given it has never been assessed.",
    // Approval state (D11–D14). Date/returnReason pre-filled with the design examples so the
    // D12/D13/D14 screens render meaningfully; set for real on D11/D12 submit. EXAMPLE DATA.
    approval: {
      decision: "",
      by: "",
      date: "18 March 2027",
      how: "at-meeting",
      link: "",
      returnReason:
        "We do not have capacity for two critical systems this year alongside the organisation assessment. Please reduce to one.",
    },
  };
}

// Empty Decide state — the populated Setup inventory stays (so there are systems to choose
// from), but NO cycle choices are made. Used by the "/beta" Start empty mode so the user
// declares CNI, chooses systems, sets timing and sends for approval themselves.
function buildDecideSeedEmpty() {
  return {
    seeded: true,
    exampleData: true,
    cniAnswer: "",
    cycle: { selectedSystems: [], noneOnly: false, confirmed: false },
    timing: {},
    plan: { sentToAssurer: false },
    assurerFeedback: "",
    approval: { decision: "", by: "", date: "", how: "", link: "", returnReason: "" },
  };
}

module.exports = {
  system,
  ESSENTIAL_SERVICE_OPTIONS,
  COUNCIL_REGISTER,
  buildSetupSeed,
  buildSetupSeedEmpty,
  buildDecideSeed,
  buildDecideSeedEmpty,
};
