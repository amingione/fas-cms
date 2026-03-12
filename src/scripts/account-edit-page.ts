import { ensureFasAuthLoaded, getFallbackFasAuth } from './fas-auth-shared';

// Uses fas-auth session
const root = document.getElementById('account-edit');

(async () => {
  const fas = await ensureFasAuthLoaded();
  const authed = fas ? await fas.isAuthenticated() : false;
  if (!authed) {
    if (root) {
      root.innerHTML = `
        <h1 class="text-2xl mb-4 font-borg text-primary">Account</h1>
        <p class="mb-6">Log in or create an account to edit your profile.</p>
        <div class="flex gap-4">
          <button id="login" class="px-4 py-2 bg-primary text-accent font-ethno">Log in</button>
          <button id="signup" class="px-4 py-2 border border-white/30 font-ethno">Sign up</button>
        </div>
      `;
    }
    const fallback = getFallbackFasAuth();
    document.getElementById('login')?.addEventListener('click', (e) => {
      e.preventDefault();
      fallback.loginTo('/account');
    });
    document.getElementById('signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      fallback.loginTo('/account');
    });
    return;
  }

  const session = fas ? await fas.getSession() : null;
  const sessionUser = (session?.user ?? null) as { name?: string; email?: string } | null;
  const name = sessionUser?.name || '';
  const email = sessionUser?.email || '';

  if (root) {
    // Minimal editable UI for now; wire to your Sanity APIs later
    root.innerHTML = `
      <h1 class="text-3xl mb-6 font-borg text-primary">Account Settings</h1>
      <div class="space-y-6">
        <div>
          <label class="block text-sm opacity-70 mb-1">Name</label>
          <input id="name" class="w-full bg-black/40 border border-white/30 px-3 py-2" value="${name}" />
        </div>
        <div>
          <label class="block text-sm opacity-70 mb-1">Email</label>
          <input id="email" class="w-full bg-black/40 border border-white/30 px-3 py-2" value="${email}" disabled />
          <p class="text-xs opacity-60 mt-1">Email comes from your login provider.</p>
        </div>
        <div class="flex gap-4">
          <button id="save" class="px-4 py-2 bg-primary text-accent font-ethno">Save</button>
          <a href="/pages/dashboard" class="px-4 py-2 border border-white/30 font-ethno inline-flex items-center">Go to Dashboard</a>
        </div>
      </div>
    `;
  }

  document.getElementById('save')?.addEventListener('click', async () => {
    // TODO: POST to your API route that updates Sanity customer doc
    // await fetch('/api/customer', { method: 'POST', body: JSON.stringify({...}) })
    alert('Saved (stub) – wire this to Sanity update next.');
  });
})();
