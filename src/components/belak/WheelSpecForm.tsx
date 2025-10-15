import React, { useMemo, useState, useRef } from 'react';
import { z } from 'zod';
import { wheelQuoteSchema } from '../../lib/validators/belakWheelSpec';
import {
  BELAK_SERIES,
  DIAMETERS,
  WIDTHS_BY_DIAMETER,
  SKINNY_SIZES,
  SERIES_MONO_SIZE_OPTIONS,
  buildGeneralSizeLabels,
  BOLT_PATTERNS,
  BACKSPACING_COMMON,
  FINISHES,
  BEADLOCK,
  HARDWARE,
  CENTER_CAP,
  USE_NOTES
} from '../../content/belak/options';

// Local form state independent of Zod-inferred type (prevents TS drift)
interface FormState {
  // meta
  series: (typeof BELAK_SERIES)[number];
  pageContext?: string;

  // contact
  fullname: string;
  email: string;
  phone?: string;

  // vehicle
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;

  // wheel selection
  diameter: number;
  width: number;
  boltPattern: (typeof BOLT_PATTERNS)[number];
  backspacing: string;
  finish: (typeof FINISHES)[number];
  beadlock: (typeof BEADLOCK)[number];
  hardware: (typeof HARDWARE)[number];
  centerCap: (typeof CENTER_CAP)[number];

  // quantities & tires
  qtyFront: number;
  qtyRear: number;
  tireSizeFront?: string;
  tireSizeRear?: string;
  brakeClearanceNotes?: string;

  // notes & compliance
  notes?: string;
  agreeTrackUseOnly: boolean;

  // uploads
  attachmentAssetIds?: string[];
}

type Props = {
  defaultSeries?: (typeof BELAK_SERIES)[number];
  constrainToSkinnies?: boolean;
  pageContext?: string; // "wheels" | "skinnies" | "series2" | "series3"
};

export default function WheelSpecForm({
  defaultSeries,
  constrainToSkinnies = false,
  pageContext
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachmentAssetIds, setAttachmentAssetIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [series, setSeries] = useState<(typeof BELAK_SERIES)[number]>(defaultSeries ?? 'Series 2');
  const [diameter, setDiameter] = useState<number>(constrainToSkinnies ? 15 : 17);
  const isSkinnies = constrainToSkinnies || pageContext === 'skinnies';
  const widthOptions = useMemo(() => {
    if (isSkinnies) {
      return SKINNY_SIZES.filter((s) => s.diameter === diameter).map((s) => s.width);
    }
    return WIDTHS_BY_DIAMETER[diameter] ?? [];
  }, [diameter, isSkinnies]);

  // Combined size selector options (diameter x width) filtered per series/context
  const sizeOptions = useMemo(() => {
    const opts: { label: string; diameter: number; width: number }[] = [];
    if (isSkinnies) {
      // Always include base skinny sizes
      opts.push(
        ...SKINNY_SIZES.map((s) => ({ label: s.label, diameter: s.diameter, width: s.width }))
      );
      // Add series-specific mono variants if any
      const mono = SERIES_MONO_SIZE_OPTIONS[series] || [];
      opts.push(...mono);
      return opts;
    }
    // General sizes for current diameter
    return buildGeneralSizeLabels(diameter);
  }, [series, diameter, isSkinnies]);

  const [form, setForm] = useState<FormState>({
    series,
    pageContext,
    fullname: '',
    email: '',
    phone: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    diameter,
    width: widthOptions[0] ?? 8,
    boltPattern: '5x114.3',
    backspacing: BACKSPACING_COMMON[0],
    finish: 'Two-Tone Black/Machined (standard)',
    beadlock: 'None',
    centerCap: 'Standard',
    hardware: 'Standard ARP',
    qtyFront: 2,
    qtyRear: 2,
    tireSizeFront: '',
    tireSizeRear: '',
    brakeClearanceNotes: '',
    notes: '',
    agreeTrackUseOnly: false,
    attachmentAssetIds: []
  });

  // keep series/diameter state in sync with payload
  React.useEffect(() => setForm((prev) => ({ ...prev, series })), [series]);
  React.useEffect(() => {
    setForm((prev) => ({
      ...prev,
      diameter,
      width: constrainToSkinnies
        ? (SKINNY_SIZES.find((s) => s.diameter === diameter)?.width ?? prev.width)
        : prev.width
    }));
  }, [diameter, constrainToSkinnies]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(files: FileList) {
    setUploadError(null);
    if (!files || files.length === 0) return;
    setUploading(true);
    const ids: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const okTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!okTypes.includes(file.type)) {
          setUploadError(`Unsupported file type: ${file.name}`);
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload-wheel-asset', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
        const data = await res.json();
        if (data?.assetId) ids.push(data.assetId);
      }
      if (ids.length) {
        setAttachmentAssetIds((prev) => [...prev, ...ids]);
        setForm((prev) => ({
          ...prev,
          attachmentAssetIds: [...(prev.attachmentAssetIds ?? []), ...ids]
        }));
      }
    } catch (e: any) {
      setUploadError(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const parsed = wheelQuoteSchema.parse(form);
      if (!parsed.attachmentAssetIds) parsed.attachmentAssetIds = attachmentAssetIds;
      const res = await fetch('/api/wheel-quote-belak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      if (!res.ok) throw new Error(`Request failed ${res.status}`);
      setOk(
        'Thanks! Your specs were sent to sales@fasmotorsports.com. We’ll reply with a tailored quote.'
      );
      if (typeof window !== 'undefined') window.location.href = '/belak/thanks';
    } catch (err: any) {
      if (err instanceof z.ZodError) setError(err.errors.map((e) => e.message).join(' • '));
      else setError(err.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      name="belak-wheel-quote"
      method="POST"
      className="font-sans sm:font-mono rounded-xl border border-white/5 sm:border-white/10 bg-transparent sm:bg-neutral-950/50 p-3 sm:p-6 shadow-none sm:shadow-xl backdrop-blur"
      id="quote"
      style={{ scrollMarginTop: 'var(--header-offset, 96px)' }}
    >
      <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
        {/* Unified Wheel Size (sets diameter/width together) */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] sm:text-sm text-white/70">Wheel Size</label>
          <select
            value={`${diameter}x${form.width}`}
            onChange={(e) => {
              const v = e.target.value; // e.g., "15x3.5"
              const [dStr, wStr] = v.split('x');
              const d = parseFloat(dStr);
              const w = parseFloat(wStr);
              if (!Number.isNaN(d)) setDiameter(d);
              if (!Number.isNaN(w)) update('width', w as any);
            }}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          >
            {sizeOptions.map((s) => (
              <option
                key={`${s.label}-${s.diameter}-${s.width}`}
                value={`${s.diameter}x${s.width}`}
              >
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {/* Series / Diameter / Width */}
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Series</label>
          <select
            value={series}
            onChange={(e) => setSeries(e.target.value as any)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          >
            {BELAK_SERIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Diameter</label>
          <select
            value={diameter}
            onChange={(e) => setDiameter(parseInt(e.target.value))}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          >
            {(constrainToSkinnies
              ? [...new Set(SKINNY_SIZES.map((s) => s.diameter))]
              : DIAMETERS
            ).map((d) => (
              <option key={d} value={d}>
                {d}"
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Width</label>
          <select
            value={Number(form.width)}
            onChange={(e) => update('width', parseFloat(e.target.value))}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          >
            {widthOptions.map((w) => (
              <option key={w} value={w}>
                {w}"
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Bolt Pattern</label>
          <select
            value={String(form.boltPattern)}
            onChange={(e) => update('boltPattern', e.target.value as any)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          >
            {BOLT_PATTERNS.map((bp) => (
              <option key={bp} value={bp}>
                {bp}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] sm:text-sm text-white/70">Backspacing</label>
          <input
            value={String(form.backspacing)}
            onChange={(e) => update('backspacing', e.target.value)}
            placeholder={`e.g., ${BACKSPACING_COMMON[0]} or "7.5 in" or "S550 Mustang"`}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
          <p className="text-xs text-neutral-400">
            If unsure, tell us your vehicle & brake kit; we’ll confirm fitment.
          </p>
        </div>

        {/* Finish / Beadlock / Hardware / Caps */}
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Finish</label>
          <select
            value={String(form.finish)}
            onChange={(e) => update('finish', e.target.value as any)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          >
            {FINISHES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Beadlock</label>
          <select
            value={String(form.beadlock)}
            onChange={(e) => update('beadlock', e.target.value as any)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          >
            {BEADLOCK.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Hardware</label>
          <select
            value={String(form.hardware)}
            onChange={(e) => update('hardware', e.target.value as any)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          >
            {HARDWARE.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Center Cap</label>
          <select
            value={String(form.centerCap)}
            onChange={(e) => update('centerCap', e.target.value as any)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          >
            {CENTER_CAP.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle */}
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Vehicle Year</label>
          <input
            value={
              typeof form.vehicleYear === 'string' || typeof form.vehicleYear === 'number'
                ? String(form.vehicleYear)
                : ''
            }
            onChange={(e) => update('vehicleYear', e.target.value)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Make</label>
          <input
            value={typeof form.vehicleMake === 'string' ? form.vehicleMake : ''}
            onChange={(e) => update('vehicleMake', e.target.value)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Model</label>
          <input
            value={typeof form.vehicleModel === 'string' ? form.vehicleModel : ''}
            onChange={(e) => update('vehicleModel', e.target.value)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
        </div>

        {/* Quantities & Tires */}
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Qty Front</label>
          <input
            type="number"
            min={0}
            max={2}
            value={typeof form.qtyFront === 'number' ? form.qtyFront : Number(form.qtyFront) || 0}
            onChange={(e) => update('qtyFront', parseInt(e.target.value))}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Qty Rear</label>
          <input
            type="number"
            min={0}
            max={2}
            value={typeof form.qtyRear === 'number' ? form.qtyRear : Number(form.qtyRear) || 0}
            onChange={(e) => update('qtyRear', parseInt(e.target.value))}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Tire Size (Front)</label>
          <input
            value={typeof form.tireSizeFront === 'string' ? form.tireSizeFront : ''}
            onChange={(e) => update('tireSizeFront', e.target.value)}
            placeholder="e.g., 28x6-17 or 165/80R15"
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Tire Size (Rear)</label>
          <input
            value={typeof form.tireSizeRear === 'string' ? form.tireSizeRear : ''}
            onChange={(e) => update('tireSizeRear', e.target.value)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
        </div>

        {/* Attachments (images/pdf) */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] sm:text-sm text-white/70">Attachments (images/PDF)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0 file:mr-4 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-neutral-700"
          />
          {uploading && <p className="text-xs text-neutral-400">Uploading…</p>}
          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          {attachmentAssetIds.length > 0 && (
            <p className="text-xs text-neutral-400">
              Attached: {attachmentAssetIds.length} file(s)
            </p>
          )}
          <p className="text-xs text-neutral-500">
            Allowed: JPG, PNG, PDF. Max size depends on your hosting limits.
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] sm:text-sm text-white/70">Full Name</label>
          <input
            value={typeof form.fullname === 'string' ? form.fullname : ''}
            onChange={(e) => update('fullname', e.target.value)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Email</label>
          <input
            value={typeof form.email === 'string' ? form.email : ''}
            onChange={(e) => update('email', e.target.value)}
            type="email"
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] sm:text-sm text-white/70">Phone</label>
          <input
            value={typeof form.phone === 'string' ? form.phone : ''}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] sm:text-sm text-white/70">Notes</label>
          <textarea
            value={typeof form.notes === 'string' ? form.notes : ''}
            onChange={(e) => update('notes', e.target.value)}
            rows={4}
            placeholder="Color ideas, brake kit details, spacer/stud notes, deadlines, etc."
            className="w-full bg-transparent border-b border-white/20 rounded-none px-0 py-2 text-xs sm:text-base text-white focus:outline-none focus:ring-0 sm:rounded-lg sm:bg-neutral-900 sm:p-2 sm:border-0"
          />
        </div>

        <div className="flex items-center gap-3 md:col-span-2">
          <input
            id="agree"
            type="checkbox"
            checked={typeof form.agreeTrackUseOnly === 'boolean' ? form.agreeTrackUseOnly : false}
            onChange={(e) => update('agreeTrackUseOnly', e.target.checked)}
            className="accent-red-600 h-5 w-5"
          />
          <label htmlFor="agree" className="text-xs sm:text-sm text-neutral-300">
            I acknowledge Belak wheels are intended for track use only.
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          disabled={busy}
          className="btn-glass rounded-full bg-red-600 px-4 py-2 sm:px-5 sm:py-3 text-white text-sm sm:text-base transition hover:bg-red-500 disabled:opacity-60"
        >
          {busy ? 'Sending...' : 'Send quote request'}
        </button>
        {ok && <p className="text-green-400 text-xs sm:text-sm">{ok}</p>}
        {error && <p className="text-red-400 text-xs sm:text-sm">{error}</p>}
        <ul className="mt-2 list-disc pl-5 text-xs text-neutral-400">
          {USE_NOTES.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </form>
  );
}
