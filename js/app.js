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
  const zoomMenu = document.getElementById("zoomMenu");
  const nudgeUp = document.getElementById("nudgeUp");
  const nudgeDown = document.getElementById("nudgeDown");
  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  const PREFS_KEY = "standmode-prefs-v1";
  const NUDGE_STEP = 2; // px millimetrici
  const ZOOM_STEP = 0.02; // passi piccoli proporzionati
  const ZOOM_MIN = 0.7;
  const ZOOM_MAX = 1.35;

  function clampZoom(z) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(z) || 1));
  }

  function currentOrientation() {
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    return w >= h ? "landscape" : "portrait";
  }

  function defaultModePrefs() {
    return { nudgeY: 0, zoom: 1 };
  }

  function loadAllPrefs() {
    const empty = {
      landscape: defaultModePrefs(),
      portrait: defaultModePrefs(),
    };
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          landscape: {
            nudgeY: Number(parsed?.landscape?.nudgeY) || 0,
            zoom: clampZoom(parsed?.landscape?.zoom ?? 1),
          },
          portrait: {
            nudgeY: Number(parsed?.portrait?.nudgeY) || 0,
            zoom: clampZoom(parsed?.portrait?.zoom ?? 1),
          },
        };
      }
    } catch (_) { /* ignore */ }

    // migrazione chiavi vecchie (unica per entrambe le orientazioni)
    const legacyNudge = Number(localStorage.getItem("standmode-nudge-y") || 0) || 0;
    const legacyZoom = clampZoom(localStorage.getItem("standmode-zoom") || 1);
    if (legacyNudge !== 0 || legacyZoom !== 1) {
      empty.landscape = { nudgeY: legacyNudge, zoom: legacyZoom };
      empty.portrait = { nudgeY: legacyNudge, zoom: legacyZoom };
    }
    return empty;
  }

  const prefs = loadAllPrefs();
  let mode = currentOrientation();
  let nudgeY = prefs[mode].nudgeY;
  let zoom = prefs[mode].zoom;
  let holdTimer = 0;
  let holdRepeat = 0;
  let longPressTimer = 0;
  let longPressFired = false;

  function isAdjTarget(target) {
    return Boolean(
      (nudgeMenu && nudgeMenu.contains(target)) ||
      (zoomMenu && zoomMenu.contains(target))
    );
  }

  function savePrefs() {
    prefs[mode] = {
      nudgeY,
      zoom: clampZoom(zoom),
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  function applyNudge() {
    if (!stand) return;
    stand.style.setProperty("--nudge-y", `${nudgeY}px`);
    savePrefs();
  }

  function applyZoom() {
    if (!stand) return;
    zoom = clampZoom(zoom);
    stand.style.setProperty("--zoom", String(Number(zoom.toFixed(3))));
    savePrefs();
  }

  function applyModePrefs() {
    nudgeY = prefs[mode].nudgeY;
    zoom = clampZoom(prefs[mode].zoom);
    if (!stand) return;
    stand.style.setProperty("--nudge-y", `${nudgeY}px`);
    stand.style.setProperty("--zoom", String(Number(zoom.toFixed(3))));
  }

  function syncOrientationPrefs() {
    const next = currentOrientation();
    if (next === mode) return;
    // salva quella corrente prima di cambiare
    prefs[mode] = { nudgeY, zoom: clampZoom(zoom) };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    mode = next;
    applyModePrefs();
  }

  function shiftNudge(delta) {
    nudgeY += delta;
    applyNudge();
  }

  function shiftZoom(delta) {
    zoom = clampZoom(zoom + delta);
    applyZoom();
  }

  function openAdjMenus() {
    if (nudgeMenu) nudgeMenu.hidden = false;
    if (zoomMenu) zoomMenu.hidden = false;
  }

  function closeAdjMenus() {
    if (nudgeMenu) nudgeMenu.hidden = true;
    if (zoomMenu) zoomMenu.hidden = true;
  }

  function menusOpen() {
    return (nudgeMenu && !nudgeMenu.hidden) || (zoomMenu && !zoomMenu.hidden);
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

  nudgeUp?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startHold(() => shiftNudge(-NUDGE_STEP));
  });
  nudgeDown?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startHold(() => shiftNudge(NUDGE_STEP));
  });
  zoomIn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    shiftZoom(ZOOM_STEP); // un piccolo passo per pressione
  });
  zoomOut?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    shiftZoom(-ZOOM_STEP);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => {
    nudgeUp?.addEventListener(ev, stopHold);
    nudgeDown?.addEventListener(ev, stopHold);
  });

  // Blocca menu sistema (incolla / callout)
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
    if (menusOpen() && !isAdjTarget(e.target)) {
      closeAdjMenus();
    }
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

  // Solo se qualcosa esce dallo schermo: riduci di poco, altrimenti resta 1 (come prima)
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

  applyModePrefs();
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

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
