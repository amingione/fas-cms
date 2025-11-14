import moment from 'moment/moment';

function safeSetLocale(locale: string) {
  try {
    moment.locale(locale);
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[moment-shim] Failed to set moment locale', { locale, error });
    }
  }
}

// Ensure we have at least the built-in English locale active immediately.
safeSetLocale('en');

// Attempt to preload the richer "en" locale data bundled with moment.
void (async () => {
  try {
    await import('moment/locale/en');
    safeSetLocale('en');
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[moment-shim] Failed to preload moment locale "en". Falling back to default.', error);
    }
    // Locale is already set to 'en' above, so nothing else to do.
  }
})();

export default moment;
