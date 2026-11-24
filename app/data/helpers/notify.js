// app/data/helpers/notify.js
//
// GOV.UK Notify stub (round 2 research build). The prototype never sends real email: each event
// pushes a record into session (sessionData.notify.emails), which N00 "Emails sent in this
// session" lists. Content lives in app/data/content/emails.js (Figma N01 to N08).

const { EMAILS, EMAIL_FROM, EMAIL_FOOTER } = require("../content/emails");
const { currentCouncil } = require("./acting-as");

function ensureNotify(sessionData) {
  if (!sessionData.notify || !Array.isArray(sessionData.notify.emails)) {
    sessionData.notify = { emails: [], counter: 0 };
  }
  return sessionData.notify;
}

function todayLabel() {
  const d = new Date();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}

// Record an email. `to` = { name, key } where key is the acting-as persona of the recipient.
// `personalisation` fills the ((placeholders)); council_name is always added.
function sendEmail(sessionData, emailId, to, personalisation) {
  const template = EMAILS[emailId];
  if (!template) return null;
  const notify = ensureNotify(sessionData);
  notify.counter += 1;
  const council = currentCouncil(sessionData);
  const record = {
    id: "e" + notify.counter + "-" + Date.now().toString(36),
    emailId,
    to: { name: (to && to.name) || "", key: (to && to.key) || "", role: template.recipientRole },
    subject: fill(template.subject, Object.assign({ council_name: council.name }, personalisation || {})),
    councilId: council.id,
    councilName: council.name,
    personalisation: Object.assign({ council_name: council.name }, personalisation || {}),
    sentAt: new Date().toISOString(),
    sentLabel: todayLabel(),
  };
  notify.emails.push(record);
  return record;
}

function fill(text, personalisation) {
  return (text || "").replace(/\(\(([a-z_]+)\)\)/g, (m, key) =>
    personalisation && personalisation[key] !== undefined && personalisation[key] !== "" ? personalisation[key] : m
  );
}

// The email as it would arrive: From, To, Subject, body lines, and the link (through the resolver).
function renderEmail(record, linkUrl) {
  const t = EMAILS[record.emailId];
  const p = record.personalisation;
  const link = t.linkLine
    ? { before: fill(t.linkLine.split("((service_link))")[0], p), href: linkUrl, text: linkUrl }
    : null;
  return {
    from: EMAIL_FROM,
    to: record.to.name,
    subject: record.subject,
    greeting: fill(t.greeting, p),
    draft: Boolean(t.draft),
    paragraphs: t.paragraphs.map((x) => fill(x, p)),
    link,
    footer: EMAIL_FOOTER,
  };
}

function findEmail(sessionData, id) {
  return ensureNotify(sessionData).emails.find((e) => e.id === id) || null;
}

// Newest first, for N00.
function listEmails(sessionData) {
  return ensureNotify(sessionData).emails.slice().reverse();
}

module.exports = { ensureNotify, sendEmail, renderEmail, findEmail, listEmails, todayLabel };
