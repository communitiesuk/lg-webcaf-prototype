// app/data/helpers/plan-state.js
//
// The plan state model (round 2 research build, beta-2). One plan per council per cycle. The state
// is stored in decide.plan.state; the screen, the dashboard tile and the emails are all derived
// from it. Nothing stores "which screen to show".
//
// Spec: the round 2 build prompt (11 November 2026), with the Figma panels winning where they
// differ: Decide v8 (D01, D10, D10b, D27, D27b, D12, N01 to N08) and Readiness v5 (R04 panel state
// table, R04e banners).
//
//   setup_incomplete                Setup not finished                               (derived)
//   no_approver                     no Approver named in Setup task 7                (derived)
//   not_started                     nothing answered in Decide                       (derived)
//   in_progress                     started, not sent to the assurer                 (derived, or set by "Change my plan")
//   waiting_for_assurer_assignment  sent, no assurer assigned                        D06
//   with_assurer                    sent, assurer assigned, not reviewed             D09
//   feedback_received               assurer answered Yes on D07                      D08
//   reviewed_no_feedback            assurer answered No on D07                       D10 / D10b
//   ready_to_send                   "Continue with current plan" on D08              D10 / D10b
//   awaiting_approval               sent to an Approver with an account              D27
//   awaiting_recorded_decision      Approver has no account; CAF Lead records it     D12
//   returned                        Approver returned the plan on D11                D14
//   approved                        approved on D11 (D28a) or recorded on D12        D13

const { hasApprover, hasAssurer, showCniScreens, includedAssessments, isCniFlaggedInSetup } = require("./decide");
const { sendEmail, todayLabel } = require("./notify");

const STORED_STATES = [
  "in_progress",
  "waiting_for_assurer_assignment",
  "with_assurer",
  "feedback_received",
  "reviewed_no_feedback",
  "ready_to_send",
  "awaiting_approval",
  "awaiting_recorded_decision",
  "returned",
  "approved",
];
const SENT_STATES = STORED_STATES.filter((s) => s !== "in_progress");

function planOf(decide) {
  decide.plan = decide.plan || {};
  return decide.plan;
}

// Sessions from before the state model (and the example council seed) have separate flags. Turn
// them into a state once.
function migrate(setup, decide) {
  const plan = planOf(decide);
  if (plan.state) return;
  const decision = (decide.approval && decide.approval.decision) || "";
  const approver = (setup.people && setup.people.approver) || {};
  if (decision === "approved") plan.state = "approved";
  else if (decision === "returned") plan.state = "returned";
  else if (plan.sentToAssurer) {
    if (!hasAssurer(setup)) plan.state = "waiting_for_assurer_assignment";
    else if (plan.sentForApproval) plan.state = approver.hasAccount ? "awaiting_approval" : "awaiting_recorded_decision";
    else if (plan.assurerReviewed) plan.state = decide.assurerFeedback ? "feedback_received" : "reviewed_no_feedback";
    else plan.state = "with_assurer";
  }
}

function setupComplete(setup) {
  // The example council's seed is a finished setup without the S30 flag.
  return Boolean(setup.completed || setup.exampleCouncil);
}

function hasStarted(decide) {
  const cycle = decide.cycle || {};
  return (
    Boolean(decide.cniAnswer) ||
    (cycle.selectedSystems || []).length > 0 ||
    Boolean(cycle.noneOnly) ||
    Boolean(cycle.confirmed)
  );
}

function planState(sessionData) {
  const setup = sessionData.setup || {};
  const decide = sessionData.decide || {};
  migrate(setup, decide);
  const stored = planOf(decide).state;
  if (SENT_STATES.indexOf(stored) !== -1) return stored;
  // No Approver is checked first: S30 will not finish setup without one, so "setup finished, no
  // Approver" cannot happen. Checking it first means the Assessments link shows D01 (as its panel
  // says) instead of silently going to the Setup task list.
  if (!hasApprover(setup)) return "no_approver";
  if (!setupComplete(setup)) return "setup_incomplete";
  if (stored === "in_progress" || hasStarted(decide)) return "in_progress";
  return "not_started";
}

function setState(decide, state) {
  planOf(decide).state = state;
}

// --- Where things go --------------------------------------------------------------------

function approverOf(setup) {
  return (setup.people && setup.people.approver) || {};
}

// The plan-building screen to resume at: worked out from what has been answered.
function resumeHref(setup, decide) {
  const cycle = decide.cycle || {};
  const chosen = (cycle.selectedSystems || []).length > 0 || cycle.noneOnly;
  if (showCniScreens(setup) && !decide.cniAnswer) return "/decide/cni";
  if (!chosen) return "/decide/systems";
  if (!cycle.confirmed) return "/decide/confirm";
  const timing = decide.timing || {};
  const timed = includedAssessments(setup, decide).every((a) => timing[a.id]);
  return timed ? "/decide/review" : "/decide/timing";
}

// The CAF Lead's screen for each state.
function screenFor(sessionData) {
  const setup = sessionData.setup || {};
  const decide = sessionData.decide || {};
  switch (planState(sessionData)) {
    case "setup_incomplete":
      return "/setup/task-list";
    case "no_approver":
      return "/decide/approver-needed";
    case "not_started":
      return showCniScreens(setup) ? "/decide/cni" : "/decide/systems";
    case "in_progress":
      return resumeHref(setup, decide);
    case "waiting_for_assurer_assignment":
      return "/decide/no-assurer";
    case "with_assurer":
      return "/decide/sent";
    case "feedback_received":
      return "/decide/feedback";
    case "reviewed_no_feedback":
    case "ready_to_send":
      return "/decide/send-for-approval";
    case "awaiting_approval":
      return "/decide/sent-for-approval";
    case "awaiting_recorded_decision":
      return "/decide/record-approval";
    case "returned":
      return "/decide/returned";
    case "approved":
      return "/decide/approved";
    default:
      return "/dashboard";
  }
}

// The Decide tile on the dashboard (Readiness v5, R04 panel state table). Variant names match the
// Figma Decide tile component, plus "in-progress" (R04b).
function tileFor(sessionData) {
  const setup = sessionData.setup || {};
  const decide = sessionData.decide || {};
  const approver = approverOf(setup);
  const buildHint = "Choose what this cycle covers, then get it approved.";
  const cont = { text: "Continue", href: "/decide" };
  switch (planState(sessionData)) {
    case "not_started":
    case "no_approver":
      return { variant: "not-started", hint: buildHint, button: { text: "Start this cycle", href: "/decide" } };
    case "in_progress":
      return { variant: "in-progress", hint: buildHint, button: cont };
    case "waiting_for_assurer_assignment":
      return { variant: "waiting", hint: "MHCLG has not assigned your assurer yet. We will tell you when they have." };
    case "with_assurer":
      return {
        variant: "waiting",
        hint: "Your plan is with your assurer. We will tell you when they have reviewed it.",
        link: { lead: "You can book your onboarding calls while you wait.", text: "Book your onboarding calls", href: "/decide/sent" },
      };
    case "feedback_received":
      return { variant: "action-needed", hint: "Your assurer has given feedback on your plan.", button: cont };
    case "reviewed_no_feedback":
    case "ready_to_send":
      return { variant: "action-needed", hint: "Your assurer has reviewed your plan. Send it for approval.", button: cont };
    case "awaiting_approval":
      return { variant: "waiting", hint: "Your plan is with " + (planOf(decide).sentForApprovalTo || approver.name) + " for approval." };
    case "awaiting_recorded_decision":
      return { variant: "action-needed", hint: "Record your Approver’s decision when they have made it.", button: cont };
    case "returned":
      return {
        variant: "action-needed",
        hint: ((decide.approval && decide.approval.by) || approver.name) + " returned your plan. Read why and change it.",
        button: cont,
      };
    case "approved":
      return {
        variant: "completed",
        hint: "Your plan was approved on " + ((decide.approval && decide.approval.date) || "") + ". Your assessments are listed below.",
      };
    default:
      return null;
  }
}

// --- Transitions (each moves the state and sends the emails the Figma panels name) ------------

function names(setup) {
  const people = setup.people || {};
  const a = setup.assurer || {};
  return {
    caf_lead_name: (people.cafLead && people.cafLead.name) || "",
    assurer_name: a.name || "",
    supplier_name: a.organisation || "",
    approver_name: (people.approver && people.approver.name) || "",
  };
}

function cafLeadTo(setup) {
  return { name: names(setup).caf_lead_name, key: "caf-lead" };
}

// D05 "Send to your assurer". N02 to the assurer if one is assigned (D09); otherwise D06.
function sendToAssurer(sessionData) {
  const setup = sessionData.setup;
  const decide = sessionData.decide;
  const plan = planOf(decide);
  plan.sentToAssurer = true;
  plan.assurerReviewed = false;
  plan.sentForApproval = false;
  plan.sentForApprovalTo = "";
  plan.sentOn = todayLabel();
  decide.assurerFeedback = "";
  decide.approval = Object.assign(decide.approval || {}, { decision: "" });
  if (hasAssurer(setup)) {
    setState(decide, "with_assurer");
    sendEmail(sessionData, "N02", { name: setup.assurer.name, key: "assurer" }, names(setup));
  } else {
    setState(decide, "waiting_for_assurer_assignment");
  }
}

// An assurer is assigned to the council (D06 prototype control, or a research scenario). N01 to the
// CAF Lead; if the plan was waiting for one, it goes to them now (N02).
function assignAssurer(sessionData, assurer) {
  const setup = sessionData.setup;
  setup.assurer = Object.assign({ assigned: true }, assurer);
  sendEmail(sessionData, "N01", cafLeadTo(setup), names(setup));
  if (planState(sessionData) === "waiting_for_assurer_assignment") {
    setState(sessionData.decide, "with_assurer");
    sendEmail(sessionData, "N02", { name: setup.assurer.name, key: "assurer" }, names(setup));
  }
}

// D07 "Send to the council". Yes with feedback → N03, D08. No → N04, D10/D10b.
function recordAssurerReview(sessionData, feedback) {
  const setup = sessionData.setup;
  const decide = sessionData.decide;
  const plan = planOf(decide);
  plan.assurerReviewed = true;
  plan.reviewedOn = todayLabel();
  decide.assurerFeedback = feedback || "";
  if (feedback) {
    setState(decide, "feedback_received");
    sendEmail(sessionData, "N03", cafLeadTo(setup), names(setup));
  } else {
    setState(decide, "reviewed_no_feedback");
    sendEmail(sessionData, "N04", cafLeadTo(setup), names(setup));
  }
}

// D08 "Continue with current plan and send for approval".
function continueWithPlan(sessionData) {
  setState(sessionData.decide, "ready_to_send");
}

// D08 "Change plan" or D14 "Change my plan": back to D02 with the current selections.
function changePlan(sessionData) {
  const decide = sessionData.decide;
  const plan = planOf(decide);
  setState(decide, "in_progress");
  plan.sentToAssurer = false;
  plan.sentForApproval = false;
  decide.cycle = decide.cycle || {};
  decide.cycle.confirmed = false;
  decide.approval = Object.assign(decide.approval || {}, { decision: "" });
}

// D10 "Send for approval" (Approver has an account): N05, D27.
function sendForApproval(sessionData) {
  const setup = sessionData.setup;
  const decide = sessionData.decide;
  const plan = planOf(decide);
  const approver = approverOf(setup);
  plan.sentForApproval = true;
  plan.sentForApprovalTo = approver.name || "";
  plan.sentForApprovalInService = true;
  plan.sentForApprovalOn = todayLabel();
  setState(decide, "awaiting_approval");
  sendEmail(sessionData, "N05", { name: approver.name, key: "approver" }, names(setup));
}

// D10b "Record their decision" (Approver has no account): no email; D12.
function startRecordingDecision(sessionData) {
  const setup = sessionData.setup;
  const decide = sessionData.decide;
  const plan = planOf(decide);
  plan.sentForApproval = true;
  plan.sentForApprovalTo = approverOf(setup).name || "";
  plan.sentForApprovalInService = false;
  plan.sentForApprovalOn = todayLabel();
  setState(decide, "awaiting_recorded_decision");
}

// D12 "Record the approval": approved, no email (the CAF Lead already knows).
function recordApproval(sessionData) {
  setState(sessionData.decide, "approved");
}

// D11 approve (D28a, N06) or return (D28b, N07).
function approverDecides(sessionData, decision) {
  const setup = sessionData.setup;
  const decide = sessionData.decide;
  if (decision === "approved") {
    setState(decide, "approved");
    sendEmail(sessionData, "N06", cafLeadTo(setup), Object.assign(names(setup), { approval_date: decide.approval.date }));
  } else {
    setState(decide, "returned");
    sendEmail(sessionData, "N07", cafLeadTo(setup), names(setup));
  }
}

// The Approver was changed in People while the plan waits for a decision. The plan goes to the new
// Approver: D27b (N05 to them) if they use the service, else D12b. N08 tells the previous Approver,
// but only if they were asked in the service (only they were sent N05). Approved plans are not
// affected. Runs on every request, so the change is picked up wherever the person goes next.
function syncApprover(sessionData) {
  const setup = sessionData.setup;
  const decide = sessionData.decide;
  if (!setup || !decide) return;
  const state = planState(sessionData);
  if (state !== "awaiting_approval" && state !== "awaiting_recorded_decision") return;
  const plan = planOf(decide);
  const approver = approverOf(setup);
  if (!plan.sentForApprovalTo || plan.sentForApprovalTo === (approver.name || "")) return;
  const previous = { name: plan.sentForApprovalTo, inService: Boolean(plan.sentForApprovalInService) };
  plan.approverChange = { from: previous.name, to: approver.name || "", usesService: Boolean(approver.hasAccount) };
  plan.previousApprover = previous.name;
  plan.sentForApprovalTo = approver.name || "";
  plan.sentForApprovalInService = Boolean(approver.hasAccount);
  if (approver.hasAccount) {
    plan.sentForApprovalOn = todayLabel();
    setState(decide, "awaiting_approval");
    sendEmail(sessionData, "N05", { name: approver.name, key: "approver" }, names(setup));
  } else {
    setState(decide, "awaiting_recorded_decision");
  }
  if (previous.inService) {
    sendEmail(sessionData, "N08", { name: previous.name, key: "previous-approver" }, { previous_approver_name: previous.name });
  }
}

module.exports = {
  STORED_STATES,
  planState,
  screenFor,
  resumeHref,
  tileFor,
  sendToAssurer,
  assignAssurer,
  recordAssurerReview,
  continueWithPlan,
  changePlan,
  sendForApproval,
  startRecordingDecision,
  recordApproval,
  approverDecides,
  syncApprover,
  isCniFlaggedInSetup,
};
