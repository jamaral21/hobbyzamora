import { Outlet } from 'react-router';
import { ShipmentsSidebar } from './ShipmentsSidebar';
import { ShipmentsRoleProvider } from '../../contexts/ShipmentsRoleContext';
import { ShipmentsDataProvider } from '../../contexts/ShipmentsDataContext';

function ShipmentsLayoutInner() {
  return (
    <div className="flex h-screen overflow-hidden">
      <ShipmentsSidebar />
      <main className="flex-1 overflow-y-auto bg-[#f0eef5] shipments-light">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function ShipmentsApp() {
  return (
    <ShipmentsRoleProvider>
      <ShipmentsDataProvider>
        <ShipmentsLayoutInner />
      </ShipmentsDataProvider>
    </ShipmentsRoleProvider>
  );
}
