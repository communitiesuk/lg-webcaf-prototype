// app/routes/claim.js
// "Claim your council" (Claim v3) prototype section.
// Source of truth: Figma file mnOq3QRhTdiliuSuzQoNsX, page 209:2382 (Claim v3).
// Batch 1: prototype scaffolding + 01 confirm, 02 find (+12 error), 13 not-in-list.
// Terminology: user-directed "Claim" not "Register" (see docs/claim-stage1-inventory.md).

const {
  ensureClaim,
  applyClaimChrome,
  applyClaimGrantedChrome,
  getCouncilById,
  getCouncilByName,
  emailMatchesManyCouncils,
  isEmailRecognisedForCouncil,
  councilsForEmail,
  domainOf,
} = require("../data/helpers/claim");
const { COUNCILS, EXAMPLE_EMAILS, ORGANISATIONS } = require("../data/claim-example-data");
// Used by screen 21 to hand an approved "specific outcomes" request to the existing A06 screen.
const { ensureAccess } = require("../data/helpers/access");

function clean(value) {
  return (value || "").toString().trim();
}

// Prototype-only scenarios. Each resets Claim state and seeds the fields that drive the
// journey, then sends the user to the Claim entry. NOT part of the service design.
const SCENARIOS = [
  {
    key: "first-to-join",
    label: "First to join a council (recognised email)",
    detail: "Arrives from an MHCLG link for Westborough Borough Council. Email is recognised, and nobody from the council has claimed it yet.",
    apply: { oneLoginEmail: EXAMPLE_EMAILS.recognised, arrival: "mhclg-link", preselectedCouncilId: "westborough", flagCouncilHasUsers: false, flagAlreadyHasAccess: false },
  },
  {
    key: "joining-others",
    label: "Joining a council that is already active (recognised email)",
    detail: "Finds the service independently. Email is recognised, and other people already use the council record.",
    apply: { oneLoginEmail: EXAMPLE_EMAILS.recognised, arrival: "independent", flagCouncilHasUsers: true, flagAlreadyHasAccess: false, existingUserCount: 5 },
  },
  {
    key: "unrecognised",
    label: "Email not recognised for the council",
    detail: "Finds the service independently. The email domain is not recognised for the chosen council.",
    apply: { oneLoginEmail: EXAMPLE_EMAILS.unrecognised, arrival: "independent", flagCouncilHasUsers: false, flagAlreadyHasAccess: false },
  },
  {
    key: "domain-matches-many",
    label: "Email matches more than one council (open question)",
    detail: "A shared-service email recognised for several councils (frame 19, not yet agreed).",
    apply: { oneLoginEmail: EXAMPLE_EMAILS.sharedService, arrival: "independent", flagCouncilHasUsers: false, flagAlreadyHasAccess: false },
  },
  {
    key: "already-have-access",
    label: "You already have access",
    detail: "Signs in and tries to claim a council you can already access.",
    apply: { oneLoginEmail: EXAMPLE_EMAILS.recognised, arrival: "independent", flagCouncilHasUsers: true, flagAlreadyHasAccess: true, existingUserCount: 5, registeredDate: "14 August 2026" },
  },
];

module.exports = function (router) {
  // Claim chrome (pre-access) for every /claim request. Post-access screens (07/07b/17)
  // override to the granted chrome in their own handlers (later batches).
  router.use((req, res, next) => {
    if (req.path.startsWith("/claim")) {
      ensureClaim(req.session.data);
      applyClaimChrome(req, res);
    }
    next();
  });

  // ----- Prototype-only controls (NOT part of the service design) ---------------------

  // Stand-in for returning from GOV.UK One Login — sets a signed-in email in session.
  router.get("/prototype-sign-in", (req, res) => {
    ensureClaim(req.session.data);
    res.render("pages/prototype/sign-in", {
      pageTitle: "Prototype sign-in",
      emails: EXAMPLE_EMAILS,
      currentEmail: req.session.data.claim.oneLoginEmail || "",
    });
  });

  router.post("/prototype-sign-in", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const email = clean(req.session.data.oneLoginEmailInput) || EXAMPLE_EMAILS.recognised;
    delete req.session.data.oneLoginEmailInput;
    claim.oneLoginEmail = email;
    if (!claim.arrival) claim.arrival = "independent";
    return res.redirect("/claim");
  });

  // Scenario switcher — reset Claim state and jump into a specific research scenario.
  router.get("/prototype-scenarios", (req, res) => {
    res.render("pages/prototype/scenarios", {
      pageTitle: "Prototype scenarios",
      scenarios: SCENARIOS,
    });
  });

  router.post("/prototype-scenarios", (req, res) => {
    const key = clean(req.session.data.scenario);
    delete req.session.data.scenario;
    return startScenario(req, res, key);
  });

  // GET entry for a specific scenario (linkable from the /beta prototype index).
  router.get("/prototype-scenarios/:key", (req, res) => startScenario(req, res, req.params.key));

  // ----- Claim entry ------------------------------------------------------------------

  router.get("/claim", (req, res) => {
    const claim = ensureClaim(req.session.data);
    // Not signed in → Internal Access (replaced the One Login stand-in).
    // Changed in build, prototype, pending design sign-off.
    if (!claim.oneLoginEmail) return res.redirect("/internal-access");
    if (claim.arrival === "mhclg-link" && claim.preselectedCouncilId) {
      return res.redirect("/claim/confirm");
    }
    return res.redirect("/claim/find");
  });

  // ----- 01 confirm-your-council (209:2383) -------------------------------------------
  router.get("/claim/confirm", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const council = getCouncilById(claim.preselectedCouncilId) || getCouncilById("westborough");
    res.render("pages/claim/confirm", {
      pageTitle: "Is " + council.name + " your council?",
      backHref: "/prototype-scenarios",
      council,
      answer: claim.confirmAnswer || "",
      error: null,
    });
  });

  router.post("/claim/confirm", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const council = getCouncilById(claim.preselectedCouncilId) || getCouncilById("westborough");
    const answer = clean(req.session.data.confirmCouncil);
    delete req.session.data.confirmCouncil;

    // Standard GOV.UK required-radio validation (no error frame drawn — added, logged).
    if (answer !== "yes" && answer !== "no") {
      return res.render("pages/claim/confirm", {
        pageTitle: "Error: Is " + council.name + " your council?",
        backHref: "/prototype-scenarios",
        council,
        answer: "",
        error: { field: "confirmCouncil", message: "Select yes if this is your council" },
      });
    }

    claim.confirmAnswer = answer;
    if (answer === "yes") {
      claim.council = { id: council.id, name: council.name };
      return res.redirect("/claim/your-details"); // 03 (Batch 2)
    }
    return res.redirect("/claim/find");
  });

  // ----- 02 find-your-council (209:2421) + 12 error (209:2785) ------------------------
  router.get("/claim/find", (req, res) => {
    const claim = ensureClaim(req.session.data);
    // Pre-fill the picker with the council the signed-in email is recognised for, when there is
    // exactly one. A recognised user searching for their own council would pick it anyway; this
    // guides the "joining a council already in use" journey to the right council (they can change
    // it). Unrecognised / shared-service emails (zero or many matches) are left blank.
    const recognisedCouncils = councilsForEmail(claim.oneLoginEmail);
    const defaultCouncilId = recognisedCouncils.length === 1 ? recognisedCouncils[0] : "";
    renderFind(res, { selectedId: defaultCouncilId, backHref: findBackHref(claim) });
  });

  router.post("/claim/find", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const chosenId = clean(req.session.data.councilId);
    const typed = clean(req.session.data.councilSearchText);
    delete req.session.data.councilId;
    delete req.session.data.councilSearchText;

    const council = getCouncilById(chosenId) || getCouncilByName(typed);
    if (!council) {
      // Frame 12 — typed without choosing from the list.
      return renderFind(res, {
        value: typed,
        backHref: findBackHref(claim),
        error: { field: "councilId", message: "Select a council from the list" },
      });
    }

    claim.council = { id: council.id, name: council.name };
    // v6: searching for a council whose first claim is still awaiting MHCLG approval → 22.
    // Changed in build, prototype, pending design sign-off.
    if (claim.councilBeingChecked) return res.redirect("/claim/cannot-join"); // 22
    if (claim.flagAlreadyHasAccess) return res.redirect("/claim/already-have-access"); // 17 (Batch 5)
    if (emailMatchesManyCouncils(claim.oneLoginEmail)) return res.redirect("/claim/which-council"); // 19 (Batch 5)
    return res.redirect("/claim/your-details"); // 03 (Batch 2)
  });

  // ----- 13 council-not-in-list (209:2816) -------------------------------------------
  router.get("/claim/not-in-list", (req, res) => {
    ensureClaim(req.session.data);
    res.render("pages/claim/not-in-list", {
      pageTitle: "If your council is not in the list",
      backHref: "/claim/find",
    });
  });

  // ----- 03 your-details (209:2460) + 14 error (209:2852) ----------------------------
  router.get("/claim/your-details", (req, res) => {
    const claim = ensureClaim(req.session.data);
    renderYourDetails(res, claim, { person: claim.person });
  });

  router.post("/claim/your-details", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const data = req.session.data;
    const fullName = clean(data.fullName);
    const jobTitle = clean(data.jobTitle);
    delete data.fullName;
    delete data.jobTitle;

    const errors = [];
    if (!fullName) errors.push({ field: "fullName", message: "Enter your full name" });
    if (!jobTitle) errors.push({ field: "jobTitle", message: "Enter your job title at this council" });
    if (errors.length) {
      return renderYourDetails(res, claim, { person: { fullName: fullName, jobTitle: jobTitle }, errors: errors });
    }

    claim.person = { fullName: fullName, jobTitle: jobTitle };
    const recognised = claim.council && isEmailRecognisedForCouncil(claim.oneLoginEmail, claim.council.id);
    if (!recognised) return res.redirect("/claim/how-connected"); // 08 (Batch 4)
    return res.redirect("/claim/check"); // 04 / 05
  });

  // ----- 04 check-answers first to join (209:2504) / 05 joining others (209:2540) -----
  router.get("/claim/check", (req, res) => {
    const claim = ensureClaim(req.session.data);
    res.render("pages/claim/check-answers", {
      pageTitle: "Check your answers",
      backHref: "/claim/your-details",
      council: claim.council || {},
      person: claim.person || {},
      email: claim.oneLoginEmail || "",
      joining: Boolean(claim.flagCouncilHasUsers),
      existingUserCount: claim.existingUserCount || 5,
    });
  });

  router.post("/claim/check", (req, res) => {
    const claim = ensureClaim(req.session.data);
    if (claim.flagCouncilHasUsers) {
      // v6: joining others is a REQUEST to the council's CAF Lead, not an instant join. The email
      // domain only suggested the council — it never creates membership here.
      // Changed in build, prototype, pending design sign-off.
      claim.status = "request-sent";
      claim.joinRequest = {
        status: "sent",
        councilName: (claim.council && claim.council.name) || "",
        approverName: "Jo Hart", // the council's CAF Lead (first claimant) — NOT DECIDED, see Stage 3
        person: claim.person || {},
        email: claim.oneLoginEmail || "",
      };
      return res.redirect("/claim/request-sent"); // 20
    }
    claim.needsReview = true;
    claim.status = "pending";
    return res.redirect("/claim/pending"); // 06
  });

  // ----- 20 request-sent (joining others — waiting for CAF Lead approval) — v6 PROPOSAL -------
  // Reached from 05 "Send request". Pre-access chrome (no membership yet). Screens 21 (review) and
  // the approval that reaches 07b are wired in Stage 3. Changed in build, prototype, pending design
  // sign-off.
  router.get("/claim/request-sent", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const jr = claim.joinRequest || {};
    res.render("pages/claim/request-sent", {
      pageTitle: "Your request has been sent",
      councilName: jr.councilName || (claim.council && claim.council.name) || "your council",
    });
  });

  // ----- 21 review-request (the CAF Lead reviews a request to join) — v6 PROPOSAL -----------
  // Reached from the prototype-only "View as the CAF Lead" link on /beta/reset. Reads the join
  // request in session (05 sets it); seeds a demo one if there is not a pending request yet, so
  // the reviewer always has something to act on. Changed in build, prototype, pending design
  // sign-off.
  router.get("/claim/review-request", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const jr = ensureReviewRequest(claim);
    applyClaimGrantedChrome(req, res, { fullName: jr.approverName }, jr.councilName);
    renderReviewRequest(res, jr, {});
  });

  router.post("/claim/review-request", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const jr = ensureReviewRequest(claim);
    const action = clean(req.session.data.reviewAction);
    const access = clean(req.session.data.reviewAccess);
    delete req.session.data.reviewAction;
    delete req.session.data.reviewAccess;

    if (action === "reject") {
      jr.status = "rejected";
      return res.redirect("/claim/review-request/rejected"); // prototype-only, not designed
    }

    // Approve — access level is required.
    if (access !== "full" && access !== "outcomes") {
      applyClaimGrantedChrome(req, res, { fullName: jr.approverName }, jr.councilName);
      return renderReviewRequest(res, jr, { error: { message: "Select what access to give them" } });
    }

    jr.status = "approved";
    jr.accessType = access;

    if (access === "outcomes") {
      // Hand off to the existing A06 "assign outcomes" screen, seeded with the joiner's details.
      const accessState = ensureAccess(req.session.data);
      accessState.invite = {
        name: (jr.person && jr.person.fullName) || "",
        email: jr.email || "",
        role: "collaborator",
        outcomes: [],
      };
      return res.redirect("/access/invite/outcomes"); // A06
    }

    return res.redirect("/claim/review-request/approved"); // Full access → prototype confirmation
  });

  // Approve + Full access — simple prototype-only confirmation (CAF Lead facing). The joiner's own
  // "Request approved" screen is 07b (/claim/joined). Changed in build, prototype, pending sign-off.
  router.get("/claim/review-request/approved", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const jr = claim.joinRequest || {};
    applyClaimGrantedChrome(req, res, { fullName: jr.approverName || "Jo Hart" }, jr.councilName);
    res.render("pages/claim/review-request-approved", {
      pageTitle: "Request approved",
      name: (jr.person && jr.person.fullName) || "This person",
      councilName: jr.councilName || "your council",
    });
  });

  // Reject — the reject flow (reason screen, emails) is not designed. Prototype-only placeholder.
  // Changed in build, prototype, pending design sign-off.
  router.get("/claim/review-request/rejected", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const jr = claim.joinRequest || {};
    applyClaimGrantedChrome(req, res, { fullName: jr.approverName || "Jo Hart" }, jr.councilName);
    res.render("pages/claim/review-request-rejected", {
      pageTitle: "This page has not been designed yet",
    });
  });

  // ----- 22 cannot-join (the council's first claim is still being checked by MHCLG) — v6 --------
  // Changed in build, prototype, pending design sign-off.
  router.get("/claim/cannot-join", (req, res) => {
    const claim = ensureClaim(req.session.data);
    res.render("pages/claim/cannot-join", {
      pageTitle: "You cannot join yet",
      councilName: (claim.council && claim.council.name) || "this council",
    });
  });

  // ----- 06 registration-pending (209:2573) ------------------------------------------
  router.get("/claim/pending", (req, res) => {
    const claim = ensureClaim(req.session.data);
    res.render("pages/claim/pending", {
      pageTitle: "We are checking your claim",
      councilName: (claim.council && claim.council.name) || "",
    });
  });

  // Prototype-only control: simulate the MHCLG decision on a pending claim.
  // (The "not approved" (16) and "still checking" (18) targets arrive in Batch 5.)
  router.get("/claim/pending/approve", (req, res) => {
    const claim = ensureClaim(req.session.data);
    claim.status = "approved";
    return res.redirect("/claim/access-granted");
  });
  router.get("/claim/pending/reject", (req, res) => {
    ensureClaim(req.session.data).status = "not-approved";
    return res.redirect("/claim/not-approved"); // 16 (Batch 5)
  });
  router.get("/claim/pending/still-checking", (req, res) => {
    return res.redirect("/claim/still-checking"); // 18 (Batch 5)
  });

  // ----- 07 access-granted, first to join (209:2608) ---------------------------------
  router.get("/claim/access-granted", (req, res) => {
    const claim = ensureClaim(req.session.data);
    applyClaimGrantedChrome(req, res, claim.person, claim.council && claim.council.name);
    res.render("pages/claim/access-granted", {
      pageTitle: "Claim complete",
      councilName: (claim.council && claim.council.name) || "",
    });
  });

  // ----- 07b access-granted, joined existing (209:2977) ------------------------------
  router.get("/claim/joined", (req, res) => {
    const claim = ensureClaim(req.session.data);
    applyClaimGrantedChrome(req, res, claim.person, claim.council && claim.council.name);
    res.render("pages/claim/joined", {
      pageTitle: "Request approved",
      councilName: (claim.council && claim.council.name) || "",
      existingUserCount: claim.existingUserCount || 5,
      approverName: (claim.joinRequest && claim.joinRequest.approverName) || "Jo Hart",
    });
  });

  // ----- 08 how-are-you-connected (209:2646) + 15 error (209:2882) --------------------
  router.get("/claim/how-connected", (req, res) => {
    const claim = ensureClaim(req.session.data);
    renderHowConnected(res, claim, {});
  });

  router.post("/claim/how-connected", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const connection = clean(req.session.data.connection);
    delete req.session.data.connection;
    if (connection !== "direct" && connection !== "shared-managed" && connection !== "something-else") {
      return renderHowConnected(res, claim, { error: { message: "Select how you are connected to this council" } });
    }
    claim.connection = connection;
    if (connection === "direct") return res.redirect("/claim/check-unrecognised"); // 11 (no organisation)
    if (connection === "shared-managed") return res.redirect("/claim/which-organisation"); // 09
    return res.redirect("/claim/contact-support"); // 10
  });

  // ----- 09 which-organisation (209:2682) --------------------------------------------
  router.get("/claim/which-organisation", (req, res) => {
    const claim = ensureClaim(req.session.data);
    renderWhichOrg(res, { value: claim.organisation || "" });
  });

  router.post("/claim/which-organisation", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const chosen = clean(req.session.data.organisation);
    const typed = clean(req.session.data.orgSearchText);
    delete req.session.data.organisation;
    delete req.session.data.orgSearchText;
    const org = chosen || typed;
    if (!org) {
      return renderWhichOrg(res, { value: typed, error: { message: "Enter the name of the organisation you work for" } });
    }
    claim.organisation = org;
    return res.redirect("/claim/check-unrecognised"); // 11
  });

  // ----- 10 contact-support (209:2714) -----------------------------------------------
  router.get("/claim/contact-support", (req, res) => {
    ensureClaim(req.session.data);
    res.render("pages/claim/contact-support", {
      pageTitle: "Contact the CAF team",
      backHref: "/claim/how-connected",
    });
  });

  // ----- 11 check-answers, email not recognised (209:2747) ---------------------------
  router.get("/claim/check-unrecognised", (req, res) => {
    const claim = ensureClaim(req.session.data);
    res.render("pages/claim/check-unrecognised", {
      pageTitle: "Check your answers",
      backHref: claim.connection === "shared-managed" ? "/claim/which-organisation" : "/claim/how-connected",
      council: claim.council || {},
      person: claim.person || {},
      email: claim.oneLoginEmail || "",
      connectionLabel: connectionLabel(claim.connection),
      isShared: claim.connection === "shared-managed",
      organisation: claim.organisation || "",
    });
  });

  router.post("/claim/check-unrecognised", (req, res) => {
    const claim = ensureClaim(req.session.data);
    claim.needsReview = true;
    claim.status = "pending";
    return res.redirect("/claim/pending"); // 06
  });

  // ----- 16 registration-not-approved (209:2913) — PROPOSAL -------------------------
  router.get("/claim/not-approved", (req, res) => {
    const claim = ensureClaim(req.session.data);
    res.render("pages/claim/not-approved", {
      pageTitle: "Your claim was not approved",
      email: claim.oneLoginEmail || "",
      councilName: (claim.council && claim.council.name) || "this council",
    });
  });

  // ----- 17 already-have-access (209:3009) ------------------------------------------
  router.get("/claim/already-have-access", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const councilName = (claim.council && claim.council.name) || "";
    applyClaimGrantedChrome(req, res, { fullName: (claim.person && claim.person.fullName) || "Jo Hart" }, councilName);
    res.render("pages/claim/already-have-access", {
      pageTitle: "You already have access to " + councilName,
      councilName: councilName,
      registeredDate: claim.registeredDate || "14 August 2026",
    });
  });

  // ----- 18 still-checking (209:3045) -----------------------------------------------
  router.get("/claim/still-checking", (req, res) => {
    const claim = ensureClaim(req.session.data);
    res.render("pages/claim/still-checking", {
      pageTitle: "We are still checking your claim",
      councilName: (claim.council && claim.council.name) || "your council",
      registeredDate: claim.registeredDate || "21 September 2026",
    });
  });

  // ----- 19 which-council, domain matches more than one (209:3077) — OPEN QUESTION ---
  router.get("/claim/which-council", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const email = claim.oneLoginEmail || "";
    const councils = councilsForEmail(email).map((id) => getCouncilById(id)).filter(Boolean);
    res.render("pages/claim/which-council", {
      pageTitle: "Which council are you claiming for?",
      backHref: "/claim/find",
      domain: domainOf(email),
      councils: councils,
      chosen: (claim.council && claim.council.id) || "",
      error: null,
    });
  });

  router.post("/claim/which-council", (req, res) => {
    const claim = ensureClaim(req.session.data);
    const email = claim.oneLoginEmail || "";
    const ids = councilsForEmail(email);
    const choice = clean(req.session.data.whichCouncil);
    delete req.session.data.whichCouncil;

    // v6: the "all councils" option is removed while a person can be linked to only one council.
    // Email-domain matching only suggests these councils — it never creates membership.
    // Changed in build, prototype, pending design sign-off.
    if (ids.indexOf(choice) === -1) {
      const councils = ids.map((id) => getCouncilById(id)).filter(Boolean);
      return res.render("pages/claim/which-council", {
        pageTitle: "Error: Which council are you claiming for?",
        backHref: "/claim/find",
        domain: domainOf(email),
        councils: councils,
        chosen: "",
        error: { message: "Select which council you are claiming for" },
      });
    }

    const c = getCouncilById(choice);
    if (c) claim.council = { id: c.id, name: c.name };
    return res.redirect("/claim/your-details"); // 03
  });
};

// Shared render for 03 / 14 (base + error state of "Your details").
function renderYourDetails(res, claim, opts) {
  const errors = opts.errors || null;
  const email = claim.oneLoginEmail || "";
  const council = claim.council || {};
  const recognised = Boolean(council.id && isEmailRecognisedForCouncil(email, council.id));
  const errorByField = {};
  (errors || []).forEach((e) => {
    errorByField[e.field] = e.message;
  });
  // Back from 03 goes to where the user came from: 01 (confirm) via an MHCLG link, else 02 (find).
  const backHref = claim && claim.arrival === "mhclg-link" ? "/claim/confirm" : "/claim/find";
  res.render("pages/claim/your-details", {
    pageTitle: (errors ? "Error: " : "") + "Your details",
    backHref: backHref,
    email: email,
    domain: domainOf(email),
    councilName: council.name || "",
    recognised: recognised,
    person: opts.person || {},
    hasErrors: Boolean(errors),
    errorByField: errorByField,
    errorList: (errors || []).map((e) => ({ text: e.message, href: "#" + e.field })),
  });
}

// Shared render for 08 / 15 (base + error state of "How are you connected?").
function renderHowConnected(res, claim, opts) {
  const error = opts.error || null;
  const council = claim.council || {};
  res.render("pages/claim/how-connected", {
    pageTitle: (error ? "Error: " : "") + "How are you connected to " + (council.name || "this council") + "?",
    backHref: "/claim/your-details",
    councilName: council.name || "this council",
    domain: domainOf(claim.oneLoginEmail || ""),
    connection: claim.connection || "",
    error: error,
  });
}

// Render for 09 "Which organisation do you work for?".
function renderWhichOrg(res, opts) {
  const error = opts.error || null;
  const orgItems = [{ value: "", text: "Select an organisation" }].concat(
    ORGANISATIONS.map((o) => ({ value: o, text: o }))
  );
  res.render("pages/claim/which-organisation", {
    pageTitle: (error ? "Error: " : "") + "Which organisation do you work for?",
    backHref: "/claim/how-connected",
    orgItems: orgItems,
    value: opts.value || "",
    error: error,
  });
}

// Display label for the connection answer, shown on frame 11.
function connectionLabel(connection) {
  if (connection === "direct") return "The council directly";
  if (connection === "shared-managed") return "Shared service or managed service provider";
  if (connection === "something-else") return "Something else";
  return "";
}

// Apply a prototype scenario (reset Claim state, seed its fields) and enter the journey.
function startScenario(req, res, key) {
  const scenario = SCENARIOS.find((s) => s.key === key);
  req.session.data.claim = {};
  if (scenario) Object.assign(req.session.data.claim, scenario.apply);
  return res.redirect("/claim");
}

// Seed/return the join request the CAF Lead reviews on screen 21. Keep a pending request from a
// real 05 flow (so 05 → 20 → 21 → 07b stay consistent in one session); otherwise seed a demo one
// so the reviewer always has something to act on. Changed in build, prototype, pending sign-off.
function ensureReviewRequest(claim) {
  if (claim.joinRequest && claim.joinRequest.status === "sent") return claim.joinRequest;
  claim.joinRequest = {
    status: "sent",
    councilName: "Westborough Borough Council",
    approverName: "Jo Hart", // the reviewing CAF Lead — who approves is NOT DECIDED
    person: { fullName: "Priya Shah", jobTitle: "Service Manager" },
    email: "priya.shah@westborough.gov.uk",
  };
  return claim.joinRequest;
}

// Shared render for screen 21 (base + "select access" error state).
function renderReviewRequest(res, jr, opts) {
  const error = opts.error || null;
  res.render("pages/claim/review-request", {
    pageTitle: (error ? "Error: " : "") + "Review a request to join",
    name: (jr.person && jr.person.fullName) || "",
    jobTitle: (jr.person && jr.person.jobTitle) || "",
    email: jr.email || "",
    domain: domainOf(jr.email || ""),
    councilName: jr.councilName || "",
    error: error,
  });
}

// Back from 02 goes to 01 when the user came via an MHCLG link, else to the prototype entry.
function findBackHref(claim) {
  return claim && claim.arrival === "mhclg-link" ? "/claim/confirm" : "/prototype-scenarios";
}

// Shared render for 02 / 12 (base + error state of "Which council do you work for?").
function renderFind(res, opts) {
  const error = opts.error || null;
  // Pre-selection: opts.selectedId marks the native <select> option (so no-JS submits it and the
  // autocomplete shows the council name). opts.value is the typed text used on error re-render.
  const selectedId = opts.selectedId || "";
  const selectedName = selectedId ? ((getCouncilById(selectedId) || {}).name || "") : (opts.value || "");
  const councilItems = [{ value: "", text: "Select a council" }].concat(
    COUNCILS.map((c) => ({ value: c.id, text: c.name, selected: c.id === selectedId }))
  );
  res.render("pages/claim/find", {
    pageTitle: (error ? "Error: " : "") + "Which council do you work for?",
    backHref: opts.backHref || "/prototype-scenarios",
    councilItems,
    value: selectedName,
    error,
  });
}
