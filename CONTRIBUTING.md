# Contributing

Thanks for wanting to help! *Español más abajo.*

## Setup

```bash
git clone https://github.com/0scar07/repo-timelapse
cd repo-timelapse
npm install
npm run studio   # live preview with sample data
```

## Project map

| Path | What lives there |
|---|---|
| `src/history.mjs` | Reads `git log --name-status` and builds the tree, series, contributors and milestones |
| `src/timing.mjs` | The script of the video: intro, growth, milestone pauses, ending. Shared by the video and the music |
| `src/music.mjs` | Synthesizes the soundtrack for each video |
| `src/remotion/Timelapse.tsx` | The video. Every frame is a pure function of time |
| `src/remotion/strings.ts` | All texts, per language |
| `scripts/make-demo.mjs` | Builds `src/demo.json` from a made-up history |
| `bin/cli.mjs` | The command line |
| `tests/` | Tests with temporary git repos |

## Before opening a PR

```bash
npm run typecheck
npm test
npm run demo     # render the sample video and check it looks right
```

- Keep animations deterministic: no `Math.random()` or `Date.now()` inside the video.
- Motion: smooth ease in/out, no bounces, no shakes.
- New texts go in `strings.ts` for **every** language.

## Good first contributions

- **A new language** in `src/remotion/strings.ts` (and the `--lang` check in `bin/cli.mjs`).
- **Better milestone picking** in `src/history.mjs`.
- **A language color** in `LANG_COLORS`.

---

# Contribuir

1. Instala con `npm install` y abre el preview con `npm run studio`.
2. Antes del PR corre `npm run typecheck`, `npm test` y `npm run demo`.
3. Las animaciones deben ser deterministas: nada de `Math.random()` ni `Date.now()` dentro del video.
4. Los textos nuevos van en `src/remotion/strings.ts`, en **todos** los idiomas.
