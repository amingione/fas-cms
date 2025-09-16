import { getFasAuthClient } from './fas-auth-client';

const root = document.getElementById('account-edit');

async function init() {
  if (!root) return;

  const fas = await getFasAuthClient();
  if (!fas) {
    root.innerHTML = '<p class="text-white/80">Authentication unavailable. Please refresh the page.</p>';
    return;
  }

  const authed = await fas.isAuthenticated?.();
  if (!authed) {
    root.innerHTML = `
      <h1 class="text-2xl mb-4 font-borg text-primary">Account</h1>
      <p class="mb-6">Log in or create an account to edit your profile.</p>
      <div class="flex gap-4">
        <button id="login" class="px-4 py-2 bg-primary text-accent font-ethno">Log in</button>
        <button id="signup" class="px-4 py-2 border border-white/30 font-ethno">Sign up</button>
      </div>
    `;
    document.getElementById('login')?.addEventListener('click', () => {
      window.location.href = '/account';
    });
    document.getElementById('signup')?.addEventListener('click', () => {
      window.location.href = '/account';
    });
    return;
  }

  const session = await fas.getSession?.();
  const email = (session?.user?.email as string) || '';
  let name = '';

  if (email) {
    try {
      const res = await fetch('/api/customer/get', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        const data = await res.json();
        name = [data?.firstName, data?.lastName].filter(Boolean).join(' ') || data?.name || '';
      }
    } catch (err) {
      console.warn('[account-edit] failed to load customer profile', err);
    }
  }

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
        <p class="text-xs opacity-60 mt-1">Email comes from your login.</p>
      </div>
      <div class="flex gap-4">
        <button id="save" class="px-4 py-2 bg-primary text-accent font-ethno">Save</button>
        <a href="/dashboard" class="px-4 py-2 border border-white/30 font-ethno inline-flex items-center">Go to Dashboard</a>
      </div>
    </div>
  `;

  document.getElementById('save')?.addEventListener('click', async () => {
    alert('Saved (stub) – wire this to Sanity update next.');
  });
}

init();
