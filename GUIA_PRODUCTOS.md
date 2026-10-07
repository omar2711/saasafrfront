# Guía de Uso - Módulo de Productos

## 🎯 Resumen Ejecutivo
El módulo de Productos está **100% funcional** con todas las características requeridas:
- ✅ Crear nuevo producto
- ✅ Ver detalle completo con movimientos
- ✅ Editar precio de venta, estado e indicaciones
- ✅ Ajustar stock (entrada, salida, ajuste)
- ✅ Ver movimiento de stock
- ✅ Activar/Desactivar producto
- ✅ Eliminar producto
- ✅ Tabla con todas las acciones por producto

---

## 📍 Acceso al Módulo
**Ruta**: `Mi Tienda → Operativo → Productos`

O directo en: `/operativo/productos`

---

## 🔧 Funcionalidades Detalladas

### 1️⃣ CREAR NUEVO PRODUCTO

**Cómo acceder:**
- Clic en botón azul "➕ Nuevo Producto" en la esquina superior derecha

**Formulario a completar:**
```
Nombre del Producto *           → Ej: "Laptop Dell XPS 13"
SKU *                          → Ej: "LPTP-DELL-XPS-13"
Categoría                      → Seleccionar de lista
Descripción/Indicaciones       → Texto libre (opcional)
Precio de Compra *             → Ej: 800.00
Precio de Venta *              → Ej: 1200.00
Stock Mínimo *                 → Ej: 5
Unidad de Medida               → unidad, kg, litro, etc.
Foto/Imagen                    → Cargar desde computadora
```

**Validaciones:**
- Todos los campos marcados con * son obligatorios
- Precios deben ser > 0
- SKU debe ser único
- Se muestra error si falta algún campo requerido

**Resultado:**
- Producto aparece inmediatamente en la tabla
- Se puede ver en Cotizaciones y POS
- Stock se inicializa según valor ingresado

---

### 2️⃣ VER DETALLE DEL PRODUCTO

**Cómo acceder:**
- En la tabla, clic en menú ⋮ (tres puntos) de cualquier producto
- Seleccionar "👁️ Ver Detalle"

**Información disponible en 3 pestañas:**

**Pestaña "General":**
- Stock actual
- Stock mínimo
- Estado (Activo/Inactivo)
- Descripción del producto
- Alertas si stock bajo

**Pestaña "Precios":**
- Precio de compra
- Precio de venta
- Margen de ganancia %

**Pestaña "Movimientos":**
- Historial completo de entradas/salidas
- Fecha y hora de cada movimiento
- Tipo (Entrada/Salida/Ajuste)
- Cantidad
- Referencia (OC-XXX, VTA-XXX, etc.)

---

### 3️⃣ EDITAR PRODUCTO

**Cómo acceder:**
- En la tabla, clic en menú ⋮
- Seleccionar "✏️ Editar Producto"

**Campos editables siempre:**
- Precio de Venta
- Stock Mínimo
- Indicaciones/Descripción
- Foto/Imagen

**Campos editables solo si NO viene de PO:**
- Nombre
- SKU
- Categoría
- Precio de Compra
- Unidad

**Indicador PO:**
- Si el producto fue creado desde Orden de Compra, mostrará badge "De OC-XXXXX"
- Los campos de PO quedan bloqueados (gris) pero puedes editar detalles comerciales

---

### 4️⃣ AJUSTAR STOCK

**Cómo acceder:**
- En la tabla, clic en menú ⋮
- Seleccionar "⚙️ Ajustar Stock"

**Formulario:**
```
Tipo de Movimiento *
  ├─ Entrada (Compra/Devolución)
  ├─ Salida (Venta manual/Pérdida)
  └─ Ajuste (Corrección)

Cantidad *                     → Número positivo
Motivo/Referencia *            → Ej: "Devolución cliente José"
```

**Validaciones:**
- No permite salidas si no hay stock suficiente
- Muestra preview del stock nuevo antes de confirmar
- Todos los campos son obligatorios

**Resultado:**
- Stock se actualiza inmediatamente
- Aparece registro en "Movimientos" con fecha/hora
- Sincroniza con dashboard y otros módulos

**Ejemplo de movimientos:**
- Entrada: OC-001234 → Stock ↑ 50 unidades
- Salida: VTA-005678 → Stock ↓ 10 unidades
- Ajuste: ADJ-002 → Stock ↓ 5 unidades (corrección)

---

### 5️⃣ VER MOVIMIENTO DE STOCK

**Cómo acceder:**
- En la tabla, clic en menú ⋮
- "Ver Detalle" → Pestaña "Movimientos"

**Información:**
- Historial completo ordenado por fecha
- Indica si fue entrada ⬆️ verde o salida ⬇️ rojo
- Referencia del documento que generó el movimiento
- Permite auditoría completa del stock

---

### 6️⃣ ACTIVAR / DESACTIVAR PRODUCTO

**Cómo acceder:**
- En la tabla, clic en menú ⋮
- Seleccionar "Activar" (si está inactivo) o "Desactivar" (si está activo)

**Estados:**
- ✓ Activo (badge verde) → Disponible para venta
- ○ Inactivo (badge gris) → No aparece en cotizaciones/POS

**Nota:**
- El producto permanece en el catálogo
- Puedes volverlo a activar cuando lo necesites

---

### 7️⃣ ELIMINAR PRODUCTO

**Cómo acceder:**
- En la tabla, clic en menú ⋮
- Seleccionar "🗑️ Eliminar"

**Confirmación:**
- Se pide confirmación antes de eliminar
- Acción NO se puede deshacer

⚠️ **Advertencia:**
- Solo elimina si el producto no tiene historial de ventas
- Si tiene movimientos, considera desactivarlo en lugar de eliminar

---

## 📊 TABLA DE PRODUCTOS

### Columnas:
| Columna | Descripción |
|---------|-------------|
| Producto | Nombre + unidad |
| SKU | Código único |
| Categoría | Clasificación |
| Precio Compra | Costo unitario |
| Precio Venta | Precio al público |
| Stock | Cantidad disponible |
| Stock Status | Estado (En Stock/Bajo/Sin Stock) |
| Activo | Si está disponible (Activo/Inactivo) |
| Acciones | Menú de operaciones |

### Búsqueda:
- Escribe en el campo "Buscar por nombre o SKU..."
- Filtra en tiempo real

### Estadísticas (Cards):
```
┌─────────────────┬──────────────┬──────────────┬─────────────┐
│ Total Productos │ Productos    │ Stock Bajo   │ Sin Stock   │
│       45        │ Activos: 42  │      3       │      1      │
└─────────────────┴──────────────┴──────────────┴─────────────┘
```

---

## 🔗 Integración con Otros Módulos

### Desde Órdenes de Compra:
- Al crear OC con productos, se auto-crean en catálogo
- Campos bloqueados vienen de OC
- Puedes editar detalles comerciales (precio venta, imagen, etc.)

### Desde Cotizaciones:
- Selecciona productos de este catálogo
- Stock se valida (no puedes vender más de lo disponible)
- Al aprobar: stock se decrementa automáticamente

### Desde POS:
- Misma integración que cotizaciones
- Productos activos aparecen en selector

### Dashboard:
- Muestra stock bajo en tiempo real
- Actualiza estadísticas al crear/editar

---

## 💡 Tips y Mejores Prácticas

1. **Organiza por categoría**: Facilita búsqueda y gestión
2. **SKU único**: Usa código único, no duplicados
3. **Stock mínimo bien definido**: Evita quedarte sin stock
4. **Indica activos/inactivos**: Limpia productos que no vendes
5. **Revisa movimientos regularmente**: Auditoría y control
6. **Precios competitivos**: Revisa margen (Precio Venta - Precio Compra)
7. **Fotos de calidad**: Mejora presentación en cotizaciones

---

## ❓ Preguntas Frecuentes

**¿Puedo editar el SKU después de crear?**
- Sí, a menos que venga de Orden de Compra

**¿Qué pasa si vendo más de lo disponible?**
- No te deja. El sistema valida stock

**¿Puedo recuperar un producto eliminado?**
- No. Considera desactivar en lugar de eliminar

**¿Dónde veo quién creó/editó un producto?**
- En el detalle, bajo "Movimientos" está el historial

**¿Los precios se sincronizan?**
- Sí. Cambios aquí afectan Cotizaciones y POS

**¿Puedo usar productos de OC pero cambiar su nombre?**
- No, vienen bloqueados de OC. Así se mantiene trazabilidad

---

## 🆘 Soporte

Si encuentras algún problema:
1. Verifica que completaste todos los campos requeridos (*)
2. Revisa el mensaje de error
3. Intenta recargar la página
4. Contacta al equipo de soporte

---

**Última actualización**: 2024
**Versión**: 1.0 - Sistema completo funcional
