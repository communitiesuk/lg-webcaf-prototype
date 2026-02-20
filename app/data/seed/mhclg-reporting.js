// app/data/seed/mhclg-reporting.js
// Simple aggregate reporting snapshot for MHCLG (prototype data).

module.exports = {
  summary: [
    { label: "Total councils", value: 8 },
    { label: "Active assessments", value: 6 },
    { label: "Submitted", value: 1 },
    { label: "Awaiting assurance", value: 2 },
  ],
  objectives: [
    {
      objective: "Objective A",
      title: "Managing security risk",
      complete: "45%",
      partial: "35%",
      notAchieved: "20%",
    },
    {
      objective: "Objective B",
      title: "Protecting against attack",
      complete: "32%",
      partial: "40%",
      notAchieved: "28%",
    },
    {
      objective: "Objective C",
      title: "Detecting events",
      complete: "38%",
      partial: "34%",
      notAchieved: "28%",
    },
    {
      objective: "Objective D",
      title: "Minimising impact",
      complete: "41%",
      partial: "37%",
      notAchieved: "22%",
    },
  ],
  gaps: [
    { label: "Outcome A1.a Board direction", value: "Not achieved" },
    { label: "Outcome C1.b Monitoring coverage", value: "Partially achieved" },
    { label: "Outcome D1.b Response capability", value: "Partially achieved" },
  ],
  completeness: [
    { label: "Councils with all outcomes judged", value: 2 },
    { label: "Councils missing evidence references", value: 5 },
    { label: "Councils awaiting IIP sign-off", value: 3 },
  ],
  quality: [
    { label: "Outcomes missing evidence refs", value: 14 },
    { label: "Outcomes awaiting assurance", value: 9 },
    { label: "Outcomes blocked", value: 6 },
  ],
  trends: [
    { label: "Critical systems selection unclear", value: 3 },
    { label: "Evidence reference hygiene issues", value: 4 },
    { label: "Assurance delays", value: 2 },
  ],
  interventions: [
    { label: "Guidance issued to councils", value: 3 },
    { label: "Escalations to assurance forum", value: 2 },
    { label: "Peer learning sessions scheduled", value: 1 },
  ],
  bestPractice: [
    {
      label: "Shared evidence register template for CAF leads",
      value: "Adopted by 3 councils",
    },
    {
      label: "Critical systems mapping workshop format",
      value: "Used in 2 councils",
    },
  ],
  emergingRisks: [
    { label: "Third-party monitoring coverage gaps", value: "Rising" },
    { label: "Legacy system patching constraints", value: "Stable" },
  ],
};
