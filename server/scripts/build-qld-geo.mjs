/**
 * Dev-only, one-off build of the bundled QLD LGA choropleth geometry.
 *
 * Fetches the open ABS-aligned LGA boundaries (geoBoundaries gbOpen, AUS ADM2),
 * keeps the four tourism regions, simplifies them (Douglas–Peucker + tiny-island
 * drop + coordinate rounding) so the asset is a few KB, and writes a committed ES
 * module the client imports. Also clips the Queensland state outline (ADM1) to the
 * regions' area for a backdrop. Runtime never hits the network — only this script does.
 *
 *   node server/scripts/build-qld-geo.mjs
 *
 * Source: geoBoundaries (https://www.geoboundaries.org) — gbOpen AUS ADM2/ADM1, CC-BY 4.0.
 * Re-run to refresh; the output (client/src/lib/qldRegions.geo.js) is the source of truth.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SRC =
  'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/AUS/ADM2/geoBoundaries-AUS-ADM2_simplified.geojson';
const SRC_STATE =
  'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/AUS/ADM1/geoBoundaries-AUS-ADM1_simplified.geojson';

// ABS LGA shapeName  →  the app's canonical region name.
const NAME_MAP = {
  Cairns: 'Cairns',
  'Gold Coast': 'Gold Coast',
  Noosa: 'Noosa',
  Whitsunday: 'Whitsundays',
};

const TOLERANCE = 0.006; // Douglas–Peucker tolerance in degrees (~600 m)
const STATE_TOLERANCE = 0.02; // coarser simplification for the backdrop outline
const MIN_AREA = 0.0006; // drop non-primary rings smaller than this (deg²) — island specks
const DP = 4; // coordinate decimal places (~11 m)

// How far to extend the regions' bounding box when clipping the state backdrop.
// More to the west (inland) so the QLD landmass reads as context behind the
// coastal regions; little to the east (ocean stays the card background).
const MARGIN = { w: 0.35, e: 0.06, n: 0.12, s: 0.12 };

const round = (n) => Number(n.toFixed(DP));

// Shoelace signed area of a ring of [lon,lat] points (>0 = counter-clockwise).
function signedArea(points) {
  let a = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    a += points[j][0] * points[i][1] - points[i][0] * points[j][1];
  }
  return a / 2;
}

const ringArea = (points) => Math.abs(signedArea(points));

// d3-geo / Vega geoshape wind exterior rings CLOCKWISE (and holes
// counter-clockwise) — the opposite of GeoJSON RFC 7946. Source rings are CCW,
// which d3 reads as "everything except this region" (bounds become the whole
// globe and the shape fills the canvas), so we rewind to the d3 convention.
function rewind(ring, clockwise) {
  const isClockwise = signedArea(ring) < 0;
  return isClockwise === clockwise ? ring : [...ring].reverse();
}

// Perpendicular distance from p to the line a→b.
function perpDist(p, a, b) {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

// Douglas–Peucker line simplification.
function dp(points, tol) {
  if (points.length < 3) return points;
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > tol) {
    const left = dp(points.slice(0, idx + 1), tol);
    const right = dp(points.slice(idx), tol);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

function simplifyRing(ring, tol = TOLERANCE) {
  const simplified = dp(ring, tol).map(([x, y]) => [round(x), round(y)]);
  // Keep the ring closed.
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) simplified.push([first[0], first[1]]);
  return simplified;
}

// Bounding box [minX, minY, maxX, maxY] over all coordinates of a geometry.
function bboxOf(features) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c) => {
    if (Array.isArray(c)) {
      if (typeof c[0] === 'number') {
        minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
        minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
      } else c.forEach(walk);
    }
  };
  for (const f of features) walk(f.geometry.coordinates);
  return [minX, minY, maxX, maxY];
}

// Sutherland–Hodgman clip of one ring against an axis-aligned rectangle (convex,
// so a single output ring is correct). Returns null if nothing survives.
function clipRing(ring, [minX, minY, maxX, maxY]) {
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const edges = [
    { in: (p) => p[0] >= minX, at: (a, b) => lerp(a, b, (minX - a[0]) / (b[0] - a[0])) },
    { in: (p) => p[0] <= maxX, at: (a, b) => lerp(a, b, (maxX - a[0]) / (b[0] - a[0])) },
    { in: (p) => p[1] >= minY, at: (a, b) => lerp(a, b, (minY - a[1]) / (b[1] - a[1])) },
    { in: (p) => p[1] <= maxY, at: (a, b) => lerp(a, b, (maxY - a[1]) / (b[1] - a[1])) },
  ];
  let pts = ring.slice(0, -1); // open the ring for clipping
  for (const e of edges) {
    const input = pts;
    pts = [];
    for (let i = 0; i < input.length; i++) {
      const A = input[(i - 1 + input.length) % input.length];
      const B = input[i];
      const inA = e.in(A);
      const inB = e.in(B);
      if (inB) {
        if (!inA) pts.push(e.at(A, B));
        pts.push(B);
      } else if (inA) {
        pts.push(e.at(A, B));
      }
    }
    if (!pts.length) return null;
  }
  pts.push([...pts[0]]); // re-close
  return pts;
}

// Clip a state outline to `bbox`, simplify coarsely, and rewind for d3/Vega.
// Outer rings only — a backdrop needs no holes.
function clipState(geom, bbox) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const kept = [];
  for (const poly of polys) {
    const clipped = clipRing(poly[0], bbox);
    if (!clipped || clipped.length < 4) continue;
    const ring = rewind(simplifyRing(clipped, STATE_TOLERANCE), true);
    if (ring.length >= 4 && ringArea(ring) >= MIN_AREA) kept.push([ring]);
  }
  return kept.length === 1
    ? { type: 'Polygon', coordinates: kept[0] }
    : { type: 'MultiPolygon', coordinates: kept };
}

// Simplify one polygon ([outerRing, ...holes]); returns null if the outer ring
// collapses below MIN_AREA (and it isn't the primary polygon).
function simplifyPolygon(poly, keepRegardless) {
  const outer = simplifyRing(poly[0]);
  if (outer.length < 4) return null;
  if (!keepRegardless && ringArea(outer) < MIN_AREA) return null;
  const holes = poly
    .slice(1)
    .map(simplifyRing)
    .filter((h) => h.length >= 4 && ringArea(h) >= MIN_AREA);
  // Exterior clockwise, holes counter-clockwise (d3-geo / Vega convention).
  return [rewind(outer, true), ...holes.map((h) => rewind(h, false))];
}

function simplifyFeatureGeometry(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  // The largest polygon (by outer-ring area) is always kept — the mainland.
  let primaryIdx = 0;
  let primaryArea = -1;
  polys.forEach((p, i) => {
    const a = ringArea(p[0]);
    if (a > primaryArea) {
      primaryArea = a;
      primaryIdx = i;
    }
  });
  const kept = polys.map((p, i) => simplifyPolygon(p, i === primaryIdx)).filter(Boolean);
  return kept.length === 1
    ? { type: 'Polygon', coordinates: kept[0] }
    : { type: 'MultiPolygon', coordinates: kept };
}

function countPoints(geom) {
  let n = 0;
  const walk = (c) => {
    if (Array.isArray(c)) {
      if (typeof c[0] === 'number') n++;
      else c.forEach(walk);
    }
  };
  walk(geom.coordinates);
  return n;
}

async function main() {
  process.stdout.write(`Fetching ${SRC}\n`);
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`Source fetch failed: ${res.status}`);
  const fc = await res.json();

  const features = [];
  for (const [shapeName, region] of Object.entries(NAME_MAP)) {
    const src = fc.features.find((f) => f.properties?.shapeName === shapeName);
    if (!src) throw new Error(`LGA not found in source: ${shapeName}`);
    const geometry = simplifyFeatureGeometry(src.geometry);
    process.stdout.write(`  ${region.padEnd(12)} ${geometry.type} pts=${countPoints(geometry)}\n`);
    features.push({ type: 'Feature', properties: { region }, geometry });
  }

  const out = { type: 'FeatureCollection', features };

  // Queensland backdrop: clip the state outline to the regions' area (+margin) so
  // the regions stay large while the surrounding land gives geographic context.
  const [minX, minY, maxX, maxY] = bboxOf(features);
  const w = maxX - minX;
  const h = maxY - minY;
  const clipBox = [
    minX - w * MARGIN.w,
    minY - h * MARGIN.s,
    maxX + w * MARGIN.e,
    maxY + h * MARGIN.n,
  ];
  process.stdout.write(`Fetching ${SRC_STATE}\n`);
  const stateRes = await fetch(SRC_STATE);
  if (!stateRes.ok) throw new Error(`State fetch failed: ${stateRes.status}`);
  const stateFc = await stateRes.json();
  const qld = stateFc.features.find((f) => f.properties?.shapeName === 'Queensland');
  if (!qld) throw new Error('Queensland not found in ADM1 source');
  const stateGeom = clipState(qld.geometry, clipBox);
  process.stdout.write(`  Queensland   ${stateGeom.type} pts=${countPoints(stateGeom)} (clipped backdrop)\n`);
  const state = { type: 'Feature', properties: { region: 'Queensland' }, geometry: stateGeom };

  const here = dirname(fileURLToPath(import.meta.url));
  const dest = resolve(here, '../../client/src/lib/qldRegions.geo.js');
  const banner =
    '// AUTO-GENERATED by server/scripts/build-qld-geo.mjs — do not edit by hand.\n' +
    '// Simplified LGA boundaries for the four tourism regions (qldRegions) plus a\n' +
    '// clipped Queensland backdrop (queensland), used by the Government dashboard\n' +
    '// choropleth snapshot. properties.region is the canonical name.\n' +
    '// Source: geoBoundaries gbOpen AUS ADM2/ADM1 (https://www.geoboundaries.org), CC-BY 4.0.\n';
  await writeFile(
    dest,
    `${banner}export const qldRegions = ${JSON.stringify(out)};\n\n` +
      `export const queensland = ${JSON.stringify(state)};\n`,
  );

  const bytes = Buffer.byteLength(JSON.stringify(out)) + Buffer.byteLength(JSON.stringify(state));
  process.stdout.write(`Wrote ${dest} (${(bytes / 1024).toFixed(1)} KB)\n`);
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
