'use client';

import { useState, useEffect } from 'react';
import { useAdminSession } from '@/components/admin-session';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  AlertTriangle,
  Settings,
  LogOut,
  Shield,
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
    title: 'Analisis',
    items: [
      {
        title: 'Reporte de empresas',
        href: '/admin/reports',
        icon: BarChart3,
      },
      {
        title: 'Movimiento económico',
        href: '/admin/finance',
        icon: AlertTriangle,
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
      {title:'Auditoría',href:'/admin/audit',icon:Shield},
      {title:'Políticas y términos',href:'/admin/legal',icon:Settings},
    ],
  },
];

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
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={session?.isSuperAdmin ? "/admin/dashboard" : "/admin/finance"}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">AFR</span>
                  <span className="text-xs text-sidebar-foreground/70">{session?.isSuperAdmin ? "Super Admin" : "Contable"}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {visibleNavigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                      SA
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {userEmail}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
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
                  Cerrar sesion
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
