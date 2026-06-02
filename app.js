/* FIBREPRINT — app logic. Loads data from /data and renders the tool.
   Data is the source of truth; this file should rarely need editing to add materials. */

const ATTR_LABELS = {
  durability: "Durability",
  water_resist: "Water resistance",
  breathability: "Breathability",
  biodegradable: "Biodegradability",
  microplastic_safe: "Microplastic safety",
};

const PRIORITIES = [
  { id: "carbon",       name: "Lowest carbon",      ico: "🌍" },
  { id: "cost",         name: "Lowest cost",        ico: "💷" },
  { id: "durability",   name: "Most durable",       ico: "🛡️" },
  { id: "water",        name: "Least water",        ico: "💧" },
  { id: "biodegradable",name: "Most biodegradable", ico: "🍂" },
];

/* loaded data */
let MATERIALS = [], PRODUCTS = [], SOURCES = {};
let M = {};          // id -> material
let ALTS = {};       // conventional id -> [alternative ids]
let PRODBYFAM = {};  // family -> [products]
const CONV_ORDER = ["cotton", "polyester", "nylon", "acrylic", "wool", "viscose", "leather"];

let state = { mode: "compare", conv: null, prod: null, third: null };
let overrides = {};
const matVal = (m, f) => overrides[m.id]?.[f] ?? m[f];
const isEdited = (id, f) => overrides[id]?.[f] != null;

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const fmt = n => n >= 100 ? Math.round(n).toLocaleString() : n >= 10 ? n.toFixed(0) : n.toFixed(1);
const money = n => "£" + (n >= 10 ? n.toFixed(0) : n.toFixed(2));
const pctTxt = n => (n >= 0 ? "−" : "+") + Math.abs(Math.round(n)) + "%"; // a saving shows as − (less)

function confBadge(level) {
  return `<span class="conf ${level}"><span class="dot"></span>${level} confidence</span>`;
}
function wasteBadge(m) {
  return m.wasteStream ? `<span class="waste">♻ waste-stream</span>` : "";
}

function chip(label, ico, pressed, cls, opts = {}) {
  const b = el("button", "chip " + (cls || ""));
  b.setAttribute("aria-pressed", pressed ? "true" : "false");
  if (opts.disabled) b.disabled = true;
  b.innerHTML = `<span class="ico">${ico}</span> ${label}`
    + (opts.leaf ? ` <span class="leaf">♻</span>` : "")
    + (opts.soon ? ` <span class="soon">no data</span>` : "");
  return b;
}

/* ---------- load ---------- */
async function load() {
  try {
    const [mats, prods, srcs] = await Promise.all([
      fetch("./data/materials.json").then(r => r.json()),
      fetch("./data/products.json").then(r => r.json()),
      fetch("./data/sources.json").then(r => r.json()),
    ]);
    MATERIALS = mats; PRODUCTS = prods; SOURCES = srcs;
    MATERIALS.forEach(m => { M[m.id] = m; });
    // build ALTS from each alternative's `replaces`
    MATERIALS.filter(m => m.kind === "alternative").forEach(alt => {
      (alt.replaces || []).forEach(cid => { (ALTS[cid] = ALTS[cid] || []).push(alt.id); });
    });
    PRODUCTS.forEach(p => { (PRODBYFAM[p.family] = PRODBYFAM[p.family] || []).push(p); });
    renderMethod();
    renderAll();
  } catch (err) {
    $("#result").innerHTML = `<div class="card" style="padding:22px">
      <p class="blab" style="color:var(--clay)">⚑ Could not load data files</p>
      <p style="font-size:14px;color:var(--ink-soft);line-height:1.6">
      Browsers block <code>fetch()</code> of local files opened with <code>file://</code>.
      Run a local server from the project folder and open the served URL:</p>
      <pre style="background:var(--paper-2);padding:12px;border-radius:8px;font-size:13px;overflow:auto">python3 -m http.server 8000
# then open http://localhost:8000</pre>
      <p style="font-size:13px;color:var(--ink-faint)">On GitHub Pages it just works — no server needed.</p>
    </div>`;
    console.error(err);
  }
}

/* ---------- controls ---------- */
function renderConv() {
  const host = $("#convChips"); host.innerHTML = "";
  CONV_ORDER.forEach(id => {
    if (!M[id]) return;
    const m = M[id];
    const c = chip(m.name, m.icon, state.conv === id, "conv");
    c.onclick = () => { state.conv = id; state.prod = null; state.third = null; renderAll(); };
    host.appendChild(c);
  });
  // fur — honest "no data" disabled chip
  const fur = chip("Fur (animal)", "🦊", false, "conv", { disabled: true, soon: true });
  fur.title = "Real-fur LCA data is too sparse and contested for a credible estimate. Deliberately left out.";
  host.appendChild(fur);
}

function renderProd() {
  const host = $("#prodChips"); host.innerHTML = "";
  if (!state.conv) { host.innerHTML = `<span class="hint">Pick a material first.</span>`; return; }
  const mat = M[state.conv];
  const excluded = new Set(mat.excludeGarments || []);
  const visible = (PRODBYFAM[mat.family] || []).filter(p => !excluded.has(p.id));
  if (state.prod && excluded.has(state.prod)) state.prod = visible[0]?.id ?? null;
  visible.forEach(p => {
    const c = chip(p.name, p.icon, state.prod === p.id, "");
    c.onclick = () => { state.prod = p.id; renderAll(); };
    host.appendChild(c);
  });
}

function renderThird() {
  const host = $("#thirdChips"); host.innerHTML = "";
  $("#step3label").textContent = state.mode === "compare" ? "Cleaner alternative" : "Your top priority";
  if (!state.conv) { host.innerHTML = `<span class="hint">Pick a material first.</span>`; return; }
  if (state.mode === "compare") {
    (ALTS[state.conv] || []).forEach(id => {
      const m = M[id];
      const c = chip(m.name, m.icon, state.third === id, "", { leaf: m.wasteStream });
      c.onclick = () => { state.third = id; renderAll(); };
      host.appendChild(c);
    });
    if (!(ALTS[state.conv] || []).length) host.innerHTML = `<span class="hint">No alternatives mapped yet for this material.</span>`;
  } else {
    PRIORITIES.forEach(p => {
      const c = chip(p.name, p.ico, state.third === p.id, "");
      c.onclick = () => { state.third = p.id; renderAll(); };
      host.appendChild(c);
    });
  }
}

/* ---------- compute ---------- */
function product() { return PRODUCTS.find(p => p.id === state.prod); }

function metricCard(lab, valHTML, subHTML, edited) {
  const m = el("div", "metric");
  const editTag = edited ? ' <span class="edited-tag">edited</span>' : '';
  m.innerHTML = `<p class="mlab">${lab}${editTag}</p><div class="mval">${valHTML}</div><div class="msub">${subHTML}</div>`;
  return m;
}

/* ---------- compare mode ---------- */
function renderCompare() {
  const r = $("#result");
  if (!(state.conv && state.prod && state.third)) {
    r.innerHTML = `<p class="hint">Select a material, a product, and an alternative to compare.</p>`; return;
  }
  const c = M[state.conv], a = M[state.third], p = product(), q = p.material_qty, unit = p.unit;

  const co2 = { c: matVal(c,'co2') * q, a: matVal(a,'co2') * q };
  const cost = { c: matVal(c,'cost') * q, a: matVal(a,'cost') * q };
  const water = { c: matVal(c,'water') * q, a: matVal(a,'water') * q };

  const co2save = co2.c - co2.a, co2pct = (co2save / co2.c) * 100;
  const costdelta = cost.a - cost.c, costpct = (costdelta / cost.c) * 100;
  const watersave = water.c - water.a, waterpct = (watersave / water.c) * 100;

  const co2ed = isEdited(c.id,'co2') || isEdited(a.id,'co2');
  const costed = isEdited(c.id,'cost') || isEdited(a.id,'cost');
  const watered = isEdited(c.id,'water') || isEdited(a.id,'water');

  const co2cls = co2save >= 0 ? "good" : "bad";
  const costcls = costdelta <= 0 ? "good" : "bad";

  const maxc = Math.max(co2.c, co2.a);
  const wc = (co2.c / maxc * 100).toFixed(1), wa = (co2.a / maxc * 100).toFixed(1);

  let attrHTML = "";
  Object.keys(ATTR_LABELS).forEach(k => {
    const cv = c.attributes[k], av = a.attributes[k], delta = av - cv;
    const dcls = delta > 0 ? "up" : delta < 0 ? "down" : "same";
    const dtxt = delta > 0 ? `+${delta} better` : delta < 0 ? `${delta} worse` : "same";
    let pips = "";
    for (let i = 1; i <= 5; i++) pips += `<span class="pip ${i <= av ? "fill to" : ""}"></span>`;
    attrHTML += `<div class="attr"><div class="aname"><span>${ATTR_LABELS[k]}</span><span class="adelta ${dcls}">${dtxt}</span></div><div class="pips">${pips}</div></div>`;
  });

  const caveats = [
    `<strong>${a.name}</strong> ${confBadge(a.confidence)} ${wasteBadge(a)} — ${a.note}`,
    `<strong>${c.name}</strong> ${confBadge(c.confidence)} — ${c.note}`,
  ];
  if (co2save < 0) caveats.unshift(`⚠️ This "alternative" is actually <strong>higher-carbon</strong> than the conventional material here — a real example of why you check the numbers.`);

  r.innerHTML = `
   <div class="card">
     <div class="card-top">
       <div class="swapcell from">
         <p class="lab">Replacing</p>
         <p class="name">${c.icon} ${c.name}</p>
         <p class="feedstock">from ${c.feedstock}</p>
         <span class="prodtag">${p.icon} ${p.name} · ~${q} ${unit}</span>
       </div>
       <div class="arrowcell">→</div>
       <div class="swapcell to">
         <p class="lab">With</p>
         <p class="name">${a.icon} ${a.name}</p>
         <p class="feedstock">from ${a.feedstock}</p>
         <span class="prodtag">per ${p.name.toLowerCase()}</span>
       </div>
     </div>

     <div class="metrics">
       ${metricCard("Carbon", `<span class="${co2cls}">${pctTxt(co2pct)}</span>`,
        `${co2cls === "good" ? "saves" : "adds"} ~${fmt(Math.abs(co2save))} kg CO₂e · ${fmt(co2.c)}→${fmt(co2.a)}`, co2ed).outerHTML}
       ${metricCard("Material cost", `<span class="${costcls}">${costdelta <= 0 ? "−" : "+"}${money(Math.abs(costdelta))}</span>`,
        `${costcls === "good" ? "cheaper" : "pricier"} · ${money(cost.c)}→${money(cost.a)} (${costdelta <= 0 ? "−" : "+"}${Math.abs(Math.round(costpct))}%)`, costed).outerHTML}
       ${metricCard("Water", `<span class="${watersave >= 0 ? "good" : "bad"}">${pctTxt(waterpct)}</span>`,
        `${watersave >= 0 ? "saves" : "adds"} ~${fmt(Math.abs(watersave))} L · ${fmt(water.c)}→${fmt(water.a)}`, watered).outerHTML}
     </div>

     <div class="bars">
       <p class="blab">Carbon, per ${p.name.toLowerCase()} (kg CO₂e)</p>
       <div class="barrow"><span class="bname">${c.name.split(" ")[0]}…</span>
         <div class="bartrack"><div class="barfill conv" style="width:${wc}%"></div></div>
         <span class="barval">${fmt(co2.c)} kg</span></div>
       <div class="barrow"><span class="bname">${a.name.split(" ")[0]}…</span>
         <div class="bartrack"><div class="barfill alt" style="width:${wa}%"></div></div>
         <span class="barval">${fmt(co2.a)} kg</span></div>
     </div>

     <div class="attrs">
       <p class="blab">Performance vs ${c.name.toLowerCase()} (filled = alternative's score / 5)</p>
       <div class="attrgrid">${attrHTML}</div>
     </div>

     <div class="caveats">
       <p class="blab">⚑ Read before quoting these numbers</p>
       <ul>${caveats.map(x => `<li>${x}</li>`).join("")}</ul>
     </div>
   </div>`;
}

/* ---------- recommend mode ---------- */
function renderRecommend() {
  const r = $("#result");
  if (!(state.conv && state.prod && state.third)) {
    r.innerHTML = `<p class="hint">Select a material, a product, and a priority to rank the alternatives.</p>`; return;
  }
  const conv = M[state.conv], p = product(), q = p.material_qty, unit = p.unit, pr = state.third;

  const rows = (ALTS[state.conv] || []).map(id => {
    const a = M[id], co2 = matVal(a,'co2') * q, cost = matVal(a,'cost') * q, water = matVal(a,'water') * q;
    let score, val, uu;
    if (pr === "carbon") { score = -co2; val = fmt(co2); uu = "kg CO₂e"; }
    else if (pr === "cost") { score = -cost; val = money(cost); uu = "material £"; }
    else if (pr === "water") { score = -water; val = fmt(water); uu = "L water"; }
    else if (pr === "durability") { score = a.attributes.durability; val = a.attributes.durability + "/5"; uu = "durability"; }
    else { score = a.attributes.biodegradable; val = a.attributes.biodegradable + "/5"; uu = "biodegradability"; }
    const anyEdited = isEdited(id,'co2') || isEdited(id,'cost') || isEdited(id,'water');
    return { id, a, co2, cost, water, score, val, uu, anyEdited };
  }).sort((x, y) => y.score - x.score);

  const prName = PRIORITIES.find(x => x.id === pr).name.toLowerCase();

  function tradeoff(w) {
    const a = w.a, notes = [];
    if (pr !== "cost" && matVal(a,'cost') * q > matVal(conv,'cost') * q * 1.15) notes.push("costs more than the conventional material");
    if (pr !== "durability" && a.attributes.durability <= 2) notes.push("lower durability");
    if (pr !== "biodegradable" && a.attributes.biodegradable <= 2) notes.push("limited biodegradability");
    if (a.attributes.microplastic_safe <= 1) notes.push("still sheds microplastics");
    if (a.confidence === "low") notes.push("low-confidence data");
    return notes.length ? "Trade-off: " + notes.slice(0, 2).join(" · ") : "Well-rounded on the other axes too.";
  }

  r.innerHTML = `
   <div class="ranklist">
     <p class="hint" style="margin-bottom:2px">Best alternatives to <strong>${conv.name}</strong> for a <strong>${p.name.toLowerCase()}</strong>, ranked by <strong>${prName}</strong> (~${q} ${unit}):</p>
     ${rows.map((w, i) => `
       <div class="rankrow ${i === 0 ? "win" : ""}">
         <div class="pos">${i + 1}</div>
         <div class="rmid">
           <p class="rname">${w.a.icon} ${w.a.name} ${i === 0 ? '<span class="winflag">best for ' + prName + '</span>' : ''} ${w.anyEdited ? '<span class="edited-tag">edited</span>' : ''} ${wasteBadge(w.a)} ${confBadge(w.a.confidence)}</p>
           <p class="rwhy">${i === 0 ? tradeoff(w) : w.a.note}</p>
         </div>
         <div class="rmet"><div class="rv">${w.val}</div><div class="ru">${w.uu}</div></div>
       </div>`).join("")}
   </div>`;
}

/* ---------- methodology ---------- */
function renderMethod() {
  const t = $("#dataTable");
  t.innerHTML = `<thead><tr><th>Material</th><th>Family</th><th>CO₂e</th><th>Cost</th><th>Water</th><th>Confidence</th></tr></thead><tbody>`
    + MATERIALS.map(m => {
      const u = m.family === "fabric" ? "/kg" : "/m²";
      return `<tr><td>${m.icon} ${m.name} ${m.wasteStream ? "♻" : ""}</td><td>${m.family}</td>
        <td class="mn">${m.co2}${u}</td><td class="mn">£${m.cost}${u}</td>
        <td class="mn">${m.water.toLocaleString()} L${u}</td>
        <td>${confBadge(m.confidence)}</td></tr>`;
    }).join("") + `</tbody>`;

  const used = new Set();
  MATERIALS.forEach(m => (m.sources || []).forEach(s => used.add(s)));
  $("#srcList").innerHTML = [...used]
    .filter(k => SOURCES[k])
    .map(k => `• <a href="${SOURCES[k].url}" target="_blank" rel="noopener">${SOURCES[k].label}</a>`)
    .join("<br>");
}

/* ---------- assumptions ---------- */
function renderAssumptions() {
  const host = $("#assumptions");
  if (!(state.conv && state.prod && state.third)) { host.innerHTML = ""; return; }

  const wasOpen = host.querySelector("details")?.open;
  const ids = state.mode === "compare"
    ? [state.conv, state.third]
    : [state.conv, ...(ALTS[state.conv] || [])];

  const conv = M[state.conv];
  const unitLabel = conv.family === "fabric" ? "/kg" : "/m²";
  const anyOverride = ids.some(id => overrides[id] && Object.keys(overrides[id]).length);

  function fieldHTML(m, f, label, step) {
    const edited = isEdited(m.id, f);
    return `<label class="assume-field${edited ? " overridden" : ""}">
      <span class="afl">${label}</span>
      <input type="number" min="0" step="${step}" data-id="${m.id}" data-field="${f}" value="${matVal(m, f)}">
      ${edited ? '<span class="edited-tag">edited</span>' : ''}
    </label>`;
  }

  const matHTML = ids.map(id => {
    const m = M[id];
    const hasOv = overrides[m.id] && Object.keys(overrides[m.id]).length;
    return `<div class="assume-mat">
      <p class="assume-name">${m.icon} ${m.name}${hasOv ? ` <button class="reset-mat" data-id="${m.id}">↺ reset</button>` : ""}</p>
      <div class="assume-fields">
        ${fieldHTML(m, "co2", `CO₂e ${unitLabel}`, "0.1")}
        ${fieldHTML(m, "cost", `Cost £${unitLabel}`, "0.01")}
        ${fieldHTML(m, "water", `Water L${unitLabel}`, "1")}
      </div>
    </div>`;
  }).join("");

  host.innerHTML = `<details class="assume-panel"${wasOpen ? " open" : ""}>
    <summary>Edit assumptions <span class="plus">+</span>${anyOverride ? ' <span class="overrides-active">overrides active</span>' : ""}</summary>
    <div class="assume-body">
      <p class="assume-note">Override any figure to recompute results live. Values stay in memory only — never saved or stored.</p>
      ${anyOverride ? '<button class="reset-all-btn">↺ Reset all to sourced defaults</button>' : ""}
      <div class="assume-grid">${matHTML}</div>
    </div>
  </details>`;

  host.querySelectorAll("input[data-id]").forEach(inp => {
    inp.addEventListener("change", () => {
      const id = inp.dataset.id, f = inp.dataset.field;
      const v = parseFloat(inp.value);
      if (!isNaN(v) && v >= 0) {
        (overrides[id] = overrides[id] || {})[f] = v;
      } else {
        if (overrides[id]) { delete overrides[id][f]; if (!Object.keys(overrides[id]).length) delete overrides[id]; }
      }
      renderAll();
    });
  });

  host.querySelectorAll(".reset-mat").forEach(btn => {
    btn.addEventListener("click", e => { e.preventDefault(); delete overrides[btn.dataset.id]; renderAll(); });
  });

  const resetAll = host.querySelector(".reset-all-btn");
  if (resetAll) resetAll.addEventListener("click", () => { overrides = {}; renderAll(); });
}

/* ---------- orchestrate ---------- */
function renderAll() {
  renderConv(); renderProd(); renderThird();
  if (state.mode === "compare") renderCompare(); else renderRecommend();
  renderAssumptions();
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    state.mode = tab.dataset.mode; state.third = null; renderAll();
  };
});

load();
