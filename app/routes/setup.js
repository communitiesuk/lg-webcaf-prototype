// app/routes/setup.js
// "Set up your council" (Setup v6) prototype section.
// Source of truth: Figma file mnOq3QRhTdiliuSuzQoNsX, page 393:2 (Setup v6).
// Batch 1: S01 task list, S02 sector context, S03 council context, S04 methodology,
// S05 methodology detail, plus the shared out-of-scope holding page.

const {
  ensureSetup,
  applySetupChrome,
  buildSetupTaskList,
  ESSENTIAL_SERVICE_OPTIONS,
  COUNCIL_REGISTER,
  getService,
  buildServiceHubRows,
  buildRemoveServiceConsequences,
  reconcileChosenServices,
  slugify,
  PLATFORM_TYPE_OPTIONS,
  getPlatform,
  getSystem,
  platformsForService,
  platformsForSystem,
  buildInfraHubRows,
  buildPlatformReliesModel,
  buildPlatformChoices,
  buildRemovePlatformConsequences,
  unlinkServiceFromPlatforms,
  CORPORATE_SERVICE_OPTIONS,
  buildCriticalSystemsHubRows,
  buildSupportedServiceOptions,
  getSupplier,
  systemCanBeRemoved,
  buildRemoveSystemConsequences,
  unlinkSystemFromPlatforms,
  deriveHostingPlatformName,
  systemDetailCounter,
  deriveCriticality,
  buildCoverageWarnings,
  buildConcentrationInset,
  servicesWithoutSystem,
  buildSetupSummary,
} = require("../data/helpers/setup");

// Council type by name, for showing the type beside each council on S18 (same as Claim screen 29),
// e.g. "Newcastle Upon Tyne City Council (Metropolitan)". The stored value stays the plain name.
// Changed in build, prototype, pending design sign-off.
const COUNCIL_TYPE_BY_NAME = new Map(require("../data/councils").map((c) => [c.name, c.type]));
function councilWithType(name) {
  const t = COUNCIL_TYPE_BY_NAME.get(name);
  return t ? name + " (" + t + ")" : name;
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function clean(value) {
  return (value || "").toString().trim();
}

// S12c add-mode back link + caption, based on where it was opened from (?return=).
function platformReturnHref(req, setup) {
  const ret = clean(req.query.return);
  if (ret.startsWith("service:")) {
    return `/setup/essential-services/${encodeURIComponent(ret.slice(8))}/core-infrastructure`;
  }
  if (ret.startsWith("system:")) {
    return `/setup/critical-systems/${encodeURIComponent(ret.slice(7))}/platforms`;
  }
  return "/setup/shared-infrastructure";
}

function platformReturnCaption(req, setup) {
  const ret = clean(req.query.return);
  if (ret.startsWith("service:")) {
    const svc = getService(setup, ret.slice(8));
    if (svc) return svc.name;
  }
  if (ret.startsWith("system:")) {
    const sys = getSystem(setup, ret.slice(7));
    if (sys) return sys.name;
  }
  return "Your shared infrastructure";
}

// S41 add-supplier back link + caption, based on where it was opened from (?return=).
function supplierReturnHrefFor(ret, setup) {
  if (ret.startsWith("system:")) {
    return `/setup/critical-systems/${encodeURIComponent(ret.slice(7))}/which-supplier`;
  }
  return "/setup/shared-infrastructure/add-platform";
}

function supplierReturnCaptionFor(ret, setup) {
  if (ret.startsWith("system:")) {
    const sys = getSystem(setup, ret.slice(7));
    if (sys) return sys.name;
  }
  return "Your shared infrastructure";
}

function supplierReturnHref(req, setup) {
  return supplierReturnHrefFor(clean(req.query.return), setup);
}

function supplierReturnCaption(req, setup) {
  return supplierReturnCaptionFor(clean(req.query.return), setup);
}

module.exports = function (router) {
  // Setup chrome + seed for every /setup request. Keeps the section isolated from the
  // rest of the prototype (no mutation of the shared signed-in user).
  router.use((req, res, next) => {
    if (!req.path.startsWith("/setup")) return next();
    ensureSetup(req.session.data);
    applySetupChrome(req, res);
    next();
  });

  // Section entry → task list.
  router.get("/setup", (req, res) => res.redirect("/setup/task-list"));

  // S01 — Task list (Figma 393:18)
  router.get("/setup/task-list", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const tasks = buildSetupTaskList(setup);
    res.render("pages/setup/task-list", {
      pageTitle: "Set up your council",
      councilName: setup.council.name,
      tasks,
    });
  });

  // S02 — Your sector context (Figma 393:72)
  router.get("/setup/sector-context", (req, res) => {
    res.render("pages/setup/sector-context", {
      pageTitle: "Your sector context",
      backHref: "/setup/task-list",
      commentReceived: req.query.comment === "received", // S02b — success banner
    });
  });

  router.post("/setup/sector-context", (req, res) => {
    const setup = ensureSetup(req.session.data);
    setup.sectorContext.confirmed = true;
    return res.redirect("/setup/council-context");
  });

  // S02a — Tell us what looks wrong (Figma 482:2291). Free text only; stored in session, does not
  // change the sector context or block setup. Send → S02b (sector context with a success banner).
  router.get("/setup/sector-context/wrong", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/sector-context-wrong", {
      pageTitle: "Tell us what looks wrong",
      comment: setup.sectorContextComment || "",
    });
  });

  router.post("/setup/sector-context/wrong", (req, res) => {
    const setup = ensureSetup(req.session.data);
    setup.sectorContextComment = clean(req.session.data.sectorContextComment);
    delete req.session.data.sectorContextComment;
    return res.redirect("/setup/sector-context?comment=received"); // S02b
  });

  // S03 — Your council context (Figma 481:3415, v7). CNI and OT are dropdowns; placeholder lists.
  router.get("/setup/council-context", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const cc = setup.councilContext;
    res.render("pages/setup/council-context", {
      pageTitle: "Your council context",
      backHref: "/setup/sector-context",
      context: {
        cni: cc.cni, // v7: selected CNI sector value (placeholder list); "" when none
        ot: cc.operationalTechnology, // v7: selected OT type value (placeholder list); "" when none
        recentIt: cc.recentItTransformation,
        upcomingIt: cc.upcomingItTransformation,
        lgr: cc.lgr,
        none: cc.noneOfThese,
        recentItDetail: cc.recentItTransformationDetail,
        upcomingItDetail: cc.upcomingItTransformationDetail,
        lgrDetail: cc.lgrDetail,
        anythingElse: cc.anythingElse,
      },
    });
  });

  router.post("/setup/council-context", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const none = clean(req.session.data.councilContextNone) === "none";
    const selected = none ? [] : toList(req.session.data.councilContextApplies);
    const has = (value) => selected.includes(value);

    setup.councilContext = {
      // v7: CNI and OT are dropdowns, stored as the selected value under the existing keys.
      // "None of these" clears the checkboxes only, not the dropdowns (they are separate questions).
      cni: clean(req.session.data.councilContextCni),
      operationalTechnology: clean(req.session.data.councilContextOt),
      recentItTransformation: has("recent-it"),
      recentItTransformationDetail: none ? "" : clean(req.session.data.recentItDetail),
      upcomingItTransformation: has("upcoming-it"),
      upcomingItTransformationDetail: none ? "" : clean(req.session.data.upcomingItDetail),
      lgr: has("lgr"),
      lgrDetail: none ? "" : clean(req.session.data.lgrDetail),
      noneOfThese: none,
      anythingElse: clean(req.session.data.ccAnythingElse),
      completed: true,
    };

    // Consume transient form fields.
    [
      "councilContextApplies",
      "councilContextNone",
      "councilContextCni",
      "councilContextOt",
      "recentItDetail",
      "upcomingItDetail",
      "lgrDetail",
      "ccAnythingElse",
    ].forEach((key) => delete req.session.data[key]);

    return res.redirect("/setup/methodology");
  });

  // S04 — How will you identify your essential services and critical systems? (Figma 393:100)
  router.get("/setup/methodology", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/methodology", {
      pageTitle: "How will you identify your essential services and critical systems?",
      backHref: "/setup/council-context",
      approach: setup.methodology.approach,
    });
  });

  router.post("/setup/methodology", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const approach =
      clean(req.session.data.methodologyApproach) === "other" ? "other" : "five-lens";
    setup.methodology.approach = approach;
    setup.methodology.completed = true;
    delete req.session.data.methodologyApproach;
    if (approach === "other") return res.redirect("/setup/methodology-detail");
    return res.redirect("/setup/task-list");
  });

  // S05 — Tell us about your methodology (Figma 393:139)
  router.get("/setup/methodology-detail", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/methodology-detail", {
      pageTitle: "Tell us about your methodology",
      backHref: "/setup/methodology",
      methodology: setup.methodology,
    });
  });

  router.post("/setup/methodology-detail", (req, res) => {
    const setup = ensureSetup(req.session.data);
    setup.methodology.detail = clean(req.session.data.methodologyDetail);
    setup.methodology.link = clean(req.session.data.methodologyLink);
    delete req.session.data.methodologyDetail;
    delete req.session.data.methodologyLink;
    return res.redirect("/setup/task-list");
  });

  // ----- Batch 2: Essential services -------------------------------------------------

  // S35 — Which essential services does your council deliver? (Figma 393:1189)
  //       + S40 error state (nothing selected) (Figma 393:1290)
  router.get("/setup/essential-services/choose", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const chosen = new Set(
      (setup.essentialServices || []).map((s) => s.name)
    );
    res.render("pages/setup/essential-services/choose", {
      pageTitle: "Which essential services does your council deliver?",
      backHref: "/setup/task-list",
      options: ESSENTIAL_SERVICE_OPTIONS.map((name) => ({
        name,
        checked: chosen.has(name),
      })),
    });
  });

  router.post("/setup/essential-services/choose", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const selected = toList(req.session.data.essentialServiceChoices)
      .map(clean)
      .filter(Boolean);
    delete req.session.data.essentialServiceChoices;

    if (selected.length === 0) {
      return res.render("pages/setup/essential-services/choose", {
        pageTitle: "Error: Which essential services does your council deliver?",
        backHref: "/setup/task-list",
        error: {
          items: [
            {
              field: "essentialServiceChoices",
              text: "Select at least one essential service, or add one that is not on the list",
            },
          ],
        },
        options: ESSENTIAL_SERVICE_OPTIONS.map((name) => ({
          name,
          checked: selected.includes(name),
        })),
      });
    }

    reconcileChosenServices(setup, selected);
    return res.redirect("/setup/essential-services");
  });

  // S36 — Your essential services (hub) (Figma 393:261)
  //       + S50 success state after a removal (Figma 393:1600)
  router.get("/setup/essential-services", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const removed = clean(req.query.removed);
    const orphan = clean(req.query.orphan);
    res.render("pages/setup/essential-services/index", {
      pageTitle: "Your essential services",
      backHref: "/setup/task-list",
      rows: buildServiceHubRows(setup),
      removed: removed || null,
      orphan: orphan || null,
    });
  });

  // S09 — Add an essential service that is not on the list (Figma 393:176)
  //       + S32 error state (name missing) (Figma 393:852)
  router.get("/setup/essential-services/add", (req, res) => {
    res.render("pages/setup/essential-services/add", {
      pageTitle: "Add an essential service that is not on the list",
      backHref: "/setup/essential-services",
      name: "",
    });
  });

  router.post("/setup/essential-services/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const name = clean(req.session.data.newServiceName);
    delete req.session.data.newServiceName;

    if (!name) {
      return res.render("pages/setup/essential-services/add", {
        pageTitle: "Error: Add an essential service",
        backHref: "/setup/essential-services",
        name: "",
        error: {
          items: [{ field: "newServiceName", text: "Enter the name of the service" }],
        },
      });
    }

    setup.essentialServices.push({
      id: `svc-${slugify(name)}`,
      name,
      source: "custom",
      functions: [],
      platforms: [],
      noSystemReason: "",
      infraStatus: "to_do",
    });
    return res.redirect("/setup/essential-services");
  });

  // S10 — What are the key functions of this service? (Figma 393:214)
  router.get("/setup/essential-services/:serviceId/functions", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/essential-services");
    res.render("pages/setup/essential-services/functions", {
      pageTitle: "What are the key functions of this service?",
      backHref: "/setup/essential-services",
      service,
    });
  });

  router.post("/setup/essential-services/:serviceId/functions", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/essential-services");
    // S10 "Save and continue" → S38 core infrastructure for this service (Batch 3).
    return res.redirect(
      `/setup/essential-services/${encodeURIComponent(service.id)}/core-infrastructure`
    );
  });

  // Remove a function (inline "Remove" on S10)
  router.get(
    "/setup/essential-services/:serviceId/functions/:functionId/remove",
    (req, res) => {
      const setup = ensureSetup(req.session.data);
      const service = getService(setup, req.params.serviceId);
      if (!service) return res.redirect("/setup/essential-services");
      service.functions = (service.functions || []).filter(
        (f) => f.id !== req.params.functionId
      );
      return res.redirect(
        `/setup/essential-services/${encodeURIComponent(service.id)}/functions`
      );
    }
  );

  // S10b — Add a function (Figma 393:1080)
  router.get("/setup/essential-services/:serviceId/functions/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/essential-services");
    res.render("pages/setup/essential-services/add-function", {
      pageTitle: "Add a function",
      backHref: `/setup/essential-services/${encodeURIComponent(service.id)}/functions`,
      service,
    });
  });

  router.post("/setup/essential-services/:serviceId/functions/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/essential-services");
    const name = clean(req.session.data.newFunctionName);
    delete req.session.data.newFunctionName;
    if (name) {
      service.functions = service.functions || [];
      service.functions.push({ id: `fn-${slugify(name)}`, name });
    }
    return res.redirect(
      `/setup/essential-services/${encodeURIComponent(service.id)}/functions`
    );
  });

  // S46 — Are you sure you want to remove [service]? (Figma 393:1465)
  router.get("/setup/essential-services/:serviceId/remove", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/essential-services");
    res.render("pages/setup/essential-services/remove", {
      pageTitle: `Are you sure you want to remove ${service.name}?`,
      backHref: `/setup/essential-services/${encodeURIComponent(service.id)}/functions`,
      service,
      consequences: buildRemoveServiceConsequences(setup, service),
    });
  });

  router.post("/setup/essential-services/:serviceId/remove", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/essential-services");
    const { orphaned } = buildRemoveServiceConsequences(setup, service);
    unlinkServiceFromPlatforms(setup, service.id);
    setup.essentialServices = (setup.essentialServices || []).filter(
      (s) => s.id !== service.id
    );
    const params = new URLSearchParams({ removed: service.name });
    if (orphaned.length) params.set("orphan", orphaned[0].name);
    return res.redirect(`/setup/essential-services?${params.toString()}`);
  });

  // ----- Batch 3: Shared infrastructure ----------------------------------------------

  // S39 — Your shared infrastructure (hub) (Figma 393:886)
  router.get("/setup/shared-infrastructure", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/shared-infrastructure/index", {
      pageTitle: "Your shared infrastructure",
      backHref: "/setup/task-list",
      rows: buildInfraHubRows(setup),
    });
  });

  // S38 — What core infrastructure supports [service]? (Figma 393:1238)
  router.get("/setup/essential-services/:serviceId/core-infrastructure", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/essential-services");
    res.render("pages/setup/shared-infrastructure/for-service", {
      pageTitle: `What core infrastructure supports ${service.name}?`,
      backHref: `/setup/essential-services/${encodeURIComponent(service.id)}/functions`,
      service,
      platforms: buildPlatformChoices(
        setup,
        platformsForService(setup, service.id).map((p) => p.id)
      ),
    });
  });

  router.post("/setup/essential-services/:serviceId/core-infrastructure", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/essential-services");
    const action = clean(req.session.data.action);
    const ticked = toList(req.session.data.servicePlatforms);
    delete req.session.data.servicePlatforms;
    delete req.session.data.action;

    if (action !== "later") {
      (setup.platforms || []).forEach((p) => {
        p.linkedServices = (p.linkedServices || []).filter((id) => id !== service.id);
        if (ticked.includes(p.id)) p.linkedServices.push(service.id);
      });
      service.infraStatus = "complete";
      return res.redirect("/setup/critical-systems");
    }
    service.infraStatus = "link_later";
    return res.redirect("/setup/essential-services");
  });

  // S12c — Add a platform (Figma 393:937) — PROPOSAL (who manages)
  router.get("/setup/shared-infrastructure/add-platform", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/shared-infrastructure/platform", {
      pageTitle: "Add a platform",
      backHref: platformReturnHref(req, setup),
      mode: "add",
      caption: platformReturnCaption(req, setup),
      returnTo: clean(req.query.return),
      typeOptions: PLATFORM_TYPE_OPTIONS,
      suppliers: setup.suppliers || [],
      platform: { name: "", type: "", managedBy: "", supplierId: "" },
    });
  });

  router.post("/setup/shared-infrastructure/add-platform", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const name = clean(req.session.data.platformName);
    const type = clean(req.session.data.platformType);
    const managedBy = clean(req.session.data.platformManager);
    const supplierId =
      managedBy === "supplier-fully" || managedBy === "supplier-partly"
        ? clean(req.session.data.whichSupplier)
        : "";
    const returnTo = clean(req.session.data.returnTo);
    ["platformName", "platformType", "platformManager", "whichSupplier", "returnTo"].forEach(
      (k) => delete req.session.data[k]
    );

    const platform = {
      id: `plat-${slugify(name)}`,
      name,
      type,
      managedBy,
      supplierId,
      linkedServices: [],
      linkedSystems: [],
    };
    setup.platforms = setup.platforms || [];
    setup.platforms.push(platform);

    // Link to, and return to, wherever it was added from.
    if (returnTo.startsWith("service:")) {
      const serviceId = returnTo.slice("service:".length);
      if (getService(setup, serviceId)) platform.linkedServices.push(serviceId);
      return res.redirect(
        `/setup/essential-services/${encodeURIComponent(serviceId)}/core-infrastructure`
      );
    }
    if (returnTo.startsWith("system:")) {
      const systemId = returnTo.slice("system:".length);
      if (getSystem(setup, systemId)) platform.linkedSystems.push(systemId);
      return res.redirect(
        `/setup/critical-systems/${encodeURIComponent(systemId)}/platforms`
      );
    }
    // From the hub → link what relies on the new platform (S45).
    return res.redirect(
      `/setup/shared-infrastructure/${encodeURIComponent(platform.id)}/relies`
    );
  });

  // S12c edit mode (reached from S39 "Change" on a linked platform)
  router.get("/setup/shared-infrastructure/:platformId/edit", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const platform = getPlatform(setup, req.params.platformId);
    if (!platform) return res.redirect("/setup/shared-infrastructure");
    res.render("pages/setup/shared-infrastructure/platform", {
      pageTitle: "Add a platform",
      backHref: "/setup/shared-infrastructure",
      mode: "edit",
      caption: platform.name,
      platformId: platform.id,
      typeOptions: PLATFORM_TYPE_OPTIONS,
      suppliers: setup.suppliers || [],
      platform,
    });
  });

  router.post("/setup/shared-infrastructure/:platformId/edit", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const platform = getPlatform(setup, req.params.platformId);
    if (!platform) return res.redirect("/setup/shared-infrastructure");
    platform.name = clean(req.session.data.platformName) || platform.name;
    platform.type = clean(req.session.data.platformType) || platform.type;
    platform.managedBy = clean(req.session.data.platformManager);
    platform.supplierId =
      platform.managedBy === "supplier-fully" || platform.managedBy === "supplier-partly"
        ? clean(req.session.data.whichSupplier)
        : "";
    ["platformName", "platformType", "platformManager", "whichSupplier"].forEach(
      (k) => delete req.session.data[k]
    );
    return res.redirect("/setup/shared-infrastructure");
  });

  // S45 — What relies on [platform]? (Figma 393:1415)
  router.get("/setup/shared-infrastructure/:platformId/relies", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const platform = getPlatform(setup, req.params.platformId);
    if (!platform) return res.redirect("/setup/shared-infrastructure");
    res.render("pages/setup/shared-infrastructure/relies", {
      pageTitle: `What relies on ${platform.name}?`,
      backHref: "/setup/shared-infrastructure",
      platform,
      model: buildPlatformReliesModel(setup, platform),
    });
  });

  router.post("/setup/shared-infrastructure/:platformId/relies", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const platform = getPlatform(setup, req.params.platformId);
    if (!platform) return res.redirect("/setup/shared-infrastructure");
    const later = clean(req.session.data.reliesLater) === "later";
    if (later) {
      platform.linkedServices = [];
      platform.linkedSystems = [];
    } else {
      platform.linkedServices = toList(req.session.data.reliesServices);
      platform.linkedSystems = toList(req.session.data.reliesSystems);
    }
    ["reliesServices", "reliesSystems", "reliesLater"].forEach(
      (k) => delete req.session.data[k]
    );
    return res.redirect("/setup/shared-infrastructure");
  });

  // S49 — Are you sure you want to remove [platform]? (Figma 393:1569)
  router.get("/setup/shared-infrastructure/:platformId/remove", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const platform = getPlatform(setup, req.params.platformId);
    if (!platform) return res.redirect("/setup/shared-infrastructure");
    res.render("pages/setup/shared-infrastructure/remove", {
      pageTitle: `Are you sure you want to remove ${platform.name}?`,
      backHref: `/setup/shared-infrastructure/${encodeURIComponent(platform.id)}/edit`,
      platform,
      consequence: buildRemovePlatformConsequences(platform),
    });
  });

  router.post("/setup/shared-infrastructure/:platformId/remove", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const platform = getPlatform(setup, req.params.platformId);
    if (!platform) return res.redirect("/setup/shared-infrastructure");
    setup.platforms = (setup.platforms || []).filter((p) => p.id !== platform.id);
    return res.redirect("/setup/shared-infrastructure");
  });

  // S20 — Check the shared platforms this system relies on (Figma 393:1031)
  router.get("/setup/critical-systems/:systemId/platforms", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    res.render("pages/setup/shared-infrastructure/system-platforms", {
      pageTitle: "Check the shared platforms this system relies on",
      backHref: `/setup/critical-systems/${encodeURIComponent(system.id)}/corporate-services`,
      system,
      platforms: buildPlatformChoices(
        setup,
        platformsForSystem(setup, system.id).map((p) => p.id)
      ),
    });
  });

  router.post("/setup/critical-systems/:systemId/platforms", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    const later = clean(req.session.data.systemPlatformsLater) === "later";
    const ticked = later ? [] : toList(req.session.data.systemPlatforms);
    (setup.platforms || []).forEach((p) => {
      p.linkedSystems = (p.linkedSystems || []).filter((id) => id !== system.id);
      if (ticked.includes(p.id)) p.linkedSystems.push(system.id);
    });
    ["systemPlatforms", "systemPlatformsLater"].forEach((k) => delete req.session.data[k]);
    // S20 "Save and continue" → S15 supplier question (Batch 4).
    return res.redirect(`/setup/critical-systems/${encodeURIComponent(system.id)}/supplier`);
  });

  // ----- Batch 4: Critical systems (add + supplier) ----------------------------------

  // S13 empty state (Figma 393:316) / S23 hub (Figma 393:535) — two states of one page.
  router.get("/setup/critical-systems", (req, res) => {
    const setup = ensureSetup(req.session.data);
    // Honour a return target (e.g. reached from Decide's "nothing left" page) so the back link
    // goes where the user came from. Only internal /setup/ or /decide/ paths are accepted.
    const ret = clean(req.query.return);
    const backHref = (ret.startsWith("/setup/") || ret.startsWith("/decide/")) ? ret : "/setup/task-list";
    if ((setup.criticalSystems || []).length === 0) {
      return res.render("pages/setup/critical-systems/empty", {
        pageTitle: "Your critical systems",
        backHref: backHref,
      });
    }
    res.render("pages/setup/critical-systems/index", {
      pageTitle: "Your critical systems",
      backHref: backHref,
      rows: buildCriticalSystemsHubRows(setup),
    });
  });

  // S14 — Add a critical system (Figma 393:1664)
  router.get("/setup/critical-systems/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/critical-systems/add", {
      pageTitle: "Add a critical system",
      backHref: "/setup/critical-systems",
      serviceOptions: buildSupportedServiceOptions(setup),
      system: { name: "", description: "", supportedServices: [], assessedBefore: "" },
    });
  });

  router.post("/setup/critical-systems/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const name = clean(req.session.data.systemName);
    const description = clean(req.session.data.systemDescription);
    const notSure = clean(req.session.data.notSureServices) === "later";
    const supportedServices = notSure ? [] : toList(req.session.data.supportedServices);
    const assessedBefore = clean(req.session.data.assessedBefore);
    [
      "systemName",
      "systemDescription",
      "supportedServices",
      "notSureServices",
      "assessedBefore",
    ].forEach((k) => delete req.session.data[k]);

    const system = {
      id: `sys-${slugify(name)}`,
      name,
      description,
      supportedServices,
      assessedBefore,
      corporateServices: [],
      corporateServicesOther: "",
      managedBySupplier: "",
      supplierId: "",
      supplierNote: "",
      sharedWithCouncils: false,
      councils: [],
      hosting: { type: "", provider: "", secondary: "" },
      owner: { name: "", jobTitle: "" },
      impact: { confidentiality: "", integrity: "", availability: "" },
      recovery: { mtd: "", rto: "", rpo: "" },
      inPlan: false,
      detailsComplete: false,
    };
    setup.criticalSystems = setup.criticalSystems || [];
    setup.criticalSystems.push(system);
    return res.redirect(
      `/setup/critical-systems/${encodeURIComponent(system.id)}/corporate-services`
    );
  });

  // S19 — What else does this system do for the council? (Figma 393:1729)
  router.get("/setup/critical-systems/:systemId/corporate-services", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    const selected = new Set(system.corporateServices || []);
    res.render("pages/setup/critical-systems/corporate-services", {
      pageTitle: "What else does this system do for the council?",
      backHref: `/setup/critical-systems/add`,
      system,
      options: CORPORATE_SERVICE_OPTIONS.map((o) => ({ ...o, checked: selected.has(o.value) })),
    });
  });

  router.post("/setup/critical-systems/:systemId/corporate-services", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    const none = clean(req.session.data.noneCorporate) === "none";
    system.corporateServices = none ? [] : toList(req.session.data.corporateServices);
    system.corporateServicesOther =
      !none && system.corporateServices.includes("other")
        ? clean(req.session.data.corporateServicesOther)
        : "";
    ["corporateServices", "corporateServicesOther", "noneCorporate"].forEach(
      (k) => delete req.session.data[k]
    );
    // S19 → S20 shared platforms (Batch 3).
    return res.redirect(`/setup/critical-systems/${encodeURIComponent(system.id)}/platforms`);
  });

  // S15 — Is this system managed by a third-party supplier? (Figma 393:356) — PROPOSAL
  router.get("/setup/critical-systems/:systemId/supplier", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    res.render("pages/setup/critical-systems/supplier", {
      pageTitle: "Is this system managed by a third-party supplier?",
      backHref: `/setup/critical-systems/${encodeURIComponent(system.id)}/platforms`,
      system,
    });
  });

  router.post("/setup/critical-systems/:systemId/supplier", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    const answer = clean(req.session.data.managedBySupplier);
    system.managedBySupplier = answer;
    delete req.session.data.managedBySupplier;
    if (answer === "fully" || answer === "partially") {
      return res.redirect(
        `/setup/critical-systems/${encodeURIComponent(system.id)}/which-supplier`
      );
    }
    // No / I don't know → S17 shared with councils (Batch 5).
    return res.redirect(
      `/setup/critical-systems/${encodeURIComponent(system.id)}/shared-with-councils`
    );
  });

  // S16 — Which supplier manages all or part of this system? (Figma 393:393) — PROPOSAL
  router.get("/setup/critical-systems/:systemId/which-supplier", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    res.render("pages/setup/critical-systems/which-supplier", {
      pageTitle: "Which supplier manages all or part of this system?",
      backHref: `/setup/critical-systems/${encodeURIComponent(system.id)}/supplier`,
      system,
      suppliers: setup.suppliers || [],
    });
  });

  router.post("/setup/critical-systems/:systemId/which-supplier", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    system.supplierId = clean(req.session.data.whichSupplier);
    system.supplierNote = clean(req.session.data.supplierNote);
    delete req.session.data.whichSupplier;
    delete req.session.data.supplierNote;
    return res.redirect(
      `/setup/critical-systems/${encodeURIComponent(system.id)}/shared-with-councils`
    );
  });

  // S41 — Add a supplier (Figma 393:1341) + S51 error (Figma 393:1634)
  router.get("/setup/suppliers/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/critical-systems/add-supplier", {
      pageTitle: "Add a supplier",
      backHref: supplierReturnHref(req, setup),
      caption: supplierReturnCaption(req, setup),
      returnTo: clean(req.query.return),
      name: "",
    });
  });

  router.post("/setup/suppliers/add", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const name = clean(req.session.data.supplierName);
    const returnTo = clean(req.session.data.returnTo);
    delete req.session.data.supplierName;
    delete req.session.data.returnTo;

    if (!name) {
      // S51 error state
      return res.render("pages/setup/critical-systems/add-supplier", {
        pageTitle: "Error: Add a supplier",
        backHref: supplierReturnHrefFor(returnTo, setup),
        caption: supplierReturnCaptionFor(returnTo, setup),
        returnTo,
        name: "",
        error: { items: [{ field: "supplierName", text: "Enter the supplier's name" }] },
      });
    }

    const supplier = { id: `sup-${slugify(name)}`, name };
    setup.suppliers = setup.suppliers || [];
    setup.suppliers.push(supplier);

    if (returnTo.startsWith("system:")) {
      const systemId = returnTo.slice("system:".length);
      const system = getSystem(setup, systemId);
      if (system) system.supplierId = supplier.id;
      return res.redirect(
        `/setup/critical-systems/${encodeURIComponent(systemId)}/which-supplier`
      );
    }
    // From S12c (platform) — return to the add-platform form.
    return res.redirect("/setup/shared-infrastructure/add-platform");
  });

  // ----- Batch 5: Critical systems (details + removes) -------------------------------

  // S14 edit mode (reached from the S23 hub "Change" / "Link it")
  router.get("/setup/critical-systems/:systemId/edit", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    res.render("pages/setup/critical-systems/add", {
      pageTitle: "Add a critical system",
      backHref: "/setup/critical-systems",
      mode: "edit",
      serviceOptions: buildSupportedServiceOptions(setup),
      system,
    });
  });

  router.post("/setup/critical-systems/:systemId/edit", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    system.name = clean(req.session.data.systemName) || system.name;
    system.description = clean(req.session.data.systemDescription);
    const notSure = clean(req.session.data.notSureServices) === "later";
    system.supportedServices = notSure ? [] : toList(req.session.data.supportedServices);
    system.assessedBefore = clean(req.session.data.assessedBefore);
    [
      "systemName",
      "systemDescription",
      "supportedServices",
      "notSureServices",
      "assessedBefore",
    ].forEach((k) => delete req.session.data[k]);
    return res.redirect("/setup/critical-systems");
  });

  // S17 — Is this system shared with other councils? (Figma 393:433)
  router.get("/setup/critical-systems/:systemId/shared-with-councils", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    res.render("pages/setup/critical-systems/shared-with-councils", {
      pageTitle: "Is this system shared with other councils?",
      backHref: `/setup/critical-systems/${encodeURIComponent(system.id)}/supplier`,
      system,
    });
  });

  router.post("/setup/critical-systems/:systemId/shared-with-councils", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    const shared = clean(req.session.data.sharedWithCouncils) === "yes";
    system.sharedWithCouncils = shared;
    delete req.session.data.sharedWithCouncils;
    if (shared) {
      return res.redirect(`/setup/critical-systems/${encodeURIComponent(system.id)}/councils`);
    }
    return res.redirect(`/setup/critical-systems/${encodeURIComponent(system.id)}/hosting`);
  });

  // S18 — Which councils share this system? (Figma 393:463)
  router.get("/setup/critical-systems/:systemId/councils", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    const added = new Set(system.councils || []);
    res.render("pages/setup/critical-systems/councils", {
      pageTitle: "Which councils share this system?",
      backHref: `/setup/critical-systems/${encodeURIComponent(system.id)}/shared-with-councils`,
      system,
      // value = plain council name (stored); text = "name (type)" for display. Changed in build.
      register: COUNCIL_REGISTER.filter((c) => !added.has(c)).map((name) => ({ value: name, text: councilWithType(name) })),
      addedCouncils: (system.councils || []).map((name) => ({ value: name, text: councilWithType(name) })),
    });
  });

  router.post("/setup/critical-systems/:systemId/councils", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    system.councils = toList(req.session.data.whichCouncils);
    delete req.session.data.whichCouncils;
    return res.redirect(`/setup/critical-systems/${encodeURIComponent(system.id)}/hosting`);
  });

  // S21 — Where is this system hosted? (Figma 393:496)
  router.get("/setup/critical-systems/:systemId/hosting", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    const backHref = system.sharedWithCouncils
      ? `/setup/critical-systems/${encodeURIComponent(system.id)}/councils`
      : `/setup/critical-systems/${encodeURIComponent(system.id)}/shared-with-councils`;
    res.render("pages/setup/critical-systems/hosting", {
      pageTitle: "Where is this system hosted?",
      backHref,
      system,
      hostingPlatform: deriveHostingPlatformName(setup, system),
    });
  });

  router.post("/setup/critical-systems/:systemId/hosting", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    system.hosting = {
      type: clean(req.session.data.hostingType),
      provider: clean(req.session.data.hostingProvider),
      secondary: clean(req.session.data.hostingSecondary),
    };
    ["hostingType", "hostingProvider", "hostingSecondary"].forEach(
      (k) => delete req.session.data[k]
    );
    // S21 → back to the systems hub (S23).
    return res.redirect("/setup/critical-systems");
  });

  // S27 — Who owns this system? (Figma 393:646)
  router.get("/setup/critical-systems/:systemId/owner", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    res.render("pages/setup/critical-systems/owner", {
      pageTitle: "Who owns this system?",
      backHref: "/setup/critical-systems",
      system,
      counter: systemDetailCounter(setup, system),
    });
  });

  router.post("/setup/critical-systems/:systemId/owner", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    system.owner = {
      name: clean(req.session.data.ownerName),
      jobTitle: clean(req.session.data.ownerJobTitle),
    };
    delete req.session.data.ownerName;
    delete req.session.data.ownerJobTitle;
    // S27 → S28 impact ratings (Batch 6).
    return res.redirect(`/setup/critical-systems/${encodeURIComponent(system.id)}/impact`);
  });

  // S47 — Are you sure you want to remove [system]? (Figma 393:1501)
  // S48 — You cannot remove [system] (Figma 393:1536)
  router.get("/setup/critical-systems/:systemId/remove", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    if (!systemCanBeRemoved(system)) {
      return res.render("pages/setup/critical-systems/cannot-remove", {
        pageTitle: `You cannot remove ${system.name}`,
        backHref: `/setup/critical-systems/${encodeURIComponent(system.id)}/edit`,
        system,
      });
    }
    res.render("pages/setup/critical-systems/remove", {
      pageTitle: `Are you sure you want to remove ${system.name}?`,
      backHref: `/setup/critical-systems/${encodeURIComponent(system.id)}/edit`,
      system,
      consequences: buildRemoveSystemConsequences(setup, system),
    });
  });

  router.post("/setup/critical-systems/:systemId/remove", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    if (!systemCanBeRemoved(system)) return res.redirect("/setup/critical-systems");
    unlinkSystemFromPlatforms(setup, system.id);
    setup.criticalSystems = (setup.criticalSystems || []).filter((s) => s.id !== system.id);
    return res.redirect("/setup/critical-systems");
  });

  // ----- Batch 6: Ratings, recovery, coverage, finish -------------------------------

  // S28 — What would the impact be if this system were compromised? (Figma 393:676)
  router.get("/setup/critical-systems/:systemId/impact", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    res.render("pages/setup/critical-systems/impact", {
      pageTitle: "What would the impact be if this system were compromised?",
      backHref: `/setup/critical-systems/${encodeURIComponent(system.id)}/owner`,
      system,
      counter: systemDetailCounter(setup, system),
      criticality: deriveCriticality(system.impact),
    });
  });

  router.post("/setup/critical-systems/:systemId/impact", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    system.impact = {
      confidentiality: clean(req.session.data.impactConfidentiality),
      integrity: clean(req.session.data.impactIntegrity),
      availability: clean(req.session.data.impactAvailability),
    };
    // Owner + impact ratings complete the system's details.
    if (system.owner && system.owner.name && deriveCriticality(system.impact)) {
      system.detailsComplete = true;
    }
    ["impactConfidentiality", "impactIntegrity", "impactAvailability"].forEach(
      (k) => delete req.session.data[k]
    );
    return res.redirect(`/setup/critical-systems/${encodeURIComponent(system.id)}/recovery`);
  });

  // S29 — Recovery requirements (Figma 393:723) — UNDER REVIEW
  router.get("/setup/critical-systems/:systemId/recovery", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    res.render("pages/setup/critical-systems/recovery", {
      pageTitle: "Recovery requirements",
      backHref: `/setup/critical-systems/${encodeURIComponent(system.id)}/impact`,
      system,
      counter: systemDetailCounter(setup, system),
    });
  });

  router.post("/setup/critical-systems/:systemId/recovery", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const system = getSystem(setup, req.params.systemId);
    if (!system) return res.redirect("/setup/critical-systems");
    system.recovery = {
      mtd: clean(req.session.data.recoveryMtd),
      rto: clean(req.session.data.recoveryRto),
      rpo: clean(req.session.data.recoveryRpo),
    };
    ["recoveryMtd", "recoveryRto", "recoveryRpo"].forEach((k) => delete req.session.data[k]);
    // "Back to the hub" vs "Save and continue" (→ coverage check).
    if (clean(req.session.data.action) === "hub") {
      delete req.session.data.action;
      return res.redirect("/setup/critical-systems");
    }
    delete req.session.data.action;
    return res.redirect("/setup/coverage-check");
  });

  // S24 — Check nothing is missing (coverage check) (Figma 393:591) — PROPOSAL
  router.get("/setup/coverage-check", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const warnings = buildCoverageWarnings(setup);
    const noSystemService = servicesWithoutSystem(setup)[0] || null;
    res.render("pages/setup/coverage-check", {
      pageTitle: "Check nothing is missing",
      backHref: "/setup/task-list",
      warnings,
      concentration: buildConcentrationInset(setup),
      noSystemService,
    });
  });

  // S42 — Why does [service] not need a critical system? (Figma 393:1378)
  router.get("/setup/essential-services/:serviceId/no-system-reason", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/coverage-check");
    res.render("pages/setup/essential-services/no-system-reason", {
      pageTitle: `Why does ${service.name} not need a critical system?`,
      backHref: "/setup/coverage-check",
      service,
    });
  });

  router.post("/setup/essential-services/:serviceId/no-system-reason", (req, res) => {
    const setup = ensureSetup(req.session.data);
    const service = getService(setup, req.params.serviceId);
    if (!service) return res.redirect("/setup/coverage-check");
    service.noSystemReason = clean(req.session.data.noSystemReason);
    delete req.session.data.noSystemReason;
    return res.redirect("/setup/coverage-check");
  });

  // S30 — Check your setup (Figma 393:759)
  router.get("/setup/check-your-setup", (req, res) => {
    const setup = ensureSetup(req.session.data);
    // After setup is finished this page is a read-only "view your setup" (reached from the
    // dashboard council record); before, it is the pre-finish check with the Confirm button.
    const isComplete = Boolean(setup.completed);
    res.render("pages/setup/check-your-setup", {
      pageTitle: "Check your setup",
      backHref: isComplete ? "/dashboard" : "/setup/coverage-check",
      summary: buildSetupSummary(setup),
      isComplete,
    });
  });

  router.post("/setup/check-your-setup", (req, res) => {
    const setup = ensureSetup(req.session.data);
    // Setup is only complete once both a CAF Lead and an Approver are confirmed (stated on S30).
    // Named counts as confirmed (recorded / existing user) OR pending (invited, awaiting
    // acceptance). Only a completely unnamed person blocks finishing.
    const people = setup.people || {};
    const named = (p) => Boolean(p && (p.confirmed || p.pending));
    const errorList = [];
    if (!named(people.cafLead)) {
      errorList.push({ text: "Confirm your CAF Lead before you finish setup", href: "#cafLead-change" });
    }
    if (!named(people.approver)) {
      errorList.push({ text: "Confirm your Approver before you finish setup", href: "#approver-change" });
    }
    if (errorList.length) {
      return res.render("pages/setup/check-your-setup", {
        pageTitle: "Error: Check your setup",
        backHref: "/setup/coverage-check",
        summary: buildSetupSummary(setup),
        errorList: errorList,
      });
    }
    setup.completed = true;
    return res.redirect("/setup/complete");
  });

  // S31 — Setup complete (Figma 393:819)
  router.get("/setup/complete", (req, res) => {
    const setup = ensureSetup(req.session.data);
    res.render("pages/setup/complete", {
      pageTitle: "Setup complete",
      councilName: setup.council.name,
    });
  });

  // Shared holding page for links that leave the Setup section (Access management,
  // Decide, Dashboard, etc.) — out of scope for this prototype.
  router.get("/setup/not-in-this-prototype", (req, res) => {
    res.render("pages/setup/holding", {
      pageTitle: "This part is not built in this prototype",
      backHref: req.get("referer") && req.get("referer").includes("/setup/")
        ? undefined
        : "/setup/task-list",
    });
  });
};
