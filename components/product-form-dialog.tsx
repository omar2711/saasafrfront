'use client';

import { useState, useRef, useEffect } from 'react';
import { Package, DollarSign, Boxes, ImageIcon, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormGrid, FormField } from '@/components/form-layout';

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
    initialStock?: number;
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
  // Vacío = sin límite. No se normaliza a 0: 0 sería "regalar el producto".
  const [minSalePrice, setMinSalePrice] = useState(editingProduct?.minSalePrice ?? '');
  const [maxSalePrice, setMaxSalePrice] = useState(editingProduct?.maxSalePrice ?? '');
  const [minStock, setMinStock] = useState(editingProduct?.minStock || '5');
  const [unit, setUnit] = useState(editingProduct?.unit || 'unidad');
  const [initialStock, setInitialStock] = useState('');
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
    setInitialStock('');
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
      newErrors.minSalePrice = 'El precio mínimo no puede ser mayor que el máximo';
    }
    if (min !== null && parseFloat(salePrice) < min) {
      newErrors.salePrice = 'El precio de venta queda por debajo del mínimo autorizado';
    }
    if (max !== null && parseFloat(salePrice) > max) {
      newErrors.salePrice = 'El precio de venta supera el máximo autorizado';
    }

    if (!minStock || isNaN(parseFloat(minStock))) {
      newErrors.minStock = 'El stock mínimo es requerido';
    } else if (parseFloat(minStock) < 0) {
      newErrors.minStock = 'El stock mínimo no puede ser negativo';
    }

    if (!editingProduct && initialStock !== '' && (isNaN(parseFloat(initialStock)) || parseFloat(initialStock) < 0)) {
      newErrors.initialStock = 'El stock inicial no puede ser negativo';
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

  const handleSubmit = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();

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
        initialStock: !editingProduct && initialStock !== '' ? parseFloat(initialStock) : undefined,
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
    setInitialStock('');
    setImagePreview(null);
    setErrors({});
  };

  const margin = salePrice && costPrice
    ? (((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(salePrice)) * 100).toFixed(1)
    : 0;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      icon={Package}
      title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
      description={editingProduct ? 'Actualiza los datos del producto.' : 'Añade un nuevo producto a tu catálogo.'}
      size="xl"
      submitLabel={editingProduct ? 'Actualizar' : 'Crear producto'}
      onSubmit={handleSubmit}
      error={hasErrors ? 'Revisa los campos marcados en rojo.' : null}
    >
      <FormSection icon={Package} title="Datos del producto">
        <FormGrid>
          <FormField label="Nombre del producto" htmlFor="name" required>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Laptop Dell XPS"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </FormField>

          <FormField label="Identificador" htmlFor="sku" required>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="LPTP-DELL-XPS-001"
              className={errors.sku ? 'border-red-500' : ''}
            />
            {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku}</p>}
          </FormField>

          <FormField label="Categoría" htmlFor="category">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Unidad de medida" htmlFor="unit">
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection icon={DollarSign} title="Precios">
        <FormGrid>
          <FormField label="Precio de compra" htmlFor="costPrice">
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              className={errors.costPrice ? 'border-red-500' : ''}
            />
            <p className="mt-1 text-xs text-muted-foreground">Opcional - por defecto 0</p>
            {errors.costPrice && <p className="mt-1 text-xs text-red-500">{errors.costPrice}</p>}
          </FormField>

          <FormField label="Precio de venta" htmlFor="salePrice" required>
            <Input
              id="salePrice"
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              className={errors.salePrice ? 'border-red-500' : ''}
            />
            {errors.salePrice && <p className="mt-1 text-xs text-red-500">{errors.salePrice}</p>}
          </FormField>

          {/* Rango autorizado: lo que el backend exige al vender. Vacío = sin límite. */}
          <FormField label="Precio mínimo autorizado" htmlFor="minSalePrice">
            <Input
              id="minSalePrice"
              type="number"
              step="0.01"
              value={minSalePrice}
              onChange={(e) => setMinSalePrice(e.target.value)}
              placeholder="Sin límite"
              className={errors.minSalePrice ? 'border-red-500' : ''}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Vacío = sin límite. Solo un Gerente puede vender por debajo.
            </p>
            {errors.minSalePrice && <p className="mt-1 text-xs text-red-500">{errors.minSalePrice}</p>}
          </FormField>

          <FormField label="Precio máximo autorizado" htmlFor="maxSalePrice">
            <Input
              id="maxSalePrice"
              type="number"
              step="0.01"
              value={maxSalePrice}
              onChange={(e) => setMaxSalePrice(e.target.value)}
              placeholder="Sin límite"
            />
            <p className="mt-1 text-xs text-muted-foreground">Vacío = sin límite.</p>
          </FormField>

          <FormField label="Margen de ganancia">
            <div className="pt-2 text-lg font-semibold text-green-600">{margin}%</div>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection icon={Boxes} title="Inventario">
        <FormGrid>
          <FormField label="Stock mínimo" htmlFor="minStock" required>
            <Input
              id="minStock"
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="5"
              className={errors.minStock ? 'border-red-500' : ''}
            />
            {errors.minStock && <p className="mt-1 text-xs text-red-500">{errors.minStock}</p>}
          </FormField>

          {/* Stock inicial (solo al crear) */}
          {!editingProduct && (
            <FormField label="Stock inicial" htmlFor="initialStock">
              <Input
                id="initialStock"
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                placeholder="0"
                className={errors.initialStock ? 'border-red-500' : ''}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Opcional - cantidad con la que ingresa a esta sucursal
              </p>
              {errors.initialStock && <p className="mt-1 text-xs text-red-500">{errors.initialStock}</p>}
            </FormField>
          )}
        </FormGrid>
      </FormSection>

      <FormSection icon={ImageIcon} title="Descripción e imagen">
        <div className="space-y-4">
          <FormField label="Descripción (opcional)" htmlFor="description">
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción detallada del producto..."
              rows={3}
            />
          </FormField>

          <FormField label="Imagen del producto (opcional)">
            <div className="flex gap-4">
              <div className="flex-1">
                <div
                  className="cursor-pointer rounded-lg border-2 border-dashed p-4 transition hover:bg-muted/50"
                  onClick={() => fileInputRef.current?.click()}
                >
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

              {imagePreview && (
                <div className="relative h-24 w-24">
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Quitar imagen"
                    onClick={handleRemoveImage}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </FormField>
        </div>
      </FormSection>
    </FormDialog>
  );
}
