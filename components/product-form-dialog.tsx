'use client';

import { useState, useRef, useEffect } from 'react';
import { Package, DollarSign, Boxes, ImageIcon, ToggleRight, Upload, X, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormGrid, FormField } from '@/components/form-layout';

import { CategorySelect } from '@/components/category-select';
import { UnitSelect } from '@/components/unit-select';
interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormDialogProps {
  isOpen: boolean;
  editingProduct?: any;
  categories?: CategoryOption[];
  /** Stock actual del producto en la sucursal (solo al editar). */
  currentStock?: number;
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
    expirationDate?: string | null;
    unit?: string;
    image?: string;
    /** Solo al editar un producto activo o inactivo. */
    status?: 'active' | 'inactive';
  }) => void | Promise<void>;
  onCancel: () => void;
}

const NO_CATEGORY = '__none__';


// Reduce la foto a un maximo de 800 px por lado y la pasa a JPEG: el backend rechaza
// cuerpos de mas de 1 MB y una foto de celular en base64 pesa varios MB.
const compressImage = (file: File, maxSide = 800, quality = 0.8): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('La imagen no es válida'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo procesar la imagen'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

export function ProductFormDialog({ isOpen, editingProduct, categories = [], currentStock, onSave, onCancel }: ProductFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(editingProduct?.name || '');
  const [sku, setSku] = useState(editingProduct?.sku || '');
  const [categoryId, setCategoryId] = useState<string>(editingProduct?.categoryId || NO_CATEGORY);
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [costPrice, setCostPrice] = useState(editingProduct?.costPrice || '');
  const [salePrice, setSalePrice] = useState(editingProduct?.salePrice || '');
  const [targetMargin, setTargetMargin] = useState('30');
  // Vacío = sin límite. No se normaliza a 0: 0 sería "regalar el producto".
  const [minSalePrice, setMinSalePrice] = useState(editingProduct?.minSalePrice ?? '');
  const [maxSalePrice, setMaxSalePrice] = useState(editingProduct?.maxSalePrice ?? '');
  const [minStock, setMinStock] = useState(editingProduct?.minStock || '5');
  const [unit, setUnit] = useState(editingProduct?.unit || 'unidad');
  const [initialStock, setInitialStock] = useState('');
  const [expirationDate, setExpirationDate] = useState<string>(editingProduct?.expirationDate ?? '');
  const [imagePreview, setImagePreview] = useState<string | null>(editingProduct?.imageUrl || null);
  // Estado activo/inactivo: solo se cambia al editar, y no aplica a productos
  // pendientes de precio (pending_pricing).
  const [isActive, setIsActive] = useState<boolean>(editingProduct?.status !== 'inactive');
  const canEditStatus =
    Boolean(editingProduct) &&
    (editingProduct?.status === 'active' || editingProduct?.status === 'inactive');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setExpirationDate(editingProduct?.expirationDate ?? '');
    setInitialStock('');
    setImagePreview(editingProduct?.imageUrl || null);
    setIsActive(editingProduct?.status !== 'inactive');
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'La imagen no puede pesar m\u00e1s de 2 MB.' }));
      e.target.value = '';
      return;
    }
    try {
      setImagePreview(await compressImage(file));
      setErrors((prev) => {
        const { image: _ignored, ...rest } = prev;
        return rest;
      });
    } catch {
      setErrors((prev) => ({ ...prev, image: 'No se pudo cargar la imagen. Prueba con otra.' }));
    }
  };
  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    if (isSubmitting) return;

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
        image: imagePreview && imagePreview !== editingProduct?.imageUrl ? imagePreview : undefined,
        expirationDate: expirationDate === '' ? null : expirationDate,
        initialStock: !editingProduct && initialStock !== '' ? parseFloat(initialStock) : undefined,
        status: canEditStatus
          ? (isActive ? 'active' : 'inactive')
          : editingProduct?.status === 'pending_pricing'
            ? 'active'
            : undefined,
      };

      setIsSubmitting(true);
      try {
        await onSave(data);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const margin = salePrice && costPrice
    ? (((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(salePrice)) * 100).toFixed(1)
    : 0;

  // Precio sugerido: costo / (1 - margen objetivo), redondeado hacia arriba a Bs 0.50
  // y ajustado al rango autorizado (minimo/maximo) si esta definido.
  const suggestedPrice = (() => {
    const cost = parseFloat(String(costPrice));
    const m = parseFloat(String(targetMargin));
    if (!(cost > 0) || isNaN(m) || m < 0 || m >= 100) return null;
    let price = Math.ceil((cost / (1 - m / 100)) * 2) / 2;
    const min = minSalePrice === '' ? null : parseFloat(String(minSalePrice));
    const max = maxSalePrice === '' ? null : parseFloat(String(maxSalePrice));
    if (min !== null && !isNaN(min) && price < min) price = min;
    if (max !== null && !isNaN(max) && price > max) price = max;
    return price;
  })();

  const salePriceNum = parseFloat(String(salePrice));
  const costPriceNum = parseFloat(String(costPrice));
  const hasProfitData = salePriceNum > 0 && costPriceNum > 0;
  const profitPerUnit = hasProfitData ? salePriceNum - costPriceNum : 0;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      icon={Package}
      title={editingProduct ? 'Editar Producto' : 'Agregar producto'}
      description={editingProduct ? 'Actualiza los datos del producto.' : 'Añade un nuevo producto a tu catálogo.'}
      size="xl"
      submitLabel={editingProduct ? 'Actualizar' : 'Agregar producto'}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
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
            <CategorySelect id="category" value={categoryId} onChange={setCategoryId} categories={categories} noneValue={NO_CATEGORY} />
          </FormField>

          <FormField label="Unidad de medida" htmlFor="unit">
            <UnitSelect id="unit" value={unit} onChange={setUnit} />
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
              Vacío = sin límite. Solo un Propietario puede vender por debajo.
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

          {/* Ganancia y precio sugerido */}
          <div className="rounded-lg border border-green-200 bg-green-50/60 p-4 sm:col-span-2 dark:border-green-900 dark:bg-green-950/20">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              Ganancia y precio sugerido
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="targetMargin" className="text-xs font-medium text-muted-foreground">
                  Ganancia deseada (%)
                </label>
                <div className="relative mt-1">
                  <Input
                    id="targetMargin"
                    type="number"
                    step="1"
                    min="0"
                    max="99"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(e.target.value)}
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  De cada Bs 100 que vendas, cuánto quieres que sea ganancia.
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Precio sugerido</p>
                {suggestedPrice !== null ? (
                  <>
                    <p className="mt-1 text-2xl font-bold">Bs {suggestedPrice.toFixed(2)}</p>
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-green-700 underline-offset-2 hover:underline dark:text-green-400"
                      onClick={() => setSalePrice(suggestedPrice.toFixed(2))}
                    >
                      Usar este precio
                    </button>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Escribe el precio de compra para ver la sugerencia.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Tu ganancia con el precio actual</p>
                {hasProfitData ? (
                  <>
                    <p className={profitPerUnit >= 0 ? 'mt-1 text-2xl font-bold text-green-600' : 'mt-1 text-2xl font-bold text-red-600'}>
                      {margin}%
                    </p>
                    <p className={profitPerUnit >= 0 ? 'text-xs text-green-700 dark:text-green-400' : 'text-xs text-red-600'}>
                      {profitPerUnit >= 0 ? 'Ganas' : 'Pierdes'} Bs {Math.abs(profitPerUnit).toFixed(2)} por unidad
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Completa compra y venta para verla.</p>
                )}
              </div>
            </div>
          </div>
        </FormGrid>
      </FormSection>

      <FormSection icon={Boxes} title="Inventario">
        <FormGrid>
          {editingProduct && (
            <div className="rounded-lg border bg-muted/40 p-3 sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">Stock actual en esta sucursal</p>
              <p className="mt-1 text-2xl font-bold">
                {currentStock ?? 0}
                <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Para aumentar la cantidad registra un ingreso en Nuevo Ingreso.
              </p>
            </div>
          )}

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

          <FormField label="Fecha de vencimiento" htmlFor="expirationDate">
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
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

      {canEditStatus && (
        <FormSection icon={ToggleRight} title="Estado">
          <FormField label="Estado del producto" htmlFor="product-status">
            <div className="flex items-center gap-3 pt-1">
              <Switch id="product-status" checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm text-muted-foreground">
                {isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </FormField>
        </FormSection>
      )}

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
                    <p className="text-sm">Haz clic para subir una imagen (m&aacute;x. 2 MB)</p>
                    {errors.image && <p className="text-xs text-red-500">{errors.image}</p>}
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
