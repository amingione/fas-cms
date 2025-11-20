# HEADER-ONLY UI PATCH KIT

Codex may ONLY modify UI markup and styling for header-related components.  
Codex must NOT change any functional logic, routes, schemas, or backend files.

---

## Allowed Header Tasks (UI-Only)

Codex may:

- Adjust Tailwind utility classes
- Adjust markup structure (HTML / Astro / JSX)
- Update spacing, padding, margins, and layout alignment
- Update typography sizes and weights
- Add or adjust z-index utilities for proper layering
- Add or improve accessibility attributes (aria-label, roles, alt, focus-visible)
- Adjust icon sizing, padding, or hit areas
- Modify the visual positioning of:
  - Logo
  - Menu toggle buttons
  - Cart button
  - Account button
  - Search button
- Ensure a single visible header renders (remove duplicated DOM blocks only if safe)
- Adjust sticky header behavior using CSS/Tailwind only (no JS changes)

---

## Strict Restrictions

Codex must NOT:

- Modify any JavaScript that controls menu toggles, drawers, overlays, or sticky logic
- Change any event listeners, handlers, or menu-open/close logic
- Modify routing or navigation structure
- Touch cart logic, cart indicators, or badge logic
- Edit product fetching or dynamic route behavior
- Modify any code inside /lib or backend
- Add new dependencies
- Remove or rename files

---

## Header Component Scope

Codex may edit the following UI-only header components:

- BaseLayout.astro
- header2.astro
- mobile-menu.tsx
- search overlay UI component
- account-panel UI component
- category-panel UI component
- global.css (UI utilities only)

---

## Notes

- All header changes must remain **purely cosmetic** and must not affect underlying logic.
- Drawer behavior must remain functional without modification to logic files.
- Sticky header must be adjusted visually only.

END OF KIT
