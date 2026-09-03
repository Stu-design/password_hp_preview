(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector("[data-menu-button]");
  const menu = document.querySelector("[data-menu]");
  const menuBackdrop = document.querySelector("[data-menu-backdrop]");
  const video = document.querySelector("[data-hero-video]");
  const heroEndPoster = document.querySelector("[data-hero-end-poster]");
  const videoToggle = document.querySelector("[data-video-toggle]");
  const videoIcon = document.querySelector("[data-video-icon]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const entrance = document.querySelector("[data-entrance]");
  const entranceConsole = document.querySelector("[data-entrance-console]");
  const entranceLabel = document.querySelector("[data-entrance-label]");
  const entranceText = document.querySelector("[data-entrance-text]");
  const entranceStatus = document.querySelector("[data-entrance-status]");
  const entranceSkip = document.querySelector("[data-entrance-skip]");
  let entranceStartedAt = 0;
  let entranceTyping;
  let entranceTimers = [];

  const track = (eventName, params = {}) => {
    if (typeof window.gtag === "function") window.gtag("event", eventName, params);
  };

  document.querySelectorAll("[data-track]").forEach((link) => {
    link.addEventListener("click", () => track(link.dataset.track, { position: link.dataset.position }));
  });

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 40);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const focusableMenuItems = () => [menuButton, ...(menu?.querySelectorAll("a") || [])].filter(Boolean);
  const syncMenuInert = () => {
    if (!menu) return;
    menu.inert = window.innerWidth <= 860 && !menu.classList.contains("is-open");
  };
  const closeMenu = (restoreFocus = false) => {
    if (!menu || !menuButton || !menuBackdrop) return;
    menu.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.querySelector(".sr-only").textContent = "メニューを開く";
    menuBackdrop.hidden = true;
    document.body.classList.remove("menu-open");
    syncMenuInert();
    if (restoreFocus) menuButton.focus();
  };

  const openMenu = () => {
    if (!menu || !menuButton || !menuBackdrop) return;
    menu.classList.add("is-open");
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.querySelector(".sr-only").textContent = "メニューを閉じる";
    menuBackdrop.hidden = false;
    document.body.classList.add("menu-open");
    syncMenuInert();
    menu.querySelector("a")?.focus();
  };

  menuButton?.addEventListener("click", () => {
    if (menuButton.getAttribute("aria-expanded") === "true") closeMenu(true);
    else openMenu();
  });
  menuBackdrop?.addEventListener("click", () => closeMenu(true));
  syncMenuInert();
  window.addEventListener("resize", syncMenuInert);
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (!menu?.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusableMenuItems();
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  let playCount = 0;
  const setVideoState = (playing) => {
    if (!videoToggle || !videoIcon) return;
    videoToggle.setAttribute("aria-label", playing ? "動画を一時停止" : "動画を再生");
    videoIcon.textContent = playing ? "Ⅱ" : "▶";
  };
  const showPoster = (showEndPhoto = false) => {
    video?.classList.remove("is-ready");
    heroEndPoster?.classList.toggle("is-visible", showEndPhoto);
    setVideoState(false);
  };
  const playVideo = async () => {
    if (!video) return;
    try {
      heroEndPoster?.classList.remove("is-visible");
      video.classList.add("is-ready");
      await video.play();
      setVideoState(true);
    } catch {
      showPoster();
    }
  };

  video?.addEventListener("ended", () => {
    playCount += 1;
    video.currentTime = 0;
    if (playCount < 3) playVideo();
    else showPoster(true);
  });
  videoToggle?.addEventListener("click", () => {
    if (!video) return;
    if (video.paused || !video.classList.contains("is-ready")) {
      if (playCount >= 3) playCount = 0;
      playVideo();
    } else {
      video.pause();
      setVideoState(false);
    }
  });

  const focusAfterEntrance = (heading) => {
    heading.tabIndex = -1;
    heading.dataset.entranceFocus = "";
    heading.addEventListener("blur", () => heading.removeAttribute("data-entrance-focus"), { once: true });
    heading.focus({ preventScroll: true });
  };

  const targetAfterEntrance = () => {
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        target.scrollIntoView();
        const heading = target.querySelector("h2, h1");
        if (heading) focusAfterEntrance(heading);
        return;
      }
    }
    window.scrollTo(0, 0);
    const heroTitle = document.querySelector("#hero-title");
    if (heroTitle) focusAfterEntrance(heroTitle);
  };

  const finishEntrance = (skipped = false) => {
    if (!entrance || entrance.hidden || entrance.classList.contains("is-leaving")) return;
    window.clearInterval(entranceTyping);
    entranceTimers.forEach((timer) => window.clearTimeout(timer));
    entranceTimers = [];
    const elapsed = Math.round(performance.now() - entranceStartedAt);
    entrance.classList.add("is-leaving");
    track(skipped ? "entrance_skip" : "entrance_complete", { elapsed_ms: elapsed });
    window.setTimeout(() => {
      entrance.hidden = true;
      entrance.classList.remove("is-leaving", "is-granted");
      entranceConsole?.classList.remove("is-verifying", "is-granted");
      targetAfterEntrance();
      if (!reduceMotion.matches) playVideo();
    }, 400);
  };

  const runEntrance = () => {
    if (!entrance || reduceMotion.matches) {
      entrance && (entrance.hidden = true);
      return false;
    }
    entrance.hidden = false;
    entranceStartedAt = performance.now();
    entrance.classList.remove("is-leaving", "is-granted");
    entranceConsole?.classList.remove("is-verifying", "is-granted");
    if (entranceLabel) entranceLabel.textContent = "INPUT";
    if (entranceText) entranceText.textContent = "";
    if (entranceStatus) entranceStatus.textContent = "INPUT REQUIRED";
    entranceSkip?.focus({ preventScroll: true });
    const word = "PASSWORD";
    let index = 0;
    entranceTyping = window.setInterval(() => {
      if (!entranceText || entrance.hidden) return window.clearInterval(entranceTyping);
      entranceText.textContent = word.slice(0, ++index).replaceAll(/./g, "•");
      if (index === word.length) window.clearInterval(entranceTyping);
    }, 75);
    entranceTimers.push(window.setTimeout(() => {
      if (entranceLabel) entranceLabel.textContent = "VERIFYING";
      if (entranceStatus) entranceStatus.textContent = "VERIFYING ACCESS";
      entranceConsole?.classList.add("is-verifying");
    }, 720));
    entranceTimers.push(window.setTimeout(() => {
      if (entranceLabel) entranceLabel.textContent = "STATUS";
      if (entranceStatus) entranceStatus.textContent = "ACCESS GRANTED";
      entranceConsole?.classList.add("is-granted");
      entrance?.classList.add("is-granted");
    }, 1260));
    entranceTimers.push(window.setTimeout(() => finishEntrance(false), 1900));
    return true;
  };
  entranceSkip?.addEventListener("click", () => finishEntrance(true));

  const entranceRunning = runEntrance();
  if (!entranceRunning && !reduceMotion.matches) playVideo();
  else setVideoState(false);

  document.querySelectorAll("[data-qa-button]").forEach((button, index) => {
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    if (!answer) return;
    button.setAttribute("aria-expanded", "false");
    answer.hidden = true;
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      answer.hidden = !open;
      if (open) track("qa_open", { question_id: `q${index + 1}` });
    });
  });

  const passwordScratch = document.querySelector("[data-password-scratch]");
  const scratchCanvas = document.querySelector("[data-password-scratch-canvas]");
  const passwordValue = document.querySelector("[data-password-value]");
  const scratchHint = document.querySelector("[data-password-scratch-hint]");
  const scratchHelp = document.querySelector("[data-password-scratch-help]");
  if (passwordScratch && scratchCanvas) {
    const scratchContext = scratchCanvas.getContext("2d", { willReadFrequently: true });
    if (!scratchContext) {
      scratchCanvas.hidden = true;
      scratchHint && (scratchHint.hidden = true);
      passwordScratch.removeAttribute("role");
      passwordScratch.removeAttribute("tabindex");
    } else {
      let scratchRevealed = false;
      let scratching = false;
      let lastScratchPoint = null;
      let scratchMoves = 0;

      passwordValue?.setAttribute("aria-hidden", "true");

      const paintScratchCover = () => {
        if (scratchRevealed) return;
        const bounds = passwordScratch.getBoundingClientRect();
        const density = Math.min(window.devicePixelRatio || 1, 2);
        scratchCanvas.width = Math.max(1, Math.round(bounds.width * density));
        scratchCanvas.height = Math.max(1, Math.round(bounds.height * density));
        scratchContext.setTransform(density, 0, 0, density, 0, 0);
        scratchContext.globalCompositeOperation = "source-over";
        const cover = scratchContext.createLinearGradient(0, 0, bounds.width, bounds.height);
        cover.addColorStop(0, "#174b58");
        cover.addColorStop(.48, "#32707d");
        cover.addColorStop(1, "#0e3a45");
        scratchContext.fillStyle = cover;
        scratchContext.fillRect(0, 0, bounds.width, bounds.height);
        scratchContext.fillStyle = "rgba(255,255,255,.08)";
        scratchContext.save();
        scratchContext.translate(-bounds.height * .3, 0);
        scratchContext.rotate(-Math.PI / 9);
        for (let x = 0; x < bounds.width + bounds.height; x += 18) {
          scratchContext.fillRect(x, 0, 1, bounds.height * 2);
        }
        scratchContext.restore();
      };

      const revealPassword = (method) => {
        if (scratchRevealed) return;
        scratchRevealed = true;
        scratching = false;
        passwordScratch.classList.add("is-revealed");
        passwordScratch.classList.remove("is-scratching");
        passwordScratch.setAttribute("aria-label", "合言葉を表示しました");
        passwordScratch.removeAttribute("role");
        passwordScratch.removeAttribute("tabindex");
        passwordValue?.removeAttribute("aria-hidden");
        if (scratchHelp) scratchHelp.textContent = "合言葉を見つけました";
        track("password_reveal", { method });
        window.setTimeout(() => { scratchCanvas.hidden = true; }, 460);
      };

      const scratchPoint = (event) => {
        const bounds = scratchCanvas.getBoundingClientRect();
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      };

      const eraseScratch = (from, to) => {
        scratchContext.globalCompositeOperation = "destination-out";
        scratchContext.lineCap = "round";
        scratchContext.lineJoin = "round";
        scratchContext.lineWidth = 36;
        scratchContext.beginPath();
        scratchContext.moveTo(from.x, from.y);
        scratchContext.lineTo(to.x, to.y);
        scratchContext.stroke();
      };

      const scratchedEnough = () => {
        const pixels = scratchContext.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
        let transparent = 0;
        let sampled = 0;
        for (let alpha = 3; alpha < pixels.length; alpha += 64) {
          sampled += 1;
          if (pixels[alpha] < 64) transparent += 1;
        }
        return sampled > 0 && transparent / sampled >= .42;
      };

      paintScratchCover();
      window.addEventListener("resize", paintScratchCover);
      scratchCanvas.addEventListener("pointerdown", (event) => {
        if (scratchRevealed) return;
        event.preventDefault();
        scratchCanvas.setPointerCapture(event.pointerId);
        scratching = true;
        passwordScratch.classList.add("has-started", "is-scratching");
        lastScratchPoint = scratchPoint(event);
        eraseScratch(lastScratchPoint, lastScratchPoint);
      });
      scratchCanvas.addEventListener("pointermove", (event) => {
        if (!scratching || scratchRevealed || !lastScratchPoint) return;
        event.preventDefault();
        const nextPoint = scratchPoint(event);
        eraseScratch(lastScratchPoint, nextPoint);
        lastScratchPoint = nextPoint;
        scratchMoves += 1;
        if (scratchMoves % 8 === 0 && scratchedEnough()) revealPassword("scratch");
      });
      const finishScratching = () => {
        if (!scratching || scratchRevealed) return;
        scratching = false;
        lastScratchPoint = null;
        passwordScratch.classList.remove("is-scratching");
        if (scratchedEnough()) revealPassword("scratch");
      };
      scratchCanvas.addEventListener("pointerup", finishScratching);
      scratchCanvas.addEventListener("pointercancel", finishScratching);
      passwordScratch.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        revealPassword("keyboard");
      });
    }
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const recruit = document.querySelector("#recruit");
  if (recruit && "IntersectionObserver" in window) {
    const recruitObserver = new IntersectionObserver((entries, observer) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        track("recruit_view");
        observer.disconnect();
      }
    }, { threshold: .5 });
    recruitObserver.observe(recruit);
  }
})();
