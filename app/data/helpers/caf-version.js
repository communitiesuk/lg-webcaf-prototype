// app/data/helpers/caf-version.js
// CAF version registry and helpers.

const outcomesAD = require("../seed/outcomes-ad");
const outcomesBC = require("../seed/outcomes-bc");

const CAF_DEFAULT_VERSION = "3.2";
const CAF_CURRENT_VERSION = "4.0";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const outcomesAD40 = clone(outcomesAD);
const outcomesBC40 = clone(outcomesBC);

if (
  outcomesAD40.objectives &&
  outcomesAD40.objectives[0] &&
  outcomesAD40.objectives[0].principles &&
  outcomesAD40.objectives[0].principles[0] &&
  Array.isArray(outcomesAD40.objectives[0].principles[0].outcomes)
) {
  const adA1 = outcomesAD40.objectives[0].principles[0].outcomes;
  const a1b = adA1.find((outcome) => outcome.id === "A1b");
  if (a1b) {
    a1b.title = "Roles, responsibilities and accountability";
    a1b.description =
      "Clear ownership, accountability and decision rights are understood across the organisation.";
  }
  outcomesAD40.objectives[0].principles[1].outcomes.push({
    id: "A2c",
    code: "A2.c",
    title: "Risk appetite and tolerance",
    description: "Risk appetite and tolerance for cyber resilience are defined and used in decision-making.",
  });
}

if (
  outcomesBC40.objectives &&
  outcomesBC40.objectives[0] &&
  outcomesBC40.objectives[0].principles &&
  outcomesBC40.objectives[0].principles[0] &&
  Array.isArray(outcomesBC40.objectives[0].principles[0].outcomes)
) {
  const bcB1 = outcomesBC40.objectives[0].principles[0].outcomes;
  const b1a = bcB1.find((outcome) => outcome.id === "B1a");
  if (b1a) {
    b1a.description =
      "You have developed, communicated and continue to improve cyber security and resilience policies, processes and procedures for this critical system.";
  }
  bcB1.push({
    id: "B1c",
    code: "B1.c",
    title: "Policy exception management",
    description: "Exceptions to policy are controlled, recorded and reviewed.",
  });
}

const CAF_VERSIONS = {
  "3.2": {
    ad: outcomesAD,
    bc: outcomesBC,
  },
  "4.0": {
    ad: outcomesAD40,
    bc: outcomesBC40,
  },
};

function getCafVersion(assessment) {
  if (assessment && assessment.cafVersion) return assessment.cafVersion;
  return CAF_DEFAULT_VERSION;
}

function getOutcomesForVersion(input) {
  const version = typeof input === "string" ? input : getCafVersion(input);
  return CAF_VERSIONS[version] || CAF_VERSIONS[CAF_DEFAULT_VERSION];
}

module.exports = {
  CAF_CURRENT_VERSION,
  CAF_DEFAULT_VERSION,
  getCafVersion,
  getOutcomesForVersion,
};
