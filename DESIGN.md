# RewindTV design system

## 1. Purpose and scope

RewindTV is a nostalgic web TV for viewers who want to turn something on, surf channels and stumble onto a good show. Cover the public player, Channels, Guide, Library, Movie Night and their controls on desktop, tablet and phone. The private catalogue manager is outside this design system.

## 2. Product and user principles

- **Watch first.** Make resuming the last station and changing channels the shortest paths through the app.
- **Make discovery legible.** Give viewers distinct routes to see what’s on, find a specific title or ask for a random pick.
- **Keep the broadcast running.** Preserve playback while viewers browse. Make the route back to live TV easy to find after starting an episode or film.
- **Late Night Broadcast.** Let the picture carry the colour. Give the controls the quiet, tactile feel of a TV cabinet and the precision of teletext.

## 3. Visual hierarchy and layout rules

- Put the picture first, the current programme second and the remote third. Keep the right rail subordinate to the picture.
- Give the picture and remote the same alignment. Reserve room for controls to fade without shifting the picture.
- Keep channel numbers, titles and live status in predictable positions. Use numbered rows for stations and schedules. Save poster art for Movie Night.
- Use the existing RewindTV wordmark on the cabinet and the compact mark where width is limited.

## 4. Token and visual-system guidance

Use the active Late Night Broadcast overrides in [app-ui.css](site/app-ui.css) as the source of truth.

| Role | Shipped source |
| --- | --- |
| Surround and panel | `--bg` `#090b07`, `--panel` `#171b12` |
| Text and secondary text | `--paper` `#e9dec0`, `--muted` `#b0b99c` |
| Active and supporting accents | `--lime` `#b7c785`, `--cyan` `#c4cfaa` |
| Type | `--type-sans` IBM Plex Sans 400/600 for reading. `--type-mono` IBM Plex Mono 400 for numbers, time and short labels. Use `--room-small`, `--room-body` and `--room-title`. |
| Spacing and radius | Use `--room-unit`, `--room-edge`, `--room-gap`, `--room-pad` and `--room-radius`. Keep their existing viewport scaling and clamps. |
| Depth | Reuse the `.screen` bezel shadow and native dialog backdrops. |
| Motion | `--motion-touch` 180ms, `--motion-panel` 340ms, `--motion-picture` 680ms. Reuse `--ease-liquid` and `--ease-fade`. |
| Targets and focus | Use `--hit` for primary controls and the existing 2px `--lime` focus outline. |

## 5. Component selection and usage rules

| Existing component | Use it for |
| --- | --- |
| Picture and remote | Playback, channel stepping, audio, picture ratio and fullscreen. Keep volume and mute easy to find. |
| Channels | Tuning by channel number or name. Mark the tuned station in its numbered row. |
| Guide | **Now & Next** and the selected station’s schedule. Show times, titles and the current programme in rows. |
| Library | Finding a show and choosing an episode. Reuse search, filters, grouped results and paging. Preserve the route back to results. |
| Movie Night | Browsing films by genre or search, or opening **Pick for me**. Reveal the selection before offering **Watch from start**. |
| Info, Settings, Shuffle | One utility dialog at a time. Use existing buttons, checkboxes and range controls. Give each control a visible label. |

## 6. Interaction states and behavior

- Keep one active playback source. Give tuning immediate feedback and let the latest channel choice win. Attempt recovery automatically when a source fails.
- Keep controls visible during focus and active interaction. Let them fade during idle viewing. Reveal them on pointer, touch or keyboard input.
- Use Auto for source aspect ratio, with 4:3 as the fallback when the ratio is unknown. Keep 4:3 and 16:9 overrides available. Fit the full picture and animate the frame around it.
- Restore focus after dismissing a utility. Honour Escape and browser Back. Preserve channel and episode deep links.
- Offer **This channel** and **All channels** in Shuffle. Exclude adverts and known unavailable sources. Preview the pick without interrupting TV. Offer **Pick another** and **Watch from start**, then expose **Live TV** during on-demand playback.
- Keep a loading state brief and specific. Give empty searches a way to clear filters. Give exhausted playback recovery a clear next action.

## 7. Content and microcopy guidance

- Spell the brand **RewindTV**. Use short, familiar labels such as **Channels**, **Guide**, **Unmute** and **Live TV**.
- Show programme title, episode and channel in that order when describing a selection. Label the source in Info.
- Use English UI copy and the existing 24-hour schedule convention in the Europe/Gibraltar timezone. Preserve original titles, diacritics and scripts. UI translations and RTL support are [NEEDS TEAM INPUT].
- Keep private management controls out of public navigation. Playback can use third-party sources. Formal privacy, consent and retention policy is [NEEDS TEAM INPUT].

## 8. Accessibility requirements

- Use semantic headings, lists, buttons and form controls. Give icon-only controls accessible names and expose selected, pressed and expanded states.
- Keep focus visible on dark surfaces and over moving video. Test a complete keyboard path and avoid intercepting shortcuts while people type. Keep key controls reachable by touch and without hover.
- Communicate live, selected and error states with text or structure as well as colour. Respect reduced motion for the CRT, transitions and film reel. Keep sound optional.
- Formal WCAG conformance target and caption coverage standard are [NEEDS TEAM INPUT]. Check contrast, zoom and screen-reader announcements before release.

## 9. Responsive behavior

- At **960px and wider**, place the picture and remote on the left and the persistent station rail on the right.
- At **959px and narrower**, move navigation into a drawer. Put the programme and remote below the picture in portrait. Move the remote to the side in landscape at up to 540px tall.
- At **370px and narrower**, let navigation tabs and film actions wrap. Preserve the primary controls and the full picture.
- Respect viewport height and safe areas. Use the existing fluid tokens between breakpoints. Supported browser and device matrix is [NEEDS TEAM INPUT].

## 10. AI-specific UI patterns

Shuffle is a rules-based random pick. Describe the scope and outcome plainly. Future AI behaviour and disclosure requirements are [NEEDS TEAM INPUT].

## 11. Anti-patterns and prohibited choices

- Avoid stacked dialogs, duplicate navigation and long, unfiltered walls of results.
- Avoid generic card grids for stations and schedules, bright accent fills, decorative glass and faux hardware.
- Never stretch or crop a programme to fill the frame. Keep CRT effects adjustable.
- Avoid autoplaying a film from the Movie Night reveal or making Retry the standard way to tune.

## 12. Canonical design references

- [Live RewindTV](https://tv.leolune.fun/) and the [Late Night Broadcast release notes](docs/2026-11-06-late-night.md).
- [Player markup](site/index.html), [active stylesheet](site/app-ui.css), [panel motion](site/panel-motion.mjs) and [picture framing](site/picture-frame.mjs).
- [Guide](site/guide-overview.mjs), [Library](site/library-view.mjs), [Movie Night](site/movie-night-view.mjs), [wordmark](site/logos/rewind-wordmark.svg) and [compact mark](site/logos/rewind-mark.svg).
- Maintained Figma or Storybook reference is [NEEDS TEAM INPUT].

## 13. Preflight checklist before generating UI

- [ ] Name the viewer’s job, entry point and exit path.
- [ ] Identify the existing component, active token and playback state to preserve.
- [ ] Sketch desktop, portrait and short-landscape behaviour. Check focus and reduced-motion paths.
- [ ] Mark unresolved rules [NEEDS TEAM INPUT]. Keep the implementation scoped to the requested flow.

## 14. Final UI QA checklist

- [ ] Start TV, tune quickly, mute and change volume. Check auto recovery with an unavailable source.
- [ ] Open Guide and Library during playback. Check Back, Escape, focus restoration and the route to **Live TV**.
- [ ] Try both Shuffle scopes and Movie Night. Confirm the reel lands on the revealed film and playback starts only after selection.
- [ ] Check 4:3 and widescreen sources, frame changes, fading controls and CRT settings. Keep the rounded glass outside the picture corners. Confirm the full image stays visible.
- [ ] Test keyboard, touch, zoom, contrast and reduced motion. Inspect narrow portrait, short landscape and both sides of 960px for overlap and horizontal scrolling.

Structure adapted from the [AI UX Playground template](https://aiuxplayground.com/prompts/create-design-md/).
