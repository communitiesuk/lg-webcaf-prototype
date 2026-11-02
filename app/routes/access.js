// app/routes/access.js
// "Access management" section (Figma page 209:751, v3). Batch 1: A01 hub, A02 audit trail,
// A03/A04 periodic review. Session-only; recording updates req.session.data.access.

const {
  applyFullAccessChrome,
  applyCollaboratorChrome,
  applyNoCouncilChrome,
  COUNCIL_NAME,
  ensureSetup,
  ensureDecide,
} = require("../data/helpers/readiness");
const {
  ensureAccess,
  getPerson,
  currentUser,
  addAuditEntry,
  buildPeopleRows,
  buildAuditRows,
  buildReviewModel,
  applyReview,
  buildCafLeadModel,
  setCafLead,
  clearCafLead,
  buildApproverModel,
  ensureInvite,
  buildOutcomeGroups,
  outcomeLabel,
  roleVerb,
  addInvitation,
  getInvitation,
  cancelInvitation,
  buildInvitationRows,
  setApprover,
  fullAccessPeople,
  isOnlyFullAccess,
  changeRole,
  removePerson,
  promoteToFull,
  buildTransferModel,
  buildReassignModel,
} = require("../data/helpers/access");

const NAMED_PERSON = "Marcus Webb"; // A24/A25 alt example: Jo Hart names someone else

function toList(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

module.exports = function (router) {
  // A01 — People and governance (hub). The dashboard "People" nav lands here.
  router.get("/access", (req, res) => {
    ensureAccess(req.session.data);
    // Landing on the People hub ends any in-flight Setup-origin flow, so drop its return/context
    // to prevent a stale value attaching to a later unrelated visit.
    delete req.session.data.approverReturn;
    delete req.session.data.cafLeadReturn;
    delete req.session.data.setupInvite;
    delete req.session.data.setupInviteReturn;
    applyFullAccessChrome(req, res);
    res.render("pages/access/hub", {
      pageTitle: "People and governance",
      councilName: COUNCIL_NAME,
      peopleRows: buildPeopleRows(req.session.data.access),
    });
  });

  // A02 — Audit trail.
  router.get("/access/audit-trail", (req, res) => {
    ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    res.render("pages/access/audit-trail", {
      pageTitle: "Audit trail",
      auditRows: buildAuditRows(req.session.data.access),
    });
  });

  // A03 — Periodic access review.
  router.get("/access/review", (req, res) => {
    const access = ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    res.render("pages/access/review", {
      pageTitle: "Check who still needs access",
      model: buildReviewModel(access),
    });
  });

  // A04 — Review confirmed (removes anyone unticked, then shows the summary).
  router.post("/access/review", (req, res) => {
    const access = ensureAccess(req.session.data);
    const stillNeeded = toList(req.session.data.reviewStillNeeded);
    delete req.session.data.reviewStillNeeded;
    delete req.session.data.approverStillRight;
    const removed = applyReview(access, stillNeeded);
    applyFullAccessChrome(req, res);
    res.render("pages/access/review-confirmed", {
      pageTitle: "Access review complete",
      confirmedCount: stillNeeded.length,
      removedNames: removed,
    });
  });

  // A22 — Who is your CAF Lead? (anyone with full access can set it). A31 is its error state.
  router.get("/access/caf-lead", (req, res) => {
    const access = ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    // Carry a Setup return target (task 1 / check-your-setup Change), same as the Approver flow.
    const ret = (req.query.return || "").toString();
    if (ret.startsWith("/setup/")) req.session.data.cafLeadReturn = ret;
    else delete req.session.data.cafLeadReturn;
    res.render("pages/access/caf-lead", {
      pageTitle: "Who is your council’s CAF Lead?",
      model: buildCafLeadModel(access),
      current: { choice: "me" }, // "Me, Jo Hart" selected by default, as drawn
      error: null,
      backHref: req.session.data.cafLeadReturn || "/access",
    });
  });

  router.post("/access/caf-lead", (req, res) => {
    const access = ensureAccess(req.session.data);
    const choice = (req.session.data.cafLeadChoice || "").toString();
    const personId = (req.session.data.cafLeadPerson || "").toString();
    delete req.session.data.cafLeadChoice;
    delete req.session.data.cafLeadPerson;

    if (choice === "someone-new") {
      const invite = ensureInvite(access);
      invite.role = "full"; // a new CAF Lead needs full access
      // Carry the Setup return and mark this invite as naming the CAF Lead, so sending it records
      // a pending CAF Lead in Setup and returns the user there.
      req.session.data.setupInvite = { kind: "cafLead", return: req.session.data.cafLeadReturn || "" };
      delete req.session.data.cafLeadReturn;
      return res.redirect("/access/invite"); // A05 (Batch 3)
    }

    // A31 — nothing chosen (no outer choice, or "someone with access" but no person).
    if (!choice || (choice === "someone-with-access" && !personId)) {
      applyFullAccessChrome(req, res);
      return res.render("pages/access/caf-lead", {
        pageTitle: "Error: Who is your council’s CAF Lead?",
        model: buildCafLeadModel(access),
        current: { choice, personId },
        error: { text: "Select who your CAF Lead is" },
        backHref: req.session.data.cafLeadReturn || "/access",
      });
    }

    const me = currentUser(access);
    const targetId = choice === "me" ? (me ? me.id : "jo-hart") : personId;
    const person = setCafLead(access, targetId);
    // Recording a CAF Lead completes Setup task 1 — mirror the name into Setup's people state so the
    // task list and dashboard reflect it. Changed in build, prototype, pending design sign-off.
    const setup = ensureSetup(req.session.data);
    if (person && setup.people && setup.people.cafLead) {
      setup.people.cafLead.name = person.name;
      setup.people.cafLead.confirmed = true;
      setup.people.cafLead.pending = false;
    }
    return res.redirect(`/access/caf-lead/confirmed?who=${person && person.isCurrentUser ? "me" : targetId}`);
  });

  // A23 — CAF Lead confirmed (self or someone else).
  router.get("/access/caf-lead/confirmed", (req, res) => {
    const access = ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    const who = (req.query.who || "me").toString();
    const isSelf = who === "me";
    const person = isSelf ? currentUser(access) : getPerson(access, who);
    res.render("pages/access/caf-lead-confirmed", {
      pageTitle: `${person ? person.name : "Jo Hart"} is now your council’s CAF Lead`,
      name: person ? person.name : "Jo Hart",
      isSelf,
      continueHref: req.session.data.cafLeadReturn || "/setup/task-list",
    });
  });

  // A24 — You have been named CAF Lead (the named person’s dashboard). Prototype control: the named
  // person (Marcus Webb) signs in and sees this banner.
  router.get("/access/named-caf-lead", (req, res) => {
    ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    res.locals.currentUser = { name: NAMED_PERSON, orgName: COUNCIL_NAME };
    res.render("pages/access/named-caf-lead", {
      pageTitle: "Your CAF dashboard",
      councilName: COUNCIL_NAME,
      namedBy: "Jo Hart",
      namedDate: "25 September 2026",
    });
  });

  // A25 — Not the CAF Lead (decline).
  router.get("/access/not-caf-lead", (req, res) => {
    ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    res.locals.currentUser = { name: NAMED_PERSON, orgName: COUNCIL_NAME };
    res.render("pages/access/not-caf-lead", {
      pageTitle: "Are you sure you are not the CAF Lead?",
      councilName: COUNCIL_NAME,
      namedBy: "Jo Hart",
    });
  });

  router.post("/access/not-caf-lead", (req, res) => {
    const access = ensureAccess(req.session.data);
    clearCafLead(access, NAMED_PERSON);
    return res.redirect("/dashboard");
  });

  // A29 — Who approves your council’s CAF plan? Three routes.
  router.get("/access/approver", (req, res) => {
    const access = ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    // When arriving from Setup (task 7 or the check-your-setup Change link), carry a return
    // target so recording the Approver sends the user back to finish setup. Only internal
    // Setup paths are honoured. Set fresh on each entry so a People-section visit does not
    // inherit a stale return.
    const ret = (req.query.return || "").toString();
    if (ret.startsWith("/setup/")) req.session.data.approverReturn = ret;
    else delete req.session.data.approverReturn;
    res.render("pages/access/approver", {
      pageTitle: "Who approves your council’s CAF plan?",
      model: buildApproverModel(access),
      backHref: req.session.data.approverReturn || "/access",
    });
  });

  router.post("/access/approver", (req, res) => {
    const access = ensureAccess(req.session.data);
    const choice = (req.session.data.approverChoice || "").toString();
    delete req.session.data.approverChoice;
    if (choice === "invitation") {
      const invite = ensureInvite(access);
      invite.role = "approver";
      // Carry the Setup return and mark this invite as naming the Approver, so sending it records
      // a pending Approver in Setup and returns the user there.
      req.session.data.setupInvite = { kind: "approver", return: req.session.data.approverReturn || "" };
      delete req.session.data.approverReturn;
      return res.redirect("/access/invite"); // A05 as Approver
    }
    // Choosing an existing user as the Approver is not built in this prototype.
    if (choice === "has-access") {
      return res.redirect("/access/not-in-this-prototype");
    }
    return res.redirect("/access/approver-details"); // A27
  });

  // "Not built in this prototype" holding page, in the Access/dashboard chrome.
  router.get("/access/not-in-this-prototype", (req, res) => {
    ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    res.render("pages/access/not-in-this-prototype", {
      pageTitle: "This part is not built in this prototype",
      backHref: "/access/approver",
    });
  });

  // A05 — Who do you want to invite? A19 is its error state.
  router.get("/access/invite", (req, res) => {
    const access = ensureAccess(req.session.data);
    const invite = ensureInvite(access);
    applyFullAccessChrome(req, res);
    res.render("pages/access/invite-who", {
      pageTitle: "Who do you want to invite?",
      invite,
      error: null,
      errorByField: {},
    });
  });

  router.post("/access/invite", (req, res) => {
    const access = ensureAccess(req.session.data);
    const invite = ensureInvite(access);
    invite.name = (req.session.data.inviteName || "").toString().trim();
    invite.email = (req.session.data.inviteEmail || "").toString().trim();
    invite.role = (req.session.data.inviteRole || "").toString();
    delete req.session.data.inviteName;
    delete req.session.data.inviteEmail;
    delete req.session.data.inviteRole;

    // A19 — name, email and role are required.
    const errors = [];
    if (!invite.name) errors.push({ field: "inviteName", text: "Enter their name" });
    if (!invite.email) errors.push({ field: "inviteEmail", text: "Enter their work email address" });
    if (!invite.role) errors.push({ field: "inviteRole", text: "Select what you need them to do" });
    if (errors.length) {
      applyFullAccessChrome(req, res);
      return res.render("pages/access/invite-who", {
        pageTitle: "Error: Who do you want to invite?",
        invite,
        error: { items: errors },
        errorByField: errors.reduce((a, e) => { a[e.field] = e.text; return a; }, {}),
      });
    }

    if (invite.role === "collaborator") return res.redirect("/access/invite/outcomes"); // A06
    if (invite.role === "approver") {
      // When this is the Setup "Confirm your Approver" invitation path, the person has already
      // chosen "needs an invitation" — so skip A07 ("Does your Approver need to use the service?",
      // which otherwise leads into recording the decision) and go straight to check + send.
      const ctx = req.session.data.setupInvite;
      if (ctx && ctx.kind === "approver") return res.redirect("/access/invite/check");
      return res.redirect("/access/invite/approver-account"); // A07
    }
    return res.redirect("/access/invite/check"); // full → A08
  });

  // A06 — assign outcomes (Collaborators). A20 is its error state.
  router.get("/access/invite/outcomes", (req, res) => {
    const access = ensureAccess(req.session.data);
    ensureSetup(req.session.data);
    ensureDecide(req.session.data);
    const invite = ensureInvite(access);
    applyFullAccessChrome(req, res);
    res.render("pages/access/invite-outcomes", {
      pageTitle: `What will ${invite.name} work on?`,
      invite,
      groups: buildOutcomeGroups(req.session.data, invite.outcomes),
      error: null,
    });
  });

  router.post("/access/invite/outcomes", (req, res) => {
    const access = ensureAccess(req.session.data);
    ensureSetup(req.session.data);
    ensureDecide(req.session.data);
    const invite = ensureInvite(access);
    invite.outcomes = toList(req.session.data.inviteOutcomes);
    delete req.session.data.inviteOutcomes;
    // A20 — at least one outcome.
    if (!invite.outcomes.length) {
      applyFullAccessChrome(req, res);
      return res.render("pages/access/invite-outcomes", {
        pageTitle: `Error: Which outcomes will ${invite.name} work on?`,
        invite,
        groups: buildOutcomeGroups(req.session.data, []),
        error: { text: `Select at least one outcome for ${invite.name} to work on` },
      });
    }
    return res.redirect("/access/invite/check");
  });

  // A07 — Does your Approver need to use the service?
  router.get("/access/invite/approver-account", (req, res) => {
    const access = ensureAccess(req.session.data);
    const invite = ensureInvite(access);
    applyFullAccessChrome(req, res);
    res.render("pages/access/invite-approver-account", {
      pageTitle: "Does your Approver need to use the service?",
      invite,
    });
  });

  router.post("/access/invite/approver-account", (req, res) => {
    const choice = (req.session.data.approverAccount || "").toString();
    delete req.session.data.approverAccount;
    if (choice === "yes") return res.redirect("/access/invite/check"); // send an invitation
    return res.redirect("/access/approver-details"); // no → A27
  });

  // A08 — Check the invitation.
  router.get("/access/invite/check", (req, res) => {
    const access = ensureAccess(req.session.data);
    const invite = ensureInvite(access);
    applyFullAccessChrome(req, res);
    res.render("pages/access/invite-check", {
      pageTitle: "Check the invitation",
      invite,
      outcomesText: invite.outcomes.map(outcomeLabel).join(", "),
      roleText: roleVerb(invite.role),
    });
  });

  router.post("/access/invite/check", (req, res) => {
    const access = ensureAccess(req.session.data);
    const invite = ensureInvite(access);
    addInvitation(access, invite);
    req.session.data.lastInvitedName = invite.name;
    req.session.data.lastInvitedEmail = invite.email;
    // If this invitation names a Setup Approver or CAF Lead, record a pending (invited, not yet
    // accepted) entry in Setup and carry the return so the user gets back to finish setup.
    const ctx = req.session.data.setupInvite;
    let approverSetupInvite = false;
    if (ctx) {
      const setup = ensureSetup(req.session.data);
      if (ctx.kind === "approver" && setup.people && setup.people.approver) {
        setup.people.approver.name = invite.name;
        setup.people.approver.jobTitle = "";
        setup.people.approver.confirmed = false;
        setup.people.approver.pending = true; // invitation sent, awaiting acceptance
        setup.people.approver.hasAccount = true;
        approverSetupInvite = true;
      }
      if (ctx.kind === "cafLead" && setup.people && setup.people.cafLead) {
        setup.people.cafLead.name = invite.name;
        setup.people.cafLead.confirmed = false;
        setup.people.cafLead.pending = true;
      }
      req.session.data.setupInviteReturn = ctx.return || "";
      delete req.session.data.setupInvite;
    }
    delete access.invite; // clear the draft
    // The Setup Approver invitation ends on its own confirmation page (not the generic A09), so it
    // does not offer to record the decision as the next step.
    if (approverSetupInvite) return res.redirect("/access/approver/invitation-sent");
    return res.redirect("/access/invite/sent");
  });

  // Confirmation for the Setup "Confirm your Approver" invitation path. Distinct from A09 so the
  // Access-management invite flow is untouched. "Record their decision yourself" links to the
  // existing record page (A27 approver-details), carrying the Setup return.
  router.get("/access/approver/invitation-sent", (req, res) => {
    ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    const setupReturn = req.session.data.setupInviteReturn || "/setup/task-list";
    // So "record their decision yourself" (A27) returns to Setup after recording.
    req.session.data.approverReturn = setupReturn;
    res.render("pages/access/approver-invite-sent", {
      pageTitle: "Invitation sent",
      name: (req.session.data.lastInvitedName || "your Approver").toString(),
      email: (req.session.data.lastInvitedEmail || "").toString(),
      setupReturn,
      recordDecisionHref: "/access/approver-details",
    });
  });

  // A09 — Invitation sent.
  router.get("/access/invite/sent", (req, res) => {
    ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    const setupReturn = req.session.data.setupInviteReturn || "";
    delete req.session.data.setupInviteReturn;
    res.render("pages/access/invite-sent", {
      pageTitle: "Invitation sent",
      councilName: COUNCIL_NAME,
      name: (req.session.data.lastInvitedName || "Sam Okoro").toString(),
      setupReturn: setupReturn, // when the invite named a Setup Approver/CAF Lead
    });
  });

  // A10 — Pending invitations.
  router.get("/access/invitations", (req, res) => {
    const access = ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    const cancelledName = (req.session.data.cancelledInviteName || "").toString();
    delete req.session.data.cancelledInviteName;
    res.render("pages/access/invitations", {
      pageTitle: "Invitations waiting to be accepted",
      invitationRows: buildInvitationRows(access),
      cancelledName,
    });
  });

  // Resend (no screen — returns to A10).
  router.get("/access/invitations/:id/resend", (req, res) => {
    const access = ensureAccess(req.session.data);
    const inv = getInvitation(access, req.params.id);
    if (inv) { inv.status = "pending"; inv.nearExpiry = false; inv.sent = "today"; inv.expires = "22 October"; delete inv.expired; addAuditEntry(access, `Jo Hart resent the invitation to ${inv.name}`); }
    return res.redirect("/access/invitations");
  });

  // A27 — Approver details. A32 is its error state.
  // Back steps to the choice page (/access/approver), carrying the Setup return so the chain is
  // Setup -> choose -> details. Avoids a direct (and potentially stale) leap into Setup.
  const approverDetailsBack = (req) => {
    const ret = req.session.data.approverReturn;
    return "/access/approver" + (ret ? "?return=" + encodeURIComponent(ret) : "");
  };

  router.get("/access/approver-details", (req, res) => {
    const access = ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    res.render("pages/access/approver-details", {
      pageTitle: "Your Approver’s details",
      current: { name: access.approver.name || "", role: access.approver.role || "" },
      error: null,
      errorByField: {},
      backHref: approverDetailsBack(req),
    });
  });

  router.post("/access/approver-details", (req, res) => {
    const access = ensureAccess(req.session.data);
    const name = (req.session.data.approverName || "").toString().trim();
    const role = (req.session.data.approverRole || "").toString().trim();
    delete req.session.data.approverName;
    delete req.session.data.approverRole;
    // A32 — full name and role required.
    const errors = [];
    if (!name) errors.push({ field: "approverName", text: "Enter your Approver’s full name" });
    if (!role) errors.push({ field: "approverRole", text: "Enter your Approver’s role" });
    if (errors.length) {
      applyFullAccessChrome(req, res);
      return res.render("pages/access/approver-details", {
        pageTitle: "Error: Your Approver’s details",
        current: { name, role },
        error: { items: errors },
        errorByField: errors.reduce((a, e) => { a[e.field] = e.text; return a; }, {}),
        backHref: approverDetailsBack(req),
      });
    }
    setApprover(access, name, role);
    // Write through to Setup so task 7 "Confirm your Approver" completes and check-your-setup
    // reflects it (the Approver is one concept shared by both sections).
    const setup = ensureSetup(req.session.data);
    if (setup.people && setup.people.approver) {
      setup.people.approver.name = name;
      setup.people.approver.jobTitle = role;
      setup.people.approver.confirmed = true;
      setup.people.approver.hasAccount = false; // recorded, not invited
    }
    // Recording the Approver is a setup activity, so return to the setup task list by default
    // (honouring an explicit Setup return, e.g. the check-your-setup Change link).
    const ret = req.session.data.approverReturn;
    delete req.session.data.approverReturn;
    return res.redirect(ret || "/setup/task-list");
  });

  // A11 — invitation email. Prototype PREVIEW of an email (not a real send).
  router.get("/access/invite/email-preview", (req, res) => {
    ensureAccess(req.session.data);
    res.render("pages/access/invitation-email", { pageTitle: "Invitation email", councilName: COUNCIL_NAME });
  });

  // Accept — prototype sign-in stand-in. Mocks the domain check: a matching council email → A13, a
  // non-matching email → A12.
  router.get("/access/accept", (req, res) => {
    ensureAccess(req.session.data);
    res.render("pages/access/accept-signin", { pageTitle: "Accept your invitation" });
  });

  // A12 — email does not match (PROPOSAL: domain match on acceptance).
  router.get("/access/accept/email-mismatch", (req, res) => {
    ensureAccess(req.session.data);
    applyNoCouncilChrome(req, res);
    res.render("pages/access/accept-mismatch", {
      pageTitle: "This invitation is for a Westborough Borough Council email address",
      councilName: COUNCIL_NAME,
    });
  });

  // A13 — confirm your name (matching council email). "Continue to your tasks" → collaborator dashboard.
  router.get("/access/accept/confirm-name", (req, res) => {
    ensureAccess(req.session.data);
    applyCollaboratorChrome(req, res);
    res.locals.currentUser = { name: "Sam Okoro", orgName: COUNCIL_NAME };
    res.render("pages/access/accept-confirm-name", {
      pageTitle: "Check your details",
      councilName: COUNCIL_NAME,
      name: "Sam Okoro",
    });
  });

  router.post("/access/accept/confirm-name", (req, res) => {
    const name = (req.session.data.inviteeName || "").toString().trim();
    const jobTitle = (req.session.data.inviteeJobTitle || "").toString().trim();
    if (!name) {
      applyCollaboratorChrome(req, res);
      res.locals.currentUser = { name: "Sam Okoro", orgName: COUNCIL_NAME };
      return res.render("pages/access/accept-confirm-name", {
        pageTitle: "Error: Check your details",
        councilName: COUNCIL_NAME,
        name,
        jobTitle,
        error: { field: "inviteeName", text: "Enter your name" },
      });
    }
    if (!req.session.data.readiness) req.session.data.readiness = {};
    req.session.data.readiness.demoCollaborator = true; // land on the collaborator dashboard (R06)
    delete req.session.data.inviteeName;
    delete req.session.data.inviteeJobTitle;
    return res.redirect("/dashboard");
  });

  // A30 — cancel an invitation (confirm, then cancel → A10 with a success banner).
  router.get("/access/invitations/:id/cancel", (req, res) => {
    const access = ensureAccess(req.session.data);
    const inv = getInvitation(access, req.params.id);
    if (!inv) return res.redirect("/access/invitations");
    applyFullAccessChrome(req, res);
    res.render("pages/access/invitation-cancel", {
      pageTitle: `Are you sure you want to cancel ${inv.name}’s invitation?`,
      invitation: inv,
    });
  });

  router.post("/access/invitations/:id/cancel", (req, res) => {
    const access = ensureAccess(req.session.data);
    const inv = cancelInvitation(access, req.params.id);
    if (inv) req.session.data.cancelledInviteName = inv.name;
    return res.redirect("/access/invitations");
  });

  // A14 — change what a person can do.
  router.get("/access/people/:id/change", (req, res) => {
    const access = ensureAccess(req.session.data);
    const person = getPerson(access, req.params.id);
    if (!person || !person.canChange) return res.redirect("/access");
    applyFullAccessChrome(req, res);
    res.render("pages/access/change", { pageTitle: `Change what ${person.firstName || person.name} can do`, person });
  });

  router.post("/access/people/:id/change", (req, res) => {
    const access = ensureAccess(req.session.data);
    const person = getPerson(access, req.params.id);
    if (!person) return res.redirect("/access");
    changeRole(access, person.id, (req.session.data.changeRole || "").toString());
    delete req.session.data.changeRole;
    return res.redirect("/access");
  });

  // Remove (branches): A15 (someone else) / A16 (self + last full access) / A21 (self, not last).
  router.get("/access/people/:id/remove", (req, res) => {
    const access = ensureAccess(req.session.data);
    const person = getPerson(access, req.params.id);
    if (!person) return res.redirect("/access");
    applyFullAccessChrome(req, res);
    const me = currentUser(access);
    const isSelf = me && me.id === person.id;
    if (isSelf && isOnlyFullAccess(access, person.id)) {
      return res.render("pages/access/remove-last-person", { pageTitle: "You are the only person with full access", person, councilName: COUNCIL_NAME });
    }
    if (isSelf) {
      const others = (access.people || []).filter((p) => (p.role === "full" || p.role === "collaborator") && p.id !== person.id);
      const othersSummary = others.length
        ? others[0].name + (others.length > 1 ? ` and ${others.length - 1} others` : "")
        : "no one else";
      return res.render("pages/access/remove-self", { pageTitle: "You are about to remove your own access", person, councilName: COUNCIL_NAME, othersSummary });
    }
    return res.render("pages/access/remove-confirm", { pageTitle: `Are you sure you want to remove ${person.firstName || person.name}’s access?`, person });
  });

  // A15 confirm — remove someone else.
  router.post("/access/people/:id/remove", (req, res) => {
    const access = ensureAccess(req.session.data);
    const person = getPerson(access, req.params.id);
    if (!person) return res.redirect("/access");
    // HARD RULE: never remove the last full-access person.
    if (person.role === "full" && isOnlyFullAccess(access, person.id)) return res.redirect(`/access/people/${person.id}/remove`);
    const removed = removePerson(access, person.id);
    access.lastRemoved = { name: removed.name, firstName: removed.firstName || removed.name, outcomeCount: removed.outcomeCount || 0 };
    return res.redirect("/access/removed");
  });

  // A17 — transfer full access (from A16).
  router.get("/access/people/:id/transfer", (req, res) => {
    const access = ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    const me = currentUser(access);
    res.render("pages/access/transfer", { pageTitle: "Who should take over?", model: buildTransferModel(access, req.params.id), selfId: req.params.id, selfName: me ? me.name : "Jo Hart" });
  });

  router.post("/access/people/:id/transfer", (req, res) => {
    const access = ensureAccess(req.session.data);
    const choice = (req.session.data.transferTo || "").toString();
    delete req.session.data.transferTo;
    if (choice === "new") return res.redirect("/access/invite");
    if (choice) promoteToFull(access, choice);
    // Now there is another full-access person → self-removal is no longer "last person" (A21).
    return res.redirect(`/access/people/${req.params.id}/remove`);
  });

  // A21 — remove your own access. CAF Lead must name a successor first (hard rule).
  router.post("/access/people/:id/remove-self", (req, res) => {
    const access = ensureAccess(req.session.data);
    const me = currentUser(access);
    if (me && me.isCafLead) return res.redirect("/access/caf-lead"); // name a new CAF Lead first
    const removed = removePerson(access, me ? me.id : req.params.id);
    access.lastRemoved = { name: removed ? removed.name : "", firstName: removed ? (removed.firstName || removed.name) : "", outcomeCount: 0 };
    return res.redirect("/access/removed");
  });

  // A18 — access removed.
  router.get("/access/removed", (req, res) => {
    const access = ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    res.render("pages/access/removed", { pageTitle: "Access removed", councilName: COUNCIL_NAME, removed: access.lastRemoved || { name: "", outcomeCount: 0 } });
  });

  // A28 — reassign outcomes. A33 is its error state.
  router.get("/access/reassign", (req, res) => {
    const access = ensureAccess(req.session.data);
    applyFullAccessChrome(req, res);
    const removed = access.lastRemoved || { name: "Priya Shah" };
    const model = buildReassignModel(access);
    if (model.items.length) model.items[0].checked = true; // Marcus Webb pre-selected, as drawn
    res.render("pages/access/reassign", { pageTitle: `Who will take over ${removed.firstName || removed.name}’s outcomes?`, removed, model, error: null });
  });

  router.post("/access/reassign", (req, res) => {
    const access = ensureAccess(req.session.data);
    const removed = access.lastRemoved || { name: "Priya Shah" };
    const choice = (req.session.data.reassignTo || "").toString();
    delete req.session.data.reassignTo;
    if (!choice) {
      applyFullAccessChrome(req, res);
      return res.render("pages/access/reassign", {
        pageTitle: `Error: Who will take over ${removed.firstName || removed.name}’s outcomes?`,
        removed,
        model: buildReassignModel(access),
        error: { text: `Select who will take over ${removed.name}’s outcomes, or leave them unassigned` },
      });
    }
    if (choice === "new") return res.redirect("/access/invite");
    if (choice === "unassigned") addAuditEntry(access, `${removed.name}’s outcomes were left unassigned`);
    else { const p = getPerson(access, choice); if (p) addAuditEntry(access, `Jo Hart reassigned ${removed.name}’s outcomes to ${p.name}`); }
    return res.redirect("/access");
  });
};
