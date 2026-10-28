// app/data/claim-example-data.js
//
// Council list + fictional email/connection data for the "Claim your council" prototype section.
// The council register now uses the REAL MHCLG council list (see app/data/councils.js, derived
// from data/source/council-status-list.csv — gitignored). Three fictional demo councils
// (Westborough, Eastvale, Northmoor) remain in that list, marked FICTIONAL DEMO, because the demo
// people and screens depend on them — remove before any real use.
// Domain recognition in Claim (screens 01/19) is driven by the fictional demo domains + the
// shared-domain mapping below plus scenario flags held in session (see docs/claim-session-keys.md).
// Real councils carry no domain and are only searchable on screen 29.

// The real council register behind the Claim autocomplete (screen 29) and getCouncilById/ByName.
const COUNCILS = require("./councils");

// A shared-service / managed-service provider domain recognised for more than one council (screen 19).
// DEMO DATA — a hard-coded mapping onto the three fictional demo councils. To be replaced when
// Leon's inventory of shared and managed services arrives. NOT built from the CSV "Shared service"
// column, which is free text and unreliable. Changed in build, prototype, pending design sign-off.
const SHARED_DOMAINS = {
  "novatech-services.co.uk": ["westborough", "eastvale", "northmoor"],
  "westvale-shared.gov.uk": ["westborough", "eastvale", "northmoor"],
};

// Example emails used by the prototype scenarios. EXAMPLE DATA, NOT REAL.
const EXAMPLE_EMAILS = {
  recognised: "j.hart@westborough.gov.uk", // recognised for Westborough
  unrecognised: "a.mensah@consultancy-cyber.co.uk", // recognised for no council
  sharedService: "sam.okafor@novatech-services.co.uk", // matches 3 councils (frame 19)
};

// Example shared organisation / supplier list behind the S09 "Organisation name"
// autocomplete (the same list Setup uses for suppliers).
const ORGANISATIONS = [
  "NovaTech Managed Services",
  "NEC Software Solutions",
  "Civica",
  "Capita",
  "Agilisys",
];

function domainOf(email) {
  const at = (email || "").indexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

function getCouncilById(id) {
  return COUNCILS.find((c) => c.id === id) || null;
}

function getCouncilByName(name) {
  const n = (name || "").trim().toLowerCase();
  return COUNCILS.find((c) => c.name.toLowerCase() === n) || null;
}

// Council ids whose recognised domains include this email's domain (direct or shared).
function councilsForEmail(email) {
  const domain = domainOf(email);
  if (!domain) return [];
  const ids = new Set();
  COUNCILS.forEach((c) => {
    if ((c.domains || []).indexOf(domain) !== -1) ids.add(c.id);
  });
  (SHARED_DOMAINS[domain] || []).forEach((id) => ids.add(id));
  return Array.from(ids);
}

module.exports = {
  COUNCILS,
  SHARED_DOMAINS,
  EXAMPLE_EMAILS,
  ORGANISATIONS,
  domainOf,
  getCouncilById,
  getCouncilByName,
  councilsForEmail,
};
