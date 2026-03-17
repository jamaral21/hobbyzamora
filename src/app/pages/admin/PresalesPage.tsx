import { Link } from 'react-router';
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
import { Plus, Search, Clock, AlertCircle } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

const presaleProducts = [
  {
    id: '1',
    name: 'Limited Edition Model Kit',
    sku: 'MK-2024-015',
    price: 149.99,
    reserved: 47,
    maxPerOrder: 2,
    availableFrom: '2026-04-01',
    endsOn: '2026-04-30',
    totalStock: 50,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1705393928685-4dec061491dd?w=100',
  },
  {
    id: '2',
    name: 'Rare Collectible Display',
    sku: 'DC-2024-001',
    price: 299.99,
    reserved: 12,
    maxPerOrder: 1,
    availableFrom: '2026-05-15',
    endsOn: '2026-06-15',
    totalStock: 15,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1764083680353-0de3e959a375?w=100',
  },
  {
    id: '3',
    name: 'Exclusive Vinyl Figure Set',
    sku: 'VF-2024-025',
    price: 199.99,
    reserved: 100,
    maxPerOrder: 2,
    availableFrom: '2026-03-01',
    endsOn: '2026-03-15',
    totalStock: 100,
    status: 'sold_out',
    image: 'https://images.unsplash.com/photo-1762215643003-d6fb6fa4c777?w=100',
  },
  {
    id: '4',
    name: 'Premium Action Figure - Ultimate Edition',
    sku: 'AF-2024-050',
    price: 249.99,
    reserved: 5,
    maxPerOrder: 1,
    availableFrom: '2026-06-01',
    endsOn: '2026-07-01',
    totalStock: 25,
    status: 'scheduled',
    image: 'https://images.unsplash.com/photo-1700909416178-40b292788200?w=100',
  },
];

const getDaysUntil = (date: string) => {
  const days = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return days;
};

export function PresalesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Presale Products</h2>
          <p className="text-gray-600">Manage limited edition and presale items</p>
        </div>
        <Link to="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Presale
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Active Presales</p>
          <p className="text-2xl font-bold text-purple-600">2</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Total Reserved</p>
          <p className="text-2xl font-bold">164</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Presale Revenue</p>
          <p className="text-2xl font-bold">$37,048</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-1">Sold Out</p>
          <p className="text-2xl font-bold">1</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search presale products..."
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          Filter
        </Button>
      </div>

      {/* Presales Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Reserved / Total</TableHead>
              <TableHead>Max Per Order</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presaleProducts.map((product) => {
              const daysUntilStart = getDaysUntil(product.availableFrom);
              const daysUntilEnd = getDaysUntil(product.endsOn);
              const percentReserved = (product.reserved / product.totalStock) * 100;
              
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <code className="text-xs text-gray-500">{product.sku}</code>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${product.price.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {product.reserved} / {product.totalStock}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full"
                          style={{ width: `${percentReserved}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.maxPerOrder}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {daysUntilStart > 0 ? (
                        <p className="text-blue-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Starts in {daysUntilStart} days
                        </p>
                      ) : daysUntilEnd > 0 ? (
                        <p className="text-orange-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Ends in {daysUntilEnd} days
                        </p>
                      ) : (
                        <p className="text-gray-500">Ended</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(product.availableFrom).toLocaleDateString()} - {new Date(product.endsOn).toLocaleDateString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.status === 'active' && (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    )}
                    {product.status === 'scheduled' && (
                      <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>
                    )}
                    {product.status === 'sold_out' && (
                      <Badge variant="secondary">Sold Out</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
