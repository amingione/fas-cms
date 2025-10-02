const VIEW_KEYS = ['dashboard', 'orders', 'quotes', 'invoices', 'appointments', 'profile', 'details'] as const;
type ViewKey = (typeof VIEW_KEYS)[number];

const viewSet = new Set<ViewKey>(VIEW_KEYS);
let currentView: ViewKey = 'dashboard';
let userEmail = '';
let defaultName = 'Guest';
let loadToken = 0;

const AUTH_TIMEOUT = 8000;

function getContainers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-dash-content]'));
}

function setContent(html: string) {
  getContainers().forEach((el) => {
    el.innerHTML = html;
  });
}

function setName(name: string) {
  const safe = name || defaultName;
  document.querySelectorAll<HTMLElement>('#customer-name, #customer-name-mobile').forEach((el) => {
    el.textContent = safe;
  });
}

function highlightNav(view: ViewKey) {
  document.querySelectorAll<HTMLAnchorElement>('.js-view').forEach((link) => {
    const target = link.dataset.view?.toLowerCase();
    const isActive = target === view || (view === 'details' && target === 'profile');
    link.classList.toggle('bg-white/15', isActive);
    link.classList.toggle('text-primary', isActive);
  });
  const select = document.getElementById('mobile-account-select') as HTMLSelectElement | null;
  if (select) {
    const normalized = view === 'profile' ? 'details' : view;
    if (viewSet.has(normalized as ViewKey)) {
      select.value = normalized;
    }
  }
}

function updateHash(view: ViewKey) {
  const targetHash = view === 'dashboard' ? '' : `#${view}`;
  const desired = `${window.location.pathname}${window.location.search}${targetHash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (desired !== current) {
    history.replaceState(null, '', desired);
  }
}

function viewFromHash(): ViewKey {
  const value = window.location.hash.replace('#', '').toLowerCase();
  if (viewSet.has(value as ViewKey)) {
    return value as ViewKey;
  }
  if (value === 'account' || value === 'details') {
    return 'details';
  }
  return 'dashboard';
}

function ensureView(value?: string | null): ViewKey {
  if (!value) return 'dashboard';
  const lowered = value.toLowerCase();
  if (viewSet.has(lowered as ViewKey)) {
    return lowered as ViewKey;
  }
  if (lowered === 'account') return 'details';
  return 'dashboard';
}

function setLoading(message = 'Loading…') {
  setContent(`<p class="opacity-80">${message}</p>`);
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function formatMoney(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  const num = Number(value);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return num.toFixed(2);
  }
  return '';
}

async function waitForFasAuth(timeoutMs = AUTH_TIMEOUT): Promise<any | null> {
  if (typeof window === 'undefined') return null;
  if ((window as any).fasAuth) return (window as any).fasAuth;

  return await new Promise<any | null>((resolve) => {
    const start = Date.now();
    const poll = () => {
      const fas = (window as any).fasAuth;
      if (fas) {
        resolve(fas);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}

async function requestJSON<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(input, { credentials: 'include', ...init });
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchOrders(): Promise<any[]> {
  if (!userEmail) return [];
  return await requestJSON<any[]>(`/api/get-user-order?email=${encodeURIComponent(userEmail)}`);
}

async function fetchQuotes(): Promise<any[]> {
  if (!userEmail) return [];
  return await requestJSON<any[]>(`/api/get-user-quotes?email=${encodeURIComponent(userEmail)}`);
}

async function fetchInvoices(): Promise<any[]> {
  if (!userEmail) return [];
  return await requestJSON<any[]>(`/api/get-user-invoices?email=${encodeURIComponent(userEmail)}`);
}

async function fetchAppointments(): Promise<any[]> {
  if (!userEmail) return [];
  return await requestJSON<any[]>(`/api/get-user-appointments?email=${encodeURIComponent(userEmail)}`);
}

async function fetchProfile(): Promise<any> {
  if (!userEmail) return null;
  return await requestJSON<any>(
    '/api/customer/get',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    }
  );
}

function renderOrdersHtml(items: any[]): string {
  if (!items.length) {
    return '<p class="opacity-80">No orders found.</p>';
  }

  const list = items
    .map((order) => {
      const id = escapeHtml(order.orderNumber ?? order._id ?? '');
      const status = escapeHtml(order.status ?? '');
      const date = order.orderDate || order.createdAt || order._createdAt;
      const formattedDate = date ? new Date(date).toLocaleDateString() : '';
      const tracking = escapeHtml(order.trackingNumber ?? '');
      const total = formatMoney(order.total ?? order.totalAmount);
      return `
        <div class="border border-white/20 rounded p-4 bg-black/40">
          <div class="flex justify-between"><div class="font-semibold">${id}</div><div class="opacity-70">${status}</div></div>
          <div class="text-xs opacity-70 mt-1">${escapeHtml(formattedDate)}</div>
          ${tracking ? `<div class="mt-1 text-xs opacity-70">Tracking: ${tracking}</div>` : ''}
          <div class="mt-2">${total ? `Total: $${total}` : ''}</div>
        </div>
      `;
    })
    .join('');

  return `<h3 class="font-ethno text-lg mb-4">Orders</h3><div class="space-y-3">${list}</div>`;
}

function renderQuotesHtml(items: any[]): string {
  if (!items.length) {
    return '<p class="opacity-80">No quotes found.</p>';
  }
  const list = items
    .map((quote) => {
      const id = escapeHtml(quote._id ?? '');
      const status = escapeHtml(quote.status ?? '');
      const date = quote._createdAt ? new Date(quote._createdAt).toLocaleDateString() : '';
      const total = formatMoney(quote.total);
      return `
        <div class="border border-white/20 rounded p-4 bg-black/40">
          <div class="flex justify-between"><div class="font-semibold">${id}</div><div class="opacity-70">${status}</div></div>
          <div class="text-xs opacity-70 mt-1">${escapeHtml(date)}</div>
          <div class="mt-2">${total ? `Total: $${total}` : ''}</div>
        </div>
      `;
    })
    .join('');
  return `<h3 class="font-ethno text-lg mb-4">Quotes</h3><div class="space-y-3">${list}</div>`;
}

function renderInvoicesHtml(items: any[]): string {
  if (!items.length) {
    return '<p class="opacity-80">No invoices found.</p>';
  }
  const list = items
    .map((invoice) => {
      const id = escapeHtml(invoice._id ?? '');
      const status = escapeHtml(invoice.status ?? '');
      const date = invoice._createdAt ? new Date(invoice._createdAt).toLocaleDateString() : '';
      const total = formatMoney(invoice.total ?? invoice.totalAmount);
      return `
        <div class="border border-white/20 rounded p-4 bg-black/40">
          <div class="flex justify-between"><div class="font-semibold">${id}</div><div class="opacity-70">${status}</div></div>
          <div class="text-xs opacity-70 mt-1">${escapeHtml(date)}</div>
          <div class="mt-2">${total ? `Total: $${total}` : ''}</div>
        </div>
      `;
    })
    .join('');
  return `<h3 class="font-ethno text-lg mb-4">Invoices</h3><div class="space-y-3">${list}</div>`;
}

function renderAppointmentsHtml(items: any[]): string {
  if (!items.length) {
    return '<p class="opacity-80">No appointments found.</p>';
  }
  const list = items
    .map((appt) => {
      const id = escapeHtml(appt._id ?? '');
      const status = escapeHtml(appt.status ?? '');
      const scheduledAt = appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleString() : '';
      const location = escapeHtml(appt.location ?? '');
      return `
        <div class="border border-white/20 rounded p-4 bg-black/40">
          <div class="flex justify-between"><div class="font-semibold">${id}</div><div class="opacity-70">${status}</div></div>
          <div class="text-xs opacity-70 mt-1">${escapeHtml(scheduledAt)}</div>
          ${location ? `<div class="mt-1 text-xs opacity-70">${location}</div>` : ''}
        </div>
      `;
    })
    .join('');
  return `<h3 class="font-ethno text-lg mb-4">Appointments</h3><div class="space-y-3">${list}</div>`;
}

function renderProfileHtml(profile: any): string {
  if (!profile) {
    return '<p class="opacity-80">Unable to load profile.</p>';
  }
  const addressParts = [profile.address1, profile.address2, profile.city, profile.state, profile.postalCode]
    .filter(Boolean)
    .map(escapeHtml)
    .join(', ');
  return `
    <h3 class="font-ethno text-lg mb-3">My Profile</h3>
    <div class="grid sm:grid-cols-2 gap-3 text-sm">
      <div><div class="opacity-70">First Name</div><div class="font-semibold">${escapeHtml(profile.firstName)}</div></div>
      <div><div class="opacity-70">Last Name</div><div class="font-semibold">${escapeHtml(profile.lastName)}</div></div>
      <div><div class="opacity-70">Email</div><div class="font-semibold">${escapeHtml(profile.email ?? userEmail)}</div></div>
      <div><div class="opacity-70">Phone</div><div class="font-semibold">${escapeHtml(profile.phone)}</div></div>
      <div class="sm:col-span-2"><div class="opacity-70">Address</div><div class="font-semibold">${addressParts}</div></div>
    </div>
    <p class="mt-5 text-xs opacity-70">Need changes? <a class="underline js-view" data-view="details" href="#details">Edit profile</a>.</p>
  `;
}

async function renderDashboardHtml(): Promise<string> {
  try {
    const profile = await fetchProfile().catch(() => null);
    const preferred = profile?.firstName && profile?.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : defaultName;
    if (preferred) setName(preferred);
    return `
      <h3 class="font-ethno text-base mb-3">Dashboard</h3>
      <div class="font-sans space-y-2 opacity-90 text-base">
        <p>Hello, <strong>${escapeHtml(preferred)}</strong>.</p>
        <p>From your account dashboard you can view your <a href="#orders" data-view="orders" class="underline js-view">recent orders</a>, manage your <a href="#details" data-view="details" class="underline js-view">account details</a>, and more.</p>
      </div>
    `;
  } catch (err) {
    console.error('[dashboard] dashboard view failed', err);
    return '<p class="opacity-80">Unable to load dashboard data right now.</p>';
  }
}

const viewRenderers: Record<ViewKey, () => Promise<string>> = {
  dashboard: renderDashboardHtml,
  orders: async () => renderOrdersHtml(await fetchOrders().catch(() => [])),
  quotes: async () => renderQuotesHtml(await fetchQuotes().catch(() => [])),
  invoices: async () => renderInvoicesHtml(await fetchInvoices().catch(() => [])),
  appointments: async () => renderAppointmentsHtml(await fetchAppointments().catch(() => [])),
  profile: async () => renderProfileHtml(await fetchProfile().catch(() => null)),
  details: async () => renderProfileHtml(await fetchProfile().catch(() => null))
};

async function loadView(target: ViewKey) {
  const token = ++loadToken;
  currentView = target;
  updateHash(target);
  highlightNav(target);
  setLoading();
  try {
    const html = await viewRenderers[target]();
    if (token === loadToken) {
      setContent(html);
    }
  } catch (err) {
    console.error('[dashboard] failed to load view', target, err);
    if (token === loadToken) {
      setContent('<p class="opacity-80">Something went wrong loading this view.</p>');
    }
  }
}

async function refreshCounts() {
  const updates: Array<[string, () => Promise<number>]> = [
    ['orders', async () => (await fetchOrders().catch(() => [])).length],
    ['quotes', async () => (await fetchQuotes().catch(() => [])).length],
    ['invoices', async () => (await fetchInvoices().catch(() => [])).length],
    ['appts', async () => (await fetchAppointments().catch(() => [])).length]
  ];
  await Promise.all(
    updates.map(async ([id, getter]) => {
      try {
        const count = await getter();
        const desktop = document.getElementById(`${id}-count`);
        const mobile = document.getElementById(`${id}-count-mobile`);
        if (desktop) desktop.textContent = String(count);
        if (mobile) mobile.textContent = String(count);
      } catch (err) {
        console.error('[dashboard] count fetch failed for', id, err);
      }
    })
  );
}

function bindNavigation() {
  document.querySelectorAll<HTMLAnchorElement>('.js-view').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      loadView(ensureView(link.dataset.view));
    });
  });

  const select = document.getElementById('mobile-account-select') as HTMLSelectElement | null;
  if (select) {
    select.addEventListener('change', () => {
      loadView(ensureView(select.value));
    });
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.js-view[data-view]') : null;
    if (target) {
      event.preventDefault();
      loadView(ensureView(target.getAttribute('data-view')));
    }
  });
}

async function initDashboard() {
  try {
    const fas = await waitForFasAuth();
    if (!fas) {
      setContent('<p class="opacity-80">Account services are offline right now. Please try again soon.</p>');
      return;
    }

    const authed = await fas.isAuthenticated?.();
    if (!authed) {
      setContent('<p class="opacity-80">You\'re not signed in. <a class="underline" href="/account">Log in</a>.</p>');
      return;
    }

    const session = await fas.getSession?.();
    userEmail = (session?.user?.email as string) || '';
    if (!userEmail) {
      try {
        userEmail = localStorage.getItem('customerEmail') || '';
      } catch (error) {
        void error;
      }
    }
    userEmail = userEmail.trim().toLowerCase();

    defaultName =
      (session?.user?.given_name as string) ||
      (session?.user?.name as string) ||
      userEmail ||
      defaultName;
    setName(defaultName);

    bindNavigation();

    window.addEventListener('hashchange', () => {
      loadView(viewFromHash());
    });

    refreshCounts();
    await loadView(viewFromHash());
  } catch (err) {
    console.error('[dashboard] init failed', err);
    setContent('<p class="opacity-80">Unable to load dashboard right now.</p>');
  }
}

void initDashboard();

function logout() {
  try {
    localStorage.clear();
  } catch (error) {
    void error;
  }
  try {
    const fas = (window as any).fasAuth;
    if (fas && typeof fas.logout === 'function') {
      fas.logout(window.location.origin + '/account');
      return;
    }
  } catch (error) {
    void error;
  }
  window.location.href = '/api/auth/logout';
}

document.querySelectorAll('.logout-link').forEach((el) => {
  el.addEventListener('click', (event) => {
    event.preventDefault();
    logout();
  });
});
