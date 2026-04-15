// app/data/seed/users.js
// Seed users for assignment (owner + collaborators)

module.exports = [
  {
    id: "u-1",
    name: "Morgan Ellis",
    role: "council",
    roles: ["caf-lead", "approver"],
    activeRole: "caf-lead",
    orgName: "West Marchshire Council",
    roleTitle: "CAF Lead",
    email: "morgan.ellis@west-marchshire.gov.uk",
  },
  {
    id: "u-2",
    name: "Priya Shah",
    role: "council",
    roles: ["collaborator", "qa"],
    activeRole: "collaborator",
    orgName: "West Marchshire Council",
    roleTitle: "Collaborator",
    email: "priya.shah@west-marchshire.gov.uk",
  },
  {
    id: "u-3",
    name: "Lewis Turner",
    role: "council",
    roles: ["approver"],
    activeRole: "approver",
    orgName: "West Marchshire Council",
    roleTitle: "Approver",
    email: "lewis.turner@west-marchshire.gov.uk",
  },
  {
    id: "u-4",
    name: "Charlie Evans",
    role: "assurer",
    roles: ["assurer"],
    activeRole: "assurer",
    orgName: "Assurance Partner",
    roleTitle: "Assurer",
  },
  {
    id: "u-5",
    name: "Morgan Reed",
    role: "mhclg",
    orgName: "MHCLG",
    roleTitle: "MHCLG analyst",
  },
];
