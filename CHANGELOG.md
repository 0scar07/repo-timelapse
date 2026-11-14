# Changelog

## 0.2.0 · 2026-11-14

- **GitHub Action** (`uses: 0scar07/repo-timelapse@v1`): renders the timelapse on every release, puts the GIF in your README and attaches the MP4 to the release.
- The main folders are labeled on the tree.
- Edited files flash, so the tree pulses with real activity (not only new files).
- GitHub profile photos for the contributors (with `--github` or a GitHub `origin`); `--no-avatars` to keep initials.
- `--gif` and `--readme <file>`.

## 0.1.0 · 2026-11-14

First release.

- `npx repo-timelapse`: a timelapse video of any git repository, in English or Spanish.
- `--github owner/repo`: any GitHub repo, cloned without file contents (fast even for huge histories).
- Radial tree of folders and files colored by language; new files glow, deleted ones fade out.
- Top contributors jump to the files they touch (bots excluded).
- Automatic milestones from major tags or round numbers of commits, with a pause and a card.
- Live counters, latest commit and a timeline with every milestone.
- Length adapts to the history (about 25 s to 1 min).
- Original soundtrack synthesized for each video, with hits on every milestone.
- `--vertical`, `--since`, `--until`, `--title`, `--json` and `--data`.
- Big repos: deep folders are grouped into clusters to keep it smooth.
