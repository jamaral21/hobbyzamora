import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ShipmentsRole, ROLE_PAGES } from '../data/shipmentsMockData';

const STORAGE_KEY = 'shipments_role';

interface ShipmentsRoleContextType {
  role: ShipmentsRole;
  setRole: (role: ShipmentsRole) => void;
  hasAccess: (moduleId: string) => boolean;
  accessibleModules: string[];
}

const ShipmentsRoleContext = createContext<ShipmentsRoleContextType | null>(null);

function getStoredRole(): ShipmentsRole {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'admin' || stored === 'japon' || stored === 'chile' || stored === 'contador')) {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return 'admin';
}

export function ShipmentsRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<ShipmentsRole>(getStoredRole);

  const setRole = useCallback((newRole: ShipmentsRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(STORAGE_KEY, newRole);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const hasAccess = useCallback(
    (moduleId: string) => ROLE_PAGES[role].includes(moduleId),
    [role],
  );

  const accessibleModules = useMemo(() => ROLE_PAGES[role], [role]);

  return (
    <ShipmentsRoleContext.Provider value={{ role, setRole, hasAccess, accessibleModules }}>
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
