import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Search, Download, MoreHorizontal, Mail, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const customers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    orders: 12,
    totalSpent: 1247.88,
    lastOrder: '2026-03-10',
    status: 'active',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    orders: 8,
    totalSpent: 892.45,
    lastOrder: '2026-03-09',
    status: 'active',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    orders: 25,
    totalSpent: 3456.90,
    lastOrder: '2026-03-08',
    status: 'vip',
  },
  {
    id: '4',
    name: 'Alice Williams',
    email: 'alice@example.com',
    orders: 3,
    totalSpent: 234.97,
    lastOrder: '2026-02-28',
    status: 'active',
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    orders: 1,
    totalSpent: 89.99,
    lastOrder: '2026-01-15',
    status: 'inactive',
  },
];

export function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customers</h2>
          <p className="text-gray-600">Manage customer relationships and data</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Total Customers</p>
          <p className="text-2xl font-bold">1,247</p>
          <p className="text-xs text-green-600 mt-1">+12% this month</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">VIP Customers</p>
          <p className="text-2xl font-bold text-purple-600">87</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
          <p className="text-2xl font-bold">$127.45</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Lifetime Value</p>
          <p className="text-2xl font-bold">$2,847</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search customers by name or email..."
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          Filter
        </Button>
      </div>

      {/* Customers Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{customer.orders}</span>
                  <span className="text-gray-500 text-sm ml-1">orders</span>
                </TableCell>
                <TableCell className="font-semibold text-purple-600">
                  ${customer.totalSpent.toFixed(2)}
                </TableCell>
                <TableCell className="text-gray-500">
                  {new Date(customer.lastOrder).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {customer.status === 'vip' && (
                    <Badge className="bg-purple-100 text-purple-700">VIP</Badge>
                  )}
                  {customer.status === 'active' && (
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  )}
                  {customer.status === 'inactive' && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        View Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Mark as VIP
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
