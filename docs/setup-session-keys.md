# Setup section — session data keys

All state for the "Set up your council" (Setup v6) section lives under
`req.session.data.setup`. Seeded by `ensureSetup()` in `app/data/helpers/setup.js`
from `app/data/seed/setup.js`. **Example data, not real.** This file is the contract
for Decide (and any later section) to read Setup data.

Transient form fields (POSTed, then read and deleted by the route) are listed per
screen so they are not confused with the persisted model.

## `setup` (persisted model)

| Key | Type | Set by | Notes |
|---|---|---|---|
| `setup.seeded` | bool | ensureSetup | guard flag |
| `setup.exampleData` | bool | seed | always true in prototype |
| `setup.council.name` | string | seed | "Westborough Borough Council" |
| `setup.council.type` | string | seed | "metropolitan borough council" |
| `setup.people.cafLead` | `{name, confirmed}` | seed | confirmed in Access management (out of scope) |
| `setup.people.approver` | `{name, confirmed}` | seed | — |
| `setup.sectorContext.confirmed` | bool | S02 | read-only confirm |
| `setup.councilContext.cni` | bool | S03 | CNI sector flag (proposal) |
| `setup.councilContext.operationalTechnology` | bool | S03 | reveals `operationalTechnologyDetail` |
| `setup.councilContext.operationalTechnologyDetail` | string | S03 | — |
| `setup.councilContext.recentItTransformation` | bool | S03 | reveals `recentItTransformationDetail` |
| `setup.councilContext.recentItTransformationDetail` | string | S03 | — |
| `setup.councilContext.upcomingItTransformation` | bool | S03 | reveals `upcomingItTransformationDetail` |
| `setup.councilContext.upcomingItTransformationDetail` | string | S03 | reveal label inferred — see batch notes |
| `setup.councilContext.lgr` | bool | S03 | reveals `lgrDetail` |
| `setup.councilContext.lgrDetail` | string | S03 | — |
| `setup.councilContext.noneOfThese` | bool | S03 | exclusive; clears the above |
| `setup.councilContext.anythingElse` | string | S03 | optional free text |
| `setup.councilContext.completed` | bool | S03 | — |
| `setup.methodology.approach` | "five-lens" \| "other" | S04 | — |
| `setup.methodology.detail` | string | S05 | only when "other" |
| `setup.methodology.link` | string | S05 | optional |
| `setup.methodology.completed` | bool | S04 | — |
| `setup.essentialServices[]` | array | S09/S10/S35/S36 | `{id, name, source, functions[], platforms[], noSystemReason, status}` |
| `setup.platforms[]` | array | S12c/S38/S39 | `{id, name, type, managedBy, supplierId, linkedServices[], linkedSystems[]}` — **source of truth for all platform links** |
| `setup.suppliers[]` | array | S41 | `{id, name}` — shared by S12c and S16 |
| `setup.criticalSystems[]` | array | S14 onward | see shape below |

### `setup.criticalSystems[]` shape

`{ id, name, description, supportedServices[], assessedBefore ("yes"|"no"|"dontknow"),`
`assessedBeforeRecord?, corporateServices[], corporateServicesOther, platforms[],`
`managedBySupplier ("fully"|"partially"|"council"|"dontknow"|""), supplierId, supplierNote,`
`sharedWithCouncils (bool), councils[], hosting{type, provider, secondary},`
`owner{name, jobTitle}, impact{confidentiality, integrity, availability}, recovery{mtd, rto, rpo},`
`inPlan (bool), detailsComplete (bool) }`

Criticality is **derived** from `impact` (not stored as an input).

## Transient form fields by screen

- **S03** council-context: `councilContextApplies` (array: cni, ot, recent-it, upcoming-it, lgr), `councilContextNone` ("none", exclusive), `otDetail`, `recentItDetail`, `upcomingItDetail`, `lgrDetail`, `ccAnythingElse`.
- **S04** methodology: `methodologyApproach` ("five-lens" | "other").
- **S05** methodology-detail: `methodologyDetail`, `methodologyLink`.
- **S35** choose services: `essentialServiceChoices` (array of service names from the pick list).
- **S09** add service: `newServiceName`.
- **S10b** add function: `newFunctionName`.
- **S38** core infrastructure for a service: `servicePlatforms` (array of platform ids), `action` ("continue" | "later").
- **S12c** add/edit platform: `platformName`, `platformType`, `platformManager` ("council" | "supplier-fully" | "supplier-partly" | "shared"), `whichSupplier` (supplier id), `returnTo` (where it was opened from).
- **S45** what relies on a platform: `reliesServices` (array), `reliesSystems` (array), `reliesLater` ("later").
- **S20** a system's platforms: `systemPlatforms` (array), `systemPlatformsLater` ("later").
- **S14** add a critical system: `systemName`, `systemDescription`, `supportedServices` (array of service/function ids), `notSureServices` ("later"), `assessedBefore` ("yes" | "no" | "dontknow").
- **S19** corporate services: `corporateServices` (array), `corporateServicesOther`, `noneCorporate` ("none").
- **S15** supplier?: `managedBySupplier` ("fully" | "partially" | "council" | "dontknow").
- **S16** which supplier: `whichSupplier` (supplier id), `supplierNote`.
- **S41** add supplier: `supplierName`, `returnTo`.
- **S17** shared with councils: `sharedWithCouncils` ("yes" | "no").
- **S18** which councils: `whichCouncils` (array of council names, incl. any added via the accessible-autocomplete); `councilSearchSelect` (the autocomplete's enhanced-select value, not persisted).
- **S21** hosting: `hostingType` ("third-party" | "on-premises" | "council-cloud"), `hostingProvider`, `hostingSecondary`.
- **S27** owner: `ownerName`, `ownerJobTitle`.
- **S28** impact ratings: `impactConfidentiality`, `impactIntegrity`, `impactAvailability` ("low" | "medium" | "high").
- **S29** recovery: `recoveryMtd`, `recoveryRto`, `recoveryRpo`.
- **S42** why no system: `noSystemReason` (stored on the service; clears the S24 warning).
- **S30** check your setup: confirming sets `setup.completed = true`.

A system's `detailsComplete` becomes true once it has an owner **and** impact ratings.
The S24 warnings and S30 summary are fully derived from the current state.

A system can be removed only when `!inPlan && assessedBefore !== "yes"` (`systemCanBeRemoved`);
otherwise S48 (cannot remove) is shown. `hosting` is `{type, provider, secondary}`.

A critical system's `supportedServices[]` holds service ids and/or function ids. `assessedDate`
(e.g. "March 2025") is example data shown on the S23 hub. Criticality is derived from `impact`
via `deriveCriticality`.

A service's/system's platforms are **derived** from `platforms[].linkedServices` / `linkedSystems`
(not stored on the service/system). `managedBy` on a platform parallels a critical system's
`managedBySupplier`.

Each `essentialServices[]` entry adds `infraStatus` ("complete" | "to_do" | "link_later"),
which drives the S36 hub status line and the S01 task hint. `source` is "list" (from S35)
or "custom" (from S09).

_Later batches will extend this file as screens are built._
