"use client"

import { useState } from "react"
import { Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { formatDate } from '@/lib/format';

const mockAdjustments = [
  {
    id: "ADJ001",
    date: "2026-05-06",
    type: "entrada" as const,
    reason: "Inventario inicial",
    products: 25,
    user: "Carlos López",
    status: "aprobado",
  },
  {
    id: "ADJ002",
    date: "2026-05-05",
    type: "salida" as const,
    reason: "Merma por caducidad",
    products: 8,
    user: "María García",
    status: "aprobado",
  },
  {
    id: "ADJ003",
    date: "2026-05-04",
    type: "entrada" as const,
    reason: "Devolución de cliente",
    products: 3,
    user: "Carlos López",
    status: "pendiente",
  },
  {
    id: "ADJ004",
    date: "2026-05-03",
    type: "salida" as const,
    reason: "Daño en almacén",
    products: 5,
    user: "Ana Martínez",
    status: "aprobado",
  },
  {
    id: "ADJ005",
    date: "2026-05-02",
    type: "entrada" as const,
    reason: "Corrección de conteo",
    products: 12,
    user: "Pedro Sánchez",
    status: "rechazado",
  },
]

export default function AjustesPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredAdjustments = mockAdjustments.filter(adj =>
    adj.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adj.reason.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Ajustes de Inventario"
        description="Gestiona las entradas y salidas de inventario por ajustes"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ajustes
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAdjustments.length}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entradas
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {mockAdjustments.filter(a => a.type === "entrada").length}
            </div>
            <p className="text-xs text-muted-foreground">40 productos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Salidas
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {mockAdjustments.filter(a => a.type === "salida").length}
            </div>
            <p className="text-xs text-muted-foreground">13 productos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {mockAdjustments.filter(a => a.status === "pendiente").length}
            </div>
            <p className="text-xs text-muted-foreground">Por aprobar</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar ajuste..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Ajuste
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Productos</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdjustments.map((adjustment) => (
                <TableRow key={adjustment.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{adjustment.id}</TableCell>
                  <TableCell>
                    {formatDate(adjustment.date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {adjustment.type === "entrada" ? (
                        <ArrowUpCircle className="h-4 w-4 text-accent" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="capitalize">{adjustment.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{adjustment.reason}</TableCell>
                  <TableCell className="text-right">{adjustment.products}</TableCell>
                  <TableCell>{adjustment.user}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        adjustment.status === "aprobado"
                          ? "default"
                          : adjustment.status === "pendiente"
                          ? "secondary"
                          : "destructive"
                      }
                      className={
                        adjustment.status === "aprobado"
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                    >
                      {adjustment.status.charAt(0).toUpperCase() + adjustment.status.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
