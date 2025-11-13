import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

// PUBLIC_INTERFACE
export const ToastContext = createContext({ addToast: () => {} });

// PUBLIC_INTERFACE
export function useToast() {
  /** Hook to access toast API. */
  return useContext(ToastContext);
}

// PUBLIC_INTERFACE
export function ToastProvider({ children }) {
  /** Provides toast notifications to the subtree. */
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, { type = 'info', timeout = 3000 } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    if (timeout) {
      setTimeout(() => remove(id), timeout);
    }
  }, [remove]);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="kc-toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`kc-toast ${t.type}`}>
            <span>{t.message}</span>
            <button className="kc-toast-close" onClick={() => remove(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
