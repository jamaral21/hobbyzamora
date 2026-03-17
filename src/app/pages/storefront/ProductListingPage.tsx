import { useState } from 'react';
import { ProductCard } from '../../components/design-system/ProductCard';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Slider } from '../../components/ui/slider';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { SlidersHorizontal } from 'lucide-react';

const products = [
  {
    id: '1',
    name: 'Premium Action Figure Collection',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1700909416178-40b292788200?w=400',
    stock: 8,
    category: 'Action Figures',
  },
  {
    id: '2',
    name: 'Limited Edition Model Kit',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1705393928685-4dec061491dd?w=400',
    stock: 3,
    category: 'Model Kits',
    isPresale: true,
    maxPurchase: 2,
  },
  {
    id: '3',
    name: 'Collectible Trading Cards Set',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1579361647854-cf9cda91d4b8?w=400',
    stock: 25,
    category: 'Trading Cards',
  },
  {
    id: '4',
    name: 'Exclusive Vinyl Figure',
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1762215643003-d6fb6fa4c777?w=400',
    stock: 12,
    category: 'Vinyl Figures',
  },
  {
    id: '5',
    name: 'Board Game Collection',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1716817276052-f3030c20c117?w=400',
    stock: 15,
    category: 'Board Games',
  },
  {
    id: '6',
    name: 'Rare Collectible Display',
    price: 299.99,
    image: 'https://images.unsplash.com/photo-1764083680353-0de3e959a375?w=400',
    stock: 2,
    category: 'Display Cases',
    isPresale: true,
    maxPurchase: 1,
  },
];

const categories = [
  'Action Figures',
  'Model Kits',
  'Trading Cards',
  'Vinyl Figures',
  'Board Games',
  'Display Cases',
];

export function ProductListingPage() {
  const [priceRange, setPriceRange] = useState([0, 500]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Products</h1>
        <p className="text-gray-600">Explora nuestra colección completa de productos Pokémon TCG</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white border rounded-lg p-6 sticky top-20">
            <div className="flex items-center gap-2 mb-6">
              <SlidersHorizontal className="h-5 w-5" />
              <h2 className="font-semibold text-lg">Filters</h2>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Category</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category} className="flex items-center">
                    <Checkbox id={category} />
                    <Label htmlFor={category} className="ml-2 text-sm cursor-pointer">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Price Range</h3>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                max={500}
                step={10}
                className="mb-2"
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>${priceRange[0]}</span>
                <span>${priceRange[1]}</span>
              </div>
            </div>

            {/* Availability */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Availability</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Checkbox id="in-stock" />
                  <Label htmlFor="in-stock" className="ml-2 text-sm cursor-pointer">
                    In Stock
                  </Label>
                </div>
                <div className="flex items-center">
                  <Checkbox id="presale" />
                  <Label htmlFor="presale" className="ml-2 text-sm cursor-pointer">
                    Presale
                  </Label>
                </div>
                <div className="flex items-center">
                  <Checkbox id="low-stock" />
                  <Label htmlFor="low-stock" className="ml-2 text-sm cursor-pointer">
                    Low Stock
                  </Label>
                </div>
              </div>
            </div>

            <Button className="w-full">Apply Filters</Button>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Showing <span className="font-medium">{products.length}</span> products
            </p>
            <Select defaultValue="featured">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
