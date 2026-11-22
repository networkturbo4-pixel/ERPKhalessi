import React, { useState } from 'react';
import { useRBAC } from '../../context/RBACContext';
import { DriverModeView } from './DriverModeView';
import { DeliveryControlTowerView } from './DeliveryControlTowerView';
import { Activity, Bike } from 'lucide-react';

type DeliverySubView = 'tower' | 'driver';

export const DeliveryView: React.FC = () => {
  const { currentUser, hasPermission } = useRBAC();

  const isManagerOrDispatcher =
    currentUser.roleId === 'role-admin' ||
    currentUser.roleId === 'role-manager' ||
    hasPermission('dashboard:view') ||
    hasPermission('workspace:manage_branch');

  const isStrictDriver =
    !isManagerOrDispatcher &&
    (currentUser.roleId === 'role-delivery' ||
      currentUser.roleName.toLowerCase().includes('motoriz') ||
      currentUser.roleName.toLowerCase().includes('repart'));

  const [adminView, setAdminView] = useState<DeliverySubView>('tower');

  if (isStrictDriver) {
    return <DriverModeView />;
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-erp-bg">
      {/* Compact Segmented Switcher for Dispatchers / Admins */}
      <div className="px-3 sm:px-4 pt-2.5 pb-1 flex items-center justify-between gap-2 border-b border-erp-border bg-erp-card shrink-0">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-erp-subcard border border-erp-border">
          <button
            type="button"
            onClick={() => setAdminView('tower')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform duration-150 active:scale-[0.97] cursor-pointer ${
              adminView === 'tower'
                ? 'bg-erp-card text-erp-text shadow-sm'
                : 'text-erp-muted hover:text-erp-text'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            Torre de Control
          </button>
          <button
            type="button"
            onClick={() => setAdminView('driver')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform duration-150 active:scale-[0.97] cursor-pointer ${
              adminView === 'driver'
                ? 'bg-erp-card text-erp-text shadow-sm'
                : 'text-erp-muted hover:text-erp-text'
            }`}
          >
            <Bike className="w-3.5 h-3.5 text-emerald-500" />
            Modo Motorizado
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {adminView === 'tower' ? <DeliveryControlTowerView /> : <DriverModeView />}
      </div>
    </div>
  );
};
