# Council list — data cleaning notes

Source: `data/source/council-status-list.csv` (the MHCLG council-status-list, 27 Oct 2026, converted
from the supplied `.xlsx`). Gitignored — it carries internal engagement flags that must not ship.

Only four columns are used in the prototype: **Local authority (name), ONS GSS code, Council type,
Region**. Everything else (Get CAF Ready, A&D / B&C onboarded & completed, Engaged with Local Digital,
Willing to participate in user research, Data flags, Shared service) is deliberately excluded.

Output: `app/data/councils.js` — 333 entries = 330 real councils + 3 fictional demo councils
(Westborough, Eastvale, Northmoor), sorted by name. `id` is a slug of the name and is the unique key.

---

## 1. Row count (not reconciled — your decision)

- Source data rows: **330** (the service quotes 317). No rows were filtered to hit 317.
- By council type: District 163, Unitary 62, Metropolitan 36, London Borough 33, County 22, Combined Authority 12, Borough 2.
- Counties (name has 'County Council'): 23. London boroughs (name 'London Borough of'): 29. Combined authorities: 12.

## 2. Duplicate ONS codes (kept as-is, flagged, never used as a key)

Each council is kept as its own row; `onsCode` is the value from the file; `"onsCodeCheck": "duplicate in source"`
is added. The correct codes are not guessed. `id` (not `onsCode`) is the unique key everywhere.

- `E07000110` — Dover District Council, Maidstone Borough Council
- `E07000111` — Gravesham Borough Council, Sevenoaks District Council
- `E07000112` — Folkestone and Hythe District Council, Swale Borough Council
- `E47000008` — Cambridgeshire & Peterborough CA, West of England CA

## 3. Name typo (corrected)

- "Norfolk County Counci" → **"Norfolk County Council"** (missing final "l"). Only occurrence.

## 4. Council type does not match the name pattern (listed, NOT changed)

A heuristic comparison of the type column against the authority-type word in the name. Reported for
your review — some are genuinely unusual real authorities (e.g. Northumberland and Rutland are real
unitary authorities that kept 'County Council' in their name), so the type may be right and the name
the outlier. None of these were changed.

- **Castle Point District Council** — name says 'District Council' but typed Unitary
- **Central Bedfordshire Council** — bare 'X Council' (usually unitary) but typed District
- **East Suffolk Council** — bare 'X Council' (usually unitary) but typed District
- **West Suffolk Council** — bare 'X Council' (usually unitary) but typed District
- **Northumberland County Council** — name says 'County Council' but typed Unitary
- **Rutland County Council** — name says 'County Council' but typed Unitary
- **Boston Borough Council** — typed 'Borough' (every other borough-named council is typed District)
- **Wyre Borough Council** — typed 'Borough' (every other borough-named council is typed District)

## 5. Missing region (left blank; UI copes with blank)

- Greater London CA (type: Combined Authority)
- Greater Manchester CA (type: Combined Authority)
- North East CA (type: Combined Authority)
- South Yorkshire CA (type: Combined Authority)
- Tameside Borough Council (type: Metropolitan)
- Tees Valley CA (type: Combined Authority)

Greater London CA, Greater Manchester CA, North East CA, South Yorkshire CA and Tees Valley CA are
combined authorities with no region in the source. **Tameside Borough Council** (a metropolitan borough)
is also blank, which is unexpected — flagged, not filled.

## 6. Fictional demo councils (must be removed before real use)

Westborough Borough Council, Eastvale District Council and Northmoor County Council are **not real**.
They are kept in `app/data/councils.js` (marked `fictionalDemo: true` with an inline comment) because
the demo people, the email-domain matching on screens 01/19, and the walkthrough scenarios depend on
them. The shared-service mapping (`SHARED_DOMAINS`) points only at these three and is demo data,
pending Leon's inventory of shared and managed services.
