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
  const colorMenu = document.getElementById("colorMenu");
  const partEls = {
    clock: document.querySelector('[data-part="clock"]'),
    date: document.querySelector('[data-part="date"]'),
    cal: document.querySelector('[data-part="cal"]'),
  };

  const PREFS_KEY = "standmode-prefs-v2";
  const PREFS_KEY_V1 = "standmode-prefs-v1";
  const PARTS = ["all", "clock", "date", "cal"];
  const DEFAULT_COLOR = "#c59a63";
  const COLOR_DOTS = [
    "#c59a63", // oro (default)
    "#ffffff",
    "#e8e8e8",
    "#fbbf24",
    "#fb923c",
    "#f87171",
    "#f472b6",
    "#c084fc",
    "#60a5fa",
    "#22d3ee",
    "#4ade80",
    "#a3e635",
  ];
  const NUDGE_STEP = 2;
  const ZOOM_STEP = 0.02;
  const ZOOM_MIN = 0.55;
  const ZOOM_MAX = 1.6;

  function clampZoom(z) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(z) || 1));
  }

  function normalizeHex(hex) {
    const h = String(hex || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(h)) {
      return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
    }
    return DEFAULT_COLOR;
  }

  function hexToRgb(hex) {
    const h = normalizeHex(hex).slice(1);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
  }

  function mixHex(a, b, t) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return rgbToHex(
      A.r + (B.r - A.r) * t,
      A.g + (B.g - A.g) * t,
      A.b + (B.b - A.b) * t
    );
  }

  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const lin = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  function themeFromAccent(accent) {
    const a = normalizeHex(accent);
    return {
      accent: a,
      // settimana / etichette secondarie: accento smorzato verso grigio
      muted: mixHex(a, "#8a8a8a", 0.55),
      // mese corto (data): più chiaro/grigio come prima
      monthMuted: mixHex(a, "#c8c8c8", 0.62),
      accentInk: luminance(a) > 0.62 ? "#1a1208" : "#0b0b0b",
    };
  }

  function defaultPart() {
    return { nudgeX: 0, nudgeY: 0, zoom: 1, color: DEFAULT_COLOR };
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
      color: normalizeHex(raw?.color || DEFAULT_COLOR),
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
      (zoomMenu && zoomMenu.contains(target)) ||
      (colorMenu && colorMenu.contains(target))
    );
  }

  function savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  function paintPart(el, part) {
    if (!el) return;
    const theme = themeFromAccent(part.color || DEFAULT_COLOR);
    el.style.setProperty("--part-x", `${part.nudgeX}px`);
    el.style.setProperty("--part-y", `${part.nudgeY}px`);
    el.style.setProperty("--part-zoom", String(Number(part.zoom.toFixed(3))));
    el.style.setProperty("--accent", theme.accent);
    el.style.setProperty("--muted", theme.muted);
    el.style.setProperty("--month-muted", theme.monthMuted);
    el.style.setProperty("--accent-ink", theme.accentInk);
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
    syncColorDots();
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

  function buildColorMenu() {
    if (!colorMenu || colorMenu.childElementCount) return;
    COLOR_DOTS.forEach((hex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-dot";
      btn.style.setProperty("--dot", hex);
      btn.dataset.color = hex;
      btn.setAttribute("aria-label", `Colore ${hex}`);
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveColor(hex);
      });
      colorMenu.appendChild(btn);
    });
  }

  function syncColorDots() {
    if (!colorMenu) return;
    const current = normalizeHex(activePart().color || DEFAULT_COLOR);
    colorMenu.querySelectorAll(".color-dot").forEach((btn) => {
      btn.classList.toggle("is-active", normalizeHex(btn.dataset.color) === current);
    });
  }

  function updateColorMenuVisibility() {
    if (!colorMenu) return;
    const show = menusOpen() && Boolean(selected);
    colorMenu.hidden = !show;
    if (show) syncColorDots();
  }

  function setActiveColor(hex) {
    const key = activeKey();
    if (key === "all") {
      // senza selezione non dovrebbe arrivare qui; se arriva, applica a tutte le parti
      for (const p of ["clock", "date", "cal"]) {
        prefs[mode][p].color = normalizeHex(hex);
      }
    } else {
      prefs[mode][key].color = normalizeHex(hex);
    }
    persistActive();
  }

  function setSelection(partName) {
    selected = partName;
    document.querySelectorAll(".panel.is-selected").forEach((el) => el.classList.remove("is-selected"));
    if (partName && partEls[partName]) {
      partEls[partName].classList.add("is-selected");
    }
    updateColorMenuVisibility();
  }

  function openAdjMenus() {
    document.body.classList.add("adj-open");
    if (nudgeMenu) nudgeMenu.hidden = false;
    if (nudgeMenuLR) nudgeMenuLR.hidden = false;
    if (zoomMenu) zoomMenu.hidden = false;
    updateColorMenuVisibility();
  }

  function closeAdjMenus() {
    document.body.classList.remove("adj-open");
    if (nudgeMenu) nudgeMenu.hidden = true;
    if (nudgeMenuLR) nudgeMenuLR.hidden = true;
    if (zoomMenu) zoomMenu.hidden = true;
    if (colorMenu) colorMenu.hidden = true;
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

  buildColorMenu();
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
  const APP_VERSION = "1.0.2";
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
