# The Impulse Tracker side

DUET's sample half is a complete Impulse Tracker: I## instruments over
P## samples, the order list, and the song knobs GLOBAL VOL, MIX VOL
and IT CHANNELS. Everything here lives in the song's `.it` file and
plays the same in other IT players. The channels' grid itself is the
[pattern editor](pattern-editor.md)'s; the words are the
[glossary](glossary.md)'s.

## Samples mode and instruments mode

An `.it` plays either raw samples or instruments; the SOUNDS switch on
the PROJECT page says which. In SAMPLES mode the grid's instrument
column names P## slots directly; in INSTRUMENTS mode it names I##
instruments — a map, envelopes and note actions wrapped around the
samples. The switch's own hint says the same, and a loaded song opens
in the mode it was written in.

## The I## instrument

On the instruments page, pick an I## and `RIGHT` (or `ENTER`) steps
into its editor. The top strip holds five faces — GENERAL · MAP · VOL
· PAN · PITCH; `UP` onto the strip, `LEFT/RIGHT` to pick, `DOWN` into
the face. Every field reads its meaning back on the `▸` line below.

**GENERAL** is the card: name, the note actions, levels and filter.

| field | what it is |
|---|---|
| NNA | what a still-playing note does when a new one starts on its channel: CUT, CONTINUE, NOTE-OFF or FADE |
| DUP · > | the DUPLICATE CHECK — which repeats count as duplicates — and the DCA, what happens to the one it catches |
| FADEOUT | how fast a faded note dies |
| INS-VOL | the instrument's own level, 0..128 |
| PAN / P-PAN | a fixed pan (`--` = the channel's), and pan spread by pitch around CENTRE |
| RANDOM vol/pan | per-note randomness |
| CUTOFF / RESONANCE | the IT filter's start values (`--` = untouched) |

**MAP** spreads the keys over samples: one row per key — the sample it
plays and the note it plays it at. `a` spreads the row under the
cursor to every key, transpose and all.

**VOL, PAN and PITCH** are the three envelopes. Each face is a switch
row and a node table:

- The switch row: the envelope on/off, the SUS band, the LOOP band,
  CARRY — and on the PITCH face FILTER, which turns the pitch envelope
  into a filter envelope. `e`, `c` and `f` toggle them from anywhere
  in the face; `s`/`S` and `l`/`L` put the sustain and loop bands on
  the node under the cursor.
- The node table: one row per node, TICK and VAL. `UP/DOWN` walk
  nodes, `LEFT/RIGHT` switch between tick and value,
  `SHIFT+arrows` drag the node in both directions, `ENTER` inserts a
  node at the midpoint to the next one, `BKSP` removes one.

## The P## sample

A P## slot's editor holds the sample's playing parameters — the fields
under the waveform strip:

| field | what it is |
|---|---|
| C5 | the rate the sample plays at on C-5; `SHIFT+UP/DOWN` nudge it a semitone, `SHIFT+LEFT/RIGHT` one hertz |
| VOL / SVOL | default note volume 0..64, and the sample's global level |
| PAN | a forced pan, or `--` for the channel's |
| LOOP / SUS | loop mode (FORWARD, PINGPONG or off) and range; SUS is a second loop used only while the note is held |
| VIB | auto-vibrato: shape, depth, speed, sweep |

The title row's buttons: `[LOAD]` replaces the slot from a file,
`[SAVE]` writes the sample out as a `.wav` beside the song at its own
C5 rate — at once, no dialog — `[CLEAR]`/`[CLR+NOTES]` empty the slot,
`[OSC]` puts the scope on it, and `[EDIT]` opens the surgery:

**EDIT SAMPLE** works on a copy — the sample itself changes only when
you press its `[ SAVE ]`. The ops are additive: `[ CROP TO LOOP ]`
keeps the loop and makes it the whole sample, `[ REVERSE ]`,
`[ NORMALIZE ]`, and fades in or out over a dialed length. An EDITS
line lists what you have stacked; `SPACE` jams the edited copy to
audition it before keeping it; `[ CLOSE ]` leaves the sample as it
was.

A sample lives in the `.it` — loading a `.wav` copies it in
([sessions and formats](sessions-and-formats.md)), and the project's
SAVE writes it with the song.

## The order list

`F11` opens the SONG page: the order list is what actually plays, top
to bottom — each position names a pattern. The table shows each
position's pattern, its length and its start time, with a per-channel
strip beside it showing what plays where; the footer counts the song
(`233 orders · 179 patterns · 1 unused · total 41:07`).

| key | does |
|---|---|
| `0`–`F` | type the position's pattern number (hex) |
| `SHIFT+arrows` | count it up and down, 1 or 10 at a time |
| `n` | insert this pattern again below (`INS` and `SHIFT+BKSP` too) |
| `N` | a NEW section: the first unused pattern, or a fresh one |
| `DEL` / `BKSP` | drop the position |
| `+` / `-` | the `+++` (skip) and `---` (end) marks |
| `ENTER` | open that pattern in the pattern editor |
| `F7` | play the song from this position |

`LEFT/RIGHT` cross to the CHANNELS table beside the list: each
channel's VOL and PAN (digits type, `L`/`M`/`R` are hard left, centre,
right, `S` surround, the STEREO slider draws it) and a MUTE cell —
`ENTER` silences the column and gives it back, the notes untouched. In
a session with SID chips the same table places the chips' voices
([the duet](the-duet.md)).

## The song's own knobs

The PROJECT page's SONG section holds what the `.it` header holds:

- **GLOBAL VOL** (0..128) — the song's starting global volume, the
  one `Vxx` moves while playing.
- **MIX VOL** (0..128) — the whole song's level: 48 is Impulse
  Tracker's default, 128 is unity. Both scale everything — channels,
  SID and synth columns alike.
- **SPEED / TEMPO** — ticks per row and BPM, as `Axx`/`Txx` set them
  from the grid.
- **IT CHANNELS** — how many channels the grid shows; `ALT+UP/DOWN`
  changes it from the pattern page too. Lowering it parks columns —
  they keep playing, the receipt says so (`CH14 parked, 1 still
  PLAY`), and raising it brings them back.
- **CH-HOP / P-HOP** — how far `Ctrl+LEFT/RIGHT` and `Ctrl+"+"/"-"`
  hop, in columns and patterns.

Every field answers digits and `SHIFT+arrows`, and describes itself on
the `▸` line while focused.
