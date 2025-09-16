import { getFasAuthClient } from './fas-auth-client';

window.addEventListener('DOMContentLoaded', async () => {
  const loginLink = document.getElementById('loginLink');
  const logoutLink = document.getElementById('logoutLink');

  const fas = await getFasAuthClient();
  if (!fas) {
    loginLink?.classList.remove('hidden');
    logoutLink?.classList.add('hidden');
    loginLink?.addEventListener('click', () => {
      window.location.href = '/account';
    });
    return;
  }

  const isAuthed = await fas.isAuthenticated?.();
  if (isAuthed) {
    logoutLink?.classList.remove('hidden');
    loginLink?.classList.add('hidden');
  } else {
    loginLink?.classList.remove('hidden');
    logoutLink?.classList.add('hidden');
  }

  loginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/account';
  });
  logoutLink?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/api/auth/logout';
  });
});
