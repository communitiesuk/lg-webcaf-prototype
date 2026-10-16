# Claim your council — build notes & deviations

Source: Figma `mnOq3QRhTdiliuSuzQoNsX`, page 209:2382 (Claim v3). Stage 1 inventory in
`docs/claim-stage1-inventory.md`; session keys in `docs/claim-session-keys.md`.
Routes: `app/routes/claim.js` (+ `/prototype-sign-in`, `/prototype-scenarios`), registered
after Decide. Example data: `app/data/claim-example-data.js` ("Example data, not real").
Templates: `app/views/pages/claim/*.html`; base layout `app/views/layouts/claim.html`.

## Batch 1 — Find your council (01, 02, 12, 13) + scaffolding

Built: prototype One Login stand-in (`/prototype-sign-in`), scenario switcher
(`/prototype-scenarios`), example-data file, session-keys doc, shared
`components/claim-proposal.njk` (Open-question/Proposal note, toggle default on),
`claim.js` helper (pre/post-access chrome, recognition), and frames 01, 02, 12, 13.

Routes/URLs: `/claim` (entry → 01 if MHCLG link, else 02), `/claim/confirm` (01),
`/claim/find` (02, re-renders as the 12 error state), `/claim/not-in-list` (13).

### GDS conformance
All Claim service screens are built with the **official GOV.UK Design System Nunjucks macros**
(`govukRadios`, `govukSelect`, `govukButton`, `govukErrorSummary`, `govukBackLink`) so the
markup is exactly as the Design System produces it. Patterns applied as GDS intends:
- **01 radios use heading-as-legend** — the H1 is the `<legend>` (page heading), with the
  section caption inside the legend and the descriptive text as the fieldset **hint**. (The
  earlier hand-rolled version had the H1 outside the fieldset plus a visually-hidden duplicate
  legend — removed.)
- **02** uses `govukSelect` (progressively enhanced to the GDS accessible autocomplete) with a
  proper label + hint; the page H1 ("Which council do you work for?") is the page heading and
  "Council name" is the field label (the design separates them).
- Error summary + inline error messages + `govuk-form-group--error` are the standard GDS error
  pattern; page titles carry the "Error:" prefix.

### Deviations (logged)
1. **"Claim" not "Register"** (user decision) — caption "Claim your council" on every screen
   (design drew "Register your council"). Content change, applies through all batches.
2. **Browser `<title>` wired to match the H1** — the kit's title block uses `pageName`, never
   set in this project, so setup/decide/beta all render `<title>GOV.UK</title>`. The Claim
   layout overrides the `pageTitle` block (title matches H1, "Error:" prefix on errors). This
   brings Claim in line with GDS; prototype control pages keep the default title.
3. **01 confirm — added standard required-radio validation** ("Select yes if this is your
   council"). No error frame is drawn for 01; the GDS required pattern was added.
4. **01 intro rendered as the fieldset hint (grey)** rather than black body text as drawn —
   this is the GDS-intended association for descriptive text inside a fieldset.
5. **"My council is not in the list"** is a plain link to the separate page 13 (the mock drew
   a disclosure triangle). Frame 13 is its own page, so a navigating link is correct.
6. **Chrome — "Sign out" inline** with the service name via the standard
   `govukServiceNavigation`; the mock stacked it. The component is used as GDS intends.
7. **Fixed a latent bug:** a duplicate `const councilSelect` in application.js (Claim vs Setup
   S18) was a SyntaxError that disabled *all* autocompletes (Setup/Decide too). Renamed.

### Example data (fictional, "Example data, not real")
Councils: Westborough Borough Council (westborough.gov.uk), Eastvale District Council,
Northmoor County Council, + 5 more for the register. Shared-service domain
novatech-services.co.uk → Westborough + Eastvale + Northmoor (frame 19). Unrecognised
example a.mensah@consultancy-cyber.co.uk. Orgs incl. NovaTech Managed Services.

### Scenarios wired (prototype switcher)
first-to-join, joining-others, unrecognised, domain-matches-many, already-have-access.
(Pending-outcome controls for 07/16/18 come with Batch 3.)

## Batch 2 — Your details + recognised check-answers (03, 14, 04, 05)

Routes: `/claim/your-details` (03, re-renders as the 14 error state), `/claim/check` (04/05 —
one page, inset switches on `flagCouncilHasUsers`). Built with GDS macros (`govukInput`,
`govukInsetText`, `govukSummaryList`, `govukErrorSummary`, `govukButton`, `govukBackLink`).

Routing: 03 Continue → if email **not recognised** → `/claim/how-connected` (08, Batch 4);
recognised → `/claim/check`. 04 (first to join) Confirm → `/claim/pending` (06, Batch 3,
sets `needsReview`/`status=pending`); 05 (joining others) Confirm → `/claim/joined`
(07b, Batch 3, `status=joined`). Verified live across all three branches + the 14 error.

### Deviations (logged)
1. **Name + job title fields start empty** — One Login returns only the email, so the user
   types these. The mock showed illustrative pre-filled values.
2. **No "Change" link on the Email address row (04/05)** — follows the content sheet's explicit
   rationale ("Email has no Change link because it comes from One Login") and the logical model
   (the One Login email cannot be changed mid-claim). **The rendered 04/05 frames show a Change
   link on email** — this conflicts with the content sheet; I chose the content-sheet rationale.
   **Please confirm.**
3. **14 error re-render keeps the recognition inset + email line** (same screen re-rendered);
   the Figma error frame omitted them.
4. **"Claim" wording** on 04/05: "Confirm and claim", "You are the first person from this
   council to claim it. MHCLG will check this claim before you get access." (design said register).
5. Fixed a per-field inline-error bug (Nunjucks `selectattr` returned the wrong field's message);
   the error map is now built in the route.

## Batch 3 — Review + access (06, 07, 07b) + approval control

Routes: `/claim/pending` (06), `/claim/access-granted` (07), `/claim/joined` (07b). Chrome:
06 is pre-access ("signed in, no council"); 07 and 07b switch to the **granted** chrome
(full nav + "Name · Council") via `applyClaimGrantedChrome`. Built with `govukNotificationBanner`
(06), `govukPanel` (07/07b), `govukButton`.

Prototype control on 06: **"Approve this claim"** (`/claim/pending/approve`) → 07. The
**not-approved (16)** and **still-checking (18)** controls arrive with those frames in Batch 5
(the reject/still-checking GET routes exist but their target pages are Batch 5).

Verified live: first-to-join → check → **06** (pre-access) → approve → **07** (full-access);
joining-others → check → **07b** (full-access, "5 people", "Your claim was not checked").

### Deviations (logged)
1. **"Claim" wording:** 06 "We are checking your claim" / "the first person from [council] to
   claim it"; 07/07b panel "Claim complete"; 07 "Anyone else who claims with a recognised email
   address"; 07b "Your claim was not checked by MHCLG". (Design said register/registration.)
2. **"Read the guidance" → the holding page** (`/setup/not-in-this-prototype`) rather than the
   external security.gov.uk, to keep the prototype self-contained.
3. **"Go to your dashboard" → the holding page** (the dashboard is not in this prototype).
4. 06 shows the banner heading **and** an H1 with the same text ("We are checking your claim"),
   matching the design (notification banner + page heading).

## Batch 4 — Unrecognised-email branch (08, 15, 09, 10, 11)

Routes: `/claim/how-connected` (08, re-renders as 15 error), `/claim/which-organisation` (09),
`/claim/contact-support` (10), `/claim/check-unrecognised` (11). Built with GDS macros
(`govukRadios` heading-as-legend on 08, `govukSelect` autocomplete on 09, `govukSummaryList`
on 11). New org autocomplete enhancer in application.js (`data-claim-org-autocomplete`).

Routing (per decision 4 — unrecognised is always reviewed): 03 (not recognised) → 08. From 08:
**directly → 11** (check-answers, no Organisation row); **shared/managed → 09 → 11** (with
Organisation row); **something else → 10** (dead end, "Back to your council" → 02);
**no option → 15** error. 11 Confirm → 06 pending. Verified live across all paths.

### Deviations (logged)
1. **"Claim" wording:** 08 hint "it does not stop you claiming"; 10 "We cannot give you access
   automatically" and "which council you are claiming"; 11 inset "MHCLG will check this claim",
   button "Confirm and claim". (Design said register.)
2. **08 body rendered as the fieldset hint (grey)** under heading-as-legend — the GDS pattern.
3. **08 "directly" routes to 11** (not the drawn 08→03 loop) — the person's details are already
   captured, so they carry on to check-answers and the single review (decision 4).
4. **11 "How you are connected" uses short labels** ("The council directly" / "Shared service or
   managed service provider") — matches the mock's abbreviated shared label.
5. **09 added required validation** ("Enter the name of the organisation you work for") — no error
   frame is drawn; the organisation is a required field. The field is an accessible autocomplete
   that also accepts a typed-in new name (per the hint).
6. **No Change link on the Email row (11)** — matches both the content sheet and the rendered frame.

## Batch 5 — Edge + open states (16, 17, 18, 19)

Routes: `/claim/not-approved` (16), `/claim/already-have-access` (17, granted chrome),
`/claim/still-checking` (18), `/claim/which-council` (19). Built with GDS macros
(`govukNotificationBanner`, `govukButton`, `govukRadios`). The pending control is now fully
wired: approve → 07, **reject → 16**, **sign in again → 18**. 02 → 17 (already has access) and
02 → 19 (domain matches more than one) were routed in Batch 1 and now land on real pages.

### Deviations (logged)
1. **"Claim" wording:** 16 "Your claim was not approved" / "then claim again" / "claim a
   different one" / button "Claim a different council" (but "registered your email domain" kept —
   that is domain registration, not the user's claim); 17 "You claimed this council on [date]" /
   "you can claim that one separately" / "Claim a different council"; 18 "We are still checking
   your claim" / "You claimed [council] on [date]"; 19 H1 "Which council are you claiming for?".
2. **16 carries a Proposal note**, 19 an Open-question note (shared `claim-proposal.njk`): 16 —
   reason wording and challengeability not agreed; 19 — claim once for all vs separately not agreed.
   Frame 19 is built per your decision to build it as a proposal.
3. **19 added required-radio validation** ("Select which council you are claiming for") — no error
   frame is drawn; it is a required question.
4. **19 pre-selects the council the user picked on 02** (the design shows none selected) — reflects
   their prior choice. "I support all of these councils" claims the first matching council as the
   record (`claimsAllCouncils` flag), per the proposal's "once" assumption.
5. **16/18 "Read the guidance" / 17 "Go to your dashboard" → the holding page** (external guidance
   and the dashboard are not in this prototype).

## Stage 2 (build) — COMPLETE

All 19 Claim v3 frames + 07b are built (Batches 1–5), on the official GDS component macros.
Remaining: **Stage 3** — pa11y across all Claim screens, end-to-end walk of every scenario, and
the collated deviations / not-verified / open-question / rules-the-design-does-not-state list.

## Post-build fix — `/claim/find` pre-selects the recognised council

**Reported:** from the `/beta` index, "Join a council already in use" (the `joining-others` scenario)
landed on the **unrecognised** path.

**Cause:** `joining-others` uses a recognised email (`j.hart@westborough.gov.uk`, recognised only for
Westborough) and an independent arrival, so `/claim` → `/claim/find` to pick a council — but with
nothing pre-selected. Picking any council other than Westborough means the email is not recognised
*for that council*, so the flow correctly went to `/claim/how-connected` (08, unrecognised). The
scenario gave no cue to pick Westborough, so it was easy to fall into the unrecognised path.

**Fix (`app/routes/claim.js`, `/claim/find` GET + `renderFind`):** the picker now **pre-selects the
council the signed-in email is recognised for, when there is exactly one** (`councilsForEmail` →
length 1). A recognised user searching for their own council would pick it anyway; this guides the
"joining a council already in use" journey to the right council (still changeable). Zero or many
matches (unrecognised, shared-service) stay blank. Implemented on the native `<select>` option
(`selected`) so it works **without JavaScript**, with the autocomplete showing the council name.

**Verified (no regressions):** joining-others now flows find → your-details → check → **07b joined**;
first-to-join still skips find → confirm; unrecognised stays blank → 08; domain-matches-many stays
blank → 19 which-council; already-have-access pre-selects but still routes to 17.

## Open questions

### Prefilling the name on `/claim/your-details`

**Question raised:** since users arrive via GOV.UK One Login, should "Full name" on
`/claim/your-details` be prepopulated — either from One Login itself, or derived from the sign-in
email address (kept editable)?

**Finding — what One Login gives us:** on the default **authentication-only** integration (email +
password + 2FA), One Login returns a verified **email address and a stable user ID, but no name** —
it never collects one. A name is only available if the service adopts One Login **identity proving**
(prove-your-identity with a passport or driving licence), which returns the person's *legal* name.
For a council-staff service that would be disproportionate and is almost certainly not in scope. The
job title is never from One Login in any case — it is council-specific and always asked.

**Finding — deriving the name from the email is unreliable.** Tested against the prototype's own
example emails:

| Email | Derived name | Reality |
|---|---|---|
| `j.hart@westborough.gov.uk` | "J Hart" | user is **Jo Hart** — wrong |
| `a.mensah@consultancy-cyber.co.uk` | "A Mensah" | initial only — incomplete |
| `sam.okafor@novatech-services.co.uk` | "Sam Okafor" | correct |

Two of the three demo scenarios would prefill a wrong or incomplete name. Real-world emails are
worse (initials `jhart@`, capitalisation `mcdonald`→"Mcdonald" / `oneill`→"Oneill", role mailboxes
`it.security@`, `cafteam@`). A field prefilled with a plausible-but-wrong value is worse than an
empty one: people skim prefilled fields, so bad guesses get submitted and propagate to the approved
plan, audit trail and "signed in as" line. This is the GDS anti-pattern of asking the user to check
work the computer did badly.

**Current behaviour (recommended default, no change):** email is shown (legitimately known); name is
asked once; the field prefills on **return visits** (from our stored `claim.person`) and for
**invited users** (the inviter's typed name, access A13). Job title always asked.

**Decision needed:**
1. Will the service use One Login **identity proving**? If yes, the first-claim name could prefill
   from the verified identity — labelled "from your GOV.UK One Login identity, change if wrong",
   still editable, job title still asked. If no (expected), leave `/claim/your-details` as is.
   This is a service-team / Rosa question.
2. Separately, do we want to **research** the email-derived-name idea? It is defensible only as a
   deliberate research probe (a clearly-labelled "we guessed this from your email, check it is right"
   suggestion), kept behind a scenario so it does not pollute the main walkthrough. Not recommended
   as a shipped default. Not built.
