# 今日鸟签 H5 Design System

Source: `ui-ux-pro-max` search pass, adapted for this project.

## Direction

今日鸟签 is a mobile-first ritual card experience. The interface should feel like opening a quiet paper sign in a forest: natural, Eastern, light-ritual, and calm. Keep the real forest photo and bird artwork as the main emotional assets.

## Style Blend

- Primary style: Nature Distilled
- Supporting style: E-Ink / Paper
- Accent language: Chinese paper sign, dark green cord, cinnabar seal, soft mist

Use this blend instead of generic landing-page patterns. Avoid event-page structures, SaaS dashboard styling, neon, cyberpunk, purple AI gradients, and pink beauty palettes.

## Tokens

- Ink: `#142019`
- Muted ink: `#647168`
- Deep green: `#123225`
- Leaf green: `#2f6f45`
- Moss: `#8aa96b`
- Reed gold: `#c2aa68`
- Paper: `#f8f3df`
- Warm paper: `#efe5c8`
- Cinnabar: `#9c2c22`
- Surface: translucent warm white over forest photo

## Typography

Use the existing Chinese system font stack. Keep the typography bold but not loud:

- Page title: compact, strong, white over forest
- Card titles: dark ink, heavy weight
- Metadata and small labels: muted ink, high contrast, no tiny low-contrast text
- Numbers and countdown: tabular figures

Do not scale font size with viewport width.

## Page Rules

### Home

- The draw card is the first usable experience, not a marketing hero.
- Unopened state should read as sealed paper, not an abstract circle.
- Revealed state should give the bird image generous space and no decorative circle behind it.
- Date line includes lunar date.

### Bird Nest

- Treat the grid as a paper field guide.
- Locked birds should look like misted silhouettes, not broken or disabled cards.
- Filters are tactile chips with clear active state and keyboard focus.

### Detail Sheet

- Bottom sheet should feel like a specimen note folded up from the forest floor.
- Bird image remains the main focal point.
- Stats are secondary paper chips.
- Close and play controls use icons, not text glyphs or emoji.

### Share Poster

- Poster is a saved paper talisman, not a generic social card.
- Keep strong white space, bird art, lunar date, and a subtle seal/brand footer.

## Interaction Rules

- Minimum touch target: 44px.
- All interactive controls need `cursor: pointer` and `:focus-visible`.
- Motion should be short and meaningful; respect `prefers-reduced-motion`.
- No layout shift on hover/press.
- Use SVG icons instead of emoji for UI controls.

## Verification

Check at:

- 375px mobile
- Current in-app browser width
- Home unopened and revealed
- Bird Nest
- Bird Detail sheet
- Share Poster

