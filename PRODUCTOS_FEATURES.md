# Funcionalidades del Módulo de Productos

## Descripción General
El módulo de Productos ha sido completamente habilitado con un sistema completo de gestión de catálogo con las siguientes características:

## 1. Crear Nuevo Producto
- **Botón**: "Nuevo Producto" en la parte superior derecha
- **Formulario**: Abre un diálogo con todos los campos requeridos:
  - Nombre del producto *
  - Código SKU *
  - Categoría (dropdown con opciones)
  - Descripción / Indicaciones
  - Precio de Compra *
  - Precio de Venta *
  - Stock Mínimo *
  - Unidad de medida (kg, litro, unidad, etc.)
  - Imagen/Foto del producto
- **Validación**: Todos los campos requeridos son validados
- **Resultado**: El producto aparece inmediatamente en la tabla

## 2. Ver Detalle de Producto
- **Acceso**: Menú de acciones (⋮) → "Ver Detalle"
- **Información mostrada en pestañas**:
  - **General**: Stock actual, estado (Activo/Inactivo), descripción
  - **Precios**: Precio de compra, precio de venta, margen de ganancia %
  - **Movimientos**: Historial de entradas/salidas de stock con referencias

## 3. Editar Producto
- **Acceso**: Menú de acciones (⋮) → "Editar Producto"
- **Campos editables**:
  - Precio de venta (siempre editable)
  - Stock mínimo (siempre editable)
  - Indicaciones/Descripción (siempre editable)
  - Imagen/Foto (siempre editable)
  - Nombre, SKU, Categoría, Precio de compra (solo si NO viene de Orden de Compra)
- **Identificador PO**: Si el producto fue creado desde PO, muestra badge "De OC-XXXXX"

## 4. Ajustar Stock
- **Acceso**: Menú de acciones (⋮) → "Ajustar Stock"
- **Tipos de movimiento**:
  - Entrada: Compra, devolución, reposición
  - Salida: Venta manual, pérdida, daño
  - Ajuste: Corrección de inventario
- **Campos requeridos**:
  - Tipo de movimiento *
  - Cantidad *
  - Motivo/Referencia * (auditoría)
- **Validación**: No permite salidas que excedan stock disponible
- **Resultado**: Stock se actualiza inmediatamente y se registra en movimientos

## 5. Ver Movimiento
- **Acceso**: Ver Detalle → Pestaña "Movimientos"
- **Información**: 
  - Fecha y hora del movimiento
  - Tipo (Entrada/Salida/Ajuste)
  - Cantidad
  - Referencia (OC, VTA, ADJ, etc.)

## 6. Activar / Desactivar Producto
- **Acceso**: Menú de acciones (⋮) → "Activar" o "Desactivar"
- **Indicador visual**: Columna "Activo" muestra:
  - ✓ Activo (badge verde)
  - ○ Inactivo (badge gris)
- **Efecto**: El producto permanece en el catálogo pero no está disponible en cotizaciones/ventas

## 7. Eliminar Producto
- **Acceso**: Menú de acciones (⋮) → "Eliminar"
- **Confirmación**: Diálogo de confirmación antes de eliminar
- **Resultado**: Se elimina completamente del catálogo

## Tabla de Productos

### Columnas Mostradas:
1. **Producto**: Nombre + Unidad de medida
2. **SKU**: Código único
3. **Categoría**: Clasificación del producto
4. **Precio Compra**: Costo unitario
5. **Precio Venta**: Precio de venta al público
6. **Stock**: Cantidad disponible
7. **Stock Status**: Badge de estado del inventario
   - Verde "En Stock": Cantidad > Stock mínimo
   - Amarillo "Stock Bajo": 0 < Cantidad ≤ Stock mínimo
   - Rojo "Sin Stock": Cantidad = 0
8. **Activo**: Estado del producto (Activo/Inactivo)
9. **Acciones**: Menú con todas las operaciones

## Búsqueda y Filtros
- **Búsqueda**: Por nombre o SKU del producto
- **Resultado**: Filtra la tabla en tiempo real

## Estadísticas (Cards superiores)
- Total de productos en el catálogo
- Productos activos
- Productos con bajo stock
- Productos sin stock

## Sincronización con Otros Módulos
- Los productos creados aquí aparecen inmediatamente en:
  - Cotizaciones (Nuevo Presupuesto)
  - POS (Punto de Venta)
  - Órdenes de Compra (Selección de productos)
- Las ventas aprueban decrementan automáticamente el stock

## Notas Importantes
- Todos los campos de edición son completamente funcionales
- El stock se sincroniza en tiempo real con otros módulos
- Los productos de OC tienen campos bloqueados pero pueden editarse detalles comerciales
- Cada acción genera un registro de auditoría
