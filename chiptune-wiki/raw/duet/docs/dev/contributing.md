# Contributing

This page is for someone who has built DUET and wants to change it:
how to build for development, the rules a change must keep, what a
change owes the documentation, where the working notes are, how a
test file gets into the corpus, and what a contribution's license is.
The code itself is mapped in [architecture](architecture.md); how a
change is proved is in [testing](testing.md).

## How do I build for development?

[Getting started](../getting-started.md) has the checkout and the
first build: Zig 0.15.2 and, once, a network connection —
`build.zig.zon` names the `movy` render engine and SDL3 by release tag
and hash, and the first build fetches both.
The steps `build.zig` defines:

| step | builds |
|---|---|
| `zig build` | five things and a header: `duet` and `duet-gui` into `zig-out/bin/`, `libduet.a` + `libduet.dylib`/`.so` into `zig-out/lib/` with `zig-out/include/duet.h`, and the two example players `cplay` and `zigplay` ([libduet](libduet.md)) |
| `zig build tui` / `gui` / `lib` / `examples` | one of them |
| `zig build run -- song.it` / `zig build run-gui -- …` | build and start |
| `zig build test` | the three test roots |
| `zig build -Dtarget=x86_64-windows-gnu` | `duet-gui.exe`, the library and the examples — the terminal build is POSIX-only |

`zig build -l` lists them. The default optimize mode is Debug: Zig's
safety checks (integer overflow, bounds) and the leak counting on —
the build a crash is reproduced in and `zig build test` gates on;
`-Doptimize=ReleaseFast` is the fast build, for a live session with a
heavy song and for a release; every render is byte-identical between
the two. Both binaries import one engine — the module `duet`, which
carries reSID behind `src/sid/sid_shim.cpp` — and share miniaudio
behind `src/app/ma_shim.c` (`wireMiniaudio` in `build.zig`), so the
two frontends cannot drift apart ([architecture](architecture.md)).

`zig build test` does not touch `zig-out/bin/`: it builds and runs the
test roots only. Rebuild before any live check, or a render or a
driven key is proving yesterday's binary.

## Which rules are not up for discussion?

Each of these has a place in the code and a road that catches a
break. A change that needs an exception is a conversation, not a
commit.

**The audio callback takes no locks, allocates nothing, does no
I/O.** `sm_audio_callback` in `src/app/device.zig` runs on the audio
thread and calls the one `Engine.render`; `src/player/player.zig` —
all playback state — runs entirely on that thread (or on the offline
render loop), and the UI talks to it through the engine's value verbs:
`std.atomic.Value` fields the render thread takes at its next span
(`playing`, `reset_request`, `snapshot`, and their siblings). The
engine the callback renders (`device.active_engine`) is set on the
main thread before the device starts, never while it runs. When the UI must touch a chip the callback is clocking — the
sampling QUALITY switch rebuilds reSID's filters — it raises the
engine's `hush` flag, waits for the callback counter to turn over
twice (`device.awaitCallbacks`), does the work, and drops the flag
(`hushedResample` in `src/app/main.zig`): a counter that advanced is
the proof that the callback which could have been inside has
returned. Nothing else in DUET needs a handshake; a frame
memory or a device rate is rebuilt with the device stopped.

**Impulse Tracker semantics come from `ITTECH.TXT` and the corpus,
never from a guess.** A behaviour is written from the format's own
reference and pinned by a corpus file whose render is compared with
`openmpt123`'s ([it-engine](it-engine.md)). Schism Tracker and OpenMPT
are read-only references — both are GPL, and DUET's engine is its own
implementation: read them to understand a case, never transcribe.

**SID-Wizard semantics come from SID-Wizard's own sources**, which are
WTF-licensed: port freely, credit Hermit. `src/sid/swvoice.zig` is a
port of the 6502 player's per-frame instrument machinery — every
counter a `u8` with wrapping arithmetic and bit-7 sign tests, the
deliberate carry-flag quirks *reproduced, not cleaned up*, as its head
says. A cleanup that changes a byte shows up on the register
scoreboard ([sid-wizard-engine](sid-wizard-engine.md)).

**SID register writes land at render-span boundaries.** The SID
engine renders in spans and the players write registers between
them, through one funnel (`SidEngine.write` in `src/sid/engine.zig`),
so every gate, pitch and filter change lands on the sample its span
starts on — never somewhere inside a buffer
([sid-and-resid](sid-and-resid.md)).

**Saving always writes a real file.** DUET has no private song format:
`.it`, `.swm`/`.sws`/`.swt`/`.swq`, `.swi` and `.zon` each have a
writer, and each writer is pinned by a `write(load(f))` byte-identity
test over its corpus ([formats-internals](formats-internals.md)). A
resaved `.it` renders byte for byte like the original.

**The instrument matrix runs after any change to a road that loads,
imports, counts or addresses a slot** — `applyOpen`, `applyImport`,
the list verbs, the `firstBlank*` helpers, a bank or pool allocation.
`python3 tools/ins-matrix.py` drives the real dialogs with real keys
in every kind of session and reads the receipt off the screen; 50
cases, and every one must pass. These roads live in `src/app/main.zig`
behind a keypress, where `zig build test` cannot see them, and a
capacity guard that goes stale against the rule that every slot
exists refuses every instrument into one kind of session while the
others keep working. A fix on one road is not done until the matrix
says the other roads still work.

**The UI explains itself.** Every focused field says what it is —
the `▸` hint line of the instruments and project pages, the teaching
line of every picker; every refusal names its reason on the status
line — `the IT note column has no effects - the VOL and FX columns
do` — and so does the command line:

```
duet: bad/missing argument: --render <out.wav>: the render writes a WAV, so the name must end in .wav
duet: bad/missing argument: --resave <out>: the extension picks the writer (.it | .swm | .swi | .zon)
```

A refused command line exits 2; a file that cannot be read, loaded,
written or rendered exits 1 — so a script can tell a refusal from a
run that worked.

Colours and every other look constant are named knobs in
`src/app/ui/theme.zig` (*one place to retune*), never literals at the
drawing site. And a word the screen never teaches may not appear on
it — no code names, no house slang: `python3 tools/uistrings.py
--grep 'rig|rack|room'` lists every screen literal that matches
(whole words, comments stripped; it cannot tell a status string from
a test name, so read the line). Today the only `ROOM` on screen is
the reverb's space beside PLATE and HALL.

**Before a change is called working, the bars are green** — the test
count, the four oracles, the headless roads that see a keypress or a
pixel — [testing](testing.md) lists them with today's numbers.

## What does a change owe the documentation?

`docs/` is written from the running program: a claim goes into a page
only after it was checked against the binary — a key pressed, a
command run, a screen dumped. So a change that alters what a page
does, what a key means or what an option takes updates the page **in
the same commit**; a commit that moves the binary away from its
documentation is not finished.

Two pages are generated and cannot be edited by hand:
`docs/keys.md` (the bindable actions and their default keys out of
`src/app/ui/keymap.zig`, and every page of the in-app key help as `duet
--dump-help` prints it) and `docs/cli.md` (`duet --help`, verbatim).
`python3 tools/docgen.py` regenerates both — everything outside the
marked regions is hand-written and left alone — and `python3
tools/docgen.py --check` fails when either is stale, so a key, an
action or an option that moves regenerates them in the same commit.
The screenshots in `docs/img/` are regenerated whole by `sh
tools/shots.sh` from corpus files through `duet-gui`'s hidden window;
a UI change re-shoots the documentation instead of aging it.

The pages have budgets, and `sh tools/doc-budget.sh` enforces them:
the root README at most 150 lines, a user page 200, a `docs/dev/`
page 250, the glossary 300, thirty files in all. A page that hits its
budget is split, never compressed. Every page uses the
[glossary](../glossary.md)'s words for what the screen names; a new
word is a glossary entry first. No page carries history — no session
numbers, no "we decided": what the program does, in the present tense.

## Where are the working notes?

Two folders are the project's own, and neither is documentation:

- `internal_docs/` is the working record — the session history, the
  gotchas filed under the thing they bite, the rulings that are not
  re-argued, the verification battery with every expected number, the
  backlog, the research on SID-Wizard's player and the two synths'
  design documents. It is honest and it may be stale; the code and
  `docs/` are the truth, and no page in `docs/` cites it.
- `plans/` is the desk: where the work stands and what is next, and
  the agreed order of the remaining work.

Read the desk before starting on something that may already be
planned, and read the gotchas section for whatever you are about to
touch before you touch it.

## How do I add a corpus file?

The corpus under `tests/corpus/` is what the loaders, the writers and
the oracles run against; `tests/corpus/MANIFEST.md` says, per file,
what it holds and what it is supposed to prove. A new file:

1. **Author it reproducibly.** An `.it` comes from `tools/mkit.py`,
   a second, independent implementation of the format in Python
   (uncompressed samples, full-mask pattern packing, instruments with
   all three envelopes, note maps and NNA/DCT/DCA):

   ```python
   s = Song("name", speed=6, tempo=125)
   k = s.add_sample("kick", kick())
   i = s.add_instrument(Instrument("lead", sample=k,
           vol_env=Env([(0, 64), (100, 0)])))
   p = s.pattern(rows=64)
   p.set(0, 0, note="C-5", ins=i)
   s.orders = [0]
   s.write("out.it")
   ```

   `python3 tools/mkit.py inst-corpus tests/corpus/inst` regenerates
   the instrument corpus from the recipes in the script. A SID-Wizard
   module or instrument comes from SID-Wizard itself; a `.zon` is
   saved by DUET.
2. **Give it a MANIFEST paragraph** — the expected behaviour, in
   words, before anything measures it.
3. **Move the count.** Every corpus test counts its folder and
   asserts the number — `src/it/tests.zig` (`entire corpus loads`),
   `src/sid/swmod.zig` and `swwriter.zig` for the modules,
   `src/sid/swinst.zig` and `swiwriter.zig` for the instruments. The
   count moving is the proof the new file is under test; a `.zon`
   under `tests/corpus/dust/` or `dusk/` is a row in `tools/dust-ab.sh`
   or `tools/dusk-ab.sh` instead.
4. **Pin it.** An audio row in `tools/it-ab.sh` (`corr <name> <file>
   <expect>`, the score measured against `openmpt123` at pinning; a
   later reading more than 0.03 away prints DRIFT), a pitch, level or
   pan row where correlation is blind, or a blessed golden for a
   synth `.zon` ([dust-dusk-internals](dust-dusk-internals.md)).

`.gitignore` ignores every `*.wav`, and every `*.png` outside
`assets/` and `docs/img/`: a sample travels inside the `.it`, never
beside it.

## What license does a contribution carry?

The tree is **GPL-2.0-or-later** (`LICENSE`), because reSID is
vendored and reSID is GPL; a contribution is under the same license.
What is vendored or fetched keeps its own:

| part | where | license |
|---|---|---|
| reSID (Dag Lem) | `vendor/resid/` | GPL-2.0-or-later (`vendor/resid/COPYING`) |
| miniaudio (David Reid) | `vendor/miniaudio/miniaudio.h` | public domain or MIT-0, at the file's end |
| stb_truetype (Sean Barrett) | `vendor/stb/` | public domain or MIT, at the file's end |
| JetBrains Mono | `src/gui/assets/`, embedded in the window build | SIL Open Font License |
| movy (M64) | fetched by `build.zig.zon`, a release tag of `M64GitHub/movy` | MIT |
| SDL3 | fetched by `build.zig.zon` | zlib |
| SID-Wizard (Hermit) | the formats and the player semantics, ported | WTFPL — credit Hermit |

The library is the same tree under the same license: a program that
links `libduet` or imports `duet` is a GPL program.

## How do I write a commit?

The history is meant to be read. The first line says what changed;
the body says why, what it was checked against (the bars, the corpus
file, the driven keys), and what moved with it — the page in `docs/`,
the regenerated `keys.md`/`cli.md`, a corpus count, a re-pinned
score. A change and its documentation land together; a change and
its test land together. macOS is where DUET is developed and the
Linux build is kept building: a change that only builds on one of
them is not done.
