import { PortableText, type PortableTextReactComponents } from '@portabletext/react';

const components: Partial<PortableTextReactComponents> = {
  block: {
    h2: ({ children }) => <h2 className="text-3xl font-bold mt-8 mb-4">{children}</h2>,
    h3: ({ children }) => <h3 className="text-2xl font-bold mt-6 mb-3">{children}</h3>,
    h4: ({ children }) => <h4 className="text-xl font-bold mt-4 mb-2">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4">{children}</blockquote>
    )
  },
  marks: {
    link: ({ children, value }) => (
      <a
        href={(value as any)?.href}
        className="text-primary hover:underline"
        target="_blank"
        rel="noopener"
      >
        {children}
      </a>
    ),
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="bg-white/10 px-2 py-1 rounded text-sm font-mono text-white">{children}</code>
    )
  },
  types: {
    image: ({ value }) => (
      <img src={(value as any)?.asset?.url} alt={(value as any)?.alt || ''} className="w-full rounded-lg my-6" />
    ),
    code: ({ value }) => (
      <pre className="bg-black text-white p-4 rounded-lg overflow-x-auto my-6">
        <code>{(value as any)?.code}</code>
      </pre>
    )
  }
};

export default function VendorPostContent({ content }: { content: any }) {
  return <PortableText value={content} components={components} />;
}
