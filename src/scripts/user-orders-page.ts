import { ensureFasAuthLoaded } from './fas-auth-shared';

// Uses fas-auth session
const root = document.getElementById('orders-root');
if (root) root.textContent = 'Loading...';

const renderError = (msg: string) => {
  if (root) root.innerHTML = `<p>${msg}</p>`;
};
const renderEmpty = () => {
  if (root) root.innerHTML = `<p>No orders found.</p>`;
};
const renderList = (orders: any[]) => {
  if (!root) return;
  root.innerHTML = '<ul class="space-y-4"></ul>';
  const ul = root.querySelector('ul')!;
  for (const order of orders) {
    const li = document.createElement('li');
    li.className = 'border border-gray-600 p-4 rounded-lg bg-dark/40';
    const created = (order as any).orderDate || (order as any)._createdAt;
    li.innerHTML = `
      <div><strong>Order #:</strong> ${(order as any).orderNumber ?? (order as any)._id}</div>
      <div><strong>Date:</strong> ${created ? new Date(created).toLocaleDateString() : ''}</div>
      <div><strong>Status:</strong> ${(order as any).status ?? ''}</div>
      <div><strong>Tracking:</strong> ${(order as any).trackingNumber ?? ''}</div>
      <div><strong>Total:</strong> $${(order as any).total ?? ''}</div>
    `;
    ul.appendChild(li);
  }
};

(async () => {
  try {
    const fas = await ensureFasAuthLoaded();
    const isAuthed = fas ? await fas.isAuthenticated() : false;
    if (!isAuthed) {
      renderError('Please log in to view your orders.');
      return;
    }

    const session = fas ? await fas.getSession() : null;
    const email = (session?.user?.email as string) || '';
    if (!email) return renderError('No email found for user.');

    // Try secured call first using ID token as Bearer
    let orders: any[] = [];
    let usedFallback = false;
    try {
      const res = await fetch('/api/get-user-order');
      if (res.ok) {
        const data = await res.json();
        orders = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.items)
            ? (data as any).items
            : [];
      } else if (res.status === 401 || res.status === 400) {
        usedFallback = true;
      } else {
        throw new Error(await res.text());
      }
    } catch (e) {
      usedFallback = true;
    }

    if (usedFallback) {
      const res2 = await fetch(`/api/get-user-order?email=${encodeURIComponent(email)}`);
      if (!res2.ok) throw new Error(await res2.text());
      const data2 = await res2.json();
      orders = Array.isArray(data2)
        ? data2
        : Array.isArray((data2 as any)?.items)
          ? (data2 as any).items
          : [];
    }

    if (!orders || orders.length === 0) return renderEmpty();
    renderList(orders);
  } catch (err) {
    console.error('Failed to load orders:', err);
    renderError('Unable to load your orders.');
  }
})();
