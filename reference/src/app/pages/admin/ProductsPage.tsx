import { useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { Badge } from '../../components/design-system/Badge';
import { Dropdown, DropdownItem } from '../../components/design-system/Dropdown';
import { Modal } from '../../components/design-system/Modal';
import { ProductEditor } from '../../components/admin/ProductEditor';
import { mockProducts } from '../../data/mockData';

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const filteredProducts = mockProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">Products</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage your product catalog
            </p>
          </div>
          <Button onClick={() => { setEditingProduct(null); setIsEditorOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{product.name}</p>
                    {product.isPresale && (
                      <Badge variant="purple" size="sm">Presale</Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{product.sku}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>${product.price.toFixed(2)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{product.stock}</span>
                  {product.stock < 10 && (
                    <Badge variant="warning" size="sm">Low</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    product.status === 'active'
                      ? 'success'
                      : product.status === 'draft'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {product.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Dropdown
                  trigger={
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  }
                  align="right"
                >
                  <DropdownItem onClick={() => console.log('View', product.id)}>
                    <Eye className="w-4 h-4 inline mr-2" />
                    View
                  </DropdownItem>
                  <DropdownItem onClick={() => { setEditingProduct(product as any); setIsEditorOpen(true); }}>
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit
                  </DropdownItem>
                  <DropdownItem danger onClick={() => console.log('Delete', product.id)}>
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    Delete
                  </DropdownItem>
                </Dropdown>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Product Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        size="xl"
        showCloseButton={false}
      >
        <ProductEditor
          product={editingProduct as any}
          onSave={(data) => {
            console.log('Save product:', data);
            setIsEditorOpen(false);
          }}
          onCancel={() => setIsEditorOpen(false)}
        />
      </Modal>
    </AdminLayout>
  );
}
