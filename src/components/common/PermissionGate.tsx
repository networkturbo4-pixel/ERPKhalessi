import React, { ReactNode } from 'react';
import { useRBAC } from '../../context/RBACContext';
import { ShieldAlert } from 'lucide-react';

interface PermissionGateProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  hideInsteadOfBanner?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback,
  hideInsteadOfBanner = false,
}) => {
  const { hasPermission } = useRBAC();

  const perms = Array.isArray(permission) ? permission : [permission];
  const isAllowed = perms.every(p => hasPermission(p));

  if (isAllowed) {
    return <>{children}</>;
  }

  if (hideInsteadOfBanner) {
    return null;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h4 className="font-semibold text-base text-amber-950 dark:text-amber-100">Acceso Restringido por Política RBAC</h4>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">
            Tu rol actual no posee el privilegio{' '}
            <code className="rounded bg-amber-200/70 px-1.5 py-0.5 text-xs font-mono font-bold text-amber-950 dark:bg-amber-500/25 dark:text-amber-100">
              {perms.join(', ')}
            </code>{' '}
            requerido para modificar o visualizar esta sección.
          </p>
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
            Contacta a un Super Administrador de la pizzería para solicitar elevación de permisos.
          </p>
        </div>
      </div>
    </div>
  );
};
