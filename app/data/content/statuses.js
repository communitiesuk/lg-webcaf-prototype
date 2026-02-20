// app/data/content/statuses.js
// Controlled status set + tag styles (prototype needs predictable states)

module.exports = {
  options: [
    { value: "not_started", label: "Not started", tagClass: "govuk-tag--grey" },
    { value: "in_progress", label: "In progress", tagClass: "govuk-tag--blue" },
    { value: "blocked", label: "Blocked", tagClass: "govuk-tag--red" },
    { value: "ready_for_review", label: "Ready for review", tagClass: "govuk-tag--purple" },
    { value: "feedback_received", label: "Feedback received", tagClass: "govuk-tag--yellow" },
    { value: "updated_after_feedback", label: "Updated after feedback", tagClass: "govuk-tag--blue" },
    { value: "complete", label: "Complete", tagClass: "govuk-tag--green" },
  ],
};
