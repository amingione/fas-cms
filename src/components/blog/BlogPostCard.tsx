import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { urlFor } from '@/lib/sanity';

type BlogCategory = {
  _id?: string;
  title?: string;
  color?: string;
  slug?: string;
};

type BlogPost = {
  _id: string;
  title?: string;
  slug?: string | { current?: string };
  excerpt?: string;
  featuredImage?: SanityImageSource & { alt?: string };
  imageUrl?: string;
  categories?: BlogCategory[];
  author?: { name?: string; avatar?: string };
  publishedAt?: string;
  readTime?: number;
};

interface BlogPostCardProps {
  post: BlogPost;
  featured?: boolean;
}

const resolveSlug = (slug: BlogPost['slug']): string => {
  if (!slug) return '';
  if (typeof slug === 'string') return slug;
  if (typeof slug === 'object' && typeof slug.current === 'string') return slug.current;
  return '';
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export function BlogPostCard({ post, featured = false }: BlogPostCardProps) {
  const slug = resolveSlug(post.slug);
  const href = slug ? `/blog/${slug}` : '#';
  const baseImage = post.featuredImage
    ? urlFor(post.featuredImage)?.width(featured ? 1200 : 800).height(featured ? 640 : 480).url()
    : post.imageUrl;
  const dateLabel = formatDate(post.publishedAt);

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition hover:-translate-y-1 hover:border-primary hover:shadow-glow ${featured ? 'md:col-span-3' : ''}`}
    >
      {baseImage && (
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={baseImage}
            alt={post?.featuredImage && 'alt' in post.featuredImage ? post.featuredImage.alt ?? post.title ?? '' : post.title ?? ''}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60" />
          {featured && (
            <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-lg">
              Featured
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-6">
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.categories.map((category) => (
              <span
                key={category._id || category.slug || category.title}
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: category.color || 'rgba(209,18,25,0.12)',
                  color: '#fefefe'
                }}
              >
                {category.title}
              </span>
            ))}
          </div>
        )}

        <h3 className="text-2xl font-semibold text-white transition group-hover:text-primary">
          <a href={href}>{post.title || 'Untitled post'}</a>
        </h3>

        {post.excerpt && <p className="text-sm text-neutral-300">{post.excerpt}</p>}

        <div className="mt-auto flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-3">
            {post.author?.avatar && (
              <img
                src={post.author.avatar}
                alt={post.author?.name || 'Author avatar'}
                className="h-8 w-8 rounded-full object-cover"
                loading="lazy"
              />
            )}
            {post.author?.name && <span className="font-medium text-white">{post.author.name}</span>}
          </div>

          <div className="flex items-center gap-2 text-neutral-400">
            {dateLabel && <span>{dateLabel}</span>}
            {post.readTime ? (
              <>
                <span className="opacity-50">•</span>
                <span>{post.readTime} min read</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default BlogPostCard;
