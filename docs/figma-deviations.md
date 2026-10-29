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
- **Signed-in identity uses what the person typed** — the email entered at Internal Access and the
  name entered in Claim "Your details" are carried through as the signed-in person, instead of the
  hardcoded "Jo Hart". They appear as the nav identity (claim, dashboard, setup, access), as "Me,
  [name]" on the CAF Lead step (A22), and on the confirmation. Pre-seeded demo scenarios with no
  Claim journey still fall back to the seeded persona. A `treatAsRecognised` flag lets a
  participant's own email flow the recognised claim path in the walkthrough.
- **Empty council starts with no CAF Lead confirmed** — `buildSetupSeedEmpty` no longer
  pre-confirms the CAF Lead, so from a fresh claim task 1 "Confirm your CAF Lead" reads "Not
  started" and the dashboard reads "Not started" (0 of 8), not "in progress". Confirming the CAF
  Lead (A22) now writes back to Setup's people state, so the task completes and the dashboard moves
  to "In progress". The populated demo council is unchanged.
- **Empty council starts with an empty people list** — the `/beta/walkthrough` research flow seeds
  an empty Access state (only the signed-in claimant; no other people, pending invitations or audit
  trail), so a brand-new council does not show the demo team (Marcus Webb, Priya Shah, etc.). The
  populated demos keep the full seeded team.
- **Research walkthroughs** (`/beta/walkthrough` and `/beta/walkthrough/:variant`) — clean-session
  links for a brand-new user, dropped at the real start page, so a participant goes start →
  Internal Access → claim, then into one outcome. Listed on `/beta` and `/beta/reset`. Prototype
  controls. The variants:
  - happy path — claim a new council → (prototype "Approve this claim" stands in for MHCLG) →
    access granted → readiness check → dashboard → set up;
  - `already-claimed` — council already in use → "Send request" → request sent (20);
  - `being-checked` — council's first claim awaiting MHCLG → you cannot join yet (22);
  - `already-have-access` — you already have access (17), on the populated/established council (the
    only unhappy path where you actually have access, so the record behind it is real not empty);
  - `not-recognised` — email not recognised → how are you connected (08).
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
- **07** "Access granted" now continues to the optional readiness check (R01) — button changed
  from "Go to your dashboard" to "Continue" → `/readiness`. The check is skippable (Save and
  continue / Skip for now) and both land on the dashboard, where the user continues setup. 07b
  (joining an existing, already-set-up council) still goes straight to the dashboard.
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

---

## Claim simplified around the email domain (27 October)

Team decision (27 Oct): after Internal Access, the service works out the council from the email
domain and the person confirms it. There is no council search in the main journey. People whose
domain is not configured are stopped by Internal Access and never reach the service, so the
unrecognised-email path comes out. For the prototype, `westborough.gov.uk` is the only configured
domain. All reversible — removed journey parts are unlinked, not deleted.

**Start of Claim (screen 01):**
- After Internal Access a person with no access and no invitation lands on **01 "Is this your
  council?"** (not 02 "Which council do you work for?"). The council is filled from the email
  domain in session. Copy: caption **Claim your council**, H1 **Is Westborough Borough Council your
  council?**, body **We matched your email address to this council…**, radios **Yes, this is my
  council / No, this is not my council**, **Continue**. Yes → Your details (03); No → new "not my
  council" page. (Caption kept as "Claim your council" for consistency with the rest of Claim,
  rather than the briefed "Register your council" — team call, flag for Leon.)

**Unlinked (kept for reinstatement if Leon confirms a need):**
- Council search: 02 "Which council do you work for?", its error, and 13 "council not in the list".
  The **Change** link on the Council row of both Check-your-answers pages is removed (name, job
  title stay; email has no Change).
- Unrecognised-email path: 08 "How are you connected", 09 "Which organisation", 10 "Contact
  support", 11 "Check your answers (email not recognised)" and the connection error.

**Modified:**
- **16 "Registration not approved"** body → "MHCLG could not confirm that j.hart@westborough.gov.uk
  is connected to Westborough Borough Council." Removed the "ask IT to register the domain" and
  "wrong council" paragraphs, the "What you can do" heading, and the "Register for a different
  council" button. Kept "If you think this is wrong, email the CAF team at
  cafsupport@communities.gov.uk."

**New pages:**
- **not-my-council** (from "No" on screen 01): caption **Claim your council**, H1 **Your email
  address is set up for a different council**, the two body lines as briefed, secondary **Back** →
  screen 01.
- **Internal Access "You do not have access"** stand-in (`/internal-access/no-access`): blue IA
  header + "not our service" note, H1 **You do not have access**, body **Your email address is not
  set up to use this service.**, **Back**. Shown when the email entered is not on a configured
  domain (`CONFIGURED_DOMAINS = ["westborough.gov.uk"]`). HTML-comment placeholder in the source.

**Research starting points** (walkthroughs on `/beta` and `/beta/reset`): New council claim (first
person) · Joining a council already registered · Council still under review · Already has access ·
**Blocked by Internal Access** (replaces "email not recognised").

**Follow-up cleanup (same change):** removed a stale link and label left from the pre-27-Oct
journey — cannot-join (22) "Try again later" pointed at the removed search (now → screen 01); the
`/beta` Claim index dropped the "New in v6 (workshop proposal)" subtitle and the now-incoherent
"email not recognised" / "matches more than one council" scenario jumps; reset-picker scenario
descriptions corrected (new-user lands on 01, not 02).

### Reference — where each change lives in the code

| Area | Files |
|---|---|
| Confirm-first start + branching | `routes/claim.js`, `views/pages/claim/confirm.html` |
| Unlinked search / unrecognised | `routes/claim.js`, `views/pages/claim/check-answers.html` |
| 16 not-approved copy | `views/pages/claim/not-approved.html` |
| New pages | `views/pages/claim/not-my-council.html`, `views/pages/internal-access/no-access.html` |
| IA domain gate | `routes/internal-access.js` |
| Research starting points + index cleanup | `routes/beta.js`, `views/pages/claim/cannot-join.html` |

---

## Claim v9/v10 — multi-council and approval before a CAF Lead (27 October)

Target: Figma "03 Claim your council · v10 (proposal)" and "02 GOV.UK Internal Access · v4". Decisions
(Rosa Mann, 27 Oct): one person can ask for access to more than one council; MHCLG checks every first
claim and every request for a council the email is not linked to; until a council names its CAF Lead,
the person who registered it approves join requests. All additive/reversible — parked search and
unrecognised pages are left unlinked, not deleted. Captions kept as "Claim your council" (user call),
screen bodies/buttons use the v10 copy exactly.

Journey: Internal Access → 01 → 28 → (29 if Yes) → 03 → 04 / 05 / 24 → 06 / 20(/20b) / 25.

**New screens:**
- **28 Do you need access to any other councils?** (`/claim/other-councils-needed`) — Yes→29, No→03.
- **29 Which other councils do you need access to?** (`/claim/other-councils` + add/remove routes) —
  accessible-autocomplete add, "Councils you have added" summary list with Remove, stored in session.
- **24 Check your answers (more than one council)** (`/claim/check-multi`) — Councils list (Change→29),
  computed inset, "Send requests"→25.
- **25 Your requests** (`/claim/requests`) — per-council status list (Westborough/Eastvale "Being
  checked by MHCLG"; Northmoor "Being checked by MHCLG, then the CAF Lead").
- **20b Request sent, no CAF Lead yet** (`/claim/request-sent-no-caflead`) — names Sam Patel.
- **19 Which councils do you need access to?** (`/claim/which-councils`) — shared-service domain
  (`westvale-shared.gov.uk`, now a configured IA domain) → checkboxes → 03.

**Changed screens:**
- **01** Yes → 28 (the 17 and 22 interrupts still fire first).
- **03** job-title label → "Job title" (and error → "Enter your job title", for consistency).
- **04/05** add Council Change (→01) and an "Other councils / None / Change→28" row; 04 inset reworded
  and button → "Confirm and register"; 05 inset is the new CAF-Lead-or-registered-person copy.
- **07** last paragraph → "Until your council names its CAF Lead, you approve requests…".
- **21/21b** `review-request` shows an extra inset when the reviewer is the person who registered the
  council (no CAF Lead yet); reached via `?as=registered`.
- **23 not-my-council** reworded; primary button "Ask for access to a different council" → 29.
- **17** "one council" line replaced with an "ask for access to another council" link → 29.
- **16** adds an "Ask for access to a different council" button → 29.

**Multi-council request rules (decision, 27 Oct):** from the main flow (28→29) requests = matched
council + added ones; reached from 17/23/16 ("ask for another council", via `/claim/ask-another-council`)
requests = only the added councils. The 24 inset and 25 statuses are exact for the fixed research
scenario (Westborough + Eastvale + Northmoor); other councils default to "Being checked by MHCLG".

**Research starting points:** 10 walkthroughs/links on `/beta` + inspect links for 20/20b/21/21b/22/24/25/28/29.

### Reference — where each change lives in the code

| Area | Files |
|---|---|
| Multi-council routes + helpers | `routes/claim.js` |
| New screens | `views/pages/claim/{other-councils-needed,other-councils,check-answers-multi,requests-sent,request-sent-no-caflead,which-councils}.html` |
| Changed screens | `views/pages/claim/{confirm,your-details,check-answers,not-my-council,already-have-access,not-approved,access-granted,review-request}.html` |
| Shared-service domain | `data/claim-example-data.js`, `routes/internal-access.js` |
| Starting points | `routes/beta.js`, `routes/internal-access.js` |

---

## Claim v12 — register, approver roles, approver's request list (28 October)

Target: Figma "03 Claim your council · v12" and "02 GOV.UK Internal Access · v5". Mostly copy updates
plus two new screens on the v10 base. Captions kept as "Claim your council" (user call); v12 bodies,
panels and buttons use the exact "register/registration" copy. 06 kept as "checking your claim".

**New screens:**
- **00 Register your council** (`/claim/start`) — intro after Internal Access; Continue → 01, or 19
  for the shared-service domain. No caption, no back link.
- **30 Requests to join** (`/claim/requests-to-join`) — the approver's (Priya Shah) list of 3 waiting
  requesters (Jo Hart, Alex Morgan, Chris Lee), each with a Review link → 21.

**Changed:**
- **05** — split into two exact insets (CAF-Lead-named / no-CAF-Lead names Sam Patel); the people
  count is removed.
- **21/21b** — radios now **Full access / Collaborator** under "What role should they have?" with the
  role descriptions; approving (either role) → **07b**; the registered-person inset gains a sentence.
  Personas realigned: **Priya Shah = CAF Lead approver, Sam Patel = registered person**; requesters on
  30 = Jo Hart / Alex Morgan / Chris Lee.
- **22** — rewritten: "We have saved your request" + new body; keep the Important banner; drop
  "Try again later".
- **07** — "Registration complete" + "You can now:" list + "Being the first to register does not make
  you CAF Lead". Button "Go to your dashboard" keeps the optional readiness step (earlier decision),
  so it routes via `/readiness`.
- **07b** — "Request approved / You have joined Westborough", names Priya Shah + the Collaborator role,
  no count.
- **19** — adds "I need access to a council that is not listed" → 29.
- **24** — Councils "Change" → 19 for the shared-service domain, else 29.
- **IA7 no-access** — rebuilt to match the real GDS Internal Access page: GOV.UK Internal Access header
  with Sign out, Dashboard/Support nav, red "No access" banner, caf@localdigital.gov.uk, Try again /
  SSO dashboard links. No WebCAF branding (the prototype "not our service" note is dropped on this page).
- **27 Choose a council** — unlinked; members with more than one council now land on the dashboard.

**Research starting points:** 13 on `/beta` (walkthroughs + direct screen links for 30/21b/07/07b).

### Reference — where each change lives

| Area | Files |
|---|---|
| 00 intro + start routing | `routes/claim.js`, `views/pages/claim/register-start.html` |
| 30 approver list + 21/21b roles | `routes/claim.js`, `views/pages/claim/{requests-to-join,review-request}.html` |
| 05 / 22 / 07 / 07b / 19 / 24 copy | `views/pages/claim/{check-answers,cannot-join,access-granted,joined,which-councils,check-answers-multi}.html` |
| IA7 GDS page | `views/pages/internal-access/no-access.html`, `assets/sass/application.scss` |
| 27 unlink + landing | `routes/internal-access.js` |
| 13 starting points | `routes/beta.js` |

---

## Claim v13 — domain linked to more than one council (29 October)

Small delta on v12. Screen 19 now opens for **any** email domain linked to more than one council —
a shared-service domain, or a council's own domain that also covers partner councils.

- **Domain data** — added `eastvale.gov.uk` → [Eastvale, Northmoor] (the two share IT). The domain
  map already supports one-domain-to-many and one-council-to-many-domains; `/claim/start` already
  routes any email matching more than one council to 19, so this mapping is all that was needed.
- **19 copy** — body changed to "Your email address is linked to more than one council. Select all
  the councils you need access to." The screen lists the councils linked to the signed-in domain
  (3 for westvale-shared.gov.uk, 2 for eastvale.gov.uk).
- **Starting points** — added **3a** on `/beta`: council's own domain covering a partner council
  (type d.rao@eastvale.gov.uk → 19).

Files: `data/claim-example-data.js`, `views/pages/claim/which-councils.html`, `routes/beta.js`
(and a one-line comment in `routes/claim.js`).

---

## Setup "Set up your council" — full content sync to Figma v4/v7 (29 October)

Unlike the entries above (which record prototype changes **ahead of** Figma), this is the
reverse: a verbatim content sync bringing the Setup section **in line with** the current
Figma ("07 Set up your council · v7", page node `481:2290`). Every designed screen frame was
screenshotted, diffed against the prototype, and the copy updated to match — H1s, intros,
hints, field labels, button text, inset/consequence/banner copy — plus the matching route
`pageTitle`s. Committed in ten waves (`85067ea` → `f54107c`).

**Screens synced:** S01, S04, S05, S09, S10, S10b, S12c, S13, S14, S15, S16, S17, S18, S19,
S20, S21, S23, S24, S27, S30, S31, S35, S36, S38, S39, S41, S42, S45, S46, S47, S48, S49, S50.
Already matching (no change): S02a, S02b, S03, S28, S29, S32, S40, S51.

### Deviations from Figma deliberately kept (do NOT revert in Figma sync)

These are user decisions that the current Figma does **not** reflect — Figma should be
updated to match the prototype, not the other way round:

- **S02 "Your sector context"** — keeps the long organisational-context content (mission,
  objectives, threat actors, consequences). Figma shows the short summary only.
- **S03 council-context** — the "Local Government Reorganisation (LGR)" checkbox is removed
  (work paused). Figma still shows it.
- **S03 CNI / OT dropdowns** — populated with realistic options plus a "None" choice. Figma
  shows placeholders ("Select a sector" / "Option list not yet agreed").
- **S29 recovery requirements** — the "Under review / This page may not stay here" banner is
  removed. Figma still shows it.
- **S12c add-platform** — the "who manages it? is a v6 proposal" note is removed (the shared
  `setup-proposal.njk` component is globally disabled anyway).
- **S15 supplier inset** — uses "You will decide whether to **include** it in a separate step"
  instead of Figma's "whether it is **in scope**" (content-design steer: avoid "scope").

### Content decisions taken during the sync

- **"five lens" (no hyphen)** everywhere, following the content review (Holly/Isabel) over
  Figma's mixed "five-lens"/"five lens". Applied to S04, S05 and the S01 task-3 hint.
- **S31 button "Choose what to assess"** — used Figma's label even though it links to the
  section branded "Decide what to assess" elsewhere. Flagged: button vs section-name mismatch.
- **S04 methodology** restructured so the two explanatory paragraphs sit above the radios
  (were a radio hint); radios now carry a visually-hidden legend. **S05** re-added its inset
  per v7 (an earlier build had moved that content to S04).

### Figma frames that are internally inconsistent (followed the canonical frame)

Where a screen's primary and secondary frames disagree, the prototype follows the primary
one; the secondary Figma frame is stale and should be updated:

- **S30 vs S30a** — primary "Your people / Your organisational context"; error frame drops
  the "Your". Followed primary.
- **S36 vs S50** — hub button "Add an essential service" (S36); success frame S50 still shows
  "Add a service that is not on the list". Followed S36 (shared template).
- **S09/S41 vs S32/S51** — primary buttons "Add this service" / "Add this supplier"; error
  frames still show "Save and continue" / "Add". Followed the primary frames.
- **S04 vs S30** casing — "GovAssure **five lens** Model" (S04) vs "GovAssure **Five Lens**
  Model" (S30 summary). Both are straight from Figma; left as-is.

### Parked (not built)

- **S43 "Is this a system we already hold an assessment for?" (MHCLG records)** — marked
  "Parked, not part of the current design" in Figma; no route or view in the prototype.

### Bug fixed during the sync

- A literal `&rsquo;` passed into `appPageHeader` on S20 would have rendered as the raw text
  `&rsquo;` (the macro autoescapes); replaced with a real apostrophe.
