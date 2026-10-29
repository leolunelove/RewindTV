# Main-channel catalogue quality — 29 October 2026

This pass prioritised channels 1–10. No programmes or channels were added. Channel numbers and scheduling policy are unchanged.

## Coverage

- Scanned 3,016 enabled unique uploads on the main ten for episode-number identities, shortened labels, relative runtimes and compilation clues.
- Retrieved current publisher titles, descriptions, durations and public playability metadata for 125 uploads across Gadgetinis, Magic School Bus, Arthur, Brum, My Parents Are Aliens, Angela Anaconda, The Raccoons, Rosie and Jim, and Beyblade. All 125 reported OK and playableInEmbed=true; none had a duration difference greater than five seconds. This is metadata evidence, not 125 playback tests.
- The following 20 short-upload metadata checks received HTTP 429 twice each. They remain inconclusive and queued; no source was disabled because of throttling. A subsequent YouTube watch page also showed an unusual-traffic check. No attempt was made to bypass it.
- Actual embedded start/near-end checks are listed below. Browser network country is unverified; no other region was tested. Endpoints do not establish that the middle of an episode is uncut.

## Recoverable repairs

| Channel | Source held out of rotation | Reason / retained source |
|---|---|---|
| 01 Rewind One | `nweyz9iUgH4` | Kerching S4E9 Making a Difference; retain established 2019 upload `sTw2Qffoulk`. |
| 01 Rewind One | `USRQT9_UDXQ` | Kerching S4E8 Making a Good Impression; retain established 2019 upload `rSGBr16N3R4`. |
| 02 Rewind Cartoons | `uix3-_FSjuQ` | Dog City episode 6, shorter #TBT duplicate; retain `PIg2Wm6yw3U`. |
| 02 Rewind Cartoons | `Uz_nU2vcoXE` | Dog City episode 11, shorter #TBT duplicate; retain `vksBpNS9mmk`. |
| 02 Rewind Cartoons | `2CX39hF_OnQ` | Dog City episode 9, shorter #TBT duplicate; retain `DEpOqvkjeB8`. |
| 03 Rewind Junior | `c3HwZaSLHz4` | Timothy Goes to School episode 20, same two named stories; retain `VwB7XPiPeMw`. |
| 03 Rewind Junior | `rO-nNiFtDhA`, `JOEhj5bMUFM`, `PaNWJK3ma_Q` | Same five Brum stories reordered; retain compilation `1H5V9AwLEXU`. Official chapter lists agree on Naughty Dog, King of Thieves, Pizzeria, Gymnast and Airport Adventure. |
| 05 Toon Action | `GajRwV8fuFE` | Compilation overlaps the standalone Trick or Trap upload `dQpJoKq67Rk`. Other material is unmapped, so this is a review quarantine, not a claim the whole compilation is duplicated. |
| 06 Rewind Sci-Fi | `n5TO8bfcLMs` | Sarah Jane Adventures S01E02 labelled 1/2; actual runtime 812.221 seconds. A split upload rather than a complete regular episode; no matching second file in this catalogue. |

All eleven source records remain available for review and restoration. Healthy alternatives were checked before the duplicate copies were excluded.

## Kept deliberately

- Beyblade: publisher titles account for episodes 1–51, V-Force 1–51 and G-Revolution 1–52, with no repeated episode numbers within a run. Paired episodes remain in rotation. Metadata coverage does not prove every frame is complete.
- Short standalone cartoon stories were not removed for being under 15 minutes.
- Full dramatic episodes whose story title contains Part 1 or Part 2 remain; these differ from an upload explicitly split into 1/2.
- Kerching's two different titles both labelled series 3 episode 4 remain pending identity review. Conflicting numbering alone is insufficient evidence of duplication.

## Next review

Continue the main ten before expanding: the 20 throttled short-upload checks, three Genie from Down Under candidate duplicate pairs, Zoboomafoo Homes, then the internal episode contents of Angela Anaconda, My Parents Are Aliens, Magic School Bus and Arthur compilations. Rosie and Jim's Rollerblades collection has named overlap with shorter uploads, but its full coverage still needs mapping.

The private dated checkpoint retains every checked ID, raw publisher metadata, attempt status, chapter evidence and remaining review queue. Catalogue-wide playback and worldwide availability remain unverified.

## Embedded endpoint samples

| Source | Start / near end | Runtime (seconds) |
|---|---|---:|
| `1H5V9AwLEXU` | passed / passed | 2828 |
| `n5TO8bfcLMs` | passed / passed; still incomplete by upload identity | 812.221 |
| `PIg2Wm6yw3U` | passed / passed | 1285 |
| `vksBpNS9mmk` | passed / passed | 1283.981 |
| `rSGBr16N3R4` | passed / passed | 1637.321 |
| `VwB7XPiPeMw` | passed / passed | 1566 |
| `sTw2Qffoulk` | passed / passed | 1612 |
| `DEpOqvkjeB8` | passed / passed | 1285 |
| `HteflIAHzOI` | passed / passed; short Arthur story retained | 807 |

98 regression tests passed locally after the exclusions.
