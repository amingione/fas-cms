import React, { useEffect, useMemo, useState } from 'react';

type Document = {
  _id: string;
  title?: string;
  description?: string;
  category?: string;
  version?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  sharedWithAllVendors?: boolean;
  file?: { asset?: { url?: string; originalFilename?: string; mimeType?: string } };
};

const categories = [
  { value: 'all', label: 'All' },
  { value: 'contract', label: 'Contracts' },
  { value: 'terms', label: 'Terms' },
  { value: 'price_list', label: 'Price Lists' },
  { value: 'catalog', label: 'Catalogs' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' }
];

const DocumentLibrary: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/documents', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load documents');
      setDocs(data.documents || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (filter !== 'all' && d.category !== filter) return false;
      if (!term) return true;
      const hay = `${d.title || ''} ${d.description || ''}`.toLowerCase();
      return hay.includes(term);
    });
  }, [docs, filter, search]);

  if (loading) return <p className="text-white/80">Loading documents...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-sm text-white/60">
            Library of shared documents, price lists, compliance files, and more.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents"
            className="bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc) => (
          <div key={doc._id} className="rounded-lg border border-white/10 bg-white/5 p-4 h-full flex flex-col">
            <p className="text-sm font-semibold text-white">{doc.title || 'Untitled'}</p>
            <p className="text-xs text-white/60">{doc.category || 'Uncategorized'}</p>
            <p className="text-sm text-white/70 mt-2 line-clamp-3">{doc.description || ''}</p>
            <div className="text-xs text-white/60 mt-auto pt-3">
              {doc.version && <div>Version: {doc.version}</div>}
              {doc.uploadedAt && <div>{new Date(doc.uploadedAt).toLocaleDateString()}</div>}
              {doc.sharedWithAllVendors && <div className="text-green-300">Shared with all vendors</div>}
            </div>
            {doc.file?.asset?.url && (
              <a
                href={doc.file.asset.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-primary text-sm underline"
              >
                Download{doc.file.asset.originalFilename ? ` (${doc.file.asset.originalFilename})` : ''}
              </a>
            )}
          </div>
        ))}
        {!filtered.length && <p className="text-white/70">No documents found.</p>}
      </div>
    </div>
  );
};

export default DocumentLibrary;
