# Pan Docs — audio section (raw, provenance note)

Source: Pan Docs, the gbdev community's Game Boy hardware reference — https://gbdev.io/pandocs/ — repository https://github.com/gbdev/pandocs. The three files here are the Markdown sources `src/Audio.md`, `src/Audio_Registers.md` and `src/Audio_details.md`, copied verbatim from the `master` branch on 2026-08-30 (repository head fe246067, 2026-06-09; the files were last changed on 2025-06-30, 2025-10-17 and 2025-07-03). Rendered pages: https://gbdev.io/pandocs/Audio.html, https://gbdev.io/pandocs/Audio_Registers.html, https://gbdev.io/pandocs/Audio_details.html.

License: CC0 1.0 Universal (public domain) — see the repository's LICENSE.

Format notes: mdBook Markdown. `{{#include imgs/…svg}}` pulls in diagrams and `{{#bits …}}` renders register bit-field figures; neither is included here (the register bit layouts are readable from the `{{#bits}}` lines themselves). `:::warning` / `:::tip` blocks are admonitions; the duty-cycle table in Audio_Registers.md carries inline SVG waveforms; MathML is used for formulas.
