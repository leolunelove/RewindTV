# Broadcast room release QA · 12 November 2026

## Scope

Applied the approved Home/page mockup direction to the actual vanilla-JS app. The presentation uses the existing mounted player; navigation does not recreate a playback source. The public site and private local manager remain separate.

## Automated and catalogue checks

- All 334 Node tests pass. Changed JavaScript parses, and `git diff --check` is clean.
- Rebuilt runtime matches the candidate byte for byte: SHA-256 `a51255fc654286a560a1907ce74734215b30cc3507af2e1f7cada07d5ec70e3b`, 2,807,466 bytes.
- All baseline video IDs, channel keys and numbers remain: 32 channels, 5,219 unique source IDs, 5,107 enabled unique programme IDs and 6 advert IDs.
- This week's first-ten-channel timetable retains all 8,249 baseline slots, including times and adverts. Existing deferred repeat retirements take effect on 17 November; records remain recoverable.
- Cloud reports do not feed the build and cannot silently remove catalogue entries.

## Browser checks

Tested in the in-app browser on this Mac's network, at actual viewport dimensions 1280×720, 390×844, 320×740 and 844×390. These are responsive browser tests, not physical iPhone or Safari tests. Playback observations below are muted starts/advancing media clocks, not full-runtime or worldwide availability certification.

- Startup opens the requested route and starts live media without Retry. Home displays real 32/114/412 counts and its returning programme.
- Repeated Next/Previous inputs settle on the final selected live channel, with a ready video clock and no Retry button.
- Guide and Home navigation preserve the current source. Guide uses real Now/Next times and inline actions; current-channel reveal and full timetable remain available.
- This channel and Everywhere previews leave the programme playing. Committing a pick starts the selected programme from the beginning.
- Shows search/Mix changes results; browser Back restores the search and mixed collection. Show detail, seasons, episode controls and Source links remain.
- Resume starts the saved Chad Vader episode around its saved 2:28 position. Returning to browsing keeps the episode playing, and returning to Watch rejoins the independently saved live channel.
- Films' native genre filter keeps every genre and limits the reel's pool. The unreduced reel lands and reveals the selected film; playback starts from that result.
- Phone browsing begins at the safe top edge with four bottom destinations. The settled mini-player stays above the tabs. No horizontal content overflow was found in the sampled narrow pages.
- Watching controls fade at idle and reappear for interaction. Keyboard G opens Guide. Settings opens as one sheet, toggles CRT, and restores the tested setting.
- Library has a direct fullscreen control. Actual fullscreen is unsupported by this in-app browser; real browser/device fullscreen is not certified here.

## Sampled playback

| Programme | Source | Observation |
| --- | --- | --- |
| Caillou · Science Project | YouTube `CRgE6X6ZNDQ` | Live media advanced while browsing Guide. |
| Home Movies · Method of Acting | YouTube `KIN5DavEPZ8` | Everywhere shuffle committed; video advanced from the start. |
| Chad Vader · The Night Shift | YouTube `gh8u6nTx8wY` | Resumed above 2:28 and continued through browsing. |
| Gadget Boy · in Toyland compilation | Live Toon Action | Final rapid-switch selection played at its scheduled offset; idle fade worked. |
| Yu-Gi-Oh! GX · Tag Team Trial, Part 2 | YouTube `J5jJ5ox0HcY` | This channel shuffle committed and video advanced from the start. |
| Planet of the Vampires | YouTube `QAgvmfVhJZY` | Film reel selection played; Library progress remained on return. |
| Computer Chronicles · Greatest Computer Games | Archive `CC1308_greatest_games/CC1308_greatest_games_512kb.mp4` | Direct video readyState 4 and clock advanced above 21 seconds. |

This release does not claim complete catalogue playback coverage, new region coverage, or end-to-end viewing of these programmes. Physical iPhone/Safari and broader network testing remain outstanding.
