import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { ArrowLeft, Upload, X, Plus } from 'lucide-react';

export function ProductEditorPage() {
  const [variants, setVariants] = useState([
    { id: '1', name: 'Standard', price: '', stock: '' },
  ]);

  const addVariant = () => {
    setVariants([...variants, { id: Date.now().toString(), name: '', price: '', stock: '' }]);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link to="/admin/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Crear Producto</h2>
          <p className="text-muted-foreground">Agrega un nuevo producto a tu catálogo</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/products">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button>Save Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" placeholder="Enter product name" />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" placeholder="e.g., AF-2024-001" />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="action-figures">Action Figures</SelectItem>
                      <SelectItem value="model-kits">Model Kits</SelectItem>
                      <SelectItem value="trading-cards">Trading Cards</SelectItem>
                      <SelectItem value="vinyl-figures">Vinyl Figures</SelectItem>
                      <SelectItem value="board-games">Board Games</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input id="price" type="number" placeholder="0.00" className="pl-7" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cost">Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input id="cost" type="number" placeholder="0.00" className="pl-7" />
                  </div>
                </div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Profit: <span className="font-medium text-[#00e676]">$0.00</span>
                  {' • '}
                  Margin: <span className="font-medium">0%</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input id="stock" type="number" placeholder="0" />
                </div>
                <div>
                  <Label htmlFor="low-stock">Low Stock Threshold</Label>
                  <Input id="low-stock" type="number" placeholder="5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Variants</CardTitle>
                <Button variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {variants.map((variant) => (
                <div key={variant.id} className="flex gap-3 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <Input placeholder="Variant name" defaultValue={variant.name} />
                    <Input type="number" placeholder="Price" defaultValue={variant.price} />
                    <Input type="number" placeholder="Stock" defaultValue={variant.stock} />
                  </div>
                  {variants.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariant(variant.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/30 transition-colors cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium mb-1">Click to upload images</p>
                <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch id="active" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="presale">Presale Item</Label>
                <Switch id="presale" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Presale Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="presale-date">Available From</Label>
                <Input id="presale-date" type="date" />
              </div>
              <div>
                <Label htmlFor="max-purchase">Max Purchase Per Order</Label>
                <Input id="max-purchase" type="number" placeholder="e.g., 2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" placeholder="Add tags..." />
                <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
