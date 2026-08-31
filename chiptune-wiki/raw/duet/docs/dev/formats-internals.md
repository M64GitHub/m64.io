# Formats: the writers and the container

DUET has no song format of its own. Every song file it writes is a real
file of its own format — an `.it` OpenMPT opens, an `.swm` SID-Wizard
loads — and the project file is a container that holds what no song
format has room for. This page is where the readers and writers live,
what each one promises, and how the promise is pinned. What a user sees
of it is in [sessions and formats](../sessions-and-formats.md).

## Where it lives

| file | owns |
|---|---|
| `src/it/format.zig` | the in-memory Impulse Tracker model: `Module`, `Sample`, `Instrument`, `Pattern`, `Cell` |
| `src/it/loader.zig` | `.it` bytes → `Module`; every read bounds-checked (`NotAnItFile`, `UnexpectedEof`, `Corrupt`) |
| `src/it/writer.zig` | `Module` → `.it` bytes (`write`; the file wrappers of all three writers are `src/app/wavfile.zig`'s) |
| `src/sid/swmod.zig` | the SID-Wizard module loader, all four formats, parsed backwards from the end of the file |
| `src/sid/swwriter.zig` | the module writer, forward order |
| `src/sid/swinst.zig` | one instrument as a byte block (`parseSwiFile`) |
| `src/sid/swiwriter.zig` | the `.swi` writer |
| `src/project.zig` | the `.zon` container's grammar: `parse` (bytes in), `serialize` (bytes out), `VERSION`; the one read and the one write are the app's (`loadProjectFile`, `writeProjectFile` in `src/app/main.zig`) |
| `src/audio/wav.zig` | the `.wav` reader (`read`), the 16-bit law (`pcm16`) and the 44-byte header; the stream writer that opens a file is the app's (`src/app/wavfile.zig`, with the bounce's `FileSink` and `MemSink`) |
| `src/app/config.zig` | `~/.config/duet/config.zon`: the dialogs' eight favourites and last directories, flat strings, written through a temp file and a rename |
| `src/app/ui/keymap.zig` | `keys.zon`, a key layout — see [keys](../keys.md) |

## What does the `.it` writer emit?

One shape, always: an IT 2.14 file. `CWTV` stamps `0x0214` and `CMWT`
`0x0200`, instruments are 2.x `IMPI` blocks, samples are uncompressed
signed 16-bit with stereo stored separated (all left frames, then all
right — the layout `loader.loadSample` reads), and patterns use
full-mask packing with no run-length coding, which every loader
accepts. A blank pattern gets a zero parapointer; a packed pattern
over the format's 64 KB refuses (`PatternTooBig`). The loader widens
8-bit and compressed sources to `i16` (`decompress8`, `decompress16`),
so writing 16-bit loses nothing that plays, and it drops an effect
parameter that has no effect letter (`fxparam = 0` when `fx == 0`).

The file declares what the module holds, not what it can hold: the
header's counts come from `instrumentCount()`, `sampleCount()` and
`patternCount()` — the highest non-blank slot of each — while the
in-memory arrays run to their caps. Every loop in `write` is sliced by
those three numbers, so a header can never disagree with its body.

The round trip is semantic, not byte-identical: `load(write(m))`
equals `m` in every musical field, and storage details normalize. A
foreign file grows — `tests/corpus/classics/dk-tune.it` is 4,085 bytes
and comes back from `--resave` as 4,889 (8-bit samples widened, no RLE)
— but it plays the same to the bit: `--render` of the original and of
its resave are `cmp`-identical (both `rendered 45.65s  peak 0.473`).
`write(load(write(m)))` **is** byte-identical — the idempotence the
test `writer round-trips the entire corpus (semantic + byte
idempotence)` pins over 47 corpus files.

One save-time step lives outside the writer: a duet's `.it` is written
with its SID columns pan-disabled (bit 7 of the channel pan,
`saveProjectFiles` in `src/app/main.zig`) so a foreign tracker plays
silence there; a load clears the bit again (`clearSidPanMute`).

## What does the SID-Wizard writer promise?

`swwriter.write` emits the layout `swmod.zig` reads: the C64 load
address, the header the loader kept (counts patched at the offsets
`LAYOUTS` names for the chip count), then sequences, patterns,
instruments, chord table, tempo table and funktempo pairs, each
trailing its size byte; rows re-encode to the variable-length stream
with `$7X` run-length bytes. The four formats differ by magic and
header:

| format | magic | chips | header bytes |
|---|---|---|---|
| `.swm` | `SWM1` | 1 | 64 |
| `.sws` | `SWMS` | 2 | 64 |
| `.swt` | `SWMT` | 3 | 65 |
| `.swq` | `SWMQ` | 4 | 69 |

The limits are the format's own, enforced on the way out: a pattern
stream of at most 249 bytes and 248 rows (`MAX_PATTERN_BYTES`,
`MAX_PATTERN_ROWS`), at most 127 patterns, a sequence of at most 255
bytes, at most 32 subtunes. The contract is `write(load(f)) == f`,
byte for byte: the test `corpus: write(load(file)) is byte-identical
for every module` pins `tests/corpus/swm/`, and over the SID-Wizard
1.97 example tree — 143 module files: 132 `.swm`, 4 `.sws`, 6 `.swt`,
1 `.swq` — 142 come back identical. The one that does not is refused,
not rewritten: `sixpack.swm` carries a 252-byte pattern, past the 249
the format allows, and `--resave` says `resave: swm write failed:
error.PatternTooBig`.

An instrument is the same idea one file wide. `swiwriter.write` emits
the `$A1 $04` load address, the body, the size byte in the seat of the
filter table's `$FF` terminator, and the 8-character name; a body over
120 bytes (`MAX_BODY`, the format's 128 minus the name) or table
pointers that would not read back are refused (`InstrumentTooBig`,
`BadTablePointers`). The test `corpus: write(load(f)) is byte-identical
for all 324 example .swi` pins every file in `tests/corpus/swi/`, and
`--resave` over the same 324 files reports no difference.

## What is in a project file?

A `.zon` is ZON text (Zig's data notation), read by `std.zon.parse`
into `Raw` (`parse`) and written by `std.zon.stringify` (`serialize`).
The current `VERSION` is 12. Its top-level fields:

| field | holds | absent means |
|---|---|---|
| `.version` | the format version the file was written in | version 12 |
| `.name`, `.author`, `.comment` | the project's own text | empty |
| `.it` | the song file, a path relative to the `.zon` | no IT song |
| `.swm` | a co-play's module, relative to the `.zon` | no co-play |
| `.swi_bank` | all 36 S## slots, positional; a hole is `.{}` | no SID-Wizard instruments |
| `.it_channels` | how many channels the song uses | measured from the song |
| `.sids` | the chips: `.model`, `.pan`, `.channels` (1-based) | no chip on |
| `.sid_quality` | reSID's sampling method for every chip | `interpolate` |
| `.chan_hop`, `.pat_hop` | the two hop sizes | 4 and 4 |
| `.mixer` | strips (`it_sum`, `master`, `sids`, `syn`, `dusk`, `chan_eq`), `comp`/`lim`, the sends per strip kind, `sum_send`, the four `fx` units, `sid_mute` | an untouched mixer |
| `.bounce` | EXPORT AUDIO's last settings | the defaults |
| `.chords` | the session chord table, packed | empty |
| `.dust`, `.dusk` | the armed slots and the patches that differ from the default | no slot armed, every patch default |
| `.markers` | the sync markers, `.{ .pattern, .row, .chan, .value }` each — the channel 1-based, pattern and row as the grid shows them ([libduet](libduet.md)) | no marker |

Two older fields are still read — `.sid_channels` with `.sid_model`,
one chip in the shape before `.sids`, migrate into chip 1 — and a third,
`.swi` (paths to `.swi` files), is declared only to be refused.

The writer emits only what a hand has moved: `serialize` writes with
`emit_default_optional_fields = false`, an untouched mixer writes no `.mixer`,
an unarmed synth no `.dust`/`.dusk`, a bank with nothing in it no `.swi_bank`
— and a bank with anything in it writes all 36 slots, holes included. The
leading `//` comment block of a file is carried across a save verbatim
(`leadingComment`, `SaveSpec.header`), and `.it`/`.swm` go back spelled
exactly as they were read (`Project.it`, `swm`). A file `serialize` wrote,
parsed and written again is the same bytes:
`tests/corpus/hybrid/twosid-demo.zon` resaved is `cmp`-identical to itself.

## How does a load decide what to accept?

`parse` runs in this order:

1. **The version gate, before the grammar.** `preScanVersion` finds
   `.version = N` textually; `N > VERSION` is `ProjectVersionTooNew`
   and the diagnostic says `written by a newer DUET (file v13, this
   build reads v12)`. It runs first because a newer file may carry an
   enum literal this build has no name for — a parse error with the
   wrong story.
2. **The parse**, with `ignore_unknown_fields = true`: a field this
   build does not know is dropped. An unknown enum literal is a hard
   error, and the diagnostic's first line becomes the reason:
   `52:31: error: unexpected enum literal 'per_epoch'`.
3. **The validation.** One SID side or the other: an `.swm` beside an
   `.swi_bank` is `ProjectBothSwmAndSwi`; nothing referenced, channels
   with nowhere for SID notes to live, an unknown model or quality
   name, a bank slot that is not a `.swi` — each refuses by name. A
   pre-v11 `.swi` list refuses with its road back: `pre-v11: links 1
   .swi file(s) instead of holding them - open the .it and load them
   into S##`.
4. **The resolve.** The song files' spellings stay as written (the
   app's resolver joins and reads them — the library opens no file);
   `buildRig` turns `.sids` (or the v1 pair) into the chip inventory
   and infers `.it_channels` when the file did not say. Values land on
   their rails instead of refusing (`clampDb`, `clampHop`; a name this
   build does not know falls back to the default in `enumOf`).

Every refusal speaks. Headless — `--resave`, `--render` and `--dump-screen`
alike — stderr gets `project: failed to load future.zon:
error.ProjectVersionTooNew` and the sentence, and the process exits 1. In a
session the sentence is the status line: `OPEN FAILED: future.zon - written by
a newer DUET (file v13, this build reads v12)`, or `OPEN FAILED: legacy.zon -
pre-v11: links 1 .swi file(s) instead of holding them - open the .it and load
them into S##`.

An older file loads and is written back current — that is the whole
migration, and `--resave` says what it did: `resaved co-demo.zon (v2
-> v12) -> out.zon  [0 chip(s), 4 IT cols]`. The rule behind the
number: **new vocabulary ships with a version bump** (v12 brought
`.markers`) — a build that reads v12 would otherwise open a v13 file
and play it with the new part silently missing.

## The container law

The bank is inside the file. Each `.swi_bank` slot's `.data` is the
`.swi` writer's own output, hex-encoded (`SwiOut.body`,
`bankFromProject` in `src/app/main.zig`), so there is exactly one encoding
of an instrument in DUET and the writer's 324/324 identity is
inherited, not re-earned. A slot whose bytes do not parse as a `.swi`
refuses the file (`ProjectBadSwiBank`) rather than emptying the slot.

`.from` is a label, never a path: a basename with no directory part,
kept to name the instrument against a library and to prefill the save
dialog. `parse` opens no file (the app reads the `.zon` and, through
its resolver, the song files it names); a save writes the project and
the song files beside it, and nothing it merely labels is written to. The `.it` and a co-play's `.swm` stay files
because they are song data in their own formats — and the `.swm` is
adopted, not linked: SAVE on a co-play opened from
`../swm/congabeat.swm` writes `co-demo.swm` beside the `.zon` (the same
bytes), the file says `.swm = "co-demo.swm"`, and the module it was
opened from is left as it was.

## What does `.wav` take and give?

`wav.read` takes RIFF/WAVE with PCM at 8, 16, 24 or 32 bits or 32-bit
float (the extensible header included), mono or stereo, any rate, and
converts once to interleaved `i16`: 8-bit shifted up, 24-bit keeps its
top 16, 32-bit shifts down, float clamps to ±1 and scales. Anything
else refuses by name — `NotAWavFile`, `UnsupportedFormat`,
`UnsupportedChannels` (more than two), `Corrupt`. It feeds the `.wav`
import into a P## (`importWavs` on the `--save-project` road, the
instruments page's load) and the dialog's audition; an import keeps
the file's rate as `c5speed` and keeps stereo — a 48 kHz stereo render
imported with `--save-project` dumps as `len=96000 c5=48000 … 16bit
stereo`.

`wavfile.StreamWriter` (the app's) writes the other way: a 44-byte header,
chunks as they come, the sizes patched on `finish()` — not a valid `.wav`
until then; an aborted write is `discard`ed and deleted. Two formats, `pcm16`
and `float32` (EXPORT AUDIO's knob); every render is 48 kHz stereo, and the
16-bit conversion is the library's one law, `wav.pcm16` (clamp, × 32767,
truncate toward zero). A P## export uses `appendRaw16`: the sample's own bytes
at its own `c5speed`, to a path that never overwrites (`wavfile.uniquePath`).

## What a change must keep true

- **The four identities**, all in `zig build test`: the `.it`
  idempotence over the corpus (`src/it/writer.zig`), the module
  identity over `tests/corpus/swm/` (`src/sid/swwriter.zig`) and the
  142/143 census over the SID-Wizard tree, the 324/324 `.swi` identity
  (`src/sid/swiwriter.zig`), and the project's serialize → parse →
  serialize identity (`src/project.zig`). The render of a resaved `.it` stays
  `cmp`-identical to the original's.
- **A version bump for new vocabulary** in the `.zon`, and a refusal
  that says so. Bump the too-new test's spelled-out version with it.
- **The either/or.** A project names an `.swm` or holds an
  `.swi_bank`, never both; SID notes live in one place.
- **Nothing in the container is a link.** A bank slot holds bytes,
  `.from` stays a basename, `load` opens no second file, a co-play's
  module is adopted beside the project.
- **One encoding per thing, and the format's own limits.** The `.zon`
  takes the `.swi` writer's bytes; the header's counts are derived from
  the content; a file DUET cannot read back is not written.
- **The extension picks the writer** (`--resave`): a module's must
  match its chip count — `resave: chb-stickman.sws is a 2SID module,
  so it must be written as .sws (not out.swm)` — and any other refuses,
  `--resave <out>: the extension picks the writer (.it | .swm | .swi |
  .zon)`. There is no fallback writer; a refused name exits 2 (a bad
  argument), a write that fails exits 1.

How the loaded module plays is in [the IT engine](it-engine.md) and
[the SID-Wizard engine](sid-wizard-engine.md); the oracles that judge
a resave's audio are in [testing](testing.md).
