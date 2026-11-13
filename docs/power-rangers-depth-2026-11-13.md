# Samurai depth and regional playback — 13 November 2026

## Result

Added **39 official uploads covering 40 new stories** to the existing Power Rangers channel and Library:

- Samurai: 19 additional single episodes, completing its 22-episode run. Clash of the Red Rangers stays separate as a TV special.
- Super Samurai: 19 additional singles plus the official Trading Places + Something Fishy double bill, completing all 22 named episodes in 21 sources.
- Power Rangers now has 96 programme sources covering 97 stories/specials. Public channel 33 and private channel 29 remain stable.
- Super Ninja Steel remains at 19 of 22. No eligible official full source was found for Reaching the Nexus, Monster Mix-Up or The Poisy Show. Official clips and fan uploads were not substituted.

## Availability policy

The user explicitly changed the rule during this pass: official uploads available in most territories may be included. The previous no-declared-limits rule no longer applies to the new regional pack.

The double bill explicitly lists 249 territories. The 38 regional singles explicitly list 238 territories, including GB and GI. Their 11 declared exclusions are **CN, HK, JP, KH, KP, KR, LA, MM, MO, TH and TW**. Exact allowlists are retained in source records; these uploads are never described as unrestricted.

A broad-availability import needs at least 200 distinct declared territories, authenticated ownership, OK playability, embedding permission, canonical episode identities, full-episode evidence and actual public-origin start/near-end playback. A long availability list alone does not make a source eligible.

## Country and language handling

Country.is supplies an approximate network country code in a single bounded request. A saved manual country override wins; automatic country results are cached for 24hours. RewindTV consumes and saves only the country code and cache timestamp, not the returned IP. The provider necessarily receives the connection's IP. No precise location or device permission is requested.

Country lookup runs alongside catalogue loading and times out after one second. If unavailable, playback can try an upload and use normal bounded recovery. Known blocked sources are removed from the viewer's live/shuffle/Guide/Library selections. Raw source records and country declarations remain intact.

Changing viewing country updates browsing lists without reloading an eligible programme. If the current upload becomes blocked, recovery moves to an eligible choice. Country exclusions do not become permanent video failures. Browser language is kept separate from location; content-language filters remain explicit user choices.

## Exact metadata and source coverage

Checked 54 previously untested official uploads: all 22 Samurai and 22 Super Samurai singles in the observed HasTV Team run, plus 10 official Kids double bills. Of these, 53 list 238 territories and one lists 249. Six Team alternates are omitted to preserve already retained story sources. Other Kids pairs stay out because individual singles cover the run and avoid overlapping double bills; not every unused pair has a complete canonical map.

[Per-ID metadata](power-rangers-depth-metadata-2026-11-13.json) records exact IDs, timestamps, publisher IDs, runtimes, publication dates and declared countries. Ownership follows primary corporate/publisher network links, not an Official suffix in a title. Licensed Stan guides corroborate canonical story order; publisher numbering remains separate.

Inventory boundaries:

- HasTV Team: 450 visible uploads across 15 ordinary Oldest pages, reaching all 44 Samurai/Super Samurai singles and the following unrelated page. The whole channel was not audited.
- Kids Videos: 240 visible uploads across 8 pages, including the observed 2025 double-bill run and older numbered uploads. Further channel pagination remains unchecked.
- Kids New Uploads: exhausted visible pagination at 230 entries / 229 unique IDs. The playlist advertises 262 and explicitly hides unavailable entries; 32 hidden entries cannot be identified or tested from that response.
- Super Ninja Steel: refreshed official HasTV Superheroes playlist contains the same 19 full episodes. Current Videos first 30 and bounded missing-title searches found no eligible full uploads for 20–22.

## Playback and completeness scope

**All 54 new candidate uploads passed actual muted advancing playback at the start and within their final 16 seconds** on the tv.leolune.fun diagnostic player. This includes every accepted source and unused alternatives. [Exact playback results](power-rangers-depth-playback-2026-11-13.json).

Named official Team singles have normal full-episode runtimes and corresponding licensed-guide identities. These checks do not certify every frame or an uninterrupted full-runtime viewing.

The 45:23 Super Samurai double bill was separately compared with named official Trading Places E03 and Something Fishy E04 editions. Primary auto-caption comparisons align both story spans through their separate post-battle closing scenes; the second begins around 1364seconds. Paused picture checks support the comparison. The publisher edition removes repeated opening narration and credits; it is not labelled uncut. Incorrect plot claims from its upload description were not copied. Transcript text is not republished.

These are browser/network samples. Shell country lookup returned GI, but the browser's network egress was not independently verified during the batch. Declared availability is not playback testing in 238 or 249 countries. Physical iPhone/Safari was not tested in this pass.

## Preservation and remaining gaps

All previous sources, source labels, channel numbers, exclusions and the first ten fixed schedules remain intact. Additions target only the continuous Power Rangers channel and Library. The private manager and existing private data are preserved with recoverable backups; the package includes the new shared regional module.

Super Ninja Steel 20–22 remain missing. The rest of the franchise, hidden entries, further channel pages and the whole catalogue are outside this 54-upload audit. No claim of complete global or full-catalogue validation is made.

## Release checks

- 367 automated tests passed, including real country-change→Library-recovery transitions, eligible-picture continuity, paused intent, filters/scroll retention, metadata gates, episode overlap and fixed schedule comparisons.
- Local browser country lookup returned Gibraltar. Switching GI→CN changed Samurai 23→4 sources and Super Samurai 21→2; returning to GI restored them. The existing Discovery Club picture advanced 71→82 seconds across the change without a restart. The country selector has an explicit accessible name.
- Localhost YouTube failures are not treated as source-deletion evidence; these sources separately passed public-origin embedded checks. Final live-app samples are stored in the dated local release checkpoint.
- Private sync verified 29 channels, Power 29 with 96 sources, 124 ZIP members, CRC and every payload. All 42 protected JSON files and manager/server/broadcast hashes were unchanged. Recoverable backups were kept.
