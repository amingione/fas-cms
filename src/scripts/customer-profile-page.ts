import { ensureFasAuthLoaded } from './fas-auth-shared';

// Uses fas-auth session
const $ = (id: string) => document.getElementById(id) as HTMLInputElement | null;

async function resolveEmail() {
  try {
    const fas = await ensureFasAuthLoaded();
    if (fas) {
      const authed = await fas.isAuthenticated();
      if (authed) {
        const session = await fas.getSession();
        if (session?.user?.email) return session.user.email as string;
      }
    }
  } catch (error) {
    void error;
  }
  try {
    return localStorage.getItem('customerEmail') || '';
  } catch (error) {
    void error;
    return '';
  }
}

async function loadCustomer() {
  const email = await resolveEmail();
  if (!email) return; // nothing to load

  try {
    const res = await fetch('/api/customer/get', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data) return;

    $('email')!.value = data.email || '';
    $('phone')!.value = data.phone || '';
    $('shippingAddress')!.value = data.address || '';
    $('billingStreet')!.value = data.billingAddress?.street || '';
    $('firstName')!.value = data.firstName || '';
    $('lastName')!.value = data.lastName || '';
    ($('emailOptIn') as HTMLInputElement)!.checked = !!data.emailOptIn;
    ($('textOptIn') as HTMLInputElement)!.checked = !!data.textOptIn;
    ($('marketingOptIn') as HTMLInputElement)!.checked = !!data.marketingOptIn;
  } catch (e) {
    console.error('Failed to fetch customer via API', e);
  }
}

loadCustomer();

// Ensure DOM is ready before binding handlers
window.addEventListener('DOMContentLoaded', () => {
  // --- Local draft autosave helpers ---
  const DRAFT_KEY = 'fas_profile_draft_v1';
  const saveBtn = document.getElementById('saveProfile') as HTMLButtonElement | null;
  const revertBtn = document.getElementById('revertProfile') as HTMLButtonElement | null;
  const statusEl = document.getElementById('saveStatus') as HTMLElement | null;
  const backBtn = document.getElementById('backToDashboard') as HTMLButtonElement | null;
  let lastSnapshot: any = null;

  const $v = (id: string) => document.getElementById(id) as HTMLInputElement | null;

  function snapshot() {
    return {
      email: $v('email')?.value.trim() || '',
      phone: $v('phone')?.value.trim() || '',
      address: $v('shippingAddress')?.value.trim() || '',
      billingAddress: { street: $v('billingStreet')?.value.trim() || '' },
      firstName: $v('firstName')?.value.trim() || '',
      lastName: $v('lastName')?.value.trim() || '',
      emailOptIn: !!$v('emailOptIn')?.checked,
      textOptIn: !!$v('textOptIn')?.checked,
      marketingOptIn: !!$v('marketingOptIn')?.checked,
    };
  }

  function applySnapshot(snap: any) {
    if (!snap) return;
    if ($v('email')) $v('email')!.value = snap.email || '';
    if ($v('phone')) $v('phone')!.value = snap.phone || '';
    if ($v('shippingAddress')) $v('shippingAddress')!.value = snap.address || '';
    if ($v('billingStreet')) $v('billingStreet')!.value = snap.billingAddress?.street || '';
    if ($v('firstName')) $v('firstName')!.value = snap.firstName || '';
    if ($v('lastName')) $v('lastName')!.value = snap.lastName || '';
    if ($v('emailOptIn')) ($v('emailOptIn') as HTMLInputElement)!.checked = !!snap.emailOptIn;
    if ($v('textOptIn')) ($v('textOptIn') as HTMLInputElement)!.checked = !!snap.textOptIn;
    if ($v('marketingOptIn')) ($v('marketingOptIn') as HTMLInputElement)!.checked = !!snap.marketingOptIn;
  }

  function setSaving(isSaving: boolean, msg?: string) {
    if (saveBtn) saveBtn.disabled = isSaving;
    if (statusEl) statusEl.textContent = msg || (isSaving ? 'Saving…' : '');
  }

  // Restore local draft first so typing survives reloads
  try {
    const draftRaw = localStorage.getItem(DRAFT_KEY);
    if (draftRaw) {
      const draft = JSON.parse(draftRaw);
      applySnapshot(draft);
    }
  } catch (error) {
    void error;
  }

  // After Sanity load completes, take a baseline snapshot
  setTimeout(() => { lastSnapshot = snapshot(); }, 500);

  // Autosave draft on input changes
  const inputIds = ['email','phone','shippingAddress','billingStreet','firstName','lastName','emailOptIn','textOptIn','marketingOptIn'];
  inputIds.forEach((id) => {
    const el = document.getElementById(id) as HTMLElement | null;
    if (!el) return;
    const evt = el instanceof HTMLInputElement && el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot()));
      } catch (error) {
        void error;
      }
    });
  });

  revertBtn?.addEventListener('click', () => {
    if (!lastSnapshot) return;
    applySnapshot(lastSnapshot);
    setSaving(false, 'Reverted');
    setTimeout(() => setSaving(false, ''), 1200);
  });

  saveBtn?.addEventListener('click', async () => {
    setSaving(true);
    try {
      const body = { ...snapshot() } as any;
      const res = await fetch('/api/customer/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());
      lastSnapshot = snapshot();
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (error) {
        void error;
      }
      setSaving(false, 'Saved');
      if (backBtn) backBtn.classList.remove('hidden');
      setTimeout(() => setSaving(false, ''), 1200);
    } catch (e) {
      console.error(e);
      setSaving(false, 'Save failed');
      setTimeout(() => setSaving(false, ''), 1600);
    }
  });

  // ✅ Expose helpers globally AFTER they exist
  (window as any)._applySnapshot = applySnapshot;
  (window as any)._snapshot = snapshot;
});
