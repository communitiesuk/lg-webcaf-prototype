// app/routes/internal-access.js
//
// Prototype stand-in for GOV.UK Internal Access (IA1 enter email, IA2 enter one-time code,
// IA3 continue when already signed in). Internal Access replaced GOV.UK One Login; it ONLY
// authenticates. After sign-in, WebCAF decides where the person lands from its own user state.
//
// None of this is real authentication: any email and any code are accepted. The landing page is
// driven by a prototype "sign-in scenario" chosen on /beta/reset and stored in session, so the
// different post-sign-in journeys can be shown in research. Routing is a proposal, not agreed.
// Changed in build, prototype, pending design sign-off.

const { ensureClaim } = require("../data/helpers/claim");
const { EXAMPLE_EMAILS } = require("../data/claim-example-data");

function clean(value) {
  return (value || "").toString().trim();
}

const WESTBOROUGH = { id: "westborough", name: "Westborough Borough Council" };

// 27 Oct: Internal Access only lets people on a configured council domain through. For the
// prototype, westborough.gov.uk is the only configured domain; anyone else is stopped here and
// never reaches WebCAF (this replaces our old unrecognised-email path). Changed in build,
// prototype, pending design sign-off.
const CONFIGURED_DOMAINS = ["westborough.gov.uk"];

function domainOf(email) {
  const at = clean(email).indexOf("@");
  return at === -1 ? "" : clean(email).slice(at + 1).toLowerCase();
}

function isConfiguredDomain(email) {
  return CONFIGURED_DOMAINS.indexOf(domainOf(email)) !== -1;
}

// Sign-in scenarios set on the /beta/reset picker. Each seeds the Claim state that WebCAF reads
// to choose the landing page. The persona email is deliberate: it sets who the signed-in person
// is for the rest of the journey. Proposal, not agreed.
const SIGN_IN_SCENARIOS = {
  invited: {
    oneLoginEmail: "s.okoro@westborough.gov.uk",
    invitationPending: true,
  },
  "has-access": {
    oneLoginEmail: EXAMPLE_EMAILS.recognised,
    hasMembership: true,
    council: WESTBOROUGH,
    person: { fullName: "Jo Hart" },
    councilCount: 1,
  },
  "new-user": {
    oneLoginEmail: EXAMPLE_EMAILS.recognised, // fallback only — the typed email is kept (see below)
    arrival: "independent",
    treatAsRecognised: true, // so the email the person typed flows the recognised claim path
  },
  // Unhappy paths (research walkthroughs). Each lands in an unhappy outcome during the claim.
  "already-claimed": {
    oneLoginEmail: EXAMPLE_EMAILS.recognised,
    arrival: "independent",
    treatAsRecognised: true,
    flagCouncilHasUsers: true, // council already in use → "Send request" (05) → request sent (20)
    existingUserCount: 5,
  },
  "already-have-access": {
    oneLoginEmail: EXAMPLE_EMAILS.recognised,
    arrival: "independent",
    treatAsRecognised: true,
    flagAlreadyHasAccess: true, // find → "You already have access" (17)
    existingUserCount: 5,
    registeredDate: "14 August 2026",
  },
  "not-recognised": {
    oneLoginEmail: EXAMPLE_EMAILS.unrecognised,
    arrival: "independent",
    forceUnrecognised: true, // your details → "How are you connected?" (08), whatever email is typed
  },
  "claim-pending": {
    oneLoginEmail: EXAMPLE_EMAILS.recognised,
    status: "pending",
    council: WESTBOROUGH,
    person: { fullName: "Jo Hart" },
  },
  "claim-rejected": {
    oneLoginEmail: EXAMPLE_EMAILS.recognised,
    status: "not-approved",
    council: WESTBOROUGH,
    person: { fullName: "Jo Hart" },
  },
  "council-being-checked": {
    oneLoginEmail: EXAMPLE_EMAILS.recognised,
    arrival: "independent",
    councilBeingChecked: true, // find-your-council leads to 22 "You cannot join yet" (Stage 3)
  },
};

// Where WebCAF sends the person after Internal Access, decided from its own user state.
// Priority order (proposal): a pending invitation wins over a membership, then claim status,
// then Claim 02 "Find your council" for everyone else.
function landingForClaim(claim) {
  if (!claim) return "/claim";
  if (claim.invitationPending) return "/access/accept/confirm-name"; // A13, then their task
  if (claim.hasMembership) return claim.councilCount > 1 ? "/choose-council" : "/dashboard"; // R10 or dashboard
  if (claim.status === "pending") return "/claim/pending"; // 06 We are checking your claim
  if (claim.status === "not-approved") return "/claim/not-approved"; // 16 Your claim was not approved
  return "/claim"; // → 02 Find your council
}

// Apply the chosen sign-in scenario's seed onto the (already signed-in) Claim state, keeping the
// email the person actually typed into Internal Access (the scenario email is only a fallback).
function applySignInScenario(sessionData) {
  const claim = ensureClaim(sessionData);
  const seed = SIGN_IN_SCENARIOS[clean(sessionData.signInScenario)];
  if (!seed) return claim;
  const typedEmail = claim.oneLoginEmail; // set by IA2 from the email the person typed
  Object.assign(claim, seed);
  if (typedEmail) claim.oneLoginEmail = typedEmail; // use what they typed, not the persona default
  return claim;
}

module.exports = function (router) {
  // IA1 — enter your email address.
  router.get("/internal-access", (req, res) => res.redirect("/internal-access/email"));

  router.get("/internal-access/email", (req, res) => {
    res.render("pages/internal-access/email", {
      pageTitle: "Enter your email address",
      iaEmail: clean(req.session.data.iaEmail),
    });
  });

  router.post("/internal-access/email", (req, res) => {
    const email = clean(req.session.data.iaEmail);
    req.session.data.iaEmail = email;
    // A non-empty email on a domain that is not configured is stopped by Internal Access.
    // An empty email falls through (so the reset-picker scenarios still work without typing).
    if (email && !isConfiguredDomain(email)) return res.redirect("/internal-access/no-access");
    return res.redirect("/internal-access/code");
  });

  // You do not have access — email is not on a configured council domain.
  router.get("/internal-access/no-access", (req, res) => {
    res.render("pages/internal-access/no-access", { pageTitle: "You do not have access" });
  });

  // IA2 — enter your one-time code. Any code is accepted; this is where WebCAF treats the
  // person as signed in, then routes them from its own user state.
  router.get("/internal-access/code", (req, res) => {
    res.render("pages/internal-access/code", {
      pageTitle: "Enter your one-time code",
      iaEmail: clean(req.session.data.iaEmail),
    });
  });

  router.post("/internal-access/code", (req, res) => {
    const claim = ensureClaim(req.session.data);
    claim.oneLoginEmail = clean(req.session.data.iaEmail); // the email the person typed (may be empty)
    delete req.session.data.iaCode;
    applySignInScenario(req.session.data); // scenario flags; keeps the typed email
    if (!claim.oneLoginEmail) claim.oneLoginEmail = EXAMPLE_EMAILS.recognised; // fallback if none typed
    return res.redirect(landingForClaim(req.session.data.claim));
  });

  // IA3 — continue to LG Web CAF. Only shown when already signed in to Internal Access.
  router.get("/internal-access/continue", (req, res) => {
    const claim = ensureClaim(req.session.data);
    if (!claim.oneLoginEmail) return res.redirect("/internal-access/email");
    res.render("pages/internal-access/continue", { pageTitle: "Continue to LG Web CAF" });
  });

  router.post("/internal-access/continue", (req, res) => {
    applySignInScenario(req.session.data);
    return res.redirect(landingForClaim(req.session.data.claim));
  });

  // Prototype-only: sign out of Internal Access and start again at IA1.
  router.get("/internal-access/sign-out", (req, res) => {
    if (req.session.data && req.session.data.claim) delete req.session.data.claim.oneLoginEmail;
    delete req.session.data.iaEmail;
    return res.redirect("/internal-access/email");
  });
};

module.exports.SIGN_IN_SCENARIOS = SIGN_IN_SCENARIOS;
module.exports.landingForClaim = landingForClaim;
