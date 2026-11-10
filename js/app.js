(() => {
  const WEEKDAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const MONTHS_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const MONTHS_LONG = [
    "GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO",
    "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE",
  ];
  const CAL_HEADERS = ["L", "M", "M", "G", "V", "S", "D"];

  const stand = document.getElementById("stand");
  const layoutClassic = document.getElementById("layoutClassic");
  const layoutAura = document.getElementById("layoutAura");
  const widgetPicker = document.getElementById("widgetPicker");
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
  const colorTabsEl = document.getElementById("colorTabs");
  const colorDotsEl = document.getElementById("colorDots");
  const weatherIcon = document.getElementById("weatherIcon");
  const weatherTemp = document.getElementById("weatherTemp");
  const weatherDesc = document.getElementById("weatherDesc");
  const weatherMeta = document.getElementById("weatherMeta");

  const PREFS_KEY = "standmode-prefs-v3";
  const PREFS_KEY_V2 = "standmode-prefs-v2";
  const PREFS_KEY_V1 = "standmode-prefs-v1";
  const LAYOUT_KEY = "standmode-layout";
  const PARTS = ["all", "clock", "date", "cal", "weather"];
  const DEFAULT_ACCENT = "#c59a63";
  const COLOR_DOTS = [
    "#ffffff", "#e8e8e8", "#111111", "#c59a63", "#fbbf24", "#fb923c",
    "#f87171", "#f472b6", "#c084fc", "#60a5fa", "#22d3ee", "#4ade80",
  ];
  const COLOR_TABS = {
    clock: [
      { id: "frame", label: "Cornice", fallback: "#ffffff" },
      { id: "minute", label: "Lancetta minuti", fallback: "#ffffff" },
      { id: "hour", label: "Lancetta ore", fallback: "#ffffff" },
      { id: "second", label: "Lancetta secondi", fallback: DEFAULT_ACCENT },
      { id: "numbers", label: "Numeri", fallback: "#ffffff" },
    ],
    date: [
      { id: "generic", label: "Generico", fallback: DEFAULT_ACCENT },
      { id: "day", label: "Giorno", fallback: "#ffffff" },
      { id: "week", label: "Settimana", fallback: DEFAULT_ACCENT },
      { id: "month", label: "Mesi", fallback: "#b0b0b0" },
    ],
    cal: [
      { id: "generic", label: "Generico", fallback: DEFAULT_ACCENT },
      { id: "days", label: "Giorni", fallback: "#ffffff" },
      { id: "today", label: "Oggi", fallback: DEFAULT_ACCENT },
    ],
    weather: [
      { id: "generic", label: "Generico", fallback: "#111111" },
      { id: "temp", label: "Temperatura", fallback: "#111111" },
      { id: "icon", label: "Icona", fallback: "#111111" },
      { id: "text", label: "Testo", fallback: "#333333" },
    ],
  };
  // Default Aura: lancette nere stile iOS / Pixel
  const AURA_CLOCK_DEFAULTS = {
    frame: "#111111",
    minute: "#111111",
    hour: "#111111",
    second: "#ffffff",
    numbers: "#111111",
  };
  const AURA_CAL_DEFAULTS = {
    generic: "#111111",
    days: "#111111",
    today: "#ffffff",
  };

  const NUDGE_STEP = 2;
  const ZOOM_STEP = 0.02;
  const ZOOM_MIN = 0.55;
  const ZOOM_MAX = 1.6;
  const APP_VERSION = "1.1.0";
  const INSTALL_URL = "https://francescomendosa-create.github.io/StandModeApp/";

  let layout = localStorage.getItem(LAYOUT_KEY) === "aura" ? "aura" : "classic";
  let lastDateKey = "";
  let selected = null;
  let colorSlot = null;
  let holdTimer = 0;
  let holdRepeat = 0;
  let longPressTimer = 0;
  let longPressFired = false;

  function clampZoom(z) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(z) || 1));
  }

  function normalizeHex(hex, fallback = DEFAULT_ACCENT) {
    const h = String(hex || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(h)) {
      return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
    }
    const fb = String(fallback || "").trim();
    if (fb && fb !== h) {
      if (/^#[0-9a-fA-F]{6}$/.test(fb)) return fb.toLowerCase();
      if (/^#[0-9a-fA-F]{3}$/.test(fb)) {
        return `#${fb[1]}${fb[1]}${fb[2]}${fb[2]}${fb[3]}${fb[3]}`.toLowerCase();
      }
    }
    return DEFAULT_ACCENT;
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
    return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
  }

  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const lin = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  function inkFor(hex) {
    return luminance(hex) > 0.62 ? "#1a1208" : "#0b0b0b";
  }

  function defaultColorsFor(partName) {
    const tabs = COLOR_TABS[partName] || [];
    const out = {};
    tabs.forEach((t) => {
      out[t.id] = normalizeHex(t.fallback, t.fallback);
    });
    return out;
  }

  function defaultPart(partName = "all") {
    return { nudgeX: 0, nudgeY: 0, zoom: 1, colors: defaultColorsFor(partName) };
  }

  function defaultOrientation() {
    return {
      all: defaultPart("all"),
      clock: defaultPart("clock"),
      date: defaultPart("date"),
      cal: defaultPart("cal"),
      weather: defaultPart("weather"),
    };
  }

  function normalizePart(raw, partName) {
    const base = defaultPart(partName);
    const legacy = raw?.color ? normalizeHex(raw.color) : null;
    const colors = { ...base.colors };
    if (raw?.colors && typeof raw.colors === "object") {
      Object.keys(colors).forEach((k) => {
        if (raw.colors[k]) colors[k] = normalizeHex(raw.colors[k], colors[k]);
      });
    } else if (legacy) {
      if (partName === "clock") colors.second = legacy;
      if (partName === "date") {
        colors.generic = legacy;
        colors.week = legacy;
      }
      if (partName === "cal") {
        colors.generic = legacy;
        colors.today = legacy;
      }
    }
    return {
      nudgeX: Number(raw?.nudgeX) || 0,
      nudgeY: Number(raw?.nudgeY) || 0,
      zoom: clampZoom(raw?.zoom ?? 1),
      colors,
    };
  }

  function normalizeOrientation(raw) {
    if (raw && (raw.nudgeY != null || raw.zoom != null) && !raw.all) {
      const base = defaultOrientation();
      base.all = normalizePart({
        nudgeX: raw.nudgeX || 0,
        nudgeY: raw.nudgeY || 0,
        zoom: raw.zoom ?? 1,
      }, "all");
      return base;
    }
    const base = defaultOrientation();
    for (const key of PARTS) base[key] = normalizePart(raw?.[key], key);
    return base;
  }

  function currentOrientation() {
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    return w >= h ? "landscape" : "portrait";
  }

  function loadAllPrefs() {
    const empty = { landscape: defaultOrientation(), portrait: defaultOrientation() };
    try {
      const raw = localStorage.getItem(PREFS_KEY) || localStorage.getItem(PREFS_KEY_V2) || localStorage.getItem(PREFS_KEY_V1);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          landscape: normalizeOrientation(parsed?.landscape),
          portrait: normalizeOrientation(parsed?.portrait),
        };
      }
    } catch (_) { /* ignore */ }
    return empty;
  }

  const prefs = loadAllPrefs();
  let mode = currentOrientation();

  function makeAuraBundle() {
    const clock = defaultPart("clock");
    clock.colors = { ...clock.colors, ...AURA_CLOCK_DEFAULTS };
    const cal = defaultPart("cal");
    cal.colors = { ...cal.colors, ...AURA_CAL_DEFAULTS };
    return {
      all: defaultPart("all"),
      clock,
      date: defaultPart("date"),
      cal,
      weather: defaultPart("weather"),
    };
  }

  function ensureByLayout(oriPrefs) {
    if (oriPrefs.byLayout?.classic && oriPrefs.byLayout?.aura) return oriPrefs.byLayout;
    oriPrefs.byLayout = {
      classic: {
        all: oriPrefs.all || defaultPart("all"),
        clock: oriPrefs.clock || defaultPart("clock"),
        date: oriPrefs.date || defaultPart("date"),
        cal: oriPrefs.cal || defaultPart("cal"),
        weather: oriPrefs.weather || defaultPart("weather"),
      },
      aura: makeAuraBundle(),
    };
    return oriPrefs.byLayout;
  }

  function layoutBag() {
    return ensureByLayout(prefs[mode])[layout];
  }

  function activeLayoutRoot() {
    return layout === "aura" ? layoutAura : layoutClassic;
  }

  function partEls() {
    const root = activeLayoutRoot();
    return {
      clock: root?.querySelector('[data-part="clock"]'),
      date: root?.querySelector('[data-part="date"]'),
      cal: root?.querySelector('[data-part="cal"]'),
      weather: root?.querySelector('[data-part="weather"]'),
    };
  }

  function tabsForSelected() {
    return COLOR_TABS[selected] || [];
  }

  function currentColorSlot() {
    const tabs = tabsForSelected();
    if (!tabs.length) return null;
    if (colorSlot && tabs.some((t) => t.id === colorSlot)) return colorSlot;
    return tabs[0].id;
  }

  function colorForSlot(partName, slotId) {
    const part = layoutBag()[partName];
    const tab = (COLOR_TABS[partName] || []).find((t) => t.id === slotId);
    const fallback = tab?.fallback || DEFAULT_ACCENT;
    return normalizeHex(part?.colors?.[slotId], fallback);
  }

  function savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    localStorage.setItem(LAYOUT_KEY, layout);
  }

  function paintPart(el, part, partName) {
    if (!el) return;
    const c = part.colors || defaultColorsFor(partName);
    el.style.setProperty("--part-x", `${part.nudgeX}px`);
    el.style.setProperty("--part-y", `${part.nudgeY}px`);
    el.style.setProperty("--part-zoom", String(Number(part.zoom.toFixed(3))));

    if (partName === "clock") {
      const frameFb = layout === "aura" ? AURA_CLOCK_DEFAULTS.frame : "#ffffff";
      const hourFb = layout === "aura" ? AURA_CLOCK_DEFAULTS.hour : "#ffffff";
      const minFb = layout === "aura" ? AURA_CLOCK_DEFAULTS.minute : "#ffffff";
      const secFb = layout === "aura" ? AURA_CLOCK_DEFAULTS.second : DEFAULT_ACCENT;
      const numFb = layout === "aura" ? AURA_CLOCK_DEFAULTS.numbers : "#ffffff";
      el.style.setProperty("--clock-frame", normalizeHex(c.frame, frameFb));
      el.style.setProperty("--clock-hour", normalizeHex(c.hour, hourFb));
      el.style.setProperty("--clock-minute", normalizeHex(c.minute, minFb));
      el.style.setProperty("--clock-second", normalizeHex(c.second, secFb));
      el.style.setProperty("--clock-numbers", normalizeHex(c.numbers, numFb));
      el.style.setProperty("--accent-ink", inkFor(normalizeHex(c.second, secFb)));
    }

    if (partName === "date") {
      const generic = normalizeHex(c.generic, DEFAULT_ACCENT);
      el.style.setProperty("--accent", generic);
      el.style.setProperty("--date-week", normalizeHex(c.week, generic));
      el.style.setProperty("--date-month", normalizeHex(c.month, "#b0b0b0"));
      el.style.setProperty("--date-day", normalizeHex(c.day, "#ffffff"));
      el.style.setProperty("--muted", mixHex(generic, "#8a8a8a", 0.55));
      el.style.setProperty("--accent-ink", inkFor(generic));
    }

    if (partName === "cal") {
      const genFb = layout === "aura" ? AURA_CAL_DEFAULTS.generic : DEFAULT_ACCENT;
      const daysFb = layout === "aura" ? AURA_CAL_DEFAULTS.days : "#ffffff";
      const todayFb = layout === "aura" ? AURA_CAL_DEFAULTS.today : DEFAULT_ACCENT;
      const generic = normalizeHex(c.generic, genFb);
      const today = normalizeHex(c.today, todayFb);
      el.style.setProperty("--accent", generic);
      el.style.setProperty("--muted", mixHex(generic, layout === "aura" ? "#444444" : "#8a8a8a", 0.45));
      el.style.setProperty("--cal-days", normalizeHex(c.days, daysFb));
      el.style.setProperty("--cal-today", today);
      el.style.setProperty("--accent-ink", inkFor(today));
    }

    if (partName === "weather") {
      const generic = normalizeHex(c.generic, "#111111");
      el.style.setProperty("--weather-temp", normalizeHex(c.temp, generic));
      el.style.setProperty("--weather-icon", normalizeHex(c.icon, generic));
      el.style.setProperty("--weather-desc", normalizeHex(c.text, "#333333"));
    }
  }

  function applyAllTransforms() {
    if (!stand) return;
    const bag = layoutBag();
    const all = bag.all;
    stand.style.setProperty("--nudge-x", `${all.nudgeX}px`);
    stand.style.setProperty("--nudge-y", `${all.nudgeY}px`);
    stand.style.setProperty("--zoom", String(Number(all.zoom.toFixed(3))));
    const els = partEls();
    paintPart(els.clock, bag.clock, "clock");
    paintPart(els.date, bag.date, "date");
    paintPart(els.cal, bag.cal, "cal");
    paintPart(els.weather, bag.weather, "weather");
    syncColorUi();
    syncWidgetThumbs();
  }

  function persistActive() {
    savePrefs();
    applyAllTransforms();
  }

  function activeKey() {
    return selected || "all";
  }

  function activePart() {
    return layoutBag()[activeKey()];
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

  /* —— Clocks —— */
  function buildClockFace(svg) {
    if (!svg || svg.dataset.built === "1") return;
    const ticks = svg.querySelector(".ticks");
    const nums = svg.querySelector(".nums");
    const cx = 100;
    const cy = 100;
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const isHour = i % 5 === 0;
      const outer = 92;
      const inner = isHour ? 84 : 88.5;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", (cx + Math.sin(angle) * outer).toFixed(2));
      line.setAttribute("y1", (cy - Math.cos(angle) * outer).toFixed(2));
      line.setAttribute("x2", (cx + Math.sin(angle) * inner).toFixed(2));
      line.setAttribute("y2", (cy - Math.cos(angle) * inner).toFixed(2));
      line.setAttribute("class", isHour ? "tick tick-hour" : "tick tick-minute");
      ticks.appendChild(line);
    }
    [
      { n: "12", a: 0 },
      { n: "3", a: 90 },
      { n: "6", a: 180 },
      { n: "9", a: 270 },
    ].forEach(({ n, a }) => {
      const rad = (a * Math.PI) / 180;
      const r = 66;
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", (cx + Math.sin(rad) * r).toFixed(2));
      t.setAttribute("y", (cy - Math.cos(rad) * r).toFixed(2));
      t.setAttribute("class", "num");
      t.textContent = n;
      nums.appendChild(t);
    });
    svg.dataset.built = "1";
  }

  function setHand(el, deg) {
    el?.setAttribute("transform", `rotate(${deg} 100 100)`);
  }

  function updateClocks(now) {
    const ms = now.getMilliseconds();
    const s = now.getSeconds() + ms / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    document.querySelectorAll(".clock-face").forEach((svg) => {
      setHand(svg.querySelector(".hour-hand"), h * 30);
      setHand(svg.querySelector(".minute-hand"), m * 6);
      setHand(svg.querySelector(".second-hand"), s * 6);
    });
  }

  function mondayIndex(jsDay) {
    return (jsDay + 6) % 7;
  }

  function renderCalendarIn(root, now, force = false) {
    if (!root) return;
    const y = now.getFullYear();
    const mo = now.getMonth();
    const day = now.getDate();
    const key = `${layout}-${y}-${mo}-${day}`;
    if (!force && key === lastDateKey) return;
    lastDateKey = key;

    const weekdayEl = root.querySelector('[data-role="weekday"]');
    const monthShortEl = root.querySelector('[data-role="monthShort"]');
    const dayNumEl = root.querySelector('[data-role="dayNum"]');
    const calTitle = root.querySelector('[data-role="calTitle"]');
    const calWeekdays = root.querySelector('[data-role="calWeekdays"]');
    const calGrid = root.querySelector('[data-role="calGrid"]');

    if (weekdayEl) weekdayEl.textContent = WEEKDAYS[now.getDay()];
    if (monthShortEl) monthShortEl.textContent = MONTHS_SHORT[mo];
    if (dayNumEl) dayNumEl.textContent = String(day);
    if (calTitle) calTitle.textContent = MONTHS_LONG[mo];

    if (calWeekdays) {
      calWeekdays.replaceChildren(
        ...CAL_HEADERS.map((label) => {
          const span = document.createElement("span");
          span.textContent = label;
          return span;
        })
      );
    }

    if (calGrid) {
      const first = new Date(y, mo, 1);
      const daysInMonth = new Date(y, mo + 1, 0).getDate();
      const startPad = mondayIndex(first.getDay());
      const cells = [];
      for (let i = 0; i < startPad; i++) {
        const empty = document.createElement("div");
        empty.className = "cal-cell is-empty";
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
  }

  /* —— Weather (Open-Meteo, no key) —— */
  const WMO = {
    0: "Sereno",
    1: "Preval. sereno",
    2: "Parz. nuvoloso",
    3: "Nuvoloso",
    45: "Nebbia",
    48: "Nebbia",
    51: "Pioviggine",
    61: "Pioggia",
    63: "Pioggia",
    65: "Pioggia forte",
    71: "Neve",
    80: "Rovesci",
    95: "Temporale",
  };

  function weatherSvg(code) {
    const storm = code >= 95;
    const rain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
    const snow = code >= 71 && code <= 77;
    const cloud = code >= 2;
    if (storm) {
      return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 38h22a10 10 0 0 0 0-20 14 14 0 0 0-27 6A9 9 0 0 0 20 38Z"/><path d="M30 40l-4 10h8l-3 10"/></svg>`;
    }
    if (rain) {
      return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 34h24a10 10 0 0 0 0-20 14 14 0 0 0-27 5A9 9 0 0 0 20 34Z"/><path d="M24 42v8M32 44v8M40 42v8"/></svg>`;
    }
    if (snow) {
      return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 34h24a10 10 0 0 0 0-20 14 14 0 0 0-27 5A9 9 0 0 0 20 34Z"/><path d="M24 44h0M32 48h0M40 44h0" stroke-width="5"/></svg>`;
    }
    if (cloud) {
      return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 40h28a12 12 0 0 0 0-24 16 16 0 0 0-30 7A10 10 0 0 0 18 40Z"/></svg>`;
    }
    return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="32" cy="32" r="10"/><path d="M32 10v6M32 48v6M10 32h6M48 32h6M16 16l4 4M44 44l4 4M16 48l4-4M44 20l4-4"/></svg>`;
  }

  async function loadWeather() {
    if (!weatherTemp) return;
    const apply = (temp, code, place) => {
      weatherTemp.textContent = String(Math.round(temp));
      if (weatherDesc) weatherDesc.textContent = WMO[code] || "Meteo";
      if (weatherMeta) weatherMeta.textContent = place || "";
      if (weatherIcon) weatherIcon.innerHTML = weatherSvg(code);
    };

    const fetchAt = async (lat, lon, place) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      apply(data.current.temperature_2m, data.current.weather_code, place);
    };

    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error("no geo"));
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      await fetchAt(pos.coords.latitude, pos.coords.longitude, "Qui");
    } catch (_) {
      try {
        await fetchAt(41.9, 12.5, "Roma");
      } catch (err) {
        if (weatherDesc) weatherDesc.textContent = "Meteo non disponibile";
      }
    }
  }

  /* —— Layout switch —— */
  function syncWidgetThumbs() {
    widgetPicker?.querySelectorAll(".widget-thumb").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.layout === layout);
    });
  }

  function setLayout(next) {
    layout = next === "aura" ? "aura" : "classic";
    document.body.dataset.layout = layout;
    if (layoutClassic) layoutClassic.hidden = layout !== "classic";
    if (layoutAura) layoutAura.hidden = layout !== "aura";
    lastDateKey = "";
    selected = null;
    document.querySelectorAll(".panel.is-selected").forEach((el) => el.classList.remove("is-selected"));
    renderCalendarIn(activeLayoutRoot(), new Date(), true);
    savePrefs();
    applyAllTransforms();
    updateColorMenuVisibility();
    if (layout === "aura") loadWeather();
  }

  /* —— Color UI —— */
  function buildColorDots() {
    if (!colorDotsEl || colorDotsEl.childElementCount) return;
    COLOR_DOTS.forEach((hex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-dot";
      btn.style.setProperty("--dot", hex);
      btn.dataset.color = hex;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveColor(hex);
      });
      colorDotsEl.appendChild(btn);
    });
  }

  function rebuildColorTabs() {
    if (!colorTabsEl) return;
    colorTabsEl.replaceChildren();
    const tabs = tabsForSelected();
    const active = currentColorSlot();
    tabs.forEach((tab) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-tab" + (tab.id === active ? " is-active" : "");
      btn.textContent = tab.label;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        colorSlot = tab.id;
        rebuildColorTabs();
        syncColorDots();
      });
      colorTabsEl.appendChild(btn);
    });
  }

  function syncColorDots() {
    if (!colorDotsEl || !selected) return;
    const current = colorForSlot(selected, currentColorSlot());
    colorDotsEl.querySelectorAll(".color-dot").forEach((btn) => {
      btn.classList.toggle("is-active", normalizeHex(btn.dataset.color, current) === current);
    });
  }

  function syncColorUi() {
    if (!colorMenu || colorMenu.hidden) return;
    rebuildColorTabs();
    syncColorDots();
  }

  function updateColorMenuVisibility() {
    if (!colorMenu) return;
    const show = menusOpen() && Boolean(selected);
    colorMenu.hidden = !show;
    if (show) {
      colorSlot = tabsForSelected()[0]?.id || null;
      rebuildColorTabs();
      syncColorDots();
    }
  }

  function setActiveColor(hex) {
    if (!selected) return;
    const slot = currentColorSlot();
    if (!slot) return;
    const part = layoutBag()[selected];
    if (!part.colors) part.colors = defaultColorsFor(selected);
    part.colors[slot] = normalizeHex(hex, part.colors[slot]);
    persistActive();
  }

  function setSelection(partName) {
    selected = partName;
    document.querySelectorAll(".panel.is-selected").forEach((el) => el.classList.remove("is-selected"));
    const el = partEls()[partName];
    if (el) el.classList.add("is-selected");
    updateColorMenuVisibility();
  }

  function isAdjTarget(target) {
    return Boolean(
      nudgeMenu?.contains(target) ||
      nudgeMenuLR?.contains(target) ||
      zoomMenu?.contains(target) ||
      colorMenu?.contains(target) ||
      widgetPicker?.contains(target)
    );
  }

  function openAdjMenus() {
    document.body.classList.add("adj-open");
    if (nudgeMenu) nudgeMenu.hidden = false;
    if (nudgeMenuLR) nudgeMenuLR.hidden = false;
    if (zoomMenu) zoomMenu.hidden = false;
    if (widgetPicker) widgetPicker.hidden = false;
    syncWidgetThumbs();
    updateColorMenuVisibility();
  }

  function closeAdjMenus() {
    document.body.classList.remove("adj-open");
    if (nudgeMenu) nudgeMenu.hidden = true;
    if (nudgeMenuLR) nudgeMenuLR.hidden = true;
    if (zoomMenu) zoomMenu.hidden = true;
    if (colorMenu) colorMenu.hidden = true;
    if (widgetPicker) widgetPicker.hidden = true;
    setSelection(null);
  }

  function menusOpen() {
    return (
      (nudgeMenu && !nudgeMenu.hidden) ||
      (nudgeMenuLR && !nudgeMenuLR.hidden) ||
      (zoomMenu && !zoomMenu.hidden) ||
      (widgetPicker && !widgetPicker.hidden)
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

  widgetPicker?.querySelectorAll(".widget-thumb").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setLayout(btn.dataset.layout);
    });
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
    if (partEl && activeLayoutRoot()?.contains(partEl)) {
      const name = partEl.getAttribute("data-part");
      setSelection(selected === name ? null : name);
      return;
    }
    closeAdjMenus();
  }, { passive: true });

  document.addEventListener("pointercancel", () => clearTimeout(longPressTimer), { passive: true });

  document.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
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

  function tick() {
    const now = new Date();
    updateClocks(now);
    renderCalendarIn(activeLayoutRoot(), now);
    requestAnimationFrame(tick);
  }

  /* Install PWA */
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
    return /\/StandMode\/?/.test(location.pathname) && !/StandModeApp/i.test(location.pathname);
  }

  if (isStandalone()) {
    document.body.classList.add("is-standalone");
    if (installBar) installBar.hidden = true;
  } else {
    if (onGhostHost() && installHint) {
      installHint.hidden = false;
      installHint.innerHTML =
        `Se Chrome dice “già installata”, usa: <a href="${INSTALL_URL}">StandModeApp</a>`;
    }
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstall = e;
      if (installBar) installBar.hidden = false;
    });
    window.addEventListener("appinstalled", () => {
      deferredInstall = null;
      if (installBar) installBar.hidden = true;
    });
    btnInstall?.addEventListener("click", async () => {
      if (deferredInstall) {
        deferredInstall.prompt();
        const choice = await deferredInstall.userChoice;
        deferredInstall = null;
        if (choice.outcome === "accepted" && installBar) installBar.hidden = true;
        return;
      }
      location.href = INSTALL_URL;
    });
  }

  // boot
  document.querySelectorAll(".clock-face").forEach(buildClockFace);
  buildColorDots();
  setLayout(layout);
  softFit();
  requestAnimationFrame(tick);
  if (layout === "aura") loadWeather();

  window.addEventListener("resize", () => {
    syncOrientationPrefs();
    softFit();
  }, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(() => {
    syncOrientationPrefs();
    softFit();
  }, 80), { passive: true });
  window.visualViewport?.addEventListener("resize", () => {
    syncOrientationPrefs();
    softFit();
  }, { passive: true });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`, { updateViaCache: "none" }).catch(() => {});
  }
})();
