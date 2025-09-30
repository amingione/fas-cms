// Uses window.fasAuth provided by /public/fas-auth.js

// Track the current view so we can re-render on breakpoint changes
let currentView: string = 'dashboard';

async function waitForFasAuth(timeoutMs = 8000) {
  if (typeof window === 'undefined') return null;
  if ((window as any).fasAuth) return (window as any).fasAuth;

  return await new Promise<any>((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      const fas = (window as any).fasAuth;
      if (fas) {
        resolve(fas);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error('fasAuth not available'));
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  }).catch((err) => {
    console.warn('[dashboard] waitForFasAuth failed:', err?.message || err);
    return null;
  });
}

function getDashContainers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-dash-content]'));
}

function withDashContainers(fn: (el: HTMLElement) => void) {
  const targets = getDashContainers();
  if (!targets.length) throw new Error('Dashboard content container not found');
  targets.forEach((el) => fn(el));
}

function writeDashContent(html: string) {
  try {
    withDashContainers((el) => {
      if (el.dataset) delete (el.dataset as any).state;
      el.innerHTML = html;
    });
  } catch {
    /* noop */
  }
}

function getVisibleDashContent() {
  const desktop = document.querySelector('[data-desktop-dash] [data-dash-content]') as HTMLElement | null;
  const mobile = document.querySelector('[data-mobile-dash] [data-dash-content]') as HTMLElement | null;
  if (window.matchMedia('(min-width: 640px)').matches && desktop) return desktop;
  return mobile ?? desktop ?? (() => {
    const all = getDashContainers();
    if (!all.length) throw new Error('Dashboard content container not found');
    return all[0];
  })();
}

function getNameEls() {
  return [
    document.getElementById('customer-name'),
    document.getElementById('customer-name-mobile')
  ].filter(Boolean) as HTMLElement[];
}

function setName(name: string) {
  const els = getNameEls();
  els.forEach((el) => (el.textContent = name || 'Guest'));
}

function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)) as Promise<T>
  ]);
}

// Highlight active nav item and sync mobile select
function setActiveNav(view?: string | null) {
  const v = (view || 'dashboard').toLowerCase();
  try {
    document.querySelectorAll<HTMLAnchorElement>('.js-view').forEach((a) => {
      const av = (a.getAttribute('data-view') || '').toLowerCase();
      const isActive = av === v || (v === 'details' && av === 'profile');
      a.classList.toggle('bg-white/15', isActive);
      a.classList.toggle('text-primary', isActive);
    });
  } catch {}
  try {
    const sel = document.getElementById('mobile-account-select') as HTMLSelectElement | null;
    if (sel) {
      const target = v === 'details' ? 'details' : (['orders','quotes','invoices','appointments','profile','dashboard'].includes(v) ? v : 'dashboard');
      sel.value = target;
    }
  } catch {}
}

(async () => {
  try {
    console.log('🚀 dashboard script loaded');

    // Removed pre-rendered login CTA to avoid flicker/duplication

    const fas = await waitForFasAuth();
    if (!fas) {
      writeDashContent(`
        <div class="space-y-3">
          <p class="opacity-90">Account services are offline right now.</p>
          <a id="dash-login" href="/account" class="inline-block px-4 py-2 bg-primary text-accent font-ethno rounded">Try again</a>
        </div>`);
      return;
    }
    (window as any)._getVisibleDashContent = getVisibleDashContent;
    (window as any)._setName = setName;
    console.log('✅ fas-auth ready');

    // Require login (with timeout & desktop-friendly fallback)
    let authed = false;
    try {
      authed = await withTimeout(fas?.isAuthenticated?.(), 4000);
    } catch {
      authed = false;
    }

    if (!authed) {
      writeDashContent(`
        <div class="space-y-3">
          <p class="opacity-90">You're not signed in.</p>
          <a id="dash-login" href="/account" class="inline-block px-4 py-2 bg-primary text-accent font-ethno rounded">Log in</a>
        </div>`);
      return;
    }

    // Authenticated path
    const session = await (fas?.getSession?.() || Promise.resolve(null));
    const email = (session?.user?.email as string) || '';
    if (email) {
      try {
        localStorage.setItem('customerEmail', email);
      } catch {}
    }

    const defaultName =
      (session as any)?.user?.given_name ||
      (session as any)?.user?.name ||
      email ||
      'Guest';
    try {
      localStorage.setItem('customerName', defaultName);
    } catch {}
    setName(defaultName);
    let retry = 0;
    const retryId = setInterval(() => {
      setName(defaultName);
      if (++retry > 10) clearInterval(retryId);
    }, 100);

    // Load enriched profile
    try {
      const res = await fetch('/api/customer/get', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        const data = await res.json();
        const fullName = [data?.firstName, data?.lastName].filter(Boolean).join(' ').trim();
        const preferred = fullName || data?.name || defaultName;
        setName(preferred);
        try {
          localStorage.setItem('customerName', preferred);
        } catch {}
        let r2 = 0;
        const r2id = setInterval(() => {
          setName(preferred);
          if (++r2 > 10) clearInterval(r2id);
        }, 100);
      }
    } catch {}

    function setCount(idDesktop: string, idMobile: string, n: number) {
      const d = document.getElementById(idDesktop);
      const m = document.getElementById(idMobile);
      if (d) d.textContent = String(n);
      if (m) m.textContent = String(n);
    }
    async function fetchCount(url: string, fallbackUrl?: string) {
      async function run(endpoint: string) {
        const res = await fetch(endpoint, { credentials: 'include' });
        if (!res.ok) throw new Error('bad status');
        const data = await res.json();
        if (Array.isArray(data)) return data.length;
        if (data && Array.isArray((data as any).items)) return (data as any).items.length;
        return 0;
      }

      try {
        return await run(url);
      } catch (err) {
        if (fallbackUrl) {
          try {
            return await run(fallbackUrl);
          } catch {}
        }
        return 0;
      }
    }

    if (email) {
      fetchCount(
        `/api/get-user-order?email=${encodeURIComponent(email)}`,
        '/api/get-user-order'
      ).then((n) =>
        setCount('orders-count', 'orders-count-mobile', n)
      );
      fetchCount(
        `/api/get-user-quotes?email=${encodeURIComponent(email)}`,
        '/api/get-user-quotes'
      ).then((n) =>
        setCount('quotes-count', 'quotes-count-mobile', n)
      );
      fetchCount(
        `/api/get-user-invoices?email=${encodeURIComponent(email)}`,
        '/api/get-user-invoices'
      ).then((n) =>
        setCount('invoices-count', 'invoices-count-mobile', n)
      );
      fetchCount(
        `/api/get-user-appointments?email=${encodeURIComponent(email)}`,
        '/api/get-user-appointments'
      ).then((n) =>
        setCount('appts-count', 'appts-count-mobile', n)
      );
    }

    const sel = document.getElementById('mobile-account-select') as HTMLSelectElement | null;
    if (sel)
      sel.addEventListener('change', () => {
        load(sel.value);
      });
    const setLoading = (msg = 'Loading...') => {
      const marker = `__loading_${Date.now()}__`;
      try {
        withDashContainers((el) => {
          el.dataset.state = marker;
          el.innerHTML = `<p class="opacity-80">${msg}</p>`;
        });
      } catch {}
      setTimeout(() => {
        try {
          withDashContainers((el) => {
            if (el.dataset.state === marker) {
              el.innerHTML = `<p class="opacity-80">Still loading your data...</p>`;
            }
          });
        } catch {}
      }, 6000);
    };
    const renderEmpty = (label: string) => {
      writeDashContent(`<p class="opacity-80">No ${label} found.</p>`);
    };

    async function fetchJSON(url: string, options: RequestInit = {}, ms = 5000) {
      return await Promise.race([
        fetch(url, options),
        new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
      ]).then(async (res) => {
        if (res && 'ok' in res && !res.ok) throw new Error('bad status');
        if (!res || !(res instanceof Response)) return {} as any;
        try {
          return await res.json();
        } catch {
          return {};
        }
      });
    }

    async function renderDashboard() {
      setLoading();
      try {
        const c = await fetchJSON(
          '/api/customer/get',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email })
          },
          5000
        ).catch(() => ({}));
        const name =
          [(c as any).firstName, (c as any).lastName].filter(Boolean).join(' ') || defaultName;
        writeDashContent(`
          <h3 class="font-ethno text-base mb-3">Dashboard</h3>
          <div class="font-sans space-y-2 opacity-90 text-base">
            <p>Hello, <strong>${name}</strong>.</p>
            <p class="text-base">From your account dashboard you can view your <a href="#" data-view="orders" class="underline js-view">recent orders</a>, manage your <a href="/dashboard" class="underline">account details</a>, and more.</p>
          </div>`);
      } catch {
        renderEmpty('dashboard');
      }
    }

    async function renderProfile() {
      setLoading();
      try {
        const c: any = await fetchJSON(
          '/api/customer/get',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email })
          },
          5000
        ).catch(() => null);
        if (!c) return renderEmpty('profile');
        const addr = [c.address1, c.address2, c.city, c.state, c.postalCode]
          .filter(Boolean)
          .join(', ');
        writeDashContent(`
          <h3 class="font-ethno text-lg mb-3">My Profile</h3>
          <div class="grid sm:grid-cols-2 gap-3 text-sm">
            <div><div class="opacity-70">First Name</div><div class="font-semibold">${c.firstName || ''}</div></div>
            <div><div class="opacity-70">Last Name</div><div class="font-semibold">${c.lastName || ''}</div></div>
            <div><div class="opacity-70">Email</div><div class="font-semibold">${c.email || email}</div></div>
            <div><div class="opacity-70">Phone</div><div class="font-semibold">${c.phone || ''}</div></div>
            <div class="sm:col-span-2"><div class="opacity-70">Address</div><div class="font-semibold">${addr}</div></div>
          </div>
          <p class="mt-5 text-xs opacity-70">Need changes? <a class="underline" href="/customerdashboard/customerProfile">Edit profile</a>.</p>
        `);
      } catch {
        renderEmpty('profile');
      }
    }

    async function renderOrders() {
      setLoading();
      try {
        const items: any[] = await fetchJSON(
          `/api/get-user-order?email=${encodeURIComponent(email)}`,
          {},
          5000
        ).catch(() => []);
        if (!Array.isArray(items) || !items.length) return renderEmpty('orders');
        writeDashContent(`
          <h3 class="font-ethno text-lg mb-4">Orders</h3>
          <div class="space-y-3">
            ${items
              .map(
                (o: any) => `
              <div class=\"border border-white/20 rounded p-4 bg-black/40\">
                <div class=\"flex justify-between\"><div class=\"font-semibold\">${o.orderNumber ?? o._id}</div><div class=\"opacity-70\">${o.status ?? ''}</div></div>
                <div class=\"text-xs opacity-70 mt-1\">${o.orderDate ? new Date(o.orderDate).toLocaleDateString() : ''}</div>
                ${o.trackingNumber ? `<div class=\\\"mt-1 text-xs opacity-70\\\">Tracking: ${o.trackingNumber}</div>` : ''}
                <div class=\"mt-2\">Total: $${o.total ?? ''}</div>
              </div>
            `
              )
              .join('')}
          </div>`);
      } catch {
        renderEmpty('orders');
      }
    }

    async function renderQuotes() {
      setLoading();
      try {
        const items: any[] = await fetchJSON(
          `/api/get-user-quotes?email=${encodeURIComponent(email)}`,
          {},
          5000
        ).catch(() => []);
        if (!Array.isArray(items) || !items.length) return renderEmpty('quotes');
        writeDashContent(`
          <h3 class="font-ethno text-lg mb-4">Quotes</h3>
          <div class="space-y-3">
            ${items
              .map(
                (q: any) => `
              <div class=\"border border-white/20 rounded p-4 bg-black/40\">
                <div class=\"flex justify-between\"><div class=\"font-semibold\">${q._id}</div><div class=\"opacity-70\">${q.status ?? ''}</div></div>
                <div class=\"text-xs opacity-70 mt-1\">${q._createdAt ? new Date(q._createdAt).toLocaleDateString() : ''}</div>
                <div class=\"mt-2\">Total: $${q.total ?? ''}</div>
              </div>
            `
              )
              .join('')}
          </div>`);
      } catch {
        renderEmpty('quotes');
      }
    }

    async function renderInvoices() {
      setLoading();
      try {
        const items: any[] = await fetchJSON(
          `/api/get-user-invoices?email=${encodeURIComponent(email)}`,
          {},
          5000
        ).catch(() => []);
        if (!Array.isArray(items) || !items.length) return renderEmpty('invoices');
        writeDashContent(`
          <h3 class="font-ethno text-lg mb-4">Invoices</h3>
          <div class="space-y-3">
            ${items
              .map(
                (inv: any) => `
              <div class=\"border border-white/20 rounded p-4 bg-black/40\">
                <div class=\"flex justify-between\"><div class=\"font-semibold\">${inv._id}</div><div class=\"opacity-70\">${inv.status ?? ''}</div></div>
                <div class=\"text-xs opacity-70 mt-1\">${inv._createdAt ? new Date(inv._createdAt).toLocaleDateString() : ''}</div>
                <div class=\"mt-2\">Total: $${inv.total ?? ''}</div>
              </div>
            `
              )
              .join('')}
          </div>`);
      } catch {
        renderEmpty('invoices');
      }
    }

    async function renderAppointments() {
      setLoading();
      try {
        const items: any[] = await fetchJSON(
          `/api/get-user-appointments?email=${encodeURIComponent(email)}`,
          {},
          5000
        ).catch(() => []);
        if (!Array.isArray(items) || !items.length) return renderEmpty('appointments');
        writeDashContent(`
          <h3 class="font-ethno text-lg mb-4">Appointments</h3>
          <div class="space-y-3">${items
            .map(
              (a: any) => `
            <div class=\"border border-white/20 rounded p-4 bg-black/40\">
              <div class=\"flex justify-between\"><div class=\"font-semibold\">${a._id}</div><div class=\"opacity-70\">${a.status ?? ''}</div></div>
              <div class=\"text-xs opacity-70 mt-1\">${a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : ''}</div>
              ${a.location ? `<div class=\\\"mt-1 text-xs opacity-70\\\">${a.location}</div>` : ''}
            </div>
          `
            )
            .join('')}</div>`);
      } catch {
        renderEmpty('appointments');
      }
    }

    const resolveView = (view?: string | null) => {
      const v = (view || '').toLowerCase();
      if (!v || v === 'dashboard') return 'dashboard';
      if (['orders', 'quotes', 'invoices', 'appointments', 'profile', 'details'].includes(v)) {
        return v === 'details' ? 'details' : v;
      }
      return 'dashboard';
    };

    const syncHashToView = (view: string) => {
      const targetHash = view === 'dashboard' ? '' : `#${view}`;
      const desired = `${window.location.pathname}${window.location.search}${targetHash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (current !== desired) {
        history.replaceState(null, '', desired);
      }
    };

    function load(view?: string | null) {
      currentView = resolveView(view);
      syncHashToView(currentView);
      setActiveNav(currentView);
      switch (currentView) {
        case 'orders':
          return renderOrders();
        case 'quotes':
          return renderQuotes();
        case 'invoices':
          return renderInvoices();
        case 'appointments':
          return renderAppointments();
        case 'profile':
        case 'details':
          return renderProfile();
        case 'dashboard':
        default:
          return renderDashboard();
      }
    }

    document.querySelectorAll('.js-view').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const view = (a as HTMLElement).getAttribute('data-view');
        load(view);
      });
    });

    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target.closest('.js-view') : null;
      if (target) {
        e.preventDefault();
        const v = (target as HTMLElement).getAttribute('data-view');
        load(v);
      }
    });

    document.addEventListener('change', (e) => {
      const sel = e.target instanceof HTMLSelectElement ? e.target : null;
      if (sel && sel.id === 'mobile-account-select') {
        load(sel.value);
      }
    });

    const currentHashView = resolveView(window.location.hash.replace('#', '') || null);
    load(currentHashView);

    window.addEventListener('hashchange', () => {
      const nextView = resolveView(window.location.hash.replace('#', '') || null);
      load(nextView);
    });
    setTimeout(() => {
      try {
        withDashContainers((el) => {
          const txt = (el.textContent || '').trim().toLowerCase();
          if (txt === 'loading...' || txt === 'loading') {
            el.innerHTML = `<p class="opacity-80">Still loading your data...</p>`;
          }
        });
      } catch {}
    }, 8000);

    try {
      const mq = window.matchMedia('(min-width: 640px)');
      const reRender = () => {
        load(currentView);
      };
      if (mq.addEventListener) mq.addEventListener('change', reRender);
      else if ((mq as any).addListener) (mq as any).addListener(reRender);
    } catch {}
  } catch (err) {
    console.error('Dashboard auth init failed', err);
    try {
      const c =
        typeof getVisibleDashContent === 'function'
          ? getVisibleDashContent()
          : ((document.getElementById('dash-content-desktop') ||
              document.getElementById('dash-content-mobile')) as HTMLElement | null);
      if (c) {
        c.innerHTML = `
          <div class="space-y-3">
            <p class="opacity-90">You're not signed in.</p>
            <a id="dash-login" href="/account" class="inline-block px-4 py-2 bg-primary text-accent font-ethno rounded">Log in</a>
          </div>`;
      }
    } catch {}
  }
})();

function logout() {
  try {
    localStorage.clear();
  } catch {}
  try {
    const fx: any = (window as any).fasAuth;
    if (fx && typeof fx.logout === 'function') {
      return fx.logout(location.origin + '/account');
    }
  } catch {}
  window.location.href = '/api/auth/logout';
}
document.querySelectorAll('.logout-link').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
});
