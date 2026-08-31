# Troubleshooting

Something does not work — a key, the sound, the build, a file. This
page goes symptom by symptom: what the screen says, why, and what to
do. The words are the [glossary](glossary.md)'s; the happy path is in
[getting started](getting-started.md).

## The build stops before it starts

```
build.zig.zon:13:20: error: unable to connect to server: ...
```

Both dependencies are fetched from GitHub on the first build, by the
release tags and hashes `build.zig.zon` names: `movy`, the terminal
render engine, and SDL3. The first `zig build` therefore needs a
network connection; the packages land in Zig's global cache
(`~/.cache/zig`) and later builds, offline ones included, read them
from there. The build asks for Zig 0.15.2 (`minimum_zig_version` in
`build.zig.zon`).

`-Dtarget=x86_64-windows-gnu` builds `duet-gui.exe` with the library
and the example players — the terminal build exists on POSIX systems
only. The Windows exe cross-compiles but has not been run on a real
Windows machine yet. On Linux everything builds; audio goes through
ALSA or PulseAudio, found at run time, so no audio development
packages are needed.

## `DUET needs at least 80x24 cells (yours is 70x20).`

The terminal is too small; DUET quits with this line. Make the window
at least 80 columns by 24 rows and start again. While DUET runs, the
terminal size is checked every couple of seconds: growing the window
re-lays the screen, shrinking it below the minimum is ignored and the
screen keeps its last size until the window is big enough again. The
window build cannot be resized below 80×24 at all.

## `Alt` keys do nothing — or type a note and say `press again to quit`

The header's `KITTY OFF` is the cause: the terminal does not speak the
kitty keyboard protocol, and without it some keys never reach DUET as
what you pressed. A terminal without the protocol sends `Alt+B` as
`ESC` and then `b` — DUET reads an `ESC` (on the pattern page: `press
again to quit`) and a `b` (a piano key: a note lands in the field).
`Ctrl+M` arrives as `ENTER`, `Ctrl+"+"` and `Ctrl+"-"` do not arrive at
all, and a terminal that sends no modifier with its F-keys delivers
`SHIFT+F10` as `F10`.

Use kitty, Ghostty, WezTerm or foot and the header says `KITTY ON`;
the window build always does. On any other terminal every function is
still reachable, by another road:

| needs the protocol | the road without it |
|---|---|
| `ALT+B` … `ALT+U` — the mark, `ALT+C/Z/P/M/Q/A/S` — the block verbs | `Ctrl+P`: with no block it marks the whole side and lists the same operations (`PATTERN OPS - 64 ROWS x 24 CH`) |
| `ALT+LEFT/RIGHT` — the zone jump | the arrows walk across the seam; if SPLIT hides channels under the pinned block, `Ctrl+T` unpins it |
| `ALT+UP/DOWN` — IT CHANNELS | the IT CHANNELS field on the PROJECT page |
| `Ctrl+M`, `ALT+F9`, `ALT+F1`–`F8` — mute | the MUTE cell on the SONG page's CHANNELS table; `m` on a mixer strip |
| `ALT+F10` — solo | `s` on a mixer strip |
| `ALT+O` — the scope | the `[OSC]` button on a slot |
| `Ctrl+"+"` / `Ctrl+"-"` — the pattern hop | `+`/`-` step one pattern; `Ctrl+G` asks for a number |
| `Ctrl+F2`, `Ctrl+F4`, `SHIFT+F10` | `L`, `I`, `Ctrl+E` |
| `SHIFT+BKSP` — insert a row | `INS` |
| `SHIFT+ENTER` on the SWM SONG page — the whole row | `ENTER` opens one phrase |

The [keys](keys.md) page lists every binding, and which of them
need the protocol.

## The header says `AUDIO OFF`

Two causes. Every headless job — `--render`, `--dump-screen`, the
others in [cli](cli.md) — runs without a device and says so. In an
interactive session it means the audio device could not be opened at
start: the session runs, silent, and the header shows no `CPU`
number. Check the device with

```
$ duet --audio-test
audio: starting device (48000 Hz, 2ch, f32)...
audio: 41 callbacks, 19680 frames @ 48000 Hz (~410 ms of audio)
audio: callback load 0.02% of realtime (worst single callback 0%)
audio: OK
```

then start DUET again; it always runs the device at 48000 Hz. A render
never needs a device — `--render` works while the header says off.

## The `CPU` number is high, or the sound stutters

`CPU n%` is how much of the audio thread's time playback takes; the
number changes colour at 50 % and again at 75 %. Above that, the
device runs out of time and the sound breaks up. What costs the most
is reSID: set QUALITY on the PROJECT page to `FAST` (or start with
`--sid-quality fast`), and switch off the chips and DUST slots you do
not use — every chip and every armed DUST slot is a SID of its own.
`duet --bench file` prints what each mix stage costs, in multiples of
real time, without a device.

## The file will not open

DUET says why, on the command line or as the receipt in the header
(`OPEN FAILED: bad.it (error.NotAnItFile)`):

| what it says | the cause |
|---|---|
| `error.NotAnItFile` | not an Impulse Tracker module. `.mod`, `.xm` and `.s3m` are not read — IT is the only sample format; a file with an unknown extension is tried as an `.it` |
| `error.UnexpectedEof` | the file is cut short |
| `error.BadMagic` on an `.swm` | not a SID-Wizard module |
| `swi: cannot parse a.swi: error.TooShort (slot left empty)` | not a SID-Wizard instrument; the session goes on without it |
| `IMPORT FAILED: a.wav (error.NotAWavFile)` | not a RIFF wave file |
| `error: UnsupportedFormat`, `error.UnsupportedChannels` | a `.wav` that is not PCM or float, or has more than two channels |
| `written by a newer DUET (file v99, this build reads v12)` | a project from a newer DUET: it is refused rather than read with parts missing; open it with that DUET |
| `pre-v11: links 2 .swi file(s) instead of holding them - open the .it and load them into S##` | a project from an old DUET that named its `.swi` files instead of holding them: open the project's `.it`, load the instruments into the S## list in the order the file listed them, SAVE AS a project |
| `cannot read hybrid-demo.it: error.FileNotFound` | the project names a song file that is not beside it: a project and its `.it` (and `.swm`) stay in one folder |
| `project: a.zon: 1:12: error: expected ',' after initializer` | the project file is not valid ZON — a hand edit broke it |
| `cannot open --swi-dir <dir>: error.FileNotFound` | the directory does not exist |
| `--sid-channels needs SWI instruments (.swi args or --swi-dir)` | channels were bound to SID voices with nothing to play on them |

`--resave out.xyz` with an extension that is not `.it`, `.swm`, `.swi`
or `.zon` refuses with the usage line: the output's extension picks
the writer. A write into a folder that does not exist fails with
`error: FileNotFound` (`save-project failed: error.FileNotFound`).

## The file is not in the dialog

The dialog's title names what it lists: `OPEN: FILE (.zon .it .swm
.sws .swt .swq .wav)` for `F9`, and for the instrument dialog `OPEN:
INSTRUMENT (.wav)` in an `[IT]` session, `(.swi)` in an `[SWM]`,
`(.swi .wav)` in a duet. Anything else is not shown, and a name typed
into the query line that matches nothing opens nothing. An `[IT]`
session has no place for a `.swi`: switch a chip on in the SID setup
first — or open the two together, `duet song.it inst.swi`, and the
session starts as a `[DUET]`. The rules per session are in
[sessions and formats](sessions-and-formats.md).

## A SID-Wizard tune sounds different from SID-Wizard

DUET plays every module through SID-Wizard's NORMAL player. A tune
written for another player loads, plays, and saves back byte for byte
— `duet --dump tune.swm` prints its `driver` — but two effects exist
only in the EXTRA player and the effect picker says so: `1D TRACK
DELAY` (`vv = frames (EXTRA driver only - NORMAL ignores)`) and `1E
NOTE DELAY` (`vv = frames, max tempo-3 (EXTRA driver only)`). Some of
SID-Wizard's own example tunes read table bytes past the end of their
instruments; they load, play and save back unchanged as well.

## A column is silent

Mutes are saved with the song or the project — `CH01 MUTED (saved in
the song)`, `1:1 MUTED (saved in the project)` — so a file opens as
quiet as it was left. The SONG page's CHANNELS table reads `MUTE`
where a column is silenced (`ENTER` on the cell gives it back, `on`),
the mixer's strips show theirs, and `Ctrl+M` on the column lifts one
(`CH01 unmuted (saved in the song)`). `--render --bare` renders the
engines alone, without the mixer and the saved SID mutes.

## The render clips

```
rendered 247.89s  peak 1.122  -> out.wav
  4 samples clipped — the mixer's DYN limiter would prevent this
```

The mix went over full scale. Switch the DYN limiter on in the mixer
(it starts bypassed), or bring MIX VOL or the MASTER fader down, and
render again; the line names the peak so you can see how far.

## My key layout is not used

```
keymap: 1:9: error: expected ',' after initializer
keys: /home/me/.config/duet/keys.zon: does not parse — using the built-in layout
```

`keys.zon` did not parse; DUET starts with the built-in layout and
says so. Fix the file and press `Ctrl+K` — while the file is still
broken the status line says `KEYS: the file does not parse - the old
layout is kept` and the layout in use stays. A `--keys` file that does
not exist says `no such file — using the built-in layout`. To start
over, delete `keys.zon`; deleting `config.zon` in the same folder
forgets the file dialogs' favourites and last directories. Nothing
else is written anywhere.

## The command line refuses

`duet: bad/missing argument:` names what: two files of one kind (*two
IT songs on the command line (a.it, b.it) - a session holds one*), a
page that is not one (*--page: not a page or popup name*), a render
named anything but `.wav`, a `--tail` without `--bounce-block`, a
`--bounce-block` on a road that is not a render, and a `.swm` beside a
project whose IT pattern binds SID columns. A block bounce that would
be silent refuses with the reason too ([bounce](bounce.md)).

## Reporting a bug

Say what you pressed, what the screen said, and attach the file if it
is one you can share; `duet --dump-screen --page <page> file` prints
the screen as text, and the masthead of `duet --help` names the
version. The repository's issue tracker is the place.
