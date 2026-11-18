'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { useAdminSession } from '@/components/admin-session';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
  History,
  FileText,
  ChevronsUpDown,
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
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { clearAuth } from '@/lib/api-client';
import { authApi } from '@/lib/api/auth';

// Colores propios del sidebar de administración (misma paleta azul de la landing).
// Se aplican solo aquí; el resto del dashboard no cambia.
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

const navigation = [
  {
    title: 'General',
    items: [
      {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Organizaciones',
        href: '/admin/organizations',
        icon: Building2,
      },
      {
        title: 'Usuarios',
        href: '/admin/users',
        icon: Users,
      },
      // Sin esta entrada nadie atendia los tickets: los clientes los abrian y
      // no habia ninguna pantalla desde la que responder.
      {
        title: 'Soporte',
        href: '/admin/soporte',
        icon: LifeBuoy,
      },
    ],
  },
  {
    title: 'Análisis',
    items: [
      {
        title: 'Reporte de empresas',
        href: '/admin/reports',
        icon: BarChart3,
      },
      {
        title: 'Movimiento económico',
        href: '/admin/finance',
        icon: Wallet,
      },
    ],
  },
  {
    title: 'Sistema',
    items: [
      {
        title: 'Planes',
        href: '/admin/settings',
        icon: Settings,
      },
      { title: 'Auditoría', href: '/admin/audit', icon: History },
      { title: 'Políticas y términos', href: '/admin/legal', icon: FileText },
    ],
  },
];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SA';
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const session = useAdminSession();
  const visibleNavigation = navigation.map(group => ({...group,items:group.items.filter(item=>session?.isSuperAdmin||item.href==='/admin/finance')})).filter(group=>group.items.length);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    setUserEmail(localStorage.getItem('user_email') ?? '');
  }, []);

  const displayName = userEmail
    ? userEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Super Admin';

  const handleLogout = () => {
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      void authApi.logout(sessionId).catch(() => {});
    }
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0" style={sidebarTheme}>
      <SidebarHeader className="px-3 pb-2 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={session?.isSuperAdmin ? "/admin/dashboard" : "/admin/finance"}>
                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary text-base font-bold text-sidebar-primary-foreground">
                  G
                </div>
                <div className="flex flex-col gap-1 leading-none">
                  <span className="text-[15px] font-semibold tracking-tight">GestiónPro</span>
                  <span className="text-xs text-sidebar-foreground/60">
                    {session?.isSuperAdmin ? "Super Admin" : "Contable"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {visibleNavigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-xs font-semibold text-[oklch(0.5_0.09_258)]">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className="group/nav relative h-9 rounded-md text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-white data-[active=true]:shadow-sm data-[active=true]:hover:bg-sidebar-primary"
                        >
                          <Link href={item.href}>
                            <item.icon
                              className={`size-[18px] ${isActive ? 'text-white' : iconColorOf(group.title)}`}
                            />
                            <span>{item.title}</span>
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
                        {initialsOf(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/55">
                      {userEmail}
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
                {session?.isSuperAdmin && <DropdownMenuItem asChild><Link href="/admin/settings">
                  <Settings className="mr-2 h-4 w-4" />Planes
                </Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
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
