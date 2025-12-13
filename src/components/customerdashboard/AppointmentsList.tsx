'use client';

import { useEffect, useState } from 'react';

const FALLBACK_TITLE = 'Service Appointment';
const FALLBACK_MESSAGE = 'You have no upcoming or past appointments.';
const SESSION_ENDPOINT = '/api/auth/session';
const APPOINTMENTS_ENDPOINT = '/api/get-user-appointments';

interface AppointmentRecord {
  _id?: string;
  bookingId?: string;
  id?: string;
  title?: string;
  service?: string;
  status?: string;
  scheduledAt?: string;
  createdAt?: string;
  _createdAt?: string;
  notes?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  } | null;
  customerName?: string;
  rescheduleUrl?: string;
  cancelUrl?: string;
}

interface NormalizedAppointment {
  id: string;
  title: string;
  status: string;
  whenLabel: string;
  customer: string;
  rescheduleUrl?: string;
  cancelUrl?: string;
}

function formatDate(value: unknown): string {
  if (!value) return 'No date provided';
  try {
    const date = new Date(String(value));
    if (Number.isNaN(date.valueOf())) return 'No date provided';
    return date.toLocaleString();
  } catch {
    return 'No date provided';
  }
}

function resolveCustomerName(record: AppointmentRecord): string {
  const customer = record.customer;
  if (customer) {
    const parts = [customer.firstName, customer.lastName].filter(
      (part) => typeof part === 'string' && part.trim()
    );
    if (parts.length) {
      return parts.join(' ').trim();
    }
    if (customer.name && customer.name.trim()) {
      return customer.name.trim();
    }
    if (customer.email && customer.email.trim()) {
      return customer.email.trim();
    }
  }

  if (record.customerName && record.customerName.trim()) {
    return record.customerName.trim();
  }

  return 'Customer';
}

function normalizeAppointments(records: AppointmentRecord[]): NormalizedAppointment[] {
  return records
    .map((record, index) => {
      const id = record._id || record.bookingId || record.id || `appt-${index}`;
      const title = (record.service || record.title || FALLBACK_TITLE).trim();
      const status = (record.status || 'confirmed').toLowerCase();
      const whenLabel = formatDate(record.scheduledAt || record.createdAt || record._createdAt);
      const customer = resolveCustomerName(record);
      const rescheduleUrl = record.rescheduleUrl?.trim() || undefined;
      const cancelUrl = record.cancelUrl?.trim() || undefined;

      return {
        id,
        title,
        status,
        whenLabel,
        customer,
        rescheduleUrl,
        cancelUrl
      } satisfies NormalizedAppointment;
    })
    .filter(Boolean);
}

async function fetchSessionEmail(): Promise<string | null> {
  try {
    const res = await fetch(SESSION_ENDPOINT, { credentials: 'include' });
    if (!res.ok) return null;
    const payload = await res.json();
    const email = payload?.user?.email;
    return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

async function fetchAppointments(email: string): Promise<AppointmentRecord[]> {
  const url = `${APPOINTMENTS_ENDPOINT}?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  const payload = await res.json();
  return Array.isArray(payload) ? (payload as AppointmentRecord[]) : [];
}

export default function AppointmentsList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<NormalizedAppointment[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        let email = await fetchSessionEmail();
        if (!email && typeof window !== 'undefined') {
          try {
            const stored = window.localStorage.getItem('customerEmail');
            if (stored && stored.trim()) {
              email = stored.trim().toLowerCase();
            }
          } catch {
            // ignore access errors
          }
        }

        if (!email) {
          setAppointments([]);
          setError('Sign in to view your scheduled appointments.');
          return;
        }

        const records = await fetchAppointments(email);
        if (!cancelled) {
          setAppointments(normalizeAppointments(records));
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load appointments.';
          setError(message);
          setAppointments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-center text-white/80">Loading appointments...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 text-center">
        {error}
      </div>
    );
  }

  if (!appointments.length) {
    return <div className="text-center text-white/70">{FALLBACK_MESSAGE}</div>;
  }

  return (
    <div className="space-y-6">
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          className="border border-white/20 bg-dark/40 text-white rounded-lg p-4 shadow-inner shadow-black/40"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{appointment.title}</h2>
              <p className="text-sm text-white/70">{appointment.whenLabel}</p>
              <p className="text-sm">
                Status: <span className="uppercase">{appointment.status}</span>
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-white/30 px-3 py-1 text-xs tracking-wide uppercase">
              {appointment.customer}
            </span>
          </div>

          {(appointment.rescheduleUrl || appointment.cancelUrl) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {appointment.rescheduleUrl && (
                <a
                  href={appointment.rescheduleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded border border-yellow-500 px-4 py-2 text-sm text-yellow-500 transition hover:bg-yellow-500 hover:text-accent"
                >
                  Reschedule
                </a>
              )}
              {appointment.cancelUrl && (
                <a
                  href={appointment.cancelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded border border-red-500 px-4 py-2 text-sm text-red-500 transition hover:bg-red-500 hover:text-white"
                >
                  Cancel
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
