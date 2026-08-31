# The scope and the visualizers

DUET draws its sound three ways: the scope, a band that stands on the
page you are working on; the visualizer, a page of its own; and the
note pulse, the grid's own flash on every note. The words are the
[glossary](glossary.md)'s; the keys are spelled as [keys](keys.md)
spells them.

## The scope

The scope is an oscilloscope band across the bottom of the pattern
page or the instruments page. It shows one source at a time — the
keyboard, a channel, a chip or a synth slot — and names it.

`ALT+O` puts it up; the receipt says what it will show: `OSC on - the
scope shows what the keyboard plays; ESC or ALT+O closes`. `ESC` or
`ALT+O` again takes it down (`OSC off`). Every slot editor on the
instruments page has an `[OSC]` button too — on a P## or S## the last
button of the row (`RIGHT` from the name walks onto it), on a D## or
K## the last stop of the face strip (`UP` onto the strip, `RIGHT` to
it, `ENTER`); its hint is the rule in one line: `OSC: show or hide the
scope band - it draws what the keyboard plays (ALT+O does the same)`.
The band stays up when you `TAB` between the two pages. On any other
page `ALT+O` answers `the scope lives on the pattern and instrument
pages`; a band left up when you go to another page is parked, not
closed, and is there again when you come back.

![A DUSK patch's VOICE face with the scope up](img/dusk.png)

The band's title names the source; the line under the trace reads
four things:

```
── OSC  S01 BASSGUIT ─────────────────────────────────────────
  chip 1  C-5  2 cycles  PEAK -31.2 dBFS           ESC closes
```

| field | reads |
|---|---|
| where it listens | `keys` (the keyboard's own voice), `CH 01` (a channel), `chip 1` (a SID), `slot 1` (a DUST or DUSK slot) |
| the note | `---`, or the note it has locked to (`C-5`) |
| the timebase | `free run` while nothing is sounding; `2 cycles` once it has locked to the note's period |
| the level | `silent`, or the peak it sees (`PEAK -31.2 dBFS`) |

What it shows is the thing that is sounding, or would sound:

- While the song plays, on the pattern page, it follows the column
  under the cursor: `CHANNEL 01`, `SID 1 voice 1` (listening at
  `chip 1`), `DUSK slot 1`. Move the cursor and the band follows.
- Stopped, it shows what the keyboard plays — the instrument you
  last picked on the instruments page, at the place it sounds: a P##
  at `keys` (`P01 kick`), an S## at its chip (`S01 BASSGUIT`,
  `chip 1`), a D## or K## at its slot (`K01 AC1D`, `slot 1`). Jam
  (`SPACE`, then the piano rows) and the trace locks to the note.
- On the instruments page it shows the selected slot and follows the
  selection: step from `P01` to `P02` and the title reads `P02 snare`.
- Three sources are fixed: a synth column's slot is shown even while
  stopped, an `[SWM]` session's source is its chip, and an empty slot
  shows its number and stays `silent`.

Once it has locked, the trace stands still — a whole number of cycles
of the note fills the band — so what moves is the thing you are
dialing: turn a filter or a pulse width in the editor and watch the
shape change under a note that holds.

A D## or K## band carries a second line — the patch's modulators,
live: `LFO  A -0.62  B +0.35  C --  D --   ENV A B` (a K## lists
`ENV A B C D`). The band takes rows from the page under it, and the
page keeps working in the rows it has left: an editor's detail pane
scrolls under the cursor, with a scrollbar at its right edge. In a
short window (24 rows) the band shrinks, and the modulator line is
the first thing it gives up.

## The visualizer

The visualizer is the last page in the screen list — `Ctrl+DOWN` from
the mixer, or `--page viz` at start — `VISUALIZER // NEON
FLOOR`. The strip at the top names the four modes and the one that is
on: `◀  VU BARS · SPECTRUM · SCOPE · PLASMA  ▶`.

![The spectrum](img/viz.png)

| key | does |
|---|---|
| `LEFT` / `RIGHT` | the previous and next mode, around the ring |
| `UP` / `DOWN` | on VU BARS and SPECTRUM, the bar style: NORMAL, SCANLINES, GAP (the receipt says `BARS: SCANLINES`) |
| `F5` `F7` `F6` `F8` | the transport, as everywhere |
| `TAB` | back to the pattern page |

The status line names what the keys do here — `<- -> mode   ^ v
bars: NORMAL`, or `<- -> switch visualization` on the modes without
bars — and its right end counts the time played (`0:03`).

| mode | shows |
|---|---|
| VU BARS | one bar per column of the grid, labelled as the grid labels them — `01`, `1:1`, `DUST1`, `DUSK1`, a co-play's `SW01` — then `L` and `R`, the master; every bar holds its peak for a moment |
| SPECTRUM | the mix by frequency, low on the left, one bar per band with the same peak marks |
| SCOPE | the mix as one trace across the page, with the glow of a phosphor screen |
| PLASMA | a colour cloud |

Two more modes are reached only from the command line: `--viz duo`
draws the left and right channels as two vertical traces standing on
their own bars, `--viz copper` draws horizontal colour bands.
`LEFT`/`RIGHT` leave them for the four. `--viz` and `--bars` pick the
mode and the bar style at start ([cli](cli.md)), and `--shot N
out.png` renders the page's pixel layer to a picture without a
terminal.

## The note pulse

The grid flashes on every note: when a note starts, its cell lights
on the row it started on and fades — ice for a channel or a synth
column, amber for a SID voice. Every fourth row a pink wash crosses
the playing row, as strong as the level you hear. `F3` cycles the
pulse's looks, from any page, and the receipt names each:

| receipt | the look |
|---|---|
| `GRID PULSE HALO` | the glow, and the light laid as paper under the three rows around the playhead — where a fresh session starts |
| `GRID PULSE CHAR` | whole cells lit, the empty ones too, hard-edged |
| `GRID PULSE LINE` | a slab on the playing row alone; nothing else moves |
| `GRID PULSE PAPER` | the cell's background tinted toward the note's colour, fading with it |
| `GRID PULSE CLIPPED` | the glow alone, stopped at the channels' block on a co-play's UNITY grid |
| `GRID PULSE OFF` | no pulse |
| `GRID PULSE FULL` | the glow alone, over every column; the ring returns to HALO after it |

## The header and the strips

`CPU n%` in the header is how much of the audio thread's time playback
takes ([getting started](getting-started.md) has the header line by
line); the mixer's strips carry level meters of their own
([mixer](mixer.md)).

## The window's own keys

`duet-gui` owns the font chords and fullscreen; [getting
started](getting-started.md) lists them. Each font chord answers in
the header with the size and the grid that now fits — `FONT 20px ·
120x40` is the default, `FONT 24px · 98x33` after two steps in,
`FONT 18px · 135x44` one step out — and the screen re-lays itself the
way a terminal resize does.
