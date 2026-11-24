# Programme About — 24 November 2026

Inline title information, kept separate from source uploaders, source licences and player state. The editorial module is lazy-loaded with Library/Films, never from the live Watch startup path. It makes no metadata network requests.

## Evidence

- Where Are the Joneses?: original Archive creator metadata credits Imagination Group/Baby Cow; existing reviewed programme synopsis supplies the road-trip premise. [Contemporary Creative Commons account](https://creativecommons.org/2007/06/20/where-are-the-joneses/) documents collaborative web production. Do not invent individual writing credits.
- NASA SCI Files, Connect and Destination Tomorrow: original per-item NASA LaRC Office of Education metadata and programme credits reviewed in the preceding release. Descriptions summarise each format rather than repeating one episode's plot or the generic source note. Examples: [Galactic Vacation](https://archive.org/details/NasaSciFiles-TheCaseOfTheGalacticVacation), [Virtual Earth](https://archive.org/details/NasaConnect-VirtualEarth), [Destination Tomorrow 20](https://archive.org/details/NasaDestinationTomorrow-Episode20).
- Nasty Old People: [creator synopsis and release notes](https://nastyoldpeople.blogspot.com/2009/10/five-days-16000-downloads-and-15000-sek.html), existing reviewed credits. Retain Swedish audio and the unverified-English-subtitles note. No age certificate invented.
- Sintel: [director's own project page](https://www.colinlevy.com/sintel) establishes premise and named director, writer and producer. Credits remain unchanged in the original media.
- Net Cafe and Computer Chronicles: [Internet Archive's Cheifet account](https://blog.archive.org/2026/01/11/the-chronicles-of-cheifet/) establishes the creator and programme format.
- BBS, Valkaama and Big Buck Bunny: existing reviewed Archive source metadata, credits and original synopsis in `archive-library.json`. BBS maker Jason Scott; Valkaama director Tim Baumann; Big Buck Bunny production Blender Foundation. No extra individual roles inferred from uploader names. Big Buck Bunny is dialogue-free.

## Display rules

- Show years describe the available collection, not an inferred full broadcast run. Runtime ranges describe individual playable programmes, not the sum of the collection.
- Film/standalone-short runtime uses that work's actual catalogue duration, rounded to minutes. Language is explicit catalogue metadata, with an editorial no-dialogue correction where appropriate.
- Series descriptions come from reviewed title information or existing title listings. First-episode synopses are used only for standalone works.
- Other titles still expose known facts; missing creator, language and synopsis fields remain absent.
- All catalogue identities, source URLs, enabled/held status, live assignments and schedules remain unchanged.

## QA scope

Unit coverage checks fallback metadata, factual roles, no dialogue, no invented English, stale selection clearing and browsing without playback requests. Release browser checks inspect About on desktop and mobile Chrome emulation while the same Library source clock advances, then exercise playback/resume as before. Physical iPhone/Safari testing is not claimed.

Additional primary checks: [Neil Edmond’s agency biography](https://www.unitedagents.co.uk/cv/9031/film_tv_theatre) supports the Joneses family-search premise; [NASA educational links](https://www.grc.nasa.gov/www/k-12/UEET/StudentSite/educationallinks.html) identifies Connect’s producing office and classroom format. Mobile browser QA scrolls About into a reading position and checks its facts clear the floating mini-player.

## Published verification

Released in PR #7, merge `47f64f4124ef36ae7b3ff2a0da51eec58004ff67`. All 439 automated tests passed. [Final desktop/mobile UI run](https://github.com/leolunelove/RewindTV/actions/runs/45463139406) passed About content, mobile dock clearance, continuous playback, multipart stepping and saved progress across live TV/reload. This UI-only run did not repeat catalogue-wide source probes.

Live Chrome on tv.leolune.fun displayed Joneses and Nasty Old People About sections. Joneses continued playing while both were browsed (same episode 3 clock advanced 96.77 to 123.01 seconds during film selection). Browser network country was not independently verified; physical iPhone/Safari remains untested. No source catalogue or schedule changes.
