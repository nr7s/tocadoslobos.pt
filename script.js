// The burrow tunnel: links the den's chambers and draws itself as you scroll down.
(() => {
  const den = document.querySelector(".den");
  const svg = den?.querySelector(".tunnel");
  if (!den || !svg) return;
  const dug = svg.querySelector(".tunnel__dug");
  const trail = svg.querySelector(".tunnel__trail");
  const digger = den.querySelector(".digger");
  const ns = "http://www.w3.org/2000/svg";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // Reveal both strokes through one mask so the dashed trail only shows where dug.
  const defs = document.createElementNS(ns, "defs");
  const mask = document.createElementNS(ns, "mask");
  mask.id = "dig";
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  const reveal = document.createElementNS(ns, "path");
  reveal.setAttribute("stroke", "#fff");
  reveal.setAttribute("stroke-width", "60");
  reveal.setAttribute("fill", "none");
  reveal.setAttribute("stroke-linecap", "round");
  const holes = document.createElementNS(ns, "g");
  mask.append(reveal, holes);
  defs.append(mask);
  svg.prepend(defs);
  const group = document.createElementNS(ns, "g");
  group.setAttribute("mask", "url(#dig)");
  group.append(dug, trail);
  svg.append(group);

  let len = 0;
  let top = 0;
  let inner = [];

  function layout() {
    const box = den.getBoundingClientRect();
    top = box.top + scrollY;
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    mask.setAttribute("width", box.width);
    mask.setAttribute("height", box.height);
    // One tunnel segment per gap between chambers, edge to edge. Its round ends
    // bite into each chamber's rim: the mouths where the tunnel enters.
    // The park window is a porthole in the first view, not a room on the route.
    const rooms = [...den.querySelectorAll(".chamber:not(.chamber--window)")].map((el) => {
      const r = el.getBoundingClientRect();
      const bw = parseFloat(getComputedStyle(el).borderTopWidth) || 0;
      return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, bw };
    });
    // Hide the tunnel inside each room's cream, so it only cuts through the rim: an opening, not a blot.
    holes.replaceChildren(...rooms.map((m) => {
      const h = document.createElementNS(ns, "rect");
      h.setAttribute("x", m.l + m.bw);
      h.setAttribute("y", m.t + m.bw);
      h.setAttribute("width", m.r - m.l - 2 * m.bw);
      h.setAttribute("height", m.b - m.t - 2 * m.bw);
      h.setAttribute("rx", Math.min(56, (m.r - m.l) * 0.12));
      h.setAttribute("fill", "#000");
      return h;
    }));
    inner = rooms.map((m) => [m.l + m.bw, m.t + m.bw, m.r - m.bw, m.b - m.bw]);
    rooms.push({ l: box.width * 0.6, r: box.width * 0.84, t: box.height + 40, b: box.height + 40, bw: 0 });
    const inset = -30;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    let d = "";
    for (let i = 0; i < rooms.length - 1; i++) {
      const a = rooms[i];
      const z = rooms[i + 1];
      if (z.t >= a.b) {
        // next room is below: leave through the floor, enter through the ceiling
        const aw = a.r - a.l;
        const zw = z.r - z.l;
        let x0 = clamp((z.l + z.r) / 2, a.l + aw * 0.22, a.r - aw * 0.22);
        let x1 = clamp((a.l + a.r) / 2, z.l + zw * 0.22, z.r - zw * 0.22);
        if (Math.abs(x1 - x0) < 60) {
          const side = i % 2 ? 1 : -1;
          x0 = clamp(x0 + side * aw * 0.18, a.l + aw * 0.2, a.r - aw * 0.2);
          x1 = clamp(x1 - side * zw * 0.18, z.l + zw * 0.2, z.r - zw * 0.2);
        }
        const y0 = a.b - inset;
        const y1 = z.t + inset;
        const k = (y1 - y0) * 0.6;
        d += ` M${x0},${y0} C${x0},${y0 + k} ${x1},${y1 - k} ${x1},${y1}`;
      } else {
        // next room is beside: leave through the wall
        const y = clamp((a.t + a.b) / 2, z.t + 40, z.b - 40);
        const x0 = a.r - inset;
        const x1 = z.l + inset;
        const k = (x1 - x0) * 0.5;
        d += ` M${x0},${y} C${x0 + k},${y} ${x1 - k},${y} ${x1},${y}`;
      }
    }
    d = d.trim();
    for (const p of [dug, trail, reveal]) p.setAttribute("d", d);
    len = reveal.getTotalLength();
    reveal.style.strokeDasharray = `${len} ${len}`;
    update();
  }

  function update() {
    if (reduce.matches) {
      reveal.style.strokeDashoffset = 0;
      digger.classList.remove("is-on");
      return;
    }
    const p = Math.min(1, Math.max(0, (scrollY + innerHeight * 0.62 - top) / den.offsetHeight));
    reveal.style.strokeDashoffset = len * (1 - p);
    const at = reveal.getPointAtLength(len * p);
    digger.style.transform = `translate(${at.x - digger.offsetWidth / 2}px, ${at.y - digger.offsetHeight / 2}px)`;
    const buried = inner.some(([l, t, r, b]) => at.x > l && at.x < r && at.y > t && at.y < b);
    digger.classList.toggle("is-on", p > 0.02 && p < 0.995 && !buried);
  }

  let queued = false;
  addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  new ResizeObserver(layout).observe(den);
  reduce.addEventListener("change", update);
  document.fonts?.ready.then(layout);
  addEventListener("load", layout);
})();
