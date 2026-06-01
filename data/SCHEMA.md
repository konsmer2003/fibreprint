# FIBREPRINT data schema

All data lives in `/data` as plain JSON so it can be edited by hand or by an agent without touching the app code. The app reads these three files at load.

---

## `materials.json` — array of material objects

| field | type | notes |
|---|---|---|
| `id` | string | unique slug, lowercase, no spaces (e.g. `org_cotton`) |
| `name` | string | display name |
| `family` | `"fabric"` \| `"leather"` | comparisons only happen **within** a family |
| `kind` | `"conventional"` \| `"alternative"` | conventional = the material being replaced |
| `icon` | string (emoji) | shown on chips and cards |
| `feedstock` | string | what it's made from (shown as context) |
| `wasteStream` | boolean | `true` flags it as a waste-stream / circular feedstock (gets a badge) |
| `replaces` | string[] | **alternatives only** — ids of the conventional materials this can replace |
| `co2` | number | **fabric: kg CO₂e per kg fibre · leather: kg CO₂e per m²** (cradle-to-gate) |
| `cost` | number | **fabric: £ per kg fibre · leather: £ per m²** (material cost, not retail) |
| `water` | number | **fabric: litres per kg · leather: litres per m²** |
| `attributes` | object | five scores, **1–5, higher = better**: `durability`, `water_resist`, `breathability`, `biodegradable`, `microplastic_safe` |
| `confidence` | `"high"` \| `"medium"` \| `"low"` | data-quality flag (see rubric below) |
| `note` | string | the honest caveat — shown verbatim on the result card |
| `sources` | string[] | ids that must exist in `sources.json` |

### Units rule
Because `family` controls all comparisons, fabric (`/kg`) and leather (`/m²`) figures are **never mixed in a single result**. Keep that invariant: a material's `co2`/`cost`/`water` must use the unit for its family.

### Confidence rubric
- **high** — multiple independent, peer-reviewed or government LCA sources agree within a tight band. *(Currently nothing qualifies — that honesty is the point.)*
- **medium** — credible secondary sources broadly agree, or a single solid LCA exists, but ranges are wide.
- **low** — figures are vendor-reported, based on a best-case formulation, derived from a single blog/source, or simply scarce. Most novel bio-materials sit here.

> Never invent a number to fill a gap. If you can't source it, mark it `low` and say so in `note`, or leave the material out (see how `fur` is deliberately omitted).

---

## `products.json` — array of product objects

| field | type | notes |
|---|---|---|
| `id` | string | unique slug |
| `name` | string | display name |
| `family` | `"fabric"` \| `"leather"` | restricts which materials apply |
| `icon` | string (emoji) | |
| `material_qty` | number | typical material in one item — **kg of fibre** (fabric) or **m²** (leather) |
| `unit` | string | label only (`"kg fibre"` or `"m²"`) |

Per-item figures are computed as `material.co2 × product.material_qty`, etc.

---

## `sources.json` — object keyed by source id

```json
{ "wri": { "label": "World Resources Institute — ...", "url": "https://..." } }
```

Every id referenced in any material's `sources` array must exist here.

---

## Adding a new material (the whole workflow)
1. Add one object to `materials.json` with all fields above.
2. If it's an alternative, list what it `replaces` — it will automatically appear under those conventional materials. No app code changes needed.
3. Add any new `sources` ids to `sources.json`.
4. Set `confidence` honestly and write a `note` that states the main caveat.
