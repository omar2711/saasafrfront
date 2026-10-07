import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground flex-col justify-between p-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-lg">G</span>
            </div>
            <span className="text-xl font-bold">GestionPro</span>
          </div>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-balance">
            Gestiona tu negocio de forma inteligente
          </h1>
          <p className="text-lg text-sidebar-foreground/80 text-pretty">
            Inventario, ventas, proveedores y reportes en una sola plataforma. 
            Toma el control total de tu empresa.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <div className="text-3xl font-bold">+500</div>
              <div className="text-sm text-sidebar-foreground/70">Empresas activas</div>
            </div>
            <div>
              <div className="text-3xl font-bold">98%</div>
              <div className="text-sm text-sidebar-foreground/70">Satisfaccion</div>
            </div>
            <div>
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm text-sidebar-foreground/70">Soporte</div>
            </div>
          </div>
        </div>

        <div className="text-sm text-sidebar-foreground/60">
          2024 GestionPro. Todos los derechos reservados.
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
