// app/data/content/statuses.js
// Controlled status set + tag styles (prototype needs predictable states)

module.exports = {
  options: [
    { value: "not_started", label: "Not started", tagClass: "govuk-tag--grey" },
    { value: "in_progress", label: "In progress", tagClass: "govuk-tag--blue" },
    { value: "blocked", label: "Blocked", tagClass: "govuk-tag--red" },
    { value: "ready_for_internal_review", label: "Ready for internal review", tagClass: "govuk-tag--purple" },
    { value: "internally_reviewed", label: "Internally reviewed", tagClass: "govuk-tag--yellow" },
    { value: "complete", label: "Complete", tagClass: "govuk-tag--green" },
  ],
};
