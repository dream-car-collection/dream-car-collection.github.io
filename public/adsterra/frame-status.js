// Wrapper-only error reporting; the provider's GET CODE remains unchanged.
window.addEventListener("error", function (event) {
  if (event.target instanceof HTMLScriptElement && event.target.src.includes("highrevenueformat.com")) {
    document.documentElement.dataset.adStatus = "error";
  }
}, true);
