# Analytics Roadmap — Phased Implementation

## Phase 1: Instrument and Measure (Days 0–90)

### Outcomes
- Full visibility into the ecommerce funnel via GA4 enhanced ecommerce
- Operational KPI dashboards for daily decision-making
- Documented data contracts across all systems
- Clean break from legacy WooCommerce

### Deliverables

#### 1.1 GA4 Enhanced Ecommerce via GTM
- Configure GTM container with enhanced ecommerce tags
- Implement dataLayer pushes for: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`
- Add custom dimensions: `platform` (vehicle platform), `build_stage`, `customer_type`
- Validate events in GA4 DebugView

#### 1.2 Server-Side Event Pipeline (Measurement Protocol)
- Pipe Medusa server-side events to GA4 via Measurement Protocol
- Events: `purchase` (server-side confirmation), `refund`
- Implement event deduplication using `event_id` (transaction_id from Medusa)
- **Dependency:** fas-medusa must emit order events — NEEDS CONFIRMATION

#### 1.3 KPI Dashboards
- Revenue (daily/weekly/monthly)
- Average Order Value (AOV)
- Conversion rate (by funnel stage)
- Traffic sources and attribution
- Top products by revenue and units
- **Tool:** GA4 Explorations + Looker Studio (or equivalent)

#### 1.4 Stripe Analytics
- Enable Stripe Dashboard revenue reporting
- Configure Stripe Sigma or equivalent for payment analytics
- Set up failed payment alerts

#### 1.5 Legacy WooCommerce Migration
- Audit remaining WooCommerce dependencies
- Migrate or redirect any active WooCommerce URLs
- Retire WooCommerce store
- **Status:** NEEDS CONFIRMATION on current WooCommerce state

#### 1.6 Data Dictionary
- Document all Sanity schemas (11 current types)
- Document Medusa entities and API contracts
- Document event names, payloads, and data flows
- See [data-dictionary.md](./data-dictionary.md)

### Dependencies
- GTM container access and permissions
- GA4 property admin access (property ID configurable via `PUBLIC_GA_MEASUREMENT_ID`)
- Medusa server-side event availability (fas-medusa repo)
- Stripe Dashboard access

### Acceptance Criteria
- [ ] All four enhanced ecommerce events firing in GA4 with correct parameters
- [ ] Server-side purchase events arriving via Measurement Protocol
- [ ] No duplicate events (client + server deduplicated)
- [ ] KPI dashboard shows last-7-day data for all five metrics
- [ ] Data dictionary covers all Sanity schemas and key Medusa endpoints
- [ ] Legacy WooCommerce store fully retired or redirected

---

## Phase 2: Know the Customer (Days 90–180)

### Outcomes
- Rich customer profiles with vehicle and build data
- Ability to identify customers ready for their next upgrade
- Quantified customer lifetime value
- Customer satisfaction measurement
- B2B dealer visibility

### Deliverables

#### 2.1 Customer Vehicle Profile System
- Extend Sanity `customer` schema with vehicle fields:
  - `platform` (e.g., S550 Mustang, Ram TRX, F-150)
  - `currentMods` (array of installed modifications)
  - `targetHP` (horsepower goal)
  - `buildStage` (stock → bolt-on → built → race)
- Mirror relevant fields to Medusa customer metadata
- **Note:** Current Sanity `customer` schema is basic (name, email, phone, notes, address)

#### 2.2 Build-Stage Tracking
- Define build stages based on product purchase history
- Auto-calculate stage from Medusa order history
- Surface "ready for next upgrade" signals in dashboards
- **Dependency:** Medusa order history API access

#### 2.3 CLV Calculation
- Pull order history from Medusa for all customers
- Calculate CLV using: total spend, order frequency, average order value, tenure
- Store CLV score in Sanity customer record or separate analytics store
- Update on each new order

#### 2.4 Post-Purchase NPS Surveys
- Deploy NPS survey after package purchases (FAS500–FAS1000)
- Integrate with email system (Resend — already configured)
- Store responses in Sanity
- Target: >15% response rate

#### 2.5 B2B Dealer Dashboards
- Build dealer-specific views in vendor portal
- Show: order volume, top products, reorder frequency
- **Dependency:** Vendor portal auth and data access (already exists in `src/pages/api/vendor/`)

### Dependencies
- Sanity schema write access (requires `SANITY_WRITE_TOKEN`)
- Medusa customer and order API access
- Email delivery (Resend — already configured)
- Vendor portal authentication (already exists)

### Acceptance Criteria
- [ ] Customer vehicle profile schema deployed to Sanity
- [ ] Build-stage auto-calculation running for customers with 3+ orders
- [ ] CLV scores visible for all customers with 2+ orders
- [ ] NPS survey sending after package purchases
- [ ] Dealer dashboard showing order analytics for 2+ vendors

---

## Phase 3: Optimize and Predict (Days 180–365)

### Outcomes
- Data-driven retention and marketing strategies
- Automated product recommendations
- Predictive demand planning
- Service scheduling optimization
- Performance results as marketing and intelligence asset

### Deliverables

#### 3.1 Retention Cohort Analysis
- Build monthly acquisition cohorts
- Track: repeat purchase rate, time-to-second-order, cohort revenue
- Visualize in dashboard (extend existing chart infrastructure — `src/components/ui/chart.tsx`)

#### 3.2 Product Affinity Scoring
- Analyze order baskets for co-purchase patterns
- Build affinity matrix: "customers who bought X also bought Y"
- Surface recommendations on product pages
- **Dependency:** 6+ months of order data from Phase 1+2

#### 3.3 Seasonal Demand Forecasting
- Build time-series models from 12+ months of transaction data
- Forecast by product category, platform, and season
- Inform inventory and marketing planning
- **Dependency:** 12+ months of clean transaction data

#### 3.4 Shop Service Scheduling
- Integrate with Cal.com (already has `CALCOM_API_KEY` configured)
- Track labor utilization and service bay availability
- Build scheduling dashboard
- **Dependency:** Cal.com API integration details — NEEDS CONFIRMATION

#### 3.5 Verified Performance Results Database
- Schema for dyno results: vehicle, mods, HP/TQ numbers, date, shop
- Schema for track times: vehicle, mods, track, time, conditions
- Dual purpose: marketing content + product intelligence
- Store in Sanity with public-facing display components

### Dependencies
- 12+ months of transaction data (from Phase 1 instrumentation)
- Cal.com API access and configuration
- Dyno/track data collection process (manual or automated)
- ML/data science tooling for forecasting models

### Acceptance Criteria
- [ ] Cohort analysis dashboard showing 6+ monthly cohorts
- [ ] Affinity scores generated for top 50 products
- [ ] Demand forecast model producing monthly predictions
- [ ] Service scheduling integrated with Cal.com
- [ ] Performance results schema deployed with 10+ verified entries
