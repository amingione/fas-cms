"use client";

import React, { useEffect, useState } from "react";
import { MEDUSA_CART_ID_KEY } from "@/lib/medusa";
import { getCart } from "@/components/cart/actions";

type AddressState = {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phone: string;
};

type ShippingOption = {
  id: string;
  name?: string;
  amount?: number;
  price_type?: string;
  data?: Record<string, any>;
  region?: { currency_code?: string };
};

const EMPTY_ADDRESS: AddressState = {
  email: "",
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  postalCode: "",
  countryCode: "US",
  phone: ""
};

function formatCurrency(amount?: number, currency?: string) {
  if (typeof amount !== "number") return "--";
  const code = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code.toUpperCase()
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${code.toUpperCase()}`;
  }
}

async function ensureCartId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(MEDUSA_CART_ID_KEY);
  if (existing && existing.trim()) return existing.trim();

  try {
    const response = await fetch("/api/medusa/cart/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => null);
    if (response.ok && typeof data?.cartId === "string") {
      window.localStorage.setItem(MEDUSA_CART_ID_KEY, data.cartId);
      return data.cartId;
    }
  } catch {
    // handled by caller
  }

  return null;
}

async function syncCartToMedusa(cartId: string) {
  const cart = getCart();
  const missing = cart.items.filter((item) => !item.medusaVariantId);
  if (missing.length) {
    throw new Error(
      'Some items in your cart are missing required variant selections. Please remove them and re-add with a valid variant.'
    );
  }
  const response = await fetch("/api/medusa/cart/add-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartId, cart })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Unable to sync cart to Medusa.");
  }
  const payload = await response.json().catch(() => null);
  const mappings = Array.isArray(payload?.mappings) ? payload.mappings : [];
  if (mappings.length) {
    const next = getCart();
    let changed = false;
    for (const map of mappings) {
      const idx = next.items.findIndex((item) => item.id === map.id);
      if (idx >= 0 && !next.items[idx].medusaVariantId) {
        next.items[idx].medusaVariantId = map.medusaVariantId;
        changed = true;
      }
    }
    if (changed) {
      try {
        window.localStorage.setItem("fas_cart_v1", JSON.stringify(next));
      } catch (err) {
        void err;
      }
    }
  }
}

export default function MedusaShippingOptions() {
  const [cartId, setCartId] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const id = await ensureCartId();
        if (cancelled) return;
        setCartId(id);
        if (id) {
          await syncCartToMedusa(id);
        }
      } catch (err) {
        void err;
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field: keyof AddressState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleFetchShipping = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const id = cartId || (await ensureCartId());
      if (!id) {
        setError("Unable to initialize cart. Please try again.");
        setLoading(false);
        return;
      }

      setCartId(id);
      await syncCartToMedusa(id);

      const updateResponse = await fetch("/api/medusa/cart/update-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: id,
          email: address.email,
          shippingAddress: {
            firstName: address.firstName,
            lastName: address.lastName,
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            province: address.province,
            postalCode: address.postalCode,
            countryCode: address.countryCode,
            phone: address.phone
          }
        })
      });

      if (!updateResponse.ok) {
        const payload = await updateResponse.json().catch(() => null);
        throw new Error(payload?.error || "Unable to save shipping address.");
      }

      const optionsResponse = await fetch("/api/medusa/cart/shipping-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: id })
      });

      const optionsPayload = await optionsResponse.json().catch(() => null);
      if (!optionsResponse.ok) {
        throw new Error(optionsPayload?.error || "Unable to load shipping options.");
      }

      setShippingOptions(Array.isArray(optionsPayload?.shippingOptions) ? optionsPayload.shippingOptions : []);
      setSelectedOptionId("");
    } catch (err: any) {
      setError(err?.message || "Unable to load shipping options.");
      setShippingOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const currency =
    shippingOptions.find((option) => option?.region?.currency_code)?.region?.currency_code || "USD";

  const handleSelectOption = async (optionId: string) => {
    setError(null);
    try {
      const id = cartId || (await ensureCartId());
      if (!id) {
        throw new Error("Unable to initialize cart.");
      }
      setCartId(id);
      await syncCartToMedusa(id);

      const response = await fetch("/api/medusa/cart/select-shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: id, optionId })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to select shipping option.");
      }

      setSelectedOptionId(optionId);
    } catch (err: any) {
      setError(err?.message || "Unable to select shipping option.");
      setSelectedOptionId("");
    }
  };

  const handleCheckout = async () => {
    setError(null);
    setPaying(true);
    try {
      const id = cartId || (await ensureCartId());
      if (!id) {
        throw new Error("Unable to initialize cart.");
      }
      if (!selectedOptionId) {
        throw new Error("Select a shipping option to continue.");
      }

      const response = await fetch("/api/medusa/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: id })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to start Stripe checkout.");
      }

      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }

      throw new Error("Stripe checkout URL missing.");
    } catch (err: any) {
      setError(err?.message || "Unable to start payment.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-white/10 bg-black/30 p-6">
        <h2 className="text-xl font-semibold text-white">Shipping details</h2>
        <p className="mt-2 text-sm text-white/70">
          Enter your address to fetch available shipping options from Medusa.
        </p>

        <form onSubmit={handleFetchShipping} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={address.email}
            onChange={updateField("email")}
          />
          <input
            type="tel"
            placeholder="Phone"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={address.phone}
            onChange={updateField("phone")}
          />
          <input
            type="text"
            placeholder="First name"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={address.firstName}
            onChange={updateField("firstName")}
          />
          <input
            type="text"
            placeholder="Last name"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={address.lastName}
            onChange={updateField("lastName")}
          />
          <input
            type="text"
            placeholder="Address line 1"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white sm:col-span-2"
            value={address.address1}
            onChange={updateField("address1")}
          />
          <input
            type="text"
            placeholder="Address line 2"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white sm:col-span-2"
            value={address.address2}
            onChange={updateField("address2")}
          />
          <input
            type="text"
            placeholder="City"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={address.city}
            onChange={updateField("city")}
          />
          <input
            type="text"
            placeholder="State / Province"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={address.province}
            onChange={updateField("province")}
          />
          <input
            type="text"
            placeholder="Postal code"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={address.postalCode}
            onChange={updateField("postalCode")}
          />
          <input
            type="text"
            placeholder="Country (2-letter code)"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={address.countryCode}
            onChange={updateField("countryCode")}
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-black disabled:opacity-60 sm:col-span-2"
          >
            {loading ? "Loading shipping options..." : "Get shipping options"}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>

      <div className="rounded-lg border border-white/10 bg-black/30 p-6">
        <h2 className="text-xl font-semibold text-white">Shipping options</h2>
        {shippingOptions.length === 0 ? (
          <p className="mt-3 text-sm text-white/60">
            No shipping options loaded yet. Submit an address to see available rates.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {shippingOptions.map((option) => (
              <li
                key={option.id}
                className="flex items-center justify-between rounded-md border border-white/10 px-4 py-3"
              >
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping-option"
                    className="h-4 w-4 accent-primary"
                    checked={selectedOptionId === option.id}
                    onChange={() => handleSelectOption(option.id)}
                  />
                  <div>
                    <p className="font-medium text-white">{option.name || "Shipping option"}</p>
                    <p className="text-xs text-white/60">{option.price_type || "flat_rate"}</p>
                  </div>
                </label>
                <span className="font-semibold text-primary">
                  {formatCurrency(option.amount, option.region?.currency_code || currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-black/30 p-6">
        <h2 className="text-xl font-semibold text-white">Payment</h2>
        <p className="mt-2 text-sm text-white/70">
          Continue to Stripe Checkout to complete payment. Shipping rates are sourced from Medusa +
          Shippo (USPS/UPS only).
        </p>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={!selectedOptionId || paying}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {paying ? "Redirecting to Stripe..." : "Continue to Payment"}
        </button>
      </div>
    </div>
  );
}
