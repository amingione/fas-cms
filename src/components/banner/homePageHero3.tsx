import { motion } from 'framer-motion';

type Props = {
  bgUrl?: string;
  titleTop?: string;
  titleEmphasis?: string;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export default function FASHeroUltra({
  bgUrl = '/images/backgrounds/hero/fas-hero-bg.webp',
  titleTop = 'POWER UP YOUR RIDE',
  titleEmphasis = 'UNLEASH PERFORMANCE',
  subtitle = 'Premium performance upgrades. Billet precision. Real builds. Real results.',
  primaryCta = { label: 'Shop Performance', href: '/shop' },
  secondaryCta = { label: 'View Packages', href: '/packages' }
}: Props) {
  return (
    <section className="fas-hero-ultra" aria-label="FAS Hero">
      <div className="fas-hero-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
      <div className="fas-hero-vignette" />
      <div className="fas-hero-grid" />

      {/* “instrument glow” layer */}
      <div className="fas-hero-glow" />

      <div className="fas-hero-wrap">
        <motion.div
          className="fas-hero-left"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="fas-hero-chip">
            <span className="dot" />
            NEW DROPS • BILLET • CUSTOM FAB
          </div>

          <h1 className="fas-hero-h1">
            <span className="top">{titleTop}</span>
            <span className="main">{titleEmphasis}</span>
          </h1>

          <p className="fas-hero-p">{subtitle}</p>

          <div className="fas-hero-cta">
            <a className="btn btn-primary" href={primaryCta.href}>
              {primaryCta.label}
            </a>
            <a className="btn btn-ghost" href={secondaryCta.href}>
              {secondaryCta.label}
            </a>
          </div>

          <div className="fas-hero-metrics">
            <div className="metric">
              <div className="k">800–1500+</div>
              <div className="v">WHP Builds</div>
            </div>
            <div className="metric">
              <div className="k">Billet</div>
              <div className="v">Machined Precision</div>
            </div>
            <div className="metric">
              <div className="k">Fast</div>
              <div className="v">Ship + Support</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="fas-hero-right"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75 }}
        >
          <div className="fas-hero-card">
            <div className="card-top">
              <span className="badge">FEATURED</span>
              <span className="slash" />
              <span className="mini">Custom Packages + Parts</span>
            </div>

            <div className="card-mid">
              <div className="line" />
              <div className="spec">
                <span>Platforms</span>
                <b>Hellcat • TRX • Trackhawk</b>
              </div>
              <div className="spec">
                <span>Focus</span>
                <b>Boost • Airflow • Cooling</b>
              </div>
              <div className="spec">
                <span>Build Style</span>
                <b>Street • Track • Drag</b>
              </div>
            </div>

            <a className="card-link" href="/builds">
              See Build Gallery →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
