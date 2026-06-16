import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface CanProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

// Renders children only when the user has the required permission(s).
// Used to hide menus, buttons and actions the user is not allowed to perform.
export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = useAuth();
  const codes = Array.isArray(permission) ? permission : [permission];
  return can(...codes) ? <>{children}</> : <>{fallback}</>;
}
