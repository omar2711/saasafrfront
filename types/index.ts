// User & Auth Types
export type UserRole = 
  | 'super_admin'
  | 'owner'
  | 'admin'
  | 'manager'
  | 'seller'
  | 'warehouse'
  | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  organizationId?: string;
  branchIds?: string[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

// Organization Types
export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  ownerId: string;
  maxUsers: number;
  maxBranches: number;
  features: string[];
  createdAt: Date;
  trialEndsAt?: Date;
  /** IANA, p. ej. "America/La_Paz". Define como se leen todas las fechas. */
  timezone?: string;
  /** Condiciones que se imprimen en el comprobante de una venta adelantada. */
  advanceSaleTerms?: string | null;
  /** Datos fiscales y de contacto. Los imprime la factura. */
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  isActive: boolean;
  createdAt: Date;
}

// Product & Inventory Types
export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface Product {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  unit: string;
  isActive: boolean;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  lastMovementAt?: Date;
}

// Provider Types
export interface Provider {
  id: string;
  organizationId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  isActive: boolean;
  createdAt: Date;
}

export type PurchaseOrderStatus = 'draft' | 'pending' | 'approved' | 'received' | 'canceled';

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  branchId: string;
  providerId: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdById: string;
  createdAt: Date;
  receivedAt?: Date;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Sales Types
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface Quote {
  id: string;
  organizationId: string;
  branchId: string;
  quoteNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  validUntil: Date;
  notes?: string;
  createdById: string;
  createdAt: Date;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export type SaleStatus = 'completed' | 'refunded' | 'partial_refund';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

export interface Sale {
  id: string;
  organizationId: string;
  branchId: string;
  saleNumber: string;
  status: SaleStatus;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  clientName?: string;
  notes?: string;
  createdById: string;
  createdAt: Date;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  total: number;
}

// Petty Cash Types
export type TransactionType = 'income' | 'expense';

export interface PettyCashTransaction {
  id: string;
  organizationId: string;
  branchId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  reference?: string;
  createdById: string;
  createdAt: Date;
}

// Audit Types
export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'price_change' 
  | 'stock_change'
  | 'sale'
  | 'refund';

export interface AuditLog {
  id: string;
  organizationId: string;
  branchId?: string;
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Dashboard Stats Types
export interface GlobalStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  activeUsers: number;
  mrr: number;
  arr: number;
  churnRate: number;
  growthRate: number;
}

export interface TenantStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingOrders: number;
  todaySales: number;
  todayRevenue: number;
  monthlyRevenue: number;
}

// Navigation Types
export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
  roles?: UserRole[];
  premium?: boolean;
}
