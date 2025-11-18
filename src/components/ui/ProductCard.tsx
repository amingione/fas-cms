import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { getCart, saveCart } from '@lib/cart';
import { resolveSanityImageUrl } from '@/lib/sanity-utils';
import { resolveProductCartMeta } from '@/lib/product-flags';

interface Product {
  _id: string;
  title: string;
  slug: string | { current: string };
  price: number;
  image: {
    asset: {
      url: string;
    };
  };
  categories?: Array<{ _ref?: string; _id?: string }>;
  shippingClass?: string | null;
  filters?: unknown;
  installOnly?: unknown;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const productPrice =
    typeof product.price === 'number' ? `$${parseFloat(product.price.toString()).toFixed(2)}` : '—';

  const imageUrl = resolveSanityImageUrl([product?.image, product?.image?.asset]) || '/logo/faslogochroma.webp';
  const productSlug = typeof product.slug === 'string' ? product.slug : product.slug?.current || '';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      // Get current cart
      const cart = getCart();
      const { shippingClass, installOnly } = resolveProductCartMeta(product);

      // Check if item already exists
      const existingIndex = cart.findIndex((item: any) => item.id === product._id);

      if (existingIndex >= 0) {
        cart[existingIndex].quantity += 1;
        if (shippingClass) {
          cart[existingIndex].shippingClass = shippingClass;
        }
        if (installOnly) {
          cart[existingIndex].installOnly = true;
        }
      } else {
        cart.push({
          id: product._id,
          name: product.title,
          price: product.price,
          quantity: 1,
          image: imageUrl,
          categories: (product.categories || [])
            .filter(Boolean)
            .map((c: any) => c._ref || c._id || ''),
          ...(shippingClass ? { shippingClass } : {}),
          ...(installOnly ? { installOnly: true } : {})
        });
      }

      // Save + emit
      saveCart(cart);

      // Show success feedback
      showToast(`Added to cart: ${product.title}`, true);
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Failed to add item to cart', false);
    }

    setTimeout(() => setIsAdding(false), 600);
  };

  const showToast = (message: string, success: boolean) => {
    const toast = document.createElement('div');
    toast.className = `fixed top-20 right-6 z-50 px-6 py-4 backdrop-blur-sm font-bold shadow-xl transition-all duration-300 rounded-xl ${
      success
        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
        : 'bg-primary/20 text-primary border border-primary/30'
    } font-ethno`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  };

  return (
    <motion.div
      className="relative z-0 text-white bg-black/10 rounded-xl shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_20px_rgba(234,29,38,0.3)] overflow-hidden transform transition-all duration-500 group industrial-card"
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <a
        href={`/shop/${encodeURIComponent(productSlug)}`}
        className="block"
        onClick={(e) => e.preventDefault()} // Prevent navigation for demo
      >
        <div className="p-4 h-52 sm:h-64 flex justify-center items-center overflow-hidden">
          <motion.img
            src={imageUrl}
            alt={product.title}
            className="w-full h-full object-contain transition-transform duration-300 ease-in-out group-hover:scale-105 group-hover:-rotate-1"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="p-4 space-y-2">
          <div className="px-4 text-left">
            <h2 className="text-sm sm:text-base font-ethno font-semibold text-white group-hover:text-primary transition-colors duration-300">
              {product.title}
            </h2>
          </div>
        </div>
      </a>

      <div className="px-4 pb-4 text-left">
        <div className="flex justify-between items-center mt-2">
          <p className="text-xl font-mono text-primary engine-pulse">{productPrice}</p>

          {product._id && (
            <motion.button
              className={`p-3 rounded-full transition-all duration-300 metallic-btn font-ethno ${
                isAdding
                  ? 'bg-green-500 text-white scale-110'
                  : 'text-primary hover:text-white hover:bg-primary border border-primary/30 hover:border-primary'
              }`}
              onClick={handleAddToCart}
              disabled={isAdding}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                animate={isAdding ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 0.6 }}
              >
                <ShoppingCart className="w-5 h-5" />
              </motion.div>
            </motion.button>
          )}
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"></div>
    </motion.div>
  );
}
