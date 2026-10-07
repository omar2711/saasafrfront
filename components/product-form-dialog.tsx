'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormDialogProps {
  isOpen: boolean;
  editingProduct?: any;
  categories?: CategoryOption[];
  onSave: (data: {
    name?: string;
    sku?: string;
    categoryId?: string;
    description?: string;
    costPrice?: number;
    salePrice: number;
    minSalePrice?: number | null;
    maxSalePrice?: number | null;
    minStock: number;
    unit?: string;
    image?: string;
  }) => void;
  onCancel: () => void;
}

const NO_CATEGORY = '__none__';

const UNITS = [
  'unidad',
  'kg',
  'litro',
  'metro',
  'paquete',
  'caja',
  'docena',
];

export function ProductFormDialog({ isOpen, editingProduct, categories = [], onSave, onCancel }: ProductFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(editingProduct?.name || '');
  const [sku, setSku] = useState(editingProduct?.sku || '');
  const [categoryId, setCategoryId] = useState<string>(editingProduct?.categoryId || NO_CATEGORY);
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [costPrice, setCostPrice] = useState(editingProduct?.costPrice || '');
  const [salePrice, setSalePrice] = useState(editingProduct?.salePrice || '');
  // Vacio = sin limite. No se normaliza a 0: 0 seria "regalar el producto".
  const [minSalePrice, setMinSalePrice] = useState(editingProduct?.minSalePrice ?? '');
  const [maxSalePrice, setMaxSalePrice] = useState(editingProduct?.maxSalePrice ?? '');
  const [minStock, setMinStock] = useState(editingProduct?.minStock || '5');
  const [unit, setUnit] = useState(editingProduct?.unit || 'unidad');
  const [imagePreview, setImagePreview] = useState<string | null>(editingProduct?.image || null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setName(editingProduct?.name || '');
    setSku(editingProduct?.sku || '');
    setCategoryId(editingProduct?.categoryId || NO_CATEGORY);
    setDescription(editingProduct?.description || '');
    setCostPrice(editingProduct?.costPrice || '');
    setSalePrice(editingProduct?.salePrice || '');
    setMinSalePrice(editingProduct?.minSalePrice ?? '');
    setMaxSalePrice(editingProduct?.maxSalePrice ?? '');
    setMinStock(editingProduct?.minStock || '5');
    setUnit(editingProduct?.unit || 'unidad');
    setImagePreview(editingProduct?.image || null);
    setErrors({});
  }, [isOpen, editingProduct]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!sku.trim()) {
      newErrors.sku = 'El identificador es requerido';
    }

    if (!salePrice || parseFloat(salePrice) <= 0) {
      newErrors.salePrice = 'El precio de venta debe ser mayor a 0';
    }

    const min = minSalePrice === '' ? null : parseFloat(String(minSalePrice));
    const max = maxSalePrice === '' ? null : parseFloat(String(maxSalePrice));
    if (min !== null && max !== null && min > max) {
      newErrors.minSalePrice = 'El precio minimo no puede ser mayor que el maximo';
    }
    if (min !== null && parseFloat(salePrice) < min) {
      newErrors.salePrice = 'El precio de venta queda por debajo del minimo autorizado';
    }
    if (max !== null && parseFloat(salePrice) > max) {
      newErrors.salePrice = 'El precio de venta supera el maximo autorizado';
    }

    if (!minStock || isNaN(parseFloat(minStock))) {
      newErrors.minStock = 'El stock mínimo es requerido';
    } else if (parseFloat(minStock) < 0) {
      newErrors.minStock = 'El stock mínimo no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const data: any = {
        name,
        sku,
        categoryId: categoryId === NO_CATEGORY ? undefined : categoryId,
        salePrice: parseFloat(salePrice),
        minStock: parseFloat(minStock),
        description,
        costPrice: costPrice ? parseFloat(costPrice) : 0,
        minSalePrice: minSalePrice === '' ? null : parseFloat(String(minSalePrice)),
        maxSalePrice: maxSalePrice === '' ? null : parseFloat(String(maxSalePrice)),
        unit,
        image: imagePreview || undefined,
      };

      onSave(data);
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setSku('');
    setCategoryId(NO_CATEGORY);
    setDescription('');
    setCostPrice('');
    setSalePrice('');
    setMinSalePrice('');
    setMaxSalePrice('');
    setMinStock('5');
    setUnit('unidad');
    setImagePreview(null);
    setErrors({});
  };

  const margin = salePrice && costPrice 
    ? (((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(salePrice)) * 100).toFixed(1)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
          <DialogDescription>
            {editingProduct
              ? 'Actualiza los datos del producto'
              : 'Añade un nuevo producto a tu catálogo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Laptop Dell XPS"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku">Identificador *</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="LPTP-DELL-XPS-001"
                className={errors.sku ? 'border-red-500' : ''}
              />
              {errors.sku && <p className="text-xs text-red-500">{errors.sku}</p>}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label htmlFor="unit">Unidad de Medida</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost Price */}
            <div className="space-y-2">
              <Label htmlFor="costPrice">Precio de Compra</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className={errors.costPrice ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">Opcional - por defecto 0</p>
              {errors.costPrice && <p className="text-xs text-red-500">{errors.costPrice}</p>}
            </div>

            {/* Sale Price */}
            <div className="space-y-2">
              <Label htmlFor="salePrice">Precio de Venta *</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                className={errors.salePrice ? 'border-red-500' : ''}
              />
              {errors.salePrice && <p className="text-xs text-red-500">{errors.salePrice}</p>}
            </div>

            {/* Rango autorizado: lo que el backend exige al vender. Vacio = sin limite. */}
            <div className="space-y-2">
              <Label htmlFor="minSalePrice">Precio minimo autorizado</Label>
              <Input
                id="minSalePrice"
                type="number"
                step="0.01"
                value={minSalePrice}
                onChange={(e) => setMinSalePrice(e.target.value)}
                placeholder="Sin limite"
                className={errors.minSalePrice ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Vacio = sin limite. Solo un Gerente puede vender por debajo.
              </p>
              {errors.minSalePrice && <p className="text-xs text-red-500">{errors.minSalePrice}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSalePrice">Precio maximo autorizado</Label>
              <Input
                id="maxSalePrice"
                type="number"
                step="0.01"
                value={maxSalePrice}
                onChange={(e) => setMaxSalePrice(e.target.value)}
                placeholder="Sin limite"
              />
              <p className="text-xs text-muted-foreground">Vacio = sin limite.</p>
            </div>

            {/* Min Stock */}
            <div className="space-y-2">
              <Label htmlFor="minStock">Stock Mínimo *</Label>
              <Input
                id="minStock"
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="5"
                className={errors.minStock ? 'border-red-500' : ''}
              />
              {errors.minStock && <p className="text-xs text-red-500">{errors.minStock}</p>}
            </div>

            {/* Margin Display */}
            <div className="space-y-2">
              <Label>Margen de Ganancia</Label>
              <div className="pt-2 text-lg font-semibold text-green-600">
                {margin}%
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción detallada del producto..."
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagen del Producto</Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition"
                     onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="h-5 w-5" />
                    <p className="text-sm">Haz clic para subir una imagen</p>
                  </div>
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="relative w-24 h-24">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingProduct ? 'Actualizar' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
