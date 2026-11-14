# Maintenance and catalogue update — 14 November 2026

Source integration is complete. The combined public suite passes **388 tests**, and the compact playback catalogue has been rebuilt. The Library UI has been checked in a desktop browser and at a 390px viewport. Private synchronization and package verification pass. Live release verification follows publication.

## Catalogue additions

Added **64 official uploads, totaling 23.4 hours**, to existing channels and Library.

| Series | New uploads | Coverage |
| --- | --- | --- |
| Totally Spies | 26 | 25 season-two stories plus the preceding A Spy Is Born story. The Elevator recap is held. |
| The Transformers | 12 | 12 of 16 season-one stories, including the complete three-part More Than Meets the Eye pilot. |
| Beast Wars: Transformers | 26 | All 26 season-one stories. |

Cartoons and Toon Action admit the additions to fixed schedules on **17 November**. Relevant continuous mixes and Library receive them immediately. Existing channel numbers remain stable.

The public catalogue contains 33 channels, 5,326 enabled programme sources and six enabled advert sources. Counts describe the unfiltered source catalogue. Country filtering changes the programmes available to a particular viewer.

## Main-channel review

**57 existing main-channel uploads passed actual embedded start and near-end samples.** This batch contains 48 new maintenance-checkpoint entries and nine rechecks. Four of those 48 already had dated source-pack evidence, so the combined evidence coverage grows by **44 sources**.

All 57 metadata refreshes returned OK playability and embedding permission. Stored runtimes matched the source metadata within two seconds. The record keeps separate metadata-fetch and actual-playback timestamps.

Source declarations reveal restrictions on **13 existing uploads**. The app now carries these restrictions through its normal country filter.

| Existing source group | Uploads | Declared blocked countries |
| --- | --- | --- |
| The Magic School Bus | 4 | RU |
| Arthur | 3 | US |
| Father Ted | 1 | AU, CA, GB, IE, NZ, US |
| The Girl from Tomorrow | 1 | BD |
| Spellbinder | 1 | AT, BD, CH, DE, LI |
| Forensic Files | 1 | AU, DE |
| Bob Ross | 2 | GB |

These are provider declarations. Actual playback was sampled from one browser network whose exit country was not independently verified. The app lookup previously reported GI.

## Metadata and playback coverage

| Evidence | Exact scope |
| --- | --- |
| Public watch-page metadata | 137 unique source IDs attempted, with 136 OK responses and one private-video response |
| Accepted-addition metadata audit | 323 assertions across 64 uploads |
| Actual embedded playback | 121 unique uploads passed, comprising 57 existing sources and 64 additions |
| New-upload country declarations | 25 sources declare 237 territories and 39 declare all 249 recorded territories |

The **323 assertions are not 323 videos**. Metadata availability, embedding permission and actual playback remain separate evidence.

Playback samples observed an advancing clock at the beginning and after a seek within the final 16 seconds. They establish playback at those points. Full uninterrupted programmes, every internal story boundary, worldwide playback and physical iPhone/Safari behavior remain unverified.

The exact IDs, dates, titles, uploader identities, declared restrictions and sample results are in the [bounded metadata record](maintenance-growth-metadata-2026-11-14.json) and [bounded playback record](maintenance-growth-playback-2026-11-14.json).

## Corrections and remaining content work

- Brum source `86MhI8eaV1M` was observed as a later CGI edition. It is retained for recovery and leaves browsing and shuffle immediately. Its fixed-schedule cutoff is 17 November. The current week's scheduling series, kind, order and duration are preserved.
- Angela Anaconda source `O-VFMqfWphs` is now **Pet Peeves and more**, labelled **Compilation**. Automatic chapter topics span several plots across 61 minutes. Exact constituent episode identities and overlap with other uploads remain unresolved.
- Five 41-minute My Parents Are Aliens uploads still need their internal stories compared. Public caption requests returned empty responses, and one transcript-export attempt was unavailable. Neither result is a source playback failure.
- Thirteen chaptered Dungeons & Dragons uploads remain held until their internal joins and complete-story extents are checked. They contribute no additions or playback passes to this release.
- Totally Spies' The Elevator recap remains held to avoid padding the fresh-story rotation.
- Robotboy source `KdQ5QESO8Zk` returned a private-video metadata response and remains outside the additions.

The private maintenance ledger and dated source-pack evidence are combined when calculating coverage. The reviewed release candidate still has **2,472 enabled source IDs assigned to the main ten without any dated playback-start evidence**, down from 2,516. Across the public catalogue, including the six adverts, **3,100 enabled source IDs** lack that evidence. A dated start record does not certify an uninterrupted complete programme.

## Library corrections

Library counts distinct numbered stories within each season and shows explicit unnumbered specials separately. A double bill stays one playable row while contributing its known covered stories to the total.

If a source becomes ineligible in the selected country, the player says **Unavailable in this country**. Previous is disabled, and Next selects the first eligible entry when one exists. The player avoids a Programme 0 label.

## Validation and release state

- **388 public automated tests pass.**
- All **8,249 current public fixed programme/ad slots** retain their source IDs, starts, ends and advert markers. The compact catalogue preserves this schedule.
- The compact playback data is **3,089,495 bytes**. Full descriptions and transcripts are excluded.
- The private catalogue has received the 64 additions and 57 metadata updates. All 42 other private JSON files are unchanged. Its existing **8,245 fixed slots and 3,490 advert slots** are preserved.
- Browser checks at 390px confirmed no horizontal overflow in the new episode list, correct story totals, browsing restoration and paused country-block recovery. A blocked source stays paused; Previous is disabled and Next starts the first eligible programme. This is not a physical iPhone test.
- All 64 private UI checks pass, including the private API broadcast loader and independent full Library. The package contains 125 members; every payload and CRC matches disk. Manager/server and the other 42 JSON files retain their previous hashes. Recoverable source and package backups are kept.
- These are pre-release checks. The deployed asset and final live playback samples are recorded separately in the dated local checkpoint.

The public and private catalogues have separate histories and fixed schedules, so their slot counts differ. This report records each scope separately.
