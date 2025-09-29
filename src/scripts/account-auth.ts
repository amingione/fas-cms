// src/scripts/account-auth.ts
// Lightweight account gate that relies solely on the fas-auth shim (session-backed auth).

declare global {
  interface Window {
    fasAuth?: {
      isAuthenticated: () => Promise<boolean>;
      getSession: () => Promise<{ user?: { id: string; email?: string; roles?: string[] } } | null>;
      loginTo: (returnTo: string) => Promise<void>;
      login: (returnTo?: string) => Promise<void>;
      logout: (returnTo?: string) => Promise<void>;
    };
  }
}

const root = document.getElementById('account-view');

const buttonGroup = `
  <div class="relative flex gap-4">
    <button id="login" class="relative px-4 py-2 bg-primary text-accent font-ethno">Log in</button>
    <button id="signup" class="relative px-4 py-2 border border-white/30 font-ethno">Sign up</button>
  </div>`;

function show(html: string) {
  if (!root) return;
  root.innerHTML = html;
}

async function ensureFasAuth(): Promise<NonNullable<typeof window.fasAuth> | null> {
  if (window.fasAuth) return window.fasAuth;
  // Wait a tick in case fas-auth.js has not run yet
  await new Promise((resolve) => setTimeout(resolve, 100));
  return window.fasAuth || null;
}

function bindLoginButtons(fas: NonNullable<typeof window.fasAuth>, returnTo: string) {
  const handler = () => fas.loginTo(returnTo);
  document.getElementById('login')?.addEventListener('click', handler);
  document.getElementById('signup')?.addEventListener('click', handler);
}

(async () => {
  if (!root) return;
  console.log('🚀 account page script (fas-auth) loaded');

  const fas = await ensureFasAuth();
  if (!fas) {
    show(`
      <h1 class="text-2xl mb-4 font-borg text-primary">Account</h1>
      <p class="mb-4">Authentication helper failed to load. Please refresh the page.</p>
      ${buttonGroup}
    `);
    bindLoginButtons({
      loginTo: async () => window.location.assign('/account'),
      login: async () => window.location.assign('/account'),
      logout: async () => {},
      isAuthenticated: async () => false,
      getSession: async () => null
    } as any, '/account');
    return;
  }

  // Handle explicit logout requests (?logout=1 or ?action=logout)
  try {
    const url = new URL(window.location.href);
    const wantsLogout =
      url.pathname === '/account' &&
      (url.searchParams.get('logout') === '1' || url.searchParams.get('action') === 'logout');
    if (wantsLogout) {
      await fas.logout(window.location.origin + '/account');
      return;
    }
  } catch (err) {
    console.warn('[account-auth] logout detection failed', err);
  }

  let session = null;
  try {
    session = await fas.getSession();
  } catch (err) {
    console.warn('[account-auth] session lookup failed', err);
  }

  const authed = !!session?.user;

  if (!authed) {
    show(`
      <h1 class="text-2xl mb-4 font-borg text-primary">Account</h1>
      <p class="mb-6">Log in or create an account to access your dashboard.</p>
      ${buttonGroup}
    `);
    bindLoginButtons(fas, '/dashboard');
    return;
  }

  try {
    if (session?.user?.email) {
      localStorage.setItem('customerEmail', session.user.email);
    }
  } catch {}

  // Honor pending return cookie set by protected routes
  try {
    const match = /(?:^|;\s*)fas_return_to=([^;]+)/.exec(document.cookie || '');
    const pending = match && match[1] ? decodeURIComponent(match[1]) : '';
    if (pending && pending.startsWith('/')) {
      document.cookie = 'fas_return_to=; Path=/; Max-Age=0; SameSite=Lax';
      window.location.assign(pending);
      return;
    }
  } catch (err) {
    console.warn('[account-auth] failed to apply fas_return_to cookie', err);
  }

  const name = session?.user?.email || session?.user?.id || 'there';
  show(`
    <p class="mb-6">Hello, <span class="text-red-500">${name}</span></p>
    <div class="flex items-center gap-4">
      <a href="/dashboard" class="underline">My Account →</a>
      <button id="logout" class="px-3 py-1.5 border border-white/20 rounded">Sign out</button>
    </div>
  `);

  document.getElementById('logout')?.addEventListener('click', () => fas.logout(window.location.origin + '/account'));
})();
