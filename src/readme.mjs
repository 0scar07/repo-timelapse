// Inserta (o actualiza) el bloque del timelapse en un README, entre marcadores.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const START = '<!-- repo-timelapse:start -->';
export const END = '<!-- repo-timelapse:end -->';

const rel = (from, to) => path.relative(path.dirname(from), to).split(path.sep).join('/');

export function readmeBlock({ readme, image, video, lang, name }) {
  const es = lang === 'es';
  return [
    START,
    `<a href="${rel(readme, video)}"><img src="${rel(readme, image)}" alt="${es ? `Timelapse de ${name}` : `${name} timelapse`}" width="640"></a>`,
    '',
    `<sub>${es ? 'Así creció' : 'How'} ${name}${es ? '' : ' grew'} · <a href="${rel(readme, video)}">${es ? 'ver con sonido' : 'watch with sound'}</a> · ${es ? 'hecho con' : 'made with'} <a href="https://github.com/0scar07/repo-timelapse">repo-timelapse</a></sub>`,
    END,
  ].join('\n');
}

export function updateReadme(opts) {
  const block = readmeBlock(opts);
  const text = existsSync(opts.readme) ? readFileSync(opts.readme, 'utf8') : '';
  const s = text.indexOf(START), e = text.indexOf(END);
  const next = s !== -1 && e > s
    ? text.slice(0, s) + block + text.slice(e + END.length)
    : (text.trimEnd() ? text.trimEnd() + '\n\n' : '') + block + '\n';
  if (next !== text) writeFileSync(opts.readme, next);
  return next !== text;
}
