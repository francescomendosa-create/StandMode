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
  const root = document.documentElement;
  const stage = document.getElementById("stage");

  let lastDateKey = "";
  let fitRaf = 0;

  function viewportSize() {
    const vv = window.visualViewport;
    // Misura reale usabile (iOS/Android: barre, notch, zoom)
    const w = Math.round(vv?.width ?? window.innerWidth);
    const h = Math.round(vv?.height ?? window.innerHeight);
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }

  function fitToDisplay() {
    const { w, h } = viewportSize();
    const landscape = w >= h;
    root.dataset.orientation = landscape ? "landscape" : "portrait";

    // Landscape leggermente più pieno; portrait un filo più arioso
    const fill = landscape ? 0.96 : 0.92;
    const padX = Math.max(6, Math.round(w * (landscape ? 0.018 : 0.04)));
    const padY = Math.max(6, Math.round(h * (landscape ? 0.03 : 0.022)));

    root.style.setProperty("--app-w", `${w}px`);
    root.style.setProperty("--app-h", `${h}px`);
    root.style.setProperty("--pad-x", `${padX}px`);
    root.style.setProperty("--pad-y", `${padY}px`);
    root.style.setProperty("--fit", "1");

    // Dopo il layout, se qualcosa sforasse scala uniformemente
    requestAnimationFrame(() => {
      if (!stage) return;
      const stand = document.getElementById("stand");
      const boxW = stand?.clientWidth || w;
      const boxH = stand?.clientHeight || h;
      const sw = stage.scrollWidth || stage.offsetWidth;
      const sh = stage.scrollHeight || stage.offsetHeight;
      if (sw <= 0 || sh <= 0) return;
      const scale = Math.min(1, (boxW * fill) / sw, (boxH * fill) / sh);
      // Landscape: permetti un filo più grande (fino a 1.04 se c'è spazio)
      const boost = landscape ? Math.min(1.04, Math.max(scale, scale * 1.03)) : scale;
      const finalScale = Math.min(boost, (boxW * 0.995) / sw, (boxH * 0.995) / sh);
      root.style.setProperty("--fit", String(Number(finalScale.toFixed(4))));
    });
  }

  function scheduleFit() {
    cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(fitToDisplay);
  }

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

  function unlockAudioGesture() {
    // placeholder per futuri suoni / wake; tap evita sleep aggressivo in alcuni browser
  }

  document.addEventListener("pointerdown", unlockAudioGesture, { passive: true });
  document.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });

  buildClockFace();
  renderCalendar(new Date());
  scheduleFit();
  requestAnimationFrame(tick);

  window.addEventListener("resize", scheduleFit, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(scheduleFit, 50), { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleFit, { passive: true });
  window.visualViewport?.addEventListener("scroll", scheduleFit, { passive: true });
  if (window.ResizeObserver) {
    new ResizeObserver(scheduleFit).observe(document.body);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
