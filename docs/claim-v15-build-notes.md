# Claim v15 build notes (pass 2), 24 November 2026

Branch `beta-3`. Sources:
- Figma "03 Claim your council · v15 (CAF Lead nomination)" (`275:35`).
- The copy from its content review page, "v15 (content review)) 2" (`352:11367`). The panels on the two pages are identical; the review changed screen copy only.

This build replaces the v14 model (D-2026-122, D-2026-127), which is superseded by D-2026-154.

## Registration state model

`app/data/helpers/registration.js` holds the state model, and `sessionData.registration` stores it. The record belongs to the council, so signing out keeps it. Signing out also keeps the council record once a CAF Lead is in place.

| State | Claimant sees | Council record |
|---|---|---|
| `submitted` | 06, then 18 | none |
| `not_approved` | 16 | none |
| `approved_no_lead` | 07 → 31 | none |
| `lead_is_claimant` | 37 → S01 (task 1 Completed) | the claimant is CAF Lead |
| `invitation_sent` | 33, then 35 | none |
| `invitation_held` | 34 | none |
| `lead_confirmed` | 35, saying the nominee accepted (no access) | the nominee is CAF Lead |
| `nominee_declined` | 36 → 31 | none |

- **Guard (`app/routes/registration.js`).** The claimant, or anyone acting as the CAF Lead before there is one, is sent to their holding page from:
  - the dashboard, Setup, People and Decide;
  - assessments and assurance activities;
  - readiness;
  - 30 and 21.

  The guard only applies when a registration exists, so the example council and the Setup research scenarios are unchanged.
- **Council record.** It is created only on 31 "Me", on 32 with the claimant's own email, or when the nominee accepts on A24.
- **Approval gives no access.** 07 no longer creates Setup, Decide or Access, and has no service navigation.
- **Removed:** 21b and the v14 "first registrant approves" path. That covers the `?as=registered` route option, the inset on 21, the 05 and 20b copy, the 07 bullets, and the research links.
- **Who is signed in (prototype only).** The person switcher has two new people: "claimant" and "nominee". A "joiner" key covers a colleague who signs in to ask to join; it never appears in the switcher.
- **Sign-in.** Internal Access routes the claimant to the page for their state and the nominee to A24. Anyone else at the registered council goes through the joining journey, and their request is held.

## Choices made in the build (tell Michael)

1. **A24 has no Accept button in Figma.** The nominee accepts by arriving on A24 after signing in, which matches the A24 banner "named you CAF Lead".
   - "This is not me" → A25 → Yes declines. The council record is removed and the claimant gets N11.
   - N10 is therefore sent on arrival. If the nominee then declines, the claimant gets N10 and then N11.
2. **Additions, not in Figma:**
   - 35 after the nominee accepts: "Your CAF Lead has accepted".
   - The page a nominee sees after declining, or when opening a cancelled invitation.
   - On A24: "[n] people are waiting for you to review their request to join", and "Go to your dashboard".
3. **32 empty email.** The message "Enter your CAF Lead's email address" was written to match the reviewed name message. The panel says "Enter their email address".
4. **31 and 31e hint.** The review changed the two differently. The 31 version is built: "They will set up your council in this service and decide who else can access it".
5. **32 and 32e.** The review only edited 32e. Its copy is used for both: "this digital service", and "Use your CAF Lead's work email address" (capital L corrected).
6. **Other review copy changed in the build:**
   - 06 keeps "What happens next".
   - 20's banner keeps "has decided."
   - 37 says "your council has previously submitted".
   - 18 gains the comma after "will be".
   - 07b uses "they" instead of "she", because the approver's name now comes from the record.
7. **Support address.** cafsupport@… is now caf@localdigital.gov.uk everywhere in the prototype.
8. **Built for the first time:**
   - **26** ("Your email address is not linked to a council yet"). The prompt listed it as built, but it never was. It is reached from the screens list only; Internal Access stops these addresses before WebCAF.
   - **07b** now uses the panel drawn in Figma.

## Emails (DRAFT, not in Figma)

All three are in `app/data/content/emails.js` and marked DRAFT on their email page.

- **N09 to the nominee.** Subject: "You have been named CAF Lead for ((council_name))".
  > ((claimant_name)) has named you as the CAF Lead for ((council_name)) in the service for the CAF for local government. The CAF Lead sets up the council in the service and decides who else can use it. If you are not the CAF Lead, sign in and tell us. Sign in to accept: ((service_link))

  The link leads to A24. If the nominee has already accepted, it leads to the dashboard with a banner. If the invitation was cancelled, it leads to "This invitation is no longer valid".
- **N10 to the claimant.** Subject: "Your CAF Lead has accepted".
  > ((nominee_name)) has accepted. They are now the CAF Lead for ((council_name)). They decide who can use your council record. Sign in to see what happens next: ((service_link))

  The link leads to 35, which says accepted.
- **N11 to the claimant.** Subject: "((nominee_name)) is not your CAF Lead".
  > ((nominee_name)) told us they are not the CAF Lead for ((council_name)), so we have cancelled the invitation. You need to name your council's CAF Lead before anyone can use your council record. Sign in to name your CAF Lead: ((service_link))

  The link leads to 36. If the claimant has since chosen "Me", it leads to the dashboard with a banner.

## Research (Round 3 page)

- Seven Claim scenarios (`app/routes/research-claim.js`).
- The "Name someone else instead" switch (Q26), on by default.
- "MHCLG check passed" on 34 (research only).
- The person switcher and a link to N00.
