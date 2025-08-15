import { createContext, useContext, useEffect, useState } from 'react';
import * as Auth0 from '@auth0/auth0-spa-js';

interface AuthContextType {
  auth0Client: Auth0.Auth0Client | null;
  isAuthenticated: boolean;
  user: any; // Optionally, replace `any` with Auth0 user type
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [auth0Client, setAuth0Client] = useState<Auth0.Auth0Client | null>(null);
  const [user, setUser] = useState<any>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth0 = async () => {
      const auth0 = await Auth0.createAuth0Client({
        domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
        clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!,
        authorizationParams: { redirect_uri: window.location.origin }
      });

      setAuth0Client(auth0);

      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        await auth0.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const isAuthenticated = await auth0.isAuthenticated();
      setIsAuthenticated(isAuthenticated);

      if (isAuthenticated) {
        const user = await auth0.getUser();
        setUser(user);
      }

      setLoading(false);
    };

    initAuth0();
  }, []);

  return (
    <AuthContext.Provider value={{ auth0Client, isAuthenticated, user, loading }}>
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
