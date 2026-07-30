---
name: sysmap-to-miro
description: >
  Turn a codebase or system description into native, editable Miro objects —
  components become shapes (or provider icons), connections become connectors,
  boundaries become titled white zones — with a selectable icon set
  (aws | gcp | azure | custom | none). Uses archify to build and validate the
  system map, then materializes it on a Miro board. Use when the user says
  "system map on miro", "editable architecture on miro", "put the diagram on a
  miro board", or "turn this repo into a miro board".
license: MIT
argument-hint: "[repo/description or path to archify .architecture.json] [--iconset none|aws|gcp|azure|custom]"
---

# sysmap-to-miro

Turn a codebase or system description into **editable Miro objects** — not a
screenshot. Shapes (or AWS/GCP/Azure icons) from components, connectors from
connections, titled white zones from boundaries.

## Prerequisites

- **archify** available (the [archify](https://github.com/tt-a1i/archify) skill),
  or an existing archify `*.architecture.json` IR.
- A **connected Miro MCP** (`/mcp` → authenticate `claude.ai Miro`).
- Node ≥ 18 for the bundled converter.

## Workflow

1. **Get the IR.** Use archify to produce and validate an `*.architecture.json`
   (components, connections, boundaries, with geometry), or use one supplied.

2. **Build the board plan:**
   ```
   node bin/ir-to-miro.mjs <ir.architecture.json> --iconset <none|aws|gcp|azure|custom>
   ```
   Emits frames, nodes (x/y/w/h, type, label, sublabel, and `icon` when an icon
   set is chosen), and connectors (label, style, emphasis).

3. **Create the board.** Confirm the name with the user first, then `board_create`
   (`invocation_source: "skill"`). Keep the returned board URL.

4. **Materialize — ORDER MATTERS (see Rendering rules):**
   1. **Frames + title first.** `layout_create` the boundary frames (`fill=#ffffff`
      for white zones) plus a title/subtitle TEXT. Frames MUST be created before
      any node — Miro has no API "send to back", so later items render on top.
   2. **Nodes on top.**
      - `iconset: none` → a `SHAPE` per node (`layout_create`), typed shape/colour.
      - `iconset: aws|gcp|azure|custom` → `image_create` per node with a **public
        icon URL** (see icons/map.json), created after the frames so icons layer
        on top of the white zones.
   3. **Labels.** A TEXT under each node. Edge labels: offset TEXT **hugging the
      line** (perpendicular ~15 px) for vertical/short edges; use connector
      captions only for long horizontal edges.
   4. **Connectors last** (`layout_create`, reference node IDs). Emphasis/green for
      the main path, dashed grey for control/state edges.

5. **Report** the board URL.

## Rendering rules (learned the hard way — keep them)

- **Frames before icons.** Z-order is creation order and there's no send-to-back;
  a white frame created after the icons will cover them. Always frames → nodes →
  labels → connectors.
- **Icons via public URL, not upload.** `image_create` accepts a public `image_url`;
  use it (e.g. the mingrammer/diagrams raw GitHub icons in icons/map.json). The
  `image_get_upload_url` → PUT → token path is per-item and the presigned URLs are
  huge and error-prone.
- **Service-accurate icons.** archify types are coarse (all DBs are `database`), so
  infer the real service from each node's label/sublabel (S3 vs DynamoDB,
  EventBridge vs SNS, Lambda, Fargate/ECS…); fall back to the type→icon map.
- **Edge-label placement.** Miro centres connector captions on the line and rotates
  them, so vertical/short edges overlap the icons. Put those labels as standalone
  TEXT ~15 px off the line; keep captions only for long horizontal edges.
- **Connector attributes are `stroke_*`, not `style`/`color`.** The real CONNECTOR keys
  (per `layout_get_dsl`) are `stroke_color`, `stroke_style=normal|dashed|dotted`,
  `end_cap=arrow|stealth`, `shape=curved|elbowed|straight`, and `start_snap`/`end_snap`
  (`auto|top|right|bottom|left`). `style=`/`color=`/`fromSide=` are silently DROPPED —
  the connector is created plain. With the CORRECT names, styling applies at
  `layout_create` time (one pass — no follow-up `layout_update` needed). Reference icon
  endpoints by their `?moveToWidget=<id>` URL from each `image_create` result.
- **Route around a middle icon with snaps + elbow.** When an edge spans a stacked column
  or a shared row and would cross an icon between its endpoints (e.g. bottom→top past a
  middle node), set `shape=elbowed` and pin both ends to the free side
  (`start_snap=left end_snap=left`, or `=right`, or `=bottom`) so it detours clear.
- **Icons can't be moved after creation.** `image_create` items are "unsupported" for
  `layout_read`/`layout_update` — they never appear in the DSL and can't be repositioned
  or deleted through it. Commit to node coordinates BEFORE placing icons; you only get
  frames, TEXT, and connectors back as editable DSL.
- **`layout_update` is block find/replace.** It takes `old_string`/`new_string` (not a
  `dsl=` arg) matched against the rendered DSL from `layout_read`. A single call can
  restyle every connector at once — paste the exact current lines as `old_string`, the
  restyled lines as `new_string`. Empty `new_string` deletes; new lines create.
- **`layout_update` matching.** It matches the board's rendered DSL, where special
  chars are HTML-encoded (`+` → `&#43;`). Match on that, and run caption/label
  edits **sequentially** — parallel `layout_update` calls race and drop edits.
- **White zones = frames with `fill=#ffffff`, generously padded.** Labels extend
  well beyond the icons, so pad the frame (~64px, the converter default) or the
  border crowds the contents.
- **Title clearance.** Put the board title/subtitle ~40px above the top-most frame
  (negative y is fine) — otherwise the subtitle collides with the frame's own title.

## Icon-set modes

| `--iconset` | On the board |
| --- | --- |
| `none` (default) | Native Miro shapes + connectors + white zones — fully editable, no provider icons |
| `aws` / `gcp` / `azure` | Official provider icons per component (public URL) + connectors + white zones |
| `custom` | Your own icons — edit `icons/map.json` (`_url_base` + type→path) |

## Notes

- Confirm before `board_create` — it can't be undone.
- Set `invocation_source: "skill"` on every Miro call; `is_repository` from context.
- Coordinates come straight from the archify IR, so the Miro layout mirrors archify.
- archify draws no icons itself; icon sets come from this skill's render step.
