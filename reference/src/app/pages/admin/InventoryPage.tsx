import { useState } from 'react';
import { Plus, Download, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { InventoryTable } from '../../components/admin/InventoryTable';
import { Card, CardContent } from '../../components/design-system/Card';
import { mockInventory, mockDashboardStats } from '../../data/mockData';

export default function InventoryPage() {
  const totalValue = mockInventory.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">Inventory</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Track and manage your stock levels
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button>
              <Plus className="w-4 h-4" />
              Add Batch
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Inventory Value</p>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                ${mockDashboardStats.inventoryValue.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Items</p>
              <p className="text-2xl text-gray-900 dark:text-gray-100">
                {mockInventory.reduce((sum, item) => sum + item.quantity, 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-1" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Low Stock Alerts</p>
                <p className="text-2xl text-gray-900 dark:text-gray-100">
                  {mockDashboardStats.lowStockItems}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory Table */}
      <InventoryTable inventory={mockInventory} />
    </AdminLayout>
  );
}
