import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
type Toast = { id: string; msg: string };
const Ctx = createContext<{ push: (msg: string) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  function push(msg: string) {
    const id = crypto.randomUUID();
    setItems((v) => [...v, { id, msg }]);
    setTimeout(() => setItems((v) => v.filter((t) => t.id !== id)), 2500);
  }
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[9999] space-y-2">
          {items.map((t) => (
            <div
              key={t.id}
              className="backdrop-blur rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm shadow-lg transition"
            >
              {t.msg}
            </div>
          ))}
        </div>,
        document.body
      )}
    </Ctx.Provider>
  );
}
export function useToast() {
  return useContext(Ctx);
}
