import { Separator } from '@/components/ui/separator';
import { Mail, MapPin, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

// Route helpers for footer links
const ROUTE_BASE: Record<string, string> = {
  PRODUCTS: '/products',
  SERVICES: '/services',
  COMPANY: '/company',
  SUPPORT: '/support'
};

function slugify(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function routeFor(category: string, label: string) {
  const base = ROUTE_BASE[category] || '/';
  // opinionated remaps for common pages
  if (category === 'COMPANY') {
    if (/about/i.test(label)) return '/about';
    if (/careers/i.test(label)) return '/careers';
  }
  if (category === 'SUPPORT') {
    if (/warranty/i.test(label)) return '/support/warranty';
    if (/installation/i.test(label)) return '/support/install-guides';
    if (/technical/i.test(label)) return '/support/tech';
    if (/performance data/i.test(label)) return '/support/performance-data';
  }
  return `${base}/${slugify(label)}`;
}

export function Footer() {
  const footerLinks = {
    PRODUCTS: ['Supercharger Snouts', 'Supercharger Lids', 'Pulley Systems', 'Custom Builds'],
    SERVICES: ['Custom Engineering', 'CNC Machining', 'Performance Tuning', 'Racing Consulting'],
    COMPANY: ['About F.A.S.', 'Racing Heritage', 'Quality Standards', 'Careers'],
    SUPPORT: ['Installation Guides', 'Technical Support', 'Warranty Info', 'Performance Data']
  };

  const socialLinks = [
    { name: 'Instagram', href: 'https://instagram.com/fas_moto', handle: '@fas_moto' },
    { name: 'Facebook', href: 'https://facebook.com/fasmotorsports', handle: 'F.A.S. Motorsports' }
  ];

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black border-t border-gray-800 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 asphalt-texture opacity-30"></div>
      <div className="absolute inset-0 tire-tracks opacity-20"></div>

      <div className="container mx-auto px-4 lg:px-6 py-16 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              className="flex items-center space-x-4 group cursor-pointer"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-16 h-16 flex items-center justify-center">
                <img
                  src="/images/faslogochroma.png"
                  alt="F.A.S. Motorsports"
                  className="w-14 h-14 object-contain drop-shadow-lg"
                />
              </div>
              <div>
                <span className="text-2xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent block font-borg">
                  F.a.S. MOTORSPORTS
                </span>
                <span className="text-sm text-primary font-bold tracking-widest font-ethno">
                  FAST • AGGRESSIVE • SUPERIOR
                </span>
              </div>
            </motion.div>

            <p className="text-graylight max-w-md leading-relaxed font-kwajong">
              Precision-engineered supercharger components and custom modifications for the ultimate
              in automotive performance. Racing heritage since 2000.
            </p>

            <div className="font-borg text-accent text-xs tracking-widest">
              — CHAMPIONSHIP HERITAGE • PROVEN PERFORMANCE —
            </div>

            {/* Quick Contact */}
            <div className="space-y-3">
              <a
                href="/contact#location"
                className="flex items-center space-x-3 text-graylight hover:text-white transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium font-kwajong">
                  Punta Gorda, FL - F.A.S. Motorsports
                </span>
              </a>
              <a
                href="#contact"
                className="flex items-center space-x-3 text-graylight hover:text-white transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium font-kwajong">+1 (239) 200-9012</span>
              </a>
              <a
                href="mailto:support@fasmotorsports.com"
                className="flex items-center space-x-3 text-graylight hover:text-white transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium font-kwajong">support@fasmotorsports.com</span>
              </a>
            </div>

            {/* Social Links */}
            <div className="flex space-x-6">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  className="text-gray-400 hover:text-primary transition-colors font-medium text-sm group"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-1">
                    <div className="font-bold font-ethno">{social.name}</div>
                    <div className="text-xs text-gray-500 font-kwajong">{social.handle}</div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <motion.div
              key={category}
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h4 className="font-black text-white tracking-widest text-sm border-l-4 border-primary pl-3 font-ethno">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link, linkIndex) => (
                  <motion.li
                    key={link}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: categoryIndex * 0.1 + linkIndex * 0.05, duration: 0.4 }}
                    viewport={{ once: true }}
                  >
                    <a
                      href={routeFor(category, link)}
                      className="text-gray-400 hover:text-white transition-all duration-300 text-sm font-medium group flex items-center space-x-2 font-kwajong"
                    >
                      <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                      <span className="group-hover:translate-x-1 transition-transform duration-300">
                        {link}
                      </span>
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <Separator className="my-12 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

        <motion.div
          className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-8">
            <p className="text-gray-400 text-sm font-medium font-kwajong">
              © 2024 F.A.S. Motorsports. All rights reserved.
            </p>
            <p className="text-primary text-sm font-bold font-ethno">
              BUILT FAST. ENGINEERED AGGRESSIVE. PROVEN SUPERIOR.
            </p>
          </div>

          <div className="flex space-x-8 text-sm">
            <a
              href="/privacy"
              className="text-gray-400 hover:text-white transition-colors font-medium font-kwajong"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="text-gray-400 hover:text-white transition-colors font-medium font-kwajong"
            >
              Terms of Service
            </a>
            <a
              href="/racing-terms"
              className="text-gray-400 hover:text-white transition-colors font-medium font-kwajong"
            >
              Racing Terms
            </a>
          </div>
        </motion.div>

        {/* Performance Badge */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-full px-8 py-3 industrial-card">
            <img
              src="/images/faslogochroma.png"
              alt="F.A.S. Logo"
              className="w-6 h-6 object-contain"
            />
            <span className="text-sm font-bold text-graylight tracking-widest font-ethno">
              CHAMPIONSHIP WINNING PERFORMANCE SINCE 2004
            </span>
          </div>
        </motion.div>

        <motion.div
          className="mt-6 text-center font-borg text-accent text-xs tracking-widest"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
        >
          — WHERE SPEED MEETS PRECISION • WHERE DREAMS BECOME HORSEPOWER —
        </motion.div>
      </div>

      {/* Racing stripe at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-white to-primary"></div>
    </footer>
  );
}
