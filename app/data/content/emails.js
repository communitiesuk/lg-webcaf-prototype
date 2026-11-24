// app/data/content/emails.js
//
// GOV.UK Notify email content for Decide (Figma "08 Decide what to assess · v8", row
// "Emails (GOV.UK Notify)", N01 to N08). Draft content, not reviewed by content design.
// Placeholders use Notify style ((name)) and are filled from the record's personalisation when the
// email is shown. ((service_link)) is the email's link; it always goes through the /go resolver.
// Emails never carry plan details: no feedback text, no reasons, no system names (Q10).

const EMAILS = {
  N01: {
    recipientRole: "CAF Lead",
    subject: "Your CAF assurer has been assigned",
    greeting: "Dear ((caf_lead_name)),",
    paragraphs: [
      "((assurer_name)) from ((supplier_name)) is now the assurer for ((council_name)).",
      "They will review your council’s setup and your plan for this cycle, and work with you through assurance.",
    ],
    linkLine: "Sign in to see what to do next: ((service_link))",
  },
  N02: {
    recipientRole: "assurer",
    subject: "A CAF plan is ready for you to review",
    greeting: "Dear ((assurer_name)),",
    paragraphs: [
      "((council_name)) has sent you the plan for what it will assess this cycle.",
      "Review the council’s setup and plan, then tell the council whether you have any feedback. You are not approving the plan.",
    ],
    linkLine: "Sign in to review the plan: ((service_link))",
  },
  N03: {
    recipientRole: "CAF Lead",
    subject: "Your assurer has given feedback on your CAF plan",
    greeting: "Dear ((caf_lead_name)),",
    paragraphs: [
      "((assurer_name)) from ((supplier_name)) has reviewed the plan for what ((council_name)) will assess this cycle and has given feedback.",
      "Their feedback is advice, not a requirement. You can change your plan or continue with it.",
    ],
    linkLine: "Sign in to read the feedback and choose what to do next: ((service_link))",
  },
  N04: {
    recipientRole: "CAF Lead",
    subject: "Your assurer has reviewed your CAF plan",
    greeting: "Dear ((caf_lead_name)),",
    paragraphs: [
      "((assurer_name)) from ((supplier_name)) has reviewed the plan for what ((council_name)) will assess this cycle. They have no feedback.",
    ],
    linkLine: "Sign in to send your plan for approval: ((service_link))",
  },
  N05: {
    recipientRole: "Approver",
    subject: "A CAF plan is waiting for your approval",
    greeting: "Dear ((approver_name)),",
    paragraphs: [
      "((caf_lead_name)) has asked you to approve what ((council_name)) will assess this cycle under the Cyber Assessment Framework (CAF).",
      "You are approving the whole plan, not each separate assessment. You can approve it, or return it with a reason.",
    ],
    linkLine: "Sign in to review and decide: ((service_link))",
  },
  N06: {
    recipientRole: "CAF Lead",
    subject: "Your CAF plan has been approved",
    greeting: "Dear ((caf_lead_name)),",
    paragraphs: [
      "((approver_name)) approved the plan for what ((council_name)) will assess this cycle on ((approval_date)).",
      "You can now prepare for your assessments.",
    ],
    linkLine: "Sign in to see what to do next: ((service_link))",
  },
  N07: {
    recipientRole: "CAF Lead",
    subject: "Your CAF plan has been returned",
    greeting: "Dear ((caf_lead_name)),",
    paragraphs: [
      "((approver_name)) has returned the plan for what ((council_name)) will assess this cycle and has given a reason.",
      "Change your plan and send it for approval again.",
    ],
    linkLine: "Sign in to read the reason and change your plan: ((service_link))",
  },
  N08: {
    recipientRole: "previous Approver",
    subject: "You no longer need to approve a CAF plan",
    greeting: "Dear ((previous_approver_name)),",
    paragraphs: [
      "((council_name)) has changed its Approver. You no longer need to approve the plan for what it will assess this cycle.",
      "You do not need to do anything.",
    ],
    linkLine: "", // N08 has no link
  },
  // Claim v15 (pass 2, 24 November 2026). DRAFT, not in Figma: the shortest plain version, written in
  // the build for Michael to draw. No council data beyond the council name and the people's names.
  N09: {
    draft: true,
    recipientRole: "person invited to be CAF Lead",
    subject: "You have been named CAF Lead for ((council_name))",
    greeting: "Dear ((nominee_name)),",
    paragraphs: [
      "((claimant_name)) has named you as the CAF Lead for ((council_name)) in the service for the CAF for local government.",
      "The CAF Lead sets up the council in the service and decides who else can use it. If you are not the CAF Lead, sign in and tell us.",
    ],
    linkLine: "Sign in to accept: ((service_link))",
  },
  N10: {
    draft: true,
    recipientRole: "person who registered the council",
    subject: "Your CAF Lead has accepted",
    greeting: "Dear ((claimant_name)),",
    paragraphs: [
      "((nominee_name)) has accepted. They are now the CAF Lead for ((council_name)).",
      "They decide who can use your council record.",
    ],
    linkLine: "Sign in to see what happens next: ((service_link))",
  },
  N11: {
    draft: true,
    recipientRole: "person who registered the council",
    subject: "((nominee_name)) is not your CAF Lead",
    greeting: "Dear ((claimant_name)),",
    paragraphs: [
      "((nominee_name)) told us they are not the CAF Lead for ((council_name)), so we have cancelled the invitation.",
      "You need to name your council’s CAF Lead before anyone can use your council record.",
    ],
    linkLine: "Sign in to name your CAF Lead: ((service_link))",
  },
};

const EMAIL_FROM = "Assess and manage your council’s cyber resilience";
const EMAIL_FOOTER = ["Assess and manage your council’s cyber resilience", "Ministry of Housing, Communities and Local Government"];

module.exports = { EMAILS, EMAIL_FROM, EMAIL_FOOTER };
