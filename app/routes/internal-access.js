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
const { canSignIn, matchCouncilByDomain } = require("../data/claim-example-data");

function clean(value) {
  return (value || "").toString().trim();
}

// User-driven: Internal Access accepts whatever work email the person types, as long as it resolves
// to a council (canSignIn). Personal addresses (gmail etc.) and domains that match no council are
// stopped here and never reach WebCAF. Nothing is pre-filled. Changed in build, prototype, pending
// design sign-off.

// Sign-in scenarios set on the /beta/reset picker. Each seeds the Claim state that WebCAF reads
// to choose the landing page. The persona email is deliberate: it sets who the signed-in person
// is for the rest of the journey. Proposal, not agreed.
// User-driven: scenarios carry ONLY the routing/state flags that choose which journey to show.
// The email and the council come from what the participant types — no persona data is seeded here.
const SIGN_IN_SCENARIOS = {
  invited: { invitationPending: true },
  "has-access": { hasMembership: true, councilCount: 1 },
  "new-user": { arrival: "independent", treatAsRecognised: true },
  // Unhappy paths (research walkthroughs). Each flag steers the claim branch.
  "already-claimed": { arrival: "independent", treatAsRecognised: true, flagCouncilHasUsers: true, councilHasCafLead: true, existingUserCount: 5 },
  "joining-no-caflead": { arrival: "independent", treatAsRecognised: true, flagCouncilHasUsers: true, councilHasCafLead: false, existingUserCount: 5 },
  "shared-service": { arrival: "independent", treatAsRecognised: true },
  "already-have-access": { arrival: "independent", treatAsRecognised: true, flagAlreadyHasAccess: true, existingUserCount: 5, registeredDate: "14 August 2026" },
  "not-recognised": { arrival: "independent", forceUnrecognised: true },
  "claim-pending": { status: "pending" },
  "claim-rejected": { status: "not-approved" },
  "council-being-checked": { arrival: "independent", councilBeingChecked: true },
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
  if (seed) Object.assign(claim, seed); // routing flags only — no email/council/person seeded
  // The council comes from the email the person typed (user-driven), not a hardcoded one.
  if (!claim.council && claim.oneLoginEmail) {
    const c = matchCouncilByDomain(claim.oneLoginEmail);
    if (c) claim.council = { id: c.id, name: c.name };
  }
  return claim;
}

module.exports = function (router) {
  // IA1 — enter your email address.
  router.get("/internal-access", (req, res) => res.redirect("/internal-access/email"));

  router.get("/internal-access/email", (req, res) => {
    res.render("pages/internal-access/email", {
      pageTitle: "Enter your email address",
      iaEmail: clean(req.session.data.iaEmail),
      error: null,
    });
  });

  router.post("/internal-access/email", (req, res) => {
    const email = clean(req.session.data.iaEmail);
    req.session.data.iaEmail = email;
    // Required field (user-driven — nothing pre-filled).
    if (!email) {
      return res.render("pages/internal-access/email", {
        pageTitle: "Error: Enter your email address",
        iaEmail: "",
        error: "Enter your email address",
      });
    }
    // Personal addresses and domains that match no council are stopped by Internal Access.
    if (!canSignIn(email)) return res.redirect("/internal-access/no-access");
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
    claim.oneLoginEmail = clean(req.session.data.iaEmail); // the email the person typed
    if (!claim.oneLoginEmail) return res.redirect("/internal-access/email"); // nothing typed
    delete req.session.data.iaCode;
    applySignInScenario(req.session.data); // routing flags + council from the typed email
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
