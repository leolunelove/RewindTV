# Rewind TV

A fullscreen nostalgia TV player with a shared schedule, channel surfing, CRT effects and a programme guide.

## Hosting

GitHub Pages publishes only `site/`. The Python manager, private inbox, backups and local runtime are deliberately excluded. The manager remains on the owner’s Mac; local manager edits need an explicit catalogue sync to this repository.

Classic quiz additions live in `site/gameshow-additions.json`; `site/library.mjs` merges them into the player, guide and maintenance catalogue without changing the first ten channels. Base entries take precedence, including disabled episodes.

## Tuesday maintenance

GitHub Actions runs Tuesdays at 03:00 Europe/Gibraltar, independently of the owner’s computer. Each run samples up to 250 uploads, rotating by oldest check, with a 20-minute job limit. Manual runs default to 10 uploads. Reports and coverage are committed to `reports/latest.json` and `data/state.json`.

Checks sample playback at the beginning and near the end. A single cloud runner cannot certify worldwide availability or complete episodes. It never removes sources based on one region or a blocked runner. The player handles failures for each viewer and skips unavailable alternatives. Findings fail the workflow so GitHub can notify the repository owner according to their Actions notification settings.

No downloaded TV or film files are hosted here; playback uses third-party embeds. Availability remains controlled by the source providers.

## Validation

`npm install --ignore-scripts` then `npm test`. Cloud playback also needs `npx playwright install --with-deps chromium`.

## Browse and After Dark

The player now has 18 channels. Browse Shows (keyboard B) opens over the playing TV, groups shows across channels and lets viewers choose an episode from the beginning. On-demand playback continues through the available show collection; Join Live returns to channel surfing.

`site/expansion.json` supplies the After Dark channel and broader library additions through `withExpansion` in `site/library.mjs`. Shared programme IDs are assigned to channels without counting crossover as new content; recorded region exclusions remain off-air. The Tuesday checker reads both supplements. New episodes and films were sampled at the beginning and near the end locally; this does not certify complete viewing or worldwide future playback.
