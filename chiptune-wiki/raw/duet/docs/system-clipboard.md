# The system clipboard

DUET has two clipboards. `ALT+C` / `ALT+P` copy and paste blocks
inside one DUET, through a buffer of its own that nothing else can
see. `ALT+SHIFT+X` opens the **SYSTEM CLIPBOARD** list — the same block
verbs through the operating system's clipboard, as text — so a block
copied in one DUET pastes into another DUET, into OpenMPT or Schism
Tracker, into a text editor, and a program that writes the text can
hand DUET a melody. The two roads never touch: a COPY here leaves what
`ALT+C` copied exactly where it was.

**Writing a program that produces the text?** The scoped, self-contained
producer's guide is [the clipboard format](clipboard-format.md) — the
exact bytes for notes and portamento, with a COPY IT and a COPY SWM
example. This page is the DUET-side reference the rest of the way.

## The keys

| key | does |
|---|---|
| `ALT+SHIFT+X` | the SYSTEM CLIPBOARD list — the five verbs below, each with its key; `ENTER` runs, `ESC` leaves. (Bare `ALT+X` opens it too, where the system delivers that chord — some Macs swallow `Option+X` and `Option+V` before the terminal sees them) |
| `ALT+SHIFT+C` | COPY the block to the system clipboard |
| `ALT+SHIFT+Z` | CUT it there — copy, then empty the block |
| `ALT+SHIFT+V` | PASTE the system clipboard at the cursor |
| `ALT+SHIFT+M` | MIX PASTE — only into empty fields |
| `ALT+SHIFT+T` | TRANSLATE PASTE — onto another kind of column with the effects translated |

COPY and CUT take the marked block (`ALT+B`, `ALT+D`, `ALT+L` — see
[the pattern editor](pattern-editor.md)). With no block up,
`ALT+SHIFT+X` marks the whole side the cursor stands on first, and its title says
so: `SYSTEM CLIPBOARD - PATTERN 64 ROWS x 4 CH`. Leaving with `ESC`
takes that mark away again; running a paste from the list does too.
The receipts: `COPIED 4 ROWS x 1 CH TO THE SYSTEM CLIPBOARD`, `CUT 16
ROWS x 2 CH TO THE SYSTEM CLIPBOARD`, and the paste's own `PASTED 4
ROWS x 1 CH`.

The paste lands with its top-left at the cursor — the cursor's row and
the cursor's channel — on as many channels as the text has and as many
rows as the pattern has left: a 48-row clipboard pasted at row 32 of a
64-row pattern lands 32 rows and the receipt says `clipped at the
end`. Everything `ALT+P` knows applies unchanged: the paste is one
undoable edit; a block from a column of the same kind lands whole; a
block pasted onto a different kind of column carries the notes alone,
and TRANSLATE PASTE carries the effects respelled — the
[seam rules](pattern-editor.md#pasting-onto-another-kind-of-column)
are the same rules.

**The paste writes the fields the clipboard carries** — from the first
field that holds anything to the last. A text that carries only notes
places notes and leaves the channel's instruments, volumes and effects
standing; a text with notes and instrument numbers writes both and
leaves the rest; a text with an effect somewhere writes every field up
to the effect, empties included, the way `ALT+P` replaces what a block
covers. So a melody tool need not know what is already on the channel.

## The text

An IT block is spelled exactly as OpenMPT and Schism Tracker spell
theirs, so the clipboard moves between the three without conversion:

```
ModPlug Tracker  IT
|C-501v64A0F|...........
|...........|D#5..v40...
|===........|G-501......
```

- The first line is the header: anything whose last three characters
  are ` IT` (`ModPlug Tracker  IT`, two spaces, is what OpenMPT and
  DUET write; Schism writes `Pasted Pattern - IT`). `S3M` and `MPT`
  read the same; ` XM` and `MOD` read too, but their effect letters
  are another alphabet and are dropped with a count in the receipt.
- Then one line per row. Each channel is `|` followed by **eleven
  characters**, four fields wide:

| field | width | spelling |
|---|---|---|
| NOTE | 3 | `C-5`, `C#5` (sharps; `Db5` reads as `C#5`), `...` empty, `===` note off, `^^^` note cut, `~~~` fade. The octave is the digit, 0–9; **`C-5` is middle C** (MIDI 60) |
| INS | 2 | the instrument number in **decimal**, `01`–`99`; `..` none. (The grid shows it in hex — the text is OpenMPT's) |
| VOL | 3 | a letter and two decimal digits: `v64` volume, `p32` panning, `a`/`b` fine volume up/down, `c`/`d` volume slide up/down, `e`/`f` portamento down/up, `g` tone portamento, `h` vibrato; `...` none |
| FX | 3 | the IT effect letter `A`–`Z` and two **hex** digits: `A06`, `SD1`; `...` none. DUET's four send commands are spelled `a`–`d` in lowercase with their amount, as the grid shows them; `.40` is a value with no letter over it |

- Rows end in `\r\n`; a bare `\n` reads too. Spaces read like dots.
  Write all eleven characters of every cell — OpenMPT and Schism are
  strict about the widths; DUET forgives a short cell (`|C-5` alone
  is a note), a ragged row, and lowercase.

A program that wants to give DUET a four-row melody on channel 1 puts
this on the clipboard, and `ALT+SHIFT+V` places it:

```
ModPlug Tracker  IT
|E-5........
|...........
|G-5........
|A#5........
```

A block whose mark did not reach a field spells that field as spaces
(OpenMPT's own convention: a mark of the volume column alone copies
`|     v40   `), and OpenMPT and Schism honour it on paste; DUET's own
reader looks only at what the fields carry, so either spelling lands
the same.

## The SID side

A DUST, DUSK, SID or SID-Wizard block has no OpenMPT twin — its effect
byte is another language, and pasting it as an IT effect would be
wrong. Those blocks wear DUET's own header word over the same grammar:

```
DUET DUST            DUET SW
|C-502...D83         |C-5010A80
|A-6..v50...         |vb3..27..
```

`DUET DUST` and `DUET DUSK` carry the IT face byte for byte (the
instrument is the D##/K## slot). `DUET SID` (a hybrid's SID column)
and `DUET SW` (a SID-Wizard track) carry NOTE(3) INS(2) FX(2) PARAM(2)
— the three bytes in hex, the note in that column's own names, SW's
mnemonics included (`vb3`, `gt+`, `===`). A second DUET reads them
back whole and the seam rules apply; OpenMPT refuses the header, which
is right.

**`DUET SID` and `DUET SW` are interchangeable on paste.** They are
two documents — one holds an IT note byte, the other a SID-Wizard one
— but they speak the same effect language, so either lands whole on
either kind of SID column: the note crosses converted and the effect
verbatim. Only the **instrument** stays behind, because the same byte
selects the S## pool on one side and the module's own bank on the
other; `ALT+S` stamps the destination's. The receipt says so on copy: `COPIED 8 ROWS x 3 CH TO THE
SYSTEM CLIPBOARD - AS DUET TEXT, ANOTHER DUET READS IT`.

## Where the clipboard comes from

The terminal build asks the operating system's own tools on the
keypress: `pbpaste`/`pbcopy` on macOS; on Linux `wl-paste`/`wl-copy`,
then `xclip`, then `xsel`, whichever is installed (`no clipboard tool
- install wl-clipboard, xclip or xsel` says none is). The window build
(`duet-gui`) asks SDL, on Windows too. Nothing reaches the clipboard
except through these verbs — DUET does not read it on its own, and the
terminal's own paste key (`Cmd+V`) types into the grid as keystrokes,
which is not this.

What the clipboard holds that is not a pattern block refuses: `the
system clipboard holds no pattern block - ALT+SHIFT+X COPY puts one
there;
OpenMPT's copy works too`; an empty one says `the system clipboard is
empty`; a block of nothing but dots says `the system clipboard holds a
block with nothing in it`. A text that carried pieces DUET has no IT
spelling for (an XM block's effects, a volume word IT lacks) pastes
what it can and the receipt counts the rest: `PASTED 4 ROWS x 2 CH - 3
PIECES OF THE TEXT HAVE NO IT SPELLING`.

## Headless

`--clipboard-file <path>` makes the system clipboard a file: COPY
writes it, PASTE reads it, and the machine's own clipboard is never
touched — a test copies in one run and pastes in another
(`tools/ptydrive.py ... --clipboard-file clip.txt -- alt+b down down
alt+shift+x enter`). `--dump-screen --page clip` puts the list up over the
grid; the [CLI page](cli.md) has both.

## Limits

- DUET's send commands `a`–`d` are DUET's; OpenMPT drops them, and
  Schism reads a lowercase letter in that place as a volume command.
- Anything past the eleven characters of a cell (an MPTM block's extra
  columns) is ignored.
- The clipboard is text: samples, instruments and chord tables do not
  travel with a block. Copy those the way [instruments](instruments.md)
  describes.
