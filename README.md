# FIBREPRINT

**Honest material swaps for fashion.** Pick a conventional fabric or leather, pick a garment, and see the real trade-offs of switching to a waste-stream or bio-based alternative — in carbon, water, material cost, and performance.

This is a deliberately small, **static** research tool. Its whole point is rigour and honesty: every figure carries a confidence rating and a source, and the scope is stated up front. It is **not** a certified LCA and **not** a SaaS product.

---

## Honest scope (read this first)
- Figures model **cradle-to-gate material production** — fabric is **per kg of fibre**, leather is **per m²**.
- They **exclude** spinning/weaving, dyeing, transport, the **use phase** (washing/drying often dominate a garment's real footprint), and end-of-life.
- "Cost" is **material cost only** — retail price is driven far more by brand, margin and labour.
- LCA numbers for novel bio-materials vary wildly and are often vendor-reported, so each material is flagged **high / medium / low confidence**. Treat everything as order-of-magnitude, for comparison.

## Run locally
The app fetches JSON from `/data`, which browsers block over `file://`. Serve it:

```bash
cd fibreprint
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)
1. Push this folder to a GitHub repo.
2. Settings → Pages → Source: `main` branch, `/ (root)`.
3. It will be live at `https://<username>.github.io/<repo>/`. No build step, no backend.

## Structure
```
fibreprint/
├── index.html          # app shell (markup only)
├── app.js              # logic: loads data, renders compare + recommend modes
├── assets/styles.css   # editorial/lab styling
└── data/               # the source of truth — edit these, not the code
    ├── materials.json  # 26 materials with impact + confidence + sources
    ├── products.json   # garments and their typical material quantity
    ├── sources.json    # source id -> label + url
    └── SCHEMA.md        # field-by-field data model + how to add materials
```

## Adding data
See [`data/SCHEMA.md`](data/SCHEMA.md). To add an alternative material you only edit `materials.json` (list what it `replaces`) and `sources.json` — no code changes.

## License
MIT — see `LICENSE`.

---
*A research prototype. Not investment or sustainability advice.*
