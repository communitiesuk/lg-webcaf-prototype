# Figma deviations — build changes not yet in the designs

Changes made in the GOV.UK prototype (during build and UX testing) that go beyond the
current Figma designs. Use this to bring Figma back in sync. Each is a **prototype
deviation pending design sign-off**.

Figma file: `mnOq3QRhTdiliuSuzQoNsX`. Convention: each screen has a "Content" frame
holding verbatim copy and a journey block.

## Summary

**New screen (not in Figma):**
- Decide — CNI remove confirmation

**Modified screens (new states/elements):**
- Decide D09 "sent" — confirmation panel
- Setup S30 "Check your setup" — 3-state people rows + finish-setup error state + reworded inset
- Access A09 "Invitation sent" — "Back to your setup" button
- Setup S01 task list — "In progress / invitation sent" state on tasks 1 and 7
- Get started G11 "Give feedback" — error state
- Access A13 "Check your details" — error state + "(optional)" job title
- Access A05/A19 "Who do you want to invite" — name now required
- Setup S04 "methodology" — external five-lens guidance link in the details
- Setup S30 "Check your setup" — read-only view variant when setup is already complete
- Decide D09 "sent" — onboarding Book/Update wired to the Assurance booking journey (shared data, round-trips, returns to D09); both calls start not-booked

**Journey / routing only (no new screens — update flow arrows and notes):**
- Approver & CAF Lead change/task links return to Setup; invite path records a pending person
- Claim end pages, Decide "nothing left"/"no assurer", Setup complete → real Dashboard (were stubs)
- Decide "Review your critical systems" → Setup, with a route back to Decide

---

## Prompt to recreate in Figma

```
Update the Local Government WebCAF prototype Figma (file mnOq3QRhTdiliuSuzQoNsX)
to match beyond-design changes made in the GOV.UK prototype during build and UX
testing. Use GOV.UK Frontend components and the file's existing convention: each
screen has a "Content" frame beside it holding verbatim copy and a journey block.
Mark every change below with a note "Changed in build — prototype, pending design
sign-off" so it's clear these originated in code, not agreed design.

=== NEW SCREEN ===

1. Decide — "Remove a CNI designation" (confirmation), sits between D26 "CNI
   systems" and the removal. Create it because removing a CNI flag was a one-click
   destructive action with no confirmation; it now matches every other remove in
   the service (confirm page then remove).
   - Caption: the system name (e.g. "Urban traffic control")
   - H1: "Are you sure you want to remove [system name] as critical national
     infrastructure?"
   - Body (govuk-body): "This removes the CNI designation from [system name]. The
     system stays in your council record, and you can add it back as CNI later."
   - Buttons: "Yes, remove it" (warning/red), "Cancel" (secondary)
   - Back link and Cancel both return to the CNI systems list (D26).
   - Journey: FROM D26 "Remove"; NEXT back to D26 (removed, or cancelled).

=== MODIFIED SCREENS ===

2. Decide D09 "Your plan has been sent" / "Book your onboarding calls":
   Add a GOV.UK confirmation panel (green) at the very top:
   - Panel title: "Plan sent to your assurer"
   - Demote "Book your onboarding calls" from H1 to an H2 section heading below
     the panel.
   - Remove the old opening sentence "Your plan has been sent to your assurer."
     from the body (the panel now says it). Keep the rest of the booking content
     and the "Continue" button.
   Reason: the send action was unacknowledged — the page jumped straight to booking.

3. Setup S30 "Check your setup" — the People section now has richer states:
   - CAF Lead and Approver rows each show ONE of:
       "[Name], confirmed"  |  "[Name], invitation sent"  |  "Not confirmed yet"
   - Reword the completion inset to: "Setup is only complete once a CAF Lead and
     an Approver have been named."
   - ADD an error state for this screen: clicking "Confirm and finish setup" when
     a person is not named shows a GOV.UK error summary ("There is a problem")
     linking to that row, with messages "Confirm your CAF Lead before you finish
     setup" and/or "Confirm your Approver before you finish setup". Title gains
     the "Error:" prefix.
   Reason: the Approver is now confirmed as a real Setup step (recorded = confirmed,
   invited = pending), and finishing is gated on both people being named.

3a. Setup S30 also has a READ-ONLY VIEW variant: when reached after setup is
   complete (from the dashboard "Your council record -> Setup -> View"), it shows
   the same summary with Change links but NO "Confirm and finish setup" button,
   and the back link returns to the dashboard. During setup (not yet complete) it
   is the pre-finish check as normal. Note: the dashboard R04 "View" link was
   corrected to point at S30 (the setup summary), per the Figma journey "View
   setup -> S30"; it previously went to S31 "Setup complete" (the done-page).

4. Access A09 "Invitation sent": add a primary button "Back to your setup" shown
   ONLY when the invite was started from Setup (naming an Approver or new CAF Lead).
   The existing "Invite someone else" and "Back to people and governance" become
   secondary.

5. Setup S01 task list: tasks "1. Confirm your CAF Lead" and "7. Confirm your
   Approver" can now show an "In progress" tag (meaning an invitation has been
   sent and acceptance is pending), in addition to Completed / Not started.

6. Get started G11 "Give feedback": add an error state — submitting with an empty
   message shows an error summary + inline "Enter your feedback", title "Error:".

7. Access A13 "Check your details": name is now required — add an error state
   ("Enter your name"). Label the job title field "Your job title (optional)".

8. Access A05/A19 "Who do you want to invite": the name field is now required —
   the A19 error state should include "Enter their name" alongside the email and
   role errors.

8a. Setup S04 "How will you identify your essential services and critical systems":
   inside the "What is the five-lens approach?" details, add a link
   "Read the five-lens approach guidance (opens in new tab)" to
   https://www.security.gov.uk/policy-and-guidance/cyber-assessment-framework-caf-for-local-government/prepare/five-lens-approach/
   (opens in a new tab). Keeps the existing explanatory sentence above it.

=== JOURNEY / ROUTING UPDATES (no new screens — update arrows and journey notes) ===

9. From S30 "Check your setup" (and the S01 task list), the CAF Lead and Approver
   "Change"/"Confirm" links go into Access (A22 / A29) carrying a return, so that
   recording or confirming a person returns the user to Setup. If the user invites
   the person (A29 "needs an invitation" / A22 "someone new" -> A05 invite flow),
   the invitation is sent, the person is recorded as PENDING in Setup, and A09
   returns them to Setup via the new "Back to your setup" button.

10. Claim end pages ("Claim complete" / "Joined" / "You already have access"):
    the "Go to your dashboard" button goes to the real Dashboard (not a holding
    stub).

11. "Back to your dashboard" on Decide "Nothing left to assess", Decide "Waiting
    for your assurer", and Setup "Setup complete" goes to the real Dashboard.

12. Decide "Nothing left to assess": "Review your critical systems" goes to the
    Setup critical-systems list with a route back to this Decide page.

13. Decide D09 "Book your onboarding calls": the "Book"/"Update" link on each
    onboarding call goes to the Assurance activities booking journey for that
    activity (onboarding-org / onboarding-systems), carrying a return so the user
    comes back to D09 after booking. Booked status is shared with the Assurance
    section (single source of truth), so a booking made in either place shows in
    both. D09 now starts with both calls "Not booked yet" (the mock drew the
    critical-systems call pre-booked), which reads as "you have just sent, book now".

For each, add the "Changed in build — prototype, pending design sign-off" note.
```

---

## Reference — where each change lives in the code

| # | Change | Files / commit |
|---|---|---|
| 1 | CNI remove confirmation | `pages/decide/cni-remove.html`, `routes/decide.js` · `d4ce000` |
| 2 | D09 confirmation panel | `pages/decide/sent.html`, `routes/decide.js` · `27a82fa` |
| 3 | S30 states + error + inset | `pages/setup/check-your-setup.html`, `routes/setup.js`, `helpers/setup.js` · `e06b493`, `58565a2` |
| 3a | S30 read-only view when complete + R04 "View" → S30 | `pages/setup/check-your-setup.html`, `routes/setup.js`, `pages/dashboard/_ready-to-decide.html` |
| 4 | A09 "Back to your setup" | `pages/access/invite-sent.html`, `routes/access.js` · `58565a2` |
| 5 | S01 task "In progress" | `helpers/setup.js` · `58565a2` |
| 6 | G11 feedback error | `pages/getstarted/feedback.html`, `routes/get-started.js` · build commits |
| 7 | A13 error + optional | `pages/access/accept-confirm-name.html`, `routes/access.js` · build commits |
| 8 | A05/A19 name required | `pages/access/invite-who.html`, `routes/access.js` · build commits |
| 8a | S04 five-lens guidance link | `pages/setup/methodology.html` |
| 9 | Return-to-Setup + pending invite | `routes/access.js`, `routes/setup.js`, `helpers/setup.js` · `77e3972`, `58565a2`, `c5e4afd` |
| 10 | Claim → Dashboard | `pages/claim/{access-granted,joined,already-have-access}.html` · `58565a2` |
| 11 | Dashboard dead-ends | `pages/decide/{systems-nothing-left,no-assurer}.html`, `pages/setup/complete.html` · `58565a2`, `c5e4afd` |
| 12 | Decide → critical-systems return | `pages/decide/systems-nothing-left.html`, `routes/setup.js` · `58565a2` |
| 13 | D09 onboarding → Assurance booking journey (unified + return) | `routes/decide.js`, `routes/assurance.js`, `pages/assurance/{before-you-book,update-activity}.html`, `pages/decide/sent.html`, `data/seed/setup.js` · `2e806e0`, `064edf7` |

---

## Claim v6 and Internal Access build (20 October)

Built "02 GOV.UK Internal Access · v1" (node `510:1651`) and "03 Claim your council · v6"
(node `525:2`). Most screens are faithful rebuilds of those Figma pages; the items below are
the **build-only deviations pending design sign-off**. Sign-in changed from GOV.UK One Login to
GDS Internal Access, which only authenticates — WebCAF decides where the person lands.

**Built from Figma (no deviation, for reference):** IA1 enter email, IA2 enter one-time code,
IA3 continue; Claim 20 request sent, 21 review a request to join, 22 you cannot join yet; and the
v6 copy on 05 check answers (joining), 07 access granted, 07b request approved, 17 already have
access, 19 which council.

**New in build (not in Figma — add to Figma):**
- **Internal Access prototype note** — a yellow "GOV.UK Internal Access. Not our service: we do
  not design this page." strip on IA1–IA3, marking them as a stand-in. Blue IA header + plain
  footer to look like Internal Access, distinct from WebCAF chrome.
- **`/beta/reset` "Reset the prototype" control page** — a sign-in scenario picker (invited /
  has access / new user / claim pending / claim rejected / council being checked), a "Clear all
  prototype data" action, and a "View as the CAF Lead" link. Prototype control, not service copy.
- **`/beta/walkthrough` one-link research journey** — a clean-session link for a brand-new user,
  dropped at the real start page, so a participant goes start → Internal Access → claim a council
  → (prototype "Approve this claim" stands in for MHCLG) → access granted → dashboard → set up,
  end to end. Seeds an empty council so Setup is built from scratch. Prototype control.
- **21 "Approve + Full access" confirmation** — a CAF-Lead-facing "Request approved" page. Figma
  21's arrow points to 07b (the joiner's screen); the brief asked for a CAF-Lead confirmation, so
  this is a separate page. 07b stays reachable for the joiner's view.
- **21 "Reject" placeholder** — a "This page has not been designed yet" page; the reject reason
  screen and the emails are not designed.

**Modified / routing (update arrows and notes):**
- **Sign-in replaced** — every "GOV.UK One Login" link and mention in Get started, Claim and
  Access management now points to / names Internal Access. The old One Login stand-in screen is
  left untouched but no longer linked.
- **Routing after Internal Access (proposal)** — decided by WebCAF user state: pending invitation
  → A13 then their task; membership → dashboard (R10 if more than one council); claim pending →
  06; claim rejected → 16; otherwise Claim 02. Invitation beats membership.
- **05 "Send request"** no longer joins instantly — it raises a request to the CAF Lead (20).
  Email-domain matching only suggests councils; it never creates membership.
- **07b** reached after approval (not after an instant join); names the approver in the body.
- **19** "I support all of these councils" option removed; **17** "Claim a different council"
  button removed (one council per person for now).
- **"Switch council" removed** from the service navigation on every section (Setup,
  Readiness/Dashboard, Decide, Claim). R10 `/choose-council` kept as a parked toggle.

**Placeholders / wording to confirm:**
- Get started "Before you start" bullet reworded to Internal Access ("to sign in with Internal
  Access, using that email address and a one-time code") — NOT verified against Get started v5 /
  Access management v5 Figma copy.
- Approver named "Jo Hart", demo joiner "Priya Shah" — who approves before a CAF Lead is named is
  not decided (built as the first claimant approves).
- Terminology: aligned to "claim / claimed" throughout (20 October decision), not the Figma v6
  panels' "registration / registered". The distinct "request to join" wording (the join-approval
  model on 05/20/21) is kept — it is a different action from claiming a council. Figma panels that
  say "registration" (07 "Registration complete", 17 "registered", 06/16) should be updated to
  "claim" to match.

### Reference — where each change lives in the code

| Area | Files |
|---|---|
| Internal Access screens + chrome | `routes/internal-access.js`, `views/layouts/internal-access.html`, `views/pages/internal-access/{email,code,continue}.html`, `assets/sass/application.scss` |
| Reset scenario picker | `routes/beta.js`, `views/pages/beta/reset.html`, `views/pages/beta.html` |
| One Login → Internal Access | `routes/get-started.js`, `routes/claim.js`, `views/pages/getstarted/{service-start,signed-out}.html`, `views/pages/claim/your-details.html`, `views/pages/access/{invite-sent,invitation-email,accept-signin}.html` |
| Claim 05/07/07b/17/19 copy | `views/pages/claim/{check-answers,access-granted,joined,already-have-access,which-council}.html`, `routes/claim.js` |
| Claim 20/21/22 + review outcomes | `views/pages/claim/{request-sent,review-request,review-request-approved,review-request-rejected,cannot-join}.html`, `routes/claim.js` |
| "Switch council" removed from nav | `data/helpers/{setup,readiness,decide,claim}.js` |
