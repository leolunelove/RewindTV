# Rewind TV changelog

Dated changes to the player and catalogue. Each release records its validation scope. Browser samples do not certify every upload or worldwide playback.

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
