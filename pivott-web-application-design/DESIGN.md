# Pivott visual direction

Pivott helps people examine their working week and plan a possible career move. Its interface should feel like a useful planning tool: clear enough to compare tasks, restrained enough to leave room for uncertainty, and readable on a phone.

## Type and colour

Use the four local IBM Plex Sans weights (400, 500, 600, 700) through `next/font/local` for body and display text. Hierarchy comes from size, weight, spacing, and placement. Use tabular Plex numerals for aligned numerical content. Avoid decorative uppercase labels and italic or coloured words inserted into headlines.

Preserve Pivott’s original palette: light surfaces (#F8FAF9, #FFFFFF), dark ink (#1F2937), teal actions (#0F766E), mint (#E6F7F4), and sky (#EAF4FF). Dark mode uses deep charcoal surfaces and lighter teal actions. Exposure colours retain their separate data meaning, with written classifications so colour is never the only explanation.

## Structure and graphics

Preserve the original landing task-map interaction, with its illustrative task values and hover/focus details. Keep task-map interactions stable. Preserve the existing scenario, signals, API verification, comparison, calendar and passport tools. Put the initial map before skill ratings, then use Work / Routes / Plan navigation.

Use borders and spacing to group content. Keep button corners compact, panels modestly rounded, and shadows quiet. Use solid forms and reading surfaces. All navigation, floating actions, overlays and map details use solid surfaces. Avoid decorative glows and gradients. Motion is allowed only to show a state change, direct attention, or show data. Respect reduced motion. Do not add decorative loops, global page fades, automatic highlights or celebrations.

## Content and uncertainty

Use plain language. Unknown skills stay unknown; custom tasks have no invented assessment. Keep illustrative labels and assessment coverage close to scores. Label partial routes and plans; do not infer readiness, employment outcomes or qualifications. Account saving is optional and explicit, with device/account choices rather than automatic merging.

## Research basis

Reviewed 22 October 2026:

- [Anthropic frontend design guidance](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): warns against generic SaaS cards, repeated typographic ornaments, and replacement defaults such as cream/serif/clay and dark/acid-green palettes.
- [Impeccable](https://github.com/pbakaus/impeccable): identifies recurring generated-interface patterns including default typography, purple-blue gradients, nested cards, and repeated icon tiles.

These are practitioner heuristics, not evidence that a font or colour proves AI authorship. Choices should follow the product and its audience. Public search was blocked during this research; this is a focused synthesis of accessible primary guidance, not a survey of public opinion.

## Component decisions

Cards and sheets use 12px corners; inputs, buttons, menus and small labels use 8px. Pills are reserved for filters and status. Circles remain for actual graph nodes, progress markers and account avatars. Spacing follows content: compact controls, 20–24px panels and larger page gaps. Teal identifies actions, selections and graph data, without colouring a word in a headline. The hero has no eyebrow, rings or glow.

The shared UI primitives use Pivott palette tokens, an 8px control radius, soft neutral shadows, a 2px teal focus outline and solid popovers. Dialog and sheet overlays are opaque black tints without blur; bottom sheets use the 12px panel radius. Tooltip arrow geometry is exempt from panel corners. The passport's white export surface remains scoped for readable image/PDF exports. Fake QR graphics were already absent; the remaining reference number was removed because it implied verification.

No decorative gradients, glows, blur or icon-on-top card grids. The dot grid belongs only inside the working map canvas. Hero nodes may enter once as data appears; route cards may move when their rank changes.
