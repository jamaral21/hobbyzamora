import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Input, Textarea, Select } from '../design-system/Input';
import { Button } from '../design-system/Button';
import { Product } from '../../lib/api';

export interface ProductEditorProps {
  product?: Product;
  onSave: (product: Partial<Product>) => void;
  onCancel: () => void;
  onUploadImage?: (file: File) => Promise<string>;
  hideCategoryField?: boolean;
  defaultCategory?: string;
  verificationMode?: boolean;
  submitLabel?: string;
}

export function ProductEditor({
  product,
  onSave,
  onCancel,
  onUploadImage,
  hideCategoryField = false,
  defaultCategory,
  verificationMode = false,
  submitLabel = 'Guardar Producto',
}: ProductEditorProps) {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      sku: '',
      name: '',
      category: defaultCategory || '',
      price: 0,
      cost: 0,
      stock: 0,
      images: [],
      description: '',
      status: 'ACTIVE',
    }
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [validationError, setValidationError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationMode) {
      const missingFields = [
        !String(formData.sku || '').trim() && 'SKU',
        (formData.ean === null || formData.ean === undefined || String(formData.ean).trim() === '') && 'EAN',
        !String(formData.name || '').trim() && 'nombre',
        !String(formData.category || '').trim() && 'categoría',
        (!Number.isFinite(Number(formData.price)) || Number(formData.price) <= 0) && 'precio',
        (!Number.isFinite(Number(formData.cost)) || Number(formData.cost) < 0) && 'costo',
        (!Number.isFinite(Number(formData.stock)) || Number(formData.stock) < 0) && 'stock',
      ].filter(Boolean);

      if (missingFields.length > 0) {
        setValidationError(`Antes de convertir, verifica: ${missingFields.join(', ')}`);
        return;
      }
    }

    setValidationError('');
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {verificationMode && (
        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
          <p className="text-sm font-semibold text-foreground mb-1">Verificación obligatoria antes de convertir</p>
          <p className="text-xs text-muted-foreground">
            Revisa SKU, EAN, nombre, categoría, precio, costo y stock. Al guardar, esta preventa pasará a producto normal.
          </p>
        </div>
      )}

      {validationError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {validationError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Producto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SKU"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
                <Select
                  label="Estado"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="DRAFT">Borrador</option>
                  <option value="ARCHIVED">Archivado</option>
                  <option value="HIDDEN">Oculto (solo admin)</option>
                </Select>
              </div>

              <Input
                label="EAN"
                type="number"
                inputMode="numeric"
                value={formData.ean ?? ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  setFormData({
                    ...formData,
                    ean: value === '' ? null : Number.parseInt(value, 10),
                  });
                }}
                placeholder="Ej: 7891234567890"
              />

              <Input
                label="Nombre del Producto"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              {!hideCategoryField && (
                <Input
                  label="Categoría"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              )}

              <Textarea
                label="Descripción"
                value={formData.description ?? ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios e Inventario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Precio ($)"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  required
                />
                <Input
                  label="Costo ($)"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  required
                />
                <Input
                  label="Stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  required
                />
              </div>

              {formData.price && formData.cost && (
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Margen de Ganancia: ${(formData.price - formData.cost).toFixed(2)} (
                    {(((formData.price - formData.cost) / formData.price) * 100).toFixed(1)}%)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Presale Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Preventa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.isPresale}
                  onChange={(e) => setFormData({ ...formData, isPresale: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-foreground">Este producto es una preventa</span>
              </label>

              {formData.isPresale && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <Input
                    label="Fecha de caducidad"
                    type="date"
                    value={formData.presaleEndDate ? formData.presaleEndDate.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, presaleEndDate: e.target.value || undefined })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Máx. por cliente"
                      type="number"
                      min="1"
                      value={formData.presaleMaxQty ?? ''}
                      onChange={(e) => setFormData({ ...formData, presaleMaxQty: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Ej: 2"
                    />
                    <Input
                      label="Unidades disponibles"
                      type="number"
                      min="0"
                      value={formData.presaleAvailQty ?? ''}
                      onChange={(e) => setFormData({ ...formData, presaleAvailQty: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Ej: 50"
                    />
                  </div>
                  {formData.presaleEndDate && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-400">
                        La preventa se cerrará automáticamente el {new Date(formData.presaleEndDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })} o cuando se agoten las unidades.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Imágenes del Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formData.images?.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const newImages = [...(formData.images || [])];
                        newImages.splice(index, 1);
                        setFormData({ ...formData, images: newImages });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage || !onUploadImage}
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {isUploadingImage ? 'Subiendo...' : 'Subir Imagen'}
                  </span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !onUploadImage) return;
                    setIsUploadingImage(true);
                    try {
                      const imageUrl = await onUploadImage(file);
                      setFormData((prev) => ({
                        ...prev,
                        images: [...(prev.images || []), imageUrl],
                      }));
                    } catch (error) {
                      console.error('Image upload failed:', error);
                    } finally {
                      setIsUploadingImage(false);
                      if (imageInputRef.current) imageInputRef.current.value = '';
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
