type BlogCategory = {
  _id?: string;
  title?: string;
  slug?: string;
  color?: string;
  postCount?: number;
};

interface BlogSidebarProps {
  categories?: BlogCategory[];
}

export function BlogSidebar({ categories = [] }: BlogSidebarProps) {
  const hasCategories = Array.isArray(categories) && categories.length > 0;

  return (
    <aside className="sticky top-24 space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
      <div>
        <h3 className="text-xl font-semibold text-white">Categories</h3>
        <p className="text-sm text-neutral-400">Browse posts by topic.</p>
      </div>

      {hasCategories ? (
        <div className="space-y-2">
          {categories.map((category) => {
            const slug = category.slug ?? '';
            return (
              <a
                key={category._id || slug || category.title}
                href={slug ? `/blog?category=${slug}` : '#'}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2 transition hover:border-primary hover:bg-white/[0.07]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: category.color || '#d11219' }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-white">{category.title || 'Category'}</span>
                </div>
                {typeof category.postCount === 'number' ? (
                  <span className="text-xs text-neutral-400">{category.postCount}</span>
                ) : null}
              </a>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-neutral-400">No categories available yet.</p>
      )}

      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-primary/20 via-white/[0.04] to-transparent p-4 text-sm text-neutral-200">
        Stay tuned for more performance insights and product deep-dives from the FAS team.
      </div>
    </aside>
  );
}

export default BlogSidebar;
