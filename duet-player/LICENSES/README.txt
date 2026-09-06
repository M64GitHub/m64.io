DUET — the web player: what is in this directory, and under what licence
========================================================================

Everything the page loads is listed here. Two things carry their full
legal text beside this file because their licences ask for it; the rest
is named with the address of its text.


THE ENGINE — duet.wasm
----------------------
GPL-2.0-or-later.  Full text: GPL-2.0.txt (beside this file).

duet.wasm is libduet, the DUET engine, compiled for the browser. It
contains reSID by Dag Lem (GPL-2.0-or-later) — the 6581/8580 emulation
that makes the SID voices real — so the module as a whole is a GPL work
and so is any page that links it.  Source: the DUET repository.

The page itself (index.html, duet-player.js, duet-worklet.js) is part of
the same repository and the same licence.


THE FONT — JetBrainsMono-Regular.ttf
------------------------------------
SIL Open Font License 1.1.  Full text: OFL-1.1.txt (beside this file,
and OFL.txt beside the font itself).  (c) 2020 The JetBrains Mono
Project Authors.  https://github.com/JetBrains/JetBrainsMono


THE MUSIC — songs/
------------------
Every song ships with its author, its licence and where it came from.
The machine-readable list is songs.json; the prose, file by file, is
songs/MANIFEST.md.  In short:

  songs/swm/   The SID-Wizard example modules, by Hermit (Mihaly
               Horvath) and the musicians credited inside each file.
               WTF licence — see SID-Wizard-WTFPL.txt beside this file.
               https://csdb.dk/release/?id=137580

  songs/duet/  DUET's own demonstration songs (m64 and Claude), part of
               the DUET repository: GPL-2.0-or-later, GPL-2.0.txt.

  songs/it/    Impulse Tracker modules by other musicians, taken from
               The Mod Archive, each one carrying a licence deed that
               allows redistribution:

                 Public Domain  https://modarchive.org/index.php?faq-licensing
                 CC0 1.0        https://creativecommons.org/publicdomain/zero/1.0/
                 CC BY 3.0      https://creativecommons.org/licenses/by/3.0/

               The CC BY songs are redistributed unmodified, with the
               author, the licence and the source page named in
               songs.json, in songs/MANIFEST.md, and in the page's own
               file list.  No song here has been altered in any way.

If you are a musician listed here and want your song taken out, say so
and it goes — no argument, no delay.
