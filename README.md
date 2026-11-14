<div align="center">

# repo timelapse

**Watch your repository grow, as a video.**

One command turns your git history into a timelapse: folders branch out, files light up as they're born, contributors jump to what they touch, and every big release gets its moment. With its own soundtrack.

[![npm](https://img.shields.io/npm/v/repo-timelapse?color=9D8CFF&label=npm)](https://www.npmjs.com/package/repo-timelapse)
[![CI](https://github.com/0scar07/repo-timelapse/actions/workflows/ci.yml/badge.svg)](https://github.com/0scar07/repo-timelapse/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-9D8CFF)](LICENSE)

[Español](README.es.md)

<img src="docs/demo-en.gif" alt="repo timelapse demo: a radial tree of folders and files growing over time, with contributors, a milestone card and a closing summary" width="720">

<sub>Sample data. Real examples with sound (like <b>expressjs/express</b>, 17 years in under a minute) in <a href="https://github.com/0scar07/repo-timelapse/releases">Releases</a>.</sub>

</div>

## Quick start

```bash
npx repo-timelapse
```

Run it inside any git repository. You get `<repo>-timelapse.mp4`.

Any public GitHub repo works too, without cloning it yourself:

```bash
npx repo-timelapse --github expressjs/express
```

It only downloads the history (commits and folder structure), not the file contents, so even huge repos are fast.

**Requirements:** Node.js 18.17+ and git. The first run takes a couple of minutes: npx installs the renderer and downloads a headless Chrome (only once).

## What you'll see

| Moment | What happens |
|---|---|
| Intro | The repo name, the day it started and its first commit, as a seed |
| Growth | Folders are branches and files are lights, colored by language. The main folders are labeled. New files glow, edited files flash, deleted ones fade out in red. The camera pulls back as the tree grows |
| Contributors | The top contributors jump to the files they touch, with a dotted beam. On GitHub repos they show their real profile photo |
| Milestones | At each big release (`v1.0.0`, `2.0.0`…) or round number of commits, time stops and a card shows how far the project had come |
| HUD | Live counters of commits, files and people, the latest commit, and a timeline with every milestone |
| Ending | The full tree and a summary: how long, how many commits, people, files and active days |

The video length adapts to the history: from about 25 seconds for small repos to about a minute for big ones. Milestones are picked automatically from your tags.

## In your README, on every release

Add `.github/workflows/timelapse.yml` and your README will show how the project grew, updated on each release (the MP4 is also attached to the release):

```yaml
name: timelapse
on:
  release:
    types: [published]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  timelapse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0                                   # the whole history
          ref: ${{ github.event.repository.default_branch }}
      - uses: 0scar07/repo-timelapse@v1
```

Put these two lines where you want the GIF; otherwise it goes at the end:

```md
<!-- repo-timelapse:start -->
<!-- repo-timelapse:end -->
```

| Input | Default | What it does |
|---|---|---|
| `title` | repo name | Name shown in the video |
| `lang` | `en` | `en` or `es` |
| `readme` | `README.md` | README to update (empty to skip) |
| `output-dir` | `.github/timelapse` | Where the MP4, GIF and data go |
| `vertical` | `false` | Also render a 9:16 video |
| `release-asset` | `true` | Attach the MP4 to the release that triggered it |
| `commit` | `true` | Commit and push to the default branch |

## Options

| Flag | What it does |
|---|---|
| `--github <owner/repo>` | A GitHub repo instead of a local folder |
| `--token <token>` | GitHub token (or `GITHUB_TOKEN`) for private repos |
| `--since <date>` / `--until <date>` | Only part of the history, e.g. `--since 2024-01-01` |
| `--title <text>` | Name shown in the video (default: folder or repo name) |
| `--lang es\|en` | Video language (default: your system language) |
| `--vertical` | Vertical 9:16 video for TikTok, Reels and Shorts |
| `--fps 30\|60` | Frame rate (default 30) |
| `--no-music` | Silent video |
| `--no-avatars` | Initials instead of GitHub profile photos |
| `--gif` | Also make a light GIF (for READMEs) |
| `--readme <file>` | Put the GIF into that README, between markers |
| `--gl <mode>` | Chrome rendering: `angle` (GPU, default on Windows and macOS), `swangle`, `default` |
| `-o, --out <file>` | Output file |
| `--json` | Print the computed data and skip rendering |
| `--data <file>` | Render from a saved JSON |
| `--demo` | Render with sample data |

**Big repos:** if there are more than ~1,400 files, the deepest folders are grouped into clusters so the video stays smooth. Bots (dependabot, renovate…) count in the totals but don't appear as contributors.

## How it works

1. `git log --name-status` gives every commit with the files it added, changed or deleted. No diffs are computed, which keeps it fast.
2. The folder tree is laid out radially: angle by number of files, radius by depth.
3. Each frame of the video is a pure function of time ([Remotion](https://www.remotion.dev)), so renders are deterministic.
4. The soundtrack is synthesized for each video (120 BPM, original, MIT): the beat drops at every milestone and the ending gets a shimmer.

## Development

```bash
npm install
npm run studio   # live preview in Remotion Studio with the sample data
npm run demo     # render the sample video
npm test
```

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Related

From the same family: [git wrapped](https://github.com/0scar07/git-wrapped), your year in git as an 18-second video.

Inspired by [Gource](https://github.com/acaudwell/Gource), the classic repository visualizer.

## License

[MIT](LICENSE)
