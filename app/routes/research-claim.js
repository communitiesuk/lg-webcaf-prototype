// app/routes/research-claim.js
//
// Research scenarios for Claim v15, CAF Lead nomination (pass 2, 24 November 2026). Each scenario
// clears the session (keeping the research switch), sets the registration and who is signed in, then
// opens the page the note names. Councils and people are EXAMPLE DATA for research.

const reg = require("../data/helpers/registration");
const acting = require("../data/helpers/acting-as");
const { sendEmail, todayLabel } = require("../data/helpers/notify");

const COUNCIL = { id: "westborough", name: "Westborough Borough Council" };
const CLAIMANT = { name: "Sam Rivera", jobTitle: "Head of IT", email: "s.rivera@westborough.gov.uk" };
const NOMINEE = { name: "Alex Moore", email: "a.moore@westborough.gov.uk", sameDomain: true };
const JOINER_EMAIL = "j.hart@westborough.gov.uk";

function clearSession(data) {
  Object.keys(data).forEach((k) => {
    if (k !== "research") delete data[k];
  });
}

// Signed in as the claimant, with a registration in the given state.
function registered(data, state) {
  clearSession(data);
  data.claim = { council: Object.assign({}, COUNCIL), person: { fullName: CLAIMANT.name, jobTitle: CLAIMANT.jobTitle }, oneLoginEmail: CLAIMANT.email, status: "approved" };
  data.registration = {
    state,
    council: Object.assign({}, COUNCIL),
    claimant: Object.assign({}, CLAIMANT),
    registeredOn: todayLabel(),
    nominee: null,
    requests: [],
  };
  acting.signInAs(data, "claimant");
  return data.registration;
}

// The invitation has gone to Alex Moore (N09 sent).
function invited(data) {
  const r = registered(data, "invitation_sent");
  r.nominee = Object.assign({ invitedOn: todayLabel() }, NOMINEE);
  sendEmail(data, "N09", { name: NOMINEE.name, key: "nominee" }, { claimant_name: CLAIMANT.name, nominee_name: NOMINEE.name });
  return r;
}

const CLAIM_SCENARIOS = [
  {
    key: "claimant-is-lead",
    title: "1. The person registering is the CAF Lead",
    note: "Signed in as s.rivera@westborough.gov.uk, nothing registered. Register (00 to 04) → 06. Use “Approve this registration” on 06 → 07 → 31, choose Me → 37 → Set up your council (S01, task 1 Completed).",
    build: (data) => {
      clearSession(data);
      data.claim = { oneLoginEmail: CLAIMANT.email, arrival: "independent" };
    },
    to: "/claim/start",
  },
  {
    key: "invite-colleague",
    title: "2. They invite a colleague as CAF Lead",
    note: "Registered and approved, signed in as Sam Rivera. 07 → 31 Someone else → 32 with a westborough.gov.uk address → 33. Sign out and in again as s.rivera@westborough.gov.uk → 35. On N00 (Emails sent), open N09 as the nominee → A24, which accepts → dashboard. Then open N10 as Sam → 35 says accepted; Sam still has no access.",
    build: (data) => registered(data, "approved_no_lead"),
    to: "/claim/access-granted",
  },
  {
    key: "nominee-declines",
    title: "3. The nominee says they are not the CAF Lead",
    note: "As 2, with the invitation already sent to Alex Moore (35). On N00, open N09 as Alex → A24 → This is not me → A25 → Yes. Open N11 as Sam → 36 → Name your CAF Lead (31) → Me → 37.",
    build: (data) => invited(data),
    to: "/claim/caf-lead/waiting",
  },
  {
    key: "different-domain",
    title: "4. The nominee has a different email domain",
    note: "Registered and approved. 31 Someone else → 32 with a.moore@partnerco.co.uk → 34. Use “MHCLG check passed” (research only) on 34 → 33, and N09 is sent.",
    build: (data) => registered(data, "approved_no_lead"),
    to: "/claim/caf-lead",
  },
  {
    key: "held-request",
    title: "5. A colleague asks to join before there is a CAF Lead",
    note: "Sam Rivera registered and invited Alex Moore, who has not accepted. The participant is a second person (j.hart@westborough.gov.uk): register → 05 → 20b. On N00, open N09 as Alex → A24 shows 1 request waiting → 30 lists it → 21 → approve.",
    build: (data) => {
      invited(data);
      data.claim = { oneLoginEmail: JOINER_EMAIL, arrival: "independent", council: Object.assign({}, COUNCIL), flagCouncilHasUsers: true, councilHasCafLead: false };
      acting.signInAs(data, "joiner");
    },
    to: "/claim/start",
  },
  {
    key: "claimant-early",
    title: "6. The person who registered tries to get in early",
    note: "Invitation sent, not accepted. Signed in as Sam Rivera; this opens the dashboard address directly. Expect 35, never the dashboard. Setup (/setup/task-list), People (/access) and 30 (/claim/requests-to-join) also lead to 35.",
    build: (data) => invited(data),
    to: "/dashboard",
  },
  {
    key: "example-council",
    title: "7. Old model, for comparison",
    note: "The ready-made example council (Westborough Borough Council), untouched. Opens its dashboard.",
    href: "/beta/example?to=/dashboard",
  },
];

module.exports = function (router) {
  router.get("/research/claim/:key", (req, res) => {
    const scenario = CLAIM_SCENARIOS.find((s) => s.key === req.params.key);
    if (!scenario) return res.redirect("/beta/round-3");
    if (scenario.href) return res.redirect(scenario.href);
    scenario.build(req.session.data);
    return res.redirect(scenario.to);
  });

  // Q26 "Name someone else instead" on 35: a proposal, so it can be turned off for a session.
  router.get("/research/claim-switch/rename/:onOff", (req, res) => {
    const data = req.session.data;
    data.research = data.research || { on: true };
    data.research.allowRename = req.params.onOff !== "off";
    return res.redirect("/beta/round-3");
  });
};

module.exports.CLAIM_SCENARIOS = CLAIM_SCENARIOS;
