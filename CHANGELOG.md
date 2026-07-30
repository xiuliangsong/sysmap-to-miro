# Changelog

## v0.1.0 — 2026-07-30

First public release.

`sysmap-to-miro` turns an [archify](https://github.com/tt-a1i/archify) system map
into native, editable Miro objects — components become provider icons (or shapes),
connections become connectors, and boundaries become titled white zones. You pick
the icon set with `--iconset`.

### What's in it
- **Converter** `bin/ir-to-miro.mjs`: archify `*.architecture.json` → a deterministic board plan.
- **Icon sets**: `aws` (verified paths), `gcp`, `azure`, `custom`, or `none` (native Miro shapes).
- **Service-accurate icons** inferred from each node's label/sublabel, with a coarse type fallback (so an S3 bucket and a DynamoDB table don't get the same generic icon).
- **Boundaries** rendered as titled white zones; **connectors** styled per variant (emphasis vs dashed) with arrowheads.
- **Two worked examples** — `url-shortener` and `ecommerce-checkout` — each with its input IR and converted board plan, plus `examples/README.md`.
- **Rendering rules** for the Miro MCP baked into `SKILL.md` (frames-first z-order, public-URL icons, edge-label placement, side-snapped routing).

### Install
```bash
npx skills add songstack/sysmap-to-miro
```

### Requires
archify (to generate the IR), a connected Miro MCP, and Node ≥ 18.
