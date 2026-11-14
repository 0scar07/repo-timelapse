// Genera src/demo.json: una historia inventada pero realista, pasada por el mismo analizador que los repos reales.
import { writeFileSync } from 'node:fs';
import { buildTimelapse } from '../src/history.mjs';

let sd = 7; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
const pickW = items => { const tot = items.reduce((a, [, w]) => a + w, 0); let r = rnd() * tot; for (const [v, w] of items) { if ((r -= w) <= 0) return v; } return items[0][0]; };

const t0 = Date.UTC(2024, 2, 3, 15), t1 = Date.UTC(2026, 10, 1, 18), N = 1842;
const people = [['maria', 30], ['lucia', 24], ['dani', 18], ['sofia', 8], ['pablo', 6], ['ana', 4], ['leo', 3], ['iris', 2], ['tomas', 2], ['eva', 1], ['raul', 1], ['nora', 1]];
// carpeta, extensión, cuándo empieza (0-1), cuántos archivos llega a tener
const areas = [
  ['src', 'ts', 0, 60], ['src/router', 'ts', 0.02, 22], ['src/cache', 'ts', 0.25, 18], ['src/auth', 'ts', 0.12, 16],
  ['core', 'rs', 0.18, 34], ['core/engine', 'rs', 0.35, 20], ['docs', 'md', 0.05, 40], ['docs/guides', 'md', 0.4, 28],
  ['tests', 'py', 0.1, 46], ['tests/e2e', 'py', 0.55, 24], ['web', 'ts', 0.5, 40], ['web/components', 'ts', 0.56, 52],
  ['web/styles', 'css', 0.6, 14], ['scripts', 'sh', 0.3, 10], ['.github/workflows', 'yml', 0.2, 8], ['sdk/rust', 'rs', 0.75, 30],
];
const verbs = ['feat', 'fix', 'refactor', 'docs', 'test', 'perf', 'chore'];
const things = ['router de la API', 'caché en memoria', 'rate limit por token', 'cliente HTTP', 'panel web', 'métricas en /health', 'SDK en Rust', 'motor de búsqueda', 'reconexión del socket', 'guía de inicio', 'pruebas de carga', 'colas de trabajo'];

const existing = new Map(areas.map(a => [a[0], []]));
const commits = [];
const joined = new Set();
for (let i = 0; i < N; i++) {
  const x = i / (N - 1);
  // actividad irregular: rachas y pausas
  const t = t0 + (t1 - t0) * (x + 0.03 * Math.sin(x * 23)) ;
  let author = pickW(people.filter(([, w], k) => k < 3 || x > k * 0.07));
  joined.add(author);
  const files = new Map();
  const nf = 1 + Math.floor(rnd() * rnd() * 7);
  for (let f = 0; f < nf; f++) {
    const open = areas.filter(a => a[2] <= x);
    const [dir, ext, , max] = open[Math.floor(rnd() * open.length)];
    const list = existing.get(dir);
    const grow = list.length < max * Math.min(1, (x - areas.find(a => a[0] === dir)[2] + 0.15) * 1.6);
    if ((grow && rnd() < 0.55) || !list.length) {
      const name = `${dir}/${['index', 'core', 'utils', 'types', 'client', 'server', 'store', 'view', 'model', 'api'][list.length % 10]}${list.length >= 10 ? '-' + Math.floor(list.length / 10) : ''}.${ext}`;
      list.push(name); files.set(name, 'A');
    } else if (rnd() < 0.03 && list.length > 4) {
      const gone = list.splice(Math.floor(rnd() * list.length), 1)[0]; files.set(gone, 'D');
    } else files.set(list[Math.floor(rnd() * list.length)], 'M');
  }
  const v = verbs[Math.floor(rnd() * verbs.length)], th = things[Math.floor(rnd() * things.length)];
  commits.push({ hash: ((i + 1) * 2654435761 >>> 0).toString(16).padStart(8, '0') + 'abc', t: Math.round(t), author, email: author + '@example.com', subject: i === 0 ? 'Initial commit' : `${v}: ${th}`, files });
}
const tags = [
  { name: 'v0.1.0', t: Date.UTC(2024, 7, 20) },
  { name: 'v1.0.0', t: Date.UTC(2025, 7, 12) },
  { name: 'v2.0.0', t: Date.UTC(2026, 5, 2) },
];
{
  const lang = 'es';
  const data = buildTimelapse({ commits, tags, name: 'nebula-api', lang });
  writeFileSync(new URL('../src/demo.json', import.meta.url), JSON.stringify(data));
  console.log(lang, data.totals, data.milestones.map(m => m.label), data.nodes.length, 'nodos');
}
