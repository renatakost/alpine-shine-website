const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const open = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function initMultiStepForm(form) {
  const steps = [...form.querySelectorAll(".form-step")];
  const progress = form.querySelector(".step-progress");
  const backBtn = form.querySelector("[data-step-back]");
  const nextBtn = form.querySelector("[data-step-next]");
  const submitBtn = form.querySelector("[data-step-submit]");
  const success = form.parentElement.querySelector(".registration-success");
  let current = 0;

  function showStep(index) {
    current = index;
    steps.forEach((step, i) => {
      step.hidden = i !== index;
    });
    if (progress) {
      progress.textContent = `Step ${index + 1} of ${steps.length}`;
    }
    if (backBtn) {
      backBtn.hidden = index === 0;
    }
    if (nextBtn) {
      nextBtn.hidden = index === steps.length - 1;
    }
    if (submitBtn) {
      submitBtn.hidden = index !== steps.length - 1;
    }
  }

  function stepIsValid(step) {
    const fields = step.querySelectorAll("input, select, textarea");
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (current > 0) {
        showStep(current - 1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!stepIsValid(steps[current])) {
        return;
      }
      if (current < steps.length - 1) {
        showStep(current + 1);
      }
    });
  }

  showStep(0);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!stepIsValid(steps[current])) {
      return;
    }
    form.hidden = true;
    if (success) {
      success.hidden = false;
      success.focus();
    }
  });
}

document.querySelectorAll("[data-reviews-carousel]").forEach((root) => {
  const slides = [...root.querySelectorAll(".review-slide")];
  const prevBtn = root.querySelector(".reviews-arrow--prev");
  const nextBtn = root.querySelector(".reviews-arrow--next");
  const dotsWrap = root.querySelector(".reviews-dots");
  const viewport = root.querySelector(".reviews-viewport");
  if (!slides.length || !dotsWrap || !viewport) {
    return;
  }

  const intervalMs = 9000;
  let index = 0;
  let timer = null;
  let pointerInside = false;
  let keyboardFocus = false;
  let lastInputWasKeyboard = false;

  slides.forEach((slide, i) => {
    slide.id = `review-slide-${i + 1}`;
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "reviews-dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Show review ${i + 1} of ${slides.length}`);
    dot.setAttribute("aria-controls", slide.id);
    dot.addEventListener("click", () => goTo(i, true));
    dotsWrap.appendChild(dot);
  });

  const dots = [...dotsWrap.querySelectorAll(".reviews-dot")];

  function setViewportHeight() {
    viewport.style.height = "auto";
    viewport.style.minHeight = "0px";
    let tallest = 0;
    slides.forEach((slide) => {
      const card = slide.querySelector(".review-card");
      const wasActive = slide.classList.contains("is-active");
      slide.classList.add("is-active");
      slide.style.position = "relative";
      slide.style.opacity = "1";
      slide.style.transform = "none";
      slide.style.height = "auto";
      if (card) {
        card.style.height = "auto";
        card.style.minHeight = "0";
      }
      tallest = Math.max(tallest, slide.offsetHeight);
      if (!wasActive) {
        slide.classList.remove("is-active");
      }
      slide.style.position = "";
      slide.style.opacity = "";
      slide.style.transform = "";
      slide.style.height = "";
      if (card) {
        card.style.height = "";
        card.style.minHeight = "";
      }
    });
    if (tallest) {
      viewport.style.height = `${tallest}px`;
      viewport.style.minHeight = `${tallest}px`;
    }
  }

  function render() {
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", String(active));
      dot.tabIndex = active ? 0 : -1;
    });
    root.dataset.activeIndex = String(index);
  }

  function stopAutoplay() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function shouldPause() {
    return pointerInside || keyboardFocus;
  }

  function startAutoplay() {
    stopAutoplay();
    if (shouldPause()) {
      return;
    }
    timer = window.setInterval(() => {
      goTo(index + 1, false);
    }, intervalMs);
  }

  function goTo(next, userInitiated) {
    index = (next + slides.length) % slides.length;
    render();
    if (userInitiated) {
      startAutoplay();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
      lastInputWasKeyboard = true;
    }
  }, true);
  document.addEventListener("pointerdown", () => {
    lastInputWasKeyboard = false;
  }, true);

  prevBtn?.addEventListener("click", () => goTo(index - 1, true));
  nextBtn?.addEventListener("click", () => goTo(index + 1, true));

  root.addEventListener("pointerenter", () => {
    pointerInside = true;
    stopAutoplay();
  });
  root.addEventListener("pointerleave", () => {
    pointerInside = false;
    startAutoplay();
  });
  root.addEventListener("focusin", () => {
    if (lastInputWasKeyboard) {
      keyboardFocus = true;
      stopAutoplay();
    }
  });
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) {
      keyboardFocus = false;
      startAutoplay();
    }
  });

  let touchStartX = null;
  viewport.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  viewport.addEventListener("touchend", (event) => {
    if (touchStartX === null) {
      return;
    }
    const delta = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) < 40) {
      return;
    }
    goTo(index + (delta < 0 ? 1 : -1), true);
  }, { passive: true });

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1, true);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1, true);
    }
  });

  render();
  setViewportHeight();
  window.addEventListener("resize", setViewportHeight);
  startAutoplay();
});

document.querySelectorAll(".multi-step-form").forEach(initMultiStepForm);

function initConditionalFields(form) {
  const groups = [...form.querySelectorAll("[data-when-name]")];
  if (!groups.length) {
    return;
  }

  function sync() {
    groups.forEach((el) => {
      const control = form.elements.namedItem(el.dataset.whenName);
      const ancestor = el.parentElement && el.parentElement.closest("[data-when-name]");
      const match = Boolean(
        control &&
        control.value === el.dataset.whenValue &&
        !(ancestor && ancestor.hidden)
      );
      el.hidden = !match;
      el.querySelectorAll("input, select, textarea").forEach((field) => {
        field.disabled = !match;
        if (!match) {
          field.value = "";
        }
      });
    });
  }

  form.addEventListener("change", (event) => {
    if (event.target && event.target.name) {
      sync();
    }
  });

  sync();
}

document.querySelectorAll(".application-form, .client-registration-form").forEach(initConditionalFields);

document.querySelectorAll(".quote-form, .registration-form").forEach((form) => {
  if (form.classList.contains("multi-step-form")) {
    return;
  }

  const formStatus = form.querySelector(".form-status");
  if (!formStatus) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    formStatus.hidden = false;

    if (form.classList.contains("application-form")) {
      const cv = form.querySelector('input[name="cv"]');
      const file = cv && cv.files && cv.files[0];
      if (file) {
        const validType = /\.(pdf|doc|docx)$/i.test(file.name);
        const validSize = file.size <= 5 * 1024 * 1024;
        if (!validType || !validSize) {
          formStatus.textContent =
            "Please upload a PDF, DOC or DOCX file of 5MB or less.";
          return;
        }
      }
      formStatus.textContent =
        "This application form is not sending yet. We will connect it in a later step.";
      return;
    }

    if (form.classList.contains("client-registration-form")) {
      form.hidden = true;
      const success = form.parentElement.querySelector(".registration-success");
      if (success) {
        success.hidden = false;
        success.focus();
      }
      return;
    }

    formStatus.textContent =
      "This quote form is not sending yet. We will connect it in a later step.";
  });
});
