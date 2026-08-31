# Testing

DUET is verified three ways: unit tests over a checked-in corpus, four
oracles that compare renders against a reference or pinned goldens,
and headless twins of the screen that let a script press keys and read
the result back. This page names each road, what it proves and the bar
it must hold; the words are the [glossary](../glossary.md)'s, the code
map is in [architecture](architecture.md).

| road | command | proves | the bar |
|---|---|---|---|
| unit tests | `zig build test` | loaders, writers, reducers, the synth cores, the mixer DSP | every test passes |
| the IT oracle | `sh tools/it-ab.sh` | Impulse Tracker playback against OpenMPT | every row on its expected value |
| the SID-Wizard oracle | `sh tools/swm-ab.sh reg` | the player's register stream against SID-Wizard's own | `off=0 score=0` on every NORMAL row |
| the DUST and DUSK goldens | `sh tools/dust-ab.sh` · `sh tools/dusk-ab.sh` | a patch renders the bytes it was pinned with | 9/9 renders + 9/9 traces, each |
| the C ABI pin | `sh tools/capi-ab.sh` | the two example players bounce what `--render` renders, through the header and through the module | 16 rows `ALL IDENTICAL` |
| the screen twins | `--dump-screen` · `tools/ptydrive.py` · `--gui-shot` | what a page draws, what a key does, what colour it has | the receipt you expected is on screen |
| the instrument matrix | `python3 tools/ins-matrix.py` | every kind of session still takes an instrument | 50/50 |
| the documentation checks | `tools/docgen.py --check` · `tools/doc-budget.sh` | the generated pages are current, no page outgrew its budget | exit 0 |

## What does `zig build test` run?

`build.zig` builds three test roots and runs each from the project
root, so tests read `tests/corpus/` by relative path. Zig collects
tests through the import graph: a root runs every `test` block in every
file it reaches, so a file's tests run without being listed; the three
roots are three modules sharing no file, so each runs once. Today: 909.

| root | tests | reaches |
|---|---|---|
| the library: `src/duet.zig` | 471 | the module tests itself — its own test block reaches `src/it/tests.zig` (the `.it` loader over the 42 modules in `classics/`, `openmpt-tests/` and `inst/`; the field-by-field cross-check of `inst/semantics.it`, written by `tools/mkit.py`, a second implementation of the format; the IT writer's round trips), `src/sid/tests.zig` (the `.swi` loader over the 324 instruments in `swi/`, the SID-Wizard tables, the voice runtime, the jam road, the module loader and writer, the player, SID columns in an IT song) and `src/tests.zig` (the engine: `player.zig`, `project.zig`, the mixer DSP and the send units, the probe ring, the WAV law, the SID setup, the export, the pure cores of DUST and DUSK, the song, the graph, the bounce, the event ring) — reSID linked through the module |
| the C ABI: `src/capi.zig` | 10 | the exports themselves, through the real functions a C program calls: the refusals, the render parity with the bounce, the two roads' sample identity, the metadata, the resolver, the ring, the keyboard, a song that ended coming back — under the leak gate ([libduet](libduet.md)) |
| the app: `src/app/tests.zig` | 434 | the movy-free screen reducers under `src/app/ui/`, the undo store, the key layout, the CPU meter's ballistics, the FX translate, the scope's engine, the system clipboard's text — it imports `duet` the way the app does |

`zig build test --summary all` ends in the only line that states the
total (`Build Summary: 7/7 steps succeeded; 909/909 tests passed`) —
read it, not a pipeline's exit status. The default build is Debug, and
that is the gate — the safety checks and the leak counting on
(`std.testing.allocator` counts only there); `-Doptimize=ReleaseFast`
is the optimizer's pass. `zig build test` builds the test roots only
and does not refresh `zig-out/bin/`, so run `zig build` before a
headless run that must see your change.

## How is Impulse Tracker playback judged?

The reference is a render: `openmpt123` (OpenMPT's command-line
player, from Homebrew) renders the same module at 48 kHz and
`tools/it-ab.sh` compares the two WAVs through five judges, each a
Python tool that prints a verdict word when its row is off:

| judge | tool | measures | off when |
|---|---|---|---|
| correlation | `tools/swm_compare.py` | Pearson correlation of the two RMS envelopes (50 ms windows, a ±1 s lag search) | the score sits more than 0.03 from the row's EXPECTED value — `DRIFT` |
| swing | `tools/wav_swing.py` | the spread of per-note levels, for random volume | either engine's spread leaves 0.15–0.35 — `SWING-DIFF` |
| pitch | `tools/wav_pitch.py ab` | per-window pitch, diffed in cents | the median passes the row's bar (10 cents) — `PITCH-DIFF` |
| level | `tools/wav_level.py ab` | per-window level, the engines' gain convention removed | the median passes the bar (1.5 dB) — `LEVEL-DIFF` |
| pan | `tools/wav_lr.py` | left/right RMS in three time sections | the side signature (`1:L 2:R 3:=`) differs — `PAN-DIFF` |

A correlation row carries the value the two engines agree on today
(`env-decay        +1.000  expect +1.000`), pinned in the script beside
the file; a change to `src/player/player.zig` is done when the
scoreboard shows no verdict word, and a row that rises is re-pinned
with a comment saying why. The rows are the instrument corpus in
`tests/corpus/inst/`, OpenMPT's own test modules, the transport-law
files in `patloop/`, and four classics capped at 30 s. `openmpt123
--info` is the reference for a module's counts (the loader test pins
`dk-tune`'s against it); the duration it prints is its own player's
estimate — a render can run a row longer, so compare renders, not
that number.

## How is SID-Wizard playback judged?

The SID-Wizard player is judged at the register. `--swm-trace` writes
every SID register write the player makes; the reference is the
original player, running inside SID-Wizard's own C64 emulation.
`sh tools/build-oracle.sh` builds two tools from a patched private
copy of the SID-Wizard 1.97 source tree (expected beside the
repository as `../SID-Wizard-1.97-sources-examples`; `SW=` names
another path): `tools/sidrender` renders a `.sid` and, with
`REGTRACE=<file>`, logs its register writes; `tools/regplay` plays one
of our traces through the same chip emulation.

`sh tools/swm-ab.sh reg` walks 27 pairs from that tree — a module and
the `.sid` SID-Wizard exported from it — traces both, and
`tools/trace_diff.py` aligns the streams per player call and counts the
writes that differ:

```
bronkosaurus  normal 1x  off=0 score=0      top:
rain8580      normal 1x  off=0 score=1      top: FRQLO1=1
kicksamule    bare   1x  off=0 score=7967   top: FRQLO3=1443 ...
```

`off` is the call offset the alignment found (it must be 0), `score`
the count of mismatched writes, `top` the registers carrying them. The
bar: every NORMAL-driver row at `score=0`, with two known residues —
`rain8580` at 1 and `egblues` (a two-chip tune) at 470. The `light`,
`extra`, `bare` and `demo` rows differ by design: an export embeds the
player its driver byte names, and DUET implements the NORMAL driver
only ([sid-wizard-engine](sid-wizard-engine.md)). `sh tools/swm-ab.sh
audio` is the secondary check — our trace replayed through `regplay`
against `sidrender`'s WAV, the same emulation on both sides so only
the transport can differ. `regplay` drives one chip, so it cannot
judge the multi-chip rows; read `reg` for those.

## How are DUST and DUSK judged?

The two synths have no reference implementation, so their reference is
their own past: every `.zon` in `tests/corpus/dust/` and `dusk/` is
rendered and traced, and the result is pinned in `tests/golden/dust/`
and `tests/golden/dusk/` — a `PINS` file with one line per file (`name
seconds wav-sha256 peak`) and a gzipped trace per file.
`sh tools/dust-ab.sh` and `sh tools/dusk-ab.sh` re-render each and
compare the WAV's SHA-256 and the trace's bytes, one row per file
(`dust-demo  wav ok  trace ok`), and end on the bar: `dust-ab: 9/9
renders, 9/9 traces on their pins`.

The trace is the half you can read. `--dust-trace` writes the register
stream with every write attributed to the part of the patch that made
it (`0  $D400=$B3  note_on`, `wave_tab`, `mod_route`, `grain`, ...).
DUSK has no chip, so `--dusk-trace` writes the note engine's decisions
instead — one event per line (`note`, `steal`, `rel`, `glide`, ...)
with the road it came in on (`row`, `sdx`, `jam`, `xport`, ...). When
a pin moves, the diff names the sample, the register or event, and the
source; a WAV that moved while its trace stayed identical means the
change is on the audio side (oscillator, filter, envelope, strip,
send), not in the dispatch.

A moved pin is a regression unless the change was meant; a meant
change re-pins with `sh tools/dust-ab.sh bless` (or the DUSK twin),
which prints the diff it blesses away so the reason can be written
beside the file's paragraph in `tests/corpus/MANIFEST.md`. A change
that makes an existing patch sound different is an engine version, not
a new pin ([dust-dusk-internals](dust-dusk-internals.md)). Both
scripts take a second; run them after any change to `src/sid/dust.zig`,
`dustrack.zig`, `dusk.zig` or `duskrack.zig`.

## How do I verify the screen without a terminal?

**`--dump-screen`** prints one frame's text layer and quits. `--page`
picks the page or popup; the state options (`--bounce-state preview`,
`--osc-state sid`, ...) and the face options (`--dust-face`,
`--fx-list`, `--view`, ...) pick what is up — the lists are in
[cli](../cli.md), and a wrong name refuses (`--page: not a page or
popup name`, exit 2; a file that cannot be read exits 1). The dump is
the real page code drawing into the text
canvas; it sees no colour and cannot see what a key does.
`--dump-help` prints the help popup's pages the same way.

**`python3 tools/ptydrive.py`** is the only road that verifies a
keypress: it runs the terminal binary inside a pseudo-terminal, feeds
a key script, replays the escape stream into a character grid and
prints the rows you ask for.

```sh
python3 tools/ptydrive.py --kitty --rows 1,2,3 /abs/song.it -- f4
python3 tools/ptydrive.py --cwd /scratch --home /scratch/home -- cf4 saw enter
```

Its own options come first — `--rows` (row 0 is the title bar, where
receipts land), `--grep`, `--cwd` (where the tracker runs, so where a
file dialog opens), `--home` (a scratch `$HOME`, so the real config is
never touched), `--kitty` (the keyboard protocol on) — then the
tracker's options and files, then `--` and the keys the docstring
names. The window is 140×40 cells; `PTY_ROWS` and `PTY_COLS` narrow
it, the only way to see a layout that happens when space runs out. The
cursor is a colour and the grid has none: to prove it moved, type
something and read the grid back. Run it from the repository root with
absolute paths; an I/O error on the first key means the tracker exited
before the key arrived — almost always a wrong path.

**`duet-gui --gui-shot N out.bmp`** is the only road that sees colour:
the window binary runs the real session in a hidden 1080×800 window on
the software renderer, pushes `--gui-keys "down cdown tab"` through
the real key translate (ptydrive's names; `zin`/`zout`/`zdef` zoom the
font), saves frame N as a BMP with every text colour and the glow
layer, and quits; `--gui-log` prints each translated key. Every
headless mode runs in `duet-gui` too with identical output — a dump
from either binary diffs empty, a render from either compares equal.
`--shot N out.png` is narrower: the pixel and glow layer alone, with a
synthesized signal in the visualizer and the scope — it proves the
drawing, not the session.

## Can every session still take an instrument?

The roads that load, import and place instruments live behind
keypresses, where `zig build test` cannot reach, and a capacity guard
gone stale against the slot rules refuses every instrument into one
kind of session while the others keep working. So
`python3 tools/ins-matrix.py` is a keypress battery: for each of the
eight session shapes (`new-it`, `load-it`, `new-swm`, `load-swm`,
`new-duet`, `load-duet`, `synth-duet`, `coplay`) it opens the real
dialogs with the real keys — load a `.swi` or a `.wav`, import from an
`.swm`, an `.it` or a `.zon`, write a block bounce into a P## slot,
plus the dialog rows that pin what a kind of session does not offer —
and reads the receipt off the screen: a positive case asserts both that
the receipt names a slot and that no refusal is anywhere on screen.
Each case runs with a fresh empty `$HOME` and a scratch directory
holding only the files it may pick, so the run is repeatable and never
edits your file-dialog memory. 50 cases; the bar is all of them
(`all 50 pass — every session can still take an instrument`).
`--only <substr>` runs the matching cases, `--jobs 1` one at a time,
`-v` prints each status line. Run the whole matrix after touching any
road that loads, imports, counts or addresses a slot — a fix on one
road is not done until the other shapes still pass.

## What keeps the documentation honest?

- `python3 tools/docgen.py --check` — `docs/keys.md` and `docs/cli.md`
  hold three generated regions (the bindable actions from
  `src/app/ui/keymap.zig`, the help popup from `--dump-help`, the option
  list from `--help`); the check exits 1 when either is stale, and
  `python3 tools/docgen.py` regenerates them.
- `sh tools/doc-budget.sh` — every page's line count against its
  budget and the file count against the ceiling; a red line means the
  page is split, not compressed.
- `sh tools/shots.sh [name]` — regenerates every image in `docs/img/`
  from corpus files through `--gui-shot` (`sips` on macOS, `CONVERT=`
  elsewhere): a changed screen re-shoots the pictures, never ages them.
- `python3 tools/uistrings.py --grep '<word>'` — every string the
  screen can show, by file and line, for a wording pass.

The working record keeps a longer battery — every verification command
with the number it must print ([contributing](contributing.md)).

## The corpus

`tests/corpus/` holds every file the tests and oracles read, and
`tests/corpus/MANIFEST.md` has a paragraph per file — where it came
from, what it exercises, what a render of it must show: 7 real modules
in `classics/` and OpenMPT's 15 per-feature test modules in
`openmpt-tests/`; 20 instrument-behaviour files in `inst/` and 6
transport-law files in `patloop/`, all written by `tools/mkit.py`; 15
SID-Wizard modules across the four chip counts in `swm/` and 324
instruments in `swi/`; duets with SID columns in `hybrid/`, co-plays in
`coplay/`, the send commands in `sends.it` + `sends.zon`; the synths'
pinned projects in `dust/` and `dusk/`, the patch-import fixtures in
`import/`, the translate paste's reference tune in `fx/`.

`tools/mkit.py` is a small Impulse Tracker writer in Python — a second,
independent implementation of the format — with a generator per corpus
family (`python3 tools/mkit.py inst-corpus <dir>`). A new corpus file
gets its generator or source noted, a MANIFEST paragraph, and a row in
the oracle that judges it ([contributing](contributing.md)). Never
write into `tests/corpus/` from a driven session: a `[SAVE]` on a
sample writes its `.wav` beside the song at once. The unit tests, the
goldens, the screen twins and the matrix need only the built binaries
and Python 3; the IT oracle needs `openmpt123`, and the SID-Wizard
oracle the source tree beside the repository plus a C compiler for
`tools/build-oracle.sh`.
