import { useEffect, useState } from 'react';
import ProductTable from '@/components/admin/ProductTable';

export default function ProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = (typeof document === 'undefined' ? { current: null } : ({} as any));
  async function refresh() {
    try {
      const r = await fetch('/.netlify/functions/products-list');
      if (r.ok) setRows(await r.json());
      else setRows([]);
    } catch {
      setRows([]);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  function downloadCSV() {
    const header = ['_id','title','sku','price','featured','categories'];
    const lines = [header.join(',')];
    (rows || []).forEach((r: any) => {
      const cats = Array.isArray(r.categoryNames) ? r.categoryNames.join('|') : '';
      lines.push([
        r._id || '',
        JSON.stringify(r.title || ''),
        JSON.stringify(r.sku || ''),
        Number(r.price || 0),
        r.featured ? 1 : 0,
        JSON.stringify(cats)
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCSV(file: File) {
    try {
      setImporting(true);
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) return;
      const hdr = lines.shift()!;
      // simple CSV parse for our columns
      for (const line of lines) {
        const parts = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/g).map((s) => s.replace(/^\"|\"$/g, ''));
        const [_id,title,sku,price,featured,categories] = parts;
        const payload: any = {
          _id: _id || undefined,
          title,
          sku,
          price: Number(price) || 0,
          featured: featured === '1' || featured === 'true'
        };
        // category assignment by title best-effort is omitted here to avoid additional lookups
        await fetch('/.netlify/functions/products-upsert', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      await refresh();
      alert('Import complete');
    } catch (e) {
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="text-white">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
        <p className="text-white/70 text-sm">Manage products stored in Sanity.</p>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <button className="btn-glass btn-outline" onClick={downloadCSV}>Export CSV</button>
        <label className="btn-glass btn-secondary cursor-pointer">
          {importing ? 'Importing…' : 'Import CSV'}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) importCSV(f);
              e.currentTarget.value = '';
            }}
          />
        </label>
      </div>
      <ProductTable rows={rows as any} refresh={refresh} />
    </div>
  );
}
