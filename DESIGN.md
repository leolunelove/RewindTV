# RewindTV design system

## 1. Purpose and scope

Design the public RewindTV player for people who want to watch nostalgic television, browse a real channel guide or choose a show or film. Apply this system to desktop, tablet and phone web layouts. Keep private catalogue management within its existing separate workflow.

## 2. Product and user principles

- Make Watch, Guide and Library the three primary destinations.
- Keep the programme playing while viewers browse. Preserve the selected source, playback position and audio state across navigation.
- Give live viewing, playback from the beginning and returning to live TV clear labels.
- Follow the approved Liquid Broadcast direction. Use a dark smoke-blue room, pale text, quiet glass controls and numbered broadcast rows. Let programme artwork supply most colour.
- Keep every existing channel and available title reachable. Preserve saved preferences, source credits and schedule rules.

## 3. Visual hierarchy and layout rules

- Make the picture the main element on Watch. Place programme identity and progress below it, with the compact remote nearby.
- Use a left navigation rail on desktop and bottom tabs on phone. Keep the same destination order and selected state.
- Move the existing mounted picture into the browsing mini-player. Measure the Watch and mini-player anchors, then interpolate the same picture between them.
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
| Browsing mini-player | The same mounted picture, current programme, play/pause, mute and return to Watch |
| Guide overview | Search all channels and current programmes. Filter by genre or schedule type. Expand a numbered row for Now, Next, Watch live, From start and Full schedule. |
| Full schedule | The selected channel’s real timeline, using Europe/Gibraltar times |
| Library Shows | Use `programmes` to include every playable non-film title, including TV, creator videos, web collections and music. Keep a Page jump beside the result count and retain bottom paging. Filters expose TV episodes, Collections, Listed only and All titles. |
| Show detail | Available episode count, real source links, season selection, episode search and paging |
| Library Films / Movie Night | Use the existing film library and `#movies` route under Library. Keep search, genre browsing and Pick for me together. |
| Info, Settings and Shuffle | One foreground utility over the current destination. Use native buttons, ranges, checkboxes and labelled controls. |

## 6. Interaction states and behavior

- Keep one active audio source. Pause the outgoing provider before loading another provider. Route main and mini-player controls through the same playback state.
- Keep the picture mounted when switching destinations. Apply geometry changes to its frame and anchors. Keep the full video contained within the resolved ratio.
- Use Auto aspect ratio with verified source dimensions and a 4:3 fallback. Preserve the saved 4:3 and 16:9 overrides per upload. Retain bars encoded into the source.
- Fade Watch controls during idle playback. Restore them on pointer, touch, keyboard input and focus. Keep them visible while paused or while an action needs attention.
- Preserve Guide search, page, filters and expanded row through schedule refreshes. Start near the tuned channel. Offer On my channel to return there.
- Preserve each Library title’s season, query, episode page and scroll position. Restore results paging, scroll and focus when going back. Keep the top Page jump synchronized with the bottom pager so large collections stay easy to reach.
- Reopening a retained title must record its detail above the Library results history entry. Browser Back returns to results before leaving Library.
- Keep utility history separate from destination history. Restore the invoking control after closing a utility. Honour Escape, backdrop dismissal and browser Back.
- Preview shuffle and Movie Night selections before playback. Keep This channel and Everywhere distinct. Watch from start begins the selected programme, and Return to live TV rejoins its channel.
- Let the latest tuning request win. Give loading and recovery a visible state and an automatic recovery path.

## 7. Content and microcopy guidance

- Spell the brand **RewindTV**. Use **Watch**, **Guide**, **Library**, **Shows**, **Films**, **Watch live**, **From start**, **Full schedule** and **Return to live TV** consistently. Label shuffle scope **This channel** and **Everywhere**.
- Show actual programme titles, episode identities, available counts and source credits. Preserve original scripts and diacritics.
- Use Now and Next only for data from the real playback plan. Keep illustrative prototype selections out of broadcast claims.
- Use English UI copy and 24-hour Europe/Gibraltar schedule times. Keep original audio language labels visible where relevant.
- Keep errors short and actionable. Describe a blocked upload or playback interruption using the evidence available.
- UI translations, RTL behaviour and formal privacy/consent/retention copy are [NEEDS TEAM INPUT].

## 8. Accessibility requirements

- Use semantic headings, native form controls and accessible names for icon actions. Expose current, expanded, selected and pressed states.
- Keep primary touch actions at the existing 44px target size. Verify every smaller secondary control on a physical phone.
- Keep keyboard focus visible over dark surfaces and video. Protect text input from global shortcuts. Restrict arrow-key tuning to Watch and Info. Browsing pages keep native arrow-key control and scrolling. C and G both open Guide.
- Keep source links outside playback buttons. Keep hidden page controls out of the tab order and retain one foreground utility.
- Announce search and filter results politely. Keep repeated schedule ticks from announcing identical counts.
- Honour reduced motion for picture movement, panel entry, CRT animation and film selection. Keep sound governed by the viewer’s audio and effects settings.
- Formal WCAG conformance target, caption coverage and supported assistive technology matrix are [NEEDS TEAM INPUT].

## 9. Responsive behavior

- At 960px and wider, use the 190px left rail. Fit the picture inside the remaining width and height.
- At 959px and narrower, use bottom navigation and safe-area spacing. Keep the mini-player above the tabs and page content clear of both.
- In landscape at up to 560px high, place Watch information and controls beside the picture. Preserve usable short-height browsing and utility sheets.
- Use two Library columns on phones, three on larger layouts and four at 1500px and wider. Retain the existing two-column exception from 960px to 1100px.
- Bound Guide to eight rows, or six below 650px viewport height. Page through the complete filtered lineup.
- Retain the compact control adjustments at 380px. Check 320px portrait, zoom, safe areas and rotation.
- Keep image-cover cropping separate from video containment. Supported physical devices and browser versions are [NEEDS TEAM INPUT].

## 10. AI-specific UI patterns

Shuffle and Pick for me use catalogue selection logic. Describe their scope and outcome plainly. Future AI behaviour and disclosure requirements are [NEEDS TEAM INPUT].

## 11. Anti-patterns and prohibited choices

- Stacked utility dialogs, duplicated top-level destinations and navigation that loses the current title or channel.
- Generic cards for Guide rows, full-screen decorative blur and competing bright accent colours.
- Recreating the player when a viewer opens a page, overlapping provider audio or stale callbacks retuning a newer selection.
- Stretching or cropping programme content, inferring source aspect ratio from thumbnail dimensions or removing encoded bars through zoom.
- Unbounded result lists, unreachable collections or preview links entering playable episode queues.
- Automatic playback from a shuffle or film reveal before the viewer chooses Watch.

## 12. Canonical design references

- [Application markup](site/index.html), [Liquid Broadcast styles](site/liquid-ui.css) and [application behavior](site/app.js).
- [Destination and utility motion](site/panel-motion.mjs), [picture framing](site/picture-frame.mjs) and [programme information](site/programme-info.mjs).
- [Guide](site/guide-overview.mjs), [Library](site/library-view.mjs), [Movie Night](site/movie-night-view.mjs) and [source-aware movie artwork](site/movie-night.mjs).
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
- [ ] Search TV, creators and music from the default Shows tab. Check every title type, top and bottom paging, episode seasons, saved positions and browser Back.
- [ ] Check both shuffle scopes, film selection and the reveal’s explicit Watch action.
- [ ] Test ratios, encoded bars, frame movement, idle controls and CRT settings with reduced motion enabled and disabled.
- [ ] Inspect keyboard, focus, touch, zoom, contrast and screen-reader output at desktop and phone sizes.
- [ ] Record completed QA and deployment evidence separately. Keep pending playback or physical-device checks explicit.

Structure adapted from the [AI UX Playground template](https://aiuxplayground.com/prompts/create-design-md/).
