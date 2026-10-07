"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Plus, Users, MapPin, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { mockOrganizations } from "@/lib/mock-data"

export default function SelectOrganizationPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  const filteredOrgs = mockOrganizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectOrg = (slug: string) => {
    router.push(`/mi-tienda/dashboard`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Selecciona una Organización</h1>
          <p className="mt-2 text-muted-foreground">
            Elige la organización con la que deseas trabajar
          </p>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Buscar organización..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-3">
          {filteredOrgs.map((org) => (
            <Card
              key={org.id}
              className="cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/50"
              onClick={() => handleSelectOrg(org.slug)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{org.name}</h3>
                  <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {org.branches?.length || 0} sucursales
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {org.users?.length || 0} usuarios
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <Button variant="outline" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Crear Nueva Organización
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Administrador del sistema?{" "}
          <Button variant="link" className="h-auto p-0 text-primary" onClick={() => router.push("/admin/dashboard")}>
            Ir al Panel de Super Admin
          </Button>
        </p>
      </div>
    </div>
  )
}
