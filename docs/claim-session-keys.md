# Claim your council — session data keys

All Claim state lives under **`req.session.data.claim`**. Set by the prototype One Login
stand-in (`/prototype-sign-in`) and scenario switcher (`/prototype-scenarios`), then by the
Claim screens. Later sections read `claim.council`, `claim.person` and `claim.status`.
Example data (councils, domains, emails) is in `app/data/claim-example-data.js` — "Example data, not real".

| Key | Type | Set by | Meaning |
|---|---|---|---|
| `oneLoginEmail` | string | sign-in / scenario | the verified email "returned by One Login" |
| `arrival` | "mhclg-link" \| "independent" | scenario | how the person reached Claim (drives 01 vs 02) |
| `preselectedCouncilId` | string | scenario (mhclg-link) | council filled in from the MHCLG link, shown on 01 |
| `council` | { id, name } | 01 / 02 / 19 | the chosen/confirmed council |
| `confirmAnswer` | "yes" \| "no" | 01 | answer to "Is this your council?" |
| `person` | { fullName, jobTitle } | 03 (Batch 2) | the person's details (One Login gives email only) |
| `connection` | "direct" \| "shared-managed" \| "something-else" | 08 (Batch 4) | how connected (unrecognised path) |
| `organisation` | string | 09 (Batch 4) | shared/managed org name |
| `needsReview` | boolean | derived (Batch 2/3) | first-to-join OR email not recognised |
| `status` | "pending" \| "approved" \| "not-approved" \| "joined" | 04/05/11 + review | registration/claim outcome |
| `registeredDate` | string | scenario / submit | date shown on 16/17/18 |
| `flagCouncilHasUsers` | boolean | scenario | prototype flag: council already active (join vs first-to-join) |
| `flagAlreadyHasAccess` | boolean | scenario | prototype flag: user already has access (→ 17) |
| `flagPendingOutcome` | "approve" \| "reject" \| "pending" | prototype control (Batch 3) | simulates the MHCLG decision for 07/16/18 |

Derived (not stored): `domainRecognised` = chosen council ∈ `councilsForEmail(oneLoginEmail)`;
`emailMatchesManyCouncils` = that list has length > 1 (→ frame 19).

Recognition / routing is NOT a real backend: domain recognition reads the fictional example
data; council state and the review decision come from the scenario flags above.
