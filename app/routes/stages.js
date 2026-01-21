// app/routes/stages.js
// Stage 1 (Understand CAF) + Stage 2 (Scope pack wizard)

const labels = require("../data/content/labels");

const {
  requireSignedIn,
  ensureAssessment,
  getAssessmentOrRedirect,
} = require("../data/helpers/session");

module.exports = function (router) {
  router.use("/stages", (req, res, next) => {
    if (!requireSignedIn(req, res)) return;
    if (!ensureAssessment(req)) return res.redirect("/entry");
    next();
  });

  // Stage 1
  router.get("/stages/1", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    res.render("pages/stages/1-understand-caf", {
      pageTitle: labels.stages.stage1.pageTitle,
      labels,
      assessment,
    });
  });

  router.post("/stages/1", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    assessment.stage.understandCAFComplete = true;
    assessment.updatedAt = new Date().toISOString();
    return res.redirect("/stages/1/decision");
  });

  router.get("/stages/1/decision", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    res.render("pages/stages/1-decision", {
      pageTitle: labels.stages.stage1Decision.pageTitle,
      labels,
      assessment,
      error: null,
    });
  });

  router.post("/stages/1/decision", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    const nextStep = (req.session.data.stage1NextStep || "").toString();

    if (!nextStep) {
      return res.render("pages/stages/1-decision", {
        pageTitle: labels.stages.stage1Decision.pageTitle,
        labels,
        assessment,
        error: { items: [{ field: "stage1NextStep", text: labels.stages.stage1Decision.errors.required }] },
      });
    }

    delete req.session.data.stage1NextStep;

    const returnKey = nextStep === "stage3" ? "ad" : "bc";
    const target = returnKey === "ad" ? "/self-assess/ad" : "/self-assess/bc/select-system";
    req.session.data.stage1ReturnTo = returnKey;
    assessment.lens = returnKey;
    assessment.updatedAt = new Date().toISOString();

    if (!assessment.prepare || !assessment.prepare.guidanceRead) {
      req.session.data.stage1Gate = true;
      return res.redirect("/prepare");
    }
    if (!assessment.profile || !assessment.profile.reviewed) {
      req.session.data.stage1Gate = true;
      return res.redirect("/profile");
    }
    if (!assessment.stage || !assessment.stage.prepareScopeComplete) {
      req.session.data.scopeReturnTo = target;
      req.session.data.stage1Gate = true;
      return res.redirect("/stages/2/scope");
    }

    return res.redirect(target);
  });

  // Stage 2 (Scope pack wizard)
  router.get("/stages/2", (req, res) => res.redirect("/stages/2/scope"));
  router.post("/stages/2", (req, res) => res.redirect("/stages/2/scope"));

  router.get("/stages/2/scope", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const gatedNotice = getStage1GateNotice(req, labels);

    res.render("pages/stages/scope-hub", {
      pageTitle: labels.stages.scope.hub.title,
      labels,
      assessment,
      summary: buildScopeSummary(assessment),
      gatedNotice,
    });
  });

  router.get("/stages/2/scope/services/add", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    res.render("pages/stages/scope-services-add", {
      pageTitle: labels.stages.scope.services.addTitle,
      labels,
      assessment,
      error: null,
      data: {
        name: "",
        description: "",
        owner: "",
        inScope: "",
      },
    });
  });

  router.post("/stages/2/scope/services/add", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const name = (req.session.data.serviceName || "").toString().trim();
    const description = (req.session.data.serviceDescription || "").toString().trim();
    const owner = (req.session.data.serviceOwner || "").toString().trim();
    const inScope = (req.session.data.serviceInScope || "").toString();

    const errors = [];
    if (!name) errors.push({ field: "serviceName", text: labels.stages.scope.errors.serviceName });
    if (!inScope) errors.push({ field: "serviceInScope", text: labels.stages.scope.errors.serviceInScope });

    if (errors.length > 0) {
      return res.render("pages/stages/scope-services-add", {
        pageTitle: labels.stages.scope.services.addTitle,
        labels,
        assessment,
        error: { items: errors },
        data: {
          name,
          description,
          owner,
          inScope,
        },
      });
    }

    assessment.scope.essentialServices.push({
      id: `svc-${Date.now()}`,
      name,
      description,
      owner,
      inScope: inScope === "yes",
    });
    assessment.updatedAt = new Date().toISOString();

    clearServiceForm(req);

    return res.redirect("/stages/2/scope/services/review");
  });

  router.get("/stages/2/scope/services/review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    res.render("pages/stages/scope-services-review", {
      pageTitle: labels.stages.scope.services.reviewTitle,
      labels,
      assessment,
      services: assessment.scope.essentialServices,
    });
  });

  router.get("/stages/2/scope/services/confirm", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    res.render("pages/stages/scope-services-confirm", {
      pageTitle: labels.stages.scope.services.confirmTitle,
      labels,
      assessment,
      services: assessment.scope.essentialServices,
    });
  });

  router.post("/stages/2/scope/services/confirm", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    assessment.scope.servicesConfirmed = true;
    assessment.updatedAt = new Date().toISOString();

    return res.redirect("/stages/2/scope/systems/add");
  });

  router.get("/stages/2/scope/systems/add", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    if (req.query.returnTo) {
      req.session.data.scopeReturnTo = req.query.returnTo;
    }

    res.render("pages/stages/scope-systems-add", {
      pageTitle: labels.stages.scope.systems.addTitle,
      labels,
      assessment,
      error: null,
      data: {
        name: "",
        systemType: "",
        ownerSupplier: "",
        boundaryNotes: "",
        diagramRefs: "",
      },
    });
  });

  router.post("/stages/2/scope/systems/add", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const name = (req.session.data.systemName || "").toString().trim();
    const systemType = (req.session.data.systemType || "").toString().trim();
    const ownerSupplier = (req.session.data.ownerSupplier || "").toString().trim();
    const boundaryNotes = (req.session.data.boundaryNotes || "").toString().trim();
    const diagramRefs = (req.session.data.diagramRefs || "").toString().trim();

    const errors = [];
    if (!name) errors.push({ field: "systemName", text: labels.stages.scope.errors.systemName });

    if (errors.length > 0) {
      return res.render("pages/stages/scope-systems-add", {
        pageTitle: labels.stages.scope.systems.addTitle,
        labels,
        assessment,
        error: { items: errors },
        data: {
          name,
          systemType,
          ownerSupplier,
          boundaryNotes,
          diagramRefs,
        },
      });
    }

    const newSystem = {
      id: `sys-${Date.now()}`,
      name,
      systemType,
      ownerSupplier,
      boundaryNotes,
      diagramRefs: splitCsv(diagramRefs),
    };
    assessment.scope.criticalSystems.push(newSystem);
    assessment.updatedAt = new Date().toISOString();

    clearSystemForm(req);

    if (assessment.scope.essentialServices.length === 0) {
      return res.redirect("/stages/2/scope/services/add");
    }

    return res.redirect(`/stages/2/scope/mapping/${newSystem.id}`);
  });

  router.get("/stages/2/scope/systems/review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const nextMappingId = getNextMappingId(assessment.scope);
    const nextMappingUrl = nextMappingId
      ? `/stages/2/scope/mapping/${nextMappingId}`
      : "/stages/2/scope/mapping/review";

    res.render("pages/stages/scope-systems-review", {
      pageTitle: labels.stages.scope.systems.reviewTitle,
      labels,
      assessment,
      systems: assessment.scope.criticalSystems,
      nextMappingUrl,
    });
  });

  router.get("/stages/2/scope/mapping/:systemId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const system = findSystem(assessment.scope, req.params.systemId);
    if (!system) return res.redirect("/stages/2/scope/systems/review");

    const mapping = getMapping(assessment.scope, system.id);

    res.render("pages/stages/scope-mapping", {
      pageTitle: labels.stages.scope.mapping.title,
      labels,
      assessment,
      system,
      services: assessment.scope.essentialServices,
      selected: mapping ? mapping.serviceIds : [],
      error: null,
    });
  });

  router.post("/stages/2/scope/mapping/:systemId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const system = findSystem(assessment.scope, req.params.systemId);
    if (!system) return res.redirect("/stages/2/scope/systems/review");

    const serviceIds = coerceArray(req.session.data.serviceIds).filter(Boolean);

    if (serviceIds.length === 0) {
      return res.render("pages/stages/scope-mapping", {
        pageTitle: labels.stages.scope.mapping.title,
        labels,
        assessment,
        system,
        services: assessment.scope.essentialServices,
        selected: [],
        error: labels.stages.scope.errors.mappingRequired,
      });
    }

    upsertMapping(assessment.scope, system.id, serviceIds);
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.serviceIds;

    return res.redirect("/stages/2/scope/mapping/review");
  });

  router.get("/stages/2/scope/mapping/review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const nextMappingId = getNextMappingId(assessment.scope);
    const nextPriorityId = getNextPriorityId(assessment.scope);
    const priorityUrl = nextPriorityId
      ? `/stages/2/scope/priority/${nextPriorityId}`
      : "/stages/2/scope/priority/shortlist";

    res.render("pages/stages/scope-mapping-review", {
      pageTitle: labels.stages.scope.mapping.reviewTitle,
      labels,
      assessment,
      systems: assessment.scope.criticalSystems,
      services: assessment.scope.essentialServices,
      mappings: assessment.scope.mappings,
      nextMappingId,
      priorityUrl,
    });
  });

  router.get("/stages/2/scope/priority/:systemId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const system = findSystem(assessment.scope, req.params.systemId);
    if (!system) return res.redirect("/stages/2/scope/systems/review");

    const mapping = getMapping(assessment.scope, system.id);
    if (!mapping || mapping.serviceIds.length === 0) {
      return res.redirect(`/stages/2/scope/mapping/${system.id}`);
    }

    const priority = getPriority(assessment.scope, system.id);

    res.render("pages/stages/scope-priority", {
      pageTitle: labels.stages.scope.priority.title,
      labels,
      assessment,
      system,
      data: {
        level: priority ? priority.level : "",
        rationale: priority ? priority.rationale : "",
        criteria: priority ? priority.criteria : [],
      },
      error: null,
    });
  });

  router.post("/stages/2/scope/priority/:systemId", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const system = findSystem(assessment.scope, req.params.systemId);
    if (!system) return res.redirect("/stages/2/scope/systems/review");

    const mapping = getMapping(assessment.scope, system.id);
    if (!mapping || mapping.serviceIds.length === 0) {
      return res.redirect(`/stages/2/scope/mapping/${system.id}`);
    }

    const level = (req.session.data.priorityLevel || "").toString();
    const rationale = (req.session.data.priorityRationale || "").toString().trim();
    const criteria = coerceArray(req.session.data.priorityCriteria).filter(Boolean);

    const errors = [];
    if (!level) errors.push({ field: "priorityLevel", text: labels.stages.scope.errors.priorityLevel });
    if (!rationale) errors.push({ field: "priorityRationale", text: labels.stages.scope.errors.priorityRationale });

    if (errors.length > 0) {
      return res.render("pages/stages/scope-priority", {
        pageTitle: labels.stages.scope.priority.title,
        labels,
        assessment,
        system,
        data: { level, rationale, criteria },
        error: { items: errors },
      });
    }

    upsertPriority(assessment.scope, system.id, { level, rationale, criteria });
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.priorityLevel;
    delete req.session.data.priorityRationale;
    delete req.session.data.priorityCriteria;

    return res.redirect("/stages/2/scope/priority/shortlist");
  });

  router.get("/stages/2/scope/priority/shortlist", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const eligible = getEligibleShortlist(assessment.scope);

    res.render("pages/stages/scope-priority-shortlist", {
      pageTitle: labels.stages.scope.priority.shortlistTitle,
      labels,
      assessment,
      eligible,
      selected: assessment.scope.priorityShortlist,
      error: null,
    });
  });

  router.post("/stages/2/scope/priority/shortlist", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const selected = coerceArray(req.session.data.shortlistSystemIds).filter(Boolean);
    assessment.scope.priorityShortlist = selected;
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.shortlistSystemIds;

    return res.redirect("/stages/2/scope/priority/confirm");
  });

  router.get("/stages/2/scope/priority/confirm", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const shortlist = assessment.scope.priorityShortlist;
    const summary = shortlist.map((id) => {
      const system = findSystem(assessment.scope, id);
      const priority = getPriority(assessment.scope, id);
      return { system, priority };
    });

    res.render("pages/stages/scope-priority-confirm", {
      pageTitle: labels.stages.scope.priority.confirmTitle,
      labels,
      assessment,
      shortlist: summary,
    });
  });

  router.post("/stages/2/scope/priority/confirm", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    assessment.stage.prepareScopeComplete = true;
    assessment.updatedAt = new Date().toISOString();

    const returnTo = req.session.data.scopeReturnTo || "";
    delete req.session.data.scopeReturnTo;
    if (returnTo && req.session.data.stage1ReturnTo) {
      delete req.session.data.stage1ReturnTo;
    }

    if (returnTo) return res.redirect(returnTo);

    return res.redirect("/assessments/current/dashboard");
  });

  router.get("/stages/2-prepare-scope/:rest*", (req, res) => {
    return res.redirect("/stages/2/scope");
  });

  router.get("/stages/critical-system", (req, res) => {
    return res.redirect("/stages/2/scope/systems/add");
  });

  router.post("/stages/critical-system", (req, res) => {
    return res.redirect("/stages/2/scope/systems/add");
  });
};

function ensureScope(assessment) {
  if (!assessment.scope) assessment.scope = {};
  if (!Array.isArray(assessment.scope.essentialServices)) assessment.scope.essentialServices = [];
  if (!Array.isArray(assessment.scope.criticalSystems)) assessment.scope.criticalSystems = [];
  if (!Array.isArray(assessment.scope.mappings)) assessment.scope.mappings = [];
  if (!Array.isArray(assessment.scope.priority)) assessment.scope.priority = [];
  if (!Array.isArray(assessment.scope.priorityShortlist)) assessment.scope.priorityShortlist = [];
  if (typeof assessment.scope.servicesConfirmed !== "boolean") {
    assessment.scope.servicesConfirmed = false;
  }
}

function coerceArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function splitCsv(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function findSystem(scope, systemId) {
  return scope.criticalSystems.find((s) => s.id === systemId) || null;
}

function getMapping(scope, systemId) {
  return scope.mappings.find((m) => m.systemId === systemId) || null;
}

function upsertMapping(scope, systemId, serviceIds) {
  const existing = getMapping(scope, systemId);
  if (existing) {
    existing.serviceIds = serviceIds;
  } else {
    scope.mappings.push({ systemId, serviceIds });
  }
}

function getPriority(scope, systemId) {
  return scope.priority.find((p) => p.systemId === systemId) || null;
}

function upsertPriority(scope, systemId, data) {
  const existing = getPriority(scope, systemId);
  if (existing) {
    existing.level = data.level;
    existing.rationale = data.rationale;
    existing.criteria = data.criteria;
  } else {
    scope.priority.push({ systemId, ...data });
  }
}

function getEligibleShortlist(scope) {
  const eligibleLevels = ["high", "medium"];

  return scope.criticalSystems
    .map((system) => {
      const priority = getPriority(scope, system.id);
      const mapping = getMapping(scope, system.id);
      const mapped = mapping && mapping.serviceIds && mapping.serviceIds.length > 0;
      if (!priority || !mapped) return null;
      if (!eligibleLevels.includes(priority.level)) return null;
      return { system, priority };
    })
    .filter(Boolean);
}

function getNextMappingId(scope) {
  for (const system of scope.criticalSystems) {
    const mapping = getMapping(scope, system.id);
    if (!mapping || !mapping.serviceIds || mapping.serviceIds.length === 0) {
      return system.id;
    }
  }
  return "";
}

function getNextPriorityId(scope) {
  for (const system of scope.criticalSystems) {
    const priority = getPriority(scope, system.id);
    if (!priority) {
      return system.id;
    }
  }
  return "";
}

function clearServiceForm(req) {
  delete req.session.data.serviceName;
  delete req.session.data.serviceDescription;
  delete req.session.data.serviceOwner;
  delete req.session.data.serviceInScope;
}

function clearSystemForm(req) {
  delete req.session.data.systemName;
  delete req.session.data.systemType;
  delete req.session.data.ownerSupplier;
  delete req.session.data.boundaryNotes;
  delete req.session.data.diagramRefs;
}

function buildScopeSummary(assessment) {
  const scope = assessment.scope;
  const servicesCount = scope.essentialServices.length;
  const inScopeCount = scope.essentialServices.filter((s) => s.inScope).length;
  const systemsCount = scope.criticalSystems.length;
  const mappedCount = scope.criticalSystems.filter((system) => {
    const mapping = getMapping(scope, system.id);
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;
  const priorityCount = scope.priority.length;
  const shortlistCount = Array.isArray(scope.priorityShortlist) ? scope.priorityShortlist.length : 0;
  const isComplete = Boolean(assessment.stage && assessment.stage.prepareScopeComplete);

  let nextStepUrl = "/stages/2/scope/services/add";
  if (isComplete) {
    nextStepUrl = "/assessments/current/dashboard";
  } else if (servicesCount > 0 && !scope.servicesConfirmed) {
    nextStepUrl = "/stages/2/scope/services/confirm";
  } else if (servicesCount > 0 && scope.servicesConfirmed && systemsCount === 0) {
    nextStepUrl = "/stages/2/scope/systems/add";
  } else if (systemsCount > 0 && mappedCount < systemsCount) {
    const nextMappingId = getNextMappingId(scope);
    nextStepUrl = nextMappingId
      ? `/stages/2/scope/mapping/${nextMappingId}`
      : "/stages/2/scope/mapping/review";
  } else if (systemsCount > 0 && priorityCount < systemsCount) {
    const nextPriority = scope.criticalSystems.find((system) => !getPriority(scope, system.id));
    nextStepUrl = nextPriority ? `/stages/2/scope/priority/${nextPriority.id}` : "/stages/2/scope/priority/shortlist";
  } else if (shortlistCount === 0) {
    nextStepUrl = "/stages/2/scope/priority/shortlist";
  } else {
    nextStepUrl = "/stages/2/scope/priority/confirm";
  }

  const nextMappingId = getNextMappingId(scope);
  const mappingNextUrl = nextMappingId
    ? `/stages/2/scope/mapping/${nextMappingId}`
    : "/stages/2/scope/mapping/review";

  return {
    servicesCount,
    inScopeCount,
    systemsCount,
    mappedCount,
    priorityCount,
    shortlistCount,
    nextStepUrl,
    mappingNextUrl,
    isComplete,
  };
}

function getStage1GateNotice(req, labels) {
  const gate = Boolean(req.session.data.stage1Gate);
  if (!gate) return null;
  const returnTo = req.session.data.stage1ReturnTo || "";
  const targetLabel =
    returnTo === "ad"
      ? labels.stages.stage1Decision.options.stage3
      : labels.stages.stage1Decision.options.stage4;
  delete req.session.data.stage1Gate;
  return {
    title: "Complete this step first",
    text: `You chose ${targetLabel}. Finish this step and you will return to it.`,
  };
}
