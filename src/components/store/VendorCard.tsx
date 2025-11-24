import { urlFor } from '@/lib/sanity';
import { Building2, Package } from 'lucide-react';

type Vendor = {
  _id?: string;
  companyName?: string;
  displayName?: string;
  slug?: { current?: string } | null;
  logo?: any;
  description?: string;
  businessType?: string;
  productCount?: number;
};

type VendorCardProps = {
  vendor: Vendor;
  featured?: boolean;
};

const resolveSlug = (slug: Vendor['slug']): string =>
  typeof slug === 'string' ? slug : slug?.current || '';

export function VendorCard({ vendor, featured = false }: VendorCardProps) {
  const slug = resolveSlug(vendor?.slug);
  const href = slug ? `/vendors/${slug}` : '#';
  const logoUrl = vendor?.logo ? urlFor(vendor.logo).width(320).height(200).url() : '';
  const productCount = vendor?.productCount ?? 0;

  return (
    <a
      href={href}
      className={`block rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-primary/20 ${
        featured ? 'ring-1 ring-primary/40' : ''
      }`}
    >
      {logoUrl ? (
        <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-white/5 p-4">
          <img
            src={logoUrl}
            alt={vendor?.companyName || 'Vendor logo'}
            className="h-full w-auto max-w-full object-contain"
            loading="lazy"
            width={320}
            height={200}
          />
        </div>
      ) : (
        <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-white/5 text-white/50">
          <Building2 className="h-10 w-10" />
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">
          {vendor?.displayName || vendor?.companyName || 'Vendor'}
        </h3>
        {vendor?.description && (
          <p className="text-sm text-neutral-300 line-clamp-2">{vendor.description}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
        <span className="capitalize">{vendor?.businessType || 'Partner'}</span>
        {productCount > 0 && (
          <span className="flex items-center gap-1 text-white">
            <Package className="h-4 w-4 text-primary" />
            {productCount}
          </span>
        )}
      </div>
    </a>
  );
}

export default VendorCard;
