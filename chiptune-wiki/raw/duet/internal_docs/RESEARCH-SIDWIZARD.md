# SID-Wizard compatibility research (M6)

Research session 2026-08-01. Target: import SID-Wizard instruments (.swi) and
eventually whole songs (.swm), played back by our own pure-Zig reimplementation
of the SW player semantics driving reSID — no C64 emulation in the audio path.

Sources: `../SID-Wizard-1.97-sources-examples` (SW 1.97 by Hermit / Mihaly
Horvath). **License: WTF ("Do what the frick you want with this code, but
mentioning me if you use it would still be nice") — top-level README.txt.**
Unlike schismtracker (GPL, read-only), we may port logic and tables directly.
Credit Hermit prominently in README/about.

Key files (landmark map):

| What | Where |
|---|---|
| Format constants (authoritative) | `native/sources/SWM-spec.src` |
| C enums for every table/FX value | `native/sources/SWMconvert.c` lines 50–330 |
| SWM loader (byte-exact, reads backwards) | `SWMconvert.c` `ProcessSWMver1()` ~line 895 |
| The player (159 KB 64tass) | `native/sources/include/player.asm` |
| Reduced players (light/medium/bare) | `native/sources/include/altplayers.inc` |
| Table semantics in prose | `native/manuals/SID-Wizard-1.9-UserManual.txt` lines 416–560 |
| GT-conversion notes (semantics hints) | `native/sources/SWMconvert-GoatTracker.txt` |
| 324 example instruments | `resources/examples/instruments/*.swi` |
| ~40 example songs (+2SID .sws, 4SID .swq) | `resources/examples/*.swm`, `native/examples/swm-more/` |
| .sid exports of examples (oracle refs) | `resources/examples/new-sid-exports/`, `native/examples/sid-exports/` |
| Hermit's C64+SID emulation, plain C, WTF license | `libcRSID/` (vendorable as oracle renderer) |

## SWI file format (VALIDATED: 324/324 example files parse byte-exact)

```
offset 0..1   $A1 $04            C64 PRG load address (instrument edit buffer)
offset 2..    instrument, identical to in-SWM layout:

  +$00  control byte:  bit0-1 HRtimer (0..2 frames of hard restart before note)
                       bit2   staccato HR type (waveform $18 test+mute in HR phase)
                       bit3   1st-frame-waveform enable
                       bit4-5 vibrato type: 0 increasing, 1 normal(delayed),
                              2 down-oriented, 3 up-oriented
                       bit6   PW-table reset DISABLE (keeps running across notes)
                       bit7   filter-table reset DISABLE
  +$01  HR attack/decay        (hard-restart ADSR, default $0F)
  +$02  HR sustain/release     (default $F0)
  +$03  attack/decay   on note start
  +$04  sustain/release on note start
  +$05  vibrato: rate (low nibble) / amplitude (high nibble)
  +$06  vibrato delay OR amplitude-increment speed (type-dependent)
  +$07  WF-arp table exec speed 0..$3F (0 = 1x = every frame);
        bit6 ($40): PW table runs at multispeed rate
        bit7 ($80): filter table too
  +$08  default chord number
  +$09  octave shift, 2's complement semitones (editor steps by 12)
  +$0A  PW-table pointer      (relative to instrument base)
  +$0B  filter-table pointer  (relative to instrument base)
  +$0C  gate-off (release) pointer into WF table   (rel. to WF table base)
  +$0D  gate-off pointer into PW table             (rel. to PW table base)
  +$0E  gate-off pointer into filter table         (rel. to filter table base)
  +$0F  1st-frame waveform (default $09 = gate|test → oscillator reset trick)
  +$10  WF-arp table: 3-byte rows [wf, arp, detune], terminated by $FF row-start
  +pw   PW table:     3-byte rows [cmd, param, kbtrack], terminated $FF
  +flt  filter table: 3-byte rows [cmd, param, col3]; terminator $FF REPLACED
        by size byte = (instrument size without name) = offset of this byte
last 8 bytes: instrument name (ASCII-ish screen codes, space padded)
```

Max instrument size $80. Empirical stats over the 324 examples: arp speed
mostly 0; 12 instruments use filter-multispeed ($80 bit); octave shifts all
multiples of 12; frame1 waveform $09 in 260 files (then $00/$11/$19/$29/$89…).

## Table semantics (manual §III.1 + SWMconvert.c enums)

WF-arp-detune table row `[wf, arp, detune]`, advanced once per instrument-tick
(gated by arp speed; in multispeed tunes it ticks at frame-speed rate):

- wf `$00..$0F` repeat/wait: hold row for N extra ticks; `$10..$FD` waveform/
  control value (written to SID ctrl reg, gate masked by pattern gate);
  `$FE xx` jump to table pos xx (xx ≥ $40 → self-jump = hold forever);
  `$FF` end (state holds, table stops).
- arp: `$00..$5F` semitones up from pattern note; `$7F` run chord (CURCHORD);
  `$80` NOP keep previous pitch; `$81..$DF` absolute note C-0..A#7;
  `$E0..$FF` negative shift. Arp activity cancels slide/vibrato.
- detune: `$00..$FE` detune upward, `$FF` NOP (keep previous).

PW table row `[cmd, param, kbtrack]`:
- `$8X xx` set 12-bit pulse width $Xxx (one tick); `$01..$7F xx` sweep: add
  signed xx to PW each tick for cmd ticks; `$FE xx` jump; `$FF` end/hold.
- col3: keyboard-tracking curve, $00 off (details in player notes).

Filter table row `[cmd, param, col3]`:
- `$8r..$Fr xx` set: high nibble = $8 | band (1=LP → $9, 2=BP → $A, 4=HP → $C),
  low nibble r = resonance, param xx = cutoff (high byte).
- `$01..$7F xx` sweep cutoff by signed xx per tick, cmd ticks (11-bit cutoff in
  normal/extra players — "fine filter sweep").
- `$FE xx` jump; `$FF` end/hold.
- col3: keyboard track ($00..$7F up, $90..$FF down) or `$8x` = filter-switch
  override (x = channel mask). First row `$00 00 00` = "passive": channel gets
  filter switched on but instrument does not control cutoff/reso/band.
- Filter is a shared resource: ONE track controls it at a time; leftmost
  channel priority (player processes ch 3→2→1, later write wins).

Chord table: `$00..$7D` relative semitones up, `$80..$FF` down (2's compl),
`$7E` return to WF-arp table, `$7F` loop chord infinitely.
Tempo program table: `$00..$7F` = per-row tempi, entry with bit7 = last.

## SWM module format (from ProcessSWMver1() in SWMconvert.c — byte-exact)

```
0..1    C64 load address (2 bytes, e.g. $204C — skip)
2..65   64-byte header ("module offset" below is after the load address):
  +0..3   "SWM1"           (multi-SID: see the four layouts below)
  +4      frame speed 1..8 (multispeed factor; calls per PAL frame)
  +5      pattern highlight step (UI info)
  +6,+7   obsolete
  +8..A   mute/solo per channel ($FF = on)
  +B      default pattern length
  +C      sequence count (= subtunes × 3)
  +D      pattern count   +E instrument count
  +F      chord-table packed length   +$10 tempo-table packed length
  +$11,12 obsolete   +$13 driver type (info only)   +$14 tuning type
          (0: 440 Hz, 1: 432 Hz Verdi, 2: just intonation in C)
  +$18..  40-char author/title info
64-byte header, then payload IN THIS ORDER:
  sequences   each: data bytes, then 1 size byte
  patterns    each: (size-1) data bytes, then size byte, then row-count byte
              (in-memory pattern = data + $FF terminator at [size-1])
  instruments each: exactly the SWI layout above (incl. size byte + 8-char name)
  chord table (packed length from header; chords separated by $7E/$7F)
  tempo table (packed length; programs end with bit7-set byte)
  subtune funktempos: 2 bytes per subtune [left, right]:
              left bit7 set → single tempo (left & $7F)
              else → funktempo alternating left/right per row
File is parsed BACKWARDS from EOF (sizes trail their data) — see loader.
```

### The four formats: 1–4 SIDs (VALIDATED: 143/143 SW 1.97 module files)

`.swm/.sws/.swt/.swq` are ONE container. The chip count is the magic's
fourth byte — `settings.cfg:29-40` sets `SWMversion` to `"1"`/`"S"`/`"T"`/
`"Q"` for Stereo/Trio/Quad — and it decides the track count
(`CHN_AMOUNT = 3 * SID_AMOUNT`, `settings.cfg:51`) AND the header layout.

**One field drives every layout difference: the mute/solo block is ONE
BYTE PER CHANNEL.** It grows 3 → 6 → 9 → 12 and shoves the rest of the
header around it. At 6 channels it still fits in the low bytes, so 2SID
lays it over 1SID's highlight + the two obsolete bytes (5..$A) and
re-homes highlight to $15 — into the gap `SWM-spec.src:50` reserved in so
many words: *"some bytes left for later expansions (e.g.: 2SID version
mute/solo bytes)"*. At 9 and 12 it does not fit, so 3SID/4SID re-pack the
whole header and grow it past 64 bytes.

| offset | SWM1 `.swm` | SWMS `.sws` | SWMT `.swt` | SWMQ `.swq` |
|---|---|---|---|---|
| chips / tracks | 1 / 3 | 2 / 6 | 3 / 9 | 4 / 12 |
| header size | 64 | 64 | **65** | **69** |
| frame speed | 4 | 4 | 4 | 4 |
| default ptn len | $B | $B | **5** | **5** |
| mute/solo block | 8..A | **5..A** | **$10..$18** | **$11..$1C** |
| seq / pat / ins | $C/$D/$E | $C/$D/$E | **6/7/8** | **6/7/8** |
| chord / tempo len | $F/$10 | $F/$10 | **9/$A** | **9/$A** |
| driver / tuning | $13/$14 | $13/$14 | **$B/$C** | **$B/$C** |
| highlight | 5 | **$15** | **$D** | **$D** |
| SID2..4 addr id | — | $16 | $E,$F | $E,$F,$10 |
| author (40 ch) | $18 | $18 | **$19** | **$1D** |

`AUTHORPOS == tuneheadersize - 40` in all four — the author field is the
header's tail, which is the cheapest structural check on a layout guess.

Subtunes: `SubtuneAmount = (SequenceAmount-1)/CHN_AMOUNT + 1`
(SWMconvert.c's `ProcessSWMver1(stereo)` divides by `3*(stereo+1)`).
Orderlists are stored **subtune-major, track-minor** — `GenerateSWS`
writes `for subtune { for track 0..5 { bytes, size } }` — so track *t* of
subtune *s* is sequence `s*CHN_AMOUNT + t`, exactly as in 1SID.

The SID2/3/4 address-ID bytes are an index into SID-Wizard's own list of
C64 addresses ($D420/$D440/$D460 by default, `menu.inc:1025-1035`) — a
hardware setting with no meaning off a real C64. Carry them verbatim.

The caps SHRINK with chip count (the `.if (SID_AMOUNT==n)` blocks): the
C64 runs out of memory, not out of numbering.

| | 1SID | 2SID | 3SID | 4SID |
|---|---|---|---|---|
| `maxinstamount` | 37 | 30 | 27 | 23 |
| selectable instruments | 36 | 29 | 26 | 22 |
| `maxsubtuneamount` | 8 | 2 | 1 | 1 |
| `maxptnamount` | 100 | 105 | 105 | 102 |

### Multi-SID player runtime

Almost everything is PER CHIP, which is why an array of the 1SID
`SwChip` is the whole port:

- its own filter program and filter-controller track (`flprog1..4`,
  `FLTCTRL2_var`…), and its own `$D415..$D418` block
  (COMMONREGS 1143–1215);
- its own MAIN VOLUME: SEQ_FX's volume case picks `SEQVOL2/3/4` by the
  track's chip (`cpx #3*7` / `#2*3*7` / `#3*3*7`, player.asm 3021–3038).

Genuinely global: the orderlist/pattern/tempo machinery, and

- **the dispatch ORDER is VOICE-MAJOR, chip-minor** — for 2SID: ch3,
  ch6, ch2, ch5, ch1, ch4 (DOTRACK 964–1004, MULPLY 1248–1290). Voice
  3 of every chip first, because "leftmost wins" filter takeover is a
  race among ONE chip's own three voices, resolved per chip.
- **the tempo table grows with the track count**:
  `RESTEMP = TEMPOTBL + (2 + 2*CHN_AMOUNT)` (`settings.cfg:503`), so
  the tempo-program base is 8 / 14 / 20 / 26 and `TRKTMPOS` runs
  2,4,6,… one pair per track (player.asm 502, 2687).

Pattern row encoding (forward read; constants in SWMconvert.c 113–163):

```
note byte:  $00 NOP/empty row · $01..$5F note (C-0..) · $60..$6F vibrato FX,
            amplitude 0..F · $70..$77 packed NOPs (this row + N more empty,
            $70 = 2 total incl. the preceding $00 row) · $78 portamento noteFX
            · $79/$7A sync on/off · $7B/$7C ring on/off · $7D gate-on ·
            $7E gate-off · bit7 set → instrument byte follows
ins byte:   $01..$3E instrument · $3F legato · $40..$7F small-FX
            ($4x waveform, $5x sustain=note volume, $6x release, $7x chord)
            · bit7 set → FX byte follows
fx byte:    $20..$FF small-FX ($2x attack, $3x decay, $4..7x as ins column,
            $8x vib amplitude, $9x vib rate, $Ax main volume, $Bx filter band,
            $Cx chord speed, $Dx detune, $Ex ctrl nibble test/ring/sync,
            $Fx resonance) · $01..$1F big-FX, ONE param byte follows:
            $01/$02 slide up/down · $03 tone portamento · $04 wavectrl reg
            ($FF=legato) · $05 AD · $06 SR · $07 chord · $08 vib amp+rate ·
            $09/$0A/$0B WF/PW/filter table jump · $0C chord speed · $0D detune
            · $0E set PW · $0F set cutoff-hi · $10 main tempo · $11 main
            funktempo · $12 main tempo-program · $13/$14/$15 track variants ·
            $16 vibrato type · $1C cutoff shift (permanent) · $1D track delay
            frames · $1E note delay (max tempo-3) frames · $1F set $D417
pattern end: $FF
```

Orderlist (sequence) values: `$01..$7F` pattern no · `$80..$8F` transpose down
· `$90..$9F` transpose up ($90 = original) · `$A0..$AF` main volume ·
`$B0..$EF` track tempo · `$F0..$FD` visual separator NOP · `$FE` end (track
halts) · `$FF xx` jump to orderlist pos xx (xx ≥ $80 → subtune jump).

### `$00` is NOT a value a song carries (s73)

The manual's table starts at `$01`, and the editor enforces it in four places
— worth writing down because DUET had been treating `$00` as "pattern 0" and
drawing it as a number:

| where | the line | what it means |
|---|---|---|
| `displayer2.inc` (seqaddr) | *"if zero, display dots — zero has special meaning now, not used as pattern"* | `$00` draws as **dots**, not a number |
| `datawriter.inc` | *"don't let pattern number to be $00 (it's special value)"* + *"write 1 if user wants to write 0"* | typing `0` writes **01**; no digit road makes a `$00` |
| `datawriter.inc` | *"don't let pattern $00 to be overwritten (it's special)"* | you cannot type ON one |
| `commonsubs.seqInst` | `lda #$01 ;value to write into empty place` | INSERT always writes **01** |
| `commonsubs.sseqend` | *"set position to end of orderlist, if there is $00 under cursor (when moving cursor to shorter sequence)"* | the cursor SNAPS off a `$00` back to that track's `$FE`/`$FF` |

So `$00` is the **zero-fill after a track's end** and nothing else — m64, having
started the real editor: *"i have NO WAY to enter a 00. 00 can not be in the
song, i guess it is what is after end."* The last row rule follows from the
same place: **you cannot park the cursor below a track's terminator.**

### `ENTER (+Sh.) Go to pattern(s) in pos` (s74)

The manual's key list spells the plural, and that IS the feature: plain ENTER
opens the phrase under the cursor, SHIFT+ENTER opens what the whole ROW plays
— one phrase per track, which is the combination the tune sounds at that
position.

### A terminator only ever sits at the END (s73)

There are **no END/JUMP keys** in SID-Wizard's orderlist — its key list
(manual, section 2) has none, and the only road to `$FE`/`$FF` is typing hex.
`datawriter.inc` then allows that in exactly one place: the `chkfeff` branch
is reached only when *the byte already under the cursor is `>= $FE`*, and it
refuses any result below `$FE`. Every other row takes the `cmp #$fe / bcs
notwri1` road, commented *"but don't allow typing $fe/$ff anywhere"*.

So a JUMP, a subtune jump or an END can only exist where one already is —
m64: *"you can not place a JMP arbitrary in the orderlist. Only on the END
marker. Same with U. A JMP/Uxx/END can only be at the end. Else it is
refused."* To move a track's end, DELETE rows above it and the end comes up.

Two more rules from the manual's own section III.3: *"Orderlist must not begin
with $FE/$FF!"*, and *"effects shouldn't precede $FE/$FF"* — the player has a
safety check for the second (`SEQFXL2`: a `$FF` directly after a seq-FX does
NOT loop, to prevent a freeze), so a transpose sitting right above a JUMP
silently stops the loop firing.

**The editor's glyphs** are two characters wide: `$F0..$FD` draw `--` through
`-D` (the separator's *section ID* is the second character), `$FE` draws `-E`
and `$FF` `-F`. DUET keeps its own wider vocabulary for the last two (`END`,
`J3C`, `U02` — readable beats terse on a 120-column screen) but draws the
separator and the empty slot SW's way, because those two carry information
four dashes and a number threw away.

Limits: ≤ 100 patterns, ≤ 37 instruments, ≤ 8 subtunes, sequence ≤ 126 bytes,
pattern ≤ 249 bytes / 248 rows, instrument ≤ 128 bytes.

### There is no "create subtune" — every one of them always exists (s76)

SID-Wizard's subtune keys are `Ctrl+,`/`Ctrl+.` and `Shift+F5`/`F6`, and the
manual calls them **Select** — nothing more. The source says why: the whole
verb is a bounds check on a counter.

```
incSubt lda selsubt+1   ;increment subtune
        cmp #maxsubtuneamount ;maximum number of subtunes
        beq retpntQ
        inc selsubt+1
        jmp playadapter.resetune          ;keyhandler.inc:1297
```

**The orderlist memory is pre-partitioned into `(maxsubtuneamount+1) ×
CHN_AMOUNT` fixed `seqbound`-byte slots** (`settings.cfg:496`:
`PATTERNS = SEQUENCES + (maxsubtuneamount+1)*(CHN_AMOUNT)*seqbound`), and the
depacker fills every slot past the file's own count:

```
unused  lda #seqbound-1
        ldy #0
        jsr clrupdp     ;clear unused sequence area
        lda #$fe        ;hardwired delimiter to 1st position of unused sequence
        sta (decozptr),y                  ;packdepack.inc:880
```

So **an unused subtune is three orderlists that are nothing but their END**,
and "creating" one is walking the selector to it and typing. The saver runs
the mirror rule — `packtun` only advances `TUNEHEADER+SEQAMOPOS` for a
sequence whose `$FE` is NOT at position 0 (*"if empty sequence, the counter
stays 0"*, `packdepack.inc:59`) — so **trailing empty subtunes are not
written**, and `SubtuneAmount` on disk is "up to the last non-empty
orderlist".

A tune the editor OPENS is different from an unused slot: `CINITUN` zeroes
the counts, runs the unused-fill, and then *"create a default subtune with
pattern 1..3"* — sequence *n* gets `[n, $FE]` (`menu.inc:375-388`). That is
the shape `createTemplate` opens on, and the one DUET's `[+ SUBTUNE]` gives
a new subtune (with FREE phrase numbers, since 01-03 belong to subtune 1).

**The cap is per FORMAT, and it is small.** `maxsubtuneamount` is written
"counted from 0", so the readable numbers are:

| | 1SID `.swm` | 2SID `.sws` | 3SID `.swt` | 4SID `.swq` |
|---|---|---|---|---|
| subtunes | **8** | **2** | **1** | **1** |
| source | `SWM-spec.src:5` | `settings.cfg:100` | `:128` | `:157` |

The C64 runs out of memory, not out of numbering — and a `.swt` carrying two
subtunes is a file SID-Wizard itself could not open, so DUET refuses to make
one.

Each subtune also owns a **funktempo pair** at the file's tail; the pair an
untouched one carries is `defsubtempo1 = $86` / `defsubtempo2 = $83`
(`settings.cfg:305-306`) — bit 7 on the left byte means SINGLE tempo, so that
reads "tempo 6" with 3 parked for the day `Ctrl+T` toggles funktempo on.

### The subtune jump is PER TRACK, and the display never follows it (s78)

Three separate facts, and together they explain why SID-Wizard has no problem
that DUET had to solve.

**1. `$FF $8x` moves ONE channel's orderlist pointer.** The routine is named
for it:

```
SETSEQA ;SET SEQUENCE ON ONE TRACK (USED BY SUBTUNE-JUMP FX);
        ;INPUT: SUBTUNE IN ACCU, CHANNEL IN X (0/7/14) - X PRESERVED
                                                    ;player.asm:2671
```

It rewrites `Channel<n>SeqPtr` for the one channel in X and nothing else. So
**the three tracks can be in three different subtunes at the same time** — the
format allows a state no single orderlist can display. (Only `SETSTUNE`, the
INIT path, walks every channel; the jump FX does not.)

**2. Nothing in the editor follows it.** Every read of "which orderlist am I
showing" goes through one place, and it reads the SELECTED subtune:

```
getsubaddr .proc        ;get subtune orderlist-pointer to A and Y
        lda selsubt+1                              ;commonsubs.inc:509
```

`selsubt` is written by exactly two things — `incSubt`/`decSubt`
(`Ctrl+,`/`.`, `Shift+F5`/`F6`) and the new-tune init. **The playing subtune
is never consulted for the display.** So during a jump SID-Wizard simply keeps
drawing the subtune you picked, and the question "what if the tracks split"
never arises on screen.

**3. Playback starts on the selected subtune — and selecting STOPS it.**

```
        lda selsubt+1
        jsr player.inisub                        ;playadapter.inc:287
...
        lda selsubt+1
        jsr player.iSETSTU ;SET SUBTUNE (PLAYER-ROUTINE)
        ...
        sta playmod     ;stop playback after switching subtune
                                                 ;playadapter.inc:356
```

So m64's *"the source of truth for starting playback is the current subtune in
the orderlist"* was SID-Wizard's own rule all along. The half DUET does NOT
copy is the last line: SW stops the transport when you select, DUET keeps
playing and lets the next F5 pick it up.

**How many tunes are affected, measured rather than guessed** (s78, over the
102 distinct modules in this tree):

| | count |
|---|---|
| modules with more than one subtune | **10** |
| … that chain them with `U##` jumps | 9 (`dojo.swm` has 4 subtunes and no jump — separate songs) |
| … where the tracks do NOT jump together | **0** |

Every jump in every shipped tune moves all three tracks to the same subtune in
the same row. The split is real in the format and absent from the corpus —
which is why DUET follows the jump when the tracks agree and says
**SUBTUNES SPLIT** when they do not, rather than picking one and drawing the
other two from the wrong list.

## Player runtime model (player.asm; line refs are into that file)

The player runs once per **PAL video frame (50 Hz)** plus, in multispeed tunes,
frame-speed−1 extra "MULPLY" calls **evenly spaced across the 312 rasterlines**
(exporter.asm 1360: "equal sharing among the $138 rasterrows").

Per frame: channels processed in order 3→2→1 (leftmost last = wins filter
arbitration), each via DOTRACK (1333); then COMMONREGS (1007) writes ghost
registers to the SID in a deliberate order — SR, AD, freq, PW, then waveform
"keeping distance" between ADSR and waveform writes for reliable note starts;
then $D417 = filter-switch nibble | resonance<<4, $D418 = volume | band<<4,
$D416 = cutoff-hi + kbtrack via EXPTABH + FX shift, $D415 = cutoff-lo (11-bit
cutoff, low bits not kb-tracked) (1085–1141).

Row/tick timeline (SPDCNT counts ticks 0..tempo−1 per row, 1344–1384):

```
tick 0   fetch pattern row → CURNOT/CURIFX/CURFX2/CURVAL (1388–1477);
         if fetched note is real (not FX/legato/portamento) and instrument
         HRtimer == 2 → HARD RESTART now (1517–1592): ghost ADSR ← HR-ADSR,
         gate masked off (PTNGATE=$FE); staccato type (ctrl bit2) also writes
         waveform $18 (test|triangle mute) and freezes tables this frame.
tick 1   advance pattern position / orderlist: pattern-end check, seq FX
         (transpose/volume/tempo — applied DELAYED via TRANSP2/SEQVOLU
         shadows), $FE halt, $FF loop/jump (1626–1728);
         then HR phase for HRtimer == 1 instruments.
tick 2   NOTE START (TICK_2, 1736): instrument select (sets table-reset-forced
         mask), note-FX dispatch, or STRTSND (1820): DPITCH = note + octave
         shift + transpose; ctrl → vibrato type (SLIDEVIB = ctrl & $30);
         frame-1 waveform: freq HI byte only ← FREQTBH[DPITCH], WFGHOST ←
         header[$F] (if ctrl bit3, else untouched); WF table pos ← $10;
         PTNGATE = $FF; ARPSCNT = $FF (marks "note frame 1" — multispeed
         calls skip this channel this frame, MULCNTP 1298-1300); arp speed,
         vibrato init, default chord, PW/filter table pos reset (unless ctrl
         bits 6/7 suppress AND no explicit instrument selection this row —
         TABLRST 1826).
         Legato ($3F) / portamento ($03) skip the restart: pitch approached
         with max-speed slide instead (1810–1816).
other    CNTPLAY (2058): vibrato/slides, then table runners chained
ticks    FILTPRG → SETPWID → WFARPTB, ghost waveform = table wf & PTNGATE.
```

So a note's audible start is uniformly 2 frames after its row's tick 0 — the
lookahead that makes 2-frame hard restart possible. Tempo < 3 skips HR phases
(FASTSPEEDBIND, 1496–1515).

Multispeed calls (MULPLY 1240): per channel — skip on note frame 1; always run
WFARPTB; if instrument arpspeed bit6 also SETPWID; if bit7 also FILTPRG
(1293–1327); then COMMONREGS. I.e. WF table always runs at multispeed rate;
PW/filter opt in per instrument; row fetch/HR/note start only in the main call.

Frequency tables: FREQTBH/FREQTBL in player.asm; PAL, C-0-based, DPITCH
0..$5F; copies (incl. the exp-table prefix used for calculated slides and
filter kb-tracking) live in SWMconvert.c (SWexpTabH/SWexpTabL, line 200) —
tuning-type variants exist for 432 Hz / just intonation.

(Fine-grained runtime semantics — WF/PW/filter runner algorithms, vibrato
types, slides/FX, gate-off release path — captured in the sections below.)

## Player runtime detail

Feature-flag baseline: NORMAL player (settings.cfg 222–259). ON:
ARPSPEED, GATEOFFPTR, FILTRESETSW, FILTKBTRACK, PWRESETSW, PWKEYBTRACK,
HARDRESTYPES, FRAME1SWITCH, MULTISPEED, FINEFILTSWEEP, FILT_CTRL_FX,
FILTSHIFT. OFF: FILTERALWAYS/PULSEALWAYS/VIBSLIDEALWAYS (EXTRA player
turns these ON → no table pause on HR frames), ALLGHOSTREGS,
FASTSPEEDBIND, DELAYSUPPORT. We implement NORMAL semantics.

### Pulse program (SETPWID, player.asm 2332–2394) — per instrument-tick

Row `[cmd, param, kbtrack]`, position PWTPOS is **instrument-base
relative** (as are ALL jump targets and gate-off pointers — the
"relative to table" comments in SWM-spec.src lines 89–91 are wrong;
player is ground truth).

- `cmd $80..$FD` set: `PWHIGHO = cmd & $7F` (**7 bits**, not a nibble),
  `PWLOGHO = param`. Advances row same tick; next row executes next
  tick (set costs exactly 1 tick). Col3 → PKBDTRK on row completion.
- `cmd $00..$7F` sweep: PWEEPCNT counts UP from 0; each tick with
  counter≠cmd: counter++, 16-bit signed add of param into
  PWHIGHO:PWLOGHO. counter==cmd → advance row, NO add that tick
  (row = N adds over N+1 ticks). `$00` = 1-tick NOP (still loads col3).
  PWEEPCNT is reset on row advance — **NOT at note start** (quirk:
  reproduce; residue can shorten a first-row sweep).
- `$FE target`: jump. target==current pos → hold forever. Landing on a
  set row executes it the same tick; landing on a sweep row starts next
  tick.
- `$FF`: end — hold state, output continues every tick.
- Output stage every tick (gate-independent): pulse hi written to SID =
  PWHIGHO adjusted by kb-track: if PKBDTRK≠0, idx = PKBDTRK+DPITCH
  (8-bit, carry C1), delta = EXPTABH[idx]−EXPTABH[idx−1] with 6502
  borrow semantics (flat region → −1 artifact, wrap → +1); hi =
  PWHIGHO+delta(+C). Low byte = PWLOGHO raw. Ghosts themselves never
  modified by kb-track. **PTNGATE does not affect the pulse program**;
  it keeps running through release.

### Filter program (flprog1, 2175–2303) — one per SID, controller-gated

Only the track x == FLTCTRL executes the table. FLTPOSI/CWEPCNT/
CKBDTRK/ghost cutoff are per-SID state; FLTPOSI is interpreted against
the CONTROLLER track's current instrument (stale-offset quirk if that
changes without reset).

- `cmd $80..$FD` set: FLTBAND = cmd & $70 (→ $D418 hi-nibble band bits:
  $9r=LP $Ar=BP $Br=LP+BP $Cr=HP $Dr=notch $Er=BP+HP $Fr=all $8r=none),
  RESONIB = cmd<<4 (→ $D417 hi-nibble), CTFHGHO = param, CTFLGHO = 0.
  Same one-tick cost + col3-on-completion as pulse.
- `cmd $01..$7F` sweep: same N-adds/N+1-ticks counter model; 11-bit
  cutoff math: cutoff11 = (CTFHGHO<<3)|CTFLGHO(0..7); cutoff11 +=
  (i8)param — implemented with exact low-3-bits + asr-3 hi math.
- `$FE`/`$FF`: as pulse (instrument-base-relative, self-jump = hold).
- Col3 on row completion: $00-$7F / $90-$FF → CKBDTRK (up / down via
  8-bit wraparound); **$80-$8F → FSWITCH = c3 & $0F (replaces the WHOLE
  $D417 routing nibble incl. ext bit), CKBDTRK = 0**.
- Note-start arbitration (STRTSND 1931–2009, skipped entirely if ctrl
  bit7 set AND no instrument selected this row): read FIRST byte of the
  instrument's filter table: `$00` → passive: FSWITCH |= own-channel
  bit only (bit0=v1, bit1=v2, bit2=v3), controller unchanged. `$FF` →
  unfiltered: FSWITCH &= ~own-bit; if this track WAS controller, park
  FLTPOSI on the $FF row. Else → take over: FLTCTRL = x, FLTPOSI =
  inst[$0B], FSWITCH |= own bit. First row executes NEXT tick. CWEPCNT
  NOT reset by take-over (quirk). Init FLTCTRL = sentinel $0F (nobody).
- Gate-off: only the controller redirects FLTPOSI = inst[$0E] (if ≠0).

### Note start details (STRTSND 1820–2054)

TABLRST rule: reset_of_PW/filter_table happens iff (ctrl bit6/7 == 0)
OR an instrument number appeared in this row's instrument column
(selection masks ctrl with $3F before the checks). SLIDEVIB = ctrl&$30
(vibrato type). Frame-1: if ctrl bit3 — SID freq HI = FREQTBH[DPITCH]
(low byte untouched!), WFGHOST = inst[$0F]; else waveform untouched.
WFTPOS = 16 always. PTNGATE=$FF, ARPSCNT=$FF (multispeed skip marker,
replaced by ARPSPED&$3F on first WFARPTB run). AD/SR ghosts = inst[3]/
inst[4] at end of tick 2. NO table row executes on the note-start tick;
tables begin next tick. HR mapping: ctrl bit1 → HR fires tick 0, bit0
→ tick 1 (both → both); HR = PTNGATE=$FE + gate cleared in WFGHOST +
ghost ADSR ← inst[1]/inst[2]; ctrl bit2 (staccato) additionally writes
waveform $18 and skips the whole chain that tick.

Table pause schedule (NORMAL): on HR ticks with a pending real note,
vibrato+filter+pulse are SKIPPED (WF table still runs — HRENDER →
`jmp WFARPTB`, 1614–1621) even for instruments with HRtimer=0; on the
note-start tick and on legato/portamento tick-2, no tables run at all;
gate-off / note-FX tick-2 runs the full chain same tick. EXTRA player
never pauses (VIBSLIDEALWAYS etc.).

### Per-tick chain and write-out

CNTPLAY (≥tick 3 / no-new-note ticks): vibrato/slides → flprog →
SETPWID → WFARPTB → WRPITCH (freq ghost + detune → SID) → WRWFGHO
(waveform & PTNGATE → SID) → rts (2058–2609). Multispeed subframe
(MULPLY 1240–1327): per channel, skip if ARPSCNT==$FF (note frame 1);
entry by instrument arpspeed byte: bit7 → flprog… (full chain), bit6 →
SETPWID…, else WFARPTB…; then COMMONREGS. So sweep/arp counters tick
per CALL (frame×fspeed), not per video frame.

### EXPTABH (2957–2982)

EXPTABH = 11 zero bytes, then FREQTBH (96-entry PAL freq-hi table)
continues it, then clamp tail $F9..$FF,$FF. FREQTBH = EXPTABH+11.
Equal temperament ⇒ indexing at note+k multiplies by 2^(k/12) — used
as quasi-multiply for filter kb-track (absolute value + index-carry
into the cutoff sum) and PW kb-track (first difference). Down-tracking
($90..$FF) works via 8-bit index wrap (+1 carry into the sum);
out-of-range indices read adjacent data deterministically (emulate
table+neighbors byte-exactly, incl. EXPTABH[-1] access when idx==0).

### WF-arp-detune runner (WFARPTB 2396–2537 + WRPITCH/WRWFGHO 2539–2609)

Stepping: every player call that reaches WFARPTB decrements ARPSCNT;
only on underflow (<0) does a **table step** happen, and ARPSCNT
reloads with ARPSPED&$3F. So a row is held (speed+1) player CALLS
(speed 0 = step every call; in N× tunes the unit is calls, not video
frames). Small-FX $Cx sets speed AND forces ARPSCNT=$FF (instant step
next call). Big-FX $09 jump: WFTPOS = $10 + 3×value.

- WF col `$00-$0F`: one-shot per-row speed override — ARPSCNT = value
  after the step (row's arp/detune held value+1 calls). Waveform NOT
  written for such a row.
- WF col `$10-$FD`: WFGHOST = value & PTNGATE, written **on the step
  entering the row only** (but WRWFGHO copies WFGHOST → SID.WAVE every
  call). On a chord row the WF col IS re-read/re-masked every step.
- `$FE target` (target = WFTPOS-coordinate, instrument-base-relative):
  if target ≥ $80 → permanent halt parked on the $FE row (state
  persists). Else WFTPOS = target and the target row executes fully
  in the SAME step. **No self-jump guard** (unlike PW/filter) — the
  editor prevents degenerate data; converter treats operand ≥ $40 as
  "self-jump = hold" when converting to GT, but the player just jumps.
- `$FF` end: position parks forever; last waveform/pitch/detune
  persist; slide/vibrato now own the pitch (their accumulation is no
  longer overwritten).
- Arp col (after $7F chord check): `$00-$7E` relative up, idx =
  (DPITCH+v)&$7F; `$80` NOP (pitch untouched); `$81-$DF` absolute,
  idx = v&$7F; `$E0-$FF` relative down (2's-compl 8-bit add, &$7F).
  Pitch-yielding steps do FREQLO/HI ghost = FREQTBL/H[idx] — a plain
  lookup that OVERWRITES accumulated vibrato/slide displacement (this
  is the "arp cancels slide/vibrato" mechanism; on hold/end ticks the
  displacement survives).
- Detune col: stored to DETUNER on the row's step; $FF = keep previous
  — EXCEPT on chord rows where it's stored unconditionally ($FF = +255,
  quirk). DETUNER is added at output (WRPITCH: SID freq = FREQHI:FREQLO
  + DETUNER + stray carry-in — a deterministic ±1 jitter tied to table
  state, quirk Q-1 in notes). DETUNER is NOT reset at note start or by
  init (RAM player); only the column/FX change it.
- Chords: arp $7F → row does not advance; each step: re-write WF col,
  store detune, read CHORDS[CHORDPOS]: `$7E` → reset chord pos to base,
  WFTPOS += 3, process next WF row immediately same step; `$7F` → reset
  to base, fetch first entry, use it; else use entry (DPITCH-relative)
  and CHORDPOS++. CURCHORD from inst[8] at note start; small-FX $7x /
  big-FX $07 select chord (chord 0 = keep default semantics per docs).

Gate note-FX (tick 2 only; on ticks 0/1 such rows count as "no new
note" — no HR): `$7E` gate-off: if inst[$0C]≠0 → ONLY redirect WFTPOS
(PTNGATE stays $FF — release comes from the pointed rows, which must
carry gate-0 waveforms); else PTNGATE=$FE + WFGHOST &= $FE. Then
inst[$0D]≠0 → PWTPOS redirect (unconditional), inst[$0E]≠0 → FLTPOSI
redirect (controller only). `$7D` gate-on: PTNGATE=$FF, WFGHOST |= 1 —
envelope re-attacks from current level, nothing else touched.

ADSR at note start (tick 2, STRTSND only): SID.SR = inst[4] first,
then SID.AD = inst[3]. Skipped for legato/portamento/note-FX rows.

First frame of a note: tick 2 writes freq HI only + WFGHOST = inst[$F]
(if ctrl bit3), NO table/pitch processing; WF row 0 executes on the
NEXT call — its (pitch-yielding) arp writes both freq bytes, releasing
the test-bit oscillator lock with the true pitch. Row 0 arp $80 (NOP)
would leave the previous note's pitch — stock instruments use $00.

Frequency tables: FREQTBH (2961) / FREQTBL (2984), 96 entries each,
**index 0 is a dummy — C-1 is index 1**; DPITCH 0..$5F. Byte dumps in
the deep-dive notes; upper half doubles as EXPTAB2 for calculated
vibrato/slide + kb-tracking. Arp indices masked &$7F can read $60..$7F
= bytes physically after the table (slope tail + FREQTBL head) —
reproduce adjacency for bit-exactness. Tuning types (header byte $14)
re-patch entries 1..$5F (NTSC/Verdi-432/Just tables in altplayers.inc).

### Vibrato and calculated slides (VIBSLIDE 2085–2171, SETVIB0 2890–2941)

The central trick: EXPTABH (11 zeros + FREQTBH) is an exponential
curve, so `FREQMOD = freq16(idx − 107)` where freq16 = 16-bit SID
frequency of a note number. **Vibrato step = freq16(4×amp + DPITCH −
107)** per frame; **slide step = freq16(speed/2 + DPITCH − 107)** —
i.e. constant MUSICAL depth/rate at any pitch ("calculated", in
normal/extra players; idx ≥ 107 reads FREQTBL/H[idx−107] as full
16-bit values, clamped at 203 → reads 1 byte past table, quirk).

SLIDEVIB dispatch: $00 = increasing vibrato, $01..$7F = delayed
vibrato (types 1–3 share code), $81 slide up, $82 slide down, ≥$83
portamento ($FF = note-FX portamento pending). Vibrato is a TRIANGLE
applied directly to the FREQLO/HI accumulator: period = 2×rate frames,
VIBRACNT counts down and reloads; lower half adds FREQMOD, upper half
subtracts. Types (ctrl bits 4-5) differ only in phase seed and byte-6
role: type 0 "increasing" — no delay, byte 6 added to FREQMODL every
frame (amplitude ramp, UNBOUNDED — no clamp), seed rate/2; type 1
"normal" — byte-6+1 frames delay then symmetric ±(rate/2)×FREQMOD,
seed rate/2; type 2 — seed rate (traced: oscillates ABOVE the note);
type 3 — seed 0 (traced: BELOW the note). NOTE: source comments name
$20 "down-oriented" and $30 "up-oriented" — the OPPOSITE of the traced
arithmetic; implement as traced, A/B against real playback to confirm.

Slides ($01/$02 vv): never self-terminate, exact ±FREQMOD/frame, ended
only by SLIDEVIB rewrite (note start, FX $03/$08/$16, note-FX $6x,
legato). Portamento ($03 vv): toward freq16(DPITCH), step FREQMOD+1
(carry quirk — plain slides step exactly FREQMOD), borrow-detected
overshoot → snap to exact target, stays pinned ($83 persists). Note-FX
portamento ($78): SLIDEVIB=$FF, fixed speed 110; next real note
converts to $83 = glide without retrigger (HR+STRTSND suppressed).
Legato ($3F ins col): FREQMODH=$7F (max speed), SLIDEVIB=$83 — snap
next frame, envelope untouched. Vibrato phase/ampl re-init: STRTSND,
FX $08/$8x/note-$6x (amp merges with instrument rate nibble, phase
resets, delay counter NOT reloaded); $9x sets rate only (VIBFREQU=2x);
$16 sets type only.

### Note-FX / small-FX / big-FX dispatch (NOTE_FX 3069+, INSPTFX 3179+)

Note col $79/$7A sync on/off = WFGHOST bit1 set/clear; $7B/$7C ring =
bit2; persist until a WF-table waveform row replaces the byte. All FX
run once, at tick 2 (CURIFX/CURFX2 cleared next tick 0); note-FX rows
fall through into INSPTFX afterward.

Small-FX: $2x/$3x attack/decay (merge with inst nibble → SID AD),
$4x waveform hi-nibble into WFGHOST, $5x/$6x sustain/release (→ SID
SR), $7x chord select, $8x vib amplitude, $9x vib rate, $Ax main
volume (also sets SEQVOLU shadow so tick-0 restore keeps it), $Bx
filter band (FLTBAND = x<<4), $Cx arp speed + ARPSCNT=$FF (instant
step), $Dx DETUNER = x×8, $Ex control nibble into WFGHOST low, $Fx
resonance (RESONIB = x<<4).

Big-FX: $04 vv raw WFGHOST = vv (no $FF special case in player);
$05/$06 raw AD/SR; $07 chord; $09 WFTPOS = $10 + 3vv; $0A PWTPOS =
ins[$0A] + 3vv, PWEEPCNT=0; $0B FLTPOSI = ins[$0B] + 3vv, CWEPCNT=0
(quirk: no controller check); $0C arp speed; $0E PWHIGHO = vv & $0F
(low nibble only → PW bits 8-11, low 8 bits keep); $0F CTFHGHO = vv;
$16 vibrato type; $17–$1B alias to $1C (no own code); $1C FLSHIFT =
signed cutoff-hi shift added every frame in COMMONREGS; $1D/$1E track/
note delay EXTRA-player only (DELAYSUPPORT off in NORMAL — via TRDELAY
state machine: $1D shifts the whole track timeline vv frames, $1E
shifts only the note start, row length kept); $1F raw $D417 (FSWITCH =
vv&$0F, RESONIB = vv&$F0).

### Tempo machinery (DOTRACK 1341–1384, FX 3586–3696, SEQ_FX 3007–3049)

TEMPOTBL: pos 0,1 = main tempo/funktempo pair (from subtune funktempo
bytes at init), pos 2-3/4-5/6-7 = per-track pairs, tempo programs
follow (offsets via TEMPTRLO). Runtime: plain byte = tempo for one
row, advance; bit7 byte = tempo (&$7F) then loop TMPPOS←TMPBASE.
Funktempo = nibble pair alternating (pos0 plain → pos1 bit7 → loop).
Row length = tempo&$7F frames; NORMAL player needs tempo ≥ 3 (tick 2
must exist; EXTRA's FASTSPEEDBIND folds ticks for tempo 1-2).
$10 main tempo (all tracks → pos 0, value|$80), $11 main funktempo,
$12 main program, $13/$14/$15 track variants (track's own pair slots).
Orderlist FX (fetched one row EARLY at tick 1, hence delay shadows):
transpose $80..$9F → TRANSP2 = val−$90 (lands in TRANSP at next
tick 1 = first note of new pattern); volume $A0..$AF → SEQVOLU,
applied next tick 0; tempo $B0..$EF → SEQTEMPO = val−$B0, applied
next tick 0 ($B0 = sentinel no-op).

### The tempo table as a SAVED thing (s80, all verified in the asm)

The FILE carries only the programs past RESTEMP+1 — the main pair,
the track pairs and the $80 dummy at RESTEMP are runtime-only
(`packdepack.inc:215 "others not needed to be saved"`). Length byte
at `TMPLENPOS` ($10 for .swm/.sws, $0A for .swt/.swq). **An empty
tune saves ZERO bytes**: `CINITUN` zeroes TMPLENPOS, `depktempo`
prefills RAM with 62 one-byte `$80` "empty programs" (the editor's
lone "00" row = that dummy displayed `and #$7f`), and the packer
classifies a `$80` at position 0 — or right after another terminator
— as EMPTY, **cropping trailing empties and keeping embedded ones**
(packdepack.inc:216-226). Caps: table ≤ `TempoTableLen(128) −
(2+2·CHN_AMOUNT)` at pack, ONE BYTE FEWER at depack
(packdepack.inc:233 vs 468) → safe = **119/113/107/101**; ≤ 62
programs (`MAXTEMPOPRAMOUNT−2`, the selector's own stop,
keyhandler.inc:680); ≤ 32 bytes per program (`maxtempolength`,
enforced by INS). SW's editor: tempo window at rows 20-23 cols 37-39
(4 rows, below the chord table), Shift+T/Y or `+`/`-` walk `seltemp`
1..62, hex digits type (high nibble 0-7 only — **bit 7 is never
typable**; INS injects a $00 row above the cursor, DEL cannot take a
terminator, cursor-down stops on it). Subtune tempo is edited in the
ORDERLIST context: `<`/`>` tempo 1 (0..$3F), `[`/`]` tempo 2
(clamped **$80..$BF** — the parked byte KEEPS bit 7, see GOTCHAS),
`C=+T` toggles funk = EOR $80 on the LEFT byte
(keyhandler.inc:799-802, 1199-1291). **One deliberate DUET
divergence**: SW's `$12`/`$15` treat operand 0 as a NO-OP
(`;NO TEMPOPROGRAM 0`, player.asm:3641-3656); our `progBase(0)`
resolves to program 1 — unreachable from SW's own editor, absent
from all 147 shipped modules, kept because changing the player risks
the scoreboard for a case no file exercises.

### Bit-exactness quirk list (reproduce deliberately)

1. WRPITCH carry-in not normalized: SID freq = FREQ + DETUNER (+0/+1
   depending on code path — WF-table-at-end frames get +1 LSB).
2. Gate-off with WF gate-off pointer: gate NOT cleared (table rows do
   it). 3. Chord rows store detune unconditionally ($FF = +255).
4. WF table has no self-jump/underflow guards ($FE halt = target ≥
   $80). 5. DETUNER never reset by note start/init (RAM player).
6. Ticks 0/1 with pending note: only WF table runs (NORMAL). 7. PW/
   filter sweep counters survive note start. 8. PW kb-track ±1 carry
   artifacts; EXPTABH[-1] / past-end reads deterministic. 9. Portamento
   steps FREQMOD+1. 10. Type-0 vibrato amplitude unbounded. 11. Big-FX
   $0B ignores controller; $17-$1B alias $1C. 12. SETFMOD clamp at 203
   reads FREQTB*[96] (one past end). Full 6502-exact pseudocode with
   line refs: **internal_docs/RESEARCH-SIDWIZARD-DEEP.md** (implementation-grade
   appendix — read it when writing src/sid/swvoice.zig).

## Oracle workflow for SW playback

1. `resources/examples/new-sid-exports/*.sid` + `native/examples/sid-exports/`
   are SID-Maker exports of the example tunes.
2. Reference render: `brew install sidplayfp` (reSIDfp) — or vendor
   `libcRSID` (WTF license, plain C, integer-only; `tests/simple_app` shows
   the API) as a tiny WAV-render CLI. libcRSID is literally what SW's own
   host/TUI build uses → bit-faithful reference of Hermit's intent.
3. Ours: load the matching .swm → `--render out.wav` → RMS-envelope
   correlation, same harness as the openmpt123 oracle for IT.
4. Instrument-level: author 1-instrument test tunes in SID-Wizard TUI, export
   .sid, A/B against our .swi playback of the same instrument.

## Implications for DUET (design decisions this research settles)

- **No C64 emulation needed for playback.** The SW player is a deterministic
  50 Hz register-writing state machine — exactly what our M5 frame-lane
  scheduler does. Port the semantics to Zig; reSID renders the audio.
- **Dedicated SID channels are the natural model** — SW is 3 fixed voices per
  SID (up to 4 SIDs = 12 channels in .swq). Voice = channel, no NNA.
- **Multispeed maps to our lanes**: one lane per SID at fspeed×50 Hz; lane
  callback index i: i % fspeed == 0 → full player tick, else MULPLY tick.
  fspeed ≤ 8 → verify an 8× lane against the 1x/2x/4x exactness test.
- **SWI instruments in IT songs**: tick-locked binding by default (125 BPM ×
  speed 6 = exactly 50 Hz) per DESIGN.md; absolute-Hz mode remains available.
- **6581 default** (SW's SID-model setting lives only in SID exports, not in
  .swm) — keep engine's per-SID model toggle.
