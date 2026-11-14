// Guion del video según los datos: intro, crecimiento (con pausas en cada hito) y cierre.
// Lo comparten el video (Remotion) y la música, para que los golpes caigan justo en los hitos.

export const INTRO = 3;
export const OUTRO = 5.5;
export const PAUSE = 2.8;

/** Segundos de crecimiento: más commits, más tiempo (entre 14 y 40 s). */
export const growthSeconds = commits => Math.max(14, Math.min(40, 10 + 5 * Math.log10(Math.max(1, commits))));

/**
 * @param {{ totals: { commits: number }, milestones: { p: number }[] }} data
 */
export function makeTimeline(data) {
  const G = growthSeconds(data.totals.commits);
  const ms = [...data.milestones].sort((a, b) => a.p - b.p);
  // cada hito: momento en que llega (start) y en que sigue el crecimiento (end)
  const pauses = [];
  let offset = INTRO;
  for (const m of ms) {
    const start = offset + m.p * G;
    pauses.push({ p: m.p, start, end: start + PAUSE });
    offset += PAUSE;
  }
  const growthEnd = INTRO + G + PAUSE * ms.length;
  const total = growthEnd + OUTRO;

  /** progreso del repo (0 → 1) en el segundo t */
  const prog = t => {
    if (t <= INTRO) return 0;
    let shift = 0;
    for (const pz of pauses) {
      if (t < pz.start) break;
      if (t < pz.end) return pz.p;
      shift += PAUSE;
    }
    return Math.min(1, (t - INTRO - shift) / G);
  };
  /** índice del hito en pausa (o -1) y el avance dentro de la pausa (0 → 1) */
  const pauseAt = t => {
    for (let i = 0; i < pauses.length; i++) if (t >= pauses[i].start && t < pauses[i].end) return { i, k: (t - pauses[i].start) / PAUSE };
    return { i: -1, k: 0 };
  };
  return { G, total, growthEnd, pauses, prog, pauseAt };
}
