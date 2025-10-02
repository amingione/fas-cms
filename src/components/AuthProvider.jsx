import { createContext, useEffect, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const fx = window.fasAuth;
      const isAuthenticated = fx ? await fx.isAuthenticated() : false;
      if (isAuthenticated) {
        const session = await fx.getSession();
        setUser(session?.user || null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = () => (window.location.href = '/account');
  const logout = () => window.location.assign('/api/auth/logout?returnTo=' + encodeURIComponent(window.location.origin));

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
