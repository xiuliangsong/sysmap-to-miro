#!/usr/bin/env node
// sysmap-to-miro — convert an archify architecture IR into a neutral "board plan"
// (frames + nodes + connectors), optionally tagging each node with a provider icon.
//
// The board plan is deterministic. The skill materializes it on a Miro board via the
// Miro MCP: layout_create for shapes/connectors/frames (iconset=none), or image_create
// per node for provider icons (iconset=aws|gcp|azure|custom) with native connectors.
//
// Usage:
//   ir-to-miro.mjs <archify.architecture.json> [--iconset none|aws|gcp|azure|custom] [--pad 40]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const input = process.argv[2];
if (!input || input.startsWith('--')) {
  console.error('usage: ir-to-miro.mjs <archify.architecture.json> [--iconset none|aws|gcp|azure|custom] [--pad 40]');
  process.exit(1);
}
const iconset = String(arg('--iconset', 'none')).toLowerCase();
const pad = Number(arg('--pad', '64')); // generous: labels extend well beyond the icons

const ir = JSON.parse(readFileSync(input, 'utf8'));
const comps = ir.components || [];
const conns = ir.connections || [];
const bounds = ir.boundaries || [];

let provider = null;
if (iconset !== 'none') {
  const maps = JSON.parse(readFileSync(join(__dir, '..', 'icons', 'map.json'), 'utf8'));
  provider = maps[iconset] || maps.custom || {};
}

// Resolve a node to a provider icon: infer the real service from its label/sublabel
// (so S3 vs DynamoDB is right), else fall back to the coarse type map. Returns
// { path, url } or null. url is a public image URL for image_create.
function iconFor(label, sublabel, type) {
  if (!provider) return null;
  const base = provider._url_base || '';
  const services = provider.services || {};
  const fallback = provider.type_fallback || {};
  const hay = `${label || ''} ${sublabel || ''}`.toLowerCase();
  let path = null;
  for (const key of Object.keys(services)) {
    if (hay.includes(key)) { path = services[key]; break; }
  }
  if (!path) path = fallback[type] || fallback.default || null;
  return path ? { path, url: base + path } : null;
}

const byId = Object.fromEntries(comps.map((c) => [c.id, c]));

const nodes = comps.map((c) => {
  const [x, y] = c.pos || [0, 0];
  const [w, h] = c.size || [140, 60];
  const node = {
    id: c.id,
    label: c.label || c.id,
    sublabel: c.sublabel || '',
    type: c.type || 'external',
    tag: c.tag || '',
    x, y, w, h,
  };
  if (iconset !== 'none') {
    const ic = iconFor(c.label, c.sublabel, c.type);
    if (ic) { node.icon = ic.path; node.icon_url = ic.url; }
  }
  return node;
});

const frames = bounds
  .map((b, i) => {
    const wrapped = (b.wraps || []).map((id) => byId[id]).filter(Boolean);
    if (!wrapped.length) return null;
    const x0 = Math.min(...wrapped.map((c) => (c.pos || [0, 0])[0]));
    const y0 = Math.min(...wrapped.map((c) => (c.pos || [0, 0])[1]));
    const x1 = Math.max(...wrapped.map((c) => (c.pos || [0, 0])[0] + (c.size || [140, 60])[0]));
    const y1 = Math.max(...wrapped.map((c) => (c.pos || [0, 0])[1] + (c.size || [140, 60])[1]));
    return {
      id: `frame_${i}`,
      label: b.label || b.kind,
      kind: b.kind,
      x: x0 - pad,
      y: y0 - pad - 24, // extra headroom for the frame title
      w: x1 - x0 + pad * 2,
      h: y1 - y0 + pad * 2 + 24,
      wraps: b.wraps || [],
    };
  })
  .filter(Boolean);

const connectors = conns.map((c) => ({
  from: c.from,
  to: c.to,
  label: c.label || '',
  style: c.variant === 'dashed' || c.variant === 'security' ? 'dashed' : 'solid',
  emphasis: c.variant === 'emphasis',
}));

const plan = {
  title: (ir.meta && ir.meta.title) || 'System map',
  subtitle: (ir.meta && ir.meta.subtitle) || '',
  iconset,
  frames,
  nodes,
  connectors,
};

console.log(JSON.stringify(plan, null, 2));
