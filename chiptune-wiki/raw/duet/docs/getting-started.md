# Getting started

DUET is a tracker that plays Impulse Tracker songs and SID-Wizard
tunes, on their own or together, and adds two synths and a mixer of
its own. It runs in a terminal (`duet`) or in a window (`duet-gui`);
both show the same screens and take the same keys.

## What you need

- **Zig 0.15.2** to build.
- A network connection for the first build: the two dependencies —
  **movy**, the terminal render engine, and SDL3 for the window build —
  are fetched once, by the release tags and hashes in `build.zig.zon`,
  into Zig's cache; later builds are offline.
- For `duet`, a terminal of at least **80×24** cells with 24-bit
  colour. One that speaks the **kitty keyboard protocol** (kitty,
  Ghostty, WezTerm, foot) gets every key; the header line says
  `KITTY ON` when it does. On any other terminal the keys that need
  the protocol — `Alt` chords, modified F-keys, `Ctrl` with punctuation —
  never arrive, and every one of them has a plain twin (see
  [keys](keys.md)).
- An audio device. macOS and Linux are built from this tree; Windows
  builds cross-compile (window only) but have not yet run on a real
  machine.

## Build

```sh
git clone <this repository> duetracker
cd duetracker
zig build                 # duet, duet-gui, the library and its two examples
zig build tui             # only duet
zig build gui             # only duet-gui
zig build lib             # only libduet (static + shared) and its header
zig build test            # the test suite
```

`zig build` makes a Debug build — Zig's safety checks on, and slower:
a live session with a heavy song wants the fast build, `zig build
-Doptimize=ReleaseFast` (if the sound breaks up while the header's
`CPU` figure sits over 100%, that is the build to make).
`-Dtarget=x86_64-windows-gnu` cross-compiles `duet-gui.exe`, the
library and the examples (the terminal build is POSIX-only). The
engine is also a library for programs of your own:
[libduet](dev/libduet.md).

## Run

```sh
zig-out/bin/duet song.it          # an Impulse Tracker module
zig-out/bin/duet tune.swm         # a SID-Wizard module
zig-out/bin/duet song.it tune.swm # both, together
zig-out/bin/duet project.zon      # a DUET project
zig-out/bin/duet                  # nothing: a fresh, empty duet
```

A file opens **stopped**, on the pattern page; `F5` plays it. Bare
`duet` shows the splash and lands on the PROJECT page. Every other way
of starting — a page to open on, a key layout, playing at once, and
every headless job — is an option: see [the command line](cli.md).

## The screen

Every page has the same frame:

- **The header**, two lines. Left: the page's title. Right on the
  first line: `KITTY ON/OFF` (the keyboard protocol), `AUDIO 48000Hz`
  or `AUDIO OFF`, and while audio runs, `CPU n%` — how much of the
  audio thread's time playback takes. The second line names the song
  and, on the right, where you are: `PAT 00/3F SPD 5 BPM 142` on the
  pattern page, `ORD 00/45 ROW 08` while playing, and the **badge** —
  `[IT]`, `[SWM]`, `[DUET]` or `[CO]` — which says what kind of
  session this is and what SAVE will write. The last message DUET has
  for you replaces the right half of the first line for a moment.
- **The status line** at the bottom: the transport keys, then the keys
  that matter on this page, then the page's own state (the jam
  instrument, the grid view, the channel width).
- **The pages**, in a list you walk with `Ctrl+UP/DOWN`: PROJECT,
  SONG (or SWM SONG), PATTERN, INSTRUMENTS, THE MIXER (and its sends
  page), VISUALIZER. `TAB` jumps to the pattern page and, from there,
  to the instruments page; `F2`, `F4`, `F11`, `F12` go straight to the
  pattern, the instruments, the order list and the project page.
- **The help popup**: `?` (or `F1`) opens eight pages of keys, drawn
  from the key layout in use; `LEFT/RIGHT` turn them, `ESC` closes.

## The first five minutes

Open a song you have — an `.it` or an `.swm`:

1. `duet song.it`. The pattern page shows the first pattern; the
   header says `[IT]`. `F5` plays from the start, `F8` stops, `F7`
   continues from where it stopped.
2. `?` opens the help. It lands on the PATTERN page's keys; `LEFT` and
   `RIGHT` turn the pages — GLOBAL, the first, holds the keys that
   work everywhere. `ESC` closes it.
3. `F4` goes to the instruments page: the song's instruments and
   samples in lists on the left, the selected one's details on the
   right. `UP/DOWN` pick one. `SPACE` turns JAM on — the status line
   says so — and the letter rows are a piano: `Z S X D C V ...` the
   lower octave, `Q 2 W 3 E R ...` the upper one, `[` and `]` change
   the octave. `SPACE` again returns to EDIT.
4. `F12` goes to the PROJECT page. Under SETUP, walk down to SID chip
   `1` and press `SHIFT+RIGHT`: the chip switches on (`8580`; again
   for `6581`), the header's badge becomes `[DUET]`, and the line
   below the chips now counts three SID columns. `F2` shows them on
   the grid, to the right of the channels, as `1:1 1:2 1:3`.
5. A SID column plays SID-Wizard instruments. On the instruments page
   (`F4`), `I` opens the instrument dialog; pick a `.swi` and it lands
   in the S## list as `S01`. `SPACE`, and the piano plays it through
   the chip.
6. `F10` saves. A session that has become a duet asks for a name the
   first time and writes `name.zon` beside `name.it`; a plain `[IT]`
   session writes the `.it` and nothing else. Open the `.zon` next
   time and everything is as you left it.

From here: [sessions and formats](sessions-and-formats.md) for what
each file kind keeps and what SAVE writes, [keys](keys.md) for
everything the keyboard does — the in-app `?` help included.

## Where DUET keeps things

`~/.config/duet/` (`%USERPROFILE%\.config\duet\` on Windows):

- `config.zon` — the file dialogs' memory: eight favourite
  directories (in a dialog, `1`–`8` jump there while the query line is
  empty; `TAB` opens the list where `s` stores the current directory
  in a slot and `x` clears one) and the last directory each kind of
  dialog used.
- `keys.zon` — your key layout, if you have one (see [keys](keys.md)).

Nothing else is written anywhere unless you save or export.

## The window

`duet-gui` is the same program in an SDL3 window. It owns a few keys
of its own, as a terminal would: `Ctrl+Shift+=` / `Ctrl+Shift+-` /
`Ctrl+Shift+0` change the font size (`Cmd+=` / `Cmd+-` / `Cmd+0` on
macOS), `Alt+ENTER` toggles fullscreen. The window cannot shrink below
80×24 cells; resizing it re-lays the screen the way a terminal resize
does.
