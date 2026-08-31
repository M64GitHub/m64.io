# libduet — the engine as a library

Everything that makes sound in DUET is a library. The formats, the
two players, the SID chips, DUST, DUSK, the mixer, the bounce — all
of it lives in the Zig module `duet`, and the C ABI `libduet` puts a
C header over the same engine. Bytes go in, samples come out. The
library opens no file, creates no thread, prints nothing and owns no
audio device: the program that uses it does those things, and the
tracker (`duet`, `duet-gui`) is only its first user.

This page is for someone writing that program — a player, a plugin
for an audio player, a game or a demo that plays a duet song, a tool
that renders one — in C, C++, Rust, or Zig. It describes the surface
as the header pins it; the words are the [glossary](../glossary.md)'s,
a name in backticks is the code's. Where the tracker itself goes from
here is in [architecture](architecture.md).

## What the library is, and what it is not

| in the library (`src/`, everything but `src/app/`) | in the program that uses it (the tracker: `src/app/`) |
|---|---|
| the readers and writers: `.it`, `.swm`/`.sws`/`.swt`/`.swq`, `.swi`, `.wav`, the `.zon` project | opening and saving files, the file dialogs, the config file |
| the Impulse Tracker player and the SID-Wizard player | the audio device (miniaudio) and its callback |
| the SID chips (reSID), DUST, DUSK | the terminal, the window, every editor, the undo store |
| the mixer: strips, EQs, dynamics, the four send units and their returns; the song level | the CPU meter (a clock in the callback is the host's business) |
| the bounce: the offline render loop, the exact cut, the fade | where the rendered samples go — a `.wav` on disk, a buffer |
| the event ring, the sync markers, the transport | the keys that call the transport |

Two objects carry all of it. A **song** (`duet.Song`, `duet_song`) is
the document: everything loadable and savable, nothing that renders.
An **engine** (`duet.Engine`, `duet_engine`) is the graph over a song
at a sample rate: the players, the chips, the synth racks, the mixer
stages, the taps, the event ring, the position word. A song can be
edited while an engine plays it — the tracker does exactly that — under
one rule, the threading contract below.

Three laws come with the library, because the tracker was built on
them and the library is the tracker's engine:

- **A render allocates nothing, takes no lock, does no I/O.** Every
  allocation happens when a graph is built; `render` walks fixed
  buffers.
- **Register writes land on span boundaries.** A note on a SID chip,
  a synth slot or a PCM channel starts on the sample its tick starts
  on, wherever that tick falls inside your buffer.
- **What renders is what the tracker renders.** `duet --render` and
  the two example players write the same bytes; `tools/capi-ab.sh`
  compares them on every kind of song.

## Building it

```sh
zig build                  # everything, Debug: zig-out/bin/{duet,duet-gui,cplay,zigplay},
                           # zig-out/lib/libduet.a + libduet.dylib (Linux: libduet.so),
                           # zig-out/include/duet.h
zig build lib              # the static and the shared library, plus the header
zig build examples         # the two example players
zig build test             # the library's, the C ABI's and the app's test roots
zig build -Doptimize=ReleaseFast          # the fast build (see "Real time" below)
zig build -Dtarget=x86_64-windows-gnu     # duet-gui.exe, cplay.exe, zigplay.exe, duet.dll,
                                          # duet.lib (the DLL's import library), duet_static.lib
zig build lib -Dtarget=x86_64-linux-gnu --prefix out   # libduet.a + libduet.so for Linux, from anywhere
zig build wasm                            # the web player: zig-out/web/ — duet.wasm, the page, the gallery
                                          # (ReleaseSmall on its own; -Doptimize=… when you say so)
zig build serve                           # ... served on http://127.0.0.1:8000 (builds it first)
```

The build is a Debug build unless you say otherwise. A Debug library
is correct and slow: it renders every corpus song byte-identically to
the fast build, and it cannot keep up with a heavy song in real time
(the [real-time section](#real-time-and-the-load-meter) has the
numbers). Ship `-Doptimize=ReleaseFast`.

What is inside: reSID — the SID emulation, C++ — is compiled into the
library, so a program linking it needs the C++ runtime (`-lc++`, or
`libstdc++` where that is the system's). miniaudio is *not* inside: the
device is yours. The static archive carries Zig's compiler runtime, so
a foreign toolchain needs nothing else from Zig. The library is
**GPL-2.0-or-later** like the tree, because reSID is: a program that
links libduet is a GPL program.

## Linking a C program

The header is `include/duet.h` — installed as `zig-out/include/duet.h`.
It is plain C89-clean C (it compiles as C89, C99, C11, C++11 and C++17
under `-pedantic -Werror`), `extern "C"` for C++.

Against the shared library, any compiler:

```sh
cc play.c -I zig-out/include -L zig-out/lib -lduet -Wl,-rpath,"$PWD/zig-out/lib"
```

The macOS dylib's install name is `@rpath/libduet.dylib`, so the
program needs an rpath (or `DYLD_LIBRARY_PATH`) to find it at run
time; on Linux the same with `libduet.so` and `LD_LIBRARY_PATH`. Apple's
compiler may warn that the library "was built for newer macOS version
… than being linked" — the deployment target of a Zig build is the
machine it was built on, and the warning is harmless.

Against the static archive, link with Zig's own compiler driver:

```sh
zig cc play.c -I zig-out/include zig-out/lib/libduet.a -lc++
```

Apple's linker refuses the archive as Zig writes it — `ld: 64-bit
mach-o member 'sid_shim.o' not 8-byte aligned in 'libduet.a'` — and
`libtool -static` is not a repair: it silently drops the members it
dislikes and the link fails later on missing symbols. On macOS use
`zig cc` for the static archive, or the shared library. On Linux the
archive is an ordinary ELF archive: `zig cc` links it (cross-compiled
and linked from macOS), and any toolchain needs the C++ runtime beside
it for reSID.

The two example programs are built by `zig build` itself:
`examples/cplay.c` is compiled against `include/duet.h` and linked to
`libduet.a` — compiling it is the header's test — and
`examples/zigplay.zig` is the same player over the Zig module.

## Using it from Zig

Inside this tree every program does `const duet = @import("duet");`
— the two tracker binaries, the examples and the test roots all reach
the engine that way, and nothing under `src/` but `src/app/` may be
imported by path from outside the module.

From another project, DUET is a path dependency and the module comes
out of it. `build.zig.zon`:

```zig
.dependencies = .{
    .duet = .{ .path = "../duetracker" },   // relative to your build root
},
```

`build.zig`:

```zig
const duet = b.dependency("duet", .{ .target = target, .optimize = optimize });
mod.addImport("duet", duet.module("duet"));
exe.linkLibC();
exe.linkLibCpp(); // reSID rides inside the module
```

One thing about the checkout: DUET's own `build.zig` fetches its
terminal render engine, movy, and SDL3 on the first build — the
tracker's dependencies are resolved even though only the module is
built for you — so the first build wants a network connection.
Nothing of either ends up in your program.

The module exposes its files, not only a curated surface: `duet.Song`,
`duet.Engine`, `duet.Bounce` (the offline job), `duet.events` (the
ring, `Event`, `Marker`), `duet.project` (`parse`/`serialize` for the
`.zon`), `duet.it` (`format`, `loader`, `writer`, `dump`), `duet.player`
(the IT transport), `duet.sid.*` (one name per file: the chips, the
rig, the SID-Wizard formats and drivers, DUST, DUSK, the writers),
`duet.audio` (`dsp`, `fx`, `wav`, `tap`) and `duet.version`. The C ABI
below is the promise; the Zig names are the same verbs one level down,
and the tracker uses more of them than the ABI exports.

## The smallest player

In C — the whole road, error handling included:

```c
#include "duet.h"

duet_open_error err;
duet_song *song = duet_song_open(bytes, len, "tune.it", NULL, NULL, &err);
if (!song) { fprintf(stderr, "%s - %s\n", duet_error_string(err.code), err.message); return 1; }
duet_engine *eng = duet_engine_new(song, 48000, NULL);   /* the defaults: play once, no keyboard */
duet_engine_play(eng);
float buf[4096 * 2];
size_t n;
while ((n = duet_engine_render_f32(eng, buf, 4096)) > 0)
    fwrite(buf, sizeof(float), n * 2, out);              /* interleaved stereo; 0 once the song ended */
duet_engine_free(eng);
duet_song_free(song);
```

In Zig, the same:

```zig
const duet = @import("duet");

const kind = duet.song.kindOf("tune.it") orelse return error.UnknownFormat;
var diag: duet.project.Diag = .{};
const song = try duet.Song.open(gpa, bytes, kind, null, &diag);
defer song.destroy();
const eng = try duet.Engine.create(gpa, song, .{ .sid_mute = song.sid_mute }, .{ .sample_rate = 48_000 });
defer eng.destroy();
eng.play();
var buf: [4096 * 2]f32 = undefined;
while (!eng.ended()) {
    eng.render(&buf);
    // ...
}
```

The bytes are yours: the library reads them while `open` runs and
never again, and never frees them.

## Opening a song

`duet_song_open(bytes, len, name, resolver, ud, err)` reads a file's
bytes. The **name** picks the reader by its extension and nothing
else — `.it` (an Impulse Tracker module), `.swm`/`.sws`/`.swt`/`.swq`
(a SID-Wizard module for one to four chips), `.zon` (a DUET project);
`.swi` and `.wav` are not songs but things a song imports, and the
library refuses them here. What each kind of file holds is in
[sessions and formats](../sessions-and-formats.md).

A project is a text file that **holds** its SID instruments, patches,
mixer and setup, and **names** its song files — the `.it`, and in a
co-play the `.swm` — by the spelling the file carries, relative to the
project's own folder by convention (`song.it`, `../x.swm`). The library
opens no file, so it asks you for those bytes through **the resolver**:

```c
const void *resolve(void *ud, const char *name, size_t *len);   /* the bytes, or NULL */
```

It is called once per song file, with the spelling as written; you
return the bytes and their length, and keep them valid until
`duet_song_open` returns — after that the library holds nothing of
yours. Return `NULL` for a file you cannot provide and the open fails,
naming it. A program on a filesystem joins the spelling to the
project's directory and reads the file (`examples/cplay.c` does, in a
few lines); a program with no filesystem hands over a table it
prepared.
The resolver is synchronous on purpose. For an `.it` or a module the
resolver may be `NULL`.

When the open says no, `err` (which may be `NULL`) carries a code and
the library's own words, and there is nothing to free:

| `err.code` | when | `err.message` reads like |
|---|---|---|
| `DUET_ERROR_INVALID_ARGUMENT` | `bytes` or `name` is `NULL`, or `len` is 0 | `len is 0` |
| `DUET_ERROR_UNKNOWN_FORMAT` | the name ends in nothing a reader knows | `no loader for this name: .it, .swm/.sws/.swt/.swq or .zon` |
| `DUET_ERROR_BAD_FILE` | the reader or the project parser refused | `UnexpectedEof` (a cut file) · `written by a newer DUET (file v99, this build reads v12)` · `pre-v11: links 1 .swi file(s) instead of holding them - open the .it and load them into S##` |
| `DUET_ERROR_MISSING_FILE` | the resolver returned `NULL`, or there was none for a `.zon` | `cannot read nowhere.it` · `cannot read sends.it: the host gave no resolver` |
| `DUET_ERROR_OUT_OF_MEMORY` | | |

`duet_error_string(code)` gives the code's sentence; the message is
the specific reason. Both roads speak the same words as the tracker's
status line and its command line (the refusals are listed in
[troubleshooting](../troubleshooting.md)).

**Reading the song.** The strings live as long as the song handle:

| call | gives |
|---|---|
| `duet_song_kind` | `DUET_KIND_IT` 0, `DUET_KIND_SWM` 1 (any chip count), `DUET_KIND_ZON` 2 |
| `duet_song_title`, `_author`, `_message` | the project's own labels when it has them, else the module's — a SID-Wizard module's `AUTHOR:TITLE` field split at the colon and trimmed |
| `duet_song_num_channels` | the pattern channels a module uses — every column kind counted, on their fixed homes (DUSK slots stand on channels 40–47, DUST on 48–51, SID voices on 52–63, so a project with one DUST slot says 51); a SID-Wizard module's tracks |
| `duet_song_num_orders`, `_num_patterns`, `_num_samples`, `_num_instruments` | the counts; a module's orders are the current subtune's |
| `duet_song_num_chips` | the SID chips the song's setup switches on |
| `duet_song_num_subtunes`, `_subtune`, `_select_subtune` | a SID-Wizard module's subtunes (1 for anything else); selecting one is structural — before `duet_engine_new`, or followed by `duet_engine_rebuild`; −1 = no such subtune |
| `duet_song_sid_model`, `_set_sid_model` | the model a chip is born with (`DUET_SID_6581` 0, `DUET_SID_8580` 1); the setter is the command line's `--sid-model`: every live chip forced. Structural |
| `duet_song_sid_quality`, `_set_sid_quality` | reSID's sampling for every chip: `DUET_SID_FAST` 0, `DUET_SID_INTERPOLATE` 1 (the default), `DUET_SID_RESAMPLE` 2 (the accurate, expensive one). Structural |
| `duet_song_num_markers`, `duet_song_marker(song, i, &m)` | the project's sync markers, below; −1 past the table |

`duet_song_free` frees the document. Every engine over it must be
freed first.

## The engine

`duet_engine_new(song, sample_rate, opts)` builds the graph. Any
sample rate works — the tracker's is 48000, the engine is rate-generic
— and `opts` may be `NULL`:

```c
typedef struct duet_engine_opts {
    int loop;   /* -1 forever (a tracker's law), 0 once (the default), n = n extra passes */
    int jam;    /* 1 = the keyboard: a SID chip built and kept whether or not the song names one */
} duet_engine_opts;
```

**The loop law.** With `loop = 0` the song ends where a render of it
ends: when the order list runs out or a row repeats with the same loop
state — the same rule `duet --render` uses to know when to stop. With
`n` it ends after `n` further passes; with `-1` it never ends, which
is what the tracker plays. A SID-Wizard module has no such map: it
ends when every track has halted, and most never do — a player that
wants a length for one uses a cap. `duet_engine_set_loop` changes the
law while playing.

**The keyboard.** With `jam = 0` the engine builds nothing the song
does not use: no SID chip for a pure sample song, no lane for a
keyboard. With `jam = 1` a chip exists whatever the song, so
`duet_engine_note_on` can play SID-Wizard instruments through it — a
game's instruments-as-sound-effects road (below).

`duet_engine_rebuild` tears the graph down and builds it again over
the song as it stands — after a subtune, model or quality change — and
returns −1 when the build failed, after which the engine plays nothing
until a rebuild succeeds. `duet_engine_sample_rate` reads the rate;
`duet_engine_free` frees the engine. `duet_song_free` comes after.

## Rendering

```c
size_t duet_engine_render_f32(duet_engine *, float *interleaved, size_t frames);
size_t duet_engine_render_s16(duet_engine *, int16_t *interleaved, size_t frames);
```

Both fill interleaved stereo at the engine's rate, any number of
frames per call, and return the frames written: `frames`, or **0 once
the song has ended** — the loop law's verdict, or a SID-Wizard module
whose tracks all halted — so a player's loop is `while (render(...) > 0)`.
A fresh engine plays nothing until `duet_engine_play`; a stopped or
paused engine renders silence and still returns `frames`. The 16-bit
road converts by the law `duet --render` writes with — clamp to ±1,
multiply by 32767, truncate toward zero — and renders the same samples
as the float road.

**The buffer size and byte identity.** A song renders the same bytes
whatever buffer sizes you ask in — one call of ten seconds, a thousand
calls of 480 frames, a live device's callback — for every family:
samples, the SID chips, DUST, DUSK. A register write between two calls
lands on the exact sample instant the calls met at, and the chip's own
clock is left standing there, so the call pattern is not a property of
the sound. `duet --render` renders in 4096-frame chunks; a bounce in any
chunking compares byte for byte with the tracker's — `examples/cplay.c
-o` does, and `tools/capi-ab.sh` proves it on eight songs, one per
family.

## The transport

Every verb here is a value the render thread takes at its next call —
safe beside a running render, from one other thread.

| verb | does |
|---|---|
| `duet_engine_play` | from the top: every transport reset, then playing |
| `duet_engine_resume` | carry on where the transport stands; an ended one starts over |
| `duet_engine_stop` | silence, position kept; every sounding voice is killed — a held SID gate would sustain forever — and the mixer is emptied with them, so a reverb or delay send does not ring on |
| `duet_engine_rewind` | stop and back to the top; the same silence |
| `duet_engine_pause` / `_unpause` | the freeze: silence, nothing advances; the chips keep their registers, a PCM voice its position, an envelope resumes mid-flight |
| `duet_engine_play_from(eng, order, row)` | a fresh Impulse Tracker transport that walks onto `order` and lands on `row` — a `+++` there skips, a `---` ends the song as it would mid-song. −1 = no IT side, or past the order list |
| `duet_engine_play_pattern(eng, pattern, row)` | loop one pattern from `row` (the tracker's `F6`) |
| `duet_engine_seek(eng, order, row)` | `play_from` without playing: the transport parks there and the position says so at the next render; a playing engine jumps |
| `duet_engine_set_loop(eng, times)` | the loop law, live: −1 forever, 0 once, n passes |

Every verb ends a pause. After the song has ended, `play`, `resume`,
`rewind` + `resume` and `play_from` each bring it back and it renders
the same length again; `stop` after an end leaves it ended.

**Where it stands.** `duet_engine_position` fills one struct from
atomic reads — no lock, no tearing between fields of one word:

```c
typedef struct duet_position {
    uint64_t frames;     /* the output clock: frames rendered since duet_engine_new, never reset */
    uint16_t order, pattern, row;
    uint8_t  tick, speed, tempo;
    uint8_t  playing, paused, ended;
} duet_position;
```

`frames` counts every frame the engine ever rendered — stopped,
paused or playing — and no transport verb resets it: it is the time
base the event ring stamps in. **It is not a playing time**, and a
player that shows it as one will run its clock on through a stop: the
two are the same number only while a song plays, so the mistake hides.
A host that wants elapsed playing time keeps its own — add the delta
only while `playing && !paused`, zero it on play, stop and rewind —
and leaves this clock alone, because the events you have not drained
yet are stamped in it. For a SID-Wizard module played alone
the words are its first track's: `order` is the position in the
orderlist, `pattern` the 1-based pattern number, and `speed`/`tempo`
read 0 (the module has a tempo program, not an IT clock). Sub-buffer
precision is the ring's, not the position's.

## The event ring: sync for demos and games

Polling the position tells you where the transport was at the end of
your last buffer. A demo needs "row 32 of order 5 started at output
frame N" — a row can start anywhere inside a buffer — so the render
thread writes an **event** at every dispatch it makes, stamped with the
output clock at the tick's own boundary, into a ring you drain from
one other thread:

```c
int      duet_engine_next_event(duet_engine *, duet_event *out);   /* 1 = got one (oldest first), 0 = none */
uint32_t duet_engine_events_pending(const duet_engine *);
uint32_t duet_engine_events_dropped(duet_engine *);                /* dropped since the last call; zeroed */
void     duet_engine_events_clear(duet_engine *);                  /* after a seek: the old rows are nobody's business */
```

The ring holds 4096 events of 24 bytes. When nobody drains it the
newest events are dropped and counted; a program that drains once per
video frame never sees a drop, and a nonzero `dropped` means the
stream has a hole and the position is the thing to re-sync from.

```c
typedef struct duet_event {
    uint64_t frame;      /* the output clock at the tick this event belongs to */
    uint8_t  kind;       /* duet_event_kind */
    uint8_t  dialect;    /* duet_dialect: which kind of column made it */
    uint8_t  channel;    /* the pattern channel (0-based), or the SID-Wizard track */
    uint8_t  tick;       /* the tick inside the row (0 = the row's own) */
    uint16_t order, pattern, row;
    uint8_t  a, b, c, pad;
} duet_event;
```

| `kind` | fires | `a`, `b` |
|---|---|---|
| `DUET_EVENT_ROW` | a row is entered — the sync workhorse | |
| `DUET_EVENT_ORDER` | the order walk moved to another position | |
| `DUET_EVENT_PATTERN_LOOP` | an `SBx` loop jumped back | `a` = the target row |
| `DUET_EVENT_SONG_LOOP` | the order list wrapped (its end, or a `---`) | `a` = the loop count so far |
| `DUET_EVENT_SONG_END` | the song ended (the loop law's verdict) | |
| `DUET_EVENT_NOTE_ON` | a note started on `channel` | `a` = note, `b` = instrument or patch |
| `DUET_EVENT_NOTE_OFF` | a cell ended a note (`===`, `^^^`, `~~~`) | `a` = the cell's note byte |
| `DUET_EVENT_EFFECT` | an effect's first-tick dispatch | `a` = the effect as its dialect spells it (IT `A`=1..`Z`=26 and the letters past `Z`; the SID column's decoded byte; DUST's and DUSK's own letters), `b` = its parameter; `tick` = the delay an `SDx` put on it |
| `DUET_EVENT_VOLCOL` | a volume-column command | `a` = the command, `b` = its value |
| `DUET_EVENT_MARKER` | a sync marker's row plays | value = `a | b << 8`; `channel` = the marker's column |

`dialect` says whose cell it was: `DUET_DIALECT_IT` a channel,
`DUET_DIALECT_SD` a SID column, `DUET_DIALECT_DUST` and `_DUSK` a
synth column, `DUET_DIALECT_SW` a SID-Wizard track — in which case
`channel` is the track, `pattern` its 1-based number and `order` its
own orderlist position, the module's own numbers. A co-play carries
both dialects on one clock. The keyboard's notes are not on the ring.

What a first buffer of a project looks like, drained after play (the
song is at speed 6, tempo 125, one row every 5760 frames):

```
frame 0       ORDER    it  order 0 pattern 0 row 0
frame 0       ROW      it  order 0 pattern 0 row 0
frame 0       MARKER   it  order 0 pattern 0 row 0   ch 0   a 1   b 0      (value 1)
frame 0       NOTE_ON  it  order 0 pattern 0 row 0   ch 0   a 61  b 1      (C-5, instrument 1)
frame 5760    ROW      it  order 0 pattern 0 row 1
frame 92160   MARKER   it  order 0 pattern 0 row 16  ch 1   a 0   b 2      (value 512)
```

### The markers

A project can carry **sync markers**: inaudible points with a value,
for a demo to sync on, a game to react to, or a purpose nobody has
named yet. They live in the `.zon` (a `.markers` table) and nowhere
else — no player of the `.it` can hear or lose them — and the tracker
sets them on the grid with `ALT+G` ([the pattern
editor](../pattern-editor.md)). A marker is addressed by pattern, row
and column: a pattern reused in the order list fires its markers at
every occurrence, and the event's `order` tells the occurrences apart.

```c
typedef struct duet_marker { uint8_t pattern, chan; uint16_t row, value; } duet_marker;
int duet_song_num_markers(const duet_song *);
int duet_song_marker(const duet_song *, int index, duet_marker *out);   /* 0, or -1 past the table */
```

A demo syncs on the rows' frames — they arrive with the exact output
frame the row starts on — and reads the markers for the moments the
song's author placed by hand; a game reads only the markers. Either
way the row or marker's `frame` is compared with the output clock of
the audio you have handed the device, which is what makes the picture
land on the beat rather than a buffer late.

## The pattern data

Four reads of the document, for a host that wants to DRAW the song —
a pattern view beside the player, a scrolling grid in a demo. Each is
a pure read: no lock, no atomic, nothing on the render road, and safe
beside a running render.

```c
int duet_song_order_pattern(const duet_song *, int list, int index);
int duet_song_pattern_rows(const duet_song *, int pattern);
int duet_song_cell(const duet_song *, int pattern, int row, int channel, duet_cell *out);
int duet_song_format_cell(const duet_song *, int pattern, int row, int channel, char *buf, size_t n);
```

**The order lists.** List 0 is an `.it`'s order list. A SID-Wizard
module's **tracks** are its lists — list 1 is track 0 of the selected
subtune, and so on, because each track walks its own sequence. An entry
answers with the pattern it plays, `254` for a skip (Impulse Tracker's
`+++`, and a SID-Wizard entry that is not a pattern at all — a
transpose, a volume, a tempo, a separator), `255` for the end (`---`,
or a SID-Wizard `end` or `jump`), and `-1` past the end.

**The pattern numbers.** An `.it`'s patterns are numbered as the file
numbers them. A SID-Wizard module's live above `DUET_SW_PATTERN`
(256) and keep SID-Wizard's own 1-based numbering — which is the number
`duet_event.pattern` carries on a `DUET_DIALECT_SW` row, so an event
addresses its pattern with no arithmetic. A co-play carries both
modules at once, and one number has to say which it means. A SID-Wizard
pattern is one track's phrase, so channel 0 is its only channel.

**The cell.** `duet_song_cell` hands back the bytes as the cell's own
dialect stores them, never converted, with `dialect` saying which face
the cell wears: `DUET_FACE_IT` an Impulse Tracker column (and a DUST or
DUSK column, which are Impulse Tracker columns), `DUET_FACE_SD` a SID
channel of a hybrid — the SID-Wizard face over Impulse Tracker bytes —
and `DUET_FACE_SW` a SID-Wizard module's own track.

**The text.** `duet_song_format_cell` spells that cell exactly as
DUET's own grid draws it — the same code writes both, so a host's
pattern view and the tracker's read the same characters. It is UTF-8,
with `·` (U+00B7) where a piece is empty and single spaces between the
groups, and the CHARACTER layout is fixed per face, so the fields can
be sliced back out:

| face | the line | characters |
|---|---|---|
| `DUET_FACE_IT` | `C-5 0A  38 A08` | 3 note · 2 instrument · 3 volume · 1 effect + 2 parameter = 14 |
| `DUET_FACE_SD` | `D-5 02 0348` | 3 note · 2 instrument · 2 effect + 2 parameter = 11 |
| `DUET_FACE_SW` | `D-5 01 0340` | the same 11 — its effect run is the byte and its parameter |

Pass a buffer of at least `DUET_CELL_TEXT_MAX` bytes; the return is
the bytes written, NUL not counted, or `-1`.

```c
duet_cell c;
char text[DUET_CELL_TEXT_MAX];
int pattern = duet_song_order_pattern(song, 0, order);
int rows = duet_song_pattern_rows(song, pattern);
for (int r = 0; r < rows; r++)
    if (duet_song_format_cell(song, pattern, r, channel, text, sizeof text) > 0)
        puts(text);
```

A host fetches a pattern once — the event ring says when the pattern
changed — and draws from its own copy.

## Mute, solo and the song's volume

```c
int  duet_engine_set_mute(duet_engine *, int target, int index, int on);   /* -1 = no such target */
int  duet_engine_set_solo(duet_engine *, int target, int index, int on);
void duet_engine_set_global_volume(duet_engine *, int volume);             /* 0..128 */
```

A performance mute or solo aims at a **target**: a pattern channel
(`DUET_TARGET_CHANNEL`, 0-based), the whole PCM side
(`DUET_TARGET_IT_SUM`), a chip strip (`DUET_TARGET_CHIP` 0–3), a DUST or
DUSK slot strip (`_DUST` 0–3, `_DUSK` 0–7), one chip voice
(`DUET_TARGET_VOICE`, `chip × 3 + voice`), or a send unit's return strip
(`DUET_TARGET_FX`: 0 delay, 1 reverb, 2 chorus, 3 drive). Any solo
silences everything not soloed. Both are performance state, never
saved. A SID voice is muted by holding its gate shut while the chip
runs on, so a neighbour that syncs to it keeps its source — the same
mute the tracker's mixer uses ([sid-and-resid](sid-and-resid.md)).
The song's global volume is the road an Impulse Tracker `Vxx` takes:
it moves the samples, the chips and the synths together.

## The keyboard: instruments as sound effects

```c
int  duet_engine_note_on(duet_engine *, int family, int slot, int note, int ins);   /* 1 = queued, 0 = the family has no rack or player here */
void duet_engine_note_off(duet_engine *, int family, int slot, int note);
void duet_engine_all_notes_off(duet_engine *);
void duet_engine_set_jam_armed(duet_engine *, int on);
```

A note goes down the road the tracker's own keyboard uses, by
**family**: `DUET_FAMILY_PCM` plays an Impulse Tracker instrument (an
IT note, `C-5` = 60; `ins` a 1-based instrument, or `0x80 | sample` for
a sample directly); `DUET_FAMILY_SW` a SID-Wizard instrument from the
project's SID pool through a chip (an SW note, `C-1` = 1; `ins` the
0-based slot — this family needs a chip: `opts.jam`, or a song that
has one); `DUET_FAMILY_DUST` and `_DUSK` a slot of the synth (an IT
note; `ins` a 1-based patch, or 0 for the slot's own). A family absent
from the graph answers 0. `duet_engine_set_jam_armed` arms the
keyboard's road — the SID lane, and a chipless song's chip — the way
the tracker's `SPACE` does. The keyboard's notes are not on the event
ring.

## The length

```c
uint64_t duet_engine_duration_frames(const duet_engine *, uint64_t cap_frames);
double   duet_engine_duration_seconds(const duet_engine *, double cap_seconds);
```

The length is what libopenmpt's is: **a dry run** of a private engine
over the same song until the loop law ends it or the cap is reached —
the exact frame the transport ends on, which is what `duet --render`
cuts at (its file rounds that up to a whole 4096-frame chunk). It
costs the song's render time at the machine's speed: a 45-second
sample song takes a fraction of a second in a fast build, a SID-Wizard
module runs to the cap because it never ends (the 600-second cap takes
several seconds), and a Debug build takes minutes over a project with
chips. It builds a graph, so never call it from the render thread, and
cache the answer. 0 = the dry run could not be built.

## The threading contract

- **Exactly one thread calls the render verbs** (`render_f32`,
  `render_s16`). The library creates no thread of its own.
- **One other thread may call the value verbs beside it**: the
  transport, the loop law, mute and solo, the global volume, the
  keyboard, `position`, the event ring. Each is an atomic the render
  thread takes at its next span head.
- **The structural verbs require that no render is running and none
  starts until they return**: `duet_engine_new`, `_free`, `_rebuild`,
  and the `duet_song_*` setters (subtune, model, quality). The program
  guarantees it; the tracker's guarantee is a stopped audio device.
- The event ring is single-producer, single-consumer: the render
  thread writes, one thread reads.
- The library is otherwise not thread-safe. Two engines over two songs
  in one process share nothing; two engines over one song share the
  document and may not edit it.

The Zig module says the same in its own words: `render`, the verbs and
`position` on `Engine`; `create`, `build`, `teardown`, `rebuild`,
`destroy`, `setStemSolo` and `setScope` structural; every edit that
hands the render thread new memory — a pattern, a bank, a frame memory
— structural too.

## Memory

The C ABI owns an allocator, because a C header has no way to be
given one: the C library's in a release build, a leak-counting debug
allocator in a Debug build — which is how the ABI's own test root runs
through the real exports under the tree's leak gate. The Zig module
takes yours (`Song.open(gpa, …)`, `Engine.create(gpa, …)`). Nothing
allocates inside a render; building a graph does: reSID's tables per
chip, DUSK's frame memory, the send-FX rack (about a megabyte), and
the song-end map that decides the loop law (about 150 KB per engine).
A song must outlive every engine over it; the bytes you opened it from
need not.

## Real time, and the load meter

A Debug build renders about six to ten times slower than a
`ReleaseFast` build. A sample song still keeps up; a project with two
SID chips at `resample` quality renders at 0.6× real time in Debug —
every device callback overruns, the device drops the late buffers and
plays **silence while the counters keep moving**, which looks exactly
like a silent library. Both example players time their callback and
print `render NN% of real time` on their status line, the tracker's
own CPU-meter number; over 100% they warn once:

```
cplay: rendering this song takes 1.6x real time here — the audio device starves and plays
       silence while the counters keep moving. A Debug build? Build with: zig build -Doptimize=ReleaseFast
```

A program of your own that plays through a device wants the same
meter — the render time over the audio time it produced, two atomics
in the callback — because nothing else distinguishes a starving device
from a silent song. And it wants the fast build.

## The two examples

`examples/cplay.c` (C, over the header and miniaudio) and
`examples/zigplay.zig` (the Zig module and the tracker's own miniaudio
shim) are the same program twice: play a song through the audio
device, printing the position and every marker as its row fires, or
bounce it to a 16-bit `.wav` in `duet --render`'s chunks.

```
usage: cplay [-o out.wav] [-r rate] [-s seconds] [-l loops] [-m 6581|8580] [-q fast|interpolate|resample] [-t subtune] [-i] song.(it|swm|sws|swt|swq|zon)
usage: zigplay [-o out.wav] [-r rate] [-s seconds] [-l loops] [-i] song.(it|swm|sws|swt|swq|zon)
```

`-s` is the safety cap (600 seconds, `--render`'s own), `-l` the loop
law, `-t` a subtune, `-m`/`-q` the command line's `--sid-model` and
`--sid-quality`. `-i` prints the length first — a full dry render of
the song before the first sound, announced while it runs:

```
EstEps tune  ()
  libduet 0.1.0-alpha  ·  4 channels  10 orders  5 patterns  0 chips  0 marker(s)
  measuring the length: a dry render of the whole song first (up to the cap) ...
  length 45.64 s (cap 600 s)
out.wav: 2191360 frames (45.65 s)
```

While playing, the status line is the position, the output clock and
the load meter — `order 00  pattern 00  row 08     3.2 s  (speed 3 tempo 115)  render  12% of real time` —
and a marker prints as `marker 512 at frame 92160 (order 00 pattern 00 row 10 ch 1)`.
The bounce road prints no markers: it drains nothing. A refusal is the
library's own sentence, exit 1: `cplay: x.zon: the file could not be
loaded - written by a newer DUET (file v99, this build reads v12)`.

The web player ([below](#the-web-player-duetwasm)) is the third client: the same engine behind a page.

The bounce is the library's byte-identity pin: `sh tools/capi-ab.sh`
renders eight corpus songs — a plain `.it`, a one-chip and a two-chip
SID-Wizard module, a DUST project, a DUSK project, a co-play, a project
with the send effects on, a duet with SID columns — with `cplay -o`,
`zigplay -o` and `duet --render`, and `cmp`s the sixteen pairs; the bar
is `ALL IDENTICAL`.

## The web player: duet.wasm

The same library, compiled for the browser: `zig build wasm` builds
`src/wasm.zig` for `wasm32-wasi` as a *reactor* (no `_start`; the
exports are the surface) and installs it into `zig-out/web/` beside a
page, `examples/webplay/`, that plays every format the tracker plays —
drop a song on it, open files, **open a whole folder**, pick one from
the gallery, or load one with `?song=swm/congabeat.swm` (a gallery
entry, or any file under `songs/`). The directory serves as it is (`zig
build serve`, or any static server; a page with a worklet and a
`.wasm` needs `http://`, not `file://`) and needs no special headers:
there is no `SharedArrayBuffer` anywhere in it.

What the module is: the 53 C exports, unchanged, plus six host verbs a
C program gets from libc and a function pointer:

| export | what |
|---|---|
| `duet_wasm_alloc(len)`, `duet_wasm_free(ptr, len)` | memory inside the module for the host's bytes |
| `duet_wasm_put(name, name_len, bytes, len)` | THE FILE TABLE: register a file under the spelling a `.zon` uses for it (`"song.it"`, `"../x.swm"`, or a bare basename — the lookup falls back to basenames, a browser drop knows no folders); the bytes are the table's from then on |
| `duet_wasm_clear()` | free the table (a song opened over it is independent of it) |
| `duet_wasm_open(name, name_len)` | `duet_song_open` over the table — the resolver is the table's lookup, so JavaScript never hands the library a C callback; NULL on failure |
| `duet_wasm_error()` | the last open's `duet_open_error` (the code at offset 0, the message at 4) |
| `duet_wasm_mode()` | the build mode as a string (`ReleaseSmall`); the page shows it in its header — a `Debug` module cannot keep up with a heavy song |

Everything else is the header's: `duet_engine_new` at the context's
rate, `duet_engine_render_f32` per 128-frame quantum (THE CHUNK LAW is
what makes that identical to `--render`), the transport, the loop law,
the event ring, mute/solo by target, the keyboard, subtune/model/quality
with a `duet_engine_rebuild` between two renders. The module imports
four WASI functions (`fd_write`, `fd_close`, `fd_seek`,
`fd_filestat_get` — libc's stdio, never called on the render road) and a
Debug module twelve; the page's stub answers them all, and the one that
matters is `fd_prestat_get` → EBADF: libc's start-up walks the
preopened directories until that answer, and `_Exit(71)`s on any other. It is **single-threaded by
design**: an `AudioWorklet` owns the instance and renders *and* takes
its verbs on the audio thread, the page talks to it through the port
only, and every ring event is re-stamped from the engine's output clock
into the `AudioContext`'s so a row is drawn the moment it is heard.
(The engine's 64-bit atomics are plain words on that target through
`src/atomic.zig`; on every 64-bit target they are `std.atomic.Value`
and nothing native changes.)

How the page is built, so yours can be: `duet-worklet.js` is the
`AudioWorkletProcessor` — it compiles the module synchronously from the
bytes the page sends (a worklet scope's promise-based
`WebAssembly.instantiate` never settled in headless Chrome), keeps the
song and the engine, fills each quantum from `duet_engine_render_f32`,
drains the ring and posts batches of events with the position every
~11 ms; `duet-player.js` is the main thread — the file roads, the
gallery, the live note strip (one column per channel or track that
sounds, coloured by dialect, each on its own row clock — a SID-Wizard
track scrolls at its own pace beside the IT grid), the HUD, a
movy-style glow visualiser over an `AnalyserNode` (VU, spectrum, scope,
plasma, copper; `←`/`→` cycles, `↑`/`↓` the bar style, `Space`/`Enter`/
`Esc`/`L` the transport, a click on a column header mutes it). The

**The folder is the unit.** A browser never shows a picked file's
siblings, so the page cannot do what the tracker's open dialog does
from one project pick: it keeps a *listing* — entries, never bytes —
and reads a song only when you pick it. `[OPEN FOLDER…]` fills that
listing (`showDirectoryPicker()` in Chrome and Edge, where the handle
is kept in IndexedDB so the same folder is one click away on the next
visit; the `<input webkitdirectory>` snapshot everywhere else), and so
does a dropped folder. `[FILES]` (or `F`) puts up the files panel over
the strip — your folder and the gallery in one list, `↑`/`↓` to move,
`Enter` to play, `Esc` to close, and typing filters. Each row says what
the file is, what it calls itself (an `.it`'s title and a SID-Wizard
module's `AUTHOR:TITLE` come out of a 72-byte slice of the header) and,
for a project, whether its song files are there. Opening a project
reads those song files with it, found by the project's own spelling
against its folder and then by name anywhere in the listing — the same
two-step the file table does inside the module. A folder holding one
song plays it; a folder of many opens the list.

**The page explains itself.** `[HELP]`, `?` or `F1` puts up DUET's own
help box — the title on the top border, a topic strip paged with
`←`/`→`, two-column key→meaning rows, `? or Esc closes` on the bottom
border, the page dimmed behind it. Eight topics: what the player is
(and that nothing you open is uploaded — there is no server side), the
four ways to get a song in, every button, what each number means, the
strip and the visualiser, the keys, the formats, what to do when it will
not play, and the licences. The prose lives in `index.html` as
`<section data-title>` blocks.

page is a 1280×720 design scaled uniformly to the window — a bigger
window shows the same rows and the same effects, larger, never more
rows (`?scale=1` pins it). `window.duet` is the page's state, for the
browser console.

The numbers (a 2-chip SID-Wizard module, V8): ReleaseSmall is 2.4 MB —
253 KB gzipped — and renders at 22× real time; ReleaseFast 6.9 MB
(1.5 MB gzipped) at 26×; native ReleaseFast is 34×. At `resample`
quality the module runs at 9× (native 27×; `+simd128` would make it
12×). `zig build wasm` builds ReleaseSmall unless `-Doptimize` says
otherwise — the one artifact with its own default, because a Debug
module (11 MB, `-Doptimize=Debug`, the leak gate's) cannot keep up
with a song in real time.

The pin is `sh tools/wasm-ab.sh`: `tools/wasmplay.mjs` — the same
bounce as `cplay -o`, driven from Node's WASI — renders the eight
`capi-ab` songs through `zig-out/web/duet.wasm` against `duet
--render`. Six are byte-identical, the header included: the plain
`.it`, both SID-Wizard modules (reSID's whole sample path is integer,
`resample` included), DUSK, the co-play, the hybrid. Two — the DUST
project and the sends' room — differ by at most **1 LSB** with
correlation 1.00000: their float DSP calls `@sin`/`@exp`/`@cos` per
sample, and those are Apple's libm natively and wasi-libc's in the
module. The script names those rows and `tools/wav_diff.py` judges
them (max 1 LSB, corr ≥ 0.99999, or the row fails); the bar is `ALL
WITHIN THE LAW`. `node tools/webplay-smoke.mjs` is the page's own
check: it serves `zig-out/web` on loopback, opens the page in headless
Chrome with `?autotest=8000`, collects the console and every exception
over the DevTools protocol and reads the `SELFTEST` line the page
writes — the module compiled in the worklet, a gallery song opened,
frames rendered in real time, rows drawn; `--shot page.png` saves a
screenshot, `--song` picks the entry, `--files a.zon,a.it` hands your
own files to the page's file input — the drop's road. The bar is
`WEBPLAY OK`. `tools/wasmplay.mjs -c 128` renders in a worklet's
quanta instead of `--render`'s 4096 (the bytes are the same; the
speed is the question it answers).

**The gallery** is a folder of its own in the tree, `gallery/`, and
`zig build wasm` installs it wholesale as `zig-out/web/songs/` with its
manifest one level up at `songs.json`. Ninety songs, 2.6 MB: DUET's own
demos (GPL-2.0-or-later, like the rest of the repository), all seventy
SID-Wizard example modules (Hermit's WTFPL folder, each credited by the
`AUTHOR:TITLE` in its own header), and Impulse Tracker modules by other
musicians, taken only where a licence deed allows redistribution
(Public Domain, CC0, CC BY) and each one carrying its author, its
licence and its source page. `tests/corpus/classics/` is other people's
music with no such deed, and is not shipped. `gallery/MANIFEST.md` is
the provenance in prose and travels with the songs;
`node tools/gallery-manifest.mjs` writes `songs.json` from the files'
own headers (`--check` says whether it is current, `--verify` opens and
plays all ninety through the module). The layout is load-bearing:
`duet/co-demo.zon` names its SID half `"../swm/congabeat.swm"`, which
is exactly where the SID-Wizard examples live — so the co-play demo is
also the gallery's own test of the resolver road.

The page embeds the tracker's font, JetBrains Mono, with its OFL text
beside it, and `LICENSES/` in the web directory names every licence in
the served page (with the GPL and OFL texts in full). The module is a
distributed reSID build like every other: GPL-2.0-or-later.

## What the tracker does with it

The tracker is the library's first program, and it goes the same road:
`src/app/main.zig` holds a `Song` and an `Engine`; the audio callback
(`src/app/device.zig`) is `load.begin → engine.render → load.end`; a
file dialog's open is `Song.open` with a resolver that joins the
project's spellings to its folder; a structural change — a chip
switched on, a sample written into a slot, a project opened — stops
the device, tears the graph down, changes the song, builds the graph
and starts the device again; a bounce is the library's `Bounce` job
stepping an engine over a shadow of the song into a `.wav` sink the
tracker provides (`src/app/wavfile.zig`). The library never sees a
path. The map is in [architecture](architecture.md).

The Zig module gives a program of your own the same extra roads the
tracker uses: `duet.Bounce` (`bounce.Job.create(alloc, spec)`, `step`,
`runToEnd`) for an offline render with the exact cut, the fade and the
stems' solo law into a `Sink` callback of yours; the writers
(`duet.it.writer.write`, `duet.sid.swwriter.write`,
`duet.sid.swiwriter.write`, `duet.project.serialize`) that return a
file's bytes; `duet.audio.wav.read` for a sample; and the engine's
taps for a visualizer.

## What a change must keep true

- **The C ABI surface is a contract.** The exported functions, the
  opaque handles, `duet_position`, `duet_event`, `duet_marker` and
  `duet_open_error` (their sizes and offsets are pinned at compile
  time in `src/capi.zig`), the enums' values, the resolver's shape —
  a program built on them keeps working. A changed signature, layout
  or enum value is a break and a version conversation, never a quiet
  edit; a new export is additive and fine.
- **The library opens no file, prints nothing, creates no thread.**
  No `std.fs` outside `src/app/`; a road that needs a file gets a
  bytes-in twin and the app keeps the file half.
- **No library file imports the app**, and the compiler enforces it
  (a file belongs to one module).
- **The render road allocates nothing**; a new allocation goes into
  `build`.
- **`sh tools/capi-ab.sh` stays `ALL IDENTICAL`** after touching
  `src/capi.zig`, `include/duet.h`, the examples, the 16-bit law or the
  bounce's chunk loop; the header stays clean under `-pedantic -Werror`
  as C89 through C++17; `zig build test` runs the ABI's own root
  through the real exports with the leak gate on.
- **A `u64` the render thread shares is `atomic64.Value(u64)`**
  (`src/atomic.zig`), never `std.atomic.Value(u64)`: wasm32 has no
  64-bit atomic, and `zig build` does not build the module — `zig build
  wasm` does, and `sh tools/wasm-ab.sh` stays `ALL WITHIN THE LAW`.
