// app/routes/research-rounds.js
// Landing page + helpers for selecting user-research round context.
const { clearAllAssessments } = require("../data/helpers/round-two-account-store");

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
