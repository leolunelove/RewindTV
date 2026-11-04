# Rewind TV changelog

Dated changes to the player and catalogue. Each release records its validation scope. Browser samples do not certify every upload or worldwide playback.

## 2026-11-04 — Movie Night

- Added a dedicated Movie Night page: an artwork-led film shelf with genre filters, search, year/runtime details and start-from-the-beginning playback. Uses the existing eligible film catalogue rather than a second source list.
- “Pick for me” spins a horizontal film reel, slows to a centre marker and reveals the chosen film. It draws from the current filter and avoids recent picks while alternatives exist. Playback starts only when Watch is pressed.
- Skip animation, reduced-motion handling and clean cancellation when leaving the page prevent an animation from blocking navigation. One transform animates the reel; no extra video players, canvas or animation library.
- Movie Night joins the existing navigation and browser history, with N and teletext page 700 shortcuts. TV audio continues while browsing, with a clear Back to TV action.
- 152 automated checks pass, including film eligibility, duplicate channel memberships, filtered picks, exhausted/empty selections, artwork providers and teletext navigation. Desktop and phone-size browser playthroughs cover search, selection, spinning and in-app playback. The existing film catalogue was not re-certified in full.

## 2026-11-04 — Kitchen TV

- Added channel 26, Kitchen TV: 68 full episodes / 30.8 hours across eight classic cooking shows, with adverts between episodes and a varied shuffle.
- Rotation: Today's Gourmet (20), Julia & Jacques Cooking at Home (16), Forever Summer with Nigella (8), Baking with Julia (8), Nigella Bites (7), original UK Ramsay's Kitchen Nightmares (4), The F Word series one (4), Ready Steady Cook (1).
- Checked 170 candidate watch pages and 72 embedded players. All 68 retained uploads advanced at the start and near the end. Four Ready Steady Cook candidates returned embed error 150 twice while a known working control played, and were not added.
- Retained uploads are at least three years old, with original programme dates in the 90s or 2000–2006. Official/archive credits and upload dates stay attached. Duplicate Julia & Jacques editions, recent archives, uncertain original dates, long compilations and Floyd uploads missing Finland in their country metadata were held back.
- Existing channel numbers and the first ten weekly schedules are preserved. Guide and Library include the new channel. Early Ramsay editions are labelled for strong language.
- 147 automated checks passed. Embedded checks sampled start/end progress on one browser network, whose egress region was not independently verified; these are not full watches or worldwide playback certification.

## 2026-11-04 — Discovery Club

- Added channel 25, Discovery Club: 83 full episodes / 49.8 hours across eight shows. Includes 58 new older uploads and 25 reused Time Team/Survivorman sources.
- Rotation: Wild America (29), Time Team (22), The Secret Life of Machines (16), Survivorman (7), Rough Science (4), Connections (2), Bill Nye the Science Guy (2), Beakman's World (1).
- All 83 retained uploads advanced at the start and near the end in embedded checks. One further Connections candidate returned error 150 on two attempts while the control played, and stays unpublished.
- Held back the reused Survivorman “Food” upload because its original episode identity was not established and it may be a thematic compilation. Existing channel data was retained.
- New archive uploads are at least three years old. Re-titled wildlife editions, duplicates, clips, newer archives and candidates with incomplete/restricted country metadata were held back. Further science metadata requests hit HTTP 429 and remain unverified, rather than being treated as source failures.
- Existing weekly schedules stay unchanged. Discovery Club shuffles between shows and inserts adverts between episodes. Selecting a show through a channel filter retains that channel when the episode belongs to it.
- 145 automated checks passed. Embedded checks sample start/end progress on one browser network; they are not full watches or worldwide certification.

## 2026-11-04 — Unfiltered

- Added channel 24, Unfiltered: 2010s Filthy Frank, iDubbbz, Maxmoefoe, Anything4Views guest material and older Ice Poseidon trip highlights. 141 uploads / 18.9 hours, including 133 existing sources and eight additions.
- Clearly labelled RV trip highlights and the full SuperMega guest podcast; no highlights are presented as full streams.
- Ten new candidates received start-and-near-end playback checks: nine passed and one returned embed error 150. Held back that failure, an eight-hour surveillance recording unsuited to the live rotation, and two sign-in-restricted watch pages. Remaining untested catalogue coverage is unchanged.
- New channel is a continuous shuffle with no inserted adverts, marked for mature comedy and strong language. Original publisher/archive labels retained. Tests are from one browser network, not a worldwide guarantee or full watch.

## 2026-11-04 — Guide and Library indexes

- Guide opens on a short, paged Now & Next overview across all channels, with remaining time, programme progress, Scheduled/Mixes filters, a current-channel jump, and separate Watch and schedule actions.
- Public compact builds retain audio-language metadata so language filters work after deployment.
- Large collections also have episode search and a direct page selector.
- Channel schedules return to the overview; browser Back restores the overview or chosen channel.
- Library adds A–Z, channel and audio-language filters, compact numbered rows and bounded results/episode pages. Returning from a title keeps the search, filters and results page.
- Guide and Library use a wider teletext reading area on desktop. Short phone layouts show fewer rows, with reachable page controls and a clear return to TV. Playback continues behind both pages.
- Browser reviewed at desktop, 390×844 and 320×568. Existing and new browse regression tests pass; physical touch/Safari remains unverified.

## 2026-11-04 — Shorter names, decades and world TV

- Removed Rewind from channel display names; retained stable keys, numbers 1–19 and the first ten weekly timelines.
- Added 20 / 80s TV (25 uploads, 18.8 hours), 21 / 90s TV (1,148 uploads, 541 hours), 22 / Español (14 uploads, 8 hours) and 23 / 中文 · Mandarin (10 uploads, 5 hours).
- Decades reuse existing library sources with dates inside the decade; open-ended and cross-decade year labels are excluded. Episode-level dating remains limited by existing metadata.
- Language channels use older uploads and have English adverts disabled. Library distinguishes language editions.
- Tested 33 language candidates at the start and near the end: 31 passed, two returned embed error 150. Seven additional candidates were deferred for duplicates, remakes, compilations or uncertain audio. Only 24 passed and retained candidates were added. Both new language channels also played inside the app. Browser egress region was not independently verified; this does not establish global availability or a full-episode watch.
- All 140 automated checks passed, and the first ten weekly video/time schedules were compared before and after and are identical.

## 2026-11-04 — Everyday controls review

- Added a small Live TV return beside the programme title whenever watching an episode, replay or paused broadcast.
- Added episode seeking inside Info for on-demand playback and replays. Live broadcast progress stays read-only; restart first to scrub.
- Restored the fullscreen button on phones, with a native film fallback on browsers that support it.
- Mute, play/pause and fullscreen keyboard shortcuts work while Info is open.
- Corrected Settings’ “Open channels” label to match its destination.
- Browser playthrough covered startup, pause/resume, rapid channel steps, Guide restart/dismissal, Library search/play, power off/on, picture toggles, seek, Live TV return and fullscreen entry/exit controls. Desktop and 320/390px phone layouts reviewed. Physical-device Safari remains untested.

## 2026-11-04 — Volume on the remote

- Added an always-available volume slider, numeric level and mute/unmute button to the main fading TV controls.
- The same button releases muted autoplay; changing volume also enables sound. Mute restores the previous audible level, including after dragging the slider to zero.
- Volume follows channel changes and is saved on this device; audio comfort and quieter adverts still apply.
- Reserved room for the sound row and programme details on narrow portrait screens.
- Verified YouTube and native film mute/unmute in the browser, slider/keyboard input, and 320px/390px phone layouts. Physical iPhone/Safari volume behaviour remains unverified.

## 2026-11-04 — Reliability review and release tracking

### Fixed
- Invalid saved station, effect and audio-level objects fall back safely instead of failing startup.
- Malformed or outdated saved picture preferences are ignored safely instead of breaking frame updates during startup.
- Desktop page dismissal returns to Channels instead of leaving an empty rail.
- Escape can dismiss a utility dialog while a form field has focus; ordinary typing still stays clear of TV shortcuts.
- Picture sizing keeps a window-resize fallback when ResizeObserver is unavailable.

- Intro completion releases only its own controls, preserving the input lock behind an already open phone drawer.

### Polished
- A compact rewind wordmark, restrained on-air indicator and clearer selected-channel treatment.
- Removed the repeated channel number from the programme heading.
- Opening Channels brings the current station into view.
- Cleaned dangling possessive fragments in programme display titles while preserving source records.

### Added
- This dated changelog, linked from Settings and the README.
- Regression coverage for invalid saved preferences and keyboard dismissal from form fields.

### Verification
- 130 automated checks passed; source/asset checks are recorded in the 4 November review report.
- Browser control initially timed out, then recovered. Local phone checks confirmed drawer locking after intro, Settings release notes and search dismissal. Playback and final-release coverage are recorded in the review report. No new catalogue availability claims.

- App release: [`4146614`](https://github.com/leolunelove/RewindTV/commit/414661473261d3bd3b593cbb72122f0f1273ae0f).

## 2026-11-03 — Adaptive picture frame

- Added an eased transition between picture shapes and saved per-video Auto / 4:3 / 16:9 choices.
- Direct streams can use their dimensions; YouTube embeds require a saved choice or known source metadata. Unknown uploads retain 4:3. This does not detect or remove baked-in black bars.
- Refined shared spacing and kept reduced-motion support.
- Verified desktop/phone-size geometry and playback controls; 122 automated tests passed at release.
- Release: [`887fb31`](https://github.com/leolunelove/RewindTV/commit/887fb3128a5e75c188ad61cb0929b426b608fddb).

## 2026-11-03 — The Living Room console

- Introduced a quiet graphite/olive finish, recessed channel rail and one continuous CRT enclosure with tactile controls.
- Channels, Guide and Library share a desktop side menu; phones use a dismissible drawer.
- Guide follows the current channel when switching with the remote.
- Preserved channel identities, schedules, catalogue and contained video proportions.
- Verified live desktop and phone-size interactions; 118 automated tests passed at release.
- Console refinement: [`5f7b096`](https://github.com/leolunelove/RewindTV/commit/5f7b0962a9314aa5129954bb3b790ef31612a68d).

## 2026-11-02 — Mobile polish and simpler navigation

- Replaced nested Guide/Library page apps with native views and bounded episode lists.
- Improved Back navigation, search restoration and Settings return paths.
- Expanded portrait viewing to the phone's full width, keeping 4:3 and contained widescreen video.
- Added larger touch targets, safer spacing, stronger switchable CRT effects and longer phone control visibility.
- Desktop and phone viewport checks passed; physical iPhone/Safari was not certified.
- Full-width viewing: [`ed527d4`](https://github.com/leolunelove/RewindTV/commit/ed527d4d1a56345fba7fe8e751e2b1eed3df00e1).

## 2026-10-29 — Player recovery and catalogue quality

- Separated player-service handshake failures from confirmed video failures and bounded background preload attempts.
- Retained the selected programme during recoverable initialisation problems.
- Quarantined confirmed duplicate/incomplete sources recoverably; retained their records.
- Catalogue sampling, transient rate limits and remaining coverage are recorded in maintenance reports. No full-catalogue playback certification.
- Player recovery: [`8bc3cb7`](https://github.com/leolunelove/RewindTV/commit/8bc3cb7b335ded347ea9a2b7cb2c74c148fb83a0).

## Updating this file

Add new releases at the top. Describe user-visible changes, fixes, checks performed and material limits. Keep catalogue checks separate from player-service failures. Record the deployed commit when available. Never turn sampled checks into whole-catalogue or worldwide claims.
