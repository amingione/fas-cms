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

type Props = {
  initialDocuments?: Document[];
  vendorId?: string;
};

const DocumentLibrary: React.FC<Props> = ({ initialDocuments = [] }) => {
  const [docs, setDocs] = useState<Document[]>(initialDocuments);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch('/api/vendor/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Upload failed');
      setDocs((prev) => [data.document, ...prev]);
      setShowUploadModal(false);
      form.reset();
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

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
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary text-white rounded px-3 py-2 text-sm hover:bg-primary/80 transition"
          >
            Upload
          </button>
        </div>
      </div>
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-950 border border-white/10 rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">Upload</p>
                <h3 className="text-lg font-semibold text-white">Upload Document</h3>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                }}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form className="space-y-3" onSubmit={handleUpload}>
              <input
                name="title"
                placeholder="Title"
                required
                className="w-full bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                placeholder="Description"
                className="w-full bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
                rows={3}
              />
              <select
                name="category"
                className="w-full bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {categories
                  .filter((c) => c.value !== 'all')
                  .map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
              </select>
              <input
                name="file"
                type="file"
                required
                className="w-full text-sm text-white/80"
              />
              {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-primary text-white rounded px-4 py-2 text-sm disabled:opacity-50 hover:bg-primary/80 transition"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadError(null);
                  }}
                  className="flex-1 bg-white/10 text-white rounded px-4 py-2 text-sm hover:bg-white/20 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
