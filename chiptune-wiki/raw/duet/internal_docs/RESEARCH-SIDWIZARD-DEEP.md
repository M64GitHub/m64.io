# SID-Wizard player.asm deep-dive notes (M6 research appendix)

Session 2026-08-01. Three exhaustive extraction passes over
`../SID-Wizard-1.97-sources-examples/native/sources/include/player.asm`
(4062 lines, 64tass). Line numbers refer to that file; `settings.cfg` =
`native/sources/settings.cfg`. These are the implementation-grade notes
behind internal_docs/RESEARCH-SIDWIZARD.md — pseudocode is 6502-exact including
carry/flag artifacts. Assumed build: NORMAL player (PLAYERTYPE=0),
COMPILEDAPP=2 (exported player), SID_AMOUNT=1, PLAYER_FOR_ROM=0.
With ALLGHOSTREGS_ON=0 && SID_AMOUNT==1, `SIDG = SID` (443-445): every
`sta SIDG.*` is a direct SID register write at that point in the frame.

---

# Part 1 — Pulse-width table, filter table, note-start resets, multispeed chain

## 0. Assumed feature flags (build configuration)

NORMAL player defaults, settings.cfg 222-259 (`PLAYERTYPE=0`, `feature .block` at 223). All flags that gate the code below are ON in NORMAL: `ARPSPEEDSUPP_ON=1, GATEOFFPTR_ON=1, FILTRESETSW_ON=1, FILTKBTRACK_ON=1, PWRESETSW_ON=1, PWKEYBTRACK_ON=1, HARDRESTYPES_ON=1, FRAME1SWITCH_ON=1, MULTISPEEDSUPP_ON=1, FINEFILTSWEEP_ON=1, FILT_CTRL_FX_ON=1, FILTSHIFT_SUPP_ON=1`; and OFF: `FILTERALWAYS_ON=0, PULSEALWAYS_ON=0, VIBSLIDEALWAYS_ON=0, ALLGHOSTREGS_ON=0, FASTSPEEDBIND_ON=0, DELAYSUPPORT_ON=0`.

EXTRA player differences (include/altplayers.inc 531-573): `ALLGHOSTREGS_ON=1` (all SID writes buffered, flushed in COMMONREGS loop3 1010-1082), `FILTERALWAYS_ON=PULSEALWAYS_ON=VIBSLIDEALWAYS_ON=1` (no HR-frame skipping), `FASTSPEEDBIND_ON=1, DELAYSUPPORT_ON=1, PORTAVIBRA_ON=1`. Table semantics identical.

State variables: per channel, X=chn*7 — `PWLOGHO` 248, `PWHIGHO` 249, `WFGHOST` 250, `PTNGATE` 251, `PWEEPCNT` 252, `WFTPOS` 260, `PWTPOS` 261, `ARPSCNT` 262, `DPITCH` 272, `ARPSPED` 293, `PKBDTRK` 294. Per SID (single, self-mod operands): `FSWITCH` 1085, `RESONIB` 1086, `MAINVOL` 1088, `FLTBAND` 1089, `CKBDTRK` 1099, `CTFHGHO` 1105, `FLSHIFT` 1110, `CTFLGHO` 1139, `FLTCTRL` 2218, `FLTPOSI` 2220, `CWEPCNT` 2224/2226. All zeroed at init (INIPVAR 641-646); then `MAINVOL=$0F` (745-746), `FLTCTRL=$0F` = "no controller" sentinel (768), `FSWITCH=0` (717-718), `FLTBAND=CKBDTRK=FLSHIFT=0` (682-716).

## 1. SETPWID — pulse-table execution (2332-2394)

Row format `[b0, b1, b2]`, positions are Y-offsets **relative to instrument base** (PWTPOS indexes `(PLAYERZP),y` directly, 2332-2333).

```
fn SETPWID(x):                                  // entered every frame it runs (see §6)
  y   = PWTPOS[x]                               // 2332
  cmd = inst[y]                                 // 2333
  if cmd < 0x80 {                               // 2334 bmi NOPWEEP — SWEEP row [dur, param, kbtrack]
    y += 1                                      // 2335 (→ col2)
    if cmd == PWEEPCNT[x] goto ADVANCE          // 2336-2337 (counter exhausted → advance, NO add this frame)
    PWEEPCNT[x] += 1                            // 2338
    param = inst[y]                             // 2339
    // 16-bit two's-complement add: {PWHIGHO:PWLOGHO} += signext16(param)
    if param >= 0x80 { PWHIGHO[x] -= 1 }        // 2340-2341 pre-decrement = sign extension
    r = PWLOGHO[x] + param                      // 2342-2343 clc; adc (clc needed: cmp at 2336 left C=1)
    PWLOGHO[x] = r & 0xFF                       // 2344
    if r > 0xFF { PWHIGHO[x] += 1 }             // 2345-2346 carry into hi byte
    goto OUTPUT                                 // 2345/2347
  }
  if cmd == 0xFE {                              // 2349-2350 → PWTJUMP — JUMP row [$FE, target]
    y += 1; target = inst[y]                    // 2354-2355  target = offset from INSTRUMENT BASE
    if target == PWTPOS[x] goto OUTPUT          // 2356-2357  self-jump ⇒ rest/hold forever
    y = target                                  // 2358
    if inst[y] < 0x80 {                         // 2359-2360  target row is a sweep row:
      goto STOREPOS                             //   reposition only; sweep starts NEXT frame
    }
    cmd = inst[y]; goto SET                     //   target row is a SET row: execute it THIS frame
  }
  if cmd == 0xFF goto OUTPUT                    // 2351-2352 bcs ENDPWTB — END: hold position/state forever
SET:                                            // cmd in 0x80..0xFD — SETPULW 2361
  PWHIGHO[x] = cmd & 0x7F                       // 2361-2362  ← SEVEN bits, not one nibble (SID ignores b4-7 of $D403)
  y += 1; PWLOGHO[x] = inst[y]                  // 2363-2365  full 8-bit low byte
ADVANCE:                                        // PWADVAN 2366
  y += 1; PKBDTRK[x] = inst[y]                  // 2367-2369  col3 read ONLY when a row completes
  y += 1                                        // 2371
STOREPOS:                                       // SEPWPOS 2372
  PWTPOS[x] = y; PWEEPCNT[x] = 0                // 2372-2375
OUTPUT:                                         // ENDPWTB 2376 — runs EVERY entry, gate state irrelevant
  // PW keyboard tracking (feature.PWKEYBTRACK_ON), 6502-exact:
  // clc; lda PKBDTRK,x; beq combiKT; adc DPITCH,x; tay;
  // lda EXPTABH,y; sbc EXPTABH-1,y; combiKT: adc PWHIGHO,x        // 2378-2385
  if PKBDTRK[x] == 0 { hi = PWHIGHO[x] }                 // 2380 (A=0,C=0 → adc = plain load)
  else {
    s  = PKBDTRK[x] + DPITCH[x]; C1 = s > 0xFF           // 2381
    yk = s & 0xFF
    d  = EXPTABH[yk] - EXPTABH[yk-1] - (1-C1)            // 2383-2384; C2 = no-borrow
    hi = (PWHIGHO[x] + d + C2) & 0xFF                    // 2385
    // net effect: no-wrap (C1=0): hi = PWHIGHO + diff   if diff>=1
    //                             hi = PWHIGHO - 1      if diff==0   (!! see §7.2)
    //             wrap    (C1=1): hi = PWHIGHO + diff + 1
  }
  SIDG.PLSW+1[x] = hi                           // 2389 → $D403+7*chn (ghost PWHIGHO itself NOT modified)
  SIDG.PLSW+0[x] = PWLOGHO[x]                   // 2393-2394 → $D402+7*chn (low byte NOT kb-tracked)
  // falls through into WFARPTB (2396)
```

Explicit answers:
- **Set $8X xx**: `PWHIGHO = cmd&$7F` (the whole 7-bit value — for documented commands $8x..$Fx that is $0x..$7x), 2361-2365. Position advances same frame (2373), `PWEEPCNT:=0` (2375), but next row executes next frame — a set row costs exactly one frame. Exception: `$FE` jump landing on a set row performs jump+set in one frame (2359→2361).
- **Sweep $01-$7F xx**: `PWEEPCNT` counts **up from 0**, compared against cmd (2336); each frame with counter≠cmd: increment + one signed 16-bit add of xx to {PWHIGHO:PWLOGHO} (2338-2346). counter==cmd: advance row, no add (2337→2366). A row `[N,xx,kb]` performs **N additions over N frames, occupies N+1 frames total**. Genuine 16-bit two's-complement add; ghost can run through the whole 16-bit space; SID sees bits 0-11.
- **$00 as cmd**: valid; matches counter 0 immediately → 1-frame no-op that advances and still loads col3 into PKBDTRK.
- **Jump $FE xx**: xx relative to **instrument base** (stored straight into Y, 2355-2359), same index space as PWTPOS/`inst[$0A]`. Jump-to-self = hold (2356-2357).
- **End $FF**: keep position; ghost PW keeps last value; OUTPUT keeps writing it (+kb-track) every frame.
- **Keyboard tracking (col3)**: raw to `PKBDTRK` on row completion (2368-2369); applied **every frame at output only** (never into the ghost): index `PKBDTRK+DPITCH` into EXPTABH, add the **difference** `EXPTABH[y]−EXPTABH[y−1]` to the pulse hi byte only. No `$8x` special case for PW col3 (unlike filter).
- **Gate-off/release**: **no PTNGATE interaction** (PTNGATE only masks WF-table waveform writes, 2430-2431). PW program keeps running through release; gate-off note-FX `$7E` merely redirects `PWTPOS = inst[$0D]` if nonzero (3131-3134).

## 2. Filter program — FILTPRG / flprog1 (2175-2328)

For SID_AMOUNT==1: `FILTPRG` == `flprog1` (2327). Macro body 2218-2303.

### 2a. Per-frame execution (only the controller track)

```
fn flprog1(x):                                  // in the chain right after ENDVIBSLIDE (2171→2306)
  if x != FLTCTRL goto END                      // 2218-2219 — ONLY the filter-controller track runs its table
  y   = FLTPOSI                                 // 2220 (offset into the controller track's CURRENT instrument)
  cmd = inst[y]                                 // 2221
  if cmd < 0x80 {                               // 2222 — SWEEP row [dur, param, col3]
    y += 1                                      // 2223
    if cmd == CWEPCNT goto ADVANCE              // 2224-2225 (same up-counting: N adds, N+1 frames)
    CWEPCNT += 1                                // 2226
    C = 0                                       // 2227 clc
    param = inst[y]                             // 2228
    // FINEFILTSWEEP_ON: 11-bit cutoff = (CTFHGHO<<3)|CTFLGHO(3 bits); cutoff11 += signext(param):
    if param >= 0x80 {                          // 2230
      t = CTFLGHO + (param | 0xF8); C = t > 0xFF        // 2231-2233 (low 3 bits, made mod-8-negative)
      CTFLGHO = t & 7                                    // 2234-2235
      hiadd = ~((~param) >> 3)  // == param asr 3        // 2236-2241 arithmetic shift right by 3
    } else {
      t = CTFLGHO + (param & 7); C = t >= 8              // 2244-2247 (cmp #8 sets carry)
      CTFLGHO = t & 7                                    // 2248-2249
      hiadd = param >> 3                                 // 2250-2253
    }
    CTFHGHO = (CTFHGHO + hiadd + C) & 0xFF               // 2254-2257
    // FINEFILTSWEEP off (LIGHT player): just CTFHGHO += param signed, 8-bit
    goto END                                    // 2258
  }
  if cmd == 0xFE {                              // 2260-2261 — JUMP [$FE, target]
    y += 1; target = inst[y]                    // 2265-2266 (instrument-base-relative, same as PW)
    if target == FLTPOSI goto END               // 2267-2268 self-jump ⇒ rest
    y = target
    if inst[y] < 0x80 goto STOREPOS             // 2269-2271 (sweep target: position only, starts next frame)
    cmd = inst[y]; goto SET                     // set-row target executes THIS frame
  }
  if cmd == 0xFF goto END                       // 2262-2263 — END: hold forever
SET:                                            // cmd 0x80..0xFD — SETFILT 2272
  FLTBAND = cmd & 0x70                          // 2273-2274  band bits → $D418 hi-nibble
  RESONIB = (cmd << 4) & 0xFF                   // 2276-2280  low nibble r → $D417 hi-nibble
  y += 1; CTFHGHO = inst[y]                     // 2281-2283  cutoff hi := param (8 bits)
  CTFLGHO = 0                                   // 2284-2287  (FINEFILTSWEEP_ON) cutoff low 3 bits := 0
ADVANCE:                                        // FLADVAN 2288
  y += 1; c3 = inst[y]                          // 2288-2290  (FILTKBTRACK_ON) col3 read on row completion
  if c3 < 0x80 || c3 >= 0x90 { CKBDTRK = c3 }   // 2291-2293, 2297  ($00-$7F up; $90-$FF "down" via wraparound)
  else { FSWITCH = c3 & 0x0F; CKBDTRK = 0 }     // 2294-2297  $80-$8F = FilterSwitch OVERRIDE: REPLACES the
                                                //            entire $D417 low nibble (all routing bits + ext)
  y += 1                                        // 2299
STOREPOS:                                       // SETFPOS 2300
  FLTPOSI = y; CWEPCNT = 0                      // 2300-2302
END:                                            // ENDFLTB 2303 — falls through into SETPWID (2332)
```

Band-bit mapping (`cmd & $70` → $D418 bits 4-6 = LP/BP/HP): `$9r`→`$10` LP, `$Ar`→`$20` BP, `$Br`→`$30` LP+BP, `$Cr`→`$40` HP, `$Dr`→`$50` LP+HP (notch), `$Er`→`$60` BP+HP, `$Fr`→`$70` all, `$8r`→`$00` no band. Bit7 of $D418 (3OFF) unreachable. Resonance = `r<<4` exactly (2276-2280).

### 2b. Filter-controller arbitration (note start, 1931-2009)

Runs inside STRTSND only when filter-reset not suppressed. `y = inst[$0B]` (1931-1933).

```
first = inst[y]                                 // 1994 read FIRST row byte of the filter table
if first == 0x00 {                              // 1995 — "PASSIVE filtered instrument"
  FSWITCH |= FLSWTBL[x]                         // 2000-2001, 2008 (own routing bit ON; FLTCTRL/FLTPOSI untouched)
}
else if first == 0xFF {                         // 1996-1997 — "not filtered" instrument
  if x == FLTCTRL { FLTPOSI = y }               // 2003-2005 STOPFLT: if we were controller, park on the $FF row
  FSWITCH &= FLSWTB2[x]                         // 2006-2008 own routing bit OFF
}
else {                                          // normal filtered instrument
  FLTCTRL = x                                   // 1998 — TAKE OVER filter control
  FLTPOSI = y                                   // 1999 — first row executes NEXT frame
  FSWITCH |= FLSWTBL[x]                         // 2000-2001, 2008 own routing bit ON
}
```

- Bit masks FLSWTBL/FLSWTB2 (500-501): ch1 (x=0): OR `$01`/AND `$FE`; ch2 (x=7): `$02`/`$FD`; ch3 (x=14): `$04`/`$FB`. FSWITCH low nibble = $D417 routing nibble (bit3 = external-in, settable only via col3 override or BigFX $1F).
- **Leftmost priority**: tracks processed ch3→ch2→ch1 (947-993, MULPLY 1248-1277); on simultaneous starts ch1 writes FLTCTRL last and wins.
- `CWEPCNT` NOT reset by take-over (only FLTPOSI). FLTPOSI/FLTCTRL/CWEPCNT/CKBDTRK/ghosts are **per SID**; FLTPOSI is an offset applied to whatever instrument is *currently* on the controller channel (2220-2221).
- Gate-off ($7E): if `x == FLTCTRL && inst[$0E] != 0` then `FLTPOSI = inst[$0E]` (3168-3173).
- Init: `FLTCTRL=$0F` sentinel ⇒ no filter program runs until an instrument takes control (768).

## 3. Note start: table resets, TABLRST, ctrl bits 6/7, counters

Tick discovery (DOTRACK 1333-1384): `SPDCNT` compared to tempo, reset to 0 on match (1344-1375), `A = SPDCNT` pre-increment, `SPDCNT+=1` (1380-1381); `A==0`→TICK_0 (row fetch 1388-1477, then HR check A=2, 1518-1520), `A==1`→TICK_1 (pattern/sequence advance 1628-1723, HR check A=1, 1726-1728), `A==2`→TICK_2 (1733-1736), `A>2`→CNTPLAY (1734).

TICK_2 instrument selection and TABLRST (1736-1747):
```
tablrst = 0xFF                                  // 1737-1738
if CURIFX[x] != 0 && CURIFX[x] < maxinstamount {// 1740-1743
  CURINS[x] = CURIFX[x]                         // 1744 SEL_INS
  tablrst = 0x3F                                // 1745-1746 (instrument (re)selected this row)
}
TABLRST_operand = tablrst                       // 1747
```

STRTSND (1820-2054) — reached only for a real note 1..$5F, no portamento BigFX 3 (1803-1805), no pending portamento note-FX (1806-1808), CURIFX≠$3F (1810-1812), CURINS≠0 (1752-1754):

```
ctrl  = inst[0]                                 // 1822-1824
ctrlM = ctrl & TABLRST_operand                  // 1826 — new instrument ⇒ bits 6/7 CLEARED ⇒ resets forced
INSCTRL_operand = ctrlM                         // 1828
SLIDEVIB[x] = ctrlM & 0x30                      // 1829-1830
if ctrlM & 8 {                                  // 1836-1839 (FRAME1SWITCH_ON) 1st-frame waveform:
  SIDG.FREQ+1[x] = FREQTBH[DPITCH[x]]           // 1840-1846
  WFGHOST[x] = inst[0x0F]                       // 1847-1852
}
WFTPOS[x] = 16                                  // 1853-1854
PTNGATE[x] = 0xFF; ARPSCNT[x] = 0xFF            // 1856-1860 (ARPSCNT=$FF = multispeed 1st-frame marker)
ARPSPED[x] = inst[7]                            // 1861-1865 (FULL byte incl. multispeed bits 6/7)
... vibrato init (1867), chord init (1869-1880) ...
if !(ctrlM & 0x40) { PWTPOS[x] = inst[0x0A] }   // 1882-1889 PW-TABLE RESET
if !(ctrlM & 0x80) { <arbitration §2b> }        // 1891-2009 FILTER RESET; bit7 set (and no new instrument)
                                                //  skips EVERYTHING incl. FSWITCH update and take-over
SIDG.SR[x] = inst[4]; SIDG.AD[x] = inst[3]      // 2011-2016, 2051
jsr INSPTFX; jmp WRWFGHO                        // 2053-2054 — NO table execution on the note-start frame
```

- **TABLRST rule**: `reset_happens(bitN) = !(ctrl & bitN) || instrument_was_selected_this_row`.
- **Sweep counters NOT initialized at note start** (PWEEPCNT written only at row-advance + global init; CWEPCNT likewise).
- Gate-off pointers (NGATEOF 3117-3175): `if inst[$0C]!=0: WFTPOS=inst[$0C]` and **gate NOT cleared** (branch 3121 skips 3123-3126); else `PTNGATE=$FE; WFGHOST&=$FE`. Then `if inst[$0D]!=0: PWTPOS=inst[$0D]` (3131-3134); `if x==FLTCTRL && inst[$0E]!=0: FLTPOSI=inst[$0E]` (3168-3173). All three: **instrument-base-relative, $00 = disabled** — SWM-spec.src 89-91 comments ("relative to table position") contradict the runtime; the player is ground truth.
- HR tick mapping: ctrl bit1 → HR on tick 0 (A=2 at 1518), bit0 → tick 1 (A=1 at 1726); HR: PTNGATE=$FE, gate cleared in WFGHOST, HR-ADSR from inst[1]/inst[2] (1568-1578); ctrl bit2 additionally WFGHOST=SIDG.WAVE=$18 and returns immediately (1580-1586).

## 4. COMMONREGS filter write-out (1085-1141) and EXPTABH

```
SID.RESFC ($D417) = FSWITCH | RESONIB           // 1085-1087
SID.FMVOL ($D418) = MAINVOL | FLTBAND           // 1088-1091
C = 0                                           // 1097 clc
if CKBDTRK != 0 {                               // 1098-1100
  s = CKBDTRK + DPITCH[FLTCTRL]; C = s > 0xFF   // 1101-1102 (note of the CONTROLLER track; C survives)
  A = EXPTABH[s & 0xFF]                         // 1103-1104
} else A = 0
A = A + CTFHGHO + C;  C = carry                 // 1105 (carry chains)
A = A + FLSHIFT + C                             // 1109-1110
SID.FCUT+1 ($D416) = A                          // 1134
SID.FCUT+0 ($D415) = CTFLGHO                    // 1138-1140 (raw 0..7, low bits not kb-tracked)
```

**EXPTABH** (2957-2982): 10 zero bytes + 1 zero ("for uncalculated zero vibrato"), then **FREQTBH continues the table** (96-entry PAL freq-hi), then 8 tail bytes `$F9..$FF,$FF` ("EXPAND EXPONENT-TABLE WITH SLOPE FOR KB.TRACKING"). `FREQTBH = EXPTABH + 11`. Equal temperament ⇒ indexing at `note + k` multiplies by `2^(k/12)`. Filter kb-track adds the **absolute** curve value (+ index carry); PW kb-track adds the **first difference**.

## 5. Multispeed chain — MULPLY (1240-1290) / MULCNTP (1292-1327)

```
MULPLY: for x in [14, 7, 0]:  jsr MULCNTP      // 1248-1277 (ch3, ch2, ch1)
        jmp COMMONREGS                          // 1290 — filter/volume registers rewritten every subframe

MULCNTP(x):                                     // 1292-1327
  if ARPSCNT[x] >= 0x80: return                 // 1298-1299 — note's 1st frame guard
  PLAYERZP = instr_base(CURINS[x])              // 1300-1319
  b7 = inst[7]                                  // 1320-1321
  if b7 & 0x80: goto FILTPRG                    // 1322, 1327 — filter (+ pulse + wf, by fall-through)
  if b7 & 0x40: goto SETPWID                    // 1323-1324, 1326 — pulse (+ wf)
  goto WFARPTB                                  // 1325 — wf-arp table only
```

**Chain**: FILTPRG (2306) → falls into SETPWID (2332) → falls into WFARPTB (2396) → ENDWFTB (2537) → WRPITCH (2539-2593) → WRWFGHO (2596-2606) → rts (2609). PWEEPCNT/CWEPCNT/ARPSCNT tick **per player call**, not per video frame, in multispeed tunes.

## 6. Scheduling matrix (NORMAL player)

| Frame | Condition | What runs |
|---|---|---|
| tick ≥3 | always | CNTPLAY → full chain: VIBSLIDE→flprog→SETPWID→WFARPTB→writes |
| tick 0/1 | no new note pending (or note-FX $60+/portamento/legato) | NONEWNO → CNTPLAY, full chain |
| tick 0/1 | new real note pending | HRENDER → `jmp WFARPTB`: VIBSLIDE, flprog, SETPWID SKIPPED — even for HRtimer=0 instruments. Staccato HR frame: even WFARPTB skipped (rts 1586). EXTRA: nothing skipped |
| tick 2 | real note → STRTSND | tables reset, NO table row executes (`jsr INSPTFX; jmp WRWFGHO`) |
| tick 2 | legato/portamento/CURINS==0 | LEGATOO: same — tables skipped this frame |
| tick 2 | empty note column | `jsr INSPTFX; jmp CNTPLY2` — full chain runs |
| tick 2 | note-FX $60-$7F (incl. gate-off) | `jsr NOTE_FX; jmp CNTPLY2` — full chain, from redirected positions |

## 7. Edge cases (all code-verified)

1. Sweep counters survive note start (residue shortens/lengthens a first-row sweep; normally invisible since first rows are set commands). Reimplement as-is.
2. PW kb-track artifacts (2378-2385): flat table region → `PWHIGHO−1`; index wrap → `diff+1`. Emulate 6502 carry semantics.
3. `EXPTABH-1` underflow when `(PKBDTRK+DPITCH)&$FF == 0`: reads byte before table. Deterministic, build-dependent.
4. Out-of-table kb-track indices (e.g. CKBDTRK=$90 + low note): read into FREQTBL data after ENDEXPTABH. Deterministic garbage; "down" values assume wrap.
5. Jump to a $FE/$FF row: target byte executed as set command (PW: PWHIGHO=$7E/$7F; filter: band=$70, reso=$E0/$F0).
6. Filter col3 $80-$8F override is absolute (replaces entire $D417 nibble) and zeroes CKBDTRK.
7. Stale FLTPOSI across instrument switches (controller's current instrument interprets the offset).
8. SWM-spec.src comment discrepancy for bytes $C/$D/$E — player uses instrument-base-relative. Player wins.
9. FSWITCH also written by BigFX $1F / MIDI paths.

---

# Part 2 — WF-arp/detune table, gate handling, note-start, frequency tables

## 0. Build constants

As Part 1, plus: `PACKEDNOPSUPP_ON=1` in the exported player (112). `WFTABLEPOS=$10` (settings.cfg:191), `PACKEDMAX=$77`, note-FX constants $78-$7E (settings.cfg:192-203), `maxinstamount=37` (SWM-spec.src:7). `DETUNER` lives in the CONST_VAR bunch (499-512) — **"NOT INITED BY INIT-ROUTINE"** (0 only from assembly time; ROM variant re-zeroes it, 787-792). See Q-5.

## 1. WFARPTB — waveform/arpeggio/detune table (2396-2537 + 2539-2609)

### 1.1 Entry points

- CNTPLAY→CNTPLY2→VIBSLIDE (2085) → filter (2306-2328) → PW (2331-2394) → falls into WFARPTB (2396): all "other" ticks + tick 2 of non-starting rows.
- Tick 0/1 with pending normal note: HRENDER → `jmp WFARPTB` (1621) — vibrato/filter/PW skipped, old note's WF table keeps stepping with PTNGATE=$FE if HR ran.
- Multispeed: MULCNTP → `jmp WFARPTB` (1325); suppressed while ARPSCNT negative (1297-1299).
- NOT reached: tick 2 of a starting note, legato/portamento tick 2, CURINS==0 channels, staccato-HR frame.

### 1.2 Exact algorithm

```
// ---- WFARPTB, one player call, channel X ----------------------------------
ARPSCNT[x] -= 1;                                     // 2398 (dec)
if (ARPSCNT[x] >= 0)  goto ENDWFTB;                  // 2399 → 2409  = skip tick, no table access
A = ARPSPED[x] & $3F;                                // 2400,2402
ARPSCNT[x] = A;                                      // 2403

RDWFROW:                                             // 2404
y  = WFTPOS[x];
wf = inst[y];                                        // 2405
if (wf == $FE) goto WFAJUMP;                         // 2406-2407
if (wf == $FF) goto ENDWFTB;                         // 2408 — END: WFTPOS NOT advanced, nothing written
if (wf >= $10) {                                     // 2411-2413
    WFGHOST[x] = wf & PTNGATE[x];                    // 2430-2431 (gate mask applied AT WRITE TIME)
} else {                                             // wf in $00..$0F:
    ARPSCNT[x] = wf;                                 // 2414 per-row speed override; waveform NOT touched
}

SETJARP:                                             // 2432
y += 1;  arp = inst[y];                              // 2432-2433
y += 1;                                              // 2434 (y on detune column)
if (arp == $7F) goto PLYCHRD;                        // 2436-2437 chord call; row does NOT advance
saved_arp = arp;                                     // 2440
det = inst[y];                                       // 2445
if (det != $FF) DETUNER[x] = det;                    // 2446-2448 ($FF = detune NOP)
y += 1;  WFTPOS[x] = y;                              // 2451-2453 (advance IMMEDIATELY)
A = saved_arp;                                       // 2454-2455

NORMARP:                                             // 2460
if (A < $80)          goto RELPTCH;                  // $00..$7E relative up
if (A == $80)         goto ENDWFTB;                  // NOP: FREQLO/HI untouched  [carry=1]
if (A < $E0)          goto ABSPTCH;                  // $81..$DF absolute          [carry=0]
/* $E0..$FF */        goto RELPTCH;                  // relative down (2's compl)

RELPTCH: A = (A + DPITCH[x]) & $FF;                  // 2523-2524 (carry_out survives)
ABSPTCH: idx = A & $7F;                              // 2525
FREQLO[x] = FREQTBL[idx];                            // 2532-2534
FREQHI[x] = FREQTBH[idx];                            // 2535-2536

ENDWFTB:                                             // 2537
WRPITCH:                                             // EVERY player call that reaches here
lo = FREQLO[x] + DETUNER[x] + carry_in;              // 2539-2541  (NO CLC! quirk Q-1)
SID.FREQ_LO[x] = lo;                                 // 2550
SID.FREQ_HI[x] = FREQHI[x] + carry_out(lo);          // 2551-2593
WRWFGHO:
SID.WAVE[x] = WFGHOST[x];                            // 2596,2606
rts                                                  // 2609
```

```
WFAJUMP:                                             // 2419
y += 1;  target = inst[y];                           // 2419-2420
if (target & $80) goto ENDWFTB;                      // 2422 bmi — halt parked on the $FE row forever
WFTPOS[x] = target;  y = target;                     // 2427-2428
wf2 = inst[y];                                       // 2429
goto SEWFARP;                                        // target row fully executed SAME step
```

```
PLYCHRD:  // arp column == $7F; y is on the detune column              // 2470
DETUNER[x] = inst[y];                                // 2470-2471  UNCONDITIONAL — no $FF-NOP check! (Q-3)
cy = CHORDPOS[x];                                    // 2483
c  = CHORDS[cy];                                     // 2485
if (c == $7E) {                                      // 2489-2490  return from chord
    CHORDPOS[x] = CHDPTRLO[CURCHORD[x]];             // 2491-2497  (re-arm chord)
    WFTPOS[x]  += 3;                                 // 2498-2500
    goto RDWFROW;                                    // 2501  next WF row executes NOW, same tick
}
if (c == $7F) {                                      // 2502-2503  loop chord
    CHORDPOS[x] = CHDPTRLO[CURCHORD[x]];             // 2504-2510
    c = CHORDS[CHORDPOS[x]];                         // 2511-2513
}
CHORDPOS[x] += 1;                                    // 2517
A = c;  goto RELPTCH;                                // chord entries are DPITCH-relative
```

### 1.3 Semantics spelled out

**ARPSPED/ARPSCNT**: ARPSPED = inst[7] loaded at note start; low 6 bits = speed, bits 6/7 = multispeed-lane flags. Each call reaching WFARPTB decrements ARPSCNT once — in an N× tune the unit is *player calls*. A table step happens only on underflow; counter reloads with ARPSPED&$3F. Row held `(speed&$3F)+1` calls; **speed 0 = step every call**. Small-FX $Cx sets ARPSPED and forces ARPSCNT=$FF (instant step next call, 3391-3397). Big-FX $09: `WFTPOS = value*3 + $10` (3524-3528). Big-FX $04 writes the waveform ghost directly (3509, 3301).

**WF column**:
- `$00-$0F`: per-row speed override — ARPSCNT = value after the reload (row's arp/detune held value+1 calls; value 0 = no extra hold). Waveform NOT written; WFGHOST keeps previous. One-shot (next step reloads from ARPSPED).
- `$10-$FD`: waveform, written to WFGHOST **only on the step entering the row** (masked with PTNGATE at that moment); WRWFGHO copies WFGHOST→SID.WAVE every call regardless. On chord rows the WF column IS re-read/re-masked every step.
- `$FE target`: raw WFTPOS-coordinate (instrument-base-relative, $10+3*row). Target byte bit7 set (≥$80 = maxinstsize) → nothing happens, WFTPOS stays on the $FE row = permanent halt, ghosts persist. (Threshold is **$80**, not $40 — the $40 note in SWMconvert.c is a converter heuristic for GT export.) Target <$80: WFTPOS=target, target row **fully executed same step**. **No self-jump guard** (unlike PW/filter): $FE→own row = deterministic garbage the editor prevents (Q-4). No <$10 check on the jump path either: a target row with WF byte $00-$0F is stored as a (silent) control value, not a speed.
- `$FF`: nothing done, WFTPOS not advanced — parks forever. Last waveform/pitch/detune persist; ARPSCNT keeps cycling (reload happens before the byte read) but each expiry is a no-op. Slide/vibrato own the pitch from now on.

**Arp column** (after the $7F chord check): `$00-$7E` relative up `idx=(DPITCH+v)&$7F` (musically valid $00-$5F); `$7F` chord; `$80` NOP (pitch untouched, incl. accumulated vibrato/slide); `$81-$DF` absolute `idx=v&$7F` → $01-$5F; `$E0-$FF` relative down (2's-compl 8-bit add, &$7F). Pitch = plain FREQTBL/H[idx] lookup into the ghost; SID write at WRPITCH same call (+DETUNER +carry).

**"Arp overrides slide/vibrato"**: VIBSLIDE runs earlier in the same call and modifies FREQLO/HI in place; any pitch-yielding table step then OVERWRITES FREQLO/HI, discarding accumulated displacement. On skip/hold ticks and after table end the displacement survives and accumulates ("DELAYED VIBRATO STILL APPLICABLE", 2534). Vibrato counters run every CNTPLAY call regardless.

**Detune column**: `$00-$FE` → DETUNER on the row's step; `$FF` NOP — EXCEPT chord rows (unconditional store, Q-3). Applied every call at WRPITCH: SID.FREQ = FREQHI:FREQLO + DETUNER (low-byte add, carry into hi; upward-only 0..254). Not scaled, not stored into FREQLO (add-on-output — vibrato/slide never destroy it). Also Big-FX $0D (DETUNER=vv, 3551-3552), small-FX $Dx (DETUNER=x*8, 3399-3404). **Not reset at note start nor by INITER** (RAM player, Q-5).

**Chords**: CURCHORD = chord number (inst[8] at note start; small-FX $7x / Big-FX $07 change it); CHORDPOS = absolute index into global CHORDS; per-chord bases from CHDPTRLO. On a $7F-arp row: WFTPOS does not advance; every table step (same ARPSCNT gating — chord speed == arp speed; a WF-column $00-$0F on the chord row overrides speed every step since re-read): re-write WF col (masked), store detune unconditionally, read CHORDS[CHORDPOS]: `$7E` → reset to base, WFTPOS+=3, process next WF row immediately same step; `$7F` → reset to base, fetch first entry, CHORDPOS+=1, use it; else → CHORDPOS+=1, entry is DPITCH-relative pitch.

**PTNGATE/WRWFGHO**: PTNGATE $FF/$FE applied only when a WF-column byte is stored to WFGHOST (2430). WRWFGHO writes WFGHOST verbatim to SID.WAVE every call (editor mute/solo mask is COMPILEDAPP==1 only). Direct WFGHOST masking outside table writes: hard restart (1568-1571), plain gate-off (3123-3126).

## 2. Gate-off / gate-on note-FX (NGATEOF 3117, NGATEON 3111)

Dispatch: note-column ≥ $78 → NOTEFXTBL (3054-3061): $78 NPORTAM, $79/$7A NSYNCON/OF, $7B/$7C NRINGON/OF, $7D NGATEON, $7E NGATEOF. Note-FX rows execute on **tick 2 only** (1781-1783) then continue into the full CNTPLY2 chain — new gate state applied same frame. On ticks 0/1 a note-FX row = "no new note": no HR (1520-1524). After the FX, falls through ENDNOTEFX (3176) into INSPTFX (3179).

**NGATEOF ($7E)**:
```
if (inst[$0C] != 0) {                          // 3118-3121  WF-table gate-off pointer
    WFTPOS[x] = inst[$0C];                     // 3130
    // PTNGATE stays $FF, WFGHOST untouched — release delegated to the table rows.
    // ARPSCNT NOT reset ("RESET ARP-SPEED COUNTER?" author comment, 3130):
    // the gate-off row runs on the next ARPSCNT expiry.
} else {
    PTNGATE[x]  = $FE;                         // 3123-3124
    WFGHOST[x] &= $FE;                         // 3125-3126  gate cleared immediately
}
if (inst[$0D] != 0) PWTPOS[x] = inst[$0D];     // 3131-3134
if (x == FLTCTRL && inst[$0E] != 0)            // 3168-3172  controller only
    FLTPOSI = inst[$0E];                       // 3173
```
Pointers: instrument bytes $C/$D/$E, used only if nonzero, instrument-base-relative (SWMconvert.c:2258 decodes byte $C as `(value − WFTABLEPOS)/3`). When byte $C ≠ 0, **the gate bit is NOT cleared by the FX** — the gate-off table sequence must contain gate-0 waveforms.

**NGATEON ($7D)**: `PTNGATE=$FF; WFGHOST|=1` (3111-3115). Nothing else — envelope re-attacks from current level at WRWFGHO the same frame.

## 3. ADSR write at note start

`SETADSR` in STRTSND, 2011-2051, exported player: `SID.SR = inst[4]` FIRST (2011-2014), `SID.AD = inst[3]` second (2015-2016, 2051). Tick 2, STRTSND path only (real note, CURINS≠0, no portamento/legato). Order within the tick-2 frame: FREQ-HI (1846, conditional) … SR (2014) → AD (2051) → inst/pattern FX (2053) → WAVE (2054→2606); author's comment: ADSR "very close or very far" from waveform write (1832-1834). MIDI velocity is editor-only. HR-ADSR (inst[1]/inst[2]) written on tick 0/1 instead, gated by ctrl bits 1/0 (1517-1519, 1725-1728, 1564-1566).

## 4. First frame(s) of a note

Tick 2 (STRTSND), in order: (1) ctrl masked with TABLRST; SLIDEVIB = ctrl&$30. (2) If ctrl&8: SID.FREQ_HI = FREQTBH[DPITCH] — **hi byte only, direct write; low byte register untouched (previous note's); FREQLO/HI ghosts not updated either**; WFGHOST = inst[$F] (typically $09 test+gate). If ctrl&8==0: neither touched. (3) WFTPOS=$10; PTNGATE=$FF; ARPSCNT=$FF; ARPSPED=inst[7]; vibrato init; chord init; PW/filter resets; SR/AD; INSPTFX; SID.WAVE=WFGHOST. (4) NO WFARPTB/WRPITCH this tick.

**WF row 0 executes on the following player call**: ARPSCNT=$FF → decrement → negative → reload+step. In multispeed tunes the remaining sub-calls of the note-start frame are suppressed (1297-1299), so row 0 lands on the next frame's first call. On that call: row 0 waveform → WFGHOST (unmasked, PTNGATE=$FF); row 0 arp (normally $00) → FREQLO/HI = FREQTB[(DPITCH)&$7F]; WRPITCH writes **both** SID freq bytes — first time the low byte gets the new note. With inst[$F] containing test bit ($08), the oscillator is frozen during frame 1 so the stale low byte is inaudible; row 0 releases test and sets true 16-bit pitch simultaneously. If row 0's arp were $80 NOP, FREQLO/HI would keep the previous note's pitch (and overwrite the fresh hi byte on tick 3) — new-note pitch requires a pitch-yielding arp row 0 (stock instruments use $00).

## 5. FREQTBH / FREQTBL

FREQTBH at 2961-2977 (second half labeled EXPTAB2 from 2970), ENDFREQTBH 2978, then 8 slope bytes `$F9,$FA,$FB,$FC,$FD,$FE,$FF,$FF` (2979-2981, present when CALCVIBRATO_ON), then FREQTBL 2984-3001. Both **96 entries, index 0..$5F; index 0 is a dummy — C-1 is index 1** ("be aware: C-1 note is the second value!", 2961/2985; altplayers.inc ~107; tuning re-patches start at +1). DPITCH = note + inst[9] + transpose (1786-1795). Index 0 = $0107, index 1 (C-1) = $0116, index $5F = $F810.

PAL values (hi 2961-2977, lo 2985-3001):
```
FREQTBH: 01 01 01 01 01 01  01 01 01 01 01 01  02 02 02 02 02 02  02 03 03 03 03 03
         04 04 04 04 05 05  05 06 06 06 07 07  08 08 09 09 0a 0a  0b 0c 0d 0d 0e 0f
 EXPTAB2:10 11 12 13 14 15  17 18 1a 1b 1d 1f  20 22 24 27 29 2b  2e 31 34 37 3a 3e
         41 45 49 4e 52 57  5c 62 68 6e 75 7c  83 8b 93 9c a5 af  b9 c4 d0 dd ea f8
FREQTBL: 07 16 27 38 4b 5e  73 89 a1 ba d4 f0  0d 2c 4e 71 96 bd  e7 13 42 74 a8 e0
         1b 59 9c e2 2c 7b  ce 27 84 e8 51 c0  36 b3 38 c4 59 f6  9d 4e 09 d0 a2 81
         6d 67 70 88 b2 ed  3a 9c 13 a0 44 02  da ce e0 11 64 da  75 38 26 40 89 04
         b4 9c c0 22 c8 b4  eb 71 4c 80 12 08  68 38 80 45 90 68  d6 e3 98 00 24 10
```
Notes: (a) arp indices masked &$7F can read $60..$7F = bytes physically after each table (FREQTBH: slope tail + FREQTBL head; FREQTBL: whatever follows 3002+) — reproduce adjacency for bit-exactness. (b) Startup menu can overwrite entries 1..$5F with NTSC / PAL-Verdi(432) / PAL-Just tables (altplayers.inc:61-77, tables ~197; header TUNINGTYPE). (c) FREQTBH's upper half doubles as EXPTAB2/EXPTBASE for calculated vibrato/slide and kb-tracking.

## Quirks (bit-exact port must reproduce)

- **Q-1 WRPITCH carry-in not normalized** (2541, no CLC): +DETUNER+carry where carry depends on path: rel-arps → carry of DPITCH+value; abs-arps → clear; arp NOP $80 → SET; WF end $FF → SET; $FE-halt → SET; skip ticks → whatever PW kb-track left (clear when PKBDTRK=0); multispeed entry → caller-dependent. Deterministic ±1 freq-LSB jitter.
- **Q-2** gate-off with WF pointer set leaves gate ON (release from table rows).
- **Q-3** chord rows store detune unconditionally ($FF = literal +255).
- **Q-4** no self-jump/underflow guards in WF table ($FE→own row, target <$10 rows).
- **Q-5** DETUNER persists (not cleared by note start / INITER in RAM player).
- **Q-6** ticks 0/1 with pending note: old note's WF table still runs (PTNGATE=$FE if HR); staccato-HR frame skips even that.
- The "$FE self-jump if ≥ $40" in SWMconvert.c is converter-level, not player-level (player halts on target ≥ $80, 2422).

OPEN: (1) exact raster ordering of main vs MULPLY calls is IRQ-host territory (treat "player call" as atomic); (2) whether the editor forbids Q-3/Q-4 degenerate data; (3) carry-in on multispeed WFARPTB entry (unspecified-but-deterministic).

---

# Part 3 — CNTPLAY, vibrato, slides, note/small/big FX, tempo, orderlist FX

## 0. Feature flags

NORMAL: `CALCVIBRATO_ON=1, VIBRATOTYPES_ON=1, DETUNESUPPORT_ON=1, PORTAVIBRA_ON=0, TEMPOPRGSUPP_ON=1, FASTSPEEDBIND_ON=0, DELAYSUPPORT_ON=0, ALLGHOSTREGS_ON=0, FINEFILTSWEEP_ON=1, FILT_CTRL_FX_ON=1, FILTERALWAYS_ON=0, PULSEALWAYS_ON=0, VIBSLIDEALWAYS_ON=0`, all `*_SMALLFX_ON=1`, `PORTAME_NOTEFX_ON=1, VIBFREQFX_SUPP_ON=1, SEQ_FX_SUPPORT_ON=1`. EXTRA: `PORTAVIBRA_ON=1, FASTSPEEDBIND_ON=1, DELAYSUPPORT_ON=1` (big-FX $1D/$1E exist only there), `ALLGHOSTREGS_ON=1, FILTERALWAYS/PULSEALWAYS/VIBSLIDEALWAYS=1`. Medium: `VIBRATOTYPES_ON=0` (CALCVIBRATO stays 1); light: both 0.

Constants: `SWM_NOTE_MAX=$5F, VIBRATOFX=$60`, packed NOPs `$70..$77`, `PORTAMFX=$78, DEFAULTPORTA=110`, `SYNCONFX=$79, SYNCOFFX=$7A, RINGONFX=$7B, RINGOFFX=$7C, GATEONFX=$7D, GATEOFFX=$7E`.

## 1. Tick machinery (context)

DOTRACK per-frame tempo handling:
```
A = SPDCNT - TEMPOTBL[TMPPOS]        ; full byte incl. bit7 (1353-1356)
if A == 0:            SPDCNT = 0; TMPPOS += 1     ; mid-tempo-program advance (1369, 1374-1379)
elif V flag (bit7 tempo && SPDCNT >= tempo&$7F):
                      SPDCNT = 0; TMPPOS = TMPBASE ; loop program / single tempo (1370-1379)
A = SPDCNT; SPDCNT += 1
dispatch: 0→TICK_0, 1→TICK_1, 2→TICK_2, ≥3→CNTPLAY
```
Row lasts `tempo&$7F` frames. Bit7 in a TEMPOTBL byte = "loop here". Exact equality needed for plain entries; ≥ (V-flag) only for bit7 entries.

- TICK_0: set pattern pointer; `CURIFX=0, CURFX2=0` (one-shot FX, 1408-1410); apply delayed SEQVOLU→MAINVOL (1411-1413); apply delayed SEQTEMPO→TRAKTMP, clear (1428-1434); read row (1437-1477); HARDRST A=2.
- TICK_1: `TRANSP ← TRANSP2` (delayed transpose, 1648-1652); look ahead one row; on pattern end walk orderlist: <$80 pattern number; $80-$FD SEQ_FX; $FE end (freeze SPDCNT, 1666-1669); $FF nn loop (nn≥$80 subtune jump, 1683-1696). HARDRST A=1.
- HARDRST: only for real note $01-$5F (1520-1523); NOT when big-FX $03 (1526-1528), pending SLIDEVIB==$FF (1529-1533), legato CURIFX==$3F (1538-1539). HR when `ins[0] & tickval` ≠ 0 (1564-1566). **Normal player: note-coming path → `jmp WFARPTB` (1621) — vibrato/slide, filter, pulse skipped on ticks 0/1.** Extra: `jmp CNTPLY2` (1614-1615).
- TICK_2: instrument select (1740-1747); CURINS==0 → just INSPTFX; COLUMN1: CURNOT==0 → INSPTFX+CNTPLY2; ≥$60 → NOTE_FX+CNTPLY2; real note: DPITCH = note + ins[9] + TRANSP (1786-1795); big-FX $03 → LEGATOO; SLIDEVIB==$FF → SETPRTA; CURIFX==$3F → SETLEGA; else STRTSND.
- SETLEGA/SETPRTA (1813-1816): `FREQMODH=$7F` (legato only), `SLIDEVIB=$83`; LEGATOO: INSPTFX + WRWFGHO — no retrigger; pitch slides from tick 3.
- STRTSND: as Parts 1-2; `jsr SETVIB0` (1867). On the note-start tick no table runs and pitch-lo is not written.

## 2. CNTPLAY (2058)

```
CNTPLAY:  if CURINS==0: rts (2059-2061); PLAYERZP = instrument base (2062-2081)
CNTPLY2:  VIBSLIDE (2085-2171) → FILTPRG (2306+) → SETPWID (2332+) → WFARPTB (2396+)
          → WRPITCH (2539) → WRWFGHO (2596) → rts (2609)
```
Entries into CNTPLY2 (pointer preset): 1779, 1784, 1615. Into CNTPLAY: 1524, 1669, 1718/1734, editor 187. Ordering: vibrato/slide modify FREQLO/HI first; a pitch-yielding WF step overwrites them ("arp cancels slide/vibrato"); accumulation survives on wait/end/NOP frames. Multispeed extra calls: never VIBSLIDE.

## 3. Vibrato

### 3.1 SETVIB0 / SETVIBR / SETFMOD (2890-2941)

```
SETVIB0:  VIDELCNT = ins[6]              // delay (types 1-3) or amplitude-increment (type 0); max $7F
SETVIB1:  A = ins[5]
SETVIBR:  f = A & $0F                    // rate nibble
          VIBFREQU = 2*f                 // triangle period P = 2f frames
          seed = f                       // then by type (SLIDEVIB $00/$10/$20/$30):
          if type < $20:  seed = f/2     // types 0,1: quarter-phase
          if type == $30: seed = 0
          VIBRACNT = seed
SETVAMP:  A = (A & $F0) >> 1             // amp*8, 0..120
SETFMOD:                                 // shared with slide speed (A = raw speed there)
  if CALCVIBRATO:
          if A == 0: FREQMOD = 0; return
          A >>= 1                        // vibrato: amp*4 (C=0); slide: speed/2 (C=speed bit0)
          idx = A + DPITCH + C
  else:   idx = A                        // light player
          idx = min(idx, 203)
          if idx < 107: FREQMODL = EXPTABH[idx]; FREQMODH = 0
          else:         FREQMODL = FREQTBL[idx-107]; FREQMODH = FREQTBH[idx-107]
```
EXPTABH = 11 zeros + FREQTBH ⇒ EXPTRESHOLD=107 ⇒ **both branches compute `FREQMOD ≈ freq16(idx − 107)`** = `freq(DPITCH) × 2^((scaled − 107)/12)` with scaled = 4×amp (vibrato) or speed/2(+bit0) (slides). Calculated = musical units, note-dependent.

### 3.2 Per-frame vibrato (VIBSLIDE dispatch 2085-2171)

```
Y = SLIDEVIB:  $00 → INCVIBR; $01..$7F → NORMVIB; $81 → ADDFREQ; $82 → SUBFREQ; ≥$83 → portamento

NORMVIB (2132): if VIDELCNT >= 0: VIDELCNT -= 1; skip this frame   // delay = ins[6]+1 frames, then stays $FF
                else fall into DOVIBRA
INCVIBR (2138): FREQMOD += VIDELCNT (= ins[6], constant)           // amplitude ramp, UNBOUNDED
                fall into DOVIBRA
DOVIBRA (2145): cnt = VIBRACNT; if cnt == 0: cnt = VIBFREQU
                cnt -= 1; VIBRACNT = cnt
                if 2*cnt < VIBFREQU:  FREQ += FREQMOD              // lower half: add
                else:                 FREQ -= FREQMOD              // upper half: subtract
```
Triangle on linear SID frequency, applied directly to the FREQLO/HI accumulator. Types (r = rate nibble):

| type (ctrl&$30) | delay | seed | traced trajectory |
|---|---|---|---|
| $00 increasing | none; ins[6] = per-frame amplitude increment | r/2 | symmetric, amplitude ramps unbounded |
| $10 normal | ins[6]+1 frames | r/2 | symmetric ±(r/2)×FREQMOD around note |
| $20 "down-oriented" | ins[6]+1 | r | oscillates ABOVE the note (note … note + r×FREQMOD) |
| $30 "up-oriented" | ins[6]+1 | 0 (reload → P−1) | oscillates BELOW the note |

**OPEN QUESTION (naming inversion)**: comments call $20 "DOWN-ORIENTED … GUITAR TREMOLO-ARM" (2899) and $30 "UP-ORIENTED … STRING STRETCHING" (2909) — opposite of the traced arithmetic. Implement as traced; A/B against real playback to confirm.

Re-init: STRTSND (SETVIB0), FX $08/$8x/note-$6x (SETVIBR), $16/FORCVIB (type only). Legato/portamento rows skip STRTSND (counters keep running; SLIDEVIB=$83 suppresses the vibrato branch; extra player's PORTAVIBRA resumes vibrato on target-arrival via FORCVIB+SETVIB1, 2117-2121).

### 3.3 Vibrato FX interplay

- Note col $60..$6F: VALSTOR=$6x → VIBAMFX (3339-3341): amplitude x merged into ins[5]'s hi nibble, rate kept; then BIGFX08 (3518-3522): FORCVIB (SLIDEVIB ← ins[0]&$30 — cancels slide/porta, restores type, 3343-3347) + SETVIBR (re-init period, phase, FREQMOD). **Amplitude only; instrument rate; phase resets; VIDELCNT NOT reloaded.** $60 = amp 0 = off.
- Big-FX $08 vv: same machinery, both nibbles from vv (amp hi, rate lo).
- Small-FX $8x: exactly note-col $6x. Small-FX $9x: rate only, `VIBFREQU = 2x` (3349-3353), all else untouched.
- Big-FX $16 vv: `SLIDEVIB = vv & $30` — type select / slide cancel only (3698).

## 4. Slides, portamento, legato, detune

### 4.1 Big-FX $01/$02
SETSLID (3499-3503): SLIDEVIB=$81/$82, FREQMOD = SETFMOD(value) — **calculated** (equal semitones/sec at any pitch). Per frame: $81 → FREQ += FREQMOD exactly; $82 → FREQ -= FREQMOD exactly. **Never self-terminates** (no clamp, 16-bit wrap possible); ends only when SLIDEVIB rewritten. Value 0 → no movement.

### 4.2 Big-FX $03 (tone portamento)
SLIDEVIB=$83, speed calculated. Note in the row sets DPITCH but skips sound init (1803-1805); HR suppressed (1526-1528). Per frame (2100-2130, 2154-2170):
```
diff = FREQTB16[DPITCH] - FREQ            // 16-bit
if target >= current:  if diff - FREQMOD borrows → snap; else FREQ += FREQMOD + 1   // +1 carry quirk
else:                  if diff + FREQMOD >= 0    → snap; else FREQ -= FREQMOD + 1
snap: FREQ = FREQTB16[DPITCH]             // exact
[extra only, PORTAVIBRA: on arrival FORCVIB + SETVIB1 → resume vibrato]
```
SLIDEVIB stays $83 after arrival (re-pins each frame). Value 0 → creeps 1 LSB/frame (the +1).

### 4.3 Note-column portamento $78
NPORTAM (3094-3099): SLIDEVIB=$FF, FREQMOD = SETFMOD(110) ≈ noteFreq/20 per frame (constant speed, no parameter). On the $78 row: ≥$83 → PORTAME toward current DPITCH (pins). Next real note: HR suppressed (1529-1533); tick 2 detects $FF (1806-1808) → SETPRTA: SLIDEVIB=$83 keeping computed speed → glide, no retrigger.

### 4.4 Legato ($3F)
Excluded from instrument selection (1742-1743) and HR (1538-1539). Tick 2: FREQMODH=$7F (FREQMODL keeps previous — any target reached in ≤2 frames), SLIDEVIB=$83; INSPTFX + WRWFGHO — no STRTSND/ADSR/table/vibrato reset, gate untouched. Pitch snaps next CNTPLAY frame; envelope continues.

### 4.5 Detune
Big-FX $0D: DETUNER=vv (3551-3552). Small-FX $Dx: DETUNER=x*8 (3399-3404). Table column: ≠$FF → DETUNER (chord rows unconditional). Applied every frame at WRPITCH (add-on-output, never contaminates FREQLO/HI). Persists across note starts. **Carry quirk**: no clc before `adc DETUNER` (2539-2541) — +1 LSB on WF-table-at-end frames (C=1 from `cmp #$FE`), C=0 on active rows. Deterministic, ±1 LSB.

## 5. NOTE_FX (note col $60-$7E) — full dispatch

Tick 2 only, A=CURNOT (1783). <$78 → vibrato-amp FX (§3.3); ≥$78 → NOTEFXTBL with A preloaded with WFGHOST (3086):
- $78 NPORTAM (§4.3).
- $79 `WFGHOST |= $02` sync on; $7A `&= $FD` off; $7B `|= $04` ring on; $7C `&= $FB` off (3101-3108). Persist until a WF-table waveform row replaces the byte or note start.
- $7D NGATEON: `PTNGATE=$FF; WFGHOST|=1` (3111-3115) — re-attack from current level, nothing else.
- $7E NGATEOF: see Part 2 §2.
- Every handler falls through ENDNOTEFX (3176) into INSPTFX — ins-col and FX-col still run on note-FX rows.

## 6. INSPTFX — instrument-column and FX-column effects

Entry (3179-3211): CURIFX ≥ $40 → SMALPFX; then FX column: CURFX2==0 → return; ≥$20 → SMALPFX; <$20 → big-FX via BIGFXTABLE, A=CURVAL. All FX once per row at tick 2 (CURIFX/CURFX2 cleared next tick 0).

SMALPFX (3249-3271): type = byte>>4, x = byte&$0F. 1-SID normal build merges with *instrument* bytes as base:

| FX | effect | code |
|---|---|---|
| $2x | SID.AD = (ins[3]&$0F) \| x<<4 | 3277-3285, 3295 |
| $3x | SID.AD = (ins[3]&$F0) \| x | 3287-3296 |
| $4x | WFGHOST = x<<4 \| (WFGHOST&$0F) | 3298-3302 |
| $5x | SID.SR = (ins[4]&$0F) \| x<<4 | 3304-3312, 3322 |
| $6x (ins col) | SID.SR = (ins[4]&$F0) \| x | 3314-3323 |
| $7x | CURCHORD = x; CHORDPOS = CHDPTRLO[x] | 3325-3336 |
| $8x | vib amplitude (§3.3) | 3338-3341 |
| $9x | VIBFREQU = 2x | 3349-3354 |
| $Ax | MAINVOL = x AND SEQVOLU = x | 3356-3375 |
| $Bx | FLTBAND = x<<4 | 3377-3386 |
| $Cx | ARPSPED = x; ARPSCNT = $FF | 3391-3397 |
| $Dx | DETUNER = x*8 | 3399-3404 |
| $Ex | WFGHOST = (WFGHOST&$F0) \| x | 3407-3412 |
| $Fx | RESONIB = x<<4 | 3418-3426 |

Big-FX (table 3483-3488) beyond those covered:
- $04 vv: raw WFGHOST = vv (3509→3301). No $FF special case ("4FF = legato" is a GT-conversion notion).
- $05/$06 vv: raw SID.AD/SR = vv (3512-3514). $07 vv: chord select, full byte (3516).
- $09 vv: WFTPOS = 3vv + $10 (3524-3528). $0A vv: PWTPOS = 3vv + ins[$0A]; PWEEPCNT=0 (3530-3537). $0B vv: FLTPOSI = 3vv + ins[$0B]; CWEPCNT=0 (3539-3547) — **no controller check** (quirk).
- $0C vv: arp speed, full byte (3549; masked &$3F at reload 2402).
- $0E vv: **PWHIGHO = vv & $0F** (low nibble → PW bits 8-11; PWLOGHO keeps) (3558-3561).
- $0F vv: CTFHGHO = vv (3563-3583). $16 vv: type (§3.3).
- $17-$1B: no own code — **alias to $1C** (3700-3706).
- $1C vv: FLSHIFT = vv — signed, added to cutoff-hi every frame in COMMONREGS (1109-1111); persistent.
- $1D vv (EXTRA only): DELAYER (3730-3743) on TRDELAY (init $FF): first exec arms TRDELAY=vv; each delayed frame forces SPDCNT=2 (tick 2 re-executes each frame incl. STRTSND for note rows) while counting down; at 0 row resumes at tick 3. Track timeline shifted vv frames; row extended by vv.
- $1E vv (EXTRA only, 3746-3756): same but on expiry SPDCNT += vv — row keeps total length, only note start moves. "max = tempo-3".
- $1F vv: FSWITCH = vv&$0F, RESONIB = vv&$F0 — raw $D417 (3758-3801). Persistent; note starts keep OR/AND-ing their channel bit.

## 7. Tempo effects and orderlist FX

TEMPOTBL layout: pos 0,1 = main tempo/funktempo pair (from subtune funktempo bytes via SETSTUNE, 2655-2669); pos 2-3/4-5/6-7 = per-track pairs (TRKTMPOS = 2,4,6; 502, 512); tempo programs follow (offsets in TEMPTRLO). SWM tempo-program encoding: entries separated by bit7-set byte. Runtime: plain byte = tempo for one row, advance; bit7 byte = tempo(&$7F) for the row, then loop TMPPOS←TMPBASE.

- $10 vv main tempo (3586-3625): TEMPOTBL[0] = vv|$80; TMPPOS=TMPBASE=0 all tracks.
- $11 vv main funktempo (3627-3639): TEMPOTBL[1]=(vv&$0F)|$80; TEMPOTBL[0]=vv>>4 (plain); pointers 0 all tracks → rows alternate hi,lo,hi,lo. **Funktempo = nibble pair.**
- $12 vv main tempo program (3641-3656): TMPPOS=TMPBASE=TEMPTRLO[vv] all tracks.
- $13 vv track tempo (3658-3667): Y=TRKTMPOS,x; TEMPOTBL[Y]=vv|$80; TMPBASE=TMPPOS=Y.
- $14 vv track funktempo (3669-3681): TEMPOTBL[Y]=vv>>4, TEMPOTBL[Y+1]=(vv&$0F)|$80, TMPBASE=TMPPOS=Y.
- $15 vv track tempo program (3684-3696): TMPBASE=TMPPOS=TEMPTRLO[vv], this track only.

SEQ_FX (3007-3049), during tick-1 orderlist walk:
- $80..$9F transpose: TRANSP2 = value − $90 ($80=−16 … $9F=+15). TRANSP2→TRANSP copied every tick 1 BEFORE the look-ahead — lands exactly on the new pattern's first note (notes read TRANSP at tick 2).
- $A0..$AF volume: SEQVOLU = value&$0F; applied MAINVOL←SEQVOLU next tick 0.
- $B0..$EF track tempo: SEQTEMPO = value−$B0; applied at next tick 0 via TRAKTMP → (value−$B0)|$80, then cleared. $B0 is a no-op (0 = sentinel).
- $F0..$FD: no-ops. $FE: end (SPDCNT frozen). $FF nn: loop; $FF $8n: subtune jump.

## 8. Additional behaviors / quirks

1. Rastertime skipping (normal): §6 of Part 1. 2. Note-start pitch: hi byte only at tick 2, full pitch at tick 3 via WF row 0. 3. Minimum tempo ≥ 3 for notes (normal); extra's FASTSPEEDBIND folds tick 1 into 0 (tempo<2) and 2 into 1 (tempo<3), 1496-1515/1704-1723. 4. SETFMOD clamp at 203 reads FREQTB*[96] (one past end; FREQTBH[96]=$F9). 5. Portamento steps FREQMOD+1, slides exactly FREQMOD. 6. WRPITCH detune carry quirk. 7. Big-FX $17-$1B alias $1C; $0B ignores controller; chord-row detune unconditional. 8. Type-0 vibrato amplitude unbounded. 9. Pattern row encoding: note byte (bit7 = more), ins/small-FX byte (bit7 = more), FX byte; FX < $20 consumes one value byte (1442-1475); $70..$77 = 2..9 packed empty rows.

**Load-bearing formulas**: vibrato = triangle straight into the 16-bit pitch accumulator, period 2×rate frames, step `FREQMOD = freq16(4×amp + DPITCH − 107)`; slides step `freq16(speed/2 + DPITCH − 107)` per frame, no termination; portamento same speed toward `freq16(DPITCH)` with borrow-clamped snap; the four vibrato types differ only in phase seed (r/2, r/2, r, 0) and byte-6 role (delay vs per-frame amplitude increment).
