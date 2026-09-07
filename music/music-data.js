/* m64 — music data (the live site). One entry per album; every track carries a `src`
   (audio URL, relative to this folder). Canonical copy lives in m64-core
   (projects/movy-effects.md → Soundtrack; preview/music-data.js) — change it there first.

   accent: cyan | magenta | amber | violet | green | blue
   track:  { t: "Title", d: "m:ss", src: "file.mp3" }                                   */
window.M64_MUSIC = {
  albums: [
    {
      id: 'pixel-love',
      title: 'PIXEL LOVE — Demo Soundtrack',
      cover: 'PIXEL\nLOVE',
      artist: 'm64 × Suno',
      year: 2026,
      accent: 'magenta',
      gear: ['Suno 4.5', 'Reason', '140 BPM'],
      links: [{ label: 'the demo → m64.io/pxlv', href: '../pxlv/' }],
      desc: 'The soundtrack of PIXEL LOVE — the terminal demo that placed 4th at Assembly 2026. "Pixel Surge" came from Suno 4.5, from one prompt: chiptune EDM with Game Boy and Commodore 64 colors. Suno returned 5:40 at 140 BPM; the demo runs on a 5:00 cut of it, every effect locked to the beat. This is the full track, uncut.',
      tracks: [
        { t: 'Pixel Surge', d: '5:40', src: 'pixel-surge.mp3' }
      ]
    }
  ]
};
