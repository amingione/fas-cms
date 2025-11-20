# PRODUCT CARD CLEANUP CONTRACT

Codex may ONLY adjust UI-level aspects of product card components.  
No logic, routing, or data fetching behavior may be altered.

---

## Goal

Ensure all product cards across the site have consistent:

- Aspect ratio
- Typography
- Title line-clamp
- Price alignment
- Hover/focus styles
- Spacing and layout
- Image container structure

---

## Allowed Product Card Changes (UI-only)

Codex may:

- Adjust Tailwind utility classes in product card components
- Add or refine aspect ratio wrappers (e.g., aspect-square, aspect-video)
- Apply text truncation (e.g., `line-clamp-2`)
- Standardize padding, margins, and spacing
- Improve alignment of title + price
- Refine hover states using Tailwind (scale, shadow, border, opacity)
- Add or enhance accessibility attributes (alt text, aria-labels)
- Remove duplicated or unused DOM nodes that do not affect logic
- Adjust image wrappers to prevent distortion or layout shift (CLS)
- Improve mobile responsiveness using Tailwind breakpoints
- Add or modify UI-only utility classes in global.css

---

## Strict Restrictions

Codex must NOT:

- Modify product fetching logic (sanity-utils.ts)
- Modify GROQ queries
- Modify cart, checkout, pricing, or quantity logic
- Edit /lib functions or backend logic
- Modify dynamic routing logic
- Change slugs or URL structures
- Modify product schema fields
- Change add-to-cart functionality
- Add new dependencies
- Move, rename, or delete files

---

## Product Card Component Scope

Codex may edit the following UI-only components:

- ProductCard.tsx
- Any Astro product grid templates
- Product image wrappers
- Product title/price display markup
- Hover/active/focus styles inside card components
- global.css (UI utilities only)

Codex must NOT modify:

- Quick View logic
- Add-to-cart logic within buttons
- Any JS functions or TS code handling state, props, or events

---

## Notes

- All edits must remain purely cosmetic and must not change how cards behave or interact with cart/checkout systems.
- If a component is logic-heavy, Codex must limit itself to HTML structure and Tailwind classes only.

END OF CONTRACT
