import React, { createContext, useContext, useMemo } from 'react';
import { ShipmentsRole, ROLE_PAGES } from '../data/shipmentsDomain';
import { useAdminAuth } from './AdminAuthContext';

interface ShipmentsRoleContextType {
  role: ShipmentsRole;
  hasAccess: (moduleId: string) => boolean;
  accessibleModules: string[];
}

const ShipmentsRoleContext = createContext<ShipmentsRoleContextType | null>(null);

function resolveRole(userRole?: string, shipmentsRole?: string): ShipmentsRole {
  if (shipmentsRole === 'admin' || shipmentsRole === 'japon' || shipmentsRole === 'chile' || shipmentsRole === 'contador') {
    return shipmentsRole;
  }

  if (userRole === 'ADMIN') return 'admin';
  return 'chile';
}

export function ShipmentsRoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAdminAuth();
  const role = useMemo(
    () => resolveRole(user?.role, user?.shipmentsRole),
    [user?.role, user?.shipmentsRole]
  );

  const hasAccess = (moduleId: string) => ROLE_PAGES[role].includes(moduleId);

  const accessibleModules = useMemo(() => ROLE_PAGES[role], [role]);

  return (
    <ShipmentsRoleContext.Provider value={{ role, hasAccess, accessibleModules }}>
      {children}
    </ShipmentsRoleContext.Provider>
  );
}

export function useShipmentsRole() {
  const context = useContext(ShipmentsRoleContext);
  if (!context) {
    throw new Error('useShipmentsRole must be used within a ShipmentsRoleProvider');
  }
  return context;
}
