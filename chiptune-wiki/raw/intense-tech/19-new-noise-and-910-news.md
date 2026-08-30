RAW: Intense Tech with Defense Mech — New Noise and 9.1.0 News! (2021-01-17) | https://defensemech.com/intense-tech/en/19-new-noise-and-910-news.md.html | fetched 2026-08-30 | Markdeep body of the page (HTML head, footer script and media files stripped; video/image links left as-is) | CC BY-NC-SA 4.0

  <body id="md" style="line-height: 140% !important;">
  <markdeep>
  <div class="title">Intense Tech with Defense Mech – New Noise and 9.1.0 News!</div>
  <div class="afterTitles"></div>
-Posted January 17th, 2021 by [DEFENSE MECHANISM](https://defensemech.com)

<p></p>

Hello and welcome to another edition of Intense Tech! In this article, we'll talk about the changes 
in the recently-released version 9.1.0 of LSDj! This version is exciting, although it does include 
some changes that will potentially break the noise instruments in your existing songs. In order to 
prepare you for the changes, let's take a closer look!

---------------
Channel Changes
---------------

If you've ever thought the LSDj noise channel was confusing, you are not alone! Even though I 
previously wrote an [article explaining its inner 
workings](https://defensemech.com/intense-tech/en/17-the-joys-of-noise.md.html), it was not enough 
to demystify its strange behavior.  Clearly, the usability could be improved, and this prompted a 
reorganization of the entire noise channel for version 9.1.0. The new organization places all noise 
notes in order of frequency: first, the long-loop noises are ordered lowest to highest from notes 
`00` to `3B`.  Above that, the short-loop notes are organized lowest to highest, from octaves -9 
(negative 9) to 8, using note names to represent the notes that each frequency most closely matches 
(C, D, F, and G#). Each octave from -9 through 4 contains these four notes; octaves 5 through 8 only 
contain the note C (except for an extra F in octave 5).

![The noise channel uses notes again, but this time they are **actual 
notes!**](../media/noisenotes-1610903754.mp4)

If you load up an existing song or save file into version 9.1.0, your noise notes will be 
automatically converted -- however, any transpose or S command values will not. As a result, I've 
devised this handy noise converter if you are interested in manually changing the values in the 
noise channel phrases or tables. (You can also [find this converter without the article 
here](https://defensem3ch.github.io/noise-convert).)
  </markdeep>
  <table>
      <tr>
        <td>Old noise value:</td>
        <td>
          <input
            type="text"
            value=""
            name="oldNoise"
            id="oldNoise"
            maxlength="2"
            style="width: 30px;"
          />
        </td>
        <td>New noise value:</td>
        <td><label id="newNoise"></label></td>
      </tr>
      <tr>
        <td>
          Old S cmd or TSP:
        </td>
        <td>
          <input
            type="text"
            value=""
            name="oldScmd"
            id="oldScmd"
            maxlength="2"
            style="width: 30px;"
          />
        </td>
        <td>New S cmd or TSP:</td>
        <td><label id="newScmd"></label></td>
      </tr>
      <tr>
        <td>Old final value:</td>
        <td><label id="oldFinal"></label></td>
        <td>New final value:</td>
        <td><label id="newFinal"></label></td>
      </tr>
    </table>
<script charset="utf-8">
      const newNoiseArr = [
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "unused",
        "D-9",
        "F-9",
        "G#-9",
        "C-8",
        "F-8",
        "C-7",
        "C-6",
        "C-5",
        "00",
        "01",
        "02",
        "03",
        "05",
        "07",
        "0B",
        "0F",
        "D-8",
        "F-8",
        "G#-8",
        "C-7",
        "F-7",
        "C-6",
        "C-5",
        "C-4",
        "04",
        "05",
        "06",
        "07",
        "09",
        "0B",
        "0F",
        "13",
        "D-7",
        "F-7",
        "G#-7",
        "C-6",
        "F-6",
        "C-5",
        "C-4",
        "C-3",
        "08",
        "09",
        "0A",
        "0B",
        "0D",
        "0F",
        "13",
        "17",
        "D-6",
        "F-6",
        "G#-6",
        "C-5",
        "F-5",
        "C-4",
        "C-3",
        "C-2",
        "0C",
        "0D",
        "0E",
        "0F",
        "11",
        "13",
        "17",
        "1B",
        "D-5",
        "F-5",
        "G#-5",
        "C-4",
        "F-4",
        "C-3",
        "C-2",
        "C-1",
        "10",
        "11",
        "12",
        "13",
        "15",
        "17",
        "1B",
        "1F",
        "D-4",
        "F-4",
        "G#-4",
        "C-3",
        "F-3",
        "C-2",
        "C-1",
        "C 0",
        "14",
        "15",
        "16",
        "17",
        "19",
        "1B",
        "1F",
        "23",
        "D-3",
        "F-3",
        "G#-3",
        "C-2",
        "F-2",
        "C-1",
        "C 0",
        "C 1",
        "18",
        "19",
        "1A",
        "1B",
        "1D",
        "1F",
        "23",
        "27",
        "D-2",
        "F-2",
        "G#-2",
        "C-1",
        "F-1",
        "C 0",
        "C 1",
        "C 2",
        "1C",
        "1D",
        "1E",
        "1F",
        "21",
        "23",
        "27",
        "2B",
        "D-1",
        "F-1",
        "G#-1",
        "C 0",
        "F 0",
        "C 1",
        "C 2",
        "C 3",
        "20",
        "21",
        "22",
        "23",
        "25",
        "27",
        "2B",
        "2F",
        "D 0",
        "F 0",
        "G# 0",
        "C 1",
        "F 1",
        "C 2",
        "C 3",
        "C 4",
        "24",
        "25",
        "26",
        "27",
        "29",
        "2B",
        "2F",
        "33",
        "D 1",
        "F 1",
        "G# 1",
        "C 2",
        "F 2",
        "C 3",
        "C 4",
        "C 5",
        "28",
        "29",
        "2A",
        "2B",
        "2D",
        "2F",
        "33",
        "37",
        "D 2",
        "F 2",
        "G# 2",
        "C 3",
        "F 3",
        "C 4",
        "C 5",
        "C 6",
        "2C",
        "2D",
        "2E",
        "2F",
        "31",
        "33",
        "37",
        "39",
        "D 3",
        "F 3",
        "G# 3",
        "C 4",
        "F 4",
        "C 5",
        "C 6",
        "C 7",
        "30",
        "31",
        "32",
        "33",
        "35",
        "37",
        "39",
        "3A",
        "D 4",
        "F 4",
        "G# 4",
        "C 5",
        "F 5",
        "C 6",
        "C 7",
        "C 8",
        "34",
        "35",
        "36",
        "37",
        "38",
        "39",
        "3A",
        "3B",
      ];
      const orderedNewNoiseArr = [
        "00",
        "01",
        "02",
        "03",
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "0A",
        "0B",
        "0C",
        "0D",
        "0E",
        "0F",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "1A",
        "1B",
        "1C",
        "1D",
        "1E",
        "1F",
        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",
        "27",
        "28",
        "29",
        "2A",
        "2B",
        "2C",
        "2D",
        "2E",
        "2F",
        "30",
        "31",
        "32",
        "33",
        "34",
        "35",
        "36",
        "37",
        "38",
        "39",
        "3A",
        "3B",
        "D-9",
        "F-9",
        "G#-9",
        "C-8",
        "D-8",
        "F-8",
        "G#-8",
        "C-7",
        "D-7",
        "F-7",
        "G#-7",
        "C-6",
        "D-6",
        "F-6",
        "G#-6",
        "C-5",
        "D-5",
        "F-5",
        "G#-5",
        "C-4",
        "D-4",
        "F-4",
        "G#-4",
        "C-3",
        "D-3",
        "F-3",
        "G#-3",
        "C-2",
        "D-2",
        "F-2",
        "G#-2",
        "C-1",
        "D-1",
        "F-1",
        "G#-1",
        "C 0",
        "D 0",
        "F 0",
        "G# 0",
        "C 1",
        "D 1",
        "F 1",
        "G# 1",
        "C 2",
        "D 2",
        "F 2",
        "G# 2",
        "C 3",
        "D 3",
        "F 3",
        "G# 3",
        "C 4",
        "D 4",
        "F 4",
        "G# 4",
        "C 5",
        "F 5",
        "C 6",
        "C 7",
        "C 8",
      ];
      const oldNoise = document.getElementById("oldNoise");
      const oldScmd = document.getElementById("oldScmd");
      const oldFinal = document.getElementById("oldFinal");
      const newNoise = document.getElementById("newNoise");
      const newScmd = document.getElementById("newScmd");
      const newFinal = document.getElementById("newFinal");
      const hex = "0123456789ABCDEF";
      const validHex = (input) => {
        for (let i = 0; i < 2; i++) {
          if (hex.includes(input[i])) {
            continue;
          }
          return false;
        }
        return true;
      };
      const mod = (n, m) => ((n % m) + m) % m;
      const convertNoise = () => {
        oldNoise.value = oldNoise.value.toUpperCase();
        oldScmd.value = oldScmd.value.toUpperCase();
        let oldNoiseVal = validHex(oldNoise.value) ? parseInt(oldNoise.value, 16) : "";
        let oldScmdVal = validHex(oldScmd.value) ? parseInt(oldScmd.value, 16) : "";
        let oldFinalVal =
          oldNoiseVal != "" && oldScmdVal != "" ? mod(oldNoiseVal + oldScmdVal,256) : "";
        let newNoiseVal = validHex(oldNoise.value) ? newNoiseArr[parseInt(oldNoise.value, 16)] : "";
        let newFinalVal = oldFinalVal != "" ? newNoiseArr[oldFinalVal] : "";
        let newIndex =
          orderedNewNoiseArr.indexOf(newNoiseVal) != -1
            ? orderedNewNoiseArr.indexOf(newNoiseVal)
            : "";
        let newFinalIndex =
          orderedNewNoiseArr.indexOf(newFinalVal) != -1
            ? orderedNewNoiseArr.indexOf(newFinalVal)
            : "";
        let newScmdVal =
          newIndex != "" && newFinalIndex != ""
            ? ("00" + mod(newFinalIndex - newIndex, 120).toString(16).toUpperCase()).slice(-2)
            : "";
            oldFinal.innerText = ("00" + oldFinalVal.toString(16).toUpperCase()).slice(-2) != "00" ?  
            ("00" + oldFinalVal.toString(16).toUpperCase()).slice(-2) : "";
        newNoise.innerText = newNoiseVal;
        newFinal.innerText = newFinalVal;
        newScmd.innerText = newScmdVal;
      };
      oldNoise.addEventListener("keyup", () => {
        convertNoise();
      });
      oldScmd.addEventListener("keyup", () => {
        convertNoise();
      });
      </script>

  <markdeep>
A Whole New Land of Commands
----------------------------

One of the most useful and most exciting changes is that now it is possible to use the P command to 
sweep smoothly through the noise frequencies without using a custom table. The P command has also 
changed slightly in functionality due to added speed control: rather than `P01` applying `S01` every 
tick, it applies `S01` every 4 ticks, and `P04` applies `S01` every tick, allowing for finer control 
over the final sound of the sweep. Having that extra control means it's now possible to do some 
really nice noise kicks, hi hats, and crashes without devoting extra tables to those sounds.

![Here is an example phrase demonstrating a kick, hi hat, and crash with the same 
instrument.](../media/noise-1610903555.mp4)

Another change for commands in the noise channel is that the C command now functions essentially the 
same as it does in the pulse and wave channels in that it arpeggiates between the root note, the 
second digit, and the third digit. The most basic difference is that the values are limited to only 
the notes available in the noise channel. So to create an F minor triad arpeggio, place the note `F  
5` and apply a C command of `C12`. This will arpeggiate between F, G# (or Ab), and C. Larger values 
will extend to multiple octaves.

![An example of arps with C command](../media/noisearps-1610903924.mp4)

Lastly, a new command has been added! The V command can add noise vibrato (this vibrato is always 
tick-based).

![Vibrato can range from subtle to extreme at high values!](../media/noisevib-1610904078.mp4)

What Else is New?
-----------------

Since the last Intense Tech, besides a few bug fixes and cosmetic changes, a few other notable 
changes have been made. Let's cover them quickly!

<big>**Faster Playback Indicators**</big>

The update to version 9.0.1 includes new sprite-based playback indicators in song, phrase, and table 
screens - they now update at 60 Hz, making table indicators much more visible!

![Epic table view!](../media/table-1610904442.mp4)

<big>**TICK Vibrato Changes**</big>

Also, tick-based vibrato speeds have been changed to be more rhythmic at the default groove. This is 
explained in the changelog like so:

```none
V vibrato rates in PITCH=TICK mode now match phrase steps:

    V0x = 16 steps
    V1x = 12 steps
    V2x = 32/3 steps
    V3x = 8 steps
    V4x = 6 steps
    V5x = 16/3 steps
    ...
    VFx = 1/2 step
```

<big>**Increased precision for instrument FINETUNE**</big>

FINETUNE values in instruments are now expanded to two digits. A previous finetune value of `01` now 
equals `10`.

<big>**Bookmark changes**</big>

Bookmarking individual chains in the song screen has been changed in favor of bookmarking entire
rows. Pressing B+Up/Down will jump between previous and next bookmark.

![Jumping between bookmarks](../media/bookmarks-1610904841.mp4)

<big>**Wave synth LIMIT overflow**</big>

LIMIT in wave synth has been expanded to two digits, and it can now be increased beyond a value of 
`0F`. By doing so, it's possible to create a kind of overdrive.  This also allows for the ability to 
wrap values while using CLIP distortion, as well as introducing new higher harmonics. Try it out and 
see what kind of new sounds will result!

![Increasing LIMIT beyond `0F`](../media/limit-1610904715.mp4)

<big>**Wave F command overrides silky wave**</big>

F commands in wave phrases had previously been delayed by silky wave, but the commands now happen 
instantaneously as they did before silky wave was implemented in version 7. While this will 
reintroduce slight clicking, it allows for immediate wave frame changes for enhanced rhythmic 
precision as it has in past versions.

<big>**Noise instruments no longer need FREE/STABLE**</big>

Noise FREE/STABLE setting was removed and random noise channel muting has been reduced. However, 
many hardware Gameboy models are still affected by a hardware bug that could cause the noise channel 
to mute randomly, while emulators such as BGB and Sameboy, as well as most Gameboy Advance models, 
are unaffected.

------------------------------

Thanks to all my patrons for their support.  
If you'd like to offer support, please consider [joining me on 
Patreon](https://patreon.com/defensem3ch).  It means a lot and it helps me continue to make this 
content, pay for translations, and get your input on what kinds of articles to write next!  <center>
  <p>
    <a href="https://patreon.com/defensem3ch"><img src="../../patreon.png" alt="Patreon" /></a       
    ><a href="https://www.paypal.com/donate?hosted_button_id=XNGKRVMEPMN36"
    ><img src="../../paypal.jpg" alt="Paypal"
    /></a><a href="https://ko-fi.com/defensem3ch"><img src="../../kofi.png" alt="Ko-fi" /></a>
  </p>
</center>
Thanks again for reading, and until next time, this is [DEFENSE MECHANISM](https://defensemech.com), 
signing off!

-----------------------------------------

Previous: [ <-- ADSR ](18-adsr-makes-life-easier.md.html) <span class="next"> Next: [ LSDPatch --> ](20-lsdpatch.md.html)</span>
--------------------------------------------
  </markdeep>
  
