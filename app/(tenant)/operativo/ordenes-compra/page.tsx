'use client';

import { getBaseCurrency } from '@/lib/format';
import { FormDialog } from '@/components/form-dialog';
import { FormSection, FormGrid, FormField } from '@/components/form-layout';
import { ClipboardList as OrderIcon, Boxes as ItemsIcon, Calculator as SummaryIcon } from 'lucide-react';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, MoreHorizontal, Eye, Trash2, Upload, X, Package, FileDown, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PurchaseOrderDetailDialog } from '@/components/purchase-order-detail-dialog';
import { purchaseOrdersApi, type PurchaseOrderDto, type POStatus } from '@/lib/api/purchase-orders';
import { suppliersApi, type SupplierDto } from '@/lib/api/suppliers';
import { productsApi, type ProductDto } from '@/lib/api/products';
import { categoriesApi, type CategoryDto } from '@/lib/api/categories';
import { CategorySelect } from '@/components/category-select';
import { UnitSelect } from '@/components/unit-select';
import { PO_STATUSES, poStatusLabels, poStatusMap } from '@/lib/data/purchase-order-status';
import { useOrganization } from '@/contexts/organization-context';
import { formatDate } from '@/lib/format';
import { exportPurchaseOrderPdf } from '@/lib/pdf/purchase-order-pdf';

const NO_CATEGORY = '__none__';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ');
const tokensOf = (s: string) => normalize(s).split(/\s+/).filter(w => w.length >= 3);

// Reglas de apoyo: palabra del producto -> unidad y categoria sugeridas.
// `hints` busca una categoria existente cuyo nombre contenga ese texto; si no hay,
// se sugiere crear `category`. Agrega o ajusta reglas segun tu rubro.
const STOPWORDS = new Set(['para', 'con', 'sin', 'del', 'los', 'las', 'una', 'por', 'que']);
const stem = (w: string) => w.replace(/(es|s)$/, '');

interface KeywordRule {
  words: string[];
  unit: string;
  category: string;
  hints: string[];
}

const KEYWORD_RULES: KeywordRule[] = [
  { words: ['zapato', 'zapatilla', 'bota', 'botin', 'sandalia', 'chinela', 'pantufla', 'tenis'], unit: 'par', category: 'Calzado', hints: ['calzad', 'zapat'] },
  { words: ['media', 'calcetin', 'guante'], unit: 'par', category: 'Ropa y accesorios', hints: ['ropa', 'vestim', 'accesor'] },
  { words: ['polera', 'camisa', 'pantalon', 'chamarra', 'vestido', 'falda', 'short', 'buzo', 'chompa', 'casaca', 'jean'], unit: 'unidad', category: 'Ropa', hints: ['ropa', 'vestim', 'textil'] },
  { words: ['gomita', 'caramelo', 'chocolate', 'chicle', 'dulce', 'golosina', 'paleta', 'snack', 'chizito', 'confite'], unit: 'bolsa', category: 'Dulces y golosinas', hints: ['dulc', 'golos', 'confit', 'snack', 'abarrot', 'aliment'] },
  { words: ['galleta', 'fideo', 'cereal', 'avena', 'panal'], unit: 'paquete', category: 'Abarrotes', hints: ['abarrot', 'aliment', 'galleta'] },
  { words: ['gaseosa', 'refresco', 'agua', 'cerveza', 'vino', 'singani', 'energizante'], unit: 'botella', category: 'Bebidas', hints: ['bebid', 'licor'] },
  { words: ['leche', 'yogur', 'queso', 'mantequilla'], unit: 'litro', category: 'Lácteos', hints: ['lact', 'aliment', 'abarrot'] },
  { words: ['aceite', 'vinagre', 'jugo'], unit: 'litro', category: 'Abarrotes', hints: ['abarrot', 'aliment', 'bebid'] },
  { words: ['arroz', 'azucar', 'harina', 'lenteja', 'frijol', 'maiz', 'trigo', 'quinua', 'chuno', 'sal'], unit: 'kg', category: 'Abarrotes', hints: ['abarrot', 'aliment'] },
  { words: ['papa', 'cebolla', 'tomate', 'zanahoria', 'manzana', 'platano', 'naranja', 'limon', 'verdura', 'fruta'], unit: 'kg', category: 'Frutas y verduras', hints: ['fruta', 'verdur', 'abarrot', 'aliment'] },
  { words: ['carne', 'pollo', 'pescado', 'chorizo', 'salchicha', 'jamon'], unit: 'kg', category: 'Carnes y embutidos', hints: ['carne', 'embut', 'aliment'] },
  { words: ['huevo'], unit: 'docena', category: 'Huevos y lácteos', hints: ['huev', 'lact', 'aliment', 'abarrot'] },
  { words: ['pan', 'torta', 'pastel', 'empanada'], unit: 'unidad', category: 'Panadería', hints: ['panader', 'pan', 'reposter'] },
  { words: ['lamina', 'calamina', 'plancha', 'tablero', 'madera', 'ladrillo', 'teja'], unit: 'unidad', category: 'Ferretería y construcción', hints: ['ferret', 'construc', 'material'] },
  { words: ['cemento', 'yeso', 'cal', 'arena', 'grava'], unit: 'bolsa', category: 'Ferretería y construcción', hints: ['ferret', 'construc', 'material'] },
  { words: ['clavo', 'tornillo', 'perno', 'tuerca', 'remache'], unit: 'caja', category: 'Ferretería y construcción', hints: ['ferret', 'construc', 'material'] },
  { words: ['pintura', 'barniz', 'esmalte', 'thinner'], unit: 'galón', category: 'Pinturas', hints: ['pintur', 'ferret'] },
  { words: ['cable', 'alambre'], unit: 'metro', category: 'Electricidad', hints: ['electr', 'cable', 'accesor'] },
  { words: ['mouse', 'teclado', 'cargador', 'audifono', 'parlante', 'celular', 'monitor', 'laptop', 'tablet', 'pendrive'], unit: 'unidad', category: 'Electrónicos', hints: ['electr', 'tecnolog', 'perif', 'accesor'] },
  { words: ['cuaderno', 'lapiz', 'lapicero', 'boligrafo', 'marcador', 'folder', 'carpeta', 'tijera', 'regla'], unit: 'unidad', category: 'Papelería', hints: ['papel', 'escolar', 'oficina'] },
  { words: ['resma', 'hoja', 'sobre'], unit: 'paquete', category: 'Papelería', hints: ['papel', 'escolar', 'oficina'] },
  { words: ['lavandina', 'cloro', 'desinfectante', 'suavizante'], unit: 'litro', category: 'Limpieza', hints: ['limpie', 'aseo', 'hogar'] },
  { words: ['detergente', 'escoba', 'trapeador', 'esponja', 'bolsa'], unit: 'unidad', category: 'Limpieza', hints: ['limpie', 'aseo', 'hogar'] },
  { words: ['shampoo', 'jabon', 'crema', 'cepillo', 'desodorante', 'perfume', 'maquillaje', 'labial', 'tinte'], unit: 'unidad', category: 'Higiene y belleza', hints: ['higien', 'belleza', 'cuidado', 'cosmet'] },
  { words: ['pastilla', 'jarabe', 'vitamina', 'analgesico', 'antibiotico'], unit: 'caja', category: 'Farmacia', hints: ['farmac', 'medic', 'salud'] },
  { words: ['juguete', 'muneca', 'pelota', 'rompecabeza', 'peluche'], unit: 'unidad', category: 'Juguetes', hints: ['jugue', 'infantil'] },
  { words: ['vaso', 'plato', 'taza', 'olla', 'cuchara', 'tenedor', 'cuchillo', 'sarten'], unit: 'unidad', category: 'Hogar y cocina', hints: ['hogar', 'cocina', 'menaj'] },
  { words: ['tela', 'cinta', 'hilo', 'elastico'], unit: 'metro', category: 'Mercería', hints: ['merc', 'textil', 'tela'] },
];

interface ItemSuggestion {
  categoryId?: string;
  newCategoryName?: string;
  unit?: string;
}

// 1) Producto del catalogo con mas palabras en comun (su categoria y unidad).
// 2) Para lo que falte, las reglas de palabras clave de arriba.
function suggestForName(
  name: string,
  products: ProductDto[],
  cats: { id: string; name: string }[],
  excludeId?: string,
): ItemSuggestion | null {
  const tokens = tokensOf(name).filter(t => !STOPWORDS.has(t));
  if (tokens.length === 0) return null;
  const stems = tokens.map(stem);

  let best: ProductDto | null = null;
  let bestScore = 0;
  for (const p of products) {
    if (p.id === excludeId) continue;
    const ps = new Set(tokensOf(p.name).map(stem));
    const score = stems.filter(t => ps.has(t)).length;
    if (score > bestScore) { best = p; bestScore = score; }
  }

  const result: ItemSuggestion = {};
  if (best) {
    const b = best;
    if (b.categoryId && cats.some(c => c.id === b.categoryId)) result.categoryId = b.categoryId;
    if (b.unit) result.unit = b.unit;
  }

  if (!result.unit || !result.categoryId) {
    const rule = KEYWORD_RULES.find(r => r.words.some(w => stems.includes(stem(w))));
    if (rule) {
      if (!result.unit) result.unit = rule.unit;
      if (!result.categoryId) {
        const found = cats.find(c => rule.hints.some(h => normalize(c.name).includes(h)));
        if (found) result.categoryId = found.id;
        else result.newCategoryName = rule.category;
      }
    }
  }
  return result.categoryId || result.newCategoryName || result.unit ? result : null;
}
interface OrderItemFormData {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  category: string;
  imagePreview: string | null;
  unit: string;
  isNewProduct: boolean;
  expirationDate: string;
  categoryId: string;
}

interface OrderFormData {
  supplierId: string;
  branchId: string;
  items: OrderItemFormData[];
  notes: string;
}

const emptyItemData: OrderItemFormData = {
  productId: '',
  productName: '',
  sku: '',
  quantity: 1,
  unitPrice: 0,
  category: '',
  imagePreview: null,
  unit: '',
  isNewProduct: false,
  expirationDate: '',
  categoryId: NO_CATEGORY,
};

// Fecha local de hoy (YYYY-MM-DD), minimo del campo de vencimiento.
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};


export default function PurchaseOrdersPage() {
  const { currentBranch, branches } = useOrganization();
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categoryList, setCategoryList] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderDto | null>(null);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrderDto | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>({
    supplierId: '',
    branchId: currentBranch?.id || '',
    items: [{ ...emptyItemData }],
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    Promise.all([
      purchaseOrdersApi.list(),
      suppliersApi.list(),
      productsApi.list(),
      categoriesApi.list().catch(() => [] as CategoryDto[]),
    ]).then(([ords, supps, prods, cats]) => {
      setOrders(ords);
      setSuppliers(supps);
      setProducts(prods);
      setCategoryList(cats.filter(c => c.status === 'active').map(c => ({ id: c.id, name: c.name })));
    }).catch(() => setError('Error al cargar datos'))
      .finally(() => setIsLoading(false));
  }, []);

  // Sync branchId when currentBranch loads asynchronously
  useEffect(() => {
    if (currentBranch?.id && !formData.branchId) {
      setFormData(prev => ({ ...prev, branchId: currentBranch.id }));
    }
  }, [currentBranch?.id]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: getBaseCurrency(), minimumFractionDigits: 2 }).format(value);

  // Devolvia el UUID crudo cuando el proveedor ya no estaba en la lista (borrado
  // o inactivo): en la tabla se veia un identificador en vez de un nombre.
  const getSupplierName = (id: string) =>
    suppliers.find(s => s.id === id)?.name || 'Proveedor eliminado';

  // No se puede encargar a un proveedor dado de baja. Los inactivos siguen
  // apareciendo en las ordenes ya creadas, pero no en el selector de una nueva.
  const selectableSuppliers = suppliers.filter(
    s => s.status === 'active' || s.id === formData.supplierId,
  );

  const getBranchName = (id: string) =>
    branches.find(b => b.id === id)?.name || id;

  const filteredOrders = orders.filter(order => {
    const matchSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSupplierName(order.supplierId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const calculateSubtotal = () =>
    formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const calculateTotal = () => calculateSubtotal();

  const handleCreate = () => {
    setFormData({
      supplierId: '',
      branchId: currentBranch?.id ?? '',
      items: [{ ...emptyItemData }],
      notes: '',
    });
    setError(null);
    setIsCreateOpen(true);
  };

  const handleAddItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { ...emptyItemData }] }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItemFormData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const categoryNameOf = (id: string) =>
    id === NO_CATEGORY ? '' : (categoryList.find(c => c.id === id)?.name ?? '');

  const applySuggestion = async (index: number, s: ItemSuggestion) => {
    let categoryId = s.categoryId;
    if (!categoryId && s.newCategoryName) {
      const name = s.newCategoryName;
      const existing = categoryList.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        categoryId = existing.id;
      } else {
        try {
          const made = await categoriesApi.create({ name });
          setCategoryList(prev => [...prev, { id: made.id, name: made.name }]);
          categoryId = made.id;
        } catch {
          setError('No se pudo crear la categoría sugerida');
        }
      }
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((it, i) =>
        i === index ? { ...it, categoryId: categoryId ?? it.categoryId, unit: s.unit ?? it.unit } : it,
      ),
    }));
  };
  const handleProductSelect = (index: number, productId: string) => {
    if (productId === '__new__') {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, i) =>
          i === index ? {
            ...item,
            productId: '',
            productName: '',
            sku: '',
            category: '',
            categoryId: NO_CATEGORY,
            unit: 'unidad',
            isNewProduct: true,
          } : item
        ),
      }));
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, i) =>
          i === index ? {
            ...item,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unitPrice: product.costPrice ?? 0,
            category: product.category ?? '',
            unit: product.unit ?? '',
            categoryId: product.categoryId ?? NO_CATEGORY,
            isNewProduct: false,
          } : item
        ),
      }));
    }
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleItemChange(index, 'imagePreview', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    handleItemChange(index, 'imagePreview', null);
    if (fileInputRefs.current[index]) fileInputRefs.current[index]!.value = '';
  };

  const handleSubmitCreate = async () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const diagErrors: string[] = [];
    if (!UUID_RE.test(formData.branchId)) diagErrors.push(`branchId="${formData.branchId}"`);
    if (!UUID_RE.test(formData.supplierId)) diagErrors.push(`supplierId="${formData.supplierId}"`);
    formData.items.forEach((item, i) => {
      if (item.isNewProduct) {
        if (!item.productName.trim()) diagErrors.push(`items[${i}].productName es requerido`);
        if (!item.sku.trim()) diagErrors.push(`items[${i}].sku es requerido`);
      } else if (!UUID_RE.test(item.productId)) {
        diagErrors.push(`items[${i}].productId="${item.productId}"`);
      }
    });
    if (diagErrors.length > 0) {
      setError('Valores inválidos: ' + diagErrors.join(', '));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const orderNumber = `OC-${Date.now().toString().slice(-6)}`;
      const payload = {
        branchId: formData.branchId,
        supplierId: formData.supplierId,
        orderNumber,
        notes: formData.notes || undefined,
        items: formData.items.map(item =>
          item.isNewProduct
            ? {
                productName: item.productName,
                sku: item.sku,
                category: categoryNameOf(item.categoryId) || undefined,
                unit: item.unit || undefined,
                image: item.imagePreview || undefined,
                quantity: item.quantity,
                unitCost: item.unitPrice,
                expirationDate: item.expirationDate || undefined,
              }
            : {
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitPrice,
                expirationDate: item.expirationDate || undefined,
              }
        ),
      };
      const created = await purchaseOrdersApi.create(payload);
      setOrders(prev => [created, ...prev]);
      setProducts(await productsApi.list());
      setIsCreateOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;
    try {
      // No DELETE endpoint for POs; mark as canceled instead
      const updated = await purchaseOrdersApi.update(selectedOrder.id, { status: 'canceled' });
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cancelar orden');
    }
    setIsDeleteOpen(false);
    setSelectedOrder(null);
  };

  const handleStatusChange = async (order: PurchaseOrderDto, newStatus: POStatus) => {
    try {
      if (newStatus === 'received') {
        const updated = await purchaseOrdersApi.receive(order.id);
        setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
      } else {
        const updated = await purchaseOrdersApi.update(order.id, { status: newStatus });
        setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar estado');
    }
  };

  // La lista no trae los items: hay que pedir la orden completa para el detalle.
  const handleExportPdf = async (order: PurchaseOrderDto) => {
    try {
      const full = order.items && order.items.length > 0 ? order : await purchaseOrdersApi.get(order.id);
      exportPurchaseOrderPdf(full, getSupplierName(order.supplierId));
    } catch {
      setError('No se pudo exportar el PDF');
    }
  };

  const openDetail = async (order: PurchaseOrderDto) => {
    setIsViewOpen(true);
    setIsDetailLoading(true);
    setDetailOrder(null);
    try {
      setDetailOrder(await purchaseOrdersApi.get(order.id));
    } catch {
      setError('No se pudo cargar el detalle de la orden');
      setIsViewOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const isFormValid = () =>
    formData.supplierId &&
    formData.branchId &&
    formData.items.every(item =>
      (item.isNewProduct ? item.productName.trim() && item.sku.trim() : item.productId) &&
      item.quantity > 0 &&
      item.unitPrice > 0
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Cargando ingresos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Ingreso" description="Registra los ingresos de mercadería de tus proveedores">
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden
        </Button>
      </PageHeader>

      {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="w-full">

        <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero de orden o proveedor..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {PO_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{poStatusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium font-mono">{order.orderNumber}</TableCell>
                  <TableCell>{order.supplierName ?? getSupplierName(order.supplierId)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.branchName ?? getBranchName(order.branchId)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {order.firstProductImage ? (
                        <img
                          src={order.firstProductImage}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                          {(order.firstProductName ?? '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{order.firstProductName ?? 'Sin producto'}</span>
                        {(order.itemCount ?? 0) > 1 && (
                          <span className="text-xs text-muted-foreground">+{(order.itemCount ?? 0) - 1} más</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {order.itemCount ?? 0} {(order.itemCount ?? 0) === 1 ? 'producto' : 'productos'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(order.totalCost)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={poStatusMap[order.status]}
                      label={poStatusLabels[order.status]}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExportPdf(order)}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Exportar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDetail(order)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                        {order.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(order, 'pending')}>
                            Enviar a aprobacion
                          </DropdownMenuItem>
                        )}
                        {order.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(order, 'approved')}>
                            Aprobar
                          </DropdownMenuItem>
                        )}
                        {order.status === 'approved' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(order, 'received')}>
                            Marcar como recibida
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {order.status === 'draft' && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { setSelectedOrder(order); setIsDeleteOpen(true); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                        {['pending', 'approved'].includes(order.status) && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleStatusChange(order, 'canceled')}
                          >
                            Cancelar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No hay ingresos registrados</h3>
          <p className="text-muted-foreground mt-1">
            {searchTerm || statusFilter !== 'all'
              ? 'No se encontraron ordenes con los filtros actuales.'
              : 'Crea tu primera orden de compra.'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          )}
        </div>
      )}
        </div>

      </div>

      {/* Create Dialog */}
      <FormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        icon={OrderIcon}
        title="Nueva Orden de Compra"
        description="Completa los datos para crear una nueva orden de compra."
        size="xl"
        submitLabel="Crear orden"
        onSubmit={handleSubmitCreate}
        isSubmitting={isSubmitting}
        submitDisabled={!isFormValid()}
        error={error}
      >
        <FormSection icon={OrderIcon} title="Proveedor y destino">
          <FormGrid>
            <FormField label="Proveedor" htmlFor="supplier" required>
              <Select value={formData.supplierId} onValueChange={(v) => setFormData(prev => ({ ...prev, supplierId: v }))}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {selectableSuppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex flex-col">
                        <span>{s.name}</span>
                        {s.company && <span className="text-xs text-muted-foreground">{s.company}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectableSuppliers.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No hay proveedores activos. Crea uno en Proveedores antes de encargar.
                </p>
              )}
            </FormField>
            <FormField label="Sucursal de destino" htmlFor="branch" required>
              <Select value={formData.branchId} onValueChange={(v) => setFormData(prev => ({ ...prev, branchId: v }))}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.filter(b => b.isActive).map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex flex-col">
                        <span>{b.name}</span>
                        {b.address && <span className="text-xs text-muted-foreground">{b.address}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection icon={ItemsIcon} title="Productos">
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <Card key={index} className="relative">
                <CardContent className="p-4">
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar producto"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="grid gap-4">
                    <FormGrid>
                      <FormField label="Producto" required>
                        <Select value={item.isNewProduct ? '__new__' : item.productId} onValueChange={(v) => handleProductSelect(index, v)}>
                          <SelectTrigger className={!item.productId && !item.isNewProduct ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Seleccionar producto del catálogo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__new__">
                              <span className="font-medium text-primary">+ Crear producto nuevo</span>
                            </SelectItem>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-2">
                                  <span>{p.name}</span>
                                  <span className="text-xs text-muted-foreground">({p.sku})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!item.productId && !item.isNewProduct && (
                          <p className="mt-1 text-xs text-destructive">Selecciona un producto del catálogo</p>
                        )}
                      </FormField>
                      {item.isNewProduct ? (
                        <FormField label="Nombre del producto" required>
                          <Input
                            value={item.productName}
                            onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                            placeholder="Nombre del producto nuevo"
                          />
                        </FormField>
                      ) : (
                        <FormField label="Identificador">
                          <Input
                            value={item.sku}
                            readOnly
                            placeholder="Se completa al seleccionar"
                            className="bg-muted/50 font-mono text-sm"
                          />
                        </FormField>
                      )}
                    </FormGrid>
                    {item.isNewProduct && (
                      <p className="text-xs text-muted-foreground">
                        Este producto se creará como "pendiente de precio" en el inventario. Podrás definir su precio de venta más tarde desde Productos.
                      </p>
                    )}

                    {(() => {
                      const suggestion =
                        item.productName.trim().length >= 3
                          ? suggestForName(item.productName, products, categoryList, item.productId || undefined)
                          : null;
                      if (!suggestion) return null;
                      const currentCat = categoryNameOf(item.categoryId).toLowerCase();
                      const sugCat = suggestion.categoryId
                        ? categoryNameOf(suggestion.categoryId)
                        : (suggestion.newCategoryName ?? '');
                      const catDiffers = !!sugCat && sugCat.toLowerCase() !== currentCat;
                      const unitDiffers = !!suggestion.unit && suggestion.unit !== item.unit;
                      if (!catDiffers && !unitDiffers) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span className="text-muted-foreground">
                            Sugerencia:{' '}
                            {catDiffers && (
                              <>
                                categoría <strong className="text-foreground">{sugCat}</strong>
                                {!suggestion.categoryId && ' (nueva)'}
                              </>
                            )}
                            {catDiffers && unitDiffers && ' · '}
                            {unitDiffers && <>unidad <strong className="text-foreground">{suggestion.unit}</strong></>}
                          </span>
                          <button
                            type="button"
                            className="font-medium text-primary underline-offset-2 hover:underline"
                            onClick={() => void applySuggestion(index, suggestion)}
                          >
                            Aplicar
                          </button>
                        </div>
                      );
                    })()}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <FormField label="Unidad de medida">
                        <UnitSelect
                          value={item.unit}
                          onChange={(v) => handleItemChange(index, 'unit', v)}
                        />
                      </FormField>
                      <FormField label="Categoría">
                        <CategorySelect
                          value={item.categoryId}
                          onChange={(v) => handleItemChange(index, 'categoryId', v)}
                          categories={categoryList}
                          noneValue={NO_CATEGORY}
                          onCreated={(c) => setCategoryList(prev => (prev.some(x => x.id === c.id) ? prev : [...prev, c]))}
                        />
                      </FormField>
                      {item.isNewProduct && (
                        <FormField label="Identificador" required>
                          <Input
                            value={item.sku}
                            onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                            placeholder="SKU-001"
                            className="font-mono"
                          />
                        </FormField>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField label="Precio de compra" required>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </FormField>
                      <FormField label="Cantidad" required>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </FormField>
                      <FormField label="Fecha de vencimiento">
                        <Input
                          type="date"
                          min={localToday()}
                          value={item.expirationDate}
                          onChange={(e) => handleItemChange(index, 'expirationDate', e.target.value)}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Opcional. Déjala vacía si no vence.</p>
                      </FormField>
                    </div>

                    <FormField label="Imagen del producto (opcional)">
                      <div className="flex items-start gap-4">
                        {item.imagePreview ? (
                          <div className="relative">
                            <img src={item.imagePreview} alt="Preview" className="h-24 w-24 rounded-lg border object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              aria-label="Quitar imagen"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => handleRemoveImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors hover:bg-muted/50">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="mt-1 text-xs text-muted-foreground">Subir</span>
                            <input
                              ref={(el) => { fileInputRefs.current[index] = el; }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(index, e)}
                            />
                          </label>
                        )}
                      </div>
                    </FormField>

                    <div className="flex justify-end border-t pt-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Subtotal: </span>
                        <span className="font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar producto
            </Button>
          </div>
        </FormSection>

        <FormSection icon={SummaryIcon} title="Resumen de la orden">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </FormSection>
      </FormDialog>

      <PurchaseOrderDetailDialog
        isOpen={isViewOpen}
        order={detailOrder}
        isLoading={isDetailLoading}
        onClose={() => { setIsViewOpen(false); setDetailOrder(null); }}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar orden de compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de que deseas cancelar la orden <strong>{selectedOrder?.orderNumber}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar Orden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
