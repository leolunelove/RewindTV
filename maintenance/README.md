# Tuesday source checks

Run `Rewind Tuesday checks` with a bounded batch size. It runs automatically Tuesday at 03:00 Europe/Gibraltar, independently of the Mac.

The checker uses official Chrome (including MP4 codecs), fresh muted players and provider controls. YouTube controls come from two different publishers. A successful sample must advance at both the start and near the end; this is not full-duration or worldwide verification.

Metadata is checked independently using YouTube oEmbed and Archive media HEAD requests. Explicit unavailable watch-page evidence is parsed as JSON, never executed. Suspected deleted uploads and missing files get a second metadata attempt. Authentication/bot prompts, HTTP403 and generic refusals remain inconclusive.

`reports/latest.json` and dated reports distinguish:
- `playing`: start and tail sample passed on this runner.
- `source-review`: repeated explicit playback source errors with a passing provider control. Review the region before excluding globally.
- `transient`: network, timeout, autoplay or ambiguous failure.
- `runner-blocked`: provider controls failed; no source failure count or catalogue exclusion follows.

Metadata availability does not establish embedded playback. Metadata failures are tracked separately from playback failures. A provider may be blocked on GitHub while working in a viewer's browser. As of the 28 October verification, Archive samples pass; YouTube playback controls fail with 150 on GitHub, so YouTube checks there are metadata-only until a suitable playback runner is available.

The checker never edits the catalogue, channel numbers or fixed schedules. Records and reports are committed after each run, rebasing over unrelated main-branch updates. Diagnostic artifacts are retained for 30 days even if saving the checkpoint fails. A blocked provider or review finding intentionally makes the job fail to surface the limitation.

Local client recovery uses session exclusions for transient failures, retries stalled playback once, then selects another upload without a Retry click. It ignores stale player callbacks and timers during rapid switching. Deliberate Pause and browser-required autoplay gestures are respected. After repeated failures it backs off rather than looping through requests.
