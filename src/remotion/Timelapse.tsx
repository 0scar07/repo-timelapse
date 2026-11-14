import React, { CSSProperties, useMemo } from 'react';
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { makeTimeline } from '../timing.mjs';
import { strings } from './strings';
import type { Props, TimelapseData } from './types';

const inter = loadInter('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin', 'latin-ext'] }).fontFamily;
const mono = loadMono('normal', { weights: ['400', '500'], subsets: ['latin', 'latin-ext'] }).fontFamily;

// --- curvas: suaves, sin rebote ---
const cl = (x: number) => Math.max(0, Math.min(1, x));
const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const oc = (x: number) => 1 - Math.pow(1 - x, 3);
const up = (t: number, a: number, b: number, f = io) => f(cl((t - a) / (b - a)));
const L = (a: number, b: number, k: number) => a + (b - a) * k;
const win = (t: number, a: number, b: number, c: number, d: number) => up(t, a, b) * (1 - up(t, c, d));
const st = (o: number, x = 0, y = 0, s = 1, center = false): CSSProperties => ({
  opacity: o, display: o <= 0.001 ? 'none' : undefined,
  transform: `${center ? 'translate(-50%,-50%) ' : ''}translate(${x}px,${y}px) scale(${s})`,
});
/** valor de una serie muestreada en p (interpolado) */
const serie = (arr: number[], p: number) => {
  const f = cl(p) * (arr.length - 1), i = Math.floor(f), j = Math.min(arr.length - 1, i + 1);
  return arr[i] + (arr[j] - arr[i]) * (f - i);
};

export const Timelapse: React.FC<Props> = ({ data, music }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const fadeFrom = Math.max(0, durationInFrames - fps * 1.6);
  return (
    <AbsoluteFill style={{ background: '#050507' }}>
      <Scene data={data} />
      {music ? <Audio src={staticFile(music)} volume={f => interpolate(f, [fadeFrom, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} /> : null}
    </AbsoluteFill>
  );
};

const Scene: React.FC<{ data: TimelapseData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const s = strings(data.lang);
  const V = height > width;
  const W = width - 128, H = height - 128;
  const tl = useMemo(() => makeTimeline(data), [data]);
  const p = tl.prog(t);
  const G = tl.G;
  const pz = tl.pauseAt(t);
  const end = up(t, tl.growthEnd + 0.15, tl.growthEnd + 1.2);
  const hud = win(t, 3, 3.6, tl.growthEnd - 0.3, tl.growthEnd + 0.25);
  const nodes = data.nodes;

  // --- cámara: encuadra el árbol visible; al final se corre para dejar sitio al resumen ---
  const ext = Math.max(60, serie(data.series.extent, p));
  const fitR = V ? Math.min(W * 0.46, H * 0.32) : Math.min(H * 0.44, W * 0.32);
  const introZoom = L(1, 0, up(t, 2.4, 3.6));
  const sc0 = Math.max(0.3, Math.min(2.6, fitR / ext));
  const sc = L(sc0 * (1 + 0.25 * introZoom), V ? Math.min(W * 0.42, H * 0.26) / ext : Math.min(H * 0.42, W * 0.27) / ext, end);
  const cx = L(W / 2, V ? W / 2 : W * 0.31, end);
  const cy = L(V ? H * 0.47 : H / 2 - 18, V ? H * 0.3 : H / 2, end) + (V ? 260 : 190) * introZoom;
  const dim = 1 - 0.62 * (pz.i >= 0 ? win(pz.k, 0, 0.12, 0.86, 1) : 0);

  // --- árbol (SVG en texto: rápido incluso con cientos de nodos) ---
  let edges = '', dots = '';
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.b > p || t < 3) continue; // en la intro solo se ve la semilla
    const age = (p - n.b) * G;
    let life = 1;
    if (n.d !== null && p >= n.d) { life = 1 - cl(((p - n.d) * G) / 0.8); if (life <= 0) continue; }
    const k = oc(cl(age / 0.5));
    const par = nodes[n.p];
    const px = cx + par.x * sc, py = cy + par.y * sc;
    const x = L(px, cx + n.x * sc, k), y = L(py, cy + n.y * sc, k);
    const mx = (px + x) / 2 + ((px + x) / 2 - cx) * 0.05, my = (py + y) / 2 + ((py + y) / 2 - cy) * 0.05;
    edges += `<path d="M${px.toFixed(1)},${py.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}" stroke="${n.dir ? '#3a3260' : '#2a2640'}" stroke-width="${n.dir ? 2.6 : 1.3}" fill="none" opacity="${life.toFixed(2)}"/>`;
    const zoomR = Math.max(0.55, Math.min(1.6, sc));
    if (n.dir) {
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${((n.depth === 1 ? 6 : 3.6) * zoomR * life).toFixed(1)}" fill="#6b5ce0"/>`;
    } else {
      const fresh = cl(1 - age / 1.2);
      const r = (5.2 + Math.min(4, Math.log2(1 + n.w)) + 2.5 * fresh) * zoomR * k * life;
      if (fresh > 0.02) dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 16 * fresh).toFixed(1)}" fill="${n.c}" opacity="${(0.3 * fresh).toFixed(2)}"/>`;
      if (life < 1) dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 10 * (1 - life)).toFixed(1)}" fill="#FF7A9A" opacity="${(0.35 * life).toFixed(2)}"/>`;
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${n.c}"/>`;
    }
  }
  const pulse = 1 + 0.15 * Math.sin(t * 4);
  dots += `<circle cx="${cx}" cy="${cy}" r="${(34 * pulse * Math.max(0.7, Math.min(1.4, sc))).toFixed(1)}" fill="#9D8CFF" opacity=".15"/><circle cx="${cx}" cy="${cy}" r="${(13 * Math.max(0.8, Math.min(1.3, sc))).toFixed(1)}" fill="#9D8CFF"/>`;

  // --- autores: saltan al archivo que acaban de tocar y lanzan un rayo ---
  let beams = '';
  const avatars = data.authors.map((a, ai) => {
    const ev = a.events;
    let k = -1; for (let j = ev.length - 1; j >= 0; j--) if (ev[j][0] <= p) { k = j; break; }
    if (k < 0 || hud < 0.01) return null;
    const cur = ev[k], prev = ev[Math.max(0, k - 1)];
    const idle = (p - cur[0]) * G;
    const o = hud * (1 - cl((idle - 2.5) / 0.8)) * (pz.i >= 0 ? 1 - win(pz.k, 0, 0.12, 0.86, 1) : 1) * (1 - end);
    if (o < 0.01) return null;
    const pos = (ni: number) => { const n = nodes[ni]; return [cx + n.x * sc, cy + n.y * sc]; };
    const [x0, y0] = pos(prev[1]), [x1, y1] = pos(cur[1]);
    const mv = io(cl(((p - cur[0]) * G) / 0.45));
    const fx = L(x0, x1, mv), fy = L(y0, y1, mv);
    // hacia afuera del árbol, y cada persona en su propio ángulo del abanico para no encimarse
    const out = Math.atan2(fy - cy, fx - cx) + (ai - (data.authors.length - 1) / 2) * 0.85;
    const ox = Math.cos(out) * 105, oy = Math.sin(out) * 105;
    const ax = Math.max(50, Math.min(W - 50, fx + ox)), ay = Math.max(V ? 290 : 60, Math.min(H - (V ? 360 : 230), fy + oy));
    const bo = o * (1 - cl(idle / 1.6));
    if (bo > 0.02) beams += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${a.color}" stroke-width="3" stroke-dasharray="2 8" stroke-dashoffset="${(-t * 40).toFixed(1)}" stroke-linecap="round" opacity="${(0.85 * bo).toFixed(2)}"/>`;
    return (
      <div key={ai} className="avatar" style={{ left: ax, top: ay, opacity: o, background: a.color, boxShadow: `0 0 0 5px rgba(11,11,16,.9), 0 0 30px ${a.color}` }}>
        <span>{a.initials}</span><small>{a.name}</small>
      </div>
    );
  });

  // --- HUD ---
  const nCommits = Math.round(serie(data.series.commits, p));
  const nFiles = Math.round(serie(data.series.files, p));
  const nPeople = Math.max(1, Math.round(serie(data.series.authors, p)));
  const date = new Date(serie(data.series.time, p) * 1000);
  let ci = 0; for (let j = data.commits.length - 1; j >= 0; j--) if (data.commits[j].p <= p) { ci = j; break; }
  const cm = data.commits[ci];
  const first = new Date(data.first), last = new Date(data.last);
  const months = Math.max(0, Math.round((last.getTime() - first.getTime()) / (30.44 * 864e5)));
  const ms = pz.i >= 0 ? data.milestones[pz.i] : null;
  const nameSize = Math.min(V ? 96 : 120, (V ? W * 0.9 : W * 0.7) / (Math.max(4, data.name.length) * 0.56));
  const endNameSize = Math.min(88, (V ? W * 0.9 : 620) / (Math.max(4, data.name.length) * 0.56));

  return (
    <AbsoluteFill style={{ fontFamily: inter, color: '#fff' }}>
      <style>{css(mono)}</style>
      <div className="bg" />
      <div className="stage">
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: dim, filter: dim < 0.99 ? `blur(${((1 - dim) * 4).toFixed(1)}px)` : undefined }}
          dangerouslySetInnerHTML={{ __html: edges + dots }} />
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }} dangerouslySetInnerHTML={{ __html: beams }} />
        {avatars}

        {/* intro */}
        <div className="el" style={{ left: 0, right: 0, top: V ? H * 0.22 : 250, textAlign: 'center', ...st(win(t, 0.3, 0.8, 2.4, 2.9), 0, L(20, 0, up(t, 0.3, 0.9))) }}>
          <div className="sub mono" style={{ fontSize: 24, letterSpacing: 2 }}>{s.kicker}</div>
        </div>
        <div className="el" style={{ left: 0, right: 0, top: V ? H * 0.22 + 40 : 290, textAlign: 'center', ...st(win(t, 0.45, 1, 2.45, 2.95), 0, L(30, 0, up(t, 0.45, 1.05))) }}>
          <h1 style={{ fontSize: nameSize }}>{data.name}</h1>
        </div>
        <div className="el" style={{ left: 0, right: 0, top: (V ? H * 0.22 + 40 : 290) + nameSize * 1.25, textAlign: 'center', ...st(win(t, 0.7, 1.25, 2.5, 3), 0, L(30, 0, up(t, 0.7, 1.3))) }}>
          <div style={{ fontSize: V ? 30 : 34, fontWeight: 600 }}>{s.since} <span className="acc">{s.longDate(first)}</span></div>
        </div>
        <div className="el" style={{ left: 0, right: 0, bottom: V ? H * 0.25 : 120, textAlign: 'center', ...st(win(t, 1.1, 1.6, 2.5, 3), 0, L(20, 0, up(t, 1.1, 1.6))) }}>
          <span className="chip mono"><span className="acc">{data.firstCommit.hash}</span> {data.firstCommit.msg}</span>
        </div>

        {/* HUD */}
        <div className="el" style={{ left: 60, top: 54, ...st(hud, 0, L(-20, 0, up(t, 3, 3.6))) }}>
          <div className="mono sub" style={{ fontSize: 20 }}>{data.name}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', width: V ? W - 120 : 360 }}>
            {data.languages.map(l => <span key={l.name} className="chip" style={{ fontSize: 17, padding: '7px 14px' }}><span className="dot" style={{ background: l.color }} />{l.name}</span>)}
          </div>
        </div>
        <div className="el" style={{ ...(V ? { left: 60, top: 170 } : { right: 64, top: 50 }), ...st(hud, 0, L(-20, 0, up(t, 3.1, 3.7))) }}>
          <div style={{ display: 'flex', gap: 46, textAlign: V ? 'left' : 'right' }}>
            <div className="counter"><b>{s.num(nCommits)}</b>{s.commits}</div>
            <div className="counter"><b>{s.num(nFiles)}</b>{s.files}</div>
            <div className="counter"><b>{s.num(nPeople)}</b>{s.people}</div>
          </div>
        </div>
        <div className="el card" style={{ width: V ? W - 120 : 440, padding: '20px 24px', fontSize: 19, ...(V ? { left: 60, bottom: 190 } : { right: 64, top: 200 }), ...st(hud * (pz.i >= 0 ? 1 - win(pz.k, 0, 0.1, 0.9, 1) : 1), L(30, 0, up(t, 3.4, 4))) }}>
          <div className="mono" style={{ color: '#d6d6e0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span className="acc">{cm.hash}</span> {cm.msg}</div>
          <div className="sub" style={{ marginTop: 8 }}>{cm.author} · {s.nFiles(cm.files)}</div>
        </div>
        <div className="el tl" style={{ ...st(hud, 0, L(30, 0, up(t, 3.2, 3.8))) }}>
          <div className="track" /><div className="fill" style={{ width: `${p * 100}%` }} />
          {data.milestones.map((m, i) => {
            const on = p >= m.p, now = pz.i === i;
            return <div key={i} className="ms" style={{ left: `${m.p * 100}%`, borderColor: on ? '#9D8CFF' : '#4a4370', background: now ? '#9D8CFF' : '#0B0B10', boxShadow: now ? '0 0 30px #9D8CFF' : 'none' }}>
              <span style={{ color: on ? '#cfc8ff' : '#8A8A99' }}>{m.kind === 'tag' ? m.label : s.commitsMilestone(m.label)}</span></div>;
          })}
          <div className="date" style={{ left: `${Math.max(5, Math.min(95, p * 100))}%` }}>{s.shortDate(date)}</div>
        </div>

        {/* hito */}
        {ms ? (
          <div className="el card" style={{ left: '50%', top: V ? '46%' : '44%', width: V ? W - 140 : 760, padding: '46px 54px', textAlign: 'center', ...st(win(pz.k, 0.04, 0.2, 0.84, 0.98), 0, 0, L(0.9, 1, up(pz.k, 0.04, 0.24)), true) }}>
            <div className="sub mono" style={{ fontSize: 22, letterSpacing: 2 }}>{s.milestone}</div>
            <h1 className="acc" style={{ fontSize: Math.min(110, ((V ? W - 240 : 650) / (Math.max(4, (ms.kind === 'tag' ? ms.label : s.commitsMilestone(ms.label)).length) * 0.6))), marginTop: 8 }}>{ms.kind === 'tag' ? ms.label : s.commitsMilestone(ms.label)}</h1>
            <div style={{ fontSize: 32, fontWeight: 600, marginTop: 8 }}>{s.longDate(new Date(ms.date + 'T12:00:00Z'))}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 50, marginTop: 34 }}>
              <div className="counter"><b>{s.num(ms.commits)}</b>{s.commits}</div>
              <div className="counter"><b>{s.num(ms.authors)}</b>{s.people}</div>
              <div className="counter"><b>{s.num(ms.months)}</b>{s.months}</div>
            </div>
          </div>
        ) : null}
        <div className="flash" style={{ opacity: pz.i >= 0 ? 0.9 * win(pz.k, 0, 0.04, 0.06, 0.22) : 0 }} />

        {/* cierre */}
        <div className="el" style={{ ...(V ? { left: 60, right: 60, top: H * 0.58 } : { right: 90, top: 150, width: 640 }), ...st(end, L(V ? 0 : 60, 0, end), L(V ? 40 : 0, 0, end)) }}>
          <div className="sub mono" style={{ fontSize: 22, letterSpacing: 2 }}>{s.span(Math.floor(months / 12), months % 12)}</div>
          <h1 style={{ fontSize: endNameSize, marginTop: 10 }}>{data.name}</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px 30px', marginTop: 36 }}>
            <div className="counter"><b>{s.num(data.totals.commits)}</b>{s.commits}</div>
            <div className="counter"><b>{s.num(data.totals.authors)}</b>{s.people}</div>
            <div className="counter"><b>{s.num(data.totals.files)}</b>{s.files}</div>
            <div className="counter"><b className="acc">{s.num(data.totals.activeDays)}</b>{s.activeDays}</div>
          </div>
          <div className="card mono" style={{ display: 'inline-block', marginTop: 44, padding: '20px 30px', fontSize: 30 }}><span className="sub">$ </span>npx <span className="acc">repo-timelapse</span></div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const css = (mono: string) => `
  *{box-sizing:border-box;margin:0;padding:0}
  .bg{position:absolute;inset:0;background:radial-gradient(1100px 800px at 12% 4%,#5B47C9 0%,transparent 60%),radial-gradient(900px 700px at 90% 20%,#2A1F6B 0%,transparent 65%),linear-gradient(160deg,#1E1745 0%,#09080F 75%)}
  .stage{position:absolute;inset:64px;border-radius:44px;background:#0B0B10;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)}
  .el{position:absolute}
  h1{font-weight:800;letter-spacing:-3px;line-height:1.02;white-space:nowrap}
  .acc{color:#9D8CFF}.sub{color:#8A8A99}.mono{font-family:${mono}}
  .chip{display:inline-flex;align-items:center;gap:10px;font-size:20px;font-weight:600;color:#cfc8ff;background:#1d1830;padding:9px 16px;border-radius:999px;white-space:nowrap}
  .dot{width:12px;height:12px;border-radius:50%;display:inline-block}
  .counter{font-size:20px;color:#8A8A99;font-weight:500}
  .counter b{display:block;font-size:46px;color:#fff;font-weight:700;letter-spacing:-1px;font-variant-numeric:tabular-nums}
  .card{background:#15151D;border:1px solid #24242F;border-radius:30px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
  .avatar{position:absolute;width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:#0B0B10;transform:translate(-50%,-50%)}
  .avatar small{position:absolute;top:70px;left:50%;transform:translateX(-50%);font-size:17px;font-weight:600;color:#cfcfe0;white-space:nowrap}
  .tl{left:70px;right:70px;bottom:70px;height:70px}
  .tl .track{position:absolute;left:0;right:0;top:34px;height:6px;border-radius:3px;background:#22222c}
  .tl .fill{position:absolute;left:0;top:34px;height:6px;border-radius:3px;background:linear-gradient(90deg,#5B3FE0,#9D8CFF)}
  .tl .ms{position:absolute;top:25px;width:24px;height:24px;border-radius:50%;border:4px solid;transform:translateX(-50%)}
  .tl .ms span{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:17px;font-weight:600}
  .tl .date{position:absolute;top:50px;font-family:${mono};font-size:22px;transform:translateX(-50%);white-space:nowrap}
  .flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 46%,rgba(157,140,255,.55),transparent 60%);pointer-events:none}
`;
