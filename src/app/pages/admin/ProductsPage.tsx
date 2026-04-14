import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Loader2, Upload, Download, CheckCircle, AlertCircle, ImagePlus } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { Badge } from '../../components/design-system/Badge';
import { Dropdown, DropdownItem } from '../../components/design-system/Dropdown';
import { Modal } from '../../components/design-system/Modal';
import { ProductEditor } from '../../components/admin/ProductEditor';
import { useProducts, useMutation } from '../../hooks/useData';
import { productsAPI } from '../../lib/api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export default function ProductsPage() {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();
  const isPresalesView = location.pathname.includes('/presales');
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'HIDDEN' | 'ALL'>('ACTIVE');
  const [isEditorOpen, setIsEditorOpen] = useState(
    (location.state as any)?.openEditor === true
  );
  const [editingProduct, setEditingProduct] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUploadResult, setImageUploadResult] = useState<{ extracted: number; skipped: number; productsUpdated: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  
  const { data: products, isLoading, refetch } = useProducts(
    {
      status: statusFilter === 'ALL' ? 'ALL' : statusFilter,
    },
    { enabled: isAuthenticated }
  );
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

  const handleDeactivate = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres desactivar este producto?')) {
      await updateProduct.mutate(id, { status: 'ARCHIVED' });
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
        ...(editingProduct ? {} : { isPresale: isPresalesView }),
        // Para preventa nueva: mapear stock como cupo de preventa
        ...(isPresalesView && !editingProduct ? {
          presaleMaxQty: data.stock || 0,
          presaleAvailQty: data.stock || 0,
          stock: 0,
          initialStock: 0,
        } : {}),
      };
      if (editingProduct) {
        await updateProduct.mutate((editingProduct as any).id, apiData);
      } else {
        await createProduct.mutate(apiData);
      }
      refetch();
      setIsEditorOpen(false);
      if (isPresalesView) {
        navigate('/admin/presales');
      }
    } catch (err) {
      console.error('Save product failed:', err);
    }
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const normalized = text.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      const next = normalized[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') i++;
        currentRow.push(currentCell.trim());
        currentCell = '';

        const hasContent = currentRow.some(cell => cell.length > 0);
        if (hasContent) rows.push(currentRow);
        currentRow = [];
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      const hasContent = currentRow.some(cell => cell.length > 0);
      if (hasContent) rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, ''));
    return rows.slice(1).map(values => {
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] || '').trim();
      });
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
        setImportResult({ created: 0, updated: 0, skipped: 0, errors: ['El archivo CSV está vacío o no tiene datos.'] });
        return;
      }
      const result = await productsAPI.importCSV(rows, isPresalesView);
      setImportResult(result);
      refetch();
    } catch (err: any) {
      setImportResult({ created: 0, updated: 0, skipped: 0, errors: [err?.message || 'Error al importar'] });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const header = isPresalesView
      ? 'sku,EAN,name,category,description,price,cost,presaleMaxQty,presaleAvailQty,presaleEndDate,images'
      : 'sku,EAN,name,category,description,price,cost,stock,status,images';
    const example = isPresalesView
      ? 'HBZ-PRV-001,"Preventa Ejemplo","Categoría","Descripción",29.99,15.00,,100,100,2026-06-30,'
      : 'HBZ-100,7891234567890,"Producto Ejemplo","Categoría","Descripción del producto",29.99,15.00,50,ACTIVE,https://example.com/img1.jpg|https://example.com/img2.jpg';
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isPresalesView ? 'plantilla-preventas.csv' : 'plantilla-productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImages(true);
    setUploadProgress(0);
    setImageUploadResult(null);
    try {
      const result = await productsAPI.uploadImages(file, (pct) => setUploadProgress(pct));
      console.log('ZIP upload result:', result);
      setImageUploadResult(result);
      refetch();
    } catch (err: any) {
      setImageUploadResult({ extracted: 0, skipped: 0, productsUpdated: 0 });
    } finally {
      setIsUploadingImages(false);
      setUploadProgress(0);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl text-foreground mb-2">{isPresalesView ? 'Preventas' : 'Productos'}</h1>
            <p className="text-muted-foreground">
              {isPresalesView ? 'Gestiona productos en preventa' : 'Gestiona tu catálogo de productos'}
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
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleUploadImages}
            />
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />
              Plantilla CSV
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImporting ? 'Importando...' : 'Importar CSV'}
            </Button>
            <Button variant="outline" onClick={() => zipInputRef.current?.click()} disabled={isUploadingImages}>
              {isUploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {isUploadingImages ? `Subiendo... ${uploadProgress}%` : 'Subir Imágenes ZIP'}
            </Button>
            <Button onClick={() => { setEditingProduct(null); setIsEditorOpen(true); }}>
              <Plus className="w-4 h-4" />
              Agregar Producto
            </Button>
          </div>
        </div>

        {/* Import Result Banner */}
        {importResult && (
          <div className={`mb-4 p-4 rounded-lg border ${
            importResult.errors.length > 0 && importResult.created === 0 && importResult.updated === 0
              ? 'bg-destructive/10 border-destructive/20'
              : importResult.errors.length > 0
              ? 'bg-[#ffab00]/10 border-[#ffab00]/20'
              : 'bg-[#00e676]/10 border-[#00e676]/20'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {(importResult.created > 0 || importResult.updated > 0) ? (
                  <CheckCircle className="w-5 h-5 text-[#00e676] mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {importResult.created} creado(s), {importResult.updated} actualizado(s){importResult.skipped > 0 ? `, ${importResult.skipped} omitido(s)` : ''}
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">
                      {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                      {importResult.errors.length > 5 && (
                        <li>...y {importResult.errors.length - 5} error(es) más</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <button onClick={() => setImportResult(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        {/* Image Upload Result Banner */}
        {imageUploadResult && (
          <div className={`mb-4 p-4 rounded-lg border ${
            imageUploadResult.extracted === 0
              ? 'bg-destructive/10 border-destructive/20'
              : 'bg-[#00e676]/10 border-[#00e676]/20'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {imageUploadResult.extracted > 0 ? (
                  <CheckCircle className="w-5 h-5 text-[#00e676] mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {imageUploadResult.extracted} imagen(es) extraída(s), {imageUploadResult.productsUpdated} producto(s) actualizado(s)
                  </p>
                  {imageUploadResult.skipped > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {imageUploadResult.skipped} archivo(s) omitido(s) (formato no soportado)
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setImageUploadResult(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-input-background px-3 py-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ACTIVE' | 'ARCHIVED' | 'HIDDEN' | 'ALL')}
              className="bg-transparent text-foreground focus:outline-none"
            >
              <option value="ACTIVE">Activos</option>
              <option value="ARCHIVED">Desactivados</option>
              <option value="HIDDEN">Ocultos</option>
              <option value="ALL">Todos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
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
                    <p className="text-sm text-foreground">{product.name}</p>
                    {product.isPresale && (
                      <Badge variant="presale" size="sm">Preventa</Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{product.sku}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>${product.price.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{product.stock}</span>
                  {product.stock < 10 && (
                    <Badge variant="warning" size="sm">Bajo</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    product.status === 'ACTIVE'
                      ? 'success'
                      : product.status === 'HIDDEN'
                      ? 'info'
                      : product.status === 'DRAFT'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {product.status === 'ACTIVE' ? 'Activo'
                    : product.status === 'ARCHIVED' ? 'Desactivado'
                    : product.status === 'HIDDEN' ? 'Oculto'
                    : product.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Dropdown
                  trigger={
                    <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  }
                  align="right"
                >
                  <DropdownItem onClick={() => navigate(`/admin/store/product/${product.id}`)}>
                    <Eye className="w-4 h-4 inline mr-2" />
                    Ver
                  </DropdownItem>
                  <DropdownItem onClick={() => { setEditingProduct(product as any); setIsEditorOpen(true); }}>
                    <Edit className="w-4 h-4 inline mr-2" />
                    Editar
                  </DropdownItem>
                  {product.status !== 'HIDDEN' && (
                    <DropdownItem onClick={async () => { await updateProduct.mutate((product as any).id, { status: 'HIDDEN' }); refetch(); }}>
                      <Eye className="w-4 h-4 inline mr-2" />
                      Ocultar
                    </DropdownItem>
                  )}
                  {product.status === 'HIDDEN' && (
                    <DropdownItem onClick={async () => { await updateProduct.mutate((product as any).id, { status: 'ACTIVE' }); refetch(); }}>
                      <Eye className="w-4 h-4 inline mr-2" />
                      Mostrar
                    </DropdownItem>
                  )}
                  <DropdownItem danger onClick={() => handleDeactivate(product.id)}>
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    Desactivar
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
          onUploadImage={async (file) => {
            const result = await productsAPI.uploadImage(file);
            return result.url;
          }}
        />
      </Modal>
    </AdminLayout>
  );
}
