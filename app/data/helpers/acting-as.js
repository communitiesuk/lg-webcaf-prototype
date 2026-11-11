// app/data/helpers/acting-as.js
//
// Who is signed in, for the round 2 research build (beta-2). RESEARCH HARNESS, not service logic.
//
// The prototype holds one council per session (the participant's own, or the example council).
// A facilitator can switch who is signed in (Research only switcher, on N00 and /beta) so one
// browser can play the CAF Lead, the council's assurer, its Approver, a replaced Approver, or a
// collaborator from another council (to see A36). Stored in session as
//   actingAs = { key: "caf-lead" | "assurer" | "approver" | "previous-approver" | "other-council",
//                signedOut: Boolean }
// The email-link resolver (/go/:id) uses this to apply the A36 / R04e order of checks.

// A second council that exists only as a name, so A36 ("no role at that council") and AL30
// ("Your councils") have something to show. Clearly labelled example data.
const OTHER_COUNCIL = { id: "example-other-council", name: "Northmoor Borough Council (example)" };

function lazyCouncilName(sessionData) {
  // Required lazily: readiness.js requires the Decide helpers, which would make a cycle.
  return require("./readiness").councilNameFor(sessionData);
}

// The council this session holds, as { id, name }.
function currentCouncil(sessionData) {
  const claimCouncil = (sessionData.claim && sessionData.claim.council) || {};
  const setup = sessionData.setup || {};
  const id = claimCouncil.id || (setup.exampleCouncil ? "example-council" : "your-council");
  return { id, name: lazyCouncilName(sessionData) };
}

const PERSONA_KEYS = ["caf-lead", "assurer", "approver", "previous-approver", "other-council"];

// The person behind each key, built from the session's own data (never fixed names, apart from the
// labelled example collaborator from another council).
function persona(sessionData, key) {
  const setup = sessionData.setup || {};
  const people = setup.people || {};
  const council = currentCouncil(sessionData);
  const plan = (sessionData.decide && sessionData.decide.plan) || {};
  const claimPerson = (sessionData.claim && sessionData.claim.person) || {};
  switch (key) {
    case "assurer": {
      const a = setup.assurer || {};
      return {
        key,
        role: "assurer",
        roleLabel: "assurer",
        name: a.name || "",
        organisation: a.organisation || "",
        available: Boolean(a.assigned && a.name),
        councilIds: [council.id, OTHER_COUNCIL.id],
        homeHref: "/decide/assurer/councils",
      };
    }
    case "approver": {
      const a = people.approver || {};
      return {
        key,
        role: "approver",
        roleLabel: "Approver",
        name: a.name || "",
        // Only an Approver with an account can sign in (Setup task 7 / People › Approver).
        available: Boolean(a.name && a.hasAccount),
        councilIds: [council.id],
        homeHref: "/dashboard",
      };
    }
    case "previous-approver":
      return {
        key,
        role: "previous-approver",
        roleLabel: "previous Approver",
        name: plan.previousApprover || "",
        available: Boolean(plan.previousApprover),
        councilIds: [], // no role at the council any more
        homeHref: "/get-started",
      };
    case "other-council":
      return {
        key,
        role: "collaborator",
        roleLabel: "Collaborator, " + OTHER_COUNCIL.name,
        name: "Example collaborator",
        orgName: OTHER_COUNCIL.name,
        available: true,
        councilIds: [OTHER_COUNCIL.id],
        homeHref: "/dashboard/not-in-this-prototype",
      };
    default:
      return {
        key: "caf-lead",
        role: "caf-lead",
        roleLabel: "CAF Lead",
        name: (people.cafLead && people.cafLead.name) || claimPerson.fullName || "",
        available: true,
        councilIds: [council.id],
        homeHref: "/dashboard",
      };
  }
}

function actingAs(sessionData) {
  if (!sessionData.actingAs || PERSONA_KEYS.indexOf(sessionData.actingAs.key) === -1) {
    sessionData.actingAs = { key: "caf-lead", signedOut: false };
  }
  return sessionData.actingAs;
}

function currentPersona(sessionData) {
  return persona(sessionData, actingAs(sessionData).key);
}

function isSignedOut(sessionData) {
  return Boolean(actingAs(sessionData).signedOut);
}

function signInAs(sessionData, key) {
  sessionData.actingAs = { key: PERSONA_KEYS.indexOf(key) === -1 ? "caf-lead" : key, signedOut: false };
}

function signOutKeepingData(sessionData) {
  actingAs(sessionData).signedOut = true;
}

// Switcher rows for the Research only switcher.
function switcherOptions(sessionData) {
  const current = actingAs(sessionData);
  return PERSONA_KEYS.map((key) => {
    const p = persona(sessionData, key);
    return {
      key,
      label: (p.name ? p.name + ", " : "") + p.roleLabel,
      available: p.available,
      current: !current.signedOut && current.key === key,
    };
  });
}

module.exports = {
  OTHER_COUNCIL,
  PERSONA_KEYS,
  currentCouncil,
  persona,
  actingAs,
  currentPersona,
  isSignedOut,
  signInAs,
  signOutKeepingData,
  switcherOptions,
};
