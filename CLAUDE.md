# CLAUDE.md — working brief for FIBREPRINT

This file orients any agent (and any human) working on this repo. Read it before making changes.

## What this is
A small, **static** web tool that compares conventional fashion materials (cotton, polyester, nylon, acrylic, wool, viscose, bovine leather) against waste-stream and bio-based alternatives across **carbon, water, material cost, and performance**. Two modes: **Compare** (user picks the alternative) and **Find the best alternative** (user picks a priority; alternatives are ranked).

## The one thing that makes this worth building: honesty
This is not another cheery green calculator. Its credibility — and its entire reason to exist — is **rigour and transparency**:
- Every figure has a **confidence rating** (`high`/`medium`/`low`) and at least one **source**.
- The **scope is stated everywhere**: cradle-to-gate *material* impact, not full lifecycle, not retail price.
- Where data is thin or contested, we **say so** rather than papering over it (see the deliberately-omitted `fur`, and the mycelium leather example that comes out *worse* than animal leather).

Protect this. Polish should make the honesty clearer, never hide it behind a slicker UI.

## Hard constraints (do not cross)
- **Stay static.** No backend, no database, no server, no user accounts, no login. Data lives in `/data` as JSON. Deploy target is GitHub Pages.
- **No analytics that phone home / track users.** If a usage counter is ever wanted, use something privacy-preserving and say so.
- **Never invent numbers.** If a value can't be sourced, mark it `low` confidence and explain in `note`, or leave the material out. No fake precision.
- **Never overstate impact in copy.** This is a comparison/learning tool, not a climate-impact claim. Don't write marketing that implies using the tool reduces emissions.
- **Keep comparisons within a `family`.** Fabric is per-kg, leather is per-m²; never mix units in one result.

## Data model
Source of truth is `/data` (`materials.json`, `products.json`, `sources.json`). Full field reference and the confidence rubric are in `data/SCHEMA.md`. Adding an alternative material = edit `materials.json` (set `replaces`) + `sources.json`; **no code change needed** — `app.js` derives the conventional→alternatives mapping from each material's `replaces` array.

## Run & deploy
```bash
python3 -m http.server 8000   # local (fetch() needs http, not file://)
```
GitHub Pages: Settings → Pages → main / root. No build step.

## Architecture
- `index.html` — markup only, links `assets/styles.css` and `app.js`.
- `app.js` — loads the three JSON files, builds lookups, renders both modes and the methodology table. Vanilla JS, no framework.
- `assets/styles.css` — editorial/lab aesthetic (see design notes).

## Design notes
- Aesthetic is **editorial / lab instrument**, not generic SaaS-green. Warm paper background, deep green-ink text, clay for the "conventional/damaging" material, green for alternatives, amber for caveats.
- Fonts: **Fraunces** (display serif), **Hanken Grotesk** (UI), **IBM Plex Mono** (figures/labels). Keep numbers in mono — it reads as data, not decoration.
- Confidence badges and the waste-stream badge are first-class UI, not footnotes.

## Good next tasks (roughly in priority order)
1. **Editable assumptions** — let the user override a material's CO₂/cost/water with sliders or inputs, and recompute live. This is the single biggest credibility win: a sceptic can plug in their own numbers. Keep edits in memory (no storage).
2. **Full-lifecycle toggle** — add an optional layer for use-phase (washing/drying) and end-of-life, so the headline insight ("material choice is often a small slice of the real footprint") becomes visible. Source the use-phase factors and confidence-rate them.
3. **Shareable state** — encode the current selection in the URL query string so a comparison can be linked. Still fully static.
4. **Expand the dataset** toward ~40 materials (more leather alternatives, more recycled/bio fibres) — always with sources + confidence.
5. **Inline source/confidence tooltips** on each figure, and a "what does low confidence mean?" explainer.
6. **Responsive + a11y polish** — keyboard nav for chips, focus states, reduced-motion support, mobile layout refinements.
7. **A short companion write-up** (separate page or linked article) using the mycelium-vs-leather contradiction as the hook.

## What "done" looks like
A genuinely good, fast, public single-page tool with a clear methodology and honest data — then **stop**. Resist scope-creeping it into a product with a backend. If it ever feels like it wants to become a startup, that's a deliberate decision to make outside the code, not a default to drift into.
