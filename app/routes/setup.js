// app/routes/setup.js
// "Set up your council" (Setup v11, Figma "07 Set up your council · v11 (content review)").
// Every route reads and writes the council record (data/helpers/council-record.js); lists, counts
// and statuses are worked out from it. Return rules:
//   ?from=service   an action started on the service page (S37) returns there, with a banner (S37c)
//   ?from=check     an action started on S24 returns to S24
//   ?from=walk      "Go to the first missing detail": each save opens the next missing detail
//   ?from=s30       a Change link on S30 returns to S30
//   ?return=summary a Change link on S52 returns to S52 (with its own ?from carried along)

const record = require("../data/helpers/council-record");
const {
  ensureSetup,
  applySetupChrome,
  buildSetupTaskList,
  COUNCIL_REGISTER,
  getService,
  getPlatform,
  getSystem,
  getSupplier,
  deriveCriticality,
  buildServiceRows,
  buildServicePage,
  buildRemoveServiceConsequences,
  buildPlatformRows,
  buildPlatformPage,
  buildRemovePlatformConsequence,
  buildPlatformChoices,
  buildSystemRows,
  buildSystemCards,
  buildSupportedServiceOptions,
  buildRemoveSystemConsequences,
  deriveHostingPlatformName,
  systemDetailCounter,
  buildSetupCheck,
} = require("../data/helpers/setup");

// S18 shows the council type beside each council, as Claim screen 29 does.
const COUNCIL_TYPE_BY_NAME = new Map(require("../data/councils").map((c) => [c.name, c.type]));
function councilWithType(name) {
  const t = COUNCIL_TYPE_BY_NAME.get(name);
  return t ? name + " (" + t + ")" : name;
}

const toList = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]);
const clean = (v) => (v || "").toString().trim();

// Read and remove posted fields from the shared data bag.
function take(req, keys) {
  const out = {};
  keys.forEach((k) => {
    out[k] = req.session.data[k];
    delete req.session.data[k];
  });
  return out;
}

// A local /setup/ path only.
function safeSetupPath(v) {
  v = clean(v);
  return v.startsWith("/setup/") && !v.startsWith("//") ? v : "";
}

// One-off success banner (S37c, S50, S23 and S39 after a removal).
function setBanner(req, heading, body) {
  req.session.data.setupBanner = { heading, body: body || "" };
}
function takeBanner(req) {
  const b = req.session.data.setupBanner;
  delete req.session.data.setupBanner;
  return b || null;
}

// The three list pages (S36, S39, S23) can be opened from another page that expects the person
// back: S30's Change links (?return=/setup/check-your-setup) and S14's "Add or change your essential
// services". Their back link and main button then go there. It is cleared on the task list and S30.
function listReturn(req, list) {
  const r = req.session.data.setupReturn || {};
  const asked = safeSetupPath(req.query.return);
  if (asked) {
    r[list] = asked;
    req.session.data.setupReturn = r;
  }
  return r[list] || "";
}
function clearListReturns(req) {
  delete req.session.data.setupReturn;
}

const servicePageHref = (svc) => `/setup/essential-services/${svc.id}`;
const systemSummaryHref = (sys, from) => `/setup/critical-systems/${sys.id}/summary` + (from ? `?from=${encodeURIComponent(from)}` : "");

// Where S52 returns to ("Back" and the end of an action), from its ?from value.
function s52BackHref(setup, from) {
  if (from === "check") return "/setup/coverage-check";
  if (from && from.startsWith("service:")) {
    const svc = getService(setup, from.slice(8));
    if (svc) return servicePageHref(svc);
  }
  return "/setup/critical-systems";
}

// Hidden fields a question page carries so its POST knows where to go.
function carry(req) {
  return { csReturn: clean(req.query.return) === "summary" ? "summary" : "", csFrom: clean(req.query.from) };
}

// After a system question is saved: the next missing detail, S52, S24, or the default next page.
function afterSystemQuestion(req, res, sys, nextHref) {
  const { csReturn, csFrom } = take(req, ["csReturn", "csFrom"]);
  if (clean(csFrom) === "walk") return res.redirect("/setup/coverage-check/next");
  if (clean(csReturn) === "summary") return res.redirect(systemSummaryHref(sys, clean(csFrom)));
  if (clean(csFrom) === "check") return res.redirect("/setup/coverage-check");
  return res.redirect(nextHref || systemSummaryHref(sys));
}

// Back link for a system question.
function questionBack(req, sys, fallback) {
  if (clean(req.query.return) === "summary") return systemSummaryHref(sys, clean(req.query.from));
  if (clean(req.query.from) === "check" || clean(req.query.from) === "walk") return "/setup/coverage-check";
  return fallback || systemSummaryHref(sys);
}

module.exports = function (router) {
  router.use((req, res, next) => {
    if (!req.path.startsWith("/setup")) return next();
    ensureSetup(req.session.data);
    applySetupChrome(req, res);
    next();
  });

  router.get("/setup", (req, res) => res.redirect("/setup/task-list"));

  // S01 Set up your council
  router.get("/setup/task-list", (req, res) => {
    const setup = ensureSetup(req.session.data);
    clearListReturns(req);
    res.render("pages/setup/task-list", {
      pageTitle: "Set up your council",
      councilName: setup.council.name,
      tasks: buildSetupTaskList(setup),
    });
  });

  // ----- Tasks 2 and 3 --------------------------------------------------------------------

  const fromS30 = (req) => clean(req.query.from) === "s30" || clean(req.session.data.from) === "s30";
  const s30Or = (req, href) => {
    const back = clean(req.session.data.from) === "s30";
    delete req.session.data.from;
    return back ? "/setup/check-your-setup" : href;
  };

  // S02 Your sector context: read only; Continue confirms it. (S02a and S02b removed in v11.)
  router.get("/setup/sector-context", (req, res) => {
    res.render("pages/setup/sector-context", { pageTitle: "Your sector context", backHref: "/setup/task-list" });
  });
  router.post("/setup/sector-context", (req, res) => {
    ensureSetup(req.session.data).sectorContext.confirmed = true;
    return res.redirect("/setup/council-context");
  });

  // S03 Your council context
  router.get("/setup/council-context", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/council-context", {
      pageTitle: "Your council context",
      backHref: fromS30(req) ? "/setup/check-your-setup" : "/setup/sector-context",
      from: fromS30(req) ? "s30" : "",
      context: setup.councilContext,
      cniSectors: record.CNI_SECTORS,
      otTypes: record.OT_TYPES,
    });
  });
  router.post("/setup/council-context", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const f = take(req, ["councilContextCni", "councilContextOt", "councilContextIt", "recentItDetail", "upcomingItDetail", "ccAnythingElse"]);
    const ot = toList(f.councilContextOt).map(clean).filter(Boolean);
    const it = toList(f.councilContextIt);
    const none = it.includes("none");
    const cni = clean(f.councilContextCni);
    setup.councilContext = {
      cniSectors: cni ? [cni] : [],
      otTypes: ot.includes("none") ? ["None of these"] : ot.filter((v) => record.OT_TYPES.includes(v)),
      itTransformation: {
        recent: !none && it.includes("recent"),
        recentDetail: !none && it.includes("recent") ? clean(f.recentItDetail) : "",
        upcoming: !none && it.includes("upcoming"),
        upcomingDetail: !none && it.includes("upcoming") ? clean(f.upcomingItDetail) : "",
        noneOfThese: none,
      },
      anythingElse: clean(f.ccAnythingElse),
    };
    return res.redirect(s30Or(req, "/setup/previous-assessment"));
  });

  // S03a Has your council completed a CAF organisational assessment before? S03ae is its error state.
  router.get("/setup/previous-assessment", (req, res) => {
    const setup = ensureSetup(req.session.data);
    renderPreviousAssessment(res, (setup.organisationAssessment || {}).answer || "", false, fromS30(req));
  });
  router.post("/setup/previous-assessment", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const answer = clean(take(req, ["orgAssessedBefore"]).orgAssessedBefore);
    if (!record.ASSESSED_BEFORE.includes(answer)) {
      return renderPreviousAssessment(res, "", true, clean(req.session.data.from) === "s30");
    }
    setup.organisationAssessment = { answer };
    return res.redirect(s30Or(req, "/setup/methodology?from=context"));
  });

  // S04 Tell us how you will identify your essential services and critical systems
  router.get("/setup/methodology", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/methodology", {
      pageTitle: "Tell us how you will identify your essential services and critical systems",
      backHref: fromS30(req) ? "/setup/check-your-setup" : clean(req.query.from) === "context" ? "/setup/previous-assessment" : "/setup/task-list",
      from: fromS30(req) ? "s30" : "",
      approach: setup.methodology.approach,
    });
  });
  router.post("/setup/methodology", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const approach = clean(take(req, ["methodologyApproach"]).methodologyApproach) === "other" ? "other" : "five-lens";
    setup.methodology.approach = approach;
    if (approach === "other") {
      const back = clean(req.session.data.from) === "s30";
      delete req.session.data.from;
      return res.redirect("/setup/methodology-detail" + (back ? "?from=s30" : ""));
    }
    return res.redirect(s30Or(req, "/setup/task-list"));
  });

  // S05 Tell us about your approach
  router.get("/setup/methodology-detail", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/methodology-detail", {
      pageTitle: "Tell us about your approach",
      backHref: "/setup/methodology" + (fromS30(req) ? "?from=s30" : ""),
      from: fromS30(req) ? "s30" : "",
      methodology: setup.methodology,
    });
  });
  router.post("/setup/methodology-detail", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const f = take(req, ["methodologyNotes", "methodologyLink"]);
    setup.methodology.notes = clean(f.methodologyNotes);
    setup.methodology.link = clean(f.methodologyLink);
    return res.redirect(s30Or(req, "/setup/task-list"));
  });

  // ----- Task 4: Your essential services ---------------------------------------------------

  // S35 Which essential services does your council deliver? (list by tier). S40 is its error state;
  // S35b is this page for a lower-tier council.
  function renderChoose(req, res, setup, ticked, showError) {
    res.render("pages/setup/essential-services/choose", {
      pageTitle: (showError ? "Error: " : "") + "Which essential services does your council deliver?",
      backHref: (setup.essentialServices || []).length ? "/setup/essential-services" : (req.session.data.setupReturn || {}).services || "/setup/task-list",
      banner: takeBanner(req),
      councilsLabel: record.councilTypePlural(setup),
      // A listed service that already has something added is kept if unticked here; the hint says
      // where it can be removed instead.
      options: record.essentialServiceOptions(setup).map((name) => {
        const svc = (setup.essentialServices || []).find((s) => s.name === name);
        const inUse = svc && record.serviceStatus(setup, svc) !== "not_started";
        return { value: name, text: name, checked: ticked.has(name), hint: inUse ? { text: "To remove this service, open it from Your essential services and select Remove this service." } : undefined };
      }),
      showError,
    });
  }
  router.get("/setup/essential-services/choose", (req, res) => {
    const setup = ensureSetup(req.session.data);
    renderChoose(req, res, setup, new Set((setup.essentialServices || []).map((s) => s.name)), false);
  });
  router.post("/setup/essential-services/choose", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const f = take(req, ["essentialServiceChoices", "action"]);
    const chosen = toList(f.essentialServiceChoices).map(clean).filter((n) => record.essentialServiceOptions(setup).includes(n));
    const adding = clean(f.action) === "add";
    if (!adding && !chosen.length && !(setup.essentialServices || []).length) {
      return renderChoose(req, res, setup, new Set(), true);
    }
    // Add newly ticked services. Unticking a listed service removes it only if nothing is added to
    // it yet; a service with functions, links or a reason is kept (it is removed on S46).
    const existing = new Set((setup.essentialServices || []).map((s) => s.name));
    chosen.forEach((name) => {
      if (!existing.has(name)) {
        setup.essentialServices.push({ id: record.newId("svc", name, setup.essentialServices), name, source: "list", functions: [], noSystemReason: "", infraLater: false });
      }
    });
    (setup.essentialServices || [])
      .filter((s) => s.source === "list" && !chosen.includes(s.name) && record.serviceStatus(setup, s) === "not_started")
      .forEach((s) => record.removeService(setup, s.id));
    return res.redirect(adding ? "/setup/essential-services/add?from=choose" : "/setup/essential-services");
  });

  // S36 Your essential services (task list). S50 is this page with a banner after a removal.
  router.get("/setup/essential-services", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const ret = listReturn(req, "services");
    if (!(setup.essentialServices || []).length) return res.redirect("/setup/essential-services/choose");
    res.render("pages/setup/essential-services/index", {
      pageTitle: "Summary of your essential services",
      backHref: ret || "/setup/task-list",
      continueHref: ret || "/setup/task-list",
      returnLabel: ret.startsWith("/setup/check-your-setup") ? "Back to check your setup" : "",
      rows: buildServiceRows(setup),
      banner: takeBanner(req),
    });
  });

  // S09 Add an essential service (not on the list). S32 is its error state.
  router.get("/setup/essential-services/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/essential-services/add", {
      pageTitle: "Add an essential service",
      backHref: clean(req.query.from) === "choose" || !(setup.essentialServices || []).length ? "/setup/essential-services/choose" : "/setup/essential-services",
      councilsLabel: record.councilTypePlural(setup),
      name: "",
    });
  });
  router.post("/setup/essential-services/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const name = clean(take(req, ["newServiceName"]).newServiceName);
    if (!name) {
      return res.render("pages/setup/essential-services/add", {
        pageTitle: "Error: Add an essential service",
        backHref: "/setup/essential-services",
        councilsLabel: record.councilTypePlural(setup),
        name: "",
        error: { field: "newServiceName", text: "Enter the name of the service" },
      });
    }
    // A service already added is not added twice; a name from the list counts as listed.
    const exists = (setup.essentialServices || []).some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const listed = record.essentialServiceOptions(setup).find((n) => n.toLowerCase() === name.toLowerCase());
      setup.essentialServices.push({ id: record.newId("svc", name, setup.essentialServices), name: listed || name, source: listed ? "list" : "added", functions: [], noSystemReason: "", infraLater: false });
    }
    return res.redirect("/setup/essential-services");
  });

  // Load the service in :serviceId, or go back to S36.
  function withService(handler) {
    return (req, res) => {
      const setup = ensureSetup(req.session.data);
      const svc = getService(setup, req.params.serviceId);
      if (!svc) return res.redirect("/setup/essential-services");
      return handler(req, res, setup, svc);
    };
  }
  const fromService = (req) => clean(req.query.from) === "service" || clean(req.session.data.from) === "service";

  // S37 the service page (S37b when nothing is linked; S37c with a banner after an action).
  router.get("/setup/essential-services/:serviceId", withService((req, res, setup, svc) => {
    const from = clean(req.query.from);
    res.render("pages/setup/essential-services/service", {
      pageTitle: svc.name,
      backHref: from === "check" ? "/setup/coverage-check" : "/setup/essential-services",
      service: svc,
      page: buildServicePage(setup, svc),
      banner: takeBanner(req),
    });
  }));

  // S10 List the main functions (first step for a new service). Save and continue → S38.
  router.get("/setup/essential-services/:serviceId/functions", withService((req, res, setup, svc) => {
    res.render("pages/setup/essential-services/functions", {
      pageTitle: "List the main functions of this essential service",
      backHref: "/setup/essential-services",
      service: svc,
    });
  }));
  router.post("/setup/essential-services/:serviceId/functions", withService((req, res, setup, svc) => {
    return res.redirect(`/setup/essential-services/${svc.id}/core-infrastructure`);
  }));
  router.get("/setup/essential-services/:serviceId/functions/:functionId/remove", withService((req, res, setup, svc) => {
    record.removeFunction(setup, svc, req.params.functionId);
    return res.redirect(`/setup/essential-services/${svc.id}/functions`);
  }));

  // S10b Add a function, or change one (from S37). From S37 it returns there with a banner.
  function renderFunction(res, svc, opts) {
    res.render("pages/setup/essential-services/add-function", Object.assign({
      pageTitle: (opts.error ? "Error: " : "") + (opts.fn ? "Change a function" : "Add a function"),
      service: svc,
      name: "",
    }, opts));
  }
  router.get("/setup/essential-services/:serviceId/functions/add", withService((req, res, setup, svc) => {
    renderFunction(res, svc, {
      backHref: fromService(req) ? servicePageHref(svc) : `/setup/essential-services/${svc.id}/functions`,
      action: `/setup/essential-services/${svc.id}/functions/add`,
      from: fromService(req) ? "service" : "",
    });
  }));
  router.post("/setup/essential-services/:serviceId/functions/add", withService((req, res, setup, svc) => {
    const { newFunctionName, from } = take(req, ["newFunctionName", "from"]);
    const name = clean(newFunctionName);
    const toService = clean(from) === "service";
    if (!name) {
      return renderFunction(res, svc, {
        backHref: toService ? servicePageHref(svc) : `/setup/essential-services/${svc.id}/functions`,
        action: `/setup/essential-services/${svc.id}/functions/add`,
        from: toService ? "service" : "",
        error: { field: "newFunctionName", text: "Enter the name of the function" },
      });
    }
    svc.functions = svc.functions || [];
    svc.functions.push({ id: record.newId("fn", name, svc.functions), name });
    if (toService) {
      setBanner(req, `${name} has been added to ${svc.name}`);
      return res.redirect(servicePageHref(svc));
    }
    return res.redirect(`/setup/essential-services/${svc.id}/functions`);
  }));
  router.get("/setup/essential-services/:serviceId/functions/:functionId/change", withService((req, res, setup, svc) => {
    const fn = (svc.functions || []).find((f) => f.id === req.params.functionId);
    if (!fn) return res.redirect(servicePageHref(svc));
    renderFunction(res, svc, { fn, name: fn.name, backHref: servicePageHref(svc), action: `/setup/essential-services/${svc.id}/functions/${fn.id}/change`, from: "service" });
  }));
  router.post("/setup/essential-services/:serviceId/functions/:functionId/change", withService((req, res, setup, svc) => {
    const fn = (svc.functions || []).find((f) => f.id === req.params.functionId);
    const { newFunctionName } = take(req, ["newFunctionName", "from"]);
    if (!fn) return res.redirect(servicePageHref(svc));
    const name = clean(newFunctionName);
    if (!name) {
      return renderFunction(res, svc, { fn, name: "", backHref: servicePageHref(svc), action: req.originalUrl, from: "service", error: { field: "newFunctionName", text: "Enter the name of the function" } });
    }
    fn.name = name;
    setBanner(req, `The function has been changed to ${name}`);
    return res.redirect(servicePageHref(svc));
  }));

  // S38 core infrastructure for a service. Both buttons return to the service page (S37).
  router.get("/setup/essential-services/:serviceId/core-infrastructure", withService((req, res, setup, svc) => {
    const from = clean(req.query.from);
    res.render("pages/setup/shared-infrastructure/for-service", {
      pageTitle: `List the core infrastructure platforms that support ${svc.name.toLowerCase()}`,
      backHref: from === "service" ? servicePageHref(svc) : `/setup/essential-services/${svc.id}/functions`,
      service: svc,
      from,
      platforms: buildPlatformChoices(setup, record.platformsForService(setup, svc.id).map((p) => p.id)),
      addPlatformHref: `/setup/shared-infrastructure/add-platform?link=service:${svc.id}&back=${encodeURIComponent(`/setup/essential-services/${svc.id}/core-infrastructure${from ? "?from=" + from : ""}`)}`,
    });
  }));
  router.post("/setup/essential-services/:serviceId/core-infrastructure", withService((req, res, setup, svc) => {
    const { servicePlatforms, action, from } = take(req, ["servicePlatforms", "action", "from"]);
    const ticked = toList(servicePlatforms);
    if (clean(action) === "later") {
      svc.infraLater = true;
    } else {
      (setup.platforms || []).forEach((p) => {
        p.linkedServices = (p.linkedServices || []).filter((id) => id !== svc.id);
        if (ticked.includes(p.id)) p.linkedServices.push(svc.id);
      });
      svc.infraLater = false;
    }
    if (clean(from) === "service") setBanner(req, `Core infrastructure for ${svc.name} has been updated`);
    return res.redirect(servicePageHref(svc));
  }));

  // S37d Which critical systems support [service]? A to Z. "Add a critical system" opens S14 with
  // this service ticked, and returns to the service page.
  router.get("/setup/essential-services/:serviceId/systems", withService((req, res, setup, svc) => {
    const linked = new Set(record.systemsForService(setup, svc).map((s) => s.id));
    const from = clean(req.query.from);
    res.render("pages/setup/essential-services/systems", {
      pageTitle: `Which critical systems support ${svc.name}?`,
      backHref: from === "walk" || from === "check" ? "/setup/coverage-check" : servicePageHref(svc),
      service: svc,
      from,
      options: (setup.criticalSystems || []).slice().sort(record.byName).map((s) => ({ value: s.id, text: s.name, checked: linked.has(s.id) })),
    });
  }));
  router.post("/setup/essential-services/:serviceId/systems", withService((req, res, setup, svc) => {
    const { serviceSystems, action, from } = take(req, ["serviceSystems", "action", "from"]);
    const ticked = new Set(toList(serviceSystems));
    const before = new Set(record.systemsForService(setup, svc).map((s) => s.id));
    const added = [];
    const removed = [];
    (setup.criticalSystems || []).forEach((sys) => {
      const want = ticked.has(sys.id);
      if (want && !before.has(sys.id)) { record.setSystemServiceLink(setup, sys, svc, true); added.push(sys); }
      if (!want && before.has(sys.id)) { record.setSystemServiceLink(setup, sys, svc, false); removed.push(sys); }
    });
    if (clean(action) === "add") {
      return res.redirect(`/setup/critical-systems/add?service=${svc.id}&from=service`);
    }
    if (clean(from) === "walk") return res.redirect("/setup/coverage-check/next");
    if (clean(from) === "check") return res.redirect("/setup/coverage-check");
    if (added.length === 1 && !removed.length) {
      setBanner(req, `${added[0].name} is now linked to ${svc.name}`, "Check its details in the Critical systems section.");
    } else if (added.length || removed.length) {
      const parts = [];
      if (added.length) parts.push(`${added.length} critical ${record.plural(added.length, "system")} linked`);
      if (removed.length) parts.push(`${removed.length} unlinked`);
      setBanner(req, `Critical systems for ${svc.name} updated: ${parts.join(", ")}`);
    }
    return res.redirect(servicePageHref(svc));
  }));

  // S46 Remove [service]? → S36 with the S50 banner.
  router.get("/setup/essential-services/:serviceId/remove", withService((req, res, setup, svc) => {
    res.render("pages/setup/essential-services/remove", {
      pageTitle: `Remove ${svc.name.toLowerCase()}?`,
      backHref: servicePageHref(svc),
      service: svc,
      consequences: buildRemoveServiceConsequences(setup, svc),
    });
  }));
  router.post("/setup/essential-services/:serviceId/remove", withService((req, res, setup, svc) => {
    const { orphaned } = record.removeService(setup, svc.id);
    const body = orphaned.length
      ? `This means that the critical ${record.plural(orphaned.length, "system")} ${orphaned.map((s) => s.name).join(" and ")} ${orphaned.length === 1 ? "is" : "are"} no longer linked to any essential services.`
      : "";
    setBanner(req, `${svc.name} has been removed`, body);
    return res.redirect((setup.essentialServices || []).length ? "/setup/essential-services" : "/setup/essential-services/choose");
  }));

  // S42 Why does [service] not need a critical system? → back to S24 (or the next missing detail).
  router.get("/setup/essential-services/:serviceId/no-system-reason", withService((req, res, setup, svc) => {
    res.render("pages/setup/essential-services/no-system-reason", {
      pageTitle: `Why does ${svc.name.toLowerCase()} not need a critical system?`,
      backHref: "/setup/coverage-check",
      service: svc,
      from: clean(req.query.from),
    });
  }));
  router.post("/setup/essential-services/:serviceId/no-system-reason", withService((req, res, setup, svc) => {
    const { noSystemReason, from } = take(req, ["noSystemReason", "from"]);
    svc.noSystemReason = clean(noSystemReason);
    return res.redirect(clean(from) === "walk" ? "/setup/coverage-check/next" : "/setup/coverage-check");
  }));

  // ----- Task 5: core infrastructure ------------------------------------------------------

  // S39 Your core infrastructure (task list), with a banner after a removal.
  router.get("/setup/shared-infrastructure", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const ret = listReturn(req, "platforms");
    res.render("pages/setup/shared-infrastructure/index", {
      pageTitle: "Your core infrastructure",
      backHref: ret || "/setup/task-list",
      continueHref: ret || "/setup/task-list",
      returnLabel: ret ? "Back to check your setup" : "",
      rows: buildPlatformRows(setup),
      banner: takeBanner(req),
    });
  });

  // S12c Add a platform. ?link=service:<id>|system:<id> links the new platform; ?back= returns there.
  function renderPlatform(res, setup, opts) {
    res.render("pages/setup/shared-infrastructure/platform", Object.assign({
      pageTitle: (opts.error ? "Error: " : "") + "Add a core infrastructure platform",
      typeOptions: record.PLATFORM_TYPES,
      suppliers: setup.suppliers || [],
    }, opts));
  }
  function platformCaption(setup, link) {
    if (link.startsWith("service:")) return (getService(setup, link.slice(8)) || {}).name || "Your core infrastructure";
    if (link.startsWith("system:")) return (getSystem(setup, link.slice(7)) || {}).name || "Your core infrastructure";
    return "Your core infrastructure";
  }
  // A platform's typed answers, kept while the person adds a supplier (S41) and comes back.
  function takePlatformDraft(req) {
    const d = req.session.data.platformDraft;
    delete req.session.data.platformDraft;
    return clean(req.query.draft) === "1" && d ? d : null;
  }
  router.get("/setup/shared-infrastructure/add-platform", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const link = clean(req.query.link);
    const back = safeSetupPath(req.query.back) || ((setup.platforms || []).length ? "/setup/shared-infrastructure" : "/setup/task-list");
    const draft = takePlatformDraft(req) || {};
    renderPlatform(res, setup, {
      mode: "add",
      caption: platformCaption(setup, link),
      backHref: back,
      link,
      back,
      action: "/setup/shared-infrastructure/add-platform",
      platform: { name: draft.name || "", type: draft.type || "", managedBy: draft.managedBy || "", supplierId: clean(req.query.supplier) || draft.supplierId || "" },
    });
  });
  router.post("/setup/shared-infrastructure/add-platform", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const f = take(req, ["platformName", "platformType", "platformManager", "whichSupplier", "link", "back", "action"]);
    const name = clean(f.platformName);
    const link = clean(f.link);
    const back = safeSetupPath(f.back);
    const managedBy = clean(f.platformManager);
    if (clean(f.action) === "add-supplier") {
      req.session.data.platformDraft = { name, type: clean(f.platformType), managedBy, supplierId: clean(f.whichSupplier) };
      const here = "/setup/shared-infrastructure/add-platform?" + new URLSearchParams({ link, back, draft: "1" }).toString();
      return res.redirect("/setup/suppliers/add?back=" + encodeURIComponent(here));
    }
    if (!name) {
      return renderPlatform(res, setup, {
        mode: "add", caption: platformCaption(setup, link), backHref: back || "/setup/shared-infrastructure", link, back,
        action: "/setup/shared-infrastructure/add-platform",
        platform: { name: "", type: clean(f.platformType), managedBy, supplierId: clean(f.whichSupplier) },
        error: { field: "platformName", text: "Enter the name of the platform" },
      });
    }
    const platform = {
      id: record.newId("plat", name, setup.platforms),
      name,
      type: clean(f.platformType),
      managedBy,
      supplierId: managedBy === "supplier-fully" || managedBy === "supplier-partly" ? clean(f.whichSupplier) : "",
      linkedServices: [],
      linkedSystems: [],
    };
    setup.platforms.push(platform);
    if (link.startsWith("service:") && getService(setup, link.slice(8))) {
      platform.linkedServices.push(link.slice(8));
      return res.redirect(back || `/setup/essential-services/${link.slice(8)}/core-infrastructure`);
    }
    if (link.startsWith("system:") && getSystem(setup, link.slice(7))) {
      platform.linkedSystems.push(link.slice(7));
      return res.redirect(back || `/setup/critical-systems/${link.slice(7)}/platforms`);
    }
    return res.redirect(`/setup/shared-infrastructure/${platform.id}/relies?from=new`);
  });

  function withPlatform(handler) {
    return (req, res) => {
      const setup = ensureSetup(req.session.data);
      const p = getPlatform(setup, req.params.platformId);
      if (!p) return res.redirect("/setup/shared-infrastructure");
      return handler(req, res, setup, p);
    };
  }
  const platformPageHref = (p) => `/setup/shared-infrastructure/${p.id}`;

  // S39a the platform page.
  router.get("/setup/shared-infrastructure/:platformId", withPlatform((req, res, setup, p) => {
    res.render("pages/setup/shared-infrastructure/platform-page", {
      pageTitle: p.name,
      backHref: "/setup/shared-infrastructure",
      platform: p,
      page: buildPlatformPage(setup, p),
      banner: takeBanner(req),
    });
  }));

  // S12c with answers filled in (Change on S39a). Save returns to S39a.
  // Changing a platform (S12c with answers filled in). The heading names the platform, so it does not
  // read as adding a new one.
  router.get("/setup/shared-infrastructure/:platformId/edit", withPlatform((req, res, setup, p) => {
    const draft = takePlatformDraft(req) || {};
    renderPlatform(res, setup, {
      pageTitle: p.name,
      mode: "edit",
      caption: "Your core infrastructure",
      backHref: platformPageHref(p),
      action: `/setup/shared-infrastructure/${p.id}/edit`,
      platform: Object.assign({}, p, draft, clean(req.query.supplier) ? { supplierId: clean(req.query.supplier) } : {}),
      removeHref: `/setup/shared-infrastructure/${p.id}/remove`,
    });
  }));
  router.post("/setup/shared-infrastructure/:platformId/edit", withPlatform((req, res, setup, p) => {
    const f = take(req, ["platformName", "platformType", "platformManager", "whichSupplier", "link", "back", "action"]);
    if (clean(f.action) === "add-supplier") {
      req.session.data.platformDraft = { name: clean(f.platformName) || p.name, type: clean(f.platformType), managedBy: clean(f.platformManager), supplierId: clean(f.whichSupplier) };
      return res.redirect("/setup/suppliers/add?back=" + encodeURIComponent(`/setup/shared-infrastructure/${p.id}/edit?draft=1`));
    }
    p.name = clean(f.platformName) || p.name;
    p.type = clean(f.platformType);
    p.managedBy = clean(f.platformManager);
    p.supplierId = p.managedBy === "supplier-fully" || p.managedBy === "supplier-partly" ? clean(f.whichSupplier) : "";
    record.pruneSuppliers(setup);
    return res.redirect(platformPageHref(p));
  }));

  // S45 What relies on [platform]? → S39a (or S24, or the next missing detail).
  router.get("/setup/shared-infrastructure/:platformId/relies", withPlatform((req, res, setup, p) => {
    const from = clean(req.query.from);
    res.render("pages/setup/shared-infrastructure/relies", {
      pageTitle: `What relies on ${p.name}?`,
      backHref: from === "check" || from === "walk" ? "/setup/coverage-check" : platformPageHref(p),
      platform: p,
      from,
      services: (setup.essentialServices || []).map((s) => ({ value: "svc:" + s.id, text: s.name, checked: (p.linkedServices || []).includes(s.id) })),
      systems: (setup.criticalSystems || []).map((s) => ({ value: "sys:" + s.id, text: s.name, checked: (p.linkedSystems || []).includes(s.id) })),
    });
  }));
  router.post("/setup/shared-infrastructure/:platformId/relies", withPlatform((req, res, setup, p) => {
    const { relies, from } = take(req, ["relies", "from"]);
    const choices = toList(relies);
    const later = choices.includes("later");
    p.linkedServices = later ? [] : choices.filter((v) => v.startsWith("svc:")).map((v) => v.slice(4));
    p.linkedSystems = later ? [] : choices.filter((v) => v.startsWith("sys:")).map((v) => v.slice(4));
    if (clean(from) === "walk") return res.redirect("/setup/coverage-check/next");
    if (clean(from) === "check") return res.redirect("/setup/coverage-check");
    return res.redirect(platformPageHref(p));
  }));

  // S49 Remove [platform]? → S39 with a banner.
  router.get("/setup/shared-infrastructure/:platformId/remove", withPlatform((req, res, setup, p) => {
    res.render("pages/setup/shared-infrastructure/remove", {
      pageTitle: `Remove ${p.name}?`,
      backHref: platformPageHref(p),
      platform: p,
      consequence: buildRemovePlatformConsequence(p),
    });
  }));
  router.post("/setup/shared-infrastructure/:platformId/remove", withPlatform((req, res, setup, p) => {
    record.removePlatform(setup, p.id);
    setBanner(req, `${p.name} has been removed`);
    return res.redirect("/setup/shared-infrastructure");
  }));

  // ----- Task 6: critical systems ---------------------------------------------------------

  // S13 (no systems yet) or S23 Your critical systems, with a banner after a removal.
  router.get("/setup/critical-systems", (req, res) => {
    const setup = ensureSetup(req.session.data);
    // Decide's "nothing left" page (D20) also sends people here with ?return=/decide/...
    const decideRet = clean(req.query.return).startsWith("/decide/") ? clean(req.query.return) : "";
    const ret = decideRet || listReturn(req, "systems");
    const backHref = ret || "/setup/task-list";
    if (!(setup.criticalSystems || []).length) {
      return res.render("pages/setup/critical-systems/empty", { pageTitle: "Your critical systems", backHref, banner: takeBanner(req) });
    }
    res.render("pages/setup/critical-systems/index", {
      pageTitle: "Your critical systems",
      backHref,
      continueHref: ret || "/setup/task-list",
      rows: buildSystemRows(setup),
      banner: takeBanner(req),
    });
  });

  // S14 Add a critical system. ?service=<id> ticks that service; with ?from=service it returns to
  // the service page with a banner, otherwise to S52.
  function renderSystemForm(res, setup, opts) {
    res.render("pages/setup/critical-systems/add", Object.assign({
      pageTitle: (opts.errors && opts.errors.length ? "Error: " : "") + "Add a critical system",
      assessedOptions: record.ASSESSED_BEFORE.map((v) => ({ value: v, text: record.ASSESSED_BEFORE_LABELS[v] })),
    }, opts));
  }
  router.get("/setup/critical-systems/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const svc = getService(setup, clean(req.query.service));
    const from = clean(req.query.from);
    const saved = takeSystemDraft(req, "add");
    const draft = saved || { serviceIds: svc ? [svc.id] : [], functionIds: [] };
    renderSystemForm(res, setup, {
      mode: "add",
      backHref: from === "service" && svc ? `/setup/essential-services/${svc.id}/systems?from=service` : "/setup/critical-systems",
      action: "/setup/critical-systems/add",
      system: Object.assign({ name: "", description: "", assessedBefore: "", servicesLater: false }, draft),
      serviceOptions: buildSupportedServiceOptions(setup, draft),
      serviceId: svc ? svc.id : (saved && saved.serviceId) || "",
      from: from || (saved && saved.from) || "",
    });
  });

  // Read S14's answers. Values are "fn:<id>" or "svc:<id>"; "later" is the exclusive option.
  // S14's typed answers, kept when the person follows "Add or change your essential services" and
  // used once when they next open the same form.
  function takeSystemDraft(req, key) {
    const d = req.session.data.systemDraft;
    if (!d || d.key !== key) return null;
    delete req.session.data.systemDraft;
    return d;
  }
  function saveSystemDraft(req, key, f) {
    req.session.data.systemDraft = Object.assign({ key }, f);
  }

  function readSystemForm(req) {
    const f = take(req, ["systemName", "systemDescription", "supportedServices", "assessedBefore", "serviceId", "from", "csReturn", "csFrom", "action"]);
    const choices = toList(f.supportedServices);
    const later = choices.includes("later");
    return {
      name: clean(f.systemName),
      description: clean(f.systemDescription),
      serviceIds: later ? [] : choices.filter((v) => v.startsWith("svc:")).map((v) => v.slice(4)),
      functionIds: later ? [] : choices.filter((v) => v.startsWith("fn:")).map((v) => v.slice(3)),
      servicesLater: later,
      assessedBefore: record.ASSESSED_BEFORE.includes(clean(f.assessedBefore)) ? clean(f.assessedBefore) : "",
      serviceId: clean(f.serviceId),
      from: clean(f.from),
      csReturn: clean(f.csReturn),
      csFrom: clean(f.csFrom),
      action: clean(f.action),
    };
  }

  router.post("/setup/critical-systems/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const f = readSystemForm(req);
    if (f.action === "services") {
      saveSystemDraft(req, "add", f);
      return res.redirect("/setup/essential-services?return=" + encodeURIComponent("/setup/critical-systems/add"));
    }
    if (!f.name) {
      return renderSystemForm(res, setup, {
        mode: "add",
        backHref: "/setup/critical-systems",
        action: "/setup/critical-systems/add",
        system: f,
        serviceOptions: buildSupportedServiceOptions(setup, f),
        serviceId: f.serviceId,
        from: f.from,
        errors: [{ field: "systemName", text: "Enter the name of the system" }],
      });
    }
    const sys = require("../data/seed/setup").system({
      id: record.newId("sys", f.name, setup.criticalSystems),
      name: f.name,
      description: f.description,
      serviceIds: f.serviceIds,
      functionIds: f.functionIds,
      servicesLater: f.servicesLater,
      assessedBefore: f.assessedBefore,
    });
    setup.criticalSystems.push(sys);
    const svc = getService(setup, f.serviceId);
    if (f.from === "service" && svc) {
      setBanner(req, `${sys.name} is now linked to ${svc.name}`, "Check its details in the Critical systems section.");
      return res.redirect(servicePageHref(svc));
    }
    return res.redirect(systemSummaryHref(sys));
  });

  function withSystem(handler) {
    return (req, res) => {
      const setup = ensureSetup(req.session.data);
      const sys = getSystem(setup, req.params.systemId);
      if (!sys) return res.redirect("/setup/critical-systems");
      return handler(req, res, setup, sys);
    };
  }

  // S52 Check your answers for [system]. ?from=service:<id>|check sets where it returns to.
  router.get("/setup/critical-systems/:systemId/summary", withSystem((req, res, setup, sys) => {
    const from = clean(req.query.from);
    res.render("pages/setup/critical-systems/summary", {
      pageTitle: `Check your answers for ${sys.name}`,
      backHref: s52BackHref(setup, from),
      system: sys,
      cards: buildSystemCards(setup, sys, from),
      removeHref: `/setup/critical-systems/${sys.id}/remove` + (from ? `?from=${encodeURIComponent(from)}` : ""),
    });
  }));

  // S14 with answers filled in. Save returns to S52 (or S24 / the next missing detail).
  // Changing a system (S14 with answers filled in). The heading names the system.
  router.get("/setup/critical-systems/:systemId/edit", withSystem((req, res, setup, sys) => {
    const saved = takeSystemDraft(req, sys.id);
    const shown = saved ? Object.assign({}, sys, saved) : sys;
    renderSystemForm(res, setup, Object.assign({
      pageTitle: sys.name,
      heading: sys.name,
      mode: "edit",
      backHref: questionBack(req, sys),
      action: `/setup/critical-systems/${sys.id}/edit`,
      system: shown,
      serviceOptions: buildSupportedServiceOptions(setup, shown),
      removeHref: `/setup/critical-systems/${sys.id}/remove`,
    }, carry(req), saved ? { csReturn: saved.csReturn, csFrom: saved.csFrom } : {}));
  }));
  router.post("/setup/critical-systems/:systemId/edit", withSystem((req, res, setup, sys) => {
    const f = readSystemForm(req);
    if (f.action === "services") {
      saveSystemDraft(req, sys.id, f);
      const q = [f.csReturn ? "return=summary" : "", f.csFrom ? "from=" + encodeURIComponent(f.csFrom) : ""].filter(Boolean).join("&");
      return res.redirect("/setup/essential-services?return=" + encodeURIComponent(`/setup/critical-systems/${sys.id}/edit${q ? "?" + q : ""}`));
    }
    // Put the carried return fields back for afterSystemQuestion.
    req.session.data.csReturn = f.csReturn;
    req.session.data.csFrom = f.csFrom;
    if (!f.name) {
      return renderSystemForm(res, setup, {
        pageTitle: "Error: " + sys.name, heading: sys.name,
        mode: "edit", backHref: systemSummaryHref(sys), action: `/setup/critical-systems/${sys.id}/edit`,
        system: Object.assign({}, sys, f), serviceOptions: buildSupportedServiceOptions(setup, f),
        removeHref: `/setup/critical-systems/${sys.id}/remove`, csReturn: f.csReturn, csFrom: f.csFrom,
        errors: [{ field: "systemName", text: "Enter the name of the system" }],
      });
    }
    // A service with functions is linked through its functions on S14.
    Object.assign(sys, {
      name: f.name,
      description: f.description,
      serviceIds: f.serviceIds,
      functionIds: f.functionIds,
      servicesLater: f.servicesLater,
      assessedBefore: f.assessedBefore,
    });
    return afterSystemQuestion(req, res, sys);
  }));

  // S19 Does this critical system support any other council services or functions?
  router.get("/setup/critical-systems/:systemId/corporate-services", withSystem((req, res, setup, sys) => {
    const selected = new Set(sys.otherFunctions || []);
    res.render("pages/setup/critical-systems/corporate-services", Object.assign({
      pageTitle: "Does this critical system support any other council services or functions?",
      backHref: questionBack(req, sys),
      system: sys,
      options: record.OTHER_FUNCTION_OPTIONS.map((o) => ({ value: o.value, text: o.label, checked: selected.has(o.value) })),
    }, carry(req)));
  }));
  router.post("/setup/critical-systems/:systemId/corporate-services", withSystem((req, res, setup, sys) => {
    const { corporateServices, corporateServicesOther } = take(req, ["corporateServices", "corporateServicesOther"]);
    const choices = toList(corporateServices);
    const none = choices.includes("none");
    sys.otherFunctionsNone = none;
    sys.otherFunctions = none ? [] : choices.filter((v) => record.OTHER_FUNCTION_OPTIONS.some((o) => o.value === v));
    sys.otherFunctionsDetail = sys.otherFunctions.includes("other") ? clean(corporateServicesOther) : "";
    return afterSystemQuestion(req, res, sys);
  }));

  // S20 Which shared platforms does this critical system rely on? Pre-ticked with the platforms of
  // the services it supports when nothing is linked yet.
  router.get("/setup/critical-systems/:systemId/platforms", withSystem((req, res, setup, sys) => {
    let linked = record.platformsForSystem(setup, sys.id).map((p) => p.id);
    if (!linked.length && !sys.platformsLater) {
      const svcIds = record.servicesForSystem(setup, sys).map((s) => s.id);
      linked = (setup.platforms || []).filter((p) => (p.linkedServices || []).some((id) => svcIds.includes(id))).map((p) => p.id);
    }
    const back = `/setup/critical-systems/${sys.id}/platforms?return=summary` + (clean(req.query.from) ? "&from=" + encodeURIComponent(clean(req.query.from)) : "");
    res.render("pages/setup/shared-infrastructure/system-platforms", Object.assign({
      pageTitle: "Which shared platforms does this critical system rely on?",
      backHref: questionBack(req, sys),
      system: sys,
      platforms: buildPlatformChoices(setup, linked),
      later: sys.platformsLater,
      addPlatformHref: `/setup/shared-infrastructure/add-platform?link=system:${sys.id}&back=${encodeURIComponent(back)}`,
    }, carry(req)));
  }));
  router.post("/setup/critical-systems/:systemId/platforms", withSystem((req, res, setup, sys) => {
    const choices = toList(take(req, ["systemPlatforms"]).systemPlatforms);
    const later = choices.includes("later");
    const ticked = later ? [] : choices;
    (setup.platforms || []).forEach((p) => {
      p.linkedSystems = (p.linkedSystems || []).filter((id) => id !== sys.id);
      if (ticked.includes(p.id)) p.linkedSystems.push(sys.id);
    });
    sys.platformsLater = later;
    return afterSystemQuestion(req, res, sys);
  }));

  // S15 Is this critical system managed by a third-party supplier? Yes → S16.
  router.get("/setup/critical-systems/:systemId/supplier", withSystem((req, res, setup, sys) => {
    res.render("pages/setup/critical-systems/supplier", Object.assign({
      pageTitle: "Is this critical system managed by a third-party supplier?",
      backHref: questionBack(req, sys),
      system: sys,
    }, carry(req)));
  }));
  router.post("/setup/critical-systems/:systemId/supplier", withSystem((req, res, setup, sys) => {
    const managed = clean(take(req, ["managedBySupplier"]).managedBySupplier);
    sys.supplier = Object.assign({}, sys.supplier, { managed });
    if (managed === "fully" || managed === "partially") {
      const { csReturn, csFrom } = take(req, ["csReturn", "csFrom"]);
      const q = [clean(csReturn) ? "return=summary" : "", clean(csFrom) ? "from=" + encodeURIComponent(clean(csFrom)) : ""].filter(Boolean).join("&");
      return res.redirect(`/setup/critical-systems/${sys.id}/which-supplier${q ? "?" + q : ""}`);
    }
    sys.supplier.supplierId = "";
    sys.supplier.note = "";
    record.pruneSuppliers(setup);
    return afterSystemQuestion(req, res, sys);
  }));

  // S16 Which supplier manages all or part of this critical system?
  router.get("/setup/critical-systems/:systemId/which-supplier", withSystem((req, res, setup, sys) => {
    const chosen = clean(req.query.supplier) || (sys.supplier || {}).supplierId;
    res.render("pages/setup/critical-systems/which-supplier", Object.assign({
      pageTitle: "Which supplier manages all or part of this critical system?",
      backHref: `/setup/critical-systems/${sys.id}/supplier` + (clean(req.query.return) ? "?return=summary" + (clean(req.query.from) ? "&from=" + encodeURIComponent(clean(req.query.from)) : "") : ""),
      system: sys,
      chosen,
      suppliers: setup.suppliers || [],
      addSupplierHref: `/setup/suppliers/add?link=system:${sys.id}&back=${encodeURIComponent(req.originalUrl.split("?")[0] + "?" + new URLSearchParams(Object.assign({}, req.query, { supplier: "" })).toString())}`,
    }, carry(req)));
  }));
  router.post("/setup/critical-systems/:systemId/which-supplier", withSystem((req, res, setup, sys) => {
    const { whichSupplier, supplierNote } = take(req, ["whichSupplier", "supplierNote"]);
    sys.supplier = Object.assign({}, sys.supplier, { supplierId: clean(whichSupplier), note: clean(supplierNote) });
    record.pruneSuppliers(setup);
    return afterSystemQuestion(req, res, sys);
  }));

  // S41 Add a supplier (S51 is its error state). Returns to ?back with the new supplier chosen.
  router.get("/setup/suppliers/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const link = clean(req.query.link);
    const sys = link.startsWith("system:") ? getSystem(setup, link.slice(7)) : null;
    res.render("pages/setup/critical-systems/add-supplier", {
      pageTitle: "Add a supplier",
      backHref: safeSetupPath(req.query.back) || "/setup/shared-infrastructure",
      caption: sys ? sys.name : "Your core infrastructure",
      back: safeSetupPath(req.query.back),
      link,
      name: "",
    });
  });
  router.post("/setup/suppliers/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const f = take(req, ["supplierName", "back", "link"]);
    const name = clean(f.supplierName);
    const back = safeSetupPath(f.back) || "/setup/shared-infrastructure";
    const link = clean(f.link);
    if (!name) {
      const sys = link.startsWith("system:") ? getSystem(setup, link.slice(7)) : null;
      return res.render("pages/setup/critical-systems/add-supplier", {
        pageTitle: "Error: Add a supplier",
        backHref: back,
        caption: sys ? sys.name : "Your core infrastructure",
        back,
        link,
        name: "",
        error: { field: "supplierName", text: "Enter the supplier’s name" },
      });
    }
    const existing = (setup.suppliers || []).find((s) => s.name.toLowerCase() === name.toLowerCase());
    const supplier = existing || { id: record.newId("sup", name, setup.suppliers), name };
    if (!existing) setup.suppliers.push(supplier);
    // The new supplier is chosen when the person returns (supplier= on the return URL).
    const url = new URL(back, "http://x");
    url.searchParams.set("supplier", supplier.id);
    return res.redirect(url.pathname + url.search);
  });

  // S17 Is this critical system shared with other councils? Yes → S18.
  router.get("/setup/critical-systems/:systemId/shared-with-councils", withSystem((req, res, setup, sys) => {
    res.render("pages/setup/critical-systems/shared-with-councils", Object.assign({
      pageTitle: "Is this critical system shared with other councils?",
      backHref: questionBack(req, sys),
      system: sys,
    }, carry(req)));
  }));
  router.post("/setup/critical-systems/:systemId/shared-with-councils", withSystem((req, res, setup, sys) => {
    const answer = clean(take(req, ["sharedWithCouncils"]).sharedWithCouncils);
    sys.shared = Object.assign({ councils: [] }, sys.shared, { answer: answer === "yes" ? "yes" : answer === "no" ? "no" : "" });
    if (sys.shared.answer === "yes") {
      const { csReturn, csFrom } = take(req, ["csReturn", "csFrom"]);
      const q = [clean(csReturn) ? "return=summary" : "", clean(csFrom) ? "from=" + encodeURIComponent(clean(csFrom)) : ""].filter(Boolean).join("&");
      return res.redirect(`/setup/critical-systems/${sys.id}/councils${q ? "?" + q : ""}`);
    }
    sys.shared.councils = [];
    return afterSystemQuestion(req, res, sys);
  }));

  // S18 Which councils share this critical system?
  router.get("/setup/critical-systems/:systemId/councils", withSystem((req, res, setup, sys) => {
    const added = new Set((sys.shared || {}).councils || []);
    const base = `/setup/critical-systems/${sys.id}`;
    const qs = new URLSearchParams();
    if (clean(req.query.return)) qs.set("return", "summary");
    if (clean(req.query.from)) qs.set("from", clean(req.query.from));
    const q = qs.toString() ? "?" + qs.toString() : "";
    res.render("pages/setup/critical-systems/councils", Object.assign({
      pageTitle: "Which councils share this critical system?",
      backHref: `${base}/shared-with-councils${q}`,
      system: sys,
      register: [{ value: "", text: "Select a council" }].concat(
        COUNCIL_REGISTER.filter((c) => !added.has(c)).map((name) => ({ value: name, text: councilWithType(name) }))
      ),
      addedCouncils: [...added].map((name) => ({ text: councilWithType(name), removeHref: `${base}/councils/remove/${encodeURIComponent(name)}${q}` })),
      addAction: `${base}/councils/add${q}`,
    }, carry(req)));
  }));
  router.post("/setup/critical-systems/:systemId/councils/add", withSystem((req, res, setup, sys) => {
    const name = clean(take(req, ["councilSearchSelect"]).councilSearchSelect);
    sys.shared = Object.assign({ answer: "yes", councils: [] }, sys.shared);
    if (name && COUNCIL_REGISTER.includes(name) && !sys.shared.councils.includes(name)) sys.shared.councils.push(name);
    take(req, ["csReturn", "csFrom"]);
    return res.redirect(`/setup/critical-systems/${sys.id}/councils` + (req.originalUrl.includes("?") ? "?" + req.originalUrl.split("?")[1] : ""));
  }));
  router.get("/setup/critical-systems/:systemId/councils/remove/:councilName", withSystem((req, res, setup, sys) => {
    sys.shared = Object.assign({ answer: "yes", councils: [] }, sys.shared);
    sys.shared.councils = sys.shared.councils.filter((c) => c !== clean(req.params.councilName));
    return res.redirect(`/setup/critical-systems/${sys.id}/councils` + (req.originalUrl.includes("?") ? "?" + req.originalUrl.split("?")[1] : ""));
  }));
  router.post("/setup/critical-systems/:systemId/councils", withSystem((req, res, setup, sys) => afterSystemQuestion(req, res, sys)));

  // S21 Where is this critical system hosted?
  router.get("/setup/critical-systems/:systemId/hosting", withSystem((req, res, setup, sys) => {
    res.render("pages/setup/critical-systems/hosting", Object.assign({
      pageTitle: "Where is this critical system hosted?",
      backHref: questionBack(req, sys),
      system: sys,
      hostingPlatform: deriveHostingPlatformName(setup, sys),
    }, carry(req)));
  }));
  router.post("/setup/critical-systems/:systemId/hosting", withSystem((req, res, setup, sys) => {
    const f = take(req, ["hostingType", "hostingProvider", "hostingSecondary"]);
    sys.hosting = { type: clean(f.hostingType), provider: clean(f.hostingProvider), secondary: clean(f.hostingSecondary) };
    return afterSystemQuestion(req, res, sys);
  }));

  // S27 Who owns this critical system? Goes on to S28 when the impact is not rated yet.
  router.get("/setup/critical-systems/:systemId/owner", withSystem((req, res, setup, sys) => {
    res.render("pages/setup/critical-systems/owner", Object.assign({
      pageTitle: "Who owns this critical system?",
      backHref: questionBack(req, sys),
      system: sys,
      counter: systemDetailCounter(setup, sys),
    }, carry(req)));
  }));
  router.post("/setup/critical-systems/:systemId/owner", withSystem((req, res, setup, sys) => {
    const f = take(req, ["ownerName", "ownerJobTitle"]);
    sys.owner = { name: clean(f.ownerName), jobTitle: clean(f.ownerJobTitle) };
    if (!deriveCriticality(sys.impact) && clean(req.session.data.csFrom) !== "walk") {
      const { csReturn, csFrom } = take(req, ["csReturn", "csFrom"]);
      const q = [clean(csReturn) ? "return=summary" : "", clean(csFrom) ? "from=" + encodeURIComponent(clean(csFrom)) : ""].filter(Boolean).join("&");
      return res.redirect(`/setup/critical-systems/${sys.id}/impact${q ? "?" + q : ""}`);
    }
    return afterSystemQuestion(req, res, sys);
  }));

  // S28 What would the impact be if this critical system were compromised? → S52.
  router.get("/setup/critical-systems/:systemId/impact", withSystem((req, res, setup, sys) => {
    res.render("pages/setup/critical-systems/impact", Object.assign({
      pageTitle: "What would the impact be if this critical system were compromised?",
      backHref: questionBack(req, sys),
      system: sys,
      counter: systemDetailCounter(setup, sys),
      criticality: deriveCriticality(sys.impact),
    }, carry(req)));
  }));
  router.post("/setup/critical-systems/:systemId/impact", withSystem((req, res, setup, sys) => {
    const f = take(req, ["impactConfidentiality", "impactIntegrity", "impactAvailability"]);
    sys.impact = { confidentiality: clean(f.impactConfidentiality), integrity: clean(f.impactIntegrity), availability: clean(f.impactAvailability) };
    return afterSystemQuestion(req, res, sys);
  }));

  // S47 Remove [system]? or S48 You cannot remove [system] (in the approved plan, or assessed before).
  router.get("/setup/critical-systems/:systemId/remove", withSystem((req, res, setup, sys) => {
    const from = clean(req.query.from);
    const back = systemSummaryHref(sys, from);
    const block = record.removalBlock(req.session.data, sys);
    if (block) {
      return res.render("pages/setup/critical-systems/cannot-remove", { pageTitle: `You cannot remove ${sys.name}`, backHref: back, system: sys, reason: block });
    }
    res.render("pages/setup/critical-systems/remove", {
      pageTitle: `Remove ${sys.name.toLowerCase()}?`,
      backHref: back,
      system: sys,
      bullets: buildRemoveSystemConsequences(setup, sys),
      from,
    });
  }));
  router.post("/setup/critical-systems/:systemId/remove", withSystem((req, res, setup, sys) => {
    const from = clean(take(req, ["from"]).from);
    if (record.removalBlock(req.session.data, sys)) return res.redirect(`/setup/critical-systems/${sys.id}/remove`);
    record.removeSystem(req.session.data, sys.id);
    setBanner(req, `${sys.name} has been removed`);
    if (from.startsWith("service:") && getService(setup, from.slice(8))) return res.redirect(`/setup/essential-services/${from.slice(8)}`);
    return res.redirect("/setup/critical-systems");
  }));

  // ----- Task 8: Check and confirm ---------------------------------------------------------

  // S24 Review your progress (S24a when there is nothing to review).
  router.get("/setup/coverage-check", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/coverage-check", {
      pageTitle: "Review your progress",
      backHref: "/setup/task-list",
      issues: record.setupIssues(setup),
      concentration: record.concentrationNote(setup),
    });
  });

  // "Go to the first missing detail": opens the next unanswered question, or S24 when none are left.
  // ?start=1 begins a new walk. Pages already opened in this walk are skipped, so saving a question
  // without answering it moves on instead of opening the same page again.
  router.get("/setup/coverage-check/next", (req, res) => {
    const setup = ensureSetup(req.session.data);
    if (clean(req.query.start) === "1" || !Array.isArray(req.session.data.setupWalk)) req.session.data.setupWalk = [];
    const next = record.firstMissingDetail(setup, req.session.data.setupWalk);
    if (!next) {
      delete req.session.data.setupWalk;
      return res.redirect("/setup/coverage-check");
    }
    req.session.data.setupWalk.push(next);
    return res.redirect(next);
  });

  // S30 Check your setup (S30a when the CAF Lead or Approver is not named).
  router.get("/setup/check-your-setup", (req, res) => {
    const setup = ensureSetup(req.session.data);
    clearListReturns(req);
    const isComplete = Boolean(setup.completed);
    res.render("pages/setup/check-your-setup", {
      pageTitle: "Check your setup",
      backHref: isComplete ? "/dashboard" : "/setup/coverage-check",
      sections: buildSetupCheck(setup),
      isComplete,
    });
  });
  router.post("/setup/check-your-setup", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const people = setup.people || {};
    const named = (p) => Boolean(p && p.name && (p.confirmed || p.pending));
    const errorList = [];
    if (!named(people.cafLead)) errorList.push({ text: "Confirm your CAF Lead before you finish setup", href: "#cafLead-change" });
    if (!named(people.approver)) errorList.push({ text: "Confirm your Approver before you finish setup", href: "#approver-change" });
    if (errorList.length) {
      return res.render("pages/setup/check-your-setup", {
        pageTitle: "Error: Check your setup",
        backHref: "/setup/coverage-check",
        sections: buildSetupCheck(setup),
        errorList,
      });
    }
    setup.completed = true;
    return res.redirect("/setup/complete");
  });

  // S31 Setup complete
  router.get("/setup/complete", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/complete", { pageTitle: "Setup complete", councilName: setup.council.name });
  });

  // Holding page for links that leave the prototype.
  router.get("/setup/not-in-this-prototype", (req, res) => {
    res.render("pages/setup/holding", {
      pageTitle: "This part is not built in this prototype",
      backHref: req.get("referer") && req.get("referer").includes("/setup/") ? undefined : "/setup/task-list",
    });
  });
};

// S03a / S03ae
function renderPreviousAssessment(res, answer, showError, fromS30) {
  res.render("pages/setup/previous-assessment", {
    pageTitle: (showError ? "Error: " : "") + "Has your council completed a CAF organisational assessment before?",
    backHref: fromS30 ? "/setup/check-your-setup" : "/setup/council-context",
    from: fromS30 ? "s30" : "",
    answer,
    showError,
    options: record.ASSESSED_BEFORE.map((v) => ({ value: v, text: record.ASSESSED_BEFORE_LABELS[v], checked: v === answer })),
  });
}
