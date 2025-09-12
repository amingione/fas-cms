import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ToastProvider } from './Toast';
import '../../styles/global.css';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = useMemo(
    () => (typeof window !== 'undefined' ? window.location.pathname : '/admin'),
    []
  );
  const isActive = (href: string) => pathname === href;
  return (
    <ToastProvider>
      <div className="min-h-screen bg-neutral-950 text-white flex">
        <aside className="w-64 shrink-0 border-r border-white/20 p-4 hidden md:block">
          <div className="text-xl font-bold mb-6">Admin</div>
          <nav className="space-y-2">
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin') || isActive('/admin/overview')
                  ? 'bg-white/10 text-white'
                  : 'hover:bg-white/5'
              }`}
              href="/admin/overview"
              aria-current={isActive('/admin') || isActive('/admin/overview') ? 'page' : undefined}
            >
              Overview
            </a>
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin/products') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              href="/admin/products"
              aria-current={isActive('/admin/products') ? 'page' : undefined}
            >
              Products
            </a>
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin/orders') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              href="/admin/orders"
              aria-current={isActive('/admin/orders') ? 'page' : undefined}
            >
              Orders
            </a>
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin/categories') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              href="/admin/categories"
              aria-current={isActive('/admin/categories') ? 'page' : undefined}
            >
              Categories
            </a>
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin/messages') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              href="/admin/messages"
              aria-current={isActive('/admin/messages') ? 'page' : undefined}
            >
              Messages
            </a>
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin/quotes') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              href="/admin/quotes"
              aria-current={isActive('/admin/quotes') ? 'page' : undefined}
            >
              Quotes
            </a>
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin/wheel-quotes') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              href="/admin/wheel-quotes"
              aria-current={isActive('/admin/wheel-quotes') ? 'page' : undefined}
            >
              Wheel Quotes
            </a>
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin/invoices') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              href="/admin/invoices"
              aria-current={isActive('/admin/invoices') ? 'page' : undefined}
            >
              Invoices
            </a>
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin/customers') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              href="/admin/customers"
              aria-current={isActive('/admin/customers') ? 'page' : undefined}
            >
              Customers
            </a>
            <a
              className={`block rounded px-3 py-2 transition ${
                isActive('/admin/appointments') ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              href="/admin/appointments"
              aria-current={isActive('/admin/appointments') ? 'page' : undefined}
            >
              Appointments
            </a>
            <a
              className="block rounded px-3 py-2 hover:bg-white/5 transition"
              href="/.netlify/functions/auth-logout"
            >
              Logout
            </a>
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
