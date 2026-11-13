// app/routes/assessments-landing.js
//
// AS01 Assessments — the landing page for "Assessments" in the service navigation (Figma Decide v8,
// row "Assessments section", 12 November 2026, proposal; D-2026-144 proposed). Replaces D01.
// The navigation item always opens this page, in every plan state; Decide starts from the Decide
// tile here or on the dashboard. Served at /your-assessments because the alpha prototype owns
// /assessments.
//
//   AS01   setup not finished  — the Setup tasks not Completed, each a link; Continue setting up
//   AS01b  plan not approved   — the Decide tile (same state as the dashboard)
//   AS01c  plan approved       — approval line, View your plan (D21), one row per assessment
//   Previous assessments only when the council has one (same rule as the R04 Last assessment row).

const { ensureSetup, buildSetupTaskList } = require("../data/helpers/setup");
const { ensureDecide, applyDecideChrome } = require("../data/helpers/decide");
const { planState, tileFor } = require("../data/helpers/plan-state");
const { councilNameFor, isExampleCouncil, buildCycleInProgressModel } = require("../data/helpers/readiness");

function statusLabel(task) {
  const s = task.status || {};
  return s.text || (s.tag && s.tag.text) || "";
}

// AS01: every Setup task not Completed, in task-list order, using the task names (without numbers).
function unfinishedSetupTasks(setup) {
  const tl = buildSetupTaskList(setup);
  return [...tl.preServices, ...tl.servicesAndSystems, ...tl.finish]
    .filter((t) => statusLabel(t) !== "Completed")
    .map((t) => ({ name: t.title.text.replace(/^\d+\.\s*/, ""), href: t.href }));
}

module.exports = function (router) {
  router.get("/your-assessments", (req, res) => {
    const data = req.session.data;
    const setup = ensureSetup(data);
    const decide = ensureDecide(data);
    applyDecideChrome(req, res);
    const state = planState(data);
    const model = {
      pageTitle: "Assessments",
      councilName: councilNameFor(data),
      state,
      previousResults: isExampleCouncil(data),
    };
    if (state === "setup_incomplete") {
      model.tasks = unfinishedSetupTasks(setup);
      // S30 when only "Check and confirm" is left, otherwise the task list (S01).
      const onlyCheck = model.tasks.length === 1 && model.tasks[0].name === "Check and confirm";
      model.continueHref = onlyCheck ? "/setup/check-your-setup" : "/setup/task-list";
    } else if (state === "approved") {
      const approval = decide.approval || {};
      model.approvalLine = "Your plan was approved on " + (approval.date || "") + " by " + (approval.by || "") + ".";
      // One row per assessment in plan order; tags follow R05. The hint is the objectives only
      // (AS01c): the tag carries the status.
      model.assessments = buildCycleInProgressModel(data).assessments.map((a) =>
        Object.assign({}, a, { hint: { text: a.hint.text.split(". ")[0] + "." } })
      );
    } else {
      const tile = tileFor(data);
      // Back on the first Decide screen returns here.
      if (tile && tile.button) tile.button = Object.assign({}, tile.button, { href: tile.button.href + "?from=assessments" });
      model.tile = tile;
    }
    res.render("pages/your-assessments/index", model);
  });
};
