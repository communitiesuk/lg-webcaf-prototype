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

For each, add the "Changed in build — prototype, pending design sign-off" note.
```

---

## Reference — where each change lives in the code

| # | Change | Files / commit |
|---|---|---|
| 1 | CNI remove confirmation | `pages/decide/cni-remove.html`, `routes/decide.js` · `d4ce000` |
| 2 | D09 confirmation panel | `pages/decide/sent.html`, `routes/decide.js` · `27a82fa` |
| 3 | S30 states + error + inset | `pages/setup/check-your-setup.html`, `routes/setup.js`, `helpers/setup.js` · `e06b493`, `58565a2` |
| 4 | A09 "Back to your setup" | `pages/access/invite-sent.html`, `routes/access.js` · `58565a2` |
| 5 | S01 task "In progress" | `helpers/setup.js` · `58565a2` |
| 6 | G11 feedback error | `pages/getstarted/feedback.html`, `routes/get-started.js` · build commits |
| 7 | A13 error + optional | `pages/access/accept-confirm-name.html`, `routes/access.js` · build commits |
| 8 | A05/A19 name required | `pages/access/invite-who.html`, `routes/access.js` · build commits |
| 8a | S04 five-lens guidance link | `pages/setup/methodology.html` |
| 3a | S30 read-only view when complete + R04 "View" → S30 | `pages/setup/check-your-setup.html`, `routes/setup.js`, `pages/dashboard/_ready-to-decide.html` |
| 9 | Return-to-Setup + pending invite | `routes/access.js`, `routes/setup.js`, `helpers/setup.js` · `77e3972`, `58565a2`, `c5e4afd` |
| 10 | Claim → Dashboard | `pages/claim/{access-granted,joined,already-have-access}.html` · `58565a2` |
| 11 | Dashboard dead-ends | `pages/decide/{systems-nothing-left,no-assurer}.html`, `pages/setup/complete.html` · `58565a2`, `c5e4afd` |
| 12 | Decide → critical-systems return | `pages/decide/systems-nothing-left.html`, `routes/setup.js` · `58565a2` |
