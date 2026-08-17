/* ============================================================
   SOULDRIFTER — LORE ATLAS (v1.0)
   Interactive lore/maps tab. Vanilla JS, no build step.

   GAME INTEGRATION API (window.SOULDRIFTER_ATLAS):
     getState()              -> current progress state object
     setState(obj)           -> replace state (game writes progress here)
     unlockRealm(id)         -> unlock a realm
     setPoi(realmId, poiId, status)  // "unknown"|"rumored"|"explored"|"completed"
     exportJSON()            -> JSON string of state
     importJSON(str)         -> load state from JSON string
     reset()                 -> back to defaultState
   State persists in localStorage under "souldrifter.atlasState.v1".
   "Preview All" toggle bypasses locks/fog for review builds only.
   ============================================================ */

(function () {
  const LS_KEY = "souldrifter.atlasState.v1";
  const D = ATLAS_DATA;

  /* ---------------- state ---------------- */
  let state = loadState();
  let previewAll = false;  // game build: locks and fog driven by SOULDRIFTER_ATLAS state
  let currentTab = "wheel";
  let currentRealm = "thalenyr";
  let realmView = "lore";   // "lore" = clean painted map · "explore" = pins + key + fog of war
  let selectedPoi = null;
  let editMode = false;

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(D.defaultState));
  }
  function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }
  function poiStatus(realmId, poiId) {
    return (state.pois && state.pois[`${realmId}.${poiId}`]) || "unknown";
  }
  function realmUnlocked(id) {
    return previewAll || (state.realms[id] && state.realms[id].unlocked);
  }

  /* ---------------- shell ---------------- */
  const app = document.getElementById("app");

  function render() {
    app.innerHTML = "";
    app.appendChild(el("header", "atlas-header", headerHTML()));
    const main = el("main", "atlas-main");
    if (currentTab === "wheel") main.appendChild(renderWheel());
    if (currentTab === "maps") main.appendChild(renderMaps());
    if (currentTab === "book") main.appendChild(renderBook());
    app.appendChild(main);
    app.appendChild(renderStateDrawer());
    bindHeader();
  }

  const embedded = window.self !== window.top;  // inside the game iframe: no review controls

  function headerHTML() {
    return `
      <div class="brand">
        <div class="brand-title">SOULDRIFTER</div>
        <div class="brand-sub">Lore Atlas</div>
      </div>
      <nav class="tabs">
        ${tabBtn("wheel", "Cosmology Wheel")}
        ${tabBtn("maps", "Realm Maps")}
        ${tabBtn("book", "Lore Book")}
      </nav>
      <div class="header-actions">
        ${embedded ? "" : `
        <label class="preview-toggle" title="Review build only — bypasses all locks and fog">
          <input type="checkbox" id="previewAll" ${previewAll ? "checked" : ""}> Preview All
        </label>
        <button class="btn ghost" id="stateBtn">Game State</button>`}
      </div>`;
  }
  function tabBtn(id, label) {
    return `<button class="tab ${currentTab === id ? "active" : ""}" data-tab="${id}">${label}</button>`;
  }
  function bindHeader() {
    app.querySelectorAll(".tab").forEach(b =>
      b.addEventListener("click", () => { currentTab = b.dataset.tab; selectedPoi = null; render(); }));
    app.querySelector("#previewAll")?.addEventListener("change", e => { previewAll = e.target.checked; render(); });
    app.querySelector("#stateBtn")?.addEventListener("click", () => {
      document.querySelector(".state-drawer").classList.toggle("open");
    });
  }

  /* ---------------- COSMOLOGY WHEEL ---------------- */
  function renderWheel() {
    const wrap = el("section", "wheel-wrap");
    const W = D.wheel;
    const realmById = id => D.realms.find(r => r.id === id);
    const node = (id, x, y, r) => {
      const rm = realmById(id);
      const locked = !realmUnlocked(id);
      return { rm, locked, x, y, r };
    };
    const nodes = [
      node(W.center.id, W.center.x, W.center.y, W.center.r),
      ...W.ring.map(n => node(n.id, n.x, n.y, n.r))
    ];
    const colors = {
      arianus: "#7fb8d9", pryan: "#e0a13c", abarrach: "#c0563a",
      chelestra: "#3fa89b", thalenyr: "#69a84f", nexus: "#d9c47f"
    };

    let svg = `<svg viewBox="0 0 100 100" class="wheel-svg" preserveAspectRatio="xMidYMid meet">`;
    // backdrop
    svg += `<rect x="0" y="0" width="100" height="100" fill="#14100c"/>`;
    svg += starfield();
    // labyrinth ring around the nexus
    const L = W.labyrinthRing;
    svg += `<circle cx="${L.x}" cy="${L.y}" r="${L.r}" fill="none" stroke="#3a2b4f" stroke-width="9" opacity="0.55"/>`;
    svg += `<circle cx="${L.x}" cy="${L.y}" r="${L.r}" fill="none" stroke="#6b4fa0" stroke-width="0.35" stroke-dasharray="1.2 1.6" opacity="0.9"/>`;
    svg += `<text x="${L.x}" y="${L.y + L.r - 4.4}" class="svg-label lab" text-anchor="middle">THE LABYRINTH</text>`;
    // connections: realms <-> nexus
    for (const n of nodes) {
      if (n.rm.id === "nexus") continue;
      svg += `<line x1="${W.center.x}" y1="${W.center.y}" x2="${n.x}" y2="${n.y}" stroke="#8a7350" stroke-width="0.25" opacity="0.7"/>`;
    }
    // ring connections between the four canon realms
    const ring4 = W.ring.filter(n => ["arianus", "pryan", "abarrach", "chelestra"].includes(n.id));
    for (let i = 0; i < ring4.length; i++) {
      const a = ring4[i], b = ring4[(i + 1) % ring4.length];
      svg += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#5c6b52" stroke-width="0.2" stroke-dasharray="1 1" opacity="0.6"/>`;
    }
    // soul well link to thalenyr
    const thy = W.ring.find(n => n.id === "thalenyr");
    svg += `<circle cx="${thy.x + 6}" cy="${thy.y + 8}" r="2.2" fill="#69d4d0" opacity="0.95"/>`;
    svg += `<text x="${thy.x + 6}" y="${thy.y + 13.4}" class="svg-label small" text-anchor="middle">The Soul Well</text>`;
    svg += `<line x1="${thy.x}" y1="${thy.y}" x2="${thy.x + 6}" y2="${thy.y + 8}" stroke="#69d4d0" stroke-width="0.25"/>`;
    // Death's Gate — corrupted endgame door
    const DG = W.deathsGate;
    svg += `<g class="dg-node" data-tip="Death's Gate — corrupted, watched. The endgame door.">
      <circle cx="${DG.x}" cy="${DG.y}" r="${DG.r}" fill="none" stroke="#7a1f1f" stroke-width="0.6" stroke-dasharray="1.4 1"/>
      <circle cx="${DG.x}" cy="${DG.y}" r="${DG.r * 0.55}" fill="#2a0f0f"/>
      <line x1="${DG.x - DG.r}" y1="${DG.y - DG.r}" x2="${DG.x + DG.r}" y2="${DG.y + DG.r}" stroke="#7a1f1f" stroke-width="0.3"/>
      <line x1="${DG.x - DG.r}" y1="${DG.y + DG.r}" x2="${DG.x + DG.r}" y2="${DG.y - DG.r}" stroke="#7a1f1f" stroke-width="0.3"/>
      <text x="${DG.x}" y="${DG.y + DG.r + 3.4}" class="svg-label danger" text-anchor="middle">DEATH'S GATE — SEALED</text>
    </g>`;
    // realm nodes
    for (const n of nodes) {
      const c = colors[n.rm.id] || "#999";
      if (n.locked) {
        svg += `<g class="wheel-node locked" data-realm="${n.rm.id}">
          <circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="#2b2620" stroke="#57503f" stroke-width="0.4"/>
          <text x="${n.x}" y="${n.y - 0.5}" class="svg-lock" text-anchor="middle">🔒</text>
          <text x="${n.x}" y="${n.y + n.r * 0.55}" class="svg-name dim" text-anchor="middle">${n.rm.name}</text>
        </g>`;
      } else {
        svg += `<g class="wheel-node" data-realm="${n.rm.id}">
          <circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${c}" opacity="0.92" stroke="#e8d9b0" stroke-width="0.45"/>
          <circle cx="${n.x}" cy="${n.y}" r="${n.r * 0.72}" fill="none" stroke="#14100c" stroke-width="0.2" opacity="0.5"/>
          <text x="${n.x}" y="${n.y - 0.6}" class="svg-name" text-anchor="middle">${n.rm.name}</text>
          <text x="${n.x}" y="${n.y + 4.4}" class="svg-sub" text-anchor="middle">${n.rm.subtitle}</text>
        </g>`;
      }
    }
    svg += `</svg>`;
    wrap.innerHTML = `
      <div class="wheel-stage">${svg}</div>
      <aside class="wheel-side">
        <h2>The Realm Network</h2>
        <p class="lead">The Nexus at the center, the Labyrinth coiled around it, the four engineered worlds in their ring — and the Verdant Echo, the young realm the Wave answered into being. Death's Gate still stands: corrupted, watched, an endgame door. The living travel by the Soul Wells now.</p>
        <div class="wheel-legend">
          ${legendRow("#69a84f", "Thalenyr — starting realm")}
          ${legendRow("#7fb8d9", "Arianus-Sky · world of air")}
          ${legendRow("#e0a13c", "Pryan-Fire · world of fire (solar)")}
          ${legendRow("#c0563a", "Abarrach-Stone · the Fire Realm (lava)")}
          ${legendRow("#3fa89b", "Chelestra-Sea · world of water")}
          ${legendRow("#d9c47f", "The Nexus · paradise city, Fifth Gate")}
          ${legendRow("#6b4fa0", "The Labyrinth · sentient prison-maze")}
          ${legendRow("#7a1f1f", "Death's Gate · corrupted, endgame")}
        </div>
        <p class="hint">Click an unlocked realm to open its map. Locked realms grey out until your journey reaches them.</p>
      </aside>`;
    wrap.querySelectorAll(".wheel-node").forEach(g => {
      g.addEventListener("click", () => {
        const id = g.dataset.realm;
        if (!realmUnlocked(id)) { toast("This realm is still sealed to you. The Soul Wells have not opened that road."); return; }
        currentRealm = id; currentTab = "maps"; realmView = "lore"; render();
      });
    });
    return wrap;
  }
  function legendRow(color, label) {
    return `<div class="legend-row"><span class="dot" style="background:${color}"></span>${label}</div>`;
  }
  function starfield() {
    let s = "";
    let seed = 42;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) {
      const x = (rnd() * 100).toFixed(1), y = (rnd() * 100).toFixed(1), r = (rnd() * 0.16 + 0.05).toFixed(2);
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#e8d9b0" opacity="${(rnd() * 0.5 + 0.15).toFixed(2)}"/>`;
    }
    return s;
  }

  /* ---------------- REALM MAPS ---------------- */
  function renderMaps() {
    const wrap = el("section", "maps-wrap");
    const realm = D.realms.find(r => r.id === currentRealm);
    const locked = !realmUnlocked(realm.id);

    // realm chips
    const chips = el("div", "realm-chips");
    chips.innerHTML = D.realms.map(r => {
      const lk = !realmUnlocked(r.id);
      return `<button class="chip ${r.id === currentRealm ? "active" : ""} ${lk ? "locked" : ""}" data-realm="${r.id}">
        ${lk ? "🔒 " : ""}${r.name}</button>`;
    }).join("");
    chips.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
      const id = c.dataset.realm;
      // Sealed realms open too — their map shows, drowned under full fog (DIR-4/4a)
      currentRealm = id; selectedPoi = null; realmView = "lore"; render();
    }));
    wrap.appendChild(chips);

    if (locked) {
      const body = el("div", "map-body");
      const stage = el("div", "map-stage");
      const zoomer = el("div", "zoom-inner");
      zoomer.innerHTML = `<img class="map-img game-toned" src="${realm.map}" alt="${realm.name} map (sealed)" draggable="false">`;
      zoomer.appendChild(fogCanvas(realm, []));  // full fog, no holes — nothing charted yet
      stage.appendChild(zoomer);
      stage.appendChild(el("div", "sealed-overlay",
        `<h2>🔒 ${realm.name} is sealed</h2><p>The Soul Wells have not opened this road. The land lies under the smoke — its roads and cities stay hidden until your journey unlocks it.</p>`));
      body.appendChild(stage);
      wrap.appendChild(body);
      return wrap;
    }

    const body = el("div", "map-body");
    // --- map stage with zoom/pan; two views: lore (clean) / explore (pins+key+fog)
    const stage = el("div", "map-stage");
    const zoomer = el("div", "zoom-inner");
    zoomer.innerHTML = `<img class="map-img ${previewAll ? "" : "game-toned"}" src="${realm.map}" alt="${realm.name} map" draggable="false">`;

    const exploring = realmView === "explore";
    // fog-of-war smoke (explore view, all realms) — holes burned around discovered locations
    let fogHoles = null;
    if (exploring && !previewAll) {
      fogHoles = computeHoles(realm);
      zoomer.appendChild(fogCanvas(realm, fogHoles));
    }
    // markers (explore view only — the lore map stays clean for the book)
    if (exploring) {
      const marks = el("div", "marker-layer");
      for (const p of realm.pois) {
        let st = previewAll ? (poiStatus(realm.id, p.id) === "unknown" ? "explored" : poiStatus(realm.id, p.id)) : poiStatus(realm.id, p.id);
        if (!previewAll && st === "unknown") {
          st = inHole(p, fogHoles) ? "uncharted" : "fogged";
        }
        marks.appendChild(markerEl(realm, p, st));
      }
      zoomer.appendChild(marks);
    }
    stage.appendChild(zoomer);
    // view toggle + on-map key
    stage.appendChild(el("div", "view-toggle",
      `<button class="vt-btn ${realmView === "lore" ? "active" : ""}" data-view="lore">📜 Lore Map</button>
       <button class="vt-btn ${exploring ? "active" : ""}" data-view="explore">🧭 Explore</button>`));
    if (exploring) stage.appendChild(mapKey());
    stage.querySelectorAll(".vt-btn").forEach(b => b.addEventListener("click", () => {
      realmView = b.dataset.view; selectedPoi = null; render();
    }));
    attachZoomPan(stage, zoomer);
    body.appendChild(stage);

    // --- side panel: realm info + poi list/detail
    const side = el("aside", "map-side");
    side.innerHTML = `
      <h2>${realm.name}</h2>
      <div class="side-sub">${realm.subtitle}</div>
      <p class="lead">${realm.blurb}</p>
      <div class="law-card"><span class="law-name">${realm.lawName}</span><span class="law-text">${realm.lawText}</span></div>
      <div class="progress-line">${progressLine(realm)}</div>
      <h3>Locations</h3>
      <div class="poi-list">${poiListHTML(realm)}</div>`;
    if (editMode) side.appendChild(editPanel(realm));
    body.appendChild(side);

    // detail drawer
    if (selectedPoi) body.appendChild(detailDrawer(realm, selectedPoi));
    wrap.appendChild(body);
    return wrap;
  }

  function progressLine(realm) {
    const total = realm.pois.length;
    let ex = 0, co = 0;
    realm.pois.forEach(p => {
      const s = poiStatus(realm.id, p.id);
      if (s === "explored") ex++;
      if (s === "completed") { ex++; co++; }
    });
    const pct = Math.round((ex / total) * 100);
    return `<div class="progress-bar"><div class="fill" style="width:${previewAll ? 100 : pct}%"></div></div>
            <span class="progress-text">${previewAll ? "Preview — all locations visible" : `${ex}/${total} discovered · ${co} completed`}</span>`;
  }

  function poiListHTML(realm) {
    return realm.pois.map(p => {
      const st = poiStatus(realm.id, p.id);
      if (!previewAll && st === "unknown") return `<div class="poi-row hidden-row">??? — <em>uncharted</em></div>`;
      const st2 = previewAll && st === "unknown" ? "explored" : st;
      return `<div class="poi-row" data-poi="${p.id}">
        <span class="poi-icon t-${p.type}">${iconFor(p.type)}</span>
        <span class="poi-name">${st2 === "rumored" ? p.name + " (rumor)" : p.name}</span>
        <span class="status s-${st2}">${st2}</span>
      </div>`;
    }).join("");
  }

  function markerEl(realm, p, st) {
    const m = el("button", `marker t-${p.type} s-${st}`);
    m.style.left = p.x + "%";
    m.style.top = p.y + "%";
    const obscured = (st === "fogged" || st === "uncharted");
    m.innerHTML = `<span class="mk-icon">${st === "completed" ? "✔" : obscured ? "?" : iconFor(p.type)}</span><span class="mk-label">${p.name}</span>`;
    m.title = obscured ? "Uncharted location" : `${p.name} — ${p.type}`;
    m.addEventListener("click", (e) => {
      if (m.closest(".map-stage")?._suppressClick) return;
      if (obscured && !editMode) { toast("Uncharted — something is there, but you can't make it out through the smoke. Explore the region to reveal it."); return; }
      selectedPoi = p; render();
    });
    return m;
  }

  function detailDrawer(realm, p) {
    const st = poiStatus(realm.id, p.id);
    const d = el("div", "detail-drawer");
    d.innerHTML = `
      <button class="close" id="closeDrawer">✕</button>
      <div class="d-type t-${p.type}">${iconFor(p.type)} ${p.type.toUpperCase()}</div>
      <h3>${p.name}</h3>
      <div class="d-region">${p.region} · ${realm.name}</div>
      <span class="status s-${st} big">${st}</span>
      <p>${p.desc}</p>
      ${editMode ? `
      <label class="edit-line">Set status:
        <select id="poiStatusSel">
          ${["unknown", "rumored", "explored", "completed"].map(s =>
            `<option value="${s}" ${s === st ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </label>` : ""}`;
    d.querySelector("#closeDrawer").addEventListener("click", () => { selectedPoi = null; render(); });
    const sel = d.querySelector("#poiStatusSel");
    if (sel) sel.addEventListener("change", e => {
      state.pois[`${realm.id}.${p.id}`] = e.target.value; saveState(); render();
    });
    return d;
  }

  function mapKey() {
    const k = el("div", "map-key");
    k.innerHTML = `<div class="mk-title">KEY</div>
      <div class="mk-row"><span class="poi-icon t-capital">★</span> Capital</div>
      <div class="mk-row"><span class="poi-icon t-city">●</span> City / Port</div>
      <div class="mk-row"><span class="poi-icon t-dungeon">▲</span> Dungeon / Peril</div>
      <div class="mk-row"><span class="poi-icon t-poi">◆</span> Point of Interest</div>
      <div class="mk-row"><span class="poi-icon t-well">✦</span> Soul Well</div>
      <div class="mk-row"><span class="poi-icon t-gate">⬗</span> Gate</div>
      <div class="mk-sep"></div>
      <div class="mk-row"><span class="sw sw-completed"></span> Completed</div>
      <div class="mk-row"><span class="sw sw-explored"></span> Explored</div>
      <div class="mk-row"><span class="sw sw-rumored"></span> Rumored</div>
      <div class="mk-row"><span class="sw sw-fogged"></span> Uncharted</div>`;
    return k;
  }

  /* progressive reveal: organic smoke veil with soft holes burned
     around explored/completed locations (small faint holes at rumors).
     No grid — the smoke recedes naturally as the player discovers. */
  function computeHoles(realm) {
    const holes = [];
    for (const p of realm.pois) {
      const s = poiStatus(realm.id, p.id);
      if (s === "completed") holes.push({ x: p.x, y: p.y, r: 12, strength: 0.97 });
      else if (s === "explored") holes.push({ x: p.x, y: p.y, r: 10, strength: 0.95 });
      else if (s === "rumored") holes.push({ x: p.x, y: p.y, r: 6, strength: 0.55 });
    }
    // the arrival site always breathes a little clear air
    const well = realm.pois.find(p => p.type === "well");
    if (well && !holes.some(h => h.x === well.x && h.y === well.y))
      holes.push({ x: well.x, y: well.y, r: 8, strength: 0.8 });
    return holes;
  }

  function inHole(p, holes) {
    return (holes || []).some(h =>
      h.strength >= 0.9 && Math.hypot(p.x - h.x, (p.y - h.y) * 1.6) < h.r * 0.75);
  }

  function fogCanvas(realm, holes) {
    const W = 1200, H = 675;
    const c = el("canvas", "fog-canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");
    // seeded rng so the smoke is stable between renders
    let seed = 1337;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // base smoke veil — map shape stays visible through it
    x.fillStyle = "rgba(112, 114, 124, 0.58)";
    x.fillRect(0, 0, W, H);
    // drifting smoke texture: large soft blobs, lighter and darker
    for (let i = 0; i < 90; i++) {
      const bx = rnd() * W, by = rnd() * H, br = 60 + rnd() * 160;
      const light = rnd() > 0.5;
      const a = 0.05 + rnd() * 0.10;
      const g = x.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, light ? `rgba(196,198,206,${a})` : `rgba(70,72,80,${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.beginPath(); x.arc(bx, by, br, 0, Math.PI * 2); x.fill();
    }
    // wisps
    for (let i = 0; i < 40; i++) {
      const bx = rnd() * W, by = rnd() * H, bw = 90 + rnd() * 200, bh = 20 + rnd() * 40;
      const a = 0.04 + rnd() * 0.06;
      const g = x.createRadialGradient(bx, by, 0, bx, by, bw);
      g.addColorStop(0, `rgba(210,212,220,${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.save(); x.translate(bx, by); x.scale(1, bh / bw); x.translate(-bx, -by);
      x.fillStyle = g;
      x.beginPath(); x.arc(bx, by, bw, 0, Math.PI * 2); x.fill();
      x.restore();
    }
    // burn soft holes where the player has been
    x.globalCompositeOperation = "destination-out";
    for (const h of holes) {
      const hx = h.x / 100 * W, hy = h.y / 100 * H, hr = h.r / 100 * W;
      const g = x.createRadialGradient(hx, hy, 0, hx, hy, hr);
      g.addColorStop(0, `rgba(0,0,0,${h.strength})`);
      g.addColorStop(0.65, `rgba(0,0,0,${h.strength * 0.75})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g;
      x.beginPath(); x.arc(hx, hy, hr, 0, Math.PI * 2); x.fill();
    }
    return c;
  }

  function iconFor(type) {
    return { capital: "★", city: "●", dungeon: "▲", poi: "◆", well: "✦", gate: "⬗" }[type] || "◆";
  }

  /* ---------------- zoom / pan ---------------- */
  function attachZoomPan(stage, zoomer) {
    let scale = 1, tx = 0, ty = 0;
    const apply = () => { zoomer.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
    stage.addEventListener("wheel", e => {
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const old = scale;
      scale = Math.min(5, Math.max(1, scale * (e.deltaY < 0 ? 1.18 : 1 / 1.18)));
      const k = scale / old;
      tx = mx - (mx - tx) * k; ty = my - (my - ty) * k;
      if (scale === 1) { tx = 0; ty = 0; }
      apply();
    }, { passive: false });
    let drag = null, moved = 0;
    stage.addEventListener("pointerdown", e => {
      // Interactive children (view toggle, markers, keys) must keep their
      // clicks — capturing the pointer here would retarget the click to the
      // stage and silently swallow it.
      if (e.target.closest("button, a, input, select, textarea, .marker")) return;
      drag = { x: e.clientX - tx, y: e.clientY - ty }; moved = 0;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", e => {
      if (!drag) return;
      const nx = e.clientX - drag.x, ny = e.clientY - drag.y;
      moved = Math.max(moved, Math.hypot(nx - tx, ny - ty));
      tx = nx; ty = ny; apply();
    });
    stage.addEventListener("pointerup", () => {
      drag = null;
      stage._suppressClick = moved > 6;
      setTimeout(() => { stage._suppressClick = false; }, 0);
    });
    stage.addEventListener("dblclick", () => { scale = 1; tx = 0; ty = 0; apply(); });
  }

  /* ---------------- LORE BOOK ---------------- */
  let bookPage = "cover";
  function renderBook() {
    const wrap = el("section", "book-wrap");
    const toc = el("nav", "book-toc");
    const entries = [
      ["cover", "Cover"], ...D.realms.map(r => ["realm:" + r.id, r.name]),
      ["races", "The Peoples of Thalenyr"], ["gates", "The Gates and the Wells"]
    ];
    toc.innerHTML = entries.map(([id, label]) =>
      `<button class="toc-btn ${bookPage === id ? "active" : ""}" data-page="${id}">${label}</button>`).join("");
    toc.querySelectorAll(".toc-btn").forEach(b => b.addEventListener("click", () => { bookPage = b.dataset.page; render(); }));
    wrap.appendChild(toc);

    const page = el("article", "book-page");
    if (bookPage === "cover") {
      page.innerHTML = `
        <div class="book-cover">
          <img src="assets/M-001_painted_cosmology.png" alt="The Cosmological Wheel">
          <h1>The Lore of the Realms</h1>
          <p class="lead">A traveller's book of the worlds — what is known, what is believed, and what the Wells remember. Pages for realms you have not reached remain sealed.</p>
        </div>`;
    } else if (bookPage.startsWith("realm:")) {
      const realm = D.realms.find(r => r.id === bookPage.slice(6));
      if (!realmUnlocked(realm.id)) {
        page.innerHTML = `<div class="sealed-page"><h1>🔒 Sealed</h1><p>The pages for ${realm.name} are written in ink that only an unlocked road can read.</p></div>`;
      } else {
        page.innerHTML = `
          <img class="book-banner" src="${realm.banner || realm.map}" alt="${realm.name}">
          <h1>${realm.name}</h1>
          <div class="side-sub">${realm.subtitle}</div>
          <div class="law-card"><span class="law-name">${realm.lawName}</span><span class="law-text">${realm.lawText}</span></div>
          ${realm.lore.map(p => `<p>${p}</p>`).join("")}
          <h3>Gazetteer</h3>
          <ul class="gazetteer">${realm.pois.map(p =>
            `<li><strong>${p.name}</strong> <span class="g-type">(${p.type}, ${p.region})</span> — ${p.desc}</li>`).join("")}
          </ul>`;
      }
    } else if (bookPage === "races") {
      page.innerHTML = `<h1>The Peoples of Thalenyr</h1>
        <p class="lead">Every mortal soul in the Verdant Echo arrived through the Soul Well, or descends from one who did. The two ancient powers — the shapers and the rune-marked — are not here. They are sealed in the Labyrinth.</p>
        ${D.races.map(r => `<div class="race-card"><h2>${r.name}</h2><div class="race-tag">${r.tagline}</div><p>${r.text}</p></div>`).join("")}`;
    } else if (bookPage === "gates") {
      const g = D.gatesLore[0];
      page.innerHTML = `<h1>${g.title}</h1>${g.paragraphs.map(p => `<p>${p}</p>`).join("")}`;
    }
    wrap.appendChild(page);
    return wrap;
  }

  /* ---------------- GAME STATE DRAWER ---------------- */
  function renderStateDrawer() {
    const dr = el("div", "state-drawer");
    dr.innerHTML = `
      <h3>Game State <span class="hint-inline">(what the game writes)</span></h3>
      <label class="edit-toggle"><input type="checkbox" id="editMode" ${editMode ? "checked" : ""}> Edit mode (set POI statuses on maps)</label>
      <h4>Realm access</h4>
      ${D.realms.map(r => `
        <label class="realm-toggle"><input type="checkbox" data-realm-toggle="${r.id}" ${state.realms[r.id] && state.realms[r.id].unlocked ? "checked" : ""}> ${r.name}</label>`).join("")}
      <div class="drawer-actions">
        <button class="btn" id="exportBtn">Export JSON</button>
        <button class="btn ghost" id="importBtn">Import</button>
        <button class="btn danger" id="resetBtn">Reset</button>
      </div>
      <textarea id="stateIO" placeholder="State JSON appears here for export/import"></textarea>`;
    dr.querySelector("#editMode").addEventListener("change", e => { editMode = e.target.checked; render(); dr.classList.add("open"); });
    dr.querySelectorAll("[data-realm-toggle]").forEach(t => t.addEventListener("change", () => {
      const id = t.dataset.realmToggle;
      state.realms[id] = state.realms[id] || {};
      state.realms[id].unlocked = t.checked; saveState(); render();
      document.querySelector(".state-drawer").classList.add("open");
    }));
    dr.querySelector("#exportBtn").addEventListener("click", () => {
      dr.querySelector("#stateIO").value = JSON.stringify(state, null, 2);
    });
    dr.querySelector("#importBtn").addEventListener("click", () => {
      try { state = JSON.parse(dr.querySelector("#stateIO").value); saveState(); render(); document.querySelector(".state-drawer").classList.add("open"); }
      catch (e) { toast("Invalid JSON."); }
    });
    dr.querySelector("#resetBtn").addEventListener("click", () => {
      state = JSON.parse(JSON.stringify(D.defaultState)); saveState(); render();
      document.querySelector(".state-drawer").classList.add("open");
    });
    return dr;
  }

  function editPanel(realm) {
    const p = el("div", "edit-panel");
    p.innerHTML = `<h4>POI statuses — ${realm.name}</h4>` + realm.pois.map(po => {
      const st = poiStatus(realm.id, po.id);
      return `<label class="edit-line">${po.name}
        <select data-edit-poi="${po.id}">
          ${["unknown", "rumored", "explored", "completed"].map(s =>
            `<option value="${s}" ${s === st ? "selected" : ""}>${s}</option>`).join("")}
        </select></label>`;
    }).join("");
    p.querySelectorAll("[data-edit-poi]").forEach(sel => sel.addEventListener("change", () => {
      state.pois[`${realm.id}.${sel.dataset.editPoi}`] = sel.value; saveState(); render();
      document.querySelector(".state-drawer")?.classList.add("open");
    }));
    return p;
  }

  /* ---------------- utils ---------------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = el("div", "toast"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------------- public API ---------------- */
  window.SOULDRIFTER_ATLAS = {
    getState: () => JSON.parse(JSON.stringify(state)),
    setState: (obj) => { state = obj; saveState(); render(); },
    unlockRealm: (id) => { state.realms[id] = state.realms[id] || {}; state.realms[id].unlocked = true; saveState(); render(); },
    setPoi: (realmId, poiId, status) => { state.pois[`${realmId}.${poiId}`] = status; saveState(); render(); },
    exportJSON: () => JSON.stringify(state, null, 2),
    importJSON: (str) => { state = JSON.parse(str); saveState(); render(); },
    reset: () => { state = JSON.parse(JSON.stringify(D.defaultState)); saveState(); render(); }
  };

  /* The game writes exploration to the same localStorage key; when the atlas
     panel is open in its iframe, refresh live on every write. */
  window.addEventListener("storage", (event) => {
    if (event.key === LS_KEY) { state = loadState(); render(); }
  });

  /* deep links: #wheel · #maps · #maps:<realmId> · #book · #book:<page> */
  (function applyHash() {
    const h = (location.hash || "").replace(/^#/, "");
    if (!h) return;
    const [tab, arg] = h.split(":");
    if (tab === "maps") { currentTab = "maps"; if (arg && D.realms.some(r => r.id === arg)) currentRealm = arg;
      if (h.includes("explore")) realmView = "explore"; }
    else if (tab === "book") { currentTab = "book"; if (arg) bookPage = arg; }
    else if (tab === "wheel") currentTab = "wheel";
    if (h.includes("demo")) { state = demoProgress(); previewAll = false; }
    else if (h.includes("nopreview")) previewAll = false;
    else if (h.includes("preview")) previewAll = true;
  })();

  /* ephemeral mid-game demo state for review (not persisted) */
  function demoProgress() {
    const s = JSON.parse(JSON.stringify(D.defaultState));
    const seeds = {
      arianus:   { completed: ["lirawen", "brulithel"], explored: ["glimmerhold", "greatengine"], rumored: ["skyreach", "roost"] },
      pryan:     { completed: ["heartfire"], explored: ["eleniel", "canopymarket"], rumored: ["sunspire", "tyrantsroost"] },
      abarrach:  { completed: ["kairnnecros"], explored: ["ashmarket", "smoldering"], rumored: ["xorkaal", "kilnfields"] },
      chelestra: { completed: ["seasun"], explored: ["velshire", "thalassir"], rumored: ["gilded", "pearlward"] },
      labyrinth: { completed: ["howling"], explored: ["turning", "trickgate"], rumored: ["falsehaven", "saltcourts"] },
      nexus:     { completed: ["library"], explored: ["gateair"], rumored: ["annex"] }
    };
    for (const [rid, seed] of Object.entries(seeds)) {
      s.realms[rid] = { unlocked: true };
      seed.completed.forEach(p => s.pois[`${rid}.${p}`] = "completed");
      seed.explored.forEach(p => s.pois[`${rid}.${p}`] = "explored");
      seed.rumored.forEach(p => s.pois[`${rid}.${p}`] = "rumored");
    }
    return s;
  }

  render();
})();
