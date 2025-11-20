# MOBILE LAYOUT CONTRACT

Codex may adjust only:

- Tailwind responsive classes (sm:, md:, lg:)
- Spacing, padding, stacking order
- Mobile menu drawer markup (NON-functional)
- Height / width utilities
- Flex/grid wrappers for mobile flow
- Tap targets and accessibility
- Overflow, wrap, and text truncation

Codex may NOT:

- Modify any JS logic for menu toggles, drawers, or overlays
- Change any event listeners
- Rewrite any navigation logic
- Touch routing or page transitions
- Change cart, search, or account behaviors
- Touch sticky header JS or scroll listeners

Mobile improvements must be:

- Structural markup changes
- Tailwind class adjustments
- Z-index corrections
- Padding/spacing fixes
- Typography sizing adjustments
- Component grouping for mobile stacking

## Mobile Buttons & Component Styling

Codex may adjust mobile-only UI classes for buttons and components, including:

- Tailwind responsive classes (sm:, md:)
- Padding, margin, alignment
- Font size, weight, tracking (UI only)
- Button wrappers (div/flex/grid)
- Touch targets (min-height, min-width)

Codex may NOT:

- Modify global.css functional media queries
- Modify global button logic
- Change button JS handlers or event listeners
- Alter shared desktop button classes unless necessary for mobile stacking

Allowed mobile button adjustments:

- Tailwind utilities only
- Mobile-first overrides (e.g., `sm:`, `md:`)
- Applying or adjusting safe custom classes like `btn-plain`

Purpose:
Ensure mobile buttons have correct sizing, spacing, and stacking without altering core button behavior.

END OF CONTRACT
