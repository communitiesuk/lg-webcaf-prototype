// app/routes/registration.js
//
// Claim v15, CAF Lead nomination (pass 2, 24 November 2026). Figma "03 Claim your council · v15",
// row "Naming the CAF Lead": 31, 31e, 37, 32, 32e, 33, 34, 35, 36. The registration state model is in
// app/data/helpers/registration.js; screens are worked out from it.
//
// guard(): until a CAF Lead is in place, the person who registered (and anyone signed in as the CAF
// Lead of a council without one) gets the holding page for the registration's state, never the
// dashboard, Setup, People, Decide, assessments or join requests. It only applies when a registration
// exists, so the example council and the Setup research scenarios are unchanged.

const reg = require("../data/helpers/registration");
const acting = require("../data/helpers/acting-as");
const { sendEmail } = require("../data/helpers/notify");
const { ensureClaim, applyClaimGrantedChrome } = require("../data/helpers/claim");

const COUNCIL_PATHS = [
  /^\/dashboard/,
  /^\/setup/,
  /^\/access(?!\/(named-caf-lead|not-caf-lead))/,
  /^\/decide/,
  /^\/your-assessments/,
  /^\/assurance-activities/,
  /^\/readiness/,
  /^\/self-assessment/,
  /^\/claim\/requests-to-join/,
  /^\/claim\/review-request/,
];

function clean(value) {
  return (value || "").toString().trim();
}

function guard(req, res, next) {
  const data = req.session && req.session.data;
  const r = reg.getRegistration(data);
  if (!r || !COUNCIL_PATHS.some((re) => re.test(req.path))) return next();
  const key = acting.actingAs(data).key;
  if (key === "claimant" || key === "caf-lead") {
    if (reg.leadInPlace(r)) {
      // The claimant who chose "Me" is the CAF Lead; the claimant of a nominee who accepted is not.
      if (key === "claimant" && r.state === "lead_is_claimant") acting.signInAs(data, "caf-lead");
      if (key === "caf-lead" || r.state === "lead_is_claimant") return next();
    }
    return res.redirect(reg.claimantLanding(r));
  }
  if (key === "joiner") return res.redirect(reg.leadInPlace(r) ? "/claim/request-sent" : "/claim/request-sent-no-caflead");
  if (key === "nominee") {
    if (r.state === "lead_confirmed") {
      acting.signInAs(data, "caf-lead");
      return next();
    }
    return res.redirect(r.state === "invitation_sent" ? "/access/named-caf-lead" : "/claim/invitation-cancelled");
  }
  return next();
}

// The claimant's names for the email personalisation and the holding pages.
function names(r) {
  const n = r.nominee || {};
  return {
    claimant_name: (r.claimant && r.claimant.name) || "",
    nominee_name: n.name || "",
  };
}

function firstName(name) {
  return (name || "").split(" ")[0];
}

// Send N09 to the nominee (the invitation).
function sendInvitation(data, r) {
  r.nominee.invitedOn = require("../data/helpers/notify").todayLabel();
  sendEmail(data, "N09", { name: r.nominee.name, key: "nominee" }, names(r));
}

// 31 and 36 lead here; 07 Continue too.
function needsRegistration(req, res, states) {
  const r = reg.getRegistration(req.session.data);
  if (!r) {
    res.redirect("/claim");
    return null;
  }
  if (states && states.indexOf(r.state) === -1) {
    res.redirect(reg.claimantLanding(r));
    return null;
  }
  return r;
}

function renderWho(res, r, opts) {
  const error = opts && opts.error;
  res.render("pages/claim/who-is-caf-lead", {
    pageTitle: (error ? "Error: " : "") + "Who is your council’s CAF Lead?",
    backHref: "/claim/access-granted",
    answer: (opts && opts.answer) || "",
    error,
  });
}

function renderInvite(res, r, opts) {
  const errors = (opts && opts.errors) || [];
  res.render("pages/claim/invite-caf-lead", {
    pageTitle: (errors.length ? "Error: " : "") + "Who should we invite to be your CAF Lead?",
    backHref: "/claim/caf-lead",
    values: (opts && opts.values) || {},
    errors,
    errorById: Object.fromEntries(errors.map((e) => [e.id, e.text])),
  });
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function routes(router) {
  // 31 Who is your council's CAF Lead? (31e error)
  router.get("/claim/caf-lead", (req, res) => {
    const r = needsRegistration(req, res, ["approved_no_lead", "nominee_declined"]);
    if (!r) return;
    renderWho(res, r, {});
  });

  router.post("/claim/caf-lead", (req, res) => {
    const r = needsRegistration(req, res, ["approved_no_lead", "nominee_declined"]);
    if (!r) return;
    const answer = clean(req.session.data.cafLeadWho);
    delete req.session.data.cafLeadWho;
    if (answer !== "me" && answer !== "someone-else") {
      return renderWho(res, r, { error: "Select your council’s CAF Lead" });
    }
    if (answer === "someone-else") return res.redirect("/claim/caf-lead/invite");
    return becomeLead(req, res, r);
  });

  // 37 You are your council's CAF Lead
  router.get("/claim/caf-lead/you", (req, res) => {
    const data = req.session.data;
    const r = reg.getRegistration(data);
    if (!r || r.state !== "lead_is_claimant") return res.redirect(r ? reg.claimantLanding(r) : "/claim");
    acting.signInAs(data, "caf-lead");
    applyClaimGrantedChrome(req, res, { fullName: r.claimant.name }, r.council.name);
    res.render("pages/claim/you-are-caf-lead", {
      pageTitle: "You are your council’s CAF Lead",
      waiting: reg.waitingRequests(r).length,
    });
  });

  // 32 Who should we invite to be your CAF Lead? (32e error)
  router.get("/claim/caf-lead/invite", (req, res) => {
    const r = needsRegistration(req, res, ["approved_no_lead", "nominee_declined"]);
    if (!r) return;
    renderInvite(res, r, {});
  });

  router.post("/claim/caf-lead/invite", (req, res) => {
    const data = req.session.data;
    const r = needsRegistration(req, res, ["approved_no_lead", "nominee_declined"]);
    if (!r) return;
    const values = { name: clean(data.nomineeName), email: clean(data.nomineeEmail) };
    delete data.nomineeName;
    delete data.nomineeEmail;
    const errors = [];
    if (!values.name) errors.push({ id: "nomineeName", text: "Enter your CAF Lead’s full name" });
    if (!values.email) errors.push({ id: "nomineeEmail", text: "Enter your CAF Lead’s email address" });
    else if (!EMAIL_FORMAT.test(values.email)) errors.push({ id: "nomineeEmail", text: "Enter an email address in the correct format, such as name@example.gov.uk" });
    if (errors.length) return renderInvite(res, r, { values, errors });
    // Their own email address: treat it as "Me" (32 panel).
    if (reg.sameEmail(values.email, r.claimant.email)) return becomeLead(req, res, r);
    const sameDomain = reg.emailDomainMatchesCouncil(values.email, r.council.id);
    r.nominee = { name: values.name, email: values.email, sameDomain };
    if (sameDomain) {
      r.state = "invitation_sent";
      sendInvitation(data, r);
      return res.redirect("/claim/caf-lead/invitation-sent");
    }
    r.state = "invitation_held";
    return res.redirect("/claim/caf-lead/check");
  });

  // 33 Invitation sent
  router.get("/claim/caf-lead/invitation-sent", (req, res) => {
    const r = needsRegistration(req, res, ["invitation_sent"]);
    if (!r) return;
    res.render("pages/claim/invitation-sent", {
      pageTitle: "Invitation sent",
      nominee: r.nominee,
      nomineeFirst: firstName(r.nominee.name),
    });
  });

  // 34 We need to check this invitation (held; no email until the check passes)
  router.get("/claim/caf-lead/check", (req, res) => {
    const r = needsRegistration(req, res, ["invitation_held"]);
    if (!r) return;
    res.render("pages/claim/invitation-held", {
      pageTitle: "We need to check this invitation",
      nominee: r.nominee,
      councilName: r.council.name,
    });
  });

  // Research only: MHCLG's check on a different-domain nominee passes → invitation_sent, N09, 33.
  router.get("/claim/caf-lead/check/passed", (req, res) => {
    const data = req.session.data;
    const r = reg.getRegistration(data);
    if (!require("./research").researchOn(data) || !r || r.state !== "invitation_held") return res.redirect(r ? reg.claimantLanding(r) : "/claim");
    r.state = "invitation_sent";
    sendInvitation(data, r);
    return res.redirect("/claim/caf-lead/invitation-sent");
  });

  // 35 Your CAF Lead has not accepted yet (and, after they accept, says so; the claimant still has no access)
  router.get("/claim/caf-lead/waiting", (req, res) => {
    const r = needsRegistration(req, res, ["invitation_sent", "lead_confirmed"]);
    if (!r) return;
    const research = req.session.data.research || {};
    res.render("pages/claim/waiting-for-caf-lead", {
      pageTitle: r.state === "lead_confirmed" ? "Your CAF Lead has accepted" : "Your CAF Lead has not accepted yet",
      accepted: r.state === "lead_confirmed",
      nominee: r.nominee,
      // Q26 proposal: behind a switch on the Round 3 research page, so it can be turned off.
      canRename: r.state === "invitation_sent" && research.allowRename !== false,
    });
  });

  // 35 "Name someone else instead" (proposal, Q26): cancels the invitation and returns to 32.
  router.get("/claim/caf-lead/name-someone-else", (req, res) => {
    const r = reg.getRegistration(req.session.data);
    const research = req.session.data.research || {};
    if (!r || r.state !== "invitation_sent" || research.allowRename === false) return res.redirect(r ? reg.claimantLanding(r) : "/claim");
    r.cancelledNominees = (r.cancelledNominees || []).concat([r.nominee]);
    r.nominee = null;
    r.state = "approved_no_lead";
    return res.redirect("/claim/caf-lead/invite");
  });

  // 36 Your nominee is not the CAF Lead
  router.get("/claim/caf-lead/declined", (req, res) => {
    const r = needsRegistration(req, res, ["nominee_declined"]);
    if (!r) return;
    const n = r.declinedNominee || {};
    res.render("pages/claim/nominee-declined", {
      pageTitle: (n.name || "Your nominee") + " is not your council’s CAF Lead",
      nominee: n,
      nomineeFirst: firstName(n.name),
      councilName: r.council.name,
    });
  });

  // ADDITION (not in Figma): an invitation that was cancelled, opened by the person it was sent to.
  router.get("/claim/invitation-cancelled", (req, res) => {
    const r = reg.getRegistration(req.session.data) || {};
    const declined = (req.query.declined || "") === "1" && r.state === "nominee_declined";
    res.render("pages/claim/invitation-cancelled", {
      pageTitle: declined ? "You are not the CAF Lead for " + ((r.council && r.council.name) || "your council") : "This invitation is no longer valid",
      declined,
      claimantName: (r.claimant && r.claimant.name) || "the person who registered your council",
      councilName: (r.council && r.council.name) || "your council",
    });
  });
}

// 31 "Me", or 32 with their own email address: the claimant becomes CAF Lead and the council record exists.
function becomeLead(req, res, r) {
  const data = req.session.data;
  r.state = "lead_is_claimant";
  r.nominee = null;
  const claim = ensureClaim(data);
  claim.council = Object.assign({}, r.council);
  claim.person = { fullName: r.claimant.name, jobTitle: r.claimant.jobTitle };
  reg.createCouncilRecord(data, r.claimant);
  acting.signInAs(data, "caf-lead");
  return res.redirect("/claim/caf-lead/you");
}

module.exports = routes;
module.exports.guard = guard;
module.exports.names = names;
