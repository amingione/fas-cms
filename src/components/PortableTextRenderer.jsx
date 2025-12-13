import { PortableText } from '@portabletext/react';
import { urlFor } from '@/lib/sanity';

const components = {
  marks: {
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc ml-6">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal ml-6">{children}</ol>
  },
  block: {
    normal: ({ children }) => <p className="mb-4">{children}</p>
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;

      const imageUrl = (() => {
        try {
          return urlFor(value)?.width(1400).fit('max').url();
        } catch {
          return value?.asset?.url || null;
        }
      })();

      if (!imageUrl) return null;

      const altText =
        typeof value?.alt === 'string' && value.alt.trim() ? value.alt : 'Blog post image';
      const caption =
        typeof value?.caption === 'string' && value.caption.trim() ? value.caption : null;

      return (
        <figure className="my-8 overflow-hidden rounded-2xl border border-white/10 bg-dark/20">
          <img src={imageUrl} alt={altText} loading="lazy" className="w-full h-auto object-cover" />
          {caption ? (
            <figcaption className="p-3 text-center text-sm text-neutral-400">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }
  }
};

export default function PortableTextRenderer({ value }) {
  if (!value) return null;

  const safeBlocks = Array.isArray(value) ? value.filter((b) => b && b._type) : [];

  if (safeBlocks.length === 0) return null;

  return <PortableText value={safeBlocks} components={components} />;
}
