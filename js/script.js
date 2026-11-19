(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header: compact once scrolled, tucks away scrolling down, returns scrolling up */
  const header = document.querySelector(".header");
  const toggle = document.querySelector(".header__toggle");
  const nav = document.getElementById("site-nav");
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 10);
    if (!document.body.classList.contains("menu-open")) {
      const goingDown = y > lastY;
      header.classList.toggle("is-hidden", goingDown && y > 320);
    }
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  // show the header again whenever something inside it gets keyboard focus
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));

  /* Mobile menu */
  const setMenu = (open) => {
    document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    if (open) header.classList.remove("is-hidden");
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });

  /* Hero slideshow */
  const hero = document.querySelector("[data-hero]");
  if (hero) {
    const slides = [...hero.querySelectorAll(".hero__slide")];
    const thumbs = [...hero.querySelectorAll(".hero__thumb")];
    const nameEl = hero.querySelector("[data-name]");
    const DELAY = 6000;
    let index = 0;
    let timer = null;
    let paused = false;

    const go = (next) => {
      index = (next + slides.length) % slides.length;
      slides.forEach((img, i) => {
        const on = i === index;
        img.classList.toggle("is-active", on);
        img.setAttribute("aria-hidden", String(!on));
      });
      thumbs.forEach((t, i) => {
        const on = i === index;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-pressed", String(on));
      });
      nameEl.textContent = slides[index].dataset.name;
      // load the current photo and the next one ahead of time, so the crossfade never shows a gap
      load(slides[index]);
      load(slides[(index + 1) % slides.length]);
    };

    function load(img) {
      if (img.dataset.srcset) {
        img.srcset = img.dataset.srcset;
        delete img.dataset.srcset;
      }
      if (img.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
    }

    const start = () => {
      clearInterval(timer);
      if (reduceMotion || paused || document.hidden) return;
      timer = setInterval(() => go(index + 1), DELAY);
    };

    hero.querySelector("[data-prev]").addEventListener("click", () => { go(index - 1); start(); });
    hero.querySelector("[data-next]").addEventListener("click", () => { go(index + 1); start(); });
    thumbs.forEach((t) => t.addEventListener("click", () => { go(Number(t.dataset.slide)); start(); }));

    const stage = hero.querySelector(".hero__stage");
    stage.addEventListener("mouseenter", () => { paused = true; start(); });
    stage.addEventListener("mouseleave", () => { paused = false; start(); });
    hero.addEventListener("focusin", () => { paused = true; start(); });
    hero.addEventListener("focusout", () => { paused = false; start(); });
    hero.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    });
    document.addEventListener("visibilitychange", start);

    let touchX = null;
    stage.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); start(); }
      touchX = null;
    });

    go(0);
    start();
  }

  /* "What we do" carousel */
  const sectors = document.querySelector("[data-sectors]");
  if (sectors) {
    const track = sectors.querySelector(".sectors__track");
    const prev = sectors.querySelector("[data-sectors-prev]");
    const next = sectors.querySelector("[data-sectors-next]");
    const step = () => {
      const card = track.querySelector(".sector");
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    };
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }));
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* Team bios in native dialogs */
  document.querySelectorAll("[data-bio]").forEach((btn) => {
    const dialog = document.getElementById(btn.dataset.bio);
    if (!dialog || typeof dialog.showModal !== "function") return;
    btn.addEventListener("click", () => {
      dialog.showModal();
      document.body.classList.add("dialog-open");
    });
    dialog.addEventListener("close", () => {
      document.body.classList.remove("dialog-open");
      btn.focus();
    });
    dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
    // click on the dimmed backdrop closes it
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  /* Our work filter (?sector=multifamily etc. preselects) */
  const work = document.querySelector("[data-work]");
  if (work) {
    const buttons = [...work.querySelectorAll("[data-filter]")];
    const projects = [...work.querySelectorAll(".project")];
    const status = work.querySelector("[data-work-status]");
    const apply = (key, push) => {
      const btn = buttons.find((b) => b.dataset.filter === key) || buttons[0];
      key = btn.dataset.filter;
      buttons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      let shown = 0;
      projects.forEach((p) => {
        const match = key === "all" || p.dataset.tags.split(" ").includes(key);
        p.hidden = !match;
        p.classList.remove("is-entering");
        if (match && push !== undefined) p.classList.add("is-in");
        if (match) {
          if (!reduceMotion && push !== undefined) {
            void p.offsetWidth;
            p.style.animationDelay = `${Math.min(shown, 8) * 40}ms`;
            p.classList.add("is-entering");
          }
          shown++;
        }
      });
      const label = btn.firstChild.textContent.trim();
      status.textContent = key === "all" ? `Showing all ${shown} projects` : `Showing ${shown} ${label} projects`;
      if (push) {
        const url = new URL(location.href);
        if (key === "all") url.searchParams.delete("sector");
        else url.searchParams.set("sector", key);
        history.replaceState(null, "", url);
      }
    };
    buttons.forEach((b) => b.addEventListener("click", () => apply(b.dataset.filter, true)));
    apply(new URLSearchParams(location.search).get("sector") || "all");
  }

  /* Scroll reveals: things fade up as they enter the viewport, in a short cascade */
  const revealSel = [
    ".people__image", ".people__text", ".what h2", ".what__intro",
    ".banner", ".person", ".action__intro", ".moment", ".project",
    ".culture-strip img", ".split__image", ".split__text", ".callout__inner",
    ".post-card", ".article__hero", ".article__pair figure",
    ".contact__item", ".contact__image", ".map", ".talk__inner",
  ].join(",");
  const revealEls = [...document.querySelectorAll(revealSel)];
  const track = document.querySelector(".sectors__track");
  const showAll = () => {
    revealEls.forEach((el) => el.classList.add("is-in"));
    if (track) [...track.children].forEach((el) => el.classList.add("is-in"));
  };
  if (reduceMotion || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    const io = new IntersectionObserver((entries) => {
      let i = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        if (el === track) {
          // the carousel reveals its cards together, left to right
          [...track.children].forEach((card, n) => {
            card.style.setProperty("--reveal-delay", `${Math.min(n, 4) * 90}ms`);
            card.classList.add("is-in");
          });
          return;
        }
        el.style.setProperty("--reveal-delay", `${Math.min(i++, 6) * 80}ms`);
        el.classList.add("is-in");
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
    if (track) io.observe(track);
    // never leave anything invisible if the page is printed
    window.addEventListener("beforeprint", showAll);
  }

  /* Footer year */
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
