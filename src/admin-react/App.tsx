import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Helper to tolerate modules that don't have a default export
function lazyPage<T extends { default?: any }>(loader: () => Promise<T>) {
  return lazy(async () => {
    const m: any = await loader();
    if (m && m.default) return { default: m.default };
    // pick first function export as component fallback
    const fallback = Object.values(m).find((v) => typeof v === 'function');
    if (fallback) return { default: fallback as any };
    // last resort return a noop component to avoid hard crash (shows nothing)
    return { default: (() => null) as any };
  });
}
import { ThemeProvider } from 'src/admin-react/context/ThemeContext';
import ProductsPage from 'src/admin-react/pages/Products';
import OrdersPage from 'src/admin-react/pages/Orders';
import CustomersPage from 'src/admin-react/pages/Customers';
import QuotesPage from 'src/admin-react/pages/Quotes';
const NotFound = lazyPage(() => import('src/admin-react/pages/OtherPage/NotFound'));
import AppLayout from 'src/admin-react/layout/AppLayout.tsx';
import { ScrollToTop } from 'src/admin-react/components/common/ScrollToTop.tsx';
import Home from 'src/admin-react/pages/Dashboard/Home.tsx';

export default function App() {
  return (
    <>
      <ThemeProvider>
        <ScrollToTop />
        <Suspense fallback={<div className="p-6 text-white/70">Loading…</div>}>
          <Routes>
            {/* Dashboard Layout */}
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />

            {/* Admin Data Pages */}
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/quotes" element={<QuotesPage />} />
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ThemeProvider>
    </>
  );
}
