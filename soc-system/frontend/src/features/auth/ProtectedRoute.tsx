import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './auth-store';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const tryRestoreSession = useAuthStore((s) => s.tryRestoreSession);

  useEffect(() => {
    if (status === 'idle') {
      void tryRestoreSession();
    }
  }, [status, tryRestoreSession]);

  if (status === 'idle' || status === 'loading') {
    return <div className="soc-center-screen">Loading…</div>;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
