// app/routes/get-started.js
// "Get started" section (Figma Get started v3, page 209:1927).
// Owns the service start page (G01 / G02), cookie settings (G03), the service-wide cookie
// banner mechanism, and the shared external placeholder. These are pre-sign-in pages, so the
// chrome is the signed-out variant: service name only, no "Sign in" / "Sign out" link.

const GET_STARTED_SERVICE_NAME = "Assess and manage your council’s cyber resilience";
const START_HREF = "/get-started"; // G01 — the service start page
// Sign-in now goes to the Internal Access stand-in (replaced GOV.UK One Login).
// Changed in build, prototype, pending design sign-off.
const SIGN_IN_HREF = "/internal-access";

// Signed-out chrome: service-name bar only. currentUser = null so no identity line and no
// Sign in / Sign out link; navigation empty so only the service name shows.
function applyGetStartedChrome(req, res) {
  res.locals.serviceName = GET_STARTED_SERVICE_NAME;
  res.locals.serviceUrl = START_HREF;
  res.locals.showNavigation = true;
  res.locals.currentUser = null;
  res.locals.navigation = [];
  res.locals.showJourney = false;
  res.locals.breadcrumbs = [];
  res.locals.progress = null;
}

function ensureCookies(sessionData) {
  if (!sessionData.cookies) sessionData.cookies = {};
  return sessionData.cookies;
}

// Only allow returning to a local same-site path after a cookie action.
function sanitiseReturn(input) {
  const path = (input || "").toString().trim();
  if (!path.startsWith("/") || path.startsWith("//")) return START_HREF;
  return path;
}

// Best-effort "where they came from": the Referer path if it is same-origin and local and not
// one of the feedback pages themselves; otherwise the given fallback (then the start page).
function localReferer(req, fallback) {
  const ref = (req.get("referer") || req.get("referrer") || "").toString();
  try {
    // Compare hostname only (ignore port): the kit proxies, so req's host port differs from
    // the browser-facing Referer port.
    const u = new URL(ref);
    if (u.hostname === req.hostname && u.pathname.startsWith("/") && !u.pathname.startsWith("//") && !u.pathname.startsWith("/feedback")) {
      return u.pathname;
    }
  } catch (e) {
    // no / unparseable Referer — fall through
  }
  return sanitiseReturn(fallback);
}

module.exports = function (router) {
  // Signed-out chrome for the Get started service pages (and the shared external placeholder).
  const GET_STARTED_PATHS = ["/get-started", "/cookies", "/support", "/feedback", "/service-unavailable"];
  router.use((req, res, next) => {
    if (GET_STARTED_PATHS.some((p) => req.path === p || req.path.startsWith(p + "/"))) {
      applyGetStartedChrome(req, res);
    }
    next();
  });

  // G01 / G02 — service start page. The cookie banner (in the shared layout) shows itself on
  // first visit; this handler just renders the page.
  router.get("/get-started", (req, res) => {
    res.render("pages/getstarted/service-start", {
      pageTitle: "Assess and manage your council’s cyber resilience",
      startHref: SIGN_IN_HREF,
    });
  });

  // Cookie banner choice (Accept / Reject analytics cookies) — records consent and swaps the
  // banner for a confirmation message on the page the user was on.
  router.post("/cookies/choose", (req, res) => {
    const cookies = ensureCookies(req.session.data);
    const choice = (req.session.data.cookiesConsent || "").toString();
    cookies.analyticsConsent = choice === "accept" ? "accepted" : "rejected";
    cookies.choiceMade = true;
    cookies.confirmationVisible = true;
    const returnUrl = sanitiseReturn(req.session.data.cookiesReturnUrl);
    delete req.session.data.cookiesConsent;
    delete req.session.data.cookiesReturnUrl;
    return res.redirect(returnUrl);
  });

  // Dismiss the confirmation banner.
  router.get("/cookies/hide", (req, res) => {
    ensureCookies(req.session.data).confirmationVisible = false;
    return res.redirect(sanitiseReturn(req.query.returnUrl));
  });

  // G03 — cookie settings. The radio reflects the current choice (analytics on unless the
  // user has explicitly rejected). No analytics actually run — Google Analytics is a
  // placeholder tool name (flagged at Stage 1, to confirm).
  router.get("/cookies", (req, res) => {
    const cookies = req.session.data.cookies || {};
    res.render("pages/getstarted/cookie-settings", {
      pageTitle: "Cookies",
      analyticsOn: cookies.analyticsConsent !== "rejected",
      saved: (req.query.saved || "").toString() === "1",
    });
  });

  router.post("/cookies", (req, res) => {
    const cookies = ensureCookies(req.session.data);
    const choice = (req.session.data.cookiesAnalytics || "").toString();
    cookies.analyticsConsent = choice === "no" ? "rejected" : "accepted";
    cookies.choiceMade = true;
    cookies.confirmationVisible = false; // the settings page shows its own success banner
    delete req.session.data.cookiesAnalytics;
    return res.redirect("/cookies?saved=1");
  });

  // G05 — Get help with the CAF (support). Reached from the footer on any page; Back returns
  // to wherever the user came from.
  router.get("/support", (req, res) => {
    res.render("pages/getstarted/support", {
      pageTitle: "Get help with the CAF",
      backHref: localReferer(req, START_HREF),
    });
  });

  // G11 — Give feedback. Reached from the "feedback" link in the phase banner. Nothing is sent
  // or stored — this is a prototype. Remember where the user came from for G13's return button.
  router.get("/feedback", (req, res) => {
    const feedback = req.session.data.feedback || {};
    feedback.returnUrl = localReferer(req, feedback.returnUrl);
    req.session.data.feedback = feedback;
    res.render("pages/getstarted/feedback", {
      pageTitle: "Give feedback on this service",
    });
  });

  router.post("/feedback", (req, res) => {
    // Fields auto-save to req.session.data.feedback via name="feedback[...]". Nothing is sent.
    const feedback = req.session.data.feedback || {};
    if (!(feedback.message || "").toString().trim()) {
      feedback.returnUrl = localReferer(req, feedback.returnUrl);
      req.session.data.feedback = feedback;
      return res.render("pages/getstarted/feedback", {
        pageTitle: "Error: Give feedback on this service",
        error: { field: "feedback-message", text: "Enter your feedback" },
      });
    }
    return res.redirect("/feedback/sent");
  });

  // G13 — Feedback sent (confirmation). "Back to the service" returns to where they came from.
  router.get("/feedback/sent", (req, res) => {
    const feedback = req.session.data.feedback || {};
    res.render("pages/getstarted/feedback-sent", {
      pageTitle: "Feedback sent",
      backHref: sanitiseReturn(feedback.returnUrl),
    });
  });

  // G08 — service unavailable (planned downtime). Status 503. No action.
  router.get("/service-unavailable", (req, res) => {
    res.status(503).render("pages/getstarted/service-unavailable", {
      pageTitle: "Sorry, the service is unavailable",
    });
  });

  // G09 — signed out after inactivity (involuntary). Reached in the real service on session
  // timeout; here it is a standalone page for review. "Sign in again" → the start page.
  router.get("/get-started/session-expired", (req, res) => {
    res.render("pages/getstarted/session-expired", { pageTitle: "You have been signed out" });
  });

  // G10 — you have signed out (voluntary). "Sign in again" → the One Login stand-in.
  router.get("/get-started/signed-out", (req, res) => {
    res.render("pages/getstarted/signed-out", { pageTitle: "You have signed out" });
  });

  // Real sign-out action, wired to the "Sign out" link in the Beta sections (Setup, Decide,
  // Claim). Clears the Beta service state (each section re-seeds on next entry) and shows G10.
  // Cookie preferences and the separate Alpha journey are left untouched.
  router.get("/get-started/sign-out", (req, res) => {
    if (req.session.data) {
      delete req.session.data.setup;
      delete req.session.data.decide;
      delete req.session.data.claim;
    }
    return res.redirect("/get-started/signed-out");
  });

  // G04 — MHCLG invitation email. Prototype-only PREVIEW of an email (not a service page).
  router.get("/prototype/emails/invitation", (req, res) => {
    res.render("pages/getstarted/invitation-email", { pageTitle: "Invitation email" });
  });
};
