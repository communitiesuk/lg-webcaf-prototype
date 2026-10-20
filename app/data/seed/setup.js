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

// --- Static reference list: the essential-services pick list on S35 -----------------
// PLACEHOLDER LIST per the design ("the real list is coming from Leon"). Verbatim order.
const ESSENTIAL_SERVICE_OPTIONS = [
  "Adult social care",
  "Children's social care",
  "Revenue and benefits",
  "Housing and homelessness",
  "Waste collection and recycling",
  "Planning and building control",
  "Environmental health and licensing",
  "Highways and transport",
  "Electoral services",
  "Customer contact and the council website",
];

// Example council register for the S18 "Search for a council" autocomplete.
// EXAMPLE DATA, NOT REAL — in production this is the national council register used by
// "Claim your council". Includes the two councils the design shows as already shared.
const COUNCIL_REGISTER = [
  "Ashford Vale Council",
  "Brackenwood Borough Council",
  "Carnforth City Council",
  "Deepdale District Council",
  "Eastvale District Council",
  "Fenwick County Council",
  "Greystone Borough Council",
  "Northmoor County Council",
];

// --- The seeded (populated) Setup state the design depicts ---------------------------
function buildSetupSeed() {
  return {
    seeded: true,
    exampleData: true, // EXAMPLE DATA, NOT REAL

    council: {
      name: "Westborough Borough Council",
      type: "metropolitan borough council",
    },

    // People (confirmed via Access management, out of scope here — shown on S30).
    people: {
      cafLead: { name: "Jo Hart", confirmed: true },
      // jobTitle added for Decide (D12/D21). hasAccount drives the D08 branch:
      // true → D11 (Approver approves in service); false → D12 (record decision elsewhere).
      // EXAMPLE DATA, NOT REAL.
      approver: { name: "Cllr M Devlin", jobTitle: "Cabinet Member for Resources", confirmed: true, hasAccount: true },
    },

    // Assigned assurer — used by Decide (D07/D08/D11/D21). Setup does not capture this;
    // added here as shared EXAMPLE DATA. `assigned` drives D05→D09 vs D05→D06.
    assurer: { name: "K Osei", organisation: "Bridewell", assigned: true },

    // Whether the council has done its organisation assessment before — used by Decide
    // (D02/D03 "Included, not done before"; D20 nothing-left). EXAMPLE DATA, NOT REAL.
    organisationAssessment: { doneBefore: false },

    // Task 2a — S02 sector context (read-only, confirmed).
    sectorContext: { confirmed: true },

    // Task 2b — S03 council context (v7). CNI/OT are dropdown values (placeholder list); checkboxes
    // ticked and detail fields empty as drawn. CNI is seeded to a placeholder sector so it stays
    // flagged for Decide's D24 CNI consistency check (Boolean(councilContext.cni)).
    councilContext: {
      cni: "placeholder-sector-1",
      operationalTechnology: "",
      recentItTransformation: true,
      recentItTransformationDetail: "",
      upcomingItTransformation: false,
      upcomingItTransformationDetail: "",
      lgr: true,
      lgrDetail: "",
      noneOfThese: false,
      anythingElse: "",
      completed: true,
    },

    // Task 3 — S04/S05 methodology.
    methodology: {
      approach: "five-lens", // "five-lens" | "other"
      // Example values used when "another methodology" (S05) is visited:
      detail:
        "We used our business continuity plan. Services were ranked by the impact of losing them for more than 24 hours.",
      link: "https://westborough.example/methodology",
      completed: true,
    },

    // Task 4 — essential services (3). Counts on S01/S36/S30 derive from these.
    essentialServices: [
      {
        id: "svc-revenue-benefits",
        name: "Revenue and benefits",
        source: "list",
        functions: [
          { id: "fn-benefits-management", name: "Benefits management" },
          { id: "fn-revenue-collection", name: "Revenue collection" },
        ],
        noSystemReason: "",
        // infraStatus drives the hub's final status part: "complete" | "to_do" | "link_later"
        infraStatus: "complete",
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
        infraStatus: "to_do",
      },
      {
        id: "svc-waste-collection",
        name: "Waste collection and recycling",
        source: "list",
        functions: [],
        noSystemReason: "",
        infraStatus: "link_later",
      },
    ],

    // Task 5 — shared infrastructure platforms (5).
    // Platforms are the SINGLE SOURCE OF TRUTH for links: each lists the services and
    // systems that rely on it (linkedServices / linkedSystems). Every per-service and
    // per-system platform count is derived from these. `type` is the short label the
    // S39 hub shows. (The design's per-platform counts were mutually inconsistent across
    // frames; these are reconciled so S36, S20, S39 and the S01 task hint all agree.)
    platforms: [
      {
        id: "plat-entra",
        name: "Entra ID",
        type: "Identity and access management",
        managedBy: "council",
        supplierId: "",
        linkedServices: ["svc-revenue-benefits"],
        linkedSystems: ["sys-northgate", "sys-social-care", "sys-website"],
      },
      {
        id: "plat-network",
        name: "Council network and VPN",
        type: "Network",
        managedBy: "council",
        supplierId: "",
        linkedServices: ["svc-revenue-benefits"],
        linkedSystems: ["sys-northgate", "sys-social-care", "sys-website", "sys-housing", "sys-traffic"],
      },
      {
        id: "plat-azure",
        name: "Azure landing zone",
        type: "Hosting",
        managedBy: "council",
        supplierId: "",
        linkedServices: ["svc-revenue-benefits"],
        linkedSystems: ["sys-northgate", "sys-website"],
      },
      {
        id: "plat-integration",
        name: "Integration and API gateway",
        type: "Integration",
        managedBy: "council",
        supplierId: "",
        linkedServices: [],
        linkedSystems: ["sys-website"],
      },
      {
        id: "plat-siem",
        name: "SIEM and monitoring",
        type: "Logging and monitoring",
        managedBy: "council",
        supplierId: "",
        linkedServices: [],
        linkedSystems: [],
      },
    ],

    // Shared supplier list (reused by S12c and S16).
    suppliers: [
      { id: "sup-nec", name: "NEC Software Solutions" },
      { id: "sup-novatech", name: "NovaTech Managed Services" },
      { id: "sup-microsoft", name: "Microsoft" },
    ],

    // Task 6 — critical systems (4).
    criticalSystems: [
      {
        id: "sys-northgate",
        name: "Northgate Revenues and Benefits",
        description:
          "Processes council tax, business rates and housing benefit. If compromised, the council could not bill or pay benefit, and residents' financial data could be exposed.",
        supportedServices: ["fn-benefits-management", "fn-revenue-collection"],
        assessedBefore: "no",
        corporateServices: ["finance-accounting", "procurement-contract", "other"],
        corporateServicesOther: "Electronic document signing",
        managedBySupplier: "partially",
        supplierId: "sup-nec",
        supplierNote: "",
        sharedWithCouncils: true,
        councils: ["Eastvale District Council", "Northmoor County Council"],
        hosting: {
          type: "third-party",
          provider: "Microsoft Azure, UK South",
          secondary: "Microsoft Azure, UK West",
        },
        owner: { name: "Marcus Webb", jobTitle: "Head of Revenues and Benefits" },
        impact: { confidentiality: "high", integrity: "high", availability: "high" },
        recovery: { mtd: "24 hours", rto: "8 hours", rpo: "1 hour" },
        inPlan: true,
        detailsComplete: true,
        cni: false, // per-system CNI flag (set in Decide D23/D25/D26)
      },
      {
        id: "sys-social-care",
        name: "Social care case management",
        description: "",
        supportedServices: ["svc-adult-social-care"],
        assessedBefore: "no",
        corporateServices: [],
        corporateServicesOther: "",
        managedBySupplier: "",
        supplierId: "",
        supplierNote: "",
        sharedWithCouncils: false,
        councils: [],
        hosting: { type: "", provider: "", secondary: "" },
        owner: { name: "Dana Price", jobTitle: "Head of Adult Social Care" },
        impact: { confidentiality: "high", integrity: "medium", availability: "medium" },
        recovery: { mtd: "", rto: "", rpo: "" },
        inPlan: false,
        detailsComplete: true,
        cni: false,
      },
      {
        id: "sys-website",
        name: "Council website and forms",
        description: "",
        supportedServices: [],
        assessedBefore: "yes",
        assessedBeforeRecord: "Website and online forms, assessed March 2025",
        assessedDate: "March 2025",
        corporateServices: [],
        corporateServicesOther: "",
        managedBySupplier: "",
        supplierId: "",
        supplierNote: "",
        sharedWithCouncils: false,
        councils: [],
        hosting: { type: "", provider: "", secondary: "" },
        owner: { name: "", jobTitle: "" },
        impact: { confidentiality: "", integrity: "", availability: "" },
        recovery: { mtd: "", rto: "", rpo: "" },
        inPlan: false,
        detailsComplete: false,
        cni: false,
      },
      {
        id: "sys-housing",
        name: "Housing management system",
        description: "",
        supportedServices: [], // not linked to a service yet
        assessedBefore: "no",
        corporateServices: [],
        corporateServicesOther: "",
        managedBySupplier: "",
        supplierId: "",
        supplierNote: "",
        sharedWithCouncils: false,
        councils: [],
        hosting: { type: "", provider: "", secondary: "" },
        owner: { name: "Priya Shah", jobTitle: "Head of Housing" },
        impact: { confidentiality: "high", integrity: "high", availability: "high" },
        recovery: { mtd: "", rto: "", rpo: "" },
        inPlan: false,
        detailsComplete: true,
        cni: false,
      },
      {
        id: "sys-traffic",
        name: "Urban traffic control",
        description: "",
        supportedServices: [], // not linked to a service yet (CNI example)
        assessedBefore: "no",
        corporateServices: [],
        corporateServicesOther: "",
        managedBySupplier: "",
        supplierId: "",
        supplierNote: "",
        sharedWithCouncils: false,
        councils: [],
        hosting: { type: "", provider: "", secondary: "" },
        owner: { name: "Sam Okafor", jobTitle: "Head of Highways" },
        impact: { confidentiality: "high", integrity: "medium", availability: "medium" },
        recovery: { mtd: "", rto: "", rpo: "" },
        inPlan: false,
        detailsComplete: true,
        cni: true, // CNI example (per the Decide README)
      },
    ],
  };
}

// --- Empty Setup state (build from scratch) ------------------------------------------
// The claimed council, CAF Lead (the claimant) and assigned assurer are account-level and
// kept, but every setup task is undone: the Approver is NOT yet confirmed (task 7 does it,
// via /access/approver), and there is no confirmed context, methodology, services,
// platforms, suppliers or critical systems. Used by the "/beta" Start empty (Setup) mode.
function buildSetupSeedEmpty() {
  return {
    seeded: true,
    exampleData: true,

    council: {
      name: "Westborough Borough Council",
      type: "metropolitan borough council",
    },

    people: {
      // CAF Lead not confirmed — from an empty council the user confirms it in task 1 (Access A22),
      // so the task list starts "Not started" and the dashboard reads "Not started", not in progress.
      // Changed in build, prototype, pending design sign-off.
      cafLead: { name: "", confirmed: false },
      // Approver not yet confirmed — the user records it in task 7 (Access A27).
      approver: { name: "", jobTitle: "", confirmed: false, hasAccount: false },
    },

    assurer: { name: "K Osei", organisation: "Bridewell", assigned: true },
    organisationAssessment: { doneBefore: false },

    // Task 2 — not confirmed yet.
    sectorContext: { confirmed: false },
    councilContext: {
      cni: "",
      operationalTechnology: "",
      recentItTransformation: false,
      recentItTransformationDetail: "",
      upcomingItTransformation: false,
      upcomingItTransformationDetail: "",
      lgr: false,
      lgrDetail: "",
      noneOfThese: false,
      anythingElse: "",
      completed: false,
    },

    // Task 3 — no methodology chosen.
    methodology: { approach: "", detail: "", link: "", completed: false },

    // Tasks 4–6 — nothing added yet.
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
  ESSENTIAL_SERVICE_OPTIONS,
  COUNCIL_REGISTER,
  buildSetupSeed,
  buildSetupSeedEmpty,
  buildDecideSeed,
  buildDecideSeedEmpty,
};
