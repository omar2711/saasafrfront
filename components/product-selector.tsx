'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getStock } from '@/lib/inventory-service';
import { mockProducts } from '@/lib/mock-data';

interface ProductSelectorProps {
  label?: string;
  onSelect: (product: any) => void;
  excludeProductIds?: string[];
  showStock?: boolean;
}

export function ProductSelector({
  label = 'Seleccionar Producto',
  onSelect,
  excludeProductIds = [],
  showStock = true,
}: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  const filteredProducts = mockProducts.filter(product => {
    // Exclude already selected products
    if (excludeProductIds.includes(product.id)) return false;
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term)
      );
    }
    
    return true;
  });

  const handleSelect = (productId: string) => {
    const product = mockProducts.find(p => p.id === productId);
    if (product) {
      const stock = getStock(product.id);
      onSelect({ ...product, currentStock: stock });
      setSelectedProductId('');
      setSearchTerm('');
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <Input
        placeholder="Buscar por nombre o identificador..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />

      <Select value={selectedProductId} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona un producto..." />
        </SelectTrigger>
        <SelectContent>
          {filteredProducts.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
            </div>
          ) : (
            filteredProducts.map(product => {
              const stock = getStock(product.id);
              const isLowStock = stock < product.minStock;
              
              return (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center gap-3">
                    <span>{product.name}</span>
                    {showStock && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        isLowStock ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {stock} {product.unit}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Inline Product Selector - compact version for tables/lists
 */
export function InlineProductSelector({
  onSelect,
  excludeProductIds = [],
}: Omit<ProductSelectorProps, 'label'>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = mockProducts.filter(product => {
    if (excludeProductIds.includes(product.id)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleSelect = (product: any) => {
    const stock = getStock(product.id);
    onSelect({ ...product, currentStock: stock });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 border rounded-md text-sm hover:bg-muted"
      >
        {isOpen ? 'Buscar...' : 'Agregar Producto'}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 border rounded-md bg-white shadow-lg z-50">
          <Input
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="m-2"
            autoFocus
          />
          
          <div className="max-h-48 overflow-y-auto">
            {filteredProducts.map(product => {
              const stock = getStock(product.id);
              const isLowStock = stock < product.minStock;
              
              return (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    isLowStock ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {stock}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
