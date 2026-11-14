<div align="center">

# repo timelapse

**Mira crecer tu repositorio, en video.**

Un comando convierte tu historial de git en un timelapse: las carpetas se ramifican, los archivos se encienden al nacer, las personas saltan a lo que tocan y cada release importante tiene su momento. Con banda sonora propia.

[![npm](https://img.shields.io/npm/v/repo-timelapse?color=9D8CFF&label=npm)](https://www.npmjs.com/package/repo-timelapse)
[![CI](https://github.com/0scar07/repo-timelapse/actions/workflows/ci.yml/badge.svg)](https://github.com/0scar07/repo-timelapse/actions/workflows/ci.yml)
[![licencia](https://img.shields.io/badge/licencia-MIT-9D8CFF)](LICENSE)

[English](README.md)

<img src="docs/demo-es.gif" alt="Demo de repo timelapse: un árbol radial de carpetas y archivos que crece con el tiempo, con personas, una tarjeta de hito y un resumen final" width="720">

<sub>Datos de ejemplo. Ejemplos reales con sonido (como <b>expressjs/express</b>, 17 años en menos de un minuto) en <a href="https://github.com/0scar07/repo-timelapse/releases">Releases</a>.</sub>

</div>

## Empieza

```bash
npx repo-timelapse
```

Ejecútalo dentro de cualquier repositorio de git. Obtienes `<repo>-timelapse.mp4`.

También sirve con cualquier repo público de GitHub, sin clonarlo tú:

```bash
npx repo-timelapse --github expressjs/express
```

Solo descarga la historia (commits y estructura de carpetas), no el contenido de los archivos, así que hasta los repos enormes van rápido.

**Requisitos:** Node.js 18.17+ y git. La primera vez tarda un par de minutos: npx instala el renderizador y descarga un Chrome sin interfaz (solo una vez).

## Qué vas a ver

| Momento | Qué pasa |
|---|---|
| Intro | El nombre del repo, el día que empezó y su primer commit, como una semilla |
| Crecimiento | Las carpetas son ramas y los archivos luces, con el color de su lenguaje. Los archivos nuevos brillan y los borrados se apagan en rojo. La cámara se aleja a medida que el árbol crece |
| Personas | Quienes más aportan saltan a los archivos que tocan, con un rayo punteado |
| Hitos | En cada release importante (`v1.0.0`, `2.0.0`…) o número redondo de commits, el tiempo se frena y una tarjeta muestra cuánto había crecido el proyecto |
| Marcadores | Contadores en vivo de commits, archivos y personas, el último commit y una línea de tiempo con los hitos |
| Cierre | El árbol completo y el resumen: cuánto tiempo, cuántos commits, personas, archivos y días activos |

La duración se adapta a la historia: unos 25 segundos para repos chicos y alrededor de un minuto para los grandes. Los hitos salen solos de tus tags.

## Opciones

| Opción | Qué hace |
|---|---|
| `--github <owner/repo>` | Un repo de GitHub en vez de una carpeta local |
| `--token <token>` | Token de GitHub (o `GITHUB_TOKEN`) para repos privados |
| `--since <fecha>` / `--until <fecha>` | Solo una parte de la historia, ej. `--since 2024-01-01` |
| `--title <texto>` | Nombre que se muestra (por defecto, el de la carpeta o el repo) |
| `--lang es\|en` | Idioma del video (por defecto, el de tu sistema) |
| `--vertical` | Video vertical 9:16 para TikTok, Reels y Shorts |
| `--fps 30\|60` | Fotogramas por segundo (30 por defecto) |
| `--no-music` | Video sin audio |
| `--gl <modo>` | Renderizado de Chrome: `angle` (GPU, por defecto en Windows y macOS), `swangle`, `default` |
| `-o, --out <archivo>` | Archivo de salida |
| `--json` | Solo imprime los datos, sin renderizar |
| `--data <archivo>` | Renderiza desde un JSON guardado |
| `--demo` | Renderiza con datos de ejemplo |

**Repos grandes:** si hay más de ~1.400 archivos, las carpetas más profundas se agrupan en racimos para que el video siga fluido. Los bots (dependabot, renovate…) cuentan en los totales pero no salen como personas.

## Cómo funciona

1. `git log --name-status` da cada commit con los archivos que añadió, cambió o borró. No se calculan diffs, por eso es rápido.
2. El árbol de carpetas se dibuja en forma radial: el ángulo según la cantidad de archivos y el radio según la profundidad.
3. Cada fotograma del video es una función pura del tiempo ([Remotion](https://www.remotion.dev)), así que los renders son deterministas.
4. La banda sonora se sintetiza para cada video (120 BPM, original, MIT): el ritmo se corta en cada hito y el cierre tiene un brillo.

## Desarrollo

```bash
npm install
npm run studio   # preview en vivo en Remotion Studio con los datos de ejemplo
npm run demo     # renderiza el video de ejemplo
npm test
```

Las contribuciones son bienvenidas. Mira [CONTRIBUTING.md](CONTRIBUTING.md).

## De la misma familia

[git wrapped](https://github.com/0scar07/git-wrapped): tu año en git en un video de 18 segundos.

Inspirado en [Gource](https://github.com/acaudwell/Gource), el visualizador de repositorios clásico.

## Licencia

[MIT](LICENSE)
