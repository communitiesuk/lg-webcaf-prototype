// app/routes/assurance.js
// "Assurance activities" section (Figma page 447:2693, v3 — proposal agreed, advice route).
// Batch 2: AA02 (the full list, with the Other activities row) and AA03 (before you book).
// WebCAF records booked/done in the session and links to the live Microsoft Bookings form.

const { applyFullAccessChrome, ensureSetup, ensureDecide, COUNCIL_NAME } = require("../data/helpers/readiness");
const {
  ensureAssurance,
  buildActivitiesModel,
  resolveBookActivity,
  activityMeta,
  formatBookedDate,
  dateToParts,
  formatUkDate,
  resolveMarkReady,
  markReady,
  buildOnboardingRows,
  buildPreCallRow,
  seedAA05Demo,
  seedAA06Demo,
} = require("../data/helpers/assurance");

module.exports = function (router) {
  // AA02 — assurance activities (replaces the Readiness-batch stand-in). Driven from the live cycle.
  router.get("/assurance-activities", (req, res) => {
    ensureSetup(req.session.data);
    ensureDecide(req.session.data);
    ensureAssurance(req.session.data);
    // Landing on the hub ends any booking round-trip started elsewhere (e.g. from D09).
    delete req.session.data.assuranceReturn;
    applyFullAccessChrome(req, res);
    res.render("pages/assurance/activities", {
      pageTitle: "Assurance activities",
      councilName: COUNCIL_NAME,
      groups: buildActivitiesModel(req.session.data),
    });
  });

  // AA03 — before you book. :activity sets the caption/H1; workshops show the readiness + earliest
  // date, onboarding / pre-call do not.
  router.get("/assurance-activities/book/:activity", (req, res) => {
    ensureSetup(req.session.data);
    ensureDecide(req.session.data);
    applyFullAccessChrome(req, res);
    const activity = resolveBookActivity(req.params.activity, req.session.data);
    if (!activity) return res.redirect("/assurance-activities");
    // When booking was started from another section (e.g. D09), carry a return so the user ends
    // up back there. Only internal /decide/ returns are honoured.
    const ret = (req.query.return || "").toString();
    if (ret.startsWith("/decide/")) req.session.data.assuranceReturn = ret;
    else delete req.session.data.assuranceReturn;
    const returnQuery = req.session.data.assuranceReturn
      ? "?return=" + encodeURIComponent(req.session.data.assuranceReturn)
      : "";
    res.render("pages/assurance/before-you-book", {
      pageTitle: activity.h1,
      activity,
      backHref: req.session.data.assuranceReturn || "/assurance-activities",
      returnQuery,
    });
  });

  // AA04 — update an activity (record booked / happened). AA07 is this page's validation-error state.
  router.get("/assurance-activities/update/:activity", (req, res) => {
    ensureSetup(req.session.data);
    ensureDecide(req.session.data);
    applyFullAccessChrome(req, res);
    const meta = activityMeta(req.params.activity);
    if (!meta) return res.redirect("/assurance-activities");
    const act = ensureAssurance(req.session.data).activities[req.params.activity] || {};
    const parts = dateToParts(act.date);
    const ret = (req.query.return || "").toString();
    if (ret.startsWith("/decide/")) req.session.data.assuranceReturn = ret;
    else delete req.session.data.assuranceReturn;
    res.render("pages/assurance/update-activity", {
      pageTitle: `Update your ${meta.name}`,
      activity: { id: req.params.activity, caption: meta.caption, name: meta.name },
      current: { status: act.status || "", day: parts.day, month: parts.month, year: parts.year },
      error: null,
      backHref: req.session.data.assuranceReturn || "/assurance-activities",
    });
  });

  router.post("/assurance-activities/update/:activity", (req, res) => {
    const data = req.session.data;
    ensureSetup(data);
    ensureDecide(data);
    const meta = activityMeta(req.params.activity);
    if (!meta) return res.redirect("/assurance-activities");
    const status = (data.activityStatus || "").toString();
    const day = (data["bookedDate-day"] || "").toString().trim();
    const month = (data["bookedDate-month"] || "").toString().trim();
    const year = (data["bookedDate-year"] || "").toString().trim();

    // AA07 — "Booked" needs a date. (Only the "enter the date" error is drawn.)
    if (status === "booked" && (!day || !month || !year)) {
      applyFullAccessChrome(req, res);
      return res.render("pages/assurance/update-activity", {
        pageTitle: `Error: Update your ${meta.name}`,
        activity: { id: req.params.activity, caption: meta.caption, name: meta.name },
        current: { status, day, month, year },
        error: { text: `Enter the date the ${meta.noun} is booked for` },
        backHref: req.session.data.assuranceReturn || "/assurance-activities",
      });
    }

    const a = ensureAssurance(data);
    const activity = a.activities[req.params.activity] || (a.activities[req.params.activity] = {});
    if (status === "booked") {
      activity.status = "booked";
      activity.date = formatBookedDate(day, month, year);
    } else if (status === "happened") {
      activity.status = "happened"; // keep any existing booked date
    } else {
      activity.status = "not-booked";
      activity.date = "";
    }
    delete data.activityStatus;
    delete data["bookedDate-day"];
    delete data["bookedDate-month"];
    delete data["bookedDate-year"];
    // Return to where the booking was started (e.g. D09) if set, else the assurance hub.
    const ret = data.assuranceReturn;
    delete data.assuranceReturn;
    return res.redirect(ret || "/assurance-activities");
  });

  // EXTERNAL — Microsoft Bookings. A labelled stand-in: WebCAF does not design this page.
  router.get("/assurance-activities/bookings-external", (req, res) => {
    applyFullAccessChrome(req, res);
    res.render("pages/assurance/bookings-external", { pageTitle: "Microsoft Bookings" });
  });

  // AA08 — mark your information as ready (per workshop/objective, decision 1). Advice route: this
  // does not block booking. Only the "All complete" state is drawn (decision 5).
  router.get("/assurance-activities/mark-ready/:activity", (req, res) => {
    ensureSetup(req.session.data);
    ensureDecide(req.session.data);
    applyFullAccessChrome(req, res);
    const activity = resolveMarkReady(req.params.activity);
    if (!activity) return res.redirect("/assurance-activities");
    res.render("pages/assurance/mark-ready", { pageTitle: activity.h1, activity });
  });

  router.post("/assurance-activities/mark-ready/:activity", (req, res) => {
    const activity = resolveMarkReady(req.params.activity);
    if (!activity) return res.redirect("/assurance-activities");
    // Record the ready date (today); AA03 shows the earliest = ready + 5 working days.
    markReady(req.session.data, req.params.activity, formatUkDate(new Date()));
    return res.redirect(`/assurance-activities/book/${req.params.activity}`);
  });

  // AA05 — book your onboarding calls (would replace D09). Reads the session; ?demo=1 seeds the drawn
  // early state for review. "Continue" → the dashboard (decision 3).
  router.get("/assurance-activities/onboarding", (req, res) => {
    ensureSetup(req.session.data);
    ensureDecide(req.session.data);
    ensureAssurance(req.session.data);
    if ((req.query.demo || "").toString() === "1") seedAA05Demo(req.session.data);
    applyFullAccessChrome(req, res);
    res.render("pages/assurance/onboarding-calls", {
      pageTitle: "Book your onboarding calls",
      rows: buildOnboardingRows(req.session.data),
    });
  });

  // AA06 — book your pre self-assessment call (would replace P08). "Back to prepare" → Prepare v4
  // stand-in. ?demo=1 seeds the drawn "Not booked yet" state.
  router.get("/assurance-activities/pre-call", (req, res) => {
    ensureSetup(req.session.data);
    ensureDecide(req.session.data);
    ensureAssurance(req.session.data);
    if ((req.query.demo || "").toString() === "1") seedAA06Demo(req.session.data);
    applyFullAccessChrome(req, res);
    res.render("pages/assurance/pre-call", {
      pageTitle: "Book your pre self-assessment call",
      rows: buildPreCallRow(req.session.data),
    });
  });

  // Prepare v4 (P01) stand-in — that section is built separately; no route exists in the kit yet.
  router.get("/assurance-activities/prepare-stand-in", (req, res) => {
    applyFullAccessChrome(req, res);
    res.render("pages/assurance/prepare-stand-in", { pageTitle: "Prepare" });
  });
};
