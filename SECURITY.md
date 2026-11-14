# Security

repo-timelapse runs on your machine. It reads `git log` from the repository you point it at and writes an MP4. Besides fonts and, on first run, a headless Chrome for rendering, it only goes online with `--github`: it clones that repo (history only, no file contents) into a temporary folder that is deleted afterwards. A token, if given, is only sent to github.com.

## Reporting a vulnerability

Please **don't open a public issue**. Use **Security → Report a vulnerability** in this repository.

---

**Español:** si encuentras una vulnerabilidad, no abras un issue público. Usa **Security → Report a vulnerability** en este repositorio.
