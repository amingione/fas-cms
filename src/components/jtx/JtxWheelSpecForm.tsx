import React, { useMemo, useState } from 'react';
import { z } from 'zod';
import { jtxWheelQuoteSchema } from '@/lib/validators/jtxWheelSpec';
import {
  JTX_SERIES,
  WIDTHS_BY_DIAMETER,
  BOLT_PATTERNS,
  OFFSETS,
  FINISHES,
  buildSizeLabels,
  STYLES_BY_SERIES,
} from '@/content/jtx/options';

type Props = { defaultSeries?: (typeof JTX_SERIES)[number]; pageContext?: string };

export default function JtxWheelSpecForm({ defaultSeries = 'Monoforged Series', pageContext }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [series, setSeries] = useState<(typeof JTX_SERIES)[number]>(defaultSeries);
  const availableStyles = STYLES_BY_SERIES[series as keyof typeof STYLES_BY_SERIES] || [];
  const [diameter, setDiameter] = useState<number>(22);
  const sizeOptions = useMemo(() => buildSizeLabels(diameter), [diameter]);
  const [width, setWidth] = useState<number>(WIDTHS_BY_DIAMETER[diameter]?.[0] ?? 10);

  const [form, setForm] = useState({
    series,
    pageContext,
    style: availableStyles[0] || '',
    fullname: '',
    email: '',
    phone: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    diameter,
    width,
    boltPattern: '6x135' as (typeof BOLT_PATTERNS)[number],
    offset: '0' as (typeof OFFSETS)[number],
    finish: 'Gloss Black' as (typeof FINISHES)[number],
    color: '',
    qty: 4,
    notes: '',
  });

  React.useEffect(() => setForm((p) => ({ ...p, series })), [series]);
  React.useEffect(() => setForm((p) => ({ ...p, style: (STYLES_BY_SERIES[series as keyof typeof STYLES_BY_SERIES] || [])[0] || '' })), [series]);
  React.useEffect(() => setForm((p) => ({ ...p, diameter })), [diameter]);
  React.useEffect(() => setForm((p) => ({ ...p, width })), [width]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const parsed = jtxWheelQuoteSchema.parse(form);
      const res = await fetch('/api/wheel-quote-jtx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      if (!res.ok) throw new Error('Request failed');
      setOk('Thanks! Your JTX request was submitted.');
      if (typeof window !== 'undefined') window.location.href = '/jtx/thanks';
    } catch (err: any) {
      if (err instanceof z.ZodError) setError(err.errors.map((e) => e.message).join(' • '));
      else setError(err.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} id="quote" className="font-sans rounded-xl border border-white/10 bg-neutral-950/50 p-4 sm:p-6">
      <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Series</label>
          <select value={series} onChange={(e) => setSeries(e.target.value as any)} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white">
            {JTX_SERIES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Style</label>
          <select
            value={form.style}
            onChange={(e) => update('style', e.target.value)}
            className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white"
          >
            {(STYLES_BY_SERIES[series as keyof typeof STYLES_BY_SERIES] || []).map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Wheel Size</label>
          <select
            value={`${diameter}x${width}`}
            onChange={(e) => { const [d,w]=e.target.value.split('x'); setDiameter(parseInt(d)); setWidth(parseFloat(w)); }}
            className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white"
          >
            {sizeOptions.map((s) => (<option key={`${s.label}`} value={`${s.diameter}x${s.width}`}>{s.label}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Bolt Pattern</label>
          <select value={form.boltPattern} onChange={(e)=>update('boltPattern', e.target.value as any)} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white">
            {BOLT_PATTERNS.map((bp)=>(<option key={bp} value={bp}>{bp}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Offset (mm)</label>
          <select value={form.offset} onChange={(e)=>update('offset', e.target.value as any)} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white">
            {OFFSETS.map((o)=>(<option key={o} value={o}>{o}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Finish</label>
          <select value={form.finish} onChange={(e)=>update('finish', e.target.value as any)} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white">
            {FINISHES.map((f)=>(<option key={f} value={f}>{f}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Color (optional)</label>
          <input value={form.color} onChange={(e)=>update('color', e.target.value)} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white" />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Quantity</label>
          <select value={form.qty} onChange={(e)=>update('qty', parseInt(e.target.value))} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white">
            {[1,2,3,4].map((n)=>(<option key={n} value={n}>{n}</option>))}
          </select>
        </div>

        {/* Contact */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] sm:text-sm text-white/70">Full Name</label>
          <input required value={form.fullname} onChange={(e)=>update('fullname', e.target.value)} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white" />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Email</label>
          <input required type="email" value={form.email} onChange={(e)=>update('email', e.target.value)} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white" />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Phone</label>
          <input value={form.phone} onChange={(e)=>update('phone', e.target.value)} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] sm:text-sm text-white/70">Notes</label>
          <textarea rows={3} value={form.notes} onChange={(e)=>update('notes', e.target.value)} className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xs sm:text-base text-white" />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button disabled={busy} className="btn-glass rounded-full bg-red-600 px-4 py-2 text-white disabled:opacity-60">{busy ? 'Sending…' : 'Submit JTX Quote'}</button>
        {ok && <p className="text-green-400 text-xs sm:text-sm">{ok}</p>}
        {error && <p className="text-red-400 text-xs sm:text-sm">{error}</p>}
      </div>
    </form>
  );
}
