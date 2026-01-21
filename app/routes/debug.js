// app/routes/debug.js
// Debug helpers that work even if Nunjucks/templates are broken

module.exports = function (router) {
  router.get("/debug/plain", (req, res) => {
    res
      .status(200)
      .send("<h1>Debug is working</h1><p>If you can see this, routes are loading.</p>");
  });

  router.get("/debug/session", (req, res) => {
    const data = (req.session && req.session.data) ? req.session.data : {};
    res.status(200).send(`<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`);
  });

  router.get("/debug/render", (req, res) => {
    // This tests whether Nunjucks can render ANY template at the expected path
    res.render("pages/entry/index", { pageTitle: "Render test", labels: { serviceName: "Render test" } }, (err, html) => {
      if (err) {
        res.status(500).send(`<h1>Render failed</h1><pre>${escapeHtml(err.stack || String(err))}</pre>`);
        return;
      }
      res.status(200).send(html);
    });
  });
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
