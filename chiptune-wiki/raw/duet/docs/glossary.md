# Glossary

The words DUET uses, in the sense the screen uses them. Every page in
this documentation uses these words and no others for the things they
name; where the screen shows a word, the entry says where.

## Sessions and files

**session** — one running DUET and what it has loaded. Its kind is
shown by the **badge**, the bracketed word at the top right of every
page: `[IT]`, `[SWM]`, `[DUET]` or `[CO]`. The badge also says what
SAVE writes (the help popup, `?`, page PROJ).

**`[IT]`** — an Impulse Tracker module (`.it`) on its own. SAVE writes
the `.it` and nothing else.

**`[SWM]`** — a SID-Wizard module (`.swm`, or its 2/3/4-chip forms
`.sws`, `.swt`, `.swq`) on its own. SAVE writes the module and nothing
else.

**`[DUET]`** — a project, a **duet**: a session with both sides,
samples and SID. SAVE writes the project file and the song file it
owns. Bare `duet` opens a fresh one.

**`[CO]`** — a co-play: an `.it` and a SID-Wizard module playing
together. SAVE writes the project and both halves.

**project** — DUET's own file, `.zon`. It names its song file (an
`.it`, and an `.swm` in a co-play) and holds everything that is not in
a song file: the SID instruments, the chord tables, the synth patches,
the mixer, the SID setup. The PROJECT page's FILES section lists what
a project holds.

**module** — a song file in a tracker's own format: an `.it` or a
SID-Wizard module. **co-play** — an `.it` and a SID-Wizard module
playing together on one clock, the IT song's; the PROJECT page's
`+ CO-PLAY (SWM...)` button pairs them.

**subtune** — one of the songs a SID-Wizard module can hold. The SWM
SONG page shows `SUBTUNE 1/1`.

## The grid

**the pattern page** — the pattern editor, `F2`. The pattern is drawn
as a grid of rows and columns; the rows are numbered in hex.

**pattern** — one numbered block of rows. The header shows `PAT 00/01`:
this pattern, and how many the song has, both in hex.

**channel** — a column of the grid that plays samples and instruments
(`CH01` ...). Impulse Tracker's channels.

**SID column** — a column of the grid that plays one voice of one SID
chip. Its header is `chip:voice` (`1:1`, `1:2`, `1:3`). A chip
switched on in the SID setup adds its three columns to the grid.

**synth column** — a column that plays one DUST or DUSK slot; the
header is the slot's name (`DUST1`, `DUSK1`). The help popup calls the
group of them the SYNTH block.

**track** — a SID-Wizard module's column (`SW01:01`). The number after
the colon is the phrase the track shows at this position.

**phrase** — a SID-Wizard pattern: one track's worth of rows. On the
grid a track column *is* a phrase, and every column ends at its own
length.

**field** — one cell of a row: note, instrument, volume, effect on a
channel; note, instrument, effect on a SID column or a track.

**zone** — the columns of one kind on the grid (channels, synth
columns, SID columns), or one section of the mixer. `ALT+LEFT/RIGHT`
jumps between zones.

**SPLIT** — the SID columns pinned to the right edge of the grid so
they stay in view (`^T`).

**grid view** — how a co-play draws its two songs: IT, UNITY, POLY or
SWM (`^V`; the footer shows `GRID UNITY`).

**channel width** — how much of each channel is drawn: FULL, NOTE+INS
or NOTE (`^W`).

**IT CHANNELS** — how many channels the song uses, a knob on the
PROJECT page (`ALT+UP/DOWN` on the pattern page).

**CH-HOP, P-HOP** — how many channels `^LEFT/RIGHT` hops, and how many
patterns `^+`/`^-` hop. Both are set on the PROJECT page.

**the mark, a block** — a selection on the grid (`ALT+B` starts one;
the help popup's BLOCK page has the rest). A block stays on one side
of the seam between channels and SID columns.

**the note pulse** — the grid's flash on a note, `F3` cycles its seven
looks. **follow** — the view follows the playhead (`^F`).

**EDIT and JAM** — the two states of the pattern and instrument pages,
`SPACE` toggles. In EDIT the keyboard types into fields; in JAM the
letter rows are a piano.

**the jam instrument** — the instrument a typed or jammed note carries;
the pattern page's footer names it per side (`P01 S02`), `;` and `'`
step it.

**the FX picker** — the list of effects a field can take, with their
values, `ENTER` on an effect field. Each kind of column has its own
list.

**translate paste** — `ALT+SHIFT+P`: a paste onto another kind of
column that carries the effects across, spelled in that column's
language.

**sync marker** — an inaudible point on a row of an IT column, with a
value, for a program that plays the song through DUET's library to act
on when the row plays (`ALT+G` opens the SYNC MARKER popup; `DEL`
clears). It is saved in the project, never in the song file, so a bare
`[IT]` session refuses it.

**SYSTEM CLIPBOARD** — the operating system's clipboard, as against
the `ALT+C` clipboard inside one DUET. `ALT+SHIFT+X` lists the block
verbs
that go through it, as text OpenMPT and another DUET read
([the system clipboard](system-clipboard.md)).

## Sounds

**the instruments page** — `F4`, or `TAB` from the pattern page. One
page with up to six lists; `TAB`/`F4` rotate through the ones the
session has.

**I##** — an Impulse Tracker instrument: a map of samples over the
keys with envelopes. **P##** — a sample (PCM). **S##** — a SID-Wizard
instrument in the project's **SID pool** (`S## SID POOL`). **W##** — an
instrument in a loaded SID-Wizard module's **bank**, saved in the
module. **D##** — a DUST patch. **K##** — a DUSK patch.

**slot** — one numbered place in a list. Every slot exists from the
start; an empty one reads `- empty -`, and deleting never renumbers the
others. A D## or K## is also called a **patch**.

**INSTRUMENTS mode, SAMPLES mode** — the SOUNDS switch on the PROJECT
page: whether the grid's instrument column names I## instruments or
P## samples directly. A loaded song opens in the mode it was saved in.

**DUST slot, DUSK slot** — one running instance of a synth: `DUST1`..
`DUST4`, `DUSK1`..`DUSK8` on the PROJECT page. A slot that is on is
**armed**; an armed slot has a synth column on the grid and a strip on
the mixer.

**DUST** — DUET's SID synth: three SID voices with table programs on
the patch's own clock; each armed DUST slot is a reSID of its own,
beyond the SID setup's four chips — together, eight SIDs.

**DUSK** — DUET's wavetable synth: a patch plays a P## sample as a
**wavetable** — a row of equal single-cycle frames — and morphs
through them, with a software SID-style envelope and filter.

**chip** — one SID, `1`..`4` in the SID setup. Each has a **model**
(6581 or 8580) and a PAN. **voice** — one of a chip's three voices; a
SID column plays one.

**the SID setup** — the SETUP section of the PROJECT page: the four
chips, their models and pans, the DUST and DUSK slots, and QUALITY.

**QUALITY** — how reSID resamples the chip's clock to the audio rate:
FAST, INTERP or RESAMPLE. One setting for every chip.

**MOVE SIDS HOME** — the PROJECT page button that moves the SID
columns to their fixed home at the end of the grid.

**audition** — play a file or a slot without loading it: `SPACE` in
the file dialog and the import picker.

**import** — bring parts of another file into this session's lists:
instruments out of a SID-Wizard module, samples out of an `.it`,
patches out of a project. The `[IMPORT]` button under the lists.

**favourites** — the file dialog's eight remembered directories: `TAB`
lists them, `s` stores the current one, `x` clears, `1`–`8` jump.

## The mixer

**the mixer** — `THE MIXER // THE MASTER CONSOLE` in the screen list:
a strip for every channel, every chip, every armed synth slot, then
IT SUM (the channels' sum), MASTER and DYN.

**strip** — one column of the mixer: level, pan, a three-band EQ,
mute and solo.

**the sends** — the mixer's second page: for each strip, how much goes
to each of the four **send FX units** (A B C D: delay, reverb, chorus,
drive), and the units themselves with their **return strips**.

**DYN** — the master's dynamics: compressor and limiter, after the
MASTER fader.

**bypass** — a stage switched out of the signal path. Every EQ and
dynamics stage starts bypassed, so an untouched mixer changes nothing.

## Export

**EXPORT AUDIO** — render the song to a `.wav` (`^E`): the mix or
stems, through the mixer (AS YOU HEAR IT) or without it (RAW SONG).

**stems** — one `.wav` per mixer strip, written into a folder beside
the mix.

**BOUNCE BLOCK** — render the marked block to a `.wav` or into a P##
slot (`^B` on the pattern page).

**EXPORT SID -> .SWM** — write the SID columns out as a real
SID-Wizard module (the PROJECT page's button, or `--export-swm`).

**the save report** — the popup a save puts up when the file kept a
pattern (or phrase) no order list plays: `ESC` keeps them, `ENTER`
twice clears them.

## Looking and listening

**the scope** — the oscilloscope band over a work page (`ALT+O`, or
the `[OSC]` button on a slot). It shows the keyboard, a column, a chip
or a synth slot. **the visualizer** — the full-screen page: VU BARS,
SPECTRUM, SCOPE, PLASMA.

**the status line** — the bottom line of every page: the keys that
work here, and the last message. **The help popup** — `?` or `F1`:
eight pages of keys, drawn from the key layout in use.

## For contributors

Words the developer pages use for what the code does; each names
where it lives.

**the audio callback** — the function the audio device calls to fill
its buffer, `sm_audio_callback` in `src/app/device.zig`: where
playback runs, on the audio thread.

**tick** — the player's unit of time: `SPD` ticks make a row, and a
tick is rate × 2.5 / `BPM` samples (`src/player/player.zig`).

**NNA** — an instrument's new-note action, what a sounding note does
when the next one arrives: CUT, CONTINUE, NOTE-OFF or FADE on the I##
card. A note CONTINUE moves out of its channel becomes a **background
voice**, whose envelope and fade keep running (`bg` in `player.zig`).

**song level** — GLOBAL VOL × MIX VOL, the one level every family
follows, exactly 1.0 at the defaults (the PROJECT page's AUTHOR row;
`Player.songLevel`).

**render span** — the run of samples between two points where a
register write or a note may land: a player tick, or a **frame lane**
boundary — the SID engine's fixed-rate clocks (50, 100, 200 Hz)
(`renderSpan` in `src/sid/engine.zig`, `mixSpan` in `player.zig`).
"Sample-accurate" means "at a span boundary".

**gate mask** — the per-voice bits that mute a SID voice by holding
its gate shut while the oscillator runs (`gate_mask` in `engine.zig`).

**rack** (in the code) — a synth's hardware side: `DustRack` owns one
reSID per armed DUST slot, `DuskRack` the frame memory
(`src/sid/dustrack.zig`, `duskrack.zig`). On screen the word does not
appear; the lists are the instruments page.

**engine byte** — the version number every D## and K## patch carries
first (`ENGINE_DUST_V1`, `ENGINE_DUSK_V1`); a patch with another value
is left alone, never edited, never played wrong.

**pin, golden, bless** — a stored hash and trace a corpus render must
reproduce (`tests/golden/*/PINS`); "on their pins" is the scripts'
phrase; a **bless** rewrites them on purpose (`sh tools/dust-ab.sh
bless`).

**oracle** — what a render is judged against: a reference player
(`openmpt123`, SID-Wizard's own) or the pinned goldens; the four are in
[testing](dev/testing.md).

**receipt** — the one-line message a key or a button leaves in the
header's right half, naming what it did or refused; the screen twins
read it back off row 0.

**the tap, the probe** — the copy of the final mix the callback leaves
for the visualizer and the MASTER meter (`master` in
`src/audio/tap.zig`), and the scope's own ring, filled by one source at
the point where that source's meter reads (`probe`).

**multispeed** — a SID-Wizard tune's player runs 1 to 8 times per
frame (`fspeed`); the SWM SONG page shows `1x multispeed`. One run is a
**player call**, and `--swm-trace` counts them (`250 calls (5s, fspeed
1x)`).

**hard restart** — the two frames before a note in which SID-Wizard's
player parks the envelope so the next note starts clean; `--dump`
prints an instrument's `HR` bytes.

**project file version** — the `.version` a `.zon` carries; a newer
one is refused (`written by a newer DUET (file v13, this build reads
v12)`), an older one is upgraded when saved (`VERSION` in
`src/project.zig`).

**adopt** — what SAVE does with a co-play's `.swm`: it writes
`<name>.swm` beside the `.zon` and names that copy, leaving the file
it was opened from untouched.

**the library, libduet** — the engine as a Zig module (`duet`) and as
a C library (`libduet.a`, `libduet.dylib`/`.so`, `include/duet.h`):
everything under `src/` but `src/app/`. It opens no file, creates no
thread and owns no audio device; the tracker is its first program
([libduet](dev/libduet.md)).

**song, engine** (in the code) — the library's two objects. A `Song`
(`src/song.zig`) is the document: everything loadable and savable,
nothing that renders. An `Engine` (`src/graph.zig`) is the graph that
renders a song at a sample rate — the players, the chips, the synth
racks, the mixer stages, the taps. A session holds one of each; a
bounce builds its own engine over a copy of the song.

**the resolver** — the callback a program hands `Song.open` for a
project's song files: the library asks for their bytes by the spelling
the `.zon` carries and opens no file itself.

**the event ring, the output clock** — the lock-free ring an engine
fills at every dispatch it makes (a row entered, a note, an effect, a
sync marker), each stamped with the output clock — the frames the
engine has rendered since it was built — and a program drains from one
thread (`src/events.zig`).

**value verb, structural verb** — the two kinds of call on an engine.
A value verb (the transport, mute and solo, a note from the keyboard)
is an atomic the render thread takes at its next span head, safe
beside a running render; a structural verb (build, rebuild, a subtune
or quality change) requires that no render runs until it returns.
