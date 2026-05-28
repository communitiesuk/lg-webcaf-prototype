//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Formats an ISO date string to UK long date format: "3 March 2026"
addFilter('ukDate', function (value) {
  if (!value) return ''
  const dt = new Date(value)
  if (isNaN(dt.getTime())) return value
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
})
