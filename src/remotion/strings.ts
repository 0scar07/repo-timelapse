export type Lang = 'es' | 'en';

const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const S = {
  es: {
    kicker: 'REPO TIMELAPSE',
    since: 'Desde el', longDate: (d: Date) => `${d.getUTCDate()} de ${MES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`,
    shortDate: (d: Date) => `${MES[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`,
    commits: 'commits', files: 'archivos', people: 'personas', activeDays: 'días activos', months: 'meses',
    nFiles: (n: number) => `${n} ${n === 1 ? 'archivo' : 'archivos'}`,
    milestone: 'HITO', commitsMilestone: (n: string) => `${Number(n).toLocaleString('es-ES')} commits`,
    span: (y: number, m: number) => [y ? `${y} ${y === 1 ? 'AÑO' : 'AÑOS'}` : '', m ? `${m} ${m === 1 ? 'MES' : 'MESES'}` : ''].filter(Boolean).join(' Y ') || 'MENOS DE UN MES',
    num: (n: number) => n.toLocaleString('es-ES'),
  },
  en: {
    kicker: 'REPO TIMELAPSE',
    since: 'Since', longDate: (d: Date) => `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`,
    shortDate: (d: Date) => `${MON[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`,
    commits: 'commits', files: 'files', people: 'people', activeDays: 'active days', months: 'months',
    nFiles: (n: number) => `${n} ${n === 1 ? 'file' : 'files'}`,
    milestone: 'MILESTONE', commitsMilestone: (n: string) => `${Number(n).toLocaleString('en-US')} commits`,
    span: (y: number, m: number) => [y ? `${y} ${y === 1 ? 'YEAR' : 'YEARS'}` : '', m ? `${m} ${m === 1 ? 'MONTH' : 'MONTHS'}` : ''].filter(Boolean).join(' AND ') || 'LESS THAN A MONTH',
    num: (n: number) => n.toLocaleString('en-US'),
  },
};

export const strings = (l: Lang) => S[l] ?? S.en;
