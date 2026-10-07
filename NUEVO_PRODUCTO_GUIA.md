# Guía: Crear Nuevo Producto

## Cómo Usar la Función "Nuevo Producto"

### Paso 1: Abrir el Formulario
1. Ve a **Operativo → Productos**
2. Haz clic en el botón **"➕ Nuevo Producto"** (esquina superior derecha)
3. Se abrirá un diálogo con el formulario

### Paso 2: Llenar los Campos OBLIGATORIOS

Los campos marcados con `*` son requeridos:

#### Nombre del Producto *
- **Descripción**: Nombre único del producto
- **Ejemplo**: "Laptop Dell XPS 13"
- **Validación**: No puede estar vacío

#### Código SKU *
- **Descripción**: Código único del producto (se convierte a mayúsculas automáticamente)
- **Ejemplo**: "LPTP-DELL-XPS-13"
- **Validación**: No puede estar vacío, debe ser único en el sistema

#### Precio de Venta *
- **Descripción**: Precio de venta al cliente
- **Ejemplo**: 1499.99
- **Validación**: Debe ser mayor a 0

#### Stock Mínimo *
- **Descripción**: Cantidad mínima que dispara alertas de bajo stock
- **Ejemplo**: 5
- **Validación**: No puede ser negativo

### Paso 3: Llenar los Campos OPCIONALES

#### Categoría
- **Opciones**: Electrónica, Ropa, Alimentos, Bebidas, Hogar, Deportes, Salud, Belleza, Otro
- **Por defecto**: "Otro"

#### Unidad de Medida
- **Opciones**: unidad, kg, litro, metro, paquete, caja, docena
- **Por defecto**: "unidad"

#### Precio de Compra
- **Descripción**: Precio de costo (opcional)
- **Por defecto**: 0
- **Nota**: Si lo dejas vacío, se usará 0 automáticamente

#### Descripción
- **Descripción**: Indicaciones o detalles adicionales del producto
- **Límite**: Sin límite de caracteres
- **Ejemplo**: "Laptop de alta gama con procesador Intel i7, 16GB RAM"

#### Margen de Ganancia
- **Descripción**: Se calcula automáticamente
- **Cálculo**: ((Precio Venta - Precio Compra) / Precio Venta) × 100
- **Actualización**: En tiempo real mientras escribes

#### Imagen del Producto
- **Formato**: JPG, PNG, GIF, etc.
- **Acción**: Haz clic en el área punteada o arrastra una imagen
- **Previsualización**: Se muestra al lado del área de carga
- **Eliminar**: Haz clic en la X roja en la esquina de la previsualización

### Paso 4: Enviar el Formulario

**Botón "Crear Producto"**
- Valida todos los campos obligatorios
- Si hay errores, muestra mensajes en rojo
- Si todo está correcto, crea el producto

**Botón "Cancelar"**
- Cierra el diálogo sin guardar

## Ejemplo Completo

### Datos a Llenar:

```
Nombre del Producto:      "Monitor Samsung 27 pulgadas"
Código SKU:               "MON-SAM-27"
Categoría:                "Electrónica"
Unidad de Medida:         "unidad"
Precio de Compra:         "150" (opcional)
Precio de Venta:          "249.99"
Stock Mínimo:             "3"
Descripción:              "Monitor FHD 1920x1080, 75Hz, IPS"
```

### Resultado:

```
✅ Producto creado exitosamente
   ID: prod-1234567890
   Nombre: Monitor Samsung 27 pulgadas
   Margen: 39.9%
```

## Errores Comunes

### Error: "El nombre del producto es requerido"
- **Solución**: Asegúrate de llenar el campo "Nombre del Producto"

### Error: "El SKU ya existe"
- **Solución**: El código SKU que ingresaste ya está en el sistema. Usa uno diferente.

### Error: "El precio de venta debe ser mayor a 0"
- **Solución**: Ingresa un precio de venta válido mayor a cero

### Error: "El stock mínimo no puede ser negativo"
- **Solución**: El stock mínimo debe ser 0 o positivo

## Después de Crear el Producto

Una vez creado, el producto aparecerá en:

1. **Tabla de Productos** - Con acciones disponibles:
   - 👁️ Ver Detalle
   - ✏️ Editar Producto
   - ⚙️ Ajustar Stock
   - Desactivar (si está activo)
   - 🗑️ Eliminar

2. **Estadísticas** - Se actualizarán:
   - Total Productos
   - Productos Activos
   - Stock Bajo
   - Sin Stock

3. **Otros Módulos** - Estará disponible en:
   - Selectors de productos en Cotizaciones
   - Selectors de productos en POS
   - Inventario disponible en consultas de stock

## Tips y Trucos

✅ **Llena el precio de compra** - Ayuda a calcular márgenes de ganancia  
✅ **Usa SKU consistentes** - Facilita búsquedas y auditoría  
✅ **Agrega descripciones claras** - Útil para búsquedas y referencias  
✅ **Sube una imagen** - Mejora la visualización en lista de productos  
✅ **Define stock mínimo realista** - Para alertas útiles de bajo stock

