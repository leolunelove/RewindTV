# RewindTV design system

## 1. Purpose and scope

Design the public RewindTV player for people who want to watch nostalgic television, browse a real channel guide or choose a show or film. Apply this system to desktop, tablet and phone web layouts. Keep private catalogue management within its existing separate workflow.

## 2. Product and user principles

- Make Watch, Guide and Library the three primary destinations.
- Keep the programme playing while viewers browse. Preserve the selected source, playback position and audio state across navigation.
- Give live viewing, playback from the beginning and returning to live TV clear labels.
- Give Library choices their own watching page. Keep the last live channel separate from the selected show or film.
- Let viewers resume unfinished Library programmes without changing their live channel or browsing position.
- Follow the approved Liquid Broadcast direction. Use a dark smoke-blue room, pale text, quiet glass controls and numbered broadcast rows. Let programme artwork supply most colour.
- Keep every existing channel and available title reachable. Preserve saved preferences, source credits and schedule rules.

## 3. Visual hierarchy and layout rules

- Make the picture the main element on Watch. Place programme identity and progress below it, with the compact remote nearby.
- Use a left navigation rail on desktop and bottom tabs on phone. Keep the same destination order and selected state.
- Move the existing mounted picture between live Watch, the browsing mini-player and the Library watching stage. Measure their anchors and interpolate the same picture between them.
- Give Guide numbered, ruled rows. Use image covers for Library shows and films. Keep utility actions visually subordinate.
- Keep source imagery tied to the actual upload. Use a restrained fallback when an image fails.

## 4. Token and visual-system guidance

Use the final overrides in [liquid-ui.css](site/liquid-ui.css), loaded by [app-ui.css](site/app-ui.css). Inspect the effective cascade before changing a value.

| Role | Current implementation |
| --- | --- |
| Room and surface | `--bg` `#111b28`, `--panel` `#1b2b3c` |
| Reading text | `--paper` `#edf1ef`, `--muted` `#9cb0c2` |
| Lines and accents | `--line` `#d4e5f019`, `--lime` `#d5e5e9`, `--cyan` `#c1dbe9` |
| Main type | `--type-sans` uses `-apple-system`, `BlinkMacSystemFont`, Helvetica Neue, Arial and sans-serif |
| Numbers and time | `--type-mono` uses `ui-monospace`, SFMono-Regular, Consolas and monospace. Doto supplies the dotted wordmark and archive-cover fallback. |
| Type tokens | `--room-body` `14px`, `--room-small` `12px`, `--room-title` `28px`. Retain each component’s responsive hierarchy. |
| Space and shape | `--room-pad` `24px`, `--room-gap` `14px`, `--room-radius` `24px`. Phone overrides use `20px` padding and `12px` gaps. |
| Navigation | `--rail` `190px` on desktop. Phone uses `--rail` `0px` and a `72px` navigation height plus the bottom safe area. |
| Targets and focus | `--hit` `44px`. Focus uses a `2px` `#c5dce9` outline with a `3px` offset. |
| Motion tokens | `--motion-touch` `160ms`, `--motion-panel` `240ms`, `--motion-picture` `680ms`. `--ease-liquid` is `cubic-bezier(.22,1,.36,1)`. |
| Effective transitions | The mounted picture currently uses `680ms`. Page entry uses `220ms` and utility entry uses `280ms` in `panel-motion.mjs`. Check these overrides when tuning motion. |
| Depth | Reuse the existing remote pill, picture shadow and native dialog backdrop. Restrict backdrop blur to these small control surfaces. |

## 5. Component selection and usage rules

| Component | Usage |
| --- | --- |
| Watch and remote | Programme title, live state, progress, next programme, play/pause, channel stepping, volume, mute, picture shape and fullscreen |
| Browsing mini-player | The same mounted picture, current programme, play/pause, mute and return to the current watching destination |
| Guide overview | One continuous numbered channel list. Search all channels and current programmes. Filter by genre or schedule type. Expand a row for Now, Next, Watch live, From start and Full schedule. |
| Full schedule | The selected channel’s real timeline, using Europe/Gibraltar times |
| Library Shows | Use `programmes` to include every playable non-film title, including TV, creator videos, web collections and music. Scroll all matching titles once. Default to stable Mixed order; offer Mix Library / Mix again and A–Z. Show alphabet jumps only in A–Z. Filters expose TV episodes, Collections, Listed only and All titles. |
| Show detail | Available episode count, real source links, season selection and episode search. Keep all matching episodes in one chronological list. |
| Library Films / Movie Night | Use the existing film library and `#movies` route under Library. Scroll all matching films. Keep Mixed / A–Z, Mix Library, search, genre browsing and Pick for me together. |
| Library watching page | Use `#library-watch` under Library. Show the contained picture, programme identity, seek timeline, pause, volume, episode stepping, ordered episode list, end state and source link. Back to browsing returns to its origin. |
| Continue watching | One compact row in Shows and Films. Keep up to twelve recent unfinished titles: the latest episode per show and individual films. Show saved progress, Resume and a labelled remove action. Offer the matching Resume action in show detail alongside playback from the beginning. |
| Info, Settings and Shuffle | One foreground utility over the current destination. Use native buttons, ranges, checkboxes and labelled controls. |

## 6. Interaction states and behavior

- Keep one active audio source. Pause the outgoing provider before loading another provider. Route main and mini-player controls through the same playback state.
- Keep the picture mounted when switching destinations. Apply geometry changes to its frame and anchors. Keep the full video contained within the resolved ratio.
- Use Auto aspect ratio with verified source dimensions and a 4:3 fallback. Preserve the saved 4:3 and 16:9 overrides per upload. Retain bars encoded into the source.
- Fade Watch controls during idle playback. Restore them on pointer, touch, keyboard input and focus. Keep them visible while paused or while an action needs attention.
- Preserve Guide search, filters, scroll and expanded row through schedule refreshes. Start near the tuned channel. Offer On my channel to return there.
- Preserve each Library title’s season, query and scroll position. Restore results filters, order, visible anchor and focus when going back from a detail or player. Store browse preferences locally when storage is available; blocked storage must not break browsing.
- Rank Mixed titles by a stable seed and title identity. Keep the seed through filtering, sorting and Back; only an explicit Mix changes it. Deduplicate title identities. Never mix the episode queue or start playback when mixing covers.
- Keep live-channel selection independent from Library playback. Library episodes continue in order; an exhausted collection stays within Library with replay or browsing actions. Watch rejoins the saved live channel.
- Save Library episode identity and position locally about every five seconds, plus pause, seek, leaving playback and page exit. Live broadcasts must not create resume records. Storage failure must preserve in-session playback and browsing.
- Resume uses the saved episode and position. From beginning explicitly starts again. Remove finished entries and allow removal of a single title without deleting catalogue content. Keep Continue watching independent from Mix, filters and saved scroll anchors.
- Keep progress in this browser. Do not imply an account or cross-device sync. Persist only identities, clocks and minimal context; resolve titles, source URLs and artwork from the current catalogue.
- Reopening a retained title must record its detail above the Library results history entry. Browser Back returns to results before leaving Library.
- Keep utility history separate from destination history. Restore the invoking control after closing a utility. Honour Escape, backdrop dismissal and browser Back.
- Preview shuffle and Movie Night selections before playback. Keep This channel and Everywhere distinct. Watch from start begins the selected programme, and Return to live TV rejoins its channel.
- Let the latest tuning request win. Give loading and recovery a visible state and an automatic recovery path.

## 7. Content and microcopy guidance

- Spell the brand **RewindTV**. Use **Watch**, **Guide**, **Library**, **Shows**, **Films**, **Watch live**, **From start**, **Full schedule** and **Return to live TV** consistently. Label shuffle scope **This channel** and **Everywhere**.
- Use **Continue watching**, **Resume** and **From beginning** for saved Library progress. Give remove controls a title-specific accessible name. Keep remaining-time copy short.
- Show actual programme titles, episode identities, available counts and source credits. Preserve original scripts and diacritics.
- Use Now and Next only for data from the real playback plan. Keep illustrative prototype selections out of broadcast claims.
- Use English UI copy and 24-hour Europe/Gibraltar schedule times. Keep original audio language labels visible where relevant.
- Keep errors short and actionable. Describe a blocked upload or playback interruption using the evidence available.
- UI translations, RTL behaviour and formal privacy/consent/retention copy are [NEEDS TEAM INPUT].

## 8. Accessibility requirements

- Use semantic headings, native form controls and accessible names for icon actions. Expose current, expanded, selected and pressed states.
- Keep primary touch actions at the existing 44px target size. Verify every smaller secondary control on a physical phone.
- Keep keyboard focus visible over dark surfaces and video. Protect text input from global shortcuts. Restrict arrow-key tuning to live Watch and Info. Library playback arrows seek ten seconds; browsing lists retain native arrow-key control and scrolling. C and G both open Guide.
- Keep source links outside playback buttons. Keep hidden page controls out of the tab order and retain one foreground utility.
- Announce search and filter results politely. Keep repeated schedule ticks from announcing identical counts.
- Honour reduced motion for picture movement, panel entry, CRT animation and film selection. Keep sound governed by the viewer’s audio and effects settings.
- Formal WCAG conformance target, caption coverage and supported assistive technology matrix are [NEEDS TEAM INPUT].

## 9. Responsive behavior

- At 960px and wider, use the 190px left rail. Fit the picture inside the remaining width and height.
- At 959px and narrower, use bottom navigation and safe-area spacing. Keep the mini-player above the tabs and page content clear of both.
- In landscape at up to 560px high, place Watch information and controls beside the picture. Preserve usable short-height browsing and utility sheets.
- Use two Library columns on phones, three on larger layouts and four at 1500px and wider. Retain the existing two-column exception from 960px to 1100px.
- Keep Guide, title, film and episode results in continuous native scroll areas. Render every matching result, lazy-load artwork and preserve the visible anchor through grid changes.
- Retain the compact control adjustments at 380px. Check 320px portrait, zoom, safe areas and rotation.
- Keep image-cover cropping separate from video containment. Supported physical devices and browser versions are [NEEDS TEAM INPUT].

## 10. AI-specific UI patterns

Shuffle and Pick for me use catalogue selection logic. Describe their scope and outcome plainly. Future AI behaviour and disclosure requirements are [NEEDS TEAM INPUT].

## 11. Anti-patterns and prohibited choices

- Stacked utility dialogs, duplicated top-level destinations and navigation that loses the current title or channel.
- Generic cards for Guide rows, full-screen decorative blur and competing bright accent colours.
- Recreating the player when a viewer opens a page, overlapping provider audio or stale callbacks retuning a newer selection.
- Stretching or cropping programme content, inferring source aspect ratio from thumbnail dimensions or removing encoded bars through zoom.
- Arbitrary title shortlists, page selectors that hide matching content, duplicate title identities or preview links entering playable episode queues.
- Mixing episode chronology, replacing the saved live channel with a Library choice, or falling into live TV when a Library collection finishes.
- Resuming when an action promises playback from the beginning, recording live broadcasts as Library progress, or adding completed and unavailable titles to Continue watching.
- Automatic playback from a shuffle or film reveal before the viewer chooses Watch.

## 12. Canonical design references

- [Application markup](site/index.html), [Liquid Broadcast styles](site/liquid-ui.css) and [application behavior](site/app.js).
- [Destination and utility motion](site/panel-motion.mjs), [picture framing](site/picture-frame.mjs) and [programme information](site/programme-info.mjs).
- [Guide](site/guide-overview.mjs), [Library](site/library-view.mjs), [stable Library ordering](site/library-order.mjs), [Movie Night](site/movie-night-view.mjs) and [source-aware movie artwork](site/movie-night.mjs).
- [Local Library watch history](site/watch-history.mjs) defines saved progress, completion and catalogue resolution.
- [RewindTV](https://tv.leolune.fun/) is the public release reference. Confirm the deployed revision before using screenshots as a specification.
- A maintained Figma, Storybook or approved prototype capture within this repository is [NEEDS TEAM INPUT].

## 13. Preflight checklist before generating UI

- [ ] Identify the destination, viewer action and route back to Watch.
- [ ] Read the effective CSS and reuse its existing tokens and controls.
- [ ] Preserve catalogue coverage, source attribution, schedule gates and local preferences.
- [ ] Account for the mounted player, active provider and foreground utility.
- [ ] Plan narrow portrait, short landscape, keyboard and reduced-motion behavior.
- [ ] Mark unresolved decisions [NEEDS TEAM INPUT].

## 14. Final UI QA checklist

- [ ] Test startup, rapid tuning, recovery, volume, mute and pause across YouTube and direct Archive sources.
- [ ] Move between Watch, Guide, Library and Movie Night during playback. Check picture continuity and a single active audio source.
- [ ] Check numbered Guide rows, search across the full lineup, filters, Now/Next, replay and full schedule actions.
- [ ] Search TV, creators and music from the default Shows tab. Reach every matching title and episode without paging. Check Mixed / A–Z, explicit Mix, seasons, source links, saved anchors and browser Back.
- [ ] Start a Library show and film, seek, step episodes and return to browsing. Confirm the last live channel stays separate and an exhausted collection remains in Library.
- [ ] Pause a Library episode, switch to live TV, reload and Resume it. Check the episode and position, From beginning, completion, single-entry removal, blocked storage and unchanged browse anchors. Confirm live playback never enters Continue watching.
- [ ] Check both shuffle scopes, film selection and the reveal’s explicit Watch action.
- [ ] Test ratios, encoded bars, frame movement, idle controls and CRT settings with reduced motion enabled and disabled.
- [ ] Inspect keyboard, focus, touch, zoom, contrast and screen-reader output at desktop and phone sizes.
- [ ] Record completed QA and deployment evidence separately. Keep pending playback or physical-device checks explicit.

Structure adapted from the [AI UX Playground template](https://aiuxplayground.com/prompts/create-design-md/).
