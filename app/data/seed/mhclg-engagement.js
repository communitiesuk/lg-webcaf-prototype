// app/data/seed/mhclg-engagement.js
// Seed engagement data for MHCLG check-ins and insights.

module.exports = {
  queue: [
    {
      councilName: "Central Bedfordshire Council",
      status: "Due this week",
      source: "Assurer weekly catch-up",
      lastCheckIn: "2024-10-03",
      nextCheckIn: "2024-10-10",
      blockers: 1,
      notes: "Evidence backlog on D1 outcomes.",
    },
    {
      councilName: "Gloucestershire County Council",
      status: "On track",
      source: "Assurer weekly catch-up",
      lastCheckIn: "2024-09-25",
      nextCheckIn: "2024-10-09",
      blockers: 0,
      notes: "Preparing scope pack mapping.",
    },
    {
      councilName: "London Borough of Islington",
      status: "Blocked",
      source: "Assurer weekly catch-up",
      lastCheckIn: "2024-09-27",
      nextCheckIn: "2024-10-04",
      blockers: 3,
      notes: "Awaiting SLT sign-off on B&C scope.",
    },
    {
      councilName: "Kent County Council",
      status: "Overdue",
      source: "Assurer weekly catch-up",
      lastCheckIn: "2024-09-18",
      nextCheckIn: "2024-10-02",
      blockers: 2,
      notes: "Assurer feedback outstanding.",
    },
    {
      councilName: "Norfolk County Council",
      status: "Requested",
      source: "Council request",
      lastCheckIn: "2024-09-22",
      nextCheckIn: "2024-10-11",
      blockers: 0,
      notes: "Needs help defining priority shortlist.",
    },
  ],
  requests: [
    {
      councilName: "Norfolk County Council",
      reason: "Need guidance on prioritising critical systems.",
      urgency: "Soon",
      preferredWeek: "Week commencing 7 Oct",
      requestedAt: "2024-09-30",
    },
  ],
  blockers: [
    {
      councilName: "London Borough of Islington",
      category: "Governance",
      detail: "Awaiting approval of scope pack by SLT.",
      raisedBy: "Assurer",
      raisedAt: "2024-09-27",
      needsMhclgHelp: true,
    },
    {
      councilName: "Kent County Council",
      category: "Evidence",
      detail: "Evidence references missing for D1 outcomes.",
      raisedBy: "Assurer",
      raisedAt: "2024-09-18",
      needsMhclgHelp: false,
    },
  ],
  insights: [
    {
      summary: "Assurers flag recurring delays on evidence reference hygiene.",
      source: "Weekly assurer catch-up",
      date: "2024-09-27",
      councils: ["London Borough of Islington", "Kent County Council"],
    },
    {
      summary: "Councils need clearer guidance on priority shortlist criteria.",
      source: "Council requests",
      date: "2024-09-30",
      councils: ["Norfolk County Council"],
    },
  ],
  guidance: [
    {
      councilName: "Central Bedfordshire Council",
      note: "Use the priority checklist to pick 1-2 systems that support statutory services.",
      source: "MHCLG engagement note",
      date: "2024-09-28",
    },
    {
      councilName: "Kent County Council",
      note: "Evidence references should link to existing repositories; do not upload files.",
      source: "MHCLG engagement note",
      date: "2024-09-20",
    },
  ],
  updates: [
    {
      councilName: "Central Bedfordshire Council",
      lastContact: "2024-10-03",
      currentStage: "Progress tracker",
      keyBlocker: "Evidence backlog on D1 outcomes.",
      nextAction: "Council to confirm evidence references for D1 outcomes.",
      owner: "Council",
    },
    {
      councilName: "London Borough of Islington",
      lastContact: "2024-09-27",
      currentStage: "Assurance review",
      keyBlocker: "Awaiting SLT sign-off on B&C scope.",
      nextAction: "MHCLG to align assurer and council on scope decision.",
      owner: "MHCLG",
    },
    {
      councilName: "Norfolk County Council",
      lastContact: "2024-09-22",
      currentStage: "Scope pack",
      keyBlocker: "Needs guidance on prioritising critical systems.",
      nextAction: "Council to submit shortlist rationale for review.",
      owner: "Council",
    },
  ],
};
