# F.A.S. Motorsports – Canonical Business Profile

> **Purpose:** Authoritative third-person reference for directory listings, citation aggregators, AI knowledge graph consumption, and schema.org markup. This is NOT on-site copy — the site speaks in first person. Use this wherever FAS is being *described*, not where FAS is *speaking*.
>
> **Last updated:** 2026-03-26
> **NAP source of truth:** `src/lib/nap.ts`
> **Schema source of truth:** `src/lib/structuredDataDefaults.ts`
> **Brand voice guidelines:** `.claude/brand-voice-guidelines.md`
> **AI-readable version:** `public/llms.txt`

---

| Business Name | **F.A.S. Motorsports**                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain        | [**fasmotorsports.com**](https://fasmotorsports.com)                                                                                        |
| Address       | 6161 Riverside Dr, Punta Gorda, FL 33982                                                                                                    |
| Service Areas | **Charlotte, Lee & Sarasota Counties, FL** (in-person builds & installs) · **Nationwide** (parts & kits ship across the United States)      |
| Phone         | **(812) 200-9012**                                                                                                                          |
| Email         | **sales@fasmotorsports.com**                                                                                                                |

---

**F.A.S. Motorsports** is a family-owned, vertically integrated performance manufacturer based in Punta Gorda, Florida, operating since 2002.[^1][^2] Three generations of in-house engineering: every part designed, machined, installed, and dyno-validated under one roof at 6161 Riverside Dr.[^1][^2] They specialize in supercharger systems, billet performance components, custom stainless fabrication, and complete dyno-proven power packages from 800 to 1,000+ HP for Hellcat, Charger, Challenger, TRX, Trackhawk, and select high-performance platforms.[^1][^4]

In-person builds and installations serve Charlotte, Lee, and Sarasota counties. Performance parts and kits ship to customers across the United States.[^1][^3] F.A.S. is also a certified IGLA anti-theft installer — one of the only certified installers in Southwest Florida.[^4]

Contact them at **(812) 200-9012** or **sales@fasmotorsports.com**, or visit [fasmotorsports.com](https://fasmotorsports.com).[^1][^3]

#### Sources
[^1]: [F.A.S. Motorsports Website](https://fasmotorsports.com)
[^2]: [Our Story](https://fasmotorsports.com/about)
[^3]: [Contact](https://fasmotorsports.com/contact)
[^4]: [Services](https://fasmotorsports.com/services)

---

## NAP Consistency Audit

All canonical data points are centralized in `src/lib/nap.ts`. Any directory listing, schema markup, or citation should match these values exactly.

| Field           | Value                          | Source                  |
| --------------- | ------------------------------ | ----------------------- |
| Business Name   | F.A.S. Motorsports             | `BUSINESS_NAME`         |
| Street Address  | 6161 Riverside Dr              | `BUSINESS_ADDRESS_LINE1`|
| City            | Punta Gorda                    | `BUSINESS_ADDRESS_LOCALITY` |
| State           | FL                             | `BUSINESS_ADDRESS_REGION` |
| Zip             | 33982                          | `BUSINESS_ADDRESS_POSTAL_CODE` |
| Country         | US                             | `BUSINESS_ADDRESS_COUNTRY` |
| Phone (display) | (812) 200-9012                 | `BUSINESS_PHONE_NATIONAL` |
| Phone (E.164)   | +18122009012                   | `BUSINESS_PHONE_E164`   |
| Email           | sales@fasmotorsports.com       | `BUSINESS_EMAIL`        |

## Schema.org Type

- **LocalBusiness `@type`:** `AutoPartsStore` (`src/lib/structuredDataDefaults.ts`)
- Reflects the manufacturer + parts sales nature of the business. `AutoRepair` was incorrect and has been updated.

## GBP Category Stack

- Primary: `Motorsports store`
- Additional: `Auto tune up service`
- Additional: `Auto parts manufacturer`
