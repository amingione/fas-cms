import { PortableText } from '@portabletext/react';

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
  }
};

export default function PortableTextRenderer({ value }) {
  if (!value) return null;

  const safeBlocks = Array.isArray(value) ? value.filter((b) => b && b._type) : [];

  if (safeBlocks.length === 0) return null;

  return <PortableText value={safeBlocks} components={components} />;
}
