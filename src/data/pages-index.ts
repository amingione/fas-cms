export type SitePage = {
  title: string;
  path: string;
  keywords?: string[];
  description?: string;
};

export const SITE_PAGES: SitePage[] = [
  { title: 'Home', path: '/', keywords: ['home', 'index', 'fas'] },
  { title: 'Shop', path: '/shop', keywords: ['products', 'store'] },
  { title: 'About', path: '/about', keywords: ['company', 'team'] },
  { title: 'Contact', path: '/contact', keywords: ['email', 'support'] },
  { title: 'FAQ', path: '/faq', keywords: ['questions', 'help'] },
  { title: 'Warranty', path: '/warranty', keywords: ['coverage', 'policy'] },
  {
    title: 'Returns & Refunds',
    path: '/returnRefundPolicy',
    keywords: ['returns', 'refunds', 'policy']
  },
  { title: 'Privacy Policy', path: '/privacypolicy', keywords: ['privacy', 'policy'] },
  { title: 'Terms and Conditions', path: '/termsandconditions', keywords: ['terms', 'conditions'] },
  { title: 'Power Packages', path: '/packages/powerPackages', keywords: ['packages', 'performance'] },
  { title: 'Services', path: '/services/Services', keywords: ['service', 'install', 'fabrication'] },
  { title: 'Porting', path: '/services/porting', keywords: ['porting', 'snout', 'supercharger'] },
  { title: 'IGLA', path: '/services/igla', keywords: ['security', 'anti-theft', 'igla'] },
  { title: 'Schedule Install', path: '/schedule', keywords: ['schedule', 'install', 'booking'] },
  { title: 'Core Exchange', path: '/services/coreExchange', keywords: ['core', 'exchange'] },
  { title: 'Truck Packages', path: '/packages/truckPackages', keywords: ['truck', 'packages'] },
  { title: 'Search', path: '/search', keywords: ['search'] }
];
