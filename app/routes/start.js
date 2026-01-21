// app/routes/start.js
// Public start page before session setup.

const labels = require("../data/content/labels");

module.exports = function (router) {
  router.get("/start", (req, res) => {
    res.render("pages/start", {
      pageTitle: labels.start.pageTitle,
      labels,
    });
  });
};
