#!/usr/bin/env node
// repo-timelapse: mira crecer tu repo en un video.
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeRepo } from '../src/history.mjs';
import { makeTimeline } from '../src/timing.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    github: { type: 'string' },
    token: { type: 'string' },
    since: { type: 'string' },
    until: { type: 'string' },
    title: { type: 'string' },
    lang: { type: 'string' },
    vertical: { type: 'boolean' },
    fps: { type: 'string' },
    'no-music': { type: 'boolean' },
    gl: { type: 'string' },
    out: { type: 'string', short: 'o' },
    json: { type: 'boolean' },
    data: { type: 'string' },
    demo: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
});

const sysLang = (Intl.DateTimeFormat().resolvedOptions().locale || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
const lang = o.lang === 'es' || o.lang === 'en' ? o.lang : sysLang;
const es = lang === 'es';
const say = (e, n) => console.log(es ? e : n);
const log = o.json ? () => {} : say;
const fail = (e, n) => { say(e, n); process.exit(1); };

if (o.version) { console.log(pkg.version); process.exit(0); }
if (o.help) {
  console.log(`
  repo-timelapse ${pkg.version}

  ${es ? 'Uso' : 'Usage'}:  npx repo-timelapse [${es ? 'ruta' : 'path'}] [${es ? 'opciones' : 'options'}]

  --github <owner/repo> ${es ? 'Un repo público de GitHub (se clona sin el contenido de los archivos, rápido)' : 'A public GitHub repo (cloned without file contents, fast)'}
  --token <token>       ${es ? 'Token de GitHub (o GITHUB_TOKEN) para repos privados' : 'GitHub token (or GITHUB_TOKEN) for private repos'}
  --since <fecha>       ${es ? 'Empieza en esa fecha (ej.: 2024-01-01)' : 'Start at that date (e.g. 2024-01-01)'}
  --until <fecha>       ${es ? 'Termina en esa fecha' : 'End at that date'}
  --title <texto>       ${es ? 'Nombre que se muestra (por defecto, el de la carpeta)' : 'Name shown (default: the folder name)'}
  --lang es|en          ${es ? 'Idioma del video' : 'Video language'}
  --vertical            ${es ? 'Formato vertical 9:16 para TikTok, Reels y Shorts' : 'Vertical 9:16 for TikTok, Reels and Shorts'}
  --fps 30|60           ${es ? 'Fotogramas por segundo (30 por defecto)' : 'Frames per second (default 30)'}
  --no-music            ${es ? 'Video sin audio' : 'Silent video'}
  --gl <modo>           ${es ? 'Renderizado de Chrome: angle (GPU), swangle, default…' : 'Chrome rendering: angle (GPU), swangle, default…'}
  -o, --out <archivo>   ${es ? 'Archivo de salida' : 'Output file'}
  --json                ${es ? 'Solo imprime los datos, sin renderizar' : 'Print the data only, no render'}
  --data <json>         ${es ? 'Renderiza desde un JSON ya generado' : 'Render from a saved JSON'}
  --demo                ${es ? 'Renderiza con datos de ejemplo' : 'Render with sample data'}
`);
  process.exit(0);
}

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
let data, cleanup = null;

if (o.demo) {
  data = { ...JSON.parse(readFileSync(path.join(root, 'src/demo.json'), 'utf8')), lang };
} else if (o.data) {
  data = { ...JSON.parse(readFileSync(path.resolve(o.data), 'utf8')), ...(o.lang ? { lang } : {}) };
} else {
  let repo = path.resolve(positionals[0] || '.');
  let name = o.title;
  if (o.github) {
    const slug = o.github.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(slug)) fail('Usa --github owner/repo (ej.: --github vercel/next.js)', 'Use --github owner/repo (e.g. --github vercel/next.js)');
    const token = o.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
    const dir = mkdtempSync(path.join(tmpdir(), 'repo-timelapse-'));
    cleanup = () => rmSync(dir, { recursive: true, force: true });
    const auth = token ? ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`] : [];
    log(`Clonando ${slug} (solo la historia, sin el contenido de los archivos)…`, `Cloning ${slug} (history only, no file contents)…`);
    try {
      git([...auth, 'clone', '--quiet', '--no-checkout', '--filter=blob:none', `https://github.com/${slug}.git`, dir], { env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    } catch {
      cleanup();
      fail(`No pude clonar ${slug}. ¿Existe y es público? Para privados usa --token.`, `Couldn't clone ${slug}. Does it exist and is it public? For private repos use --token.`);
    }
    repo = dir;
    name = name || slug.split('/')[1];
  } else {
    try { repo = git(['-C', repo, 'rev-parse', '--show-toplevel']).trim(); }
    catch { fail('Aquí no hay un repo de git. Pasa una ruta o usa --github owner/repo.', 'No git repo here. Pass a path or use --github owner/repo.'); }
  }
  log('Leyendo la historia…', 'Reading the history…');
  data = analyzeRepo(repo, { since: o.since, until: o.until, name, lang });
  cleanup?.();
  if (!data) fail('Ese repo no tiene commits (o ninguno en ese rango de fechas).', 'That repo has no commits (or none in that date range).');
}

if (o.json) { console.log(JSON.stringify(data)); process.exit(0); }

const tl = makeTimeline(data);
say(`${data.totals.commits} commits · ${data.totals.authors} ${es ? 'personas' : 'people'} · ${data.milestones.length} ${es ? 'hitos' : 'milestones'} · ${tl.total.toFixed(0)} s`,
  `${data.totals.commits} commits · ${data.totals.authors} people · ${data.milestones.length} milestones · ${tl.total.toFixed(0)}s`);
if (data.collapsed) say('(Repo grande: las carpetas más profundas se agrupan para que el video sea fluido.)', '(Big repo: the deepest folders are grouped so the video stays smooth.)');

const fps = o.fps === '60' ? 60 : 30;
const safe = data.name.replace(/[^\w.-]+/g, '-');
const out = path.resolve(o.out || `${safe}-timelapse${o.vertical ? '-vertical' : ''}.mp4`);
mkdirSync(path.dirname(out), { recursive: true });
const publicDir = mkdtempSync(path.join(tmpdir(), 'repo-timelapse-pub-'));
let music = null;
if (!o['no-music']) {
  const { synthMusic } = await import('../src/music.mjs');
  writeFileSync(path.join(publicDir, 'music.wav'), synthMusic(tl));
  music = 'music.wav';
}

const { bundle } = await import('@remotion/bundler');
const { renderMedia, selectComposition } = await import('@remotion/renderer');
say('Preparando el video…', 'Preparing the video…');
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/remotion/index.ts'), publicDir });
const inputProps = { data, fps, music, vertical: Boolean(o.vertical) };
const composition = await selectComposition({ serveUrl, id: 'Timelapse', inputProps });
let gl = o.gl ?? (process.platform === 'linux' ? null : 'angle');
const t0 = Date.now();
const render = () => {
  let last = -1;
  return renderMedia({
    composition, serveUrl, inputProps, codec: 'h264', outputLocation: out, crf: 18,
    chromiumOptions: gl && gl !== 'default' ? { gl } : {},
    onProgress: ({ progress }) => { const p = Math.floor(progress * 100); if (p !== last && p % 5 === 0) { last = p; process.stdout.write(`\r${es ? 'Renderizando' : 'Rendering'} ${p}%   `); } },
  });
};
try { await render(); } catch (err) {
  if (!gl || gl === 'default') throw err;
  say('\nLa aceleración por GPU falló; reintento sin ella…', '\nGPU acceleration failed; retrying without it…');
  gl = null; await render();
}
rmSync(publicDir, { recursive: true, force: true });
console.log('');
const secs = Math.round((Date.now() - t0) / 1000);
say(`Listo en ${secs} s: ${out}\nCompártelo con #RepoTimelapse`, `Done in ${secs}s: ${out}\nShare it with #RepoTimelapse`);
