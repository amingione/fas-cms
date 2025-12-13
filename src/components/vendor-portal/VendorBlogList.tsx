import { useMemo, useState } from 'react';

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  postType?: string;
  priority?: string;
  excerpt?: string;
  featuredImage?: { asset?: { url?: string } };
  publishedAt?: string;
  pinned?: boolean;
  author?: { name?: string };
};

const typeEmoji: Record<string, string> = {
  announcement: '📢',
  notice: '🚨',
  release: '🆕',
  policy: '📋',
  tip: '💡',
  update: '📰'
};

const priorityBadge = (priority?: string) => {
  if (priority === 'urgent')
    return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Urgent</span>;
  if (priority === 'high')
    return (
      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">High Priority</span>
    );
  return null;
};

export default function VendorBlogList({ posts }: { posts: Post[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return posts;
    return posts.filter(
      (post) =>
        post.title?.toLowerCase().includes(term) || post.excerpt?.toLowerCase().includes(term)
    );
  }, [posts, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <input
          type="search"
          placeholder="Search updates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-dark/50 px-4 py-2 text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="space-y-4">
        {filtered.map((post) => (
          <a
            key={post._id}
            href={`/vendor-portal/blog/${post.slug.current}`}
            className="block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-primary/60 hover:bg-white/10"
          >
            <div className="flex gap-4">
              {post.featuredImage?.asset?.url && (
                <div className="hidden sm:block w-40 h-28 overflow-hidden rounded-lg border border-white/10 bg-dark/40">
                  <img
                    src={post.featuredImage.asset.url}
                    alt={post.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-xl">{typeEmoji[post.postType || 'update'] || '📰'}</span>
                  {post.pinned && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Pinned
                    </span>
                  )}
                  {priorityBadge(post.priority)}
                  {post.publishedAt && (
                    <span className="text-white/60 text-xs">
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                  {post.author?.name && (
                    <span className="text-white/60 text-xs">By {post.author.name}</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white">{post.title}</h2>
                <p className="text-white/70 text-sm line-clamp-2">{post.excerpt}</p>
              </div>
            </div>
          </a>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-dark/50 p-6 text-center text-white/70">
            No posts found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
