# DUET — the web player

This directory is the DUET engine in a browser: `duet.wasm` is libduet
(Impulse Tracker, SID-Wizard through real reSID chips, the DUST and DUSK
synths, the mixer) compiled to WebAssembly, `index.html` is a player
around it, and `songs/` is a gallery of music it plays. Nothing here
talks to a server: a song you open is read inside the browser.

## Serving it

Put the directory on any static web server, under any path, and open
`index.html` through it. Two things are required and nothing else:

- **`https://`, or `http://localhost`** — an audio worklet needs a
  secure context. No special headers, no server-side code, no
  `SharedArrayBuffer`.
- **Open it over http, not from `file://`** — a page with a worklet
  and a `.wasm` will not start from a file URL.

To try it on your own machine:

```sh
python3 -m http.server -b 127.0.0.1 8000     # in this directory
# then http://localhost:8000/
```

Niceties, not requirements: serve `.wasm` as `application/wasm` and
gzip it (2.4 MB becomes 250 KB). The page's scripts and the module
carry a build stamp on their URLs (`?v=…`, the footer shows it), so
they may be cached for as long as you like; `index.html` itself should
be revalidated.

## What is in it

| file | what |
|---|---|
| `index.html`, `duet-player.js` | the player: drop / open / folder / gallery, the note strip and the pattern grid, the visualiser, the help |
| `duet-web.js` | the engine as a drop-in: one class, `DuetEngine`, for a page of your own |
| `duet-worklet.js` | the audio thread: owns the module, renders every 128-frame quantum, drains the event ring |
| `duet.wasm` | libduet, the DUET engine |
| `embed.html` | the engine in a page of your own, in thirty lines — the whole embedding shown |
| `songs/`, `songs.json` | the gallery with its provenance (`songs/MANIFEST.md`) |
| `JetBrainsMono-Regular.ttf`, `OFL.txt` | the font and its licence |
| `LICENSES/` | every licence in this directory, with the full texts the licences ask for |

## Embedding the engine

Copy `duet-web.js`, `duet-worklet.js` and `duet.wasm` beside your page:

```html
<script type="module">
  import { DuetEngine } from './duet-web.js';
  const duet = new DuetEngine();                       // the AudioContext + the worklet
  await duet.ready;
  await duet.open('music/tune.swm', { play: true });   // a URL, a File, a FileList, or [{ name, bytes }]
  duet.on('row', (ev) => sync(ev.order, ev.row));      // fired the moment the row is heard
</script>
```

`embed.html` shows the rest: the transport, the notes and markers off
the event ring, the position. The documentation is
[docs/web-player.md](https://github.com/M64GitHub/duetracker/blob/master/docs/web-player.md)
in the repository.

## Licences

`duet.wasm` contains reSID by Dag Lem and is **GPL-2.0-or-later**; so
are the page and the scripts, and so is any page that links the
engine. The font is JetBrains Mono under the SIL Open Font License.
The songs each carry their author, licence and source in
`songs.json` and `songs/MANIFEST.md`. `LICENSES/README.txt` lists all
of it, with the texts beside it.

Source: <https://github.com/M64GitHub/duetracker>
