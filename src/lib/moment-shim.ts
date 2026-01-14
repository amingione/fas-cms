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

// Moment ships English in-core; avoid dynamic imports for a non-existent "en" locale file.

export default moment;
