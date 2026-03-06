# AI Coding Agent Guidelines for F.A.S. Motorsports CMS

**Project:** F.A.S. Motorsports E-Commerce CMS  
**Tech Stack:** Astro (frontend), Sanity CMS (content), Medusa (commerce), Stripe (payments), Shippo (shipping)  
**Last Updated:** January 2026

---

# IMPORTANT: MULTI-REPO ACCESS GRANTED

This project spans multiple repositories. You have read and write access to the following repos and their local paths:
Ensure you are familiar with the structure and relationships between these codebases before making changes.

| Repo          | Local Path                                                            | Agent Instructions                            |
| ------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| fas-cms-fresh | /Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-cms-fresh | This file (`.github/copilot-instructions.md`) |
| fas-sanity    | /Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity    | `AGENTS.md` (read before modifying schemas)   |
| fas-medusa    | /Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-medusa    | Check README.md for setup                     |

**Before modifying Sanity schemas or business logic**, read  
`/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/AGENTS.md`  
for repo-specific rules and patterns.

---

## 🚨 Architecture Authority (Non-Negotiable)

This repository follows a **Medusa-first commerce architecture**.

- Medusa is the single source of truth for all commerce data and logic
- Sanity is content-only (descriptions, images, SEO)
- Stripe and Shippo are accessed exclusively via Medusa
- fas-cms-fresh renders UI and consumes Medusa APIs only

If any instruction, legacy comment, or code path conflicts with this section,
**this section overrides it**.

---

## 🏗️ Architecture Overview

### System Responsibilities (Source of Truth)

| **Concern**                                                | **System**                |
| ---------------------------------------------------------- | ------------------------- |
| Products (variants, pricing, inventory, shipping profiles) | **Medusa**                |
| Customers / Orders / Cart / Checkout / Shipping            | **Medusa**                |
| Payments                                                   | **Stripe (via Medusa)**   |
| Shipping labels & live rates                               | **Shippo (via Medusa)**   |
| Content (descriptions, images, SEO, marketing pages)       | **Sanity**                |
| Storefront UI                                              | **fas-cms-fresh (Astro)** |

**Key Principles:**

- **Medusa** is the single commerce engine and transactional source of truth
- **Sanity** is content-only — no pricing, checkout, orders, or shipping logic
- **Stripe & Shippo** are accessed exclusively through Medusa
- **fas-cms-fresh** renders UI and calls Medusa APIs for all commerce actions

### Data Flow (Target / End State)

Sanity (content only)
↓ (one-time + enrichment sync)
Medusa (products, variants, pricing)
↓
fas-cms-fresh storefront
↓
Medusa cart & checkout
↓
Stripe payment (via Medusa)
↓
Shippo shipping (via Medusa)

### Current vs Target Architecture

**Currently (Transitioning):**

- Legacy Stripe and Shippo API routes still exist in `src/pages/api/*`
- Sanity contains historical product/order schemas (being phased out)
- Cart logic partially duplicated between fas-cms-fresh and Medusa

**Target (End State):**

- All commerce operations handled by Medusa APIs/modules
- Sanity used purely for content and presentation data
- fas-cms-fresh is a Medusa API consumer and UI renderer only

---

## 🛠️ Currently Under Construction

**Status:** Active migration phase — commerce ownership being consolidated into Medusa.

The following areas are **intentionally in flux** while the migration completes.

### In-Flight Systems (Open for Changes)

- **`src/pages/api/medusa/*`** — ✅ Active Medusa API integration (cart, checkout, products)
- **`src/lib/cart/*`** — Cart state management (transitioning fully to Medusa)
- **`src/pages/api/stripe/*`** — ⚠️ **LEGACY**: Direct Stripe calls being replaced by Medusa Stripe integration
- **`src/pages/api/shipping/*`** — ⚠️ **LEGACY**: Shippo now accessed via Medusa
- **Medusa commerce engine** (`fas-medusa` repo) — Products, variants, pricing, orders, checkout, payments, shipping
- **Sanity content sync** — One-time + enrichment sync from Sanity → Medusa (content only)

⚠️ Any system implying **Sanity as a transactional backend** is deprecated.

### Why These Are In Flux

We are migrating from **Sanity-as-commerce-backend** to  
**Medusa-as-commerce-engine**.

This migration includes:

- Moving product, pricing, inventory, orders, and checkout into Medusa
- Replacing direct Stripe and Shippo calls with Medusa-managed integrations
- Keeping Sanity strictly for content (descriptions, images, SEO)
- Finalizing fas-cms-fresh ↔ Medusa API boundaries

### Testing Across Repos

**Current State:**

- ✅ Local unit tests: `yarn test:unit` in each repo
- ❌ Cross-repo integration tests: Not yet implemented
- Manual validation required for Medusa ↔ fas-cms-fresh changes

**When modifying Medusa integration:**

1. Test cart operations in `fas-medusa` locally
2. Verify API responses in `fas-cms-fresh` storefront
3. Check Sanity sync doesn't break (content enrichment only)
4. Monitor browser console and server logs for errors

---

## 🚫 Protected Areas (Always Off-Limits Unless Explicitly Authorized)

**Backend & Logic:**

- `src/lib/**` (cart, checkout, pricing, shipping, auth, orders)
- `src/pages/api/**` (API routes, webhooks)
- Medusa workflows, modules, and pricing logic
- Sanity schemas and GROQ queries

**Structural Changes:**

- Do NOT rename, move, or delete files
- Do NOT modify function bodies or conditionals
- Do NOT add new dependencies
- Do NOT alter Tailwind config (except safe utility additions)

**Permission Rule:** Backend changes only permitted if the task explicitly states  
**“BACKEND CHANGE APPROVED”** or **“SCHEMA CHANGE APPROVED.”**

---

## 🟢 Allowed Changes (Default: UI-Only)

Unless explicitly authorized:

- Tailwind utility classes and responsive modifiers
- HTML / JSX / Astro markup
- CSS in `global.css`
- Typography, spacing, colors, shadows
- Accessibility attributes
- Component copy and labels

---

## 🔧 Critical Developer Workflows

### Build & Dev

```bash
yarn dev
yarn build
yarn lint
yarn type-check
yarn test:unit
```

Schema Paths (Reference)

**Before modifying schemas**, read `/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-sanity/AGENTS.md`

fas-sanity/packages/sanity-config/src/schemaTypes/documents/
├── product.ts (stable — content only)
├── vendor.ts (stable)
├── customer.ts (stable)
└── order.tsx (legacy / being removed)

⸻

📁 Project Structure & Patterns

Key Directories

src/
├── lib/ # Protected business logic
├── pages/api/ # Protected API routes
├── components/ # UI components
├── content/ # Static page content
└── types/ # TypeScript interfaces

⸻

## ⚠️ Governance & Safety Rules

- **Medusa is authoritative for all commerce data and validation**
- **Sanity is authoritative for content only**
- Do NOT invent fields that do not exist in schemas
- When unsure, stop and ask before changing backend behavior

⸻

## 🆘 Quick Troubleshooting

- **Issue Check**
- Cart / checkout fails Verify Medusa pricing + variant price_set links
- Shipping options missing Confirm cart insertion succeeds in Medusa
- Prices incorrect Check Medusa price sets, not Sanity
- Stripe errors Verify Medusa Stripe module + env vars

⸻

### 💡 Pro Tips

1. Medusa validates invariants — it does not infer (ensure variants have price_set configured)
2. Never split commerce responsibility (don't duplicate pricing logic)
3. If checkout breaks, inspect Medusa first (check cart creation, variant links, region setup)
4. Sanity should never block checkout (content is async enrichment only)
5. Document migrations clearly to avoid drift
6. Medusa regions must be configured before cart creation (check region_id in cart API calls)
