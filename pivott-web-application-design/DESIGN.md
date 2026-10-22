# Pivott visual direction

Pivott helps people examine their working week and plan a possible career move. Its interface should feel like a useful planning tool: clear enough to compare tasks, restrained enough to leave room for uncertainty, and readable on a phone.

## Type and colour

Use the native system font stack for body and display text. Hierarchy comes from size, weight, spacing, and placement. Reserve monospace for numerical or technical content. Avoid decorative uppercase labels and italic or coloured words inserted into headlines.

Preserve Pivott’s original palette: light surfaces (#F8FAF9, #FFFFFF), dark ink (#1F2937), teal actions (#0F766E), mint (#E6F7F4), and sky (#EAF4FF). Dark mode uses deep charcoal surfaces and lighter teal actions. Exposure colours retain their separate data meaning, with written classifications so colour is never the only explanation.

## Structure and graphics

Preserve the original landing task-map interaction, with its illustrative task values and hover/focus details. Keep task-map interactions stable. Preserve the existing scenario, signals, API verification, comparison, calendar and passport tools. Put the initial map before skill ratings, then use Work / Routes / Plan navigation.

Use borders and spacing to group content. Keep button corners compact, panels modestly rounded, and shadows quiet. Use solid forms and reading surfaces. Restrict glass to navigation, floating actions, small overlays and map details. Provide solid defaults, a backdrop-filter feature fallback and a reduced-transparency override. Avoid decorative glows and gradients. Motion should explain a user action and respect reduced motion.

## Content and uncertainty

Use plain language. Unknown skills stay unknown; custom tasks have no invented assessment. Keep illustrative labels and assessment coverage close to scores. Label partial routes and plans; do not infer readiness, employment outcomes or qualifications. Account saving is optional and explicit, with device/account choices rather than automatic merging.

## Research basis

Reviewed 22 October 2026:

- [Anthropic frontend design guidance](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): warns against generic SaaS cards, repeated typographic ornaments, and replacement defaults such as cream/serif/clay and dark/acid-green palettes.
- [Impeccable](https://github.com/pbakaus/impeccable): identifies recurring generated-interface patterns including default typography, purple-blue gradients, nested cards, and repeated icon tiles.

These are practitioner heuristics, not evidence that a font or colour proves AI authorship. Choices should follow the product and its audience. Public search was blocked during this research; this is a focused synthesis of accessible primary guidance, not a survey of public opinion.
