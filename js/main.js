(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Preloader (home page only) ---------- */
  const preloader = $("#preloader");
  if (preloader) {
    document.body.classList.add("is-loading");
    const hidePreloader = () => {
      preloader.classList.add("is-done");
      document.body.classList.remove("is-loading");
    };
    window.addEventListener("load", () => setTimeout(hidePreloader, 600));
    setTimeout(hidePreloader, 3500); // safety net on slow networks
  }

  /* ---------- Header + back-to-top ---------- */
  const header = $("#header");
  const toTop = $("#toTop");
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    toTop.classList.toggle("is-visible", y > 700);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  const nav = $("#nav");
  const setMenu = (open) => {
    burger.classList.toggle("is-open", open);
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));

  /* ---------- Reveal on scroll (with sibling stagger) ---------- */
  const reveals = $$(".reveal");
  reveals.forEach((el) => {
    const siblings = $$(":scope > .reveal", el.parentElement);
    const i = siblings.indexOf(el);
    if (i > 0) el.style.setProperty("--d", `${Math.min(i * 0.08, 0.4)}s`);
  });

  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Animated counters ---------- */
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const counterIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  $$("[data-count]").forEach((el) => counterIO.observe(el));

  /* ---------- Subtle parallax on images ---------- */
  const parallaxEls = $$("[data-parallax]");
  if (!reduceMotion && parallaxEls.length) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((img) => {
        const rect = img.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        const speed = parseFloat(img.dataset.parallax);
        const offset = (rect.top + rect.height / 2 - vh / 2) * speed;
        img.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0) scale(1.04)`;
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- Hero image slider ---------- */
  const slider = $("#heroSlider");
  if (slider) {
    const slides = $$(".slide", slider);
    const dotsWrap = $(".slider-dots", slider);
    const card = $(".hero__card", slider);
    const num = $("#slideNum");
    const label = $("#slideLabel");
    const title = $("#slideTitle");
    const DELAY = 5000;
    slider.style.setProperty("--slide-ms", `${DELAY}ms`);

    const dots = slides.map((s, i) => {
      const dot = document.createElement("button");
      dot.className = "slider-dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Show ${s.dataset.title.replace("&amp;", "&")}`);
      dot.addEventListener("click", () => go(i, true));
      dotsWrap.appendChild(dot);
      return dot;
    });

    let current = 0;
    let timer = null;
    let paused = false;

    const go = (index, user = false) => {
      const next = (index + slides.length) % slides.length;
      if (next === current && !user) return;
      const prev = slides[current];
      if (next !== current) {
        prev.classList.remove("is-active");
        prev.classList.add("is-leaving");
        setTimeout(() => prev.classList.remove("is-leaving"), 1100);
      }
      current = next;
      const s = slides[current];
      s.classList.add("is-active");

      dots.forEach((d, i) => {
        d.classList.toggle("is-active", i === current);
        d.classList.toggle("is-done", i < current);
        d.setAttribute("aria-selected", String(i === current));
      });
      // restart the progress-bar animation on the active dot
      const active = dots[current];
      active.classList.remove("is-active");
      void active.offsetWidth;
      active.classList.add("is-active");

      card.classList.add("is-swapping");
      setTimeout(() => {
        num.textContent = String(current + 1).padStart(2, "0");
        label.textContent = s.dataset.label;
        title.innerHTML = s.dataset.title;
        title.href = s.dataset.href;
        card.classList.remove("is-swapping");
      }, 300);

      schedule();
    };

    const schedule = () => {
      clearTimeout(timer);
      if (!paused && !reduceMotion) timer = setTimeout(() => go(current + 1), DELAY);
    };
    const setPaused = (p) => {
      paused = p;
      slider.classList.toggle("is-paused", p);
      if (p) clearTimeout(timer); else schedule();
    };

    $$(".slider-btn", slider).forEach((b) => b.addEventListener("click", () => go(current + Number(b.dataset.dir), true)));
    slider.addEventListener("mouseenter", () => setPaused(true));
    slider.addEventListener("mouseleave", () => setPaused(false));
    slider.addEventListener("focusin", () => setPaused(true));
    slider.addEventListener("focusout", () => setPaused(false));
    document.addEventListener("visibilitychange", () => setPaused(document.hidden));
    slider.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(current + 1, true);
      if (e.key === "ArrowLeft") go(current - 1, true);
    });

    // swipe on touch screens
    let startX = null;
    const arch = $(".hero__arch", slider);
    arch.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    arch.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1), true);
      startX = null;
    });

    go(0, true);
  }

  /* ---------- Hero tilt on pointer move ---------- */
  const visual = $(".hero__visual");
  if (visual && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    const hero = $(".hero");
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      visual.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    hero.addEventListener("pointerleave", () => { visual.style.transform = ""; });
    visual.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 1s, translate 1s";
  }

  /* ---------- Contact form (opens the visitor's mail app) ---------- */
  const form = $("#contactForm");
  const status = $("#formStatus");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    $$("input, select, textarea", form).forEach((field) => {
      const ok = field.checkValidity();
      field.closest(".field").classList.toggle("is-invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      status.textContent = "Please fill in all fields with a valid email.";
      return;
    }
    const data = new FormData(form);
    const subject = `Enquiry: ${data.get("division")} — ${data.get("name")}`;
    const body = `Name: ${data.get("name")}\nEmail: ${data.get("email")}\nInterested in: ${data.get("division")}\n\n${data.get("message")}`;
    window.location.href = `mailto:sreechandinisfarm@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = "Thank you! Your mail app will open to send the message.";
    form.reset();
  });
  if (form) $$("input, select, textarea", form).forEach((f) =>
    f.addEventListener("input", () => f.closest(".field").classList.remove("is-invalid"))
  );

  /* ---------- Footer year ---------- */
  $("#year").textContent = new Date().getFullYear();
})();
