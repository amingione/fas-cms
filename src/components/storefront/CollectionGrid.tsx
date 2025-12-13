import React, { useEffect, useState } from 'react';
import ProductCardLiteReact from './ProductCardLiteReact';

type Collection = {
  _id: string;
  title: string;
  description?: string;
  featuredImage?: { asset?: { url?: string } };
  products?: any[];
};

export function CollectionGrid({ slug }: { slug: string }) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/collections/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        setCollection(data);
        setProducts(Array.isArray(data?.products) ? data.products : []);
      })
      .catch((err) => console.warn('Unable to load collection', err));
  }, [slug]);

  if (!collection) return <div>Loading...</div>;

  return (
    <div className="collection-page">
      {collection.featuredImage?.asset?.url && (
        <div className="relative h-64 mb-8">
          <img
            src={collection.featuredImage.asset.url}
            alt={collection.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-dark bg-opacity-40 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white">{collection.title}</h1>
          </div>
        </div>
      )}

      {collection.description && (
        <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          {collection.description}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCardLiteReact
            key={product._id}
            product={product}
            productImage={product.images?.[0]}
          />
        ))}
      </div>
    </div>
  );
}

export default CollectionGrid;
