# Rewind TV changelog

Dated changes to the player and catalogue. Each release records its validation scope. Browser samples do not certify every upload or worldwide playback.

## 2026-11-13 — Samurai seasons and viewing country

- Fixed Settings, Info and Shuffle returning to an older episode after recovery or automatic episode changes. Closing a utility keeps the current picture; ordinary browser Back between choices still works.
- Added 39 official uploads covering 40 new stories: completed Samurai and Super Samurai’s 22-episode runs while retaining prior sources. Power Rangers now has 96 sources; Super Ninja Steel remains at 19 of 22.
- Added approximate country detection and a saved manual override. Known country restrictions filter live mixes, Guide, Library and shuffle; eligible playback continues through a country change. Browser language is not treated as physical location.
- Accepted broadly available official uploads after the user relaxed the previous global-only rule. The 38 regional singles retain their 238-territory allowlists; the double bill declares 249. All 54 researched candidate uploads passed actual public-origin start/near-end checks, without a worldwide or full-runtime certification claim.
- Preserved channel numbers, first-ten fixed schedules and private manager. See [exact coverage, validation and remaining gaps](docs/power-rangers-depth-2026-11-13.md).

## 2026-11-12 — More Power Rangers seasons

- Added 33 official full episodes and the Clash of the Red Rangers TV special to the existing Power Rangers channel: Wild Force 1–10, three Samurai stories, Super Samurai’s The Sealing Symbol, and Super Ninja Steel 1–19. The channel now contains 57 programmes across five series.
- Cleaned a repeated TV-special caption found during the live Library playthrough.
- Retained publisher numbering separately from canonical story order. Compared seven retitled/generic uploads with named official editions to avoid wrong episode labels and repeats.
- Every addition declares all 249 territories, permits embedding and passed actual start/near-end playback on the live site’s diagnostic player. Authenticated the HasTV publisher through primary Hasbro network links.
- Kept all existing channels and programmes. Wild Force broadens Toon Action from 17 November and 00s TV immediately; this week’s fixed broadcasts remain intact. See [the follow-up report](docs/power-rangers-seasons-2026-11-12.md) for exact coverage and remaining gaps.

## 2026-11-12 — Official episodes and Power Rangers

- Added Power Rangers as channel 33, with 23 official Mighty Morphin episodes. The channel is intended to grow across the franchise; restricted and unverified later-season uploads stay out.
- Added 40 Old Bear Stories sources, ten He-Man episodes, four She-Ra episodes and six The New Adventures of He-Man episodes. Library and relevant continuous channels receive them immediately; fixed-channel additions join the 17 November timetable.
- Preserved all existing channel numbers, sources and this week's 8,249 fixed programme/ad slots. Kept overlapping compilations and four runtime-review uploads out.
- Added a resumable public-origin diagnostic checker. 186 distinct videos passed start and near-end playback samples on the tested browser/network, including all 83 accepted additions. Metadata checks covered 317 candidates; this is not full-catalogue or worldwide certification. See [catalogue report](docs/catalogue-2026-11-12.md).

## 2026-11-12 — One broadcast room

- Applied the Home mockup direction to the real Guide, Shows, Films, show details and Settings. Kept the persistent picture and existing navigation, source labels, catalogue and private manager.
- Guide shows real Now and Next information in aligned numbered rows. Actions open inline without repeating the programme information.
- Library uses larger artwork, grouped search/Mix/filter tools, clear episode rows and the existing Continue watching shelf. Films keeps its reel picker and all genre choices in a compact native filter.
- Phones give browsing its own full-height page, with the picture above the four destination tabs. Desktop keeps a quiet rail and a mini-player clear of navigation.
- Consolidated the old page-specific CSS rules instead of stacking another visual theme. Picture geometry, original proportions, CRT settings and reduced-motion behaviour remain in place.
- Validation: 334 automated tests passed. Browser samples covered live startup, rapid switching, both shuffle scopes, the film reel, Library resume/Back and direct Archive playback at desktop, phone-sized and short-landscape viewports. See [release QA](docs/2026-11-12-broadcast-room-qa.md). Physical iPhone/Safari remains untested.

## 2026-11-11 — A place to switch on

- Added Home with large Live TV, Films and Shows choices, current catalogue counts, a route to Guide and the programme playing in its footer.
- Home opens as soon as the catalogue is ready. Its Live TV choice rejoins the saved live channel. Explicit Watch, Guide, Library and episode links retain their routes.
- Desktop keeps the navigation rail. Phones use four tabs, stacked choices and safe-area spacing. The current picture stays mounted through Home and browsing.

## 2026-11-10 — Main channel cleanup and two new stations

- Added 00s TV and After School UK as continuous mixes of previously sampled episodes. Existing channel numbers stay in place.
- Retired six duplicate uploads from Library and shuffle. Fixed rotations switch to the retained versions from 17 November. Alternate records remain recoverable.
- Moved Forensic Files S9E25 to True Crime from the next timetable and labelled standalone cartoon stories and known compilations.
- Playback probe tested 56 distinct uploads across the main ten and station anchors. 54 played at the start and near the end on one browser network. Two previously excluded sources repeated an embed error.

## 2026-11-08 — Continue watching in Library

- Added a compact Continue watching row to Library Shows and Films. Keeps up to twelve recent unfinished titles: the latest episode per show, with films saved individually.
- Resume restores the saved episode and playback position. Show details offer Resume alongside playback from the beginning; the two actions stay distinct.
- Save progress about every five seconds and on pause, seek, leaving playback and page exit. Switching to live TV keeps Library progress while preserving the saved live channel.
- A failed Resume keeps its original episode and position. Archive seeks have a bounded loading grace and automatic retry before offering Resume again.
- Finished programmes leave the row. Remove an entry without changing the catalogue, browse order, filters or scroll position.
- Progress stays in this browser. No account or cross-device sync; unavailable storage falls back to the current session. Catalogue, schedule and private-manager data remain unchanged. Release validation is recorded separately.

## 2026-11-08 — A continuous Library and a place to watch

- Shows and films open a Library watching page with the same media engine: seeking, volume, pause, episode stepping, an ordered episode list and original source links. Back to browsing preserves the collection context.
- Live TV keeps its own last channel. Returning to Watch rejoins that channel; Library choices and end-of-collection states stay separate from the broadcast.
- Guide, title results, film results and episode lists scroll continuously. Removed browse page selectors and title shortlists while retaining the full catalogue, filters and source collections.
- Library defaults to a stable Mixed order. Mix Library / Mix again changes the title order; A–Z sorts it. Filters and Back retain the mix, and episodes stay chronological. Covers load lazily.
- Shows preserve searches, filters, seasons and scroll anchors across browsing and playback. Browse preferences are saved locally when storage is available.
- No catalogue, channel-number, fixed-schedule, advert or private-manager data changes. Release playthrough and playback evidence are recorded separately; physical iPhone testing remains outstanding.

## 2026-11-08 — Safari and small-screen refinement

- Mobile search and select controls use 16px text to avoid iPhone focus zoom. Landscape layouts account for both notch edges, while browsing controls respond to the visible keyboard viewport.
- Focus has a visible Exit focus control on the TV remote. Picture bounds use the current header, navigation and visible viewport.
- Narrow remotes keep the volume controls inside their surface. Programme titles and Return to live wrap onto separate rows when space is tight.
- Film search and genres update the featured film as well as the results. No matches hides the unrelated feature. Returning from Films restores the previous Shows context.
- Playback rejects stale YouTube autoplay-blocked events and reconciles native-video interruptions, so the first Play tap resumes the current source. Cold Archive requests remain alive while Safari is loading metadata, with a bounded recovery deadline.
- Validation scope: real Mac Safari plus responsive browser checks; physical iPhone, touch keyboard, notch and lock-screen interruptions are not certified. Exact playback samples and automated checks are recorded in the local QA report.

## 2026-11-07 — Liquid Broadcast room

- Rebuilt the public room around Watch, Guide and Library, with a smoke-blue desktop rail, phone tabs, dotted RewindTV wordmark and compact glass remote.
- The mounted picture moves between Watch and the browsing mini-player. Picture framing retains Auto, 4:3 and 16:9 options with contained video and saved per-upload choices.
- Guide uses numbered rows, genre and programme search, bounded paging and inline Now/Next. Each expanded row offers Watch live, From start and Full schedule using the existing broadcast plan.
- Library uses real upload thumbnail covers, Shows/Films controls, season selection and paged episodes. Returning restores title searches, season, episode page, results position and focus. Listed titles, source collections and original upload links remain reachable through Filters.
- Movie Night sits under Library Films, retaining the complete film collection and Pick for me. Info, Settings and Shuffle share one foreground utility with predictable Back and Escape behavior.
- Provider handoffs pause the outgoing YouTube or direct Archive source. Main and mini-player pause, mute and return-to-Watch controls share playback state.
- Carried the full catalogue, channel numbers, saved settings, fixed schedules, advert placement and private manager into the new room.
- Verified 242 automated checks, unchanged catalogue and current/next-week fixed schedules, plus desktop and responsive phone playthroughs. Sampled YouTube and Archive playback, rapid channel changes, both shuffle scopes, the film reel, volume, picture shape and browser navigation. Physical iPhone/Safari and the full catalogue were not retested.
- Fixed Guide returning from Full schedule, paused outgoing sources during provider changes, and allowed a progressing Archive metadata transfer to finish before recovery. Failed on-demand choices now announce the fallback and try an existing matching film first.
- Bundled the small Doto font locally; the interface no longer waits for a remote font stylesheet.

## 2026-11-07 — Clearer everyday browsing

- A cold Archive stream with no metadata gets an eight-second retry window, then the player moves on automatically. Streams already loading keep their longer allowance.
- Library keeps search and All / Shows / Films upfront. Alphabet, channel, language and source collections sit under Filters, with a clear reset.
- More numbered results fit each browse page. Episode and search positions are retained when returning to the collection.
- Channels and Guide have distinct routes, consistent keyboard shortcuts and predictable browser Back behavior.
- Guide opens around the tuned station and shows more channels per page. Playback continues while browsing.
- Release checks and production playback samples are recorded in the release report. No worldwide or uninterrupted-playback certification.

## 2026-11-07 — Deeper themed stations

- Added 41 verified programmes, about 17.5 hours, to six existing stations.
- Boomerang Classics adds 19 Pink Panther and Smurfs cartoons and specials. Cartoon Network Classics gets the first 13 episodes of Code Lyoko series two. Nickelodeon Classics adds The Little Bear Movie. [Official Code Lyoko playlist](https://www.youtube.com/playlist?list=PLDdlwI0EwS7TpHbfjMCjvm62n9WA-3Z-l)
- Disney Channel Classics adds the House of Mouse premiere and two So Weird episodes. Sitcoms gets the second-series premiere of Jeeves and Wooster, eligible for the 10 November timetable.
- Horror Movies adds Death Dreams, Night of the Demons 3, Day of Wrath and Viy. Movie Night now has 114 films. [Mosfilm’s Viy](https://www.youtube.com/watch?v=4YmQn6q36HQ)
- Each addition passed start and near-end playback in one browser network and had an established upload date and full country coverage in YouTube’s metadata. Channel numbers and this week’s schedule matched the prior build.

## 2026-11-07 — Biochao’s Vault and archive curation

- Added 285 playable programmes across 16 stations, for 133.9 hours. This includes 11 films and 12 direct Internet Archive streams.
- Lost & Found gets all 33 Spatz episodes, 29 T-Bag episodes across series seven to nine, 10 Welcome to Orty-Fou episodes and two parts of Matt’s Million. Sitcoms gets the first two series of The Piglet Files and the first series of Jeeves and Wooster. Halloween adds 38 Tales from the Cryptkeeper episodes. [TV community leads](https://www.reddit.com/r/fulltvshowsonyoutube/)
- Added 28 Spanish programmes and 21 Mandarin programmes. Normalised existing display titles and episode numbers. Movie Night grows to 109 films, including A Single Spark, Come and See and The Adventures of Mark Twain. [Film community leads](https://www.reddit.com/r/fullmoviesonyoutube/)
- Library includes Biochao’s Vault under Listed only, with 11 links to original recordings and playlists. NASA mission tapes have a separate source collection. Discovery Club gains complete Computer Chronicles and Net Cafe episodes plus the National Archives’ television discussion of the Challenger investigation. [Biochao’s Vault](https://www.youtube.com/@biochaosvault/videos) · [Internet Archive provenance](https://blog.archive.org/2026/01/11/the-chronicles-of-cheifet/)
- Disabled eight duplicate uploads and moved a shorter Caillou holiday edit to Browse, with a link to the full feature. Moved 11 Knightmare and Finders Keepers UK episodes to Lost & Found. Added format labels for compilations and pilots and recovered the four Uncle Jack serials’ episode numbering.
- All retained uploads advanced near the start and end in one browser network with unverified region. The broader playback ledger covers 500 sources, including 48 upcoming fixed-channel programmes, all 24 previous language-channel entries and 39 existing films. The current ten timetables matched the previous build slot for slot. New fixed-channel additions become eligible on 10 November.

## 2026-11-07 — Animation stations and Browse previews

- Added Boomerang Classics, Cartoon Network Classics, Nickelodeon Classics and Disney Channel Classics. Sitcoms and Horror Movies use the existing channel slots.
- Added 27 verified uploads, including Red Green, The Addams Family, Pink Panther and Smurfs. Two Computer Chronicles episodes play directly from the Internet Archive.
- Browse now has a Listed only filter, plus trailers, publisher clips and external sources on individual titles. Chad Vader keeps all 38 episodes together, with a separate section for creator extras.

## 2026-11-06 — Classic game shows, mysteries and Art Attack

- Added 42 full episodes across seven shows new to the catalogue. Gameshows gains Fort Boyard UK, Knightmare, Finders Keepers UK and Scrapheap Challenge. Lost & Found gains Bernard’s Watch and Ghostwriter. 90s TV gains Art Attack.
- All 42 retained uploads passed the embedded start and near-end checks. Five Raven uploads remained blocked in the embed after a retry, and one Scrapheap Challenge source listed a regional restriction.

## 2026-11-06 — Six more Discovery Club shows

- Added 44 episodes across six shows new to the catalogue. 3-2-1 Contact has 25 episodes, Scientific Eye has ten, Science Shack has four, Science in Action and Local Heroes have two each, and The Experimenter has one.
- All retained uploads passed start and near-end checks in RewindTV’s embedded checker. Public metadata supplied the upload dates and country lists. Browser network region was unverified.

## 2026-11-06 — More Discovery Club episodes

- Added 81 full episodes (18.93 hours). Backyard Science gets all 52 separately numbered Season 2 episodes from ZeeKay’s 13-minute edition. How 2 gets eight more episodes and The Big Bang gets 16, including five from Series 1.
- Science Court joins with four broadcasts. The Complete Cosmos joins with its 10-minute Moon episode.
- All 81 passed the embedded player’s start and near-end checks. Six selections across the five shows also played through the local RewindTV app. These checks used one browser network with an unverified region.
- A separate set of 26 3-2-1 Contact uploads passed playback. The metadata service rate-limited their checks, so they remain in the research checkpoint.

## 2026-11-06 — Discovery Club, Shuffle previews and CRT glass

- Added all 26 episodes of Backyard Science season one, six How 2 episodes and 15 episodes of CITV’s The Big Bang to Discovery Club. Adds 16.08 hours across three shows. The fixed-channel timetable stays as scheduled.
- All 47 uploads advanced near the start and end in the embedded player. Public watch metadata supplied publication dates, runtimes and encoded aspect ratios. One browser timeout passed on retry. The browser’s network region was unverified.
- Shuffle previews the pick and keeps TV playing. Pick another, change the scope or watch from the beginning. Recent picks are stored on this device and help the selector avoid repeats across channels.
- Rounded glass, darker edges, stronger scanlines and a moving phosphor sweep frame the full picture. Auto matches the encoded frame when the ratio is known. Settings still offers 4:3, 16:9 and the CRT toggles.

## 2026-11-06 — Late Night Broadcast

- RewindTV has a dedicated CRT wordmark and favicon, a fluid cabinet and a landscape side remote. The picture aperture and portrait controls move together on aspect changes, while the video stays contained.
- The remote offers Shuffle (R) for this channel or all channels. Picks start on demand and can return to the broadcast with Live TV.
- Movie Night keeps spinning through a resize and lands on the new centre.
- Added 41 episodes and two films (17.70 hours), including Code Lyoko season one and Chad Vader’s missing first-season episode. Fixed broadcasts admit their additions on 10 November; on-demand and continuous shuffle pools can play them immediately.
- See the [release notes](docs/2026-11-06-late-night.md) for programme placements and the playback-check scope.

## 2026-11-04 — Bigger reel, deeper rotations

- Movie Night now has a full-width crate-style reel, a longer ease-out, a precise centre marker and a dedicated winner reveal. Skip, reroll, Watch and Back to collection stay explicit. The film only starts when Watch is chosen.
- Soft synthesized ticks follow actual card crossings, with a gentle landing accent. Effects obey the TV volume, mute and the renamed “TV & reel sound effects” setting. No sound downloads or animation library; one transform per frame while spinning, with cancellation on close/hide, resize handling and reduced-motion support.
- Added 169 source-verified uploads / 39.52 hours: 102 classic web episodes, 58 TV episodes/pilots and nine films. Movie Night grows from 87 to 96 films.
- Web runs: Chad Vader (37), The Guild (22), Pure Pwnage (17), Red vs. Blue (16), Freeman's Mind (10). These are complete visual web episodes; no podcasts were added. All join After Dark immediately and Classic YouTube's fixed schedule from 10 November.
- TV additions include Bodger and Badger (10), Oakie Doke (12), Stoppit and Tidyup (12), Budgie (10), The Dreamstone (7), The Shoe People (4), Bimble's Bucket, The Queen's Nose and the Clarissa Now! pilot. Films include Remote, Magic Island, Interstate 60, The Big Empty, The Princess and the Goblin, Dollman, Moontrap, Arena and Jack Frost (1997).
- Existing shuffle channels draw fresh mixes from the larger pools, still prioritising unseen programmes and rotating shows. Viewing history is preserved. The current first-ten timetable is unchanged; new fixed-schedule items become eligible next Tuesday. Library and Movie Night expose additions immediately.
- Tested 174 candidate uploads in embedded players at the start and near the end: 169 passed. Five failed with error 150 twice while a control played, and remain unpublished (Arcade also explicitly requires age verification). Jackass sources found were region-limited or sign-in restricted. All retained uploads have been online at least three years.
- 177 automated checks pass. Desktop, 390px and 320px browser review covered landing alignment, skip, reroll, page navigation, sound controls and responsive scrolling. Embedded tests used one browser network with unverified egress region; they do not certify full uninterrupted episodes or worldwide playback. Further candidates remain unchecked after YouTube returned HTTP 429. Synthesized sound envelopes were tested programmatically; physical speaker balance is not certified.

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
