import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';

/** Gate for the confidential platform: signed in, has a role, and finished first-sign-in setup. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const r = useRoles();
  const loc = useLocation();
  if (r.loading) return <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--ct-paper))' }} />;
  if (!r.userId) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />;
  if (r.needsPassword || r.needsTerms) return <Navigate to="/welcome" replace />;
  if (!r.hasAccess) return <Navigate to="/auth?noaccess=1" replace />;
  return <>{children}</>;
}
