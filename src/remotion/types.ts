import type { Lang } from './strings';

export type TNode = { x: number; y: number; p: number; dir: 0 | 1; depth: number; b: number; d: number | null; c: string | null; w: number };

export type TimelapseData = {
  lang: Lang;
  name: string;
  first: string;
  last: string;
  firstCommit: { hash: string; msg: string };
  totals: { commits: number; authors: number; files: number; activeDays: number };
  languages: { name: string; pct: number; color: string }[];
  nodes: TNode[];
  labels?: { i: number; name: string }[];
  touches?: [number, number][];
  authors: { name: string; initials: string; color: string; commits: number; join: number; events: [number, number][]; hash?: string; avatar?: string | null }[];
  commits: { p: number; hash: string; msg: string; author: string; files: number }[];
  milestones: { kind: 'tag' | 'commits'; label: string; p: number; date: string; commits: number; authors: number; months: number }[];
  series: { commits: number[]; files: number[]; authors: number[]; time: number[]; extent: number[] };
  collapsed?: boolean;
};

export type Props = { data: TimelapseData; fps?: number; music?: string | null; vertical?: boolean };
