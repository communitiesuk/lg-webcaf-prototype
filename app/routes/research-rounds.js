// app/routes/research-rounds.js
// Landing page + helpers for selecting user-research round context.
const { clearAllAssessments } = require("../data/helpers/round-two-account-store");
const {
  initialiseRoundTwoPostSetupResearch,
  initialiseDemoScene,
} = require("../data/helpers/research-ready");

const DEMO_SYSTEM_ID = "sys-1";

module.exports = function (router) {
  router.get("/research-rounds", (req, res) => {
    res.render("pages/research-rounds", {
      pageTitle: "Research rounds",
      resetSuccess: (req.query.reset || "").toString() === "success",
    });
  });

  router.get("/research-rounds/round-1", (req, res) => {
    return res.redirect("/research-start?round=round-1&next=%2Fentry%2Fstart-new%3FreturnTo%3D%2Fprepare");
  });

  router.get("/research-rounds/round-2", (req, res) => {
    return res.redirect("/round-2/start");
  });

  router.get("/research-rounds/round-2-post-setup", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};

    initialiseRoundTwoPostSetupResearch(req.session.data);
    return res.redirect("/assessments/current/journey");
  });

  router.get("/research-rounds/alpha-demo/dashboard", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "dashboard");
    return res.redirect("/assessments/current/dashboard?lens=bc&view=all");
  });

  router.get("/research-rounds/alpha-demo/context", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "context");
    return res.redirect(`/self-assess/bc/${DEMO_SYSTEM_ID}/outcomes/B2a/b2a-context`);
  });

  router.get("/research-rounds/alpha-demo/final-judgement", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "final-judgement");
    return res.redirect(`/self-assess/bc/${DEMO_SYSTEM_ID}/outcomes/B2a/b2a-final-judgement`);
  });

  router.get("/research-rounds/alpha-demo/completed", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "completed");
    return res.redirect(`/self-assess/bc/${DEMO_SYSTEM_ID}/outcomes/B2a/b2a-ready-for-internal-review`);
  });

  router.get("/research-rounds/alpha-demo/review-self-assessment", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "review");
    return res.redirect("/assessments/current/complete-self-assessment");
  });

  router.get("/research-rounds/alpha-demo/ready-for-assurance", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "send-to-assurer");
    return res.redirect("/assessments/current/ready-for-assurance");
  });

  router.get("/research-rounds/alpha-demo/send-to-assurer", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "send-to-assurer");
    return res.redirect("/assessments/current/send-to-assurer");
  });

  router.get("/research-rounds/alpha-demo/receive-assurance-report", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "post-assurance");
    return res.redirect("/assessments/current/assurance-report");
  });

  router.get("/research-rounds/alpha-demo/recommendations", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "post-assurance");
    return res.redirect("/assessments/current/recommendations");
  });

  router.get("/research-rounds/alpha-demo/iip", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "post-assurance");
    return res.redirect("/assessments/current/iip/ready-for-review");
  });

  router.get("/research-rounds/alpha-demo/collaborator", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "collaborator");
    return res.redirect("/assessments/current/collaborator-view");
  });

  router.get("/research-rounds/alpha-demo/onboarding-task-list", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "onboarding-task-list");
    return res.redirect("/onboarding");
  });

  router.get("/research-rounds/alpha-demo/onboarding-context", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "onboarding-context");
    return res.redirect("/stages/2/scope/context/check-answers");
  });

  router.get("/research-rounds/alpha-demo/onboarding-services", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "onboarding-services");
    return res.redirect("/stages/2/scope/services/review");
  });

  router.get("/research-rounds/alpha-demo/onboarding-systems", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "onboarding-systems");
    return res.redirect("/stages/2/scope/systems/review");
  });

  router.get("/research-rounds/alpha-demo/igp-walkthrough", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    initialiseDemoScene(req.session.data, "context");
    return res.redirect(`/self-assess/bc/${DEMO_SYSTEM_ID}/outcomes/B2a/b2a-achieved`);
  });

  router.get("/research-rounds/alpha-demo/assurer-overview", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    delete req.session.data.assurerAlpha;
    return res.redirect("/assurer-alpha/assessment/west-marchshire-2026");
  });

  router.get("/research-rounds/alpha-demo/assurer-outcomes-list", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    delete req.session.data.assurerAlpha;
    return res.redirect("/assurer-alpha/assessment/west-marchshire-2026/critical-systems");
  });

  router.get("/research-rounds/alpha-demo/assurer-outcome", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    delete req.session.data.assurerAlpha;
    return res.redirect("/assurer-alpha/assessment/west-marchshire-2026/outcomes/b2-payments-supply-chain");
  });

  router.get("/research-rounds/alpha-demo/assurer-iip", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    delete req.session.data.assurerAlpha;
    return res.redirect("/assurer-alpha/assessment/west-marchshire-2026/iip");
  });

  router.get("/research-rounds/alpha-demo/assurer-summary", (req, res) => {
    if (!req.session) req.session = {};
    if (!req.session.data) req.session.data = {};
    delete req.session.data.assurerAlpha;
    return res.redirect("/assurer-alpha/assessment/west-marchshire-2026/summary");
  });

  router.get("/research-rounds/reset-prototype", (req, res) => {
    res.render("pages/reset-prototype", {
      pageTitle: "Reset prototype",
    });
  });

  router.post("/research-rounds/reset-prototype", (req, res) => {
    clearAllAssessments();

    if (!req.session) {
      return res.redirect("/research-rounds?reset=success");
    }

    if (req.session.data) {
      req.session.data = {};
    }

    if (typeof req.session.destroy === "function") {
      return req.session.destroy(() => res.redirect("/research-rounds?reset=success"));
    }

    return res.redirect("/research-rounds?reset=success");
  });
};
