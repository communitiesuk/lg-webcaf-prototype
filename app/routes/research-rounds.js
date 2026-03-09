// app/routes/research-rounds.js
// Landing page + helpers for selecting user-research round context.

module.exports = function (router) {
  router.get("/research-rounds", (req, res) => {
    res.render("pages/research-rounds", {
      pageTitle: "Research rounds",
    });
  });

  router.get("/research-rounds/round-1", (req, res) => {
    return res.redirect("/research-start?round=round-1&next=%2Fentry%2Fstart-new%3FreturnTo%3D%2Fprepare");
  });

  router.get("/research-rounds/round-2", (req, res) => {
    return res.redirect("/research-start?round=round-2&next=%2Fentry%2Fstart-new%3FreturnTo%3D%2Fprepare");
  });
};
