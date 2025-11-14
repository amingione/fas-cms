declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __fasAnalyticsHooked?: boolean;
  }
}

const globalScope: any = typeof globalThis !== 'undefined' ? globalThis : window;

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!globalScope.__fasAnalyticsHooked) {
    globalScope.__fasAnalyticsHooked = true;

    type QueuedEvent = {
      name: string;
      params?: Record<string, unknown>;
    };

    const queuedEvents: QueuedEvent[] = [];

    const sendToAnalytics = (name: string, params: Record<string, unknown> = {}) => {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
        return;
      }
      queuedEvents.push({ name, params });
    };

    const flushQueue = () => {
      if (typeof window.gtag !== 'function') return;
      while (queuedEvents.length > 0) {
        const entry = queuedEvents.shift();
        if (!entry) continue;
        window.gtag('event', entry.name, entry.params ?? {});
      }
    };

    document.addEventListener('gtag:loaded', flushQueue);

    if (typeof window.gtag === 'function') {
      flushQueue();
    } else {
      const queueInterval = window.setInterval(() => {
        if (typeof window.gtag === 'function') {
          window.clearInterval(queueInterval);
          flushQueue();
        }
      }, 500);
    }

    const sanitizeParams = (input: Record<string, unknown>) => {
      return Object.fromEntries(
        Object.entries(input).filter(([, value]) =>
          value !== undefined && value !== null && value !== ''
        )
      );
    };

    const triggeredOnce = new WeakMap<Element, Set<string>>();

    const markTriggered = (element: Element, eventName: string) => {
      const existing = triggeredOnce.get(element);
      if (existing) {
        existing.add(eventName);
      } else {
        triggeredOnce.set(element, new Set([eventName]));
      }
    };

    const hasTriggered = (element: Element, eventName: string) => {
      const set = triggeredOnce.get(element);
      return set ? set.has(eventName) : false;
    };

    const parseValue = (raw: string | undefined) => {
      if (!raw) return undefined;
      const trimmed = raw.trim();
      if (!trimmed) return undefined;
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) return numeric;
      return trimmed;
    };

    const parseParams = (element: HTMLElement) => {
      const params: Record<string, unknown> = {};
      const { dataset } = element;

      if (dataset.analyticsCategory) {
        params.event_category = dataset.analyticsCategory;
      }
      if (dataset.analyticsLabel) {
        params.event_label = dataset.analyticsLabel;
      }
      if (dataset.analyticsValue) {
        const value = parseValue(dataset.analyticsValue);
        if (value !== undefined) {
          params.value = value;
        }
      }

      if (dataset.analyticsParams) {
        try {
          const parsed = JSON.parse(dataset.analyticsParams);
          if (parsed && typeof parsed === 'object') {
            Object.assign(params, parsed as Record<string, unknown>);
          }
        } catch (error) {
          console.warn('[analytics] Failed to parse data-analytics-params payload', error);
        }
      }

      return sanitizeParams(params);
    };

    document.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const actionable = target.closest('[data-analytics-event]') as HTMLElement | null;
        if (!actionable) return;

        const eventName = actionable.dataset.analyticsEvent?.trim();
        if (!eventName) return;

        const onceFlag = actionable.dataset.analyticsOnce;
        const shouldFireOnce = onceFlag === 'true' || onceFlag === '1' || onceFlag === 'yes';
        if (shouldFireOnce && hasTriggered(actionable, eventName)) {
          return;
        }

        const params = parseParams(actionable);
        sendToAnalytics(eventName, params);

        if (shouldFireOnce) {
          markTriggered(actionable, eventName);
        }
      },
      { capture: true }
    );

    const SCROLL_THRESHOLDS = [25, 50, 75, 90, 100];
    const reachedThresholds = new Set<number>();
    let ticking = false;

    const evaluateScrollDepth = () => {
      ticking = false;
      const doc = document.documentElement;
      const body = document.body;
      const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
      const viewportHeight = window.innerHeight || doc.clientHeight;
      const scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight);
      const maxScroll = scrollHeight - viewportHeight;

      const percent = maxScroll <= 0 ? 100 : Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));

      for (const threshold of SCROLL_THRESHOLDS) {
        if (percent >= threshold && !reachedThresholds.has(threshold)) {
          reachedThresholds.add(threshold);
          sendToAnalytics('scroll_depth', {
            event_category: 'engagement',
            event_label: `${threshold}%`,
            value: threshold,
            scroll_percentage: threshold
          });
        }
      }
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(evaluateScrollDepth);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('load', evaluateScrollDepth, { once: true });
    evaluateScrollDepth();
  }
}

export {};
