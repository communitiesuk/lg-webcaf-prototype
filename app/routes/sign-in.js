// app/routes/sign-in.js
// Prototype sign-in (select a user).

const { ensureUser } = require("../data/helpers/session");

module.exports = function (router) {
  router.get("/sign-in", (req, res) => {
    ensureUser(req);
    res.redirect("/research-start");
  });

  router.post("/sign-in", (req, res) => {
    ensureUser(req);
    res.redirect("/research-start");
  });
};
