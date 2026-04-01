'use client';

import { useEffect, useState } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import {
  Drawer,
  DrawerClose,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { urlFor } from '@/lib/sanity';

type DrawerPost = {
  _id: string;
  title?: string;
  slug?: { current?: string } | string;
  excerpt?: string;
  featuredImage?: { asset?: { _ref?: string } };
  publishedAt?: string;
  categories?: Array<{ _id?: string; title?: string; color?: string }>;
};

type DrawerCategory = {
  _id: string;
  title?: string;
  slug?: { current?: string } | string;
  postCount?: number;
};

interface BlogDrawerProps {
  recentPosts?: DrawerPost[];
  categories?: DrawerCategory[];
}

function getSlug(slug: DrawerPost['slug'] | DrawerCategory['slug']): string {
  if (!slug) return '';
  if (typeof slug === 'string') return slug;
  return slug.current ?? '';
}

export default function BlogDrawer({ recentPosts = [], categories = [] }: BlogDrawerProps) {
  const [direction, setDirection] = useState<'right' | 'bottom'>('right');

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const update = () => setDirection(mql.matches ? 'bottom' : 'right');
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return (
    <Drawer direction={direction}>
      <DrawerTrigger asChild>
        <button type="button" className="blog-nav-trigger" aria-label="Open blog preview">
          Blog
        </button>
      </DrawerTrigger>

      <DrawerPortal>
        <DrawerOverlay className="z-[10000]" />
        <DrawerPrimitive.Content
          data-slot="drawer-content"
          className={[
            'group/drawer-content bg-[rgba(8,8,8,0.97)] border-white/10 backdrop-blur-xl fixed z-[10001] flex h-auto flex-col',
            'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[82vh] data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:border-t',
            'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-[22rem] data-[vaul-drawer-direction=right]:border-l',
          ].join(' ')}
        >
          {/* Bottom sheet drag handle */}
          <div className="bg-white/20 mx-auto mt-4 hidden h-1.5 w-[50px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />

          <DrawerHeader className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <DrawerTitle className="font-['Ethnocentric',sans-serif] text-sm uppercase tracking-widest text-white">
              From the Blog
            </DrawerTitle>
            <div className="flex items-center gap-3">
              <a
                href="/blog/"
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                View all →
              </a>
              <DrawerClose className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-4 h-4">
                  <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span className="sr-only">Close</span>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {/* Recent posts */}
            {recentPosts.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Recent Posts</p>
                {recentPosts.map((post) => {
                  const slug = getSlug(post.slug);
                  const cat = post.categories?.[0];
                  let imgUrl: string | null = null;
                  try {
                    if (post.featuredImage?.asset) {
                      imgUrl = urlFor(post.featuredImage).width(96).url();
                    }
                  } catch {
                    // no image
                  }
                  return (
                    <a
                      key={post._id}
                      href={`/blog/${slug}/`}
                      className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-white/5 transition-colors group/post"
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/8 border border-white/10 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        {cat && (
                          <span
                            className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded mb-1 font-semibold"
                            style={{
                              backgroundColor: cat.color ? `${cat.color}26` : 'rgba(196,18,24,0.15)',
                              color: cat.color ?? '#c41218',
                            }}
                          >
                            {cat.title}
                          </span>
                        )}
                        <p className="text-sm text-white/90 leading-snug line-clamp-2 group-hover/post:text-white transition-colors">
                          {post.title}
                        </p>
                        {post.publishedAt && (
                          <p className="text-[11px] text-white/35 mt-1">
                            {new Date(post.publishedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <a href="/blog/" className="text-sm text-white/50 hover:text-white transition-colors">
                  Explore the Blog →
                </a>
              </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Browse by Topic</p>
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 6).map((cat) => {
                    const catSlug = getSlug(cat.slug);
                    return (
                      <a
                        key={cat._id}
                        href={`/blog?category=${catSlug}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/70 border border-white/10 hover:border-white/25 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color ?? '#c41218' }}
                        />
                        {cat.title}
                        {cat.postCount != null && (
                          <span className="text-white/35 text-[10px]">{cat.postCount}</span>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DrawerFooter className="border-t border-white/10 px-5 py-4">
            <DrawerClose asChild>
              <a
                href="/blog/"
                className="flex items-center justify-center w-full py-3 rounded-lg bg-[#c41218] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#a8101a] transition-colors"
              >
                Read the Blog →
              </a>
            </DrawerClose>
          </DrawerFooter>
        </DrawerPrimitive.Content>
      </DrawerPortal>
    </Drawer>
  );
}
