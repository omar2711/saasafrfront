'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Truck,
  ShoppingCart,
  ClipboardList,
  Receipt,
  FileText,
  Calculator,
  BarChart3,
  History,
  LogOut,
  Settings,
  ChevronsUpDown,
  ChevronRight,
  Package,
  Clock,
  Users,
  LifeBuoy,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BranchSelector } from '@/components/branch-selector';
import { useOrganization } from '@/contexts/organization-context';

// Colores propios del sidebar (misma paleta azul de la landing y el login).
// Se aplican solo aquí; el resto del dashboard no cambia. Estilo claro y sobrio.
const sidebarTheme = {
  '--sidebar': 'oklch(0.97 0.014 250)',
  '--sidebar-foreground': 'oklch(0.3 0.03 258)',
  '--sidebar-primary': 'oklch(0.55 0.2 258)',
  '--sidebar-primary-foreground': 'oklch(0.99 0 0)',
  '--sidebar-accent': 'oklch(0.93 0.025 250)',
  '--sidebar-accent-foreground': 'oklch(0.22 0.04 258)',
  '--sidebar-border': 'oklch(0.89 0.02 250)',
  '--sidebar-ring': 'oklch(0.55 0.2 258)',
} as CSSProperties;

// Un color suave por grupo para los íconos (el activo va en azul sólido).
const groupIconColor: Record<string, string> = {
  General: 'text-[oklch(0.55_0.2_258)]',
  'Mi Tienda': 'text-[oklch(0.55_0.18_285)]',
  Operativo: 'text-[oklch(0.6_0.13_180)]',
  Ventas: 'text-[oklch(0.6_0.16_150)]',
  Análisis: 'text-[oklch(0.68_0.16_65)]',
  Sistema: 'text-[oklch(0.55_0.06_255)]',
};
const iconColorOf = (group: string) => groupIconColor[group] ?? 'text-[oklch(0.55_0.2_258)]';

const navButtonClass =
  'group/nav relative h-9 rounded-md text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-white data-[active=true]:shadow-sm data-[active=true]:hover:bg-sidebar-primary';

interface NavChild {
  title: string;
  href: string;
  requiredPermission?: string;
  requiredPlanFeature?: string;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  premium?: boolean;
  requiredPermission?: string;
  requiredPlanFeature?: string;
  children?: NavChild[];
}

interface NavGroup {
  title: string;
  requiredPermission?: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: 'General',
    items: [
      { title: 'Dashboard', href: '/mi-tienda/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Mi Tienda',
    requiredPermission: 'settings.read',
    items: [
      {
        title: 'Mi Tienda',
        icon: Store,
        children: [
          { title: 'Usuarios', href: '/mi-tienda/usuarios', requiredPermission: 'users.read' },
          { title: 'Roles', href: '/mi-tienda/roles', requiredPermission: 'roles.manage' },
          { title: 'Sucursales', href: '/mi-tienda/sucursales', requiredPermission: 'settings.read' },
          // La pantalla de configuracion no estaba enlazada desde ningun sitio:
          // habia que escribir la URL a mano para llegar al horario laboral.
          { title: 'Datos de la Empresa', href: '/mi-tienda/configuracion?tab=general', requiredPermission: 'settings.read' },
          { title: 'Horario Laboral', href: '/mi-tienda/configuracion?tab=horario', requiredPermission: 'settings.read' },
          { title: 'Suscripción', href: '/mi-tienda/suscripcion', requiredPermission: 'settings.read' },
        ],
      },
    ],
  },
  {
    title: 'Operativo',
    items: [
      { title: 'Proveedores', href: '/operativo/proveedores', icon: Truck, requiredPermission: 'suppliers.read', requiredPlanFeature: 'module_suppliers' },
      { title: 'Clientes', href: '/operativo/clientes', icon: Users, requiredPermission: 'customers.read', requiredPlanFeature: 'module_customers' },
      { title: 'Nuevo Ingreso', href: '/operativo/ordenes-compra', icon: ClipboardList, requiredPermission: 'purchases.read', requiredPlanFeature: 'module_purchases' },
      { title: 'Inventario', href: '/operativo/inventario', icon: Package, requiredPermission: 'inventory.read', requiredPlanFeature: 'module_inventory' },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { title: 'Cotizaciones', href: '/ventas/cotizaciones', icon: FileText, requiredPermission: 'quotes.read', requiredPlanFeature: 'module_quotes' },
      { title: 'Punto de Venta', href: '/ventas/pos', icon: ShoppingCart, requiredPermission: 'sales.write', requiredPlanFeature: 'module_sales' },
      { title: 'Ventas Pendientes', href: '/ventas/pendientes', icon: Clock, requiredPermission: 'sales.read', requiredPlanFeature: 'module_sales' },
      { title: 'Caja Chica', href: '/ventas/caja-chica', icon: Calculator, requiredPermission: 'petty_cash.read', requiredPlanFeature: 'module_petty_cash' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      {
        title: 'Reportes',
        icon: BarChart3,
        requiredPermission: 'reports.read',
        requiredPlanFeature: 'module_reports',
        children: [
          { title: 'Historial de Inventario', href: '/reportes?tab=inventario', requiredPermission: 'reports.read' },
          { title: 'Historial de Ventas', href: '/reportes?tab=ventas', requiredPermission: 'reports.read' },
          { title: 'Historial de Cotizaciones', href: '/reportes?tab=cotizaciones', requiredPermission: 'reports.read' },
          { title: 'Historial de Compras', href: '/reportes?tab=compras', requiredPermission: 'reports.read' },
          { title: 'Clientes', href: '/reportes?tab=clientes', requiredPermission: 'reports.read' },
          { title: 'Bajas de Inventario', href: '/reportes?tab=bajas', requiredPermission: 'reports.read' },
        ],
      },
      { title: 'Auditoría', href: '/auditoria', icon: History, requiredPermission: 'audit.read', requiredPlanFeature: 'module_audit' },
      { title: 'Soporte', href: '/soporte', icon: LifeBuoy, requiredPermission: 'support.read' },
    ],
  },
];

export function TenantSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { organization, currentUser, hasPermission, hasPlanFeature, permissions, logout } = useOrganization();

  /**
   * Los hijos de Reportes apuntan a "/reportes?tab=ventas". `pathname` no
   * incluye la query, asi que comparar `pathname === href` nunca daba true y
   * ningun hijo se marcaba activo. Se compara la ruta y, si el enlace lleva
   * ?tab=, tambien esa pestana.
   */
  const isActive = (href: string) => {
    const [path, query] = href.split('?');
    if (pathname !== path) return false;
    if (!query) return true;
    const tab = new URLSearchParams(query).get('tab');
    return tab === null || searchParams.get('tab') === tab;
  };

  const isChildActive = (children?: NavChild[]) =>
    children?.some((child) => isActive(child.href));

  // While permissions are loading (empty array), show all items.
  // Once loaded, check both RBAC permission and plan feature.
  const canView = (perm?: string, planFeature?: string) => {
    const permOk = !perm || permissions.length === 0 || hasPermission(perm);
    const featureOk = !planFeature || hasPlanFeature(planFeature);
    return permOk && featureOk;
  };

  const filteredNavigation = navigation
    .filter((group) => canView(group.requiredPermission))
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (item.children) {
            const visibleChildren = item.children.filter((c) =>
              canView(c.requiredPermission, c.requiredPlanFeature),
            );
            return visibleChildren.length > 0 ? { ...item, children: visibleChildren } : null;
          }
          return canView(item.requiredPermission, item.requiredPlanFeature) ? item : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    }))
    .filter((group) => group.items.length > 0);

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const planName = organization?.plan
    ? String(organization.plan).charAt(0).toUpperCase() + String(organization.plan).slice(1)
    : 'Professional';

  return (
    <Sidebar collapsible="icon" className="border-r-0" style={sidebarTheme}>
      <SidebarHeader className="px-3 pb-2 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/mi-tienda/dashboard">
                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Store className="size-[18px]" />
                </div>
                <div className="flex min-w-0 flex-col gap-1 leading-none">
                  <span className="truncate text-[15px] font-semibold tracking-tight">
                    {organization?.name || 'Mi Tienda'}
                  </span>
                  <span className="text-xs text-sidebar-foreground/60">Plan {planName}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-1 pt-2">
          <BranchSelector />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {filteredNavigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-xs font-semibold text-[oklch(0.5_0.09_258)]">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  if (item.children) {
                    const childActive = !!isChildActive(item.children);
                    return (
                      <Collapsible
                        key={item.title}
                        asChild
                        defaultOpen={childActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.title}
                              className={`${navButtonClass} ${childActive ? 'font-medium text-sidebar-accent-foreground' : ''}`}
                            >
                              <item.icon
                                className={`size-[18px] ${iconColorOf(group.title)}`}
                              />
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto size-4 text-sidebar-foreground/40 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="mx-5 my-1 gap-0.5 px-2">
                              {item.children.map((child) => {
                                const active = isActive(child.href);
                                return (
                                  <SidebarMenuSubItem key={child.href}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={active}
                                      className="h-8 rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary/10 data-[active=true]:font-medium data-[active=true]:text-[oklch(0.42_0.18_258)]"
                                    >
                                      <Link href={child.href}>
                                        {child.title}
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  const active = isActive(item.href!);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={navButtonClass}
                      >
                        <Link href={item.href!}>
                          <item.icon
                            className={`size-[18px] ${active ? 'text-white' : iconColorOf(group.title)}`}
                          />
                          <span>{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="ml-auto h-5 min-w-5 px-1.5 text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {item.premium && (
                            <Badge
                              variant="outline"
                              className="ml-auto text-xs border-yellow-500 text-yellow-600"
                            >
                              PRO
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {currentUser?.name || 'Usuario'}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {currentUser?.email || 'usuario@empresa.com'}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
