<p align="center">
  <img src="docs/rewind.svg" width="256" height="72" alt="Rewind TV">
</p>

<h1 align="center">Rewind TV</h1>

<p align="center">Something good is always on.</p>

<p align="center">
  <a href="https://leolunelove.github.io/RewindTV/">Watch Rewind TV</a> ·
  <a href="https://leolunelove.github.io/RewindTV/browse.html">Browse shows</a> ·
  <a href="https://leolunelove.github.io/RewindTV/channels.html">Channel lineup</a>
</p>

## Switch on. See where you end up.

- **Find your channel.** Surf 19 channels of 90s and early 2000s TV, cartoons, British nostalgia, gameshows, films, classic YouTube and music.
- **Drop into something.** The first ten channels follow a shared weekly timetable. The other nine shuffle their collections, giving unheard programmes priority.
- **Pick an episode.** Browse Shows groups episodes into collections. Start from the beginning, keep watching in episode order, then choose Join Live to return to the channel.
- **See what’s on.** Open Info for the show, episode, runtime, progress, upload source and what comes next. Keep surfing with the panel open, or jump into the channel’s schedule.
- **Make it feel like TV.** Watch fullscreen with CRT scanlines, colour bleed, curvature and channel-switching sound. Move the mouse to bring back the controls; adjust the effects in Settings.
- **Make a night of it.** Try After Dark, Classic YouTube, Rewind Music, Halloween 24/7 or Christmas TV. There is a dedicated film channel and a separate Midnight Movies collection.
- **Come back to your set.** Your last channel, volume, effects and viewing history stay in this browser. The TV starts muted so you can choose when to bring in the sound.

## Get started

1. [Open Rewind TV](https://leolunelove.github.io/RewindTV/). It tunes into your last channel; choose **Tap for sound** when you want audio.
2. Use **← / →**, the channel list or a channel number to find something. Controls appear when you move the mouse or use the keyboard.
3. Choose **Info** or press **I** to see what you’re watching. Previous and next channel controls work inside the panel too.
4. Open **Schedule** for the current channel, or **Browse Shows** to choose a particular episode. Both keep the TV playing underneath.

## Your TV

The first ten channels get a new timetable every Tuesday at **00:00 Europe/Gibraltar**. Shuffle channels use a changing queue instead of fixed broadcast times. Short adverts sit between programmes.

Preferences and viewing history are saved on this device. There is no account or cross-device sync; clearing the browser’s site data resets your set.

Playback comes from third-party YouTube embeds and direct archive streams. Official and fan/archive uploads are labelled. Older upload dates help assess longevity, but availability, region restrictions and removal remain controlled by the source. The player tries another upload when a source fails; YouTube startup can sometimes still need Retry. Public availability does not make a programme public domain.

## Keyboard controls

| Key | Action |
| --- | --- |
| ← / → | Previous / next channel, including while Info is open |
| ↑ / ↓ | Volume up / down |
| Space / K | Play / pause |
| M | Mute / restore sound |
| I | Open / close programme info |
| S | Open / close the channel schedule |
| B | Browse shows |
| G / C | Open / close the channel list |
| F | Toggle fullscreen |
| P | Power on / off |
| 1–19, then Enter | Tune to a channel; a short pause also confirms the number |
| Esc | Close a panel or cancel a channel number |
| ? | Show keyboard help |

## Run locally

Use Node 22 or later and Python 3. The player uses plain HTML, CSS and JavaScript; no frontend dependency installation is needed for a preview.

```sh
git clone https://github.com/leolunelove/RewindTV.git
cd RewindTV
node maintenance/build-library.mjs
python3 -m http.server 8767 --bind 127.0.0.1 --directory site
```

Open [localhost:8767](http://127.0.0.1:8767/). Run `node --test maintenance/*.test.mjs` to check the catalogue, scheduling, playback data and programme info.

For cloud playback probes, install the additional tools with `npm install --ignore-scripts` and `npx playwright install --with-deps chromium`, then use `npm run check`.

## Repository guide

| Path | Purpose |
| --- | --- |
| [site/](site/) | TV player, show browser, programme guide, styles and channel logos |
| [site/catalogue.json](site/catalogue.json) | Base programme catalogue |
| [site/library.mjs](site/library.mjs) | Supplement list, catalogue merging and shared library loading |
| [site/runtime-library.mjs](site/runtime-library.mjs) | Compact playback format; retains the fields the player needs |
| [site/programme-info.mjs](site/programme-info.mjs) | Programme titles, source labels and progress formatting |
| [maintenance/](maintenance/) | Catalogue build, playback checks and automated tests |
| [data/](data/) | Coverage checkpoint for rotating source checks |
| [docs/](docs/) | Repository artwork |
| [.github/workflows/](.github/workflows/) | GitHub Pages publishing and Tuesday maintenance |

GitHub Pages hosts the contents of `site/`. **Publish Rewind TV** checks the app, generates `site/runtime-library.json` and deploys after relevant changes to `main`, or when run manually. The generated library combines the base catalogue and supplements into one playback request; the guide and show browser reuse it when opened inside the TV.

The owner’s Python manager, private inbox and backups are separate from this public repository. Manager edits need an explicit catalogue sync before they appear on the hosted site.

## Tuesday maintenance

**Rewind Tuesday checks** runs at **03:00 Europe/Gibraltar** every Tuesday, independently of the owner’s computer. It samples up to 250 uploads per run, prioritising the oldest checks, within a 20-minute job limit. Manual runs default to ten uploads.

Checks sample playback at the beginning and near the end. Coverage and reports are saved to `data/state.json` and `reports/latest.json` when available. A single runner cannot certify worldwide access or complete viewing, and a blocked runner does not trigger mass removal. Findings fail the workflow so GitHub can notify the owner through their Actions notification settings.

## Built with

Plain HTML, CSS and JavaScript, the YouTube IFrame Player API, native video playback and Web Audio. Browser storage remembers the set; GitHub Actions builds the compact catalogue, publishes the static site and runs maintenance.

No downloaded TV, films or music are hosted in this repository. Copyright stays with the respective owners.
