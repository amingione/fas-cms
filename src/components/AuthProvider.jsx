/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useEffect, useState, useContext } from 'react';
import { getAuth0Client } from '@lib/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [auth0, setAuth0] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const auth0Client = await getAuth0Client();
      setAuth0(auth0Client);

      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const isAuthenticated = await auth0Client.isAuthenticated();
      if (isAuthenticated) {
        const user = await auth0Client.getUser();
        setUser(user);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = () => auth0?.loginWithRedirect();
  const logout = () => auth0?.logout({ returnTo: window.location.origin });

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
