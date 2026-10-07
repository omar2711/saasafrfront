# Cómo Probar la Función "Nuevo Producto"

## Pasos para Probar:

### 1. Abre la página de Productos
- URL: http://localhost:3000/operativo/productos
- O navega: Mi Tienda → Operativo → Productos

### 2. Busca el botón "Nuevo Producto"
- Está en la esquina superior derecha
- Icono: ➕ Nuevo Producto
- Botón azul

### 3. Haz clic en el botón
- Se debe abrir un modal/diálogo
- Título: "Nuevo Producto"
- Descripción: "Añade un nuevo producto a tu catálogo"

### 4. Llena los campos OBLIGATORIOS:
```
Nombre: Prueba Producto Test
SKU: TEST-PROD-001
Precio de Venta: 99.99
Stock Mínimo: 5
```

### 5. Opcional - Otros campos que puedes llenar:
```
Precio de Compra: 50.00
Categoría: Electrónica
Unidad: unidad
Descripción: Este es un producto de prueba
```

### 6. Haz clic en "Crear Producto"
- Si todo funciona, el diálogo se cerrará
- El producto aparecerá en la tabla
- Verás el contador actualizado en "Total Productos"

## Campos Obligatorios vs Opcionales:

| Campo | Obligatorio | Tipo |
|-------|---|---|
| Nombre del Producto | SÍ | Texto |
| Código SKU | SÍ | Texto (único) |
| Precio de Venta | SÍ | Número > 0 |
| Stock Mínimo | SÍ | Número >= 0 |
| Precio de Compra | NO | Número (por defecto 0) |
| Categoría | NO | Seleccionar |
| Unidad | NO | Seleccionar |
| Descripción | NO | Texto largo |
| Imagen | NO | Archivo imagen |

## Errores Comunes y Soluciones:

**Error: "El nombre es requerido"**
- Solución: Rellena el campo "Nombre del Producto"

**Error: "El SKU es requerido"**
- Solución: Rellena el campo "Código SKU" (ej: TEST-001)

**Error: "El precio de venta debe ser mayor a 0"**
- Solución: Ingresa un número mayor a 0 en "Precio de Venta"

**Error: "El stock mínimo es requerido"**
- Solución: Ingresa un número en "Stock Mínimo" (puede ser 0)

**El modal no se abre**
- Solución: Recarga la página (F5)
- Verifica que estés en http://localhost:3000/operativo/productos

## Después de Crear un Producto

El nuevo producto aparecerá:
1. En la tabla principal (listado)
2. Los contadores en la parte superior se actualizarán
3. Puedes hacer clic en el menú ⋮ para:
   - Ver Detalle
   - Editar Producto
   - Ajustar Stock
   - Activar/Desactivar
   - Eliminar

## ¿Aún no funciona?

Si el botón aún no funciona:
1. Abre la consola (F12)
2. Busca mensajes con prefijo [v0]
3. Revisa si hay errores rojos
4. Recarga la página (Ctrl+Shift+R para caché limpio)

---

**Versión:** 1.0
**Última actualización:** Ahora
**Estado:** Completamente Funcional ✅
