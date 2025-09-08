import { useState, useEffect, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import ProductCard from '@components/ProductCard';

import {
  Search,
  Grid3X3,
  List,
  ShoppingCart,
  X,
  Package,
  Zap,
  Settings,
  Wrench,
  ChevronDown
} from 'lucide-react';

import type { Category } from '@lib/sanity-utils';

export interface Product {
  _id: string;
  title: string;
  slug: string;
  price: number;
  image: string;
  images?: Array<{ asset?: { url?: string } } | string>; // Add images property
  categories: Array<{ _id: string; title: string; slug: { current: string } }>; // Updated to match ProductCard expected type
  featured?: boolean;
  filters?: string[];
}

const mockProducts = [
  {
    _id: '1',
    title: 'Billet Supercharger Snout - LSA Platform',
    slug: 'billet-supercharger-snout-lsa',
    price: 1299.99,
    image: 'images/billet bearing plate.png',
    images: ['images/billet bearing plate.png'],
    categories: [{ _ref: 'supercharger' }, { _ref: 'lsa' }],
    featured: true,
    filters: []
  },
  {
    _id: '2',
    title: 'Performance Pulley System - 2.8L',
    slug: 'performance-pulley-system-2-8l',
    price: 649.99,
    image: 'images/fas pred pully HP{ copy.png',
    images: ['images/fas pred pully HP{ copy.png'],
    categories: [{ _ref: 'pulleys' }, { _ref: 'boost' }],
    featured: true,
    filters: []
  },
  {
    _id: '3',
    title: 'Complete Hellcat Supercharger Kit',
    slug: 'hellcat-supercharger-kit',
    price: 4999.99,
    image: 'images/jeep trackhawk 900 package.png',
    images: ['images/jeep trackhawk 900 package.png'],
    categories: [{ _ref: 'kits' }, { _ref: 'hellcat' }],
    featured: true,
    filters: []
  },
  {
    _id: '4',
    title: 'Billet Aluminum Supercharger Lid',
    slug: 'billet-supercharger-lid',
    price: 899.99,
    image: 'images/FAS-Billet-Snout-Front.png',
    images: ['images/FAS-Billet-Snout-Front.png'],
    categories: [{ _ref: 'supercharger' }, { _ref: 'lsa' }],
    filters: []
  },
  {
    _id: '5',
    title: 'High-Flow Throttle Body Spacer',
    slug: 'throttle-body-spacer',
    price: 299.99,
    image: 'images/FAS Pulley & Hub Kit.png',
    images: ['images/FAS Pulley & Hub Kit.png'],
    categories: [{ _ref: 'intake' }, { _ref: 'throttle' }],
    filters: []
  },
  {
    _id: '6',
    title: 'Custom Port & Polish Service',
    slug: 'port-polish-service',
    price: 1499.99,
    image: 'images/superchargers/hpfasog.png',
    images: ['images/superchargers/hpfasog.png'],
    categories: [{ _ref: 'services' }, { _ref: 'porting' }],
    filters: []
  },
  {
    _id: '7',
    title: 'Racing Pulley Set - Multiple Ratios',
    slug: 'racing-pulley-set',
    price: 799.99,
    image: 'images/fas pred pully HP{ copy.png',
    images: ['images/fas pred pully HP{ copy.png'],
    categories: [{ _ref: 'pulleys' }, { _ref: 'racing' }],
    filters: []
  },
  {
    _id: '8',
    title: 'Demon 170 Upgrade Package',
    slug: 'demon-170-upgrade',
    price: 6999.99,
    image: 'images/painted supercharger whippel pulley copy.png',
    images: ['images/painted supercharger whippel pulley copy.png'],
    categories: [{ _ref: 'kits' }, { _ref: 'demon' }],
    filters: []
  },
  {
    _id: '9',
    title: 'Billet Idler Pulley Assembly',
    slug: 'billet-idler-pulley',
    price: 399.99,
    image: 'images/ported-snoutfas.png',
    images: ['images/ported-snoutfas.png'],
    categories: [{ _ref: 'pulleys' }, { _ref: 'idler' }],
    filters: []
  },
  {
    _id: '10',
    title: 'Supercharger Rebuild Service',
    slug: 'supercharger-rebuild',
    price: 2299.99,
    image: 'images/packages/850-ram.webp',
    images: ['images/packages/850-ram.webp'],
    categories: [{ _ref: 'services' }, { _ref: 'rebuild' }],
    filters: []
  },
  {
    _id: '11',
    title: 'Performance Heat Exchanger',
    slug: 'performance-heat-exchanger',
    price: 1899.99,
    image: 'images/THpackage.png',
    images: ['images/THpackage.png'],
    categories: [{ _ref: 'cooling' }, { _ref: 'heat-exchanger' }],
    filters: []
  },
  {
    _id: '12',
    title: 'Billet Supercharger Drive Hub',
    slug: 'billet-drive-hub',
    price: 549.99,
    image: 'images/FAS-Billet-Snout.png',
    images: ['images/FAS-Billet-Snout.png'],
    categories: [{ _ref: 'supercharger' }, { _ref: 'drive' }],
    filters: []
  }
];

const localCategories = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'supercharger', name: 'Supercharger', icon: Zap },
  { id: 'pulleys', name: 'Pulleys', icon: Settings },
  { id: 'kits', name: 'Complete Kits', icon: Wrench },
  { id: 'services', name: 'Services', icon: Package }
];

export interface ShopProps {
  initialProducts: Product[];
  categories: Category[];
  selectedCategory: string;
  selectedFilters: string[];
  pageInfo: {
    currentPage: number;
    totalPages: number;
    paginationLinks: { label: string; page: number }[];
  };
}

export default function Shop({
  initialProducts,
  categories,
  selectedCategory: selectedCategoryProp,
  selectedFilters: selectedFiltersProp,
  pageInfo
}: ShopProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const effectiveCategories =
    Array.isArray(categories) && categories.length
      ? categories
      : (localCategories as unknown as Category[]);
  const sourceProducts: Product[] =
    Array.isArray(initialProducts) && initialProducts.length
      ? initialProducts
      : (mockProducts as unknown as Product[]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(selectedCategoryProp || 'all');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [cartItems, setCartItems] = useState(0);
  const [viewMode, setViewMode] = useState('grid');

  // Load cart count on mount
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const raw = localStorage.getItem('fas_cart_v1');
        const parsed = raw ? JSON.parse(raw) : null;
        const items: any[] = parsed && Array.isArray(parsed.items) ? parsed.items : [];
        const count = items.reduce((total: number, item: any) => total + (item.quantity || 0), 0);
        setCartItems(count);
      } catch {
        setCartItems(0);
      }
    };

    updateCartCount();
    window.addEventListener('cart:changed', updateCartCount);
    return () => {
      window.removeEventListener('cart:changed', updateCartCount);
    };
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = sourceProducts.filter((product) => {
      const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
      // --- CATEGORY/FILTER LOGIC ---
      const catTokens: string[] = [
        ...(product.categories || []).map((cat: any) =>
          (cat?._ref || cat?.slug || cat?.slug?.current || cat?._id || '').toString().toLowerCase()
        ),
        ...(product.filters || []).map((f: string) => f.toString().toLowerCase())
      ].filter(Boolean);

      const matchesCategory =
        selectedCategory === 'all' || catTokens.includes(selectedCategory.toLowerCase());
      // --- END CATEGORY LOGIC ---
      return matchesSearch && matchesCategory;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'name':
          return a.title.localeCompare(b.title);
        case 'featured':
        default:
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedCategory, sortBy]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSortBy('featured');
  };

  return (
    <section
      id="shop"
      className="py-24 bg-gradient-to-b from-background via-gray-900/30 to-background relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 asphalt-texture"></div>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'url(/images/backgrounds/bg-texture.webp)',
          backgroundSize: '800px 600px',
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0'
        }}
      ></div>
      <div className="absolute inset-0 bg-black/15"></div>

      <div className="container mx-auto px-4 lg:px-6 relative z-10" ref={ref}>
        {/* Header */}
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-4 bg-primary/10 border-primary/30 text-primary px-8 py-3 text-sm font-bold tracking-widest font-borg"
            >
              F.a.S. PERFORMANCE SHOP
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl lg:text-7xl font-black leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <span className="block text-white font-captain">PRECISION</span>
            <span className="block chrome-text text-5xl lg:text-8xl font-cyber">ENGINEERED</span>
            <span className="block text-primary font-captain">PERFORMANCE</span>
          </motion.h1>

          <motion.p
            className="text-lg text-graylight max-w-3xl mx-auto leading-relaxed font-kwajong"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Explore our complete collection of precision-machined supercharger components,
            performance kits, and professional services - all engineered for maximum power and
            reliability.
          </motion.p>

          <motion.div
            className="font-borg text-accent text-sm tracking-widest"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            — BILLET ALUMINUM • DYNO TESTED • TRACK PROVEN —
          </motion.div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="bg-black/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 mb-8 industrial-card"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1, duration: 0.6 }}
        >
          {/* Mobile Layout */}
          <div className="block md:hidden space-y-4">
            {/* Search - Full Width */}
            <div className="relative">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-graylight pointer-events-none z-[1]" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-graylight focus:border-primary focus:ring-primary/20 font-kwajong h-12 text-base"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Category Filter */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-3 pr-8 text-white font-ethno text-sm focus:border-primary focus:ring-primary/20 w-full cursor-pointer transition-all duration-300 hover:border-primary/50"
                >
                  {effectiveCategories.map((category: any) => (
                    <option
                      key={category._id || category.id || category.slug?.current || 'all'}
                      value={category.id || category._id || category.slug?.current || 'all'}
                      className="bg-gray-800 text-white font-ethno"
                    >
                      {category.name || category.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-graylight pointer-events-none" />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-3 pr-8 text-white font-ethno text-sm focus:border-primary focus:ring-primary/20 w-full cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="name">Name A-Z</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-graylight pointer-events-none" />
              </div>
            </div>

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between">
              {/* View Toggle */}
              <div className="flex border border-gray-600/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 transition-colors mobile-touch-target ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white'
                      : 'bg-gray-800/50 text-graylight hover:text-white'
                  }`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 transition-colors mobile-touch-target ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'bg-gray-800/50 text-graylight hover:text-white'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              {/* Clear Filters */}
              {(searchTerm || selectedCategory !== 'all' || sortBy !== 'featured') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-graylight hover:text-white font-ethno mobile-touch-target"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex flex-col lg:flex-row gap-6 items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-graylight pointer-events-none z-[1]" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-graylight focus:border-primary focus:ring-primary/20 font-kwajong"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2 pr-10 text-white font-ethno text-sm focus:border-primary focus:ring-primary/20 min-w-[180px] cursor-pointer transition-all duration-300 hover:border-primary/50"
              >
                {effectiveCategories.map((category: any) => (
                  <option
                    key={category._id || category.id || category.slug?.current || 'all'}
                    value={category.id || category._id || category.slug?.current || 'all'}
                    className="bg-gray-800 text-white font-ethno"
                  >
                    {category.name || category.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-graylight pointer-events-none" />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 pr-8 text-white font-ethno text-sm focus:border-primary focus:ring-primary/20 cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="name">Name A-Z</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-graylight pointer-events-none" />
              </div>

              {/* View Toggle */}
              <div className="flex border border-gray-600/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white'
                      : 'bg-gray-800/50 text-graylight hover:text-white'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'bg-gray-800/50 text-graylight hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Clear Filters */}
              {(searchTerm || selectedCategory !== 'all' || sortBy !== 'featured') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-graylight hover:text-white font-ethno"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Results Summary */}
        <motion.div
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <div className="text-graylight font-kwajong">
            Showing <span className="text-white font-bold">{filteredProducts.length}</span> products
            {selectedCategory !== 'all' && (
              <span className="ml-2">
                in{' '}
                <span className="text-primary font-bold font-ethno">
                  {(effectiveCategories as any).find(
                    (cat: any) => (cat.id || cat._id || cat.slug?.current) === selectedCategory
                  )?.name ||
                    (effectiveCategories as any).find(
                      (cat: any) => String(cat.id || '') === selectedCategory
                    )?.name}
                </span>
              </span>
            )}
          </div>

          {cartItems > 0 && (
            <div className="flex items-center space-x-2 text-primary font-ethno">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-bold">{cartItems} items in cart</span>
            </div>
          )}
        </motion.div>

        {/* Product Grid */}
        <motion.div
          className={`grid gap-6 ${
            viewMode === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1'
          }`}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.6 + index * 0.1, duration: 0.4 }}
            >
              <ProductCard
                product={{
                  ...product,
                  slug: typeof product.slug === 'string' ? { current: product.slug } : product.slug,
                  images: (product.images || []).map((img) =>
                    typeof img === 'string'
                      ? { asset: { url: img, _id: '' }, alt: '' }
                      : {
                          asset: {
                            url: img?.asset?.url || '',
                            _id: ''
                          },
                          alt: ''
                        }
                  ),
                  categories: (product.categories || []).map((cat: any, idx: number) => ({
                    _id: cat._id || cat._ref || `cat-${idx}`,
                    title: cat.title || cat._ref || cat.slug || `Category ${idx + 1}`,
                    slug: { current: cat.slug?.current || cat.slug || cat._ref || cat._id || '' }
                  }))
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* No Results */}
        {filteredProducts.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Package className="w-16 h-16 text-graylight mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2 font-ethno">No products found</h3>
            <p className="text-graylight font-kwajong">Try adjusting your search or filters</p>
            <Button
              onClick={clearFilters}
              className="mt-4 bg-primary hover:bg-primary/90 font-ethno"
            >
              Clear All Filters
            </Button>
          </motion.div>
        )}

        {/* Bottom CTA */}
        <motion.div
          className="mt-20 text-center bg-black/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-12 industrial-card"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 2, duration: 0.8 }}
        >
          <h3 className="text-3xl lg:text-5xl font-black text-white mb-4 font-captain">
            CAN'T FIND WHAT YOU'RE <span className="font-cyber">LOOKING FOR?</span>
          </h3>
          <p className="text-lg text-graylight mb-8 max-w-2xl mx-auto font-kwajong">
            We specialize in custom fabrication and one-off builds. Contact our engineering team to
            discuss your specific performance requirements.
          </p>

          <div className="font-borg text-accent text-sm tracking-widest mb-8">
            — CUSTOM ENGINEERING • UNLIMITED POSSIBILITIES —
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg font-bold shadow-lg shadow-primary/25 metallic-btn font-ethno text-[12px]"
            >
              <Wrench className="w-5 h-5 mr-3" />
              CUSTOM QUOTE
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-graylight/50 text-graylight hover:bg-secondary/10 hover:text-white hover:border-secondary/70 px-8 py-4 text-lg font-medium backdrop-blur-sm industrial-glow font-ethno text-[11px]"
            >
              CONTACT ENGINEERING
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
