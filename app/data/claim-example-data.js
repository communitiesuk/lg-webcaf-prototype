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

// Personal email providers — not a council/public-sector address, so Internal Access stops them.
// Changed in build, prototype, pending design sign-off.
const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com", "hotmail.co.uk",
  "outlook.com", "live.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com",
]);
function isPersonalDomain(email) {
  return PERSONAL_DOMAINS.has(domainOf(email));
}

// User-driven council matching: work out the council from whatever email the person types.
// 1) a fictional-demo / shared domain (councilsForEmail), else
// 2) the domain's organisation label matched to a real council name, e.g.
//    jane@leeds.gov.uk -> "Leeds City Council", j@cornwall.gov.uk -> "Cornwall Council".
// Returns a council object, or null when no council can be matched.
// Changed in build, prototype, pending design sign-off.
const NAME_STOPWORDS = new Set([
  "council", "borough", "district", "county", "city", "metropolitan", "london", "of", "the",
  "ca", "combined", "authority", "royal", "and",
]);
function normaliseName(s) {
  return (s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function matchCouncilByDomain(email) {
  const demoIds = councilsForEmail(email);
  if (demoIds.length) return getCouncilById(demoIds[0]);
  const domain = domainOf(email);
  if (!domain) return null;
  const label = domain.split(".")[0].replace(/[^a-z0-9]/g, "");
  if (!label || label.length < 3) return null;
  // Score each council: exact label match (3) beats "name starts with the label" (2) beats
  // "label appears somewhere in the name" (1). Ties break to the shorter name.
  let best = null, bestScore = 0;
  COUNCILS.forEach((c) => {
    if (c.fictionalDemo) return;
    const words = normaliseName(c.name).split(" ").filter((w) => !NAME_STOPWORDS.has(w));
    const joined = words.join("");
    if (!joined) return;
    let score = 0;
    if (joined === label) score = 3;
    else if (words[0] === label || (joined.length >= 4 && joined.indexOf(label) === 0)) score = 2;
    else if (words.indexOf(label) !== -1 || (joined.length >= 4 && label.indexOf(joined) === 0)) score = 1;
    if (score > bestScore || (score === bestScore && score > 0 && c.name.length < best.name.length)) {
      best = c; bestScore = score;
    }
  });
  return best;
}

// Can this email sign in to the service (user-driven)? No if it is a personal address, or if the
// domain does not resolve to a council — those people are stopped by Internal Access.
function canSignIn(email) {
  if (!domainOf(email)) return false;
  if (isPersonalDomain(email)) return false;
  return Boolean(matchCouncilByDomain(email));
}

// A display name derived from the email's local part, for the few user-driven screens reached
// before the person enters their name (e.g. "jane.doe@..." -> "Jane Doe"). Avoids a hardcoded
// persona. Changed in build, prototype, pending design sign-off.
function displayNameFromEmail(email) {
  const local = (email || "").split("@")[0];
  if (!local) return "";
  return local.split(/[._-]+/).filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
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
  matchCouncilByDomain,
  isPersonalDomain,
  canSignIn,
  displayNameFromEmail,
};
