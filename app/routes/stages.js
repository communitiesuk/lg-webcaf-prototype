// app/routes/stages.js
// Stage 1 (Understand CAF) + Stage 2 (CAF scope)

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
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    res.render("pages/stages/1-understand-caf", {
      pageTitle: labels.stages.stage1.pageTitle,
      labels,
      assessment,
    });
  });

  router.post("/stages/1", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

    assessment.stage.understandCAFComplete = true;
    assessment.updatedAt = new Date().toISOString();
    return res.redirect("/stages/1/decision");
  });

  router.get("/stages/1/decision", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

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
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }

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
    const target =
      returnKey === "ad"
        ? "/assessments/current/dashboard?lens=ad&view=all"
        : "/assessments/current/dashboard?lens=bc&view=all";
    req.session.data.stage1ReturnTo = returnKey;
    assessment.lens = returnKey;
    assessment.updatedAt = new Date().toISOString();

    if (!assessment.prepare || !assessment.prepare.guidanceRead) {
      req.session.data.stage1Gate = true;
      return res.redirect("/prepare");
    }
    if (!isScopeCompleteForJourney(assessment, req)) {
      req.session.data.scopeReturnTo = target;
      req.session.data.stage1Gate = true;
      return res.redirect("/stages/2/scope");
    }

    return res.redirect(target);
  });

  // Stage 2 (CAF scope)
  router.get("/stages/2", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    return res.redirect("/stages/2/scope");
  });
  router.post("/stages/2", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    return res.redirect("/stages/2/scope");
  });

  router.get("/stages/2/scope/context", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    res.render("pages/stages/scope-context", {
      pageTitle: "Set your organisational context",
      labels,
      assessment,
      error: null,
    });
  });

  router.post("/stages/2/scope/context", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const roundTwo = isRoundTwoRequest(req);

    const context = {
      mission: (req.session.data.scopeContextMission || "").toString().trim(),
      objectives: (req.session.data.scopeContextObjectives || "").toString().trim(),
      priorities: (req.session.data.scopeContextPriorities || "").toString().trim(),
      setup: (req.session.data.scopeContextSetup || "").toString().trim(),
      operate: (req.session.data.scopeContextOperate || "").toString().trim(),
      threat: (req.session.data.scopeContextThreat || "").toString().trim(),
      appetite: (req.session.data.scopeContextAppetite || "").toString().trim(),
      qaReviewed: buildDateParts(
        req.session.data.scopeContextQaDay,
        req.session.data.scopeContextQaMonth,
        req.session.data.scopeContextQaYear
      ),
      qaReviewedBy: (req.session.data.scopeContextQaName || "").toString().trim(),
      approverReviewed: buildDateParts(
        req.session.data.scopeContextApproverDay,
        req.session.data.scopeContextApproverMonth,
        req.session.data.scopeContextApproverYear
      ),
      approverReviewedBy: (req.session.data.scopeContextApproverName || "").toString().trim(),
      completed: true,
    };

    assessment.scope.context = context;
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);

    delete req.session.data.scopeContextMission;
    delete req.session.data.scopeContextObjectives;
    delete req.session.data.scopeContextPriorities;
    delete req.session.data.scopeContextSetup;
    delete req.session.data.scopeContextOperate;
    delete req.session.data.scopeContextThreat;
    delete req.session.data.scopeContextAppetite;
    delete req.session.data.scopeContextQaDay;
    delete req.session.data.scopeContextQaMonth;
    delete req.session.data.scopeContextQaYear;
    delete req.session.data.scopeContextQaName;
    delete req.session.data.scopeContextApproverDay;
    delete req.session.data.scopeContextApproverMonth;
    delete req.session.data.scopeContextApproverYear;
    delete req.session.data.scopeContextApproverName;

    if (!roundTwo && !assessment.scope.rolesConfirmed) {
      return res.redirect("/stages/2/scope/roles");
    }
    return redirectToScopeReviewReturnOr(req, res, "/stages/2/scope/services/add");
  });

  router.get("/stages/2/scope/roles", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope");
    }

    res.render("pages/stages/scope-roles", {
      pageTitle: "Who is involved in the CAF work",
      labels,
      assessment,
      error: null,
    });
  });

  router.post("/stages/2/scope/roles", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope");
    }

    const rolesSme = (req.session.data.scopeSme || "").toString().trim();
    const rolesTech = (req.session.data.scopeTech || "").toString().trim();
    const rolesApprover = (req.session.data.scopeApprover || "").toString().trim();
    const rolesConfirm = (req.session.data.scopeRolesConfirm || "").toString();
    const currentUser = req.session.data.user || null;

    const errors = [];
    if (!rolesConfirm) errors.push({ field: "scopeRolesConfirm", text: labels.stages.scope.errors.scopeRolesConfirm });

    assessment.scope.rolesLead = currentUser && currentUser.name ? currentUser.name : "";
    assessment.scope.rolesSme = rolesSme;
    assessment.scope.rolesTech = rolesTech;
    assessment.scope.rolesApprover = rolesApprover;
    assessment.scope.rolesConfirmed = rolesConfirm === "yes";
    syncContributorsFromScopeRoles(assessment, currentUser);
    assessment.updatedAt = new Date().toISOString();

    if (errors.length > 0) {
      return res.render("pages/stages/scope-roles", {
        pageTitle: "Who is involved in the CAF work",
        labels,
        assessment,
        error: { items: errors },
      });
    }

    delete req.session.data.scopeLead;
    delete req.session.data.scopeSme;
    delete req.session.data.scopeTech;
    delete req.session.data.scopeApprover;
    delete req.session.data.scopeRolesConfirm;

    return res.redirect("/stages/2/scope");
  });

  router.get("/stages/2/scope/services/methodology", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/services/add");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    res.render("pages/stages/scope-services-methodology", {
      pageTitle: "Identify essential services",
      labels,
      assessment,
      error: null,
    });
  });

  router.post("/stages/2/scope/services/methodology", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/services/add");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const hasMethodology = (req.session.data.essentialMethodologyConfirmed || "").toString();
    const methodologyNotes = (req.session.data.essentialMethodologyNotes || "").toString().trim();
    const qaReviewed = buildDateParts(
      req.session.data.essentialMethodologyQaDay,
      req.session.data.essentialMethodologyQaMonth,
      req.session.data.essentialMethodologyQaYear
    );
    const approverReviewed = buildDateParts(
      req.session.data.essentialMethodologyApproverDay,
      req.session.data.essentialMethodologyApproverMonth,
      req.session.data.essentialMethodologyApproverYear
    );

    const errors = [];
    if (!hasMethodology) {
      errors.push({ field: "essentialMethodologyConfirmed", text: "Select yes or no" });
    }
    if (hasMethodology === "yes" && !methodologyNotes) {
      errors.push({ field: "essentialMethodologyNotes", text: "Enter a short summary of the methodology" });
    }

    assessment.scope.essentialMethodology = {
      confirmed: hasMethodology === "yes",
      notes: methodologyNotes,
      qaReviewed,
      qaReviewedBy: (req.session.data.essentialMethodologyQaName || "").toString().trim(),
      approverReviewed,
      approverReviewedBy: (req.session.data.essentialMethodologyApproverName || "").toString().trim(),
      completed: true,
    };

    if (errors.length > 0) {
      return res.render("pages/stages/scope-services-methodology", {
        pageTitle: "Identify essential services",
        labels,
        assessment,
        error: { items: errors },
      });
    }

    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.essentialMethodologyConfirmed;
    delete req.session.data.essentialMethodologyNotes;
    delete req.session.data.essentialMethodologyQaDay;
    delete req.session.data.essentialMethodologyQaMonth;
    delete req.session.data.essentialMethodologyQaYear;
    delete req.session.data.essentialMethodologyQaName;
    delete req.session.data.essentialMethodologyApproverDay;
    delete req.session.data.essentialMethodologyApproverMonth;
    delete req.session.data.essentialMethodologyApproverYear;
    delete req.session.data.essentialMethodologyApproverName;

    return res.redirect("/stages/2/scope/services/add");
  });

  router.get("/stages/2/scope/systems/methodology", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/systems/add");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    res.render("pages/stages/scope-systems-methodology", {
      pageTitle: "Identify critical systems",
      labels,
      assessment,
      error: null,
    });
  });

  router.post("/stages/2/scope/systems/methodology", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/systems/add");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const hasMethodology = (req.session.data.criticalMethodologyConfirmed || "").toString();
    const methodologyNotes = (req.session.data.criticalMethodologyNotes || "").toString().trim();
    const qaReviewed = buildDateParts(
      req.session.data.criticalMethodologyQaDay,
      req.session.data.criticalMethodologyQaMonth,
      req.session.data.criticalMethodologyQaYear
    );
    const approverReviewed = buildDateParts(
      req.session.data.criticalMethodologyApproverDay,
      req.session.data.criticalMethodologyApproverMonth,
      req.session.data.criticalMethodologyApproverYear
    );

    const errors = [];
    if (!hasMethodology) {
      errors.push({ field: "criticalMethodologyConfirmed", text: "Select yes or no" });
    }
    if (hasMethodology === "yes" && !methodologyNotes) {
      errors.push({ field: "criticalMethodologyNotes", text: "Enter a short summary of the methodology" });
    }

    assessment.scope.criticalMethodology = {
      confirmed: hasMethodology === "yes",
      notes: methodologyNotes,
      qaReviewed,
      qaReviewedBy: (req.session.data.criticalMethodologyQaName || "").toString().trim(),
      approverReviewed,
      approverReviewedBy: (req.session.data.criticalMethodologyApproverName || "").toString().trim(),
      completed: true,
    };

    if (errors.length > 0) {
      return res.render("pages/stages/scope-systems-methodology", {
        pageTitle: "Identify critical systems",
        labels,
        assessment,
        error: { items: errors },
      });
    }

    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.criticalMethodologyConfirmed;
    delete req.session.data.criticalMethodologyNotes;
    delete req.session.data.criticalMethodologyQaDay;
    delete req.session.data.criticalMethodologyQaMonth;
    delete req.session.data.criticalMethodologyQaYear;
    delete req.session.data.criticalMethodologyQaName;
    delete req.session.data.criticalMethodologyApproverDay;
    delete req.session.data.criticalMethodologyApproverMonth;
    delete req.session.data.criticalMethodologyApproverYear;
    delete req.session.data.criticalMethodologyApproverName;

    return res.redirect("/stages/2/scope/systems/add");
  });

  router.get("/stages/2/scope", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const gatedNotice = getStage1GateNotice(req, labels);

    res.render("pages/stages/scope-hub", {
      pageTitle: labels.stages.scope.hub.title,
      labels,
      assessment,
      summary: buildScopeSummary(assessment, { roundTwo: isRoundTwoRequest(req) }),
      gatedNotice,
      error: null,
    });
  });

  router.post("/stages/2/scope", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const leadConfirm = (req.session.data.scopeLeadConfirm || "").toString();
    const packStatus = (req.session.data.scopePackStatus || "").toString();
    const blockerReason = (req.session.data.scopeBlockerReason || "").toString();
    const blockerNotes = (req.session.data.scopeBlockerNotes || "").toString().trim();

    const errors = [];
    if (!leadConfirm) errors.push({ field: "scopeLeadConfirm", text: labels.stages.scope.errors.scopeLeadConfirm });
    if (!packStatus) errors.push({ field: "scopePackStatus", text: labels.stages.scope.errors.scopePackStatus });
    if (packStatus === "stalled" && !blockerReason) {
      errors.push({ field: "scopeBlockerReason", text: labels.stages.scope.errors.scopeBlockerReason });
    }

    if (errors.length > 0) {
      assessment.scope.leadConfirmed = leadConfirm === "yes";
      assessment.scope.packStatus = packStatus;
      assessment.scope.blockerReason = blockerReason;
      assessment.scope.blockerNotes = blockerNotes;
      return res.render("pages/stages/scope-hub", {
        pageTitle: labels.stages.scope.hub.title,
        labels,
        assessment,
        summary: buildScopeSummary(assessment, { roundTwo: isRoundTwoRequest(req) }),
        gatedNotice: null,
        error: { items: errors },
      });
    }

    assessment.scope.leadConfirmed = leadConfirm === "yes";
    assessment.scope.packStatus = packStatus;
    assessment.scope.blockerReason = packStatus === "stalled" ? blockerReason : "";
    assessment.scope.blockerNotes = packStatus === "stalled" ? blockerNotes : "";
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.scopeLeadConfirm;
    delete req.session.data.scopePackStatus;
    delete req.session.data.scopeBlockerReason;
    delete req.session.data.scopeBlockerNotes;

    return res.redirect("/stages/2/scope");
  });

  router.get("/stages/2/scope/services/add", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    if (!isRoundTwoRequest(req) && !assessment.scope.essentialMethodology.completed) {
      return res.redirect("/stages/2/scope/services/methodology");
    }

    res.render("pages/stages/scope-services-add", {
      pageTitle: labels.stages.scope.services.addTitle,
      labels,
      assessment,
      formAction: "/stages/2/scope/services/add",
      submitText: labels.stages.scope.services.addButton,
      cancelHref: "/stages/2/scope/services/review",
      isEdit: false,
      error: null,
      data: {
        name: "",
        description: "",
        owner: "",
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
    const roundTwo = isRoundTwoRequest(req);

    const errors = [];
    if (!name) errors.push({ field: "serviceName", text: labels.stages.scope.errors.serviceName });
    if (!roundTwo) {
      const inScope = (req.session.data.serviceInScope || "").toString();
      if (!inScope) errors.push({ field: "serviceInScope", text: labels.stages.scope.errors.serviceInScope });
    }

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
        },
      });
    }

    const inScope = roundTwo ? true : (req.session.data.serviceInScope || "").toString() === "yes";

    assessment.scope.essentialServices.push({
      id: `svc-${Date.now()}`,
      name,
      description,
      owner,
      inScope,
    });
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);

    clearServiceForm(req);

    return res.redirect("/stages/2/scope/services/review");
  });

  router.get("/stages/2/scope/services/:serviceId(svc-[^/]+)/edit", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const service = findService(assessment.scope, req.params.serviceId);
    if (!service) return res.redirect("/stages/2/scope/services/review");

    res.render("pages/stages/scope-services-add", {
      pageTitle: "Change essential service",
      labels,
      assessment,
      formAction: `/stages/2/scope/services/${service.id}/edit`,
      submitText: "Save changes",
      cancelHref: "/stages/2/scope/services/review",
      isEdit: true,
      error: null,
      data: {
        name: service.name || "",
        description: service.description || "",
        owner: service.owner || "",
      },
    });
  });

  router.post("/stages/2/scope/services/:serviceId(svc-[^/]+)/edit", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const service = findService(assessment.scope, req.params.serviceId);
    if (!service) return res.redirect("/stages/2/scope/services/review");

    const name = (req.session.data.serviceName || "").toString().trim();
    const description = (req.session.data.serviceDescription || "").toString().trim();
    const owner = (req.session.data.serviceOwner || "").toString().trim();
    const roundTwo = isRoundTwoRequest(req);

    const errors = [];
    if (!name) errors.push({ field: "serviceName", text: labels.stages.scope.errors.serviceName });
    if (!roundTwo) {
      const inScope = (req.session.data.serviceInScope || "").toString();
      if (!inScope) errors.push({ field: "serviceInScope", text: labels.stages.scope.errors.serviceInScope });
    }

    if (errors.length > 0) {
      return res.render("pages/stages/scope-services-add", {
        pageTitle: "Change essential service",
        labels,
        assessment,
        formAction: `/stages/2/scope/services/${service.id}/edit`,
        submitText: "Save changes",
        cancelHref: "/stages/2/scope/services/review",
        isEdit: true,
        error: { items: errors },
        data: {
          name,
          description,
          owner,
        },
      });
    }

    service.name = name;
    service.description = description;
    service.owner = owner;
    if (!roundTwo) {
      service.inScope = (req.session.data.serviceInScope || "").toString() === "yes";
    } else {
      service.inScope = true;
    }
    assessment.scope.servicesConfirmed = false;
    if (assessment.stage) assessment.stage.prepareScopeComplete = false;
    assessment.updatedAt = new Date().toISOString();
    clearServiceForm(req);
    return res.redirect("/stages/2/scope/services/review");
  });

  router.post("/stages/2/scope/services/:serviceId(svc-[^/]+)/remove", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect(`/stages/2/scope/services/${req.params.serviceId}/remove`);
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const serviceId = req.params.serviceId;
    assessment.scope.essentialServices = assessment.scope.essentialServices.filter(
      (service) => service.id !== serviceId
    );
    assessment.scope.mappings = assessment.scope.mappings
      .map((mapping) => ({
        ...mapping,
        serviceIds: (mapping.serviceIds || []).filter((id) => id !== serviceId),
      }))
      .filter((mapping) => Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0);
    assessment.scope.servicesConfirmed = false;
    if (assessment.stage) assessment.stage.prepareScopeComplete = false;
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);
    return res.redirect("/stages/2/scope/services/review");
  });

  router.get("/stages/2/scope/services/:serviceId(svc-[^/]+)/remove", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const service = findService(assessment.scope, req.params.serviceId);
    if (!service) return res.redirect("/stages/2/scope/services/review");

    return res.render("pages/stages/scope-services-remove", {
      pageTitle: "Remove essential service",
      assessment,
      service,
    });
  });

  router.post("/stages/2/scope/services/:serviceId(svc-[^/]+)/remove/confirm", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const serviceId = req.params.serviceId;
    assessment.scope.essentialServices = assessment.scope.essentialServices.filter(
      (service) => service.id !== serviceId
    );
    assessment.scope.mappings = assessment.scope.mappings
      .map((mapping) => ({
        ...mapping,
        serviceIds: (mapping.serviceIds || []).filter((id) => id !== serviceId),
      }))
      .filter((mapping) => Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0);
    assessment.scope.servicesConfirmed = false;
    if (assessment.stage) assessment.stage.prepareScopeComplete = false;
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);
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
      roundTwo: isRoundTwoRequest(req),
    });
  });

  router.post("/stages/2/scope/services/review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    assessment.scope.servicesConfirmed = assessment.scope.essentialServices.length > 0;
    if (assessment.stage && assessment.scope.essentialServices.length === 0) {
      assessment.stage.prepareScopeComplete = false;
    }
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);
    return redirectToScopeReviewReturnOr(req, res, "/assessments/current/journey");
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
    if (isRoundTwoRequest(req)) {
      assessment.scope.servicesConfirmed = assessment.scope.essentialServices.length > 0;
      assessment.updatedAt = new Date().toISOString();
      syncRoundTwoScopeCompletion(assessment, req);
      return redirectToScopeReviewReturnOr(req, res, "/assessments/current/journey");
    }
    assessment.scope.servicesConfirmed = true;
    assessment.updatedAt = new Date().toISOString();

    return res.redirect("/stages/2/scope/systems/add");
  });

  router.get("/stages/2/scope/systems/add", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    if (!isRoundTwoRequest(req) && !assessment.scope.criticalMethodology.completed) {
      return res.redirect("/stages/2/scope/systems/methodology");
    }

    if (req.query.returnTo) {
      req.session.data.scopeReturnTo = req.query.returnTo;
    }

    res.render("pages/stages/scope-systems-add", {
      pageTitle: labels.stages.scope.systems.addTitle,
      labels,
      assessment,
      formAction: "/stages/2/scope/systems/add",
      submitText: labels.stages.scope.systems.addButton,
      cancelHref: "/stages/2/scope/systems/review",
      isEdit: false,
      error: null,
      data: {
        name: "",
        systemType: "",
        ownerSupplier: "",
        boundaryNotes: "",
        diagramRefs: "",
        inScope: "",
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
    const inScope = (req.session.data.systemInScope || "").toString().trim();

    const errors = [];
    if (!name) errors.push({ field: "systemName", text: labels.stages.scope.errors.systemName });
    if (!inScope) errors.push({ field: "systemInScope", text: "Select whether this system is in scope" });

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
          inScope,
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
      inScope: inScope === "yes",
    };
    assessment.scope.criticalSystems.push(newSystem);
    assessment.scope.assurerReviewed = false;
    assessment.scope.leadConfirmed = false;
    if (assessment.stage) {
      assessment.stage.prepareScopeComplete = false;
    }
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);

    clearSystemForm(req);

    if (assessment.scope.essentialServices.length === 0) {
      return res.redirect("/stages/2/scope/services/add");
    }

    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/systems/review");
    }

    return res.redirect(`/stages/2/scope/mapping/${newSystem.id}`);
  });

  router.get("/stages/2/scope/systems/:systemId(sys-[^/]+)/edit", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const system = findSystem(assessment.scope, req.params.systemId);
    if (!system) return res.redirect("/stages/2/scope/systems/review");

    res.render("pages/stages/scope-systems-add", {
      pageTitle: "Change critical system",
      labels,
      assessment,
      formAction: `/stages/2/scope/systems/${system.id}/edit`,
      submitText: "Save changes",
      cancelHref: "/stages/2/scope/systems/review",
      isEdit: true,
      error: null,
      data: {
        name: system.name || "",
        systemType: system.systemType || "",
        ownerSupplier: system.ownerSupplier || "",
        boundaryNotes: system.boundaryNotes || "",
        diagramRefs: Array.isArray(system.diagramRefs) ? system.diagramRefs.join(", ") : "",
        inScope: system.inScope ? "yes" : "no",
      },
    });
  });

  router.post("/stages/2/scope/systems/:systemId(sys-[^/]+)/edit", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const system = findSystem(assessment.scope, req.params.systemId);
    if (!system) return res.redirect("/stages/2/scope/systems/review");

    const name = (req.session.data.systemName || "").toString().trim();
    const systemType = (req.session.data.systemType || "").toString().trim();
    const ownerSupplier = (req.session.data.ownerSupplier || "").toString().trim();
    const boundaryNotes = (req.session.data.boundaryNotes || "").toString().trim();
    const diagramRefs = (req.session.data.diagramRefs || "").toString().trim();
    const inScope = (req.session.data.systemInScope || "").toString().trim();

    const errors = [];
    if (!name) errors.push({ field: "systemName", text: labels.stages.scope.errors.systemName });
    if (!inScope) errors.push({ field: "systemInScope", text: "Select whether this system is in scope" });

    if (errors.length > 0) {
      return res.render("pages/stages/scope-systems-add", {
        pageTitle: "Change critical system",
        labels,
        assessment,
        formAction: `/stages/2/scope/systems/${system.id}/edit`,
        submitText: "Save changes",
        cancelHref: "/stages/2/scope/systems/review",
        isEdit: true,
        error: { items: errors },
        data: {
          name,
          systemType,
          ownerSupplier,
          boundaryNotes,
          diagramRefs,
          inScope,
        },
      });
    }

    system.name = name;
    system.systemType = systemType;
    system.ownerSupplier = ownerSupplier;
    system.boundaryNotes = boundaryNotes;
    system.diagramRefs = splitCsv(diagramRefs);
    system.inScope = inScope === "yes";
    assessment.scope.assurerReviewed = false;
    assessment.scope.leadConfirmed = false;
    if (assessment.stage) assessment.stage.prepareScopeComplete = false;
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);
    clearSystemForm(req);
    return res.redirect("/stages/2/scope/systems/review");
  });

  router.post("/stages/2/scope/systems/:systemId(sys-[^/]+)/remove", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect(`/stages/2/scope/systems/${req.params.systemId}/remove`);
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const systemId = req.params.systemId;
    assessment.scope.criticalSystems = assessment.scope.criticalSystems.filter(
      (system) => system.id !== systemId
    );
    assessment.scope.mappings = assessment.scope.mappings.filter(
      (mapping) => mapping.systemId !== systemId
    );
    assessment.scope.priority = assessment.scope.priority.filter(
      (priority) => priority.systemId !== systemId
    );
    assessment.scope.priorityShortlist = (assessment.scope.priorityShortlist || []).filter(
      (id) => id !== systemId
    );
    if (assessment.scope.priorityDetails && assessment.scope.priorityDetails[systemId]) {
      delete assessment.scope.priorityDetails[systemId];
    }
    assessment.scope.assurerReviewed = false;
    assessment.scope.leadConfirmed = false;
    if (assessment.stage) assessment.stage.prepareScopeComplete = false;
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);
    return res.redirect("/stages/2/scope/systems/review");
  });

  router.get("/stages/2/scope/systems/:systemId(sys-[^/]+)/remove", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const system = findSystem(assessment.scope, req.params.systemId);
    if (!system) return res.redirect("/stages/2/scope/systems/review");

    return res.render("pages/stages/scope-systems-remove", {
      pageTitle: "Remove critical system",
      assessment,
      system,
    });
  });

  router.post("/stages/2/scope/systems/:systemId(sys-[^/]+)/remove/confirm", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const systemId = req.params.systemId;
    assessment.scope.criticalSystems = assessment.scope.criticalSystems.filter(
      (system) => system.id !== systemId
    );
    assessment.scope.mappings = assessment.scope.mappings.filter(
      (mapping) => mapping.systemId !== systemId
    );
    assessment.scope.priority = assessment.scope.priority.filter(
      (priority) => priority.systemId !== systemId
    );
    assessment.scope.priorityShortlist = (assessment.scope.priorityShortlist || []).filter(
      (id) => id !== systemId
    );
    if (assessment.scope.priorityDetails && assessment.scope.priorityDetails[systemId]) {
      delete assessment.scope.priorityDetails[systemId];
    }
    assessment.scope.assurerReviewed = false;
    assessment.scope.leadConfirmed = false;
    if (assessment.stage) assessment.stage.prepareScopeComplete = false;
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);
    return res.redirect("/stages/2/scope/systems/review");
  });

  router.get("/stages/2/scope/systems/review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const nextMappingId = getNextMappingId(assessment.scope);
    const hasUnmappedSystems = Boolean(nextMappingId);
    const roundTwo = isRoundTwoRequest(req);
    const nextAction = hasUnmappedSystems
      ? {
          href: `/stages/2/scope/mapping/${nextMappingId}`,
          text: "Continue mapping systems",
        }
      : roundTwo
        ? {
            href: "/stages/2/scope/priority/shortlist",
            text: "Review systems that may be selected this year",
          }
        : {
            href: "/stages/2/scope/priority/confirm",
            text: "Continue to confirm scope pack ready",
          };

    const systemRows = assessment.scope.criticalSystems.map((system) => {
      const mapping = getMapping(assessment.scope, system.id);
      const mappedServices = (mapping && Array.isArray(mapping.serviceIds) ? mapping.serviceIds : [])
        .map((serviceId) => findService(assessment.scope, serviceId))
        .filter(Boolean)
        .map((service) => service.name);
      const priority = getPriority(assessment.scope, system.id);

      return {
        ...system,
        mappedServices,
        priorityLabel: priority && priority.level ? priority.level : "",
      };
    });

    res.render("pages/stages/scope-systems-review", {
      pageTitle: labels.stages.scope.systems.reviewTitle,
      labels,
      assessment,
      systems: systemRows,
      nextAction,
      roundTwo: isRoundTwoRequest(req),
    });
  });

  router.post("/stages/2/scope/systems/review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    assessment.updatedAt = new Date().toISOString();
    syncRoundTwoScopeCompletion(assessment, req);
    return redirectToScopeReviewReturnOr(req, res, "/assessments/current/journey");
  });

  router.get("/stages/2/scope/mapping/:systemId(sys-[^/]+)", (req, res) => {
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

  router.post("/stages/2/scope/mapping/:systemId(sys-[^/]+)", (req, res) => {
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
    syncRoundTwoScopeCompletion(assessment, req);

    delete req.session.data.serviceIds;

    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/systems/review");
    }

    return res.redirect("/stages/2/scope/mapping/review");
  });

  router.get("/stages/2/scope/mapping/review", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const nextMappingId = getNextMappingId(assessment.scope);

    res.render("pages/stages/scope-mapping-review", {
      pageTitle: labels.stages.scope.mapping.reviewTitle,
      labels,
      assessment,
      systems: assessment.scope.criticalSystems,
      services: assessment.scope.essentialServices,
      mappings: assessment.scope.mappings,
      nextMappingId,
      nextUrl: "/stages/2/scope",
    });
  });

  router.get("/stages/2/scope/priority/:systemId(sys-[^/]+)", (req, res) => {
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
        confidence: priority ? priority.confidence : "",
        confidenceRationale: priority ? priority.confidenceRationale : "",
      },
      error: null,
    });
  });

  router.post("/stages/2/scope/priority/:systemId(sys-[^/]+)", (req, res) => {
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
    const confidence = (req.session.data.priorityConfidence || "").toString();
    const confidenceRationale = (req.session.data.priorityConfidenceRationale || "").toString().trim();

    const errors = [];
    if (!level) errors.push({ field: "priorityLevel", text: labels.stages.scope.errors.priorityLevel });
    if (!rationale) errors.push({ field: "priorityRationale", text: labels.stages.scope.errors.priorityRationale });
    if (!confidence) errors.push({ field: "priorityConfidence", text: "Select a confidence level" });
    if (!confidenceRationale) {
      errors.push({ field: "priorityConfidenceRationale", text: "Enter a short reason for confidence" });
    }

    if (errors.length > 0) {
      return res.render("pages/stages/scope-priority", {
        pageTitle: labels.stages.scope.priority.title,
        labels,
        assessment,
        system,
        data: { level, rationale, criteria, confidence, confidenceRationale },
        error: { items: errors },
      });
    }

    upsertPriority(assessment.scope, system.id, {
      level,
      rationale,
      criteria,
      confidence,
      confidenceRationale,
    });
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.priorityLevel;
    delete req.session.data.priorityRationale;
    delete req.session.data.priorityCriteria;
    delete req.session.data.priorityConfidence;
    delete req.session.data.priorityConfidenceRationale;

    syncRoundTwoScopeCompletion(assessment, req);

    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/systems/review");
    }

    return res.redirect("/stages/2/scope/priority/shortlist");
  });

  router.get("/stages/2/scope/priority/shortlist", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/systems/review");
    }
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
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/systems/review");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const roundTwo = isRoundTwoRequest(req);
    const selected = coerceArray(req.session.data.shortlistSystemIds).filter(Boolean);
    if (roundTwo && selected.length > 3) {
      const eligible = getEligibleShortlist(assessment.scope);
      return res.render("pages/stages/scope-priority-shortlist", {
        pageTitle: labels.stages.scope.priority.shortlistTitle,
        labels,
        assessment,
        eligible,
        selected: assessment.scope.priorityShortlist,
        error: { items: [{ field: "shortlistSystemIds", text: labels.stages.scope.errors.shortlistMinimum }] },
      });
    }
    if (!roundTwo) {
      const systemsCount = assessment.scope.criticalSystems.length;
      const prioritisedCount = assessment.scope.priority.filter((priority) => priority && priority.level).length;
      if (systemsCount < 3 || prioritisedCount < 3) {
        const eligible = getEligibleShortlist(assessment.scope);
        return res.render("pages/stages/scope-priority-shortlist", {
          pageTitle: labels.stages.scope.priority.shortlistTitle,
          labels,
          assessment,
          eligible,
          selected: assessment.scope.priorityShortlist,
          error: { items: [{ field: "shortlistSystemIds", text: labels.stages.scope.errors.shortlistMinimum }] },
        });
      }
    }
    assessment.scope.priorityShortlist = selected;
    assessment.updatedAt = new Date().toISOString();

    delete req.session.data.shortlistSystemIds;

    return res.redirect(
      roundTwo
        ? (selected.length > 0
          ? "/stages/2/scope/priority/describe"
          : "/stages/2/scope/priority/confirm")
        : "/stages/2/scope/priority/describe"
    );
  });

  router.get("/stages/2/scope/priority/describe", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/systems/review");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const shortlist = assessment.scope.priorityShortlist || [];
    if (shortlist.length === 0) {
      return res.redirect(
        isRoundTwoRequest(req)
          ? "/stages/2/scope/priority/confirm"
          : "/stages/2/scope/priority/shortlist"
      );
    }

    const systems = shortlist
      .map((id) => findSystem(assessment.scope, id))
      .filter(Boolean)
      .slice(0, 3);

    res.render("pages/stages/scope-priority-describe", {
      pageTitle: "Identify your priority critical systems",
      labels,
      assessment,
      systems,
      error: null,
    });
  });

  router.post("/stages/2/scope/priority/describe", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/stages/2/scope/systems/review");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const shortlist = assessment.scope.priorityShortlist || [];
    if (shortlist.length === 0) {
      return res.redirect(
        isRoundTwoRequest(req)
          ? "/stages/2/scope/priority/confirm"
          : "/stages/2/scope/priority/shortlist"
      );
    }

    const systems = shortlist
      .map((id) => findSystem(assessment.scope, id))
      .filter(Boolean)
      .slice(0, 3);

    const details = {};
    systems.forEach((system) => {
      details[system.id] = {
        supportSummary: (req.session.data[`prioritySupport_${system.id}`] || "").toString().trim(),
        functionSummary: (req.session.data[`priorityFunction_${system.id}`] || "").toString().trim(),
        scopeRationale: (req.session.data[`priorityScope_${system.id}`] || "").toString().trim(),
      };
    });

    assessment.scope.priorityDetails = details;
    assessment.scope.priorityDetailsReview = {
      qaReviewed: buildDateParts(
        req.session.data.priorityDescribeQaDay,
        req.session.data.priorityDescribeQaMonth,
        req.session.data.priorityDescribeQaYear
      ),
      qaReviewedBy: (req.session.data.priorityDescribeQaName || "").toString().trim(),
      approverReviewed: buildDateParts(
        req.session.data.priorityDescribeApproverDay,
        req.session.data.priorityDescribeApproverMonth,
        req.session.data.priorityDescribeApproverYear
      ),
      approverReviewedBy: (req.session.data.priorityDescribeApproverName || "").toString().trim(),
    };
    assessment.scope.priorityDetailsComplete = true;
    assessment.updatedAt = new Date().toISOString();

    systems.forEach((system) => {
      delete req.session.data[`prioritySupport_${system.id}`];
      delete req.session.data[`priorityFunction_${system.id}`];
      delete req.session.data[`priorityScope_${system.id}`];
    });
    delete req.session.data.priorityDescribeQaDay;
    delete req.session.data.priorityDescribeQaMonth;
    delete req.session.data.priorityDescribeQaYear;
    delete req.session.data.priorityDescribeQaName;
    delete req.session.data.priorityDescribeApproverDay;
    delete req.session.data.priorityDescribeApproverMonth;
    delete req.session.data.priorityDescribeApproverYear;
    delete req.session.data.priorityDescribeApproverName;

    return res.redirect("/stages/2/scope/priority/confirm");
  });

  router.get("/stages/2/scope/priority/confirm", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    const summary = assessment.scope.criticalSystems
      .filter((system) => system && system.inScope)
      .map((system) => ({
        system,
        mapping: getMapping(assessment.scope, system.id),
      }));

    res.render("pages/stages/scope-priority-confirm", {
      pageTitle: isRoundTwoRequest(req) ? "Complete scope register" : "Complete scope pack",
      labels,
      assessment,
      shortlist: summary,
      error: null,
    });
  });

  router.post("/stages/2/scope/priority/confirm", (req, res) => {
    if (isRoundTwoRequest(req)) {
      return res.redirect("/assessments/current/journey");
    }
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);
    const summary = assessment.scope.criticalSystems
      .filter((system) => system && system.inScope)
      .map((system) => ({
        system,
        mapping: getMapping(assessment.scope, system.id),
      }));

    const errors = [];
    const mappedCount = assessment.scope.criticalSystems.filter((system) => {
      const mapping = getMapping(assessment.scope, system.id);
      return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
    }).length;
    const systemsCount = assessment.scope.criticalSystems.length;
    if (isRoundTwoRequest(req)) {
      if (systemsCount === 0) {
        errors.push({ field: "scopeSystemMinimum", text: "Add the critical systems that make up your CAF scope register before you continue" });
      }
      if (systemsCount > 0 && summary.length === 0) {
        errors.push({ field: "scopeSystemMinimum", text: "Mark at least 1 critical system as in scope before you continue" });
      }
    } else if (summary.length < 3) {
      errors.push({ field: "scopeSystemMinimum", text: "Add at least 3 critical systems marked in scope before you continue" });
    }
    if (systemsCount > 0 && mappedCount < systemsCount) {
      errors.push({ field: "scopeMappingsComplete", text: "Map every critical system to at least one essential service before continuing" });
    }
    if (!assessment.scope.context || !assessment.scope.context.completed) {
      errors.push({ field: "scopeContextComplete", text: "Complete organisational context before continuing" });
    }
    if (!assessment.scope.rolesConfirmed) {
      errors.push({ field: "scopeRolesComplete", text: "Confirm the CAF team and roles before continuing" });
    }
    if (!assessment.scope.servicesConfirmed) {
      errors.push({ field: "scopeServicesComplete", text: "Confirm essential services in scope before continuing" });
    }

    const leadConfirm = (req.session.data.scopeLeadConfirm || "").toString();
    if (!leadConfirm) {
      errors.push({ field: "scopeLeadConfirm", text: labels.stages.scope.errors.scopeLeadConfirm });
    }

    if (errors.length > 0) {
      return res.render("pages/stages/scope-priority-confirm", {
        pageTitle: isRoundTwoRequest(req) ? "Complete scope register" : "Complete scope pack",
        labels,
        assessment,
        shortlist: summary,
        error: { items: dedupeErrors(errors) },
      });
    }

    assessment.scope.leadConfirmed = leadConfirm === "yes";
    assessment.scope.assurerReviewed = false;
    assessment.stage.prepareScopeComplete = true;
    assessment.updatedAt = new Date().toISOString();
    delete req.session.data.scopeLeadConfirm;

    const returnTo = req.session.data.scopeReturnTo || "";
    delete req.session.data.scopeReturnTo;
    if (returnTo && req.session.data.stage1ReturnTo) {
      delete req.session.data.stage1ReturnTo;
    }

    const completeUrl = returnTo
      ? `/stages/2/scope/complete?continue=${encodeURIComponent(returnTo)}`
      : "/stages/2/scope/complete";
    return res.redirect(completeUrl);
  });

  router.get("/stages/2/scope/complete", (req, res) => {
    const assessment = getAssessmentOrRedirect(req, res);
    if (!assessment) return;

    ensureScope(assessment);

    if (!isScopeCompleteForJourney(assessment, req)) {
      return res.redirect("/stages/2/scope");
    }

    const continueTo = (req.query.continue || "").toString();
    const continueHref = continueTo || "/assessments/current/journey";
    const continueText = continueTo ? "Continue to selected self-assessment" : "Return to CAF journey";

    return res.render("pages/stages/scope-complete", {
      pageTitle: isRoundTwoRequest(req) ? "Scope register complete" : "Scope pack complete",
      labels,
      assessment,
      continueHref,
      continueText,
    });
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

function redirectToScopeReviewReturnOr(req, res, fallback) {
  const returnTo = req && req.session && req.session.data ? req.session.data.scopeReviewReturnTo : "";
  if (returnTo) {
    delete req.session.data.scopeReviewReturnTo;
    return res.redirect(returnTo);
  }
  return res.redirect(fallback);
}

function isScopeCompleteForJourney(assessment, req) {
  if (isRoundTwoRequest(req)) {
    return isRoundTwoScopeComplete(assessment);
  }
  return Boolean(assessment && assessment.stage && assessment.stage.prepareScopeComplete);
}

function isRoundTwoScopeComplete(assessment) {
  if (!assessment || !assessment.scope) return false;
  const scope = assessment.scope;
  const contextComplete = Boolean(scope.context && scope.context.completed);
  const servicesComplete = Boolean(scope.servicesConfirmed);
  const systems = Array.isArray(scope.criticalSystems) ? scope.criticalSystems : [];
  const inScopeSystemsCount = systems.filter((system) => Boolean(system && system.inScope)).length;
  const mappedCount = systems.filter((system) => {
    const mapping = getMapping(scope, system.id);
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;
  const priorityCount = systems.filter((system) => {
    const priority = getPriority(scope, system.id);
    return Boolean(priority && priority.level);
  }).length;

  return contextComplete &&
    servicesComplete &&
    systems.length > 0 &&
    inScopeSystemsCount > 0 &&
    mappedCount === systems.length &&
    priorityCount === systems.length;
}

function syncRoundTwoScopeCompletion(assessment, req) {
  if (!assessment || !assessment.stage || !isRoundTwoRequest(req)) return;
  assessment.stage.prepareScopeComplete = isRoundTwoScopeComplete(assessment);
}

function ensureScope(assessment) {
  if (!assessment.scope) assessment.scope = {};
  if (!Array.isArray(assessment.scope.essentialServices)) assessment.scope.essentialServices = [];
  if (!Array.isArray(assessment.scope.criticalSystems)) assessment.scope.criticalSystems = [];
  if (!Array.isArray(assessment.scope.mappings)) assessment.scope.mappings = [];
  if (!Array.isArray(assessment.scope.priority)) assessment.scope.priority = [];
  if (!Array.isArray(assessment.scope.priorityShortlist)) assessment.scope.priorityShortlist = [];
  assessment.scope.criticalSystems.forEach((system) => {
    if (typeof system.inScope !== "boolean") {
      system.inScope = true;
    }
  });
  if (typeof assessment.scope.servicesConfirmed !== "boolean") {
    assessment.scope.servicesConfirmed = false;
  }
  if (!assessment.scope.packStatus) assessment.scope.packStatus = "";
  if (!assessment.scope.blockerReason) assessment.scope.blockerReason = "";
  if (!assessment.scope.blockerNotes) assessment.scope.blockerNotes = "";
  if (!assessment.scope.rolesLead) assessment.scope.rolesLead = "";
  if (!assessment.scope.rolesSme) assessment.scope.rolesSme = "";
  if (!assessment.scope.rolesTech) assessment.scope.rolesTech = "";
  if (!assessment.scope.rolesApprover) assessment.scope.rolesApprover = "";
  if (typeof assessment.scope.rolesConfirmed !== "boolean") {
    assessment.scope.rolesConfirmed = false;
  }
  if (typeof assessment.scope.leadConfirmed !== "boolean") {
    assessment.scope.leadConfirmed = false;
  }
  if (typeof assessment.scope.assurerReviewed !== "boolean") {
    assessment.scope.assurerReviewed = false;
  }
  if (!assessment.scope.assuranceSchedule) {
    assessment.scope.assuranceSchedule = {
      workshopDate: "",
      shareByDate: "",
      optionalCheckIn: "",
      optionalCheckInRequested: false,
      updatedAt: "",
    };
  }
  if (!assessment.scope.context) {
    assessment.scope.context = {};
  }
  if (typeof assessment.scope.context.completed !== "boolean") {
    assessment.scope.context.completed = false;
  }
  if (!assessment.scope.essentialMethodology) {
    assessment.scope.essentialMethodology = {
      confirmed: false,
      notes: "",
      qaReviewed: {},
      qaReviewedBy: "",
      approverReviewed: {},
      approverReviewedBy: "",
      completed: false,
    };
  }
  if (!assessment.scope.criticalMethodology) {
    assessment.scope.criticalMethodology = {
      confirmed: false,
      notes: "",
      qaReviewed: {},
      qaReviewedBy: "",
      approverReviewed: {},
      approverReviewedBy: "",
      completed: false,
    };
  }
  if (typeof assessment.scope.essentialMethodology.completed !== "boolean") {
    assessment.scope.essentialMethodology.completed = false;
  }
  if (typeof assessment.scope.essentialMethodology.qaReviewedBy !== "string") {
    assessment.scope.essentialMethodology.qaReviewedBy = "";
  }
  if (typeof assessment.scope.essentialMethodology.approverReviewedBy !== "string") {
    assessment.scope.essentialMethodology.approverReviewedBy = "";
  }
  if (typeof assessment.scope.criticalMethodology.completed !== "boolean") {
    assessment.scope.criticalMethodology.completed = false;
  }
  if (typeof assessment.scope.criticalMethodology.qaReviewedBy !== "string") {
    assessment.scope.criticalMethodology.qaReviewedBy = "";
  }
  if (typeof assessment.scope.criticalMethodology.approverReviewedBy !== "string") {
    assessment.scope.criticalMethodology.approverReviewedBy = "";
  }
  if (!assessment.scope.priorityDetails) {
    assessment.scope.priorityDetails = {};
  }
  if (!assessment.scope.priorityDetailsReview) {
    assessment.scope.priorityDetailsReview = { qaReviewed: {}, qaReviewedBy: "", approverReviewed: {}, approverReviewedBy: "" };
  }
  if (typeof assessment.scope.priorityDetailsReview.qaReviewedBy !== "string") {
    assessment.scope.priorityDetailsReview.qaReviewedBy = "";
  }
  if (typeof assessment.scope.priorityDetailsReview.approverReviewedBy !== "string") {
    assessment.scope.priorityDetailsReview.approverReviewedBy = "";
  }
  if (typeof assessment.scope.priorityDetailsComplete !== "boolean") {
    assessment.scope.priorityDetailsComplete = false;
  }
  if (!assessment.scope.context.qaReviewed) assessment.scope.context.qaReviewed = {};
  if (!assessment.scope.context.approverReviewed) assessment.scope.context.approverReviewed = {};
  if (typeof assessment.scope.context.qaReviewedBy !== "string") assessment.scope.context.qaReviewedBy = "";
  if (typeof assessment.scope.context.approverReviewedBy !== "string") assessment.scope.context.approverReviewedBy = "";
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

function findService(scope, serviceId) {
  return scope.essentialServices.find((service) => service.id === serviceId) || null;
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
  delete req.session.data.systemInScope;
}

function buildDateParts(day, month, year) {
  const safeDay = (day || "").toString().trim();
  const safeMonth = (month || "").toString().trim();
  const safeYear = (year || "").toString().trim();
  if (!safeDay && !safeMonth && !safeYear) return {};
  return { day: safeDay, month: safeMonth, year: safeYear };
}

function parseDateParts(day, month, year) {
  const d = parseInt((day || "").toString().trim(), 10);
  const m = parseInt((month || "").toString().trim(), 10);
  const y = parseInt((year || "").toString().trim(), 10);
  if (!d || !m || !y || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

function parseDateISO(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function dedupeErrors(items) {
  const list = Array.isArray(items) ? items : [];
  const seen = new Set();
  const output = [];
  list.forEach((item) => {
    const key = `${item.field || ""}::${item.text || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(item);
  });
  return output;
}

function toIsoDateOnly(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function subtractWorkingDays(date, days) {
  const result = new Date(date.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() - 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

function formatDateShort(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTimestamp(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildScopeSummary(assessment, { roundTwo = false } = {}) {
  const scope = assessment.scope;
  const servicesCount = scope.essentialServices.length;
  const inScopeCount = scope.essentialServices.filter((s) => s.inScope).length;
  const systemsCount = scope.criticalSystems.length;
  const inScopeSystemsCount = scope.criticalSystems.filter((system) => system.inScope).length;
  const mappedCount = scope.criticalSystems.filter((system) => {
    const mapping = getMapping(scope, system.id);
    return mapping && Array.isArray(mapping.serviceIds) && mapping.serviceIds.length > 0;
  }).length;
  const priorityCount = scope.criticalSystems.filter((system) => {
    const priority = getPriority(scope, system.id);
    return Boolean(priority && priority.level);
  }).length;
  const shortlistCount = Array.isArray(scope.priorityShortlist) ? scope.priorityShortlist.length : 0;
  const isComplete = roundTwo
    ? isRoundTwoScopeComplete(assessment)
    : Boolean(assessment.stage && assessment.stage.prepareScopeComplete);
  const readiness = buildScopeReadiness(scope, {
    servicesCount,
    systemsCount,
    mappedCount,
    shortlistCount,
    isComplete,
  });
  const updatedAtDisplay = formatTimestamp(assessment.updatedAt);

  let nextStepUrl = "/stages/2/scope/context";
  let nextStepLabel = "Review and confirm organisational strategic context";
  if (isComplete) {
    nextStepUrl = "/stages/2/scope/complete";
    nextStepLabel = roundTwo ? "Review completed scope register" : "Review completed scope pack";
  } else if (!scope.context || !scope.context.completed) {
    nextStepUrl = "/stages/2/scope/context";
    nextStepLabel = roundTwo ? "Record organisational context and core CAF roles" : "Review and confirm organisational strategic context";
  } else if (!roundTwo && !scope.rolesConfirmed) {
    nextStepUrl = "/stages/2/scope/roles";
    nextStepLabel = roundTwo ? "Record organisational context and core CAF roles" : "Review and confirm organisational strategic context";
  } else if (servicesCount === 0) {
    nextStepUrl = scope.essentialMethodology && scope.essentialMethodology.completed
      ? "/stages/2/scope/services/add"
      : "/stages/2/scope/services/methodology";
    nextStepLabel = "Identify essential services";
  } else if (servicesCount > 0 && !scope.servicesConfirmed) {
    nextStepUrl = "/stages/2/scope/services/confirm";
    nextStepLabel = "Confirm essential services in scope";
  } else if (servicesCount > 0 && scope.servicesConfirmed && systemsCount === 0) {
    nextStepUrl = scope.criticalMethodology && scope.criticalMethodology.completed
      ? "/stages/2/scope/systems/add"
      : "/stages/2/scope/systems/methodology";
    nextStepLabel = roundTwo ? "Build your full critical systems register" : "Identify and prioritise 3 critical systems for assessment";
  } else if (systemsCount > 0 && mappedCount < systemsCount) {
    const nextMappingId = getNextMappingId(scope);
    nextStepUrl = nextMappingId
      ? `/stages/2/scope/mapping/${nextMappingId}`
      : "/stages/2/scope/mapping/review";
    nextStepLabel = roundTwo ? "Build your full critical systems register" : "Identify and prioritise 3 critical systems for assessment";
  } else if (!roundTwo && inScopeSystemsCount < 3) {
    nextStepUrl = "/stages/2/scope/systems/review";
    nextStepLabel = "Identify and prioritise 3 critical systems for assessment";
  } else if (roundTwo) {
    nextStepUrl = "/stages/2/scope";
    nextStepLabel = "Review the scope register";
  } else {
    nextStepUrl = "/stages/2/scope/priority/confirm";
    nextStepLabel = roundTwo ? "Confirm the scope register is ready to use" : "Share with assurers for feedback";
  }

  const nextMappingId = getNextMappingId(scope);
  const mappingNextUrl = nextMappingId
    ? `/stages/2/scope/mapping/${nextMappingId}`
    : "/stages/2/scope/mapping/review";
  const workshopDate = scope.assuranceSchedule ? parseDateISO(scope.assuranceSchedule.workshopDate) : null;
  const shareByDate = scope.assuranceSchedule ? parseDateISO(scope.assuranceSchedule.shareByDate) : null;

  return {
    servicesCount,
    inScopeCount,
    systemsCount,
    mappedCount,
    priorityCount,
    shortlistCount,
    inScopeSystemsCount,
    nextStepUrl,
    nextStepLabel,
    mappingNextUrl,
    workshopDateDisplay: formatDateShort(workshopDate),
    shareByDateDisplay: formatDateShort(shareByDate),
    isComplete,
    readiness,
    updatedAtDisplay,
  };
}

function isRoundTwoRequest(req) {
  return Boolean(
    req &&
      req.session &&
      req.session.data &&
      req.session.data.researchRound === "round-2"
  );
}

function syncContributorsFromScopeRoles(assessment, currentUser) {
  if (!assessment) return;
  if (!Array.isArray(assessment.selfAssessContributors)) {
    assessment.selfAssessContributors = [];
  }

  const contributors = assessment.selfAssessContributors;
  if (currentUser && currentUser.id) {
    const hasLead = contributors.some((person) => person.id === currentUser.id);
    if (!hasLead) {
      contributors.unshift({
        id: currentUser.id,
        name: currentUser.name || "Council lead",
        email: currentUser.email || "",
        role: "council",
      });
    }
  }

  const names = []
    .concat(extractNames(assessment.scope.rolesSme))
    .concat(extractNames(assessment.scope.rolesTech))
    .concat(extractNames(assessment.scope.rolesApprover));

  names.forEach((name) => {
    const exists = contributors.some(
      (person) => String(person.name || "").trim().toLowerCase() === name.toLowerCase()
    );
    if (exists) return;
    contributors.push({
      id: `scope-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      email: "",
      role: "council",
    });
  });
}

function extractNames(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  return Array.from(
    new Set(
      text
        .split(/\r?\n|,|;/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/\s+/g, " "))
    )
  );
}

function buildScopeReadiness(scope, stats) {
  if (stats.isComplete) {
    return {
      status: "complete",
      label: "Complete",
      tagClass: "govuk-tag--green",
      reason: "",
    };
  }

  if (scope.packStatus === "stalled" || scope.blockerReason) {
    return {
      status: "stalled",
      label: "Stalled",
      tagClass: "govuk-tag--red",
      reason: scope.blockerReason || scope.blockerNotes || "",
    };
  }

  if (stats.servicesCount === 0 && stats.systemsCount === 0 && stats.mappedCount === 0) {
    return {
      status: "not_started",
      label: "Not started",
      tagClass: "govuk-tag--grey",
      reason: "",
    };
  }

  return {
    status: "in_progress",
    label: "In progress",
    tagClass: "govuk-tag--blue",
    reason: "",
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
