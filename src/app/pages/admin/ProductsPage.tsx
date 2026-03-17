import { useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Loader2, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { Badge } from '../../components/design-system/Badge';
import { Dropdown, DropdownItem } from '../../components/design-system/Dropdown';
import { Modal } from '../../components/design-system/Modal';
import { ProductEditor } from '../../components/admin/ProductEditor';
import { useProducts, useMutation } from '../../hooks/useData';
import { productsAPI } from '../../lib/api';

export default function ProductsPage() {
  const location = useLocation();
  const isPresalesView = location.pathname.includes('/presales');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: products, isLoading, refetch } = useProducts();
  const deleteProduct = useMutation(productsAPI.delete);
  const createProduct = useMutation(productsAPI.create);
  const updateProduct = useMutation(productsAPI.update);

  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter((p: any) => isPresalesView ? p.isPresale : !p.isPresale)
      .filter((p: any) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [products, searchQuery, isPresalesView]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct.mutateAsync(id);
      refetch();
    }
  };

  const handleSave = async (data: any) => {
    try {
      const apiData = {
        ...data,
        status: data.status?.toUpperCase() || 'ACTIVE',
        initialStock: data.stock || 0,
        stock: data.stock || 0,
      };
      if (editingProduct) {
        await updateProduct.mutate((editingProduct as any).id, apiData);
      } else {
        await createProduct.mutate(apiData);
      }
      refetch();
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Save product failed:', err);
    }
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
        else { current += char; }
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setImportResult({ created: 0, skipped: 0, errors: ['El archivo CSV está vacío o no tiene datos.'] });
        return;
      }
      const result = await productsAPI.importCSV(rows);
      setImportResult(result);
      refetch();
    } catch (err: any) {
      setImportResult({ created: 0, skipped: 0, errors: [err?.message || 'Error al importar'] });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const header = 'sku,name,category,description,price,cost,stock,status,images';
    const example = 'HBZ-100,"Producto Ejemplo","Categoría","Descripción del producto",29.99,15.00,50,ACTIVE,https://example.com/img1.jpg|https://example.com/img2.jpg';
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">{isPresalesView ? 'Presales' : 'Products'}</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {isPresalesView ? 'Manage presale products' : 'Manage your product catalog'}
            </p>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />
              Plantilla CSV
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImporting ? 'Importando...' : 'Importar CSV'}
            </Button>
            <Button onClick={() => { setEditingProduct(null); setIsEditorOpen(true); }}>
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Import Result Banner */}
        {importResult && (
          <div className={`mb-4 p-4 rounded-lg border ${
            importResult.errors.length > 0 && importResult.created === 0
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : importResult.errors.length > 0
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {importResult.created > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {importResult.created} producto(s) importado(s){importResult.skipped > 0 ? `, ${importResult.skipped} omitido(s)` : ''}
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-1 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                      {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                      {importResult.errors.length > 5 && (
                        <li>...y {importResult.errors.length - 5} error(es) más</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

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
                  <DropdownItem danger onClick={() => handleDelete(product.id)}>
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
          onSave={handleSave}
          onCancel={() => setIsEditorOpen(false)}
        />
      </Modal>
    </AdminLayout>
  );
}
