//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

// accessible-autocomplete is loaded as a UMD global (window.accessibleAutocomplete)
// via a <script> tag on the S18 page — the prototype kit serves application.js without
// bundling, so a bare `import` cannot be used here.

window.GOVUKPrototypeKit.documentReady(() => {
  // Setup — S18 "Search for a council": enhance the fallback <select> into a GDS
  // accessible autocomplete. Selecting a council appends it (checked) to the
  // "Councils you have added" list, which is what gets saved.
  const accessibleAutocomplete = window.accessibleAutocomplete
  const councilSelect = document.querySelector("[data-council-autocomplete]")
  if (councilSelect && accessibleAutocomplete && accessibleAutocomplete.enhanceSelectElement) {
    const addedList = document.querySelector("#added-councils")
    // The stored value is the plain council name; the label may show "name (type)".
    const appendCouncil = (value, labelText) => {
      if (!value || !addedList) return
      const exists = Array.from(addedList.querySelectorAll('input[name="whichCouncils"]')).some(
        (input) => input.value === value
      )
      if (exists) return
      const idx = addedList.querySelectorAll(".govuk-checkboxes__item").length + 1
      const safeId = "whichCouncils-added-" + idx
      const item = document.createElement("div")
      item.className = "govuk-checkboxes__item"
      const input = document.createElement("input")
      input.className = "govuk-checkboxes__input"
      input.id = safeId
      input.name = "whichCouncils"
      input.type = "checkbox"
      input.value = value
      input.checked = true
      const label = document.createElement("label")
      label.className = "govuk-label govuk-checkboxes__label"
      label.setAttribute("for", safeId)
      label.textContent = labelText || value
      item.appendChild(input)
      item.appendChild(label)
      addedList.appendChild(item)
    }
    accessibleAutocomplete.enhanceSelectElement({
      selectElement: councilSelect,
      defaultValue: "",
      // onConfirm receives the confirmed string; map it back to the option so we store the plain
      // council name (value) but keep the "name (type)" display label.
      onConfirm: (confirmed) => {
        if (!confirmed) return
        const opt = Array.from(councilSelect.options).find(
          (o) => o.textContent === confirmed || o.value === confirmed
        )
        appendCouncil(opt ? opt.value : confirmed, opt ? opt.textContent : confirmed)
      },
    })
  }

  // Decide — D25 "Which critical system is CNI?": enhance the <select> into a GDS
  // accessible autocomplete. The confirmed option updates the underlying <select>,
  // so its value (cniSystemId) is what gets submitted.
  const systemSelect = document.querySelector("[data-system-autocomplete]")
  if (systemSelect && accessibleAutocomplete && accessibleAutocomplete.enhanceSelectElement) {
    accessibleAutocomplete.enhanceSelectElement({
      selectElement: systemSelect,
      defaultValue: "",
    })
  }

  // Decide — D21 "Plan summary": the "Print this page" button triggers the browser print dialog.
  document.querySelectorAll("[data-print-page]").forEach((button) => {
    button.addEventListener("click", () => window.print())
  })

  // Claim — S02 "Council name": enhance the <select> into a GDS accessible autocomplete.
  // The confirmed option submits councilId; the typed text is copied into a hidden field on
  // submit so an un-chosen entry can be shown back with the error (frame 12).
  const claimCouncilSelect = document.querySelector("[data-claim-council-autocomplete]")
  if (claimCouncilSelect && accessibleAutocomplete && accessibleAutocomplete.enhanceSelectElement) {
    const claimOrigId = claimCouncilSelect.id
    const claimForm = claimCouncilSelect.closest("form")
    const claimDefaultValue = claimCouncilSelect.getAttribute("data-default-value") || ""
    accessibleAutocomplete.enhanceSelectElement({ selectElement: claimCouncilSelect, defaultValue: claimDefaultValue })
    if (claimForm) {
      claimForm.addEventListener("submit", () => {
        const input = document.getElementById(claimOrigId)
        const hidden = claimForm.querySelector("[name='councilSearchText']")
        if (input && hidden) hidden.value = input.value
      })
    }
  }

  // Claim — S09 "Organisation name": accessible autocomplete over the shared organisation
  // list, which also accepts a new name typed in (captured via the hidden orgSearchText field).
  const claimOrgSelect = document.querySelector("[data-claim-org-autocomplete]")
  if (claimOrgSelect && accessibleAutocomplete && accessibleAutocomplete.enhanceSelectElement) {
    const claimOrgOrigId = claimOrgSelect.id
    const claimOrgForm = claimOrgSelect.closest("form")
    const claimOrgDefault = claimOrgSelect.getAttribute("data-default-value") || ""
    accessibleAutocomplete.enhanceSelectElement({ selectElement: claimOrgSelect, defaultValue: claimOrgDefault })
    if (claimOrgForm) {
      claimOrgForm.addEventListener("submit", () => {
        const input = document.getElementById(claimOrgOrigId)
        const hidden = claimOrgForm.querySelector("[name='orgSearchText']")
        if (input && hidden) hidden.value = input.value
      })
    }
  }

  // Setup — S28 impact ratings: update the derived "Overall criticality" live as the
  // user picks Confidentiality / Integrity / Availability (mirrors deriveCriticality on
  // the server). Progressive enhancement — the server renders the saved value too.
  const impactForm = document.querySelector("[data-impact-form]")
  const criticalityOutput = document.querySelector("[data-criticality-output]")
  if (impactForm && criticalityOutput) {
    const scores = { low: 1, medium: 2, high: 3 }
    const recompute = () => {
      const groups = ["impactConfidentiality", "impactIntegrity", "impactAvailability"]
      let total = 0
      let allSet = true
      groups.forEach((name) => {
        const checked = impactForm.querySelector(`input[name="${name}"]:checked`)
        if (checked && scores[checked.value]) total += scores[checked.value]
        else allSet = false
      })
      if (!allSet) {
        criticalityOutput.textContent = "not yet worked out"
        return
      }
      if (total >= 8) criticalityOutput.textContent = "Mission critical"
      else if (total >= 6) criticalityOutput.textContent = "Business critical"
      else if (total >= 4) criticalityOutput.textContent = "Business supporting"
      else criticalityOutput.textContent = "Non-critical"
    }
    impactForm.querySelectorAll("[data-impact-input]").forEach((input) => {
      input.addEventListener("change", recompute)
    })
  }

  const buildCouncilStorageKey = (email) => `lf-webcaf-council-context:${(email || "").trim().toLowerCase()}`

  const setupForm = document.querySelector("[data-council-setup-form]")
  if (setupForm && window.localStorage) {
    setupForm.addEventListener("submit", () => {
      const email = setupForm.getAttribute("data-council-email") || ""
      const input = setupForm.querySelector("[name='councilSetupName']")
      const councilName = (input?.value || "").trim().replace(/\s+/g, " ")
      if (email && councilName) {
        window.localStorage.setItem(buildCouncilStorageKey(email), councilName)
      }
    })
  }

  const restoreForm = document.querySelector("[data-council-restore-form]")
  if (restoreForm && window.localStorage) {
    const email = restoreForm.getAttribute("data-council-email") || ""
    const setupPath = restoreForm.getAttribute("data-council-setup-path") || "/council-setup"
    const input = restoreForm.querySelector("[name='councilContextName']")
    const councilName = window.localStorage.getItem(buildCouncilStorageKey(email)) || ""

    if (email && councilName && input) {
      input.value = councilName
      restoreForm.submit()
      return
    }

    window.location.assign(setupPath)
  }

  // AA03 "Copy council name" — progressive enhancement. Without JS the link does nothing and the
  // council name is shown in the inset above to copy manually.
  const copyLink = document.querySelector("[data-copy-council-name]")
  if (copyLink && navigator.clipboard) {
    copyLink.addEventListener("click", function (e) {
      e.preventDefault()
      const name = copyLink.getAttribute("data-council-name") || ""
      navigator.clipboard.writeText(name).then(function () {
        const original = copyLink.textContent
        copyLink.textContent = "Council name copied"
        setTimeout(function () { copyLink.textContent = original }, 3000)
      })
    })
  }
})
