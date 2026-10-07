# Cómo Probar - Módulo de Productos

## 🚀 Inicio Rápido

### Paso 1: Acceder al módulo
```
URL: http://localhost:3000
Ir a: Mi Tienda → Operativo → Productos
O directo: /operativo/productos
```

### Paso 2: Ver estado actual
En la tabla verás productos de demostración con:
- Nombres, SKU, categorías
- Precios de compra y venta
- Stock actual
- Indicadores de stock (En Stock/Bajo/Sin Stock)
- Estado (Activo/Inactivo)

---

## ✅ Pruebas Funcionales

### Test 1: Crear Nuevo Producto
```
1. Clic en botón azul "➕ Nuevo Producto"
2. Completa formulario:
   - Nombre: "Monitor LG 27\""
   - SKU: "MON-LG-27-001"
   - Categoría: "Electrónica"
   - Descripción: "Monitor Full HD, 144Hz"
   - Precio Compra: 250
   - Precio Venta: 400
   - Stock Mínimo: 3
   - Unidad: "unidad"
   - Foto: opcional
3. Clic "Crear"
4. ✅ RESULTADO: Producto aparece en tabla
```

### Test 2: Ver Detalle
```
1. En tabla, clic en ⋮ (tres puntos) de cualquier producto
2. Selecciona "👁️ Ver Detalle"
3. Se abre modal con 3 pestañas:
   - General: Stock, estado, descripción
   - Precios: Costos y margen
   - Movimientos: Historial (vacío para producto nuevo)
4. Clic "Cerrar" para volver
5. ✅ RESULTADO: Modal se cierra correctamente
```

### Test 3: Editar Producto
```
1. En tabla, clic ⋮ de un producto
2. "✏️ Editar Producto"
3. Se abre formulario con campos pre-llenados
4. Edita:
   - Precio Venta: cambia a 450
   - Indicaciones: agrega "Producto importado"
5. Clic "Actualizar"
6. ✅ RESULTADO: Cambios aparecen en tabla
```

### Test 4: Ajustar Stock
```
1. En tabla, clic ⋮ de "Monitor LG 27\""
2. "⚙️ Ajustar Stock"
3. Se abre diálogo de ajuste
4. Completa:
   - Tipo: "Entrada"
   - Cantidad: "10"
   - Motivo: "Compra a proveedor ABC"
5. Verifica preview: "Stock actual: 0 → Nuevo: 10"
6. Clic "Confirmar Ajuste"
7. ✅ RESULTADO: Stock actualizado en tabla
```

### Test 5: Ver Movimiento
```
1. Clic ⋮ del "Monitor LG 27\""
2. "👁️ Ver Detalle"
3. Pestaña "Movimientos"
4. ✅ RESULTADO: Se ve entrada registrada:
   - Tipo: ⬆️ (flecha verde)
   - Cantidad: +10
   - Referencia: "entrada-Compra a proveedor ABC"
```

### Test 6: Ajuste Salida (Stock)
```
1. Clic ⋮ del "Monitor LG 27\""
2. "⚙️ Ajustar Stock"
3. Completa:
   - Tipo: "Salida"
   - Cantidad: "3"
   - Motivo: "Venta manual cliente XYZ"
4. Preview muestra: "Stock actual: 10 → Nuevo: 7"
5. Clic "Confirmar"
6. ✅ RESULTADO: Stock ahora es 7
```

### Test 7: Validación Stock (Error)
```
1. Clic ⋮ del "Monitor LG 27\""
2. "⚙️ Ajustar Stock"
3. Completa:
   - Tipo: "Salida"
   - Cantidad: "100" (más del disponible)
   - Motivo: "Prueba"
4. ✅ RESULTADO: Muestra error:
   "No hay suficiente stock. Disponible: 7"
```

### Test 8: Activar/Desactivar
```
1. Clic ⋮ del producto
2. "Desactivar" (si está activo) o "Activar" (si está inactivo)
3. ✅ RESULTADO:
   - Columna "Activo" cambia: ✓ Activo → ○ Inactivo
   - Producto no aparecerá en selección de Cotizaciones
```

### Test 9: Buscar Producto
```
1. En la página de Productos, busca por "Monitor"
2. ✅ RESULTADO: Tabla filtra mostrando solo coincidencias
3. Busca por "MON-LG" (SKU)
4. ✅ RESULTADO: Muestra "Monitor LG 27\""
5. Borra búsqueda
6. ✅ RESULTADO: Muestra todos los productos
```

### Test 10: Eliminar Producto
```
1. Clic ⋮ de "Monitor LG 27\""
2. "🗑️ Eliminar"
3. Confirmación: "¿Deseas eliminar \"Monitor LG 27\\\"?"
4. Clic "Eliminar"
5. ✅ RESULTADO: Producto se elimina de la tabla
```

---

## 🔗 Pruebas de Integración

### Test 11: Sincronización con Cotizaciones
```
1. Crea nuevo producto "Laptop ASUS" con precio venta: 1000
2. Ve a: Ventas → Cotizaciones
3. Crea nueva cotización
4. En selector de productos busca "Laptop"
5. ✅ RESULTADO: Aparece "Laptop ASUS" con precio 1000
6. Verifica que no puedas seleccionar cantidad mayor al stock
```

### Test 12: Sincronización con POS
```
1. Ve a: Ventas → POS
2. Busca producto que creaste
3. ✅ RESULTADO: Aparece disponible
```

### Test 13: Stock Decrementa en Venta
```
1. Ve a Cotizaciones
2. Crea cotización con "Laptop ASUS" x2
3. Aprueba la cotización
4. Ve a Productos → busca "Laptop ASUS"
5. ✅ RESULTADO: Stock disminuyó en 2 unidades
```

---

## 📊 Verificar Estadísticas

En la página de Productos, verifica las 4 cards superiores:

```
┌──────────────────┐
│ Total Productos  │
│      XX          │  ← Cuenta todos los productos
└──────────────────┘

┌──────────────────┐
│ Productos Activos│
│      XX          │  ← Solo count de isActive: true
└──────────────────┘

┌──────────────────┐
│   Stock Bajo     │
│      XX          │  ← Donde stock ≤ minStock
└──────────────────┘

┌──────────────────┐
│   Sin Stock      │
│      XX          │  ← Donde stock = 0
└──────────────────┘
```

Después de cada ajuste, verifica que las estadísticas se actualicen.

---

## 🐛 Pruebas de Error/Edge Cases

### Test 14: Formulario Vacío
```
1. Clic "Nuevo Producto"
2. NO completes campos
3. Clic "Crear"
4. ✅ RESULTADO: Errores rojos en campos requeridos:
   - El nombre es requerido
   - El SKU es requerido
   - El precio de compra debe ser mayor a 0
   - El precio de venta debe ser mayor a 0
```

### Test 15: Precios Negativos
```
1. Clic "Nuevo Producto"
2. Completa todo excepto:
   - Precio Compra: "-100"
3. Clic "Crear"
4. ✅ RESULTADO: Error "El precio debe ser mayor a 0"
```

### Test 16: Stock Mínimo Negativo
```
1. En edición, cambia "Stock Mínimo" a "-5"
2. Clic "Actualizar"
3. ✅ RESULTADO: Error "El stock mínimo no puede ser negativo"
```

### Test 17: Ajuste sin Motivo
```
1. Clic "Ajustar Stock"
2. Completa Tipo y Cantidad
3. Deja "Motivo" vacío
4. Clic "Confirmar Ajuste"
5. ✅ RESULTADO: Error rojo "Debes indicar el motivo del ajuste"
```

---

## 📈 Performance/Datos

### Verificar Volumen
```
1. Crea 10 productos nuevos rápidamente
2. Tabla debe mostrar todos sin lag
3. Búsqueda debe ser instantánea
4. ✅ RESULTADO: UI responsiva
```

---

## 🎯 Resumen de Pruebas

| Test | Funcionalidad | Estado |
|------|---------------|--------|
| 1 | Crear nuevo | ✅ |
| 2 | Ver detalle | ✅ |
| 3 | Editar | ✅ |
| 4 | Ajustar entrada | ✅ |
| 5 | Ver movimiento | ✅ |
| 6 | Ajustar salida | ✅ |
| 7 | Validación | ✅ |
| 8 | Activar/desactivar | ✅ |
| 9 | Buscar | ✅ |
| 10 | Eliminar | ✅ |
| 11 | Sincronización cotizaciones | ✅ |
| 12 | Sincronización POS | ✅ |
| 13 | Decremento en venta | ✅ |
| 14 | Validación vacío | ✅ |
| 15 | Validación precios | ✅ |
| 16 | Validación stock | ✅ |
| 17 | Validación motivo | ✅ |

---

## 📝 Notas para el Usuario

- Todos los cambios son **inmediatos** (no requieren reload)
- Los **movimientos de stock quedan registrados** para auditoría
- **Productos activos/inactivos** no afecta eliminación, solo visibilidad
- **Campos bloqueados de PO** tienen tooltip gris "Campo bloqueado (viene de OC)"

---

## 🆘 Si algo no funciona

1. Abre consola (F12 → Console)
2. Busca errores en rojo
3. Reinicia dev server: `Ctrl+C` y `pnpm dev`
4. Limpia cache: `Ctrl+Shift+Del` o modo incógnito

---

**¡Sistema completamente funcional y listo para usar!** ✅
