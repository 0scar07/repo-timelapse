// Banda sonora sintetizada a la medida de cada video (120 BPM, original, MIT).
// El ritmo sigue al guion: entra con el crecimiento, se corta con un impacto en cada hito,
// sube con un riser antes de seguir y termina con un brillo en el cierre.
import { INTRO } from './timing.mjs';

const SR = 44100, BEAT = 0.5;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
const ROOTS = [45, 41, 48, 43];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const lpA = fc => 1 - Math.exp(-2 * Math.PI * fc / SR);

/** @param {{ total: number, growthEnd: number, pauses: { start: number, end: number }[] }} tl */
export function synthMusic(tl) {
  const DUR = tl.total, N = Math.ceil(SR * DUR);
  const Lc = new Float32Array(N), Rc = new Float32Array(N), send = new Float32Array(N);
  let seed = 3;
  const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const add = (i, v, pan = 0, rev = 0) => { if (i < 0 || i >= N) return; Lc[i] += v * (1 - Math.max(0, pan)); Rc[i] += v * (1 + Math.min(0, pan)); send[i] += v * rev; };
  const chordAt = t => Math.floor(t / 2) % 4;
  const inPause = t => tl.pauses.some(p => t >= p.start && t < p.end);
  const drums = t => t >= INTRO && t < tl.growthEnd && !inPause(t);

  // golpes de bombo en la rejilla, solo donde hay ritmo
  const kicks = [];
  for (let t = INTRO; t < tl.growthEnd; t += BEAT) if (drums(t)) kicks.push(t);
  const duck = t => { let d = 1; for (const k of kicks) { const x = t - k; if (x >= 0 && x < 0.4) d = Math.min(d, 1 - 0.5 * Math.exp(-x * 9)); if (k > t) break; } return d; };

  // pad de acordes (todo el video)
  { const ph = new Float64Array(6); let y = 0; const a = lpA(1000);
    for (let i = 0; i < N; i++) {
      const t = i / SR, c = CHORDS[chordAt(t)]; let s = 0;
      for (let k = 0; k < 6; k++) { ph[k] = (ph[k] + hz(c[k >> 1]) * (k & 1 ? 1.004 : 0.996) / SR) % 1; s += ph[k] * 2 - 1; }
      y += a * (s - y);
      const env = Math.min(1, t / 1.5) * (inPause(t) ? 1.25 : 1);
      add(i, y * 0.045 * env * duck(t), 0, 0.35);
    } }
  // bombo
  for (const k of kicks) { let ph = 0; const i0 = Math.round(k * SR);
    for (let n = 0; n < SR * 0.35; n++) { const t = n / SR; ph += 2 * Math.PI * (45 + 110 * Math.exp(-t * 32)) / SR; add(i0 + n, Math.sin(ph) * Math.exp(-t * 9) * 0.8); } }
  // hi-hat en contratiempo y palma en 2 y 4
  for (let t = INTRO + BEAT / 2; t < tl.growthEnd; t += BEAT) { if (!drums(t)) continue;
    const i0 = Math.round(t * SR); let prev = 0;
    for (let n = 0; n < SR * 0.06; n++) { const x = noise(); add(i0 + n, (x - prev) * Math.exp(-n / SR * 70) * 0.08, 0.25); prev = x; } }
  for (let t = INTRO + BEAT; t < tl.growthEnd; t += BEAT * 2) { if (!drums(t) || t < INTRO + 4) continue;
    const i0 = Math.round(t * SR); let y = 0; const a = lpA(2500);
    for (let n = 0; n < SR * 0.2; n++) { const tt = n / SR; y += a * (noise() - y); add(i0 + n, y * Math.exp(-tt * 20) * 0.3, -0.1, 0.4); } }
  // bajo en corcheas
  { let ph = 0, y = 0;
    for (let i = Math.round(INTRO * SR); i < Math.min(N, Math.round(tl.growthEnd * SR)); i++) {
      const t = i / SR; if (!drums(t)) { y *= 0.999; continue; }
      const step = (t % 0.25) / 0.25, f = hz(ROOTS[chordAt(t)] - 12 + (Math.floor(t / 0.25) % 4 === 3 ? 12 : 0));
      ph = (ph + f / SR) % 1; y += lpA(180 + 900 * Math.exp(-step * 5)) * ((ph * 2 - 1) - y);
      add(i, y * 0.26 * Math.min(1, step * 40) * (1 - step * 0.4) * duck(t));
    } }
  // arpegio suave durante el crecimiento
  { let k = 0;
    for (let t = INTRO + 2; t < tl.growthEnd; t += 0.25, k++) { if (!drums(t)) continue;
      const c = CHORDS[chordAt(t)], f = hz(c[k % 3] + 24), i0 = Math.round(t * SR);
      for (let n = 0; n < SR * 0.3; n++) { const tt = n / SR; add(i0 + n, Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 10) * 0.04, k % 2 ? 0.4 : -0.4, 0.5); } } }
  // hitos: impacto al llegar y riser antes de seguir
  for (const pz of tl.pauses) {
    { const i0 = Math.round(pz.start * SR); let ph = 0, y = 0; const a = lpA(1800);
      for (let n = 0; n < SR * 1.6; n++) { const t = n / SR; ph += 2 * Math.PI * (40 + 80 * Math.exp(-t * 20)) / SR; y += a * (noise() - y);
        add(i0 + n, Math.sin(ph) * Math.exp(-t * 4) * 0.75 + y * Math.exp(-t * 3) * 0.22, 0, 0.6); } }
    { const a0 = pz.end - 1.1; let y = 0;
      for (let i = Math.round(a0 * SR); i < Math.round(pz.end * SR); i++) { const k = (i / SR - a0) / 1.1; y += lpA(300 + 6000 * k * k) * (noise() - y); add(i, y * 0.3 * k * k, 0, 0.3); } }
  }
  // whoosh al empezar a crecer y brillo en el cierre
  { const i0 = Math.round((INTRO - 0.25) * SR); let y = 0, y2 = 0;
    for (let n = 0; n < SR * 0.5; n++) { const k = n / (SR * 0.5), env = Math.sin(Math.PI * k) ** 2, fc = 600 + 3500 * Math.sin(Math.PI * k);
      y += lpA(fc) * (noise() - y); y2 += lpA(fc * 0.4) * (y - y2); add(i0 + n, (y - y2) * env * 0.22, (k - 0.5) * 0.8); } }
  for (const [m, g] of [[76, 1], [81, 0.8], [84, 0.6], [88, 0.4]]) {
    const f = hz(m), i0 = Math.round((tl.growthEnd + 0.2) * SR);
    for (let n = 0; n < SR * 3; n++) { const t = n / SR; add(i0 + n, Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 1.3) * 0.035 * g * Math.min(1, t * 60), 0, 0.7); }
  }
  // reverb sencilla
  { const combs = [0.0297, 0.0371, 0.0411, 0.0437].map(d => ({ buf: new Float32Array(Math.round(d * SR)), i: 0 }));
    const ap = { buf: new Float32Array(Math.round(0.005 * SR)), i: 0 };
    for (let n = 0; n < N; n++) { let s = 0;
      for (const c of combs) { const o = c.buf[c.i]; c.buf[c.i] = send[n] + o * 0.82; c.i = (c.i + 1) % c.buf.length; s += o; }
      const o = ap.buf[ap.i], v = -s * 0.5 + o; ap.buf[ap.i] = s + o * 0.5; ap.i = (ap.i + 1) % ap.buf.length;
      Lc[n] += v * 0.18; Rc[n] += v * 0.18; } }
  // master: saturación suave, final suave y normalizado
  let peak = 0;
  for (let n = 0; n < N; n++) { const t = n / SR, fade = t > DUR - 1.5 ? Math.max(0, (DUR - t) / 1.5) : 1;
    Lc[n] = Math.tanh(Lc[n] * 1.2) * fade; Rc[n] = Math.tanh(Rc[n] * 1.2) * fade; peak = Math.max(peak, Math.abs(Lc[n]), Math.abs(Rc[n])); }
  const g = 0.85 / (peak || 1);
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let n = 0; n < N; n++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Lc[n] * g)) * 32767), 44 + n * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Rc[n] * g)) * 32767), 46 + n * 4);
  }
  return buf;
}
