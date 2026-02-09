import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

type Invoice = {
  _id: string;
  invoiceNumber?: string;
  status?: string;
  total?: number;
  amountPaid?: number;
  amountDue?: number;
  vendorOrderRef?: { _id?: string; orderNumber?: string };
};

const stripePromise = loadStripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PayForm: React.FC<{ clientSecret: string }> = ({ clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/vendor-portal/invoices`,
      },
    });
    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
      >
        {processing ? 'Processing…' : 'Pay invoice'}
      </button>
    </form>
  );
};

const VendorInvoicePayPage: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/vendor/invoices/${invoice._id}/pay`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Unable to initialize payment.');
        setClientSecret(data.clientSecret || null);
      } catch (err: any) {
        setError(err?.message || 'Unable to initialize payment.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoice._id]);

  return (
    <div className="space-y-6 text-white">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber || invoice._id}</h1>
        <p className="text-white/60 text-sm">
          Amount due: ${(invoice.amountDue ?? invoice.total ?? 0).toFixed(2)}
        </p>
        {invoice.vendorOrderRef?.orderNumber && (
          <p className="text-white/40 text-xs">
            Order: {invoice.vendorOrderRef.orderNumber}
          </p>
        )}
      </header>

      {loading && <p className="text-white/60">Loading payment…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {invoice.status === 'paid' && (
        <p className="text-white/60 text-sm">This invoice has already been paid.</p>
      )}
      {!loading && !error && !clientSecret && (
        <p className="text-white/60 text-sm">Payment is not available for this invoice yet.</p>
      )}
      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PayForm clientSecret={clientSecret} />
        </Elements>
      )}
    </div>
  );
};

export default VendorInvoicePayPage;
