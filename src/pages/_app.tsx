import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import { motion } from 'framer-motion';
import { Home, ShoppingBag, Wrench, Phone } from 'lucide-react';

function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const showApp = router.query.app === '1';
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener('resize', onResize);

    let sectionObserver: IntersectionObserver | null = null;

    if (isMobile && showApp) {
      sectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = (entry.target as HTMLElement).id || 'home';
              setActiveSection(id);
            }
          });
        },
        { threshold: 0.3 }
      );
      const sections = document.querySelectorAll('section[id], .hero-section');
      sections.forEach((s) => sectionObserver!.observe(s));
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (sectionObserver) sectionObserver.disconnect();
    };
  }, [isMobile, showApp]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const mobileNavItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'shop', icon: ShoppingBag, label: 'Shop' },
    { id: 'services', icon: Wrench, label: 'Services' },
    { id: 'contact', icon: Phone, label: 'Contact' }
  ];

  return (
    <div className="dark min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Base black background */}
      <div className="fixed inset-0 bg-dark z-0" />

      {/* Texture overlay (scaled for mobile) */}
      <div
        className="fixed inset-0 z-0 opacity-20 md:opacity-20"
        style={{
          backgroundImage: "url('/images/backgrounds/bg-texture.webp')",
          backgroundSize: isMobile ? '300px 225px' : '600px 450px',
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0'
        }}
      />

      {/* Gradient overlay for depth */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/90 via-black-900/80 to-black/90 z-0" />

      {/* Page content */}
      <div className="relative z-10 min-h-screen">
        {children}

        {/* Optional brand tag (desktop only) */}
        {showApp && !isMobile && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 0.8, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            whileHover={{ opacity: 1 }}
            className="fixed top-[200px] left-6 z-30 pointer-events-none transition-opacity duration-200"
          >
            <div className="text-white leading-tight tracking-wide">
              <p className="text-sm font-borg">F.a.S.</p>
              <p className="text-primary font-ethno-italic engine-pulse text-sm">MOTORSPORTS</p>
            </div>
          </motion.div>
        )}

        {/* Optional mobile bottom nav */}
        {showApp && isMobile && (
          <motion.nav
            className="mobile-bottom-nav"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-around items-center py-2 px-4 h-16">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeSection === item.id ||
                  (item.id === 'home' && ['home', 'hero', 'trx'].includes(activeSection));
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`flex flex-col items-center justify-center min-w-0 flex-1 mobile-touch-target transition-colors duration-200 ${isActive ? 'text-primary' : 'text-white/60'}`}
                    whileTap={{ scale: 0.95 }}
                    animate={{ scale: isActive ? 1.1 : 1, color: isActive ? '#d11219' : '#d1d0d0' }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon
                      className={`w-5 h-5 mb-1 ${isActive ? 'text-primary' : 'text-white/60'}`}
                    />
                    <span
                      className={`text-xs font-ethno ${isActive ? 'text-primary' : 'text-white/60'}`}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div
                        className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
                        layoutId="activeIndicator"
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </div>
    </div>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppShell>
      <Component {...pageProps} />
    </AppShell>
  );
}

export default MyApp;
