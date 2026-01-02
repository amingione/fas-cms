import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { VendorMessageDetail, VendorMessageSummary } from '@/types/vendor';
const MessagesInterface: React.FC = () => {
  const [list, setList] = useState<VendorMessageSummary[]>([]);
  const [selected, setSelected] = useState<VendorMessageDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [compose, setCompose] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('vendorMessagesRead');
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      if (Array.isArray(parsed)) {
        setReadIds(new Set(parsed));
      }
    } catch {
      setReadIds(new Set());
    }
  }, []);

  const loadList = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch('/api/vendor/messages', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load messages');
      setList(data.messages || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load messages');
    } finally {
      setLoadingList(false);
    }
  };

  const loadDetail = async (id: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendor/messages/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load message');
      setSelected(data.message || null);
      markRead(id);
    } catch (err: any) {
      setError(err?.message || 'Failed to load message');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    const unreadCount = list.filter((m) => m.lastReplyIsStaff && !readIds.has(m._id)).length;
    window.dispatchEvent(
      new CustomEvent('vendor-messages-unread-updated', { detail: { count: unreadCount } })
    );
  }, [list, readIds]);

  const markRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem('vendorMessagesRead', JSON.stringify(Array.from(next)));
      } catch {
        /* no-op */
      }
      return next;
    });
  };

  const handleSend = async (payload: {
    subject?: string;
    message?: string;
    priority?: string;
    category?: string;
  }) => {
    setError(null);
    try {
      const res = await fetch('/api/vendor/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to send message');
      setCompose(false);
      loadList();
    } catch (err: any) {
      setError(err?.message || 'Failed to send message');
    }
  };

  const handleReply = async (message: string) => {
    if (!selected) return;
    setError(null);
    try {
      const res = await fetch(`/api/vendor/messages/${selected._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to reply');
      await loadDetail(selected._id);
      await loadList();
    } catch (err: any) {
      setError(err?.message || 'Failed to reply');
    }
  };

  const handleDelete = async (id: string, subject?: string) => {
    if (deletingIds.has(id)) return;
    const confirmed = window.confirm(`Delete "${subject || 'Message'}"? This cannot be undone.`);
    if (!confirmed) return;
    setError(null);
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/vendor/messages/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to delete message');
      if (selected?._id === id) {
        setSelected(null);
      }
      setReadIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        try {
          sessionStorage.setItem('vendorMessagesRead', JSON.stringify(Array.from(next)));
        } catch {
          /* no-op */
        }
        return next;
      });
      await loadList();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete message');
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-box-outter shadow-inner shadow-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Messages</h2>
          <button
            onClick={() => setCompose(true)}
            className="text-sm rounded bg-primary text-white px-3 py-1"
          >
            New
          </button>
        </div>
        {loadingList && <p className="text-white/70 text-sm">Loading…</p>}
        {error && <p className="text-primary font-bold font-sans text-sm">{error}</p>}
        <ul className="space-y-2 max-h-[480px] overflow-y-auto overflow-x-hidden">
          {list.map((m) => (
            <li
              key={m._id}
              onClick={() => loadDetail(m._id)}
              className={`p-2 rounded cursor-pointer border border-transparent hover:border-white/20 ${
                selected?._id === m._id ? 'bg-white/10' : 'bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold font-sans text-white">
                  {m.subject || 'Message'}
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(m._id, m.subject);
                  }}
                  disabled={deletingIds.has(m._id)}
                  className="rounded p-1 text-white/60 transition hover:text-white hover:bg-white/10 disabled:opacity-40"
                  aria-label={`Delete ${m.subject || 'message'}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
                    <path d="M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-white/60">
                {m.status || ''} • {m.priority || ''}
              </p>
              <p className="text-xs text-white/60 line-clamp-1">{m.lastReply || ''}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:col-span-2 rounded-lg border border-white/10 bg-[#1a1a1a] p-4 min-h-[520px] shadow-box-outter shadow-inner shadow-white/10">
        {compose ? (
          <ComposeForm
            onCancel={() => setCompose(false)}
            onSend={(payload) => handleSend(payload)}
          />
        ) : loadingDetail ? (
          <p className="text-white/70 text-sm">Loading message…</p>
        ) : selected ? (
          <MessageThread message={selected} onReply={handleReply} />
        ) : (
          <p className="text-white/70 text-sm">Select a message or start a new one.</p>
        )}
      </div>
    </div>
  );
};

const ComposeForm: React.FC<{
  onSend: (payload: {
    subject?: string;
    message?: string;
    priority?: string;
    category?: string;
  }) => void;
  onCancel: () => void;
}> = ({ onSend, onCancel }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('general');

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold font-sans text-white">New Message</h3>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="w-full bg-[#121212] border border-white/20 text-white rounded px-3 py-2 text-sm"
      />
      <div className="flex gap-3">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="bg-[#121212] border border-white/20 text-white rounded px-3 py-2 text-sm"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
        >
          <option value="order">Order</option>
          <option value="payment">Payment</option>
          <option value="product">Product</option>
          <option value="technical">Technical</option>
          <option value="general">General</option>
        </select>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message"
        rows={6}
        className="w-full bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSend({ subject, message, priority, category })}
          className="bg-primary text-white rounded px-4 py-2 text-sm"
        >
          Send
        </button>
        <button onClick={onCancel} className="text-white/70 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
};

const MessageThread: React.FC<{ message: VendorMessageDetail; onReply: (msg: string) => void }> = ({
  message,
  onReply
}) => {
  const [reply, setReply] = useState('');
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold font-sans text-white">
          {message.subject || 'Message'}
        </h3>
        <p className="text-xs text-white/60">
          {message.status || ''} • {message.priority || ''} • {message.category || ''}
        </p>
      </div>
      <div className="space-y-3 px-5 max-h-[380px] overflow-y-auto overflow-x-hidden">
        <AnimatePresence initial={false}>
          {(message.replies || []).map((r, idx) => {
            const next = (message.replies || [])[idx + 1];
            const showTail = !next || next.isStaff !== r.isStaff;
            const isStaff = Boolean(r.isStaff);
            return (
              <motion.div
                key={idx}
                className={`flex ${isStaff ? 'justify-start' : 'justify-end'} ${
                  showTail ? 'mb-4' : 'mb-0.5'
                }`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ type: 'spring', stiffness: 220, damping: 24, mass: 0.3 }}
              >
                <div
                  className={`relative max-w-[255px] break-words px-5 py-2.5 leading-6 rounded-[25px] ${
                    isStaff ? 'bg-[#720000] text-white' : 'bg-[#e5e5ea] text-black'
                  }`}
                >
                  <p className="text-[10px] mt-1 break-words">
                    <span className={r.isStaff ? 'font-semibold' : 'font-sans'}>
                      {r.author || (r.isStaff ? 'FAS' : 'Vendor')}
                    </span>{' '}
                    • {r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}
                    <p className="text-base text-bold font-sans font-bold leading-6 whitespace-pre-wrap break-words">
                      {r.message}
                    </p>
                  </p>
                  {showTail &&
                    (isStaff ? (
                      <>
                        <span className="absolute bottom-0 left-[-7px] z-10 h-[25px] w-[20px] rounded-br-[16px_14px] bg-[#720000]" />
                        <span className="absolute bottom-0 left-[-26px] z-20 h-[25px] w-[26px] rounded-br-[10px] bg-[#1a1a1a]" />
                      </>
                    ) : (
                      <>
                        <span className="absolute bottom-0 right-[-7px] z-10 h-[25px] w-[20px] rounded-bl-[16px_14px] bg-[#e5e5ea]" />
                        <span className="absolute bottom-0 right-[-26px] z-20 h-[25px] w-[26px] rounded-bl-[10px] bg-[#1a1a1a]" />
                      </>
                    ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="space-y-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type a reply"
          rows={3}
          className="w-full rounded border border-black/90 bg-[#121212] px-3 py-2 text-sm text-white shadow-white/10 shadow-box-outter shadow-inner"
        />
        <button
          onClick={() => {
            onReply(reply);
            setReply('');
          }}
          className="btn-plain bg-primary text-white rounded px-4 py-2 text-sm"
        >
          Reply
        </button>
      </div>
    </div>
  );
};

export default MessagesInterface;
