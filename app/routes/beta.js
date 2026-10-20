// app/routes/beta.js
// Beta prototype index — a demo launcher for the Beta journeys only (Setup + Decide).
// Each scene link re-seeds the canonical example data, then jumps to that screen, so a
// scene always looks right regardless of what was clicked before.

const { ensureDecide } = require("../data/helpers/decide");
const { buildSetupSeedEmpty, buildDecideSeedEmpty } = require("../data/seed/setup");

// Sign-in scenarios for the /beta/reset picker. Each key matches a scenario in
// routes/internal-access.js, which seeds the WebCAF user state so the person lands on the right
// screen after Internal Access. Proposal, not agreed.
// Changed in build, prototype, pending design sign-off.
const SIGN_IN_SCENARIOS = [
  { key: "invited", label: "Invited to a council", detail: "A person with a pending invitation. Lands on their task: A13 Confirm your name, then the outcomes assigned to them." },
  { key: "has-access", label: "Already has access", detail: "A member of a council. Lands on the dashboard, or R10 Choose a council if they belong to more than one." },
  { key: "new-user", label: "New user, no council yet", detail: "Lands on Claim your council: 02 Find your council." },
  { key: "claim-pending", label: "Registration being checked", detail: "Their own registration is waiting for MHCLG approval. Lands on 06 We are checking your registration." },
  { key: "claim-rejected", label: "Registration not approved", detail: "A previous registration was rejected. Lands on 16 Registration not approved." },
  { key: "council-being-checked", label: "Council being checked", detail: "Searches for a council whose first claim is still awaiting MHCLG approval. Leads to 22 You cannot join yet." },
];

// Scene key -> the screen it opens. Grouped by journey/role for the index page.
const SCENES = {
  // Set up your council
  "setup-start": "/setup/task-list",
  "setup-complete": "/setup/complete",
  // Decide what to assess — CAF Lead (council)
  "decide-start": "/decide",
  "decide-systems": "/decide/systems",
  "decide-review": "/decide/review",
  "decide-sent": "/decide/sent",
  "decide-approved": "/decide/approved",
  // Decide — Assurer
  "decide-assurer": "/decide/assurer-review",
  // Decide — Approver
  "decide-approve": "/decide/approve",
};

// The index, in journey order (Claim then Set up then Decide). Each section has one or more
// groups; a group shares a route `base` and an optional `subtitle` (used for the Decide roles).
// Links are kept short and self-describing to keep the page scannable.
const SECTIONS = [
  {
    title: "Get started",
    description: "The pre-sign-in pages: service start, cookies, help, feedback, errors and sign-out.",
    groups: [
      {
        base: "",
        links: [
          { key: "/get-started", label: "Service start page" },
          { key: "/internal-access", label: "Sign in (Internal Access stand-in)" },
          { key: "/cookies", label: "Cookie settings" },
          { key: "/support", label: "Get help with the CAF" },
          { key: "/feedback", label: "Give feedback" },
          { key: "/service-unavailable", label: "Service unavailable" },
          { key: "/get-started/session-expired", label: "Signed out after inactivity" },
          { key: "/get-started/signed-out", label: "Signed out (chose to)" },
          { key: "/this-page-does-not-exist", label: "Page not found (404)" },
          { key: "/prototype/emails/invitation", label: "Invitation email (preview)" },
        ],
      },
    ],
  },
  {
    title: "Claim your council",
    description: "Getting access to a council after signing in with Internal Access.",
    groups: [
      {
        base: "/prototype-scenarios/",
        links: [
          { key: "first-to-join", label: "First to join a council" },
          { key: "joining-others", label: "Join a council already in use" },
          { key: "unrecognised", label: "Email not recognised" },
          { key: "domain-matches-many", label: "Email matches more than one council" },
          { key: "already-have-access", label: "You already have access" },
        ],
      },
      {
        subtitle: "New in v6 (workshop proposal)",
        base: "",
        links: [
          { key: "/claim/request-sent", label: "Your request has been sent (20)" },
          { key: "/claim/review-request", label: "Review a request to join, as the CAF Lead (21)" },
          { key: "/claim/cannot-join", label: "You cannot join yet — council being checked (22)" },
        ],
      },
    ],
  },
  {
    title: "Readiness and dashboard",
    description: "The optional readiness check, and the dashboard that is home once a council is registered.",
    groups: [
      {
        base: "",
        links: [
          { key: "/readiness/reset", label: "Readiness check (R01)" },
          { key: "/readiness/answers", label: "Your readiness answers (R02)" },
          { key: "/dashboard", label: "Dashboard (R03, with a state switcher for R04/R05/R09/R06)" },
          { key: "/dashboard/previous-results", label: "Previous CAF results (R07)" },
          { key: "/dashboard/how-long", label: "How long the CAF takes (R08)" },
          { key: "/choose-council", label: "Choose a council (R10)" },
          { key: "/assurance-activities", label: "Assurance activities (AA02)" },
          { key: "/assurance-activities/book/workshop-A", label: "Before you book — workshop (AA03)" },
          { key: "/assurance-activities/update/pre-call", label: "Update an activity (AA04)" },
          { key: "/assurance-activities/mark-ready/workshop-A", label: "Mark information as ready (AA08)" },
          { key: "/assurance-activities/onboarding?demo=1", label: "Book onboarding calls (AA05)" },
          { key: "/assurance-activities/pre-call?demo=1", label: "Book pre self-assessment call (AA06)" },
          { key: "/assurance-activities/bookings-external", label: "Microsoft Bookings (external stand-in)" },
        ],
      },
    ],
  },
  {
    title: "Access management",
    description: "Who has access, inviting people, and changing or removing access.",
    groups: [
      {
        base: "",
        links: [
          { key: "/access", label: "People and governance (A01)" },
          { key: "/access/audit-trail", label: "Audit trail (A02)" },
          { key: "/access/review", label: "Periodic access review (A03)" },
          { key: "/access/caf-lead", label: "Who is your CAF Lead (A22)" },
          { key: "/access/named-caf-lead", label: "You have been named CAF Lead (A24)" },
          { key: "/access/approver", label: "Who is your Approver (A29)" },
          { key: "/access/invite", label: "Invite someone (A05)" },
          { key: "/access/invitations", label: "Pending invitations (A10)" },
          { key: "/access/approver-details", label: "Approver details (A27)" },
          { key: "/access/invite/email-preview", label: "Invitation email (A11, preview)" },
          { key: "/access/accept", label: "Accept an invitation (A12/A13)" },
          { key: "/access/people/priya-shah/change", label: "Change access (A14)" },
          { key: "/access/people/jo-hart/remove", label: "Remove your own access (A21 / A16)" },
        ],
      },
    ],
  },
  {
    title: "Set up your council",
    description: "Services, shared infrastructure and critical systems.",
    groups: [
      {
        base: "/beta/go/",
        links: [
          { key: "setup-start", label: "Open the populated setup" },
          { key: "setup-complete", label: "Setup complete" },
        ],
      },
      {
        base: "/beta/empty-setup/",
        links: [{ key: "setup-start", label: "Set up from scratch (empty)" }],
      },
    ],
  },
  {
    title: "Decide what to assess",
    description: "Choose and approve what to assess this cycle.",
    groups: [
      {
        subtitle: "CAF Lead",
        base: "/beta/go/",
        links: [
          { key: "decide-start", label: "Start a cycle" },
          { key: "decide-systems", label: "Choose critical systems" },
          { key: "decide-review", label: "Review and send to assurer" },
          { key: "decide-sent", label: "Book onboarding calls" },
          { key: "decide-approved", label: "Cycle approved" },
        ],
      },
      {
        subtitle: "CAF Lead (nothing pre-selected)",
        base: "/beta/empty/",
        links: [
          { key: "decide-start", label: "Start a cycle" },
          { key: "decide-systems", label: "Choose critical systems" },
        ],
      },
      {
        subtitle: "Assurer",
        base: "/beta/go/",
        links: [{ key: "decide-assurer", label: "Review setup and plan" }],
      },
      {
        subtitle: "Approver",
        base: "/beta/go/",
        links: [{ key: "decide-approve", label: "Approve the plan" }],
      },
    ],
  },
];

// Delete any accumulated state and re-seed the canonical Setup + Decide example data.
function reseed(req) {
  if (!req.session.data) req.session.data = {};
  delete req.session.data.setup;
  delete req.session.data.decide;
  ensureDecide(req.session.data);
}

// Re-seed for Start empty (Decide) mode: keep the populated Setup inventory (so there are
// systems to choose from) but make no cycle choices and clear every system's CNI flag, so
// the user declares CNI and chooses what to assess themselves.
function reseedEmpty(req) {
  reseed(req);
  req.session.data.decide = buildDecideSeedEmpty();
  (req.session.data.setup.criticalSystems || []).forEach((s) => {
    s.cni = false;
  });
}

// Re-seed for Start empty (Setup) mode: empty the whole Setup (no context, methodology,
// services, infrastructure or critical systems), so the council is built from scratch.
function reseedEmptySetup(req) {
  if (!req.session.data) req.session.data = {};
  req.session.data.setup = buildSetupSeedEmpty();
  req.session.data.decide = buildDecideSeedEmpty();
}

module.exports = function (router) {
  router.get("/beta", (req, res) => {
    res.render("pages/beta", {
      pageTitle: "Beta prototype",
      sections: SECTIONS,
      resetSuccess: (req.query.reset || "").toString() === "success",
    });
  });

  // Open a scene: re-seed canonical data, then redirect to the screen.
  router.get("/beta/go/:scene", (req, res) => {
    const target = SCENES[req.params.scene];
    if (!target) return res.redirect("/beta");
    reseed(req);
    return res.redirect(target);
  });

  // Open a scene in Start empty (Decide) mode: populated inventory, no cycle choices.
  router.get("/beta/empty/:scene", (req, res) => {
    const target = SCENES[req.params.scene];
    if (!target) return res.redirect("/beta");
    reseedEmpty(req);
    return res.redirect(target);
  });

  // Open a scene in Start empty (Setup) mode: the whole council built from scratch.
  router.get("/beta/empty-setup/:scene", (req, res) => {
    const target = SCENES[req.params.scene];
    if (!target) return res.redirect("/beta");
    reseedEmptySetup(req);
    return res.redirect(target);
  });

  // Reset page — reset the prototype and choose who you are when you sign in. The scenario sets
  // the WebCAF user state; Internal Access then routes the person from that state.
  router.get("/beta/reset", (req, res) => {
    res.render("pages/beta/reset", {
      pageTitle: "Reset the prototype",
      scenarios: SIGN_IN_SCENARIOS,
      cleared: (req.query.cleared || "").toString() === "1",
    });
  });

  // Start a sign-in scenario: store the chosen scenario, re-seed Setup + Decide so the landing
  // screen renders, clear any prior Claim state, then go through Internal Access.
  router.post("/beta/reset", (req, res) => {
    const key = (req.session.data && req.session.data.signInScenario) || "";
    reseed(req);
    req.session.data.claim = {};
    req.session.data.signInScenario = key.toString();
    delete req.session.data.iaEmail;
    return res.redirect("/internal-access");
  });

  // Clear Setup + Decide + Claim state, then return to the reset page with a confirmation.
  router.get("/beta/reset/clear", (req, res) => {
    if (req.session && req.session.data) {
      delete req.session.data.setup;
      delete req.session.data.decide;
      delete req.session.data.claim;
      delete req.session.data.signInScenario;
      delete req.session.data.iaEmail;
    }
    return res.redirect("/beta/reset?cleared=1");
  });
};
