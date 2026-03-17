# FAS SEO: NAP Consistency Checklist

Canonical NAP (as of March 17, 2026):

- Business name: `F.A.S. Motorsports`
- Address: `6161 Riverside Dr, Punta Gorda, FL 33982`
- Phone: `+1 (812) 200-9012` (`+18122009012` for `tel:`/schema)

## Site Checklist

- Verify all `tel:` links use `+18122009012`.
- Verify all customer-facing phone text uses `+1 (812) 200-9012` or `(812) 200-9012`.
- Verify all full address references use `6161 Riverside Dr, Punta Gorda, FL 33982`.
- Verify JSON-LD `telephone` uses `+18122009012`.
- Verify JSON-LD `PostalAddress` fields match:
  - `streetAddress: 6161 Riverside Dr`
  - `addressLocality: Punta Gorda`
  - `addressRegion: FL`
  - `postalCode: 33982`
  - `addressCountry: US`

Quick grep checks:

```bash
rg -n --hidden -S "tel:[^\"' ]+" src
rg -n --hidden -S "812|Riverside Dr|Punta Gorda|33982" src
```

## Google Business Profile Checklist

- Open Google Business Profile Manager.
- Set the primary phone to `+1 (812) 200-9012`.
- Set the business address to `6161 Riverside Dr, Punta Gorda, FL 33982`.
- Confirm map pin aligns with this address.
- Ensure no secondary/legacy phone is displayed publicly.
- Ensure no old address appears in description/posts/photos captions.
- If Google suggests edits, approve only if they match canonical NAP above.

## External Citation Sync (High Impact)

- Google Search Console URL Inspection: request reindex for `/contact` and `/about`.
- Update the same NAP on:
  - Facebook page About/Contact
  - Instagram contact button/profile
  - Any directory listings (Yelp, Apple Maps, Bing Places, etc.)

