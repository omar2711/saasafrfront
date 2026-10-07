"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, ShieldCheck, Users, BarChart3, Package, Receipt, FileText, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Building2,
    title: "Multi-Empresa",
    description: "Gestiona múltiples organizaciones y sucursales desde una sola plataforma.",
  },
  {
    icon: Users,
    title: "Control de Usuarios",
    description: "Asigna roles y permisos específicos para cada miembro de tu equipo.",
  },
  {
    icon: Package,
    title: "Inventario",
    description: "Control completo de productos, stock y movimientos de inventario.",
  },
  {
    icon: Receipt,
    title: "Punto de Venta",
    description: "Sistema POS integrado con múltiples métodos de pago.",
  },
  {
    icon: BarChart3,
    title: "Reportes",
    description: "Análisis detallados de ventas, inventario y rendimiento.",
  },
  {
    icon: History,
    title: "Auditoría",
    description: "Registro completo de todas las acciones del sistema.",
  },
]

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">GestiónPro</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/login")}>
              Iniciar Sesión
            </Button>
            <Button onClick={() => router.push("/register")}>
              Comenzar Gratis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Gestión Empresarial
          <span className="text-primary"> Simplificada</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
          Plataforma integral para administrar tu negocio: inventarios, ventas, proveedores, 
          reportes y más. Todo en un solo lugar.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" onClick={() => router.push("/register")}>
            Crear Cuenta Gratis
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/login")}>
            Ya tengo cuenta
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">
          Todo lo que necesitas para tu negocio
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/50 bg-card/50">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold">
            Comienza hoy mismo
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Únete a cientos de empresas que ya gestionan sus negocios con GestiónPro.
          </p>
          <Button size="lg" className="mt-8" onClick={() => router.push("/register")}>
            Comenzar Prueba Gratuita
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 GestiónPro. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
