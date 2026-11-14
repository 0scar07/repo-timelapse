// Fotos de perfil de GitHub para los avatares.
// Para cada persona destacada se pregunta a la API de quién es uno de sus commits (eso enlaza el email con la cuenta).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

/** "owner/repo" desde --github o desde el remoto origin de un repo local (si es de GitHub). */
export function githubSlug(repoDir, explicit) {
  if (explicit) return explicit;
  try {
    const url = execFileSync('git', ['-C', repoDir, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const m = url.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
    return m ? m[1] : null;
  } catch { return null; }
}

/**
 * Descarga las fotos a `outDir` y devuelve los nombres de archivo por autor (o null si no hay).
 * Falla en silencio: sin red o sin límite de la API, quedan las iniciales.
 */
export async function fetchAvatars({ slug, authors, token, outDir }) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'repo-timelapse', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const out = [];
  for (let i = 0; i < authors.length; i++) {
    const a = authors[i];
    let file = null;
    try {
      if (a.hash) {
        const r = await fetch(`https://api.github.com/repos/${slug}/commits/${a.hash}`, { headers, signal: AbortSignal.timeout(8000) });
        const url = r.ok ? (await r.json()).author?.avatar_url : null;
        if (url) {
          const img = await fetch(`${url}${url.includes('?') ? '&' : '?'}s=128`, { signal: AbortSignal.timeout(8000) });
          if (img.ok) {
            const type = img.headers.get('content-type') || '';
            file = `avatar-${i}.${type.includes('png') ? 'png' : 'jpg'}`;
            writeFileSync(path.join(outDir, file), Buffer.from(await img.arrayBuffer()));
          }
        }
      }
    } catch { file = null; }
    out.push(file);
  }
  return out;
}
