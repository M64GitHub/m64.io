████████████████████████████████████████████████████    ████████████████████
██                  ██                ██          ██    ██      ██        ██
██                  ██                ██          ██    ██      ██        ██
██                  ██                ██          ██    ██      ██        ██
██        ██        ██████        ██████          ████████      ██        ██
██                  ██                ██                ██                ██
██                  ██                ██                ██                ██
██        ████████████                ██                ██                ██
██        ██        ██                ██                ██                ██
████████████        ████████████████████████████████████████████████████████

                   a terminal demo prompted into existence
               ASSEMBLY 2026  ·  AI Coding (Vibe Demo)  ·  m64


WHAT THIS IS
────────────

  An AI's love letter to the demoscene - a real-time demo that runs
  entirely in a text terminal.

  Every pixel is an ANSI character. No OpenGL, no framework, no game
  engine, no video player: 177 x 49 characters become 177 x 98 pixels,
  sixty times a second, for exactly five minutes.


IN THE ZIP
──────────

  pxlv-linux            the demo, x86_64 Linux (the compo PC)
  pxlv-apple-silicon    the demo, Apple Silicon macOS
  pxlv-screenshot.png   a screenshot
  pxlv-1080p60.mp4      video recording (from individual frames,
                        100% smooth)
  readme.txt            this file
  FILE_ID.DIZ           the short form, as tradition demands


HOW TO RUN
──────────

  Fullscreen terminal (F11), then: ./pxlv-linux

  Needs at least 177 x 49 characters - the demo checks, and tells you.
  Keyboard only; ESC quits. It runs exactly 5:00 and exits by itself.
  One self-contained binary, about 13 MB, with the soundtrack
  "Pixel Surge" embedded as mp3 - no install, no assets folder, no
  dependencies. Copy it and run it.

  Note: the demo adapts to the terminal size, and was built for 
  16:9 - 177x49 chars. You can increase the font size for the intended 
  experience. 
  With 49 lines you get the full height (witdh adapts).


AI TOOLS USED
─────────────

  CLAUDE CODE  (Anthropic - Opus 4.8, Opus 5, Fable 5)
      Wrote 100% of this demo's code: every scene, every effect, the
      director and timeline, the fonts, the texts - 39,713 lines of
      Zig, in 782 prompts across 82 sessions. Not autocompleted:
      co-directed. m64 said what he wanted and judged what came back;
      Claude designed and wrote it.

  SUNO 4.5
      The soundtrack "Pixel Surge" - from this ONE prompt:

      "Chiptune EDM with Game Boy and Commodore 64 colors, driving
       four-on-the-floor pulse and syncopated arps; verse section
       rides nimble 8-bit lead motifs over PWM bass and tight kick,
       pre-drop strips to filtered pulses and rising noise, chorus
       hits with wide detuned brass-synth stabs and octave leaps,
       final drop slams with layered arps, pitch bends, and a
       last-hit stop, Bright, punchy, high-voltage mix with crisp
       sidechain pump and retro sparkle, chiptune, edm"

      Suno returned 5:40 at 140 BPM; we cut 40 seconds by hand in
      Propellerhead Reason (a DAW) — to exactly 5:00, which is
      exactly 700 beats. (Suno Pro; full rights.)

  NOT AI - written by hand, by m64:
      movy, the terminal graphics engine this runs on (15,673 lines
      of Zig, 210 commits, no AI); the direction; the pixel art; and
      every decision about what stayed in.

  So: the machine wrote the demo, on an engine a human built for it.
  That felt like the right way around.


HOW IT IS MADE
──────────────

  Zig 0.15.2. The renderer is movy's: a float framebuffer with a
  second, persistent glow buffer that blurs and decays every frame -
  which is where the bloom and the neon trails come from, for free.
  Pixels are half-block characters, so one cell is two pixels and the
  aspect comes out square. Output is a hand-rolled dirty-row ANSI
  writer that only repaints what changed - that is what makes 60 fps
  in a terminal possible at all. Everything is a pure function of the
  beat: the demo plays identically every time it is executed.

  55,386 lines of Zig, engine included. All of it in this room.


CREDITS
───────

  code . . . . . . . . . . Claude Code (Anthropic)
  music  . . . . . . . . . Suno 4.5
  engine, direction,
  pixel art, arrangement . m64

  PXLV logo 1 visually inspired by Dragon ^ Death Sector /
  Heineken, 1990.

---

                        m64.overdrive@gmail.com

              we came in neon and gratitude. thank you
                      for forty years of pixels.
