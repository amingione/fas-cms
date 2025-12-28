# FAS-CMS Runtime Validation Audit

## 1. Where the data link is expected to be created

Based on the investigation, a critical data relationship exists between `quoteRequest` documents and an entity that appears to be `wheelQuote`. The `quoteRequest` schema includes a field `wheelQuotes` which is an array of references. This indicates an expectation that when a `quoteRequest` is created or updated, it should be linked to one or more `wheelQuote` documents.

However, a major validation gap was identified: `wheelQuote` is not a formally defined schema in the Sanity Studio. Instead, these documents are created programmatically by various API endpoints (e.g., `/api/wheel-quote-jtx`, `/api/wheel-quote-belak`). The structure of these `wheelQuote` documents is defined by Zod schemas within the application code (e.g., `src/lib/validators/jtxWheelSpec.ts`), not by the central Sanity schema configuration.

This means the "link" is created in two separate, uncoordinated parts:
1.  **`wheelQuote` document creation:** Happens inside Netlify functions, which write ad-hoc documents to the `wheelQuote` collection.
2.  **`quoteRequest` linking:** The logic to link these ad-hoc `wheelQuote` documents to a `quoteRequest` would also reside within these API endpoints.

## 2. Whether that logic runs in all cases

It is highly unlikely that this logic runs consistently in all cases. Because `wheelQuote` is not a formal schema, there are no database-level guarantees (referential integrity) for its existence or structure.

The creation and linking logic is entirely dependent on the successful execution of the API endpoint code. Potential failure points include:
*   **Validation Errors:** If the incoming data fails Zod validation in the API endpoint, a `wheelQuote` document may not be created, leaving the `quoteRequest` without a necessary link.
*   **API Failures:** Any runtime error within the Netlify function could interrupt the process, potentially creating a `wheelQuote` but failing to link it to the `quoteRequest`, or vice-versa.
*   **Inconsistent Implementations:** Different API endpoints (e.g., for different wheel vendors like JTX and Belak) might have slightly different implementations for creating and linking quotes, leading to inconsistencies.

Without a centralized schema and transactional updates, it's not possible to ensure this link is reliably created in all cases.

## 3. Whether queries exclude affected records

This cannot be fully determined without a complete review of all queries that involve `quoteRequest`. However, the architectural pattern suggests problems are likely.

Any query for `quoteRequest` documents that attempts to resolve the `wheelQuotes` references will encounter issues if a linked `wheelQuote` document is missing or malformed. Standard GROQ queries like `*[_type == "quoteRequest"]{..., "wheelQuotes": wheelQuotes[]->}` would simply return `null` for any reference that doesn't resolve to a valid document.

This leads to the risk of "silent failures," where queries succeed but return incomplete data, unless every single query is written with complex fallback logic to handle potentially broken references.

## 4. Whether display fallbacks hide missing data

Similar to the query issue, this requires a full review of all UI components that render `quoteRequest` data. It is plausible that UI components have fallbacks (e.g., showing "N/A" or simply not rendering a section if `wheelQuotes` is empty or contains nulls).

While this prevents the UI from crashing, it effectively hides the underlying data integrity problem from users and administrators. The system would appear to be working, but records would be incomplete, potentially leading to lost sales or incorrect order fulfillment.

## 5. Whether duplicate records are created and why

Yes, duplicate data is created by design, which is a significant validation gap.

The `quoteRequest` schema contains denormalized customer information: `customerName`, `customerEmail`, `customerPhone`, etc. These fields are plain strings and numbers, not a reference to a central `customer` document.

**Why this happens:** When a user submits a quote request, the system creates a new `quoteRequest` document and copies the customer's information directly into it. This means for every quote request a customer makes, a new, disconnected copy of their contact information is created.

This leads to several problems:
*   **Data Inconsistency:** If a customer updates their email address, only their central `customer` profile (if one exists) would be updated. All previous `quoteRequest` documents would retain the old, stale information.
*   **No Single Source of Truth:** It becomes impossible to get a clear, consolidated view of a customer's interaction history, as their data is fragmented across multiple, duplicative documents.
*   **Increased Error Surface:** Any process that relies on customer data from a `quoteRequest` (e.g., for invoicing or shipping) risks using outdated or incorrect information.
