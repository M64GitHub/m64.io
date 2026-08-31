# The SID-Wizard side

DUET's SID half is a complete SID-Wizard: an `.swm` (or its 2/3/4-chip
forms) opens as an `[SWM]` session, plays through real SID emulation,
and saves back byte for byte. The same tracks appear as the second
half of a co-play. The grid itself is the
[pattern editor](pattern-editor.md)'s; this page is what is
SID-Wizard's own: phrases, the song face, subtunes, tempo programs,
the instrument editor, chords. Words are the [glossary](glossary.md)'s.

## Tracks and phrases

A track column on the grid *is* a phrase — the header names both
(`SW01:03↕28`: track 1, phrase 03, 28 rows), and every column ends at
its own length. On a track column `+`/`-` page through phrases — the
receipt counts them (`SW01: pattern 02 of 7F`) — and `F6` loops the
phrases on screen as a combination. Which phrase plays at which
position is the song face's business, below.

The fields are note · instrument · effect. The instrument column
carries more than instruments: `ENTER` on an empty one offers legato
(`L=`, the note slurs in without a restart) and the nibble effects —
waveform, sustain, release, chord — and the note column has effects of
its own: `ENTER` there lists vibrato amplitudes `$60`–`$6F`
(`SHIFT+LEFT/RIGHT` dial a placed one, the cell reads `vb0`–`vbF`),
portamento, sync and ring on/off, gate on/off. The effect column's own
list is the full SID-Wizard vocabulary by number — slides, waveform
and ADSR sets, table jumps, detune, pulse width, cutoff, the tempo
family, vibrato type, track and note delay. Every entry carries a
teaching line, and a gate mark (`===`) plays as SID-Wizard's gate-off.

## The SWM song face

`F11` opens SWM SONG (in a co-play, `TAB` from the SONG page). The top
strip is the subtune; under it one order list per track:

```
SUBTUNE ◀ 1/3 ▶  [+ SUBTUNE]  TEMPO 7   3 tracks  19 patterns  1x multispeed

POS 1:1  1:2  1:3
00  01   03   06
01  13   03   06
02  U02  U02  U02
```

Each cell places a phrase at that position; the tracks advance
independently, which is how SID-Wizard songs breathe. `0`–`F` set the
phrase, `SHIFT+arrows` count it, `n` repeats the row's entry below
(`INS`/`SHIFT+BKSP` too), `N` places the first unused phrase, `DEL`
drops the position. An entry can be something other than a phrase —
`Ctrl+P` lists the kinds with their keys:

| entry | key | does |
|---|---|---|
| PHRASE | `0`–`F` | a phrase plays here, then the list moves on |
| TRANSPOSE | `t` | semitones applied from the next pattern on; `t` again flips the sign |
| MAIN VOLUME | `v` | the tune's volume from here |
| TRACK TEMPO | `s` | this track's own tempo |
| SEPARATOR RULE | `+` | a section mark |

`ENTER` on a phrase entry opens it in the pattern editor;
`SHIFT+ENTER` opens the whole row — all three tracks as they sound
together. A `U##` entry is a jump to another subtune; `ENTER` on one
follows it.

## Subtunes

A module can hold several songs. The strip's own hint says it:
*a set of orderlists, one per track — `F5` plays the one shown here*.
`UP` from the matrix reaches the strip, `SHIFT+LEFT/RIGHT` pick the
subtune (the header's `SUBT 2/3` and the whole matrix follow),
`[+ SUBTUNE]` adds one.

## Tempo, funktempo, tempo programs

The `TEMPO` in the subtune strip is that subtune's default — shown as
a pair (`6/4`) when it is a funktempo, two speeds alternating row by
row. `RIGHT` past the last track enters the TEMPO pane: the module's
tempo programs, `◀ 01/3E ▶`, each a list of tempos played row after
row and looped (`« loops to row 00`), sharing a 119-byte budget. Type
`0`–`127` into a row; the pane's hint names the launch: the effects
`$12`/`$15` (main and track tempo program) start one from the grid.

## The instrument editor

On the instruments page, a SID-Wizard instrument (a W## in a module's
bank, an S## in a project's pool) opens into the SWI editor: the
parameters, then the tables. Every field explains itself on the `▸`
line, and `SPACE` jams the instrument while you shape it.

The parameters: `ADSR` (two bytes, nibbles side by side), `HARD-RST`
and `HR` (the hard-restart ADSR, its frame count and type), `VIB`
(amplitude, frequency, type), `OCTAVE` (the transpose), the default
`CHORD`, `ARP` speed, `MULTISPEED` rates for pulse and filter, `WF1`
(the first-frame waveform), and the `TABLE-RESET` switches.
`SIZE 46/120` counts the instrument's bytes against SID-Wizard's
budget.

Below, the three tables side by side — `WF ARP DET` (waveform,
arpeggio/note, detune per row), `PULSE` and `FILTER` — and the CHORD
pane. One cursor walks them as a grid; hex digits type, `ENTER` adds
a row, `INS`/`SHIFT+BKSP` insert, `BKSP`/`DEL` delete, `SHIFT+arrows`
nudge. These are SID-Wizard's own table programs, byte for byte —
what runs them and when is the instrument's business (`TABLE-RESET`,
the jumps `$09`–`$0B` in the effect list).

## Chords

The CHORD pane pages through the chord bank — `◀ 01/20 ▶`, thirty-two
chords shared by the whole module (in a duet, by the project). A chord
is a list of semitone offsets (`00 +0 st`, `03 +3 st`, …) ending in
RETURN (play the last note on) or LOOP (cycle); the pane's own line
names the players: *played by arp `$7F`, FX `$7x` / big-FX `07`* — an
instrument whose arpeggio table calls `$7F` runs whichever chord the
note picked.

## New modules, and getting them out

`[ NEW SWM... ]` on the PROJECT page starts a fresh tune and asks for
the size first:

```
.SWM  1 SID   3 tracks  ins cap 36
.SWS  2 SIDs  6 tracks  ins cap 29
.SWT  3 SIDs  9 tracks  ins cap 26
.SWQ  4 SIDs  12 tracks ins cap 22
```

An `[SWM]` session's SAVE writes the module itself
([sessions and formats](sessions-and-formats.md)). A duet's SID
columns can leave as a module too: `[ EXPORT SID -> .SWM ]` on the
PROJECT page writes them out as a real SID-Wizard tune — the number of
chips in the SID setup picks the extension — and `--export-swm` is the
same road headless ([cli](cli.md)).
