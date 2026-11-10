(() => {
  const WEEKDAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const MONTHS_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const MONTHS_LONG = [
    "GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO",
    "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE",
  ];
  // Lunedì → Domenica (come nello schema iPhone)
  const CAL_HEADERS = ["L", "M", "M", "G", "V", "S", "D"];

  const hourHand = document.getElementById("hourHand");
  const minuteHand = document.getElementById("minuteHand");
  const secondHand = document.getElementById("secondHand");
  const weekdayEl = document.getElementById("weekday");
  const monthShortEl = document.getElementById("monthShort");
  const dayNumEl = document.getElementById("dayNum");
  const calTitle = document.getElementById("calTitle");
  const calWeekdays = document.getElementById("calWeekdays");
  const calGrid = document.getElementById("calGrid");
  const ticks = document.getElementById("ticks");
  const nums = document.getElementById("nums");

  let lastDateKey = "";

  function buildClockFace() {
    const cx = 100;
    const cy = 100;
    const fragTicks = document.createDocumentFragment();
    const fragNums = document.createDocumentFragment();

    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const isHour = i % 5 === 0;
      const outer = 92;
      const inner = isHour ? 84 : 88.5;
      const x1 = cx + Math.sin(angle) * outer;
      const y1 = cy - Math.cos(angle) * outer;
      const x2 = cx + Math.sin(angle) * inner;
      const y2 = cy - Math.cos(angle) * inner;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1.toFixed(2));
      line.setAttribute("y1", y1.toFixed(2));
      line.setAttribute("x2", x2.toFixed(2));
      line.setAttribute("y2", y2.toFixed(2));
      line.setAttribute("class", isHour ? "tick tick-hour" : "tick tick-minute");
      fragTicks.appendChild(line);
    }

    // Solo 12, 3, 6, 9
    const labels = [
      { n: "12", a: 0 },
      { n: "3", a: 90 },
      { n: "6", a: 180 },
      { n: "9", a: 270 },
    ];
    for (const { n, a } of labels) {
      const rad = (a * Math.PI) / 180;
      const r = 66;
      const x = cx + Math.sin(rad) * r;
      const y = cy - Math.cos(rad) * r;
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", x.toFixed(2));
      t.setAttribute("y", y.toFixed(2));
      t.setAttribute("class", "num");
      t.textContent = n;
      fragNums.appendChild(t);
    }

    ticks.appendChild(fragTicks);
    nums.appendChild(fragNums);
  }

  function setHand(el, deg) {
    el.setAttribute("transform", `rotate(${deg} 100 100)`);
  }

  function updateClock(now) {
    const ms = now.getMilliseconds();
    const s = now.getSeconds() + ms / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    setHand(secondHand, s * 6);
    setHand(minuteHand, m * 6);
    setHand(hourHand, h * 30);
  }

  function mondayIndex(jsDay) {
    // JS: 0=Dom … 6=Sab → lunedì=0
    return (jsDay + 6) % 7;
  }

  function renderCalendar(now) {
    const y = now.getFullYear();
    const mo = now.getMonth();
    const day = now.getDate();
    const key = `${y}-${mo}-${day}`;
    if (key === lastDateKey) return;
    lastDateKey = key;

    weekdayEl.textContent = WEEKDAYS[now.getDay()];
    monthShortEl.textContent = MONTHS_SHORT[mo];
    dayNumEl.textContent = String(day);
    calTitle.textContent = MONTHS_LONG[mo];

    calWeekdays.replaceChildren(
      ...CAL_HEADERS.map((label) => {
        const span = document.createElement("span");
        span.textContent = label;
        return span;
      })
    );

    const first = new Date(y, mo, 1);
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const startPad = mondayIndex(first.getDay());
    const cells = [];

    for (let i = 0; i < startPad; i++) {
      const empty = document.createElement("div");
      empty.className = "cal-cell is-empty";
      empty.textContent = "";
      cells.push(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("div");
      cell.className = "cal-cell" + (d === day ? " is-today" : "");
      cell.textContent = String(d);
      cells.push(cell);
    }

    calGrid.replaceChildren(...cells);
  }

  function tick() {
    const now = new Date();
    updateClock(now);
    renderCalendar(now);
    requestAnimationFrame(tick);
  }

  const stand = document.getElementById("stand");
  const nudgeMenu = document.getElementById("nudgeMenu");
  const nudgeMenuLR = document.getElementById("nudgeMenuLR");
  const zoomMenu = document.getElementById("zoomMenu");
  const nudgeUp = document.getElementById("nudgeUp");
  const nudgeDown = document.getElementById("nudgeDown");
  const nudgeLeft = document.getElementById("nudgeLeft");
  const nudgeRight = document.getElementById("nudgeRight");
  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  const partEls = {
    clock: document.querySelector('[data-part="clock"]'),
    date: document.querySelector('[data-part="date"]'),
    cal: document.querySelector('[data-part="cal"]'),
  };

  const PREFS_KEY = "standmode-prefs-v2";
  const PREFS_KEY_V1 = "standmode-prefs-v1";
  const PARTS = ["all", "clock", "date", "cal"];
  const NUDGE_STEP = 2;
  const ZOOM_STEP = 0.02;
  const ZOOM_MIN = 0.55;
  const ZOOM_MAX = 1.6;

  function clampZoom(z) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(z) || 1));
  }

  function defaultPart() {
    return { nudgeX: 0, nudgeY: 0, zoom: 1 };
  }

  function defaultOrientation() {
    return {
      all: defaultPart(),
      clock: defaultPart(),
      date: defaultPart(),
      cal: defaultPart(),
    };
  }

  function normalizePart(raw) {
    return {
      nudgeX: Number(raw?.nudgeX) || 0,
      nudgeY: Number(raw?.nudgeY) || 0,
      zoom: clampZoom(raw?.zoom ?? 1),
    };
  }

  function normalizeOrientation(raw) {
    // v1: { nudgeY, zoom } senza parti
    if (raw && (raw.nudgeY != null || raw.zoom != null) && !raw.all) {
      const base = defaultOrientation();
      base.all = normalizePart({
        nudgeX: raw.nudgeX || 0,
        nudgeY: raw.nudgeY || 0,
        zoom: raw.zoom ?? 1,
      });
      return base;
    }
    const base = defaultOrientation();
    for (const key of PARTS) {
      base[key] = normalizePart(raw?.[key]);
    }
    return base;
  }

  function currentOrientation() {
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    return w >= h ? "landscape" : "portrait";
  }

  function loadAllPrefs() {
    const empty = {
      landscape: defaultOrientation(),
      portrait: defaultOrientation(),
    };
    try {
      const raw = localStorage.getItem(PREFS_KEY) || localStorage.getItem(PREFS_KEY_V1);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          landscape: normalizeOrientation(parsed?.landscape),
          portrait: normalizeOrientation(parsed?.portrait),
        };
      }
    } catch (_) { /* ignore */ }

    const legacyNudge = Number(localStorage.getItem("standmode-nudge-y") || 0) || 0;
    const legacyZoom = clampZoom(localStorage.getItem("standmode-zoom") || 1);
    if (legacyNudge !== 0 || legacyZoom !== 1) {
      empty.landscape.all = { nudgeX: 0, nudgeY: legacyNudge, zoom: legacyZoom };
      empty.portrait.all = { nudgeX: 0, nudgeY: legacyNudge, zoom: legacyZoom };
    }
    return empty;
  }

  const prefs = loadAllPrefs();
  let mode = currentOrientation();
  let selected = null; // null = tutto il contenuto
  let holdTimer = 0;
  let holdRepeat = 0;
  let longPressTimer = 0;
  let longPressFired = false;

  function activeKey() {
    return selected || "all";
  }

  function activePart() {
    return prefs[mode][activeKey()];
  }

  function isAdjTarget(target) {
    return Boolean(
      (nudgeMenu && nudgeMenu.contains(target)) ||
      (nudgeMenuLR && nudgeMenuLR.contains(target)) ||
      (zoomMenu && zoomMenu.contains(target))
    );
  }

  function savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  function paintPart(el, part) {
    if (!el) return;
    el.style.setProperty("--part-x", `${part.nudgeX}px`);
    el.style.setProperty("--part-y", `${part.nudgeY}px`);
    el.style.setProperty("--part-zoom", String(Number(part.zoom.toFixed(3))));
  }

  function applyAllTransforms() {
    if (!stand) return;
    const all = prefs[mode].all;
    stand.style.setProperty("--nudge-x", `${all.nudgeX}px`);
    stand.style.setProperty("--nudge-y", `${all.nudgeY}px`);
    stand.style.setProperty("--zoom", String(Number(all.zoom.toFixed(3))));
    paintPart(partEls.clock, prefs[mode].clock);
    paintPart(partEls.date, prefs[mode].date);
    paintPart(partEls.cal, prefs[mode].cal);
  }

  function persistActive() {
    savePrefs();
    applyAllTransforms();
  }

  function shiftNudge(dx, dy) {
    const part = activePart();
    part.nudgeX += dx;
    part.nudgeY += dy;
    persistActive();
  }

  function shiftZoom(delta) {
    const part = activePart();
    part.zoom = clampZoom(part.zoom + delta);
    persistActive();
  }

  function setSelection(partName) {
    selected = partName;
    document.querySelectorAll(".panel.is-selected").forEach((el) => el.classList.remove("is-selected"));
    if (partName && partEls[partName]) {
      partEls[partName].classList.add("is-selected");
    }
  }

  function openAdjMenus() {
    document.body.classList.add("adj-open");
    if (nudgeMenu) nudgeMenu.hidden = false;
    if (nudgeMenuLR) nudgeMenuLR.hidden = false;
    if (zoomMenu) zoomMenu.hidden = false;
  }

  function closeAdjMenus() {
    document.body.classList.remove("adj-open");
    if (nudgeMenu) nudgeMenu.hidden = true;
    if (nudgeMenuLR) nudgeMenuLR.hidden = true;
    if (zoomMenu) zoomMenu.hidden = true;
    setSelection(null);
  }

  function menusOpen() {
    return (
      (nudgeMenu && !nudgeMenu.hidden) ||
      (nudgeMenuLR && !nudgeMenuLR.hidden) ||
      (zoomMenu && !zoomMenu.hidden)
    );
  }

  function syncOrientationPrefs() {
    const next = currentOrientation();
    if (next === mode) return;
    savePrefs();
    mode = next;
    applyAllTransforms();
  }

  function startHold(fn) {
    fn();
    clearTimeout(holdTimer);
    clearInterval(holdRepeat);
    holdTimer = setTimeout(() => {
      holdRepeat = setInterval(fn, 40);
    }, 280);
  }

  function stopHold() {
    clearTimeout(holdTimer);
    clearInterval(holdRepeat);
  }

  function bindHold(el, fn) {
    el?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startHold(fn);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => {
      el?.addEventListener(ev, stopHold);
    });
  }

  bindHold(nudgeUp, () => shiftNudge(0, -NUDGE_STEP));
  bindHold(nudgeDown, () => shiftNudge(0, NUDGE_STEP));
  bindHold(nudgeLeft, () => shiftNudge(-NUDGE_STEP, 0));
  bindHold(nudgeRight, () => shiftNudge(NUDGE_STEP, 0));

  zoomIn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    shiftZoom(ZOOM_STEP);
  });
  zoomOut?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    shiftZoom(-ZOOM_STEP);
  });

  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openAdjMenus();
  });
  document.addEventListener("selectstart", (e) => e.preventDefault());

  document.addEventListener("pointerdown", (e) => {
    longPressFired = false;
    clearTimeout(longPressTimer);
    if (isAdjTarget(e.target)) return;
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      openAdjMenus();
    }, 480);
  }, { passive: true });

  document.addEventListener("pointerup", (e) => {
    clearTimeout(longPressTimer);
    if (longPressFired) return;
    if (!menusOpen()) return;
    if (isAdjTarget(e.target)) return;

    const partEl = e.target.closest?.("[data-part]");
    if (partEl) {
      const name = partEl.getAttribute("data-part");
      // secondo tap sulla stessa parte → deseleziona (torna a tutto)
      setSelection(selected === name ? null : name);
      return;
    }

    closeAdjMenus();
  }, { passive: true });

  document.addEventListener("pointercancel", () => clearTimeout(longPressTimer), { passive: true });

  document.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });

  function softFit() {
    if (!stand) return;
    stand.style.setProperty("--fit", "1");
    requestAnimationFrame(() => {
      const vv = window.visualViewport;
      const vw = vv?.width ?? window.innerWidth;
      const vh = vv?.height ?? window.innerHeight;
      const sw = stand.scrollWidth;
      const sh = stand.scrollHeight;
      if (sw <= vw + 1 && sh <= vh + 1) return;
      const s = Math.min(vw / sw, vh / sh) * 0.98;
      if (s < 0.999) stand.style.setProperty("--fit", String(Number(s.toFixed(4))));
    });
  }

  applyAllTransforms();
  buildClockFace();
  renderCalendar(new Date());
  softFit();
  requestAnimationFrame(tick);

  function onViewportChange() {
    syncOrientationPrefs();
    softFit();
  }

  window.addEventListener("resize", onViewportChange, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(onViewportChange, 80), { passive: true });
  window.visualViewport?.addEventListener("resize", onViewportChange, { passive: true });

  /* —— Install PWA (come TagImpianto / MyMenu) —— */
  const INSTALL_URL = "https://francescomendosa-create.github.io/StandModeApp/";
  const APP_VERSION = "1.0.1";
  const btnInstall = document.getElementById("btnInstall");
  const installBar = document.getElementById("installBar");
  const installHint = document.getElementById("installHint");
  let deferredInstall = null;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true
    );
  }

  function onGhostHost() {
    // Vecchio path GitHub Pages: Chrome può avere WebAPK fantasma
    return /\/StandMode\/?/.test(location.pathname) && !/StandModeApp/i.test(location.pathname);
  }

  function hideInstallUi() {
    if (installBar) installBar.hidden = true;
  }

  function showGhostHint() {
    if (!installHint) return;
    installHint.hidden = false;
    installHint.innerHTML =
      `Se Chrome dice “già installata”, usa il link pulito: ` +
      `<a href="${INSTALL_URL}">StandModeApp</a>`;
  }

  if (isStandalone()) {
    document.body.classList.add("is-standalone");
    hideInstallUi();
  } else {
    if (onGhostHost()) showGhostHint();
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstall = e;
      if (installBar) installBar.hidden = false;
      if (btnInstall) btnInstall.hidden = false;
    });
    window.addEventListener("appinstalled", () => {
      deferredInstall = null;
      hideInstallUi();
    });
    btnInstall?.addEventListener("click", async () => {
      if (deferredInstall) {
        deferredInstall.prompt();
        const choice = await deferredInstall.userChoice;
        deferredInstall = null;
        if (choice.outcome === "accepted") hideInstallUi();
        return;
      }
      // Su path fantasma / senza prompt: vai al mirror pulito
      location.href = INSTALL_URL;
    });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register(`./sw.js?v=${APP_VERSION}`, { updateViaCache: "none" })
      .catch(() => {});
  }
})();
