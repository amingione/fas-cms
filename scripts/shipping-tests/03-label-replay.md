# Label Purchase Replay Test (Manual / Semi-Manual)

## Goal
Calling create-shipping-label twice does not repurchase the label.

## Preconditions
- A Sanity order exists with:
  - easypostShipmentId (or your shipping app shipment id)
  - selected_rate_id (or equivalent)
- labelPurchased is false initially

## Steps
1) Call the label endpoint once for the order.
2) Confirm Sanity order updates:
   - labelPurchased: true
   - labelUrl / tracking info present
3) Call the same endpoint again for the same order.

## Expected Result
- Second call returns quickly with existing label info.
- No new carrier purchase occurs.
- No new tracking number is generated.

## Evidence
- Logs show “labelPurchased already true” short-circuit (or equivalent).

If you want this as a real curl script, paste the exact request shape expected by create-shipping-label.ts (order id param/body), and I’ll convert it into a runnable .sh file.
