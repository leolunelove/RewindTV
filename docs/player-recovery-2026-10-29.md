# Player initialization and switching — 29 October 2026

The standalone embedded checker exercises one fresh player. The app also has API bootstrap, queued channel changes, neighbour preparation, native-film handoffs and recovery timers. An upload passing the checker does not establish that all of those app paths work.

## Findings

- A missing player-ready handshake previously exhausted two attempts then called video-unavailable fallback. That session-marked a valid upload as failed even though the failure was at the player/connection layer.
- Neighbour players attached their API after iframe load, unlike the working checker. Unready preparations could time out and be rebuilt repeatedly.
- The same timeout variable was used for API bootstrap and player readiness. Native playback cleared it, and returning to an existing unready YouTube player did not re-arm it.
- A late YouTube-ready callback could invoke the current selection's load path after a film had been selected.
- Initial timeouts were intermittent: the failing production route was reproduced, but subsequent baseline starts also passed before the functional repair. No claim is made that every earlier timeout has one proven network cause.

## Changes

- Both active and prepared players attach the API directly to a DOM target before navigation/loading finishes.
- A dedicated readiness timer captures its player identity. It retries the latest selected programme after eight visible seconds; repeated failures use an eight-second backoff. Stale timers cannot replace a newer player, and initialization failure never marks an upload unavailable.
- Pre-ready errors use initialization recovery rather than calling playback commands that may not exist yet.
- Neighbour readiness comes from the cued event. If preparation remains unavailable for five seconds, the tab drops speculative background embeds and uses one active player. This avoids an endless recreation loop; switching still reuses the ready foreground player.
- Unconfirmed background errors cannot blacklist catalogue uploads.
- Film handoffs, deliberate pause, power-off and hidden tabs are guarded. Pause/play remain usable during reconnect backoff even with no current player instance.
- Optional `playerDebug=1` console timing traces remain available for diagnosis. They do not run in ordinary browsing. The temporary parameter-comparison experiment was removed.

## Validation

109 local regression tests pass, covering stale initialization callbacks, repeated handshake failure without video quarantine, latest-channel backoff, Archive return, late readiness during a film, pre-ready errors, pause/resume during reconnect, bounded preload fallback and existing playback/schedule behaviour.

The revised local app started the Brum upload `1H5V9AwLEXU` with the normal intro; the recorded PLAYING callback arrived about 1.84 seconds after navigation. A rapid five-key burst settled on channel 4, with Game On captions and programme time progressing. Settings confirmed light mode with one YouTube iframe after unsuccessful background preparation. No Retry was used.

These are browser/network samples, not a universal latency guarantee. Browser policies can still require a gesture to enable sound or start playback; a continuing network outage cannot be repaired by the player. No catalogue entries were disabled by this work.
