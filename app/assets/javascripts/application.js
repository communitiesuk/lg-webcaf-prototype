//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
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
})
