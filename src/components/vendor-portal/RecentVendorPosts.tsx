import { useEffect, useState } from 'react';

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  postType?: string;
  publishedAt?: string;
};

const typeEmoji: Record<string, string> = {
  announcement: '📢',
  notice: '🚨',
  release: '🆕',
  policy: '📋',
  tip: '💡',
  update: '📰'
};

export default function RecentVendorPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch('/api/vendor/blog?limit=5', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load updates');
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load updates');
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-white">Recent Updates</h3>
        <a href="/vendor-portal/blog" className="text-primary text-sm font-semibold hover:text-primary/80">
          View All →
        </a>
      </div>
      {error && <p className="text-amber-300 text-sm">{error}</p>}
      <div className="space-y-2">
        {posts.map((post) => (
          <a
            key={post._id}
            href={`/vendor-portal/blog/${post.slug.current}`}
            className="block rounded-lg px-3 py-2 hover:bg-white/5 transition"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{typeEmoji[post.postType || 'update'] || '📰'}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm text-white leading-tight">{post.title}</div>
                {post.publishedAt && (
                  <div className="text-[11px] text-white/60">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
        {!error && posts.length === 0 && (
          <p className="text-white/60 text-sm">No updates yet.</p>
        )}
      </div>
    </div>
  );
}
