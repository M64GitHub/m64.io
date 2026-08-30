<div align="center">

<img src="assets/duet-splash.png" alt="DUET" width="560">

# DUET

**Impulse Tracker and SID-Wizard on one grid — two real trackers,
one clock, one save button.**

`v0.1.0-alpha` · Zig 0.15 · macOS / Linux terminal · SDL3 window

</div>

---

DUET is two complete trackers in one program. The Impulse Tracker
side plays and edits `.it` modules — samples, instruments, envelopes,
the order list — implemented from `ITTECH.TXT` (Impulse Tracker's
own technical reference) and held against OpenMPT renders. The
SID-Wizard side plays and edits `.swm` modules with SID-Wizard 1.97's
own player logic, reimplemented instruction-faithfully from Hermit's
6502 sources and held to a register scoreboard against the original,
through SID emulation (reSID). Both sides save their own formats
back, and the files open in the original programs.

Then the part neither original can do: the two play **together**. SID
voices stand as columns beside sample channels in one pattern, a
whole `.swm` can co-play beside an `.it` on the IT clock, and two
synths of DUET's own — **DUST**, a SID synth with table programs, and
**DUSK**, wavetable synthesis over your own samples — get columns of
the same grid. Over all of it sits a studio console: a strip per
channel, chip and synth, three-band EQs, four send effects with
return strips, and a master chain, so a C64 chip and a sample player
can share a reverb.

It runs at 60 fps in a kitty-class terminal, or in an SDL3 window
that is the same application, screen for screen.

## What's special

- **No private format.** `.it`, `.swm`/`.sws`/`.swt`/`.swq`, `.swi`
  load, edit, and save back — a module SID-Wizard saved returns byte
  for byte, and a resaved `.it` renders byte for byte. The project
  file is a small ZON text that *holds* the rest.
- **The clipboard is OpenMPT's.** A marked block goes out to the
  system clipboard as text — the format OpenMPT and Schism use — so
  blocks move between two DUETs or into any editor, and a program that
  generates patterns can hand one straight to the grid
  ([the format](docs/clipboard-format.md)).
- **reSID chip emulation**: up to four chips as pattern columns,
  each individually a 6581 or an 8580, register-exact, writes landing
  sample-accurately. DUST, the built-in SID synth (below), adds up to
  four more reSID instances of its own — eight SIDs all told.
- **The SID-Wizard player, note for note**: the 6502 driver mirrored
  in Zig — same tables, same quirks — verified write-for-write
  against the shipped player.
- **DUST and DUSK**: a native SID synth and a wavetable synth in the
  same grid, each with its own pattern-effect dialect, patch editors
  and an oscilloscope.
- **The console**: per-strip EQ, dynamics on the master, four send
  units with returns, automatable from the pattern; bounce the mix,
  stems, or one marked block.
- **One codebase, two faces**: the terminal and the window render the
  same screens and take the same keys; Windows cross-compiles.
- **Headless everything**: render, stems, register traces, screen
  dumps, screenshots, a scripted-keys harness — every feature works
  without a terminal, which is also how it is tested.
- **Built to explain itself**: the aim is that you never need a
  manual — every page has a hint line, every refusal names its
  reason, and `?` opens the key help on any screen.
- **A library.** The engine is `libduet` — a Zig module and a C ABI in
  libopenmpt's shape: open a song from bytes, render it, sync a demo
  or a game on its rows and markers ([libduet](docs/dev/libduet.md)) —
  and the same engine runs in a browser: [the web player](docs/dev/libduet.md#the-web-player-duetwasm)
  plays every format from a drop.

<div align="center">
<img src="docs/img/grid.png" alt="co-play: an .it and an .swm on one grid" width="760">

*Co-play: four sample channels and a three-track SID-Wizard tune on
one row axis, both editable, saved back as real files.*

<img src="docs/img/mixer.png" alt="the mixer" width="760">

*The console: drum channels, a DUSK bass, the master chain.*

<img src="docs/img/dusk.png" alt="a DUSK patch with the scope" width="760">

*A DUSK patch — a sample as a morphing wavetable — with the
oscilloscope under the editor.*

<img src="docs/img/viz.png" alt="the visualizer" width="760">

*The visualizer's spectrum, one of its four faces.*
</div>

## Quick start

Zig 0.15.2 and, for the first build, a network connection — the
terminal render engine [movy](https://github.com/M64GitHub/movy) and
SDL3 are fetched by `build.zig.zon`:

```sh
zig build                          # the two binaries, the library, its examples
duet song.it                       # an Impulse Tracker module (F5 plays)
duet tune.swm                      # a SID-Wizard module
duet song.it tune.swm              # both together, one clock
duet project.zon                   # a DUET project
duet                               # a fresh, empty duet
duet --render out.wav project.zon  # headless render, no audio device
```

[Getting started](docs/getting-started.md) has the details — the
terminal you need, the first five minutes, the window build.

## Documentation

In [`docs/`](docs/): [getting started](docs/getting-started.md) ·
[sessions and formats](docs/sessions-and-formats.md) ·
[keys](docs/keys.md) · [the command line](docs/cli.md) ·
[the system clipboard](docs/system-clipboard.md) ·
[glossary](docs/glossary.md) · [libduet](docs/dev/libduet.md), the
engine as a library — and the map in [docs/README.md](docs/README.md).

## Status · platforms · license

`v0.1.0-alpha` — usable, and in daily use. Correctness is held by
909 tests and by render and register comparisons against OpenMPT and
against SID-Wizard's own player. Developed on macOS; the Linux build
is verified regularly; Windows cross-compiles (the window build, the
library and the examples) but has not yet run on real hardware. The terminal build wants a
kitty-class terminal of at least 80×24 cells.

**License: GPL-2.0-or-later** for the whole tree (see `LICENSE`) —
reSID is vendored, and reSID is GPL.

## Credits

- **SID-Wizard** by Hermit (Mihály Horváth) — the formats and player
  semantics this project reimplements, generously documented and
  WTF-licensed.
- **reSID** by Dag Lem — the SID emulation, vendored, GPL-2+.
- **miniaudio** by David Reid (MIT-0/public domain) — audio output.
  **stb_truetype** by Sean Barrett (public domain) — the window's
  font atlas.
- **[movy](https://github.com/M64GitHub/movy)** — the 60 fps terminal
  render engine (same author).
- The IT engine is implemented from `ITTECH.TXT` and measurement;
  Schism Tracker and OpenMPT serve as read-only reference oracles.
