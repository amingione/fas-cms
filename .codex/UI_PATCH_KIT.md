# UI PATCH KIT (Codex Helper)

Codex must use the following safe UI-only techniques:

## Layout Adjustments

- Adjust spacing using Tailwind (mt, mb, px, py, gap, space-x, space-y)
- Convert nested divs into cleaner flex/grid wrappers
- Use container classes for alignment

## Typography Improvements

- Use Tailwind text sizes, font-weight, tracking, leading
- Do not modify font imports or font-family logic

## Z-Index & Layering

- Use z-10, z-20, z-30, z-40, z-50
- Never add custom z-index numbers in CSS

## Color & Contrast

- Use Tailwind opacity utilities and color classes
- No new branding variables unless asked

## Accessibility

- Add labels, aria-label, aria-expanded
- Add alt text using existing product metadata
- Ensure tap targets are ≥ 40px

## Aspect Ratios

- Use `aspect-square`, `aspect-video`, `aspect-[x/y]`

## Hover & Focus States

- Use `hover:`, `focus:`, `active:`, `group-hover:` classes only

## Component Cleanup

- Remove duplicated DOM blocks only when the deletion does NOT affect JS logic
- Keep event handlers, props, and data mapping intact
- Do NOT change any JS function bodies

  END OF KIT
