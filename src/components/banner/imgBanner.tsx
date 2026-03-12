type BannerProps = {
  imageUrl: string;
  title?: string;
  title2?: string;
  subtitle?: string;
  height?: string; // e.g. "h-72", "h-[400px]", "min-h-[50vh]"
  children?: React.ReactNode;
};

export function Banner({
  imageUrl,
  title,
  title2,
  subtitle,
  height = 'h-72',
  children
}: BannerProps) {
  return (
    <section
      className={`relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] ${height} overflow-hidden`}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />

      {/* Optional overlay */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Content container pinned to your site max-width */}
      <div className="relative h-full flex items-center">
        <div className="mx-auto w-full max-w-6xl px-4">
          {title || subtitle ? (
            <div className="max-w-xl space-y-2">
              {title && (
                <h1 className="text-glow-primary text-black font-borg text-2xl md:text-4xl font-semibold">
                  {title}
                </h1>
              )}
              {title2 && (
                <h1 className="text-glow-primary text-black font-borg text-2xl md:text-4xl font-semibold">
                  {title2}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm md:text-base font-ethno-italic opacity-90">{subtitle}</p>
              )}
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </section>
  );
}
