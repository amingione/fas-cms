import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { id?: string; email?: string } | undefined;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id?: string; email?: string } | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        if (typeof window === 'undefined') return;
        const fas = (window as any).fasAuth;
        if (!fas || typeof fas.getSession !== 'function') {
          setIsAuthenticated(false);
          setUser(undefined);
          return;
        }
        const session = await fas.getSession();
        if (!mounted) return;
        if (session?.user) {
          setIsAuthenticated(true);
          setUser({ id: session.user.id, email: session.user.email });
        } else {
          setIsAuthenticated(false);
          setUser(undefined);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
