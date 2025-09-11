import React from 'react';
import { BrowserRouter } from 'react-router-dom';
// We import your existing dashboard App without modifying it.
// Adjust the relative path below to wherever you placed the repo's App.tsx inside src/admin-react.
import App from './App';

/**
 * AdminApp wraps your existing App with a basename so all routes live under /admin
 * without changing your App.tsx routing or your existing APIs.
 */
export default function AdminApp() {
  return (
    <BrowserRouter basename="/admin">
      <App />
    </BrowserRouter>
  );
}
