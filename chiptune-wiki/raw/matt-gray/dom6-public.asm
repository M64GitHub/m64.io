;-----------------------------------------------------------------------------
; BASIC HEADER (WILL AUTOSTART FILE WHEN DROPPED INTO VICE)
; THE "SETIRQ" LINE REFERS TO A LABEL FURTHER DOWN THE CODE

        *= $0801
        .word (+), 2005
        .null $9e, ^SETIRQ
+       .word 0

;-----------------------------------------------------------------------------

                ;PLAYER V4.2
                ;(C)1987
                ;MATT GRAY
                ;This work is licensed
                ;under a Creative Commons 
                ;Attribution-NonCommercial 4.0 
                ;International License
STARTADD       =$C000
C0             =1
CS0            =2
D0             =3
DS0            =4
E0             =5
F0             =6
FS0            =7
G0             =8
GS0            =9
A0             =10
AS0            =11
B0             =12
C1             =13
CS1            =14
D1             =15
DS1            =16
E1             =17
F1             =18
FS1            =19
G1             =20
GS1            =21
A1             =22
AS1            =23
B1             =24
C2             =25
CS2            =26
D2             =27
DS2            =28
E2             =29
F2             =30
FS2            =31
G2             =32
GS2            =33
A2             =34
AS2            =35
B2             =36
C3             =37
CS3            =38
D3             =39
DS3            =40
E3             =41
F3             =42
FS3            =43
G3             =44
GS3            =45
A3             =46
AS3            =47
B3             =48
C4             =49
CS4            =50
D4             =51
DS4            =52
E4             =53
F4             =54
FS4            =55
G4             =56
GS4            =57
A4             =58
AS4            =59
B4             =60
C5             =61
CS5            =62
D5             =63
DS5            =64
E5             =65
F5             =66
FS5            =67
G5             =68
GS5            =69
A5             =70
AS5            =71
B5             =72
C6             =73
CS6            =74
D6             =75
DS6            =76
E6             =77
F6             =78
FS6            =79
G6             =80
GS6            =81
A6             =82
AS6            =83
B6             =84
C7             =85
CS7            =86
D7             =87
DS7            =88
E7             =89
F7             =90
FS7            =91
G7             =92
GS7            =93
A7             =94
AS7            =95
B7             =96
POINTS         =$FC
BARS           =$FE
V2LO           =V1LO+7
V2HI           =V1HI+7
V3LO           =V1LO+14
V3HI           =V1HI+14
                *=STARTADD
TN              .BYTE   3
FADE            .BYTE   0
DRIVER          
                LDX #$00
                JSR MAIN
                LDX #$07
                JSR MAIN
                LDX #$0E
                JSR MAIN
                RTS 
MAIN            LDA TN
                BNE PLAYMUSIC2
                STA $D418
                RTS 
PLAYMUSIC2      
                CMP #$AB
                BEQ MUSIC
                JMP SETPOINTS
SETCONT         LDA #0
                LDY #23
SIDLOOP         STA $D400,Y
                DEY 
                BPL SIDLOOP
                LDA #$0F
                STA $D418
                STA VOLUME
                LDY #0
                STY BARCOUNT
                STY BARCOUNT+7
                STY BARCOUNT+14
                STY V1DUR
                STY V1DUR+7
                STY V1DUR+14
                STY BEATCOUNT
                STY BEATCOUNT+7
                STY BEATCOUNT+14
                STY FADE
                INY 
                STY SPEED
                STY SPEED2
                JMP QUIT
MUSIC           
                LDA FADE
                BEQ OKMUSIC
                DEC VOLTIME
                BPL OKMUSIC
                LDA FADE
                STA VOLTIME
                DEC VOLUME
                BPL OKFADE
                LDA #0
                STA TN
                RTS 
OKFADE          LDA VOLUME
                STA $D418
OKMUSIC         LDY SOUND,X
                LDA VDATA+7,Y
                AND #4
                BEQ NOIMPLEX
                LDA IMPLEX,X
                BEQ NORMAL
                DEC IMPLEX,X
                LDA VDATA2+2,Y
                STA $D404,X
                BNE NOIMPLEX
NORMAL          LDA VDATA+1,Y
                STA $D404,X
NOIMPLEX        
                LDA VDATA+7,Y
                AND #$10
                BEQ NOHAT
                LDA HAT,X
                BEQ CANCELHAT
                DEC HAT,X
VAL             LDA #$50
                STA $D401,X
                LDA #$81
                STA $D404,X
                BNE NOHAT
CANCELHAT       LDA C1NHIGH,X
                STA $D401,X
                LDA VDATA+1,Y
                STA $D404,X
NOHAT           LDA SPEED
                BNE GOFX
                LDA #1
                STA HAT,X
DELAYS2         DEC V1DUR,X
                BMI MAINLOOP
GOFX            JMP CHECKFX
SETPOINTS       LDY TN
                LDA VOICE1L,Y
                STA V1LO
                LDA VOICE1H,Y
                STA V1HI
                LDA VOICE2L,Y
                STA V2LO
                LDA VOICE2H,Y
                STA V2HI
                LDA VOICE3L,Y
                STA V3LO
                LDA VOICE3H,Y
                STA V3HI
                LDA TDATA,Y
                STA TEMPOBYTE
                JMP SETCONT
QUIT            CPX #$0E
                BNE QUIT2
                DEC SPEED
                BPL QUIT2
                LDA TEMPOBYTE
                STA SPEED
QUIT2           
                LDA #$AB
                STA TN
QUIT3           RTS 
MAINLOOP        LDA V1LO,X
                STA POINTS
                LDA V1HI,X
                STA POINTS+1
AGAIN4          LDY BARCOUNT,X
                LDA (POINTS),Y
NOTEND2         TAY 
                LDA BARLO,Y
                STA BARS
                LDA BARHI,Y
                STA BARS+1
                LDA #$FF
                STA GATEBYTE
                LDA #0
                STA V1SLIDE,X
AGAIN           LDY BEATCOUNT,X
                LDA (BARS),Y
                BNE AGAIN3
                JMP PLAYNOTE
AGAIN3          CMP #$FD
                BCC SLIDE
                INY 
                INC BEATCOUNT,X
                LDA (BARS),Y
                JMP PLEXSETUP
REGET           INC BEATCOUNT,X
                BNE AGAIN
SLIDE           CMP #$FB
                BCC NEWVOICE
                CMP #$FB
                BNE SLIDEUP
                LDA #1
SLIDECONT       STA V1SLIDE,X
                INY 
                INC BEATCOUNT,X
                LDA (BARS),Y
                STA SLIDELO,X
                LDA #0
                STA V1PLEX,X
                STA V1VIB,X
                BEQ REGET
SLIDEUP         LDA #$02
                BNE SLIDECONT
NEWVOICE        CMP #$FA
                BCC VIBDELAY
                INY 
                INC BEATCOUNT,X
                LDA (BARS),Y
                ASL A
                ASL A
                ASL A
                STA SOUND,X
                TAY 
                LDA VDATA+6,Y
                AND #$FE
                STA $D404,X
                LDA VDATA,Y
                PHA 
                AND #$0F
                STA V1PULSEHI,X
                STA PWH,X
                PLA 
                AND #$F0
                STA V1PULSELO,X
                STA PWL,X
                LDA VDATA2+6,Y
                PHA 
                AND #$0F
                STA PUCH,X
                PLA 
                AND #$F0
                ROL A
                ROL A
                ROL A
                ROL A
                STA PUCL,X
NOPR            LDA #0
                STA VDELAY,X
                STA V1VIB,X
                STA V1PLEX,X
                BEQ REGET
VIBDELAY        CMP #$F9
                BCC NOTEDUR
                INY 
                INC BEATCOUNT,X
                LDA (BARS),Y
                STA VDELAY,X
                JMP REGET
NOTEDUR         CMP #$70
                BCC PLAYNOTE
                SBC #$70
                STA NEWDUR,X
                JMP REGET
PLAYNOTE        BEQ NOBV
                CLC 
                ADC TP,X
NOBV            STA BARVALUE,X
                LDA NEWDUR,X
                STA V1DUR,X
                LDA #0
                STA DRUM2,X
                LDA #1
                STA IMPLEX,X
                LDA BARVALUE,X
                BEQ PLAYCONT2
                LDY SOUND,X
                LDA VDATA+7,Y
                AND #$02
                BEQ PLAYCONT
                LDA PWL,X
                STA V1PULSELO,X
                LDA PWH,X
                STA V1PULSEHI,X
PLAYCONT        LDA BARVALUE,X
                BNE NOREST
PLAYCONT2       LDA TEMP3,X
                STA BARVALUE,X
                LDA #$00
                STA TEMP3,X
                LDY SOUND,X
                DEC GATEBYTE
                BNE NOPITCH
NOREST          STA TEMP3,X
                TAY 
                LDA NTH,Y
                STA $D401,X
                STA V1HIFREQ,X
                STA C1NHIGH,X
                LDA NTL,Y
                STA $D400,X
                STA V1LOFREQ,X
                STA C1NLOW,X
                LDY SOUND,X
                LDA VDATA+6,Y
                STA $D404,X
                LDA VDATA+2,Y
                STA $D405,X
                LDA VDATA+3,Y
                STA $D406,X
                LDA V1PULSELO,X
                STA $D402,X
                LDA V1PULSEHI,X
                STA $D403,X
                LDA VDELAY,X
                STA VIBD,X
NOPITCH         
                LDA VDATA+1,Y
                AND GATEBYTE
                STA $D404,X
                INC BEATCOUNT,X
                LDY BEATCOUNT,X
                LDA (BARS),Y
                CMP #$FF
                BNE FXSETUP
                LDA #$00
                STA BEATCOUNT,X
                INC BARCOUNT,X
                LDY BARCOUNT,X
                LDA (POINTS),Y
                CMP #$FF
                BNE NOTEND
                LDA #$00
                STA BARCOUNT,X
                BEQ FXSETUP
NOTEND          CMP #$FE
                BNE FXSETUP
                LDA #$5F
                STA FADE
                INC BARCOUNT,X
FXSETUP         
                LDA TEMP3,X
                BEQ CHECKFX
                LDY SOUND,X
                LDA V1SLIDE,X
                BNE ALREADY
                LDA VDATA2+4,Y
                BEQ NOBEND
                STA V1SLIDE,X
                LDA VDATA2+3,Y
                STA SLIDELO,X
ALREADY         JMP SLIDECHECK
NOBEND          
               
VIBCHECK        
               
                LDA VDATA2,Y
                BEQ NOVIB
                JMP VIBSETUP
NOVIB           STA V1VIB,X
                JMP QUIT
CHECKFX                 
                LDA VDATA+4,Y
                STA PTEMP
                BEQ PLEXCHECK
                LDA PMODDIR,X
                BNE PDOWN
                CLC 
                LDA V1PULSELO,X
                ADC PTEMP
                STA V1PULSELO,X
                STA $D402,X
                LDA V1PULSEHI,X
                ADC #$00
                STA V1PULSEHI,X
                STA $D403,X
                CLC 
                CMP PUCH,X
                BCC PLEXCHECK
                INC PMODDIR,X
                BNE PLEXCHECK
PDOWN           LDA V1PULSELO,X
                SEC 
                SBC PTEMP
                STA V1PULSELO,X
                STA $D402,X
                LDA V1PULSEHI,X
                SBC #$00
                STA V1PULSEHI,X
                STA $D403,X
                CLC 
                CMP PUCL,X
                BCS PLEXCHECK
                DEC PMODDIR,X
PLEXCHECK       
                LDA V1PLEX,X
                BEQ VIBUPDATE
                LDA PLEXTEMP,X
                ASL A
                TAY 
                LDA PLEXLH,Y
                STA PLEXADD+1
                LDA PLEXLH+1,Y
                STA PLEXADD+2
                LDA PLEXC,X
                CMP PLEXCOUNT,X
                BNE PLEXCONT
                LDA #$00
                STA PLEXC,X
PLEXCONT        TAY 
                LDA BARVALUE,X
                CLC 
PLEXADD         ADC P0,Y
              
                TAY 
                LDA NTL,Y
                STA $D400,X
                LDA NTH,Y
                STA $D401,X
                INC PLEXC,X
                JMP QUIT
VIBUPDATE       
                LDA V1VIB,X
                BNE OKVIB1
                JMP SLIDECHECK
OKVIB1          LDA VIBD,X
                BEQ OKVIB
                DEC VIBD,X
                JMP SLIDECHECK
OKVIB           LDA VIBDIR,X
                BEQ VIBDOWN1
                CMP #$03
                BCC VIBUP
VIBDOWN         SEC 
                LDA C1NLOW,X
                SBC VIBSTEP,X
                STA C1NLOW,X
                STA $D400,X
                LDA C1NHIGH,X
                SBC #0
                STA C1NHIGH,X
                STA $D401,X
                DEC VIBTEMP,X
                BNE VIBEND1
                LDA VIBTIME,X
                STA VIBTEMP,X
                INC VIBDIR,X
                LDA VIBDIR,X
                CMP #$05
                BCC VIBEND1
                LDA #$01
                STA VIBDIR,X
VIBEND1         JMP QUIT
VIBDOWN1        SEC 
                LDA C1NLOW,X
                SBC VIBSTEP,X
                STA C1NLOW,X
                STA $D400,X
                LDA C1NHIGH,X
                SBC #0
                STA C1NHIGH,X
                STA $D401,X
                DEC VIBTEMP,X
                BNE VIBEND2
                LDA VIBTIME,X
                STA VIBTEMP,X
                INC VIBDIR,X
VIBEND2         JMP QUIT
VIBUP           CLC 
                LDA C1NLOW,X
                ADC VIBSTEP,X
                STA C1NLOW,X
                STA $D400,X
                LDA C1NHIGH,X
                ADC #0
                STA C1NHIGH,X
                STA $D401,X
                DEC VIBTEMP,X
                BNE NODRUMS
                LDA VIBTIME,X
                STA VIBTEMP,X
                INC VIBDIR,X
                BNE NODRUMS
                JMP QUIT
SLIDECHECK      LDA V1SLIDE,X
                BEQ NOMOREFX
                CMP #$01
                BEQ SLIDEDOWN2
                CMP #$02
                BEQ SLIDEUP2
                CMP #$03
                BEQ HIGHDOWN
                CLC 
                LDA C1NHIGH,X
                ADC SLIDELO,X
                STA C1NHIGH,X
                STA $D401,X
                JMP NOMOREFX
SLIDEDOWN2      CLC 
                LDA C1NLOW,X
                SBC SLIDELO,X
                STA C1NLOW,X
                STA $D400,X
                LDA C1NHIGH,X
                SBC #$00
                STA C1NHIGH,X
                STA $D401,X
                JMP NOMOREFX
HIGHDOWN        SEC 
                LDA C1NHIGH,X
                SBC SLIDELO,X
                STA C1NHIGH,X
                STA $D401,X
                JMP NOMOREFX
SLIDEUP2        CLC 
                LDA C1NLOW,X
                ADC SLIDELO,X
                STA C1NLOW,X
                STA $D400,X
                LDA C1NHIGH,X
                ADC #$00
                STA C1NHIGH,X
                STA $D401,X
NOMOREFX        LDY SOUND,X
                LDA VDATA+7,Y
                AND #1
                BEQ NODRUMS
                JMP DRUMMOD2
NODRUMS         JMP QUIT
V1VIB           .BYTE   0
V1PLEX          .BYTE   0
V1SLIDE         .BYTE   0
PUCH            .BYTE   0
PUCL            .BYTE   0
BEATCOUNT       .BYTE   0
PMODDIR         .BYTE   0
                .BYTE   0,0,0,0,0,0,0,0,0,0,0,0,0,0
SLIDELO         .BYTE   0
FADEFLAG        .BYTE   0
NEWDUR          .BYTE   0
SOUND           .BYTE   0
V1PULSELO       .BYTE   0
PWL             .BYTE   0
V1PULSEHI       .BYTE   0
                .BYTE   0,0,0,0,0,0,0,0,0,0,0,0,0,0
PWH             .BYTE   0
PLEXTEMP        .BYTE   0
V1LO            .BYTE   0
V1HI            .BYTE   0
BARCOUNT        .BYTE   0
SEQNUMBER       .BYTE   0
V1DUR           .BYTE   0
                .BYTE   0,0,0,0,0,0,0,0,0,0,0,0,0,0
TRACK           .BYTE   0
PLAYFLAG        .BYTE   0
TEMPOBYTE       .BYTE   2
PTEMP           .BYTE   0
SPEED           .BYTE   0
GATEBYTE        .BYTE   0
C1NLOW          .BYTE   0
V1LOFREQ        .BYTE   0
V1HIFREQ        .BYTE   0
BARVALUE        .BYTE   0
C1NHIGH         .BYTE   0
PLEXCOUNT       .BYTE   0
PLEXC           .BYTE   0
                .BYTE   0,0,0,0,0,0,0,0,0,0,0,0,0,0
VIBDIR          .BYTE   0
VIBSTEP         .BYTE   0
VIBTIME         .BYTE   0
VIBTEMP         .BYTE   0
VIBH            .BYTE   0
VIBL            .BYTE   0
TEMP3           .BYTE   0
                .BYTE   0,0,0,0,0,0,0,0,0,0,0,0,0,0
IMPLEX          .BYTE   0
HAT             .BYTE   0
VDELAY          .BYTE   0
VIBD            .BYTE   0
TP              .BYTE   0
TWAVE           .BYTE   0
DRUM2           .BYTE   0
                .BYTE   0,0,0,0,0,0,0,0,0,0,0,0,0,0
NTL             .BYTE   12,28,45,62,81,102,123,145,169,195
                .BYTE   221,250,24,56,90,125,163,204,246,35
                .BYTE   83,134,187,244,48,112,180,251,71,152
                .BYTE   237,71,167,12,119,233,97,225,104,247
                .BYTE   143,48,218,143,78,24,239,210,195,195
                .BYTE   209,239,31,96,181,30,156,49,223,165
                .BYTE   135,134,162,223,62,193,107,60,57,99
                .BYTE   190,75,15,12,69,191,125,131,214,121
                .BYTE   115,199,124,151,30,24,139,126,250,6
                .BYTE   172,243,230,143,248,46
NTH             .BYTE   1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2
                .BYTE   3,3,3,3,3,4,4,4,4,5,5,5,6,6,7,7,7
                .BYTE   8,8,9,9,10,11,11,12,13,14,14,15,16,17,18
                .BYTE   19,21,22,23,25,26,28,29,31,33,35,37,39,42
                .BYTE   44,47,50,53,56,59,63,67,71,75,79,84,89,94
                .BYTE   100,106,112,119,126,134,142,150,159,168
                .BYTE   179,189,200,212,225,238,253
PLEXLH          .WORD   P0,P1,P2,P3,P4,P5,P6
P0              .BYTE   $07,$03,$00
P1              .BYTE   $09,$05,$00
P2              .BYTE   $08,$03,$00
P3              .BYTE   $18,$0C,$00
P4              .BYTE   $07,$05,$00
P5              .BYTE   $07,$04,$00
P6              .BYTE   $08,$05,$00
                ;DRUM TABLE
DTL             .BYTE   DT&255,BT&255
DTH             .BYTE   DT/256,BT/256
DT              .BYTE   $81,$30,$11,$02,$41,$04
                .BYTE   $80,$30,$80,$15,$80,$20,$80,$10
                .BYTE   $80,$20,$80,$20,$80,$10,$80,$20,$FF
BT              .BYTE   $81,$30,$41,$03,$40,$03,$80,$20
                .BYTE   $80,$10,$80,$20,$80,$10,$80,$20,$FF
SETIRQ          
                SEI 
                LDA #INTER&255
                STA $0314
                LDA #INTER/256
                STA $0315
                LDX #$00
                STX $DC0E
                INX 
                STX $D01A
                CLI 
                RTS 
INTER           LDA #$01
                STA $D019
                LDA #$82
                STA $D012
                LDA #$1B
                STA $D011
                LDA #$01
                STA 53280
                JSR DRIVER
                DEC $D020
                JMP $EA31
;-----------------------------------------------------------------------------
                .TEXT   '(C)1988 MG'             ; CHANGED FROM .BYTE TO .TEXT
;-----------------------------------------------------------------------------

VOLUME          .BYTE   0
VOLTIME         .BYTE   0
TEM2            .BYTE   0
TEM3            .BYTE   5
SPEED2          .BYTE   0
PLEXSETUP       PHA 
                AND #$0F
                STA PLEXTEMP,X
                PLA 
                AND #$F0
                LSR A
                LSR A
                LSR A
                LSR A
                STA PLEXCOUNT,X
                LDA #$00
                STA PLEXC,X
                LDA #1
                STA V1PLEX,X
                LDA #0
                STA V1VIB,X
                JMP REGET
VIBSETUP        STA VIBSTEP,X
                LDA VDATA2+1,Y
                STA VIBTIME,X
                STA VIBTEMP,X
                LDA #0
                ;STA V1PLEX,X
                STA VIBDIR,X
                LDA #1
                STA V1VIB,X
                JMP QUIT
VDATA           .BYTE   $87,$11,$00,$E6,$00,$00,$10,$01
                .BYTE   $31,$41,$00,$ED,$15,$00,$40,$02
                .BYTE   $00,$15,$0F,$00,$00,$00,$14,$00
                .BYTE   $71,$41,$00,$8C,$30,$00,$40,$02
                .BYTE   $F1,$41,$0F,$00,$20,$00,$40,$12
                .BYTE   $00,$00,$00,$00,$00,$00,$00,$00
                .BYTE   $00,$11,$00,$A0,$00,$00,$10,$00
                .BYTE   $87,$81,$00,$E8,$00,$00,$80,$01
                .BYTE   $20,$21,$00,$AD,$00,$00,$20,$00
                .BYTE   $44,$41,$00,$7C,$C0,$00,$40,$02
                .BYTE   $00,$80,$00,$A0,$00,$00,$10,$10
                .BYTE   $C0,$41,$00,$9C,$25,$00,$40,$02
                .BYTE   $C0,$41,$00,$9C,$25,$00,$40,$00
                .BYTE   $00,$11,$0F,$00,$00,$00,$10,$00
                .BYTE   $00,$11,$0F,$00,$00,$00,$10,$00
                .BYTE   $F0,$41,$0B,$00,$30,$00,$40,$02
                .BYTE   $31,$41,$00,$8C,$A0,$00,$40,$02
                .BYTE   $00,$21,$00,$8C,$00,$00,$20,$00
VDATA2          .BYTE   $00,$00,$81,$00,$00,$01,$8E,$00
                .BYTE   $00,$00,$81,$00,$00,$00,$8E,$00
                .BYTE   $00,$00,$81,$00,$00,$00,$8E,$00
                .BYTE   $00,$00,$81,$00,$00,$00,$46,$00
                .BYTE   $00,$00,$81,$00,$00,$00,$33,$00
                .BYTE   $00,$00,$00,$00,$00,$00,$8E,$00
                .BYTE   $00,$00,$81,$00,$00,$00,$8E,$00
                .BYTE   $00,$00,$41,$00,$00,$00,$8E,$00
                .BYTE   $00,$00,$81,$00,$00,$00,$8E,$00
                .BYTE   $90,$02,$81,$00,$00,$00,$35,$00
                .BYTE   $00,$00,$81,$00,$00,$00,$8E,$00
                .BYTE   $90,$02,$81,$00,$00,$00,$27,$00
                .BYTE   $90,$02,$81,$00,$00,$00,$27,$00
                .BYTE   $00,$00,$81,$B3,$03,$00,$8E,$00
                .BYTE   $FF,$08,$81,$00,$00,$00,$86,$00
                .BYTE   $00,$00,$81,$00,$00,$00,$8C,$00
                .BYTE   $80,$02,$81,$00,$00,$00,$8C,$00
                .BYTE   $90,$02,$81,$00,$00,$00,$8C,$00
BARLO           .BYTE   T0&255,T1&255,T2&255,T3&255,T4&255,T5&255
                .BYTE   T6&255,T7&255,T8&255,T9&255,T10&255
                .BYTE   T11&255,T12&255,T13&255,T14&255,T15&255
                .BYTE   T16&255,T17&255,T18&255,T19&255,T20&255,T21&255
                .BYTE   T22&255,T23&255,T24&255,T25&255,T26&255
                .BYTE   T27&255,T28&255,T29&255,T30&255,T31&255
                .BYTE   T32&255,T33&255
                .BYTE   T34&255,T35&255,T36&255,T37&255
                .BYTE   T38&255,T39&255
                .BYTE   T40&255,T41&255,T42&255,T43&255
                .BYTE   T44&255,T45&255
                .BYTE   T46&255,T47&255,T48&255
                .BYTE   T49&255,T50&255,T51&255
                .BYTE   T52&255,T53&255,T54&255,T55&255,T56&255
BARHI           .BYTE   T0/256,T1/256,T2/256,T3/256,T4/256,T5/256
                .BYTE   T6/256,T7/256,T8/256,T9/256,T10/256
                .BYTE   T11/256,T12/256,T13/256,T14/256,T15/256
                .BYTE   T16/256,T17/256,T18/256,T19/256,T20/256,T21/256
                .BYTE   T22/256,T23/256,T24/256,T25/256,T26/256
                .BYTE   T27/256,T28/256,T29/256,T30/256,T31/256
                .BYTE   T32/256,T33/256
                .BYTE   T34/256,T35/256,T36/256,T37/256
                .BYTE   T38/256,T39/256
                .BYTE   T40/256,T41/256,T42/256,T43/256
                .BYTE   T44/256,T45/256
                .BYTE   T46/256,T47/256,T48/256
                .BYTE   T49/256,T50/256,T51/256
                .BYTE   T52/256,T53/256,T54/256,T55/256,T56/256
VOICE1L         .BYTE   0,TUNE1&255,OVER1&255,FIN1&255
VOICE1H         .BYTE   0,TUNE1/256,OVER1/256,FIN1/256
VOICE2L         .BYTE   0,TUNE2&255,OVER2&255,FIN2&255
VOICE2H         .BYTE   0,TUNE2/256,OVER2/256,FIN2/256
VOICE3L         .BYTE   0,TUNE3&255,OVER3&255,FIN3&255
VOICE3H         .BYTE   0,TUNE3/256,OVER3/256,FIN3/256
DRUMMOD2        LDA POINTS
                PHA 
                LDA POINTS+1
                PHA 
                LDA VDATA2+5,Y
                TAY 
                LDA DTL,Y
                STA POINTS
                LDA DTH,Y
                STA POINTS+1
                LDY DRUM2,X
                LDA (POINTS),Y
                BPL DSTAGE2
                CMP #$FF
                BEQ DEND
DSTAGE3         STA $D404,X
                INY 
                INC DRUM2,X
                LDA (POINTS),Y
                STA $D401,X
                INY 
                INC DRUM2,X
                BNE DEND
DSTAGE2         STA TWAVE,X
                INY 
                INC DRUM2,X
                SEC 
                LDA C1NHIGH,X
                SBC (POINTS),Y
                STA C1NHIGH,X
                INY 
                INC DRUM2,X
DEND2           LDA TWAVE,X
                STA $D404,X
                LDA C1NHIGH,X
                STA $D401,X
DEND            PLA 
                STA POINTS+1
                PLA 
                STA POINTS
                JMP QUIT
TDATA           .BYTE   0,5,3,4
TUNE1           .BYTE   5,5,7,7,7,7,14,14,14,14,14,14,14,17
                .BYTE   15,15,15,15,15,15,15,20,16,18,16,18,16,18,16,19
                .BYTE   16,18,16,18,16,18,16,18
                .BYTE   16,18,16,19,16,18,16,18
                .BYTE   16,18,16,18,16,18,16,18,16,18,16,22
                .BYTE   24,24,24,24,24,24,24,24,27,27,27,27,27,27,27,27
                .BYTE   16,18,16,18,16,18,16,22,27,27,27,27,27,27,27,27
                .BYTE   27,27,27,27,27,27,27,22
                .BYTE   27,27,27,27,27,27,27,22
                .BYTE   27,27,27,27,27,27,27,22
                .BYTE   27,27,27,27,27,27,27,22
                .BYTE   16,18,16,18,16,18,16,18
                .BYTE   15,34,15,34,15,34,15,22
                .BYTE   15,34,15,34,15,34,15,22
                .BYTE   15,34,15,34,15,34,15,22,$FF
TUNE2           .BYTE   6,10,10
                .BYTE   11,11,11,11,12,12,12,12,11,11,11,11,13,13,13,13
                .BYTE   11,11,11,11,12,12,12,12,11,11,11,11,13,13,13,13
                .BYTE   11,11,11,11,12,12,12,12,11,11,11,11,13,13,13,13
                .BYTE   11,11,11,11,12,12,12,12,11,11,11,11,13,13,13,13
                .BYTE   11,11,11,11,12,12,12,12,11,11,11,11,13,13,13,13
                .BYTE   11,11,11,11,12,12,12,12,11,11,11,11,13,13,13,13
                .BYTE   5,10,10,1,3,1,4,1,3,1,4,1,3,1,4,1,3,1,4
                .BYTE   1,3,1,4,1,3,1,4,1,3,1,4,1,3,1,4,1,3,1,4,1,3,21
                .BYTE   11,11,11,11,12,12,12,12,11,11,11,11,13,13,13,13
                .BYTE   11,11,11,11,12,12,12,12,11,11,11,11,13,13,13,13
                .BYTE   11,11,11,11,12,12,12,12,11,11,11,11,13,13,13,13
                .BYTE   26,26,30,30,30,30,33,33,35,36,38,39,37,37,37,37
                .BYTE   40,40,41,41,42,42,43,43
                .BYTE   40,40,41,41,42,42,43,43,44
                .BYTE   40,40,41,41,42,42,43,43
                .BYTE   40,40,41,41,42,42,43,43,44,44,$FF
TUNE3           .BYTE   8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,9,8,9,8,9,8,9
                .BYTE   8,9,8,9,8,9,8,9,8,8,8,8,8,8,8,8,1,3,1,4,1,3,1,4
                .BYTE   1,3,1,4,1,3,1,4,1,3,1,4,1,3,1,4
                .BYTE   1,3,1,4,1,3,1,4,1,3,1,4,1,3,1,4
                .BYTE   1,3,1,4,1,3,1,4,1,3,1,4,1,3,1,4,25,23
                .BYTE   1,3,1,4,1,3,1,4,1,3,1,4,1,3,1,4
                .BYTE   28,29,28,29,28,29,28,29,28,29,28,29,28,29,28,29
                .BYTE   28,31,32,29,28,31,32,29
                .BYTE   28,31,32,29,28,31,32,29
                .BYTE   28,31,32,29,28,31,32,29
                .BYTE   28,31,32,29,28,31,32,29
                .BYTE   28,31,32,29,28,31,32,29
                .BYTE   28,31,32,29,28,31,32,29
                .BYTE   28,31,32,29,28,31,32,29
                .BYTE   28,31,32,29,28,31,32,29
                .BYTE   45,45,45,45,45,45,45,45,$FF
T0              .BYTE   $AF,$FA,$05,$00,$FF
T1              .BYTE   $FA,$04,$71,D2,D2,$70,F2,D2,F2,$71,G2,G2,$70,G2
                .BYTE   $FF
T3              .BYTE   $71,A2,F2,$FF
T6              .BYTE   $FA,$02,$EF,$FC,$0A,AS3,$FB,$0A,AS4,$FF
T2              .BYTE   $7F,$FA,$05,$00,$FF
T4              .BYTE   $71,A1,C2,$FF
T5              .BYTE   $FA,$01,$AF,D1,0,$FF
T7              .BYTE   $FA,$01,$7F,D1,G1,D1,G1,$FF
T8              .BYTE   $FA,$04,$71,D2,D2,D2,$70,D2,D2,$71,D2,D2,D2,$70
                .BYTE   D2,D2,$FF
T9              .BYTE   $FA,$04,$71,G2,G2,G2,$70,G2,G2,$71,G2,G2,G2,$70
                .BYTE   G2,G2,$FF
T10             .BYTE   $FA,$03,$FD,$30,$77,D5,0
                .BYTE   $FD,$31,D5,0,$FD,$30,D5,0,$FD,$32,B4,0,$FF
T11             .BYTE   $FA,$06,$FD,$33,$70,A4,F4,D4,F4,$FF
T12             .BYTE   $FA,$06,$FD,$33,$70,B4,G4,D4,G4,$FF
T13             .BYTE   $FA,$06,$FD,$33,$70,G4,D4,B3,D4,$FF
T14             .BYTE   $FA,$00,$73,C4,C4,C4,C4,$FF
T15             .BYTE   $FA,$00,$73,C4,$FA,$07,D4,$FA,$00,C4,$FA,$07,D4
                .BYTE   $FF
T16             .BYTE   $FA,$00,$71,C4,$FA,$06,$FD,$34,D6
                .BYTE   $FA,$07,D4,$FA,$06,$FD,$34,D6
                .BYTE   $FA,$00,C4,$FA,$06,$FD,$34,D6
                .BYTE   $FA,$07,D4,$FA,$06,$FD,$34,D6,$FF
T17             .BYTE   $FA,$00,$73,C4,C4,$71,C4,$FA,$07,$71,D4,D4,$70
                .BYTE   D4,D4,$FF
T18             .BYTE   $FA,$00,$71,C4,$FA,$06,$FD,$30,D6
                .BYTE   $FA,$07,D4,$FA,$06,$FD,$30,D6
                .BYTE   $FA,$00,C4,$FA,$06,$FD,$30,D6
                .BYTE   $FA,$07,D4,$FA,$06,$FD,$30,D6,$FF
T19             .BYTE   $FA,$00,$71,C4,$FA,$06,$FD,$30,D6
                .BYTE   $FA,$07,D4,$FA,$06,$FD,$30,D6
                .BYTE   $FA,$00,C4,$FA,$06,$FD,$30,D6
                .BYTE   $FA,$07,$70,D4,D4,D4,D4,$FF
T20             .BYTE   $FA,$00,$73,C4,$FA,$07,D4,$FA,$00,$71,C4
                .BYTE   $FA,$07,$70,D4,D4,$71,D4,$70,D4,D4,$FF
T21             .BYTE   $FA,$04,$71,D2,D2,$70,D2,D2,D2,$71,F2,F2
                .BYTE   $70,F2,$71,G2,G2,$FF
T22             .BYTE   $FA,$07,$71,D4,D4,$70,D4,D4,D4,$71,D4,D4
                .BYTE   $70,D4,$71,D4,D4,$FF
T23             .BYTE   $FA,$04,$71,D3,D3,$70,D3,D3,D3,$71,F3,F3
                .BYTE   $70,F3,$71,G3,G3,$FF
T24             .BYTE   $FA,$00,$71,C4,C4,$70,C4,C4,C4,$71,C4,C4,$70,C4
                .BYTE   $71,C4,C4,$FF
T25             .BYTE   $FA,$02,$EF,$FC,$0A,AS4,$DF,$FB,$0A,AS5,$FF
T26             .BYTE   $FA,$09,$F9,$08,$72,A4,D5,F5,A5,$71,F5,A5
                .BYTE   $72,B5,G5,D5,B4,$71,A4,G4,$FF
T27             .BYTE   $FA,$00,$71,C4,C4
                .BYTE   $FA,$07,$71,D4
                .BYTE   $FA,$00,$70,C4,$71,C4,C4,$70,C4
                .BYTE   $FA,$07,$71,D4
                .BYTE   $FA,$00,C4,$FF
T28             .BYTE   $FA,$04,$70,D2,D2,D2,D2,D3,D3,D2,D2,D3,D3
                .BYTE   D2,D2,C3,B2,C3,D3,$FF
T29             .BYTE   $FA,$04,$70,G2,G2,G2,G2,G3,G3,G2,G2,G3,G3
                .BYTE   G2,G2,F3,E3,F3,G3,$FF
T30             .BYTE   $FA,$01,$7F,D2,G2,$FF
T31             .BYTE   $FA,$04,$70,F2,F2,F2,F2,F3,F3,F2,F2,F3,F3
                .BYTE   F2,F2,DS3,D3,DS3,F3,$FF
T32             .BYTE   $FA,$04,$70,C2,C2,C2,C2,C3,C3,C2,C2,C3,C3
                .BYTE   C2,C2,AS2,A2,AS2,C3,$FF
T33             .BYTE   $FA,$03,$77,$FD,$30,D5,0,$FD,$31,C5,0,$FD,$35,C5
                .BYTE   0,$FD,$32,B4,0,$FF
T34             .BYTE   $FA,$00,$73,C4,$FA,$07,D4,$FA,$00,C4,$72,$FA,$07
                .BYTE   D4,$70,D4,$FF
T35             .BYTE   $FA,$0B,$F9,$0A,$75,D4,E4,$73,F4
                .BYTE   $75,A4,G4,$73,F4
                .BYTE   $75,E4,F4,$73,G4
                .BYTE   $77,D4,0,$FF
T36             .BYTE   $FA,$0B,$F9,$0A,$75,D4,E4,$73,F4
                .BYTE   $75,A4,G4,$73,F4
                .BYTE   $75,D5,C5,$73,B4
                .BYTE   $77,B4,0,$FF
T37             .BYTE   $FA,$0C,$F9,$0A,$77,C4,$FC,$0B,C4
                .BYTE   D4,$FB,$0B,D4,$FF
T38             .BYTE   $FA,$0B,$F9,$0A,$75,D5,C5,$73,D5
                .BYTE   $75,F5,D5,$73,F5
                .BYTE   $75,G5,F5,$73,E5
                .BYTE   $77,D5,0,$FF
T39             .BYTE   $FA,$0B,$F9,$0A,$75,D5,C5,$73,D5
                .BYTE   $75,F5,D5,$73,F5
                .BYTE   $75,C6,B5,$73,G5
                .BYTE   $7B,G5,$73,$FB,$90,G5,$FF
T40             .BYTE   $FA,$0B,$FD,$33,$71,F4,D4,A3,D4,$FF
T41             .BYTE   $FA,$0B,$FD,$33,$71,F4,C4,A3,C4,$FF
T42             .BYTE   $FA,$0B,$FD,$33,$71,E4,C4,G3,C4,$FF
T43             .BYTE   $FA,$0B,$FD,$33,$71,D4,B3,G3,B3,$FF
T44             .BYTE   $FA,$0D,$AF,D5,$FA,$0E,D5,$FF
T45             .BYTE   $FA,$0A,$70,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,$FF
OVER1           .BYTE   46,$FE,0,0
OVER2           .BYTE   47,0,0
OVER3           .BYTE   48,0,0
T46             .BYTE   $FA,$01,$77,C1,G1,DS1,AS1,$70,F1,$EE,0,$FF
T47             .BYTE   $FA,$0B,$77,$FD,$36,G5,$FD,$34,G5,$FD,$32,G5
                .BYTE   $FD,$31,F5,$FD,$35,$77,F5,$97,0,$FF
T48             
                .BYTE   $FA,$09,$77,$FD,$36,G4,$FD,$34,G4,$FD,$32,G4
                .BYTE   $FD,$31,F4,$FD,$35,$77,F4,$E7,0,$FF
FIN1            .BYTE   49,49,49,49,49,49,56,56,49,49,$FE,49,49,49,49,49
                .BYTE   49,49
FIN2            .BYTE   50,51,52,53,$FF
FIN3            .BYTE   56,54,54,55,$FE,54,56
T49             .BYTE   $FA,$00,$73,A3,$FA,$07,$71,D4
                .BYTE   $FA,$00,$73,A3,$71,A3,$FA,$07,$73,D4
                .BYTE   $FA,$00,$72,A3,$70,A3,$71,$FA,$07,D4
                .BYTE   $FA,$00,$73,A3,$71,A3,$FA,$07,D4,D4,$FF
T50             
                .BYTE   $FA,$0F,$71,C2,C3,C3,C2,C3,C2,G2,AS2,$FF
T51             .BYTE   AS1,AS2,AS2,AS1,AS2,AS1,F1,G1,$FF
T52             .BYTE   DS2,DS3,DS3,DS2,DS3,DS2,AS1,C2,$FF
T53             .BYTE   F2,F3,F3,F2,F3,F2,C2,D2,$FF
T54             .BYTE   $FA,$10,$F9,$0A,$75,C5,D5,$73,DS5
                .BYTE   $75,F5,DS5,$73,D5
                .BYTE   $75,DS5,D5,$73,AS4
                .BYTE   $77,AS4,A4
                .BYTE   $75,C5,D5,$73,DS5
                .BYTE   $75,F5,DS5,$73,D5
                .BYTE   $75,DS5,D5,$73,AS4
                .BYTE   $77,C5,0,$FF
T55             .BYTE   $FA,$11,$F9,$10,$75,C5,D5,$73,DS5
                .BYTE   $75,F5,DS5,$73,D5
                .BYTE   $75,DS5,D5,$73,AS4
                .BYTE   $77,AS4,A4
                .BYTE   $75,C5,D5,$73,DS5
                .BYTE   $75,F5,DS5,$73,D5
                .BYTE   $75,DS5,D5,$73,AS4
                .BYTE   $77,C5,$77,0,$FF
T56             .BYTE   $FA,$06,$7F,$FD,$36,G4,$FD,$31,F4
                .BYTE   $FD,$32,G4,$FD,$35,F4,$FF
E               .BYTE   0
