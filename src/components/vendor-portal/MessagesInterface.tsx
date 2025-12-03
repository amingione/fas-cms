import React, { useEffect, useState } from 'react';

type MessageSummary = {
  _id: string;
  subject?: string;
  status?: string;
  priority?: string;
  category?: string;
  createdAt?: string;
  lastReplyAt?: string;
  lastReply?: string;
};

type Reply = {
  message?: string;
  author?: string;
  authorEmail?: string;
  timestamp?: string;
  isStaff?: boolean;
};

type MessageDetail = {
  _id: string;
  subject?: string;
  status?: string;
  priority?: string;
  category?: string;
  replies?: Reply[];
};

const MessagesInterface: React.FC = () => {
  const [list, setList] = useState<MessageSummary[]>([]);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [compose, setCompose] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err?.message || 'Failed to load message');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleSend = async (payload: { subject?: string; message?: string; priority?: string; category?: string }) => {
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

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
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
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <ul className="space-y-2 max-h-[480px] overflow-auto">
          {list.map((m) => (
            <li
              key={m._id}
              onClick={() => loadDetail(m._id)}
              className={`p-2 rounded cursor-pointer border border-transparent hover:border-white/20 ${
                selected?._id === m._id ? 'bg-white/10' : 'bg-white/5'
              }`}
            >
              <p className="text-sm font-semibold text-white">{m.subject || 'Message'}</p>
              <p className="text-xs text-white/60">
                {m.status || ''} • {m.priority || ''}
              </p>
              <p className="text-xs text-white/60 line-clamp-1">{m.lastReply || ''}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:col-span-2 rounded-lg border border-white/10 bg-white/5 p-4 min-h-[520px]">
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
  onSend: (payload: { subject?: string; message?: string; priority?: string; category?: string }) => void;
  onCancel: () => void;
}> = ({ onSend, onCancel }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('general');

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">New Message</h3>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="w-full bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
      />
      <div className="flex gap-3">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
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

const MessageThread: React.FC<{ message: MessageDetail; onReply: (msg: string) => void }> = ({
  message,
  onReply
}) => {
  const [reply, setReply] = useState('');
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{message.subject || 'Message'}</h3>
        <p className="text-xs text-white/60">
          {message.status || ''} • {message.priority || ''} • {message.category || ''}
        </p>
      </div>
      <div className="space-y-3 max-h-[380px] overflow-auto">
        {(message.replies || []).map((r, idx) => (
          <div
            key={idx}
            className={`rounded-lg p-3 ${r.isStaff ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/5 border border-white/10'}`}
          >
            <p className="text-sm text-white/80 whitespace-pre-wrap">{r.message}</p>
            <p className="text-xs text-white/50 mt-1">
              {r.author || (r.isStaff ? 'FAS Team' : 'Vendor')} •{' '}
              {r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}
            </p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type a reply"
          rows={3}
          className="w-full bg-zinc-900 border border-white/20 text-white rounded px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            onReply(reply);
            setReply('');
          }}
          className="bg-primary text-white rounded px-4 py-2 text-sm"
        >
          Reply
        </button>
      </div>
    </div>
  );
};

export default MessagesInterface;
