// app/data/claim-example-data.js
//
// EXAMPLE DATA, NOT REAL.
// Fictional councils, email domains and connection data for the "Claim your council"
// (Claim v3) prototype section. No real council names, people or domains are used.
// Domain recognition in Claim is driven by this data plus scenario flags held in session
// (see docs/claim-session-keys.md). The ".gov.uk"-style domains are fictional and match
// the Figma frames; the council names do not correspond to any real English council.

// The council register behind the S02 "Council name" autocomplete (329+ in production).
const COUNCILS = [
  { id: "westborough", name: "Westborough Borough Council", type: "Borough council", domains: ["westborough.gov.uk"] },
  { id: "eastvale", name: "Eastvale District Council", type: "District council", domains: ["eastvale.gov.uk"] },
  { id: "northmoor", name: "Northmoor County Council", type: "County council", domains: ["northmoor.gov.uk"] },
  { id: "ashford-vale", name: "Ashford Vale Council", type: "Unitary authority", domains: ["ashfordvale.gov.uk"] },
  { id: "brackenwood", name: "Brackenwood Borough Council", type: "Borough council", domains: ["brackenwood.gov.uk"] },
  { id: "carnforth", name: "Carnforth City Council", type: "City council", domains: ["carnforth.gov.uk"] },
  { id: "deepdale", name: "Deepdale District Council", type: "District council", domains: ["deepdale.gov.uk"] },
  { id: "greystone", name: "Greystone Borough Council", type: "Borough council", domains: ["greystone.gov.uk"] },
];

// A shared-service / managed-service provider domain can be recognised for more than one
// council. This drives frame 19 (domain matches more than one council).
const SHARED_DOMAINS = {
  "novatech-services.co.uk": ["westborough", "eastvale", "northmoor"],
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
