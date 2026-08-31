# The pattern editor

The pattern page is where a song is written: one grid, every kind of
column side by side — channels, SID columns, synth columns, a
SID-Wizard module's tracks. `F2` goes there from anywhere; `TAB` flips
between it and the instruments page. The words used here are the
[glossary](glossary.md)'s.

## The grid

Rows are numbered in hex. The header's `PAT 00/02` is the pattern you
are on and how many the song has; `SPD`/`BPM` are the song's speed and
tempo. Each kind of column draws its own fields:

| column | header | fields |
|---|---|---|
| channel | `CH01` | note · instrument · volume · effect (letter + value) |
| SID column | `1:1` (chip:voice) | note · instrument · effect (two hex bytes) |
| synth column | `DUST1`, `DUSK1` | note · instrument · volume · effect |
| track | `SW01:03↕28` (track : phrase, its length) | note · instrument · effect (two hex bytes) |

Every column ends at its own length. Where a shorter pattern runs out,
a rule with its length (`── 20 ──`) closes the column and the longer
ones continue — in a co-play each track column is a phrase with a
length of its own, so the row axis is as long as the longest column.

A `│` seam separates the channels from the SID and synth blocks. With
SPLIT on those blocks are pinned to the right edge and the channels
scroll under them; the seam then draws as `>` when channels are hidden
beneath it.

## The cursor

Arrows move field to field; a column's fields are cursor stops, and the
effect field of a channel is two of them (the letter, the value).
`PGUP`/`PGDN` jump 16 rows, `HOME`/`END` go to the first and last row.
`Ctrl+LEFT/RIGHT` hop CH-HOP columns at a time (the hop count is set on
the PROJECT page). `ALT+LEFT/RIGHT` jump between zones — the channels,
the synth block, the SID block, a co-play's tracks — and wrap; when the
channels are split under a pinned block, the zone jump is the way
across. `ALT+UP/DOWN` add and remove IT channels right from the grid.

## EDIT and JAM

The page starts in EDIT: the keyboard types into the field under the
cursor. `SPACE` switches to JAM — the footer says `JAM`, the letter
rows play the current instrument without writing anything, and the
plain arrows step whole columns instead of fields. `SPACE` again
returns to EDIT.

## Typing into the fields

On a **note field** the piano rows enter notes: `Z S X D C V ...` is
the lower octave, `Q 2 W 3 E R ...` the upper, `[` `]` change the
octave. `` ` `` writes note off (`===`), `1` note cut (`^^^`), `~`
note fade (`~~~`), `.` clears. After a note or one of these the cursor
steps one row down. A typed note carries the current instrument — the
footer's `P01 S01` names it per side, `;` and `'` step it.

Every **instrument field** is hex: digits shift in from the right, and
`A`–`F` are digits there, so type both digits of the number you mean.
A channel's **volume field** is decimal, 0–64, typed straight in. The
channel **effect field** takes a letter (`A`–`Z` on its first stop),
then two hex digits on its value stop. A SID column's or track's
effect field is two hex bytes — the effect number and its data — each
typed as shifting hex.

`SHIFT+LEFT/RIGHT` transpose a note a semitone, `SHIFT+UP/DOWN` an
octave; on an empty note field they start from the last note you
entered. On other fields `SHIFT+arrows` nudge the value.

## Walking the patterns

`+`/`-` step to the next and previous pattern, `Ctrl+G` asks for a
number, `L` opens PATTERN LENGTH (rows, in hex, up to `C8`). Every
pattern number exists from the start — `+` and `Ctrl+G` simply walk
out to an empty one; the order list decides what plays
([impulse-tracker](impulse-tracker.md)).

## The views

`Ctrl+V` cycles a co-play's grid view; the footer names it (`GRID
UNITY`):

| view | shows |
|---|---|
| IT | the channels alone |
| UNITY | channels and tracks on one row axis; each column ends at its own length |
| POLY | UNITY, but a shorter pattern wraps and repeats until the longest ends |
| SWM | the tracks alone, under the module's own header line |

`Ctrl+T` toggles SPLIT (the pinned SID/synth block). `Ctrl+W` cycles
the channel width — FULL, NOTE+INS, NOTE — for every column at once.
`Ctrl+F` toggles follow; `F3` cycles the note pulse's seven looks.

## The mark and the block

`ALT+B` starts a mark where you stand, and the mark follows the cursor
— rows *and* fields, so what you walk over is what is in the block: a
mark that never leaves the note field is a note-field block, one
walked across to the effect field carries everything between. `ENTER`
or `ALT+E` holds the block so the cursor can leave it. `ALT+D` grows
it a rung at a time — beat, bar, the rest of the column, the channel,
the whole side; `ALT+L` marks the channel, twice the side. `ALT+U` or
`ESC` unmarks. A block stays on one side of the seam between column
kinds.

On the block:

| key | does |
|---|---|
| `ALT+C` / `ALT+Z` | copy / cut |
| `ALT+P` | paste at the cursor — the cursor gives the row and column, the fields land where they were cut from |
| `ALT+M` | paste only into empty fields |
| `ALT+SHIFT+P` | translate paste (below) |
| `ALT+Q` / `ALT+A` | transpose ±1 semitone (`ALT+SHIFT+Q/A`: ±1 octave) |
| `ALT+S` | set every note in the block to the current instrument |
| `DEL` | clear the block |

`Ctrl+P` opens the block command list — everything above plus
INTERPOLATE, REVERSE ROWS, ROLL UP/DOWN and BOUNCE TO AUDIO (`Ctrl+B`,
the block bounce) — with a teaching line per entry; type to filter,
`ENTER` runs. With no block it marks the whole side first, so you see
what it will touch.

With no block, `DEL`/`BKSP` delete the row under the cursor in this
column and pull the rest up; `INS` (or `SHIFT+BKSP`) inserts one and
pushes down. With `ALT` the same verbs take the whole row of the side.

## Pasting onto another kind of column

The clipboard crosses the seams. Pasted onto the same kind of column,
a block lands whole. A block moving between the two kinds of SID
column — a song's SID channels and a module's tracks — carries its
**notes and its effects** (they speak one effect language); only the
instrument stays behind, since the two number different banks, and
`ALT+S` stamps the destination's own. Pasted onto a different kind
altogether, `ALT+P` and `ALT+M` carry the **notes alone** — the receipt says so and points at the
third paste: `ALT+SHIFT+P`, the translate paste, which carries the
effects too, respelled in the target column's own language. Values are
converted, not copied — an IT `H64` vibrato lands on a track as `0825`,
SID-Wizard's own vibrato with the nearest depth and rate; a volume
becomes a sustain nibble. A TRANSLATE REPORT pops up naming every
conversion and every drop with its reason (`the volume slide does not
cross`); the receipt counts them (`2 FX ACROSS, 0 DROPPED`). An IT
arpeggio becomes a chord: the report says which chord slots were
written. An effect crosses as a pair — a mark holding only its letter
or only its value refuses: *TRANSLATE: an effect is its letter AND its
value - the mark holds only one stop of the pair*.

## The system clipboard

`ALT+SHIFT+X` lists the same block verbs through the operating system's
clipboard, as text OpenMPT and another DUET read — COPY, CUT, PASTE,
MIX PASTE, TRANSLATE PASTE, each with its own `ALT+SHIFT` key. The
`ALT+C` clipboard is untouched by them. The text, the rules and the
program-facing format are on [the system clipboard](system-clipboard.md).

## Sync markers

A **sync marker** is an inaudible point with a value, saved in the
project for a program that plays the song through DUET's library — a
demo, a game — to act on when the row plays ([libduet](dev/libduet.md)
says what it receives). `ALT+G` opens the SYNC MARKER popup on the
cursor's cell: it names the cell (`P00 row 10 ch 2`), says whether a
marker stands there, and takes a decimal value from 0 to 65535 —
`ENTER` sets or re-values it, `DEL` clears it, `ESC` leaves; the
receipt reads `MARKER 512 at P00 row 10 ch 2 - saved in the .zon, sent
to a host when the row plays`. A cell with a marker on it wears an
amber wash. A marker sits on an IT column of any kind — a channel, a
SID column, a synth column — at its pattern and row, so a pattern
reused in the order list fires it at every occurrence. A SID-Wizard
track has no place for one (`MARKER: only on the IT grid's columns -
an SW column belongs to the module`), and a bare `[IT]` session
refuses too, because a marker lives in the `.zon`: `[IT] is a bare
Impulse song - a SYNC MARKER lives in the .zon, so SAVE AS a project
(or NEW) first`. Setting one is not an undoable edit — `ALT+G` and
`DEL` are each other's undo.

## The FX picker

`ENTER` on a volume or effect field opens the list of what that field
can take — each kind of column has its own: the IT letters `A`–`Z`,
the ten volume commands, the SID-Wizard effects by number, and the
DUET send commands `a`–`d` at the end of the letters list, one per
send FX unit. The list opens preselected on what the cell
holds, a teaching line explains the selected entry and its parameter,
and `ENTER` enters it — keeping the parameter you had dialed. On a
track's or SID column's empty instrument field, `ENTER` opens the
INS-FX list instead (legato and the instrument-column nibble effects);
on a filled one it jumps to that instrument on the instruments page.
The IT note field has no effects, and `ENTER` there says so.

## Undo

`Ctrl+Z` undoes and `Ctrl+Y` redoes on the thing you are on — the
pattern you are editing is its own undo target. `Ctrl+U` opens the
undo history (`UNDO - PATTERN 00`), each line one edit, before and
after; `ENTER` travels to it.
