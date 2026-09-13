// This file contains public endpoints only. Submitted values are never logged or stored in the browser.
function registrationEndpoint() {
  const emulator = window.ALPINE_REGISTRATION_EMULATOR_URL;
  if (window.location.origin === "http://127.0.0.1:5515" && emulator === "http://127.0.0.1:5001/demo-alpine-shine/australia-southeast1/submitRegistration") return emulator;
  return "https://australia-southeast1-alpine-shine-website.cloudfunctions.net/submitRegistration";
}

async function sendRegistrationRequest(form, status) {
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled || !form.reportValidity()) return;
  const payload = Object.fromEntries(new FormData(form));
  button.disabled = true;
  status.hidden = false;
  status.textContent = "Sending your registration…";
  const failure = "Your registration could not be confirmed. Your details are still here. Please try again or contact Alpine Shine.";
  try {
    const response = await fetch(registrationEndpoint(), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (response.status !== 200 || data?.ok !== true) {
      // Never display arbitrary backend response text, which could contain private data.
      status.textContent = ({
        400: "Please check the required fields, email, phone, and selected options. Your details are still here.",
        413: "Please shorten the registration details and try again. Your details are still here.",
        429: "Too many registration attempts. Please try again later. Your details are still here.",
      })[response.status] || failure;
      return;
    }
    form.reset();
    form.hidden = true;
    status.textContent = "Thank you! Your registration has been received.";
    const success = form.parentElement.querySelector(".registration-success");
    if (success) { success.hidden = false; success.focus(); }
  } catch (_) {
    status.textContent = failure;
  } finally {
    button.disabled = false;
  }
}
