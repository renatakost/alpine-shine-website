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
  const track = root.querySelector(".reviews-track");
  const modal = document.querySelector("[data-review-modal]");
  if (!slides.length || !dotsWrap || !viewport || !track) {
    return;
  }

  const desktopQuery = window.matchMedia("(min-width: 801px)");
  const pageSize = () => (desktopQuery.matches ? 3 : 1);
  let index = 0;
  let lastFocus = null;

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

  function maxIndex() {
    return Math.max(0, slides.length - pageSize());
  }

  function gapSize() {
    return parseFloat(getComputedStyle(track).gap) || 0;
  }

  function applyDesktopTransform() {
    const slideWidth = slides[0].getBoundingClientRect().width;
    const offset = index * (slideWidth + gapSize());
    track.style.transform = `translateX(-${offset}px)`;
  }

  function syncDots() {
    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", String(active));
      dot.tabIndex = active ? 0 : -1;
    });
    if (prevBtn) {
      prevBtn.disabled = desktopQuery.matches && index <= 0;
    }
    if (nextBtn) {
      nextBtn.disabled = desktopQuery.matches && index >= maxIndex();
    }
  }

  function goTo(next, userInitiated) {
    index = Math.max(0, Math.min(maxIndex(), next));
    if (desktopQuery.matches) {
      applyDesktopTransform();
    } else if (userInitiated) {
      slides[index].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
    syncDots();
  }

  function syncFromScroll() {
    if (desktopQuery.matches) {
      return;
    }
    const left = viewport.scrollLeft;
    let nearest = 0;
    let nearestDist = Infinity;
    slides.forEach((slide, i) => {
      const dist = Math.abs(slide.offsetLeft - left);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    if (nearest !== index) {
      index = nearest;
      syncDots();
    }
  }

  prevBtn?.addEventListener("click", () => goTo(index - pageSize(), true));
  nextBtn?.addEventListener("click", () => goTo(index + pageSize(), true));
  viewport.addEventListener("scroll", syncFromScroll, { passive: true });

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - pageSize(), true);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + pageSize(), true);
    }
  });

  function onModeChange() {
    index = Math.min(index, maxIndex());
    if (desktopQuery.matches) {
      viewport.scrollLeft = 0;
      applyDesktopTransform();
    } else {
      track.style.transform = "none";
      slides[index].scrollIntoView({ behavior: "auto", inline: "start", block: "nearest" });
    }
    syncDots();
  }

  desktopQuery.addEventListener("change", onModeChange);
  window.addEventListener("resize", () => {
    if (desktopQuery.matches) {
      applyDesktopTransform();
    }
  });

  function closeModal() {
    if (!modal || !modal.classList.contains("is-open")) {
      return;
    }
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("review-modal-open");
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  }

  function openModal(card) {
    if (!modal) {
      return;
    }
    const name = modal.querySelector("#review-modal-name");
    const quote = modal.querySelector(".review-modal-quote");
    const source = card.querySelector("blockquote");
    lastFocus = document.activeElement;
    if (name) {
      name.textContent = card.querySelector(".review-name")?.textContent || "";
    }
    if (quote && source) {
      quote.innerHTML = source.innerHTML;
    }
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("review-modal-open");
    modal.classList.add("is-open");
    modal.querySelector(".review-modal-dialog")?.focus();
  }

  document.addEventListener("click", (event) => {
    const closer = event.target.closest("[data-review-modal-close]");
    if (closer && modal.contains(closer)) {
      closeModal();
      return;
    }
    const btn = event.target.closest(".review-more");
    if (!btn || !root.contains(btn)) {
      return;
    }
    const card = btn.closest(".review-card");
    if (card) {
      openModal(card);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  onModeChange();
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
      const allowed = (el.dataset.whenValue || "").trim().split(/\s+/);
      const match = Boolean(
        control &&
        allowed.includes(control.value) &&
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
