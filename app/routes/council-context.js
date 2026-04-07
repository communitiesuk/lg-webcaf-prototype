const { requireSignedIn } = require("../data/helpers/session");
const {
  applyCouncilContext,
  formatCouncilName,
  getCouncilDisplayName,
  isCouncilSetupComplete,
} = require("../data/helpers/council-context");

module.exports = function (router) {
  router.use((req, res, next) => {
    const protectedPaths = ["/council-context/restore", "/council-setup"];
    const isProtected = protectedPaths.some(
      (path) => req.path === path || req.path.startsWith(path + "/")
    );
    if (!isProtected) return next();
    if (!requireSignedIn(req, res)) return;
    next();
  });

  router.get("/council-context/restore", (req, res) => {
    if (!isRoundTwoCouncilUser(req)) {
      return res.redirect("/entry");
    }
    if (isCouncilSetupComplete(req.session.data)) {
      return res.redirect(getCouncilLanding(req.session.data));
    }

    return res.render("pages/council-context-restore", {
      pageTitle: "Checking your council account",
      restoreEmail: (req.session.data.user && req.session.data.user.email) || "",
    });
  });

  router.post("/council-context/restore", (req, res) => {
    if (!isRoundTwoCouncilUser(req)) {
      return res.redirect("/entry");
    }

    const councilName = formatCouncilName(req.session.data.councilContextName);
    if (!councilName) {
      return res.redirect("/council-setup");
    }

    applyCouncilContext(req.session.data, councilName);
    delete req.session.data.councilContextName;
    return res.redirect(getCouncilLanding(req.session.data));
  });

  router.get("/council-setup", (req, res) => {
    if (!isRoundTwoCouncilUser(req)) {
      return res.redirect("/entry");
    }
    if (isCouncilSetupComplete(req.session.data)) {
      return res.redirect(getCouncilLanding(req.session.data));
    }

    return res.render("pages/council-setup", {
      pageTitle: "Set up your council account",
      councilName: "",
      councilDisplayName: getCouncilDisplayName(req.session.data),
      error: null,
    });
  });

  router.post("/council-setup", (req, res) => {
    if (!isRoundTwoCouncilUser(req)) {
      return res.redirect("/entry");
    }

    const councilName = formatCouncilName(req.session.data.councilSetupName);
    if (!councilName) {
      return res.render("pages/council-setup", {
        pageTitle: "Set up your council account",
        councilName: "",
        councilDisplayName: getCouncilDisplayName(req.session.data),
        error: {
          items: [{ field: "councilSetupName", text: "Enter your council name." }],
        },
      });
    }

    applyCouncilContext(req.session.data, councilName);
    delete req.session.data.councilSetupName;
    return res.redirect(getCouncilLanding(req.session.data));
  });
};

function isRoundTwoCouncilUser(req) {
  return Boolean(
    req &&
    req.session &&
    req.session.data &&
    req.session.data.researchRound === "round-2" &&
    req.session.data.user &&
    req.session.data.user.role === "council"
  );
}

function getCouncilLanding(sessionData) {
  if (sessionData && sessionData.assessment && sessionData.assessment.id) {
    return "/assessments/current/dashboard?view=my";
  }
  return "/entry/start-new?returnTo=/onboarding";
}
