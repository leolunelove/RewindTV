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

## Optional free remote Chrome (prepared, not activated)

A 29 October diagnostic also tested GitHub-hosted macOS and Windows. Both returned 150 for the Mr Bean and NCS controls while Archive played. Changing GitHub OS alone did not fix YouTube playback. Evidence: workflow 40804989457.

Browserless is the next candidate, not yet playback-verified. Its documented Free plan has 1,000 units/month, a 2-minute session cap, and no card requirement. Standard Chrome/CDP is used; no proxies, stealth mode, CAPTCHA solvers, profiles, or paid extras are requested.

Setup after creating a Free account:
1. Store its token in the repository Actions secret `BROWSERLESS_TOKEN`; never commit or paste it into a report.
2. Run `Verify free remote Chrome`. This tests provider controls plus two catalogue sources and keeps evidence as an artifact. It does not change the catalogue or checkpoint.
3. Only after YouTube start-and-tail controls pass, set Actions variable `REWIND_REMOTE_CHECKS` to `true`. Tuesday still runs on GitHub with the Mac off, delegating only YouTube playback to remote Chrome.

Limits are 40 remote sessions/run and 200/calendar month; each server session is capped at 110 seconds, below the free 2-minute maximum. Conservatively that is at most 800 browser-time units/calendar month for this integration; another tool's use and a different provider billing-cycle boundary can consume the remaining quota. Browserless's Free plan rejects further requests at quota instead of billing overages. Never upgrade the account automatically. Reaching the local cap records `budget-limit`, not a broken video. More of the catalogue is checked in subsequent batches; metadata checks remain independent.

Credentials and remote URLs are omitted from errors. Remote probes accept only the public `tv.leolune.fun/health-probe.html` endpoint and cannot access the private local manager. Keep remote checks disabled if controls are blocked on this service too.
