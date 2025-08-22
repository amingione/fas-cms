import React from 'react';
import { motion } from 'framer-motion';
import { ToastProvider } from './Toast';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-neutral-950 text-white flex">
        <aside className="w-64 shrink-0 border-r border-white/10 p-4 hidden md:block">
          <div className="text-xl font-bold mb-6">Admin</div>
          <nav className="space-y-2">
            <a className="block rounded px-3 py-2 hover:bg-white/5 transition" href="/admin">
              Overview
            </a>
            <a
              className="block rounded px-3 py-2 hover:bg-white/5 transition"
              href="/admin/products"
            >
              Products
            </a>
            <a className="block rounded px-3 py-2 hover:bg-white/5 transition" href="/admin/orders">
              Orders
            </a>
            <a
              className="block rounded px-3 py-2 hover:bg-white/5 transition"
              href="/admin/categories"
            >
              Categories
            </a>
            <a
              className="block rounded px-3 py-2 hover:bg-white/5 transition"
              href="/admin/messages"
            >
              Messages
            </a>
            <a className="block rounded px-3 py-2 hover:bg-white/5 transition" href="/admin/quotes">
              Quotes
            </a>
            <a
              className="block rounded px-3 py-2 hover:bg-white/5 transition"
              href="/admin/invoices"
            >
              Invoices
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
