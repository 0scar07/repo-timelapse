// Lee la historia de git y la convierte en los datos del timelapse:
// árbol de carpetas con posiciones, nacimiento/muerte de cada archivo, autores, commits e hitos.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const LANGS = {
  ts: 'TypeScript', tsx: 'TypeScript', mts: 'TypeScript', cts: 'TypeScript',
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', rs: 'Rust', go: 'Go', java: 'Java', kt: 'Kotlin', kts: 'Kotlin', swift: 'Swift',
  c: 'C', h: 'C', cpp: 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++', cs: 'C#', rb: 'Ruby', php: 'PHP',
  vue: 'Vue', svelte: 'Svelte', astro: 'Astro', css: 'CSS', scss: 'CSS', sass: 'CSS', less: 'CSS',
  html: 'HTML', md: 'Markdown', mdx: 'Markdown', rst: 'Markdown', txt: 'Text',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell', ps1: 'PowerShell', dart: 'Dart', lua: 'Lua', gd: 'GDScript',
  sql: 'SQL', ex: 'Elixir', exs: 'Elixir', zig: 'Zig', scala: 'Scala', r: 'R',
  json: 'Data', yml: 'Config', yaml: 'Config', toml: 'Config', ini: 'Config', xml: 'Config', lock: 'Config',
  png: 'Media', jpg: 'Media', jpeg: 'Media', gif: 'Media', svg: 'Media', webp: 'Media', ico: 'Media', mp3: 'Media', mp4: 'Media', wav: 'Media',
};
export const LANG_COLORS = {
  TypeScript: '#9D8CFF', JavaScript: '#FFD98A', Python: '#5EE6D0', Rust: '#FF9F6E', Go: '#6FD3FF',
  Java: '#FF8F7A', Kotlin: '#C59BFF', Swift: '#FF8A5C', C: '#A9B4C8', 'C++': '#FF7AB6', 'C#': '#8BE38B',
  Ruby: '#FF6B81', PHP: '#9AA8FF', Vue: '#5EE6A0', Svelte: '#FF8A5C', Astro: '#FF9DE2', CSS: '#7AB8FF',
  HTML: '#FF9F6E', Markdown: '#C8C8D4', Text: '#A8A8B8', Shell: '#8BE38B', PowerShell: '#6FA8FF', Dart: '#5EC8F0',
  Lua: '#8C9CFF', GDScript: '#7FB8E0', SQL: '#FFC97A', Elixir: '#B58BFF', Zig: '#FFB45E', Scala: '#FF7A7A', R: '#7AA8FF',
  Data: '#E8E0A0', Config: '#8E8AA8', Media: '#F2A0C0', Other: '#6E6A86',
};
const CODE_LANGS = new Set(Object.keys(LANG_COLORS).filter(l => !['Data', 'Config', 'Media', 'Other', 'Text'].includes(l)));
const AUTHOR_COLORS = ['#5EE6D0', '#FFB48A', '#FF8FC8', '#8AB8FF', '#FFD98A', '#C59BFF'];
// Carpetas que no son parte del proyecto (dependencias y builds subidos por error)
const SKIP = /(^|\/)(node_modules|bower_components|dist|build|out|vendor|\.next|\.nuxt|coverage|Library|Temp|obj|\.git)\//;
const MAX_LEAVES = 1400;
const N = 240; // muestras de las series (contadores, fechas, cámara)

const langOf = p => LANGS[(p.split('/').pop().split('.').pop() || '').toLowerCase()] || 'Other';

export function readCommits(repo, { since, until } = {}) {
  // --name-status (sin contar líneas): git no tiene que calcular diffs, así que es varias veces más rápido
  const args = ['-C', repo, 'log', '--reverse', '--no-merges', '--no-renames', '--format=%x1e%H%x1f%ct%x1f%an%x1f%ae%x1f%s', '--name-status'];
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  const raw = execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 30 });
  const out = [];
  for (const chunk of raw.split('\x1e')) {
    if (!chunk.trim()) continue;
    const [head, ...lines] = chunk.split('\n');
    const [hash, ct, an, ae, subject] = head.split('\x1f');
    const c = { hash, t: +ct * 1000, author: an || ae || '?', email: (ae || '').toLowerCase(), subject: subject || '', files: new Map() };
    for (const l of lines) {
      const m = l.match(/^([AMDTC])\d*\t(.+)$/);
      if (!m || SKIP.test(m[2])) continue;
      c.files.set(m[2], m[1] === 'A' ? 'A' : m[1] === 'D' ? 'D' : 'M');
    }
    out.push(c);
  }
  // por fecha de commit (los rebase pueden desordenar la fecha de autor)
  return out.sort((a, b) => a.t - b.t);
}

export function readTags(repo) {
  try {
    const raw = execFileSync('git', ['-C', repo, 'for-each-ref', '--sort=creatordate', '--format=%(refname:short)%1f%(creatordate:unix)', 'refs/tags'], { encoding: 'utf8' });
    return raw.split('\n').filter(Boolean).map(l => { const [name, t] = l.split('\x1f'); return { name, t: +t * 1000 }; });
  } catch { return []; }
}

const initials = name => {
  const parts = name.replace(/[^\p{L}\p{N} ._-]/gu, '').split(/[ ._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

/** Construye todos los datos del timelapse. */
export function buildTimelapse({ commits, tags = [], name, lang = 'en' }) {
  if (!commits.length) return null;
  const n = commits.length, t0 = commits[0].t, t1 = commits[n - 1].t || t0 + 1;
  // Progreso p ∈ [0,1]: 70 % por número de commit y 30 % por tiempo real (se nota el calendario sin dejar huecos largos vacíos)
  commits.forEach((c, i) => { c.p = n === 1 ? 1 : 0.7 * (i / (n - 1)) + 0.3 * ((c.t - t0) / Math.max(1, t1 - t0)); });

  // --- vida de cada archivo ---
  const files = new Map();
  for (const c of commits) {
    for (const [f, st] of c.files) {
      let r = files.get(f);
      if (!r) { r = { path: f, birth: c.p, death: null, touches: [] }; files.set(f, r); }
      if (st === 'D') r.death = c.p;
      else { if (r.death !== null && st === 'A') r.death = null; r.touches.push(c.p); }
    }
  }

  // --- árbol de carpetas (colapsando lo más profundo si hay demasiados archivos) ---
  const all = [...files.values()];
  const depthOf = p => p.split('/').length;
  let maxDepth = Math.max(1, ...all.map(f => depthOf(f.path)));
  const leafKey = (p, md) => { const parts = p.split('/'); return parts.length <= md ? p : parts.slice(0, md).join('/') + '/…'; };
  while (maxDepth > 1 && new Set(all.map(f => leafKey(f.path, maxDepth))).size > MAX_LEAVES) maxDepth--;

  const root = { name: '', kids: new Map(), dir: true, depth: 0 };
  const leafOfFile = new Map();
  for (const f of all) {
    const key = leafKey(f.path, maxDepth), parts = key.split('/');
    let node = root;
    parts.forEach((part, i) => {
      const last = i === parts.length - 1;
      if (!node.kids.has(part)) node.kids.set(part, { name: part, kids: new Map(), dir: !last, depth: i + 1, files: [] });
      node = node.kids.get(part);
      if (last) node.files.push(f);
    });
    leafOfFile.set(f.path, node);
  }
  // nacimiento, muerte, lenguaje y peso de cada nodo
  (function fill(nd) {
    if (!nd.dir) {
      nd.birth = Math.min(...nd.files.map(f => f.birth));
      nd.death = nd.files.every(f => f.death !== null) ? Math.max(...nd.files.map(f => f.death)) : null;
      const counts = {}; for (const f of nd.files) { const l = langOf(f.path); counts[l] = (counts[l] || 0) + 1; }
      nd.lang = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      nd.weight = nd.files.length;
      nd.leaves = 1;
      return;
    }
    const kids = [...nd.kids.values()];
    kids.forEach(fill);
    nd.birth = kids.length ? Math.min(...kids.map(k => k.birth)) : 0;
    nd.death = kids.length && kids.every(k => k.death !== null) ? Math.max(...kids.map(k => k.death)) : null;
    nd.leaves = kids.reduce((a, k) => a + k.leaves, 0) || 1;
    // orden estable: carpetas primero, luego por nombre
    nd.sorted = kids.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
  })(root);
  root.birth = 0;

  // layout radial: ángulo según hojas, radio según profundidad
  const levels = Math.max(1, maxDepth);
  const radius = d => (d === 0 ? 0 : 430 * Math.pow(d / levels, 0.75));
  const nodes = [];
  (function lay(nd, a0, a1, parentIdx) {
    const a = (a0 + a1) / 2, r = radius(nd.depth);
    const idx = nodes.length;
    nd.idx = idx;
    nodes.push({
      x: +(Math.cos(a) * r).toFixed(1), y: +(Math.sin(a) * r * 0.86).toFixed(1), p: parentIdx,
      dir: nd.dir ? 1 : 0, depth: nd.depth, b: +nd.birth.toFixed(4), d: nd.death === null ? null : +nd.death.toFixed(4),
      c: nd.dir ? null : (LANG_COLORS[nd.lang] || LANG_COLORS.Other), w: nd.dir ? 0 : nd.weight,
    });
    if (nd.dir) { let acc = a0; for (const k of nd.sorted) { const sp = (a1 - a0) * k.leaves / nd.leaves; lay(k, acc, acc + sp, idx); acc += sp; } }
  })(root, -Math.PI / 2, Math.PI * 1.5, -1);

  // --- etiquetas: las carpetas de primer nivel con peso (y las de segundo si solo hay una grande) ---
  const totalLeaves = root.leaves || 1;
  let labelDirs = root.sorted.filter(k => k.dir && k.leaves / totalLeaves >= 0.04);
  if (labelDirs.length <= 1) labelDirs = labelDirs.flatMap(k => k.sorted.filter(s => s.dir && s.leaves / totalLeaves >= 0.04)).concat(labelDirs);
  const labels = labelDirs.sort((a, b) => b.leaves - a.leaves).slice(0, 10)
    .map(k => ({ i: k.idx, name: k.name.length > 16 ? k.name.slice(0, 15) + '…' : k.name }));

  // --- toques: cada vez que se modifica un archivo (sin contar su nacimiento), para que el árbol "lata" ---
  const touchList = [];
  for (const f of all) {
    const leaf = leafOfFile.get(f.path);
    for (const tp of f.touches) if (tp > f.birth + 1e-9) touchList.push([+tp.toFixed(4), leaf.idx]);
  }
  touchList.sort((a, b) => a[0] - b[0]);
  const touches = touchList.length <= 6000 ? touchList : Array.from({ length: 6000 }, (_, i) => touchList[Math.floor(i * touchList.length / 6000)]);

  // --- series muestreadas: commits, archivos vivos, personas, fecha y tamaño del árbol visible ---
  const at = k => k / (N - 1);
  const commitsAt = [], filesAt = [], authorsAt = [], timeAt = [], extentAt = [];
  let ci = 0; const seen = new Set();
  const fileEvents = [];
  for (const f of all) { fileEvents.push([f.birth, 1]); if (f.death !== null) fileEvents.push([f.death, -1]); }
  fileEvents.sort((a, b) => a[0] - b[0]);
  let fe = 0, alive = 0;
  const radii = nodes.map(nd => Math.hypot(nd.x, nd.y / 0.86));
  for (let k = 0; k < N; k++) {
    const p = at(k);
    while (ci < n && commits[ci].p <= p + 1e-9) { seen.add(commits[ci].email || commits[ci].author); ci++; }
    while (fe < fileEvents.length && fileEvents[fe][0] <= p + 1e-9) { alive += fileEvents[fe][1]; fe++; }
    commitsAt.push(ci); filesAt.push(alive); authorsAt.push(seen.size);
    const j = Math.max(0, ci - 1), c = commits[j], nx = commits[Math.min(n - 1, j + 1)];
    const tt = nx.p > c.p ? c.t + (nx.t - c.t) * Math.min(1, Math.max(0, (p - c.p) / (nx.p - c.p))) : c.t;
    timeAt.push(Math.round(tt / 1000));
    let ext = 60; nodes.forEach((nd, i) => { if (nd.b <= p && radii[i] > ext) ext = radii[i]; });
    extentAt.push(Math.round(ext));
  }

  // --- autores principales y a qué archivo saltan ---
  const byAuthor = new Map();
  for (const c of commits) {
    const key = c.email || c.author;
    let a = byAuthor.get(key);
    if (!a) { a = { name: c.author, email: c.email, commits: 0, join: c.p, events: [], hash: c.hash }; byAuthor.set(key, a); }
    a.hash = c.hash; // el último commit, para buscar su foto en GitHub
    a.commits++;
    for (const [f, st] of c.files) if (st !== 'D' && leafOfFile.has(f)) { a.events.push([+c.p.toFixed(4), leafOfFile.get(f).idx]); break; }
  }
  const sample = (arr, max) => arr.length <= max ? arr : Array.from({ length: max }, (_, i) => arr[Math.floor(i * arr.length / max)]);
  // los bots no salen como avatares (sí cuentan en los totales)
  const isBot = a => /\[bot\]$|^(dependabot|renovate|github-actions|greenkeeper|snyk-bot|semantic-release-bot)\b/i.test(a.name);
  const authors = [...byAuthor.values()].filter(a => !isBot(a)).sort((a, b) => b.commits - a.commits).slice(0, 5).map((a, i) => ({
    name: a.name.length > 18 ? a.name.slice(0, 17) + '…' : a.name, initials: initials(a.name), color: AUTHOR_COLORS[i],
    commits: a.commits, join: +a.join.toFixed(4), events: sample(a.events, 160), hash: a.hash, avatar: null,
  }));

  // --- commits para la tarjeta que va pasando ---
  const commitCards = sample(commits, 320).map(c => ({
    p: +c.p.toFixed(4), hash: c.hash.slice(0, 7), msg: c.subject.length > 58 ? c.subject.slice(0, 57) + '…' : c.subject,
    author: c.author.length > 18 ? c.author.slice(0, 17) + '…' : c.author, files: c.files.size,
  }));

  // --- hitos: tags importantes y/o cantidades redondas de commits ---
  // el hito cae en el último commit hecho antes (o en el momento) del tag
  const pAtTime = t => { let j = -1; for (let k = 0; k < n && commits[k].t <= t; k++) j = k; return commits[Math.max(0, j)].p; };
  const countAt = p => { let k = 0; while (k < n && commits[k].p <= p + 1e-9) k++; return k; };
  const authorsAtP = p => { const s = new Set(); for (const c of commits) { if (c.p > p + 1e-9) break; s.add(c.email || c.author); } return s.size; };
  const cands = [];
  const inRange = tags.filter(tg => tg.t >= t0 && tg.t <= t1 + 864e5);
  const major = inRange.filter(tg => /^v?\d+\.0(\.0)?$/.test(tg.name) && !/^v?0\./.test(tg.name));
  const pick = [...major, ...(inRange[0] ? [inRange[0]] : []), ...inRange.filter(tg => /^v?\d+\.\d+(\.0)?$/.test(tg.name))];
  for (const tg of pick) cands.push({ kind: 'tag', label: tg.name, p: pAtTime(tg.t), t: tg.t });
  for (const m of [100, 500, 1000, 5000, 10000, 50000]) if (m < n * 0.97) cands.push({ kind: 'commits', label: String(m), p: commits[m - 1].p, t: commits[m - 1].t });
  const milestones = [];
  for (const c of cands) {
    if (milestones.length >= 4) break;
    if (c.p < 0.06 || c.p > 0.96) continue;
    if (milestones.some(m => Math.abs(m.p - c.p) < 0.13 || m.label === c.label)) continue;
    if (c.kind === 'commits' && milestones.filter(m => m.kind === 'tag').length >= 2) continue;
    milestones.push(c);
  }
  milestones.sort((a, b) => a.p - b.p);
  const monthsBetween = (a, b) => Math.max(0, Math.round((b - a) / (30.44 * 864e5)));
  const ms = milestones.map(m => ({ kind: m.kind, label: m.label, p: +m.p.toFixed(4), date: new Date(m.t).toISOString().slice(0, 10), commits: countAt(m.p), authors: authorsAtP(m.p), months: monthsBetween(t0, m.t) }));

  // --- lenguajes del árbol final (archivos vivos, solo código si hay) ---
  const langCount = {};
  for (const f of all) if (f.death === null) { const l = langOf(f.path); langCount[l] = (langCount[l] || 0) + 1; }
  const entries = Object.entries(langCount).sort((a, b) => b[1] - a[1]);
  const code = entries.filter(([l]) => CODE_LANGS.has(l));
  const top = (code.length >= 2 ? code : entries).slice(0, 4);
  const totalTop = entries.reduce((a, [, v]) => a + v, 0) || 1;
  const languages = top.map(([l, v]) => ({ name: l, pct: Math.max(1, Math.round(v / totalTop * 100)), color: LANG_COLORS[l] || LANG_COLORS.Other }));

  return {
    lang, name,
    first: new Date(t0).toISOString(), last: new Date(t1).toISOString(),
    firstCommit: { hash: commits[0].hash.slice(0, 7), msg: commits[0].subject.slice(0, 50) },
    totals: { commits: n, authors: byAuthor.size, files: filesAt[N - 1], activeDays: new Set(commits.map(c => new Date(c.t).toISOString().slice(0, 10))).size },
    languages, nodes, labels, touches, authors, commits: commitCards, milestones: ms,
    series: { commits: commitsAt, files: filesAt, authors: authorsAt, time: timeAt, extent: extentAt },
    collapsed: maxDepth < Math.max(1, ...all.map(f => depthOf(f.path))),
  };
}

export function analyzeRepo(repo, { since, until, name, lang } = {}) {
  const commits = readCommits(repo, { since, until });
  return buildTimelapse({ commits, tags: readTags(repo), name: name || path.basename(path.resolve(repo)), lang });
}
