<p align="center">
  <img src="docs/rewind.svg" width="256" height="72" alt="Rewind TV">
</p>

<h1 align="center">Rewind TV</h1>

<p align="center">Something good is always on.</p>

<p align="center">
  <a href="https://tv.leolune.fun/">Home</a> ·
  <a href="https://tv.leolune.fun/#watch">Watch</a> ·
  <a href="https://tv.leolune.fun/#guide">Guide</a> ·
  <a href="https://tv.leolune.fun/#library">Library</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

## Switch on. See where you end up.

- **A place to switch on.** Home opens Live TV, Films and Shows, with your programme still playing in its footer.
- **Find your channel.** Surf 32 channels of 80s, 90s and early 2000s TV, cartoons, British nostalgia, gameshows, films, classic YouTube and music. Spanish and Mandarin channels, Discovery Club, Kitchen TV, 00s TV and After School UK broaden the mix. The channel catalogue contains 5,219 source records, including retained exclusions.
- **Drop into something.** The first ten channels follow a shared weekly timetable. The remaining channels shuffle their collections, giving unseen programmes priority.
- **Browse without leaving the picture.** Home, Watch, Guide and Library live in a desktop rail and phone tabs. The same picture moves into a mini-player while you browse, with pause, mute and a route back to the programme.
- **Find a show or creator.** Library Shows includes TV episodes, creator videos, classic web collections and music. Scroll every matching title, search or filter the collection. **Mix Library** changes the discovery order; **A–Z** offers alphabet browsing. Show details keep every matching episode in chronological order and remember your season, search and position. Filters also reach listed titles and source collections such as Biochao’s Vault.
- **Watch your choice.** Starting a show or film opens a dedicated Library watching page with seeking, volume, episode controls and the original source. **Back to browsing** keeps your place. Watch returns to your last live channel; Library playback does not replace that saved channel.
- **Pick up where you stopped.** **Continue watching** in Library remembers the latest episode per show and each unfinished film, even after returning to live TV or visiting later. Choose **Resume** to keep your place, or **From beginning** to start again. Remove anything you no longer want in the row.
- **Make it a movie night.** Open Films under Library to scroll the full matching collection, mix its order or browse A–Z, by genre or search. **Pick for me** spins the film reel, avoids recent picks and reveals a film before you choose **Watch from start**.
- **Surprise yourself.** **Surprise me** previews a random programme from **This channel** or **Everywhere**. Keep watching while you pick again. **Watch from start** begins the selection, and **Return to live TV** rejoins the broadcast.
- **See what’s on.** Guide has one continuous numbered lineup, genre filters and search across channel names and current programmes. See Now and Next in every row. Expand it for **Watch live**, **From start** and **Full schedule**. Info shows the episode, runtime, progress and upload source.
- **Make it feel like TV.** The picture keeps its shape while the controls fade during watching. CRT scanlines, colour bleed, curvature and switching sounds are adjustable in Settings. Your last channel, volume, effects and viewing history stay in this browser.

## Get started

1. [Open Watch](https://tv.leolune.fun/#watch). The TV tunes into your last channel and starts muted. Choose **Unmute** for sound, or **Play** if the browser asks for a playback gesture.
2. While watching, use **← / →**, the channel buttons or a channel number to tune. Pointer, touch and keyboard interaction bring the controls back. **I** opens programme Info, where channel stepping also works.
3. Open **Guide** from the rail or bottom tabs, or press **C** or **G**. Search the full lineup, expand a numbered row and choose live playback or its full schedule.
4. Open **Library** for Shows and Films. Scroll the matching collection, or search and filter it. **Mix Library** / **Mix again** changes the title order; **A–Z** sorts it. Choose a title and episode, or use Movie Night’s film reel.
5. Library choices open their own watching page. Use its timeline, previous/next episode buttons, pause and volume controls. **Back to browsing** restores your filters and position. The mini-player returns to the current programme while you browse; **Watch** or **Return to live TV** rejoins your saved live channel. On your next visit, **Continue watching** offers **Resume** without changing live TV’s saved channel.

## Your TV

The first ten channels get a new timetable every Tuesday at **00:00 Europe/Gibraltar**. Shuffle channels use a changing queue instead of fixed broadcast times. Short adverts sit between programmes.

Preferences, viewing history and Library browse order, filters and positions are saved on this device. Live TV remembers its channel separately from the current Library choice. There is no account or cross-device sync; clearing the browser’s site data resets your set.

Continue watching keeps up to twelve recent unfinished titles in this browser. It saves Library progress about every five seconds and on pause, seek, leaving playback or closing the page. Finished programmes leave the row. You can remove an entry without removing its show or film from the catalogue. Live broadcasts do not create resume entries.

Playback comes from third-party YouTube embeds and direct archive streams. Official and fan/archive uploads are labelled. Older upload dates help assess longevity, but availability, region restrictions and removal remain controlled by the source. The player reconnects automatically after initialization failures and tries another upload when a source cannot play. A browser autoplay restriction may still require pressing Play. Public availability does not make a programme public domain.

One foreground player is the default for reliability and lower memory use. **Prepare nearby channels** is optional in Settings; if background preparation does not become ready, the tab returns to light mode rather than repeatedly recreating hidden players.

## Keyboard controls

| Key | Action |
| --- | --- |
| ← / → | Previous / next channel on live Watch; seek back / forward ten seconds during Library playback |
| ↑ / ↓ | Volume up / down while watching |
| Space / K | Play / pause while watching |
| M | Mute / restore sound, including while browsing |
| I | Open / close programme Info while watching |
| C / G | Open Guide |
| S | Open / close Guide |
| B | Open / close Library |
| N | Open / close Movie Night under Library Films |
| R | Open Surprise me for live TV |
| / | Open Library search |
| F | Toggle fullscreen |
| P | Power on / off |
| Channel number, then Enter | Tune to a channel; a short pause also confirms the number |
| Esc | Close a utility, return from the Library player to browsing, go back a browsing level or cancel a channel number |
| ? | Show keyboard help |

Playback shortcuts apply while watching, including the Library player and Info. Guide and Library browse lists leave arrow keys, Space and Enter to scrolling and focused controls. Typing into a search field or choosing a filter keeps the keyboard within that control.

## Run locally

Use Node 22 or later and Python 3. The player uses plain HTML, CSS and JavaScript; no frontend dependency installation is needed for a preview.

```sh
git clone https://github.com/leolunelove/RewindTV.git
cd RewindTV
node maintenance/build-library.mjs
python3 -m http.server 8767 --bind 127.0.0.1 --directory site
```

Open [localhost:8767](http://127.0.0.1:8767/). Run `node --test maintenance/*.test.mjs` to check the catalogue, scheduling, playback data and programme info.

For local playback probes, install the additional tools with `npm install --ignore-scripts` and `npx playwright install --with-deps chrome`, then use `npm run check`. Provider control results determine whether playback samples are meaningful on that network.

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

The included **Rewind Tuesday checks** workflow is configured for **03:00 Europe/Gibraltar** every Tuesday and can run without the owner’s Mac. Scheduled runs plan a bounded sample of up to 250 uploads within a 20-minute job limit. Manual runs default to ten uploads. Actual coverage depends on provider access and the time available.

The checker samples advancing playback near the start and end and checks source metadata separately. Reports distinguish a playback pass, a source needing review, a transient failure and a blocked runner. Previous GitHub-hosted YouTube control checks have been blocked while Archive controls played, so a hosted run may produce metadata-only or runner-blocked YouTube results. Inspect each report’s provider controls and sampled IDs before treating it as playback evidence.

Coverage checkpoints and reports use `data/state.json` and `reports/latest.json`; the workflow also retains diagnostic artifacts. A blocked provider keeps source failures inconclusive, and the checker leaves catalogue edits for review. Source-review findings and runner failures can fail the job and surface through GitHub Actions notifications. Remote probing is opt-in and off by default.

A bounded sample covers its recorded uploads and runner network. It does not establish an uninterrupted watch, current playback across the whole catalogue or worldwide access. The separate private manager and inbox stay local.

## Built with

Plain HTML, CSS and JavaScript, the YouTube IFrame Player API, native video playback and Web Audio. Browser storage remembers the set; GitHub Actions builds the compact catalogue, publishes the static site and runs maintenance.

No downloaded TV, films or music are hosted in this repository. Copyright stays with the respective owners.

The 20 October 2026 reliability audit records metadata availability checks for 4,229 source IDs. Twenty-four uploads explicitly disallowed embedding and one duplicate episode was removed from rotation. Records remain in the source catalogue; `site/library-health.json` applies reversible exclusions after all content packs. See `docs/reliability-audit-2026-10-20.json` for scope and evidence. These metadata checks do not certify full playback or worldwide availability.

Movie switching: the native film player retains its buffer when you leave and return. Fast channel surfing also prepares an adjacent Archive film (or one initial movie signal while idle) in the existing video element, without hidden playback. Film preparation respects Data Saver, hidden tabs and the preload switch. Cold film starts request playback immediately alongside metadata loading. Archive response times can still vary.
