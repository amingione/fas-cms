import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

export default function RequireLogin({ children }) {
  const { user, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      login();
    }
  }, [loading, user]);

  if (loading || !user) return <p>Loading...</p>;
  return children;
}
