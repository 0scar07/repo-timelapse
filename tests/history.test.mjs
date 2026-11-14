// Tests del analizador y del guion, con repos de git temporales.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { analyzeRepo, buildTimelapse, readCommits } from '../src/history.mjs';
import { makeTimeline, INTRO, PAUSE, OUTRO, growthSeconds } from '../src/timing.mjs';

let root, repo;
const env = d => ({ ...process.env, GIT_AUTHOR_DATE: d, GIT_COMMITTER_DATE: d });
function makeRepo(dir) {
  mkdirSync(dir, { recursive: true });
  const g = (...a) => execFileSync('git', ['-C', dir, ...a], { stdio: 'pipe' });
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 'Ana'); g('config', 'user.email', 'ana@example.com'); g('config', 'commit.gpgsign', 'false'); g('config', 'tag.gpgsign', 'false');
  return {
    commit(files, msg, date, author = 'Ana <ana@example.com>') {
      for (const [f, content] of Object.entries(files)) {
        const p = path.join(dir, f);
        if (content === null) { g('rm', '-q', f); continue; }
        mkdirSync(path.dirname(p), { recursive: true }); appendFileSync(p, content);
      }
      g('add', '-A');
      execFileSync('git', ['-C', dir, 'commit', '-q', '-m', msg, `--author=${author}`], { stdio: 'pipe', env: env(date) });
    },
    tag(name, date) { execFileSync('git', ['-C', dir, 'tag', '-a', name, '-m', name], { stdio: 'pipe', env: env(date) }); },
  };
}

before(() => {
  root = mkdtempSync(path.join(tmpdir(), 'rt-test-'));
  repo = path.join(root, 'demo');
  const r = makeRepo(repo);
  r.commit({ 'README.md': '# hi\n', 'src/index.ts': 'a\n' }, 'Initial commit', '2024-01-01T10:00:00Z');
  r.commit({ 'src/util.ts': 'b\n', 'src/deep/a/b/c.ts': 'c\n' }, 'feat: util', '2024-01-05T10:00:00Z', 'Bea <bea@example.com>');
  r.commit({ 'node_modules/x/index.js': 'x\n', 'dist/app.js': 'y\n' }, 'chore: oops build', '2024-01-06T10:00:00Z');
  r.tag('v1.0.0', '2024-02-01T10:00:00Z');
  r.commit({ 'docs/guide.md': 'g\n', 'src/old.ts': 'o\n' }, 'docs: guide', '2024-03-01T10:00:00Z');
  r.commit({ 'src/old.ts': null }, 'refactor: remove old', '2024-04-01T10:00:00Z', 'Bea <bea@example.com>');
  r.commit({ 'src/index.ts': 'more\n' }, 'feat: more', '2024-05-01T10:00:00Z', 'dependabot[bot] <bot@example.com>');
});
after(() => rmSync(root, { recursive: true, force: true }));

test('lee commits en orden con altas, cambios y bajas', () => {
  const c = readCommits(repo);
  assert.equal(c.length, 6);
  assert.equal(c[0].subject, 'Initial commit');
  assert.equal(c[0].files.get('src/index.ts'), 'A');
  assert.equal(c[4].files.get('src/old.ts'), 'D');
  assert.equal(c[5].files.get('src/index.ts'), 'M');
});

test('ignora node_modules y builds subidos por error', () => {
  const c = readCommits(repo);
  assert.equal(c[2].files.size, 0);
});

test('árbol: nodos, nacimientos y archivos borrados', () => {
  const d = analyzeRepo(repo, { lang: 'es' });
  assert.equal(d.name, 'demo');
  assert.equal(d.totals.commits, 6);
  assert.equal(d.totals.files, 5); // README, index, util, c.ts, guide (old.ts murió)
  const leaves = d.nodes.filter(n => !n.dir);
  assert.equal(leaves.length, 6);
  assert.ok(leaves.some(n => n.d !== null), 'old.ts tiene fecha de muerte');
  assert.equal(d.nodes[0].p, -1);
  for (const n of d.nodes.slice(1)) assert.ok(n.p >= 0 && d.nodes[n.p].dir === 1, 'cada nodo cuelga de una carpeta');
  for (const n of d.nodes.slice(1)) assert.ok(n.b >= d.nodes[n.p].b, 'un hijo no nace antes que su carpeta');
});

test('series de 240 muestras, crecientes en commits', () => {
  const d = analyzeRepo(repo);
  for (const k of ['commits', 'files', 'authors', 'time', 'extent']) assert.equal(d.series[k].length, 240);
  assert.equal(d.series.commits.at(-1), 6);
  for (let i = 1; i < 240; i++) assert.ok(d.series.commits[i] >= d.series.commits[i - 1]);
});

test('hitos: toma el tag v1.0.0 con su fecha y conteos', () => {
  const d = analyzeRepo(repo);
  const m = d.milestones.find(x => x.label === 'v1.0.0');
  assert.ok(m);
  assert.equal(m.date, '2024-02-01');
  assert.equal(m.commits, 3);
  assert.equal(m.authors, 2);
});

test('autores: los bots no salen como avatares', () => {
  const d = analyzeRepo(repo);
  assert.equal(d.totals.authors, 3);
  assert.deepEqual(d.authors.map(a => a.name), ['Ana', 'Bea']);
  assert.equal(d.authors[0].initials, 'A');
});

test('repos grandes: agrupa carpetas profundas para no pasar del límite', () => {
  const commits = [];
  for (let i = 0; i < 300; i++) {
    const files = new Map();
    for (let j = 0; j < 10; j++) files.set(`pkg${i % 7}/mod${i % 13}/sub${j}/file${i}-${j}.ts`, 'A');
    commits.push({ hash: String(i).padStart(8, '0'), t: Date.UTC(2020, 0, 1) + i * 864e5, author: 'X', email: 'x@x', subject: 'c', files });
  }
  const d = buildTimelapse({ commits, name: 'big' });
  assert.equal(d.collapsed, true);
  assert.ok(d.nodes.filter(n => !n.dir).length <= 1400);
  assert.ok(d.nodes.some(n => n.w > 1), 'hay racimos con varios archivos');
});

test('guion: duración, pausas en los hitos y progreso', () => {
  const data = { totals: { commits: 1000 }, milestones: [{ p: 0.5 }] };
  const tl = makeTimeline(data);
  const G = growthSeconds(1000);
  assert.equal(tl.total, INTRO + G + PAUSE + OUTRO);
  assert.equal(tl.prog(0), 0);
  assert.equal(tl.prog(INTRO + G * 0.25), 0.25);
  assert.equal(tl.prog(tl.pauses[0].start + 1), 0.5);
  assert.equal(tl.pauseAt(tl.pauses[0].start + 1).i, 0);
  assert.equal(tl.prog(tl.growthEnd + 1), 1);
  assert.ok(growthSeconds(1) >= 14 && growthSeconds(1e7) <= 40);
});
