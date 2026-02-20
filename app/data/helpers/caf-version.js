// app/data/helpers/caf-version.js
// CAF version registry and helpers.

const outcomesAD = require("../seed/outcomes-ad");
const outcomesBC = require("../seed/outcomes-bc");

const CAF_DEFAULT_VERSION = "3.2";

const CAF_VERSIONS = {
  "3.2": {
    ad: outcomesAD,
    bc: outcomesBC,
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
  CAF_DEFAULT_VERSION,
  getCafVersion,
  getOutcomesForVersion,
};
